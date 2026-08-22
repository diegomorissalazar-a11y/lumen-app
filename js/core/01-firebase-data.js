// ═══════════════════════════════════
//  FIREBASE CONFIG — compat SDK
// ═══════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyBKMfDz3XLJCmjjaYdeT_o1Z05T2yub_Qc",
  authDomain: "lumen-6ed85.firebaseapp.com",
  projectId: "lumen-6ed85",
  storageBucket: "lumen-6ed85.firebasestorage.app",
  messagingSenderId: "473887918286",
  appId: "1:473887918286:web:e3ee5a38f52e9aa107e89f"
};
let auth, firestore;
try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  firestore = firebase.firestore();
} catch(err) {
  console.warn('Firebase no disponible (bloqueado por navegador):', err.message);
  // Modo offline — ocultar overlay de auth y continuar con datos locales
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  // Stub para que el resto del código no crashee
  auth = { onAuthStateChanged: () => {}, signOut: () => Promise.resolve() };
  firestore = { collection: () => ({ doc: () => ({ get: () => Promise.reject('offline'), set: () => Promise.reject('offline'), collection: () => ({ doc: () => ({ get: () => Promise.reject('offline'), set: () => Promise.reject('offline') }) }) }) }) };
}
// enablePersistence() removido — incompatible con Safari iOS

// ═══════════════════════════════════
//  DATA — local + cloud
// ═══════════════════════════════════
const DB_KEY = 'lumen_db_v1';
let currentUser = null;
let unsubscribeSnapshot = null;
let isSyncing = false;

function loadDB() {
  try {
    const r = localStorage.getItem(DB_KEY);
    if (!r) return { entries: [] };
    const parsed = JSON.parse(r);
    (parsed.entries || []).forEach(e => {
      // Normalizar type
      if (e.type) {
        const t = e.type.toLowerCase().trim()
          .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if (t.includes('libro')) e.type = 'libro';
        else if (t.includes('pelicula') || t.includes('movie') || t.includes('film')) e.type = 'pelicula';
        else if (t.includes('serie') || t.includes('series') || t.includes('tv')) e.type = 'serie';
        else e.type = t;
      }
      if (e.idioma) e.idioma = normalizeIdioma(e.idioma);
      // Migrar IDs con apóstrofes (imp_ IDs de CSV con títulos como "Tiffany's")
      if (e.id && e.id.includes("'")) {
        e.id = e.id.replace(/'/g, '');
      }
      // Migrar cover null → '' para evitar src="null" en imágenes
      if (e.cover === null || e.cover === 'null') e.cover = '';
      // Migrar readDates string[] → {date,pag}[] (compatibilidad hacia atrás)
      if (Array.isArray(e.readDates) && e.readDates.length > 0 && typeof e.readDates[0] === 'string') {
        e.readDates = e.readDates.map(d => ({ date: d, pag: null }));
      }
      // Migrar series sin estado — las importadas antes del fix tenían estado: undefined
      if (e.type === 'serie' && !e.estado) e.estado = 'vista';
      // Migrar temporadas desde coleccion para series importadas antes del fix
      if (e.type === 'serie' && !e.temporadas && e.coleccion) {
        const m = String(e.coleccion).match(/\d+/);
        if (m) e.temporadas = parseInt(m[0]);
      }
    });
    normalizeAllBookReading(parsed.entries || [], { repairBasic: true, source: 'loadDB' });
    return parsed;
  } catch { return { entries: [] }; }
}

const IDIOMA_MAP = {
  // Códigos comunes
  'esp':'Español','es':'Español','spa':'Español','castellano':'Español',
  'eng':'Inglés','en':'Inglés','ing':'Inglés','english':'Inglés',
  'deu':'Alemán','de':'Alemán','ger':'Alemán','aleman':'Alemán','alemán':'Alemán',
  'fra':'Francés','fr':'Francés','fre':'Francés','frances':'Francés','francés':'Francés',
  'ita':'Italiano','it':'Italiano','italiano':'Italiano',
  'por':'Portugués','pt':'Portugués','portugues':'Portugués','portugués':'Portugués',
  'chi':'Chino','zh':'Chino','zho':'Chino','chino':'Chino',
  'jap':'Japonés','ja':'Japonés','jpn':'Japonés','japones':'Japonés','japonés':'Japonés',
  'kor':'Coreano','ko':'Coreano','coreano':'Coreano',
  'rus':'Ruso','ru':'Ruso','ruso':'Ruso',
  'ara':'Árabe','ar':'Árabe','arabe':'Árabe','árabe':'Árabe',
  'pol':'Polaco','pl':'Polaco','polaco':'Polaco',
  'swe':'Sueco','sv':'Sueco','sueco':'Sueco',
  'nor':'Noruego','no':'Noruego','noruego':'Noruego',
  'dan':'Danés','da':'Danés','danes':'Danés','danés':'Danés',
  'nld':'Holandés','nl':'Holandés','holandés':'Holandés','holandes':'Holandés',
  'ces':'Checo','cs':'Checo','checo':'Checo',
  'tur':'Turco','tr':'Turco','turco':'Turco',
  'heb':'Hebreo','he':'Hebreo','hebreo':'Hebreo',
  'fas':'Persa','fa':'Persa','persa':'Persa',
  'ell':'Griego','el':'Griego','griego':'Griego',
  'cat':'Catalán','catalan':'Catalán','catalán':'Catalán',
};

function normalizeIdioma(raw) {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  return IDIOMA_MAP[key] || (raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1));
}

// Base idiomas siempre disponibles
const IDIOMAS_BASE = [
  'Alemán','Árabe','Catalán','Checo','Chino','Coreano','Danés','Español',
  'Francés','Griego','Hebreo','Holandés','Inglés','Italiano','Japonés',
  'Noruego','Persa','Polaco','Portugués','Ruso','Sueco','Turco'
];

function getIdiomasDisponibles() {
  // Combinar base + idiomas únicos ya registrados en la biblioteca
  const custom = db.entries
    .filter(e => e.idioma && e.idioma.trim())
    .map(e => normalizeIdioma(e.idioma));
  const all = [...new Set([...IDIOMAS_BASE, ...custom])].sort((a,b) => a.localeCompare(b, 'es'));
  return all;
}

function populateIdiomaSelect(selectedValue) {
  const sel = document.getElementById('f-idioma'); if(!sel) return;
  const idiomas = getIdiomasDisponibles();
  sel.innerHTML = `<option value="">— Seleccionar —</option>` +
    idiomas.map(i => `<option value="${i}"${i===selectedValue?' selected':''}>${i}</option>`).join('') +
    `<option value="__otro__"${selectedValue==='__otro__'?' selected':''}>Otro (escribir a mano)</option>`;
}

function onIdiomaChange(sel) {
  const otroCampo = document.getElementById('f-idioma-otro');
  if (sel.value === '__otro__') {
    otroCampo.style.display = 'block';
    otroCampo.focus();
  } else {
    otroCampo.style.display = 'none';
    otroCampo.value = '';
  }
}

function normalizeIdiomaOtroInput(input) {
  // Capitaliza primera letra en tiempo real
  if (input.value) input.value = input.value.charAt(0).toUpperCase() + input.value.slice(1);
}

function getIdiomaValueFromForm() {
  const sel = document.getElementById('f-idioma');
  if (sel.value === '__otro__') {
    const otro = document.getElementById('f-idioma-otro').value.trim();
    return otro ? normalizeIdioma(otro) : '';
  }
  return sel.value;
}


// ═══════════════════════════════════
//  LECTURA — normalización, auditoría y blindaje v153
// ═══════════════════════════════════
function entryTimestamp(entry) {
  const v = entry && entry._updatedAt;
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (isFinite(n)) return n;
    const t = Date.parse(v);
    if (isFinite(t)) return t;
  }
  return 0;
}

function parsePagValue(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function normalizeDateStr(v) {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function normalizeBookReadDates(arr) {
  if (!Array.isArray(arr)) return [];
  const map = {};
  arr.forEach(item => {
    let date = '', pag = null;
    if (typeof item === 'string') {
      date = normalizeDateStr(item);
    } else if (item && typeof item === 'object') {
      date = normalizeDateStr(item.date || item.fecha || item.dia);
      pag = parsePagValue(item.pag ?? item.pagina ?? item.pagActual ?? item.progresoPag);
    }
    if (!date) return;
    // En el mismo día conservar la marca con página más alta: evita que un dato pobre pise uno completo.
    if (!map[date] || (pag !== null && (map[date].pag === null || pag > map[date].pag))) {
      map[date] = { date, pag };
    }
  });
  return Object.values(map).sort((a,b) => a.date.localeCompare(b.date));
}

function mergeBookReadDatesSmart(a, b) {
  return normalizeBookReadDates([...(Array.isArray(a)?a:[]), ...(Array.isArray(b)?b:[])]);
}

function bookLastReadPag(entry) {
  const norm = normalizeBookReadDates(entry && entry.readDates).filter(r => r.pag !== null);
  return norm.length ? norm[norm.length - 1].pag : null;
}

function normalizeBookReadingFields(entry, opts = {}) {
  if (!entry || entry.type !== 'libro') return { changed:false, warnings:[] };
  let changed = false;
  const warnings = [];
  const originalReadDates = entry.readDates;
  const norm = normalizeBookReadDates(entry.readDates);
  if (Array.isArray(originalReadDates)) {
    if (JSON.stringify(originalReadDates) !== JSON.stringify(norm)) {
      entry.readDates = norm;
      changed = true;
    }
  }

  const total = parsePagValue(entry.paginas);
  const progPag = parsePagValue(entry.progresoPag);
  const progPct = parsePagValue(entry.progreso);
  const lastPag = norm.length ? norm.filter(r => r.pag !== null).slice(-1)[0]?.pag ?? null : null;

  if (!Array.isArray(entry.readDates) && progPct !== null && total) {
    // Repara campo de página actual, pero no inventa historial diario.
    const estimated = Math.round((progPct / 100) * total);
    if (progPag === null && estimated > 0) {
      entry.progresoPag = estimated;
      changed = true;
      warnings.push('Tiene progreso %, se calculó página actual estimada; falta historial diario.');
    }
  }

  if (norm.length > 0) {
    entry.readDates = norm;
    const last = bookLastReadPag(entry);
    if (last !== null && (progPag === null || progPag < last)) {
      entry.progresoPag = last;
      changed = true;
    }
    if (total && last !== null) {
      const pct = Math.max(0, Math.min(100, Math.round((last / total) * 100)));
      if (entry.progreso !== pct && (entry.progreso === null || entry.progreso === undefined || Math.abs(Number(entry.progreso) - pct) > 1)) {
        entry.progreso = pct;
        changed = true;
      }
    }
  }

  // Advertencias no destructivas
  const seq = normalizeBookReadDates(entry.readDates).filter(r => r.pag !== null);
  for (let i = 1; i < seq.length; i++) {
    const diff = seq[i].pag - seq[i-1].pag;
    if (diff < 0) warnings.push(`Retroceso de página ${seq[i-1].date}→${seq[i].date}: ${seq[i-1].pag} a ${seq[i].pag}.`);
    if (diff === 0) warnings.push(`Registro de 0 páginas el ${seq[i].date}.`);
  }
  if (seq.length && seq[0].pag === 0) warnings.push(`Primer registro con 0 páginas el ${seq[0].date}.`);
  if (!seq.length && (entry.progresoPag || entry.progreso)) warnings.push('Tiene progreso, pero no tiene historial diario readDates.');
  const last = bookLastReadPag(entry);
  if (last !== null && entry.progresoPag !== null && entry.progresoPag !== undefined && Number(entry.progresoPag) !== Number(last)) {
    warnings.push(`Diferencia entre progresoPag (${entry.progresoPag}) y última marca readDates (${last}).`);
  }

  if (changed && opts.stamp !== false) entry._updatedAt = Math.max(entryTimestamp(entry), Date.now());
  return { changed, warnings };
}

function normalizeAllBookReading(entries, opts = {}) {
  let changed = false;
  (entries || []).forEach(e => {
    const res = normalizeBookReadingFields(e, opts);
    if (res.changed) changed = true;
  });
  return changed;
}

function auditReadingConsistency() {
  const rows = [];
  db.entries.filter(e => e.type === 'libro').forEach(e => {
    const copy = JSON.parse(JSON.stringify(e));
    const res = normalizeBookReadingFields(copy, { stamp:false });
    const warnings = res.warnings || [];
    if (warnings.length) {
      rows.push({ id:e.id, titulo:e.titulo || 'Sin título', warnings, entry:e });
    }
  });
  return rows;
}

function openReadingConsistencyReport() {
  const modal = document.getElementById('modal-exportar-lectura');
  if (modal) modal.style.display = 'flex';
  const out = document.getElementById('exportar-lectura-output');
  const rows = auditReadingConsistency();
  const lineas = [];
  lineas.push('═══════════════════════════════════════════════');
  lineas.push('REVISIÓN DE CONSISTENCIA DE LECTURA — LUMEN v184');
  lineas.push('Generado: ' + new Date().toLocaleString('es-CL', { timeZone: LUMEN_TZ }));
  lineas.push('═══════════════════════════════════════════════');
  lineas.push('');
  if (!rows.length) {
    lineas.push('Sin anomalías de lectura detectadas.');
  } else {
    lineas.push('Anomalías detectadas: ' + rows.length);
    rows.forEach((r, idx) => {
      lineas.push('');
      lineas.push((idx+1) + '. ' + r.titulo);
      r.warnings.forEach(w => lineas.push('   - ' + w));
    });
  }
  lineas.push('');
  lineas.push('Nota: los registros con 0 páginas no cuentan como día activo en heatmap, adherencia ni exportación.');
  lineas.push('');
  lineas.push('Para reparar campos básicos sin inventar historial, usa el botón “Reparar campos básicos de lectura” del modal de Importar datos.');
  if (out) out.value = lineas.join('\n');
}

async function repairReadingConsistencyBasic() {
  const before = JSON.stringify(db.entries);
  const changed = normalizeAllBookReading(db.entries, { repairBasic:true, source:'manual' });
  if (!changed && before === JSON.stringify(db.entries)) {
    showToast('✓ Sin reparaciones necesarias');
    return false;
  }
  saveDB();
  renderAll();
  showToast('✓ Consistencia de lectura reparada');
  return true;
}

