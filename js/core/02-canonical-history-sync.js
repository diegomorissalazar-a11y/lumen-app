// ═══════════════════════════════════
//  SYNC — timestamp por entrada
// ═══════════════════════════════════
const LAST_SYNC_KEY = 'lumen_last_sync';

function stampEntry(entry) {
  if (!entry._updatedAt) entry._updatedAt = Date.now();
  return entry;
}

// ═══════════════════════════════════
//  MODELO CANÓNICO — libros / autores / editoriales (v170)
// ═══════════════════════════════════
function canonicalText(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[’‘`´]/g,"'").replace(/\s+/g,' ');
}
function canonicalEntityId(prefix, value) {
  const norm = canonicalText(value);
  if (!norm) return '';
  let h = 2166136261;
  for (let i=0;i<norm.length;i++) { h ^= norm.charCodeAt(i); h = Math.imul(h,16777619); }
  const slug = norm.replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,42) || 'item';
  return `${prefix}_${slug}_${(h>>>0).toString(36)}`;
}
const CANONICAL_ENTITIES_KEY = 'lumen_canonical_entities_v1';
function emptyCanonicalEntities(){return {schema:'lumen_entities_v1',authors:{},publishers:{},translators:{}};}
function loadCanonicalEntities(){
  try { const x=JSON.parse(localStorage.getItem(CANONICAL_ENTITIES_KEY)||'null'); return x&&x.authors?x:emptyCanonicalEntities(); }
  catch { return emptyCanonicalEntities(); }
}
function saveCanonicalEntities(c){ safeLocalSetItem(CANONICAL_ENTITIES_KEY,JSON.stringify(c||emptyCanonicalEntities()),{prune:true}); }
function catalogBucket(kind,c){ c=c||loadCanonicalEntities(); return kind==='aut'?c.authors:(kind==='edi'?c.publishers:c.translators); }
function levenshtein(a,b){
  a=canonicalText(a); b=canonicalText(b); if(a===b)return 0; if(!a.length)return b.length; if(!b.length)return a.length;
  const v0=Array(b.length+1).fill(0),v1=Array(b.length+1).fill(0); for(let j=0;j<=b.length;j++)v0[j]=j;
  for(let i=0;i<a.length;i++){v1[0]=i+1;for(let j=0;j<b.length;j++){const cost=a[i]===b[j]?0:1;v1[j+1]=Math.min(v1[j]+1,v0[j+1]+1,v0[j]+cost);}for(let j=0;j<=b.length;j++)v0[j]=v1[j];}
  return v1[b.length];
}
function entitySimilarity(a,b){const x=canonicalText(a),y=canonicalText(b); if(!x||!y)return 0; return 1-levenshtein(x,y)/Math.max(x.length,y.length);}
function allKnownEntityNames(kind){
  const c=loadCanonicalEntities(), b=catalogBucket(kind,c), out=[];
  Object.values(b).forEach(e=>{if(e?.nombreCanonico)out.push({id:e.id,name:e.nombreCanonico,registered:true});(e?.aliases||[]).forEach(a=>out.push({id:e.id,name:a,registered:true,alias:true}));});
  if(kind==='aut'){
    (db?.entries||[]).filter(e=>e?.type==='libro').forEach(e=>splitCanonicalAuthors(e.autor).forEach(n=>out.push({id:e.autorId||canonicalEntityId('aut',n),name:n,registered:false})));
    ((mapas && Array.isArray(mapas.influencias)) ? mapas.influencias : []).forEach(i=>{if(i.fuente)out.push({id:i.fuente_autor_id||canonicalEntityId('aut',i.fuente),name:i.fuente,registered:false});if(i.destino_autor)out.push({id:i.destino_autor_id||canonicalEntityId('aut',i.destino_autor),name:i.destino_autor,registered:false});});
  } else if(kind==='edi') (db?.entries||[]).filter(e=>e?.type==='libro'&&e.editorial).forEach(e=>out.push({id:e.editorialId||canonicalEntityId('edi',e.editorial),name:e.editorial,registered:false}));
  else (db?.entries||[]).filter(e=>e?.type==='libro'&&e.traductor).forEach(e=>String(e.traductor).split(/\s*;\s*|\s*,\s*(?=[A-ZÁÉÍÓÚÑ])/).filter(Boolean).forEach(n=>out.push({id:canonicalEntityId('tra',n),name:n,registered:false})));
  const seen=new Set(); return out.filter(x=>{const k=x.id+'|'+canonicalText(x.name);if(seen.has(k))return false;seen.add(k);return true;});
}
function findCanonicalEntity(kind,name){
  const norm=canonicalText(name); if(!norm)return null; const c=loadCanonicalEntities(),b=catalogBucket(kind,c);
  for(const e of Object.values(b)){if(canonicalText(e.nombreCanonico)===norm || (e.aliases||[]).some(a=>canonicalText(a)===norm))return e;}
  return null;
}
function registerCanonicalEntity(kind,name,preferredId=''){
  name=String(name||'').trim(); if(!name)return {id:'',nombreCanonico:'',aliases:[]}; const c=loadCanonicalEntities(),b=catalogBucket(kind,c);
  const existing=findCanonicalEntity(kind,name); if(existing)return existing;
  const id=preferredId||canonicalEntityId(kind,name); const e=b[id]||{id,nombreCanonico:name,aliases:[]}; if(!e.nombreCanonico)e.nombreCanonico=name; b[id]=e; saveCanonicalEntities(c); return e;
}
function addCanonicalAlias(kind,id,alias){
  alias=String(alias||'').trim(); if(!id||!alias)return; const c=loadCanonicalEntities(),b=catalogBucket(kind,c),e=b[id]; if(!e)return;
  if(canonicalText(alias)!==canonicalText(e.nombreCanonico) && !(e.aliases||[]).some(a=>canonicalText(a)===canonicalText(alias))){e.aliases=e.aliases||[];e.aliases.push(alias);saveCanonicalEntities(c);}
}
function resolveCanonicalEntity(kind,name,interactive=false){
  name=String(name||'').trim(); if(!name)return {id:'',nombreCanonico:'',aliases:[]}; const exact=findCanonicalEntity(kind,name); if(exact)return exact;
  const candidates=allKnownEntityNames(kind).filter(x=>canonicalText(x.name)!==canonicalText(name)); let best=null;
  candidates.forEach(x=>{const sim=entitySimilarity(name,x.name);if(!best||sim>best.sim)best={...x,sim};});
  const nParts=canonicalText(name).split(' '), bParts=best?canonicalText(best.name).split(' '):[];
  const sameSurname=best&&nParts.length>1&&bParts.length>1&&nParts[nParts.length-1]===bParts[bParts.length-1];
  const strictVariant=best&&sameSurname&&best.sim>=0.83&&levenshtein(nParts[0]||'',bParts[0]||'')<=2;
  if(interactive && best && (best.sim>=0.90||strictVariant)){
    const pct=Math.round(best.sim*100); if(confirm(`¿“${name}” es la misma entidad que “${best.name}”?\nCoincidencia normalizada: ${pct}%${strictVariant&&best.sim<0.90?' · mismo apellido y variante breve de nombre':''}`)){
      let target=findCanonicalEntity(kind,best.name)||registerCanonicalEntity(kind,best.name,best.id); addCanonicalAlias(kind,target.id,name); return target;
    }
  }
  return registerCanonicalEntity(kind,name);
}
function canonicalNameById(kind,id,fallback=''){const b=catalogBucket(kind);return b[id]?.nombreCanonico||fallback;}
function splitCanonicalAuthors(value) {
  return String(value || '').split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
}
function historyBounds(historia) {
  const h = (historia && typeof historia === 'object') ? historia : {};
  const toYear = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let inicio = toYear(h.fechaInicio);
  let fin = toYear(h.fechaFin);

  const periodos = Array.isArray(h.periodos) ? h.periodos : [];
  if (inicio === null || fin === null) {
    const starts = [];
    const ends = [];
    periodos.forEach(p => {
      if (!p || typeof p !== 'object') return;
      const a = toYear(p.inicio ?? p.fechaInicio);
      const b = toYear(p.fin ?? p.fechaFin);
      if (a !== null) starts.push(a);
      if (b !== null) ends.push(b);
    });
    if (inicio === null && starts.length) inicio = Math.min(...starts);
    if (fin === null && ends.length) fin = Math.max(...ends);
  }

  // Si solo existe un extremo, úsalo también como punto temporal.
  if (inicio === null && fin !== null) inicio = fin;
  if (fin === null && inicio !== null) fin = inicio;
  if (inicio !== null && fin !== null && inicio > fin) [inicio, fin] = [fin, inicio];

  return { inicio, fin };
}


// ═══════════════════════════════════════════════════════════════
// LUMEN v179 — catálogo de líneas históricas
// v178 conservó las llamadas a estos helpers pero perdió sus definiciones.
// Eso provocaba "Can't find variable: historicalLinesCatalog" durante sync.
// ═══════════════════════════════════════════════════════════════
const HISTORICAL_LINES_KEY = 'lumen_historical_lines_v1';
function historicalLinesCatalog(){
  const byId = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORICAL_LINES_KEY) || '[]');
    if (Array.isArray(saved)) saved.forEach(x => {
      const name = String(typeof x === 'string' ? x : (x?.nombre || x?.name || '')).trim();
      if (!name) return;
      const id = (typeof x === 'object' && x?.id) ? String(x.id) : canonicalEntityId('histline', name);
      byId.set(id, {id, nombre:name});
    });
  } catch(_) {}
  (db?.entries || []).forEach(e => {
    if (!e || e.type !== 'libro' || !e.historia) return;
    const h=e.historia, name=String(h.lineaPrincipal||'').trim();
    if(name){ const id=h.lineaPrincipalId||canonicalEntityId('histline',name); byId.set(id,{id,nombre:name}); }
    const names=Array.isArray(h.lineasRelacionadas)?h.lineasRelacionadas:[];
    names.forEach((n,i)=>{ n=String(n||'').trim(); if(!n)return; const id=(h.lineasRelacionadasIds||[])[i]||canonicalEntityId('histline',n); byId.set(id,{id,nombre:n}); });
  });
  return [...byId.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}
function saveHistoricalLinesCatalog(lines){
  const byId=new Map();
  (Array.isArray(lines)?lines:[]).forEach(x=>{
    const name=String(typeof x==='string'?x:(x?.nombre||x?.name||'')).trim(); if(!name)return;
    const id=(typeof x==='object'&&x?.id)?String(x.id):canonicalEntityId('histline',name);
    byId.set(id,{id,nombre:name});
  });
  const out=[...byId.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  try { safeLocalSetItem(HISTORICAL_LINES_KEY,JSON.stringify(out),{prune:true}); } catch(_) {}
  return out;
}
function registerHistoricalLine(name){
  name=String(name||'').trim(); if(!name)return '';
  const id=canonicalEntityId('histline',name), list=historicalLinesCatalog();
  if(!list.some(x=>x.id===id)) saveHistoricalLinesCatalog([...list,{id,nombre:name}]);
  return id;
}
function fillHistoricalLineDatalists(){
  const lines=historicalLinesCatalog();
  ['hist-lineas-catalogo','histq-lineas-catalogo'].forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=lines.map(x=>`<option value="${String(x.nombre).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"></option>`).join('');
  });
}
function renderHistoricalLineChoices(containerId, selectedIds=[]){
  const el=document.getElementById(containerId); if(!el)return;
  const selected=new Set(Array.isArray(selectedIds)?selectedIds:[]);
  el.innerHTML=historicalLinesCatalog().map(x=>`<label style="display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);border-radius:999px;padding:5px 8px;font-size:10px;"><input type="checkbox" data-line-id="${x.id}" ${selected.has(x.id)?'checked':''}> ${String(x.nombre).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</label>`).join('') || '<span style="font-size:10px;color:var(--ink4);">Aún no hay otras líneas.</span>';
}
function selectedHistoricalLineIds(containerId, excludeId=''){
  const el=document.getElementById(containerId); if(!el)return [];
  return [...el.querySelectorAll('input[data-line-id]:checked')].map(x=>x.dataset.lineId).filter(id=>id&&id!==excludeId);
}
function historicalLineNamesFromIds(ids){
  const map=new Map(historicalLinesCatalog().map(x=>[x.id,x.nombre]));
  return (Array.isArray(ids)?ids:[]).map(id=>map.get(id)).filter(Boolean);
}

function ensureBookCanonicalRefs(entry) {
  if (!entry || entry.type !== 'libro') return entry;
  const authors = splitCanonicalAuthors(entry.autor);
  const ars=authors.map(a=>resolveCanonicalEntity('aut',a,false));
  entry.autorIds=ars.map(x=>x.id).filter(Boolean); entry.autorId=entry.autorIds[0]||'';
  if(ars[0]?.nombreCanonico && authors.length===1) entry.autor=ars[0].nombreCanonico;
  const pub=entry.editorial?resolveCanonicalEntity('edi',entry.editorial,false):null;
  entry.editorialId=pub?.id||''; if(pub?.nombreCanonico)entry.editorial=pub.nombreCanonico;
  const trads=(entry.bibliografia?.edicionConsultada?.traductores||String(entry.traductor||'').split(/\s*;\s*/).filter(Boolean));
  entry.traductorIds=trads.map(t=>resolveCanonicalEntity('tra',t,false).id).filter(Boolean);
  entry._canonicalModel = 'lumen_book_v2';
  if (entry.historia && typeof entry.historia === 'object') ensureHistoriaCanonicalRefs(entry);
  return entry;
}
function ensureHistoriaCanonicalRefs(entry) {
  if(!entry||entry.type!=='libro'||!entry.historia||typeof entry.historia!=='object')return entry;
  const h=entry.historia,linea=String(h.lineaPrincipal||'').trim();h.schema='lumen_historia_v3';h.lineaPrincipalId=linea?canonicalEntityId('histline',linea):'';
  const rel=Array.isArray(h.lineasRelacionadas)?h.lineasRelacionadas:[];h.lineasRelacionadasIds=(Array.isArray(h.lineasRelacionadasIds)&&h.lineasRelacionadasIds.length?h.lineasRelacionadasIds:rel.map(x=>canonicalEntityId('histline',x))).filter(Boolean);
  const b=historyBounds(h);h.fechaInicio=b.inicio;h.fechaFin=b.fin;if(!Array.isArray(h.periodos)||!h.periodos.length)h.periodos=(b.inicio!==null||b.fin!==null)?[{nombre:'',tema:'',inicio:b.inicio,fin:b.fin,precision:'aproximada',cobertura:'periodo'}]:[];
  h.periodos=h.periodos.map(p=>{const q={...p},base=String(q.nombre||q.tema||`${q.inicio??''}_${q.fin??''}`).trim();q.periodoId=q.periodoId||canonicalEntityId('histperiod',`${h.lineaPrincipalId||linea}|${base}`);return q});if(linea)registerHistoricalLine(linea);return entry;
}
function findBookCanonicalById(id) {
  return (db.entries||[]).find(e=>e && e.type==='libro' && e.id===id) || null;
}
function findBookCanonicalByTitle(title, author='') {
  const nt=canonicalText(title), na=canonicalText(author);
  if (!nt) return null;
  const candidates=(db.entries||[]).filter(e=>e&&e.type==='libro'&&canonicalText(e.titulo)===nt);
  if (!na) return candidates[0]||null;
  return candidates.find(e=>splitCanonicalAuthors(e.autor).some(a=>canonicalText(a)===na)) || candidates[0] || null;
}
function getSelectedOptionData(selectId, key) {
  const sel=document.getElementById(selectId); if(!sel) return '';
  const opt=sel.options && sel.selectedIndex>=0 ? sel.options[sel.selectedIndex] : null;
  return opt?.dataset?.[key] || '';
}
function getInfluenceEvidenceBook() {
  const id=getSelectedOptionData('inf-destino-sel','entryId');
  return findBookCanonicalById(id) || findBookCanonicalByTitle(document.getElementById('inf-destino-sel')?.value || '');
}
function getInfluenceSourceBook() {
  const id=getSelectedOptionData('inf-obra-sel','entryId');
  if (id) return findBookCanonicalById(id);
  return findBookCanonicalByTitle(getInfObra(), getInfFuente());
}
function canonicalBookBibliography(book) {
  if (!book) return {autor:'',titulo:'',editorial:'',anio:'',ciudad:'',edicion:'',isbn:'',traductores:[]};
  const ed=book.bibliografia?.edicionConsultada||book.bibliografia?.edicion_consultada||{};
  const directEd=(book.edicion && typeof book.edicion==='object') ? book.edicion : {};
  const edicionLabel = ed.descripcionEdicion || ed.descripcion_edicion ||
    (ed.numeroEdicion ? `${ed.numeroEdicion}.ª ed.` : '') ||
    directEd.descripcion || (directEd.numero ? `${directEd.numero}.ª ed.` : '') ||
    book.edicion_descripcion || (typeof book.edicion==='string' ? book.edicion : '');
  return {
    autor: book.autor||'',
    titulo: book.titulo||'',
    editorial: ed.editorial||book.editorial||book.bibliografia?.editorial||'',
    anio: ed.anio||directEd.anio||book.anio_edicion||book.anio_publicacion_edicion||book.anio_pub||'',
    ciudad: ed.ciudad||ed.ciudad_publicacion||book.ciudad_publicacion||book.ciudad||'',
    edicion: edicionLabel,
    isbn: ed.isbn||book.isbn||'',
    traductores: Array.isArray(ed.traductores)?ed.traductores:splitCanonicalAuthors(book.traductor||'')
  };
}
function bibliographyMissing(book){
  const b=canonicalBookBibliography(book), missing=[];
  if(!b.editorial)missing.push('editorial'); if(!b.anio)missing.push('año de edición'); if(!b.ciudad)missing.push('ciudad');
  if(!b.edicion)missing.push('edición'); return missing;
}
function formatIsoBookReference(book,ubTipo='',ubDetalle=''){
  const b=canonicalBookBibliography(book); if(!book)return '';
  const ubLabel={pagina:'p.',loc:'LOC',capitulo:'cap.',epigrafe:'Epígrafe:',dedicatoria:'Dedicatoria',titulo:'[Título]',otro:''};
  let x=''; if(b.autor)x+=b.autor.toUpperCase()+'. '; if(b.titulo)x+=b.titulo+'. '; if(b.edicion)x+=b.edicion+'. '; if(b.ciudad)x+=b.ciudad+': '; if(b.editorial)x+=b.editorial+', '; if(b.anio)x+=b.anio+'. '; if(ubDetalle)x+=(ubLabel[ubTipo]||'')+' '+ubDetalle+'.'; return x.trim();
}
function getReferenceEntriesFromInfluences() {
  const refs=[];
  const seen=new Set();
  (mapas.influencias||[]).filter(r=>r&&r.tipo==='cita_directa').forEach(r=>{
    const id=r.evidencia_libro_id||r.destino_libro_id||'';
    const e=(id&&findBookCanonicalById(id)) || findBookCanonicalByTitle(r.libro_ref||r.destino_titulo||r.destino||'');
    if(!e)return;
    const key=e.id||canonicalText(`${e.autor}|${e.titulo}`);
    if(seen.has(key))return;
    seen.add(key); refs.push(e);
  });
  return refs.sort((a,b)=>String(a.autor||'').localeCompare(String(b.autor||''),'es')||String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
}
function openReferenciasInfluencias() {
  const body=document.getElementById('referencias-body'); if(!body)return;
  const refs=getReferenceEntriesFromInfluences();
  body.innerHTML=refs.length
    ? `<div style="font-family:var(--font-serif);font-size:24px;font-weight:700;margin-bottom:8px;">Referencias</div>`+refs.map(e=>`<div style="padding:14px 0;border-bottom:1px solid var(--border);font-family:var(--font-serif);font-size:14px;line-height:1.7;color:var(--ink2);">${escapeHtml(formatIsoBookReference(e))}</div>`).join('')
    : '<div style="color:var(--ink4);font-style:italic;">Aún no hay referencias bibliográficas vinculadas a las influencias.</div>';
  openModal('modal-referencias');
}
function renderNotasReferences(entries) {
  const refs=[]; const seen=new Set();
  (entries||[]).filter(e=>e&&e.type==='libro').forEach(e=>{
    const key=e.id||canonicalText(`${e.autor}|${e.titulo}`);
    if(seen.has(key))return; seen.add(key); refs.push(e);
  });
  refs.sort((a,b)=>String(a.autor||'').localeCompare(String(b.autor||''),'es')||String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
  if(!refs.length)return '';
  return `<section class="notas-referencias" style="margin-top:34px;padding-top:22px;border-top:1px solid var(--border);"><h2 class="notas-doc-category" style="margin-bottom:14px;">Referencias</h2>${refs.map(e=>`<div style="padding:10px 0;border-bottom:1px solid var(--cream2);font-family:var(--font-serif);font-size:14px;line-height:1.7;color:var(--ink2);">${escapeHtml(formatIsoBookReference(e))}</div>`).join('')}</section>`;
}

function ensureInfluenceCanonicalRefs(inf) {
  if (!inf) return inf;
  const sourceBook = inf.fuente_libro_id ? findBookCanonicalById(inf.fuente_libro_id) : findBookCanonicalByTitle(inf.obra, inf.fuente);
  const evidenceBook = inf.evidencia_libro_id ? findBookCanonicalById(inf.evidencia_libro_id) :
    (inf.destino_libro_id ? findBookCanonicalById(inf.destino_libro_id) : findBookCanonicalByTitle(inf.libro_ref || inf.destino_titulo));
  inf.fuente_autor_id = inf.fuente_autor_id || canonicalEntityId('aut', inf.fuente);
  if (sourceBook) {
    ensureBookCanonicalRefs(sourceBook);
    inf.fuente_libro_id = sourceBook.id;
    inf.fuente_autor_id = sourceBook.autorId || inf.fuente_autor_id;
    inf.fuente = sourceBook.autor || inf.fuente;
    inf.obra = sourceBook.titulo || inf.obra;
  }
  if (evidenceBook) {
    ensureBookCanonicalRefs(evidenceBook);
    const bib=canonicalBookBibliography(evidenceBook);
    inf.destino_libro_id = evidenceBook.id;
    inf.evidencia_libro_id = evidenceBook.id;
    inf.destino_autor_id = evidenceBook.autorId || canonicalEntityId('aut', evidenceBook.autor);
    inf.editorial_id = evidenceBook.editorialId || canonicalEntityId('edi', evidenceBook.editorial);
    inf.libro_ref = evidenceBook.titulo || inf.libro_ref;
    inf.destino_titulo = evidenceBook.titulo || inf.destino_titulo;
    inf.destino_autor = evidenceBook.autor || inf.destino_autor;
    inf.destino = evidenceBook.autor || inf.destino;
    inf.editorial = bib.editorial || '';
    inf.anio_pub = bib.anio || '';
    inf.ciudad = bib.ciudad || '';
    inf.edicion = bib.edicion || '';
  }
  inf._canonicalModel = 'lumen_influence_v1';
  return inf;
}
function normalizeMapasCanonical(input) {
  const m=input || {influencias:[],rutas:[]};
  m.influencias=(m.influencias||[]).map(ensureInfluenceCanonicalRefs);
  // Las rutas conservan texto por compatibilidad, pero referencian libros cuando es posible.
  m.rutas=(m.rutas||[]).map(r=>{
    if(!r) return r;
    const f=findBookCanonicalByTitle(r.fuente), d=findBookCanonicalByTitle(r.destino);
    if(f) r.fuente_libro_id=f.id;
    if(d) r.destino_libro_id=d.id;
    return r;
  });
  return m;
}

function mergeEntries(local, remote) {
  const normalizeEntry = e => {
    if (e.type) {
      const t = e.type.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (t.includes('libro')) e.type = 'libro';
      else if (t.includes('pelicula') || t.includes('movie') || t.includes('film')) e.type = 'pelicula';
      else if (t.includes('serie') || t.includes('series') || t.includes('tv')) e.type = 'serie';
      else e.type = t;
    }
    if (e.idioma) e.idioma = normalizeIdioma(e.idioma);
    if (e.id && e.id.includes("'")) e.id = e.id.replace(/'/g, '');
    if (e.type === 'serie' && !e.estado) e.estado = 'vista';
    if (e.type === 'serie' && !e.temporadas && e.coleccion) {
      const m = String(e.coleccion).match(/\d+/);
      if (m) e.temporadas = parseInt(m[0]);
    }
    normalizeBookReadingFields(e, { stamp:false, source:'merge' });
    ensureBookCanonicalRefs(e);
    return e;
  };

  // Normalizar ambos arrays
  local  = local.map(normalizeEntry);
  remote = remote.map(normalizeEntry);

  // Clave canónica para detectar duplicados semánticos (mismo contenido, distinto ID)
  // Para series: incluir temporada pero NO el año — el año puede diferir entre
  // dispositivos (registrado antes de marcarse como visto en otro equipo)
  // lo que crearía duplicados en lugar de hacer merge correcto
  const canonicalKey = e => {
    const norm = s => (s||'').trim().toLowerCase()
      .replace(/['"]/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'');
    const base = `${e.type}||${norm(e.titulo)}`;
    if (e.type === 'serie') {
      const temp = e.temporadas || e.coleccion || '';
      return `${base}||T${temp}`;
    }
    return `${base}||${e.anio||''}`;
  };

  // v170 — merge extensible: la entrada más reciente gana TODOS sus campos,
  // incluidos los agregados en versiones futuras (p. ej. enInventario e historia).
  // Solo aplicamos una fusión especial donde realmente existe historial acumulativo.
  const mergeTwo = (winner, loser) => {
    // Empezar por el registro anterior y superponer el ganador completo. Esto conserva
    // campos que el ganador no conoce, pero permite que false, 0, [] y '' sean cambios
    // válidos. Evita depender de una lista manual de campos que se queda obsoleta.
    const result = { ...loser, ...winner };
    const wReads = Array.isArray(winner.readDates) ? winner.readDates : [];
    const lReads = Array.isArray(loser.readDates) ? loser.readDates : [];
    const mergedReads = mergeBookReadDatesSmart(lReads, wReads);
    if (mergedReads.length) result.readDates = mergedReads;

    // Las notas son acumulativas: unir por id para no perder notas creadas en otro dispositivo.
    if (Array.isArray(winner.notas_lista) || Array.isArray(loser.notas_lista)) {
      const notasMap = {};
      [...(Array.isArray(loser.notas_lista)?loser.notas_lista:[]), ...(Array.isArray(winner.notas_lista)?winner.notas_lista:[])].forEach((n,idx) => {
        if (!n) return;
        const key = n.id || `nota_${idx}_${n.fecha||''}_${n.titulo||''}`;
        notasMap[key] = n;
      });
      result.notas_lista = Object.values(notasMap);
    }

    // Progreso por página: nunca retroceder por un merge de historiales.
    if (result.type === 'libro') {
      const wPag = parsePagValue(winner.progresoPag);
      const lPag = parsePagValue(loser.progresoPag);
      const lastRead = bookLastReadPag({ readDates: result.readDates }) ?? bookLastReadPag(winner) ?? bookLastReadPag(loser);
      const best = Math.max(wPag || 0, lPag || 0, lastRead || 0);
      if (best > 0 && winner.estado !== 'pendiente') result.progresoPag = best;
      normalizeBookReadingFields(result, { stamp:false, source:'mergeTwo-v169' });
    }

    result._updatedAt = Math.max(entryTimestamp(winner), entryTimestamp(loser));
    result.id = winner.id; // usar el ID del registro más reciente
    return result;
  };

  // Paso 1: merge por ID exacto
  const byId = {};
  local.forEach(e  => { byId[e.id] = e; });
  remote.forEach(e => {
    if (!byId[e.id]) {
      byId[e.id] = e;
    } else {
      const localTs  = entryTimestamp(byId[e.id]);
      const remoteTs = entryTimestamp(e);
      const winner = remoteTs >= localTs ? e : byId[e.id];
      const loser  = remoteTs >= localTs ? byId[e.id] : e;
      byId[e.id] = mergeTwo(winner, loser);
    }
  });

  // Paso 2: deduplicar por clave canónica (mismo título+tipo+año, IDs diferentes)
  const byCanon = {};
  Object.values(byId).forEach(e => {
    const key = canonicalKey(e);
    if (!byCanon[key]) {
      byCanon[key] = e;
    } else {
      const existing = byCanon[key];
      const existTs = entryTimestamp(existing);
      const thisTs  = entryTimestamp(e);
      const winner = thisTs >= existTs ? e : existing;
      const loser  = thisTs >= existTs ? existing : e;
      byCanon[key] = mergeTwo(winner, loser);
    }
  });

  return Object.values(byCanon);
}

// Analiza diferencias entre dos arrays de entradas para mostrar resumen
function diffEntries(local, remote) {
  const localMap = {};
  local.forEach(e => { localMap[e.id] = e; });

  const nuevas = [], actualizadas = [], sinCambios = [];

  remote.forEach(e => {
    const loc = localMap[e.id];
    if (!loc) {
      nuevas.push(e);
    } else {
      const remoteTs = entryTimestamp(e);
      const localTs  = entryTimestamp(loc);
      if (remoteTs > localTs) {
        actualizadas.push({ remote: e, local: loc });
      } else {
        sinCambios.push(e);
      }
    }
  });

  return { nuevas, actualizadas, sinCambios };
}

function setLastSync() {
  const now = new Date();
  const ts = now.toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'}) + ' · ' + now.toLocaleDateString('es', {day:'2-digit', month:'short'});
  safeLocalSetItem(LAST_SYNC_KEY, now.toISOString());
  const el = document.getElementById('menu-last-sync');
  if (el) el.innerHTML = `Última sync: ${ts}<br><span style="color:var(--ink2);font-weight:700;">${db.entries.length} registros</span>`;
}

function loadLastSync() {
  const el = document.getElementById('menu-last-sync');
  if (!el) return;
  const s = localStorage.getItem(LAST_SYNC_KEY);
  const count = db.entries.length;
  if (!s) {
    el.innerHTML = `Sin sincronización reciente<br><span style="color:var(--ink2);font-weight:700;">${count} registros locales</span>`;
    return;
  }
  const d = new Date(s);
  const ts = d.toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'}) + ' · ' + d.toLocaleDateString('es', {day:'2-digit', month:'short'});
  el.innerHTML = `Última sync: ${ts}<br><span style="color:var(--ink2);font-weight:700;">${count} registros</span>`;
}

// Elimina campos undefined recursivamente — Firestore no los acepta
// Detecta si un string es una imagen base64 (data URI)
function isBase64Image(s) {
  return typeof s === 'string' && s.startsWith('data:image');
}

// ── Array merge helpers ──────────────────────────────────────
// Merge genérico de arrays por id — toma el más reciente por createdAt
function mergeArrayById(local, remote) {
  const map = {};
  [...local, ...remote].forEach(item => {
    const existing = map[item.id];
    if (!existing || (item.createdAt||0) >= (existing.createdAt||0)) {
      map[item.id] = item;
    }
  });
  return Object.values(map);
}

// ── readDates helpers ─────────────────────────────────────
// Normaliza un readDates de cualquier formato a [{date, pag}]
// Soporta: string[] (legado), {date,pag}[] (nuevo)
function normalizeReadDates(arr) {
  return normalizeBookReadDates(arr);
}

// Extrae solo las fechas como strings para compatibilidad con heatmap/streaks
function readDatesToStrings(arr) {
  return normalizeReadDates(arr).map(r => r.date);
}

// Merge de readDates: deduplicar por date, conservar pag más reciente
function mergeReadDates(a, b) {
  return mergeBookReadDatesSmart(a, b);
}

// Calcula páginas leídas por día desde readDates [{date,pag}]
// Retorna {date → pags} usando diferencia entre marcas consecutivas
function calcPagsByDay(readDates) {
  const norm = normalizeReadDates(readDates).filter(r => r.pag !== null);
  if (norm.length === 0) return {};
  norm.sort((a,b) => a.date.localeCompare(b.date));
  const map = {};
  for (let i = 0; i < norm.length; i++) {
    const diff = i === 0 ? Number(norm[i].pag || 0) : Math.max(0, Number(norm[i].pag || 0) - Number(norm[i-1].pag || 0));
    if (diff > 0) map[norm[i].date] = diff;
  }
  return map;
}

// Calcula ritmo reciente en páginas/día usando los últimos N registros con pag
// Retorna {ritmo, dias, paginasLeidas} o null si no hay suficientes datos
function calcRitmoReciente(readDates, nDias) {
  nDias = nDias || 7;
  const norm = normalizeReadDates(readDates).filter(r => r.pag !== null);
  if (norm.length < 2) return null;
  norm.sort((a,b) => a.date.localeCompare(b.date));
  // Tomar los últimos N+1 registros para calcular N diferencias
  const recent = norm.slice(-Math.min(nDias + 1, norm.length));
  let totalPags = 0, totalDias = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = Math.max(0, recent[i].pag - recent[i-1].pag);
    // Días calendario entre los dos registros
    const d1 = new Date(recent[i-1].date), d2 = new Date(recent[i].date);
    const dias = Math.max(1, Math.round((d2 - d1) / 86400000));
    totalPags += diff;
    totalDias += dias;
  }
  if (totalDias === 0) return null;
  return {
    ritmo: totalPags / totalDias,
    dias: totalDias,
    paginasLeidas: totalPags,
    registros: recent.length - 1
  };
}

// Devuelve URL de portada válida, o null si vacía
// '__local_image__' significa que hay imagen en otro dispositivo pero no aquí
function coverUrl(e) {
  const c = e && e.cover;
  if (!c) return null;
  if (c === '__local_image__') return null; // sin imagen en este dispositivo
  return c;
}

// Detecta si un entry tiene portada pendiente de sincronizar
// (otro dispositivo la subió pero esta sesión no la tiene)
function hasPendingCover(e) {
  return e && e.cover === '__local_image__';
}

// Prepara un entry para Firestore: excluye imágenes base64
// que solo viven en localStorage (demasiado grandes para Firestore)
function entryForFirestore(entry) {
  const e = {};
  Object.entries(entry).forEach(([k, v]) => {
    // Imágenes base64 grandes (> ~500KB) → placeholder; pequeñas → pasan directo
    if (isBase64Image(v) && v.length > 666666) {
      e[k] = '__local_image__';
    } else {
      e[k] = v;
    }
  });
  return e;
}

// Restaura imágenes base64 desde localStorage al hacer merge con Firestore
// (el entry local tiene la imagen, el remoto tiene '__local_image__')
function restoreLocalImages(merged) {
  const localMap = {};
  try {
    const local = JSON.parse(localStorage.getItem('lumen_db_v1') || '{}');
    (local.entries || []).forEach(e => { localMap[e.id] = e; });
  } catch(e) {}

  merged.forEach(entry => {
    const local = localMap[entry.id];
    if (!local) return;
    Object.entries(entry).forEach(([k, v]) => {
      if (v === '__local_image__' && isBase64Image(local[k])) {
        entry[k] = local[k]; // restaurar imagen del localStorage
      }
    });
  });
  return merged;
}

function cleanForFirestore(obj, _depth) {
  const depth = _depth || 0;
  if (depth > 15) return null;

  if (obj === null) return null;
  if (obj === undefined) return null;
  if (typeof obj === 'boolean') return obj;
  if (typeof obj === 'number') return (isNaN(obj) || !isFinite(obj)) ? null : obj;
  if (typeof obj === 'string') {
    // Imágenes base64 pequeñas (comprimidas) → van a Firestore directamente
    // Solo bloquear si el string es muy grande (> ~500KB en base64 ≈ 666666 chars)
    if (isBase64Image(obj) && obj.length > 666666) return '__local_image__';
    return obj;
  }
  if (typeof obj === 'function') return null;

  if (Array.isArray(obj)) {
    return obj
      .map(item => Array.isArray(item)
        ? (item.length > 0 ? String(item[0]) : null) // aplanar array anidado
        : cleanForFirestore(item, depth + 1)
      )
      .filter(v => v !== null && v !== undefined);
  }

  if (typeof obj === 'object') {
    // JSON round-trip para eliminar prototipos y valores no serializables
    let safe = obj;
    try { safe = JSON.parse(JSON.stringify(obj)); } catch(e) {}
    const clean = {};
    Object.entries(safe).forEach(([k, v]) => {
      if (v !== undefined) {
        const cleaned = cleanForFirestore(v, depth + 1);
        if (cleaned !== undefined) clean[k] = cleaned;
      }
    });
    return clean;
  }

  return null;
}

// Diagnóstico: encontrar qué campo del entry falla con Firestore
function diagnoseEntry(entry) {
  const problems = [];
  const check = (obj, path) => {
    if (obj === undefined) { problems.push(path + ': undefined'); return; }
    if (typeof obj === 'number' && (isNaN(obj)||!isFinite(obj))) { problems.push(path+': NaN/Inf'); return; }
    if (Array.isArray(obj)) {
      obj.forEach((item,i) => {
        if (Array.isArray(item)) problems.push(path+'['+i+']: array anidado ('+JSON.stringify(item).slice(0,60)+')');
        else check(item, path+'['+i+']');
      });
      return;
    }
    if (obj !== null && typeof obj === 'object') {
      Object.entries(obj).forEach(([k,v]) => check(v, path+'.'+k));
    }
  };
  check(entry, entry.titulo||entry.id||'?');
  return problems;
}

// Debounce para evitar demasiadas escrituras a Firestore
let _saveDebounceTimer = null;
function saveDBLegacyV1() {
  normalizeAllBookReading(db.entries || [], { repairBasic:true, source:'saveDB' });
  safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
  if (currentUser) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => {
      setSyncStatus('syncing');
      const entriesClean = db.entries.map(e => cleanForFirestore(entryForFirestore(e)));
      const payload = {
        entries: entriesClean,
        mapas: cleanForFirestore(loadMapas()),
        desafios: cleanForFirestore(loadDesafios()),
        rutaCustom: cleanForFirestore(loadRutaCustomNodes()),
        rutaProgramas: cleanForFirestore(loadProgramas()),
        inventory: cleanForFirestore(loadInventory()),
        updatedAt: Date.now()
      };
      firestore.collection('users').doc(currentUser.uid).collection('data').doc('library').set(payload)
        .then(() => { setSyncStatus('ok'); setLastSync(); })
        .catch(e => {
          setSyncStatus('offline');
          console.warn('saveDB error:', e.message);
          if (e.message && e.message.includes('invalid nested entity')) {
            db.entries.forEach(entry => {
              const p = diagnoseEntry(entry);
              if (p.length > 0) console.warn('❌', entry.titulo, p);
            });
          }
        });
    }, 800); // 800ms — rápido pero agrupa cambios consecutivos
  }
}

async function syncToFirestoreLegacyV1() {
  if (!currentUser) return;
  try {
    normalizeAllBookReading(db.entries || [], { repairBasic:true, source:'syncToFirestore' });
    await auth.currentUser.getIdToken(false);
    // Preparar entries: excluir base64, limpiar valores inválidos
    const entriesClean = db.entries.map(e => cleanForFirestore(entryForFirestore(e)));
    const payload = {
      entries: entriesClean,
      mapas: cleanForFirestore(loadMapas()),
      desafios: cleanForFirestore(loadDesafios()),
      rutaCustom: cleanForFirestore(loadRutaCustomNodes()),
      rutaProgramas: cleanForFirestore(loadProgramas()),
      inventory: cleanForFirestore(loadInventory()),
      normBlacklist: loadNormBlacklist(),
      idiomasAprobados: loadIdiomasAprobados(),
    historicalLines: historicalLinesCatalog(),
      updatedAt: Date.now()
    };
    await firestore.collection('users').doc(currentUser.uid).collection('data').doc('library').set(payload);
    setSyncStatus('ok');
    setLastSync();
  } catch(e) {
    setSyncStatus('offline');
    console.warn('sync error:', e.code || e.message);
    // Diagnóstico detallado
    if (e.message && e.message.includes('invalid nested entity')) {
      console.warn('=== DIAGNÓSTICO FIRESTORE ===');
      db.entries.forEach(entry => {
        const problems = diagnoseEntry(entry);
        if (problems.length > 0) console.warn('❌', entry.titulo, '|', problems.join(' | '));
      });
      console.warn('=== FIN DIAGNÓSTICO ===');
    }
  }
}

function mergeInventory(local, remote) {
  const map = new Map();
  [...(local||[]), ...(remote||[])].forEach(item => {
    const key = item.inventoryId || inventoryKey(item, true);
    const prev = map.get(key);
    if (!prev || (item._updatedAt||0) >= (prev._updatedAt||0)) map.set(key, item);
  });
  return [...map.values()];
}

async function pullAndMergeLegacyV1(uid, silent) {
  try {
    // Esperar a que el token de auth esté listo antes de acceder a Firestore
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(false);
    }
    const snap = await firestore.collection('users').doc(uid).collection('data').doc('library').get();
    if (snap.exists) {
      const remote = snap.data();
      const remoteEntries = remote.entries || [];
      const localCount  = db.entries.length;
      const remoteCount = remoteEntries.length;

      // SIEMPRE hacer el merge primero — nunca quedarse sin datos
      const merged = mergeEntries(db.entries, remoteEntries);
      // Restaurar imágenes base64 locales que no van a Firestore
      restoreLocalImages(merged);
      db.entries = merged;
      safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
      if (remote.inventory) {
        safeLocalSetItem(INVENTORY_KEY, JSON.stringify(mergeInventory(loadInventory(), remote.inventory)));
      }

      // Restaurar mapas y desafíos desde Firestore
      if (remote.mapas) {
        const localMapas = loadMapas();
        const mergedMapas = {
          influencias: mergeArrayById(localMapas.influencias||[], remote.mapas.influencias||[]),
          rutas:       mergeArrayById(localMapas.rutas||[],       remote.mapas.rutas||[])
        };
        safeLocalSetItem(MAPAS_KEY, JSON.stringify(mergedMapas));
        mapas = mergedMapas;
      }
      if (remote.normBlacklist && Array.isArray(remote.normBlacklist)) {
        normBlacklist = remote.normBlacklist;
        saveNormBlacklist(normBlacklist, true);
      }
      // Restaurar nodos custom y programas
      if (remote.rutaCustom) {
        const localCustom = loadRutaCustomNodes();
        const merged = { ...localCustom };
        Object.entries(remote.rutaCustom).forEach(([tipo, arr]) => {
          if (!merged[tipo]) merged[tipo] = [];
          arr.forEach(n => { if (!merged[tipo].includes(n)) merged[tipo].push(n); });
        });
        safeLocalSetItem(RUTA_CUSTOM_KEY, JSON.stringify(merged));
      }
      if (remote.rutaProgramas) {
        const localProg = loadProgramas();
        const mergedProg = [...new Set([...localProg, ...remote.rutaProgramas])];
        safeLocalSetItem(PROGRAMA_KEY, JSON.stringify(mergedProg));
      }
      if (remote.desafios) {
        // Desafíos: merge por año — conservar el más reciente
        const localDes = loadDesafios();
        const mergedDes = { ...localDes };
        Object.entries(remote.desafios).forEach(([yr, val]) => {
          if (!mergedDes[yr] || (val.createdAt||0) > (mergedDes[yr].createdAt||0)) {
            mergedDes[yr] = val;
          }
        });
        safeLocalSetItem(DESAFIO_KEY, JSON.stringify(mergedDes));
      }

      // Si había una diferencia grande y no es silencioso, avisar DESPUÉS de tener los datos
      if (!silent && remoteCount > localCount + 5) {
        showToast(`✓ Sincronizado · ${merged.length} registros descargados`, 3500);
      }

      // Subir si hubo cambios locales que la nube no tenía
      const localHasNewer = db.entries.some(e => {
        const remoteEntry = remoteEntries.find(r => r.id === e.id);
        return !remoteEntry || entryTimestamp(e) > entryTimestamp(remoteEntry);
      });
      if (localHasNewer || merged.length !== remoteCount) {
        await syncToFirestore();
      } else {
        setSyncStatus('ok');
        setLastSync();
      }
    } else if (db.entries.length > 0) {
      // Firestore vacío pero tenemos datos locales → subir
      await syncToFirestore();
    } else {
      setSyncStatus('ok');
    }
  } catch(e) {
    setSyncStatus('offline');
    console.warn('pullAndMerge error:', e.code || e.message, e);
  }
}

function showSyncWarning(title, body, onOk, onCancel) {
  document.getElementById('sync-warning-title').textContent = title;
  document.getElementById('sync-warning-body').innerHTML = body;
  const modal = document.getElementById('modal-sync-warning');
  modal.style.display = 'flex';
  const btnOk     = document.getElementById('sync-warning-ok');
  const btnCancel = document.getElementById('sync-warning-cancel');
  // Clone to remove old listeners
  const newOk     = btnOk.cloneNode(true);
  const newCancel = btnCancel.cloneNode(true);
  btnOk.parentNode.replaceChild(newOk, btnOk);
  btnCancel.parentNode.replaceChild(newCancel, btnCancel);
  newOk.addEventListener('click', () => { modal.style.display='none'; if(onOk) onOk(); });
  newCancel.addEventListener('click', () => { modal.style.display='none'; if(onCancel) onCancel(); });
}

function subscribeToFirestoreLegacyV1(uid) {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  const docRef = firestore.collection('users').doc(uid).collection('data').doc('library');
  unsubscribeSnapshot = docRef.onSnapshot({ includeMetadataChanges: false }, snap => {
    if (!snap.exists) return;
    const remote = snap.data();
    const merged = mergeEntries(db.entries, remote.entries || []);
    restoreLocalImages(merged);  // recuperar imágenes base64 locales
    db.entries = merged;
    safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
    if (remote.inventory) {
      safeLocalSetItem(INVENTORY_KEY, JSON.stringify(mergeInventory(loadInventory(), remote.inventory)));
    }

    // Sincronizar mapas y desafíos desde snapshot en tiempo real
    if (remote.mapas) {
      const localMapas = loadMapas();
      const mergedMapas = {
        influencias: mergeArrayById(localMapas.influencias||[], remote.mapas.influencias||[]),
        rutas:       mergeArrayById(localMapas.rutas||[],       remote.mapas.rutas||[])
      };
      safeLocalSetItem(MAPAS_KEY, JSON.stringify(mergedMapas));
      mapas = mergedMapas;
    }
    if (remote.normBlacklist && Array.isArray(remote.normBlacklist)) {
      normBlacklist = remote.normBlacklist;
      saveNormBlacklist(normBlacklist, true);
    }
    if (remote.rutaCustom) {
      const localCustom = loadRutaCustomNodes();
      const merged = { ...localCustom };
      Object.entries(remote.rutaCustom).forEach(([tipo, arr]) => {
        if (!merged[tipo]) merged[tipo] = [];
        arr.forEach(n => { if (!merged[tipo].includes(n)) merged[tipo].push(n); });
      });
      safeLocalSetItem(RUTA_CUSTOM_KEY, JSON.stringify(merged));
    }
    if (remote.rutaProgramas) {
      const localProg = loadProgramas();
      const mergedProg = [...new Set([...localProg, ...remote.rutaProgramas])];
      safeLocalSetItem(PROGRAMA_KEY, JSON.stringify(mergedProg));
    }
    if (remote.desafios) {
      const localDes = loadDesafios();
      const mergedDes = { ...localDes };
      Object.entries(remote.desafios).forEach(([yr, val]) => {
        if (!mergedDes[yr] || (val.createdAt||0) > (mergedDes[yr].createdAt||0)) {
          mergedDes[yr] = val;
        }
      });
      safeLocalSetItem(DESAFIO_KEY, JSON.stringify(mergedDes));
    }

    setSyncStatus('ok');
    setLastSync();
    refreshCurrentScreen();
  }, err => { console.warn('Firestore snapshot error:', err); setSyncStatus('offline'); });
}

// v176: `mapas` must exist before the canonical-book startup pass.
// It is intentionally initialized as null here; the real map payload is loaded
// later, after MAPAS_KEY is initialized. This prevents a TDZ ReferenceError
// from blocking the rest of the script (including Login/Auth listeners).
let mapas = null;
let db = loadDB();
try {
  (db.entries||[]).forEach(ensureBookCanonicalRefs);
} catch (err) {
  console.warn('[LUMEN v184] Migración canónica inicial omitida para no bloquear el arranque:', err);
}
setTimeout(() => compactLocalDBOnStartup(), 300);

