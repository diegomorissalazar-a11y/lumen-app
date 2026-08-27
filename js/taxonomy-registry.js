// LUMEN v194 — registro facetado canónico (SKOS-like liviano)
'use strict';

const LUMEN_TAXONOMY_REGISTRY_KEY = 'lumen_taxonomy_registry_v1';

function taxonomyRegistryNorm(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}
function taxonomyRegistrySlug(value){
  return taxonomyRegistryNorm(value).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'concept';
}
function taxonomyConceptId(facet,label){ return `tax_${taxonomyRegistrySlug(facet)}_${taxonomyRegistrySlug(label)}`; }

function defaultTaxonomyRegistry(){
  const concepts=[];
  const add=(facet,label,opts={})=>concepts.push({
    id:opts.id||taxonomyConceptId(facet,label), facet, preferredLabel:label,
    aliases:Array.isArray(opts.aliases)?opts.aliases:[],
    broaderIds:Array.isArray(opts.broaderIds)?opts.broaderIds:[],
    relatedIds:Array.isArray(opts.relatedIds)?opts.relatedIds:[],
    languageIds:Array.isArray(opts.languageIds)?opts.languageIds:[], active:opts.active!==false
  });
  add('language','Español',{id:'tax_language_espanol',aliases:['Castellano','Spanish']});
  add('language','Francés',{id:'tax_language_frances',aliases:['French']});
  add('language','Inglés',{id:'tax_language_ingles',aliases:['English']});
  add('literary_tradition','Chilena',{id:'tax_tradition_chilena',languageIds:['tax_language_espanol']});
  add('literary_tradition','Hispanoamericana',{id:'tax_tradition_hispanoamericana',languageIds:['tax_language_espanol']});
  add('literary_tradition','Española',{id:'tax_tradition_espanola',languageIds:['tax_language_espanol']});
  add('literary_tradition','Francesa',{id:'tax_tradition_francesa',languageIds:['tax_language_frances']});
  add('literary_tradition','Inglesa',{id:'tax_tradition_inglesa',aliases:['Anglófona','Anglofona'],languageIds:['tax_language_ingles']});
  add('literary_period','Siglo de Oro',{id:'tax_period_siglo_de_oro',languageIds:['tax_language_espanol'],relatedIds:['tax_tradition_espanola']});
  add('literary_period','Romanticismo',{id:'tax_period_romanticismo'});
  add('literary_period','Vanguardias',{id:'tax_period_vanguardias'});
  add('literary_period','Generación del 27',{id:'tax_period_generacion_27',languageIds:['tax_language_espanol'],relatedIds:['tax_tradition_espanola']});
  return {schema:'lumen_taxonomy_registry_v1',version:1,concepts};
}

function mergeTaxonomyRegistry(base,extra){
  const out=defaultTaxonomyRegistry();
  const map=new Map(out.concepts.map(c=>[c.id,c]));
  const absorb=(c)=>{
    if(!c||!c.facet||!(c.preferredLabel||c.name))return;
    const label=c.preferredLabel||c.name;
    let target=[...map.values()].find(x=>x.facet===c.facet && (taxonomyRegistryNorm(x.preferredLabel)===taxonomyRegistryNorm(label) || (x.aliases||[]).some(a=>taxonomyRegistryNorm(a)===taxonomyRegistryNorm(label))));
    if(!target){ target={id:c.id||taxonomyConceptId(c.facet,label),facet:c.facet,preferredLabel:label,aliases:[],broaderIds:[],relatedIds:[],languageIds:[],active:c.active!==false}; map.set(target.id,target); }
    const uniq=(a,b)=>[...new Set([...(a||[]),...(b||[])].filter(Boolean))];
    target.aliases=uniq(target.aliases,c.aliases);
    target.broaderIds=uniq(target.broaderIds,c.broaderIds);
    target.relatedIds=uniq(target.relatedIds,c.relatedIds);
    target.languageIds=uniq(target.languageIds,c.languageIds);
    target.active=target.active!==false && c.active!==false;
  };
  (base?.concepts||[]).forEach(absorb); (extra?.concepts||[]).forEach(absorb);
  out.concepts=[...map.values()]; return out;
}

function loadTaxonomyRegistry(){
  let raw=null; try{raw=JSON.parse(localStorage.getItem(LUMEN_TAXONOMY_REGISTRY_KEY)||'null');}catch(_){raw=null;}
  const registry=mergeTaxonomyRegistry(defaultTaxonomyRegistry(),raw||{});
  // Migración desde taxonomía literaria anterior.
  try{
    const legacy=JSON.parse(localStorage.getItem('lumen_literary_taxonomy_v1')||'null');
    if(legacy){
      const legacyConcepts=[];
      (legacy.poetryTraditions||[]).forEach(x=>legacyConcepts.push({facet:'literary_tradition',preferredLabel:x.name==='Anglófona'?'Inglesa':x.name,aliases:x.name==='Anglófona'?['Anglófona']:[]}));
      (legacy.poetryMovements||[]).forEach(x=>legacyConcepts.push({facet:'literary_period',preferredLabel:x.name}));
      return mergeTaxonomyRegistry(registry,{concepts:legacyConcepts});
    }
  }catch(_){ }
  return registry;
}
function saveTaxonomyRegistry(registry){
  const merged=mergeTaxonomyRegistry(defaultTaxonomyRegistry(),registry||{});
  try{safeLocalSetItem(LUMEN_TAXONOMY_REGISTRY_KEY,JSON.stringify(merged));}catch(_){localStorage.setItem(LUMEN_TAXONOMY_REGISTRY_KEY,JSON.stringify(merged));}
  return merged;
}
function taxonomyConcepts(facet){ return loadTaxonomyRegistry().concepts.filter(c=>c.active!==false&&(!facet||c.facet===facet)); }
function taxonomyFind(facet,idOrLabel){
  const raw=String(idOrLabel||'').trim(), n=taxonomyRegistryNorm(raw);
  return taxonomyConcepts(facet).find(c=>c.id===raw||taxonomyRegistryNorm(c.preferredLabel)===n||(c.aliases||[]).some(a=>taxonomyRegistryNorm(a)===n))||null;
}
function taxonomyResolve(facet,label,{create=true,aliases=[],languageIds=[],relatedIds=[],broaderIds=[]}={}){
  const clean=String(label||'').trim(); if(!clean)return {id:'',preferredLabel:'',facet};
  let registry=loadTaxonomyRegistry(), found=taxonomyFind(facet,clean);
  if(found)return found;
  if(!create)return null;
  found={id:taxonomyConceptId(facet,clean),facet,preferredLabel:clean,aliases:[...aliases],languageIds:[...languageIds],relatedIds:[...relatedIds],broaderIds:[...broaderIds],active:true};
  registry.concepts.push(found); saveTaxonomyRegistry(registry); return found;
}
function taxonomyLink(conceptId,{relatedIds=[],broaderIds=[],languageIds=[]}={}){
  const registry=loadTaxonomyRegistry(), c=registry.concepts.find(x=>x.id===conceptId); if(!c)return false;
  const uniq=(a,b)=>[...new Set([...(a||[]),...(b||[])].filter(Boolean))];
  c.relatedIds=uniq(c.relatedIds,relatedIds); c.broaderIds=uniq(c.broaderIds,broaderIds); c.languageIds=uniq(c.languageIds,languageIds); saveTaxonomyRegistry(registry); return true;
}
function taxonomyLanguageConcept(language){
  const normalized=(typeof normalizeIdioma==='function'?normalizeIdioma(language):String(language||'').trim());
  return taxonomyFind('language',normalized)||taxonomyResolve('language',normalized,{create:!!normalized});
}
function taxonomyConceptName(id){ return loadTaxonomyRegistry().concepts.find(c=>c.id===id)?.preferredLabel||''; }
function taxonomyConceptRelatedToLanguage(concept,languageId){ return !!concept && ((concept.languageIds||[]).includes(languageId)||concept.id===languageId); }
function taxonomyBookFacetIds(book){
  const language=taxonomyLanguageConcept(book?.idioma||'');
  const p=book?.poesia||{};
  return {
    languageId:language?.id||'',
    traditionIds:[p.tradicionId].filter(Boolean),
    literaryPeriodIds:[p.corrienteId].filter(Boolean),
    authorGenerationIds:Array.isArray(p.generacionIds)?p.generacionIds.filter(Boolean):[],
    historyLineIds:typeof historyLineIdsForEntry==='function'?historyLineIdsForEntry(book):[]
  };
}
function syncBookFacetTaxonomy(book){
  if(!book||book.type!=='libro')return book;
  const facets=taxonomyBookFacetIds(book);
  book.taxonomy={schema:'lumen_book_taxonomy_v1',...facets};
  return book;
}
function taxonomyLanguageAffinity(bookA,bookB){
  const a=taxonomyBookFacetIds(bookA), b=taxonomyBookFacetIds(bookB); if(!a.languageId||!b.languageId)return 0;
  return a.languageId===b.languageId?1:0;
}
window.TaxonomyRegistry={load:loadTaxonomyRegistry,save:saveTaxonomyRegistry,concepts:taxonomyConcepts,find:taxonomyFind,resolve:taxonomyResolve,link:taxonomyLink,name:taxonomyConceptName,syncBook:syncBookFacetTaxonomy,bookFacets:taxonomyBookFacetIds,languageAffinity:taxonomyLanguageAffinity};
