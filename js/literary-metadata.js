// LUMEN v191 — metadatos literarios canónicos para Descubrir
'use strict';

const LITERARY_TAXONOMY_KEY = 'lumen_literary_taxonomy_v1';

function emptyLiteraryTaxonomy(){
  return {
    schema:'lumen_literary_taxonomy_v1',
    poetryTraditions:[
      {id:'poetry_scope_chile',name:'Chile'},
      {id:'poetry_scope_hispanoamerica',name:'Hispanoamérica'},
      {id:'poetry_scope_espana',name:'España'},
      {id:'poetry_scope_francia',name:'Francia'},
      {id:'poetry_scope_anglofono',name:'Ámbito anglófono'}
    ],
    poetryMovements:[
      {id:'poetry_period_siglo_de_oro',name:'Siglo de Oro'},
      {id:'poetry_period_romanticismo',name:'Romanticismo'},
      {id:'poetry_period_vanguardias',name:'Vanguardias'},
      {id:'poetry_period_generacion_27',name:'Generación del 27'}
    ],
    historyScopes:[
      {id:'history_scope_eurasia',name:'Eurasia'},
      {id:'history_scope_europa',name:'Europa'},
      {id:'history_scope_chile',name:'Chile'},
      {id:'history_scope_america',name:'América'}
    ]
  };
}

function loadLiteraryTaxonomy(){
  try{
    const raw=JSON.parse(localStorage.getItem(LITERARY_TAXONOMY_KEY)||'null');
    const base=emptyLiteraryTaxonomy();
    if(!raw||typeof raw!=='object') return base;
    ['poetryTraditions','poetryMovements','historyScopes'].forEach(k=>{
      if(Array.isArray(raw[k])) base[k]=raw[k].filter(x=>x&&x.id&&x.name);
    });
    return base;
  }catch(_){return emptyLiteraryTaxonomy();}
}

function saveLiteraryTaxonomy(tax){
  try{safeLocalSetItem(LITERARY_TAXONOMY_KEY,JSON.stringify(tax||emptyLiteraryTaxonomy()));}catch(_){localStorage.setItem(LITERARY_TAXONOMY_KEY,JSON.stringify(tax||emptyLiteraryTaxonomy()));}
}

function mergeLiteraryTaxonomy(localTax,remoteTax){
  const out=emptyLiteraryTaxonomy();
  const mergeRows=(a,b)=>{const map=new Map();[...(a||[]),...(b||[])].forEach(x=>{if(!x||!x.name)return;const id=x.id||canonicalEntityId('tax',x.name),key=id||canonicalText(x.name);if(!map.has(key))map.set(key,{id,name:x.name});});return [...map.values()];};
  ['poetryTraditions','poetryMovements','historyScopes'].forEach(k=>{out[k]=mergeRows(localTax?.[k],remoteTax?.[k]);});
  return out;
}

function taxonomyId(prefix,name){return canonicalEntityId(prefix,name);}

function resolveLiteraryTaxonomy(kind,name){
  const clean=String(name||'').trim();
  if(!clean)return {id:'',name:''};
  const key={poetry:'poetryTraditions',movement:'poetryMovements',history:'historyScopes'}[kind];
  const prefix={poetry:'poetry_scope',movement:'poetry_period',history:'history_scope'}[kind];
  const tax=loadLiteraryTaxonomy(), arr=tax[key]||[];
  const norm=canonicalText(clean);
  let found=arr.find(x=>canonicalText(x.name)===norm);
  if(found)return found;
  found={id:taxonomyId(prefix,clean),name:clean};
  arr.push(found); tax[key]=arr; saveLiteraryTaxonomy(tax); fillLiteraryTaxonomyLists();
  return found;
}

function taxonomyName(kind,id,fallback=''){
  const key={poetry:'poetryTraditions',movement:'poetryMovements',history:'historyScopes'}[kind];
  const found=(loadLiteraryTaxonomy()[key]||[]).find(x=>x.id===id);
  return found?.name||fallback||'';
}

function fillLiteraryTaxonomyLists(){
  const tax=loadLiteraryTaxonomy();
  const fill=(id,rows)=>{const dl=document.getElementById(id);if(dl)dl.innerHTML=(rows||[]).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})).map(x=>`<option value="${escapeHtml(x.name)}"></option>`).join('');};
  fill('poesia-tradicion-list',tax.poetryTraditions);
  fill('poesia-corriente-list',tax.poetryMovements);
  fill('hist-ambito-list',tax.historyScopes);
}

function literaryGenreActive(name){return !!document.querySelector(`#generos-chips .genero-chip[data-g="${name}"].active`);}

function updateLiteraryMetadataVisibility(){
  const p=document.getElementById('poesia-fields'), c=document.getElementById('cuento-fields');
  const poetry=literaryGenreActive('Poesía'), story=literaryGenreActive('Cuento');
  if(p)p.style.display=poetry?'block':'none';
  if(c)c.style.display=story?'block':'none';
  updateCollectionFieldsVisibility();
  const storyFallback=story && !!document.getElementById('cuento-es-recopilacion')?.checked && !!document.getElementById('cuento-fechas-desconocidas')?.checked && (document.getElementById('cuento-tipo-recopilacion')?.value||'autor')!=='antologia';
  const authorPanel=document.getElementById('autor-temporal-fields'); if(authorPanel)authorPanel.style.display=(poetry||storyFallback)?'block':'none';
  fillLiteraryTaxonomyLists();
}

function updateCollectionFieldsVisibility(){
  const checked=!!document.getElementById('cuento-es-recopilacion')?.checked;
  const body=document.getElementById('cuento-recopilacion-body'); if(body)body.style.display=checked?'block':'none';
  const unknown=!!document.getElementById('cuento-fechas-desconocidas')?.checked;
  const actual=document.getElementById('cuento-fechas-reales'); if(actual)actual.style.display=unknown?'none':'grid';
  const fallback=document.getElementById('cuento-fallback-autor'); if(fallback)fallback.style.display=(checked&&unknown)?'block':'none';
  const type=document.getElementById('cuento-tipo-recopilacion')?.value||'autor';
  const note=document.getElementById('cuento-fallback-note');
  if(note)note.textContent=type==='antologia'&&unknown?'En antologías de varios autores no se usa el ciclo vital de un solo autor como aproximación temporal.':'Si faltan las fechas de las obras, Descubrir puede usar el ciclo vital del autor como aproximación.';
  if(type==='antologia'&&unknown){const u=document.getElementById('cuento-usar-periodo-autor');if(u)u.checked=false;}
  const poetry=literaryGenreActive('Poesía');
  const authorPanel=document.getElementById('autor-temporal-fields'); if(authorPanel)authorPanel.style.display=(poetry||(checked&&unknown&&type!=='antologia'))?'block':'none';
}

function getPrimaryCanonicalAuthorByName(name,create=false){
  const first=splitCanonicalAuthors(name||'')[0]||''; if(!first)return null;
  return findCanonicalEntity('aut',first)||(create?registerCanonicalEntity('aut',first):null);
}

function authorTemporalDataByName(name){
  const e=getPrimaryCanonicalAuthorByName(name,false);
  return e?{nacimiento:Number.isFinite(Number(e.nacimiento))?Number(e.nacimiento):null,muerte:Number.isFinite(Number(e.muerte))?Number(e.muerte):null,aunVivo:!!e.aunVivo}:{nacimiento:null,muerte:null,aunVivo:false};
}

function saveAuthorTemporalDataFromForm(authorName){
  const poetry=literaryGenreActive('Poesía');
  const storyFallback=literaryGenreActive('Cuento') && !!document.getElementById('cuento-es-recopilacion')?.checked && !!document.getElementById('cuento-fechas-desconocidas')?.checked;
  if(!poetry && !storyFallback)return;
  const nacimientoRaw=document.getElementById('autor-anio-nacimiento')?.value||'';
  const muerteRaw=document.getElementById('autor-anio-muerte')?.value||'';
  const aunVivo=!!document.getElementById('autor-aun-vivo')?.checked;
  if(!nacimientoRaw && !muerteRaw && !aunVivo)return;
  const ent=getPrimaryCanonicalAuthorByName(authorName,true); if(!ent)return;
  const nacimiento=Number(nacimientoRaw||NaN), muerte=Number(muerteRaw||NaN);
  const c=loadCanonicalEntities(), bucket=c.authors, target=bucket[ent.id]||ent;
  if(Number.isFinite(nacimiento))target.nacimiento=nacimiento;
  target.aunVivo=aunVivo;
  if(aunVivo) delete target.muerte; else if(Number.isFinite(muerte))target.muerte=muerte;
  bucket[ent.id]=target; saveCanonicalEntities(c);
}

function getPoetryMetadataFromForm(){
  const trad=resolveLiteraryTaxonomy('poetry',document.getElementById('poesia-tradicion')?.value||'');
  const mov=resolveLiteraryTaxonomy('movement',document.getElementById('poesia-corriente')?.value||'');
  return {schema:'lumen_poesia_v1',tradicionId:trad.id||'',tradicion:trad.name||'',corrienteId:mov.id||'',corriente:mov.name||''};
}

function getStoryCollectionMetadataFromForm(){
  const es=!!document.getElementById('cuento-es-recopilacion')?.checked;
  if(!es)return {esRecopilacion:false};
  const tipo=document.getElementById('cuento-tipo-recopilacion')?.value||'autor';
  const unknown=!!document.getElementById('cuento-fechas-desconocidas')?.checked;
  const inicio=Number(document.getElementById('cuento-periodo-inicio')?.value||NaN);
  const fin=Number(document.getElementById('cuento-periodo-fin')?.value||NaN);
  const useAuthor=unknown&&tipo!=='antologia'&&!!document.getElementById('cuento-usar-periodo-autor')?.checked;
  return {schema:'lumen_cuentos_v1',esRecopilacion:true,tipoRecopilacion:tipo,periodoObrasDesconocido:unknown,periodoObrasInicio:!unknown&&Number.isFinite(inicio)?inicio:null,periodoObrasFin:!unknown&&Number.isFinite(fin)?fin:null,usarPeriodoAutor:useAuthor};
}

function resetLiteraryMetadataFields(){
  ['poesia-tradicion','poesia-corriente','hist-ambito','cuento-periodo-inicio','cuento-periodo-fin','autor-anio-nacimiento','autor-anio-muerte'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['cuento-es-recopilacion','cuento-fechas-desconocidas','cuento-usar-periodo-autor','autor-aun-vivo'].forEach(id=>{const e=document.getElementById(id);if(e)e.checked=false;});
  const typ=document.getElementById('cuento-tipo-recopilacion');if(typ)typ.value='autor';
  updateLiteraryMetadataVisibility();
}

function setLiteraryMetadataFields(book){
  const p=book?.poesia||{}, c=book?.cuentos||{};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??'';};
  set('poesia-tradicion',p.tradicion||taxonomyName('poetry',p.tradicionId,''));
  set('poesia-corriente',p.corriente||taxonomyName('movement',p.corrienteId,''));
  const hist=book?.historia||{}; set('hist-ambito',hist.ambito||taxonomyName('history',hist.ambitoId,''));
  const chk=document.getElementById('cuento-es-recopilacion');if(chk)chk.checked=!!c.esRecopilacion;
  const typ=document.getElementById('cuento-tipo-recopilacion');if(typ)typ.value=c.tipoRecopilacion||'autor';
  const unk=document.getElementById('cuento-fechas-desconocidas');if(unk)unk.checked=!!c.periodoObrasDesconocido;
  set('cuento-periodo-inicio',c.periodoObrasInicio);set('cuento-periodo-fin',c.periodoObrasFin);
  const use=document.getElementById('cuento-usar-periodo-autor');if(use)use.checked=!!c.usarPeriodoAutor;
  const life=authorTemporalDataByName(book?.autor||'');
  set('autor-anio-nacimiento',life.nacimiento);set('autor-anio-muerte',life.muerte);
  const alive=document.getElementById('autor-aun-vivo');if(alive)alive.checked=life.aunVivo;
  updateLiteraryMetadataVisibility(); updateAuthorLifeVisibility();
}

function updateAuthorLifeVisibility(){
  const alive=!!document.getElementById('autor-aun-vivo')?.checked;
  const death=document.getElementById('autor-anio-muerte');if(death){death.disabled=alive;if(alive)death.value='';}
}

function literaryYear(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}

function storyTemporalRange(book){
  const c=book?.cuentos||{};
  if(c.esRecopilacion){
    if(!c.periodoObrasDesconocido){
      const a=literaryYear(c.periodoObrasInicio),b=literaryYear(c.periodoObrasFin);
      if(a!==null||b!==null)return {inicio:a!==null?a:b,fin:b!==null?b:a,source:'obras'};
    }
    if(c.usarPeriodoAutor&&c.tipoRecopilacion!=='antologia'){
      const life=authorTemporalDataByName(book.autor||'');
      if(life.nacimiento!==null)return {inicio:life.nacimiento,fin:life.aunVivo?new Date().getFullYear():(life.muerte!==null?life.muerte:life.nacimiento),source:'autor'};
    }
  }
  const a=literaryYear(book?.periodo_publicacion_inicio??book?.anio_publicacion_original),b=literaryYear(book?.periodo_publicacion_fin??book?.anio_publicacion_original);
  if(a!==null||b!==null)return {inicio:a!==null?a:b,fin:b!==null?b:a,source:'publicacion'};
  return {inicio:null,fin:null,source:''};
}

function quickGenreActive(name){return !!document.querySelector(`#genero-quick-chips .genero-chip[data-g="${name}"].active`);}
function toggleGeneroQuickMeta(btn){btn.classList.toggle('active');updateQuickLiteraryMetadataVisibility();}
function updateQuickAuthorLifeVisibility(){const alive=!!document.getElementById('quick-autor-vivo')?.checked;const death=document.getElementById('quick-autor-muerte');if(death){death.disabled=alive;if(alive)death.value='';}}
function updateQuickLiteraryMetadataVisibility(){
  const poetry=quickGenreActive('Poesía'), story=quickGenreActive('Cuento');
  const pp=document.getElementById('quick-poesia-fields');if(pp)pp.style.display=poetry?'block':'none';
  const cp=document.getElementById('quick-cuento-fields');if(cp)cp.style.display=story?'block':'none';
  const collection=story&&!!document.getElementById('quick-cuento-es-recopilacion')?.checked;
  const body=document.getElementById('quick-cuento-recopilacion-body');if(body)body.style.display=collection?'block':'none';
  const unknown=collection&&!!document.getElementById('quick-cuento-fechas-desconocidas')?.checked;
  const dates=document.getElementById('quick-cuento-fechas');if(dates)dates.style.display=unknown?'none':'grid';
  const type=document.getElementById('quick-cuento-tipo')?.value||'autor';
  const fallback=document.getElementById('quick-cuento-fallback');if(fallback)fallback.style.display=unknown?'block':'none';
  const note=document.getElementById('quick-cuento-fallback-note');if(note)note.textContent=type==='antologia'?'En antologías de varios autores no se usa el ciclo vital de un solo autor como aproximación temporal.':'Si faltan las fechas de las obras, puedes usar el ciclo vital del autor como aproximación.';
  if(type==='antologia'){const u=document.getElementById('quick-cuento-usar-autor');if(u)u.checked=false;}
  const authorPanel=document.getElementById('quick-autor-temporal-fields');if(authorPanel)authorPanel.style.display=(poetry||(unknown&&type!=='antologia'))?'block':'none';
  fillLiteraryTaxonomyLists();updateQuickAuthorLifeVisibility();
}
function populateQuickLiteraryMetadata(book){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??'';};
  const p=book?.poesia||{},c=book?.cuentos||{};
  set('quick-poesia-tradicion',p.tradicion||taxonomyName('poetry',p.tradicionId,''));set('quick-poesia-corriente',p.corriente||taxonomyName('movement',p.corrienteId,''));
  const coll=document.getElementById('quick-cuento-es-recopilacion');if(coll)coll.checked=!!c.esRecopilacion;
  const typ=document.getElementById('quick-cuento-tipo');if(typ)typ.value=c.tipoRecopilacion||'autor';
  const unk=document.getElementById('quick-cuento-fechas-desconocidas');if(unk)unk.checked=!!c.periodoObrasDesconocido;
  set('quick-cuento-inicio',c.periodoObrasInicio);set('quick-cuento-fin',c.periodoObrasFin);
  const use=document.getElementById('quick-cuento-usar-autor');if(use)use.checked=!!c.usarPeriodoAutor;
  const life=authorTemporalDataByName(book?.autor||'');set('quick-autor-nacimiento',life.nacimiento);set('quick-autor-muerte',life.muerte);const vivo=document.getElementById('quick-autor-vivo');if(vivo)vivo.checked=life.aunVivo;
  updateQuickLiteraryMetadataVisibility();
}
function saveQuickLiteraryMetadata(book){
  if(!book)return;
  if(quickGenreActive('Poesía')){const trad=resolveLiteraryTaxonomy('poetry',document.getElementById('quick-poesia-tradicion')?.value||''),mov=resolveLiteraryTaxonomy('movement',document.getElementById('quick-poesia-corriente')?.value||'');book.poesia={schema:'lumen_poesia_v1',tradicionId:trad.id||'',tradicion:trad.name||'',corrienteId:mov.id||'',corriente:mov.name||''};}else book.poesia=null;
  if(quickGenreActive('Cuento')){const es=!!document.getElementById('quick-cuento-es-recopilacion')?.checked;if(es){const tipo=document.getElementById('quick-cuento-tipo')?.value||'autor',unknown=!!document.getElementById('quick-cuento-fechas-desconocidas')?.checked,a=literaryYear(document.getElementById('quick-cuento-inicio')?.value),b=literaryYear(document.getElementById('quick-cuento-fin')?.value),use=unknown&&tipo!=='antologia'&&!!document.getElementById('quick-cuento-usar-autor')?.checked;book.cuentos={schema:'lumen_cuentos_v1',esRecopilacion:true,tipoRecopilacion:tipo,periodoObrasDesconocido:unknown,periodoObrasInicio:unknown?null:a,periodoObrasFin:unknown?null:b,usarPeriodoAutor:use};}else book.cuentos={esRecopilacion:false};}else book.cuentos=null;
  const needsAuthor=quickGenreActive('Poesía')||(book.cuentos?.esRecopilacion&&book.cuentos?.periodoObrasDesconocido&&book.cuentos?.tipoRecopilacion!=='antologia');
  if(needsAuthor){const ent=getPrimaryCanonicalAuthorByName(book.autor||'',true);if(ent){const c=loadCanonicalEntities(),target=c.authors[ent.id]||ent,n=literaryYear(document.getElementById('quick-autor-nacimiento')?.value),m=literaryYear(document.getElementById('quick-autor-muerte')?.value),alive=!!document.getElementById('quick-autor-vivo')?.checked;if(n!==null)target.nacimiento=n;target.aunVivo=alive;if(alive)delete target.muerte;else if(m!==null)target.muerte=m;c.authors[ent.id]=target;saveCanonicalEntities(c);}}
}
