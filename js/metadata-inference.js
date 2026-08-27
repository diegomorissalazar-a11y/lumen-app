// LUMEN v195 — inferencia de metadatos + propagación asistida
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
function inferencePeers(book, genre){
  const key=inferenceAuthorKey(book); if(!key) return [];
  return (db.entries||[]).filter(e=>e&&e.type==='libro'&&e.id!==book.id&&inferenceAuthorKey(e)===key&&(!genre||inferenceGenres(e).includes(genre)));
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
function inferenceSuggestionForLanguage(book, suggestions){
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
    const c=inferenceConsensus(inferencePeers(book,g),e=>String(e.idioma||'').trim());
    if(c&&(!best||c.confidence>best.confidence||(c.confidence===best.confidence&&c.total>best.total))){best=c;bestGenre=g;}
  });
  if(!best){
    const c=inferenceConsensus(inferencePeers(book,''),e=>String(e.idioma||'').trim());
    if(c){best={...c,confidence:Math.min(c.confidence,.80)};bestGenre='obra';}
  }
  if(best){suggestions.push(inferenceSuggestion('idioma','Idioma original',best.value,best.confidence,'autor + género',`${best.count} de ${best.total} obra(s) conocidas de ${book.autor}${bestGenre&&bestGenre!=='obra'?` en ${bestGenre}`:''} usan este idioma.`));}
}
function inferenceSuggestionForPoetry(book,suggestions){
  if(!inferenceGenres(book).includes('Poesía'))return;
  const peers=inferencePeers(book,'Poesía');
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
function metadataSuggestionsForBook(book){
  if(!book||book.type!=='libro')return [];
  const suggestions=[];
  inferenceSuggestionForPoetry(book,suggestions);
  inferenceSuggestionForLanguage(book,suggestions);
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
function applyMetadataSuggestion(bookId,key){
  const book=(db.entries||[]).find(e=>String(e.id)===String(bookId)); if(!book)return false;
  const s=metadataSuggestionsForBook(book).find(x=>x.key===key); if(!s)return false;
  const changed=metadataApplySuggestion(book,s); if(changed){saveDB();if(typeof invalidateRecommendations==='function')invalidateRecommendations('metadato inferido');renderMetadataNormalizerBooks();showToast(`✓ ${s.label}: ${s.value}`);}return changed;
}
function applyHighConfidenceMetadataForBook(bookId){
  const book=(db.entries||[]).find(e=>String(e.id)===String(bookId)); if(!book)return 0;
  let n=0; metadataSuggestionsForBook(book).filter(s=>s.confidence>=.92).forEach(s=>{if(metadataApplySuggestion(book,s))n++;});
  if(n){saveDB();if(typeof invalidateRecommendations==='function')invalidateRecommendations('metadatos inferidos');renderMetadataNormalizerBooks();showToast(`✓ ${n} sugerencia(s) aplicada(s)`);}else showToast('Sin sugerencias de alta confianza para aplicar');
  return n;
}
function applyAllHighConfidenceMetadata(){
  let n=0,books=0;(db.entries||[]).filter(e=>e?.type==='libro').forEach(book=>{let c=0;metadataSuggestionsForBook(book).filter(s=>s.confidence>=.92).forEach(s=>{if(metadataApplySuggestion(book,s)){n++;c++;}});if(c)books++;});
  if(n){saveDB();if(typeof invalidateRecommendations==='function')invalidateRecommendations('metadatos inferidos masivos');renderMetadataNormalizerBooks();showToast(`✓ ${n} dato(s) aplicados en ${books} libro(s)`);}else showToast('No hay sugerencias nuevas de alta confianza');
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
function metadataPropagationGroups(){
  const books=(db.entries||[]).filter(e=>e?.type==='libro'&&inferenceAuthorKey(e));
  const combos=new Map();
  books.forEach(book=>inferenceGenres(book).forEach(genre=>{
    const k=`${inferenceAuthorKey(book)}::${genre}`;const g=combos.get(k)||{key:k,author:book.autor||'',authorKey:inferenceAuthorKey(book),genre,books:[]};g.books.push(book);combos.set(k,g);
  }));
  const out=[];
  combos.forEach(combo=>metadataFieldSpecForGenre(combo.genre).forEach(spec=>{
    const known=combo.books.filter(b=>spec.get(b));const missing=combo.books.filter(b=>!spec.get(b));if(!known.length||!missing.length)return;
    const c=inferenceConsensus(known,spec.get);if(!c||c.ratio!==1)return; // propagación masiva solo con consenso total; nunca pisa conflictos.
    const display=spec.display?spec.display(c.value):c.value;
    out.push({id:`${combo.key}::${spec.key}`,author:combo.author,genre:combo.genre,fieldKey:spec.key,fieldLabel:spec.label,value:c.value,valueLabel:display,sourceCount:known.length,targetIds:missing.map(b=>b.id),targetTitles:missing.map(b=>b.titulo||'Sin título'),confidence:known.length>=2?.98:.82});
  }));
  return out.sort((a,b)=>a.author.localeCompare(b.author,'es',{sensitivity:'base'})||a.genre.localeCompare(b.genre,'es')||a.fieldLabel.localeCompare(b.fieldLabel,'es'));
}
function applyMetadataPropagation(groupId){
  const group=metadataPropagationGroups().find(g=>g.id===groupId);if(!group)return 0;
  const spec=metadataFieldSpecForGenre(group.genre).find(s=>s.key===group.fieldKey);if(!spec)return 0;
  const targets=group.targetIds.map(id=>(db.entries||[]).find(e=>String(e.id)===String(id))).filter(Boolean);if(!targets.length)return 0;
  const preview=targets.slice(0,6).map(x=>`• ${x.titulo}`).join('\n')+(targets.length>6?`\n• … y ${targets.length-6} más`: '');
  if(!confirm(`${group.author} · ${group.genre}\n\nAplicar ${group.fieldLabel}: “${group.valueLabel}” a ${targets.length} libro(s) sin ese dato?\n\n${preview}\n\nNo se reemplazarán valores existentes.`))return 0;
  let n=0;targets.forEach(book=>{if(spec.set(book,group.value)){metadataRecordProvenance(book,group.fieldKey,{source:'propagación autor + género',confidence:group.confidence,detail:`Consenso de ${group.sourceCount} obra(s) del mismo autor y género.`});book._updatedAt=Date.now();if(typeof syncBookFacetTaxonomy==='function')syncBookFacetTaxonomy(book);n++;}});
  if(n){saveDB();if(typeof invalidateRecommendations==='function')invalidateRecommendations('propagación de metadatos');renderMetadataNormalizerBooks();showToast(`✓ ${n} libro(s) actualizados`);}return n;
}
function metadataNormalizerRows(){
  return (db.entries||[]).filter(e=>e?.type==='libro').map(book=>({book,missing:typeof bibliographyCompletionMissing==='function'?bibliographyCompletionMissing(book):[],suggestions:metadataSuggestionsForBook(book)})).filter(x=>x.missing.length||x.suggestions.length).sort((a,b)=>String(a.book.titulo||'').localeCompare(String(b.book.titulo||''),'es',{sensitivity:'base'}));
}
function renderMetadataNormalizerBooks(){
  const count=document.getElementById('norm-books-count'), list=document.getElementById('norm-books-list'), suggestionCount=document.getElementById('norm-books-suggestion-count'), propagationList=document.getElementById('norm-books-propagation-list');
  if(!list)return;
  const rows=metadataNormalizerRows(), bibCount=rows.filter(x=>x.missing.length).length, sugBooks=rows.filter(x=>x.suggestions.length).length;
  if(count)count.textContent=`${bibCount} ficha${bibCount===1?'':'s'} bibliográfica${bibCount===1?'':'s'} incompleta${bibCount===1?'':'s'}`;
  if(suggestionCount)suggestionCount.textContent=`${sugBooks} libro${sugBooks===1?'':'s'} con sugerencias`;
  const groups=metadataPropagationGroups();
  if(propagationList){
    propagationList.innerHTML=groups.length?groups.map(g=>`<div class="norm-propagation-row"><div><strong>${escapeHtml(g.author)} · ${escapeHtml(g.genre)}</strong><div>${escapeHtml(g.fieldLabel)} → <b>${escapeHtml(String(g.valueLabel))}</b></div><small>${g.sourceCount} fuente(s) consistentes · ${g.targetIds.length} libro(s) por completar · confianza ${inferencePct(g.confidence)}%</small></div><button class="btn btn-secondary btn-sm" style="width:auto" onclick="applyMetadataPropagation('${String(g.id).replace(/'/g,"\\'")}')">Aplicar a compatibles</button></div>`).join(''):'<div class="norm-workbench-empty">Sin propagaciones seguras pendientes.</div>';
  }
  if(!rows.length){list.innerHTML='<div class="norm-workbench-empty"><div style="font-size:30px;margin-bottom:8px">✓</div>Sin fichas pendientes ni sugerencias nuevas.</div>';return;}
  list.innerHTML=rows.map(({book,missing,suggestions})=>`<div class="norm-book-row norm-book-row-v195"><div class="norm-book-main"><div class="norm-book-title">${escapeHtml(book.titulo||'Sin título')}</div><div class="norm-book-author">${escapeHtml(book.autor||'Autor no informado')}</div>${missing.length?`<div class="norm-book-missing">Falta bibliografía: ${missing.map(escapeHtml).join(' · ')}</div>`:'<div class="norm-book-complete">✓ Bibliografía obligatoria completa</div>'}${suggestions.length?`<div class="metadata-suggestion-list">${suggestions.map(s=>`<div class="metadata-suggestion"><div><strong>${escapeHtml(s.label)} → ${escapeHtml(String(s.value))}</strong><small>${escapeHtml(s.detail)} · confianza ${inferencePct(s.confidence)}%</small></div><button class="metadata-apply-btn" onclick="applyMetadataSuggestion('${String(book.id).replace(/'/g,"\\'")}','${s.key}')">Aplicar</button></div>`).join('')}</div>`:''}</div><div class="norm-book-actions">${suggestions.some(s=>s.confidence>=.92)?`<button class="btn btn-secondary btn-sm" style="width:auto" onclick="applyHighConfidenceMetadataForBook('${String(book.id).replace(/'/g,"\\'")}')">✓ Aplicar seguras</button>`:''}${missing.length?`<button class="btn btn-secondary btn-sm" style="width:auto;white-space:nowrap" onclick="openBibliographyFromNormalizerBooks('${String(book.id).replace(/'/g,"\\'")}')">📥 JSON bibliográfico</button>`:''}</div></div>`).join('');
}

window.MetadataInferenceEngine={suggestionsForBook:metadataSuggestionsForBook,analyzeAll:metadataNormalizerRows,applySuggestion:applyMetadataSuggestion,applyHighConfidenceForBook:applyHighConfidenceMetadataForBook,applyAllHighConfidence:applyAllHighConfidenceMetadata,propagationGroups:metadataPropagationGroups,applyPropagation:applyMetadataPropagation,renderWorkbench:renderMetadataNormalizerBooks};
