// ═══════════════════════════════════
//  LIBRARY
// ═══════════════════════════════════
function scrollCarousel(id, dir) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: dir * 160, behavior: 'smooth' });
}

function updateCarouselArrows(listId, arrowsId, count) {
  const arrows = document.getElementById(arrowsId);
  if (arrows) arrows.classList.toggle('visible', count > 3);
}

function filterLib(f, btn) {
  libFilter = f;
  document.querySelectorAll('#lib-seg .stats-seg-btn').forEach(t => t.classList.toggle('active', t.dataset.tab === f));
  renderLibrary();
}

function renderLibrary() {
  const q = (document.getElementById('lib-search').value || '').toLowerCase();
  if (libFilter === 'notas') {
    renderNotasLibrary(q);
    return;
  }
  let items = db.entries.filter(e => {
    if (libFilter === 'todos') return true;
    if (libFilter === 'leyendo') return e.type === 'libro' && e.estado === 'leyendo';
    if (libFilter === 'serie') return e.type === 'serie';
    if (libFilter === 'pelicula') return e.type === 'pelicula';
    if (libFilter === 'disco') return e.type === 'disco';
    if (libFilter === 'libro') return e.type === 'libro'; // includes leyendo
    return e.type === libFilter;
  }).filter(e => !q || e.titulo.toLowerCase().includes(q) || (e.autor||'').toLowerCase().includes(q) || (e.director||'').toLowerCase().includes(q) || (e.artista||'').toLowerCase().includes(q) || (e.productor||'').toLowerCase().includes(q) || (e.discografica||'').toLowerCase().includes(q));

  // Sort: leyendo first, then by date desc, then id desc
  items = items.sort((a, b) => {
    if (a.estado === 'leyendo' && b.estado !== 'leyendo') return -1;
    if (b.estado === 'leyendo' && a.estado !== 'leyendo') return 1;
    const mi = MESES.indexOf(a.mes), mj = MESES.indexOf(b.mes);
    const ai = (a.anio||0)*100 + (mi>=0?mi:0);
    const bi = (b.anio||0)*100 + (mj>=0?mj:0);
    return bi - ai || b.id.localeCompare(a.id);
  });

  const el = document.getElementById('library-list');
  if (items.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📖</div><div class="empty-text">Tu biblioteca está vacía.<br>Empieza añadiendo algo.</div></div>';
    return;
  }
  el.innerHTML = items.map(e => entryCardHTML(e)).join('');
}


function typeLabelForNotas(type) {
  return type === 'libro' ? 'Libros' : type === 'pelicula' ? 'Películas' : type === 'serie' ? 'Series' : type === 'disco' ? 'Discos' : 'Otros';
}
function typeIcon(type) {
  return type === 'libro' ? '📚' : type === 'pelicula' ? '🎬' : type === 'serie' ? '📺' : type === 'disco' ? '💿' : '•';
}
function entryCreator(e) {
  if (!e) return '';
  return e.type === 'libro' ? (e.autor||'') : e.type === 'disco' ? (e.artista||'') : (e.director||'');
}
function noteAnchorId(entryId) {
  return 'notas-entry-' + String(entryId).replace(/[^a-zA-Z0-9_-]/g, '-');
}
function noteItemAnchorId(entryId, idx) {
  return noteAnchorId(entryId) + '-nota-' + (idx + 1);
}
function noteCategoryAnchorId(cat) {
  return 'notas-cat-' + String(cat || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}
function escapeNoteHtml(value) {
  return String(value || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
function renderInlineNoteFormatStateful(text, state) {
  // Parser liviano para notas. Mantiene estilos aunque el usuario abra **negrita**
  // en una línea y la cierre en otra, caso común al transcribir apuntes.
  const escChar = ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch);
  const st = state || {bold:false, italic:false, underline:false};
  const rawText = String(text || '');
  let html = '';
  if (st.bold) html += '<strong>';
  if (st.italic) html += '<em>';
  if (st.underline) html += '<u>';

  for (let i = 0; i < rawText.length; i++) {
    const rest = rawText.slice(i);
    if (rest.startsWith('**')) {
      html += st.bold ? '</strong>' : '<strong>';
      st.bold = !st.bold;
      i += 1;
    } else if (rest.startsWith('__')) {
      html += st.underline ? '</u>' : '<u>';
      st.underline = !st.underline;
      i += 1;
    } else if (rest[0] === '*' && rest[1] !== '*') {
      html += st.italic ? '</em>' : '<em>';
      st.italic = !st.italic;
    } else if (rest[0] === '_' && rest[1] !== '_') {
      html += st.italic ? '</em>' : '<em>';
      st.italic = !st.italic;
    } else {
      html += escChar(rest[0]);
    }
  }

  // Cierre visual por línea/párrafo para no dejar HTML abierto.
  // El estado queda vivo y la siguiente línea vuelve a abrir el estilo.
  if (st.underline) html += '</u>';
  if (st.italic) html += '</em>';
  if (st.bold) html += '</strong>';
  return html;
}
function renderInlineNoteFormat(text) {
  return renderInlineNoteFormatStateful(text, {bold:false, italic:false, underline:false});
}
function renderRichNoteText(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const romanRe = /^\s*([IVXLCDM]+)[\.)]\s+(.+)$/i;
  const numRe = /^\s*(\d+)[\.)]\s+(.+)$/;
  const inlineState = {bold:false, italic:false, underline:false};
  let html = '';
  let listType = null;

  const closeList = () => {
    if (listType) {
      html += '</ol>';
      listType = null;
    }
  };
  const openList = (type, start) => {
    if (listType !== type) {
      closeList();
      const cls = type === 'roman' ? 'nota-list nota-list-roman' : 'nota-list nota-list-decimal';
      const attr = type === 'roman' ? ' type="I"' : (start && start > 1 ? ` start="${start}"` : '');
      html += `<ol class="${cls}"${attr}>`;
      listType = type;
    }
  };

  lines.forEach(line => {
    const raw = String(line || '');
    const numeric = raw.match(numRe);
    const roman = raw.match(romanRe);
    if (numeric) {
      openList('decimal', parseInt(numeric[1], 10));
      html += `<li>${renderInlineNoteFormatStateful(numeric[2], inlineState)}</li>`;
    } else if (roman) {
      openList('roman');
      html += `<li>${renderInlineNoteFormatStateful(roman[2], inlineState)}</li>`;
    } else if (!raw.trim()) {
      closeList();
      html += '<div class="nota-spacer"></div>';
    } else {
      closeList();
      html += `<p>${renderInlineNoteFormatStateful(raw, inlineState)}</p>`;
    }
  });
  closeList();
  return `<div class="nota-rich">${html}</div>`;
}
function notasFechaLabel(fecha) {
  if (!fecha) return '';
  const [y,m,d] = String(fecha).split('-').map(Number);
  if (!y || !m || !d) return fecha;
  return new Date(y, m-1, d).toLocaleDateString('es-CL', {day:'2-digit', month:'short', year:'numeric'});
}
function renderNotasLibrary(query='') {
  const q = (query || '').toLowerCase().trim();
  const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  const js = s => String(s || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const entries = db.entries
    .filter(e => Array.isArray(e.notas_lista) && e.notas_lista.length > 0)
    .map(e => ({...e, _notasFiltradas: (e.notas_lista||[]).filter(n => {
      if (!q) return true;
      return (e.titulo||'').toLowerCase().includes(q)
        || (entryCreator(e)||'').toLowerCase().includes(q)
        || (n.titulo||'').toLowerCase().includes(q)
        || (n.texto||'').toLowerCase().includes(q)
        || (typeLabelForNotas(e.type)||'').toLowerCase().includes(q);
    })}))
    .filter(e => e._notasFiltradas.length > 0)
    .sort((a,b) => {
      const ca = typeLabelForNotas(a.type).localeCompare(typeLabelForNotas(b.type), 'es');
      if (ca !== 0) return ca;
      return (a.titulo||'').localeCompare(b.titulo||'', 'es');
    });

  const el = document.getElementById('library-list');
  if (!entries.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><div class="empty-text">No hay notas para mostrar.<br>Agrega notas desde una ficha.</div></div>';
    return;
  }
  const totalNotas = entries.reduce((sum,e)=>sum+e._notasFiltradas.length,0);
  const grouped = entries.reduce((acc,e)=>{ const k=typeLabelForNotas(e.type); (acc[k] ||= []).push(e); return acc; }, {});
  const cats = ['Libros','Películas','Series','Discos'].filter(k => grouped[k]?.length);

  const toc = `<div class="notas-tree"><ul><li><details open><summary>Notas</summary><ul>` + cats.map(cat => `
    <li><details open><summary>${esc(cat)}</summary><ul>
      ${grouped[cat].map(e => `
        <li><details open>
          <summary><a class="toc-entry-link" href="#${noteAnchorId(e.id)}" onclick="event.preventDefault();scrollToNotaEntry('${js(e.id)}')">${typeIcon(e.type)} ${esc(e.titulo||'Sin título')}</a></summary>
          <ul>
            ${e._notasFiltradas.map((n,i)=>`
              <li><a class="toc-note-link" href="#${noteItemAnchorId(e.id,i)}" onclick="event.preventDefault();scrollToNotaNote('${js(e.id)}',${i})">Nota ${i+1}${n.titulo ? '. ' + esc(n.titulo) : ''}</a></li>
            `).join('')}
          </ul>
        </details></li>
      `).join('')}
    </ul></details></li>
  `).join('') + `</ul></details></li></ul></div>`;

  const content = cats.map(cat => `
    <section>
      <h2 class="notas-doc-category" id="${noteCategoryAnchorId(cat)}">${cat}</h2>
      ${grouped[cat].map(e => `
        <article class="notas-doc-entry" id="${noteAnchorId(e.id)}">
          <h3 class="notas-doc-entry-title">${esc(e.titulo||'Sin título')}</h3>
          <div class="notas-doc-entry-meta">${[entryCreator(e), e.anio_pub||e.anio_est||e.anio].filter(Boolean).map(esc).join(' · ')}</div>
          ${e._notasFiltradas.map((n,i)=>`
            <div class="notas-doc-note" id="${noteItemAnchorId(e.id,i)}">
              <div class="notas-doc-note-title">Nota ${i+1}${n.titulo ? ' — ' + esc(n.titulo) : ''}</div>
              ${n.fecha ? `<div class="notas-doc-note-date">${notasFechaLabel(n.fecha)}</div>` : ''}
              <div class="notas-doc-note-text">${renderRichNoteText(n.texto||'')}</div>
            </div>
          `).join('')}
          <div class="notas-doc-actions">
            <button class="btn btn-secondary btn-sm" onclick="showDetail('${js(e.id)}')">Abrir ficha</button>
            <button class="btn btn-secondary btn-sm" onclick="openNotaModal('${js(e.id)}')">+ Nota</button>
          </div>
        </article>
      `).join('')}
    </section>
  `).join('');

  el.innerHTML = `
    <div class="notas-doc-wrap">
      <div class="notas-doc-cover">
        <div class="notas-doc-title">Notas</div>
        <div class="notas-doc-sub">${totalNotas} nota${totalNotas!==1?'s':''} · ${entries.length} estímulo${entries.length!==1?'s':''}</div>
      </div>
      <div class="notas-reader-layout">
        <button class="notas-reader-mobile-toggle" onclick="toggleNotasToc()">☰ Índice de notas</button>
        <aside class="notas-reader-toc" id="notas-reader-toc">
          <div class="notas-reader-toc-title">Tabla de contenido</div>
          ${toc}
        </aside>
        <main class="notas-reader-doc">${content}${renderNotasReferences(entries)}</main>
      </div>
    </div>`;
}

function closeNotasTocOnMobile() {
  const toc = document.getElementById('notas-reader-toc');
  if (toc && window.matchMedia && window.matchMedia('(max-width: 760px)').matches) toc.classList.remove('open');
}
function toggleNotasToc() {
  const toc = document.getElementById('notas-reader-toc');
  if (toc) toc.classList.toggle('open');
}
function scrollToNotaEntry(entryId) {
  const el = document.getElementById(noteAnchorId(entryId));
  if (el) { el.scrollIntoView({ behavior:'smooth', block:'start' }); closeNotasTocOnMobile(); }
}
function scrollToNotaNote(entryId, idx) {
  const el = document.getElementById(noteItemAnchorId(entryId, idx));
  if (el) { el.scrollIntoView({ behavior:'smooth', block:'start' }); closeNotasTocOnMobile(); }
}

function entryCardHTML(e) {
  const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  const ok = v => {
    if (v === null || v === undefined || v === '' || v === 0) return false;
    const s = String(v).trim();
    return s !== '' && s.toLowerCase() !== 'no aplica' && s !== '-' && s !== '—';
  };

  let sub = '';
  if (e.type === 'libro') {
    sub = [e.autor, e.paginas ? e.paginas+' págs' : null, e.editorial].filter(ok).map(esc).join(' · ');
  } else if (e.type === 'pelicula') {
    const parts = [ok(e.director)?e.director:null, e.anio_est?String(e.anio_est):null, e.duracion?fmtMin(e.duracion):null];
    sub = parts.filter(Boolean).map(esc).join(' · ');
  } else if (e.type === 'disco') {
    sub = [ok(e.artista)?e.artista:null, e.anio_pub?String(e.anio_pub):null, ok(e.productor)?'Prod. '+e.productor:null, ok(e.discografica)?e.discografica:null].filter(Boolean).map(esc).join(' · ');
  } else {
    const tempNum = getTemporadaNum(e);
    const temp = tempNum ? `Temporada ${tempNum}` : null;
    const dur  = e.duracion ? fmtMin(e.duracion) : null;
    sub = [ok(e.director)?e.director:null, e.anio_est?String(e.anio_est):null, temp, dur].filter(Boolean).map(esc).join(' · ');
  }

  let chips = '';
  if (e.type === 'pelicula' || e.type === 'serie' || e.type === 'disco') {
    const extras = [];
    if (ok(e.guionista))    extras.push({ icon: '✍', val: e.guionista });
    if (ok(e.protagonista)) extras.push({ icon: '★', val: e.protagonista });
    if (ok(e.musica))       extras.push({ icon: '♪', val: e.musica });
    if (ok(e.fotografia))   extras.push({ icon: '◉', val: e.fotografia });
    if (e.type === 'disco' && ok(e.productor)) extras.push({ icon: '🎚', val: e.productor });
    if (e.type === 'disco' && ok(e.discografica)) extras.push({ icon: '💽', val: e.discografica });
    if (extras.length) {
      chips = `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">` +
        extras.map(x => `<span style="font-size:10px;color:var(--ink3);background:var(--cream2);padding:2px 7px;border-radius:10px;">${x.icon} ${esc(x.val)}</span>`).join('') +
        `</div>`;
    }
  }

  const progress = e.type === 'libro' && e.estado === 'leyendo'
    ? `<div class="progress-wrap"><div class="progress-fill" style="width:${e.progreso||0}%"></div></div>` : '';
  const notasBadge = (e.notas_lista && e.notas_lista.length > 0)
    ? `<span style="font-size:10px;color:var(--ink4);margin-left:4px;">📝 ${e.notas_lista.length}</span>` : '';
  const inventoryBadge = e.type === 'libro' ? (() => {
    const inInventory = !!e.enInventario || bookHasInventoryRecord(e.id);
    return `<button class="inventory-quick-chip${inInventory?' active':''}" onclick="event.stopPropagation();toggleBookInventoryQuick('${String(e.id).replace(/\'/g,"\\'")}')" title="${inInventory?'Quitar del inventario físico':'Agregar al inventario físico'}">📦 ${inInventory?'Inventario':'+ Inventario'}</button>`;
  })() : '';
  const generosHtml = e.type === 'libro' ? (() => {
    const gs = e.generos && e.generos.length > 0 ? e.generos : [];
    const genChips = gs.map(g => {
      const action = g === 'Historia' ? `openHistoriaQuick('${e.id}')` : `openGeneroQuick('${e.id}')`;
      const extra = g === 'Historia' ? 'background:#fff4dc;border-color:#d9b96f;color:#8b6010;font-weight:700;' : '';
      return `<span onclick="event.stopPropagation();${action}" style="font-size:9px;background:var(--cream2);border:1px solid var(--border);border-radius:10px;padding:2px 7px;color:var(--ink3);cursor:pointer;${extra}">${esc(g)}</span>`;
    }).join('');
    const addBtn = `<button onclick="event.stopPropagation();openGeneroQuick('${e.id}')" style="font-size:9px;background:none;border:1px dashed var(--border);border-radius:10px;padding:2px 7px;color:var(--ink4);cursor:pointer;font-family:var(--font-sans);">🏷${gs.length>0?' +':' Etiquetar'}</button>`;
    return genChips + addBtn;
  })() : '';
  const typeName = e.type==='libro'?'Libro':e.type==='pelicula'?'Película':e.type==='disco'?'Disco':'Serie';
  const badge = `<span class="badge badge-${e.estado==='leyendo'?'leyendo':e.type}">${e.estado==='leyendo'?'Leyendo':typeName}</span>`;
  const metaLine = `${e.mes ? esc(e.mes)+' ' : ''}${e.anio||''}`;
  const coverSrc = coverUrl(e) ? coverUrl(e).replace(/"/g,'&quot;') : '';
  const safeId = e.id.replace(/'/g, "\\'");
  return `
    <div class="entry-card" onclick="showDetail('${safeId}')">
      <div class="entry-card-spine ${e.estado==='leyendo'?'libro':e.type}"></div>
      ${coverSrc
        ? `<img src="${coverSrc}" class="entry-card-cover">`
        : hasPendingCover(e)
          ? `<div class="entry-card-cover" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:var(--cream2);" title="Portada en otro dispositivo"><span style="font-size:18px;">📷</span><span style="font-size:7px;color:var(--ink4);letter-spacing:0.5px;">PENDIENTE</span></div>`
          : `<div class="entry-card-cover" style="display:flex;align-items:center;justify-content:center;font-size:22px;">${e.type==='libro'?'📚':e.type==='pelicula'?'🎬':e.type==='disco'?'💿':'📺'}</div>`}
      <div class="entry-card-info">
        <div class="entry-card-title">${esc(e.titulo)}</div>
        <div class="entry-card-sub">${sub}</div>
        ${chips}
        ${progress}
        <div class="entry-card-meta">
          ${badge}
          ${metaLine ? `<span style="font-size:10px;color:var(--ink4);">${metaLine}</span>` : ''}
          ${generosHtml.replace(/openGeneroQuick\('${e.id}'\)/g, `openGeneroQuick('${safeId}')`)}
          ${inventoryBadge}
          ${notasBadge}
        </div>
      </div>
    </div>`;
}

function openHistoriaQuick(entryId){const e=(db.entries||[]).find(x=>x.id===entryId);if(!e||e.type!=='libro'||!(e.generos||[]).includes('Historia'))return;const launch=()=>{const h=e.historia||{},b=historyBounds(h);document.getElementById('histq-entry-id').value=e.id;document.getElementById('histq-book').textContent=e.titulo||'';document.getElementById('histq-linea').value=h.lineaPrincipal||'';document.getElementById('histq-inicio').value=b.inicio??'';document.getElementById('histq-fin').value=b.fin??'';fillHistoricalLineDatalists();renderHistoricalLineChoices('histq-related-lines',h.lineasRelacionadasIds||[]);openModal('modal-historia-quick')};const d=document.getElementById('modal-detail');if(d?.classList.contains('open')){closeModal('modal-detail');setTimeout(launch,140)}else launch()}
function saveHistoriaQuick(){
  return lumenSafeAction("Guardar Historia", () => {const id=document.getElementById('histq-entry-id').value,e=(db.entries||[]).find(x=>x.id===id);if(!e)return;const lineaPrincipal=document.getElementById('histq-linea').value.trim(),lineaPrincipalId=registerHistoricalLine(lineaPrincipal),ri=document.getElementById('histq-inicio').value,rf=document.getElementById('histq-fin').value,inicio=ri===''?null:Number(ri),fin=rf===''?null:Number(rf),lineasRelacionadasIds=selectedHistoricalLineIds('histq-related-lines',lineaPrincipalId),lineasRelacionadas=historicalLineNamesFromIds(lineasRelacionadasIds);e.historia={...(e.historia||{}),schema:'lumen_historia_v3',lineaPrincipal,lineaPrincipalId,fechaInicio:inicio,fechaFin:fin,lineasRelacionadas,lineasRelacionadasIds,periodos:(inicio!==null||fin!==null)?[{nombre:'',tema:'',inicio:inicio??fin,fin:fin??inicio,precision:'aproximada',cobertura:'periodo',periodoId:canonicalEntityId('histperiod',`${lineaPrincipalId||lineaPrincipal}|${inicio??fin}_${fin??inicio}`)}]:[]};ensureHistoriaCanonicalRefs(e);e._updatedAt=Date.now();const ok=saveDB();if(ok!==false){closeModal('modal-historia-quick');showToast('✓ Historia actualizada');if(currentScreen==='library')renderLibrary();if(currentScreen==='mapas')renderMapaHistoria()}
  });
}

// ═══════════════════════════════════
//  DETAIL MODAL
// ═══════════════════════════════════
function showDetail(id) {
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  document.getElementById('detail-title').textContent = e.titulo;
  let html = '';
  // Safe escape for text going into innerHTML
  const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
  const row = (label, val) => val ? `<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--cream2);"><span style="font-size:10px;color:var(--ink4);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;width:110px;flex-shrink:0;padding-top:2px;">${label}</span><span style="font-size:14px;color:var(--ink2);">${esc(val)}</span></div>` : '';
  if (coverUrl(e)) html += `<img src="${esc(coverUrl(e))}" style="width:80px;height:110px;object-fit:cover;border-radius:3px;float:right;margin:0 0 12px 12px;" onerror="this.style.display='none'">`;
  if (e.type === 'libro') {
    html += row('Autor', e.autor) + row('Editorial', e.editorial) + row('Edición', e.edicion) + row('Ciudad / lugar pub.', e.ciudad_publicacion||e.ciudad) + row('Páginas', e.paginas) + row('Publicado', e.anio_pub) + row('Traductor', e.traductor) + row('Idioma orig.', e.idioma) + row('Leído', `${e.mes||''} ${e.anio||''}`);
    html += row('Origen', origenAdquisicionLabel(e.origen_adquisicion));
    html += row('Adquirido', e.fecha_adquisicion ? fechaCL(e.fecha_adquisicion) : '');
    const espera = libroEsperaInfo(e);
    if (espera) html += row('Tiempo espera', formatDiasEspera(espera.dias));
    if (e.enInventario || bookHasInventoryRecord(e.id)) html += row('Inventario', 'Sí · ejemplar físico');
    if (e.historia && (e.generos||[]).includes('Historia')) {
      const h=e.historia;
      html += `<div style="clear:both;margin-top:14px;padding:12px 14px;border:1px solid var(--border);background:var(--cream2);border-radius:6px;"><div style="font-family:var(--font-serif);font-size:16px;font-weight:700;margin-bottom:8px;">🏛️ Mapa histórico</div>`;
      if(h.lineaPrincipal) html += row('Línea principal', h.lineaPrincipal);
      if(Array.isArray(h.lineasRelacionadas)&&h.lineasRelacionadas.length) html += row('Relacionadas', h.lineasRelacionadas.join(', '));
      if(h.ambitoGeografico) html += row('Ámbito', h.ambitoGeografico);
      if(h.enfoque) html += row('Enfoque', h.enfoque);
      if(Array.isArray(h.periodos)&&h.periodos.length){
        html += `<div style="margin-top:10px;display:flex;flex-direction:column;gap:7px;">${h.periodos.map(p=>{const rango=[p.inicio!==null&&p.inicio!==undefined?formatHistoriaYear(p.inicio):'',p.fin!==null&&p.fin!==undefined?formatHistoriaYear(p.fin):''].filter(Boolean).join(' → ');return `<div style="background:#fff;border:1px solid var(--border);border-radius:5px;padding:9px 10px;"><div style="font-weight:700;font-size:13px;color:var(--ink);">${esc(p.nombre||p.tema||'Período histórico')}</div>${rango?`<div style="font-size:12px;color:var(--gold);margin-top:2px;">${esc(rango)}</div>`:''}${p.tema&&p.nombre?`<div style="font-size:11px;color:var(--ink3);margin-top:3px;">${esc(p.tema)}</div>`:''}<div style="font-size:10px;color:var(--ink4);margin-top:4px;text-transform:capitalize;">${esc((p.cobertura||'').replace('_',' '))}${p.precision?` · ${esc(p.precision)}`:''}</div></div>`;}).join('')}</div>`;
      }
      html += `</div>`;
    }
    if (e.estado === 'leyendo') html += row('Progreso', e.progreso + '%');
    if (e.estado === 'abandonado' && e.abandono) html += row('Abandonado', e.abandono);
    if (e.generos && e.generos.length) {
      const chips = e.generos.map(g=>`<span ${g==='Historia'?`onclick="event.stopPropagation();openHistoriaQuick('${e.id}')"`:''} style="font-size:11px;background:${g==='Historia'?'#fff4dc':'var(--cream2)'};border:1px solid ${g==='Historia'?'#d9b96f':'var(--border)'};border-radius:12px;padding:2px 9px;color:${g==='Historia'?'#8b6010':'var(--ink2)'};${g==='Historia'?'cursor:pointer;font-weight:700;':''}">${g}</span>`).join(' ');
      html += `<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--cream2);align-items:flex-start;"><span style="font-size:10px;color:var(--ink4);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;width:110px;flex-shrink:0;padding-top:4px;">Géneros</span><div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div></div>`;
    }
  } else if (e.type === 'pelicula') {
    html += row('Director', e.director) + row('Estreno', e.anio_est) + row('Duración', e.duracion ? fmtMin(e.duracion) : '') + row('Fotografía', e.fotografia) + row('Música', e.musica) + row('Protagonista', e.protagonista) + row('Guionista', e.guionista);
    if (e.basada) { html += row('Basada en', e.basada); html += row('Autor / creador orig.', e.autor_original); html += row('Obra original', e.obra_original); }
    if (e.pais)       html += row('País', getPaisNombre(e.pais));
    if (e.productora) html += row('Productora', e.productora);
    if (e.generos_cine && e.generos_cine.length) {
      const chips = e.generos_cine.map(g=>`<span style="font-size:11px;background:var(--cream2);border:1px solid var(--border);border-radius:12px;padding:2px 9px;color:var(--ink2);">${g}</span>`).join(' ');
      html += `<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--cream2);align-items:flex-start;"><span style="font-size:10px;color:var(--ink4);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;width:110px;flex-shrink:0;padding-top:4px;">Género</span><div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div></div>`;
    }
    html += row('Vista', `${e.mes||''} ${e.anio||''}`);
  } else if (e.type === 'disco') {
    const list = arr => Array.isArray(arr) ? arr.join(' · ') : (arr||'');
    html += row('Cantante/grupo', e.artista) + row('Publicado', e.anio_pub) + row('Productor', e.productor) + row('Discográfica', e.discografica) + row('Escuchado', `${e.mes||''} ${e.anio||''}`);
    if (e.musicos && e.musicos.length) html += row('Músicos', list(e.musicos));
    if (e.colaboraciones && e.colaboraciones.length) html += row('Colaboraciones', list(e.colaboraciones));
  } else { // serie
    const capInfo = (e.capActual || e.capTotal) ? `Cap. ${e.capActual||0} / ${e.capTotal||'?'}` : null;
    const pctCap = e.capTotal > 0 ? `${Math.round((e.capActual||0)/e.capTotal*100)}%` : null;
    // Mostrar "Temporada N" si tiene número de temporada
    const tempLabel = getTemporadaNum(e) ? `Temporada ${getTemporadaNum(e)}` : null;
    html += row('Director', e.director) + row('Estreno', e.anio_est) + row('Temporada', tempLabel) + row('Capítulos', e.capsPorTemp) + row('Min/episodio', e.minEpisodio ? e.minEpisodio+' min' : '') + row('Duración total', e.duracion ? fmtMin(e.duracion) : '') + row('Protagonista', e.protagonista) + row('Música', e.musica) + row('Guionista', e.guionista);
    if (e.basada) html += row('Basada en', e.basada + (e.autor_original ? ' — ' + e.autor_original : ''));
    if (e.estado === 'viendo') {
      html += row('Progreso', capInfo ? `${capInfo}${pctCap?' · '+pctCap:''}` : 'Viendo');
    }
    if (e.basada) { html += row('Basada en', e.basada); html += row('Autor / creador orig.', e.autor_original); html += row('Obra original', e.obra_original); }
    html += row('Vista', `${e.mes||''} ${e.anio||''}`);
  }
  if (e.notas) html += `<div style="margin-top:14px;padding:12px;background:var(--cream2);border-radius:4px;font-family:var(--font-serif);font-style:italic;font-size:14px;color:var(--ink2);line-height:1.5;">${e.notas.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
  html += `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
    <button class="btn btn-secondary btn-sm" onclick="editEntry('${e.id}')">✏ Editar</button>
    ${e.type === 'pelicula' ? `<button class="btn btn-secondary btn-sm" onclick="wikiCompletarIndividual('${e.id}')" style="background:var(--cream2);">🌐 Wikipedia</button>` : ''}
    <button class="btn btn-sm" style="background:var(--red);color:var(--cream);width:auto;" onclick="deleteEntry('${e.id}')">🗑 Eliminar</button>
  </div>`;

  // ── NOTAS ──
  const notas = e.notas_lista || [];
  const notasCount = notas.length;
  html += `
  <div class="notas-section">
    <button class="notas-toggle" onclick="toggleNotasSection('${e.id}')">
      <svg viewBox="0 0 24 24" class="notas-toggle-chevron" id="notas-chevron-${e.id}" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;"><polyline points="6 9 12 15 18 9"/></svg>
      Notas${notasCount > 0 ? ` (${notasCount})` : ''}
    </button>
    <div id="notas-body-${e.id}" style="display:none;">
      <div class="notas-list" id="notas-list-${e.id}">
        ${notasCount === 0 ? '<div style="font-size:13px;color:var(--ink4);font-style:italic;padding:8px 0;">Sin notas aún.</div>' : notas.map((n,i) => notaCardHTML(n, i+1, e.id)).join('')}
      </div>
      <button class="nota-add-btn" onclick="openNotaModal('${e.id}')">+ Agregar nota</button>
    </div>
  </div>`;

  document.getElementById('detail-body').innerHTML = html;
  openModal('modal-detail');
}

// ═══════════════════════════════════
//  NOTAS
// ═══════════════════════════════════
function notaCardHTML(n, num, entryId) {
  const fecha = n.fecha ? new Date(n.fecha).toLocaleDateString('es', {day:'2-digit',month:'short',year:'numeric'}) : '';
  const escTxt = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  return `
    <div class="nota-card" id="nota-card-${n.id}">
      <div class="nota-num">#${num}</div>
      <div class="nota-titulo">${escTxt(n.titulo)||'Sin título'}</div>
      ${fecha ? `<div class="nota-fecha">${fecha}</div>` : ''}
      <div class="nota-texto">${renderRichNoteText(n.texto||'')}</div>
      <div class="nota-actions">
        <button class="nota-btn" onclick="openNotaModal('${entryId}','${n.id}')">✏ Editar</button>
        <button class="nota-btn danger" onclick="deleteNota('${entryId}','${n.id}')">🗑 Eliminar</button>
      </div>
    </div>`;
}

function toggleNotasSection(entryId) {
  const body = document.getElementById(`notas-body-${entryId}`);
  const chevron = document.getElementById(`notas-chevron-${entryId}`);
  const open = body.style.display === 'none';
  body.style.display = open ? 'block' : 'none';
  chevron.classList.toggle('open', open);
}

// Abre la ficha directamente con las notas expandidas — desde carrusel
function openNotasDirectas(entryId) {
  showDetail(entryId);
  // Expandir notas automáticamente después de renderizar
  setTimeout(() => {
    const body    = document.getElementById(`notas-body-${entryId}`);
    const chevron = document.getElementById(`notas-chevron-${entryId}`);
    if (body && body.style.display === 'none') {
      body.style.display = 'block';
      chevron?.classList.add('open');
    }
  }, 80);
}


function romanNotaNumber(num) {
  const map = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
  ];
  let n = Math.max(1, parseInt(num,10) || 1);
  let out = '';
  for (const [val, sym] of map) {
    while (n >= val) { out += sym; n -= val; }
  }
  return out;
}
function stripNotaListPrefix(line) {
  return String(line || '').replace(/^\s*(\d+|[IVXLCDM]+)[\.)]\s+/i, '');
}
function formatNotaList(kind) {
  const ta = document.getElementById('nota-texto');
  if (!ta) return;
  const start = ta.selectionStart || 0;
  const end = ta.selectionEnd || 0;
  const value = ta.value || '';
  const selected = value.slice(start, end);
  const seed = kind === 'roman' ? 'I. ' : '1. ';

  if (!selected) {
    const next = value.slice(0,start) + seed + value.slice(end);
    ta.value = next;
    ta.focus();
    ta.setSelectionRange(start + seed.length, start + seed.length);
    return;
  }

  let counter = 1;
  const formatted = selected.split('\n').map(line => {
    if (!line.trim()) return line;
    const body = stripNotaListPrefix(line);
    const prefix = kind === 'roman' ? `${romanNotaNumber(counter)}. ` : `${counter}. `;
    counter += 1;
    return prefix + body;
  }).join('\n');
  ta.value = value.slice(0,start) + formatted + value.slice(end);
  ta.focus();
  ta.setSelectionRange(start, start + formatted.length);
}
function formatNotaSelection(kind) {
  if (kind === 'numbered' || kind === 'roman') {
    formatNotaList(kind === 'roman' ? 'roman' : 'decimal');
    return;
  }
  const ta = document.getElementById('nota-texto');
  if (!ta) return;
  const start = ta.selectionStart || 0;
  const end = ta.selectionEnd || 0;
  const value = ta.value || '';
  const selected = value.slice(start, end) || 'texto';
  const wraps = {
    bold: ['**','**'],
    italic: ['*','*'],
    underline: ['__','__']
  };
  const [a,b] = wraps[kind] || ['',''];
  const next = value.slice(0,start) + a + selected + b + value.slice(end);
  ta.value = next;
  const cursorStart = start + a.length;
  const cursorEnd = cursorStart + selected.length;
  ta.focus();
  ta.setSelectionRange(cursorStart, cursorEnd);
}

function openNotaModal(entryId, notaId) {
  document.getElementById('nota-entry-id').value = entryId;
  document.getElementById('nota-nota-id').value = notaId || '';
  // Default date = today in Santiago
  const today = todaySantiagoStr();
  if (notaId) {
    const e = db.entries.find(x => x.id === entryId);
    const n = (e?.notas_lista || []).find(x => x.id === notaId);
    if (n) {
      document.getElementById('nota-titulo').value = n.titulo || '';
      document.getElementById('nota-fecha').value = n.fecha || today;
      document.getElementById('nota-texto').value = n.texto || '';
      document.getElementById('nota-modal-title').textContent = 'Editar nota';
    }
  } else {
    document.getElementById('nota-titulo').value = '';
    document.getElementById('nota-fecha').value = today;
    document.getElementById('nota-texto').value = '';
    document.getElementById('nota-modal-title').textContent = 'Nueva nota';
  }
  openModal('modal-nota');
}

function saveNota() {
  return lumenSafeAction("Guardar nota", () => {
  const entryId = document.getElementById('nota-entry-id').value;
  const notaId  = document.getElementById('nota-nota-id').value;
  const titulo  = document.getElementById('nota-titulo').value.trim();
  const fecha   = document.getElementById('nota-fecha').value;
  const texto   = document.getElementById('nota-texto').value.trim();
  if (!texto) { showToast('Escribe algo en la nota'); return; }

  const e = db.entries.find(x => x.id === entryId);
  if (!e) return;
  if (!e.notas_lista) e.notas_lista = [];

  if (notaId) {
    const idx = e.notas_lista.findIndex(x => x.id === notaId);
    if (idx >= 0) e.notas_lista[idx] = { ...e.notas_lista[idx], titulo, fecha, texto };
  } else {
    e.notas_lista.push({ id: 'n_' + Date.now(), titulo, fecha, texto });
  }
  e._updatedAt = Date.now();
  saveDB();
  closeModal('modal-nota');
  showToast(notaId ? '✓ Nota actualizada' : '✓ Nota guardada');
  // Refresh detail modal in place
  showDetail(entryId);
  // Re-open notes section
  setTimeout(() => {
    const body = document.getElementById(`notas-body-${entryId}`);
    const chevron = document.getElementById(`notas-chevron-${entryId}`);
    if (body) { body.style.display = 'block'; chevron?.classList.add('open'); }
  }, 50);

  });
}

function deleteNota(entryId, notaId) {
  if (!confirm('¿Eliminar esta nota?')) return;
  const e = db.entries.find(x => x.id === entryId);
  if (!e) return;
  e.notas_lista = (e.notas_lista || []).filter(x => x.id !== notaId);
  e._updatedAt = Date.now();
  saveDB();
  showToast('Nota eliminada');
  showDetail(entryId);
  setTimeout(() => {
    const body = document.getElementById(`notas-body-${entryId}`);
    const chevron = document.getElementById(`notas-chevron-${entryId}`);
    if (body) { body.style.display = 'block'; chevron?.classList.add('open'); }
  }, 50);
}

function editEntry(id) {
  closeModal('modal-detail');
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  openModal('modal-add');
  setTimeout(() => {
    selectType(e.type, document.querySelector(`.type-btn[data-type="${e.type}"]`));
    document.getElementById('f-notas').value = e.notas || '';
    if (e.type === 'libro') {
      ['titulo','autor','editorial','paginas','traductor','cover'].forEach(k => {
        const el=document.getElementById('f-'+k);
        if(el) el.value = (e[k] !== null && e[k] !== undefined && e[k] !== 0) ? e[k] : '';
      });
      // anio_pub fuera del forEach — garantiza que nunca se pierda
      // (parseInt evita mostrar null/undefined, pero preserva 0 como vacío)
      const anioPublEl = document.getElementById('f-anio-pub');
      if (anioPublEl) anioPublEl.value = (e.anio_pub && parseInt(e.anio_pub) > 0) ? parseInt(e.anio_pub) : '';
      const edicionEl=document.getElementById('f-edicion'); if(edicionEl) edicionEl.value=e.edicion||'';
      const ciudadPubEl=document.getElementById('f-ciudad-pub'); if(ciudadPubEl) ciudadPubEl.value=e.ciudad_publicacion||e.ciudad||'';
      // Mostrar preview de portada si existe
      if (coverUrl(e)) { document.getElementById('f-cover').value = coverUrl(e); previewMainCover('f-cover','f-cover-preview'); }
      // Idioma: populate dynamic select
      const normalizedIdioma = normalizeIdioma(e.idioma||'');
      populateIdiomaSelect(normalizedIdioma);
      document.getElementById('f-idioma-otro').style.display = 'none';
      document.getElementById('f-mes').value = e.mes||'';
      document.getElementById('f-anio-lect').value = e.anio||'';
      const origenAdqEl = document.getElementById('f-origen-adq'); if (origenAdqEl) origenAdqEl.value = e.origen_adquisicion || '';
      const fechaAdqEl = document.getElementById('f-fecha-adq'); if (fechaAdqEl) fechaAdqEl.value = e.fecha_adquisicion || '';
      document.getElementById('f-estado').value = e.estado||'leido';
      document.getElementById('f-progreso').value = e.progreso||0;
      document.getElementById('prog-pct').textContent = e.progreso||0;
      document.getElementById('progreso-field').style.display  = e.estado==='leyendo'    ? 'block' : 'none';
      document.getElementById('abandono-field').style.display  = e.estado==='abandonado' ? 'block' : 'none';
      document.getElementById('f-abandono').value = e.abandono||'';
      setGenerosSeleccionados(e.generos||[]);
      const invFlag = document.getElementById('f-en-inventario'); if(invFlag) invFlag.checked = !!e.enInventario || bookHasInventoryRecord(e.id); syncInventoryChipState();
      setHistoriaFields(e.historia || null);
    } else if (e.type === 'pelicula') {
      const map = { titulo:'fp-titulo',director:'fp-director',anio_est:'fp-anio-est',duracion:'fp-duracion',fotografia:'fp-foto',musica:'fp-musica',protagonista:'fp-protagonista',guionista:'fp-guionista',cover:'fp-cover',autor_original:'fp-autor-original' };
      Object.entries(map).forEach(([k,id])=>{ const el=document.getElementById(id); if(el) el.value=e[k]||''; });
      document.getElementById('fp-elenco').value = Array.isArray(e.elenco) ? e.elenco.join('\n') : (e.elenco||'');
      document.getElementById('fp-pais').value = e.pais || '';
      document.getElementById('fp-productora').value = e.productora || '';
      setGenerosCineSeleccionados(e.generos_cine || []);
      document.getElementById('fp-mes').value = e.mes||'';
      document.getElementById('fp-anio-visto').value = e.anio||'';
      document.getElementById('fp-basada').value = e.basada||'';
      document.getElementById('fp-autor-original').value = e.autor_original || '';
      document.getElementById('fp-obra-original').value = e.obra_original || '';
      document.getElementById('fp-autor-original-field').style.display = e.basada ? 'grid' : 'none';
    } else if (e.type === 'disco') {
      const map = { titulo:'fd-titulo', artista:'fd-artista', anio_pub:'fd-anio-pub', productor:'fd-productor', discografica:'fd-discografica', cover:'fd-cover' };
      Object.entries(map).forEach(([k,id])=>{ const el=document.getElementById(id); if(el) el.value=e[k]||''; });
      document.getElementById('fd-musicos').value = Array.isArray(e.musicos) ? e.musicos.join('\n') : (e.musicos||'');
      document.getElementById('fd-colaboraciones').value = Array.isArray(e.colaboraciones) ? e.colaboraciones.join('\n') : (e.colaboraciones||'');
      document.getElementById('fd-mes').value = e.mes||'';
      document.getElementById('fd-anio-escuchado').value = e.anio||'';
      if (coverUrl(e)) { document.getElementById('fd-cover').value = coverUrl(e); previewMainCover('fd-cover','fd-cover-preview'); }
    } else {
      ['titulo','director','temporadas','duracion','musica','protagonista','guionista','cover'].forEach(k=>{ const el=document.getElementById('fs-'+k); if(el) el.value=e[k]||''; });
      document.getElementById('fs-elenco').value = Array.isArray(e.elenco) ? e.elenco.join('\n') : (e.elenco||'');
      document.getElementById('fs-anio-est').value = e.anio_est || '';
      document.getElementById('fs-caps-por-temp').value = e.capsPorTemp || '';
      document.getElementById('fs-min-episodio').value  = e.minEpisodio  || '';
      if (e.capsPorTemp || e.minEpisodio) calcSeriesDuracion();
      document.getElementById('fs-mes').value = e.mes||'';
      document.getElementById('fs-anio-visto').value = e.anio||'';
      document.getElementById('fs-basada').value = e.basada||'';
      const fsAutorOrig=document.getElementById('fs-autor-original'); if(fsAutorOrig) fsAutorOrig.value=e.autor_original||'';
      const fsObraOrig=document.getElementById('fs-obra-original'); if(fsObraOrig) fsObraOrig.value=e.obra_original||'';
      const fsOrigPanel=document.getElementById('fs-autor-original-field'); if(fsOrigPanel) fsOrigPanel.style.display=e.basada?'grid':'none';
    }
  }, 100);
}

function deleteEntry(id) {
  if (!confirm('¿Eliminar de tu biblioteca?')) return;
  db.entries = db.entries.filter(e => e.id !== id);
  saveDB();
  closeModal('modal-detail');
  showToast('Eliminado de la biblioteca');
  if (currentScreen === 'library') renderLibrary();
  if (currentScreen === 'home') renderHome();
}

function openSerieProgressModal(id) {
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  document.getElementById('serie-progress-id').value = id;
  document.getElementById('serie-progress-title').textContent = e.titulo;
  const cover = coverUrl(e)
    ? `<img src="${coverUrl(e)}" style="width:50px;height:70px;object-fit:cover;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">`
    : `<div style="width:50px;height:70px;background:var(--cream3);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📺</div>`;
  document.getElementById('serie-progress-info').innerHTML = `
    ${cover}
    <div>
      <div style="font-family:var(--font-serif);font-weight:700;font-size:15px;">${e.titulo}</div>
      <div style="font-size:12px;color:var(--ink4);margin-top:2px;">${e.director||''}</div>
    </div>`;
  document.getElementById('serie-cap-actual').value = e.capActual || '';
  document.getElementById('serie-cap-total').value = e.capTotal || '';
  document.getElementById('serie-temporada-actual').value = e.temporadaActual || 1;
  document.getElementById('serie-temporadas-total').value = e.temporadas || '';
  // Reset cover panel
  document.getElementById('serie-cover-panel').style.display = 'none';
  document.getElementById('serie-cover-chevron').style.transform = '';
  document.getElementById('serie-cover-url').value = e.cover || '';
  const prev = document.getElementById('serie-cover-preview');
  prev.innerHTML = coverUrl(e) ? `<img src="${coverUrl(e)}" style="width:60px;height:84px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">` : '';
  updateSerieProgressBar();
  openModal('modal-serie-progress');
}

function toggleSerieCover() {
  const panel = document.getElementById('serie-cover-panel');
  const chevron = document.getElementById('serie-cover-chevron');
  const open = panel.style.display === 'none';
  panel.style.display = open ? 'block' : 'none';
  chevron.style.transform = open ? 'rotate(180deg)' : '';
}

function previewSerieCover(url) {
  const prev = document.getElementById('serie-cover-preview');
  prev.innerHTML = url ? `<img src="${url}" style="width:60px;height:84px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">` : '';
}

function clearSerieCover() {
  document.getElementById('serie-cover-url').value = '';
  document.getElementById('serie-cover-preview').innerHTML = '';
}

function handleSerieCoverFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('⏳ Procesando imagen...');
  compressImage(file, 600, 0.8).then(dataUrl => {
    document.getElementById('serie-cover-url').value = dataUrl;
    previewSerieCover(dataUrl);
    showToast('✓ Imagen cargada');
  }).catch(() => showToast('⚠ Error al cargar imagen'));
  event.target.value = '';
}

function saveSerieCover() {
  const id = document.getElementById('serie-progress-id').value;
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  e.cover = document.getElementById('serie-cover-url').value;
  e._updatedAt = Date.now();
  saveDB();
  // Update info header
  const img = coverUrl(e) ? `<img src="${coverUrl(e)}" style="width:50px;height:70px;object-fit:cover;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">` : '';
  const info = document.getElementById('serie-progress-info');
  if (info && img) info.querySelector('div,img')?.replaceWith?.(...new DOMParser().parseFromString(img,'text/html').body.childNodes);
  document.getElementById('serie-cover-panel').style.display = 'none';
  document.getElementById('serie-cover-chevron').style.transform = '';
  showToast('✓ Portada guardada');
  renderHome();
}

function handleWatchingCoverFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('⏳ Procesando imagen...');
  compressImage(file, 600, 0.8).then(dataUrl => {
    document.getElementById('watching-cover').value = dataUrl;
    const prev = document.getElementById('watching-cover-preview');
    prev.innerHTML = `<img src="${dataUrl}" style="width:60px;height:84px;object-fit:cover;border-radius:4px;margin-top:4px;">`;
    showToast('✓ Imagen cargada');
  }).catch(() => showToast('⚠ Error al cargar imagen'));
  event.target.value = '';
}

function updateSerieProgressBar() {
  const actual = parseInt(document.getElementById('serie-cap-actual').value) || 0;
  const total  = parseInt(document.getElementById('serie-cap-total').value)  || 0;
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  document.getElementById('serie-progress-bar').style.width = pct + '%';
  document.getElementById('serie-progress-pct').textContent = total > 0 ? `Cap. ${actual} de ${total} · ${pct}%` : '';
}

function saveSerieProgress() {
  return lumenSafeAction("Guardar progreso de serie", () => {
  const id = document.getElementById('serie-progress-id').value;
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  e.capActual        = parseInt(document.getElementById('serie-cap-actual').value) || 0;
  e.capTotal         = parseInt(document.getElementById('serie-cap-total').value)  || 0;
  e.temporadaActual  = parseInt(document.getElementById('serie-temporada-actual').value) || 1;
  e.temporadas       = parseInt(document.getElementById('serie-temporadas-total').value) || e.temporadas || 1;
  e._updatedAt = Date.now();
  saveDB();
  closeModal('modal-serie-progress');
  showToast('✓ Progreso guardado');
  renderHome();

  });
}

function finishSerie(id) {
  return lumenSafeAction("Terminar serie", () => {
  const eid = id || document.getElementById('serie-progress-id')?.value;
  const e = db.entries.find(x => x.id === eid);
  if (!e) return;
  const now = new Date();
  e.estado = 'vista';
  if (!e.mes) e.mes = MESES[now.getMonth()];
  if (!e.anio) e.anio = now.getFullYear();
  // Guardar temporada actual en campo Temporada/Saga
  const tempActual = parseInt(document.getElementById('serie-temporada-actual')?.value) || e.temporadaActual;
  if (tempActual) e.coleccion = `Temporada ${tempActual}`;
  e._updatedAt = Date.now();
  saveDB();
  closeModal('modal-serie-progress');
  showToast(`🎉 ¡Terminaste "${e.titulo}"!`, 3000);
  renderHome();
  if (currentScreen === 'library') renderLibrary();

  });
}

