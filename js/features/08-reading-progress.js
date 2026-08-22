// ═══════════════════════════════════
//  LECTURAS EN CURSO
// ═══════════════════════════════════
let readingMode = 'pct'; // 'pct' | 'pag'
let readingSearchTimeout = null;

function selectReadingMode(mode, btn) {
  readingMode = mode;
  document.querySelectorAll('.reading-mode-btn').forEach(b => {
    b.style.borderColor = 'var(--border)'; b.style.background = '#fff'; b.style.color = 'var(--ink3)';
  });
  btn.style.borderColor = 'var(--gold)'; btn.style.background = '#fff8e8'; btn.style.color = 'var(--gold)';
  document.getElementById('reading-prog-pct-field').style.display = mode === 'pct' ? 'block' : 'none';
  document.getElementById('reading-prog-pag-field').style.display = mode === 'pag' ? 'block' : 'none';
}

function debounceReadingSearch() {
  clearTimeout(readingSearchTimeout);
  const q = document.getElementById('reading-search').value.trim();
  if (q.length < 3) { document.getElementById('reading-search-results').style.display = 'none'; return; }
  readingSearchTimeout = setTimeout(() => doReadingSearch(q), 500);
}

async function doReadingSearch(q) {
  const resultsEl = document.getElementById('reading-search-results');
  resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Buscando...</div>';
  resultsEl.style.display = 'block';
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`);
    const data = await res.json();
    if (!data.items) { resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Sin resultados.</div>'; return; }
    resultsEl.innerHTML = data.items.map(item => {
      const v = item.volumeInfo;
      const cover = v.imageLinks ? v.imageLinks.thumbnail.replace('http://','https://') : '';
      const authors = v.authors ? v.authors.join(', ') : '—';
      return `<div class="search-result-item" onclick='fillReadingForm(${JSON.stringify({
        title: v.title||'', authors, publisher: v.publisher||'',
        pages: v.pageCount||'', pubYear: v.publishedDate?v.publishedDate.slice(0,4):'',
        language: v.language||'', cover
      }).replace(/'/g,"&#39;")})'>
        ${cover?`<img src="${cover}" class="sr-cover">`:'<div class="sr-cover"></div>'}
        <div><div class="sr-title">${v.title||''}</div><div class="sr-sub">${authors} · ${v.publishedDate?v.publishedDate.slice(0,4):''}</div></div>
      </div>`;
    }).join('');
  } catch { resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Rellena manualmente.</div>'; }
}

function fillReadingForm(data) {
  document.getElementById('reading-titulo').value = data.title;
  document.getElementById('reading-autor').value = data.authors;
  document.getElementById('reading-editorial').value = data.publisher;
  document.getElementById('reading-paginas').value = data.pages;
  document.getElementById('reading-anio-pub').value = data.pubYear;
  document.getElementById('reading-idioma').value = data.language;
  document.getElementById('reading-cover').value = data.cover;
  previewReadingCover(data.cover);
  document.getElementById('reading-search-results').style.display = 'none';
  document.getElementById('reading-search').value = data.title;
  showToast('✓ Datos de Google Books');
}

// ── Compresión de imágenes antes de guardar ─────────────
// Redimensiona y comprime cualquier imagen a JPEG ≤ 150KB
// maxWidth: ancho máximo en px (alto se escala proporcional)
// quality: 0-1 calidad JPEG
function compressImage(file, maxWidth, quality) {
  maxWidth  = maxWidth  || 800;
  quality   = quality   || 0.75;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ev => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Calcular dimensiones manteniendo aspecto
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // Intentar JPEG primero; si falla (PNG transparente), usar PNG con calidad reducida
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Si sigue siendo muy grande, reducir calidad
        let attempts = 0;
        while (dataUrl.length > 200000 && attempts < 4) {
          quality = quality * 0.75;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          attempts++;
        }
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── PORTADA: modal lectura en curso ──────────────
function previewReadingCover(url) {
  const el = document.getElementById('reading-cover-preview');
  if (!url) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="position:relative;display:inline-block;">
      <img src="${url}" alt="Portada"
        style="height:110px;border-radius:4px;box-shadow:0 3px 12px rgba(0,0,0,0.18);display:block;"
        onerror="this.parentElement.innerHTML='<div style=\'padding:8px 12px;background:#fee;border-radius:4px;font-size:12px;color:var(--red);\'>⚠ No se pudo cargar la imagen</div>'">
    </div>`;
}

function clearReadingCover() {
  document.getElementById('reading-cover').value = '';
  document.getElementById('reading-cover-preview').innerHTML = '';
  document.getElementById('reading-cover-google-results').style.display = 'none';
}

function handleReadingCoverFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('⏳ Procesando imagen...');
  compressImage(file, 600, 0.8).then(dataUrl => {
    document.getElementById('reading-cover').value = dataUrl;
    previewReadingCover(dataUrl);
    showToast('✓ Imagen cargada');
  }).catch(() => showToast('⚠ Error al cargar imagen'));
  event.target.value = '';
}

async function searchReadingCoverGoogle() {
  const titulo = document.getElementById('reading-titulo').value.trim() ||
                 document.getElementById('reading-search').value.trim();
  if (!titulo) { showToast('Ingresa primero el título'); return; }
  const resultsEl = document.getElementById('reading-cover-google-results');
  resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Buscando portadas...</div>';
  resultsEl.style.display = 'block';
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(titulo)}&maxResults=6`);
    const data = await res.json();
    if (!data.items) { resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Sin resultados.</div>'; return; }
    const covers = data.items
      .map(i => ({ cover: i.volumeInfo.imageLinks?.thumbnail?.replace('http://','https://').replace('zoom=1','zoom=2') || '', title: i.volumeInfo.title || '' }))
      .filter(i => i.cover);
    if (covers.length === 0) { resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">No se encontraron portadas.</div>'; return; }
    resultsEl.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;">` +
      covers.map(c => `<img src="${c.cover}" title="${c.title}"
        style="height:80px;border-radius:3px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;box-shadow:0 2px 6px rgba(0,0,0,0.12);"
        onclick="selectReadingCover('${c.cover.replace(/'/g,"&#39;")}')"
        onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='transparent'"
        onerror="this.style.display='none'">`).join('') + `</div>`;
  } catch { resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Error al buscar.</div>'; }
}

function selectReadingCover(url) {
  document.getElementById('reading-cover').value = url;
  previewReadingCover(url);
  document.getElementById('reading-cover-google-results').style.display = 'none';
  showToast('✓ Portada seleccionada');
}

// ── PORTADA: modal progreso ──────────────
function toggleEditCover() {
  const panel = document.getElementById('edit-cover-panel');
  const chevron = document.getElementById('edit-cover-chevron');
  const open = panel.style.display === 'none';
  panel.style.display = open ? 'block' : 'none';
  chevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  if (open) {
    // Pre-fill with current cover
    const id = document.getElementById('progress-entry-id').value;
    const e = db.entries.find(x => x.id === id);
    if (e && coverUrl(e)) {
      document.getElementById('progress-cover-url').value = coverUrl(e);
      previewProgressCover(coverUrl(e));
    }
  }
}

function previewProgressCover(url) {
  const el = document.getElementById('progress-cover-preview');
  if (!url) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="position:relative;display:inline-block;">
      <img src="${url}" alt="Portada"
        style="height:100px;border-radius:4px;box-shadow:0 3px 12px rgba(0,0,0,0.18);display:block;"
        onerror="this.parentElement.innerHTML='<div style=\'padding:8px 12px;background:#fee;border-radius:4px;font-size:12px;color:var(--red);\'>⚠ No se pudo cargar la imagen</div>'">
    </div>`;
}

function clearProgressCover() {
  document.getElementById('progress-cover-url').value = '';
  document.getElementById('progress-cover-preview').innerHTML = '';
  document.getElementById('progress-cover-google-results').style.display = 'none';
}

function handleProgressCoverFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('⏳ Procesando imagen...');
  compressImage(file, 600, 0.8).then(dataUrl => {
    document.getElementById('progress-cover-url').value = dataUrl;
    previewProgressCover(dataUrl);
    showToast('✓ Imagen cargada');
  }).catch(() => showToast('⚠ Error al cargar imagen'));
  event.target.value = '';
}

async function searchProgressCoverGoogle() {
  const id = document.getElementById('progress-entry-id').value;
  const e = db.entries.find(x => x.id === id);
  const titulo = e ? e.titulo : '';
  if (!titulo) { showToast('Sin título para buscar'); return; }
  const resultsEl = document.getElementById('progress-cover-google-results');
  resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--ink3);">Buscando portadas...</div>';
  resultsEl.style.display = 'block';
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(titulo)}&maxResults=6`);
    const data = await res.json();
    if (!data.items) { resultsEl.innerHTML = '<div style="padding:10px;font-size:13px;color:var(--ink3);">Sin resultados.</div>'; return; }
    const covers = data.items
      .map(i => ({ cover: i.volumeInfo.imageLinks?.thumbnail?.replace('http://','https://').replace('zoom=1','zoom=2') || '', title: i.volumeInfo.title || '' }))
      .filter(i => i.cover);
    resultsEl.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;">` +
      covers.map(c => `<img src="${c.cover}" title="${c.title}"
        style="height:72px;border-radius:3px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;box-shadow:0 2px 6px rgba(0,0,0,0.12);"
        onclick="selectProgressCover('${c.cover.replace(/'/g,"&#39;")}')"
        onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='transparent'"
        onerror="this.style.display='none'">`).join('') + `</div>`;
  } catch { resultsEl.innerHTML = '<div style="padding:10px;font-size:13px;color:var(--ink3);">Error al buscar.</div>'; }
}

function selectProgressCover(url) {
  document.getElementById('progress-cover-url').value = url;
  previewProgressCover(url);
  document.getElementById('progress-cover-google-results').style.display = 'none';
  showToast('✓ Portada seleccionada');
}

function saveProgressCover() {
  const id = document.getElementById('progress-entry-id').value;
  const e = db.entries.find(x => x.id === id);
  const url = document.getElementById('progress-cover-url').value.trim();
  if (!e) return;
  e.cover = url;
  saveDB();
  // Rebuild header
  const imgHtml = url
    ? `<img src="${url}" style="width:44px;height:62px;object-fit:cover;border-radius:3px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.15);">`
    : `<div style="width:44px;height:62px;background:var(--cream3);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;">📚</div>`;
  document.getElementById('progress-book-info').innerHTML = `
    ${imgHtml}
    <div>
      <div style="font-family:var(--font-serif);font-size:14px;font-weight:700;">${e.titulo}</div>
      <div style="font-size:11px;color:var(--ink3);">${e.autor||''}</div>
      ${e.paginas?`<div style="font-size:11px;color:var(--ink4);margin-top:2px;">${e.paginas} páginas</div>`:''}
    </div>`;
  // Close panel
  document.getElementById('edit-cover-panel').style.display = 'none';
  document.getElementById('edit-cover-chevron').style.transform = 'rotate(0deg)';
  showToast('✓ Portada actualizada');
  renderHome();
}

// ── Portada en modal principal (Registrar estímulo) ──────
function previewMainCover(inputId, previewId) {
  const url = document.getElementById(inputId)?.value || '';
  const el  = document.getElementById(previewId);
  if (!el) return;
  if (!url) { el.innerHTML = ''; return; }
  el.innerHTML = `<img src="${url}" alt="Portada"
    style="height:90px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:block;"
    onerror="this.parentElement.innerHTML='<span style=\'font-size:11px;color:var(--red);\'>⚠ No se pudo cargar</span>'">`;
}

function handleMainCoverFile(event, inputId, previewId) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('⏳ Procesando imagen...');
  compressImage(file, 600, 0.8).then(dataUrl => {
    const inp = document.getElementById(inputId);
    if (inp) inp.value = dataUrl;
    previewMainCover(inputId, previewId);
    showToast('✓ Imagen cargada');
  }).catch(() => showToast('⚠ Error al cargar imagen'));
  event.target.value = '';
}

// ── Datalists para modal principal (Registrar estímulo) ──
function fillMainAutorList() {
  const q = (document.getElementById('f-autor')?.value || '').toLowerCase();
  const autores = [...new Set(
    db.entries.filter(e => e.autor && e.autor.trim())
      .map(e => e.autor.trim())
      .filter(a => !q || a.toLowerCase().includes(q))
  )].sort().slice(0, 10);
  const dl = document.getElementById('f-autor-list');
  if (dl) dl.innerHTML = autores.map(a => `<option value="${a}">`).join('');
}

function fillMainEditorialList() {
  const q = (document.getElementById('f-editorial')?.value || '').toLowerCase();
  const edits = [...new Set(
    db.entries.filter(e => e.editorial && e.editorial.trim())
      .map(e => e.editorial.trim())
      .filter(ed => !q || ed.toLowerCase().includes(q))
  )].sort().slice(0, 10);
  const dl = document.getElementById('f-editorial-list');
  if (dl) dl.innerHTML = edits.map(e => `<option value="${e}">`).join('');
}

// ── Datalists para modal lectura en curso ──────────────
function fillReadingAutorList() {
  const q = (document.getElementById('reading-autor')?.value || '').toLowerCase();
  const autores = [...new Set(
    db.entries.filter(e => e.autor && e.autor.trim())
      .map(e => e.autor.trim())
      .filter(a => !q || a.toLowerCase().includes(q))
  )].sort().slice(0, 10);
  const dl = document.getElementById('reading-autor-list');
  if (dl) dl.innerHTML = autores.map(a => `<option value="${a}">`).join('');
}

function fillReadingEditorialList() {
  const q = (document.getElementById('reading-editorial')?.value || '').toLowerCase();
  const edits = [...new Set(
    db.entries.filter(e => e.editorial && e.editorial.trim())
      .map(e => e.editorial.trim())
      .filter(ed => !q || ed.toLowerCase().includes(q))
  )].sort().slice(0, 10);
  const dl = document.getElementById('reading-editorial-list');
  if (dl) dl.innerHTML = edits.map(e => `<option value="${e}">`).join('');
}

function fillReadingIdiomaList() {
  const q = (document.getElementById('reading-idioma')?.value || '').toLowerCase();
  // Combinar idiomas base + los ya usados en la biblioteca
  const usados = [...new Set(
    db.entries.filter(e => e.idioma && e.idioma.trim()).map(e => normalizeIdioma(e.idioma))
  )];
  const todos = [...new Set([...IDIOMAS_BASE, ...usados])]
    .filter(i => !q || i.toLowerCase().includes(q))
    .sort().slice(0, 15);
  const dl = document.getElementById('reading-idioma-list');
  if (dl) dl.innerHTML = todos.map(i => `<option value="${i}">`).join('');
}

function openReadingModal() {
  // Limpiar todos los campos antes de abrir
  ['reading-titulo','reading-autor','reading-editorial',
   'reading-paginas','reading-anio-pub','reading-edicion','reading-ciudad-pub','reading-traductor','reading-idioma','reading-cover','reading-origen-adq','reading-fecha-adq']
    .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('reading-cover-preview').innerHTML = '';
  // Pre-poblar datalists con datos de la biblioteca
  fillReadingAutorList();
  fillReadingEditorialList();
  fillReadingIdiomaList();
  document.getElementById('reading-prog-pct').value = 0;
  document.getElementById('reading-pct-display').textContent = '0';
  document.getElementById('reading-prog-pag').value = '';
  document.getElementById('reading-prog-pct-field').style.display = 'block';
  document.getElementById('reading-prog-pag-field').style.display = 'none';
  // Reset modo lectura a pct
  readingMode = 'pct';
  document.querySelectorAll('.reading-mode-btn').forEach(b => {
    const isPct = b.dataset.mode === 'pct';
    b.style.borderColor  = isPct ? 'var(--gold)' : 'var(--border)';
    b.style.background   = isPct ? '#fff8e8'     : '#fff';
    b.style.color        = isPct ? 'var(--gold)'  : 'var(--ink3)';
  });
  openModal('modal-add-reading');
}

function saveReadingEntry() {
  return lumenSafeAction("Empezar a seguir", () => {
  const get = id => document.getElementById(id);
  const val = id => (get(id)?.value ?? '').toString();
  const titulo = val('reading-titulo').trim();
  if (!titulo) { showToast('Ingresa el título'); return; }

  const paginas = parseInt(val('reading-paginas')) || 0;
  const progPct = parseInt(val('reading-prog-pct')) || 0;
  const progPag = parseInt(val('reading-prog-pag')) || 0;
  const now = Date.now();
  const norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const autor = val('reading-autor').trim();

  // Si el libro ya existe como pendiente/leyendo/inventario, reutilizar el mismo registro.
  let entry = (db.entries||[]).find(e => e && e.type==='libro' && norm(e.titulo)===norm(titulo) && (!autor || !e.autor || norm(e.autor)===norm(autor)) && e.estado!=='leido');
  const created = !entry;
  const before = entry ? JSON.parse(JSON.stringify(entry)) : null;

  if (!entry) {
    entry = { id:'e_'+now, type:'libro', titulo, rating:0, notas:'', readDates:[] };
    db.entries.push(entry);
  }

  Object.assign(entry, {
    titulo,
    autor: autor || entry.autor || '',
    editorial: val('reading-editorial').trim() || entry.editorial || '',
    paginas: paginas || entry.paginas || 0,
    anio_pub: parseInt(val('reading-anio-pub')) || entry.anio_pub || null,
    edicion: val('reading-edicion').trim() || entry.edicion || '',
    ciudad_publicacion: val('reading-ciudad-pub').trim() || entry.ciudad_publicacion || entry.ciudad || '',
    traductor: val('reading-traductor').trim() || entry.traductor || '',
    idioma: val('reading-idioma').trim() || entry.idioma || '',
    cover: val('reading-cover').trim() || entry.cover || '',
    origen_adquisicion: val('reading-origen-adq') || entry.origen_adquisicion || null,
    fecha_adquisicion: val('reading-fecha-adq') || entry.fecha_adquisicion || null,
    estado: 'leyendo',
    readingMode,
    progreso: readingMode === 'pct' ? Math.max(0,Math.min(100,progPct)) : (paginas ? Math.max(0,Math.min(100,Math.round((progPag/paginas)*100))) : (entry.progreso||0)),
    progresoPag: readingMode === 'pag' ? progPag : null,
    startDate: entry.startDate || new Date().toISOString(),
    _updatedAt: now
  });

  ensureBookCanonicalRefs(entry);

  // Si estaba marcado en inventario, conservar y reforzar el vínculo físico.
  if (entry.enInventario) {
    const inv = loadInventory();
    const linked = inv.find(x => x.linkedEntryId===entry.id) || findBookLink({titulo:entry.titulo,autor:entry.autor,editorial:entry.editorial});
    if (linked && !linked.linkedEntryId) { linked.linkedEntryId=entry.id; linked._updatedAt=now; safeLocalSetItem(INVENTORY_KEY,JSON.stringify(inv)); }
  }

  try {
    saveDB();
  } catch (err) {
    // Evita dejar un alta a medias y muestra el error real en pantalla.
    if (created) db.entries = db.entries.filter(e => e.id!==entry.id);
    else if (before) Object.assign(entry,before);
    console.error('[LUMEN v184] Error al iniciar lectura:', err);
    const msg = err && (err.name==='QuotaExceededError' || /quota/i.test(err.message||''))
      ? 'No se pudo guardar: almacenamiento local lleno'
      : `No se pudo guardar la lectura${err?.message?': '+err.message:''}`;
    showToast('⚠ '+msg, 5000);
    return;
  }

  closeModal('modal-add-reading');
  showToast(created ? '✓ Lectura en curso guardada' : '✓ Lectura existente actualizada');
  renderHome();
  if (libFilter==='inventario') renderInventory();

  });
}


// ── SUGERENCIAS DE SERIES EN CURSO — v156 ───────────────────────────────
function normalizeSerieTitleForMatch(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function getCanonicalSerieSuggestions(query) {
  const q = normalizeSerieTitleForMatch(query);
  if (!q || q.length < 2) return [];

  const byKey = new Map();
  (db.entries || [])
    .filter(e => e && e.type === 'serie' && e.titulo)
    .forEach(e => {
      const key = normalizeSerieTitleForMatch(e.titulo);
      if (!key) return;
      const existing = byKey.get(key);
      const currentTs = Number(e._updatedAt || 0);
      const existingTs = existing ? Number(existing._updatedAt || 0) : -1;
      if (!existing || currentTs > existingTs) byKey.set(key, e);
    });

  return Array.from(byKey.values())
    .map(e => {
      const key = normalizeSerieTitleForMatch(e.titulo);
      let score = 0;
      if (key === q) score = 100;
      else if (key.startsWith(q)) score = 80;
      else if (key.includes(q)) score = 60;
      else {
        const tokens = String(query || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean);
        const ok = tokens.length && tokens.every(t => key.includes(t));
        if (ok) score = 45;
      }
      return { e, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || String(a.e.titulo).localeCompare(String(b.e.titulo)))
    .slice(0, 5)
    .map(x => x.e);
}

function renderWatchingTitleSuggestions() {
  const input = document.getElementById('watching-titulo');
  const box = document.getElementById('watching-title-suggestions');
  if (!input || !box) return;

  const suggestions = getCanonicalSerieSuggestions(input.value);
  if (!suggestions.length) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }

  box.innerHTML = suggestions.map(e => {
    const meta = [e.director, e.anio_est, e.temporadas ? 'T' + e.temporadas : '']
      .filter(Boolean).join(' · ');
    return `<button type="button" onclick="applyWatchingTitleSuggestion('${String(e.id).replace(/'/g, "\\'")}')" style="width:100%;display:flex;align-items:center;gap:10px;padding:9px 11px;border:none;border-bottom:1px solid var(--cream2);background:#fff;text-align:left;cursor:pointer;font-family:var(--font-sans);">
      ${e.cover ? `<img src="${escapeHtml(e.cover)}" style="width:26px;height:36px;object-fit:cover;border-radius:2px;background:var(--cream3);flex-shrink:0;">` : `<span style="width:26px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--cream2);border-radius:2px;flex-shrink:0;">📺</span>`}
      <span style="min-width:0;flex:1;">
        <span style="display:block;font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(e.titulo)}</span>
        <span style="display:block;font-size:10px;color:var(--ink4);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(meta || 'Serie en biblioteca')}</span>
      </span>
      <span style="font-size:10px;color:var(--gold);font-weight:700;letter-spacing:1px;text-transform:uppercase;">Usar</span>
    </button>`;
  }).join('') + `<div style="font-size:10px;color:var(--ink4);padding:7px 11px;background:var(--cream2);line-height:1.4;">Puedes ignorar estas sugerencias y guardar el nombre escrito manualmente.</div>`;
  box.style.display = 'block';
}

function applyWatchingTitleSuggestion(id) {
  const serie = (db.entries || []).find(e => e && e.id === id);
  if (!serie) return;

  const setIfBlank = (fieldId, value) => {
    const el = document.getElementById(fieldId);
    if (!el || value === undefined || value === null || value === '') return;
    if (!String(el.value || '').trim() || el.value === '0') el.value = value;
  };

  const titleEl = document.getElementById('watching-titulo');
  if (titleEl) titleEl.value = serie.titulo || titleEl.value;

  setIfBlank('watching-director', serie.director || serie.creador);
  setIfBlank('watching-anio-est', serie.anio_est);
  setIfBlank('watching-protagonista', serie.protagonista);
  setIfBlank('watching-cover', serie.cover);
  setIfBlank('watching-cap-total', serie.capTotal || serie.capsPorTemp);

  const box = document.getElementById('watching-title-suggestions');
  if (box) { box.innerHTML = ''; box.style.display = 'none'; }
  updateWatchingBar();
  showToast('✓ Nombre canónico aplicado');
}

function updateWatchingBar() {
  const actual = parseInt(document.getElementById('watching-cap-actual').value) || 0;
  const total  = parseInt(document.getElementById('watching-cap-total').value)  || 0;
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  document.getElementById('watching-progress-bar').style.width = pct + '%';
  document.getElementById('watching-progress-pct').textContent = total > 0 ? `Cap. ${actual} de ${total} · ${pct}%` : '';
}

function saveWatchingEntry() {
  const titulo = document.getElementById('watching-titulo').value.trim();
  if (!titulo) { showToast('Ingresa el título'); return; }
  const entry = {
    id: 'e_' + Date.now(),
    type: 'serie',
    titulo,
    director:        document.getElementById('watching-director').value.trim(),
    anio_est:        parseInt(document.getElementById('watching-anio-est').value) || null,
    temporadas:      parseInt(document.getElementById('watching-temporadas').value) || 1,
    temporadaActual: parseInt(document.getElementById('watching-temporada-actual').value) || 1,
    protagonista:    document.getElementById('watching-protagonista').value.trim(),
    capActual:       parseInt(document.getElementById('watching-cap-actual').value) || 0,
    capTotal:        parseInt(document.getElementById('watching-cap-total').value)  || 0,
    cover:           document.getElementById('watching-cover').value.trim(),
    estado: 'viendo',
    rating: 0, notas: '',
    _updatedAt: Date.now()
  };
  // Reset form
  ['watching-titulo','watching-director','watching-anio-est','watching-protagonista','watching-cap-actual','watching-cap-total','watching-cover'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const watchingSug = document.getElementById('watching-title-suggestions');
  if (watchingSug) { watchingSug.innerHTML = ''; watchingSug.style.display = 'none'; }
  document.getElementById('watching-temporadas').value = 1;
  document.getElementById('watching-temporada-actual').value = 1;
  document.getElementById('watching-progress-bar').style.width = '0%';
  document.getElementById('watching-progress-pct').textContent = '';
  db.entries.push(entry);
  saveDB();
  closeModal('modal-add-watching');
  showToast('✓ Serie en curso guardada');
  renderHome();
}

// ── MODAL PROGRESO ──────────────────
function openProgressModal(id) {
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  document.getElementById('progress-entry-id').value = id;
  document.getElementById('progress-modal-title').textContent = e.titulo;
  // Book info header — compact sin fondo para móvil
  document.getElementById('progress-book-info').innerHTML = `
    ${coverUrl(e)?`<img src="${coverUrl(e)}" style="width:44px;height:62px;object-fit:cover;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">`:'<div style="width:44px;height:62px;background:var(--cream3);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;">📚</div>'}
    <div style="flex:1;">
      <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;line-height:1.2;">${e.titulo}</div>
      <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${e.autor||''}</div>
      ${e.paginas?`<div style="font-size:11px;color:var(--ink4);margin-top:2px;">${e.paginas} páginas</div>`:''}
    </div>`;

  // Si tiene páginas, siempre abrir en modo página — es más preciso
  const mode = e.paginas ? 'pag' : (e.readingMode || 'pct');
  // Sincronizar readingMode en el entry para que saveProgress lo lea correctamente
  e.readingMode = mode;

  // Toggle modo — pequeño y secundario
  document.getElementById('progress-mode-display').innerHTML = `
    <div style="display:flex;justify-content:center;gap:6px;margin-bottom:4px;">
      <button class="progress-mode-btn ${mode==='pag'?'active':''}" onclick="switchProgressMode('pag')" style="font-size:11px;padding:5px 12px;">📖 Página</button>
      <button class="progress-mode-btn ${mode==='pct'?'active':''}" onclick="switchProgressMode('pct')" style="font-size:11px;padding:5px 12px;">% Ebook</button>
    </div>`;

  if (mode === 'pag') {
    document.getElementById('progress-pct-section').style.display = 'none';
    document.getElementById('progress-pag-section').style.display = 'block';
    const pag = e.progresoPag || Math.round(((e.progreso||0)/100)*(e.paginas||0));
    document.getElementById('progress-pag-input').value = pag || '';
    document.getElementById('progress-pag-input').max = e.paginas || 9999;
    document.getElementById('progress-pag-of').textContent = e.paginas ? `de ${e.paginas} páginas` : '';
    const pct = e.paginas ? Math.round((pag/e.paginas)*100) : 0;
    document.getElementById('progress-pag-bar').style.width = pct + '%';
    document.getElementById('progress-pag-pct-text').textContent = pag ? `${pct}% completado` : '';
  } else {
    document.getElementById('progress-pct-section').style.display = 'block';
    document.getElementById('progress-pag-section').style.display = 'none';
    const val = e.progreso || 0;
    document.getElementById('progress-pct-slider').value = val;
    const pctBar = document.getElementById('progress-pct-bar');
    if (pctBar) pctBar.style.width = val + '%';
    const pctTxt = document.getElementById('progress-pct-label-text');
    if (pctTxt) pctTxt.textContent = val > 0 ? `${val}% completado` : '';
  }

  // Ritmo reciente + estimación
  const ritmoInfo = calcRitmoReciente(e.readDates, 7);
  const pagsLeidas = e.progresoPag || Math.round(((e.progreso||0)/100)*(e.paginas||0));
  const pagsRestantes = e.paginas ? e.paginas - pagsLeidas : null;
  let ritmoHTML = '';
  if (ritmoInfo && ritmoInfo.ritmo > 0) {
    const nLabel = ritmoInfo.registros >= 7 ? 'últimos 7 registros' : `últimos ${ritmoInfo.registros} registros`;
    const diasRest = pagsRestantes > 0 ? Math.ceil(pagsRestantes / ritmoInfo.ritmo) : null;
    const fechaFin = diasRest ? (() => {
      const f = new Date(); f.setDate(f.getDate() + diasRest);
      return f.toLocaleDateString('es', {day:'numeric', month:'long'});
    })() : null;
    ritmoHTML = `<div style="background:var(--cream2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--ink3);">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
        <span>📖 Ritmo reciente</span>
        <b style="color:var(--ink);font-size:14px;">${ritmoInfo.ritmo.toFixed(1)} págs/día</b>
      </div>
      <div style="font-size:11px;color:var(--ink4);">${nLabel} · ${ritmoInfo.paginasLeidas} págs en ${ritmoInfo.dias} días</div>
      ${diasRest ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;">
        <span>📅 Estimación final</span>
        <b style="color:var(--gold);">~${diasRest} días · ${fechaFin}</b>
      </div>` : ''}
    </div>`;
  } else if (pagsLeidas > 0) {
    ritmoHTML = `<div style="background:var(--cream2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--ink4);">
      Actualiza el progreso al menos 2 veces para calcular el ritmo.
    </div>`;
  }
  document.getElementById('progress-ritmo-info').innerHTML = ritmoHTML;
  openModal('modal-progress');
}

function onProgressSlider(val) {
  const pct = Math.min(100, Math.max(0, parseInt(val)||0));
  const bar = document.getElementById('progress-pct-bar');
  if (bar) bar.style.width = pct + '%';
  const txt = document.getElementById('progress-pct-label-text');
  if (txt) txt.textContent = pct > 0 ? `${pct}% completado` : '';
}

function switchProgressMode(mode) {
  const id = document.getElementById('progress-entry-id').value;
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  e.readingMode = mode;
  document.querySelectorAll('.progress-mode-btn').forEach(b => b.classList.toggle('active', b.textContent.startsWith(mode==='pct'?'%':'📖')));
  if (mode === 'pct') {
    document.getElementById('progress-pct-section').style.display = 'block';
    document.getElementById('progress-pag-section').style.display = 'none';
    const val = e.progreso || 0;
    document.getElementById('progress-pct-slider').value = val;
    const bar = document.getElementById('progress-pct-bar');
    if (bar) bar.style.width = val + '%';
    const txt = document.getElementById('progress-pct-label-text');
    if (txt) txt.textContent = val > 0 ? `${val}% completado` : '';
  } else {
    document.getElementById('progress-pct-section').style.display = 'none';
    document.getElementById('progress-pag-section').style.display = 'block';
    document.getElementById('progress-pag-of').textContent = e.paginas ? `de ${e.paginas}` : '';
    const pag = e.progresoPag || 0;
    document.getElementById('progress-pag-input').value = pag;
    document.getElementById('progress-pag-input').max = e.paginas || 9999;
    const pct = e.paginas ? Math.round((pag/e.paginas)*100) : 0;
    document.getElementById('progress-pag-bar').style.width = pct + '%';
    document.getElementById('progress-pag-pct-text').textContent = pct ? `${pct}% completado` : '';
  }
}

function onProgressPagInput(val) {
  const id = document.getElementById('progress-entry-id').value;
  const e = db.entries.find(x => x.id === id);
  const pags = e ? e.paginas : 0;
  const pct = pags ? Math.round((parseInt(val)||0)/pags*100) : 0;
  document.getElementById('progress-pag-bar').style.width = Math.min(100,pct) + '%';
  document.getElementById('progress-pag-pct-text').textContent = `${pct}% completado`;
}

function saveProgress() {
  return lumenSafeAction("Guardar progreso", () => {
  const id = document.getElementById('progress-entry-id').value;
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  // Leer el modo desde la UI (sección visible) — más fiable que e.readingMode
  const pagSectionVisible = document.getElementById('progress-pag-section')?.style.display !== 'none';
  const mode = pagSectionVisible ? 'pag' : 'pct';
  e.readingMode = mode; // sincronizar siempre
  if (mode === 'pct') {
    e.progreso = parseInt(document.getElementById('progress-pct-slider').value) || 0;
    e.progresoPag = null;
  } else {
    const pag = parseInt(document.getElementById('progress-pag-input').value) || 0;
    e.progresoPag = pag;
    e.progreso = e.paginas ? Math.round((pag/e.paginas)*100) : 0;
  }
  // Guardar marca de página del día — {date, pag}
  const today = todaySantiagoStr();
  if (!e.readDates) e.readDates = [];
  // Normalizar al nuevo formato si viene del legado
  e.readDates = normalizeReadDates(e.readDates);
  const pagActual = mode === 'pag'
    ? (parseInt(document.getElementById('progress-pag-input').value) || 0)
    : Math.round(((e.progreso||0)/100)*(e.paginas||0));
  const existing = e.readDates.find(r => r.date === today);
  if (existing) {
    existing.pag = pagActual; // actualizar si ya existe entrada de hoy
  } else {
    e.readDates.push({ date: today, pag: pagActual });
  }
  e._updatedAt = Date.now();
  saveDB();
  closeModal('modal-progress');
  showToast('✓ Progreso actualizado');
  renderHome();

  });
}

function finishBook() {
  return lumenSafeAction("Terminar libro", () => {
  const id = document.getElementById('progress-entry-id').value;
  const e = db.entries.find(x => x.id === id);
  if (!e) return;
  const today = todaySantiagoStr();
  const [yy, mm] = today.split('-').map(Number);
  e.estado = 'leido';
  e.progreso = 100;
  e.progresoPag = e.paginas || e.progresoPag || 0;
  e.anio = yy;
  e.mes = MESES[(mm || 1) - 1];
  e.finishDate = today;
  if (!e.readDates) e.readDates = [];
  e.readDates = normalizeReadDates(e.readDates);
  const pagFinal = Number(e.paginas || e.progresoPag || 0);
  if (pagFinal > 0) {
    const existing = e.readDates.find(r => r.date === today);
    if (existing) existing.pag = Math.max(Number(existing.pag || 0), pagFinal);
    else e.readDates.push({ date: today, pag: pagFinal });
  }
  e._updatedAt = Date.now();
  saveDB();
  closeModal('modal-progress');
  showToast(`🎉 ¡Terminaste "${e.titulo}"!`, 3000);
  renderHome();
  if (currentScreen === 'library') renderLibrary();

  });
}
function showToast(msg, dur = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

