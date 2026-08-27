// LUMEN v191 — Descubrir / próximas lecturas desde el inventario
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

  function authorInfluenceScore(book) {
    const authorIds = new Set(canonicalAuthorIds(book));
    const aid = [...authorIds][0] || ''; // nombre legado conservado para continuidad/auditoría
    if (!aid || !authorIds.size) return 0;
    const readAuthorIds = new Set(readBooks().flatMap(canonicalAuthorIds).filter(Boolean));
    const pairs = new Set();
    const connected = new Set();
    (mapas.influencias || []).forEach(r => {
      ensureInfluenceCanonicalRefs(r);
      const s = r.fuente_autor_id || canonicalEntityId('aut', r.fuente || '');
      const d = r.destino_autor_id || canonicalEntityId('aut', r.destino_autor || r.destino || '');
      if (!s || !d) return;
      const key = `${s}->${d}`;
      if (pairs.has(key)) return;
      pairs.add(key); // citas repetidas entre la misma pareja cuentan una vez
      if (authorIds.has(s) && readAuthorIds.has(d)) connected.add(d);
      if (authorIds.has(d) && readAuthorIds.has(s)) connected.add(s);
    });
    return connected.size;
  }

  function routeScore(book) {
    const title = norm(book.titulo);
    let incoming = 0, outgoing = 0;
    (mapas.rutas || []).forEach(r => {
      if (norm(r.destino) === title) incoming += 1;
      if (norm(r.fuente) === title) outgoing += 1;
    });
    return { incoming, outgoing };
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

  function historyContinuity(book) {
    if (!belongsToCategory(book, 'historia')) return {score:0, reason:''};
    ensureHistoriaCanonicalRefs(book);
    const targetIds = historyLineIdsForEntry(book);
    const readHistory = readBooks().filter(e => belongsToCategory(e,'historia'));
    const readByLine = new Map();
    readHistory.forEach(e=>{ensureHistoriaCanonicalRefs(e);historyLineIdsForEntry(e).forEach(id=>{if(!readByLine.has(id))readByLine.set(id,[]);readByLine.get(id).push(e);});});
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

  function temporalAffinity(book, category) {
    const target=temporalRangeForBook(book,category);
    if(target.inicio==null)return {score:0,reason:''};
    const refs=readBooks().filter(e=>belongsToCategory(e,category)).map(e=>temporalRangeForBook(e,category)).filter(r=>r.inicio!=null);
    if(!refs.length)return {score:0,reason:''};
    const distances=refs.map(r=>rangeDistance(target,r)).filter(x=>x!=null);
    if(!distances.length)return {score:0,reason:''};
    const gap=Math.min(...distances);
    if(gap<=15)return {score:3,reason:'muy cercano al período de obras que ya has leído'};
    if(gap<=35)return {score:2,reason:'cercano temporalmente a obras que ya has leído'};
    if(gap<=60)return {score:1,reason:'mantiene continuidad temporal con tus lecturas'};
    return {score:0,reason:''};
  }

  function poetryAffinity(book) {
    if(!belongsToCategory(book,'poesía'))return {score:0,reasons:[]};
    const read=readBooks().filter(e=>belongsToCategory(e,'poesía'));
    const reasons=[];let score=0;
    const tradition=book?.poesia?.tradicionId||norm(book?.poesia?.tradicion||'');
    const movement=book?.poesia?.corrienteId||norm(book?.poesia?.corriente||'');
    if(tradition && read.some(e=>(e?.poesia?.tradicionId||norm(e?.poesia?.tradicion||''))===tradition)){score+=2;reasons.push('continúa una tradición poética presente en tus lecturas');}
    if(movement && read.some(e=>(e?.poesia?.corrienteId||norm(e?.poesia?.corriente||''))===movement)){score+=2;reasons.push('coincide con un período o corriente poética que ya lees');}
    const temporal=temporalAffinity(book,'poesía');score+=temporal.score;if(temporal.reason)reasons.push(temporal.reason);
    return {score,reasons};
  }

  function scoreBook(book, counts, category='') {
    const authorAffinity = authorAffinityScore(book, counts);
    const influence = Math.min(5, authorInfluenceScore(book));
    const route = routeScore(book);
    const history = historyContinuity(book);
    const temporal = (category==='novela'||category==='cuentos') ? temporalAffinity(book,category) : {score:0,reason:''};
    const poetry = category==='poesía' ? poetryAffinity(book) : {score:0,reasons:[]};
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
    normalizeCompletionStates();
    const categories = ['historia','poesía','cuentos','novela'];
    const pool = inventoryPool();
    const counts = authorReadCounts();
    const result = {generatedAt:Date.now(), reason, poolCount:pool.length, categories:{}};
    categories.forEach(cat => {
      result.categories[cat] = categoryBooks(cat, pool).map(b => scoreBook(b, counts, cat)).sort((a,b)=>b.score-a.score || String(findBookCanonicalById(a.bookId)?.titulo||'').localeCompare(String(findBookCanonicalById(b.bookId)?.titulo||''),'es')).slice(0,5);
    });
    try { safeLocalSetItem(CACHE_KEY, JSON.stringify(result)); } catch (_) {}
    lastReason = reason;
    return result;
  }

  function load() {
    try { const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); if(x?.categories) return x; } catch (_) {}
    return calculate('sin caché');
  }

  function recalculate(reason='cambio relevante') { dirty=false; dirtyReason=''; return calculate(reason); }
  function invalidate(reason='cambio relevante') { dirty=false; dirtyReason=reason; return recalculate(reason); }
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
    RecommendationEngine.recalculate('lectura recomendada iniciada');
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
  renderDiscoverRecommendations(false);
  openModal('modal-discover');
}

// Compatibilidad con llamadas existentes: desde v189 un "invalidate" recalcula inmediatamente.
function invalidateRecommendations(reason) {
  try { return RecommendationEngine.recalculate(reason || 'cambio relevante'); } catch (err) { console.warn('[LUMEN v189] Recalcular Descubrir:', err); return null; }
}
