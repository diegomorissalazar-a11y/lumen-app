// LUMEN v189 — completitud bibliográfica y acceso desde Normalizar
'use strict';

function bibliographyCompletionMissing(book) {
  if (!book || book.type !== 'libro') return ['libro'];
  const b = canonicalBookBibliography(book);
  const original = book.anio_publicacion_original ?? book.bibliografia?.obraOriginal?.anioPublicacionOriginal ?? book.periodo_publicacion_inicio ?? book.bibliografia?.obraOriginal?.periodoInicio ?? null;
  const missing = [];
  if (!b.editorial) missing.push('editorial');
  if (!b.anio) missing.push('año de esta edición');
  if (!b.edicion) missing.push('edición');
  if (!b.ciudad) missing.push('ciudad');
  if (!b.isbn) missing.push('ISBN');
  if (original === null || original === undefined || original === '') missing.push('publicación original');
  return missing;
}

function incompleteBibliographyBooks() {
  return (db.entries || [])
    .filter(e => e && e.type === 'libro')
    .map(e => ({ book: e, missing: bibliographyCompletionMissing(e) }))
    .filter(x => x.missing.length > 0)
    .sort((a, b) => String(a.book.titulo || '').localeCompare(String(b.book.titulo || ''), 'es', {sensitivity:'base'}));
}

function renderIncompleteBibliographyBooks() {
  if (typeof renderMetadataNormalizerBooks === 'function') return renderMetadataNormalizerBooks();
  const count = document.getElementById('norm-books-count');
  const list = document.getElementById('norm-books-list');
  if (!list) return;
  const rows = incompleteBibliographyBooks();
  if (count) count.textContent = `${rows.length} libro${rows.length === 1 ? '' : 's'} con ficha bibliográfica incompleta`;
  list.innerHTML = rows.map(({book, missing}) => `<div class="norm-book-row"><div class="norm-book-main"><div class="norm-book-title">${escapeHtml(book.titulo || 'Sin título')}</div><div class="norm-book-author">${escapeHtml(book.autor || 'Autor no informado')}</div><div class="norm-book-missing">Falta: ${missing.map(escapeHtml).join(' · ')}</div></div><button class="btn btn-secondary btn-sm" style="width:auto;white-space:nowrap;" onclick="openBibliographyFromNormalizerBooks('${String(book.id).replace(/'/g,"\\'")}')">📥 Cargar JSON bibliográfico</button></div>`).join('');
}

function openBibliographyFromNormalizerBooks(bookId) {
  openBibliographicJsonModal(bookId);
  _bibJsonContext.mode = 'normalizer-books';
  _bibJsonContext.returnTab = 'libros';
}

function afterBibliographicApplyV188() {
  const targetId=_bibJsonContext?.targetId||'';
  const target=targetId&&targetId!=='__form__'?(db.entries||[]).find(e=>String(e.id)===String(targetId)):null;
  if (target && typeof metadataSuggestionsForBook==='function') {
    const suggestions=metadataSuggestionsForBook(target);
    if(suggestions.length && _bibJsonContext?.mode!=='normalizer-books') showToast(`ℹ ${suggestions.length} sugerencia(s) de clasificación disponibles en Normalizar → Libros`,4200);
  }
  if (_bibJsonContext?.mode === 'normalizer-books') {
    switchNormTab('libros');
    if (typeof renderMetadataNormalizerBooks === 'function') renderMetadataNormalizerBooks(); else renderIncompleteBibliographyBooks();
  }
}
