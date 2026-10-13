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
  list.innerHTML=rows.length?rows.map(({book,missing})=>`<div class="norm-book-row"><div class="norm-book-main"><strong>${escapeHtml(book.titulo||'Sin título')}</strong><div>${escapeHtml(book.autor||'Autor no registrado')}</div><small>Falta: ${missing.map(escapeHtml).join(' · ')}</small><div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">${missing.map(m=>`<button type="button" class="btn btn-secondary btn-sm" onclick="openIncompleteFieldModal(decodeURIComponent('${encodeURIComponent(book.id)}'),decodeURIComponent('${encodeURIComponent(m)}'))">+ ${escapeHtml(m)}</button>`).join('')}</div></div><button class="btn btn-secondary btn-sm" style="width:auto" onclick="openBibliographyFromNormalizerBooks('${String(book.id).replace(/'/g,"\'")}')">Completar ficha</button></div>`).join(''):'<p style="padding:18px">Todos los libros tienen los cuatro datos completos.</p>';
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

// v214: cada campo faltante se completa de manera independiente y auditada.
let _incompleteEditing={id:null,field:null};
function openIncompleteFieldModal(id,field){
  const book=(db.entries||[]).find(e=>String(e.id)===String(id)&&e.type==='libro');if(!book)return;
  _incompleteEditing={id,field};
  if(field==='género' && typeof openGeneroQuick==='function'){openGeneroQuick(id);return;}
  let modal=document.getElementById('lumen-incomplete-field-modal');
  if(!modal){modal=document.createElement('div');modal.id='lumen-incomplete-field-modal';modal.className='modal-overlay';document.body.append(modal);}
  const genres=['Novela','Cuento','Poesía','Ensayo','Historia','Biografía','Crónica','Ciencia ficción','Filosofía','Entrevista','Religión','Mitología','Teatro'];
  const editorials=[...new Set((db.entries||[]).filter(e=>e.type==='libro').map(e=>String(e.editorial||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const options=editorials.map(e=>`<option value="${escapeHtml(e)}"></option>`).join('');
  const input=field==='editorial'?`<label><input type="radio" name="incomp-ed-type" value="existing" checked onchange="incompleteEditorialMode()"> Editorial existente</label> <label><input type="radio" name="incomp-ed-type" value="new" onchange="incompleteEditorialMode()"> Nueva editorial</label><input id="incomp-ed-value" class="input" list="incomp-ed-list" placeholder="Buscar editorial existente"><datalist id="incomp-ed-list">${options}</datalist>`:
   field==='páginas'?'<label>Número total de páginas</label><input id="incomp-field-value" class="input" type="number" min="1" step="1" placeholder="Número entero mayor que cero">':
   field==='publicación original'?'<label>Año de publicación original (no edición)</label><input id="incomp-field-value" class="input" type="number" min="1" max="2100" step="1" placeholder="Ej. 1982">':
   `<label>Géneros (puedes seleccionar varios)</label><div id="incomp-genre-list" style="display:flex;gap:8px;flex-wrap:wrap">${genres.map(g=>`<label style="padding:5px;border:1px solid var(--border)"><input type="checkbox" value="${g}"> ${g}</label>`).join('')}</div><div id="incomp-poetry-help" style="font-size:12px"></div>`;
  modal.innerHTML=`<div class="modal" style="max-width:560px;margin:auto"><div class="modal-header"><div class="modal-title">Completar ${escapeHtml(field)}</div><button class="btn btn-secondary btn-sm" onclick="closeIncompleteFieldModal()">Cerrar</button></div><div class="modal-body"><p style="margin-bottom:12px">${escapeHtml(book.titulo||'Libro')} — ${escapeHtml(book.autor||'')}</p>${input}<div style="display:flex;gap:8px;margin-top:15px"><button class="btn btn-primary btn-sm" onclick="saveIncompleteField()">Guardar campo</button><button class="btn btn-secondary btn-sm" onclick="closeIncompleteFieldModal()">Cancelar</button></div></div></div>`;
  modal.style.display='flex';modal.classList.add('open');
  if(field==='género')modal.querySelectorAll('input[type=checkbox]').forEach(e=>e.addEventListener('change',()=>{const poetry=[...modal.querySelectorAll('input:checked')].some(x=>x.value==='Poesía');document.getElementById('incomp-poetry-help').textContent=poetry?'Al guardar Poesía se abrirá la clasificación literaria disponible en LUMEN.':'';}));
}
function incompleteEditorialMode(){const value=document.getElementById('incomp-ed-value');if(value){value.value='';value.placeholder=document.querySelector('input[name="incomp-ed-type"]:checked')?.value==='new'?'Escribir editorial nueva':'Buscar editorial existente';}}
function closeIncompleteFieldModal(){const m=document.getElementById('lumen-incomplete-field-modal');if(m){m.classList.remove('open');m.style.display='none';}}
function saveIncompleteField(){
  const {id,field}=_incompleteEditing,book=(db.entries||[]).find(e=>String(e.id)===String(id));if(!book)return;
  let value;
  if(field==='editorial'){
    value=document.getElementById('incomp-ed-value')?.value.trim();
    const mode=document.querySelector('input[name="incomp-ed-type"]:checked')?.value;
    const registered=[...new Set((db.entries||[]).map(e=>String(e.editorial||'').trim()).filter(Boolean))];
    if(!value){showToast('Debes ingresar una editorial');return;}
    const found=registered.find(x=>invNorm(x)===invNorm(value));
    if(mode==='existing'&&!found){showToast('Selecciona una editorial que ya exista');return;}
    if(mode==='new'&&found){showToast('Ya existe esa editorial. Selecciónala como existente');return;}
    book.editorial=found||value;
    if(book.bibliografia?.edicion)book.bibliografia.edicion.editorial=book.editorial;
  }else if(field==='género'){
    value=[...document.querySelectorAll('#incomp-genre-list input:checked')].map(e=>e.value);
    if(!value.length){showToast('Selecciona al menos un género');return;}
    book.generos=value;
  }else if(field==='páginas'){
    value=Number(document.getElementById('incomp-field-value')?.value);
    if(!Number.isSafeInteger(value)||value<=0){showToast('Páginas: debe ser un entero mayor que cero');return;}
    book.paginas=value;
  }else{
    value=Number(document.getElementById('incomp-field-value')?.value);
    if(!Number.isSafeInteger(value)||value<1||value>2100){showToast('Año original inválido');return;}
    book.anio_pub=value;book.anio_obra_original=value;
  }
  book._updatedAt=Date.now();
  try{if(saveDB()===false)throw new Error('No se pudo guardar');}catch(err){showToast('Error al guardar el campo');return;}
  closeIncompleteFieldModal();renderIncompleteBibliographyBooks();showToast('✓ Campo actualizado');
  if(field==='género'&&value.includes('Poesía')&&typeof offerPoetryMetadataPropagation==='function')setTimeout(()=>offerPoetryMetadataPropagation(book),150);
  if(field==='género'&&value.includes('Historia')&&typeof openHistoriaQuick==='function')setTimeout(()=>openHistoriaQuick(book.id),160);
}
