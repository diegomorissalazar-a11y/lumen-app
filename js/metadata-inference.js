// LUMEN v197 — inferencia indexada + normalizador progresivo y acciones agrupadas
'use strict';

const LUMEN_METADATA_INFERENCE_SCHEMA = 'lumen_metadata_inference_v1';

function inferenceNorm(v){
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}
function inferencePct(v){ return Math.round((Number(v)||0)*100); }
function inferenceAuthorKey(book){
  if(!book) return '';
  if(typeof canonicalAuthorIdentity==='function') return canonicalAuthorIdentity(book.autor||'');
  return inferenceNorm(book.autor||'');
}
function inferenceGenres(book){ return Array.isArray(book?.generos)?book.generos.filter(Boolean):[]; }

// v197: índices reutilizables para evitar recorrer toda la biblioteca por cada libro.
let _metadataInferenceContext = null;
let _metadataInferenceContextToken = '';
function metadataInferenceToken(){
  const entries=db.entries||[];
  let updated=0;
  for(const e of entries){ if(e?.type==='libro') updated=Math.max(updated,Number(e._updatedAt)||0); }
  return `${entries.length}:${updated}`;
}
function buildMetadataInferenceContext(force=false){
  const token=metadataInferenceToken();
  if(!force && _metadataInferenceContext && _metadataInferenceContextToken===token) return _metadataInferenceContext;
  const books=(db.entries||[]).filter(e=>e?.type==='libro');
  const byAuthor=new Map(), byAuthorGenre=new Map(), byId=new Map();
  for(const book of books){
    byId.set(String(book.id),book);
    const akey=inferenceAuthorKey(book);
    if(!akey) continue;
    const arr=byAuthor.get(akey)||[]; arr.push(book); byAuthor.set(akey,arr);
    for(const genre of inferenceGenres(book)){
      const k=`${akey}::${genre}`; const list=byAuthorGenre.get(k)||[]; list.push(book); byAuthorGenre.set(k,list);
    }
  }
  _metadataInferenceContext={books,byAuthor,byAuthorGenre,byId,token};
  _metadataInferenceContextToken=token;
  return _metadataInferenceContext;
}
function invalidateMetadataInferenceContext(){ _metadataInferenceContext=null; _metadataInferenceContextToken=''; }
function inferencePeers(book, genre, ctx){
  const key=inferenceAuthorKey(book); if(!key) return [];
  const context=ctx||buildMetadataInferenceContext();
  const source=genre ? (context.byAuthorGenre.get(`${key}::${genre}`)||[]) : (context.byAuthor.get(key)||[]);
  return source.filter(e=>e.id!==book.id);
}
function inferenceConsensus(items, extractor){
  const vals=[];
  (items||[]).forEach(x=>{const v=extractor(x); if(v!==null&&v!==undefined&&v!==''&&(!Array.isArray(v)||v.length)) vals.push(v);});
  if(!vals.length) return null;
  const groups=new Map();
  vals.forEach(v=>{
    const raw=Array.isArray(v)?v.join('|'):String(v);
    const k=inferenceNorm(raw); if(!k)return;
    const g=groups.get(k)||{value:v,count:0}; g.count++; groups.set(k,g);
  });
  const ranked=[...groups.values()].sort((a,b)=>b.count-a.count); if(!ranked.length)return null;
  const top=ranked[0], total=vals.length, ratio=top.count/total;
  let confidence=0;
  if(ratio===1 && total>=2) confidence=.98;
  else if(ratio===1 && total===1) confidence=.82;
  else if(total>=3 && ratio>=.75) confidence=.88;
  else if(total>=4 && ratio>=.60) confidence=.76;
  if(confidence<.75) return null;
  return {value:top.value,count:top.count,total,ratio,confidence};
}
function inferenceSuggestion(key,label,value,confidence,source,detail,meta={}){
  return {key,label,value,confidence,source,detail,meta};
}
function inferenceTaxonomyLanguageForTradition(traditionId){
  if(!traditionId||typeof taxonomyFind!=='function')return null;
  const c=taxonomyFind('literary_tradition',traditionId); if(!c)return null;
  const ids=(c.languageIds||[]).filter(Boolean); if(ids.length!==1)return null;
  const lang=taxonomyFind('language',ids[0]); return lang||null;
}
function inferenceSuggestionForLanguage(book, suggestions, ctx){
  if(String(book.idioma||'').trim())return;
  const p=book.poesia||{};
  const trad=inferenceTaxonomyLanguageForTradition(p.tradicionId);
  if(trad){
    suggestions.push(inferenceSuggestion('idioma','Idioma original',trad.preferredLabel,.98,'taxonomía',`La tradición ${p.tradicion||taxonomyConceptName?.(p.tradicionId)||''} está vinculada a ${trad.preferredLabel}.`,{conceptId:trad.id}));
    return;
  }
  // Si la tradición también es una sugerencia, usar su relación lingüística.
  const tradSuggestion=suggestions.find(s=>s.key==='poesia.tradicionId');
  if(tradSuggestion?.meta?.conceptId){
    const lang=inferenceTaxonomyLanguageForTradition(tradSuggestion.meta.conceptId);
    if(lang){suggestions.push(inferenceSuggestion('idioma','Idioma original',lang.preferredLabel,.93,'taxonomía inferida',`La tradición sugerida ${tradSuggestion.value} está vinculada a ${lang.preferredLabel}.`,{conceptId:lang.id}));return;}
  }
  // Perfil autor + género. Toma la señal más fuerte entre los géneros del libro.
  let best=null, bestGenre='';
  inferenceGenres(book).forEach(g=>{
    const c=inferenceConsensus(inferencePeers(book,g,ctx),e=>String(e.idioma||'').trim());
    if(c&&(!best||c.confidence>best.confidence||(c.confidence===best.confidence&&c.total>best.total))){best=c;bestGenre=g;}
  });
  if(!best){
    const c=inferenceConsensus(inferencePeers(book,'',ctx),e=>String(e.idioma||'').trim());
    if(c){best={...c,confidence:Math.min(c.confidence,.80)};bestGenre='obra';}
  }
  if(best){suggestions.push(inferenceSuggestion('idioma','Idioma original',best.value,best.confidence,'autor + género',`${best.count} de ${best.total} obra(s) conocidas de ${book.autor}${bestGenre&&bestGenre!=='obra'?` en ${bestGenre}`:''} usan este idioma.`));}
}
function inferenceSuggestionForPoetry(book,suggestions,ctx){
  if(!inferenceGenres(book).includes('Poesía'))return;
  const peers=inferencePeers(book,'Poesía',ctx);
  const p=book.poesia||{};
  if(!p.tradicionId){
    const c=inferenceConsensus(peers,e=>e?.poesia?.tradicionId||'');
    if(c){const concept=typeof taxonomyFind==='function'?taxonomyFind('literary_tradition',c.value):null;const label=concept?.preferredLabel||peers.find(e=>e?.poesia?.tradicionId===c.value)?.poesia?.tradicion||c.value;suggestions.push(inferenceSuggestion('poesia.tradicionId','Tradición poética',label,c.confidence,'autor + Poesía',`${c.count} de ${c.total} libro(s) de poesía del autor comparten esta tradición.`,{conceptId:c.value}));}
  }
  if(!p.corrienteId){
    const c=inferenceConsensus(peers,e=>e?.poesia?.corrienteId||'');
    if(c){const concept=typeof taxonomyFind==='function'?taxonomyFind('literary_period',c.value):null;const label=concept?.preferredLabel||peers.find(e=>e?.poesia?.corrienteId===c.value)?.poesia?.corriente||c.value;suggestions.push(inferenceSuggestion('poesia.corrienteId','Período / corriente',label,Math.min(c.confidence,.90),'autor + Poesía',`${c.count} de ${c.total} libro(s) de poesía del autor comparten este período/corriente.`,{conceptId:c.value}));}
  }
  if(!(Array.isArray(p.generacionIds)&&p.generacionIds.length)){
    const c=inferenceConsensus(peers,e=>(e?.poesia?.generacionIds||[])[0]||'');
    if(c){const concept=typeof taxonomyFind==='function'?taxonomyFind('author_generation',c.value):null;const label=concept?.preferredLabel||peers.find(e=>(e?.poesia?.generacionIds||[])[0]===c.value)?.poesia?.generacion||c.value;suggestions.push(inferenceSuggestion('poesia.generacionIds','Generación / grupo',label,Math.min(c.confidence,.86),'autor + Poesía',`${c.count} de ${c.total} libro(s) de poesía del autor comparten esta generación/grupo.`,{conceptId:c.value}));}
  }
}
function metadataSuggestionsForBook(book,ctx){
  if(!book||book.type!=='libro')return [];
  const suggestions=[];
  const context=ctx||buildMetadataInferenceContext();
  inferenceSuggestionForPoetry(book,suggestions,context);
  inferenceSuggestionForLanguage(book,suggestions,context);
  return suggestions.sort((a,b)=>b.confidence-a.confidence||a.label.localeCompare(b.label,'es'));
}
function metadataRecordProvenance(book,key,suggestion){
  book.metadataProvenance=book.metadataProvenance||{schema:LUMEN_METADATA_INFERENCE_SCHEMA,fields:{}};
  book.metadataProvenance.fields=book.metadataProvenance.fields||{};
  book.metadataProvenance.fields[key]={source:suggestion.source,confidence:suggestion.confidence,detail:suggestion.detail,appliedAt:Date.now(),inferred:true};
}
function metadataApplySuggestion(book,s){
  if(!book||!s)return false; let changed=false;
  if(s.key==='idioma'&&!String(book.idioma||'').trim()){
    book.idioma=s.value; changed=true;
  }else if(s.key==='poesia.tradicionId'){
    book.poesia=book.poesia||{schema:'lumen_poesia_v2'};
    if(!book.poesia.tradicionId){book.poesia.tradicionId=s.meta?.conceptId||'';book.poesia.tradicion=s.value;changed=true;}
  }else if(s.key==='poesia.corrienteId'){
    book.poesia=book.poesia||{schema:'lumen_poesia_v2'};
    if(!book.poesia.corrienteId){book.poesia.corrienteId=s.meta?.conceptId||'';book.poesia.corriente=s.value;changed=true;}
  }else if(s.key==='poesia.generacionIds'){
    book.poesia=book.poesia||{schema:'lumen_poesia_v2'};
    if(!(book.poesia.generacionIds||[]).length){book.poesia.generacionIds=[s.meta?.conceptId||''].filter(Boolean);book.poesia.generacion=s.value;changed=true;}
  }
  if(changed){metadataRecordProvenance(book,s.key,s);book._updatedAt=Date.now();if(typeof syncBookFacetTaxonomy==='function')syncBookFacetTaxonomy(book);}
  return changed;
}
// v197: las acciones repetidas de Normalizar se agrupan para no serializar DB,
// recalcular Descubrir y reconstruir cientos de filas después de cada clic.
let _metadataCommitTimer=null, _metadataRenderTimer=null, _metadataRecommendationsTimer=null;
function scheduleMetadataCommit(reason='normalización de metadatos'){
  clearTimeout(_metadataCommitTimer);
  _metadataCommitTimer=setTimeout(()=>{
    _metadataCommitTimer=null;
    saveDB();
  },180);
  clearTimeout(_metadataRecommendationsTimer);
  _metadataRecommendationsTimer=setTimeout(()=>{
    _metadataRecommendationsTimer=null;
    if(typeof invalidateRecommendations==='function') invalidateRecommendations(reason);
  },320);
}
function scheduleMetadataNormalizerRender(delay=90){
  clearTimeout(_metadataRenderTimer);
  _metadataRenderTimer=setTimeout(()=>{ _metadataRenderTimer=null; renderMetadataNormalizerBooks(); },delay);
}
function afterMetadataMutation(reason,toast){
  invalidateMetadataInferenceContext();
  scheduleMetadataCommit(reason);
  scheduleMetadataNormalizerRender();
  if(toast) showToast(toast);
}

function applyMetadataSuggestion(bookId,key){
  const ctx=buildMetadataInferenceContext();
  const book=ctx.byId.get(String(bookId)); if(!book)return false;
  const s=metadataSuggestionsForBook(book,ctx).find(x=>x.key===key); if(!s)return false;
  const changed=metadataApplySuggestion(book,s);
  if(changed) afterMetadataMutation('metadato inferido',`✓ ${s.label}: ${s.value}`);
  return changed;
}
function applyHighConfidenceMetadataForBook(bookId){
  const ctx=buildMetadataInferenceContext();
  const book=ctx.byId.get(String(bookId)); if(!book)return 0;
  let n=0; metadataSuggestionsForBook(book,ctx).filter(s=>s.confidence>=.92).forEach(s=>{if(metadataApplySuggestion(book,s))n++;});
  if(n) afterMetadataMutation('metadatos inferidos',`✓ ${n} sugerencia(s) aplicada(s)`);
  else showToast('Sin sugerencias de alta confianza para aplicar');
  return n;
}
function applyAllHighConfidenceMetadata(){
  const ctx=buildMetadataInferenceContext();
  let n=0,books=0;
  ctx.books.forEach(book=>{let c=0;metadataSuggestionsForBook(book,ctx).filter(s=>s.confidence>=.92).forEach(s=>{if(metadataApplySuggestion(book,s)){n++;c++;}});if(c)books++;});
  if(n) afterMetadataMutation('metadatos inferidos masivos',`✓ ${n} dato(s) aplicados en ${books} libro(s)`);
  else showToast('No hay sugerencias nuevas de alta confianza');
}
function metadataFieldSpecForGenre(genre){
  const specs=[{key:'idioma',label:'Idioma original',get:e=>String(e.idioma||'').trim(),set:(e,v)=>{if(!String(e.idioma||'').trim()){e.idioma=v;return true;}return false;}}];
  if(genre==='Poesía'){
    specs.push(
      {key:'poesia.tradicionId',label:'Tradición poética',get:e=>e?.poesia?.tradicionId||'',display:v=>taxonomyConceptName?.(v)||v,set:(e,v)=>{e.poesia=e.poesia||{schema:'lumen_poesia_v2'};if(!e.poesia.tradicionId){e.poesia.tradicionId=v;e.poesia.tradicion=taxonomyConceptName?.(v)||v;return true;}return false;}},
      {key:'poesia.corrienteId',label:'Período / corriente',get:e=>e?.poesia?.corrienteId||'',display:v=>taxonomyConceptName?.(v)||v,set:(e,v)=>{e.poesia=e.poesia||{schema:'lumen_poesia_v2'};if(!e.poesia.corrienteId){e.poesia.corrienteId=v;e.poesia.corriente=taxonomyConceptName?.(v)||v;return true;}return false;}},
      {key:'poesia.generacionIds',label:'Generación / grupo',get:e=>(e?.poesia?.generacionIds||[])[0]||'',display:v=>taxonomyConceptName?.(v)||v,set:(e,v)=>{e.poesia=e.poesia||{schema:'lumen_poesia_v2'};if(!(e.poesia.generacionIds||[]).length){e.poesia.generacionIds=[v];e.poesia.generacion=taxonomyConceptName?.(v)||v;return true;}return false;}}
    );
  }
  return specs;
}
function metadataPropagationGroups(ctx){
  const context=ctx||buildMetadataInferenceContext();
  const out=[];
  context.byAuthorGenre.forEach((books,key)=>{
    if(!books.length)return;
    const split=key.lastIndexOf('::');
    const genre=key.slice(split+2);
    const author=books[0]?.autor||'';
    metadataFieldSpecForGenre(genre).forEach(spec=>{
      const known=books.filter(b=>spec.get(b)); const missing=books.filter(b=>!spec.get(b));
      if(!known.length||!missing.length)return;
      const c=inferenceConsensus(known,spec.get); if(!c||c.ratio!==1)return;
      const display=spec.display?spec.display(c.value):c.value;
      out.push({id:`${key}::${spec.key}`,author,genre,fieldKey:spec.key,fieldLabel:spec.label,value:c.value,valueLabel:display,sourceCount:known.length,targetIds:missing.map(b=>b.id),targetTitles:missing.map(b=>b.titulo||'Sin título'),confidence:known.length>=2?.98:.82});
    });
  });
  return out.sort((a,b)=>a.author.localeCompare(b.author,'es',{sensitivity:'base'})||a.genre.localeCompare(b.genre,'es')||a.fieldLabel.localeCompare(b.fieldLabel,'es'));
}
function applyMetadataPropagation(groupId){
  const ctx=buildMetadataInferenceContext();
  const group=metadataPropagationGroups(ctx).find(g=>g.id===groupId);if(!group)return 0;
  const spec=metadataFieldSpecForGenre(group.genre).find(s=>s.key===group.fieldKey);if(!spec)return 0;
  const targets=group.targetIds.map(id=>ctx.byId.get(String(id))).filter(Boolean);if(!targets.length)return 0;
  const preview=targets.slice(0,6).map(x=>`• ${x.titulo}`).join('\n')+(targets.length>6?`\n• … y ${targets.length-6} más`: '');
  if(!confirm(`${group.author} · ${group.genre}\n\nAplicar ${group.fieldLabel}: “${group.valueLabel}” a ${targets.length} libro(s) sin ese dato?\n\n${preview}\n\nNo se reemplazarán valores existentes.`))return 0;
  let n=0;targets.forEach(book=>{if(spec.set(book,group.value)){metadataRecordProvenance(book,group.fieldKey,{source:'propagación autor + género',confidence:group.confidence,detail:`Consenso de ${group.sourceCount} obra(s) del mismo autor y género.`});book._updatedAt=Date.now();if(typeof syncBookFacetTaxonomy==='function')syncBookFacetTaxonomy(book);n++;}});
  if(n) afterMetadataMutation('propagación de metadatos',`✓ ${n} libro(s) actualizados`);
  return n;
}
function metadataAnalyzeAll(ctx){
  const context=ctx||buildMetadataInferenceContext();
  const rows=[];
  for(const book of context.books){
    const missing=typeof bibliographyCompletionMissing==='function'?bibliographyCompletionMissing(book):[];
    const suggestions=metadataSuggestionsForBook(book,context);
    if(missing.length||suggestions.length) rows.push({book,missing,suggestions});
  }
  rows.sort((a,b)=>String(a.book.titulo||'').localeCompare(String(b.book.titulo||''),'es',{sensitivity:'base'}));
  return {rows,groups:metadataPropagationGroups(context),context};
}
function metadataNormalizerRows(){ return metadataAnalyzeAll().rows; }

// ═══════════════════════════════════════════════════════════════
// LUMEN v202 — edición rápida inline en Normalizar → Libros
// ═══════════════════════════════════════════════════════════════
function metadataPublisherOptions(current='') {
  const rows=[]; const seen=new Set();
  try {
    const catalog=loadCanonicalEntities();
    Object.values(catalog.publishers||{}).forEach(e=>{
      const name=String(e?.nombreCanonico||'').trim(); if(!name)return;
      const key=canonicalText(name); if(seen.has(key))return;
      seen.add(key); rows.push({id:e.id||'',name});
    });
  } catch(_) {}
  (db.entries||[]).filter(e=>e?.type==='libro'&&String(e.editorial||'').trim()).forEach(e=>{
    const raw=String(e.editorial).trim(); let name=raw,id=e.editorialId||'';
    try { const c=findCanonicalEntity('edi',raw); if(c){name=c.nombreCanonico||raw;id=c.id||id;} } catch(_) {}
    const key=canonicalText(name); if(seen.has(key))return; seen.add(key); rows.push({id,name});
  });
  if(current){const key=canonicalText(current);if(!seen.has(key))rows.push({id:'',name:String(current).trim()});}
  return rows.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
}
function metadataLanguageOptions(current='') {
  let langs=[];
  try { langs=typeof getIdiomasDisponibles==='function'?getIdiomasDisponibles():[]; } catch(_) {}
  try { if(typeof taxonomyConcepts==='function') taxonomyConcepts('language').forEach(c=>langs.push(c.preferredLabel)); } catch(_) {}
  if(current)langs.push(normalizeIdioma(current));
  return [...new Set(langs.filter(Boolean).map(x=>normalizeIdioma(x)))].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
}
function metadataQuickFieldId(bookId,key){return `normq-${String(bookId).replace(/[^a-zA-Z0-9_-]/g,'_')}-${key.replace(/[^a-zA-Z0-9_-]/g,'_')}`;}
function metadataQuickEditHTML(book,missing){
  if(!missing?.length)return '';
  const b=canonicalBookBibliography(book), id=String(book.id), controls=[];
  if(missing.includes('editorial')){
    const fid=metadataQuickFieldId(id,'editorial');
    controls.push(`<div class="norm-quick-field"><label>Editorial</label><select id="${fid}" class="input norm-quick-input"><option value="">— Seleccionar —</option>${metadataPublisherOptions(b.editorial).map(x=>`<option value="${escapeHtml(x.name)}" data-entity-id="${escapeHtml(x.id||'')}">${escapeHtml(x.name)}</option>`).join('')}</select></div>`);
  }
  if(!String(book.idioma||'').trim()){
    const fid=metadataQuickFieldId(id,'idioma');
    controls.push(`<div class="norm-quick-field"><label>Idioma original</label><select id="${fid}" class="input norm-quick-input"><option value="">— Seleccionar —</option>${metadataLanguageOptions(book.idioma).map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('')}</select></div>`);
  }
  if(missing.includes('año de esta edición'))controls.push(`<div class="norm-quick-field"><label>Año de esta edición</label><input id="${metadataQuickFieldId(id,'anio_edicion')}" class="input norm-quick-input" type="number" inputmode="numeric" min="0" max="3000" placeholder="AAAA"></div>`);
  if(missing.includes('edición'))controls.push(`<div class="norm-quick-field"><label>Edición</label><input id="${metadataQuickFieldId(id,'edicion')}" class="input norm-quick-input" type="text" placeholder="Ej: 2ª edición"></div>`);
  if(missing.includes('ciudad'))controls.push(`<div class="norm-quick-field"><label>Ciudad</label><input id="${metadataQuickFieldId(id,'ciudad')}" class="input norm-quick-input" type="text" placeholder="Ciudad de publicación"></div>`);
  if(missing.includes('ISBN'))controls.push(`<div class="norm-quick-field"><label>ISBN</label><input id="${metadataQuickFieldId(id,'isbn')}" class="input norm-quick-input" type="text" placeholder="ISBN"></div>`);
  if(missing.includes('publicación original'))controls.push(`<div class="norm-quick-field"><label>Publicación original</label><input id="${metadataQuickFieldId(id,'anio_original')}" class="input norm-quick-input" type="number" inputmode="numeric" min="-5000" max="3000" placeholder="AAAA"></div>`);
  if(!controls.length)return '';
  return `<div class="norm-quick-edit"><div class="norm-quick-title">Completar directamente</div><div class="norm-quick-grid">${controls.join('')}</div><button class="btn btn-secondary btn-sm norm-quick-save" onclick="saveMetadataQuickEdit('${id.replace(/'/g,"\\'")}')">Guardar campos</button></div>`;
}
function ensureBibliographyEdition(book){
  book.bibliografia=book.bibliografia||{schema:'lumen_ficha_bibliografica_v1'};
  book.bibliografia.edicionConsultada=book.bibliografia.edicionConsultada||{};
  book.bibliografia.obraOriginal=book.bibliografia.obraOriginal||{};
  return book.bibliografia;
}
function quickInputValue(bookId,key){return String(document.getElementById(metadataQuickFieldId(bookId,key))?.value||'').trim();}
function saveMetadataQuickEdit(bookId){
  const ctx=buildMetadataInferenceContext(), book=ctx.byId.get(String(bookId)); if(!book)return false;
  const bib=ensureBibliographyEdition(book), ed=bib.edicionConsultada, obra=bib.obraOriginal; let changed=0;
  const publisher=quickInputValue(bookId,'editorial');
  if(publisher){const ent=resolveCanonicalEntity('edi',publisher,false), canonical=ent?.nombreCanonico||publisher;if(canonicalText(book.editorial)!==canonicalText(canonical)||book.editorialId!==ent?.id){book.editorial=canonical;book.editorialId=ent?.id||book.editorialId||'';ed.editorial=canonical;changed++;}}
  const language=quickInputValue(bookId,'idioma');
  if(language){const v=normalizeIdioma(language);if(book.idioma!==v){book.idioma=v;obra.idiomaOriginal=v;changed++;}}
  const year=quickInputValue(bookId,'anio_edicion');
  if(year){const n=Number(year);if(Number.isFinite(n)&&n>0){book.anio_edicion=n;book.anio_pub=n;ed.anio=n;changed++;}}
  const edition=quickInputValue(bookId,'edicion'); if(edition){book.edicion_descripcion=edition;ed.descripcionEdicion=edition;changed++;}
  const city=quickInputValue(bookId,'ciudad'); if(city){book.ciudad_publicacion=city;ed.ciudad=city;changed++;}
  const isbn=quickInputValue(bookId,'isbn'); if(isbn){book.isbn=isbn;ed.isbn=isbn;changed++;}
  const original=quickInputValue(bookId,'anio_original');
  if(original){const n=Number(original);if(Number.isFinite(n)){book.anio_publicacion_original=n;book.periodo_publicacion_inicio=n;obra.anioPublicacionOriginal=n;obra.periodoInicio=n;changed++;}}
  if(!changed){showToast('No hay campos nuevos para guardar');return false;}
  book._updatedAt=Date.now(); if(typeof syncBookFacetTaxonomy==='function')syncBookFacetTaxonomy(book);
  afterMetadataMutation('edición rápida de bibliografía',`✓ ${changed} campo${changed===1?'':'s'} guardado${changed===1?'':'s'}`); return true;
}

function metadataBookRowHTML({book,missing,suggestions}){
  const quick=metadataQuickEditHTML(book,missing);
  return `<div class="norm-book-row norm-book-row-v202"><div class="norm-book-main"><div class="norm-book-title">${escapeHtml(book.titulo||'Sin título')}</div><div class="norm-book-author">${escapeHtml(book.autor||'Autor no informado')}</div>${missing.length?`<div class="norm-book-missing">Falta bibliografía: ${missing.map(escapeHtml).join(' · ')}</div>`:'<div class="norm-book-complete">✓ Bibliografía obligatoria completa</div>'}${quick}${suggestions.length?`<div class="metadata-suggestion-list">${suggestions.map(s=>`<div class="metadata-suggestion"><div><strong>${escapeHtml(s.label)} → ${escapeHtml(String(s.value))}</strong><small>${escapeHtml(s.detail)} · confianza ${inferencePct(s.confidence)}%</small></div><button class="metadata-apply-btn" onclick="applyMetadataSuggestion('${String(book.id).replace(/'/g,"\\'")}','${s.key}')">Aplicar</button></div>`).join('')}</div>`:''}</div><div class="norm-book-actions">${suggestions.some(s=>s.confidence>=.92)?`<button class="btn btn-secondary btn-sm" style="width:auto" onclick="applyHighConfidenceMetadataForBook('${String(book.id).replace(/'/g,"\\'")}')">✓ Aplicar seguras</button>`:''}${missing.length?`<button class="btn btn-secondary btn-sm" style="width:auto;white-space:nowrap" onclick="openBibliographyFromNormalizerBooks('${String(book.id).replace(/'/g,"\\'")}')">📥 JSON bibliográfico</button>`:''}</div></div>`;
}

let _metadataRenderGeneration=0;
function renderMetadataNormalizerBooks(){
  const count=document.getElementById('norm-books-count'), list=document.getElementById('norm-books-list'), suggestionCount=document.getElementById('norm-books-suggestion-count'), propagationList=document.getElementById('norm-books-propagation-list');
  if(!list)return;
  const generation=++_metadataRenderGeneration;
  list.innerHTML='<div class="norm-workbench-empty"><div class="norm-loading-dot">Analizando biblioteca…</div></div>';
  if(count)count.textContent='Analizando…'; if(suggestionCount)suggestionCount.textContent='';

  // Ceder un frame antes del análisis para que el cambio de pestaña pinte inmediatamente.
  requestAnimationFrame(()=>setTimeout(()=>{
    if(generation!==_metadataRenderGeneration)return;
    const t0=performance.now();
    const {rows,groups}=metadataAnalyzeAll(buildMetadataInferenceContext());
    const bibCount=rows.filter(x=>x.missing.length).length, sugBooks=rows.filter(x=>x.suggestions.length).length;
    if(count)count.textContent=`${bibCount} ficha${bibCount===1?'':'s'} bibliográfica${bibCount===1?'':'s'} incompleta${bibCount===1?'':'s'}`;
    if(suggestionCount)suggestionCount.textContent=`${sugBooks} libro${sugBooks===1?'':'s'} con sugerencias`;
    if(propagationList){
      propagationList.innerHTML=groups.length?groups.map(g=>`<div class="norm-propagation-row"><div><strong>${escapeHtml(g.author)} · ${escapeHtml(g.genre)}</strong><div>${escapeHtml(g.fieldLabel)} → <b>${escapeHtml(String(g.valueLabel))}</b></div><small>${g.sourceCount} fuente(s) consistentes · ${g.targetIds.length} libro(s) por completar · confianza ${inferencePct(g.confidence)}%</small></div><button class="btn btn-secondary btn-sm" style="width:auto" onclick="applyMetadataPropagation('${String(g.id).replace(/'/g,"\\'")}')">Aplicar a compatibles</button></div>`).join(''):'<div class="norm-workbench-empty">Sin propagaciones seguras pendientes.</div>';
    }
    if(!rows.length){list.innerHTML='<div class="norm-workbench-empty"><div style="font-size:30px;margin-bottom:8px">✓</div>Sin fichas pendientes ni sugerencias nuevas.</div>';return;}

    list.innerHTML='';
    const chunk=36;
    let cursor=0;
    const appendChunk=()=>{
      if(generation!==_metadataRenderGeneration)return;
      const slice=rows.slice(cursor,cursor+chunk);
      list.insertAdjacentHTML('beforeend',slice.map(metadataBookRowHTML).join(''));
      cursor+=slice.length;
      if(cursor<rows.length){
        if(typeof requestIdleCallback==='function') requestIdleCallback(appendChunk,{timeout:80});
        else setTimeout(appendChunk,0);
      }else{
        console.info(`[LUMEN v202] Normalizar → Libros: ${rows.length} fila(s), ${groups.length} propagación(es), ${Math.round(performance.now()-t0)} ms`);
      }
    };
    appendChunk();
  },0));
}

window.MetadataInferenceEngine={suggestionsForBook:metadataSuggestionsForBook,analyzeAll:metadataAnalyzeAll,applySuggestion:applyMetadataSuggestion,applyHighConfidenceForBook:applyHighConfidenceMetadataForBook,applyAllHighConfidence:applyAllHighConfidenceMetadata,propagationGroups:metadataPropagationGroups,applyPropagation:applyMetadataPropagation,renderWorkbench:renderMetadataNormalizerBooks,rebuildIndex:()=>buildMetadataInferenceContext(true)};
