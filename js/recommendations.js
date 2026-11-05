// LUMEN v226 — Descubrir: índices de lectura, influencias, rutas y afinidades
'use strict';

const RecommendationEngine = (() => {
  const CACHE_KEY = 'lumen_recommendations_v3';
  let lastReason = 'inicio';
  // Variables legacy conservadas por continuidad de API/auditoría; v189 recalcula inmediatamente.
  let dirty = false;
  let dirtyReason = '';

  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const monthNames = () => (typeof MESES !== 'undefined' && Array.isArray(MESES) && MESES.length===12)
    ? MESES
    : ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Año+mes son fecha de lectura. finishDate se normaliza a esos mismos campos.
  function normalizeCompletionState(book) {
    if (!book || book.type !== 'libro') return false;
    let changed = false;
    if (book.finishDate) {
      const raw = String(book.finishDate).split('T')[0];
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (m) {
        const yy = Number(m[1]), mm = Number(m[2]);
        if (book.anio !== yy) { book.anio = yy; changed = true; }
        const mes = monthNames()[Math.max(0, Math.min(11, mm - 1))];
        if (book.mes !== mes) { book.mes = mes; changed = true; }
      }
      if (book.estado !== 'leido') { book.estado = 'leido'; changed = true; }
    } else if (book.anio && book.mes && book.estado !== 'leido') {
      book.estado = 'leido'; changed = true;
    }
    if (changed) book._updatedAt = Date.now();
    return changed;
  }

  function normalizeCompletionStates() {
    let changed = false;
    (db.entries || []).forEach(e => { if (normalizeCompletionState(e)) changed = true; });
    if (changed) {
      try { saveDB(); } catch (err) { console.warn('[LUMEN v189] No se pudo persistir normalización de lectura:', err); }
    }
    return changed;
  }

  const isRead = e => !!(e && (e.estado === 'leido' || e.finishDate || (e.anio && e.mes)));
  // Pool Descubrir: ejemplar disponible en inventario, todavía no leído, no en curso y no abandonado.
  const isAvailable = e => !!(e && e.type === 'libro' && !isRead(e) && !(typeof inventoryIsRead==='function' && inventoryIsRead(e)) && e.estado !== 'leyendo' && e.estado !== 'abandonado');
  const readBooks = () => (db.entries || []).filter(e => e.type === 'libro' && isRead(e));
  const hasGenre = (e, genre) => exactBookClassifications(e).has(norm(genre));

  function canonicalAuthorIds(book) {
    if (!book) return [];
    const ids = [];
    // Priorizar resolución por nombre/alias canónico; evita contar dos veces un autor tras normalizarlo.
    splitCanonicalAuthors(book.autor || '').forEach(name => {
      const found = findCanonicalEntity('aut', name);
      const id = found?.id || canonicalEntityId('aut', name);
      if (id && !ids.includes(id)) ids.push(id);
    });
    if (!ids.length && book.autorId) ids.push(book.autorId);
    return ids;
  }

  function authorReadCounts() {
    const m = new Map();
    readBooks().forEach(e => canonicalAuthorIds(e).forEach(id => m.set(id, (m.get(id) || 0) + 1)));
    return m;
  }

  function authorAffinityScore(book, counts) {
    return Math.min(4, Math.max(0, ...canonicalAuthorIds(book).map(id => counts.get(id) || 0), 0));
  }

  function authorInfluenceScore(book, context) {
    const authorIds = canonicalAuthorIds(book);
    if (!authorIds.length) return 0;
    const connected = new Set();
    authorIds.forEach(id => {
      const neighbors = context?.influenceNeighbors?.get(id);
      if (neighbors) neighbors.forEach(other => connected.add(other));
    });
    return connected.size;
  }

  function routeScore(book, context) {
    const title = norm(book.titulo);
    return { incoming: context?.routesIn?.get(title) || 0, outgoing: context?.routesOut?.get(title) || 0 };
  }

  // Los índices son efímeros: se reconstruyen por ejecución, sin cambiar datos ni puntuaciones.
  // Una misma pareja dirigida cuenta una sola vez; ambos extremos pueden conectar con un autor leído.
  function buildRecommendationContext(read) {
    const started = performance.now();
    const readAuthorIds = new Set();
    const readByCategory = new Map();
    const readByHistoryLine = new Map();
    const temporalByCategory = new Map();
    const poetryTraditions = new Set();
    const poetryMovements = new Set();
    read.forEach(book => {
      canonicalAuthorIds(book).forEach(id => readAuthorIds.add(id));
      ['historia','poesía','cuentos','novela'].forEach(category => {
        if (!belongsToCategory(book, category)) return;
        if (!readByCategory.has(category)) readByCategory.set(category, []);
        readByCategory.get(category).push(book);
      });
      if (belongsToCategory(book,'poesía')) {
        const tradition = book?.poesia?.tradicionId || norm(book?.poesia?.tradicion || '');
        const movement = book?.poesia?.corrienteId || norm(book?.poesia?.corriente || '');
        if (tradition) poetryTraditions.add(tradition);
        if (movement) poetryMovements.add(movement);
      }
    });
    const influenceNeighbors = new Map();
    const seenPairs = new Set();
    const addNeighbor = (id, other) => {
      if (!influenceNeighbors.has(id)) influenceNeighbors.set(id, new Set());
      influenceNeighbors.get(id).add(other);
    };
    (mapas.influencias || []).forEach(ref => {
      // Mantener la misma resolución canónica que el motor anterior, pero solo una vez por relación.
      ensureInfluenceCanonicalRefs(ref);
      const source = ref.fuente_autor_id || canonicalEntityId('aut', ref.fuente || '');
      const target = ref.destino_autor_id || canonicalEntityId('aut', ref.destino_autor || ref.destino || '');
      if (!source || !target) return;
      const key = `${source}->${target}`;
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      if (readAuthorIds.has(target)) addNeighbor(source, target);
      if (readAuthorIds.has(source)) addNeighbor(target, source);
    });
    const routesIn = new Map(), routesOut = new Map();
    (mapas.rutas || []).forEach(route => {
      const dest = norm(route.destino), source = norm(route.fuente);
      routesIn.set(dest, (routesIn.get(dest) || 0) + 1);
      routesOut.set(source, (routesOut.get(source) || 0) + 1);
    });
    (readByCategory.get('historia') || []).forEach(book => {
      ensureHistoriaCanonicalRefs(book);
      historyLineIdsForEntry(book).forEach(id => {
        if (!readByHistoryLine.has(id)) readByHistoryLine.set(id, []);
        readByHistoryLine.get(id).push(book);
      });
    });
    ['poesía','cuentos','novela'].forEach(category => {
      temporalByCategory.set(category, (readByCategory.get(category) || [])
        .map(book => temporalRangeForBook(book, category)).filter(range => range.inicio != null));
    });
    const context = { influenceNeighbors, routesIn, routesOut, readByCategory,
      readByHistoryLine, temporalByCategory, poetryTraditions, poetryMovements };
    context.indexDurationMs = Math.round((performance.now() - started) * 10) / 10;
    return context;
  }

  function exactBookClassifications(book) {
    const values = [];
    (book?.generos || []).forEach(g => values.push(norm(g)));
    // Compatibilidad futura/legada: si existe un campo categoría, se evalúa como clasificación exacta.
    [book?.categoria, book?.category].forEach(v => { if (v) values.push(norm(v)); });
    return new Set(values.filter(Boolean));
  }

  function belongsToCategory(book, category) {
    const expected = { historia:'historia', 'poesía':'poesia', cuentos:'cuento', novela:'novela' }[category];
    const genre = expected; // nombre legado conservado para continuidad/auditoría
    return exactBookClassifications(book).has(genre);
  }

  function historyContinuity(book, context) {
    if (!belongsToCategory(book, 'historia')) return {score:0, reason:''};
    ensureHistoriaCanonicalRefs(book);
    const targetIds = historyLineIdsForEntry(book);
    const readByLine = context.readByHistoryLine;
    if (!targetIds.length) return {score:0, reason:'historia aún sin líneas históricas configuradas'};
    const knownIds=targetIds.filter(id=>readByLine.has(id)), newIds=targetIds.filter(id=>!readByLine.has(id));
    const reference=[...new Map(knownIds.flatMap(id=>readByLine.get(id)||[]).map(e=>[e.id,e])).values()];
    const bounds=historyBounds(book.historia||{});
    const centers=reference.map(e=>historyBounds(e.historia||{})).filter(b=>b.inicio!=null||b.fin!=null).map(b=>((b.inicio??b.fin)+(b.fin??b.inicio))/2);
    let temporal=0;
    if((bounds.inicio!=null||bounds.fin!=null)&&centers.length){const c=((bounds.inicio??bounds.fin)+(bounds.fin??bounds.inicio))/2,gap=Math.min(...centers.map(x=>Math.abs(x-c)));if(gap<=100)temporal=2;else if(gap<=300)temporal=1;}
    if(knownIds.length&&newIds.length)return {score:5+temporal,reason:'conecta líneas históricas conocidas con una nueva'};
    if(targetIds.length>=2&&knownIds.length>=2)return {score:4+temporal,reason:'actúa como puente entre líneas históricas de tu mapa'};
    if(knownIds.length){if(temporal===2)return {score:4,reason:'continúa un período histórico ya en desarrollo'};if(temporal===1)return {score:3,reason:'expande un período histórico cercano a tus lecturas'};return {score:2,reason:'amplía una línea histórica presente en tu mapa'};}
    return {score:3,reason:targetIds.length>1?'abre nuevas líneas históricas conectadas':'abre una nueva línea histórica'};
  }

  function originalPublicationYear(book) {
    const raw=book?.anio_publicacion_original ?? book?.bibliografia?.obraOriginal?.anioPublicacionOriginal;
    if(raw===null||raw===undefined||raw==='')return null;
    const y=Number(raw); return Number.isFinite(y)?y:null;
  }

  function temporalRangeForBook(book, category) {
    if ((category === 'cuentos'||category === 'poesía') && typeof storyTemporalRange === 'function' && (book?.collectionMetadata?.esRecopilacion||book?.cuentos?.esRecopilacion)) return storyTemporalRange(book);
    const y = originalPublicationYear(book);
    const rawA=book?.periodo_publicacion_inicio,rawB=book?.periodo_publicacion_fin;
    const a=(rawA===null||rawA===undefined||rawA==='')?null:Number(rawA), b=(rawB===null||rawB===undefined||rawB==='')?null:Number(rawB);
    if ((a!==null&&Number.isFinite(a)) || (b!==null&&Number.isFinite(b))) return {inicio:(a!==null&&Number.isFinite(a))?a:b,fin:(b!==null&&Number.isFinite(b))?b:a,source:'publicacion'};
    return {inicio:y,fin:y,source:y!=null?'publicacion':''};
  }

  function rangeDistance(a,b) {
    if (a?.inicio==null || b?.inicio==null) return null;
    const a0=Math.min(a.inicio,a.fin??a.inicio),a1=Math.max(a.inicio,a.fin??a.inicio),b0=Math.min(b.inicio,b.fin??b.inicio),b1=Math.max(b.inicio,b.fin??b.inicio);
    if (a1>=b0 && b1>=a0) return 0;
    return a1 < b0 ? b0-a1 : a0-b1;
  }

  function temporalAffinity(book, category, context) {
    const target=temporalRangeForBook(book,category);
    if(target.inicio==null)return {score:0,reason:''};
    const refs=context.temporalByCategory.get(category) || [];
    if(!refs.length)return {score:0,reason:''};
    const distances=refs.map(r=>rangeDistance(target,r)).filter(x=>x!=null);
    if(!distances.length)return {score:0,reason:''};
    const gap=Math.min(...distances);
    if(gap<=15)return {score:3,reason:'muy cercano al período de obras que ya has leído'};
    if(gap<=35)return {score:2,reason:'cercano temporalmente a obras que ya has leído'};
    if(gap<=60)return {score:1,reason:'mantiene continuidad temporal con tus lecturas'};
    return {score:0,reason:''};
  }

  function poetryAffinity(book, context) {
    if(!belongsToCategory(book,'poesía'))return {score:0,reasons:[]};
    const reasons=[];let score=0;
    const tradition=book?.poesia?.tradicionId||norm(book?.poesia?.tradicion||'');
    const movement=book?.poesia?.corrienteId||norm(book?.poesia?.corriente||'');
    if(tradition && context.poetryTraditions.has(tradition)){score+=2;reasons.push('continúa una tradición poética presente en tus lecturas');}
    if(movement && context.poetryMovements.has(movement)){score+=2;reasons.push('coincide con un período o corriente poética que ya lees');}
    const temporal=temporalAffinity(book,'poesía',context);score+=temporal.score;if(temporal.reason)reasons.push(temporal.reason);
    return {score,reasons};
  }

  function scoreBook(book, counts, category='', context) {
    const authorAffinity = authorAffinityScore(book, counts);
    const influence = Math.min(5, authorInfluenceScore(book, context));
    const route = routeScore(book, context);
    const history = historyContinuity(book, context);
    const temporal = (category==='novela'||category==='cuentos') ? temporalAffinity(book,category,context) : {score:0,reason:''};
    const poetry = category==='poesía' ? poetryAffinity(book,context) : {score:0,reasons:[]};
    // Disponibilidad no suma puntos: es condición de entrada al pool.
    let score = 0;
    score += authorAffinity * 2;
    score += influence * 2;
    score += Math.min(4, route.incoming) * 2;
    score += Math.min(2, route.outgoing);
    score += history.score * 2;
    score += temporal.score;
    score += poetry.score;
    const reasons = ['disponible en tu inventario'];
    if (authorAffinity) reasons.push(`ya has leído ${authorAffinity} obra${authorAffinity===1?'':'s'} de este autor`);
    if (influence) reasons.push(`su autor conecta con ${influence} autor${influence===1?'':'es'} de tu canon`);
    if (route.incoming) reasons.push(`aparece como destino en ${route.incoming} ruta${route.incoming===1?'':'s'} de lectura`);
    if (route.outgoing) reasons.push(`ha originado ${route.outgoing} ruta${route.outgoing===1?'':'s'} de lectura`);
    if (history.reason) reasons.push(history.reason);
    if (temporal.reason) reasons.push(temporal.reason);
    poetry.reasons.forEach(r=>reasons.push(r));
    return {bookId:book.id, score, reasons, breakdown:{author:authorAffinity*2,influence:influence*2,routesIn:Math.min(4,route.incoming)*2,routesOut:Math.min(2,route.outgoing),history:history.score*2,temporal:temporal.score,poetry:poetry.score}};
  }

  function originalLanguage(book) {
    return book?.bibliografia?.obraOriginal?.idiomaOriginal || book?.idioma || '';
  }

  function inventoryPool() {
    const unified = typeof inventoryBooksUnified === 'function'
      ? inventoryBooksUnified().books
      : (db.entries || []).filter(e => e.enInventario);
    const seen = new Set();
    return unified.filter(e => {
      if (!e || seen.has(e.id)) return false;
      seen.add(e.id);
      return isAvailable(e);
    });
  }

  function categoryBooks(category, pool) {
    return pool.filter(e => belongsToCategory(e, category)).filter(e => {
      if (category !== 'poesía') return true;
      const lang = norm(originalLanguage(e));
      return lang === 'espanol' || lang === 'castellano' || lang === 'spanish';
    });
  }

  function calculate(reason='recalculo') {
    const calculationStart = performance.now();
    normalizeCompletionStates();
    const categories = ['historia','poesía','cuentos','novela'];
    const pool = inventoryPool();
    const read = readBooks();
    const counts = authorReadCounts();
    const context = buildRecommendationContext(read);
    const titleById = new Map((db.entries || []).filter(e => e?.type === 'libro').map(e => [e.id, String(e.titulo || '')]));
    const result = {generatedAt:Date.now(), reason, poolCount:pool.length, categories:{}};
    categories.forEach(cat => {
      result.categories[cat] = categoryBooks(cat, pool)
        .map(b => scoreBook(b, counts, cat, context))
        .sort((a,b)=>b.score-a.score || (titleById.get(a.bookId)||'').localeCompare(titleById.get(b.bookId)||'','es'))
        .slice(0,5);
    });
    // Tiempo visible en diagnósticos, sin alterar el formato persistido de las recomendaciones.
    const durationMs = Math.round((performance.now() - calculationStart) * 10) / 10;
    const samples = window.__LUMEN_RECOMMENDATION_PROFILES__ || (window.__LUMEN_RECOMMENDATION_PROFILES__ = []);
    samples.push({durationMs, indexDurationMs:context.indexDurationMs, poolCount:pool.length, influenceCount:(mapas.influencias||[]).length, routeCount:(mapas.rutas||[]).length});
    if (samples.length > 20) samples.shift();
    try { safeLocalSetItem(CACHE_KEY, JSON.stringify(result)); } catch (_) {}
    lastReason = reason;
    return result;
  }

  function load() {
    if (!dirty) {
      try { const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); if(x?.categories) return x; } catch (_) {}
    }
    return recalculate(dirtyReason || 'sin caché');
  }

  function recalculate(reason='cambio relevante') {
    const result = calculate(reason);
    dirty=false; dirtyReason='';
    return result;
  }
  // Do not synchronously rebuild the expensive recommendation graph on every book save.
  // Rebuild on opening Descubrir (load) or explicit Recalcular (recalculate).
  function invalidate(reason='cambio relevante') {
    dirty=true; dirtyReason=reason;
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
    return null;
  }
  function status() { return {dirty, reason:lastReason || dirtyReason}; }
  return {calculate,load,recalculate,invalidate,status,isRead,isAvailable,inventoryPool,belongsToCategory};
})();

function startRecommendationReading(bookId) {
  return lumenSafeAction('Empezar lectura recomendada', () => {
    const book = findBookCanonicalById(bookId) || (db.entries||[]).find(e=>e.id===bookId);
    if (!book || book.type !== 'libro') { showToast('Libro no encontrado'); return; }
    if (RecommendationEngine.isRead(book)) { showToast('Este libro ya figura como leído'); return; }
    const now = new Date().toISOString();
    book.estado = 'leyendo';
    book.readingMode = book.readingMode || 'pag';
    book.progreso = Number.isFinite(Number(book.progreso)) ? Number(book.progreso) : 0;
    if (book.readingMode === 'pag' && (book.progresoPag == null || Number.isNaN(Number(book.progresoPag)))) book.progresoPag = 0;
    book.startDate = book.startDate || now;
    book._updatedAt = Date.now();
    ensureBookCanonicalRefs(book);
    saveDB();
    RecommendationEngine.invalidate('lectura recomendada iniciada');
    closeModal('modal-discover');
    showToast(`✓ “${book.titulo}” agregado a Lectura en curso`, 3200);
    gotoScreen('home');
  });
}

function openRecommendationBook(bookId) {
  closeModal('modal-discover');
  showDetail(bookId);
}

function recommendationCardHTML(rec, idx) {
  const book = findBookCanonicalById(rec.bookId);
  if (!book) return '';
  const id = String(book.id).replace(/'/g,"\\'");
  return `<div class="discover-book-card">
    <div class="discover-rank">${idx+1}</div>
    <div class="discover-book-content">
      <div class="discover-book-title">${escapeHtml(book.titulo||'Sin título')}</div>
      <div class="discover-book-meta">${escapeHtml(book.autor||'')} ${book.editorial?`· ${escapeHtml(book.editorial)}`:''}</div>
      <div class="discover-book-reasons">${rec.reasons.slice(0,4).map(x=>`• ${escapeHtml(x)}`).join('<br>')}</div>
      <div class="discover-book-actions"><button class="btn btn-sm discover-start-btn" onclick="startRecommendationReading('${id}')">▶ Empezar a leer</button><button class="btn btn-secondary btn-sm discover-detail-btn" onclick="openRecommendationBook('${id}')">Ver ficha</button></div>
    </div>
    <div class="discover-score" title="Puntaje de recomendación · Autor ${rec.breakdown?.author||0} · Influencias ${rec.breakdown?.influence||0} · Rutas ${(rec.breakdown?.routesIn||0)+(rec.breakdown?.routesOut||0)} · Historia ${rec.breakdown?.history||0} · Temporal ${rec.breakdown?.temporal||0} · Poesía ${rec.breakdown?.poetry||0}">${Math.round(rec.score)}</div>
  </div>`;
}

function renderDiscoverRecommendations(force=false) {
  const body=document.getElementById('discover-body'); if(!body)return;
  const data=force?RecommendationEngine.recalculate('recalculo manual'):RecommendationEngine.load();
  const labels={historia:'Historia', 'poesía':'Poesía', cuentos:'Cuentos', novela:'Novela'};
  const shown = Object.values(data.categories||{}).reduce((n,a)=>n+(a?.length||0),0);
  const poolNote = data.poolCount > 0 && shown===0
    ? `<div class="discover-pool-note">${data.poolCount} libro${data.poolCount===1?'':'s'} no leído${data.poolCount===1?'':'s'} disponible${data.poolCount===1?'':'s'} en Inventario, pero ninguno está clasificado en Historia, Poesía, Cuento o Novela.</div>`
    : '';
  body.innerHTML = `<div class="discover-intro"><div><strong>Próximas lecturas</strong><br><span>${data.poolCount||0} candidato${data.poolCount===1?'':'s'} en el pool · historial, autores normalizados, rutas, influencias e Historia.</span></div><button class="btn btn-secondary btn-sm" style="width:auto;" onclick="renderDiscoverRecommendations(true)">↻ Recalcular</button></div>${poolNote}`+
    Object.entries(labels).map(([key,label])=>{
      const rows=data.categories[key]||[];
      return `<section class="discover-section"><div class="discover-section-title">${label}</div>${rows.length?rows.map(recommendationCardHTML).join(''):`<div class="discover-empty">No hay candidatos disponibles de ${label.toLowerCase()}.</div>`}</section>`;
    }).join('');
}

function openDiscover() {
  const body = document.getElementById('discover-body');
  openModal('modal-discover');
  if (body) body.innerHTML = '<div class="discover-intro">Calculando recomendaciones…</div>';
  // Paint first: avoid an apparently inert button while building the graph indexes.
  requestAnimationFrame(() => setTimeout(() => {
    try { renderDiscoverRecommendations(false); }
    catch (error) {
      console.error('[LUMEN v226] No se pudieron calcular recomendaciones:', error);
      if (body) body.textContent = 'No se pudieron calcular las recomendaciones. Revisa la consola.';
    }
  }, 0));
}

// Compatibilidad: invalidar solo marca la caché; el cálculo ocurre al abrir Descubrir.
function invalidateRecommendations(reason) {
  try { return RecommendationEngine.invalidate(reason || 'cambio relevante'); } catch (err) { console.warn('[LUMEN v226] Invalidar Descubrir:', err); return null; }
}
