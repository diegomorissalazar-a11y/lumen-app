// ═══════════════════════════════════
//  MAPAS — implementación completa
// ═══════════════════════════════════
const MAPAS_KEY = 'lumen_mapas_v1';
function loadMapas() {
  try { const r=localStorage.getItem(MAPAS_KEY); return normalizeMapasCanonical(r?JSON.parse(r):{influencias:[],rutas:[]}); }
  catch { return {influencias:[],rutas:[]}; }
}
function saveMapas() {
  // v177: persistir el mapa actual sin normalizar toda la red en cada click.
  const ok = safeLocalSetItem(MAPAS_KEY, JSON.stringify(mapas), {prune:true});
  if (!ok) console.warn('[LUMEN v183] mapa aplicado en memoria; persistencia local pendiente');
  queueCloudSyncV178(900);
  return ok;
}
mapas = loadMapas();
let currentMapaTab = 'influencias';

// ── Tab switch ──
function switchMapaTab(tab) {
  currentMapaTab = tab;
  document.getElementById('mapa-influencias-panel').style.display = tab==='influencias'?'flex':'none';
  document.getElementById('mapa-rutas-panel').style.display       = tab==='rutas'?'flex':'none';
  document.getElementById('mapa-peliculas-panel').style.display   = tab==='peliculas'?'flex':'none';
  document.getElementById('mapa-historia-panel').style.display    = tab==='historia'?'flex':'none';
  document.getElementById('mapa-normalizar-panel').style.display  = tab==='normalizar'?'flex':'none';
  ['influencias','rutas','peliculas','historia','normalizar'].forEach(t=>{
    const btn=document.getElementById('mapa-tab-'+t);
    if(btn){
      btn.classList.toggle('active', t===tab);
      btn.style.color=t===tab?'var(--gold)':'var(--ink4)';
      btn.style.borderBottom=t===tab?'2px solid var(--gold)':'2px solid transparent';
    }
  });
  if (tab==='influencias') renderMapaInfluencias();
  else if (tab==='rutas') renderMapaRutas();
  else if (tab==='peliculas') { actualizarOpcionesPeriodo(); }
  else if (tab==='historia') renderMapaHistoria();
  else if (tab==='normalizar') initNormalizacion();
}

// ── Mapa histórico / línea de tiempo v171 ──
function histEsc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function histFormatYear(y){ const n=Number(y); if(!Number.isFinite(n)) return '—'; return n<0 ? `${Math.abs(Math.round(n))} a. C.` : `${Math.round(n)} d. C.`; }
function getHistoriaTimelineItems(){
  const out=[];
  (db.entries||[]).filter(e=>e&&e.type==='libro'&&e.historia).forEach(e=>{
    ensureHistoriaCanonicalRefs(e);
    const h=e.historia||{}, periods=Array.isArray(h.periodos)?h.periodos:[];
    const linea=h.lineaPrincipal||'Sin línea histórica', lineaId=h.lineaPrincipalId||canonicalEntityId('histline',linea);
    periods.forEach((p,i)=>{let a=p.inicio,b=p.fin;a=(a===null||a===''||a===undefined)?null:Number(a);b=(b===null||b===''||b===undefined)?null:Number(b);if(Number.isFinite(a)&&!Number.isFinite(b))b=a;if(Number.isFinite(b)&&!Number.isFinite(a))a=b;out.push({entry:e,period:p,index:i,linea,lineaId,periodoId:p.periodoId||'',inicio:Number.isFinite(a)?a:null,fin:Number.isFinite(b)?b:null});});
    if(!periods.length) out.push({entry:e,period:{nombre:'Sin período fechado'},index:0,linea,lineaId,periodoId:'',inicio:null,fin:null});
  });
  return out;
}
function histLaneLayout(items){const sorted=[...items].sort((a,b)=>a.inicio-b.inicio||a.fin-b.fin),lanes=[];return sorted.map(it=>{let lane=0;while(lane<lanes.length&&it.inicio<=lanes[lane])lane++;if(lane===lanes.length)lanes.push(it.fin);else lanes[lane]=it.fin;return {...it,lane};});}
function selectHistoriaLine(lineaId){const sel=document.getElementById('hist-linea-filter');if(!sel)return;sel.value=lineaId||'';renderMapaHistoria();document.getElementById('hist-timeline-scroll')?.scrollTo({left:0,behavior:'smooth'});}
function renderMapaHistoria(){
  const content=document.getElementById('hist-map-content');if(!content)return;
  const all=getHistoriaTimelineItems(),lineMap=new Map();all.forEach(x=>{if(x.lineaId&&!lineMap.has(x.lineaId))lineMap.set(x.lineaId,x.linea);});
  const lines=[...lineMap.entries()].sort((a,b)=>a[1].localeCompare(b[1],'es')),lineSel=document.getElementById('hist-linea-filter');
  if(lineSel){const cur=lineSel.value;lineSel.innerHTML='<option value="">Todas las líneas históricas</option>'+lines.map(([id,n])=>`<option value="${histEsc(id)}">${histEsc(n)}</option>`).join('');if(lines.some(([id])=>id===cur))lineSel.value=cur;}
  const lf=lineSel?.value||'',sf=document.getElementById('hist-estado-filter')?.value||'';let items=all.filter(x=>!lf||x.lineaId===lf);
  if(sf==='inventario_no_leido')items=items.filter(x=>x.entry.enInventario&&x.entry.estado!=='leido');else if(sf)items=items.filter(x=>x.entry.estado===sf);
  const uniqueBooks=new Set(items.map(x=>x.entry.id)).size,dated=items.filter(x=>Number.isFinite(x.inicio)&&Number.isFinite(x.fin)),undated=items.filter(x=>!Number.isFinite(x.inicio)||!Number.isFinite(x.fin)),visibleLines=new Set(items.map(x=>x.lineaId)).size;
  const count=document.getElementById('hist-map-count');if(count)count.textContent=`${visibleLines} línea${visibleLines===1?'':'s'} · ${uniqueBooks} libro${uniqueBooks===1?'':'s'}`;
  const sum=document.getElementById('hist-map-summary');if(sum)sum.innerHTML=`<strong>${visibleLines}</strong> líneas <span class="hist-summary-dot">•</span> <strong>${uniqueBooks}</strong> libros <span class="hist-summary-dot">•</span> <strong>${dated.length}</strong> tramos fechados${undated.length?` <span class="hist-summary-dot">•</span> <strong>${undated.length}</strong> sin fechar`:''}${lf?` <span class="hist-summary-dot">•</span> zoom automático activo`:''}`;
  if(!items.length){content.innerHTML='<div class="hist-empty">No hay libros históricos con este filtro.<br><span style="font-family:var(--font-sans);font-style:normal;font-size:11px;">Marca un libro con la etiqueta Historia y agrega sus períodos en la ficha.</span></div>';return;}
  if(!dated.length){content.innerHTML='<div class="hist-empty">Hay libros históricos, pero aún no tienen años para construir la línea de tiempo.</div>'+renderHistUndated(undated);return;}
  let min=Math.min(...dated.map(x=>x.inicio)),max=Math.max(...dated.map(x=>x.fin));if(min===max){min-=10;max+=10;}const rawSpan=max-min,pad=Math.max(1,rawSpan*(lf?.035:.025));min-=pad;max+=pad;const span=max-min;
  const width=lf?Math.max(820,Math.min(1800,820+Math.sqrt(Math.max(1,span))*34)):Math.max(900,Math.min(2600,900+Math.sqrt(Math.max(1,span))*38));
  const chartLeft=lf?118:148,chartRight=28,x=y=>chartLeft+((y-min)/(max-min))*(width-chartLeft-chartRight),tickCount=6;let axis=`<div class="hist-axis" style="left:${chartLeft}px;right:${chartRight}px"></div>`;
  for(let i=0;i<tickCount;i++){const y=min+(max-min)*(i/(tickCount-1)),px=x(y);axis+=`<div class="hist-axis-tick" style="left:${px}px"></div><div class="hist-axis-label" style="left:${px}px">${histFormatYear(y)}</div>`;}
  const grouped=new Map();dated.forEach(it=>{if(!grouped.has(it.lineaId))grouped.set(it.lineaId,{name:it.linea,items:[]});grouped.get(it.lineaId).items.push(it);});const groups=[...grouped.entries()].sort((a,b)=>a[1].name.localeCompare(b[1].name,'es'));let cursor=70;const rows=[];
  groups.forEach(([lineId,g])=>{const laid=histLaneLayout(g.items),laneCount=Math.max(1,...laid.map(x=>x.lane+1)),rowHeight=46+laneCount*39;const bars=laid.map(it=>{const left=x(it.inicio),right=x(it.fin),bw=Math.max(18,right-left),cls=it.entry.estado==='leido'?'read':it.entry.estado==='leyendo'?'reading':'pending',inv=it.entry.enInventario&&it.entry.estado!=='leido'?' inventory':'',label=it.period.nombre||it.period.tema||'',dates=`${histFormatYear(it.inicio)}${it.fin!==it.inicio?' → '+histFormatYear(it.fin):''}`,title=`${it.entry.titulo}${label?' — '+label:''} (${dates})`,top=34+it.lane*39;return `<div class="hist-book-bar ${cls}${inv}" title="${histEsc(title)}" onclick="showDetail('${it.entry.id}')" style="left:${left}px;top:${top}px;width:${bw}px;max-width:${Math.max(120,width-left-12)}px"><div class="hist-book-title">${histEsc(it.entry.titulo)}</div><div class="hist-book-meta">${label?histEsc(label)+' · ':''}${histEsc(dates)}</div></div>`;}).join('');rows.push(`<div class="hist-line-row" style="height:${rowHeight}px"><div class="hist-line-label" title="${histEsc(g.name)} · tocar para ampliar" onclick="selectHistoriaLine('${histEsc(lineId)}')">${histEsc(g.name)}</div><div class="hist-line-guide" style="left:${chartLeft}px;right:${chartRight}px"></div>${bars}</div>`);cursor+=rowHeight;});
  content.innerHTML=`<div class="hist-timeline" style="width:${width}px;min-height:${cursor}px;padding-top:70px">${axis}${rows.join('')}</div>${renderHistUndated(undated)}`;
}
function renderHistUndated(items){if(!items.length)return'';const books=[...new Map(items.map(x=>[x.entry.id,x.entry])).values()];return `<div class="hist-undated"><strong>Sin fecha suficiente (${books.length})</strong><div style="margin-top:6px;line-height:1.7;">${books.map(e=>`<span style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted;" onclick="showDetail('${e.id}')">${histEsc(e.titulo)}</span>`).join(' · ')}</div></div>`;}

// ── Colors ──
const INF_COLORS = { cita_directa:'#e67e22', cita_indirecta:'#f1c40f', uso_personaje:'#2980b9', contexto_historico:'#27ae60', continuacion:'#8e44ad' };
const RUTA_COLORS = { mismo_autor:'#8e44ad', libro:'#c8952a', charla:'#2980b9', serie:'#e74c3c', pelicula:'#e67e22', persona:'#27ae60', cancion:'#1a6e3c', podcast:'#8b2020', entrevista:'#5a3e8b', programa:'#2e6b5e' };
const INF_LABELS  = { cita_directa:'Cita directa', cita_indirecta:'Cita indirecta', uso_personaje:'Uso de personaje', contexto_historico:'Contexto histórico', continuacion:'Continuación' };
const RUTA_LABELS = { referencia:'Referencia', recomendacion:'Recomendación', curiosidad:'Curiosidad temática', mismo_autor:'Mismo autor', contexto_vital:'Contexto vital' };

// ── Autocomplete helpers ──
function fillDatalist(id, values) {
  const dl=document.getElementById(id); if(!dl) return;
  dl.innerHTML=values.map(v=>`<option value="${v}">`).join('');
}
function getAutoresYLibros() {
  const s=new Set();
  db.entries.forEach(e=>{ if(e.titulo) s.add(e.titulo); if(e.autor) s.add(e.autor); });
  return [...s].sort();
}
function getTitulosLibros() { return db.entries.map(e=>e.titulo).filter(Boolean).sort(); }

// ═══════════════════════════════════
//  FICHA BIBLIOGRÁFICA JSON — v182
// ═══════════════════════════════════
let _bibJsonParsed=null;
let _pendingFormBibliography=null;
let _bibJsonContext={mode:'direct',parentModal:null,parentScroll:0,targetId:null};
function getBibliographyTargetBook(){const id=document.getElementById('bib-json-target')?.value||'';return id&&id!=='__form__'?findBookCanonicalById(id):null;}
function bibliographicParentIsEditor(){return !!document.getElementById('modal-add')?.classList.contains('open');}
function openBibliographicJsonModal(target){
  const parentEditor=bibliographicParentIsEditor();
  const parentModal=parentEditor?'modal-add':(document.getElementById('modal-influencia')?.classList.contains('open')?'modal-influencia':null);
  const parentScroller=parentModal?document.querySelector('#'+parentModal+' .modal'):null;
  _bibJsonContext={mode:parentEditor?'editor':'direct',parentModal,parentScroll:parentScroller?.scrollTop||0,targetId:target||'__form__'};
  document.getElementById('bib-json-target').value=target||'__form__';
  document.getElementById('bib-json-text').value='';
  document.getElementById('bib-json-preview').style.display='none';
  document.getElementById('bib-json-apply').style.display='none';
  _bibJsonParsed=null;
  openModal('modal-bib-json');
}
function openBibliographyForInfluence(){const b=getInfluenceEvidenceBook();if(!b){showToast('Selecciona primero el libro destino');return;}openBibliographicJsonModal(b.id);}
function sanitizeBibliographicJsonText(txt){
  let s=String(txt||'').trim();
  s=s.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  s=s.replace(/[“”„‟]/g,'"').replace(/[‘’]/g,"'");
  s=s.replace(/^\uFEFF/,'');
  return s;
}
function normalizeBibliographicPayload(raw){
  if(!raw||typeof raw!=='object')throw new Error('JSON bibliográfico vacío o inválido.');
  const schema=raw.schema||'';
  const accepted=['lumen_bibliografia_import_v1','lumen_ficha_bibliografica_v1'];
  if(schema&&!accepted.includes(schema))throw new Error('Schema no reconocido: '+schema);
  const l=raw.libro||raw;
  if(!l||typeof l!=='object')throw new Error('Falta el objeto libro.');

  const isNew=schema==='lumen_bibliografia_import_v1'||('edicion' in l)||('anio_obra_original' in l)||('editorial' in l);
  const oldO=l.obra_original||{}, oldE=l.edicion_consultada||{};
  const ne=l.edicion||{};
  const editorial=isNew?(l.editorial||oldE.editorial||''):(oldE.editorial||l.editorial||'');
  const ciudad=isNew?(l.ciudad_publicacion||oldE.ciudad||''):(oldE.ciudad||l.ciudad_publicacion||'');
  const pais=isNew?(l.pais_publicacion||oldE.pais||''):(oldE.pais||l.pais_publicacion||'');
  const anioEd=isNew?(ne.anio??oldE.anio??null):(oldE.anio??ne.anio??null);
  const mesEd=isNew?(ne.mes||oldE.mes||''):(oldE.mes||ne.mes||'');
  const numEd=isNew?(ne.numero??oldE.numero_edicion??null):(oldE.numero_edicion??ne.numero??null);
  const descEd=isNew?(ne.descripcion||oldE.descripcion_edicion||''):(oldE.descripcion_edicion||ne.descripcion||'');
  const isbn=isNew?(l.isbn||oldE.isbn||''):(oldE.isbn||l.isbn||'');
  const trads=isNew?asArr(l.traductores||oldE.traductores||oldE.traductor):asArr(oldE.traductores||oldE.traductor||l.traductores);
  const tituloOriginal=isNew?(l.titulo_original||oldO.titulo_original||''):(oldO.titulo_original||l.titulo_original||'');
  const idiomaOriginal=isNew?(l.idioma_original||oldO.idioma_original||''):(oldO.idioma_original||l.idioma_original||'');
  let pi=isNew?(l.anio_obra_original??oldO.periodo_inicio??oldO.anio_inicio??null):(oldO.periodo_inicio??oldO.anio_inicio??l.anio_obra_original??null);
  let pf=isNew?(l.anio_obra_original_fin??oldO.periodo_fin??oldO.anio_fin??null):(oldO.periodo_fin??oldO.anio_fin??l.anio_obra_original_fin??null);
  let original=isNew?(l.anio_obra_original??oldO.anio_publicacion_original??null):(oldO.anio_publicacion_original??l.anio_obra_original??null);
  if(original==null&&pi!=null)original=Number(pi);
  if(pi==null&&original!=null)pi=Number(original);
  if(original!=null&&pf!=null)original=Math.min(Number(original),Number(pf));
  if(pi!=null&&pf!=null)original=Math.min(Number(pi),Number(pf));
  const notes=isNew?(l.notas_bibliograficas||''):(l.notas_bibliograficas||'');
  const hist=asArr(l.historial_ediciones).map(x=>({numero:x?.numero??null,mes:x?.mes||'',anio:x?.anio??null}));

  const payload={
    schema:'lumen_ficha_bibliografica_v1',sourceSchema:schema||'compatible',titulo:l.titulo||'',autor:l.autor||'',
    obraOriginal:{tituloOriginal,idiomaOriginal,anioPublicacionOriginal:original,periodoInicio:pi,periodoFin:pf},
    edicionConsultada:{editorial,ciudad,pais,anio:anioEd,mes:mesEd,numeroEdicion:numEd,descripcionEdicion:descEd,isbn,
      coleccion:oldE.coleccion||'',traductores:trads,prologo:asArr(oldE.prologo),introduccion:asArr(oldE.introduccion),notas:asArr(oldE.notas),impresor:oldE.impresor||''},
    historialEdiciones:hist,notasBibliograficas:notes
  };
  const hasUseful=[payload.titulo,payload.autor,editorial,ciudad,pais,anioEd,numEd,descEd,isbn,trads.length,original,pi,pf,tituloOriginal,idiomaOriginal,notes].some(v=>v!==''&&v!==null&&v!==undefined&&v!==0);
  if(!hasUseful)throw new Error('El JSON no contiene datos bibliográficos reconocibles.');
  return payload;
}
function currentBibComparable(book){const ed=book?.bibliografia?.edicionConsultada||{},bo=book?.bibliografia?.obraOriginal||{};return {titulo:book?.titulo||'',autor:book?.autor||'',editorial:book?.editorial||ed.editorial||'',ciudad:book?.ciudad_publicacion||ed.ciudad||'',pais:ed.pais||'',anioEdicion:book?.anio_pub||ed.anio||'',edicion:book?.edicion||ed.descripcionEdicion||ed.numeroEdicion||'',isbn:book?.isbn||ed.isbn||'',traductores:book?.traductor||((ed.traductores||[]).join('; ')),anioOriginal:book?.anio_publicacion_original||bo.anioPublicacionOriginal||'',periodo:[book?.periodo_publicacion_inicio??bo.periodoInicio??'',book?.periodo_publicacion_fin??bo.periodoFin??''].filter(x=>x!==''&&x!=null).join('–'),tituloOriginal:bo.tituloOriginal||'',idiomaOriginal:book?.idioma||bo.idiomaOriginal||'',notas:book?.bibliografia?.notasBibliograficas||''};}
function previewBibliographicJson(){
  try{
    const txt=sanitizeBibliographicJsonText(document.getElementById('bib-json-text').value);
    document.getElementById('bib-json-text').value=txt;
    const raw=JSON.parse(txt);
    _bibJsonParsed=normalizeBibliographicPayload(raw);
    const target=getBibliographyTargetBook();
    const cur=currentBibComparable(target||{}),n=_bibJsonParsed,e=n.edicionConsultada,o=n.obraOriginal;
    const periodNew=[o.periodoInicio,o.periodoFin].filter(x=>x!==null&&x!==''&&x!==undefined).join('–');
    const rows=[
      ['Título',cur.titulo,n.titulo],['Autor',cur.autor,n.autor],['Editorial',cur.editorial,e.editorial],['Ciudad',cur.ciudad,e.ciudad],['País',cur.pais,e.pais],
      ['Año de edición',cur.anioEdicion,e.anio],['Edición',cur.edicion,e.descripcionEdicion||e.numeroEdicion],['ISBN',cur.isbn,e.isbn],
      ['Traductores',cur.traductores,e.traductores.join('; ')],['Título original',cur.tituloOriginal,o.tituloOriginal],['Idioma original',cur.idiomaOriginal,o.idiomaOriginal],
      ['Publicación original',cur.anioOriginal,o.anioPublicacionOriginal],['Período original',cur.periodo,periodNew],['Notas bibliográficas',cur.notas,n.notasBibliograficas]
    ].filter(r=>r[2]!==''&&r[2]!==null&&r[2]!==undefined);
    const el=document.getElementById('bib-json-preview');
    el.style.display='block';
    el.innerHTML=`<div style="padding:9px 11px;font-size:11px;color:var(--ink3);border-bottom:1px solid var(--border);"><strong>${rows.length} dato(s) detectado(s).</strong> Revisa antes de aplicar. Título y autor se usan para validar identidad; no reemplazan automáticamente el nombre canónico del libro.</div>${rows.map(r=>`<div style="display:grid;grid-template-columns:110px 1fr 1fr;gap:6px;padding:8px 10px;border-bottom:1px solid var(--cream2);font-size:10px;"><strong>${escapeHtml(r[0])}</strong><span style="color:var(--ink4);">${escapeHtml(String(r[1]||'—'))}</span><span style="color:${r[1]&&canonicalText(String(r[1]))!==canonicalText(String(r[2]))?'var(--red)':'var(--green)'};font-weight:700;">${escapeHtml(String(r[2]||'—'))}</span></div>`).join('')}`;
    document.getElementById('bib-json-apply').style.display=rows.length?'inline-flex':'none';
    if(!rows.length)showToast('⚠ No se detectaron campos compatibles',3500);
  }catch(e){
    _bibJsonParsed=null;
    document.getElementById('bib-json-apply').style.display='none';
    const el=document.getElementById('bib-json-preview');el.style.display='block';el.innerHTML=`<div style="padding:11px;color:var(--red);font-size:11px;line-height:1.5;">⚠ ${escapeHtml(e.message)}</div>`;
    showToast('⚠ '+e.message,4500);
  }
}
function buildCanonicalBibliography(n){
  const e=n.edicionConsultada,o=n.obraOriginal;
  const pub=e.editorial?resolveCanonicalEntity('edi',e.editorial,true):null;
  const tradEnt=e.traductores.map(t=>resolveCanonicalEntity('tra',t,true)).filter(Boolean);
  return {pub,tradEnt,bib:{schema:'lumen_ficha_bibliografica_v1',obraOriginal:o,edicionConsultada:{...e,editorial:pub?.nombreCanonico||e.editorial,editorialId:pub?.id||'',traductores:tradEnt.map(x=>x.nombreCanonico),traductorIds:tradEnt.map(x=>x.id)},historialEdiciones:n.historialEdiciones,notasBibliograficas:n.notasBibliograficas||''}};
}
function applyBibliographyToEditor(n,canon){
  const e=n.edicionConsultada,o=n.obraOriginal,{pub,tradEnt,bib}=canon;
  const set=(id,v)=>{const x=document.getElementById(id);if(x&&v!==''&&v!=null)x.value=v;};
  set('f-editorial',pub?.nombreCanonico||e.editorial);set('f-ciudad-pub',e.ciudad);set('f-anio-pub',e.anio);set('f-edicion',e.descripcionEdicion||e.numeroEdicion);set('f-traductor',tradEnt.map(x=>x.nombreCanonico).join('; '));
  if(o.idiomaOriginal){const sel=document.getElementById('f-idioma');if(sel){const opt=[...sel.options].find(x=>canonicalText(x.value)===canonicalText(o.idiomaOriginal)||canonicalText(x.textContent)===canonicalText(o.idiomaOriginal));if(opt)sel.value=opt.value;}}
  _pendingFormBibliography=bib;
  const sc=document.querySelector('#modal-add .modal');
  setTimeout(()=>{if(sc)sc.scrollTop=_bibJsonContext.parentScroll||0;},20);
}
function applyBibliographicJson(){
  if(!_bibJsonParsed){showToast('Revisa primero el JSON');return;}
  const n=_bibJsonParsed,e=n.edicionConsultada,o=n.obraOriginal;
  const canon=buildCanonicalBibliography(n);
  const editorMode=_bibJsonContext.mode==='editor'&&document.getElementById('modal-add')?.classList.contains('open');
  const target=getBibliographyTargetBook();
  if(editorMode){
    applyBibliographyToEditor(n,canon);
  } else if(target){
    const {pub,tradEnt,bib}=canon;
    target.bibliografia=bib;
    if(pub){target.editorial=pub.nombreCanonico;target.editorialId=pub.id;}
    if(e.ciudad)target.ciudad_publicacion=e.ciudad;if(e.anio)target.anio_pub=Number(e.anio)||e.anio;if(e.descripcionEdicion||e.numeroEdicion)target.edicion=String(e.descripcionEdicion||e.numeroEdicion);if(e.isbn)target.isbn=e.isbn;
    if(tradEnt.length){target.traductor=tradEnt.map(x=>x.nombreCanonico).join('; ');target.traductorIds=tradEnt.map(x=>x.id);}
    if(o.idiomaOriginal)target.idioma=o.idiomaOriginal;if(o.anioPublicacionOriginal!=null)target.anio_publicacion_original=Number(o.anioPublicacionOriginal);if(o.periodoInicio!=null)target.periodo_publicacion_inicio=Number(o.periodoInicio);if(o.periodoFin!=null)target.periodo_publicacion_fin=Number(o.periodoFin);
    target._updatedAt=Date.now();ensureBookCanonicalRefs(target);saveDB();
  } else {
    applyBibliographyToEditor(n,canon);
  }
  closeModal('modal-bib-json');
  if(document.getElementById('modal-influencia')?.classList.contains('open')){syncInfCanonicalBibliography();actualizarIsoPreview();}
  showToast(editorMode?'✓ Datos aplicados al editor. Guarda la ficha para confirmar.':'✓ Ficha bibliográfica actualizada');
  if(!editorMode&&currentScreen==='library')renderLibrary();
}

// ══════════════════════════
// ══════════════════════════
//  INFLUENCIAS — CRUD
// ══════════════════════════

// ── Helpers para autocompletado ──────────────────────────
function getAutoresBiblioteca() {
  const byId=new Map(); allKnownEntityNames('aut').forEach(x=>{if(!byId.has(x.id))byId.set(x.id,{id:x.id,name:canonicalNameById('aut',x.id,x.name)});});
  return [...byId.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
}
function getLibrosPorAutor(autor) {
  return db.entries
    .filter(e => e.type === 'libro' && splitCanonicalAuthors(e.autor).some(a=>canonicalText(a)===canonicalText(autor)))
    .sort((a,b) => a.titulo.localeCompare(b.titulo,'es'));
}
function getTodosLibros() {
  return db.entries
    .filter(e => e.type === 'libro')
    .sort((a,b) => a.titulo.localeCompare(b.titulo,'es'));
}

// ── Rellenar selectores ──────────────────────────────────
function rellenarInfFuenteSel() {
  const sel = document.getElementById('inf-fuente-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecciona un autor —</option>';
  getAutoresBiblioteca().forEach(a => {
    const o = document.createElement('option'); o.value = a.name; o.textContent = a.name; o.dataset.authorId=a.id; sel.appendChild(o);
  });
  const oOtro = document.createElement('option');
  oOtro.value = '__otro__'; oOtro.textContent = '✏ No está en la lista...';
  sel.appendChild(oOtro);
}

function rellenarInfObraSel(autor) {
  const sel   = document.getElementById('inf-obra-sel');
  const libre = document.getElementById('inf-obra-libre');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecciona o escribe abajo —</option>';
  if (autor && autor !== '__otro__') {
    const libros = getLibrosPorAutor(autor);
    libros.forEach(e => {
      const o = document.createElement('option');
      o.value = e.titulo; o.textContent = e.anio_pub ? `${e.titulo} (${e.anio_pub})` : e.titulo; o.dataset.entryId=e.id;
      sel.appendChild(o);
    });
  }
  const oOtro = document.createElement('option');
  oOtro.value = '__otro__'; oOtro.textContent = '✏ Escribir título...';
  sel.appendChild(oOtro);
  if (libre) libre.style.display = 'none';
}

function rellenarInfDestinoSel() {
  const sel = document.getElementById('inf-destino-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecciona el libro —</option>';
  getTodosLibros().forEach(e => {
    ensureBookCanonicalRefs(e);
    const o = document.createElement('option');
    o.value = e.titulo;
    o.dataset.entryId = e.id;
    o.textContent = e.anio ? `${e.titulo} (${e.anio})` : e.titulo;
    sel.appendChild(o);
  });
}

// ── Eventos de cambio ────────────────────────────────────
function onInfTipoChange() {
  const tipo = document.getElementById('inf-tipo').value;
  const esDirecta = tipo === 'cita_directa';
  const esIndirecta = tipo === 'cita_indirecta';
  document.getElementById('inf-panel-cita-directa').style.display   = esDirecta   ? 'block' : 'none';
  document.getElementById('inf-panel-cita-indirecta').style.display = esIndirecta ? 'block' : 'none';
  // Otros tipos: no muestran panel extra
  const lbl = document.getElementById('inf-fuente-label');
  const labels = {
    cita_directa:      'Autor que es citado',
    cita_indirecta:    'Autor o fuente que menciona',
    uso_personaje:     'Obra de origen del personaje',
    contexto_historico:'Contexto histórico / obra de referencia',
    continuacion:      'Obra original',
  };
  if (lbl) lbl.textContent = labels[tipo] || 'Fuente';
}

function onInfFuenteSelChange() {
  const sel   = document.getElementById('inf-fuente-sel');
  const libre = document.getElementById('inf-fuente-libre');
  const hint  = document.getElementById('inf-fuente-libre-hint');
  if (sel.value === '__otro__') {
    libre.style.display = 'block'; hint.style.display = 'block'; libre.focus();
  } else {
    libre.style.display = 'none'; hint.style.display = 'none'; libre.value = '';
    // Autocompletar obra si el autor está en biblioteca
    rellenarInfObraSel(sel.value);
    // La bibliografía ISO no se toma del primer libro del autor citado.
    // Se toma del libro leído / destino seleccionado (fuente canónica de evidencia).
    syncInfCanonicalBibliography();
    actualizarIsoPreview();
  }
}

function onInfFuenteLibreInput() {
  actualizarIsoPreview();
}

function onInfObraSelChange() {
  const sel   = document.getElementById('inf-obra-sel');
  const libre = document.getElementById('inf-obra-libre');
  if (sel.value === '__otro__') {
    libre.style.display = 'block'; libre.focus();
  } else {
    libre.style.display = 'none'; libre.value = '';
    // La obra citada identifica la relación; la referencia ISO permanece
    // vinculada al libro leído / destino, no duplica su bibliografía.
    syncInfCanonicalBibliography();
    actualizarIsoPreview();
  }
}

function syncInfCanonicalBibliography() {
  const book=getInfluenceEvidenceBook();
  const b=canonicalBookBibliography(book);
  const set=(id,v)=>{const el=document.getElementById(id); if(el) el.value=(v??'').toString();};
  set('inf-editorial', b.editorial); set('inf-anio-pub', b.anio); set('inf-ciudad', b.ciudad); set('inf-edicion', b.edicion);
  const warn=document.getElementById('inf-bib-warning'),txt=document.getElementById('inf-bib-warning-text'); const miss=bibliographyMissing(book);
  if(warn){warn.style.display=(book&&miss.length)?'block':'none'; if(txt)txt.textContent=miss.length?'Faltan: '+miss.join(', ')+'.':'';}
  return book;
}
function onInfDestinoSelChange() {
  syncInfCanonicalBibliography();
  actualizarIsoPreview();
}

function onInfUbicacionChange() {
  actualizarIsoPreview();
}

function onInfFuenteIndirectaChange() {
  const tipo = document.getElementById('inf-fuente-indirecta-tipo').value;
  document.getElementById('inf-ind-libro').style.display   = tipo === 'libro'         ? 'block' : 'none';
  document.getElementById('inf-ind-tv').style.display      = tipo === 'entrevista_tv'  ? 'block' : 'none';
  document.getElementById('inf-ind-prensa').style.display  = tipo === 'prensa'         ? 'block' : 'none';
}

// ── Preview ISO 690 ──────────────────────────────────────
function getInfFuente() {
  const sel   = document.getElementById('inf-fuente-sel');
  const libre = document.getElementById('inf-fuente-libre');
  return sel && sel.value === '__otro__' ? libre?.value.trim() : sel?.value || '';
}
function getInfObra() {
  const sel   = document.getElementById('inf-obra-sel');
  const libre = document.getElementById('inf-obra-libre');
  return sel && sel.value === '__otro__' ? libre?.value.trim() : sel?.value || '';
}

function actualizarIsoPreview() {
  const preview = document.getElementById('inf-iso-preview');
  if (!preview) return;
  const tipo = document.getElementById('inf-tipo')?.value;
  if (tipo !== 'cita_directa') { preview.style.display = 'none'; return; }

  const evidence  = syncInfCanonicalBibliography();
  const bib       = canonicalBookBibliography(evidence);
  const autor     = bib.autor || '';
  const obra      = bib.titulo || '';
  const editorial = bib.editorial || '';
  const anio      = bib.anio || '';
  const ciudad    = bib.ciudad || '';
  const edicion   = bib.edicion || '';
  const ubTipo    = document.getElementById('inf-ubicacion-tipo')?.value;
  const ubDetalle = document.getElementById('inf-ubicacion-detalle')?.value.trim();

  if (!autor && !obra) { preview.style.display = 'none'; return; }

  const cita=formatIsoBookReference(evidence,ubTipo,ubDetalle);
  preview.innerHTML = `<div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink4);font-family:var(--font-sans);margin-bottom:4px;font-weight:700;">Referencia ISO 690 · libro leído</div>${escapeHtml(cita)}`;
  preview.style.display = 'block';
}


function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch] || ch));
}

// ── UX operativa: tarjetas e importador JSON ───────────────────────────────
const INF_CARD_DEFS = [
  { tipo:'cita_directa', icon:'🟠', title:'Cita directa', desc:'Menciones explícitas entre autores, obras, personajes o fuentes.' },
  { tipo:'uso_personaje', icon:'🔵', title:'Uso de personaje', desc:'Reutilización, transformación, parodia o reescritura de personajes.' },
  { tipo:'cita_indirecta', icon:'🟡', title:'Cita indirecta', desc:'Relaciones mediadas por entrevista, prensa, ensayo, programa, podcast u otra fuente secundaria.' },
  { tipo:'contexto_historico', icon:'🟢', title:'Contexto histórico', desc:'Conexiones con hechos, periodos, dinastías, guerras o contextos culturales.' },
  { tipo:'continuacion', icon:'🟣', title:'Continuación / adaptación', desc:'Obra original, adaptación, secuela, relectura o derivación.' }
];
let _infJsonPreviewItems = [];

function renderInfluenciasTypeCards(targetId='inf-type-cards-panel') {
  const el = document.getElementById(targetId) || document.getElementById('inf-type-cards-panel');
  if (!el) return;
  el.innerHTML = INF_CARD_DEFS.map(c => `
    <div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:12px;box-shadow:0 1px 5px rgba(26,21,16,0.05);display:flex;flex-direction:column;gap:8px;min-height:138px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">${c.icon}</span>
        <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;color:var(--ink);line-height:1.2;">${c.title}</div>
      </div>
      <div style="font-size:11px;color:var(--ink3);line-height:1.5;flex:1;">${c.desc}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button onclick="closeModal('modal-inf-actions');openModalInfluencia(null,'${c.tipo}')" style="padding:7px 8px;border:1.5px solid var(--border);border-radius:4px;background:var(--cream2);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;font-family:var(--font-sans);color:var(--ink2);">Cargar datos</button>
        <button onclick="closeModal('modal-inf-actions');openInfJsonImport('${c.tipo}')" style="padding:7px 8px;border:1.5px solid var(--ink);border-radius:4px;background:var(--ink);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;font-family:var(--font-sans);color:var(--cream);">Cargar JSON</button>
      </div>
    </div>`).join('');
}

function openInfluenciasCargaPanel() {
  renderInfluenciasTypeCards('inf-type-cards-panel');
  openModal('modal-inf-actions');
}

function openInfJsonImport(tipo) {
  document.getElementById('inf-json-tipo').value = tipo || '';
  const title = INF_TIPO_LABELS[tipo] || 'Cargar influencias JSON';
  document.getElementById('inf-json-title').textContent = `Cargar JSON · ${String(title).replace(/^[^\wÁÉÍÓÚÑáéíóúñ]+\s*/, '')}`;
  const txt = document.getElementById('inf-json-text');
  if (txt) txt.value = '';
  document.getElementById('inf-json-status').textContent = 'Pega el JSON y presiona “Cargar JSON” para revisar la vista previa antes de guardar.';
  document.getElementById('inf-json-preview').style.display = 'none';
  document.getElementById('inf-json-preview').innerHTML = '';
  document.getElementById('inf-json-confirm').style.display = 'none';
  _infJsonPreviewItems = [];
  openModal('modal-inf-json');
  setTimeout(() => { const el=document.getElementById('inf-json-text'); if (el) el.focus(); }, 120);
}

function loadInfJsonFromTextarea() {
  const txt = document.getElementById('inf-json-text');
  const rawText = (txt?.value || '').trim();
  if (!rawText) {
    document.getElementById('inf-json-status').textContent = 'Pega un JSON antes de cargar.';
    document.getElementById('inf-json-confirm').style.display = 'none';
    return;
  }
  try {
    const raw = JSON.parse(rawText);
    prepareInfJsonPreview(raw);
  } catch (err) {
    document.getElementById('inf-json-status').textContent = 'No se pudo leer el JSON: ' + err.message;
    document.getElementById('inf-json-preview').style.display = 'none';
    document.getElementById('inf-json-confirm').style.display = 'none';
  }
}

function normalizeTxt(v) {
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
}
function findBookByTitleAuthor(titulo, autor) {
  const nt = normalizeTxt(titulo), na = normalizeTxt(autor);
  return (db.entries||[]).find(e => e.type==='libro' && normalizeTxt(e.titulo)===nt && (!na || normalizeTxt(e.autor)===na))
      || (db.entries||[]).find(e => e.type==='libro' && normalizeTxt(e.titulo)===nt)
      || null;
}

function getInfluenceDestinoAutorMeta(destinoTitulo, destinoAutor) {
  const titulo = String(destinoTitulo || '').trim();
  const autor  = String(destinoAutor || '').trim();
  const libroMatch = findBookByTitleAuthor(titulo, autor);
  if (libroMatch) {
    const autorNodo = String(libroMatch.autor || autor || libroMatch.titulo || titulo).trim();
    return {
      destinoNodo: autorNodo,
      libroRef: libroMatch.titulo || titulo,
      destinoAutor: autorNodo,
      destinoExiste: true,
      destinoTituloOriginal: titulo
    };
  }
  if (autor) {
    return {
      destinoNodo: autor,
      libroRef: titulo,
      destinoAutor: autor,
      destinoExiste: false,
      destinoTituloOriginal: titulo
    };
  }
  return {
    destinoNodo: titulo,
    libroRef: titulo,
    destinoAutor: '',
    destinoExiste: false,
    destinoTituloOriginal: titulo
  };
}

function migrateInfluenciasToAuthorGraph() {
  if (!mapas || !Array.isArray(mapas.influencias) || !mapas.influencias.length) return false;
  let changed = false;
  mapas.influencias.forEach(inf => {
    const refTitulo = inf.libro_ref || inf.destino_titulo || inf.destinoOriginal || inf.destino || '';
    const meta = getInfluenceDestinoAutorMeta(refTitulo, inf.destino_autor || '');
    if (meta.destinoExiste && meta.destinoNodo && inf.destino !== meta.destinoNodo) {
      inf.destino = meta.destinoNodo;
      inf.libro_ref = meta.libroRef;
      inf.destino_autor = meta.destinoAutor;
      inf.destino_tipo = 'autor';
      inf.destino_titulo = meta.libroRef;
      changed = true;
    } else if (meta.libroRef && !inf.libro_ref) {
      inf.libro_ref = meta.libroRef;
      changed = true;
    }
  });
  if (changed) {
    try { saveMapas(); } catch(e) { console.warn('No se pudo guardar migración autor→autor', e); }
  }
  return changed;
}
function normalizeInfDedupeKey(inf) {
  return [inf.tipo, inf.fuente, inf.destino, inf.ubicacion_tipo, inf.ubicacion_detalle]
    .map(normalizeTxt).join('|');
}
function importedInfExists(inf) {
  const byId = inf.id_import ? (mapas.influencias||[]).some(x => x.id_import === inf.id_import) : false;
  if (byId) return true;
  const key = inf.import_key || normalizeInfDedupeKey(inf);
  return (mapas.influencias||[]).some(x => (x.import_key || normalizeInfDedupeKey(x)) === key);
}
function asArr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

function mapJsonInfluenceToLumen(item, forcedTipo) {
  const tipo = forcedTipo || item.tipo || 'cita_directa';
  const fuente = item.fuente?.nombre || item.fuente || item.autor_citado || item.origen || '';
  const destinoTitulo = item.destino?.titulo || item.destino || item.libro_destino || '';
  const destinoAutor = item.destino?.autor || '';
  const evidenceBook=findBookCanonicalByTitle(destinoTitulo,destinoAutor);
  if(evidenceBook)ensureBookCanonicalRefs(evidenceBook);
  const destinoMeta = getInfluenceDestinoAutorMeta(destinoTitulo, destinoAutor);
  const destino = destinoMeta.destinoNodo;
  const ev=item.evidencia||{};
  let ubicTipo=item.iso?.ubicacion_tipo||item.ubicacion_tipo||'';
  let ubicDetalle=item.iso?.ubicacion_detalle||item.ubicacion_detalle||item.ubicacion||'';
  if(!ubicDetalle && ev.pagina!=null){ubicTipo='pagina';ubicDetalle=String(ev.pagina);}
  else if(!ubicDetalle && ev.loc!=null){ubicTipo='loc';ubicDetalle=String(ev.loc);}
  else if(!ubicDetalle && ev.capitulo!=null){ubicTipo='capitulo';ubicDetalle=String(ev.capitulo);}
  if(!ubicTipo)ubicTipo='pagina';
  const obra = item.obra_citada?.titulo || item.obra || item.fuente?.nombre_en_texto || fuente;
  const bib=canonicalBookBibliography(evidenceBook);
  const obj = {
    id: 'inf_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), id_import:item.id_import||'', tipo, fuente, destino, obra,
    editorial:bib.editorial||item.iso?.editorial||item.editorial||'', anio_pub:bib.anio||item.iso?.anio||item.anio_pub||'', ciudad:bib.ciudad||item.iso?.ciudad||item.ciudad||'', edicion:bib.edicion||item.iso?.edicion||item.edicion||'',
    fuente_autor_id:'', destino_libro_id:evidenceBook?.id||'', evidencia_libro_id:evidenceBook?.id||'', destino_autor_id:evidenceBook?.autorId||'', editorial_id:evidenceBook?.editorialId||'',
    ubicacion_tipo:ubicTipo, ubicacion_detalle:ubicDetalle, texto:ev.texto||item.texto_citado||item.texto||'', fuente_nombre_en_texto:item.fuente?.nombre_en_texto||'', obra_tipo:item.obra_citada?.tipo||'', peso:item.peso||1, nota:item.nota||'', tags:asArr(item.tags),
    destino_tipo:'autor', destino_autor:destinoMeta.destinoAutor||destino, destino_titulo:destinoMeta.libroRef||destinoTitulo, destino_original:destinoTitulo, libro_ref:destinoMeta.libroRef||destinoTitulo,
    pagina:ubicTipo==='pagina'?(parseInt(ubicDetalle)||null):null, import_schema:'lumen_influencias_import_v1', importedAt:Date.now(), createdAt:Date.now()
  };
  obj.import_key=normalizeInfDedupeKey(obj);
  return {obj,destinoExiste:!!destinoMeta.destinoExiste,destinoOriginal:destinoTitulo,destinoAutor:destinoMeta.destinoAutor||destinoAutor,evidenceBook,missingBib:bibliographyMissing(evidenceBook)};
}
function prepareInfJsonPreview(raw) {
  const forcedTipo = document.getElementById('inf-json-tipo').value || '';
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw.influencias)) arr = raw.influencias;
  else if (raw.tipo || raw.fuente || raw.destino) arr = [raw];
  if (!arr.length) throw new Error('No se encontraron relaciones en el JSON.');
  _infJsonPreviewItems = arr.map(x => mapJsonInfluenceToLumen(x, forcedTipo));
  _infJsonPreviewItems.forEach(p => { p.duplicada = importedInfExists(p.obj); });
  renderInfJsonPreview();
}

function renderInfJsonPreview() {
  const el = document.getElementById('inf-json-preview');
  const validas = _infJsonPreviewItems.filter(x=>!x.duplicada).length;
  const dup = _infJsonPreviewItems.filter(x=>x.duplicada).length;
  const libres = _infJsonPreviewItems.filter(x=>!x.destinoExiste).length;
  const bibPend=_infJsonPreviewItems.filter(x=>x.destinoExiste&&x.missingBib&&x.missingBib.length).length;
  document.getElementById('inf-json-status').textContent = `${_infJsonPreviewItems.length} relación(es) detectada(s). ${validas} nueva(s), ${dup} duplicada(s), ${libres} con destino libre, ${bibPend} con bibliografía pendiente.`;
  el.style.display = 'block';
  el.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--ink4);line-height:1.5;">
      Revisa antes de confirmar. Si el libro destino no existe, se importará como nodo libre.
    </div>
    ${_infJsonPreviewItems.map((p,i)=>`
      <div style="padding:10px 12px;border-bottom:1px solid var(--cream2);${p.duplicada?'opacity:.55;':''}">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
          <span class="badge" style="background:${p.duplicada?'#f3e5e5':(p.destinoExiste?'#e8f0e8':'#fff8e8')};color:${p.duplicada?'var(--red)':(p.destinoExiste?'var(--green)':'var(--gold)')};border:1px solid var(--border);">${p.duplicada?'Duplicada':(p.destinoExiste?'Destino OK':'Destino libre')}</span>
          <strong style="font-size:12px;color:var(--ink);">${INF_TIPO_LABELS[p.obj.tipo]||p.obj.tipo}</strong>
        </div>
        <div style="font-size:12px;color:var(--ink2);line-height:1.5;"><strong>${escapeHtml(p.obj.fuente)}</strong> → <strong>${escapeHtml(p.obj.destino||'Sin destino')}</strong></div>
        <div style="font-size:11px;color:var(--ink4);margin-top:3px;">${escapeHtml(p.obj.ubicacion_detalle||'Sin ubicación')}${p.obj.id_import?' · ID: '+escapeHtml(p.obj.id_import):''}</div>
        ${p.missingBib?.length?`<div style="font-size:10px;color:var(--gold);margin-top:5px;">⚠ Faltan para ISO: ${escapeHtml(p.missingBib.join(', '))}</div>`:''}${p.obj.texto?`<div style="font-family:var(--font-serif);font-size:12px;color:var(--ink3);margin-top:6px;line-height:1.5;">“${escapeHtml(p.obj.texto)}”</div>`:''}
      </div>`).join('')}`;
  document.getElementById('inf-json-confirm').style.display = validas ? 'inline-flex' : 'none';
}

function confirmInfJsonImport() {
  const nuevos=_infJsonPreviewItems.filter(x=>!x.duplicada).map(x=>x.obj); if(!nuevos.length){showToast('No hay relaciones nuevas para importar');return;}
  nuevos.forEach(obj=>{const ent=resolveCanonicalEntity('aut',obj.fuente,true);obj.fuente_autor_id=ent.id;obj.fuente=ent.nombreCanonico||obj.fuente;ensureInfluenceCanonicalRefs(obj);});
  const ts=Date.now(); try{safeLocalSetItem('lumen_mapas_backup_before_influencias_import_'+ts,JSON.stringify(mapas));}catch(e){}
  mapas.influencias=mapas.influencias||[];mapas.influencias.push(...nuevos);saveMapas();closeModal('modal-inf-json');showToast(`✓ ${nuevos.length} relación(es) importada(s)`);renderMapaInfluencias();
}

// ── CRUD ─────────────────────────────────────────────────
function openModalInfluencia(editId, presetTipo) {
  rellenarInfFuenteSel();
  rellenarInfDestinoSel();
  document.getElementById('inf-edit-id').value = editId||'';

  if (editId) {
    const inf = mapas.influencias.find(x => x.id === editId);
    if (inf) {
      document.getElementById('inf-tipo').value = inf.tipo||'cita_directa';
      onInfTipoChange();
      // Fuente
      const fuenteSel = document.getElementById('inf-fuente-sel');
      if ([...fuenteSel.options].some(o => o.value === inf.fuente)) {
        fuenteSel.value = inf.fuente;
        rellenarInfObraSel(inf.fuente);
      } else {
        fuenteSel.value = '__otro__';
        document.getElementById('inf-fuente-libre').style.display = 'block';
        document.getElementById('inf-fuente-libre').value = inf.fuente||'';
      }
      // Obra
      const obraSel = document.getElementById('inf-obra-sel');
      if ([...obraSel.options].some(o => o.value === inf.obra)) {
        obraSel.value = inf.obra;
      } else if (inf.obra) {
        obraSel.value = '__otro__';
        document.getElementById('inf-obra-libre').style.display = 'block';
        document.getElementById('inf-obra-libre').value = inf.obra;
      }
      // Campos ISO
      ['editorial','anio_pub','ciudad','edicion'].forEach(f => {
        const el = document.getElementById('inf-'+f.replace('_','-'));
        if (el) el.value = inf[f]||'';
      });
      document.getElementById('inf-ubicacion-tipo').value    = inf.ubicacion_tipo||'pagina';
      document.getElementById('inf-ubicacion-detalle').value = inf.ubicacion_detalle||'';
      document.getElementById('inf-texto').value             = inf.texto||'';
      // Indirecta
      if (inf.tipo === 'cita_indirecta') {
        document.getElementById('inf-fuente-indirecta-tipo').value = inf.fuente_ind_tipo||'libro';
        onInfFuenteIndirectaChange();
        document.getElementById('inf-ind-anio').value        = inf.ind_anio||'';
        document.getElementById('inf-ind-pagina').value      = inf.ind_pagina||'';
        document.getElementById('inf-ind-programa').value    = inf.ind_programa||'';
        document.getElementById('inf-ind-canal').value       = inf.ind_canal||'';
        document.getElementById('inf-ind-tv-anio').value     = inf.ind_tv_anio||'';
        document.getElementById('inf-ind-youtube').value     = inf.ind_youtube||'';
        document.getElementById('inf-ind-titulo-art').value  = inf.ind_titulo_art||'';
        document.getElementById('inf-ind-medio').value       = inf.ind_medio||'';
        document.getElementById('inf-ind-fecha').value       = inf.ind_fecha||'';
        document.getElementById('inf-ind-pag-url').value     = inf.ind_pag_url||'';
        document.getElementById('inf-texto-ind').value       = inf.texto||'';
      }
      // Destino
      const destSel = document.getElementById('inf-destino-sel');
      const destinoSeleccion = inf.libro_ref || inf.destino_titulo || inf.destino || '';
      if ([...destSel.options].some(o => o.value === destinoSeleccion)) destSel.value = destinoSeleccion;
      syncInfCanonicalBibliography();
      actualizarIsoPreview();
    }
  } else {
    // Reset
    document.getElementById('inf-tipo').value = presetTipo || 'cita_directa';
    onInfTipoChange();
    onInfFuenteIndirectaChange();
    ['inf-editorial','inf-anio-pub','inf-ciudad','inf-edicion',
     'inf-ubicacion-detalle','inf-texto','inf-texto-ind',
     'inf-ind-anio','inf-ind-pagina','inf-ind-programa','inf-ind-canal',
     'inf-ind-tv-anio','inf-ind-youtube','inf-ind-titulo-art',
     'inf-ind-medio','inf-ind-fecha','inf-ind-pag-url'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('inf-ubicacion-tipo').value = 'pagina';
    rellenarInfObraSel('');
    actualizarIsoPreview();
  }
  syncInfCanonicalBibliography();
  actualizarIsoPreview();
  openModal('modal-influencia');
}

function saveInfluencia() {
  return lumenSafeAction("Guardar influencia", () => {
  const tipo    = document.getElementById('inf-tipo').value;
  const fuente  = getInfFuente().trim();
  const destinoLibro = document.getElementById('inf-destino-sel').value.trim();
  if (!fuente)  { showToast('Indica el autor o fuente'); return; }
  if (!destinoLibro) { showToast('Selecciona el libro destino'); return; }
  const editId  = document.getElementById('inf-edit-id').value;
  const destinoMeta = getInfluenceDestinoAutorMeta(destinoLibro, '');
  const destino = destinoMeta.destinoNodo || destinoLibro;

  const obra = getInfObra();
  const sourceBook = getInfluenceSourceBook();
  const evidenceBook = getInfluenceEvidenceBook();
  if (evidenceBook) ensureBookCanonicalRefs(evidenceBook);
  const evidenceBib = canonicalBookBibliography(evidenceBook);
  const selectedFuenteId=getSelectedOptionData('inf-fuente-sel','authorId'); const sourceEntity=selectedFuenteId?{id:selectedFuenteId,nombreCanonico:canonicalNameById('aut',selectedFuenteId,fuente)}:resolveCanonicalEntity('aut',fuente,true); const fuenteAutorId=sourceEntity.id; const fuenteCanon=sourceEntity.nombreCanonico||fuente;

  const obj = {
    id:               editId || 'inf_' + Date.now(),
    tipo, fuente: fuenteCanon, destino, obra,
    editorial:        evidenceBib.editorial || '',
    editorial_id:     evidenceBook?.editorialId || canonicalEntityId('edi', evidenceBib.editorial),
    anio_pub:         evidenceBib.anio || '',
    ciudad:           evidenceBib.ciudad || '',
    edicion:          evidenceBib.edicion || '',
    fuente_autor_id:  fuenteAutorId,
    fuente_libro_id:  sourceBook?.id || '',
    destino_libro_id: evidenceBook?.id || '',
    destino_autor_id: evidenceBook?.autorId || canonicalEntityId('aut', destinoMeta.destinoAutor || destino),
    evidencia_libro_id:evidenceBook?.id || '',
    ubicacion_tipo:   document.getElementById('inf-ubicacion-tipo')?.value||'pagina',
    ubicacion_detalle:document.getElementById('inf-ubicacion-detalle')?.value.trim()||'',
    texto:            (tipo==='cita_indirecta'
                        ? document.getElementById('inf-texto-ind')?.value.trim()
                        : document.getElementById('inf-texto')?.value.trim())||'',
    // Campos cita indirecta
    fuente_ind_tipo:  document.getElementById('inf-fuente-indirecta-tipo')?.value||'',
    ind_anio:         document.getElementById('inf-ind-anio')?.value.trim()||'',
    ind_pagina:       document.getElementById('inf-ind-pagina')?.value.trim()||'',
    ind_programa:     document.getElementById('inf-ind-programa')?.value.trim()||'',
    ind_canal:        document.getElementById('inf-ind-canal')?.value.trim()||'',
    ind_tv_anio:      document.getElementById('inf-ind-tv-anio')?.value.trim()||'',
    ind_youtube:      document.getElementById('inf-ind-youtube')?.value.trim()||'',
    ind_titulo_art:   document.getElementById('inf-ind-titulo-art')?.value.trim()||'',
    ind_medio:        document.getElementById('inf-ind-medio')?.value.trim()||'',
    ind_fecha:        document.getElementById('inf-ind-fecha')?.value.trim()||'',
    ind_pag_url:      document.getElementById('inf-ind-pag-url')?.value.trim()||'',
    // Compatibilidad y grafo autor→autor
    destino_tipo:     'autor',
    destino_autor:    destinoMeta.destinoAutor || destino,
    destino_titulo:   destinoMeta.libroRef || destinoLibro,
    libro_ref:        destinoMeta.libroRef || destinoLibro,
    pagina:           parseInt(document.getElementById('inf-ubicacion-detalle')?.value)||null,
    createdAt:        editId ? (mapas.influencias.find(x=>x.id===editId)?.createdAt||Date.now()) : Date.now()
  };

  ensureInfluenceCanonicalRefs(obj);
  if (editId) { const i=mapas.influencias.findIndex(x=>x.id===editId); if(i>=0) mapas.influencias[i]=obj; }
  else mapas.influencias.push(obj);
  saveMapas();
  closeModal('modal-influencia');
  showToast('✓ Relación guardada');
  renderMapaInfluencias();

  });
}

function deleteInfluencia(id) {
  if (!confirm('¿Eliminar esta relación?')) return;
  mapas.influencias = mapas.influencias.filter(x => x.id !== id);
  saveMapas(); renderMapaInfluencias(); showToast('Relación eliminada');
}


function fieldRow(label, value, isLong=false) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const safe = escapeHtml(value);
  return `<div style="padding:9px 0;border-bottom:1px solid var(--cream2);display:${isLong?'block':'grid'};grid-template-columns:150px 1fr;gap:10px;">
    <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);font-weight:700;margin-bottom:${isLong?'5px':'0'};">${label}</div>
    <div style="font-size:13px;color:var(--ink2);line-height:1.65;white-space:pre-wrap;">${safe}</div>
  </div>`;
}

function openInfluenciaDetalle(id) {
  const inf = (mapas.influencias || []).find(x => x.id === id);
  if (!inf) return;
  const body = document.getElementById('inf-detail-body');
  if (!body) return;
  const tipoLabel = INF_TIPO_LABELS[inf.tipo] || inf.tipo || 'Relación';
  const tags = Array.isArray(inf.tags) ? inf.tags.join(', ') : (inf.tags || '');
  const obraDestino = inf.libro_ref || inf.destino_titulo || inf.destino_original || '';
  const ubic = [inf.ubicacion_tipo, inf.ubicacion_detalle].filter(Boolean).join(': ');
  const evidenceBook=inf.evidencia_libro_id?findBookCanonicalById(inf.evidencia_libro_id):findBookCanonicalByTitle(obraDestino,inf.destino_autor||inf.destino);
  const isoRef=formatIsoBookReference(evidenceBook,inf.ubicacion_tipo,inf.ubicacion_detalle);
  body.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-family:var(--font-serif);font-size:24px;font-weight:700;line-height:1.25;color:var(--ink);">${escapeHtml(inf.fuente || '—')} → ${escapeHtml(inf.destino || '—')}</div>
      <div style="font-size:12px;color:var(--ink4);margin-top:5px;">${escapeHtml(tipoLabel)}${obraDestino ? ' · en ' + escapeHtml(obraDestino) : ''}</div>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
      ${isoRef?`<div style="background:var(--cream2);border-radius:6px;padding:10px 12px;margin-bottom:8px;"><div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink4);font-weight:700;margin-bottom:4px;">Referencia ISO 690</div><div style="font-family:var(--font-serif);font-size:13px;line-height:1.6;color:var(--ink);">${escapeHtml(isoRef)}</div></div>`:''}
      ${fieldRow('Tipo', tipoLabel)}
      ${fieldRow('Fuente / autor citado', inf.fuente)}
      ${fieldRow('Nombre en texto', inf.fuente_nombre_en_texto)}
      ${fieldRow('Destino / autor influido', inf.destino)}
      ${fieldRow('Obra destino', obraDestino)}
      ${fieldRow('Obra citada', inf.obra)}
      ${fieldRow('Ubicación', ubic || inf.ubicacion_detalle)}
      ${fieldRow('Texto citado', inf.texto, true)}
      ${fieldRow('Editorial', inf.editorial)}
      ${fieldRow('Año', inf.anio_pub)}
      ${fieldRow('Ciudad', inf.ciudad)}
      ${fieldRow('Edición', inf.edicion)}
      ${fieldRow('Nota', inf.nota, true)}
      ${fieldRow('Tags', tags)}
      ${fieldRow('Libro evidencia', inf.evidencia_libro_id ? (findBookCanonicalById(inf.evidencia_libro_id)?.titulo || inf.libro_ref) : inf.libro_ref)}
      ${fieldRow('ID libro evidencia', inf.evidencia_libro_id)}
      ${fieldRow('ID autor fuente', inf.fuente_autor_id)}
      ${fieldRow('ID importación', inf.id_import)}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="closeModal('modal-inf-detail');openModalInfluencia('${inf.id}')" style="flex:1;min-width:130px;">✏ Editar</button>
      <button class="btn btn-secondary" onclick="closeModal('modal-inf-detail')" style="flex:1;min-width:130px;">Cerrar</button>
      <button class="btn btn-red" onclick="closeModal('modal-inf-detail');deleteInfluencia('${inf.id}')" style="flex:1;min-width:130px;">🗑 Eliminar</button>
    </div>`;
  openModal('modal-inf-detail');
}

