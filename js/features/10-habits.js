//  HÁBITOS — RACHAS, HEATMAP, COMPARADOR
// ═══════════════════════════════════

// Collect all reading activity dates from entries
function getAllReadDates() {
  const dates = new Set();
  db.entries.forEach(e => {
    // readDates soporta string[] (legado) y {date,pag}[] (nuevo)
    if (e.readDates) readDatesToStrings(e.readDates).forEach(d => dates.add(d));
    // finishDate solo si el libro fue terminado (no en curso)
    if (e.finishDate && e.estado === 'leido') dates.add(e.finishDate.split('T')[0]);
  });
  return dates;
}

// Páginas leídas por día — combina todos los libros
function getActivityByDate() {
  const map = {}; // date → pages read
  db.entries.filter(e => e.type === 'libro').forEach(e => {
    if (!e.readDates || e.readDates.length === 0) {
      // Sin readDates: solo marcar finishDate si existe
      if (e.finishDate && e.estado === 'leido') {
        const d = e.finishDate.split('T')[0];
        map[d] = (map[d] || 0) + (e.paginas ? Math.round(e.paginas * 0.05) : 1);
      }
      return;
    }
    const norm = normalizeReadDates(e.readDates);
    const conPag = norm.filter(r => r.pag !== null);
    if (conPag.length >= 2) {
      // Nuevo formato: usar diferencias entre marcas de página
      const byDay = calcPagsByDay(e.readDates);
      Object.entries(byDay).forEach(([d, pags]) => {
        if (pags > 0) map[d] = (map[d] || 0) + pags;
      });
    } else {
      // Legado: distribuir páginas totales entre días con actividad
      const paginasLeidas = e.readingMode === 'pag'
        ? (e.progresoPag || 0)
        : Math.round(((e.progreso||0)/100) * (e.paginas||0));
      const pgsPerDay = paginasLeidas > 0
        ? Math.round(paginasLeidas / norm.length)
        : 1;
      norm.forEach(r => { map[r.date] = (map[r.date] || 0) + pgsPerDay; });
    }
    // finishDate
    if (e.finishDate && e.estado === 'leido') {
      const d = e.finishDate.split('T')[0];
      if (!map[d]) map[d] = (e.paginas ? Math.round(e.paginas * 0.05) : 1);
    }
  });
  return map;
}

function calcStreaks() {
  const dates = [...getAllReadDates()].sort();
  if (dates.length === 0) return { current: 0, best: 0, bestStart: null, bestEnd: null, total: 0 };
  let current = 0, best = 0, bestStart = null, bestEnd = null;
  let streak = 1, streakStart = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i-1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      if (streak > best) { best = streak; bestStart = streakStart; bestEnd = dates[i-1]; }
      streak = 1; streakStart = dates[i];
    }
  }
  if (streak > best) { best = streak; bestStart = streakStart; bestEnd = dates[dates.length-1]; }
  // Current streak: check if last date was today or yesterday
  const today = todaySantiagoStr();
  const yesterday = addDaysToDateStr(today, -1);
  const lastDate = dates[dates.length-1];
  if (lastDate === today || lastDate === yesterday) {
    // Count backwards from last date
    current = 1;
    for (let i = dates.length-2; i >= 0; i--) {
      const d1 = new Date(dates[i+1]), d0 = new Date(dates[i]);
      if ((d1-d0)/86400000 === 1) current++;
      else break;
    }
  }
  return { current, best, bestStart, bestEnd, total: dates.length };
}

function renderHabitos() {
  if (!document.getElementById('habitos-rachas')) return;

  // ── Populate year selectors ──
  const years = [...new Set(db.entries.filter(e=>e.anio).map(e=>parseInt(e.anio)))].sort((a,b)=>b-a);
  const currentYr = currentYearSantiago();
  if (years.indexOf(currentYr) === -1) years.unshift(currentYr);

  const heatSel = document.getElementById('heatmap-year-sel');
  if (heatSel && heatSel.options.length === 0) {
    years.forEach(y => { heatSel.innerHTML += `<option value="${y}"${y===currentYr?' selected':''}>${y}</option>`; });
  }
  const compA = document.getElementById('comp-year-a');
  const compB = document.getElementById('comp-year-b');
  if (compA && compA.options.length === 0) {
    years.forEach(y => { compA.innerHTML += `<option value="${y}"${y===currentYr?' selected':''}>${y}</option>`; });
    years.forEach(y => { compB.innerHTML += `<option value="${y}"${y===(currentYr-1)?' selected':''}>${y}</option>`; });
  }

  renderRachas();
  renderHeatmap();
  renderWeeklyMetaHeatmap();
  renderComparador();
}

// ── RACHAS ──
function renderRachas() {
  const el = document.getElementById('habitos-rachas'); if(!el) return;
  const s = calcStreaks();
  const fmtDate = d => d ? new Date(d).toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
      <div class="stat-box" style="text-align:center;">
        <div style="font-family:var(--font-serif);font-size:36px;font-weight:700;font-style:italic;color:${s.current>0?'var(--gold)':'var(--ink4)'};">${s.current}</div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink4);margin-top:4px;">Racha actual</div>
        <div style="font-size:10px;color:var(--ink4);margin-top:2px;">${s.current>0?'días seguidos':'sin actividad'}</div>
      </div>
      <div class="stat-box" style="text-align:center;">
        <div style="font-family:var(--font-serif);font-size:36px;font-weight:700;font-style:italic;color:var(--red);">${s.best}</div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink4);margin-top:4px;">Mejor racha</div>
        <div style="font-size:10px;color:var(--ink4);margin-top:2px;">${s.bestStart?fmtDate(s.bestStart):'—'}</div>
      </div>
      <div class="stat-box" style="text-align:center;">
        <div style="font-family:var(--font-serif);font-size:36px;font-weight:700;font-style:italic;color:var(--ink);">${s.total}</div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink4);margin-top:4px;">Días con lectura</div>
        <div style="font-size:10px;color:var(--ink4);margin-top:2px;">registrados</div>
      </div>
    </div>`;
}

// ── HEATMAP ──
function renderHeatmap() {
  const el = document.getElementById('habitos-heatmap'); if(!el) return;
  const yr = parseInt(document.getElementById('heatmap-year-sel')?.value || new Date().getFullYear());
  const activity = getActivityByDate();

  const DAYS = ['D','L','M','X','J','V','S'];
  const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const cellSize = 13, gap = 2, unit = cellSize + gap;

  // Build week columns for the year
  const jan1 = new Date(yr, 0, 1);
  const dec31 = new Date(yr, 11, 31);
  const startOffset = jan1.getDay(); // 0=Sun
  const totalDays = Math.ceil((dec31 - jan1) / 86400000) + 1;
  const totalCells = startOffset + totalDays;
  const totalWeeks = Math.ceil(totalCells / 7);

  // Max activity for color scale
  const vals = Object.values(activity).filter(v=>v>0);
  const maxVal = vals.length ? Math.max(...vals) : 1;

  function getColor(val) {
    if (!val) return '#ede7d9';
    const t = Math.min(val / maxVal, 1);
    if (t < 0.25) return '#c8b87a';
    if (t < 0.5)  return '#c8952a';
    if (t < 0.75) return '#8b6010';
    return '#1a1510';
  }

  // SVG dimensions
  const svgW = totalWeeks * unit + 30; // +30 for day labels
  const svgH = 7 * unit + 30; // +30 for month labels

  let svg = `<svg width="${svgW}" height="${svgH}" style="font-family:var(--font-sans);">`;

  // Day labels
  DAYS.forEach((d, i) => {
    if (i % 2 === 1) { // only show odd days to save space
      svg += `<text x="0" y="${30 + i * unit + cellSize - 2}" font-size="9" fill="#8a7a68">${d}</text>`;
    }
  });

  // Month labels
  let lastMonth = -1;
  for (let w = 0; w < totalWeeks; w++) {
    const dayIdx = w * 7 - startOffset;
    if (dayIdx >= 0 && dayIdx < totalDays) {
      const d = new Date(yr, 0, dayIdx + 1);
      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        svg += `<text x="${30 + w * unit}" y="12" font-size="9" fill="#8a7a68">${MONTHS_SHORT[d.getMonth()]}</text>`;
      }
    }
  }

  // Cells
  for (let w = 0; w < totalWeeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const dayIdx = w * 7 + dow - startOffset;
      if (dayIdx < 0 || dayIdx >= totalDays) continue;
      const date = new Date(yr, 0, dayIdx + 1);
      const dateStr = `${date.getFullYear()}-${lumenPad2(date.getMonth()+1)}-${lumenPad2(date.getDate())}`;
      const val = activity[dateStr] || 0;
      const color = getColor(val);
      const x = 30 + w * unit;
      const y = 18 + dow * unit;
      const title = val > 0 ? `${dateStr}: ${val} págs/actividad` : dateStr;
      svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${color}" opacity="0.9"><title>${title}</title></rect>`;
    }
  }
  svg += '</svg>';
  el.innerHTML = svg;
}

// ── HEATMAP SEMANAL DE CUMPLIMIENTO ──
function calcWeeklyReadingMeta(year) {
  const dias = calcReadingDailyPages(year);
  const meta = getMetaSemanalPags();
  const firstWeek = getISOWeekKey(`${year}-01-01`);
  const lastWeek = getISOWeekKey(`${year}-12-31`);
  const todayStr = todaySantiagoStr();
  const currentWeek = getISOWeekKey(todayStr);
  const weeks = [];
  let wk = firstWeek;
  let guard = 0;
  while (wk <= lastWeek && guard < 60) {
    const days = getWeekDaysFromKey(wk);
    const daysInYear = days.filter(d => d.startsWith(String(year)));
    const pages = daysInYear.reduce((acc, d) => acc + (dias[d] || 0), 0);
    const activeDays = daysInYear.filter(d => (dias[d] || 0) > 0).length;
    const pct = meta > 0 ? Math.round((pages / meta) * 100) : 0;
    const isCurrent = wk === currentWeek;
    let status = 'Sin lectura';
    if (pages > 0 && pct < 50) status = 'Bajo meta';
    else if (pct >= 50 && pct < 100) status = 'Cerca de meta';
    else if (pct >= 100 && pct < 120) status = 'Meta cumplida';
    else if (pct >= 120) status = 'Meta superada';
    weeks.push({ key:wk, days, daysInYear, start:days[0], end:days[6], pages, activeDays, pct, meta, isCurrent, status });
    wk = addDaysToDateStr(wk, 7);
    guard++;
  }
  return weeks;
}

function weeklyMetaColor(pct, pages) {
  if (!pages || pct <= 0) return '#ede7d9';
  if (pct < 50) return '#e8dcc0';
  if (pct < 100) return '#d8bd73';
  if (pct < 120) return '#c8952a';
  return '#1a1510';
}

function renderWeeklyMetaHeatmap() {
  const el = document.getElementById('habitos-weekly-meta');
  if (!el) return;
  const yr = parseInt(document.getElementById('heatmap-year-sel')?.value || currentYearSantiago());
  const weeks = calcWeeklyReadingMeta(yr);
  const meta = getMetaSemanalPags();
  const done = weeks.filter(w => w.pages >= meta).length;
  const over = weeks.filter(w => w.pct >= 120).length;
  const active = weeks.filter(w => w.pages > 0).length;
  const best = weeks.reduce((a, w) => !a || w.pages > a.pages ? w : a, null);
  const fmtRange = w => `${w.start.slice(8,10)}-${w.start.slice(5,7)} → ${w.end.slice(8,10)}-${w.end.slice(5,7)}`;
  const cells = weeks.map((w, idx) => {
    const color = weeklyMetaColor(w.pct, w.pages);
    const textColor = w.pct >= 120 ? '#f5f0e8' : 'transparent';
    const title = `Semana ${idx+1} · ${fmtRange(w)}\n${w.pages} págs / ${w.meta} meta · ${w.pct}%\n${w.activeDays}/${w.daysInYear.length} días activos · ${w.status}${w.isCurrent ? ' · En curso' : ''}`;
    return `<div class="weekly-meta-cell ${w.isCurrent ? 'current' : ''}" style="background:${color};" title="${escapeHtml(title)}" onclick="showToast('${w.pages} págs · ${w.pct}% · ${w.status.replace(/'/g,'\\\'')}')"><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${textColor};">${w.pct >= 120 ? w.pct + '%' : ''}</span></div>`;
  }).join('');
  el.innerHTML = `
    <div class="weekly-meta-summary">
      <div class="stat-box" style="padding:10px;text-align:center;"><div style="font-family:var(--font-serif);font-size:24px;font-weight:900;color:var(--ink);">${meta}</div><div class="stat-label">Meta semanal</div></div>
      <div class="stat-box" style="padding:10px;text-align:center;"><div style="font-family:var(--font-serif);font-size:24px;font-weight:900;color:var(--green);">${done}</div><div class="stat-label">Semanas cumplidas</div></div>
      <div class="stat-box" style="padding:10px;text-align:center;"><div style="font-family:var(--font-serif);font-size:24px;font-weight:900;color:var(--gold);">${over}</div><div class="stat-label">Sobre 120%</div></div>
      <div class="stat-box" style="padding:10px;text-align:center;"><div style="font-family:var(--font-serif);font-size:24px;font-weight:900;color:var(--ink2);">${active}</div><div class="stat-label">Con lectura</div></div>
    </div>
    <div class="weekly-meta-grid">${cells}</div>
    <div class="weekly-meta-legend">
      <span>0</span><div class="weekly-meta-swatch" style="background:#ede7d9;"></div>
      <span>&lt;50%</span><div class="weekly-meta-swatch" style="background:#e8dcc0;"></div>
      <span>50–99%</span><div class="weekly-meta-swatch" style="background:#d8bd73;"></div>
      <span>100–119%</span><div class="weekly-meta-swatch" style="background:#c8952a;"></div>
      <span>120%+</span><div class="weekly-meta-swatch" style="background:#1a1510;"></div>
    </div>
    ${best ? `<div style="font-size:11px;color:var(--ink4);margin-top:8px;line-height:1.5;">Mejor semana: <b style="color:var(--ink2);">${best.pages} págs</b> · ${fmtRange(best)}. La semana actual se marca con borde negro.</div>` : ''}`;
}

// ── COMPARADOR DE AÑOS ──
function dayOfYearFromDateStr(dateStr) {
  const [y,m,d] = String(dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return 0;
  const start = Date.UTC(y, 0, 1);
  const current = Date.UTC(y, m - 1, d);
  return Math.floor((current - start) / 86400000) + 1;
}

function daysInYearLumen(year) {
  const y = Number(year);
  return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
}

function activityDaysComparableForYear(year) {
  const yr = Number(year);
  const dates = new Set();
  db.entries.filter(e => e.type === 'libro').forEach(e => {
    const norm = normalizeReadDates(e.readDates || []);
    if (!norm.length) return;
    const conPag = norm.filter(r => r.pag !== null);
    if (conPag.length) {
      const byDay = calcPagsByDay(conPag);
      Object.entries(byDay).forEach(([date, pages]) => {
        if (String(date).startsWith(String(yr) + '-') && Number(pages) > 0) dates.add(date);
      });
    } else {
      norm.forEach(r => {
        if (String(r.date || '').startsWith(String(yr) + '-')) dates.add(r.date);
      });
    }
  });
  return dates.size ? { days: dates.size, denominator: (yr === currentYearSantiago() ? dayOfYearFromDateStr(todaySantiagoStr()) : daysInYearLumen(yr)) } : null;
}

function renderComparador() {
  const el = document.getElementById('habitos-comparador'); if(!el) return;
  const yrA = parseInt(document.getElementById('comp-year-a')?.value || new Date().getFullYear());
  const yrB = parseInt(document.getElementById('comp-year-b')?.value || new Date().getFullYear()-1);

  function statsForYear(yr) {
    const libros   = db.entries.filter(e=>e.type==='libro'&&e.estado==='leido'&&parseInt(e.anio)===yr);
    const peliculas= db.entries.filter(e=>e.type==='pelicula'&&parseInt(e.anio)===yr);
    const series   = db.entries.filter(e=>e.type==='serie'&&e.estado!=='viendo'&&e.estado!=='pendiente'&&parseInt(e.anio)===yr);
    // Consistencia con Inicio: año actual usa páginas registradas; años cerrados usan su total final.
    const currentYr = currentYearSantiago();
    const paginas  = yr === currentYr ? paginasRegistradasEnAnio(yr) : paginasFinalesLibrosEnAnio(yr);
    const autores  = new Set(libros.map(e=>e.autor).filter(Boolean)).size;
    const directores = new Set([...peliculas,...series].map(e=>e.director).filter(Boolean)).size;
    const idiomas  = new Set(libros.map(e=>e.idioma).filter(Boolean)).size;
    const diasConLectura = activityDaysComparableForYear(yr);
    const ritmoDen=yr===currentYr?dayOfYearFromDateStr(todaySantiagoStr()):daysInYearLumen(yr); const ritmoPromedio=ritmoDen>0?paginas/ritmoDen:0;
    return { libros: libros.length, peliculas: peliculas.length, series: series.length, paginas, ritmoPromedio, autores, directores, idiomas, total: libros.length+peliculas.length+series.length, diasConLectura };
  }

  const a = statsForYear(yrA), b = statsForYear(yrB);

  function row(label, va, vb, unit='') {
    const diff = va - vb;
    const pct  = vb > 0 ? Math.round((diff/vb)*100) : 0;
    const arrow = diff > 0 ? `<span style="color:#7ec98f;">▲${Math.abs(pct)}%</span>` : diff < 0 ? `<span style="color:#f08080;">▼${Math.abs(pct)}%</span>` : '<span style="color:var(--ink4);">—</span>';
    return `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid var(--cream2);align-items:center;">
        <div style="font-size:12px;color:var(--ink3);font-weight:700;letter-spacing:1px;text-transform:uppercase;">${label}</div>
        <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--ink);text-align:center;">${va.toLocaleString()}${unit}</div>
        <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--ink4);text-align:center;">${vb.toLocaleString()}${unit}</div>
        <div style="text-align:center;font-size:12px;font-weight:700;">${arrow}</div>
      </div>`;
  }

  function rowRitmo(va,vb){const diff=va-vb,pct=vb>0?Math.round(diff/vb*100):0,arrow=diff>0?`<span style="color:#7ec98f;">▲${Math.abs(pct)}%</span>`:diff<0?`<span style="color:#f08080;">▼${Math.abs(pct)}%</span>`:'<span style="color:var(--ink4);">—</span>',fmt=v=>`${Number(v||0).toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1})}<div style="font-family:var(--font-sans);font-size:9px;color:var(--ink4);font-weight:400;">págs/día</div>`;return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid var(--cream2);align-items:center;"><div style="font-size:12px;color:var(--ink3);font-weight:700;letter-spacing:1px;text-transform:uppercase;">📈 Ritmo promedio</div><div style="font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--ink);text-align:center;">${fmt(va)}</div><div style="font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--ink4);text-align:center;">${fmt(vb)}</div><div style="text-align:center;font-size:12px;font-weight:700;">${arrow}</div></div>`}

  function rowDiasConLectura(va, vb) {
    const fmt = (v, muted) => {
      if (!v || !v.denominator) return '<span style="color:var(--ink4);font-size:11px;">Sin detalle diario</span>';
      const pct = Math.round((v.days / v.denominator) * 100);
      return `${v.days.toLocaleString()} <span style="font-size:13px;color:${muted ? 'var(--ink4)' : 'var(--ink3)'};">(${pct}%)</span>`;
    };
    const arrow = (va && vb && vb.days > 0)
      ? (() => {
          const pctA = Math.round((va.days / va.denominator) * 100);
          const pctB = Math.round((vb.days / vb.denominator) * 100);
          const diff = pctA - pctB;
          return diff > 0 ? `<span style="color:#7ec98f;">▲${Math.abs(diff)} pts</span>` : diff < 0 ? `<span style="color:#f08080;">▼${Math.abs(diff)} pts</span>` : '<span style="color:var(--ink4);">—</span>';
        })()
      : '<span style="color:var(--ink4);">—</span>';
    return `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid var(--cream2);align-items:center;" title="Días con páginas registradas / días transcurridos del año.">
        <div style="font-size:12px;color:var(--ink3);font-weight:700;letter-spacing:1px;text-transform:uppercase;">📅 Días con lectura</div>
        <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--ink);text-align:center;">${fmt(va, false)}</div>
        <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--ink4);text-align:center;">${fmt(vb, true)}</div>
        <div style="text-align:center;font-size:12px;font-weight:700;">${arrow}</div>
      </div>`;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;padding:0 0 8px;border-bottom:2px solid var(--ink);">
      <div></div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);text-align:center;">${yrA}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);text-align:center;">${yrB}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);text-align:center;">Δ</div>
    </div>
    ${row('📚 Libros leídos', a.libros, b.libros)}
    ${row('📄 Páginas', a.paginas, b.paginas)}
    ${rowRitmo(a.ritmoPromedio,b.ritmoPromedio)}
    ${rowDiasConLectura(a.diasConLectura, b.diasConLectura)}
    ${row('🎬 Películas', a.peliculas, b.peliculas)}
    ${row('📺 Series', a.series, b.series)}
    ${row('✍ Autores únicos', a.autores, b.autores)}
    ${row('🎬 Directores únicos', a.directores, b.directores)}
    ${row('🌍 Idiomas', a.idiomas, b.idiomas)}
    ${row('⭐ Total estímulos', a.total, b.total)}`;
}

