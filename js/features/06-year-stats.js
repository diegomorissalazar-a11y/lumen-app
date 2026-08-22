// ═══════════════════════════════════
//  YEAR VIEW
// ═══════════════════════════════════
function changeYear(d) { currentYear += d; renderYear(); }

let yearChartMode = { libros: 'pags', peliculas: 'cantidad', series: 'cantidad' };

function renderYear() {
  document.getElementById('year-display').textContent = currentYear;
  const yr = db.entries.filter(e => parseInt(e.anio) === currentYear);
  const libros = yr.filter(e => e.type === 'libro' && e.estado === 'leido');
  const peliculas = yr.filter(e => e.type === 'pelicula');
  const series = yr.filter(e => e.type === 'serie' && e.estado === 'vista');
  const pagsRegistradas = paginasRegistradasEnAnio(currentYear);
  const pagsTerminados = libros.reduce((a,b) => a+(b.paginas||0), 0);
  const minPels = peliculas.reduce((a,b)=>a+(b.duracion||0),0);
  const minSeries = series.reduce((a,b)=>a+(b.duracion||0),0);

  const prev = db.entries.filter(e => parseInt(e.anio) === currentYear-1);
  const prevLibros = prev.filter(e => e.type==='libro'&&e.estado==='leido');
  const prevRegistradas = paginasRegistradasEnAnio(currentYear-1);
  const prevTerminados = prevLibros.reduce((a,b)=>a+(b.paginas||0),0);
  const vs = (actual, anterior) => anterior > 0 ? `${actual>=anterior?'▲':'▼'} ${actual>=anterior?'+':''}${(((actual/anterior)-1)*100).toFixed(0)}% vs ${currentYear-1}` : '';
  const cls = (actual, anterior) => anterior > 0 ? (actual>=anterior?'up':'down') : '';

  const btnStyle = (key, mode) => yearChartMode[key]===mode
    ? 'padding:5px 10px;border-radius:20px;border:none;background:var(--ink);color:var(--cream);font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;font-family:var(--font-sans);'
    : 'padding:5px 10px;border-radius:20px;border:1.5px solid var(--border);background:#fff;color:var(--ink3);font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;font-family:var(--font-sans);';

  document.getElementById('year-content').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:16px;">
      <div class="stat-box">
        <div class="stat-num">${libros.length}</div>
        <div class="stat-label">Libros terminados</div>
        <div class="stat-vs ${cls(libros.length,prevLibros.length)}">${prevLibros.length>0?vs(libros.length,prevLibros.length):''}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${pagsRegistradas.toLocaleString()}</div>
        <div class="stat-label">Páginas registradas</div>
        <div class="stat-vs ${cls(pagsRegistradas,prevRegistradas)}">${vs(pagsRegistradas,prevRegistradas)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${pagsTerminados.toLocaleString()}</div>
        <div class="stat-label">Págs. de libros terminados</div>
        <div class="stat-vs ${cls(pagsTerminados,prevTerminados)}">${vs(pagsTerminados,prevTerminados)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${peliculas.length}</div>
        <div class="stat-label">Películas</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:2px;">${Math.round(minPels/60)}h · ${minPels} min</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${series.length}</div>
        <div class="stat-label">Series</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:2px;">${Math.round(minSeries/60)}h · ${minSeries} min</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink4);line-height:1.55;margin:-4px 0 14px;padding:10px 12px;background:#fff;border:1px solid var(--border);border-radius:6px;">
      <b>Páginas registradas</b> usa el historial diario por fecha. <b>Páginas de libros terminados</b> suma la extensión completa de los libros cerrados en ${currentYear}.
    </div>

    <!-- LIBROS CHART -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
      <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;font-style:italic;">📚 Lectura por mes</div>
      <div style="display:flex;gap:4px;">
        <button style="${btnStyle('libros','pags')}" onclick="setYearChartMode('libros','pags')">Págs. registradas</button>
        <button style="${btnStyle('libros','cantidad')}" onclick="setYearChartMode('libros','cantidad')">Libros terminados</button>
        <button style="${btnStyle('libros','ritmo')}" onclick="setYearChartMode('libros','ritmo')">Ritmo</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="year-chart-libros"></canvas></div>

    <!-- PELÍCULAS CHART -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px;flex-wrap:wrap;gap:6px;">
      <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;font-style:italic;">🎬 Películas por mes</div>
      <div style="display:flex;gap:4px;">
        <button style="${btnStyle('peliculas','cantidad')}" onclick="setYearChartMode('peliculas','cantidad')">Cantidad</button>
        <button style="${btnStyle('peliculas','minutos')}" onclick="setYearChartMode('peliculas','minutos')">Minutos</button>
        <button style="${btnStyle('peliculas','promedio')}" onclick="setYearChartMode('peliculas','promedio')">Promedio</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="year-chart-peliculas"></canvas></div>

    <!-- SERIES CHART -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px;flex-wrap:wrap;gap:6px;">
      <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;font-style:italic;">📺 Series por mes</div>
      <div style="display:flex;gap:4px;">
        <button style="${btnStyle('series','cantidad')}" onclick="setYearChartMode('series','cantidad')">Cantidad</button>
        <button style="${btnStyle('series','minutos')}" onclick="setYearChartMode('series','minutos')">Minutos</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="year-chart-series"></canvas></div>

    <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;font-style:italic;margin:16px 0 8px;">Libros terminados del año</div>
    ${libros.length===0?'<div style="color:var(--ink4);font-style:italic;font-size:13px;">Ningún libro terminado.</div>':
      [...libros].sort((a,b)=>{return (MESES.indexOf(b.mes)||0)-(MESES.indexOf(a.mes)||0);}).map(e=>`
      <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--cream2);align-items:center;">
        ${coverUrl(e)?`<img src="${coverUrl(e)}" style="width:32px;height:45px;object-fit:cover;border-radius:2px;flex-shrink:0;" onerror="this.style.display='none'">`:'<div style="width:32px;height:45px;background:var(--cream3);border-radius:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;">📚</div>'}
        <div style="flex:1;">
          <div style="font-family:var(--font-serif);font-size:14px;font-weight:700;">${e.titulo}</div>
          <div style="font-size:11px;color:var(--ink3);">${e.autor||''} · ${e.paginas||0} págs · ${e.mes||''}</div>
        </div>
        <div style="font-size:13px;color:var(--gold);">${'★'.repeat(e.rating||0)}</div>
      </div>`).join('')}`;

  renderYearCharts(libros, peliculas, series);
}

function setYearChartMode(key, mode) {
  yearChartMode[key] = mode;
  renderYear();
}

function renderYearCharts(libros, peliculas, series) {
  const diasMes = [31,28,29,31,30,31,30,31,31,30,31,30];

  setTimeout(() => {
    // ── LIBROS ──
    destroyChart('year-chart-libros');
    const ctxL = document.getElementById('year-chart-libros');
    if (ctxL) {
      let dataL, labelL, colorL;
      if (yearChartMode.libros === 'pags') {
        dataL = paginasRegistradasPorMes(currentYear); labelL = 'Páginas registradas'; colorL = 'rgba(200,149,42,0.75)';
      } else if (yearChartMode.libros === 'cantidad') {
        dataL = monthlyCount(libros); labelL = 'Libros'; colorL = 'rgba(45,90,61,0.75)';
      } else {
        dataL = paginasRegistradasPorMes(currentYear).map((p,i)=>p>0?(p/diasMes[i]).toFixed(1):0); labelL = 'Págs registradas/día'; colorL = 'rgba(200,149,42,0.6)';
      }
      new Chart(ctxL.getContext('2d'), {
        type: yearChartMode.libros === 'ritmo' ? 'line' : 'bar',
        data: { labels: MESES_SHORT, datasets: [{ data: dataL, backgroundColor: colorL, borderColor: colorL.replace('0.75','1').replace('0.6','1'), borderWidth: yearChartMode.libros==='ritmo'?2:1, borderRadius: 3, tension: 0.35, fill: yearChartMode.libros==='ritmo', pointRadius: 3 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}} }
      });
    }

    // ── PELÍCULAS ──
    destroyChart('year-chart-peliculas');
    const ctxP = document.getElementById('year-chart-peliculas');
    if (ctxP) {
      const cantP = monthlyCount(peliculas);
      const minP = monthlySum(peliculas,'duracion');
      const useMin = yearChartMode.peliculas === 'minutos' || yearChartMode.peliculas === 'promedio';
      let dataP;
      if (yearChartMode.peliculas === 'cantidad') dataP = cantP;
      else if (yearChartMode.peliculas === 'minutos') dataP = minP;
      else dataP = cantP.map((c,i)=>c>0?Math.round(minP[i]/c):0);
      const fmtP = useMin ? v=>fmtMin(v) : null;
      if (fmtP) {
        new Chart(ctxP.getContext('2d'), { type:'bar',
          data:{ labels:MESES_SHORT, datasets:[{data:dataP, backgroundColor:'rgba(139,32,32,0.75)', borderRadius:3}] },
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmtP(c.parsed.y)}}},
            scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10},callback:fmtP},grid:{color:'#ede7d9'}},x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
        });
      } else {
        new Chart(ctxP.getContext('2d'), { type:'bar',
          data:{ labels:MESES_SHORT, datasets:[{data:dataP, backgroundColor:'rgba(139,32,32,0.75)', borderRadius:3}] },
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
        });
      }
    }

    // ── SERIES ──
    destroyChart('year-chart-series');
    const ctxS = document.getElementById('year-chart-series');
    if (ctxS) {
      const useMinS = yearChartMode.series === 'minutos';
      const dataS = useMinS ? monthlySum(series,'duracion') : monthlyCount(series);
      if (useMinS) {
        new Chart(ctxS.getContext('2d'), { type:'bar',
          data:{ labels:MESES_SHORT, datasets:[{data:dataS, backgroundColor:'rgba(26,58,92,0.75)', borderRadius:3}] },
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmtMin(c.parsed.y)}}},
            scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10},callback:v=>fmtMin(v)},grid:{color:'#ede7d9'}},x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
        });
      } else {
        new Chart(ctxS.getContext('2d'), { type:'bar',
          data:{ labels:MESES_SHORT, datasets:[{data:dataS, backgroundColor:'rgba(26,58,92,0.75)', borderRadius:3}] },
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
        });
      }
    }
  }, 40);
}

// ═══════════════════════════════════
//  STATS — estado global
// ═══════════════════════════════════
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
function parseLocalDateStr(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
}
function diasEntreFechas(inicioStr, finStr) {
  const a = parseLocalDateStr(inicioStr), b = parseLocalDateStr(finStr);
  if (!a || !b) return null;
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 ? diff : null;
}
function fechaLecturaLibro(e) {
  if (!e || e.type !== 'libro') return null;
  if (e.finishDate) return e.finishDate;
  if (Array.isArray(e.readDates) && e.readDates.length) {
    const last = [...e.readDates].filter(r=>r && r.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).pop();
    if (last) return last.date;
  }
  if (e.anio && e.mes && MESES.includes(e.mes)) {
    const y = parseInt(e.anio,10), m = MESES.indexOf(e.mes)+1;
    if (y && m) return new Date(y, m, 0).toISOString().slice(0,10);
  }
  return null;
}
function diasAdquisicionALectura(e) {
  if (!e || e.type !== 'libro' || !e.fecha_adquisicion) return null;
  const lectura = fechaLecturaLibro(e);
  if (!lectura) return null;
  return diasEntreFechas(e.fecha_adquisicion, lectura);
}
function formatDiasEspera(dias) {
  if (dias === null || dias === undefined) return '';
  if (dias === 0) return 'mismo día';
  if (dias === 1) return '1 día';
  const años = Math.floor(dias / 365);
  if (años >= 1) return `${dias.toLocaleString('es-CL')} días (~${años} año${años>1?'s':''})`;
  return `${dias.toLocaleString('es-CL')} días`;
}
function origenAdquisicionLabel(v) {
  const map = { compra:'Compra', regalo:'Regalo', herencia:'Herencia' };
  return map[String(v||'').toLowerCase()] || '';
}
function fechaCL(dateStr) {
  const d = parseLocalDateStr(dateStr);
  return d ? d.toLocaleDateString('es-CL', {day:'2-digit', month:'short', year:'numeric'}) : (dateStr||'');
}
function libroEsperaInfo(e) {
  const dias = diasAdquisicionALectura(e);
  if (dias === null) return null;
  return { dias, fechaLectura: fechaLecturaLibro(e), fechaAdq: e.fecha_adquisicion, origen: e.origen_adquisicion || '' };
}

let statsState = {
  libros:    { year: 'todos', filter: null, filterField: null, sortField: 'anio_original', sortDir: 1, page: 0, chartMode: 'pags' },
  peliculas: { year: 'todos', filter: null, filterField: null, sortField: 'anio_est', sortDir: 1, page: 0, chartMode: 'cantidad' },
  series: { year: 'todos', filter: null, filterField: null, sortField: 'anio_est', sortDir: 1, page: 0 },
  discos: { year: 'todos', filter: null, filterField: null, sortField: 'anio_pub', sortDir: -1, page: 0 },
};
const PAGE_SIZE = 20;

// ── Year navigation ──────────────
function getYears(type) {
  return [...new Set(db.entries.filter(e => e.type === type && e.anio).map(e => e.anio))].sort((a,b)=>a-b);
}

function changeStatsYear(key, dir) {
  const typeMap = { libros: 'libro', peliculas: 'pelicula', series: 'serie', discos: 'disco' };
  const type = typeMap[key] || key;
  const yrs = ['todos', ...getYears(type)];
  const cur = statsState[key].year;
  let idx = yrs.findIndex(y => String(y) === String(cur));
  if (idx === -1) idx = 0;
  idx = Math.max(0, Math.min(yrs.length - 1, idx + dir));
  statsState[key].year = yrs[idx];
  statsState[key].page = 0;
  if (key === 'libros') renderStatsLibros();
  else if (key === 'peliculas') renderStatsPeliculas();
  else if (key === 'series') renderStatsSeries();
  else if (key === 'discos') renderStatsDiscos();
}

function getFiltered(type, key) {
  let items = db.entries.filter(e => e.type === type);
  const yr = statsState[key].year;
  if (yr !== 'todos') items = items.filter(e => e.anio === parseInt(yr) || e.anio === yr);
  return items;
}

function getFilteredWithActive(type, key) {
  let items = getFiltered(type, key);
  const s = statsState[key];
  if (s.filter && s.filterField) items = items.filter(e => (e[s.filterField]||'').trim() === s.filter);
  return items;
}

// ── Utilities ──────────────────
function monthlyCount(items) { return MESES.map(m => items.filter(e => e.mes === m).length); }
function monthlySum(items, field) { return MESES.map(m => items.filter(e=>e.mes===m).reduce((a,b)=>a+(parseFloat(b[field])||0),0)); }

function daysElapsedInYear() {
  const now = new Date();
  return Math.max(1, Math.floor((now - new Date(now.getFullYear(),0,1)) / 86400000) + 1);
}

function bestYear(type, metric) {
  const yrs = getYears(type);
  let best = null, bestVal = -1;
  yrs.forEach(y => { const v = metric(db.entries.filter(e=>e.type===type&&e.anio===y)); if(v>bestVal){bestVal=v;best=y;} });
  return { year: best, value: bestVal };
}

function vsTag(current, best, bYear, unit='') {
  if (!best || best === 0) return '';
  const pct = Math.round(((current - best) / best) * 100);
  const up = pct >= 0;
  return `<span style="color:${up?'var(--green)':'var(--red2)'};font-weight:700;">${up?'▲':'▼'} ${Math.abs(pct)}%</span> vs mejor año (${bYear}: ${best.toLocaleString()}${unit})`;
}

function destroyChart(id) { const c = Chart.getChart(id); if(c) c.destroy(); }

function drawBarChart(id, labels, data, color) {
  destroyChart(id);
  const ctx = document.getElementById(id); if(!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type:'bar', data:{labels, datasets:[{data, backgroundColor:color, borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},
              x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
  });
}

function drawLineChart(id, labels, data, color) {
  destroyChart(id);
  const ctx = document.getElementById(id); if(!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type:'line', data:{labels, datasets:[{data, borderColor:color, backgroundColor:color.replace('rgb(','rgba(').replace(')',',0.08)'), borderWidth:2, pointBackgroundColor:color, tension:0.35, fill:true, pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},
              x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
  });
}

// Bar chart with custom value formatter (e.g. fmtMin for durations)
function drawBarChartFmt(id, labels, data, color, fmt) {
  destroyChart(id);
  const ctx = document.getElementById(id); if(!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type:'bar', data:{labels, datasets:[{data, backgroundColor:color, borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{
      legend:{display:false},
      tooltip:{callbacks:{label:c=>fmt(c.parsed.y)}}
    },
      scales:{y:{beginAtZero:true,
        ticks:{color:'#8a7a68',font:{size:10}, callback: v=>fmt(v)},
        grid:{color:'#ede7d9'}},
        x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}}}}
  });
}

// ── Interactive tops ──────────────
const EXCLUDED_TOP = new Set(['no aplica','varios autores','varios','n/a','na','-','—','sin datos','desconocido','unknown','']);
function isValidTopVal(v) {
  if (!v || !v.trim()) return false;
  return !EXCLUDED_TOP.has(v.trim().toLowerCase());
}

function renderTopInteractive(containerId, items, field, color, key, filterField) {
  const counts = {};
  items.forEach(e => { const v=(e[field]||'').trim(); if(isValidTopVal(v)) counts[v]=(counts[v]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!sorted.length) { el.innerHTML='<div style="color:var(--ink4);font-size:12px;padding:6px 0;">Sin datos.</div>'; return; }
  const max = sorted[0][1];
  const s = statsState[key];
  el.innerHTML = sorted.map(([name,count],i) => {
    const sel = s.filterField===filterField && s.filter===name;
    const dim = s.filterField===filterField && !sel;
    // Use data attributes to avoid apostrophe/quote issues in onclick
    return `<div class="top-int-item ${sel?'selected':''} ${dim?'dimmed':''}"
      data-key="${key}" data-field="${filterField}" data-name="${name.replace(/"/g,'&quot;')}"
      onclick="toggleFilterFromEl(this)">
      <div class="top-int-rank" style="color:${i===0?'var(--gold)':'var(--ink4)'};">${i+1}</div>
      <div class="top-int-name">${name}</div>
      <div class="top-int-count">${count}</div>
      <div class="top-int-bar"><div class="top-int-bar-fill" style="width:${Math.round((count/max)*100)}%;background:${color};"></div></div>
    </div>`;
  }).join('');
}

function toggleFilterFromEl(el) {
  const key   = el.dataset.key;
  const field = el.dataset.field;
  const value = el.dataset.name;
  toggleFilter(key, field, value);
}

function toggleFilter(key, field, value) {
  const s = statsState[key];
  s.filter = (s.filterField===field && s.filter===value) ? null : value;
  s.filterField = s.filter ? field : null;
  s.page = 0;
  if (key==='libros') {
    renderStatsLibros();
  } else if (key==='peliculas') {
    renderStatsPeliculas();
  } else if (key==='series') {
    renderStatsSeries();
  }
}

function clearFilter(key) {
  statsState[key].filter = null; statsState[key].filterField = null; statsState[key].page = 0;
  if (key==='libros') renderStatsLibros();
  else if (key==='peliculas') renderStatsPeliculas();
  else if (key==='series') renderStatsSeries();
  else if (key==='discos') renderStatsDiscos();
}

function activeFilterTag(key) {
  const s = statsState[key];
  if (!s.filter) return '';
  return `<span class="filter-tag">${s.filter} <button onclick="clearFilter('${key}')">×</button></span>`;
}

// ── Pagination ──────────────────
function renderPagination(containerId, total, key) {
  const s = statsState[key];
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) { document.getElementById(containerId).innerHTML=''; return; }
  const cur = s.page;
  document.getElementById(containerId).innerHTML = `
    <button class="pag-btn" onclick="goPage('${key}',${cur-1})" ${cur===0?'disabled':''}>
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <span class="pag-info">${cur+1} / ${totalPages}<br><span style="font-size:10px;font-weight:400;">${total} registros</span></span>
    <button class="pag-btn" onclick="goPage('${key}',${cur+1})" ${cur>=totalPages-1?'disabled':''}>
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
}

function goPage(key, page) {
  statsState[key].page = page;
  if (key==='libros') renderLibrosTabla();
  else if (key==='peliculas') renderPeliculasTabla();
  else if (key==='series') renderSeriesTabla();
  document.getElementById(key==='libros'?'lb-tabla':key==='peliculas'?'pl-tabla':key==='series'?'sr-tabla':'ds-tabla')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ═══════════════════════════════════
//  STATS LIBROS
// ═══════════════════════════════════
let lbChartMode = 'pags';
let lbPagesSource = 'terminados';
function setLbPagesSource(source, btn) {
  lbPagesSource = source;
  document.querySelectorAll('#lb-pages-source .chart-mode-pill').forEach(b=>b.classList.toggle('active', b===btn));
  renderStatsLibros();
}

function setLbChartMode(mode, btn) {
  lbChartMode = mode;
  document.querySelectorAll('#lb-chart-mode-pills .chart-mode-pill').forEach(b=>b.classList.toggle('active',b===btn));
  const yr = statsState.libros.year;
  const libros = getFiltered('libro','libros').filter(e=>e.estado==='leido');
  renderLibrosChart(libros);
}

function renderStatsLibros() {
  const yr = statsState.libros.year;
  const yLabel = yr==='todos' ? 'Todos los años' : String(yr);
  document.getElementById('lb-year-label').textContent = yLabel;

  const allLibros = db.entries.filter(e=>e.type==='libro'&&e.estado==='leido');
  const libros = yr==='todos' ? allLibros : allLibros.filter(e=>e.anio===parseInt(yr)||e.anio===yr);

  // KPIs: se distinguen páginas de libros terminados y lectura registrada
  const totalPagsTerminados = libros.reduce((a,b)=>a+(b.paginas||0),0);
  const totalPagsRegistradas = yr==='todos'
    ? getReadingDailyRecords().reduce((s,r)=>s+r.pags,0)
    : paginasRegistradasEnAnio(parseInt(yr));
  const totalPags = lbPagesSource==='registradas' ? totalPagsRegistradas : totalPagsTerminados;
  const avgPags = libros.length ? Math.round(totalPagsTerminados/libros.length) : 0;
  document.getElementById('lb-kpis').innerHTML = `
    <div class="stat-box"><div class="stat-num">${libros.length}</div><div class="stat-label">Libros terminados</div></div>
    <div class="stat-box"><div class="stat-num">${totalPags.toLocaleString()}</div><div class="stat-label">${lbPagesSource==='registradas'?'Páginas registradas':'Págs. libros terminados'}</div></div>
    <div class="stat-box"><div class="stat-num">${avgPags}</div><div class="stat-label">Pág/libro terminado</div></div>`;
  const kpiWrap = document.getElementById('lb-kpis');
  if (kpiWrap && !document.getElementById('lb-pages-source')) {
    kpiWrap.insertAdjacentHTML('beforebegin', `<div id="lb-pages-source" class="chart-mode-pills" style="justify-content:center;margin:0 0 12px;"><button class="chart-mode-pill ${lbPagesSource==='terminados'?'active':''}" onclick="setLbPagesSource('terminados',this)">Libros terminados</button><button class="chart-mode-pill ${lbPagesSource==='registradas'?'active':''}" onclick="setLbPagesSource('registradas',this)">Lectura registrada</button></div>`);
  } else if (document.getElementById('lb-pages-source')) {
    document.querySelectorAll('#lb-pages-source .chart-mode-pill').forEach((b,i)=>b.classList.toggle('active', (i===0&&lbPagesSource==='terminados')||(i===1&&lbPagesSource==='registradas')));
  }

  // vs best year
  const bestC = bestYear('libro', items=>items.length);
  const bestP = bestYear('libro', items=>items.reduce((a,b)=>a+(b.paginas||0),0));
  if (yr==='todos') {
    document.getElementById('lb-vs-best').innerHTML =
      `Mejor año libros: <b>${bestC.year||'—'}</b> (${bestC.value}) · Mejor año págs. terminadas: <b>${bestP.year||'—'}</b> (${bestP.value.toLocaleString()})`;
  } else {
    document.getElementById('lb-vs-best').innerHTML =
      `${vsTag(libros.length,bestC.value,bestC.year,' libros')}`;
  }

  renderLibrosChart(libros);

  // Tops
  renderTopInteractive('lb-top-autor',   libros,'autor',     'var(--green)',  'libros','autor');
  renderTopInteractive('lb-top-editorial',libros,'editorial','var(--gold)',   'libros','editorial');
  renderTopInteractive('lb-top-traductor',libros,'traductor','var(--blue)',   'libros','traductor');
  renderTopInteractive('lb-top-idioma',   libros,'idioma',   'var(--red)',    'libros','idioma');

  document.getElementById('lb-active-filter').innerHTML = activeFilterTag('libros');
  renderLibrosTabla();
  renderScatterLibros(allLibros);
  renderCuriosidadesLibros(allLibros);
}

function renderLibrosChart(libros) {
  const diasMes = [31,28,29,31,30,31,30,31,31,30,31,30];
  const yr = statsState.libros.year;
  let pagesByMonth;
  if (lbPagesSource === 'registradas') {
    if (yr === 'todos') {
      pagesByMonth = Array(12).fill(0);
      getReadingDailyRecords().forEach(r => { const m=Number(r.fecha.slice(5,7))-1; if(m>=0&&m<12) pagesByMonth[m]+=r.pags; });
    } else pagesByMonth = paginasRegistradasPorMes(parseInt(yr));
  } else pagesByMonth = monthlySum(libros,'paginas');
  setTimeout(() => {
    if (lbChartMode==='pags') {
      drawBarChart('lb-chart-mes', MESES_SHORT, pagesByMonth, 'rgba(200,149,42,0.75)');
    } else if (lbChartMode==='cantidad') {
      drawBarChart('lb-chart-mes', MESES_SHORT, monthlyCount(libros), 'rgba(45,90,61,0.75)');
    } else {
      const ritmos = pagesByMonth.map((p,i)=>p>0?parseFloat((p/diasMes[i]).toFixed(1)):0);
      drawLineChart('lb-chart-mes', MESES_SHORT, ritmos, 'rgb(200,149,42)');
    }
  }, 20);
}

function sortLibros(field, btn) {
  const s = statsState.libros;
  s.sortDir = s.sortField===field ? s.sortDir*-1 : 1;
  s.sortField = field; s.page = 0;
  document.querySelectorAll('#spanel-libros .sort-pill').forEach(b=>b.classList.toggle('active',b===btn));
  renderLibrosTabla();
}

function getBookOriginalPublicationYear(e) {
  const bo=e?.bibliografia?.obraOriginal||{};
  const candidates=[e?.anio_publicacion_original,bo.anioPublicacionOriginal,e?.periodo_publicacion_inicio,bo.periodoInicio,e?.anio_pub];
  for(const value of candidates){const n=Number(value);if(Number.isFinite(n)&&n!==0)return n;}
  return null;
}
function getBookStatsSortValue(e, field) {
  return field==='anio_original' ? (getBookOriginalPublicationYear(e) ?? '') : (e?.[field] ?? '');
}

function renderLibrosTabla() {
  const s = statsState.libros;
  let items = getFilteredWithActive('libro','libros').filter(e=>e.estado==='leido');
  items = items.sort((a,b)=>String(getBookStatsSortValue(a,s.sortField)).localeCompare(String(getBookStatsSortValue(b,s.sortField)),undefined,{numeric:true})*s.sortDir);
  const total = items.length;
  const page = items.slice(s.page*PAGE_SIZE, (s.page+1)*PAGE_SIZE);
  const el = document.getElementById('lb-tabla');
  if (!total) { el.innerHTML='<div style="color:var(--ink4);font-size:13px;padding:8px 0;">Sin libros para mostrar.</div>'; document.getElementById('lb-pagination').innerHTML=''; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Título</th><th>Autor</th><th>Original</th><th>Edición</th><th>Págs</th><th>Leído</th></tr></thead>
    <tbody>${page.map(e=>`<tr>
      <td style="font-family:var(--font-serif);font-weight:700;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${e.titulo.replace(/'/g,'&#39;').replace(/"/g,'&quot;')}">${e.titulo}</td>
      <td class="clickable" data-key="libros" data-field="autor" data-name="${(e.autor||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${e.autor||'—'}</td>
      <td>${getBookOriginalPublicationYear(e)||'—'}</td>
      <td>${e.anio_pub||e.bibliografia?.edicionConsultada?.anio||'—'}</td>
      <td>${(e.paginas||0).toLocaleString()}</td>
      <td style="white-space:nowrap;font-size:11px;">${e.mes||'—'} ${e.anio||''}</td>
    </tr>`).join('')}</tbody></table>`;
  renderPagination('lb-pagination', total, 'libros');
}

function renderScatterLibros(allLibros) {
  destroyChart('lb-chart-scatter');
  const ctx = document.getElementById('lb-chart-scatter'); if(!ctx) return;
  const filtered = statsState.libros.filter
    ? allLibros.filter(e => e[statsState.libros.filterField] === statsState.libros.filter)
    : allLibros;
  const data = filtered.filter(e=>getBookOriginalPublicationYear(e)&&e.paginas&&e.estado!=='leyendo'&&e.estado!=='pendiente').map(e=>({
    x:getBookOriginalPublicationYear(e), y:e.paginas||0, label:e.titulo, autor:e.autor||'—'
  }));
  setTimeout(()=>{
    new Chart(ctx.getContext('2d'), {
      type:'scatter',
      data:{datasets:[{data, backgroundColor:'rgba(45,90,61,0.6)', pointRadius:6, pointHoverRadius:9, borderColor:'rgba(45,90,61,0.9)', borderWidth:1}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.label} · ${c.raw.autor} (${c.raw.x}, ${c.raw.y} págs)`}}},
        scales:{
          x:{title:{display:true,text:'Publicación original',color:'#8a7a68',font:{size:10}},ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},
          y:{title:{display:true,text:'Páginas',color:'#8a7a68',font:{size:10}},ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}}
        }
      }
    });
  },20);
}

function renderScatterPeliculas(allPels) {
  destroyChart('pl-chart-scatter');
  const ctx = document.getElementById('pl-chart-scatter'); if(!ctx) return;
  const filtered = statsState.peliculas.filter
    ? allPels.filter(e => e[statsState.peliculas.filterField] === statsState.peliculas.filter)
    : allPels;
  const data = filtered.filter(e=>e.anio_est&&e.duracion).map(e=>({
    x:parseInt(e.anio_est), y:e.duracion||0, label:e.titulo, dir:e.director||'—'
  }));
  setTimeout(()=>{
    new Chart(ctx.getContext('2d'), {
      type:'scatter',
      data:{datasets:[{data, backgroundColor:'rgba(139,32,32,0.6)', pointRadius:6, pointHoverRadius:9, borderColor:'rgba(139,32,32,0.9)', borderWidth:1}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.label} · ${c.raw.dir} (${c.raw.x}, ${fmtMin(c.raw.y)})`}}},
        scales:{
          x:{title:{display:true,text:'Año estreno',color:'#8a7a68',font:{size:10}},ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}},
          y:{title:{display:true,text:'Duración',color:'#8a7a68',font:{size:10}},ticks:{color:'#8a7a68',font:{size:10},callback:v=>fmtMin(v)},grid:{color:'#ede7d9'}}
        }
      }
    });
  },20);
}

function renderScatterSeries(allSeries) {
  destroyChart('sr-chart-scatter');
  const ctx = document.getElementById('sr-chart-scatter'); if(!ctx) return;
  const filtered = statsState.series.filter
    ? allSeries.filter(e => e[statsState.series.filterField] === statsState.series.filter)
    : allSeries;
  const data = filtered.filter(e=>e.anio_est).map(e=>({
    x: parseInt(e.anio_est),
    y: parseInt(e.temporadas) || 1,
    label: e.titulo,
    dir: e.director||'—'
  }));
  setTimeout(()=>{
    new Chart(ctx.getContext('2d'), {
      type:'scatter',
      data:{datasets:[{data, backgroundColor:'rgba(26,58,92,0.6)', pointRadius:6, pointHoverRadius:9, borderColor:'rgba(26,58,92,0.9)', borderWidth:1}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.label} · ${c.raw.dir} · ${c.raw.y} temp.`}}},
        scales:{
          x:{title:{display:true,text:'Año estreno',color:'#8a7a68',font:{size:10}},ticks:{color:'#8a7a68',font:{size:10},stepSize:1},grid:{color:'#ede7d9'}},
          y:{title:{display:true,text:'Temporadas',color:'#8a7a68',font:{size:10}},ticks:{color:'#8a7a68',font:{size:10},stepSize:1,precision:0},min:0,grid:{color:'#ede7d9'}}
        }
      }
    });
  },20);
}

// ═══════════════════════════════════
//  STATS PELÍCULAS
// ═══════════════════════════════════
let plChartMode = 'cantidad';

function setPlChartMode(mode, btn) {
  plChartMode = mode;
  document.querySelectorAll('#pl-chart-mode-pills .chart-mode-pill').forEach(b=>b.classList.toggle('active',b===btn));
  const pels = getFiltered('pelicula','peliculas');
  renderPeliculasChart(pels);
}

function renderStatsPeliculas() {
  const yr = statsState.peliculas.year;
  document.getElementById('pl-year-label').textContent = yr==='todos'?'Todos los años':String(yr);

  const allPels = db.entries.filter(e=>e.type==='pelicula');
  const pels = yr==='todos' ? allPels : allPels.filter(e=>e.anio===parseInt(yr)||e.anio===yr);

  const totalMin = pels.reduce((a,b)=>a+(b.duracion||0),0);
  const avg = pels.length ? Math.round(totalMin/pels.length) : 0;
  document.getElementById('pl-kpis').innerHTML = `
    <div class="stat-box"><div class="stat-num">${pels.length}</div><div class="stat-label">Películas</div></div>
    <div class="stat-box"><div class="stat-num">${fmtMin(totalMin)}</div><div class="stat-label">Tiempo total</div></div>
    <div class="stat-box"><div class="stat-num">${fmtMin(avg)}</div><div class="stat-label">Prom/película</div></div>`;

  const bestC = bestYear('pelicula', items=>items.length);
  const bestM = bestYear('pelicula', items=>items.reduce((a,b)=>a+(b.duracion||0),0));
  document.getElementById('pl-vs-best').innerHTML = yr==='todos'
    ? `Mejor año: <b>${bestC.year||'—'}</b> (${bestC.value} películas) · <b>${bestM.year||'—'}</b> (${bestM.value.toLocaleString()} min)`
    : vsTag(pels.length, bestC.value, bestC.year, ' películas');

  renderPeliculasChart(pels);
  renderTopInteractive('pl-top-director',pels,'director',  'var(--red)',   'peliculas','director');
  renderTopInteractive('pl-top-guion',   pels,'guionista', 'var(--blue)',  'peliculas','guionista');
  renderTopInteractive('pl-top-musica',  pels,'musica',    'var(--gold)',  'peliculas','musica');
  renderTopInteractive('pl-top-foto',    pels,'fotografia','var(--green)', 'peliculas','fotografia');
  document.getElementById('pl-active-filter').innerHTML = activeFilterTag('peliculas');
  renderPeliculasTabla();
  renderScatterPeliculas(allPels);
  renderCuriosidadesPeliculas(allPels);
}

function renderPeliculasChart(pels) {
  setTimeout(() => {
    const cant = monthlyCount(pels);
    const min  = monthlySum(pels,'duracion');
    if (plChartMode==='cantidad') {
      drawBarChart('pl-chart-mes', MESES_SHORT, cant, 'rgba(139,32,32,0.75)');
    } else if (plChartMode==='minutos') {
      // Show as h:mm labels on y-axis via custom chart
      drawBarChartFmt('pl-chart-mes', MESES_SHORT, min, 'rgba(139,32,32,0.5)', v=>fmtMin(v));
    } else {
      drawBarChartFmt('pl-chart-mes', MESES_SHORT, cant.map((c,i)=>c>0?Math.round(min[i]/c):0), 'rgba(200,149,42,0.75)', v=>fmtMin(v));
    }
  }, 20);
}

function sortPeliculas(field, btn) {
  const s = statsState.peliculas;
  s.sortDir = s.sortField===field ? s.sortDir*-1 : 1;
  s.sortField = field; s.page = 0;
  document.querySelectorAll('#spanel-peliculas .sort-pill').forEach(b=>b.classList.toggle('active',b===btn));
  renderPeliculasTabla();
}

function renderPeliculasTabla() {
  const s = statsState.peliculas;
  let items = getFilteredWithActive('pelicula','peliculas');
  items = items.sort((a,b)=>String(a[s.sortField]||'').localeCompare(String(b[s.sortField]||''),undefined,{numeric:true})*s.sortDir);
  const total = items.length;
  const page = items.slice(s.page*PAGE_SIZE, (s.page+1)*PAGE_SIZE);
  const el = document.getElementById('pl-tabla');
  const ok = v => { if (!v && v !== 0) return false; const s=String(v).trim(); return s !== '' && s.toLowerCase() !== 'no aplica' && s !== '-'; };
  if (!total) { el.innerHTML='<div style="color:var(--ink4);font-size:13px;padding:8px 0;">Sin películas para mostrar.</div>'; document.getElementById('pl-pagination').innerHTML=''; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Título</th><th>Director</th><th>Guión</th><th>Música</th><th>Foto</th><th>Año</th><th>Min</th></tr></thead>
    <tbody>${page.map(e=>`<tr>
      <td style="font-family:var(--font-serif);font-weight:700;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${e.titulo.replace(/'/g,'&#39;').replace(/"/g,'&quot;')}">${e.titulo}</td>
      <td class="clickable" data-key="peliculas" data-field="director" data-name="${(e.director||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.director)?e.director:'—'}</td>
      <td class="clickable" data-key="peliculas" data-field="guionista" data-name="${(e.guionista||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.guionista)?e.guionista:'—'}</td>
      <td class="clickable" data-key="peliculas" data-field="musica" data-name="${(e.musica||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.musica)?e.musica:'—'}</td>
      <td class="clickable" data-key="peliculas" data-field="fotografia" data-name="${(e.fotografia||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.fotografia)?e.fotografia:'—'}</td>
      <td>${e.anio_est||'—'}</td>
      <td>${e.duracion||'—'}</td>
    </tr>`).join('')}</tbody></table>`;
  renderPagination('pl-pagination', total, 'peliculas');
}

// ═══════════════════════════════════
//  STATS SERIES
// ═══════════════════════════════════
let srChartMode = 'cantidad';

function setSrChartMode(mode, btn) {
  srChartMode = mode;
  document.querySelectorAll('#sr-chart-mode-pills .chart-mode-pill').forEach(b=>b.classList.toggle('active',b===btn));
  renderSeriesChart(getFiltered('serie','series'));
}

function changeStatsYear_series(dir) { changeStatsYear('series', dir); }

function renderStatsSeries() {
  const yr = statsState.series.year;
  document.getElementById('sr-year-label').textContent = yr==='todos'?'Todos los años':String(yr);

  const allSeries = db.entries.filter(e=>e.type==='serie' && e.estado!=='viendo' && e.estado!=='pendiente');
  const series = yr==='todos' ? allSeries : allSeries.filter(e=>e.anio===parseInt(yr)||e.anio===yr);
  // Agrupar por título para contar series únicas y temporadas totales
  const byTitle = {};
  series.forEach(e => {
    const key = e.titulo.trim().toLowerCase();
    const tempNum = getTemporadaNum(e) || 1;
    if (!byTitle[key]) byTitle[key] = { titulo: e.titulo, temporadas: 0 };
    byTitle[key].temporadas += tempNum;
  });
  const seriesUnicas = Object.keys(byTitle).length;
  const totalTemp = series.reduce((a,b)=>a+(getTemporadaNum(b)||1),0);

  document.getElementById('sr-kpis').innerHTML = `
    <div class="stat-box"><div class="stat-num">${seriesUnicas}</div><div class="stat-label">Series únicas</div></div>
    <div class="stat-box"><div class="stat-num">${totalTemp}</div><div class="stat-label">Temporadas</div></div>`;

  const bestC = bestYear('serie', items=>items.length);
  document.getElementById('sr-vs-best').innerHTML = yr==='todos'
    ? `Mejor año: <b>${bestC.year||'—'}</b> (${bestC.value} series)`
    : vsTag(series.length, bestC.value, bestC.year, ' series');

  renderSeriesChart(series);

  const ok = v => { if (!v && v !== 0) return false; const s=String(v).trim(); return s !== '' && s.toLowerCase() !== 'no aplica' && s !== '-'; };
  const clean = (arr, f) => arr.filter(e => ok(e[f]));
  renderTopInteractive('sr-top-director',    clean(series,'director'),    'director',    'var(--blue)',  'series','director');
  renderTopInteractive('sr-top-guion',       clean(series,'guionista'),   'guionista',   'var(--gold)',  'series','guionista');
  renderTopInteractive('sr-top-musica',      clean(series,'musica'),      'musica',      'var(--green)', 'series','musica');
  renderTopInteractive('sr-top-protagonista',clean(series,'protagonista'),'protagonista','var(--red)',   'series','protagonista');

  document.getElementById('sr-active-filter').innerHTML = activeFilterTag('series');
  renderSeriesTabla();
  renderScatterSeries(allSeries);
  renderCuriosidadesSeries(allSeries);
}

function renderSeriesChart(series) {
  setTimeout(() => {
    if (srChartMode==='minutos') {
      drawBarChartFmt('sr-chart-mes', MESES_SHORT, monthlySum(series,'duracion'), 'rgba(26,58,92,0.75)', v=>fmtMin(v));
    } else {
      drawBarChart('sr-chart-mes', MESES_SHORT, monthlyCount(series), 'rgba(26,58,92,0.75)');
    }
  }, 20);
}

function sortSeries(field, btn) {
  const s = statsState.series;
  s.sortDir = s.sortField===field ? s.sortDir*-1 : 1;
  s.sortField = field; s.page = 0;
  document.querySelectorAll('#spanel-series .sort-pill').forEach(b=>b.classList.toggle('active',b===btn));
  renderSeriesTabla();
}

function renderSeriesTabla() {
  const s = statsState.series;
  const ok = v => { if (!v && v !== 0) return false; const s=String(v).trim(); return s !== '' && s.toLowerCase() !== 'no aplica' && s !== '-'; };
  let items = getFilteredWithActive('serie','series');
  items = items.sort((a,b)=>String(a[s.sortField]||'').localeCompare(String(b[s.sortField]||''),undefined,{numeric:true})*s.sortDir);
  const total = items.length;
  const page = items.slice(s.page*PAGE_SIZE, (s.page+1)*PAGE_SIZE);
  const el = document.getElementById('sr-tabla');
  if (!total) { el.innerHTML='<div style="color:var(--ink4);font-size:13px;padding:8px 0;">Sin series para mostrar.</div>'; document.getElementById('sr-pagination').innerHTML=''; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Título</th><th>Creador</th><th>Guión</th><th>Música</th><th>Temp.</th><th>Año</th></tr></thead>
    <tbody>${page.map(e=>`<tr>
      <td style="font-family:var(--font-serif);font-weight:700;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${e.titulo.replace(/'/g,'&#39;').replace(/"/g,'&quot;')}">${e.titulo}</td>
      <td class="clickable" data-key="series" data-field="director" data-name="${(e.director||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.director)?e.director:'—'}</td>
      <td class="clickable" data-key="series" data-field="guionista" data-name="${(e.guionista||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.guionista)?e.guionista:'—'}</td>
      <td class="clickable" data-key="series" data-field="musica" data-name="${(e.musica||'').replace(/"/g,'&quot;')}" onclick="toggleFilterFromEl(this)">${ok(e.musica)?e.musica:'—'}</td>
      <td>${getTemporadaNum(e) || '—'}</td>
      <td>${e.anio_est||'—'}</td>
    </tr>`).join('')}</tbody></table>`;
  renderPagination('sr-pagination', total, 'series');
}

// ═══════════════════════════════════
//  CURIOSIDADES por categoría
// ═══════════════════════════════════
// Obtiene el número de temporada de una entrada de serie
// Soporta campo nuevo (temporadas) y campo legacy (coleccion = "1", "2", etc.)
function getTemporadaNum(e) {
  if (e.temporadas) return parseInt(e.temporadas) || null;
  // Legacy: coleccion puede tener "1", "2", "Temporada 1", etc.
  if (e.coleccion) {
    const m = String(e.coleccion).match(/\d+/);
    if (m) return parseInt(m[0]);
  }
  return null;
}

function topField(arr, field) {
  const c = {}; arr.forEach(e => { const v=(e[field]||'').trim(); if(isValidTopVal(v)) c[v]=(c[v]||0)+1; });
  const s = Object.entries(c).sort((a,b)=>b[1]-a[1]); return s[0] || null;
}

function renderCuriosidadesLibros(libros) {
  const el = document.getElementById('lb-curiosidades'); if(!el) return;
  if (!libros.length) { el.innerHTML=''; return; }
  const totalPags = libros.reduce((a,b)=>a+(b.paginas||0),0);
  const avg = libros.length ? Math.round(totalPags/libros.length) : 0;
  const masLargo = libros.reduce((a,b)=>(b.paginas||0)>(a.paginas||0)?b:a, libros[0]);
  const masCorto = libros.filter(e=>e.paginas).reduce((a,b)=>b.paginas<a.paginas?b:a, libros.filter(e=>e.paginas)[0]);
  const topAutor = topField(libros, 'autor');
  const topEdit  = topField(libros, 'editorial');
  const topIdioma= topField(libros, 'idioma');
  const traducidos = libros.filter(e => e.traductor && e.traductor.trim() && e.traductor.trim() !== '-');
  const anios = [...new Set(libros.map(getBookOriginalPublicationYear).filter(Boolean))].sort((a,b)=>a-b);
  const spanAnios = anios.length>=2 ? `${anios[0]}–${anios[anios.length-1]}` : null;

  // Géneros
  const generoCount = {};
  libros.forEach(e => (e.generos||[]).forEach(g => { generoCount[g]=(generoCount[g]||0)+1; }));
  const generosSorted = Object.entries(generoCount).sort((a,b)=>b[1]-a[1]);
  const topGenero = generosSorted[0];
  const librosConGenero = libros.filter(e=>e.generos&&e.generos.length>0).length;
  const esperaLibros = libros
    .map(e => ({ e, info: libroEsperaInfo(e) }))
    .filter(x => x.info && Number.isFinite(x.info.dias));
  const esperaProm = esperaLibros.length ? Math.round(esperaLibros.reduce((a,x)=>a+x.info.dias,0) / esperaLibros.length) : null;
  const esperaRapido = esperaLibros.length ? esperaLibros.reduce((a,b)=>b.info.dias < a.info.dias ? b : a) : null;
  const esperaLento = esperaLibros.length ? esperaLibros.reduce((a,b)=>b.info.dias > a.info.dias ? b : a) : null;
  const esperaPorOrigen = ['compra','regalo','herencia'].map(origen => {
    const arr = esperaLibros.filter(x => String(x.info.origen).toLowerCase() === origen);
    if (!arr.length) return null;
    const prom = Math.round(arr.reduce((a,x)=>a+x.info.dias,0) / arr.length);
    return `${origenAdquisicionLabel(origen)}: ${formatDiasEspera(prom)} (${arr.length})`;
  }).filter(Boolean);
  const esperaPanel = esperaLibros.length ? `
    <div style="margin:12px 0 4px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--cream2);">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);font-weight:700;margin-bottom:6px;">Tiempo en espera antes de lectura</div>
      <div style="font-size:12px;color:var(--ink2);line-height:1.9;">
        📦 Promedio: <b>${formatDiasEspera(esperaProm)}</b>.<br>
        ⚡ Leído más rápido: <b>${escHtml(esperaRapido.e.titulo)}</b> — ${formatDiasEspera(esperaRapido.info.dias)}.<br>
        🐢 Mayor espera: <b>${escHtml(esperaLento.e.titulo)}</b> — ${formatDiasEspera(esperaLento.info.dias)}.<br>
        ${esperaPorOrigen.length ? `<span style="font-size:11px;color:var(--ink4);">${esperaPorOrigen.join(' · ')}</span><br>` : ''}
        <span style="font-size:11px;color:var(--ink4);">${esperaLibros.length} de ${libros.length} libros tienen origen y fecha de adquisición.</span>
      </div>
    </div>` : '';
  const generosBar = generosSorted.length > 0 ? `
    <div style="margin:8px 0 4px;">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);font-weight:700;margin-bottom:6px;">Distribución por género</div>
      ${generosSorted.map(([g,n])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="font-size:12px;color:var(--ink2);width:100px;flex-shrink:0;">${g}</div>
          <div style="flex:1;background:var(--cream3);border-radius:3px;height:8px;">
            <div style="width:${Math.round((n/librosConGenero)*100)}%;background:var(--gold);height:8px;border-radius:3px;"></div>
          </div>
          <div style="font-size:11px;color:var(--ink4);width:30px;text-align:right;">${n}</div>
        </div>`).join('')}
    </div>` : '';

  el.innerHTML = `<div class="card" style="margin-bottom:20px;">
    <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;margin-bottom:10px;">Curiosidades de tus lecturas</div>
    <div style="font-size:13px;color:var(--ink2);line-height:2.1;">
      ${topAutor?`✍ Autor más leído: <b>${topAutor[0]}</b> (${topAutor[1]} libro${topAutor[1]>1?'s':''}).<br>`:''}
      ${topEdit ?`📚 Editorial más frecuente: <b>${topEdit[0]}</b>.<br>`:''}
      ${topIdioma?`🌍 Idioma original más leído: <b>${topIdioma[0]}</b>.<br>`:''}
      ${avg?`📄 Promedio de páginas por libro: <b>${avg}</b>.<br>`:''}
      ${masLargo?`📖 Libro más largo: <b>${masLargo.titulo}</b> (${masLargo.paginas} págs).<br>`:''}
      ${masCorto&&masCorto.id!==masLargo?.id?`📗 Libro más corto: <b>${masCorto.titulo}</b> (${masCorto.paginas} págs).<br>`:''}
      ${traducidos.length>0?`🔤 ${Math.round((traducidos.length/libros.length)*100)}% de tus libros son traducciones.<br>`:''}
      ${spanAnios?`📅 Tus libros abarcan desde <b>${anios[0]}</b> hasta <b>${anios[anios.length-1]}</b>.<br>`:''}
      ${topGenero?`🏷 Género más leído: <b>${topGenero[0]}</b> (${topGenero[1]} libro${topGenero[1]>1?'s':''}).<br>`:''}
      ${librosConGenero>0?`<span style="font-size:11px;color:var(--ink4);">${librosConGenero} de ${libros.length} libros tienen género etiquetado.</span><br>`:''}
    </div>
    ${esperaPanel}
    ${generosBar}
  </div>`;
}

function renderCuriosidadesPeliculas(pels) {
  const el = document.getElementById('pl-curiosidades'); if(!el) return;
  if (!pels.length) { el.innerHTML=''; return; }

  const totalMin  = pels.reduce((a,b)=>a+(b.duracion||0),0);
  const avg       = pels.length ? Math.round(totalMin/pels.length) : 0;
  const conDur    = pels.filter(e=>e.duracion>0);
  const masLarga  = conDur.length ? conDur.reduce((a,b)=>b.duracion>a.duracion?b:a) : null;
  const masCorta  = conDur.length ? conDur.reduce((a,b)=>b.duracion<a.duracion?b:a) : null;
  const topDir    = topField(pels, 'director');
  const topComp   = topField(pels, 'musica');
  const topFoto   = topField(pels, 'fotografia');
  const topIdioma = topField(pels, 'idioma');
  const topProt   = topField(pels, 'protagonista');
  const basadas   = pels.filter(e=>e.basada&&e.basada!=='');

  // Décadas mejoradas — todas con conteo
  const decadas = {};
  pels.forEach(e=>{ if(e.anio_est){ const d=Math.floor(e.anio_est/10)*10; decadas[d]=(decadas[d]||0)+1; } });
  const decadasSorted = Object.entries(decadas).sort((a,b)=>b[1]-a[1]);
  const topDecada = decadasSorted[0] || null;
  const decadasBar = decadasSorted.length > 1 ? `
    <div style="margin:10px 0 4px;">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);font-weight:700;margin-bottom:6px;">Por década</div>
      ${decadasSorted.map(([d,n])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="font-size:12px;color:var(--ink2);width:48px;flex-shrink:0;">${d}s</div>
          <div style="flex:1;background:var(--cream3);border-radius:3px;height:8px;">
            <div style="width:${Math.round((n/decadasSorted[0][1])*100)}%;background:var(--red);height:8px;border-radius:3px;"></div>
          </div>
          <div style="font-size:11px;color:var(--ink4);width:20px;text-align:right;">${n}</div>
        </div>`).join('')}
    </div>` : '';

  // Cruce con libros — películas basadas en libros que también tengo en biblioteca
  const titulosLibros = new Set(db.entries.filter(e=>e.type==='libro').map(e=>e.titulo.toLowerCase().trim()));
  const autoresLibros = new Set(db.entries.filter(e=>e.type==='libro'&&e.autor).map(e=>e.autor.toLowerCase().trim()));
  const cruce = pels.filter(e => {
    if (!e.basada || e.basada==='') return false;
    const tit = (e.titulo||'').toLowerCase();
    const autorOrig = (e.autor_original||'').toLowerCase();
    return titulosLibros.has(tit) || (autorOrig && autoresLibros.has(autorOrig));
  });

  el.innerHTML = `<div class="card" style="margin-bottom:20px;">
    <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;margin-bottom:10px;">Curiosidades de tu cine</div>
    <div style="font-size:13px;color:var(--ink2);line-height:2.1;">
      ${topDir   ?`🎬 Director favorito: <b>${topDir[0]}</b> (${topDir[1]} película${topDir[1]>1?'s':''}).<br>`:''}
      ${topProt  ?`⭐ Protagonista más visto: <b>${topProt[0]}</b>.<br>`:''}
      ${topIdioma?`🌍 Idioma más frecuente: <b>${topIdioma[0]}</b> (${topIdioma[1]} película${topIdioma[1]>1?'s':''}).<br>`:''}
      ${topComp  ?`🎵 Compositor más frecuente: <b>${topComp[0]}</b>.<br>`:''}
      ${topFoto  ?`📷 Fotografía favorita: <b>${topFoto[0]}</b>.<br>`:''}
      ${avg      ?`⏱ Duración media: <b>${fmtMin(avg)}</b> por película.<br>`:''}
      ${masLarga ?`🏆 Más larga: <b>${masLarga.titulo}</b> (${fmtMin(masLarga.duracion)}).<br>`:''}
      ${masCorta && masCorta.id!==masLarga?.id?`⚡ Más corta: <b>${masCorta.titulo}</b> (${fmtMin(masCorta.duracion)}).<br>`:''}
      ${topDecada?`📅 Década favorita: <b>${topDecada[0]}s</b> (${topDecada[1]} película${topDecada[1]>1?'s':''}).<br>`:''}
      ${basadas.length>0?`🔗 El <b>${Math.round((basadas.length/pels.length)*100)}%</b> basado en otra obra.<br>`:''}
      ${cruce.length>0?`📚 <b>${cruce.length}</b> película${cruce.length>1?'s':''} basada${cruce.length>1?'s':''} en libro${cruce.length>1?'s':''} que también tienes en tu biblioteca.<br>`:''}
    </div>
    ${decadasBar}
  </div>`;
}

function renderCuriosidadesSeries(series) {
  const el = document.getElementById('sr-curiosidades'); if(!el) return;
  if (!series.length) { el.innerHTML=''; return; }

  const topDir  = topField(series, 'director');
  const topComp = topField(series, 'musica');
  const topProt = topField(series, 'protagonista');
  const basadas = series.filter(e=>e.basada&&e.basada!=='');

  // Series por temporadas
  const conTemp = series.filter(e=>parseInt(e.temporadas)>0);
  const masTemporadas = conTemp.length ? conTemp.reduce((a,b)=>(parseInt(b.temporadas)||0)>(parseInt(a.temporadas)||0)?b:a) : null;
  const masCorta = conTemp.length ? conTemp.reduce((a,b)=>(parseInt(b.temporadas)||0)<(parseInt(a.temporadas)||0)?b:a) : null;
  const unaSola = series.filter(e=>parseInt(e.temporadas)===1).length;

  // Año con más series
  const porAnio = {};
  series.forEach(e => { if(e.anio) porAnio[e.anio] = (porAnio[e.anio]||0)+1; });
  const mejorAnio = Object.entries(porAnio).sort((a,b)=>b[1]-a[1])[0];

  // Décadas de estreno
  const decadas = {};
  series.forEach(e=>{ if(e.anio_est){ const d=Math.floor(e.anio_est/10)*10; decadas[d]=(decadas[d]||0)+1; } });
  const decadasSorted = Object.entries(decadas).sort((a,b)=>b[1]-a[1]);
  const topDecada = decadasSorted[0] || null;
  const decadasBar = decadasSorted.length > 1 ? `
    <div style="margin:10px 0 4px;">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);font-weight:700;margin-bottom:6px;">Por década de estreno</div>
      ${decadasSorted.map(([d,n])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="font-size:12px;color:var(--ink2);width:48px;flex-shrink:0;">${d}s</div>
          <div style="flex:1;background:var(--cream3);border-radius:3px;height:8px;">
            <div style="width:${Math.round((n/decadasSorted[0][1])*100)}%;background:var(--blue);height:8px;border-radius:3px;"></div>
          </div>
          <div style="font-size:11px;color:var(--ink4);width:20px;text-align:right;">${n}</div>
        </div>`).join('')}
    </div>` : '';

  el.innerHTML = `<div class="card" style="margin-bottom:20px;">
    <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;margin-bottom:10px;">Curiosidades de tus series</div>
    <div style="font-size:13px;color:var(--ink2);line-height:2.1;">
      ${topDir   ?`🎬 Creador favorito: <b>${topDir[0]}</b> (${topDir[1]} serie${topDir[1]>1?'s':''}).<br>`:''}
      ${topProt  ?`⭐ Protagonista más visto: <b>${topProt[0]}</b>.<br>`:''}
      ${topComp  ?`🎵 Compositor más frecuente: <b>${topComp[0]}</b>.<br>`:''}
      ${masTemporadas?`📺 Serie más larga: <b>${masTemporadas.titulo}</b> (${masTemporadas.temporadas} temp.).<br>`:''}
      ${masCorta && masCorta.id!==masTemporadas?.id?`⚡ Serie más corta: <b>${masCorta.titulo}</b> (${masCorta.temporadas} temp.).<br>`:''}
      ${unaSola>0?`🎯 <b>${unaSola}</b> serie${unaSola>1?'s':''} de una sola temporada.<br>`:''}
      ${topDecada?`📅 Década favorita: <b>${topDecada[0]}s</b> (${topDecada[1]} serie${topDecada[1]>1?'s':''}).<br>`:''}
      ${mejorAnio?`🏆 Año con más series: <b>${mejorAnio[0]}</b> (${mejorAnio[1]} series).<br>`:''}
      ${basadas.length>0?`🔗 El <b>${Math.round((basadas.length/series.length)*100)}%</b> basado en otra obra.<br>`:''}
    </div>
    ${decadasBar}
  </div>`;
}

// ═══════════════════════════════════
//  STATS GLOBAL
// ═══════════════════════════════════

// ── DISCOS ───────────────────────
function ok(v) { if (!v && v !== 0) return false; const s=String(v).trim(); return s !== '' && s.toLowerCase() !== 'no aplica' && s !== '-' && s !== '—'; }
function flattenDiscoList(items, field) {
  return items.flatMap(e => Array.isArray(e[field]) ? e[field] : (e[field] ? String(e[field]).split('\n') : [])).map(s=>String(s).trim()).filter(Boolean);
}

function renderStatsDiscos() {
  const yr = statsState.discos.year;
  const allDiscos = db.entries.filter(e=>e.type==='disco');
  const discos = yr==='todos' ? allDiscos : allDiscos.filter(e=>e.anio===parseInt(yr)||e.anio===yr);
  document.getElementById('ds-year-label').textContent = yr==='todos' ? 'Todos los años' : yr;
  const years = [...new Set(allDiscos.map(e=>e.anio).filter(Boolean))].sort((a,b)=>a-b);
  document.getElementById('ds-vs-best').textContent = years.length ? `${years.length} año${years.length!==1?'s':''} con discos` : '';
  const productores = new Set(discos.map(e=>e.productor).filter(ok));
  const sellos = new Set(discos.map(e=>e.discografica).filter(ok));
  const colabs = flattenDiscoList(discos,'colaboraciones');
  document.getElementById('ds-kpis').innerHTML = `
    <div class="stat-box"><div class="stat-num">${discos.length}</div><div class="stat-label">Discos</div></div>
    <div class="stat-box"><div class="stat-num">${new Set(discos.map(e=>e.artista).filter(ok)).size}</div><div class="stat-label">Artistas</div></div>
    <div class="stat-box"><div class="stat-num">${productores.size}</div><div class="stat-label">Productores</div></div>
    <div class="stat-box"><div class="stat-num">${colabs.length}</div><div class="stat-label">Colaboraciones</div></div>`;
  destroyChart('ds-chart-mes');
  drawBarChart('ds-chart-mes', MESES_SHORT, monthlyCount(discos), 'rgba(200,149,42,0.75)');
  renderTopInteractive('ds-top-artista',      discos, 'artista',       'var(--gold)',  'discos','artista');
  renderTopInteractive('ds-top-productor',    discos, 'productor',     'var(--green)', 'discos','productor');
  renderTopInteractive('ds-top-discografica', discos, 'discografica',  'var(--blue)',  'discos','discografica');
  renderTopListFromValues('ds-top-colaboraciones', colabs, 'var(--red)');
  document.getElementById('ds-active-filter').innerHTML = activeFilterTag('discos');
  renderDiscosTabla();
}

function renderTopListFromValues(containerId, values, color) {
  const el = document.getElementById(containerId); if (!el) return;
  const counts = {};
  values.forEach(v => { counts[v] = (counts[v]||0)+1; });
  const arr = Object.entries(counts).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,7);
  if (!arr.length) { el.innerHTML = '<div style="font-size:12px;color:var(--ink4);font-style:italic;">Sin datos</div>'; return; }
  const max = Math.max(...arr.map(x=>x[1]));
  el.innerHTML = arr.map(([name,count],i)=>`
    <div class="top-int-item">
      <div class="top-int-rank">${i+1}</div><div class="top-int-name">${name}</div>
      <div class="top-int-count">${count}</div><div class="top-int-bar"><div class="top-int-bar-fill" style="width:${Math.round(count/max*100)}%;background:${color};"></div></div>
    </div>`).join('');
}

function sortDiscos(field, btn) {
  const s = statsState.discos;
  if (s.sortField === field) s.sortDir *= -1; else { s.sortField = field; s.sortDir = field==='anio_pub' ? -1 : 1; }
  document.querySelectorAll('#spanel-discos .sort-pill').forEach(b=>b.classList.toggle('active',b===btn));
  renderDiscosTabla();
}

function renderDiscosTabla() {
  const s = statsState.discos;
  let items = getFilteredWithActive('disco','discos');
  items = items.sort((a,b)=>{
    let av=a[s.sortField]||'', bv=b[s.sortField]||'';
    if (typeof av==='string') av=av.toLowerCase(); if (typeof bv==='string') bv=bv.toLowerCase();
    return av>bv?s.sortDir:av<bv?-s.sortDir:0;
  });
  const total = items.length;
  const pageItems = items.slice(s.page*20, s.page*20+20);
  document.getElementById('ds-tabla').innerHTML = `<table class="data-table"><thead><tr><th>Disco</th><th>Artista/grupo</th><th>Año pub.</th><th>Productor</th><th>Discográfica</th><th>Escuchado</th><th>Notas</th></tr></thead><tbody>` + pageItems.map(e=>`
    <tr onclick="showDetail('${e.id.replace(/'/g,"\\'")}')" style="cursor:pointer;">
      <td><b>${e.titulo||'—'}</b></td>
      <td class="clickable" data-key="discos" data-field="artista" data-name="${(e.artista||'').replace(/"/g,'&quot;')}" onclick="event.stopPropagation();toggleFilterFromEl(this)">${ok(e.artista)?e.artista:'—'}</td>
      <td>${e.anio_pub||'—'}</td>
      <td class="clickable" data-key="discos" data-field="productor" data-name="${(e.productor||'').replace(/"/g,'&quot;')}" onclick="event.stopPropagation();toggleFilterFromEl(this)">${ok(e.productor)?e.productor:'—'}</td>
      <td class="clickable" data-key="discos" data-field="discografica" data-name="${(e.discografica||'').replace(/"/g,'&quot;')}" onclick="event.stopPropagation();toggleFilterFromEl(this)">${ok(e.discografica)?e.discografica:'—'}</td>
      <td>${[e.mes,e.anio].filter(Boolean).join(' ')||'—'}</td>
      <td>${e.notas_lista?.length||0}</td>
    </tr>`).join('') + `</tbody></table>`;
  renderPagination('ds-pagination', total, 'discos');
}

function renderStatsGlobal() {
  const allYears = [...new Set(db.entries.filter(e=>e.anio).map(e=>e.anio))].sort((a,b)=>a-b);
  const libros = db.entries.filter(e=>e.type==='libro'&&e.estado==='leido');
  const pels   = db.entries.filter(e=>e.type==='pelicula');
  const series = db.entries.filter(e=>e.type==='serie' && e.estado!=='viendo' && e.estado!=='pendiente');
  const discos = db.entries.filter(e=>e.type==='disco');
  const totalPags = libros.reduce((a,b)=>a+(b.paginas||0),0);
  const totalMin  = [...pels,...series].reduce((a,b)=>a+(b.duracion||0),0);
  document.getElementById('gl-kpis').innerHTML = `
    <div class="stat-box"><div class="stat-num">${libros.length}</div><div class="stat-label">Libros</div><div style="font-size:11px;color:var(--ink3);margin-top:3px;">${totalPags.toLocaleString()} págs</div></div>
    <div class="stat-box"><div class="stat-num">${pels.length}</div><div class="stat-label">Películas</div></div>
    <div class="stat-box"><div class="stat-num">${series.length}</div><div class="stat-label">Series</div></div>
    <div class="stat-box"><div class="stat-num">${discos.length}</div><div class="stat-label">Discos</div></div>
    <div class="stat-box"><div class="stat-num">${Math.round(totalMin/60)}h</div><div class="stat-label">En pantalla</div></div>`;
  setTimeout(() => {
    destroyChart('gl-chart-anual');
    const ctx = document.getElementById('gl-chart-anual'); if(!ctx) return;
    new Chart(ctx.getContext('2d'), {
      type:'bar',
      data:{labels:allYears,datasets:[
        {label:'Libros',   data:allYears.map(y=>db.entries.filter(e=>e.type==='libro'&&e.anio===y&&e.estado!=='pendiente').length), backgroundColor:'rgba(45,90,61,0.75)',borderRadius:3},
        {label:'Películas',data:allYears.map(y=>db.entries.filter(e=>e.type==='pelicula'&&e.anio===y).length), backgroundColor:'rgba(139,32,32,0.75)',borderRadius:3},
        {label:'Series',   data:allYears.map(y=>db.entries.filter(e=>e.type==='serie'&&e.anio===y).length), backgroundColor:'rgba(26,58,92,0.75)',borderRadius:3},
        {label:'Discos',   data:allYears.map(y=>db.entries.filter(e=>e.type==='disco'&&e.anio===y).length), backgroundColor:'rgba(200,149,42,0.75)',borderRadius:3},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#4a4035',font:{size:11}}}},
        scales:{x:{ticks:{color:'#8a7a68',font:{size:10}},grid:{display:false}},
                y:{beginAtZero:true,ticks:{color:'#8a7a68',font:{size:10}},grid:{color:'#ede7d9'}}}}
    });
  }, 30);
  const cntF = (arr,f) => { const c={}; arr.forEach(e=>{const v=(e[f]||'').trim();if(v&&v!=='No aplica')c[v]=(c[v]||0)+1;}); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; };
  const allCine = [...pels,...series];
  const topDir = cntF(allCine,'director'), topComp = cntF(allCine,'musica');
  const topEdit = cntF(libros,'editorial'), topAutor = cntF(libros,'autor');
  const basadas = allCine.filter(e=>e.basada&&e.basada!=='');
  document.getElementById('gl-curiosidades').innerHTML = `
    <div class="card">
      <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;margin-bottom:10px;">Curiosidades de tu biblioteca</div>
      <div style="font-size:13px;color:var(--ink2);line-height:2.1;">
        ${topDir?`🎬 Tu director favorito es <b>${topDir[0]}</b> (${topDir[1]} veces).<br>`:''}
        ${topComp?`🎵 Compositor más escuchado: <b>${topComp[0]}</b> (${topComp[1]} BSOs).<br>`:''}
        ${topEdit?`📚 Editorial más leída: <b>${topEdit[0]}</b>.<br>`:''}
        ${topAutor?`✍ Autor más leído: <b>${topAutor[0]}</b>.<br>`:''}
        ${basadas.length>0?`🔗 El ${Math.round((basadas.length/allCine.length)*100)}% de tu cine está basado en otra obra.<br>`:''}
        ${libros.length>0?`📖 Promedio páginas/libro: <b>${Math.round(totalPags/libros.length)}</b>.<br>`:''}
      </div>
    </div>`;
}

