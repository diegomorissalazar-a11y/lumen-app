// LUMEN v189 — completitud bibliográfica y acceso desde Normalizar
'use strict';

function bibliographyCompletionMissing(book) {
  if(!book||book.type!=='libro')return ['libro'];
  const missing=[];
  if(!String(book.editorial||book.bibliografia?.edicion?.editorial||'').trim())missing.push('editorial');
  const original=typeof getBookOriginalPublicationYear==='function'?getBookOriginalPublicationYear(book):(book.anio_publicacion_original||book.anio_obra_original||book.anio_pub||book.anio_est);
  if(!Number.isFinite(Number(original))||Number(original)<=0)missing.push('publicación original');
  if(!(Array.isArray(book.generos)&&book.generos.some(Boolean))&&!String(book.genero||'').trim())missing.push('género');
  if(!(Number(book.paginas)>0))missing.push('páginas');
  return missing;
}

function incompleteBibliographyBooks() {
  return (db.entries || [])
    .filter(e => e && e.type === 'libro')
    .map(e => ({ book: e, missing: bibliographyCompletionMissing(e) }))
    .filter(x => x.missing.length > 0)
    .sort((a, b) => String(a.book.titulo || '').localeCompare(String(b.book.titulo || ''), 'es', {sensitivity:'base'}));
}

function renderIncompleteBibliographyBooks(){
  const count=document.getElementById('norm-books-count'),list=document.getElementById('norm-books-list');if(!list)return;
  const rows=incompleteBibliographyBooks();if(count)count.textContent=`${rows.length} libros incompletos (editorial, publicación original, género o páginas)`;
  const sug=document.getElementById('norm-books-suggestion-count');if(sug)sug.textContent='';
  const propagation=document.getElementById('norm-books-propagation-list');if(propagation)propagation.innerHTML='';
  list.innerHTML=rows.length?rows.map(({book,missing})=>`<div class="norm-book-row"><div class="norm-book-main"><strong>${escapeHtml(book.titulo||'Sin título')}</strong><div>${escapeHtml(book.autor||'Autor no registrado')}</div><small>Falta: ${missing.map(escapeHtml).join(' · ')}</small></div><button class="btn btn-secondary btn-sm" style="width:auto" onclick="openBibliographyFromNormalizerBooks('${String(book.id).replace(/'/g,"\'")}')">Completar ficha</button></div>`).join(''):'<p style="padding:18px">Todos los libros tienen los cuatro datos completos.</p>';
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
