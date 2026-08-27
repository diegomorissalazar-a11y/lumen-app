// LUMEN v194 — metadatos literarios sobre registro facetado canónico
'use strict';

const LITERARY_TAXONOMY_KEY = 'lumen_literary_taxonomy_v1';

function emptyLiteraryTaxonomy(){
  return {
    schema:'lumen_literary_taxonomy_v1',
    poetryTraditions:[
      {id:'poetry_scope_chile',name:'Chilena'},
      {id:'poetry_scope_hispanoamerica',name:'Hispanoamericana'},
      {id:'poetry_scope_espana',name:'Española'},
      {id:'poetry_scope_francia',name:'Francesa'},
      {id:'poetry_scope_ingles',name:'Inglesa'}
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
    const poetryLabels={poetry_scope_chile:'Chilena',poetry_scope_hispanoamerica:'Hispanoamericana',poetry_scope_espana:'Española',poetry_scope_francia:'Francesa',poetry_scope_ingles:'Inglesa'};
    base.poetryTraditions=base.poetryTraditions.map(x=>poetryLabels[x.id]?{...x,name:poetryLabels[x.id]}:x);
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
  const facet={poetry:'literary_tradition',movement:'literary_period',generation:'author_generation',history:'history_line'}[kind];
  if(facet && typeof taxonomyResolve==='function'){
    const row=taxonomyResolve(facet,clean,{create:true});
    return {id:row?.id||'',name:row?.preferredLabel||clean};
  }
  const key={poetry:'poetryTraditions',movement:'poetryMovements',history:'historyScopes'}[kind];
  const prefix={poetry:'poetry_scope',movement:'poetry_period',history:'history_scope'}[kind];
  const tax=loadLiteraryTaxonomy(), arr=tax[key]||[];
  const norm=canonicalText(clean); let found=arr.find(x=>canonicalText(x.name)===norm);
  if(found)return found; found={id:taxonomyId(prefix,clean),name:clean}; arr.push(found); tax[key]=arr; saveLiteraryTaxonomy(tax); fillLiteraryTaxonomyLists(); return found;
}
function taxonomyName(kind,id,fallback=''){
  const facet={poetry:'literary_tradition',movement:'literary_period',generation:'author_generation',history:'history_line'}[kind];
  if(facet && typeof taxonomyFind==='function')return taxonomyFind(facet,id)?.preferredLabel||fallback||'';
  const key={poetry:'poetryTraditions',movement:'poetryMovements',history:'historyScopes'}[kind];
  const found=(loadLiteraryTaxonomy()[key]||[]).find(x=>x.id===id); return found?.name||fallback||'';
}
function fillLiteraryTaxonomyLists(){
  const tax=loadLiteraryTaxonomy();
  const fill=(id,rows)=>{const dl=document.getElementById(id);if(dl)dl.innerHTML=(rows||[]).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})).map(x=>`<option value="${escapeHtml(x.name)}"></option>`).join('');};
  fill('poesia-tradicion-list',tax.poetryTraditions);
  fill('poesia-corriente-list',tax.poetryMovements);
  if(typeof taxonomyConcepts==='function'){fill('poesia-generacion-list',taxonomyConcepts('author_generation').map(x=>({id:x.id,name:x.preferredLabel})));}
  renderAllLiteraryTaxonomyChips();
}

function literaryGenreActive(name){return !!document.querySelector(`#generos-chips .genero-chip[data-g="${name}"].active`);}

function literaryTaxonomyRows(kind){
  const facet={poetry:'literary_tradition',movement:'literary_period',generation:'author_generation',history:'history_line'}[kind];
  if(facet && typeof taxonomyConcepts==='function')return taxonomyConcepts(facet).map(x=>({id:x.id,name:x.preferredLabel})).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  const key={poetry:'poetryTraditions',movement:'poetryMovements',history:'historyScopes'}[kind];
  return (loadLiteraryTaxonomy()[key]||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
}
function setLiteraryTaxonomySelection(inputId,kind,idOrName){
  const input=document.getElementById(inputId); if(!input)return;
  const rows=literaryTaxonomyRows(kind); const raw=String(idOrName||'').trim();
  const found=rows.find(x=>x.id===raw||canonicalText(x.name)===canonicalText(raw));
  input.value=found?found.name:raw;
  renderLiteraryTaxonomyChips(inputId,kind);
}
function addLiteraryTaxonomyOption(inputId,kind){
  const labels={poetry:'tradición / ámbito poético',movement:'período / corriente',generation:'generación / grupo',history:'línea histórica'};
  const raw=prompt(`Nueva ${labels[kind]||'clasificación'}:`,'');
  if(!raw||!raw.trim())return;
  const row=resolveLiteraryTaxonomy(kind,raw.trim());
  setLiteraryTaxonomySelection(inputId,kind,row.id||row.name);
  if(typeof invalidateRecommendations==='function')invalidateRecommendations('taxonomía literaria modificada');
}
function renderLiteraryTaxonomyChips(inputId,kind){
  const input=document.getElementById(inputId); if(!input)return;
  const box=document.getElementById(`${inputId}-chips`); if(!box)return;
  const selected=canonicalText(input.value||'');
  box.innerHTML=literaryTaxonomyRows(kind).map(x=>`<button type="button" class="literary-taxonomy-chip${canonicalText(x.name)===selected?' active':''}" onclick="setLiteraryTaxonomySelection('${inputId}','${kind}','${String(x.id).replace(/'/g,"\\'")}')">${escapeHtml(x.name)}</button>`).join('')+`<button type="button" class="literary-taxonomy-chip add" onclick="addLiteraryTaxonomyOption('${inputId}','${kind}')">+ Otra</button>`;
}
function renderAllLiteraryTaxonomyChips(){
  [['poesia-tradicion','poetry'],['poesia-corriente','movement'],['poesia-generacion','generation'],['quick-poesia-tradicion','poetry'],['quick-poesia-corriente','movement'],['quick-poesia-generacion','generation']].forEach(([id,kind])=>renderLiteraryTaxonomyChips(id,kind));
}
function canonicalAuthorIdentity(name){
  const ent=getPrimaryCanonicalAuthorByName(name||'',false); return ent?.id||canonicalText(splitCanonicalAuthors(name||'')[0]||name||'');
}
function poetryBooksBySameAuthor(book){
  const key=canonicalAuthorIdentity(book?.autor||''); if(!key)return [];
  return (db.entries||[]).filter(e=>e&&e.type==='libro'&&e.id!==book.id&&(e.generos||[]).includes('Poesía')&&canonicalAuthorIdentity(e.autor||'')===key);
}
function authorHasMixedGenres(book){
  const key=canonicalAuthorIdentity(book?.autor||''); if(!key)return false;
  const genres=new Set();
  (db.entries||[]).filter(e=>e&&e.type==='libro'&&canonicalAuthorIdentity(e.autor||'')===key).forEach(e=>(e.generos||[]).forEach(g=>genres.add(g)));
  return [...genres].some(g=>g!=='Poesía');
}
function applyPoetryMetadataToBook(target,source,{tradition=true,movement=false}={}){
  if(!target||!source?.poesia)return false; let changed=false;
  target.poesia=target.poesia||{schema:'lumen_poesia_v1'};
  if(tradition&&source.poesia.tradicionId&&(target.poesia.tradicionId!==source.poesia.tradicionId||target.poesia.tradicion!==source.poesia.tradicion)){
    target.poesia.tradicionId=source.poesia.tradicionId;target.poesia.tradicion=source.poesia.tradicion;changed=true;
  }
  if(movement&&source.poesia.corrienteId&&(target.poesia.corrienteId!==source.poesia.corrienteId||target.poesia.corriente!==source.poesia.corriente)){
    target.poesia.corrienteId=source.poesia.corrienteId;target.poesia.corriente=source.poesia.corriente;changed=true;
  }
  if(changed){target.poesia.schema='lumen_poesia_v1';target._updatedAt=Date.now();}
  return changed;
}
function offerPoetryMetadataPropagation(book){
  if(!book||(book.generos||[]).indexOf('Poesía')<0||!book.poesia)return false;
  const others=poetryBooksBySameAuthor(book); if(!others.length)return false;
  let changed=false; const mixed=authorHasMixedGenres(book);
  const tradition=book.poesia.tradicionId?book.poesia.tradicion:'';
  const tradTargets=tradition?others.filter(e=>e?.poesia?.tradicionId!==book.poesia.tradicionId):[];
  if(tradTargets.length){
    if(!mixed){
      if(confirm(`${book.autor}: aplicaste Poesía · ${tradition}. Hay ${tradTargets.length} libro(s) de poesía del mismo autor con otra clasificación o sin clasificar. ¿Aplicar ${tradition} a todos?`)){
        tradTargets.forEach(e=>{if(applyPoetryMetadataToBook(e,book,{tradition:true,movement:false}))changed=true;});
      }
    }else{
      tradTargets.forEach(e=>{if(confirm(`${book.autor} tiene libros en más de un género. ¿Aplicar la tradición poética “${tradition}” a “${e.titulo}”?`)){if(applyPoetryMetadataToBook(e,book,{tradition:true,movement:false}))changed=true;}});
    }
  }
  const movement=book.poesia.corrienteId?book.poesia.corriente:'';
  const movTargets=movement?others.filter(e=>e?.poesia?.corrienteId!==book.poesia.corrienteId):[];
  movTargets.forEach(e=>{if(confirm(`Revisar período/corriente: ¿aplicar “${movement}” a “${e.titulo}” (${book.autor})?`)){if(applyPoetryMetadataToBook(e,book,{tradition:false,movement:true}))changed=true;}});
  if(changed){if(typeof invalidateRecommendations==='function')invalidateRecommendations('clasificación poética propagada');saveDB();if(currentScreen==='library')renderLibrary();}
  return changed;
}

function updateLiteraryMetadataVisibility(){
  const p=document.getElementById('poesia-fields'), c=document.getElementById('cuento-fields');
  const poetry=literaryGenreActive('Poesía'), story=literaryGenreActive('Cuento');
  if(p)p.style.display=poetry?'block':'none';
  if(c)c.style.display=(story||poetry)?'block':'none';
  updateCollectionFieldsVisibility();
  const storyFallback=(story||poetry) && !!document.getElementById('cuento-es-recopilacion')?.checked && !!document.getElementById('cuento-fechas-desconocidas')?.checked && (document.getElementById('cuento-tipo-recopilacion')?.value||'autor')!=='antologia';
  const authorPanel=document.getElementById('autor-temporal-fields'); if(authorPanel)authorPanel.style.display=(poetry||storyFallback)?'block':'none';
  fillLiteraryTaxonomyLists(); renderAllLiteraryTaxonomyChips();
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
  const storyFallback=(literaryGenreActive('Cuento')||literaryGenreActive('Poesía')) && !!document.getElementById('cuento-es-recopilacion')?.checked && !!document.getElementById('cuento-fechas-desconocidas')?.checked;
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
  const gen=resolveLiteraryTaxonomy('generation',document.getElementById('poesia-generacion')?.value||'');
  const lang=typeof taxonomyLanguageConcept==='function'?taxonomyLanguageConcept(getIdiomaValueFromForm?.()||''):null;
  if(trad.id && lang?.id && typeof taxonomyLink==='function')taxonomyLink(trad.id,{languageIds:[lang.id]});
  if(mov.id && lang?.id && typeof taxonomyLink==='function')taxonomyLink(mov.id,{languageIds:[lang.id],relatedIds:trad.id?[trad.id]:[]});
  if(gen.id && lang?.id && typeof taxonomyLink==='function')taxonomyLink(gen.id,{languageIds:[lang.id],relatedIds:[trad.id,mov.id].filter(Boolean)});
  return {schema:'lumen_poesia_v2',tradicionId:trad.id||'',tradicion:trad.name||'',corrienteId:mov.id||'',corriente:mov.name||'',generacionIds:gen.id?[gen.id]:[],generacion:gen.name||''};
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
function getCollectionMetadataFromForm(){
  const meta=getStoryCollectionMetadataFromForm();
  return {...meta,schema:'lumen_collection_v1'};
}

function resetLiteraryMetadataFields(){
  ['poesia-tradicion','poesia-corriente','poesia-generacion','cuento-periodo-inicio','cuento-periodo-fin','autor-anio-nacimiento','autor-anio-muerte'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['cuento-es-recopilacion','cuento-fechas-desconocidas','cuento-usar-periodo-autor','autor-aun-vivo'].forEach(id=>{const e=document.getElementById(id);if(e)e.checked=false;});
  const typ=document.getElementById('cuento-tipo-recopilacion');if(typ)typ.value='autor';
  updateLiteraryMetadataVisibility();
}

function setLiteraryMetadataFields(book){
  const p=book?.poesia||{}, c=book?.collectionMetadata||book?.cuentos||{};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??'';};
  set('poesia-tradicion',p.tradicion||taxonomyName('poetry',p.tradicionId,''));
  set('poesia-corriente',p.corriente||taxonomyName('movement',p.corrienteId,''));
  set('poesia-generacion',p.generacion||taxonomyName('generation',(p.generacionIds||[])[0],''));
  const chk=document.getElementById('cuento-es-recopilacion');if(chk)chk.checked=!!c.esRecopilacion;
  const typ=document.getElementById('cuento-tipo-recopilacion');if(typ)typ.value=c.tipoRecopilacion||'autor';
  const unk=document.getElementById('cuento-fechas-desconocidas');if(unk)unk.checked=!!c.periodoObrasDesconocido;
  set('cuento-periodo-inicio',c.periodoObrasInicio);set('cuento-periodo-fin',c.periodoObrasFin);
  const use=document.getElementById('cuento-usar-periodo-autor');if(use)use.checked=!!c.usarPeriodoAutor;
  const life=authorTemporalDataByName(book?.autor||'');
  set('autor-anio-nacimiento',life.nacimiento);set('autor-anio-muerte',life.muerte);
  const alive=document.getElementById('autor-aun-vivo');if(alive)alive.checked=life.aunVivo;
  updateLiteraryMetadataVisibility(); renderAllLiteraryTaxonomyChips(); updateAuthorLifeVisibility();
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
  const c=book?.collectionMetadata||book?.cuentos||{};
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
  const cp=document.getElementById('quick-cuento-fields');if(cp)cp.style.display=(story||poetry)?'block':'none';
  const collection=(story||poetry)&&!!document.getElementById('quick-cuento-es-recopilacion')?.checked;
  const body=document.getElementById('quick-cuento-recopilacion-body');if(body)body.style.display=collection?'block':'none';
  const unknown=collection&&!!document.getElementById('quick-cuento-fechas-desconocidas')?.checked;
  const dates=document.getElementById('quick-cuento-fechas');if(dates)dates.style.display=unknown?'none':'grid';
  const type=document.getElementById('quick-cuento-tipo')?.value||'autor';
  const fallback=document.getElementById('quick-cuento-fallback');if(fallback)fallback.style.display=unknown?'block':'none';
  const note=document.getElementById('quick-cuento-fallback-note');if(note)note.textContent=type==='antologia'?'En antologías de varios autores no se usa el ciclo vital de un solo autor como aproximación temporal.':'Si faltan las fechas de las obras, puedes usar el ciclo vital del autor como aproximación.';
  if(type==='antologia'){const u=document.getElementById('quick-cuento-usar-autor');if(u)u.checked=false;}
  const authorPanel=document.getElementById('quick-autor-temporal-fields');if(authorPanel)authorPanel.style.display=(poetry||(unknown&&type!=='antologia'))?'block':'none';
  fillLiteraryTaxonomyLists();renderAllLiteraryTaxonomyChips();updateQuickAuthorLifeVisibility();
}
function populateQuickLiteraryMetadata(book){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??'';};
  const p=book?.poesia||{},c=book?.collectionMetadata||book?.cuentos||{};
  set('quick-poesia-tradicion',p.tradicion||taxonomyName('poetry',p.tradicionId,''));set('quick-poesia-corriente',p.corriente||taxonomyName('movement',p.corrienteId,''));set('quick-poesia-generacion',p.generacion||taxonomyName('generation',(p.generacionIds||[])[0],''));
  const coll=document.getElementById('quick-cuento-es-recopilacion');if(coll)coll.checked=!!c.esRecopilacion;
  const typ=document.getElementById('quick-cuento-tipo');if(typ)typ.value=c.tipoRecopilacion||'autor';
  const unk=document.getElementById('quick-cuento-fechas-desconocidas');if(unk)unk.checked=!!c.periodoObrasDesconocido;
  set('quick-cuento-inicio',c.periodoObrasInicio);set('quick-cuento-fin',c.periodoObrasFin);
  const use=document.getElementById('quick-cuento-usar-autor');if(use)use.checked=!!c.usarPeriodoAutor;
  const life=authorTemporalDataByName(book?.autor||'');set('quick-autor-nacimiento',life.nacimiento);set('quick-autor-muerte',life.muerte);const vivo=document.getElementById('quick-autor-vivo');if(vivo)vivo.checked=life.aunVivo;
  updateQuickLiteraryMetadataVisibility();renderAllLiteraryTaxonomyChips();
}
function saveQuickLiteraryMetadata(book){
  if(!book)return;
  if(quickGenreActive('Poesía')){const trad=resolveLiteraryTaxonomy('poetry',document.getElementById('quick-poesia-tradicion')?.value||''),mov=resolveLiteraryTaxonomy('movement',document.getElementById('quick-poesia-corriente')?.value||''),gen=resolveLiteraryTaxonomy('generation',document.getElementById('quick-poesia-generacion')?.value||'');const lang=typeof taxonomyLanguageConcept==='function'?taxonomyLanguageConcept(book.idioma||''):null;if(trad.id&&lang?.id&&typeof taxonomyLink==='function')taxonomyLink(trad.id,{languageIds:[lang.id]});if(mov.id&&lang?.id&&typeof taxonomyLink==='function')taxonomyLink(mov.id,{languageIds:[lang.id],relatedIds:trad.id?[trad.id]:[]});if(gen.id&&lang?.id&&typeof taxonomyLink==='function')taxonomyLink(gen.id,{languageIds:[lang.id],relatedIds:[trad.id,mov.id].filter(Boolean)});book.poesia={schema:'lumen_poesia_v2',tradicionId:trad.id||'',tradicion:trad.name||'',corrienteId:mov.id||'',corriente:mov.name||'',generacionIds:gen.id?[gen.id]:[],generacion:gen.name||''};if(typeof syncBookFacetTaxonomy==='function')syncBookFacetTaxonomy(book);}else book.poesia=null;
  if(quickGenreActive('Cuento')||quickGenreActive('Poesía')){const es=!!document.getElementById('quick-cuento-es-recopilacion')?.checked;if(es){const tipo=document.getElementById('quick-cuento-tipo')?.value||'autor',unknown=!!document.getElementById('quick-cuento-fechas-desconocidas')?.checked,a=literaryYear(document.getElementById('quick-cuento-inicio')?.value),b=literaryYear(document.getElementById('quick-cuento-fin')?.value),use=unknown&&tipo!=='antologia'&&!!document.getElementById('quick-cuento-usar-autor')?.checked;book.collectionMetadata={schema:'lumen_collection_v1',esRecopilacion:true,tipoRecopilacion:tipo,periodoObrasDesconocido:unknown,periodoObrasInicio:unknown?null:a,periodoObrasFin:unknown?null:b,usarPeriodoAutor:use};if(quickGenreActive('Cuento'))book.cuentos={...book.collectionMetadata,schema:'lumen_cuentos_v1'};}else{book.collectionMetadata={schema:'lumen_collection_v1',esRecopilacion:false};if(quickGenreActive('Cuento'))book.cuentos={esRecopilacion:false};}}else book.collectionMetadata=null;
  const needsAuthor=quickGenreActive('Poesía')||(book.collectionMetadata?.esRecopilacion&&book.collectionMetadata?.periodoObrasDesconocido&&book.collectionMetadata?.tipoRecopilacion!=='antologia');
  if(needsAuthor){const ent=getPrimaryCanonicalAuthorByName(book.autor||'',true);if(ent){const c=loadCanonicalEntities(),target=c.authors[ent.id]||ent,n=literaryYear(document.getElementById('quick-autor-nacimiento')?.value),m=literaryYear(document.getElementById('quick-autor-muerte')?.value),alive=!!document.getElementById('quick-autor-vivo')?.checked;if(n!==null)target.nacimiento=n;target.aunVivo=alive;if(alive)delete target.muerte;else if(m!==null)target.muerte=m;c.authors[ent.id]=target;saveCanonicalEntities(c);}}
}
