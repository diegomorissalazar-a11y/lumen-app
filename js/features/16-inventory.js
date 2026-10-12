// ═══════════════════════════════════
// INVENTARIO FÍSICO — LUMEN v165
// ═══════════════════════════════════
const INVENTORY_KEY = 'lumen_inventory_v1';
let inventoryImportPending = [];

function invNorm(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[“”‘’'"`´]/g,'')
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function loadInventory() {
  try {
    const data = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch(e) { return []; }
}
function saveInventory(items, sync=true) {
  safeLocalSetItem(INVENTORY_KEY, JSON.stringify(items));
  if (sync) saveDB();
}
function inventoryKey(item, includeEditorial=true) {
  const base = `${invNorm(item.titulo)}||${invNorm(item.autor)}`;
  return includeEditorial ? `${base}||${invNorm(item.editorial)}` : base;
}
function findBookLink(item) {
  const title = invNorm(item.titulo), author = invNorm(item.autor);
  if (!title) return null;
  return db.entries.find(e => e.type === 'libro' && invNorm(e.titulo) === title && (!author || !invNorm(e.autor) || invNorm(e.autor) === author)) || null;
}
function relinkInventory(save=true) {
  const inv = loadInventory(); let changed=false;
  inv.forEach(item => {
    const book=findBookLink(item);
    const next=book?book.id:'';
    if ((item.linkedEntryId||'') !== next) { item.linkedEntryId=next; item._updatedAt=Date.now(); changed=true; }
  });
  if(changed) saveInventory(inv,save);
  return inv;
}

const _renderLibraryBeforeInventory = window.renderLibrary;
window.renderLibrary = function() {
  if (libFilter === 'inventario') { renderInventory(); return; }
  const search=document.getElementById('lib-search'); if(search) search.placeholder='Buscar en mi biblioteca...';
  return _renderLibraryBeforeInventory();
};

function inventoryBooksUnified(){
  const inv=relinkInventory(false),invByBook=new Map(inv.filter(x=>x.linkedEntryId).map(x=>[x.linkedEntryId,x]));
  const books=db.entries.filter(e=>e.type==='libro'&&(e.enInventario||invByBook.has(e.id)));
  const unlinked=inv.filter(x=>!x.linkedEntryId&&!findBookLink(x));
  return {books,unlinked,inventory:inv};
}

let inventorySortMode = (() => {
  try { return sessionStorage.getItem('lumen_inventory_sort_mode') || 'title'; }
  catch(e) { return 'title'; }
})();
let inventoryContentsEditingId = null;

function inventoryAuthorLabel(book){
  if(!book) return '';
  return canonicalNameById('aut',book.autorId||'',book.autor||'') || book.autor || '';
}
function inventorySortComparator(a,b){
  const opts={sensitivity:'base',numeric:true};
  const titleA=String(a?.titulo||''), titleB=String(b?.titulo||'');
  if(inventorySortMode==='added'||inventorySortMode==='acquired'){
    const date = e => inventorySortMode==='acquired' ? (e?.fecha_adquisicion||'') : String(e?._createdAt||e?.createdAt||e?.fecha_registro||e?._updatedAt||'');
    return date(b).localeCompare(date(a)) || titleA.localeCompare(titleB,'es',opts);
  }
  if(inventorySortMode==='author'){
    const authorA=String(a?.autorCanonico||inventoryAuthorLabel(a)||a?.autor||'');
    const authorB=String(b?.autorCanonico||inventoryAuthorLabel(b)||b?.autor||'');
    const byAuthor=authorA.localeCompare(authorB,'es',opts);
    if(byAuthor) return byAuthor;
  }
  return titleA.localeCompare(titleB,'es',opts) || String(a?.id||a?.inventoryId||'').localeCompare(String(b?.id||b?.inventoryId||''),'es',opts);
}
function setInventorySortMode(mode){
  inventorySortMode = ['author','added','acquired'].includes(mode) ? mode : 'title';
  try { sessionStorage.setItem('lumen_inventory_sort_mode',inventorySortMode); } catch(e){}
  renderInventory();
}

function inventoryContainedWorks(book){
  const ids=Array.isArray(book?.containedWorkIds)?book.containedWorkIds.filter(Boolean):[];
  return ids.map(id=>(db.entries||[]).find(e=>e.id===id&&e.type==='libro')).filter(Boolean);
}
function inventoryContainerState(book){
  const works=inventoryContainedWorks(book);
  if(!works.length) return {isContainer:false,total:0,read:0,complete:false,partial:false};
  const read=works.filter(w=>w.estado==='leido').length;
  return {isContainer:true,total:works.length,read,complete:read===works.length,partial:read>0&&read<works.length};
}
function inventoryIsRead(book){
  const s=inventoryContainerState(book);
  return s.isContainer ? s.complete : book?.estado==='leido';
}
function inventoryContainerMetaHTML(book){
  const shouldOffer=book?.inventoryContainer || (Array.isArray(book?.containedWorkIds)&&book.containedWorkIds.length) || String(book?.titulo||'').includes('/');
  if(!shouldOffer) return '';
  const s=inventoryContainerState(book);
  const suggested=(!s.isContainer && typeof inventoryContainedWorkCandidates==='function')
    ? inventoryContainedWorkCandidates({titulo:book.titulo,autor:book.autor},{nombreCanonico:inventoryAuthorLabel(book)},book.id).matches
    : [];
  const status=s.isContainer
    ? `${s.read} de ${s.total} obras leídas · ${s.complete?'Completo':(s.partial?'Parcial':'Pendiente')}`
    : (suggested.length ? `${suggested.length} obra(s) coincidente(s) encontradas` : 'Vincular las obras contenidas en este ejemplar');
  const cls=s.complete?'complete':(s.partial?'partial':'pending');
  return `<div class="inventory-contained-bar ${cls}">
    <div class="inventory-contained-status">📚 ${escapeHtml(status)}</div>
    <button class="btn btn-secondary btn-sm" onclick="openInventoryContents('${book.id}')">${s.isContainer?'Editar obras':'Vincular obras'}</button>
  </div>`;
}

function renderInventory(){
  if(typeof updateLibraryFilterButtonVisibility==='function')updateLibraryFilterButtonVisibility();
  const list=document.getElementById('library-list'),search=document.getElementById('lib-search');
  if(search)search.placeholder='Buscar en mi inventario físico...';
  const q=invNorm(search?.value||''),data=inventoryBooksUnified();
  let books=data.books.filter(e=>!q||[e.titulo,e.autor,e.editorial].some(v=>invNorm(v).includes(q)));
  if(typeof libraryFilterCount==='function' && libraryFilterCount()>0 && typeof libraryBookPassesTagFilters==='function') books=books.filter(libraryBookPassesTagFilters);
  books=books.sort(inventorySortComparator);
  let unlinked=data.unlinked.filter(x=>!q||[x.titulo,x.autor,x.editorial].some(v=>invNorm(v).includes(q)));
  unlinked=unlinked.sort(inventorySortComparator);
  const visible=books.length+unlinked.length,total=data.books.length+data.unlinked.length;
  list.innerHTML=`<div class="inventory-toolbar">
    <button class="btn btn-primary btn-sm" onclick="openInventoryImport()">📥 Importar inventario</button>
    <button class="btn btn-secondary btn-sm" onclick="openInventoryData()">📊 Datos del inventario</button>
    <button class="btn btn-secondary btn-sm" onclick="openInventoryJsonImport()">📚 + Libro con JSON</button>
    <label class="inventory-sort-control">Ordenar
      <select class="input" onchange="setInventorySortMode(this.value)">
        <option value="title"${inventorySortMode==='title'?' selected':''}>Título A–Z</option>
        <option value="author"${inventorySortMode==='author'?' selected':''}>Autor A–Z</option>
        <option value="added"${inventorySortMode==='added'?' selected':''}>Últimos añadidos</option>
        <option value="acquired"${inventorySortMode==='acquired'?' selected':''}>Adquiridos recientemente</option>
      </select>
    </label>
    <span class="inventory-count">${visible} de ${total}</span>
  </div>
  ${books.length?books.map(e=>entryCardHTML(e)+inventoryContainerMetaHTML(e)).join(''):''}
  ${unlinked.length?`<div style="font-size:10px;color:var(--ink4);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:14px 0 7px;">Pendientes de vincular</div>${unlinked.map(inventoryUnlinkedCardHTML).join('')}`:''}
  ${!visible?'<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Aún no hay libros en el inventario.</div></div>':''}`;
}

function openInventoryContents(bookId){
  const book=(db.entries||[]).find(e=>e.id===bookId&&e.type==='libro');
  if(!book)return;
  inventoryContentsEditingId=bookId;
  const title=document.getElementById('inventory-contents-title');
  const search=document.getElementById('inventory-contents-search');
  if(title)title.textContent=book.titulo||'Ejemplar físico';
  if(search)search.value='';
  renderInventoryContentsPicker();
  openModal('modal-inventory-contents');
}
function renderInventoryContentsPicker(){
  const book=(db.entries||[]).find(e=>e.id===inventoryContentsEditingId&&e.type==='libro');
  const body=document.getElementById('inventory-contents-list');
  if(!book||!body)return;
  const q=invNorm(document.getElementById('inventory-contents-search')?.value||'');
  const currentIds=Array.isArray(book.containedWorkIds)?book.containedWorkIds:[];
  const suggested=(!currentIds.length && typeof inventoryContainedWorkCandidates==='function')
    ? inventoryContainedWorkCandidates({titulo:book.titulo,autor:book.autor},{nombreCanonico:inventoryAuthorLabel(book)},book.id).matches.map(x=>x.book.id)
    : [];
  const current=new Set(currentIds.length?currentIds:suggested);
  const author=inventoryAuthorLabel(book);
  let candidates=(db.entries||[]).filter(e=>e.type==='libro'&&e.id!==book.id);
  if(author){
    candidates=candidates.filter(e=>{
      const a=inventoryAuthorLabel(e);
      return !a || entitySimilarity(author,a)>=0.90;
    });
  }
  if(q)candidates=candidates.filter(e=>[e.titulo,e.autor,e.editorial].some(v=>invNorm(v).includes(q)));
  candidates.sort((a,b)=>String(a.titulo||'').localeCompare(String(b.titulo||''),'es',{sensitivity:'base',numeric:true}));
  body.innerHTML=candidates.length?candidates.map(e=>`
    <label class="inventory-work-option">
      <input type="checkbox" value="${escapeHtml(e.id)}"${current.has(e.id)?' checked':''}>
      <span><strong>${escapeHtml(e.titulo||'Sin título')}</strong><small>${escapeHtml([inventoryAuthorLabel(e),e.estado==='leido'?'Leído':(e.estado||'Pendiente')].filter(Boolean).join(' · '))}</small></span>
    </label>`).join(''):'<div class="empty" style="padding:18px;"><div class="empty-text">No hay obras candidatas.</div></div>';
}
function saveInventoryContents(){
  return lumenSafeAction('Guardar obras del ejemplar',()=>{
    const book=(db.entries||[]).find(e=>e.id===inventoryContentsEditingId&&e.type==='libro');
    if(!book)return;
    const ids=[...document.querySelectorAll('#inventory-contents-list input[type="checkbox"]:checked')].map(x=>x.value).filter(id=>id!==book.id);
    book.containedWorkIds=[...new Set(ids)];
    book.inventoryContainer=book.containedWorkIds.length>0;
    book._updatedAt=Date.now();
    if(typeof invalidateRecommendations==='function') invalidateRecommendations('obras de inventario vinculadas');
    const ok=saveDB();
    if(ok===false)throw new Error('No se pudo persistir la relación de obras.');
    closeModal('modal-inventory-contents');
    inventoryContentsEditingId=null;
    renderInventory();
    showToast(book.inventoryContainer?'✓ Obras contenidas vinculadas':'✓ Ejemplar guardado sin obras vinculadas');
  });
}

function inventoryUnlinkedCardHTML(item){const esc2=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return `<div class="inventory-card"><div class="inventory-card-title">${esc2(item.titulo||'Sin título')}</div><div class="inventory-card-sub">${[item.autor,item.editorial].filter(Boolean).map(esc2).join(' · ')||'Información incompleta'}</div><div class="inventory-card-actions"><span class="inventory-status">Sin vincular</span><button class="btn btn-primary btn-sm" onclick="startInventoryReading('${item.inventoryId}')">Crear / comenzar lectura</button></div></div>`;}
function inventoryTopRows(entries,getter,limit=8){const counts=new Map();entries.forEach(e=>{let vals=getter(e);if(!Array.isArray(vals))vals=[vals];vals.filter(Boolean).forEach(v=>{const k=String(v).trim();if(k)counts.set(k,(counts.get(k)||0)+1);});});return[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit);}
function inventoryStatRows(rows){if(!rows.length)return'<div style="font-size:12px;color:var(--ink4);font-style:italic;">Sin datos suficientes.</div>';const max=Math.max(...rows.map(x=>x[1]),1);return rows.map(([name,count])=>`<div class="inventory-stat-row"><div class="inventory-stat-name">${String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div><div class="inventory-stat-bar"><div class="inventory-stat-bar-fill" style="width:${Math.round(count/max*100)}%"></div></div><strong>${count}</strong></div>`).join('');}
function openInventoryData(){
  const body=document.getElementById('inventory-data-body');if(!body)return;
  const data=inventoryBooksUnified(),books=data.books,total=books.length+data.unlinked.length;
  const read=books.filter(inventoryIsRead).length;
  const reading=books.filter(e=>!inventoryContainerState(e).isContainer&&e.estado==='leyendo').length;
  const partial=books.filter(e=>inventoryContainerState(e).partial).length;
  const abandoned=books.filter(e=>e.estado==='abandonado').length;
  const pending=books.filter(e=>{
    const s=inventoryContainerState(e);
    if(s.isContainer) return !s.complete && !s.partial;
    return e.estado==='pendiente'||!e.estado;
  }).length;
  const ratio=total?Math.round(read/total*100):0;
  body.innerHTML=`<div class="inventory-data-grid">
    <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">Libros físicos</div></div>
    <div class="stat-box"><div class="stat-num" style="font-size:28px;">${read} de ${total}</div><div class="stat-label">Leídos · ${ratio}%</div></div>
    <div class="stat-box"><div class="stat-num">${reading}</div><div class="stat-label">Leyendo</div></div>
    <div class="stat-box"><div class="stat-num">${partial}</div><div class="stat-label">Parciales multiobra</div></div>
    <div class="stat-box"><div class="stat-num">${pending}</div><div class="stat-label">No leídos</div></div>
    <div class="stat-box"><div class="stat-num">${abandoned}</div><div class="stat-label">Abandonados</div></div>
    <div class="stat-box"><div class="stat-num">${data.unlinked.length}</div><div class="stat-label">Sin vincular</div></div>
  </div>
  <div class="inventory-stat-section"><div class="chart-section-title" style="margin-bottom:6px;">Autores del inventario</div>${inventoryStatRows(inventoryTopRows(books,e=>e.autor))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title" style="margin-bottom:6px;">Editoriales del inventario</div>${inventoryStatRows(inventoryTopRows(books,e=>e.editorial))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title" style="margin-bottom:6px;">Géneros del inventario</div>${inventoryStatRows(inventoryTopRows(books,e=>e.generos||[]))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Traductores</div>${inventoryStatRows(inventoryTopRows(books,e=>Array.isArray(e.traductores)?e.traductores:(e.traductor||'').split(/\s*(?:;|\s&\s)\s*/)))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Idiomas originales</div>${inventoryStatRows(inventoryTopRows(books,e=>e.idioma_original||e.idioma))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Publicaciones originales por década</div>${inventoryStatRows(inventoryTopRows(books,e=>{const y=Number(typeof getBookOriginalPublicationYear==='function'?getBookOriginalPublicationYear(e):e.anio_pub||e.anio_est);return y?Math.floor(y/10)*10+'–'+(Math.floor(y/10)*10+9):''},100))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Ediciones por año</div>${inventoryStatRows(inventoryTopRows(books,e=>e.anio_edicion||e.edicion_anio||e.anio_ed||'',100))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Catálogo de libros del inventario</div><input class="input" id="inventory-data-catalog-query" placeholder="Buscar título, autor o editorial" oninput="filterInventoryDataCatalog(this.value)" style="margin:10px 0"><div id="inventory-data-catalog-list">${books.map(e=>`<div class="inventory-catalog-item" data-search="${escapeHtml(invNorm((e.titulo||'')+' '+(e.autor||'')+' '+(e.editorial||'')))}" style="padding:7px 0;border-bottom:1px solid var(--border)"><strong>${escapeHtml(e.titulo||'Sin título')}</strong><div style="font-size:11px;color:var(--ink3)">${escapeHtml(e.autor||'')} · ${escapeHtml(e.editorial||'')}</div></div>`).join('')}</div></div>
  <div class="inventory-stat-section"><div class="chart-section-title">Adquisiciones por año</div>${inventoryStatRows(inventoryTopRows(books,e=>String(e.fecha_adquisicion||'').match(/^\d{4}/)?.[0]||'',100))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Adquisiciones por mes (año-mes)</div>${inventoryStatRows(inventoryTopRows(books,e=>String(e.fecha_adquisicion||'').match(/^\d{4}-\d{2}/)?.[0]||'',100))}</div>
  <div class="inventory-stat-section"><div class="chart-section-title">Datos curiosos del inventario</div>${inventoryInventoryCuriosities(books,total,read)}</div>
  <div style="font-size:11px;color:var(--ink4);line-height:1.5;margin-top:8px;">Los ejemplares multiobra se consideran leídos en Inventario cuando todas sus obras vinculadas están leídas. Esto no crea un libro leído adicional en las estadísticas generales.</div>`;
  openModal('modal-inventory-data');
  renderInventoryDataNavigation();
}

function startInventoryReading(id){
  const inv=loadInventory();const item=inv.find(x=>x.inventoryId===id);if(!item)return;
  let book=findBookLink(item);
  if(book && book.estado==='leido'){showToast('Este libro ya está marcado como leído');showDetail(book.id);return;}
  if(!book){book={id:'inv_book_'+Date.now(),type:'libro',titulo:item.titulo,autor:item.autor||'',editorial:item.editorial||'',estado:'leyendo',progreso:0,readDates:[],cover:'',notas:'',enInventario:true,startDate:new Date().toISOString(),_updatedAt:Date.now()};db.entries.push(book);}
  else{book.estado='leyendo';book.enInventario=true;book.startDate=book.startDate||new Date().toISOString();book._updatedAt=Date.now();if(!book.editorial&&item.editorial)book.editorial=item.editorial;}
  item.linkedEntryId=book.id;item._updatedAt=Date.now();
  try{safeLocalSetItem(INVENTORY_KEY,JSON.stringify(inv));saveDB();}catch(err){console.error('[LUMEN v184] Inventario → lectura:',err);showToast('⚠ No se pudo iniciar la lectura: '+(err.message||'error local'),4500);return;}
  renderInventory();renderHome();showToast('✓ Libro agregado a Leyendo ahora');
}
function openInventoryImport(){inventoryImportPending=[];document.getElementById('inventory-import-preview').innerHTML='';document.getElementById('inventory-import-confirm').style.display='none';document.getElementById('inventory-csv-input').value='';openModal('modal-inventory-import');}
function inventoryCol(row,...names){for(const name of names){const key=Object.keys(row).find(k=>invNorm(k)===invNorm(name));if(key&&String(row[key]||'').trim())return String(row[key]).trim();}return '';}
function handleInventoryCSV(event){const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>analyzeInventoryCSV(ev.target.result);reader.readAsText(file,'UTF-8');}
function analyzeInventoryCSV(text){const clean=String(text||'').replace(/^\uFEFF/,'');const lines=clean.split(/\r?\n/).filter(x=>x.trim());if(lines.length<2){showToast('CSV vacío');return;}const headers=parseCSVLine(lines[0]);const existing=loadInventory();const exact=new Map(existing.map(x=>[inventoryKey(x,true),x]));const base=new Map();existing.forEach(x=>{const k=inventoryKey(x,false);if(!base.has(k))base.set(k,[]);base.get(k).push(x);});const rows=[];for(let i=1;i<lines.length;i++){const cols=parseCSVLine(lines[i]);const row={};headers.forEach((h,j)=>row[h]=(cols[j]||'').trim());const item={sourceId:inventoryCol(row,'ID','id'),titulo:inventoryCol(row,'Título','Titulo','Nombre'),autor:inventoryCol(row,'Autor'),editorial:inventoryCol(row,'Editorial')};if(!item.titulo){rows.push({...item,status:'incompleto',reason:'Sin título'});continue;}const ek=inventoryKey(item,true),bk=inventoryKey(item,false);if(exact.has(ek)){rows.push({...item,status:'duplicado',existingId:exact.get(ek).inventoryId});}else if(base.has(bk)){rows.push({...item,status:'posible',reason:'Mismo título y autor; editorial distinta o vacía'});}else{const link=findBookLink(item);rows.push({...item,status:link?'vinculado':'nuevo',linkedEntryId:link?.id||''});}}inventoryImportPending=rows;const counts=rows.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});const labels={nuevo:'Nuevos',vinculado:'Nuevos vinculados',duplicado:'Duplicados exactos',posible:'Posibles ediciones',incompleto:'Incompletos'};document.getElementById('inventory-import-preview').innerHTML=`<div class="card" style="box-shadow:none;"><div style="font-family:var(--font-serif);font-weight:700;margin-bottom:8px;">Resultado del análisis</div>${Object.entries(labels).map(([k,l])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;"><span>${l}</span><strong>${counts[k]||0}</strong></div>`).join('')}</div><div style="max-height:230px;overflow:auto;">${rows.map(x=>`<div class="inventory-import-row"><strong>${x.titulo||'Sin título'}</strong><br><span style="color:var(--ink4);">${[x.autor,x.editorial].filter(Boolean).join(' · ')}</span><br><span style="color:${x.status==='duplicado'?'var(--red)':x.status==='posible'?'var(--gold)':'var(--green)'};font-weight:700;">${labels[x.status]}</span></div>`).join('')}</div>`;document.getElementById('inventory-import-confirm').style.display=rows.some(x=>['nuevo','vinculado','posible','incompleto'].includes(x.status))?'block':'none';}
function confirmInventoryImport(){return lumenSafeAction('Importar inventario',()=>{let inv=loadInventory();const exact=new Set(inv.map(x=>inventoryKey(x,true)));let added=0,skipped=0,createdBooks=0,linkedBooks=0;inventoryImportPending.forEach((x,i)=>{if(x.status==='duplicado'){skipped++;return;}const k=inventoryKey(x,true);if(exact.has(k)){skipped++;return;}const hadLink=!!(x.linkedEntryId||findBookLink(x));const book=ensureInventoryBookFromBasicItem(x);if(book){if(hadLink)linkedBooks++;else createdBooks++;x.linkedEntryId=book.id;}const item={inventoryId:'inv_'+Date.now()+'_'+i,sourceId:x.sourceId||'',titulo:x.titulo||'',autor:book?.autor||x.autor||'',editorial:book?.editorial||x.editorial||'',linkedEntryId:book?.id||'',inCart:false,_updatedAt:Date.now()};inv.push(item);exact.add(k);added++;});saveInventory(inv,false);if(typeof invalidateRecommendations==='function')invalidateRecommendations('inventario importado');const ok=saveDB();if(ok===false)throw new Error('No se pudo persistir el inventario localmente.');closeModal('modal-inventory-import');renderInventory();showToast(`✓ ${added} libros agregados · ${createdBooks} fichas nuevas · ${skipped} omitidos`,4500);});}

function inventoryInventoryCuriosities(books,total,read){
  const dated=books.filter(e=>/^\d{4}-\d{2}/.test(e.fecha_adquisicion||''));
  const months=inventoryTopRows(dated,e=>e.fecha_adquisicion.slice(0,7),100);
  const years=inventoryTopRows(dated,e=>e.fecha_adquisicion.slice(0,4),100);
  const longest=books.filter(e=>Number(e.paginas)>0).sort((a,b)=>Number(b.paginas)-Number(a.paginas))[0];
  const authors=new Set(books.map(e=>invNorm(inventoryAuthorLabel(e))).filter(Boolean)).size;
  const publishers=new Set(books.map(e=>invNorm(e.editorial)).filter(Boolean)).size;
  return `<div class="inventory-data-grid"><div class="stat-box"><div class="stat-num">${authors}</div><div class="stat-label">Autores diferentes</div></div><div class="stat-box"><div class="stat-num">${publishers}</div><div class="stat-label">Editoriales diferentes</div></div><div class="stat-box"><div class="stat-num">${dated.length}</div><div class="stat-label">Con fecha de adquisición</div></div></div><p>Mes con más adquisiciones: <strong>${months[0]?months[0].join(' · '):'Sin datos'}</strong></p><p>Año con más adquisiciones: <strong>${years[0]?years[0].join(' · '):'Sin datos'}</strong></p><p>Libro con más páginas: <strong>${longest?escapeHtml(longest.titulo)+' · '+longest.paginas:'Sin datos'}</strong></p>`;
}

const INVENTORY_DATA_SECTIONS=[['Resumen',0],['Autores',1],['Editoriales',2],['Géneros',3],['Traductores',4],['Idiomas',5],['Publicaciones',6],['Ediciones',7],['Catálogo',8],['Adquisiciones por año',9],['Adquisiciones por mes',10],['Datos curiosos',11]];
let _inventoryDataTab=0;
function renderInventoryDataNavigation(){
  const body=document.getElementById('inventory-data-body'),nav=document.getElementById('inventory-data-tabs');if(!body||!nav)return;
  const groups=[...body.children].filter(e=>e.matches('.inventory-data-grid,.inventory-stat-section'));
  groups.forEach((el,i)=>{el.dataset.inventoryGroup=String(i);});
  const last=body.querySelector(':scope > div:last-child');if(last&&!last.dataset.inventoryGroup)last.style.display='none';
  nav.innerHTML=INVENTORY_DATA_SECTIONS.map(([label,n])=>`<button type="button" class="btn btn-secondary btn-sm" data-inv-tab="${n}" onclick="selectInventoryDataTab(${n})">${label}</button>`).join('');
  selectInventoryDataTab(0);
}
function selectInventoryDataTab(tab){
  _inventoryDataTab=tab;
  document.querySelectorAll('#inventory-data-body [data-inventory-group]').forEach(el=>el.style.display=Number(el.dataset.inventoryGroup)===tab?'':'none');
  document.querySelectorAll('#inventory-data-tabs [data-inv-tab]').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.invTab)===tab));
}

function filterInventoryDataCatalog(query){const q=invNorm(query);document.querySelectorAll('#inventory-data-catalog-list .inventory-catalog-item').forEach(el=>{el.style.display=(!q||el.dataset.search.includes(q))?'':'none';});}
