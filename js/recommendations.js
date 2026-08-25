// LUMEN v188 — Descubrir / próximas lecturas desde el inventario
'use strict';

const RecommendationEngine = (() => {
  const CACHE_KEY = 'lumen_recommendations_v1';
  let dirty = true;
  let dirtyReason = 'inicio';

  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const isRead = e => !!(e && (e.estado === 'leido' || e.finishDate || (e.anio && e.mes && e.estado !== 'leyendo')));
  const isAvailable = e => !!(e && e.type === 'libro' && !isRead(e) && e.estado !== 'leyendo' && e.estado !== 'abandonado');
  const hasGenre = (e, genre) => (e.generos || []).some(g => norm(g) === norm(genre));
  const readBooks = () => (db.entries || []).filter(e => e.type === 'libro' && isRead(e));

  function authorReadCounts() {
    const m = new Map();
    readBooks().forEach(e => splitCanonicalAuthors(e.autor || '').forEach(a => {
      const k = norm(a); if (k) m.set(k, (m.get(k) || 0) + 1);
    }));
    return m;
  }

  function authorInfluenceScore(book) {
    const aid = book.autorId || canonicalEntityId('aut', book.autor || '');
    const readAuthorIds = new Set(readBooks().map(e => e.autorId || canonicalEntityId('aut', e.autor || '')).filter(Boolean));
    const pairs = new Set();
    let score = 0;
    (mapas.influencias || []).forEach(r => {
      ensureInfluenceCanonicalRefs(r);
      const s = r.fuente_autor_id || canonicalEntityId('aut', r.fuente || '');
      const d = r.destino_autor_id || canonicalEntityId('aut', r.destino_autor || r.destino || '');
      if (!s || !d) return;
      const key = `${s}->${d}`; if (pairs.has(key)) return; pairs.add(key);
      if ((s === aid && readAuthorIds.has(d)) || (d === aid && readAuthorIds.has(s))) score += 1;
    });
    return score;
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

  function historyContinuity(book) {
    if (!hasGenre(book, 'Historia')) return {score:0, reason:''};
    const line = book.historia?.lineaPrincipalId || book.historia?.lineaPrincipal || '';
    if (!line) return {score:0, reason:''};
    const historicalRead = readBooks().filter(e => hasGenre(e,'Historia') && (e.historia?.lineaPrincipalId || e.historia?.lineaPrincipal) === line);
    if (!historicalRead.length) return {score:2, reason:'abre una línea histórica todavía poco cubierta'};
    const bounds = historyBounds(book.historia || {});
    const centers = historicalRead.map(e => historyBounds(e.historia || {})).filter(b => b.inicio != null || b.fin != null).map(b => ((b.inicio ?? b.fin) + (b.fin ?? b.inicio))/2);
    if ((bounds.inicio != null || bounds.fin != null) && centers.length) {
      const c = ((bounds.inicio ?? bounds.fin) + (bounds.fin ?? bounds.inicio))/2;
      const gap = Math.min(...centers.map(x => Math.abs(x-c)));
      if (gap <= 100) return {score:3, reason:'continúa un período histórico ya en desarrollo'};
      if (gap <= 300) return {score:2, reason:'expande una línea histórica cercana a tus lecturas'};
    }
    return {score:1, reason:'amplía una línea histórica presente en tu mapa'};
  }

  function scoreBook(book) {
    const counts = authorReadCounts();
    const authorAffinity = Math.min(4, counts.get(norm(book.autor)) || 0);
    const influence = Math.min(5, authorInfluenceScore(book));
    const route = routeScore(book);
    const history = historyContinuity(book);
    let score = 10; // disponibilidad real en inventario
    score += authorAffinity * 2;
    score += influence * 2;
    score += Math.min(4, route.incoming) * 2;
    score += Math.min(2, route.outgoing);
    score += history.score * 2;
    const reasons = ['disponible en tu inventario'];
    if (authorAffinity) reasons.push(`ya has leído ${authorAffinity} obra${authorAffinity===1?'':'s'} de este autor`);
    if (influence) reasons.push(`su autor conecta con ${influence} relación${influence===1?'':'es'} de tu canon`);
    if (route.incoming) reasons.push(`aparece como destino en ${route.incoming} ruta${route.incoming===1?'':'s'} de lectura`);
    if (history.reason) reasons.push(history.reason);
    return {bookId:book.id, score, reasons};
  }

  function originalLanguage(book) {
    return book?.bibliografia?.obraOriginal?.idiomaOriginal || book?.idioma || '';
  }

  function categoryBooks(category) {
    const genre = category === 'cuentos' ? 'Cuento' : category.charAt(0).toUpperCase()+category.slice(1);
    const pool = (typeof inventoryBooksUnified === 'function' ? inventoryBooksUnified().books : (db.entries || []).filter(e=>e.enInventario));
    return pool.filter(e => isAvailable(e) && hasGenre(e, genre)).filter(e => {
      if (category !== 'poesía') return true;
      const lang = norm(originalLanguage(e));
      return lang === 'espanol' || lang === 'castellano' || lang === 'spanish';
    });
  }

  function calculate() {
    const categories = ['historia','poesía','cuentos','novela'];
    const result = {generatedAt:Date.now(), categories:{}};
    categories.forEach(cat => {
      result.categories[cat] = categoryBooks(cat).map(scoreBook).sort((a,b)=>b.score-a.score || String(findBookCanonicalById(a.bookId)?.titulo||'').localeCompare(String(findBookCanonicalById(b.bookId)?.titulo||''),'es')).slice(0,5);
    });
    try { safeLocalSetItem(CACHE_KEY, JSON.stringify(result)); } catch (_) {}
    dirty = false; dirtyReason = '';
    return result;
  }

  function load() {
    if (dirty) return calculate();
    try { const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); if(x?.categories) return x; } catch (_) {}
    return calculate();
  }

  function invalidate(reason='cambio relevante') { dirty = true; dirtyReason = reason; }
  function status() { return {dirty, reason:dirtyReason}; }
  return {calculate,load,invalidate,status};
})();

function recommendationCardHTML(rec, idx) {
  const book = findBookCanonicalById(rec.bookId);
  if (!book) return '';
  return `<div class="discover-book-card" onclick="closeModal('modal-discover');showDetail('${String(book.id).replace(/'/g,"\\'")}')">
    <div class="discover-rank">${idx+1}</div>
    <div class="discover-book-content">
      <div class="discover-book-title">${escapeHtml(book.titulo||'Sin título')}</div>
      <div class="discover-book-meta">${escapeHtml(book.autor||'')} ${book.editorial?`· ${escapeHtml(book.editorial)}`:''}</div>
      <div class="discover-book-reasons">${rec.reasons.slice(0,3).map(x=>`• ${escapeHtml(x)}`).join('<br>')}</div>
    </div>
    <div class="discover-score">${Math.round(rec.score)}</div>
  </div>`;
}

function renderDiscoverRecommendations(force=false) {
  const body=document.getElementById('discover-body'); if(!body)return;
  const data=force?RecommendationEngine.calculate():RecommendationEngine.load();
  const labels={historia:'Historia', 'poesía':'Poesía', cuentos:'Cuentos', novela:'Novela'};
  body.innerHTML = `<div class="discover-intro"><div><strong>Próximas lecturas</strong><br><span>Priorizadas desde tu inventario usando historial, autores, rutas, influencias e Historia.</span></div><button class="btn btn-secondary btn-sm" style="width:auto;" onclick="renderDiscoverRecommendations(true)">↻ Recalcular</button></div>`+
    Object.entries(labels).map(([key,label])=>{
      const rows=data.categories[key]||[];
      return `<section class="discover-section"><div class="discover-section-title">${label}</div>${rows.length?rows.map(recommendationCardHTML).join(''):`<div class="discover-empty">No hay candidatos no leídos de ${label.toLowerCase()} en el inventario.</div>`}</section>`;
    }).join('');
}

function openDiscover() {
  renderDiscoverRecommendations(false);
  openModal('modal-discover');
}

function invalidateRecommendations(reason) {
  try { RecommendationEngine.invalidate(reason); } catch (_) {}
}
