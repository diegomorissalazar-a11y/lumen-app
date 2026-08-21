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
function renderInventory(){
  const list=document.getElementById('library-list'),search=document.getElementById('lib-search');if(search)search.placeholder='Buscar en mi inventario físico...';
  const q=invNorm(search?.value||''),data=inventoryBooksUnified();
  let books=data.books.filter(e=>!q||[e.titulo,e.autor,e.editorial].some(v=>invNorm(v).includes(q)));
  books=books.sort((a,b)=>{if(a.estado==='leyendo'&&b.estado!=='leyendo')return-1;if(b.estado==='leyendo'&&a.estado!=='leyendo')return 1;const mi=MESES.indexOf(a.mes),mj=MESES.indexOf(b.mes),ai=(a.anio||0)*100+(mi>=0?mi:0),bi=(b.anio||0)*100+(mj>=0?mj:0);return bi-ai||String(b.id).localeCompare(String(a.id));});
  const unlinked=data.unlinked.filter(x=>!q||[x.titulo,x.autor,x.editorial].some(v=>invNorm(v).includes(q))),visible=books.length+unlinked.length,total=data.books.length+data.unlinked.length;
  list.innerHTML=`<div class="inventory-toolbar"><button class="btn btn-primary btn-sm" onclick="openInventoryImport()">+ Importar CSV</button><button class="btn btn-secondary btn-sm" onclick="openInventoryData()">📊 Ver datos del inventario</button><span style="font-size:11px;color:var(--ink4);margin-left:auto;">${visible} de ${total}</span></div>${books.length?books.map(e=>entryCardHTML(e)).join(''):''}${unlinked.length?`<div style="font-size:10px;color:var(--ink4);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:14px 0 7px;">Pendientes de vincular</div>${unlinked.map(inventoryUnlinkedCardHTML).join('')}`:''}${!visible?'<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Aún no hay libros en el inventario.</div></div>':''}`;
}
function inventoryUnlinkedCardHTML(item){const esc2=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return `<div class="inventory-card"><div class="inventory-card-title">${esc2(item.titulo||'Sin título')}</div><div class="inventory-card-sub">${[item.autor,item.editorial].filter(Boolean).map(esc2).join(' · ')||'Información incompleta'}</div><div class="inventory-card-actions"><span class="inventory-status">Sin vincular</span><button class="btn btn-primary btn-sm" onclick="startInventoryReading('${item.inventoryId}')">Crear / comenzar lectura</button></div></div>`;}
function inventoryTopRows(entries,getter,limit=8){const counts=new Map();entries.forEach(e=>{let vals=getter(e);if(!Array.isArray(vals))vals=[vals];vals.filter(Boolean).forEach(v=>{const k=String(v).trim();if(k)counts.set(k,(counts.get(k)||0)+1);});});return[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit);}
function inventoryStatRows(rows){if(!rows.length)return'<div style="font-size:12px;color:var(--ink4);font-style:italic;">Sin datos suficientes.</div>';const max=Math.max(...rows.map(x=>x[1]),1);return rows.map(([name,count])=>`<div class="inventory-stat-row"><div class="inventory-stat-name">${String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div><div class="inventory-stat-bar"><div class="inventory-stat-bar-fill" style="width:${Math.round(count/max*100)}%"></div></div><strong>${count}</strong></div>`).join('');}
function openInventoryData(){const body=document.getElementById('inventory-data-body');if(!body)return;const data=inventoryBooksUnified(),books=data.books,total=books.length+data.unlinked.length,read=books.filter(e=>e.estado==='leido').length,reading=books.filter(e=>e.estado==='leyendo').length,pending=books.filter(e=>e.estado==='pendiente'||!e.estado).length,abandoned=books.filter(e=>e.estado==='abandonado').length,ratio=total?Math.round(read/total*100):0;body.innerHTML=`<div class="inventory-data-grid"><div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">Libros físicos</div></div><div class="stat-box"><div class="stat-num" style="font-size:28px;">${read} de ${total}</div><div class="stat-label">Leídos · ${ratio}%</div></div><div class="stat-box"><div class="stat-num">${reading}</div><div class="stat-label">Leyendo</div></div><div class="stat-box"><div class="stat-num">${pending}</div><div class="stat-label">Pendientes</div></div><div class="stat-box"><div class="stat-num">${abandoned}</div><div class="stat-label">Abandonados</div></div><div class="stat-box"><div class="stat-num">${data.unlinked.length}</div><div class="stat-label">Sin vincular</div></div></div><div class="inventory-stat-section"><div class="chart-section-title" style="margin-bottom:6px;">Autores del inventario</div>${inventoryStatRows(inventoryTopRows(books,e=>e.autor))}</div><div class="inventory-stat-section"><div class="chart-section-title" style="margin-bottom:6px;">Editoriales del inventario</div>${inventoryStatRows(inventoryTopRows(books,e=>e.editorial))}</div><div class="inventory-stat-section"><div class="chart-section-title" style="margin-bottom:6px;">Géneros del inventario</div>${inventoryStatRows(inventoryTopRows(books,e=>e.generos||[]))}</div><div style="font-size:11px;color:var(--ink4);line-height:1.5;margin-top:8px;">El estado de lectura se toma siempre del mismo registro de Biblioteca. Inventario solo indica propiedad física.</div>`;openModal('modal-inventory-data');}
function startInventoryReading(id){
  const inv=loadInventory();const item=inv.find(x=>x.inventoryId===id);if(!item)return;
  let book=findBookLink(item);
  if(book && book.estado==='leido'){showToast('Este libro ya está marcado como leído');showDetail(book.id);return;}
  if(!book){book={id:'inv_book_'+Date.now(),type:'libro',titulo:item.titulo,autor:item.autor||'',editorial:item.editorial||'',estado:'leyendo',progreso:0,readDates:[],cover:'',notas:'',enInventario:true,startDate:new Date().toISOString(),_updatedAt:Date.now()};db.entries.push(book);}
  else{book.estado='leyendo';book.enInventario=true;book.startDate=book.startDate||new Date().toISOString();book._updatedAt=Date.now();if(!book.editorial&&item.editorial)book.editorial=item.editorial;}
  item.linkedEntryId=book.id;item._updatedAt=Date.now();
  try{safeLocalSetItem(INVENTORY_KEY,JSON.stringify(inv));saveDB();}catch(err){console.error('[LUMEN v183] Inventario → lectura:',err);showToast('⚠ No se pudo iniciar la lectura: '+(err.message||'error local'),4500);return;}
  renderInventory();renderHome();showToast('✓ Libro agregado a Leyendo ahora');
}
function openInventoryImport(){inventoryImportPending=[];document.getElementById('inventory-import-preview').innerHTML='';document.getElementById('inventory-import-confirm').style.display='none';document.getElementById('inventory-csv-input').value='';openModal('modal-inventory-import');}
function inventoryCol(row,...names){for(const name of names){const key=Object.keys(row).find(k=>invNorm(k)===invNorm(name));if(key&&String(row[key]||'').trim())return String(row[key]).trim();}return '';}
function handleInventoryCSV(event){const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>analyzeInventoryCSV(ev.target.result);reader.readAsText(file,'UTF-8');}
function analyzeInventoryCSV(text){const clean=String(text||'').replace(/^\uFEFF/,'');const lines=clean.split(/\r?\n/).filter(x=>x.trim());if(lines.length<2){showToast('CSV vacío');return;}const headers=parseCSVLine(lines[0]);const existing=loadInventory();const exact=new Map(existing.map(x=>[inventoryKey(x,true),x]));const base=new Map();existing.forEach(x=>{const k=inventoryKey(x,false);if(!base.has(k))base.set(k,[]);base.get(k).push(x);});const rows=[];for(let i=1;i<lines.length;i++){const cols=parseCSVLine(lines[i]);const row={};headers.forEach((h,j)=>row[h]=(cols[j]||'').trim());const item={sourceId:inventoryCol(row,'ID','id'),titulo:inventoryCol(row,'Título','Titulo','Nombre'),autor:inventoryCol(row,'Autor'),editorial:inventoryCol(row,'Editorial')};if(!item.titulo){rows.push({...item,status:'incompleto',reason:'Sin título'});continue;}const ek=inventoryKey(item,true),bk=inventoryKey(item,false);if(exact.has(ek)){rows.push({...item,status:'duplicado',existingId:exact.get(ek).inventoryId});}else if(base.has(bk)){rows.push({...item,status:'posible',reason:'Mismo título y autor; editorial distinta o vacía'});}else{const link=findBookLink(item);rows.push({...item,status:link?'vinculado':'nuevo',linkedEntryId:link?.id||''});}}inventoryImportPending=rows;const counts=rows.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});const labels={nuevo:'Nuevos',vinculado:'Nuevos vinculados',duplicado:'Duplicados exactos',posible:'Posibles ediciones',incompleto:'Incompletos'};document.getElementById('inventory-import-preview').innerHTML=`<div class="card" style="box-shadow:none;"><div style="font-family:var(--font-serif);font-weight:700;margin-bottom:8px;">Resultado del análisis</div>${Object.entries(labels).map(([k,l])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;"><span>${l}</span><strong>${counts[k]||0}</strong></div>`).join('')}</div><div style="max-height:230px;overflow:auto;">${rows.map(x=>`<div class="inventory-import-row"><strong>${x.titulo||'Sin título'}</strong><br><span style="color:var(--ink4);">${[x.autor,x.editorial].filter(Boolean).join(' · ')}</span><br><span style="color:${x.status==='duplicado'?'var(--red)':x.status==='posible'?'var(--gold)':'var(--green)'};font-weight:700;">${labels[x.status]}</span></div>`).join('')}</div>`;document.getElementById('inventory-import-confirm').style.display=rows.some(x=>['nuevo','vinculado','posible','incompleto'].includes(x.status))?'block':'none';}
function confirmInventoryImport(){let inv=loadInventory();const exact=new Set(inv.map(x=>inventoryKey(x,true)));let added=0,skipped=0;inventoryImportPending.forEach((x,i)=>{if(x.status==='duplicado'){skipped++;return;}const k=inventoryKey(x,true);if(exact.has(k)){skipped++;return;}const item={inventoryId:'inv_'+Date.now()+'_'+i,sourceId:x.sourceId||'',titulo:x.titulo||'',autor:x.autor||'',editorial:x.editorial||'',linkedEntryId:x.linkedEntryId||findBookLink(x)?.id||'',inCart:false,_updatedAt:Date.now()};inv.push(item);exact.add(k);added++;});saveInventory(inv,false);inv.forEach(item=>{if(item.linkedEntryId){const b=db.entries.find(e=>e.id===item.linkedEntryId);if(b&&b.type==='libro'&&!b.enInventario){b.enInventario=true;b._updatedAt=Date.now();}}});saveDB();closeModal('modal-inventory-import');renderInventory();showToast(`✓ ${added} libros agregados · ${skipped} omitidos`);}


