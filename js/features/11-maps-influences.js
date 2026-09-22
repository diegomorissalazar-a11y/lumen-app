// ═══════════════════════════════════
//  MAPAS — implementación completa
// ═══════════════════════════════════
const MAPAS_KEY = 'lumen_mapas_v1';
function mapPayloadCount(m){return ((m&&Array.isArray(m.influencias))?m.influencias.length:0)+((m&&Array.isArray(m.rutas))?m.rutas.length:0);}
function parseMapPayload(raw){try{const x=raw?JSON.parse(raw):null;return x&&typeof x==='object'?x:null;}catch(_){return null;}}
function findBestMapRecoveryCandidate(){
  const candidates=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(key===MAPAS_KEY || /^lumen_mapas_backup_before_/.test(key) || key==='lumen_mapas_v1_backup_before_import'){
      const raw=localStorage.getItem(key), payload=parseMapPayload(raw), count=mapPayloadCount(payload);
      if(payload&&count>0)candidates.push({key,raw,payload,count});
    }
  }
  candidates.sort((a,b)=>b.count-a.count); return candidates[0]||null;
}
function recoverMapasIfEmptyV207(){
  const currentRaw=localStorage.getItem(MAPAS_KEY), current=parseMapPayload(currentRaw)||{influencias:[],rutas:[]};
  if(mapPayloadCount(current)>0)return current;
  const best=findBestMapRecoveryCandidate();
  if(!best)return current;
  try{
    localStorage.setItem('lumen_mapas_empty_snapshot_before_v207_recovery_'+Date.now(),currentRaw||JSON.stringify(current));
    localStorage.setItem(MAPAS_KEY,best.raw);
    localStorage.setItem('lumen_v207_recovered_from',best.key);
    console.warn(`[LUMEN v207] mapas recuperados desde ${best.key}: ${best.count} registros`);
    return best.payload;
  }catch(err){console.error('[LUMEN v207] no se pudo restaurar el respaldo de mapas',err);return current;}
}
function loadMapas() {
  try { const payload=recoverMapasIfEmptyV207(); return normalizeMapasCanonical(payload||{influencias:[],rutas:[]}); }
  catch (err) { console.error('[LUMEN v207] loadMapas:',err); return {influencias:[],rutas:[]}; }
}
function recoverMapasManualV207(){
  const best=findBestMapRecoveryCandidate();
  if(!best){showToast('No encontré un respaldo local de mapas con datos');return;}
  const currentRaw=localStorage.getItem(MAPAS_KEY)||JSON.stringify({influencias:[],rutas:[]});
  try{
    localStorage.setItem('lumen_mapas_before_manual_v207_recovery_'+Date.now(),currentRaw);
    localStorage.setItem(MAPAS_KEY,best.raw);
    mapas=normalizeMapasCanonical(JSON.parse(best.raw));
    showToast(`✓ Recuperados ${best.count} registros de mapas`);
    if(currentMapaTab==='rutas')renderMapaRutas();else renderMapaInfluencias();
  }catch(err){console.error(err);showToast('No se pudo restaurar el respaldo local');}
}
function saveMapas() {
  // v177: persistir el mapa actual sin normalizar toda la red en cada click.
  const ok = safeLocalSetItem(MAPAS_KEY, JSON.stringify(mapas), {prune:true});
  if (!ok) console.warn('[LUMEN v184] mapa aplicado en memoria; persistencia local pendiente');
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
    const ids=historyLineIdsForEntry(e), names=historyLineNamesForEntry(e), linePairs=ids.length?ids.map((id,i)=>({lineaId:id,linea:names[i]||historicalLineNamesFromIds([id])[0]||'Sin línea histórica'})):[{lineaId:'sin_linea',linea:'Sin línea histórica'}];
    linePairs.forEach(({linea,lineaId})=>{
      periods.forEach((p,i)=>{let a=p.inicio,b=p.fin;a=(a===null||a===''||a===undefined)?null:Number(a);b=(b===null||b===''||b===undefined)?null:Number(b);if(Number.isFinite(a)&&!Number.isFinite(b))b=a;if(Number.isFinite(b)&&!Number.isFinite(a))a=b;out.push({entry:e,period:p,index:i,linea,lineaId,periodoId:p.periodoId||'',inicio:Number.isFinite(a)?a:null,fin:Number.isFinite(b)?b:null});});
      if(!periods.length)out.push({entry:e,period:{nombre:'Sin período fechado'},index:0,linea,lineaId,periodoId:'',inicio:null,fin:null});
    });
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

// ── Relational taxonomy v205 ──
const INF_COLORS = {
  referencia:'#e67e22', colaboracion:'#7f8c8d', influencia_declarada:'#c8952a',
  uso_apropiacion:'#2980b9', adaptacion:'#8e44ad', contexto:'#27ae60'
};
const INF_LABELS = {
  referencia:'Referencia', colaboracion:'Colaboración', influencia_declarada:'Influencia declarada',
  uso_apropiacion:'Uso / apropiación', adaptacion:'Adaptación', contexto:'Contexto'
};
const INF_SUBTYPES = {
  referencia:[['mencion','Mención'],['cita_textual','Cita textual'],['epigrafe','Epígrafe'],['dedicatoria','Dedicatoria'],['atribucion_idea','Atribución de idea'],['pendiente_clasificacion','Pendiente de clasificación']],
  colaboracion:[['obra_conjunta','Obra conjunta'],['actividad_conjunta','Actividad conjunta'],['correspondencia_dialogo','Correspondencia / diálogo'],['otra_colaboracion','Otra colaboración documentada'],['pendiente_clasificacion','Pendiente de clasificación']],
  influencia_declarada:[['influencia_reconocida','Influencia reconocida'],['admiracion_afinidad','Admiración / afinidad'],['fuente_inspiracion','Fuente de inspiración'],['oposicion_rechazo','Oposición / rechazo'],['pendiente_clasificacion','Pendiente de clasificación']],
  uso_apropiacion:[['personaje_reutilizado','Personaje reutilizado'],['transformacion','Transformación'],['reescritura','Reescritura'],['parodia','Parodia'],['continuacion','Continuación'],['apropiacion_textual','Apropiación textual'],['pendiente_clasificacion','Pendiente de clasificación']],
  adaptacion:[['cine','Cine'],['television','Televisión'],['teatro','Teatro'],['literatura','Literatura'],['comic','Cómic'],['otro','Otro'],['pendiente_clasificacion','Pendiente de clasificación']],
  contexto:[['hecho_historico','Hecho histórico'],['periodo','Período'],['persona_historica','Persona histórica'],['lugar','Lugar'],['movimiento_cultural','Movimiento cultural'],['tradicion','Tradición'],['mitologia','Mitología'],['pendiente_clasificacion','Pendiente de clasificación']]
};
const INF_OBJECT_LABELS={autor:'Autor / persona',obra:'Obra',personaje:'Personaje',texto_verso:'Texto / verso',acontecimiento_contexto:'Acontecimiento / contexto',otro:'Otro'};
const INF_FUNCTION_LABELS={cuerpo_texto:'Cuerpo del texto',titulo:'Título',epigrafe:'Epígrafe',dedicatoria:'Dedicatoria',nota_pie:'Nota al pie',prologo:'Prólogo',entrevista:'Entrevista',otra:'Otra'};
const INF_EVIDENCE_LABELS={obra:'Obra',entrevista:'Entrevista',prensa:'Prensa',ensayo:'Ensayo',carta_correspondencia:'Carta / correspondencia',programa:'Programa',podcast:'Podcast',documento:'Documento',otra:'Otra'};
function normalizeRelationFamily(raw){
  const v=String(raw||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const a={referencia:'referencia',reference:'referencia',cita:'referencia',cita_directa:'referencia',directa:'referencia',cita_indirecta:'referencia',colaboracion:'colaboracion',influencia_declarada:'influencia_declarada',influencia:'influencia_declarada',uso_personaje:'uso_apropiacion',uso_apropiacion:'uso_apropiacion',apropiacion:'uso_apropiacion',adaptacion:'adaptacion',contexto_historico:'contexto',contexto:'contexto',continuacion:'uso_apropiacion'};
  return a[v]||'referencia';
}
function migrateInfluenceTaxonomy(inf){
  if(!inf||typeof inf!=='object') return inf;
  const legacy=inf.legacy_tipo||inf.tipo||inf.tipo_relacion||'';
  if(!inf.legacy_tipo && ['cita_directa','cita_indirecta','uso_personaje','contexto_historico','continuacion'].includes(String(legacy))) inf.legacy_tipo=legacy;
  const fam=normalizeRelationFamily(inf.tipo_relacion||inf.tipo);
  inf.tipo_relacion=fam; inf.tipo=fam; // tipo se conserva como alias de compatibilidad
  if(!inf.subtipo_relacion){
    if(legacy==='uso_personaje') inf.subtipo_relacion='personaje_reutilizado';
    else if(legacy==='contexto_historico') inf.subtipo_relacion='pendiente_clasificacion';
    else if(legacy==='continuacion') inf.subtipo_relacion='pendiente_clasificacion';
    else if(legacy==='cita_indirecta' || legacy==='cita_directa') inf.subtipo_relacion='pendiente_clasificacion';
    else if(fam==='referencia') inf.subtipo_relacion='mencion';
    else inf.subtipo_relacion='pendiente_clasificacion';
  }
  if(!inf.objeto_tipo){
    if(legacy==='uso_personaje') inf.objeto_tipo='personaje';
    else if(fam==='contexto') inf.objeto_tipo='acontecimiento_contexto';
    else inf.objeto_tipo=inf.obra?'obra':'autor';
  }
  if(!inf.ubicacion_funcional){
    const u=String(inf.ubicacion_tipo||'');
    inf.ubicacion_funcional=['titulo','epigrafe','dedicatoria'].includes(u)?u:'cuerpo_texto';
  }
  if(!inf.fuente_evidencia){
    if(legacy==='cita_indirecta'){
      const ft=String(inf.fuente_ind_tipo||'');
      inf.fuente_evidencia=ft.includes('entrevista')?'entrevista':ft==='prensa'?'prensa':'obra';
    } else inf.fuente_evidencia='obra';
  }
  if(inf.subtipo_relacion==='pendiente_clasificacion') inf.clasificacion_pendiente=true;
  inf._relationModel='lumen_relation_v2';
  return inf;
}
function influenceFamily(inf){return migrateInfluenceTaxonomy(inf)?.tipo_relacion||'referencia';}
const RUTA_COLORS = { mismo_autor:'#8e44ad', libro:'#c8952a', charla:'#2980b9', serie:'#e74c3c', pelicula:'#e67e22', persona:'#27ae60', cancion:'#1a6e3c', podcast:'#8b2020', entrevista:'#5a3e8b', programa:'#2e6b5e' };
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
  set('f-isbn',e.isbn);set('f-anio-original',o.anioPublicacionOriginal);set('f-titulo-original',o.tituloOriginal);
  const originalPeriod=[o.periodoInicio,o.periodoFin].filter((v,i,a)=>v!==null&&v!==undefined&&v!==''&&(i===0||String(v)!==String(a[0]))).join('–');
  set('f-periodo-original',originalPeriod);
  if(o.idiomaOriginal){const sel=document.getElementById('f-idioma');if(sel){const opt=[...sel.options].find(x=>canonicalText(x.value)===canonicalText(o.idiomaOriginal)||canonicalText(x.textContent)===canonicalText(o.idiomaOriginal));if(opt)sel.value=opt.value;}}
  _pendingFormBibliography=bib;
  const sc=document.querySelector('#modal-add .modal');
  setTimeout(()=>{if(sc)sc.scrollTop=_bibJsonContext.parentScroll||0;},20);
}
async function applyBibliographicJson(){
  if(!_bibJsonParsed){showToast('Revisa primero el JSON');return;}
  const n=_bibJsonParsed,e=n.edicionConsultada,o=n.obraOriginal;
  const canon=buildCanonicalBibliography(n);
  const editorMode=_bibJsonContext.mode==='editor'&&document.getElementById('modal-add')?.classList.contains('open');
  const target=getBibliographyTargetBook();
  if(editorMode){
    applyBibliographyToEditor(n,canon);
    if (!_bibJsonContext.targetId || _bibJsonContext.targetId === '__form__') {
      const currentLanguage = getIdiomaValueFromForm ? getIdiomaValueFromForm() : '';
      const defaults = typeof requestJsonBookDefaults === 'function' ? await requestJsonBookDefaults({
        currentLanguage,
        currentAcquisitionDate: document.getElementById('f-fecha-adq')?.value || '',
        currentAcquisitionOrigin: document.getElementById('f-origen-adq')?.value || ''
      }) : null;
      if (defaults?.idioma) {
        populateIdiomaSelect(defaults.idioma);
        const other = document.getElementById('f-idioma-otro'); if (other) other.style.display = 'none';
      }
      if (defaults?.acquisitionDate) { const adq = document.getElementById('f-fecha-adq'); if (adq) adq.value = defaults.acquisitionDate; }
      if (defaults?.acquisitionOrigin) { const origin = document.getElementById('f-origen-adq'); if (origin) origin.value = defaults.acquisitionOrigin; }
    }
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
  if(typeof afterBibliographicApplyV188==='function') afterBibliographicApplyV188();
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
  const tipo=normalizeRelationFamily(document.getElementById('inf-tipo')?.value);
  const subtype=document.getElementById('inf-subtipo');
  if(subtype){
    const previous=subtype.value;
    subtype.innerHTML=(INF_SUBTYPES[tipo]||[]).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    if([...subtype.options].some(o=>o.value===previous)) subtype.value=previous;
  }
  // El panel bibliográfico/evidencia sirve para todas las familias; la fuente ya no define el tipo.
  const direct=document.getElementById('inf-panel-cita-directa'); if(direct) direct.style.display='block';
  const indirect=document.getElementById('inf-panel-cita-indirecta'); if(indirect) indirect.style.display='none';
  const lbl=document.getElementById('inf-fuente-label'); if(lbl) lbl.textContent='Autor / persona relacionada';
  actualizarIsoPreview();
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
  if (!tipo) { preview.style.display = 'none'; return; }

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
  { tipo:'referencia', icon:'🟠', title:'Referencia', desc:'Mención, cita textual, epígrafe, dedicatoria o atribución explícita.' },
  { tipo:'colaboracion', icon:'⚪', title:'Colaboración', desc:'Obra, actividad, correspondencia o diálogo realizado conjuntamente.' },
  { tipo:'influencia_declarada', icon:'🟡', title:'Influencia declarada', desc:'Influencia, admiración, inspiración u oposición respaldada por evidencia explícita.' },
  { tipo:'uso_apropiacion', icon:'🔵', title:'Uso / apropiación', desc:'Reutilización, transformación, reescritura, parodia, continuación o apropiación.' },
  { tipo:'adaptacion', icon:'🟣', title:'Adaptación', desc:'Transformación de una obra hacia otra obra o medio.' },
  { tipo:'contexto', icon:'🟢', title:'Contexto', desc:'Hechos, períodos, personas históricas, lugares, movimientos, tradiciones o mitología.' }
]
let _infJsonPreviewItems = [];

function fillInfluenceQuickLoader(){
  const type=document.getElementById('inf-quick-type'), sub=document.getElementById('inf-quick-subtype');
  if(type && !type.options.length) type.innerHTML=INF_CARD_DEFS.map(x=>`<option value="${x.tipo}">${x.title}</option>`).join('');
  updateInfluenceQuickSubtype();
  const author=document.getElementById('inf-quick-author'), book=document.getElementById('inf-quick-book');
  if(!author||!book)return;
  const books=(db.entries||[]).filter(e=>e&&e.type==='libro').slice().sort((a,b)=>String(a.autor||'').localeCompare(String(b.autor||''),'es')||String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
  const authors=[...new Set(books.map(e=>e.autor).filter(Boolean))];
  author.innerHTML='<option value="">Todos los autores</option>'+authors.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  author.onchange=()=>fillInfluenceQuickBooks(); fillInfluenceQuickBooks();
}
function updateInfluenceQuickSubtype(){
  const type=document.getElementById('inf-quick-type'), sub=document.getElementById('inf-quick-subtype'); if(!type||!sub)return;
  sub.innerHTML=(INF_SUBTYPES[type.value]||[]).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
}
function fillInfluenceQuickBooks(){
  const author=document.getElementById('inf-quick-author'), book=document.getElementById('inf-quick-book'); if(!book)return;
  const av=author?.value||''; const books=(db.entries||[]).filter(e=>e&&e.type==='libro'&&(!av||e.autor===av)).slice().sort((a,b)=>String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
  book.innerHTML='<option value="">— Selecciona el libro fuente —</option>'+books.map(e=>`<option value="${escapeHtml(e.id)}">${escapeHtml(e.titulo)} · ${escapeHtml(e.autor||'')}</option>`).join('');
}
function openInfluenciasCargaPanel(){ fillInfluenceQuickLoader(); openModal('modal-inf-actions'); }
function startInfluenceQuickJson(){
  const type=document.getElementById('inf-quick-type')?.value||'referencia', subtype=document.getElementById('inf-quick-subtype')?.value||'', bookId=document.getElementById('inf-quick-book')?.value||'';
  if(!bookId){showToast('Selecciona el libro desde el que registras la relación');return;}
  const book=findBookCanonicalById(bookId); if(!book){showToast('No se encontró el libro seleccionado');return;}
  ensureBookCanonicalRefs(book);
  closeModal('modal-inf-actions'); openInfJsonImport(type,{subtype,bookId});
}
let _infJsonContext={subtype:'',bookId:''};

function openInfJsonImport(tipo,context={}) {
  _infJsonContext={subtype:context.subtype||'',bookId:context.bookId||''};
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

function normalizeImportedInfluenceType(rawType) { return normalizeRelationFamily(rawType); }
function influenceBibliographyMissing(obj) {
  const missing=[];
  if(!obj?.editorial)missing.push('editorial');
  if(!obj?.anio_pub)missing.push('año de edición');
  if(!obj?.ciudad)missing.push('ciudad');
  if(!obj?.edicion)missing.push('edición');
  return missing;
}
function mapJsonInfluenceToLumen(item, forcedTipo) {
  const tipo = normalizeImportedInfluenceType(item.tipo || forcedTipo);
  const fuente = item.fuente?.nombre || item.fuente || item.autor_citado || item.autor || item.origen || '';
  const contextBook=_infJsonContext.bookId?findBookCanonicalById(_infJsonContext.bookId):null;
  const destinoTitulo = item.destino?.titulo || item.destino || item.libro_destino || contextBook?.titulo || '';
  const destinoAutor = item.destino?.autor || item.autor_destino || contextBook?.autor || '';
  const evidenceBook=contextBook || findBookCanonicalByTitle(destinoTitulo,destinoAutor);
  if(evidenceBook)ensureBookCanonicalRefs(evidenceBook);
  const destinoMeta = getInfluenceDestinoAutorMeta(destinoTitulo, destinoAutor);
  const destino = destinoMeta.destinoNodo;
  const ev=item.evidencia||{};
  let ubicTipo=item.iso?.ubicacion_tipo||item.ubicacion_tipo||'';
  let ubicDetalle=item.iso?.ubicacion_detalle||item.ubicacion_detalle||item.ubicacion||item.pagina||'';
  if(!ubicDetalle && ev.pagina!=null){ubicTipo='pagina';ubicDetalle=String(ev.pagina);}
  else if(!ubicDetalle && ev.loc!=null){ubicTipo='loc';ubicDetalle=String(ev.loc);}
  else if(!ubicDetalle && ev.capitulo!=null){ubicTipo='capitulo';ubicDetalle=String(ev.capitulo);}
  if(!ubicTipo)ubicTipo='pagina';
  const obra = (typeof item.obra_citada==='string'?item.obra_citada:item.obra_citada?.titulo) || item.obra || item.fuente?.nombre_en_texto || fuente;
  const bib=canonicalBookBibliography(evidenceBook);
  // Los metadatos explícitos del JSON tienen prioridad en la relación importada.
  // Se aceptan las claves históricas y las canónicas sin exigir cambiar el JSON.
  const importedEditorial=item.editorial||item.iso?.editorial||'';
  const importedYear=item.anio_edicion??item.anio_pub??item.iso?.anio_edicion??item.iso?.anio??'';
  const importedEdition=item.edicion??item.iso?.edicion??'';
  const importedIsbn=item.isbn||item.iso?.isbn||'';
  const importedCity=item.ciudad_publicacion||item.ciudad||item.iso?.ciudad_publicacion||item.iso?.ciudad||'';
  const obj = {
    id: 'inf_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), id_import:item.id_import||'', tipo, tipo_relacion:tipo, fuente, destino, obra,
    subtipo_relacion:item.subtipo_relacion||item.forma||item.subtipo||_infJsonContext.subtype||'', objeto_tipo:item.objeto_tipo||item.objeto||'',
    ubicacion_funcional:item.ubicacion_funcional||'', fuente_evidencia:item.fuente_evidencia||item.evidencia?.fuente||'',
    editorial:importedEditorial||bib.editorial||'', anio_pub:importedYear||bib.anio||'', anio_edicion:importedYear||bib.anio||'', ciudad:importedCity||bib.ciudad||'', edicion:importedEdition||bib.edicion||'', isbn:importedIsbn||bib.isbn||'',
    fuente_autor_id:'', destino_libro_id:evidenceBook?.id||'', evidencia_libro_id:evidenceBook?.id||'', destino_autor_id:evidenceBook?.autorId||'', editorial_id:evidenceBook?.editorialId||'',
    ubicacion_tipo:ubicTipo, ubicacion_detalle:ubicDetalle, texto:ev.texto||item.texto_citado||item.texto||'', fuente_nombre_en_texto:item.fuente?.nombre_en_texto||'', obra_tipo:item.obra_citada?.tipo||'', peso:item.peso||1, nota:item.nota||'', tags:asArr(item.tags),
    destino_tipo:'autor', destino_autor:destinoMeta.destinoAutor||destino, destino_titulo:destinoMeta.libroRef||destinoTitulo, destino_original:destinoTitulo, libro_ref:destinoMeta.libroRef||destinoTitulo,
    pagina:ubicTipo==='pagina'?(parseInt(ubicDetalle)||null):null, import_schema:'lumen_influencias_import_v1', importedAt:Date.now(), createdAt:Date.now()
  };
  migrateInfluenceTaxonomy(obj);
  obj.import_key=normalizeInfDedupeKey(obj);
  return {obj,destinoExiste:!!destinoMeta.destinoExiste,destinoOriginal:destinoTitulo,destinoAutor:destinoMeta.destinoAutor||destinoAutor,evidenceBook,missingBib:influenceBibliographyMissing(obj)};
}
function prepareInfJsonPreview(raw) {
  const forcedTipo = document.getElementById('inf-json-tipo').value || '';
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw.influencias)) arr = raw.influencias;
  else if (raw.tipo || raw.fuente || raw.destino || raw.autor_citado || raw.autor || raw.texto || raw.texto_citado) arr = [raw];
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


function repairInfluenceCanonicalIdsV206(){
  const key='lumen_v206_relations_repaired'; if(localStorage.getItem(key)==='1')return;
  const raw=localStorage.getItem(MAPAS_KEY); if(raw) safeLocalSetItem('lumen_mapas_backup_before_v206_repair_'+Date.now(),raw,{prune:false});
  let changed=0;
  (mapas.influencias||[]).forEach(inf=>{const a=inf.fuente_autor_id,b=inf.destino_autor_id,t=inf.tipo;ensureInfluenceCanonicalRefs(inf);migrateInfluenceTaxonomy(inf);if(a!==inf.fuente_autor_id||b!==inf.destino_autor_id||t!==inf.tipo)changed++;});
  if(changed)saveMapas(); localStorage.setItem(key,'1'); console.info(`[LUMEN v206] reparación canónica: ${changed} relación(es) reconciliadas`);
}

function getInfluenceFilters(){return {family:document.getElementById('inf-filter-family')?.value||'',subtype:document.getElementById('inf-filter-subtype')?.value||'',object:document.getElementById('inf-filter-object')?.value||'',location:document.getElementById('inf-filter-location')?.value||'',evidence:document.getElementById('inf-filter-evidence')?.value||''};}
function filteredInfluences(){const f=getInfluenceFilters();return (mapas.influencias||[]).map(migrateInfluenceTaxonomy).filter(r=>(!f.family||r.tipo_relacion===f.family)&&(!f.subtype||r.subtipo_relacion===f.subtype)&&(!f.object||r.objeto_tipo===f.object)&&(!f.location||r.ubicacion_funcional===f.location)&&(!f.evidence||r.fuente_evidencia===f.evidence));}
function refreshInfluenceFilterOptions(){
 const data=(mapas.influencias||[]).map(migrateInfluenceTaxonomy), defs=[['inf-filter-subtype','subtipo_relacion'],['inf-filter-object','objeto_tipo'],['inf-filter-location','ubicacion_funcional'],['inf-filter-evidence','fuente_evidencia']];
 defs.forEach(([id,key])=>{const el=document.getElementById(id);if(!el)return;const cur=el.value;const vals=[...new Set(data.map(x=>x[key]).filter(Boolean))].sort();const label=id.includes('subtype')?'Todos los subtipos':id.includes('object')?'Todos los objetos':id.includes('location')?'Todas las ubicaciones':'Todas las fuentes';el.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v.replaceAll('_',' '))}</option>`).join('');if(vals.includes(cur))el.value=cur;});
}
function csvCell(v){const s=String(v??'').replaceAll('"','""');return `"${s}"`;}
function exportInfluenciasGephi(){
 const rows=(mapas.influencias||[]).map(migrateInfluenceTaxonomy); if(!rows.length){showToast('No hay relaciones para exportar');return;}
 const headers=['id','source','target','tipo_relacion','subtipo_relacion','objeto_tipo','ubicacion_funcional','fuente_evidencia','autor_origen','autor_destino','obra_origen','obra_destino','pagina','anio','texto_evidencia','color','clasificacion_pendiente'];
 const lines=[headers.join(',')]; rows.forEach(r=>{const fam=r.tipo_relacion||influenceFamily(r);const vals=[r.id,r.fuente_autor_id||r.fuente,r.destino_autor_id||r.destino_autor||r.destino,fam,r.subtipo_relacion,r.objeto_tipo,r.ubicacion_funcional,r.fuente_evidencia,r.fuente,r.destino_autor||r.destino,r.obra||'',r.libro_ref||r.destino_titulo||'',r.pagina||r.ubicacion_detalle||'',r.anio_edicion||r.anio_pub||r.ind_anio||r.ind_tv_anio||'',r.texto||'',INF_COLORS[fam]||'#999',r.clasificacion_pendiente?'1':'0'];lines.push(vals.map(csvCell).join(','));});
 const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lumen_relaciones_gephi_v206.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('✓ CSV para Gephi exportado');
}



// ═══════════════════════════════════════════════════════════
// v208 — REPARACIÓN MANUAL DE IDENTIDAD DE AUTORES
// Fusiona IDs sin borrar relaciones ni evidencia.
// ═══════════════════════════════════════════════════════════
function authorIdentityRowsV208(){
  const rows=[]; const seen=new Set();
  allKnownEntityNames('aut').forEach(x=>{
    if(!x?.id||!x?.name)return; const k=x.id+'|'+canonicalText(x.name); if(seen.has(k))return; seen.add(k);
    rows.push({id:x.id,name:canonicalNameById('aut',x.id,x.name)||x.name,norm:canonicalText(x.name)});
  });
  return rows.sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
}
function openAuthorIdentityRepairV208(){
  const rows=authorIdentityRowsV208();
  const byNorm=new Map(); rows.forEach(r=>{if(!byNorm.has(r.norm))byNorm.set(r.norm,[]);byNorm.get(r.norm).push(r);});
  const dup=[...byNorm.values()].filter(g=>new Set(g.map(x=>x.id)).size>1);
  const selA=document.getElementById('author-merge-from-v208'), selB=document.getElementById('author-merge-to-v208');
  const opts=rows.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)} · ${escapeHtml(r.id)}</option>`).join('');
  if(selA) selA.innerHTML='<option value="">— ID duplicado que se reemplazará —</option>'+opts;
  if(selB) selB.innerHTML='<option value="">— ID canónico que se conservará —</option>'+opts;
  const box=document.getElementById('author-duplicate-candidates-v208');
  if(box) box.innerHTML=dup.length?dup.map(g=>`<div style="padding:9px 0;border-bottom:1px solid var(--cream2);"><strong>${escapeHtml(g[0].name)}</strong><div style="font-size:10px;color:var(--ink4);margin-top:3px;">${g.map(x=>escapeHtml(x.id)).join('<br>')}</div><button class="btn btn-secondary btn-sm" style="width:auto;margin-top:6px;" onclick="prefillAuthorMergeV208('${String(g[0].id).replace(/'/g,"\\'")}','${String(g[1].id).replace(/'/g,"\\'")}')">Reparar este duplicado</button></div>`).join(''):'<div style="font-size:12px;color:var(--ink4);">No se detectan nombres idénticos con IDs distintos. Puedes seleccionar manualmente dos identidades.</div>';
  openModal('modal-author-identity-v208');
}
function prefillAuthorMergeV208(a,b){const x=document.getElementById('author-merge-from-v208'),y=document.getElementById('author-merge-to-v208');if(x)x.value=b;if(y)y.value=a;}
function mergeCanonicalAuthorsV208(){
  const from=document.getElementById('author-merge-from-v208')?.value||'', to=document.getElementById('author-merge-to-v208')?.value||'';
  if(!from||!to){showToast('Selecciona los dos IDs de autor');return;} if(from===to){showToast('Los IDs deben ser distintos');return;}
  const rows=authorIdentityRowsV208(), a=rows.find(x=>x.id===from), b=rows.find(x=>x.id===to); if(!a||!b){showToast('No se encontraron las identidades');return;}
  if(!confirm(`Fusionar “${a.name}” (${from}) con “${b.name}” (${to})?\n\nSe conservará ${to}. No se eliminarán relaciones.`))return;
  const backup={at:new Date().toISOString(),from,to,mapas:JSON.parse(JSON.stringify(mapas||{})),entities:loadCanonicalEntities()};
  try{safeLocalSetItem('lumen_author_merge_backup_v208_'+Date.now(),JSON.stringify(backup),{prune:true});}catch(e){}
  const c=loadCanonicalEntities(), bucket=c.authors||{}; let target=bucket[to]||{id:to,nombreCanonico:b.name,aliases:[]}; const source=bucket[from];
  target.aliases=target.aliases||[]; [a.name,source?.nombreCanonico,...(source?.aliases||[])].filter(Boolean).forEach(n=>{if(canonicalText(n)!==canonicalText(target.nombreCanonico)&&!target.aliases.some(z=>canonicalText(z)===canonicalText(n)))target.aliases.push(n);});
  bucket[to]=target; if(bucket[from])delete bucket[from]; c.authors=bucket; saveCanonicalEntities(c);
  let changed=0;
  (db?.entries||[]).forEach(e=>{if(e?.type==='libro'&&e.autorId===from){e.autorId=to;e._updatedAt=Date.now();changed++;}});
  (mapas?.influencias||[]).forEach(r=>{if(r.fuente_autor_id===from){r.fuente_autor_id=to;r.fuente=target.nombreCanonico||r.fuente;changed++;}if(r.destino_autor_id===from){r.destino_autor_id=to;r.destino_autor=target.nombreCanonico||r.destino_autor;changed++;}});
  saveDB(); saveMapas(); closeModal('modal-author-identity-v208'); renderMapaInfluencias(); if(typeof renderMapaRutas==='function')renderMapaRutas();
  showToast(`✓ Autor fusionado · ${changed} referencia(s) reparada(s)`);
}
function compactInfluenceEditorV208(){
  ['inf-editorial','inf-anio-pub','inf-ciudad','inf-edicion'].forEach(id=>{const el=document.getElementById(id);if(el?.closest('.field'))el.closest('.field').style.display='none';});
}


// ═══════════════════════════════════════════════════════════
// v209 — IDENTIDAD CANÓNICA EDITABLE + NORMALIZACIÓN SEGURA
// ═══════════════════════════════════════════════════════════
function mergeCanonicalAuthorsDirectV209(from,to){
  if(!from||!to||from===to){showToast('Selecciona identidades distintas');return;}
  const rows=authorIdentityRowsV208(), a=rows.find(x=>x.id===from), b=rows.find(x=>x.id===to);
  if(!a||!b){showToast('No se encontraron las identidades');return;}
  if(!confirm(`Fusionar “${a.name}” con “${b.name}”?\n\nSe conservará “${b.name}”. Las relaciones, citas y evidencias no se eliminan.`))return;
  const c=loadCanonicalEntities(), bucket=c.authors||{};
  let target=bucket[to]||{id:to,nombreCanonico:b.name,aliases:[]}, source=bucket[from]; target.aliases=target.aliases||[];
  [a.name,source?.nombreCanonico,...(source?.aliases||[])].filter(Boolean).forEach(n=>{if(canonicalText(n)!==canonicalText(target.nombreCanonico)&&!target.aliases.some(z=>canonicalText(z)===canonicalText(n)))target.aliases.push(n);});
  bucket[to]=target;if(bucket[from])delete bucket[from];c.authors=bucket;saveCanonicalEntities(c);
  let changed=0;
  (db.entries||[]).forEach(e=>{if(e.type==='libro'&&(e.autorId===from||(e.autorIds||[]).includes(from))){if(e.autorId===from)e.autorId=to;if(Array.isArray(e.autorIds))e.autorIds=e.autorIds.map(id=>id===from?to:id);e.autor=splitCanonicalAuthors(e.autor).map(n=>canonicalText(n)===canonicalText(a.name)?target.nombreCanonico:n).join('; ');e._updatedAt=Date.now();changed++;}});
  (mapas.influencias||[]).forEach(r=>{if(r.fuente_autor_id===from){r.fuente_autor_id=to;r.fuente=target.nombreCanonico;changed++;}if(r.destino_autor_id===from){r.destino_autor_id=to;r.destino_autor=target.nombreCanonico;r.destino=target.nombreCanonico;changed++;}});
  (mapas.rutas||[]).forEach(r=>{if(r.fuente_autor_id===from){r.fuente_autor_id=to;r.fuente=target.nombreCanonico;changed++;}if(r.destino_autor_id===from){r.destino_autor_id=to;r.destino=target.nombreCanonico;changed++;}});
  saveDB();saveMapas();renderMapaInfluencias();if(typeof renderMapaRutas==='function')renderMapaRutas();if(typeof runNormalizacion==='function')runNormalizacion();showToast(`✓ Autor canónico unificado · ${changed} vínculo(s) actualizados`);
}
function editCanonicalAuthorNameV209(id){
  const rows=authorIdentityRowsV208(), row=rows.find(x=>x.id===id); if(!row)return;
  const next=prompt('Nombre canónico del autor:',row.name); if(next===null)return; const name=String(next).trim(); if(!name||canonicalText(name)===canonicalText(row.name))return;
  const c=loadCanonicalEntities(), bucket=c.authors||{}, ent=bucket[id]||{id,nombreCanonico:row.name,aliases:[]}; ent.aliases=ent.aliases||[];
  if(row.name&&!ent.aliases.some(a=>canonicalText(a)===canonicalText(row.name)))ent.aliases.push(row.name); ent.nombreCanonico=name;bucket[id]=ent;c.authors=bucket;saveCanonicalEntities(c);
  (db.entries||[]).forEach(e=>{if(e.type==='libro'&&(e.autorId===id||(e.autorIds||[]).includes(id))){e.autor=splitCanonicalAuthors(e.autor).map(n=>canonicalText(n)===canonicalText(row.name)?name:n).join('; ');e._updatedAt=Date.now();}});
  (mapas.influencias||[]).forEach(r=>{if(r.fuente_autor_id===id)r.fuente=name;if(r.destino_autor_id===id){r.destino_autor=name;r.destino=name;}});
  (mapas.rutas||[]).forEach(r=>{if(r.fuente_autor_id===id)r.fuente=name;if(r.destino_autor_id===id)r.destino=name;});
  saveDB();saveMapas();renderMapaInfluencias();if(typeof renderMapaRutas==='function')renderMapaRutas();if(typeof runNormalizacion==='function')runNormalizacion();showToast('✓ Nombre canónico actualizado');
}
function rellenarInfDestinoAutorSelV209(){
  const sel=document.getElementById('inf-destino-autor-sel');if(!sel)return;sel.innerHTML='<option value="">— Se obtiene del libro destino —</option>';
  getAutoresBiblioteca().forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name;o.dataset.authorName=a.name;sel.appendChild(o);});
}
function nodeEvidenceTooltipV209(authorId,authorName,data){
  const rows=(data||[]).filter(r=>r.fuente_autor_id===authorId||r.destino_autor_id===authorId).slice(0,8);
  const parts=[authorName];
  rows.forEach(r=>{const quote=String(r.texto||'').trim();const title=r.libro_ref||r.destino_titulo||'';const book=r.evidencia_libro_id?findBookCanonicalById(r.evidencia_libro_id):findBookCanonicalByTitle(title,r.destino_autor||r.destino);const iso=formatIsoBookReference(book,r.ubicacion_tipo,r.ubicacion_detalle);if(quote)parts.push(`“${quote}”`);if(iso)parts.push(iso);});
  return parts.join('\n\n');
}

// ── CRUD ─────────────────────────────────────────────────
function openModalInfluencia(editId, presetTipo) {
  rellenarInfFuenteSel();
  rellenarInfDestinoSel();
  rellenarInfDestinoAutorSelV209();
  document.getElementById('inf-edit-id').value = editId||'';

  if (editId) {
    const inf = mapas.influencias.find(x => x.id === editId);
    if (inf) {
      migrateInfluenceTaxonomy(inf);
      document.getElementById('inf-tipo').value = inf.tipo_relacion||'referencia';
      onInfTipoChange();
      if(document.getElementById('inf-subtipo')) document.getElementById('inf-subtipo').value=inf.subtipo_relacion||'pendiente_clasificacion';
      if(document.getElementById('inf-objeto-tipo')) document.getElementById('inf-objeto-tipo').value=inf.objeto_tipo||'autor';
      if(document.getElementById('inf-ubicacion-funcional')) document.getElementById('inf-ubicacion-funcional').value=inf.ubicacion_funcional||'cuerpo_texto';
      if(document.getElementById('inf-fuente-evidencia')) document.getElementById('inf-fuente-evidencia').value=inf.fuente_evidencia||'obra';
      // Fuente
      const fuenteSel = document.getElementById('inf-fuente-sel');
      const fuenteOpt=[...fuenteSel.options].find(o => (inf.fuente_autor_id && o.dataset.authorId===inf.fuente_autor_id) || (!inf.fuente_autor_id && o.value===inf.fuente));
      if (fuenteOpt) {
        fuenteSel.value = fuenteOpt.value;
        rellenarInfObraSel(fuenteOpt.value);
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
      if (inf.legacy_tipo === 'cita_indirecta') {
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
      const destAuthorSel=document.getElementById('inf-destino-autor-sel');
      if(destAuthorSel && inf.destino_autor_id && [...destAuthorSel.options].some(o=>o.value===inf.destino_autor_id)) destAuthorSel.value=inf.destino_autor_id;
      syncInfCanonicalBibliography();
      actualizarIsoPreview();
    }
  } else {
    // Reset
    document.getElementById('inf-tipo').value = normalizeRelationFamily(presetTipo || 'referencia');
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
  compactInfluenceEditorV208();
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

  const previous = editId ? (mapas.influencias.find(x=>x.id===editId)||{}) : {};
  const destAuthorSel=document.getElementById('inf-destino-autor-sel');
  const destAuthorOverrideId=destAuthorSel?.value||'';
  const destAuthorOverrideName=destAuthorOverrideId ? canonicalNameById('aut',destAuthorOverrideId,destAuthorSel?.selectedOptions?.[0]?.dataset?.authorName||'') : '';
  const obj = {
    ...previous,
    id:               editId || 'inf_' + Date.now(),
    tipo, tipo_relacion:tipo, fuente: fuenteCanon, destino: destAuthorOverrideName || destino, obra,
    subtipo_relacion: document.getElementById('inf-subtipo')?.value||'pendiente_clasificacion',
    objeto_tipo: document.getElementById('inf-objeto-tipo')?.value||'autor',
    ubicacion_funcional: document.getElementById('inf-ubicacion-funcional')?.value||'cuerpo_texto',
    fuente_evidencia: document.getElementById('inf-fuente-evidencia')?.value||'obra',
    editorial:        document.getElementById('inf-editorial')?.value.trim() || evidenceBib.editorial || '',
    editorial_id:     evidenceBook?.editorialId || canonicalEntityId('edi', evidenceBib.editorial),
    anio_pub:         document.getElementById('inf-anio-pub')?.value.trim() || evidenceBib.anio || '',
    ciudad:           document.getElementById('inf-ciudad')?.value.trim() || evidenceBib.ciudad || '',
    edicion:          document.getElementById('inf-edicion')?.value.trim() || evidenceBib.edicion || '',
    fuente_autor_id:  fuenteAutorId,
    fuente_libro_id:  sourceBook?.id || '',
    destino_libro_id: evidenceBook?.id || '',
    destino_autor_id: destAuthorOverrideId || evidenceBook?.autorId || canonicalEntityId('aut', destinoMeta.destinoAutor || destino),
    evidencia_libro_id:evidenceBook?.id || '',
    ubicacion_tipo:   document.getElementById('inf-ubicacion-tipo')?.value||'pagina',
    ubicacion_detalle:document.getElementById('inf-ubicacion-detalle')?.value.trim()||'',
    texto:            document.getElementById('inf-texto')?.value.trim()||document.getElementById('inf-texto-ind')?.value.trim()||'',
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
    destino_autor:    destAuthorOverrideName || destinoMeta.destinoAutor || destino,
    destino_titulo:   destinoMeta.libroRef || destinoLibro,
    libro_ref:        destinoMeta.libroRef || destinoLibro,
    pagina:           parseInt(document.getElementById('inf-ubicacion-detalle')?.value)||null,
    createdAt:        editId ? (mapas.influencias.find(x=>x.id===editId)?.createdAt||Date.now()) : Date.now()
  };

  migrateInfluenceTaxonomy(obj);
  ensureInfluenceCanonicalRefs(obj);
  if (editId) { const i=mapas.influencias.findIndex(x=>x.id===editId); if(i>=0) mapas.influencias[i]=obj; }
  else mapas.influencias.push(obj);
  saveMapas();
  if(typeof invalidateRecommendations==='function') invalidateRecommendations('influencia modificada');
  closeModal('modal-influencia');
  showToast('✓ Relación guardada');
  renderMapaInfluencias();

  });
}

function deleteInfluencia(id) {
  if (!confirm('¿Eliminar esta relación?')) return;
  mapas.influencias = mapas.influencias.filter(x => x.id !== id);
  if(typeof invalidateRecommendations==='function') invalidateRecommendations('influencia eliminada');
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
  migrateInfluenceTaxonomy(inf);
  const tipoLabel = INF_LABELS[inf.tipo_relacion] || inf.tipo_relacion || 'Relación';
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
      ${fieldRow('Familia', tipoLabel)}
      ${fieldRow('Forma / subtipo', (inf.subtipo_relacion||'').replaceAll('_',' '))}
      ${fieldRow('Objeto relacionado', INF_OBJECT_LABELS[inf.objeto_tipo]||inf.objeto_tipo)}
      ${fieldRow('Ubicación funcional', INF_FUNCTION_LABELS[inf.ubicacion_funcional]||inf.ubicacion_funcional)}
      ${fieldRow('Fuente de evidencia', INF_EVIDENCE_LABELS[inf.fuente_evidencia]||inf.fuente_evidencia)}
      ${inf.clasificacion_pendiente?fieldRow('Migración','Pendiente de clasificación'):''}
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

