// LUMEN v185 — métricas visuales compartidas para mapas.
'use strict';

const GraphMetrics = (() => {
  function endpointId(value) {
    return value && typeof value === 'object' ? value.id : value;
  }

  function degrees(nodes, links) {
    const inDegree = Object.create(null);
    const outDegree = Object.create(null);
    const totalDegree = Object.create(null);
    (nodes || []).forEach(n => {
      inDegree[n.id] = 0;
      outDegree[n.id] = 0;
      totalDegree[n.id] = 0;
    });
    (links || []).forEach(l => {
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      if (s == null || t == null) return;
      outDegree[s] = (outDegree[s] || 0) + 1;
      inDegree[t] = (inDegree[t] || 0) + 1;
      totalDegree[s] = (totalDegree[s] || 0) + 1;
      totalDegree[t] = (totalDegree[t] || 0) + 1;
    });
    return { inDegree, outDegree, totalDegree };
  }

  function uniqueNeighborCounts(nodes, links) {
    const sets = Object.create(null);
    (nodes || []).forEach(n => { sets[n.id] = new Set(); });
    (links || []).forEach(l => {
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      if (s == null || t == null) return;
      if (!sets[s]) sets[s] = new Set();
      if (!sets[t]) sets[t] = new Set();
      sets[s].add(t);
      sets[t].add(s);
    });
    const counts = Object.create(null);
    Object.entries(sets).forEach(([id, set]) => { counts[id] = set.size; });
    return counts;
  }

  function uniqueMoviesByNode(nodes, links, moviePrefix = 'pel_') {
    const sets = Object.create(null);
    (nodes || []).forEach(n => { sets[n.id] = new Set(); });
    (links || []).forEach(l => {
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      if (s == null || t == null) return;
      const sMovie = String(s).startsWith(moviePrefix);
      const tMovie = String(t).startsWith(moviePrefix);
      if (sMovie && !tMovie) {
        if (!sets[t]) sets[t] = new Set();
        sets[t].add(s);
      } else if (tMovie && !sMovie) {
        if (!sets[s]) sets[s] = new Set();
        sets[s].add(t);
      }
    });
    const counts = Object.create(null);
    Object.entries(sets).forEach(([id, set]) => { counts[id] = set.size; });
    return counts;
  }

  function sqrtRadius(score, maxScore, minRadius = 10, maxRadius = 34, floorMax = 1) {
    const safeScore = Math.max(0, Number(score) || 0);
    const safeMax = Math.max(floorMax, Number(maxScore) || 0, 1);
    const ratio = Math.min(1, safeScore / safeMax);
    return minRadius + Math.sqrt(ratio) * (maxRadius - minRadius);
  }

  return { endpointId, degrees, uniqueNeighborCounts, uniqueMoviesByNode, sqrtRadius };
})();

window.GraphMetrics = GraphMetrics;
