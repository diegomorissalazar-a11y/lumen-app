// ═══════════════════════════════════
//  HOME
// ═══════════════════════════════════
// ═══════════════════════════════════
//  DESAFÍO LECTOR
// ═══════════════════════════════════
const DESAFIO_KEY = 'lumen_desafios_v1';

function loadDesafios() {
  try { const r=localStorage.getItem(DESAFIO_KEY); return r?JSON.parse(r):{}; }
  catch { return {}; }
}
function saveDesafios(d) {
  safeLocalSetItem(DESAFIO_KEY, JSON.stringify(d));
  if (currentUser) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => syncToFirestore(), 800);
  }
}

function librosLeidosEnAnio(yr) {
  return db.entries.filter(e => e.type==='libro' && e.estado==='leido' && parseInt(e.anio)===yr).length;
}

function mejorAnioLibros() {
  const years = [...new Set(db.entries.filter(e=>e.type==='libro'&&e.estado==='leido'&&e.anio).map(e=>parseInt(e.anio)))];
  let best=0, bestYr=null;
  years.forEach(y => { const n=librosLeidosEnAnio(y); if(n>best){best=n;bestYr=y;} });
  return { year:bestYr, count:best };
}

function openDesafioModal() {
  const yr = new Date().getFullYear();
  const mes = new Date().getMonth(); // 0-11
  const desafios = loadDesafios();

  // Determinar año del desafío
  let targetYr = yr;
  // Si ya hay desafío activo este año y estamos antes de diciembre, proponer año siguiente
  if (desafios[yr] && mes < 11) {
    targetYr = yr + 1;
  }

  document.getElementById('desafio-modal-title').textContent = `Desafío ${targetYr}`;
  document.getElementById('desafio-year-display').textContent = targetYr;
  document.getElementById('desafio-meta').dataset.year = targetYr;

  // Sugerencias
  const prevCount = librosLeidosEnAnio(targetYr - 1);
  const { year: bestYr, count: bestCount } = mejorAnioLibros();
  const existente = desafios[targetYr];

  let sugs = '';
  if (existente) {
    sugs += `<div style="padding:10px 12px;background:var(--cream2);border-radius:6px;margin-bottom:12px;font-size:12px;color:var(--ink3);">
      Ya tienes un desafío activo: <b>${existente.meta} libros</b>. Puedes modificarlo abajo.
    </div>`;
    document.getElementById('desafio-meta').value = existente.meta;
  } else {
    document.getElementById('desafio-meta').value = '';
  }

  if (prevCount > 0 || bestCount > 0) {
    sugs += `<div style="font-size:11px;color:var(--ink4);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Sugerencias</div>`;
    sugs += `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">`;
    if (prevCount > 0) {
      sugs += `<button onclick="document.getElementById('desafio-meta').value=${prevCount+1};document.getElementById('desafio-meta').focus();" style="text-align:left;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;background:#fff;cursor:pointer;font-family:var(--font-sans);font-size:12px;color:var(--ink2);">
        📈 <b>${prevCount+1} libros</b> — igual que ${targetYr-1} (${prevCount}) + 1
      </button>`;
      sugs += `<button onclick="document.getElementById('desafio-meta').value=${prevCount+2};document.getElementById('desafio-meta').focus();" style="text-align:left;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;background:#fff;cursor:pointer;font-family:var(--font-sans);font-size:12px;color:var(--ink2);">
        🚀 <b>${prevCount+2} libros</b> — igual que ${targetYr-1} + 2
      </button>`;
    }
    if (bestYr && bestYr !== targetYr-1 && bestCount > 0) {
      sugs += `<button onclick="document.getElementById('desafio-meta').value=${bestCount};document.getElementById('desafio-meta').focus();" style="text-align:left;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;background:linear-gradient(135deg,#fff8e8,#fff);cursor:pointer;font-family:var(--font-sans);font-size:12px;color:var(--ink2);border-color:var(--gold);">
        🏆 <b>${bestCount} libros</b> — tu mejor año fue ${bestYr} (${bestCount} libros)
      </button>`;
    }
    sugs += `</div>`;
  }

  document.getElementById('desafio-sugerencias').innerHTML = sugs;
  openModal('modal-desafio');
}

function saveDesafio() {
  const meta = parseInt(document.getElementById('desafio-meta').value);
  const targetYr = parseInt(document.getElementById('desafio-meta').dataset.year) || new Date().getFullYear();
  if (!meta || meta < 1) { showToast('Ingresa una meta válida'); return; }
  const desafios = loadDesafios();
  desafios[targetYr] = { meta, createdAt: Date.now() };
  saveDesafios(desafios);
  closeModal('modal-desafio');
  showToast(`✓ Desafío ${targetYr}: ${meta} libros`);
  renderDesafioCard();
}

// ── Semana ISO Chile/Santiago: lunes→domingo ─────────────────────────
const LUMEN_TZ = 'America/Santiago';
const META_SEMANAL_PAGS_DEFAULT = 180;
const META_SEMANAL_PAGS_KEY = 'lumen_meta_semanal_pags_v1';

function getMetaSemanalPags() {
  const raw = localStorage.getItem(META_SEMANAL_PAGS_KEY);
  const val = parseInt(raw, 10);
  return Number.isFinite(val) && val > 0 ? val : META_SEMANAL_PAGS_DEFAULT;
}

function setMetaSemanalPags(val) {
  const meta = parseInt(val, 10);
  if (!Number.isFinite(meta) || meta < 1) return false;
  safeLocalSetItem(META_SEMANAL_PAGS_KEY, String(meta));
  return true;
}

function openMetaSemanalModal() {
  const actual = getMetaSemanalPags();
  const input = prompt('Nueva meta semanal de páginas:', actual);
  if (input === null) return;
  const meta = parseInt(String(input).trim(), 10);
  if (!Number.isFinite(meta) || meta < 1) {
    showToast('Ingresa una meta semanal válida');
    return;
  }
  const porDia = Math.ceil(meta / 7);
  const porDiaHabil = Math.ceil(meta / 5);
  const msg = `Meta semanal propuesta: ${meta} páginas.

Esto significa aproximadamente ${porDia} páginas al día si lees todos los días, o ${porDiaHabil} páginas por día hábil si concentras la lectura de lunes a viernes.

¿Confirmas guardar esta meta?`;
  if (!confirm(msg)) return;
  setMetaSemanalPags(meta);
  showToast(`✓ Meta semanal: ${meta} págs`);
  renderLogros();
}


function lumenPad2(n) { return String(n).padStart(2, '0'); }

function getDatePartsInSantiago(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LUMEN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`
  };
}

function santiagoOperationalTodayStr(date = new Date()) {
  const parts = getDatePartsInSantiago(date);
  const ds = parts.dateStr;
  const [y, m, d] = ds.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 1=lunes
  // Regla operativa del usuario: la nueva semana parte el lunes a las 00:01 hora Santiago.
  // Si se registra justo el lunes 00:00, todavía se considera cierre de la semana anterior.
  if (dow === 1 && parts.hour === 0 && parts.minute === 0) return addDaysToDateStr(ds, -1);
  return ds;
}

function todaySantiagoStr() {
  return santiagoOperationalTodayStr(new Date());
}

function currentYearSantiago() {
  return Number(todaySantiagoStr().slice(0, 4));
}

function dateStrFromUTCDate(d) {
  return `${d.getUTCFullYear()}-${lumenPad2(d.getUTCMonth() + 1)}-${lumenPad2(d.getUTCDate())}`;
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dateStrFromUTCDate(dt);
}

function getISOWeekKey(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7; // lunes=1 … domingo=7
  dt.setUTCDate(dt.getUTCDate() - day + 1); // ir al lunes
  return dateStrFromUTCDate(dt); // YYYY-MM-DD del lunes, sin desfase UTC/local
}

function easterSundayDateStr(year) {
  // Algoritmo computus gregoriano para calcular Semana Santa.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${lumenPad2(month)}-${lumenPad2(day)}`;
}

function chileHolidaySet(year) {
  // Base de feriados nacionales usados para separar día hábil vs día inhábil.
  // Se evita depender de internet para que la app funcione offline.
  const fixed = [
    '01-01', // Año Nuevo
    '05-01', // Día del Trabajador
    '05-21', // Glorias Navales
    '06-20', // Pueblos Indígenas / solsticio (referencia operativa)
    '06-29', // San Pedro y San Pablo
    '07-16', // Virgen del Carmen
    '08-15', // Asunción de la Virgen
    '09-18', // Independencia
    '09-19', // Glorias del Ejército
    '10-12', // Encuentro de Dos Mundos
    '10-31', // Iglesias Evangélicas y Protestantes
    '11-01', // Todos los Santos
    '12-08', // Inmaculada Concepción
    '12-25'  // Navidad
  ];
  const set = new Set(fixed.map(md => `${year}-${md}`));
  const easter = easterSundayDateStr(year);
  set.add(addDaysToDateStr(easter, -2)); // Viernes Santo
  set.add(addDaysToDateStr(easter, -1)); // Sábado Santo
  return set;
}

function isChileNonWorkingDay(dateStr) {
  if (!dateStr) return true;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return true;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=domingo, 6=sábado
  if (dow === 0 || dow === 6) return true;
  return chileHolidaySet(y).has(dateStr);
}

function getWeekDaysFromKey(weekKey) {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateStr(weekKey, i));
}

function calcReadingDailyPages(year) {
  const dias = {}; // YYYY-MM-DD → páginas leídas del día
  const addToDay = (dateStr, pags) => {
    if (!dateStr || pags <= 0) return;
    const ds = String(dateStr).slice(0, 10);
    if (!ds.startsWith(String(year))) return;
    dias[ds] = (dias[ds] || 0) + pags;
  };

  db.entries.filter(e => e.type === 'libro').forEach(e => {
    const norm = normalizeReadDates(e.readDates || [])
      .filter(r => r.pag !== null && String(r.date || '').startsWith(String(year)));

    if (norm.length >= 1) {
      norm.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      // El primer registro de un libro nuevo también cuenta como páginas leídas del día.
      addToDay(norm[0].date, Math.max(0, Number(norm[0].pag || 0)));
      for (let i = 1; i < norm.length; i++) {
        const diff = Math.max(0, Number(norm[i].pag || 0) - Number(norm[i - 1].pag || 0));
        addToDay(norm[i].date, diff);
      }
    }
  });
  return dias;
}

function summarizeWeekReading(dias, weekKey, opts = {}) {
  const days = getWeekDaysFromKey(weekKey);
  const limitDays = Math.max(0, Math.min(7, Number(opts.limitDays || 7)));
  const consideredDays = days.slice(0, limitDays);
  const habiles = consideredDays.filter(d => !isChileNonWorkingDay(d));
  const inhabiles = consideredDays.filter(d => isChileNonWorkingDay(d));
  const fullHabiles = days.filter(d => !isChileNonWorkingDay(d));
  const fullInhabiles = days.filter(d => isChileNonWorkingDay(d));
  const sum = arr => arr.reduce((acc, d) => acc + (dias[d] || 0), 0);
  const active = arr => arr.filter(d => (dias[d] || 0) > 0).length;
  const safeAvg = (total, count) => count > 0 ? total / count : null;

  const totalHabil = sum(habiles);
  const totalInhabil = sum(inhabiles);
  const activeHabil = active(habiles);
  const activeInhabil = active(inhabiles);
  const totalSemana = sum(consideredDays);
  const activeSemana = active(consideredDays);
  const denominator = consideredDays.length || 1;

  return {
    key: weekKey,
    days,
    consideredDays,
    habiles,
    inhabiles,
    fullHabiles,
    fullInhabiles,
    totalSemana,
    activeSemana,
    totalHabil,
    totalInhabil,
    activeHabil,
    activeInhabil,
    avgHabil: safeAvg(totalHabil, habiles.length),
    avgInhabil: safeAvg(totalInhabil, inhabiles.length),
    adherencePct: Math.round((activeSemana / denominator) * 100),
    activeLabel: `${activeSemana}/${consideredDays.length} días activos`,
    habilLabel: `${activeHabil}/${habiles.length} días hábiles`,
    inhabilLabel: `${activeInhabil}/${inhabiles.length} días inhábiles`
  };
}

function getWeekElapsedDays(weekKey, todayStr) {
  const days = getWeekDaysFromKey(weekKey);
  const idx = days.indexOf(todayStr);
  if (idx < 0) return 7;
  return idx + 1;
}

function countRemainingDaysInWeek(weekKey, todayStr) {
  const days = getWeekDaysFromKey(weekKey);
  const idx = days.indexOf(todayStr);
  if (idx < 0) return 0;
  return Math.max(0, days.length - idx - 1);
}

function calcLogrosSemana() {
  const yr = currentYearSantiago();
  const META_SEMANAL_PAGS = getMetaSemanalPags();
  const hoyStr = todaySantiagoStr();
  const semanaActualKey = getISOWeekKey(hoyStr);
  const anteriorWk = getISOWeekKey(addDaysToDateStr(hoyStr, -7));
  const dias = calcReadingDailyPages(yr);

  // Construir mapa semana → páginas desde el mismo detalle diario que alimenta los KPIs.
  const semanas = {}; // weekKey → pages
  Object.entries(dias).forEach(([dateStr, pags]) => {
    const wk = getISOWeekKey(dateStr);
    if (!wk) return;
    semanas[wk] = (semanas[wk] || 0) + pags;
  });

  // Filtrar semanas con datos — excluir semana actual si recién empieza.
  const semanasValidas = Object.entries(semanas)
    .filter(([wk]) => wk !== semanaActualKey || semanas[wk] >= 20)
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Mejor semana del año (excluye semana actual si existen semanas pasadas).
  // Aunque no existan registros, Control de Plan debe mostrarse igual con 0 páginas.
  const pasadas = semanasValidas.filter(([wk]) => wk !== semanaActualKey);
  const baseMejor = pasadas.length ? pasadas : (semanasValidas.length ? semanasValidas : [[semanaActualKey, 0]]);
  const [mejorWk, mejorPags] = baseMejor.reduce((a, b) => b[1] > a[1] ? b : a);
  const elapsedDays = getWeekElapsedDays(semanaActualKey, hoyStr);
  const actualResumen = summarizeWeekReading(dias, semanaActualKey, { limitDays: elapsedDays });
  const anteriorResumenComparable = summarizeWeekReading(dias, anteriorWk, { limitDays: elapsedDays });
  const anteriorResumenCompleto = summarizeWeekReading(dias, anteriorWk, { limitDays: 7 });
  const semanaActualPags = actualResumen.totalSemana;
  const anteriorPags = anteriorResumenCompleto.totalSemana;
  const remainingDays = countRemainingDaysInWeek(semanaActualKey, hoyStr);

  const fmtSemana = (wkKey) => {
    const lunes = new Date(wkKey + 'T12:00:00');
    const domingoStr = addDaysToDateStr(wkKey, 6);
    const domingo = new Date(domingoStr + 'T12:00:00');
    const opts = { day: 'numeric', month: 'short', timeZone: LUMEN_TZ };
    return `${lunes.toLocaleDateString('es-CL', opts)} – ${domingo.toLocaleDateString('es-CL', opts)}`;
  };

  const pctMeta = Math.round((semanaActualPags / META_SEMANAL_PAGS) * 100);
  const sobreMeta = Math.max(0, semanaActualPags - META_SEMANAL_PAGS);

  return {
    mejorSemana: { key: mejorWk, pags: mejorPags, label: fmtSemana(mejorWk) },
    semanaActual: {
      key: semanaActualKey,
      pags: semanaActualPags,
      esMejor: semanaActualPags >= mejorPags,
      pctMeta,
      sobreMeta,
      faltanMeta: Math.max(0, META_SEMANAL_PAGS - semanaActualPags),
      resumen: actualResumen
    },
    semanaAnterior: {
      key: anteriorWk,
      pags: anteriorPags,
      pctMeta: Math.round((anteriorPags / META_SEMANAL_PAGS) * 100),
      sobreMeta: Math.max(0, anteriorPags - META_SEMANAL_PAGS),
      resumen: anteriorResumenComparable,
      resumenCompleto: anteriorResumenCompleto
    },
    totalSemanas: semanasValidas.length,
    year: yr,
    todayStr: hoyStr,
    elapsedDays,
    remainingDays
  };
}

function formatKpiDelta(actual, anterior, suffix = '', previousLabel = '') {
  const prevText = (anterior === null || anterior === undefined)
    ? ''
    : ` <span style="color:var(--ink3);">(sem. ant.: ${anterior.toFixed(1).replace('.', ',')}${previousLabel || suffix})</span>`;
  if (actual === null || actual === undefined || anterior === null || anterior === undefined) {
    return `<span style="color:var(--ink4);font-weight:700;">—</span> vs sem. ant.${prevText}`;
  }
  const diff = actual - anterior;
  const sign = diff > 0 ? '+' : '';
  const cls = diff >= 0 ? 'var(--green)' : 'var(--red2)';
  const arrow = diff >= 0 ? '▲' : '▼';
  return `<span style="color:${cls};font-weight:700;">${arrow} ${sign}${diff.toFixed(1).replace('.', ',')}${suffix}</span> vs sem. ant.${prevText}`;
}

function formatPctTarget(actual, target) {
  if (actual === null || actual === undefined || !target) return '—';
  return `${Math.round((actual / target) * 100)}%`;
}

function renderLogros() {
  const el = document.getElementById('logros-card');
  if (!el) return;
  const data = calcLogrosSemana();

  // Mostrar/ocultar card de exportar según si hay datos de lectura.
  const cardExp = document.getElementById('exportar-lectura-card');
  const hayReadDates = db.entries.some(e => e.type === 'libro' && Array.isArray(e.readDates) && e.readDates.length > 0);
  if (cardExp) cardExp.style.display = hayReadDates ? 'block' : 'none';

  if (!data) { el.innerHTML = ''; return; }

  const META_SEMANAL_PAGS = getMetaSemanalPags();
  const { mejorSemana, semanaActual, semanaAnterior, year, elapsedDays, remainingDays } = data;
  const actual = semanaActual.resumen;
  // Para comparar KPIs contra semana anterior se usa la semana cerrada completa.
  // Así los días inhábiles anteriores incluyen sábado, domingo y feriados de Chile (ej: 21 de mayo).
  const anterior = semanaAnterior.resumenCompleto || semanaAnterior.resumen;
  const pctVisible = semanaActual.pctMeta;
  const barWidth = Math.min(100, pctVisible);
  const ritmoRequerido = remainingDays > 0 ? Math.ceil(semanaActual.faltanMeta / remainingDays) : semanaActual.faltanMeta;

  const metaMsg = semanaActual.pags >= META_SEMANAL_PAGS
    ? `Meta superada: <b>${semanaActual.pags} de ${META_SEMANAL_PAGS} págs</b> (${pctVisible}%). +${semanaActual.sobreMeta} págs sobre la meta semanal.`
    : `Te faltan <b>${semanaActual.faltanMeta} págs</b> para la meta semanal · ritmo requerido: ${ritmoRequerido} págs/día.`;
  const semanaAnteriorMsg = semanaAnterior.pags >= META_SEMANAL_PAGS
    ? `Semana anterior: <b>${semanaAnterior.pags} págs</b> (${semanaAnterior.pctMeta}%, +${semanaAnterior.sobreMeta} sobre la meta)`
    : `Semana anterior: <b>${semanaAnterior.pags} págs</b>`;
  const recordMsg = semanaActual.pags > 0 && semanaActual.esMejor
    ? 'Estás en zona de récord semanal.'
    : `Récord: <b>${mejorSemana.pags} págs</b> <span style="color:var(--ink4);font-weight:400;">(${mejorSemana.label})</span>`;

  const targetHabil = 22;
  const targetInhabil = 35;
  const avgHabil = actual.avgHabil;
  const avgInhabil = actual.avgInhabil;
  const faltanHabil = avgHabil === null ? null : targetHabil - avgHabil;
  const faltanInhabil = avgInhabil === null ? null : targetInhabil - avgInhabil;
  const adherenciaTarget = 90;
  const adherenciaDelta = actual.adherencePct - anterior.adherencePct;
  const adherenciaDeltaTxt = `<span style="color:${adherenciaDelta >= 0 ? 'var(--green)' : 'var(--red2)'};font-weight:700;">${adherenciaDelta >= 0 ? '▲ +' : '▼ '}${adherenciaDelta} pts</span> vs sem. ant. <span style="color:var(--ink3);">(sem. ant.: ${anterior.adherencePct}%)</span>`;
  const fmtAvg = v => v === null ? '—' : v.toFixed(1).replace('.', ',');
  const fmtGap = (gap, emptyText) => {
    if (gap === null) return emptyText;
    return gap > 0 ? `Faltan +${gap.toFixed(1).replace('.', ',')} págs` : `Sobre meta +${Math.abs(gap).toFixed(1).replace('.', ',')} págs`;
  };

  const kpiCard = (label, value, target, sub, deltaHtml, pctTarget = '—') => `
    <div style="background:var(--cream2);border:1px solid var(--border);border-radius:6px;padding:10px 12px;min-height:78px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
        <div style="font-size:10px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink4);font-weight:700;">${label}</div>
        ${pctTarget !== '—' ? `<div style="font-size:9px;color:${parseInt(pctTarget, 10) >= 100 ? 'var(--green)' : 'var(--ink4)'};font-weight:700;letter-spacing:0.3px;white-space:nowrap;">Cumpl. ${pctTarget}</div>` : `<div style="font-size:10px;color:var(--ink4);font-weight:700;">—</div>`}
      </div>
      <div style="font-family:var(--font-serif);font-size:20px;font-weight:900;color:var(--ink);line-height:1;">
        ${value} <span style="font-size:12px;color:var(--ink4);">/ ${target}</span>
      </div>
      <div style="font-size:11px;color:var(--ink3);margin-top:5px;line-height:1.4;">${sub}</div>
      <div style="font-size:10px;color:var(--ink4);margin-top:3px;line-height:1.4;">${deltaHtml}</div>
    </div>`;

  el.innerHTML = `
    <div class="lumen-logros-card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--shadow);">
      <div class="lumen-logros-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink4);font-weight:700;">Seguimiento semanal · ${year}</div>
        <div class="lumen-logros-actions" style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--gold);font-weight:700;">Control de Plan</div>
          <button onclick="openMetaSemanalModal()" style="border:1px solid var(--border);background:#fff;border-radius:4px;padding:4px 7px;font-family:var(--font-sans);font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink3);cursor:pointer;white-space:nowrap;">✎ Meta</button>
        </div>
      </div>
      <div class="lumen-logros-main" style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-family:var(--font-serif);font-size:26px;font-weight:900;color:var(--ink);line-height:1;"><span style="color:${semanaActual.pags >= META_SEMANAL_PAGS ? 'var(--green)' : 'var(--ink)'};">${semanaActual.pags}</span> <span style="font-size:16px;color:var(--ink4);">/ ${META_SEMANAL_PAGS} págs</span></div>
          <div style="font-size:11px;color:var(--ink3);margin-top:4px;">Meta semanal editable</div>
        </div>
        <div style="font-family:var(--font-serif);font-size:22px;font-weight:900;color:${pctVisible >= 100 ? 'var(--green)' : 'var(--gold)'};line-height:1;">${pctVisible}%</div>
      </div>
      <div style="height:6px;background:var(--cream2);border-radius:4px;overflow:hidden;margin:10px 0 10px;">
        <div style="height:100%;width:${barWidth}%;background:${pctVisible >= 100 ? 'var(--green)' : 'var(--gold)'};border-radius:4px;transition:width 0.4s ease;"></div>
      </div>
      <div style="font-size:13px;color:var(--ink2);line-height:1.8;">${metaMsg}</div>
      <div class="lumen-kpi-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 10px;">
        ${kpiCard(
          'Día hábil',
          fmtAvg(avgHabil),
          `${targetHabil} págs/día`,
          `${fmtGap(faltanHabil, 'Sin días hábiles transcurridos')} · ${actual.habilLabel}`,
          formatKpiDelta(avgHabil, anterior.avgHabil, '', ' págs/día'),
          formatPctTarget(avgHabil, targetHabil)
        )}
        ${kpiCard(
          'Día inhábil',
          fmtAvg(avgInhabil),
          `${targetInhabil} págs/día`,
          `${fmtGap(faltanInhabil, 'Sin días inhábiles transcurridos')} · ${actual.inhabilLabel}`,
          formatKpiDelta(avgInhabil, anterior.avgInhabil, '', ' págs/día'),
          formatPctTarget(avgInhabil, targetInhabil)
        )}
        ${kpiCard(
          'Adherencia',
          `${actual.adherencePct}%`,
          `${adherenciaTarget}%`,
          actual.activeLabel,
          adherenciaDeltaTxt,
          `${Math.round((actual.adherencePct / adherenciaTarget) * 100)}%`
        )}
      </div>
      <div style="font-size:11px;color:var(--ink4);line-height:1.5;margin-bottom:4px;">Días hábiles: lunes a viernes excluyendo feriados de Chile. Días inhábiles: sábados, domingos y feriados.</div>
      <div class="divider" style="margin:10px 0;"></div>
      <div class="lumen-logros-footer" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="font-size:13px;color:var(--ink2);line-height:1.8;">🏅 ${recordMsg}<br>${semanaAnterior.pags > 0 ? semanaAnteriorMsg : ''}</div>
        ${semanaActual.pags >= META_SEMANAL_PAGS ? `<div style="font-size:12px;color:var(--green);font-weight:700;">✓ Semana cumplida y superada</div>` : `<div style="font-size:12px;color:var(--ink3);font-weight:700;">Ritmo requerido: ${ritmoRequerido} págs/día</div>`}
      </div>
    </div>`;
}


function renderDesafioCard() {
  const el = document.getElementById('desafio-card'); if(!el) return;
  const yr = new Date().getFullYear();
  const desafios = loadDesafios();

  // Mostrar desafío del año actual si existe, sino del próximo si está configurado
  const desafio = desafios[yr] || desafios[yr+1];
  const desafioYr = desafios[yr] ? yr : (desafios[yr+1] ? yr+1 : null);

  if (!desafio) {
    // Sin desafío — mostrar botón de invitación
    el.style.display = 'block';
    el.innerHTML = `
      <button onclick="openDesafioModal()" style="width:100%;padding:12px 16px;border:1.5px dashed var(--border);border-radius:8px;background:transparent;font-family:var(--font-sans);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);cursor:pointer;text-align:center;">
        🎯 Fijar desafío lector ${yr}
      </button>`;
    return;
  }

  const leidos  = librosLeidosEnAnio(desafioYr === yr ? yr : yr); // si es año futuro mostramos 0
  const leidosReal = desafioYr === yr ? leidos : 0;
  const meta    = desafio.meta;
  const pct     = Math.min(100, Math.round((leidosReal / meta) * 100));
  const faltan  = Math.max(0, meta - leidosReal);
  const completado = leidosReal >= meta;
  const esFuturo = desafioYr > yr;

  el.style.display = 'block';
  el.innerHTML = `
    <div class="desafio-card">
      <div class="desafio-header">
        <div>
          <div class="desafio-title">🎯 Desafío lector ${desafioYr}</div>
          ${esFuturo ? `<div style="font-size:10px;color:rgba(245,240,232,0.4);margin-top:2px;">Empieza en ${desafioYr}</div>` : ''}
        </div>
        <button class="desafio-edit" onclick="openDesafioModal()">✎ Editar</button>
      </div>
      ${!esFuturo ? `
      <div class="desafio-nums">
        <span class="desafio-leidos ${completado?'desafio-completado':''}">${leidosReal}</span>
        <span class="desafio-meta-txt">de ${meta} libros</span>
        ${completado ? '<span style="font-size:18px;margin-left:4px;">🏆</span>' : ''}
      </div>
      <div class="desafio-bar-wrap">
        <div class="desafio-bar-fill" style="width:${pct}%;${completado?'background:var(--gold);':''}"></div>
      </div>
      <div class="desafio-footer">
        <span class="desafio-pct ${completado?'desafio-completado':''}">${pct}%</span>
        <span class="desafio-faltan">
          ${completado ? '¡Desafío completado! 🎉' : `Faltan ${faltan} libro${faltan!==1?'s':''}`}
        </span>
      </div>` : `
      <div style="font-size:13px;color:rgba(245,240,232,0.6);margin-top:4px;">Meta: <b style="color:var(--gold);">${meta} libros</b> para ${desafioYr}</div>
      `}
    </div>`;
}

function renderHome() {
  const yr = new Date().getFullYear();
  document.getElementById('hero-year-label').textContent = yr;
  const thisYear = db.entries.filter(e => parseInt(e.anio) === yr);
  // Solo libros terminados para el contador — los en curso están en el carrusel
  const libros = thisYear.filter(e => e.type === 'libro' && e.estado === 'leido');
  // pagsHastaDia incluye libros en curso — mismo criterio que el ritmo card
  const pags = pagsHastaDia(yr);
  const pagsTerminados = libros.reduce((a,b) => a+(b.paginas||0), 0);
  const peliculas = thisYear.filter(e => e.type === 'pelicula');
  // Solo series terminadas — excluye viendo/pendiente, igual que Stats
  const series = thisYear.filter(e => e.type === 'serie' && e.estado === 'vista');
  const discos = thisYear.filter(e => e.type === 'disco');

  document.getElementById('hero-title').textContent = pags > 0 ? `${pags.toLocaleString()} páginas registradas\neste año` : 'Mi Biblioteca\nCultural';
  document.getElementById('hero-sub').textContent = `${libros.length} libros · ${peliculas.length} películas · ${series.length} series · ${discos.length} discos`;

  renderDesafioCard();
  renderLogros();

  document.getElementById('year-summary').innerHTML = `
    <div class="ys-box">
      <div class="ys-num">${libros.length}</div>
      <div class="ys-label">Libros</div>
      <div class="ys-sub">${pags.toLocaleString()} págs registradas</div>
    </div>
    <div class="ys-box">
      <div class="ys-num">${peliculas.length}</div>
      <div class="ys-label">Películas</div>
      <div class="ys-sub">${fmtMin(peliculas.reduce((a,b)=>a+(b.duracion||0),0))}</div>
    </div>
    <div class="ys-box">
      <div class="ys-num">${series.length}</div>
      <div class="ys-label">Series</div>
      <div class="ys-sub">${fmtMin(series.reduce((a,b)=>a+(b.duracion||0),0))}</div>
    </div>
    <div class="ys-box">
      <div class="ys-num">${discos.length}</div>
      <div class="ys-label">Discos</div>
      <div class="ys-sub">Escuchados</div>
    </div>`;

  // ── RITMO HERO CARD ──────────────
  const dayOfYear = diasHastaHoyEnAnio(yr);
  const pagsEsteAnio = paginasRegistradasEnAnio(yr);
  const ritmoActual = dayOfYear > 0 ? pagsEsteAnio / dayOfYear : 0;
  const prevYear = yr - 1;
  const prevPags = paginasFinalesLibrosEnAnio(prevYear);
  const ritmoPrev = prevPags > 0 ? prevPags / diasEnAnio(prevYear) : 0;
  const historico = historicoRitmoAnualAntesDe(yr);
  const best = historico.reduce((acc,x)=>!acc||x.ritmo>acc.ritmo?x:acc,null);
  const bestRitmo = best?.ritmo || 0, bestYear = best?.anio || null, bestPags=best?.paginas||0;
  const proyeccion = ritmoActual * diasEnAnio(yr);
  const diffPrev = ritmoPrev > 0 ? ritmoActual - ritmoPrev : 0;
  const pctPrev  = ritmoPrev > 0 ? Math.round((diffPrev/ritmoPrev)*100) : 0;
  const upPrev   = diffPrev >= 0;
  const colorPrev = upPrev ? '#7ec98f' : '#f08080';
  const diffBest = bestRitmo > 0 ? ritmoActual - bestRitmo : 0;
  const pctBest  = bestRitmo > 0 ? Math.round((diffBest/bestRitmo)*100) : 0;
  const upBest   = diffBest >= 0;
  const colorBest = upBest ? '#7ec98f' : '#f08080';
  const projDiff = bestPags>0 ? Math.round(proyeccion-bestPags) : 0;

  document.getElementById('ritmo-hero-card').innerHTML = pagsEsteAnio > 0 ? `
    <div class="ritmo-hero" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="ritmo-hero-main">
        <div class="ritmo-hero-num">${ritmoActual.toFixed(1)}</div>
        <div class="ritmo-hero-label">págs / día · ${yr}</div>
        <div class="ritmo-hero-sub">${pagsEsteAnio.toLocaleString()} págs<br>en ${dayOfYear} días</div>
      </div>
      <div class="ritmo-hero-vs">
        ${ritmoPrev > 0 ? `
          <div class="ritmo-hero-vs-label">vs ${prevYear}</div>
          <div class="ritmo-hero-vs-num" style="color:${colorPrev};">${ritmoPrev.toFixed(1)}</div>
          <div class="ritmo-hero-vs-pct" style="color:${colorPrev};">${upPrev?'▲':'▼'} ${Math.abs(pctPrev)}%</div>
          <div class="ritmo-hero-vs-context">${prevPags.toLocaleString()} págs / ${diasEnAnio(prevYear)} días<br>${upPrev?'+':''}${diffPrev.toFixed(1)} págs/día</div>
        ` : `<div class="ritmo-hero-vs-label" style="font-size:11px;color:rgba(245,240,232,0.4);">Sin datos<br>${prevYear}</div>`}
      </div>
      <div class="ritmo-hero-vs">
        ${bestYear ? `
          <div class="ritmo-hero-vs-label">mejor · ${bestYear}</div>
          <div class="ritmo-hero-vs-num" style="color:${colorBest};">${bestRitmo.toFixed(1)}</div>
          <div class="ritmo-hero-vs-pct" style="color:${colorBest};">${upBest?'▲':'▼'} ${Math.abs(pctBest)}%</div>
          <div class="ritmo-hero-vs-context">Récord ${bestPags.toLocaleString()} págs<br>Proy. ${yr}: ${Math.round(proyeccion).toLocaleString()} (${projDiff>=0?'+':''}${projDiff.toLocaleString()})</div>
        ` : `<div class="ritmo-hero-vs-label" style="font-size:11px;color:rgba(245,240,232,0.4);">Sin histórico<br>aún</div>`}
      </div>
    </div>` : '';

  // ── LEYENDO AHORA — carousel ──────────
  const reading = db.entries.filter(e => e.type === 'libro' && e.estado === 'leyendo');
  const crEl = document.getElementById('currently-reading-list');
  if (reading.length === 0) {
    crEl.innerHTML = '<div style="font-size:13px;color:var(--ink4);font-style:italic;padding:4px 0;">Ningún libro en curso. Toca "+ Lectura en curso" para empezar.</div>';
  } else {
    crEl.innerHTML = reading.map(e => {
      const pct = e.readingMode === 'pag' && e.paginas
        ? Math.round(((e.progresoPag||0) / e.paginas) * 100)
        : (e.progreso || 0);
      const pagActual = e.readingMode === 'pag'
        ? (e.progresoPag||0)
        : Math.round(((e.progreso||0)/100)*(e.paginas||0));
      // Siempre mostrar: "Pág X / total · Y%"
      const progresoText = e.paginas
        ? `Pág ${pagActual} / ${e.paginas} · ${pct}%`
        : `${pct}%`;
      const coverHTML = coverUrl(e)
        ? `<img src="${coverUrl(e)}" class="reading-mini-cover" onerror="this.style.display='none'">`
        : hasPendingCover(e)
          ? `<div class="reading-mini-cover" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:var(--cream2);cursor:pointer;" onclick="openProgressModal('${e.id}')" title="Portada pendiente — sube la imagen desde este dispositivo">
               <span style="font-size:20px;">📷</span>
               <span style="font-size:8px;color:var(--ink4);text-align:center;letter-spacing:0.5px;line-height:1.3;">SUBIR<br>PORTADA</span>
             </div>`
          : `<div class="reading-mini-cover" style="display:flex;align-items:center;justify-content:center;font-size:28px;">📚</div>`;
      const notasCount = (e.notas_lista||[]).length;
      // Estimación días restantes
      const pagsRestantes = e.paginas ? e.paginas - (e.progresoPag || Math.round(((e.progreso||0)/100)*(e.paginas||0))) : null;
      const ritmoInfo = calcRitmoReciente(e.readDates, 7);
      let estimacionHTML = '';
      if (pagsRestantes > 0 && ritmoInfo && ritmoInfo.ritmo > 0) {
        const diasRestantes = Math.ceil(pagsRestantes / ritmoInfo.ritmo);
        const fechaFin = new Date();
        fechaFin.setDate(fechaFin.getDate() + diasRestantes);
        const fechaStr = fechaFin.toLocaleDateString('es', {day:'numeric', month:'short'});
        const nLabel = ritmoInfo.registros >= 7 ? '7d' : `${ritmoInfo.registros}d`;
        estimacionHTML = `<div style="font-size:10px;color:var(--ink4);margin-top:3px;line-height:1.4;">
          📅 ~${diasRestantes} días · ${fechaStr}
          <span style="color:var(--ink4);opacity:0.7;">(${ritmoInfo.ritmo.toFixed(0)} p/d · ${nLabel})</span>
        </div>`;
      } else if (pagsRestantes > 0 && !ritmoInfo) {
        estimacionHTML = `<div style="font-size:10px;color:var(--ink4);margin-top:3px;">📅 Actualiza el progreso para estimar</div>`;
      }
      return `
        <div class="reading-mini-card">
          ${coverHTML}
          <div class="reading-mini-body">
            <div class="reading-mini-title">${e.titulo}</div>
            <div class="reading-mini-autor">${e.autor||''}</div>
            <div style="height:3px;background:var(--cream3);border-radius:2px;margin-top:4px;">
              <div style="height:3px;background:var(--gold);border-radius:2px;width:${pct}%;"></div>
            </div>
            <div class="reading-mini-pct">${progresoText}</div>
            ${estimacionHTML}
          </div>
          <div style="display:flex;gap:0;border-top:1px solid var(--cream3);">
            <button class="reading-mini-btn" style="flex:1;border-right:1px solid var(--cream3);" onclick="openProgressModal('${e.id}')">↑ Actualizar</button>
            <button class="reading-mini-btn" style="flex:0 0 auto;padding:5px 10px;" onclick="openNotasDirectas('${e.id}')" title="Ver notas">📝${notasCount>0?`<span style='font-size:9px;color:var(--ink3);margin-left:2px;'>${notasCount}</span>`:''}</button>
          </div>
        </div>`;
    }).join('');
  }
  updateCarouselArrows('currently-reading-list', 'reading-carousel-arrows', reading.length);

  // ── VIENDO AHORA ─────────────────────
  const watching = db.entries.filter(e => e.type === 'serie' && e.estado === 'viendo');
  const watchEl = document.getElementById('currently-watching-list');
  if (watching.length === 0) {
    watchEl.innerHTML = '<div style="font-size:13px;color:var(--ink4);font-style:italic;padding:4px 0;">Ninguna serie en curso. Toca "+ Serie en curso" para empezar.</div>';
  } else {
    watchEl.innerHTML = watching.map(e => {
      const capActual = parseInt(e.capActual) || 0;
      const capTotal  = parseInt(e.capTotal)  || 0;
      const pct = capTotal > 0 ? Math.round((capActual / capTotal) * 100) : 0;
      const progresoText = capTotal > 0 ? `Cap. ${capActual} / ${capTotal} · ${pct}%` : '📺 Viendo';
      const tempText = e.temporadaActual ? `Temp. ${e.temporadaActual}${e.temporadas?' / '+e.temporadas:''}` : (e.temporadas ? `${e.temporadas} temp.` : '');
      const coverHTML = coverUrl(e)
        ? `<img src="${coverUrl(e)}" class="reading-mini-cover" onerror="this.style.display='none'">`
        : `<div class="reading-mini-cover" style="display:flex;align-items:center;justify-content:center;font-size:28px;">📺</div>`;
      return `
        <div class="reading-mini-card" onclick="showDetail('${e.id}')">
          ${coverHTML}
          <div class="reading-mini-body">
            <div class="reading-mini-title">${e.titulo}</div>
            <div class="reading-mini-autor">${e.director||''}</div>
            ${capTotal > 0 ? `
            <div style="height:3px;background:var(--cream3);border-radius:2px;margin-top:4px;">
              <div style="height:3px;background:var(--red);border-radius:2px;width:${pct}%;"></div>
            </div>` : ''}
            <div class="reading-mini-pct" style="color:var(--red);">${progresoText}</div>
            ${tempText ? `<div style="font-size:10px;color:var(--ink4);">${tempText}</div>` : ''}
          </div>
          <button class="reading-mini-btn" onclick="event.stopPropagation();openSerieProgressModal('${e.id}')">↑ Actualizar</button>
        </div>`;
    }).join('');
    updateCarouselArrows('currently-watching-list', 'watching-carousel-arrows', watching.length);
  }

  // ── RECIENTES ────────────────────────
  const sortRecent = arr => [...arr].sort((a,b) => {
    const mi = MESES.indexOf(a.mes), mj = MESES.indexOf(b.mes);
    const ai = (a.anio||0)*100+(mi>=0?mi:0), bi = (b.anio||0)*100+(mj>=0?mj:0);
    return bi-ai || b.id.localeCompare(a.id);
  });
  const empty = '<div style="font-size:13px;color:var(--ink4);font-style:italic;padding:4px 0;">Nada registrado aún.</div>';

  const recentPels = sortRecent(db.entries.filter(e=>e.type==='pelicula')).slice(0,3);
  document.getElementById('recent-peliculas').innerHTML = recentPels.length ? recentPels.map(e=>entryCardHTML(e)).join('') : empty;

  const recentLibros = sortRecent(db.entries.filter(e=>e.type==='libro'&&e.estado==='leido')).slice(0,3);
  document.getElementById('recent-libros').innerHTML = recentLibros.length ? recentLibros.map(e=>entryCardHTML(e)).join('') : empty;

  const recentSeries = sortRecent(db.entries.filter(e=>e.type==='serie')).slice(0,3);
  document.getElementById('recent-series').innerHTML = recentSeries.length ? recentSeries.map(e=>entryCardHTML(e)).join('') : empty;
}

