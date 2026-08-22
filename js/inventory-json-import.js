// ═══════════════════════════════════════════════════════════════
// LUMEN v186 — Inventario: alta/enriquecimiento por JSON bibliográfico
// Reutiliza el parser y las entidades canónicas de Bibliografía.
// ═══════════════════════════════════════════════════════════════
'use strict';

let _inventoryBibParsed = null;
let _inventoryBibPreview = null;

function inventoryBestCanonicalCandidate(kind, name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const exact = findCanonicalEntity(kind, raw);
  if (exact) return { id: exact.id, name: exact.nombreCanonico, sim: 1, exact: true };
  let best = null;
  allKnownEntityNames(kind).forEach(x => {
    const sim = entitySimilarity(raw, x.name);
    if (!best || sim > best.sim) best = { id: x.id, name: canonicalNameById(kind, x.id, x.name), sim, exact: false };
  });
  return best;
}

function inventoryBookOriginalYear(book) {
  return book?.anio_publicacion_original ?? book?.bibliografia?.obraOriginal?.anioPublicacionOriginal ?? null;
}

function inventoryBookIsbn(book) {
  return String(book?.isbn || book?.bibliografia?.edicionConsultada?.isbn || '').trim();
}

function inventoryBookCandidateForPayload(n, authorCandidate = null) {
  const books = (db.entries || []).filter(e => e?.type === 'libro');
  const isbn = String(n?.edicionConsultada?.isbn || '').trim();
  if (isbn) {
    const exactIsbn = books.find(b => canonicalText(inventoryBookIsbn(b)) === canonicalText(isbn));
    if (exactIsbn) return { book: exactIsbn, reason: 'ISBN exacto', score: 1, exact: true };
  }
  const title = canonicalText(n?.titulo || '');
  if (!title) return null;
  const authorName = authorCandidate?.name || n?.autor || '';
  const authorNorm = canonicalText(authorName);
  let best = null;
  books.forEach(book => {
    const bt = canonicalText(book.titulo || '');
    if (!bt) return;
    const titleSim = entitySimilarity(title, bt);
    const bookAuthor = canonicalNameById('aut', book.autorId || '', book.autor || '');
    const authorSim = authorNorm ? entitySimilarity(authorNorm, bookAuthor) : 1;
    const sameAuthor = !authorNorm || authorSim >= 0.90;
    if (!sameAuthor) return;
    const score = (titleSim * 0.85) + (Math.min(authorSim, 1) * 0.15);
    if (!best || score > best.score) best = { book, reason: titleSim === 1 ? 'Título + autor' : 'Título similar + autor', score, titleSim, authorSim, exact: titleSim === 1 && authorSim >= 0.999 };
  });
  if (!best) return null;
  if (best.exact || best.titleSim >= 0.90) return best;
  return null;
}

function inventoryEntityPreview(kind, name, label) {
  if (!name) return { label, state: 'empty', text: 'Sin dato' };
  const c = inventoryBestCanonicalCandidate(kind, name);
  if (!c) return { label, state: 'new', text: `Nuevo: ${name}` };
  if (c.exact) return { label, state: 'exact', text: `Existente: ${c.name}` };
  if (c.sim >= 0.90) return { label, state: 'similar', text: `Posible coincidencia: ${c.name} · ${Math.round(c.sim * 100)}%` };
  return { label, state: 'new', text: `Nuevo: ${name}` };
}

function inventoryPreviewRow(label, value, state='info') {
  const colors = { exact:'var(--green)', similar:'var(--gold)', new:'var(--blue)', info:'var(--ink2)', match:'var(--green)' };
  return `<div style="display:grid;grid-template-columns:105px 1fr;gap:8px;padding:8px 10px;border-bottom:1px solid var(--cream2);font-size:11px;"><strong>${escapeHtml(label)}</strong><span style="color:${colors[state] || colors.info};font-weight:${state==='info'?'400':'700'};">${escapeHtml(String(value || '—'))}</span></div>`;
}

function openInventoryJsonImport() {
  _inventoryBibParsed = null;
  _inventoryBibPreview = null;
  const ta = document.getElementById('inventory-json-text');
  const preview = document.getElementById('inventory-json-preview');
  const apply = document.getElementById('inventory-json-confirm');
  if (ta) ta.value = '';
  if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
  if (apply) apply.style.display = 'none';
  openModal('modal-inventory-json');
}

function previewInventoryJson() {
  try {
    const ta = document.getElementById('inventory-json-text');
    const txt = sanitizeBibliographicJsonText(ta?.value || '');
    if (ta) ta.value = txt;
    const raw = JSON.parse(txt);
    const n = normalizeBibliographicPayload(raw);
    const authorCandidate = inventoryBestCanonicalCandidate('aut', n.autor);
    const publisherCandidate = inventoryBestCanonicalCandidate('edi', n.edicionConsultada?.editorial || '');
    const bookCandidate = inventoryBookCandidateForPayload(n, authorCandidate);
    _inventoryBibParsed = n;
    _inventoryBibPreview = { authorCandidate, publisherCandidate, bookCandidate };

    const authorP = inventoryEntityPreview('aut', n.autor, 'Autor');
    const pubP = inventoryEntityPreview('edi', n.edicionConsultada?.editorial || '', 'Editorial');
    const e = n.edicionConsultada || {}, o = n.obraOriginal || {};
    const period = [o.periodoInicio, o.periodoFin].filter((v,i,a)=>v!==null&&v!==undefined&&v!==''&&(i===0||String(v)!==String(a[0]))).join('–');
    const rows = [];
    rows.push(inventoryPreviewRow('Libro', n.titulo || 'Sin título'));
    rows.push(inventoryPreviewRow(authorP.label, authorP.text, authorP.state));
    rows.push(inventoryPreviewRow(pubP.label, pubP.text, pubP.state));
    if (bookCandidate) rows.push(inventoryPreviewRow('Coincidencia libro', `${bookCandidate.book.titulo} · ${bookCandidate.reason}${bookCandidate.exact?'':' · '+Math.round(bookCandidate.score*100)+'%'}`, 'match'));
    else rows.push(inventoryPreviewRow('Coincidencia libro', 'No se encontró una ficha existente; se creará un libro nuevo.', 'new'));
    if (e.isbn) rows.push(inventoryPreviewRow('ISBN', e.isbn));
    if (e.anio) rows.push(inventoryPreviewRow('Año edición', e.anio));
    if (e.descripcionEdicion || e.numeroEdicion) rows.push(inventoryPreviewRow('Edición', e.descripcionEdicion || e.numeroEdicion));
    if (e.ciudad) rows.push(inventoryPreviewRow('Ciudad', e.ciudad));
    if (e.traductores?.length) rows.push(inventoryPreviewRow('Traductores', e.traductores.join('; ')));
    if (o.anioPublicacionOriginal != null) rows.push(inventoryPreviewRow('Publicación original', o.anioPublicacionOriginal));
    if (period) rows.push(inventoryPreviewRow('Período original', period));

    const preview = document.getElementById('inventory-json-preview');
    if (preview) {
      preview.style.display = 'block';
      preview.innerHTML = `<div style="padding:10px 11px;background:var(--cream2);font-size:11px;line-height:1.5;color:var(--ink3);"><strong>Revisión antes de guardar.</strong> Las coincidencias ≥90% de autor/editorial se confirmarán al aplicar. Si el libro ya existe, se enriquecerá la misma ficha y se marcará Inventario.</div>${rows.join('')}`;
    }
    const apply = document.getElementById('inventory-json-confirm');
    if (apply) apply.style.display = n.titulo ? 'inline-flex' : 'none';
    if (!n.titulo) showToast('⚠ El JSON necesita título para crear o vincular el libro', 4000);
  } catch (err) {
    _inventoryBibParsed = null;
    _inventoryBibPreview = null;
    const preview = document.getElementById('inventory-json-preview');
    if (preview) { preview.style.display='block'; preview.innerHTML=`<div style="padding:11px;color:var(--red);font-size:11px;">⚠ ${escapeHtml(err.message || String(err))}</div>`; }
    const apply = document.getElementById('inventory-json-confirm');
    if (apply) apply.style.display = 'none';
    showToast('⚠ '+(err.message || 'JSON inválido'), 4500);
  }
}

function inventoryApplyBibliographyToBook(book, n, canon, authorEntity) {
  const e = n.edicionConsultada || {}, o = n.obraOriginal || {}, { pub, tradEnt, bib } = canon;
  if (n.titulo) book.titulo = book.titulo || n.titulo;
  if (authorEntity?.id) { book.autorId = authorEntity.id; book.autor = authorEntity.nombreCanonico; }
  else if (n.autor && !book.autor) book.autor = n.autor;
  if (pub?.id) { book.editorialId = pub.id; book.editorial = pub.nombreCanonico; }
  else if (e.editorial && !book.editorial) book.editorial = e.editorial;
  book.bibliografia = bib;
  if (e.anio != null && e.anio !== '') book.anio_pub = Number(e.anio) || e.anio;
  if (e.descripcionEdicion || e.numeroEdicion) book.edicion = String(e.descripcionEdicion || e.numeroEdicion);
  if (e.ciudad) book.ciudad_publicacion = e.ciudad;
  if (e.isbn) book.isbn = e.isbn;
  if (tradEnt.length) { book.traductor = tradEnt.map(x=>x.nombreCanonico).join('; '); book.traductorIds = tradEnt.map(x=>x.id); }
  if (o.idiomaOriginal) book.idioma = book.idioma || o.idiomaOriginal;
  if (o.anioPublicacionOriginal != null) book.anio_publicacion_original = Number(o.anioPublicacionOriginal);
  if (o.periodoInicio != null) book.periodo_publicacion_inicio = Number(o.periodoInicio);
  if (o.periodoFin != null) book.periodo_publicacion_fin = Number(o.periodoFin);
  book.enInventario = true;
  book._updatedAt = Date.now();
  ensureBookCanonicalRefs(book);
  return book;
}

function confirmInventoryJsonImport() {
  return lumenSafeAction('Agregar libro con JSON', () => {
    const n = _inventoryBibParsed;
    if (!n || !n.titulo) { showToast('Revisa primero el JSON'); return; }

    const authorWasExact = !!findCanonicalEntity('aut', n.autor);
    const authorEntity = n.autor ? resolveCanonicalEntity('aut', n.autor, true) : null;
    const canon = buildCanonicalBibliography(n); // normaliza editorial + traductores con confirmación ≥90%
    let candidate = inventoryBookCandidateForPayload(n, authorEntity);
    let book = candidate?.book || null;

    if (book && !candidate.exact && candidate.score < 0.999) {
      const ok = confirm(`¿El JSON corresponde al libro ya existente “${book.titulo}” de ${book.autor || 'autor sin registrar'}?\nCoincidencia: ${Math.round(candidate.score*100)}%\n\nAceptar enriquecerá esa ficha y evitará un duplicado.`);
      if (!ok) book = null;
    }

    const isNewBook = !book;
    if (!book) {
      book = {
        id: 'e_' + Date.now(), type: 'libro', titulo: n.titulo,
        autor: authorEntity?.nombreCanonico || n.autor || '', autorId: authorEntity?.id || '',
        editorial: '', paginas: 0, anio_pub: null, edicion: '', ciudad_publicacion: '', traductor: '', idioma: '',
        mes: '', anio: null, estado: 'pendiente', progreso: 0, abandono: null, generos: [], historia: null,
        cover: '', notas: '', notas_lista: [], readDates: [], enInventario: true,
        _updatedAt: Date.now()
      };
      db.entries.push(book);
    }

    inventoryApplyBibliographyToBook(book, n, canon, authorEntity);
    syncInventoryFromBook(book);
    const ok = saveDB();
    if (ok === false) throw new Error('No se pudo persistir la ficha localmente.');

    closeModal('modal-inventory-json');
    _inventoryBibParsed = null; _inventoryBibPreview = null;
    renderInventory();
    if (currentScreen === 'home') renderHome();
    const authorMsg = n.autor && !authorWasExact && authorEntity ? ` · Autor: ${authorEntity.nombreCanonico}` : '';
    showToast(`${isNewBook ? '✓ Libro creado' : '✓ Ficha existente enriquecida'} y agregado al inventario${authorMsg}`, 4200);
  });
}

// Crea/normaliza una ficha canónica para una fila básica del CSV de inventario.
function ensureInventoryBookFromBasicItem(item) {
  if (!item?.titulo) return null;
  let linked = item.linkedEntryId ? (db.entries || []).find(e=>e.id===item.linkedEntryId && e.type==='libro') : null;
  if (!linked) linked = findBookLink(item);
  if (linked) {
    linked.enInventario = true;
    linked._updatedAt = Date.now();
    if (!linked.editorial && item.editorial) linked.editorial = item.editorial;
    ensureBookCanonicalRefs(linked);
    return linked;
  }
  const author = item.autor ? resolveCanonicalEntity('aut', item.autor, true) : null;
  const publisher = item.editorial ? resolveCanonicalEntity('edi', item.editorial, true) : null;
  const book = {
    id:'e_'+Date.now()+'_'+Math.random().toString(36).slice(2,7), type:'libro', titulo:item.titulo,
    autor:author?.nombreCanonico || item.autor || '', autorId:author?.id || '',
    editorial:publisher?.nombreCanonico || item.editorial || '', editorialId:publisher?.id || '',
    paginas:0, anio_pub:null, edicion:'', ciudad_publicacion:'', traductor:'', idioma:'', mes:'', anio:null,
    estado:'pendiente', progreso:0, generos:[], cover:'', notas:'', notas_lista:[], readDates:[], enInventario:true,
    _updatedAt:Date.now()
  };
  ensureBookCanonicalRefs(book);
  db.entries.push(book);
  return book;
}
