// ══════════════════════════════════════════════════════
//  MAPA DE PELÍCULAS — Red social cinematográfica
// ══════════════════════════════════════════════════════

const PEL_ROL_COLORS = {
  director:    '#8b2020',
  fotografia:  '#1a6b8a',
  musica:      '#6b3a8a',
  guionista:   '#2d6b3a',
  protagonista:'#c8952a',
  elenco:      '#5a5a5a',
  pelicula:    '#1a1510'
};

const PEL_ROL_EMOJI = {
  director:'🎭', fotografia:'📷', musica:'🎵',
  guionista:'✍', protagonista:'⭐', elenco:'👤'
};

let rolesActivosPel = new Set(['director','fotografia','musica','guionista','protagonista','elenco']);

function toggleRolPel(btn, rol) {
  if (rolesActivosPel.has(rol)) {
    rolesActivosPel.delete(rol);
    btn.style.opacity = '0.35';
    btn.style.background = '#fff';
    btn.style.color = 'var(--ink3)';
  } else {
    rolesActivosPel.add(rol);
    btn.style.opacity = '1';
    const colores = { director:'#8b2020', fotografia:'#1a6b8a', musica:'#6b3a8a', guionista:'#2d6b3a', protagonista:'#c8952a', elenco:'#5a5a5a' };
    btn.style.background = colores[rol]||'#333';
    btn.style.color = '#fff';
  }
  renderMapaPeliculas();
}

// Nodos contextuales activos (país, productora, género)
let nodosActivosPel = new Set();

function toggleNodoPel(btn, nodo) {
  if (nodosActivosPel.has(nodo)) {
    nodosActivosPel.delete(nodo);
    btn.style.background  = '#fff';
    btn.style.color       = 'var(--ink3)';
    btn.style.borderColor = 'var(--border)';
  } else {
    nodosActivosPel.add(nodo);
    const colores = { pais:'#1a6e3c', productora:'#8b2020', genero:'#5a3e8b' };
    btn.style.background  = colores[nodo] || 'var(--ink)';
    btn.style.color       = '#fff';
    btn.style.borderColor = colores[nodo] || 'var(--ink)';
  }
  renderMapaPeliculas();
}

const PEL_NODO_COLORS = { pais:'#1a6e3c', productora:'#8b2020', genero:'#5a3e8b' };
const PEL_NODO_EMOJI  = { pais:'🌍', productora:'🏢', genero:'🎭' };

function actualizarOpcionesPeriodo() {
  const intervalo = parseInt(document.getElementById('pel-periodo-intervalo')?.value || '5');
  const sel = document.getElementById('pel-periodo-sel');
  if (!sel) return;
  const anios = db.entries
    .filter(e => e.type === 'pelicula' && e.anio_est)
    .map(e => parseInt(e.anio_est));
  if (!anios.length) return;
  const minAnio = Math.min(...anios);
  const maxAnio = Math.max(...anios);
  const inicio  = Math.floor(minAnio / intervalo) * intervalo;
  const fin     = Math.ceil((maxAnio + 1) / intervalo) * intervalo;
  const valorActual = sel.value;
  sel.innerHTML = '<option value="todos">Todos los años</option>';
  for (let y = inicio; y < fin; y += intervalo) {
    const label = y + '–' + (y + intervalo - 1);
    const opt = document.createElement('option');
    opt.value = y + '-' + (y + intervalo - 1);
    opt.textContent = label;
    if (opt.value === valorActual) opt.selected = true;
    sel.appendChild(opt);
  }
  renderMapaPeliculas();
}

function renderMapaPeliculas() {
  const container = document.getElementById('mapa-peliculas-svg');
  const emptyDiv  = document.getElementById('pel-empty');
  const countEl   = document.getElementById('pel-count');

  d3.select('#mapa-peliculas-svg svg').remove();

  // Obtener período seleccionado
  const periodoSel = document.getElementById('pel-periodo-sel')?.value || 'todos';
  let peliculas = db.entries.filter(e => e.type === 'pelicula');

  // Inicializar opciones de período si el selector está vacío
  const periodoSelEl = document.getElementById('pel-periodo-sel');
  if (periodoSelEl && periodoSelEl.options.length <= 1 && peliculas.length) {
    actualizarOpcionesPeriodo();
    return; // actualizarOpcionesPeriodo llama a renderMapaPeliculas al final
  }

  // Filtrar por período
  if (periodoSel !== 'todos') {
    const [desde, hasta] = periodoSel.split('-').map(Number);
    peliculas = peliculas.filter(e => {
      const yr = parseInt(e.anio_est);
      return yr >= desde && yr <= hasta;
    });
  }

  if (!peliculas.length) {
    emptyDiv.style.display = 'flex';
    if (countEl) countEl.textContent = '';
    return;
  }
  emptyDiv.style.display = 'none';

  const nodeMap = new Map();
  const links   = [];
  const ROL_JERARQUIA = { protagonista: 2, elenco: 1 };

  function personaKey(nombre) {
    return nombre.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  }

  function getOrCreateNode(id, label, tipo) {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label, tipo, grado: 0, apariciones: [] });
    }
    return nodeMap.get(id);
  }

  function getOrCreateActorNode(nombre, rol, pelLabel) {
    const id = 'actor_' + personaKey(nombre);
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label: nombre, tipo: rol, grado: 0, apariciones: [] });
    }
    const node = nodeMap.get(id);
    const jerarquiaActual = ROL_JERARQUIA[node.tipo] || 0;
    const jerarquiaNueva  = ROL_JERARQUIA[rol] || 0;
    if (jerarquiaNueva > jerarquiaActual) node.tipo = rol;
    node.apariciones.push({ pelicula: pelLabel, rol });
    return node;
  }

  peliculas.forEach(pel => {
    const pelId    = 'pel_' + pel.id;
    const pelLabel = pel.titulo + (pel.anio_est ? ' (' + pel.anio_est + ')' : '');
    getOrCreateNode(pelId, pelLabel, 'pelicula');

    // Roles con nodo independiente
    const rolesIndep = {
      director:   rolesActivosPel.has('director')   ? (pel.director||'').split(/[,&]/).map(s=>s.trim()).filter(Boolean) : [],
      fotografia: rolesActivosPel.has('fotografia') ? (pel.fotografia||'').split(/[,&]/).map(s=>s.trim()).filter(Boolean) : [],
      musica:     rolesActivosPel.has('musica')     ? (pel.musica||'').split(/[,&]/).map(s=>s.trim()).filter(Boolean) : [],
      guionista:  rolesActivosPel.has('guionista')  ? (pel.guionista||'').split(/[,&]/).map(s=>s.trim()).filter(Boolean) : []
    };
    Object.entries(rolesIndep).forEach(([rol, personas]) => {
      personas.forEach(persona => {
        const pid = 'per_' + rol + '_' + personaKey(persona);
        getOrCreateNode(pid, persona, rol);
        nodeMap.get(pelId).grado++;
        nodeMap.get(pid).grado++;
        links.push({ source: pelId, target: pid, rol });
      });
    });

    // Protagonistas — nodo unificado por actor
    const protas = rolesActivosPel.has('protagonista')
      ? (pel.protagonista||'').split(/[,&]/).map(s=>s.trim()).filter(Boolean) : [];
    protas.forEach(persona => {
      const node = getOrCreateActorNode(persona, 'protagonista', pelLabel);
      nodeMap.get(pelId).grado++;
      node.grado++;
      links.push({ source: pelId, target: node.id, rol: 'protagonista' });
    });

    // Elenco — sin duplicar protagonistas
    const protasLower = protas.map(p => p.toLowerCase());
    const rawElenco = rolesActivosPel.has('elenco') && Array.isArray(pel.elenco) ? pel.elenco : [];
    rawElenco
      .filter(a => !protasLower.includes(a.trim().toLowerCase()))
      .forEach(persona => {
        const node = getOrCreateActorNode(persona, 'elenco', pelLabel);
        nodeMap.get(pelId).grado++;
        node.grado++;
        links.push({ source: pelId, target: node.id, rol: 'elenco' });
      });

    // ── Nodos contextuales (país, productora, género) ──
    if (nodosActivosPel.has('pais') && pel.pais) {
      const nid = 'ctx_pais_' + pel.pais;
      getOrCreateNode(nid, getPaisNombre(pel.pais), 'pais');
      nodeMap.get(pelId).grado++;
      nodeMap.get(nid).grado++;
      links.push({ source: pelId, target: nid, rol: 'pais' });
    }
    if (nodosActivosPel.has('productora') && pel.productora) {
      const prods = pel.productora.split(/[,&]/).map(s=>s.trim()).filter(Boolean).slice(0,3);
      prods.forEach(prod => {
        const nid = 'ctx_prod_' + prod.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
        getOrCreateNode(nid, prod, 'productora');
        nodeMap.get(pelId).grado++;
        nodeMap.get(nid).grado++;
        links.push({ source: pelId, target: nid, rol: 'productora' });
      });
    }
    if (nodosActivosPel.has('genero') && (pel.generos_cine||[]).length) {
      pel.generos_cine.forEach(gen => {
        const nid = 'ctx_gen_' + gen.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
        getOrCreateNode(nid, gen, 'genero');
        nodeMap.get(pelId).grado++;
        nodeMap.get(nid).grado++;
        links.push({ source: pelId, target: nid, rol: 'genero' });
      });
    }
  });

  const conectados = new Set();
  links.forEach(l => { conectados.add(l.source); conectados.add(l.target); });
  const nodes = [...nodeMap.values()].filter(n => conectados.has(n.id));

  if (!nodes.length) {
    emptyDiv.style.display = 'flex';
    emptyDiv.querySelector('div:last-child').textContent = 'Activa algún rol para ver la red.';
    return;
  }

  const personasCount = nodes.filter(n => !['pelicula','pais','productora','genero'].includes(n.tipo)).length;
  const ctxCount = nodes.filter(n => ['pais','productora','genero'].includes(n.tipo)).length;
  if (countEl) countEl.textContent = peliculas.length + ' películas · ' + personasCount + ' personas' + (ctxCount ? ' · ' + ctxCount + ' nodos' : '');

  const W = container.clientWidth  || 600;
  const H = container.clientHeight || 500;

  const svg = d3.select('#mapa-peliculas-svg')
    .append('svg').attr('width', W).attr('height', H);
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d=>d.id)
      .distance(d => ['pais','productora','genero'].includes(d.rol) ? 110 : d.rol==='elenco' ? 70 : 90)
      .strength(0.6))
    .force('charge', d3.forceManyBody().strength(d => {
      if (d.tipo==='pelicula') return -320;
      if (['pais','productora','genero'].includes(d.tipo)) return -280;
      return -120;
    }))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collide', d3.forceCollide().radius(d => {
      if (d.tipo==='pelicula') return 28;
      if (['pais','productora','genero'].includes(d.tipo)) return 26;
      return 18;
    }));

  const linkColor = d => {
    if (['pais','productora','genero'].includes(d.rol)) return PEL_NODO_COLORS[d.rol] || '#aaa';
    return PEL_ROL_COLORS[d.rol] || '#ccc';
  };

  const link = g.append('g').selectAll('line')
    .data(links).join('line')
    .attr('stroke', linkColor)
    .attr('stroke-width', d => ['pais','productora','genero'].includes(d.rol) ? 1.5 : 1.2)
    .attr('stroke-opacity', d => ['pais','productora','genero'].includes(d.rol) ? 0.6 : 0.45)
    .attr('stroke-dasharray', d => ['pais','productora','genero'].includes(d.rol) ? '4,3' : null);

  const node = g.append('g').selectAll('g')
    .data(nodes).join('g')
    .style('cursor','pointer')
    .call(d3.drag()
      .on('start', (ev,d) => { if(!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag',  (ev,d) => { d.fx=ev.x; d.fy=ev.y; })
      .on('end',   (ev,d) => { if(!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

  const esContextual = d => ['pais','productora','genero'].includes(d.tipo);

  node.append('circle')
    .attr('r', d => {
      if (d.tipo==='pelicula') return 18;
      if (esContextual(d))    return 14 + Math.min(d.grado * 1.5, 12);
      return Math.min(8 + d.grado*1.5, 16);
    })
    .attr('fill', d => {
      if (d.tipo==='pelicula') return 'var(--ink)';
      if (esContextual(d))    return PEL_NODO_COLORS[d.tipo] || '#888';
      return PEL_ROL_COLORS[d.tipo] || '#888';
    })
    .attr('stroke', d => d.tipo==='pelicula' ? 'var(--gold)' : esContextual(d) ? '#fff' : '#fff')
    .attr('stroke-width', d => d.tipo==='pelicula' ? 2 : 1.2)
    .attr('fill-opacity', 0.88);

  node.append('text')
    .attr('text-anchor','middle').attr('dominant-baseline','central')
    .attr('font-size', d => d.tipo==='pelicula' ? '12px' : esContextual(d) ? '11px' : '9px')
    .style('pointer-events','none').style('user-select','none')
    .text(d => {
      if (d.tipo==='pelicula') return '🎬';
      if (esContextual(d))    return PEL_NODO_EMOJI[d.tipo] || '◉';
      return PEL_ROL_EMOJI[d.tipo] || '';
    });

  node.append('text')
    .attr('dy', d => d.tipo==='pelicula' ? 28 : esContextual(d) ? 26 : 22)
    .attr('text-anchor','middle')
    .attr('font-size', d => d.tipo==='pelicula' ? '10px' : esContextual(d) ? '10px' : '9px')
    .attr('font-weight', d => (d.tipo==='pelicula' || esContextual(d)) ? '700' : '400')
    .attr('font-family', d => d.tipo==='pelicula' ? 'var(--font-serif)' : 'var(--font-sans)')
    .attr('fill', d => {
      if (d.tipo==='pelicula') return 'var(--ink)';
      if (esContextual(d))    return PEL_NODO_COLORS[d.tipo] || '#555';
      return PEL_ROL_COLORS[d.tipo] || '#555';
    })
    .style('pointer-events','none').style('user-select','none')
    .text(d => {
      const max = d.tipo==='pelicula' ? 22 : esContextual(d) ? 18 : 16;
      return d.label.length > max ? d.label.slice(0, max-1)+'…' : d.label;
    });

  const tooltip = document.getElementById('pel-tooltip');
  node.on('mouseover', (ev, d) => {
    const tipoLabel = {
      pelicula:'Película', director:'Director', fotografia:'Fotografía',
      musica:'Música', guionista:'Guionista', protagonista:'Protagonista', elenco:'Elenco',
      pais:'País', productora:'Productora', genero:'Género'
    }[d.tipo] || d.tipo;

    let html = '<strong>' + d.label + '</strong><br><span style="opacity:0.7;font-size:10px;">' + tipoLabel + '</span>';

    if (esContextual(d)) {
      const relacionadas = peliculas.filter(p => {
        if (d.tipo==='pais')       return getPaisNombre(p.pais||'') === d.label || p.pais === d.label;
        if (d.tipo==='productora') return (p.productora||'').split(/[,\/]/)[0].trim() === d.label;
        if (d.tipo==='genero')     return (p.generos_cine||[]).includes(d.label);
        return false;
      });
      if (relacionadas.length) {
        html += '<div style="margin-top:5px;border-top:1px solid rgba(255,255,255,0.2);padding-top:4px;font-size:10px;opacity:0.85;">';
        relacionadas.slice(0,5).forEach(p => { html += '<div>🎬 ' + p.titulo + (p.anio_est?' ('+p.anio_est+')':'') + '</div>'; });
        if (relacionadas.length > 5) html += '<div>…y ' + (relacionadas.length-5) + ' más</div>';
        html += '</div>';
      }
    } else if (d.apariciones && d.apariciones.length > 0) {
      html += '<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.2);padding-top:5px;">';
      d.apariciones.forEach(ap => {
        const apRol = ap.rol === 'protagonista' ? '⭐ Protagonista' : '👤 Elenco';
        html += '<div style="font-size:10px;opacity:0.85;margin-top:2px;">' + apRol + ' en <em>' + ap.pelicula + '</em></div>';
      });
      html += '</div>';
    }

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
  })
  .on('mousemove', ev => {
    tooltip.style.left = (ev.clientX + 14) + 'px';
    tooltip.style.top  = (ev.clientY - 10) + 'px';
  })
  .on('mouseout', () => { tooltip.style.display = 'none'; });

  sim.on('tick', () => {
    link
      .attr('x1', d=>d.source.x).attr('y1', d=>d.source.y)
      .attr('x2', d=>d.target.x).attr('y2', d=>d.target.y);
    node.attr('transform', d=>'translate(' + d.x + ',' + d.y + ')');
  });
}


// ══════════════════════════════════════════════════════
//  MÓDULO DE NORMALIZACIÓN — Jaro-Winkler deduplication
// ══════════════════════════════════════════════════════

const NORM_BLACKLIST_KEY = 'lumen_norm_blacklist_v1';

function loadNormBlacklist() {
  try { const r = localStorage.getItem(NORM_BLACKLIST_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveNormBlacklist(list, localOnly) {
  safeLocalSetItem(NORM_BLACKLIST_KEY, JSON.stringify(list));
  if (!localOnly && currentUser) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => syncToFirestore(), 800);
  }
}

let normBlacklist = loadNormBlacklist(); // array de strings "nombre1||nombre2"
let normScope = 'peliculas';
let normThreshold = 0.85;

// ── Jaro-Winkler ──
function jaroSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDist < 0) return 0;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end   = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  return (matches/len1 + matches/len2 + (matches - transpositions/2)/matches) / 3;
}

function jaroWinkler(s1, s2) {
  const jaro = jaroSimilarity(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function normStr(s) {
  return (s||'').toLowerCase()
    .replace(/[.,;:]/g, '')   // quitar puntuación
    .replace(/\s+/g, ' ')     // normalizar espacios
    .trim();
}

function blacklistKey(a, b) {
  return [a,b].sort().join('||');
}

function isBlacklisted(a, b) {
  return normBlacklist.includes(blacklistKey(a, b));
}

// ── Extraer todos los nombres por scope ──
function extractNombres(scope) {
  const nombres = new Map(); // nombre_normalizado → nombre_original (primero visto)
  if (scope === 'peliculas') {
    const campos = ['director','fotografia','musica','guionista','protagonista'];
    db.entries.filter(e => e.type === 'pelicula' || e.type === 'serie').forEach(e => {
      campos.forEach(c => {
        if (!e[c]) return;
        e[c].split(/[,&]/).map(s => s.trim()).filter(Boolean).forEach(nombre => {
          const key = normStr(nombre);
          if (!nombres.has(key)) nombres.set(key, nombre);
        });
      });
      (Array.isArray(e.elenco) ? e.elenco : []).forEach(nombre => {
        const key = normStr(nombre);
        if (!nombres.has(key)) nombres.set(key, nombre);
      });
    });
  } else {
    // Influencias y Rutas — nodos de texto
    (mapas.influencias||[]).forEach(inf => {
      [inf.origen, inf.destino].forEach(n => {
        if (!n) return;
        const key = normStr(n);
        if (!nombres.has(key)) nombres.set(key, n);
      });
    });
    (mapas.rutas||[]).forEach(r => {
      [r.origen, r.destino].forEach(n => {
        if (!n) return;
        const key = normStr(n);
        if (!nombres.has(key)) nombres.set(key, n);
      });
    });
  }
  return [...nombres.values()];
}

// ── Detectar pares similares ──
function detectarPares(nombres, threshold) {
  const pares = [];
  for (let i = 0; i < nombres.length; i++) {
    for (let j = i + 1; j < nombres.length; j++) {
      const a = nombres[i], b = nombres[j];
      if (isBlacklisted(a, b)) continue;
      const score = jaroWinkler(normStr(a), normStr(b));
      if (score >= threshold && score < 1) {
        pares.push({ a, b, score });
      }
    }
  }
  // Ordenar: primero los más similares
  return pares.sort((x, y) => y.score - x.score);
}

// ── Aplicar unificación: reemplaza nombre b → a en todos los datos ──
function aplicarUnificacion(canonico, reemplazar) {
  const campos = ['director','fotografia','musica','guionista','protagonista'];

  db.entries.filter(e => e.type === 'pelicula' || e.type === 'serie').forEach(e => {
    let modificado = false;
    campos.forEach(c => {
      if (!e[c]) return;
      const partes = e[c].split(/([,&])/).map(s => {
        const trimmed = s.trim();
        if (normStr(trimmed) === normStr(reemplazar)) { modificado = true; return canonico; }
        return trimmed;
      });
      if (modificado) e[c] = partes.join('');
    });
    if (Array.isArray(e.elenco)) {
      e.elenco = e.elenco.map(n => normStr(n) === normStr(reemplazar) ? canonico : n);
    }
    if (modificado || true) e._updatedAt = Date.now();
  });

  // Influencias y rutas
  (mapas.influencias||[]).forEach(inf => {
    if (normStr(inf.origen)  === normStr(reemplazar)) inf.origen  = canonico;
    if (normStr(inf.destino) === normStr(reemplazar)) inf.destino = canonico;
  });
  (mapas.rutas||[]).forEach(r => {
    if (normStr(r.origen)  === normStr(reemplazar)) r.origen  = canonico;
    if (normStr(r.destino) === normStr(reemplazar)) r.destino = canonico;
  });

  saveDB();
  saveMapas();
  showToast('✓ Unificado: "' + reemplazar + '" → "' + canonico + '"');
  runNormalizacion();
}

// ── UI ──
function setNormScope(scope, btn) {
  normScope = scope;
  document.querySelectorAll('.norm-scope-btn').forEach(b => {
    b.style.background = '#fff';
    b.style.color = 'var(--ink3)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background = 'var(--ink)';
  btn.style.color = '#fff';
  btn.style.borderColor = 'var(--ink)';
  document.getElementById('norm-pares-lista').innerHTML = '';
  document.getElementById('norm-count').textContent = '';
  document.getElementById('norm-empty').style.display = 'flex';
}

function onNormThresholdChange(val) {
  normThreshold = parseInt(val) / 100;
  document.getElementById('norm-threshold-val').textContent = val + '%';
}

function initNormalizacion() {
  switchNormTab('duplicados');
  actualizarBlacklistUI();
}

function runNormalizacion() {
  const nombres = extractNombres(normScope);
  const pares   = detectarPares(nombres, normThreshold);
  const lista   = document.getElementById('norm-pares-lista');
  const empty   = document.getElementById('norm-empty');
  const countEl = document.getElementById('norm-count');

  if (!pares.length) {
    empty.style.display = 'flex';
    empty.querySelector('div:last-child').innerHTML = 'Sin duplicados detectados<br>con el umbral actual.';
    lista.innerHTML = '';
    countEl.textContent = '';
    return;
  }

  empty.style.display = 'none';
  countEl.textContent = pares.length + ' par' + (pares.length !== 1 ? 'es' : '') + ' detectado' + (pares.length !== 1 ? 's' : '');

  lista.innerHTML = pares.map((par, idx) => {
    const pct   = Math.round(par.score * 100);
    const zona  = pct >= 92 ? '#2d6b3a' : '#c8952a';
    const label = pct >= 92 ? 'Alta' : 'Media';
    return `
      <div style="border:1.5px solid var(--border);border-radius:6px;padding:12px;margin-bottom:10px;background:#fff;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="background:${zona};color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;font-family:var(--font-sans);letter-spacing:0.5px;">${label} ${pct}%</span>
          <span style="font-size:11px;color:var(--ink4);">¿Son la misma persona?</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <button onclick="aplicarUnificacion('${par.a.replace(/'/g,"\'")}','${par.b.replace(/'/g,"\'")}'); "
            style="padding:8px;border:2px solid var(--gold);border-radius:4px;background:var(--cream2);font-family:var(--font-serif);font-size:13px;font-weight:700;cursor:pointer;text-align:center;line-height:1.3;">
            ✓ "${par.a}"
          </button>
          <button onclick="aplicarUnificacion('${par.b.replace(/'/g,"\'")}','${par.a.replace(/'/g,"\'")}');"
            style="padding:8px;border:2px solid var(--gold);border-radius:4px;background:var(--cream2);font-family:var(--font-serif);font-size:13px;font-weight:700;cursor:pointer;text-align:center;line-height:1.3;">
            ✓ "${par.b}"
          </button>
        </div>
        <button onclick="descartarPar('${par.a.replace(/'/g,"\'")}','${par.b.replace(/'/g,"\'")}');"
          style="width:100%;padding:6px;border:1.5px solid var(--border);border-radius:4px;background:#fff;font-family:var(--font-sans);font-size:10px;color:var(--ink4);cursor:pointer;font-weight:700;letter-spacing:0.5px;">
          🚫 No es la misma persona
        </button>
      </div>`;
  }).join('');
}

function descartarPar(a, b) {
  const key = blacklistKey(a, b);
  if (!normBlacklist.includes(key)) {
    normBlacklist.push(key);
    saveNormBlacklist(normBlacklist);
  }
  actualizarBlacklistUI();
  runNormalizacion();
}

function toggleNormListaNegra() {
  const panel = document.getElementById('norm-blacklist-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function actualizarBlacklistUI() {
  const countEl = document.getElementById('norm-blacklist-count');
  const listaEl = document.getElementById('norm-blacklist-lista');
  if (countEl) countEl.textContent = normBlacklist.length;
  if (!listaEl) return;
  if (!normBlacklist.length) {
    listaEl.innerHTML = '<span style="color:var(--ink4);font-style:italic;">Sin pares descartados.</span>';
    return;
  }
  listaEl.innerHTML = normBlacklist.map((key, idx) => {
    const [a, b] = key.split('||');
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
      <span>"${a}" / "${b}"</span>
      <button onclick="restaurarPar(${idx})" style="border:none;background:none;cursor:pointer;font-size:10px;color:var(--ink4);padding:2px 4px;">↩ Restaurar</button>
    </div>`;
  }).join('');
}

function restaurarPar(idx) {
  normBlacklist.splice(idx, 1);
  saveNormBlacklist(normBlacklist);
  actualizarBlacklistUI();
  showToast('Par restaurado');
}


// ══════════════════════════════════════════════════════
//  ELENCOS PENDIENTES
// ══════════════════════════════════════════════════════

let elencTipoActual = 'pelicula';
let elencPendientes = [];
let elencIdSeleccionado = null; // guardamos ID en lugar de índice

function switchNormTab(tab) {
  document.getElementById('norm-sub-duplicados').style.display = tab==='duplicados' ? 'flex' : 'none';
  document.getElementById('norm-sub-elencos').style.display    = tab==='elencos'    ? 'flex' : 'none';
  document.getElementById('norm-sub-idiomas').style.display    = tab==='idiomas'    ? 'flex' : 'none';
  ['duplicados','elencos','idiomas'].forEach(t => {
    const btn = document.getElementById('norm-tab-' + t);
    if (!btn) return;
    btn.style.color        = t === tab ? 'var(--gold)' : 'var(--ink4)';
    btn.style.borderBottom = t === tab ? '2px solid var(--gold)' : '2px solid transparent';
  });
  if (tab === 'elencos') {
    elencIdSeleccionado = null;
    // Sincronizar estado visual de botones de tipo con elencTipoActual
    document.querySelectorAll('.elenco-tipo-btn').forEach(b => {
      const esTipo = b.id === 'elenco-tipo-' + elencTipoActual;
      b.style.background  = esTipo ? 'var(--ink)' : '#fff';
      b.style.color       = esTipo ? '#fff' : 'var(--ink3)';
      b.style.borderColor = esTipo ? 'var(--ink)' : 'var(--border)';
    });
    renderElencoPendientes();
  }
  if (tab === 'idiomas') initIdiomasTab();
}

function setElencTipo(tipo, btn) {
  elencTipoActual = tipo;
  document.querySelectorAll('.elenco-tipo-btn').forEach(b => {
    b.style.background  = '#fff';
    b.style.color       = 'var(--ink3)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background  = 'var(--ink)';
  btn.style.color       = '#fff';
  btn.style.borderColor = 'var(--ink)';
  elencIdSeleccionado = null;
  renderElencoPendientes();
}

function renderElencoPendientes(focusId) {
  const tipo = elencTipoActual;
  elencPendientes = db.entries.filter(e => {
    if (tipo !== 'todos' && e.type !== tipo) return false;
    if (e.type !== 'pelicula' && e.type !== 'serie') return false;
    return !(Array.isArray(e.elenco) && e.elenco.length > 0);
  }).sort((a, b) => (a.titulo||'').localeCompare(b.titulo||''));

  const countEl = document.getElementById('elenco-pending-count');
  const listaEl = document.getElementById('elenco-lista');
  const emptyEl = document.getElementById('elenco-lista-empty');
  if (!listaEl || !emptyEl) return;

  if (countEl) countEl.textContent = elencPendientes.length + ' pendiente' + (elencPendientes.length !== 1 ? 's' : '');

  if (!elencPendientes.length) {
    listaEl.innerHTML = '';
    emptyEl.style.display = 'block';
    mostrarEditorElenco(null);
    elencIdSeleccionado = null;
    return;
  }
  emptyEl.style.display = 'none';

  listaEl.innerHTML = elencPendientes.map((e, idx) => {
    const icono = e.type === 'pelicula' ? '🎬' : '📺';
    const anio  = e.anio_est ? ' · ' + e.anio_est : '';
    const dir   = e.director ? '<div style="font-size:10px;color:var(--ink4);margin-top:1px;">' + e.director + '</div>' : '';
    return `<div class="elenco-item" id="elenco-item-${e.id}"
      onclick="seleccionarElencoItem('${e.id}')"
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);border-left:3px solid transparent;transition:background 0.15s;">
      <div style="display:flex;align-items:baseline;gap:6px;">
        <span style="font-size:11px;">${icono}</span>
        <span style="font-family:var(--font-serif);font-size:13px;font-weight:700;line-height:1.3;">${e.titulo}</span>
        <span style="font-size:10px;color:var(--ink4);">${anio}</span>
      </div>
      ${dir}
    </div>`;
  }).join('');

  // Determinar qué ítem mostrar
  let idParaMostrar = focusId || elencIdSeleccionado;
  // Verificar que sigue en la lista
  if (idParaMostrar && !elencPendientes.find(e => e.id === idParaMostrar)) {
    idParaMostrar = null;
  }
  // Si no hay ninguno válido, tomar el primero
  if (!idParaMostrar && elencPendientes.length > 0) {
    idParaMostrar = elencPendientes[0].id;
  }
  if (idParaMostrar) seleccionarElencoItem(idParaMostrar);
}

function seleccionarElencoItem(id) {
  elencIdSeleccionado = id;
  const entry = elencPendientes.find(e => e.id === id);
  // Highlight
  document.querySelectorAll('.elenco-item').forEach(el => {
    const esEste = el.id === 'elenco-item-' + id;
    el.style.background = esEste ? 'var(--cream2)' : '';
    el.style.borderLeft = esEste ? '3px solid var(--gold)' : '3px solid transparent';
  });
  // Scroll al item
  const itemEl = document.getElementById('elenco-item-' + id);
  if (itemEl) itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  mostrarEditorElenco(entry || null);
}

function mostrarEditorElenco(entry) {
  const editorEmpty = document.getElementById('elenco-editor-empty');
  const editorForm  = document.getElementById('elenco-editor-form');
  const infoEl      = document.getElementById('elenco-editor-info');
  const textarea    = document.getElementById('elenco-editor-textarea');
  if (!editorEmpty || !editorForm) return;

  if (!entry) {
    editorEmpty.style.display = 'flex';
    editorForm.style.display  = 'none';
    return;
  }

  editorEmpty.style.display = 'none';
  editorForm.style.display  = 'flex';

  const anio     = entry.anio_est ? ' (' + entry.anio_est + ')' : '';
  const director = entry.director     ? '<span style="font-size:11px;color:var(--ink4);">Dir: ' + entry.director + '</span>' : '';
  const prota    = entry.protagonista ? '<span style="font-size:11px;color:var(--ink4);">⭐ ' + entry.protagonista + '</span>' : '';

  if (infoEl) infoEl.innerHTML = `
    <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;">${entry.titulo}${anio}</div>
    <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;">${director}${prota}</div>`;

  if (textarea) {
    textarea.value = Array.isArray(entry.elenco) ? entry.elenco.join('\n') : '';
    textarea.focus();
  }
}

function guardarElencoEditor() {
  return lumenSafeAction("Guardar elenco", () => {
  if (!elencIdSeleccionado) return;
  const entry    = elencPendientes.find(e => e.id === elencIdSeleccionado);
  if (!entry) return;
  const textarea = document.getElementById('elenco-editor-textarea');
  const lineas   = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!lineas.length) { showToast('Escribe al menos un actor'); return; }

  // Actualizar db.entries en memoria Y en localStorage
  const dbIdx = db.entries.findIndex(e => e.id === entry.id);
  if (dbIdx >= 0) {
    db.entries[dbIdx].elenco     = lineas;
    db.entries[dbIdx]._updatedAt = Date.now();
    // Guardar en localStorage inmediatamente
    safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
    // Sync a Firestore con debounce largo para no saturar
    if (currentUser) {
      clearTimeout(_saveDebounceTimer);
      _saveDebounceTimer = setTimeout(() => { setSyncStatus('syncing'); syncToFirestore(); }, 5000);
    }
    showToast('✓ ' + entry.titulo);
  }

  // Calcular ID del siguiente ANTES de re-renderizar
  const idxActual   = elencPendientes.findIndex(e => e.id === elencIdSeleccionado);
  const siguiente   = elencPendientes[idxActual + 1];
  const siguienteId = siguiente ? siguiente.id : (elencPendientes[0]?.id !== entry.id ? elencPendientes[0]?.id : null);

  elencIdSeleccionado = null;
  renderElencoPendientes(siguienteId);

  });
}

function saltarElencoEditor() {
  if (!elencIdSeleccionado) return;
  const idxActual   = elencPendientes.findIndex(e => e.id === elencIdSeleccionado);
  const siguiente   = elencPendientes[idxActual + 1] || elencPendientes[0];
  if (siguiente && siguiente.id !== elencIdSeleccionado) {
    seleccionarElencoItem(siguiente.id);
  }
}


// ══════════════════════════════════════════════════════
//  NORMALIZACIÓN DE IDIOMAS
// ══════════════════════════════════════════════════════

const IDIOMAS_APROBADOS_KEY = 'lumen_idiomas_aprobados_v1';

// Valores canónicos por defecto
const IDIOMAS_DEFAULT = ['Español','Inglés','Francés','Portugués','Alemán','Italiano','Japonés','Chino','Ruso','Árabe','Catalán','Galego'];

function loadIdiomasAprobados() {
  try {
    const r = localStorage.getItem(IDIOMAS_APROBADOS_KEY);
    return r ? JSON.parse(r) : [...IDIOMAS_DEFAULT];
  } catch { return [...IDIOMAS_DEFAULT]; }
}

function saveIdiomasAprobados(lista, localOnly) {
  safeLocalSetItem(IDIOMAS_APROBADOS_KEY, JSON.stringify(lista));
  if (!localOnly && currentUser) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => syncToFirestore(), 800);
  }
}

let idiomasAprobados = loadIdiomasAprobados();

function initIdiomasTab() {
  renderIdiomasAprobados();
  // No auto-analiza, el usuario pulsa el botón
  const countEl = document.getElementById('idiomas-count');
  if (countEl) countEl.textContent = '';
}

function runIdiomasAnalisis() {
  // Recopilar todos los idiomas distintos en libros
  const mapaValores = new Map(); // valor_normalizado → { original, count, libros[] }

  db.entries.filter(e => e.type === 'libro' && e.idioma && e.idioma.trim()).forEach(e => {
    const raw  = e.idioma.trim();
    const norm = raw.toLowerCase().replace(/[.,;]/g,'').replace(/\s+/g,' ');
    if (!mapaValores.has(norm)) {
      mapaValores.set(norm, { original: raw, count: 0, libros: [] });
    }
    const entry = mapaValores.get(norm);
    entry.count++;
    entry.libros.push(e.titulo || '');
    // Preferir el valor más largo/limpio como original
    if (raw.length > entry.original.length) entry.original = raw;
  });

  const valores = [...mapaValores.values()].sort((a,b) => b.count - a.count);

  // Detectar pares similares entre valores
  const originals = valores.map(v => v.original);
  const pares = [];
  for (let i = 0; i < originals.length; i++) {
    for (let j = i+1; j < originals.length; j++) {
      if (isBlacklisted(originals[i], originals[j])) continue;
      const score = jaroWinkler(normStr(originals[i]), normStr(originals[j]));
      if (score >= 0.82 && score < 1) {
        pares.push({ a: originals[i], b: originals[j], score,
          countA: valores[i].count, countB: valores[j].count });
      }
    }
  }

  const countEl = document.getElementById('idiomas-count');
  if (countEl) countEl.textContent = valores.length + ' valor' + (valores.length!==1?'es':'') + ' distintos en libros';

  document.getElementById('idiomas-en-uso').textContent = '(' + valores.length + ')';
  document.getElementById('idiomas-empty').style.display = valores.length ? 'none' : 'block';

  // Renderizar lista de valores en uso
  const listaEl = document.getElementById('idiomas-valores-lista');
  listaEl.innerHTML = valores.map(v => {
    const esAprobado = idiomasAprobados.some(a => normStr(a) === normStr(v.original));
    const badge = esAprobado
      ? '<span style="font-size:9px;background:#2d6b3a;color:#fff;padding:1px 5px;border-radius:3px;margin-left:4px;">✓</span>'
      : '<span style="font-size:9px;background:var(--red);color:#fff;padding:1px 5px;border-radius:3px;margin-left:4px;">?</span>';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="font-family:var(--font-serif);font-size:13px;">${v.original}</span>
        ${badge}
        <span style="font-size:10px;color:var(--ink4);margin-left:2px;">${v.count} libro${v.count!==1?'s':''}</span>
      </div>
      ${!esAprobado ? `<button onclick="aprobarYUnificarIdioma('${v.original.replace(/'/g,"\'")}')"
        style="padding:3px 7px;border:1.5px solid var(--gold);border-radius:3px;background:#fff;font-family:var(--font-sans);font-size:9px;font-weight:700;color:var(--ink);cursor:pointer;">
        + Aprobar
      </button>` : ''}
    </div>`;
  }).join('') || '<div style="padding:16px;text-align:center;font-size:12px;color:var(--ink4);font-style:italic;">Sin idiomas registrados en libros.</div>';

  // Renderizar pares similares
  const paresEl = document.getElementById('idiomas-pares-lista');
  document.getElementById('idiomas-pares-count').textContent = pares.length ? '(' + pares.length + ')' : '';

  if (!pares.length) {
    paresEl.innerHTML = '<div style="font-size:11px;color:var(--ink4);font-style:italic;padding:6px 0;">Sin duplicados detectados.</div>';
    return;
  }

  paresEl.innerHTML = pares.map(par => {
    const pct  = Math.round(par.score * 100);
    const zona = pct >= 92 ? '#2d6b3a' : '#c8952a';
    return `<div style="border:1.5px solid var(--border);border-radius:5px;padding:8px;margin-bottom:6px;background:#fff;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="background:${zona};color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;">${pct}%</span>
        <span style="font-size:10px;color:var(--ink4);">¿Son el mismo idioma?</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
        <button onclick="unificarIdioma('${par.a.replace(/'/g,"\'")}','${par.b.replace(/'/g,"\'")}')"
          style="padding:5px;border:1.5px solid var(--gold);border-radius:3px;background:var(--cream2);font-family:var(--font-serif);font-size:12px;font-weight:700;cursor:pointer;">
          ✓ "${par.a}" <span style="font-size:9px;color:var(--ink4);font-weight:400;">(${par.countA})</span>
        </button>
        <button onclick="unificarIdioma('${par.b.replace(/'/g,"\'")}','${par.a.replace(/'/g,"\'")}')"
          style="padding:5px;border:1.5px solid var(--gold);border-radius:3px;background:var(--cream2);font-family:var(--font-serif);font-size:12px;font-weight:700;cursor:pointer;">
          ✓ "${par.b}" <span style="font-size:9px;color:var(--ink4);font-weight:400;">(${par.countB})</span>
        </button>
      </div>
      <button onclick="descartarPar('${par.a.replace(/'/g,"\'")}','${par.b.replace(/'/g,"\'")}')"
        style="width:100%;padding:4px;border:1.5px solid var(--border);border-radius:3px;background:#fff;font-family:var(--font-sans);font-size:9px;color:var(--ink4);cursor:pointer;font-weight:700;">
        🚫 No es el mismo idioma
      </button>
    </div>`;
  }).join('');
}

function unificarIdioma(canonico, reemplazar) {
  db.entries.filter(e => e.type === 'libro' && e.idioma).forEach(e => {
    if (normStr(e.idioma) === normStr(reemplazar)) {
      e.idioma = canonico;
      e._updatedAt = Date.now();
    }
  });
  // Agregar canónico a aprobados si no está
  if (!idiomasAprobados.some(a => normStr(a) === normStr(canonico))) {
    idiomasAprobados.push(canonico);
    saveIdiomasAprobados(idiomasAprobados);
  }
  saveDB();
  showToast('✓ Unificado: "' + reemplazar + '" → "' + canonico + '"');
  runIdiomasAnalisis();
  renderIdiomasAprobados();
}

function aprobarYUnificarIdioma(valor) {
  // Si ya hay un aprobado similar, preguntar cuál es el canónico
  const similar = idiomasAprobados.find(a => jaroWinkler(normStr(a), normStr(valor)) >= 0.82);
  if (similar) {
    // Unificar con el aprobado existente
    unificarIdioma(similar, valor);
  } else {
    // Simplemente aprobar
    if (!idiomasAprobados.some(a => normStr(a) === normStr(valor))) {
      idiomasAprobados.push(valor);
      saveIdiomasAprobados(idiomasAprobados);
      renderIdiomasAprobados();
    }
    // Normalizar capitalización en los datos
    db.entries.filter(e => e.type === 'libro' && e.idioma && normStr(e.idioma) === normStr(valor)).forEach(e => {
      e.idioma = valor;
      e._updatedAt = Date.now();
    });
    saveDB();
    showToast('✓ "' + valor + '" aprobado');
    runIdiomasAnalisis();
  }
}

function agregarIdiomaAprobado() {
  const input = document.getElementById('idiomas-nuevo-aprobado');
  const val   = (input.value || '').trim();
  if (!val) return;
  if (idiomasAprobados.some(a => normStr(a) === normStr(val))) {
    showToast('Ya existe en la lista'); return;
  }
  idiomasAprobados.push(val);
  saveIdiomasAprobados(idiomasAprobados);
  input.value = '';
  renderIdiomasAprobados();
  runIdiomasAnalisis();
  showToast('✓ "' + val + '" agregado a valores aprobados');
}

function renderIdiomasAprobados() {
  const listaEl = document.getElementById('idiomas-aprobados-lista');
  if (!listaEl) return;
  if (!idiomasAprobados.length) {
    listaEl.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--ink4);font-style:italic;">Sin valores aprobados aún.</div>';
    return;
  }
  listaEl.innerHTML = [...idiomasAprobados].sort().map((idioma, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--border);">
      <span style="font-family:var(--font-serif);font-size:13px;">🌐 ${idioma}</span>
      <button onclick="eliminarIdiomaAprobado(${idx})"
        style="border:none;background:none;cursor:pointer;font-size:11px;color:var(--ink4);padding:2px 4px;" title="Quitar de aprobados">✕</button>
    </div>`).join('');
}

function eliminarIdiomaAprobado(idx) {
  idiomasAprobados.splice(idx, 1);
  saveIdiomasAprobados(idiomasAprobados);
  renderIdiomasAprobados();
  runIdiomasAnalisis();
}


// ══════════════════════════════════════════════════════
//  GÉNEROS CINEMATOGRÁFICOS
// ══════════════════════════════════════════════════════

function toggleGeneroCine(btn) {
  const seleccionados = document.querySelectorAll('.fp-genero-btn[data-selected="1"]');
  const estaSeleccionado = btn.getAttribute('data-selected') === '1';
  if (!estaSeleccionado && seleccionados.length >= 2) {
    showToast('Máximo 2 géneros'); return;
  }
  if (estaSeleccionado) {
    btn.removeAttribute('data-selected');
    btn.style.background = '#fff';
    btn.style.color = 'var(--ink3)';
    btn.style.borderColor = 'var(--border)';
  } else {
    btn.setAttribute('data-selected','1');
    btn.style.background = 'var(--ink)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--ink)';
  }
}

function getGenerosCineSeleccionados() {
  return [...document.querySelectorAll('.fp-genero-btn[data-selected="1"]')]
    .map(b => b.getAttribute('data-g'));
}

function setGenerosCineSeleccionados(generos) {
  document.querySelectorAll('.fp-genero-btn').forEach(btn => {
    const estaSeleccionado = (generos||[]).includes(btn.getAttribute('data-g'));
    btn.setAttribute('data-selected', estaSeleccionado ? '1' : '0');
    if (estaSeleccionado) {
      btn.setAttribute('data-selected','1');
      btn.style.background = 'var(--ink)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--ink)';
    } else {
      btn.removeAttribute('data-selected');
      btn.style.background = '#fff';
      btn.style.color = 'var(--ink3)';
      btn.style.borderColor = 'var(--border)';
    }
  });
}

// ══════════════════════════════════════════════════════
//  MAPA DE PAÍSES ISO → NOMBRE
// ══════════════════════════════════════════════════════
const PAIS_NOMBRE = {"AR": "Argentina", "AU": "Australia", "AT": "Austria", "BE": "Bélgica", "BR": "Brasil", "CA": "Canadá", "CL": "Chile", "CN": "China", "CO": "Colombia", "HR": "Croacia", "CZ": "República Checa", "DK": "Dinamarca", "EG": "Egipto", "FI": "Finlandia", "FR": "Francia", "DE": "Alemania", "GR": "Grecia", "HK": "Hong Kong", "HU": "Hungría", "IN": "India", "ID": "Indonesia", "IR": "Irán", "IE": "Irlanda", "IL": "Israel", "IT": "Italia", "JP": "Japón", "KR": "Corea del Sur", "MX": "México", "MA": "Marruecos", "NL": "Países Bajos", "NZ": "Nueva Zelanda", "NO": "Noruega", "PK": "Pakistán", "PE": "Perú", "PL": "Polonia", "PT": "Portugal", "RO": "Rumanía", "RU": "Rusia", "ZA": "Sudáfrica", "ES": "España", "SE": "Suecia", "CH": "Suiza", "TW": "Taiwán", "TH": "Tailandia", "TR": "Turquía", "UA": "Ucrania", "GB": "Reino Unido", "US": "Estados Unidos", "VE": "Venezuela", "VN": "Vietnam", "YU": "Yugoslavia"};
function getPaisNombre(iso) { return PAIS_NOMBRE[iso] || iso || ''; }

// ══════════════════════════════════════════════════════
//  WIKIPEDIA MASIVO + ROLLBACK
// ══════════════════════════════════════════════════════
const WIKI_ROLLBACK_KEY = 'lumen_wiki_rollback_v1';

function saveWikiRollback() {
  const snapshot = db.entries
    .filter(e => e.type === 'pelicula')
    .map(e => ({ id: e.id, pais: e.pais, productora: e.productora, generos_cine: e.generos_cine }));
  safeLocalSetItem(WIKI_ROLLBACK_KEY, JSON.stringify({ ts: Date.now(), snapshot }));
}

function rollbackWikiImport() {
  const data = localStorage.getItem(WIKI_ROLLBACK_KEY);
  if (!data) { showToast('Sin importación previa para deshacer'); return; }
  const { ts, snapshot } = JSON.parse(data);
  const fecha = new Date(ts).toLocaleString('es-CL');
  if (!confirm('¿Deshacer importación del ' + fecha + '? Se revertirán país, productora y género de todas las películas modificadas.')) return;
  snapshot.forEach(snap => {
    const idx = db.entries.findIndex(e => e.id === snap.id);
    if (idx >= 0) {
      db.entries[idx].pais        = snap.pais;
      db.entries[idx].productora  = snap.productora;
      db.entries[idx].generos_cine = snap.generos_cine;
      db.entries[idx]._updatedAt  = Date.now();
    }
  });
  saveDB();
  localStorage.removeItem(WIKI_ROLLBACK_KEY);
  showToast('↩ Importación deshecha');
  renderBiblioteca();
}

async function wikiCompletarFicha(entryId) {
  const entry = db.entries.find(e => e.id === entryId);
  if (!entry) return;
  const titulo = entry.titulo;
  const anio   = entry.anio_est || '';

  showToast('⏳ Buscando en Wikipedia...');
  try {
    // Buscar por título + año en Wikipedia en español primero, luego inglés
    const query = encodeURIComponent(titulo + (anio ? ' ' + anio : '') + ' película');
    const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srlimit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    const firstResult = searchJson.query?.search?.[0];
    if (!firstResult) throw new Error('No encontrado');

    const articleTitle = firstResult.title;
    const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`;
    const res = await fetch(apiUrl);
    const json = await res.json();
    const page = Object.values(json.query?.pages||{})[0];
    if (!page || page.missing) throw new Error('Página no encontrada');

    const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';
    const fields = parseWikipediaInfobox(wikitext);
    fields._articleTitle = articleTitle;
    return fields;
  } catch(e) {
    showToast('⚠ No encontrado: ' + titulo);
    return null;
  }
}

async function wikiCompletarIndividual(entryId) {
  const fields = await wikiCompletarFicha(entryId);
  if (!fields) return;
  const entry = db.entries.find(e => e.id === entryId);
  if (!entry) return;

  // Construir previsualización
  const preview = [];
  if (fields.pais && !entry.pais)              preview.push('🌍 País: ' + getPaisNombre(fields.pais));
  if (fields.productora && !entry.productora)  preview.push('🏢 Productora: ' + fields.productora);
  if (fields.generos_cine && !(entry.generos_cine||[]).length) preview.push('🎭 Género: ' + fields.generos_cine.join(', '));
  if (fields.director && !entry.director)      preview.push('Director: ' + fields.director);
  if (fields.fotografia && !entry.fotografia)  preview.push('Fotografía: ' + fields.fotografia);
  if (fields.musica && !entry.musica)          preview.push('Música: ' + fields.musica);

  if (!preview.length) { showToast('Sin datos nuevos para ' + entry.titulo); return; }

  const modal = document.getElementById('modal-wiki-preview');
  const body  = document.getElementById('wiki-preview-body');
  const title = document.getElementById('wiki-preview-title');
  if (!modal) { showToast('Error interno'); return; }

  title.textContent = entry.titulo + (entry.anio_est ? ' (' + entry.anio_est + ')' : '');
  document.getElementById('wiki-preview-source').textContent = fields._articleTitle || '';
  body.innerHTML = preview.map(p => `<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;">✓ ${p}</div>`).join('');

  modal.style.display = 'flex';
  modal._pendingFields = fields;
  modal._pendingId = entryId;
}

function wikiPreviewConfirmar() {
  const modal = document.getElementById('modal-wiki-preview');
  const fields = modal._pendingFields;
  const entryId = modal._pendingId;
  if (!fields || !entryId) return;
  const idx = db.entries.findIndex(e => e.id === entryId);
  if (idx >= 0) {
    if (fields.pais && !db.entries[idx].pais)             db.entries[idx].pais = fields.pais;
    if (fields.productora && !db.entries[idx].productora) db.entries[idx].productora = fields.productora;
    if (fields.generos_cine && !(db.entries[idx].generos_cine||[]).length) db.entries[idx].generos_cine = fields.generos_cine;
    if (fields.director && !db.entries[idx].director)     db.entries[idx].director = fields.director;
    if (fields.fotografia && !db.entries[idx].fotografia) db.entries[idx].fotografia = fields.fotografia;
    if (fields.musica && !db.entries[idx].musica)         db.entries[idx].musica = fields.musica;
    db.entries[idx]._updatedAt = Date.now();
    saveDB();
    showToast('✓ Guardado: ' + db.entries[idx].titulo);
  }
  modal.style.display = 'none';
  renderBiblioteca();
}

function wikiPreviewCancelar() {
  const modal = document.getElementById('modal-wiki-preview');
  if (modal) modal.style.display = 'none';
}

// Importación masiva
async function wikiMasivo() {
  const peliculas = db.entries.filter(e => e.type === 'pelicula' && (!e.pais || !e.productora || !(e.generos_cine||[]).length));
  if (!peliculas.length) { showToast('Todas las películas ya tienen estos datos'); return; }

  const modal = document.getElementById('modal-wiki-masivo');
  if (!modal) return;
  document.getElementById('wiki-masivo-count').textContent = peliculas.length;
  modal.style.display = 'flex';
}

async function wikiMasivoConfirmar() {
  const modal = document.getElementById('modal-wiki-masivo');
  if (modal) modal.style.display = 'none';

  const peliculas = db.entries.filter(e => e.type === 'pelicula' && (!e.pais || !e.productora || !(e.generos_cine||[]).length));
  saveWikiRollback();

  let ok = 0, fail = 0;
  for (const pel of peliculas) {
    await new Promise(r => setTimeout(r, 400)); // throttle
    const fields = await wikiCompletarFicha(pel.id);
    if (!fields) { fail++; continue; }
    const idx = db.entries.findIndex(e => e.id === pel.id);
    if (idx < 0) continue;
    if (fields.pais && !db.entries[idx].pais)             db.entries[idx].pais = fields.pais;
    if (fields.productora && !db.entries[idx].productora) db.entries[idx].productora = fields.productora;
    if (fields.generos_cine && !(db.entries[idx].generos_cine||[]).length) db.entries[idx].generos_cine = fields.generos_cine;
    db.entries[idx]._updatedAt = Date.now();
    ok++;
    if (ok % 5 === 0) showToast('⏳ ' + ok + '/' + peliculas.length + ' procesadas...');
  }
  saveDB();
  showToast('✓ Completadas: ' + ok + ' · Sin datos: ' + fail);
  renderBiblioteca();
}

