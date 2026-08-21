// ═══════════════════════════════════
//  SEGMENTED CONTROL
// ═══════════════════════════════════
function switchStatsSeg(seg, btn) {
  document.querySelectorAll('.stats-seg-btn').forEach(b=>b.classList.toggle('active',b===btn));
  document.querySelectorAll('.stats-panel').forEach(p=>p.classList.toggle('active',p.id==='spanel-'+seg));
  if (seg==='libros') renderStatsLibros();
  else if (seg==='peliculas') renderStatsPeliculas();
  else if (seg==='series') renderStatsSeries();
  else if (seg==='discos') renderStatsDiscos();
  else if (seg==='global') renderStatsGlobal();
}

function renderStats() { renderStatsLibros(); }

// ═══════════════════════════════════
//  IMPORT CSV — compatible con planilla personal
// ═══════════════════════════════════

// Parsea CSV respetando campos entre comillas que contienen comas
function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

// Normaliza un header para comparación flexible
function normHeader(h) {
  return h.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes
    .replace(/[^a-z0-9\/]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Busca un valor en el row por múltiples variantes del nombre de columna
function col(row, ...keys) {
  for (const k of keys) {
    const norm = normHeader(k);
    const found = Object.keys(row).find(rk => normHeader(rk) === norm || normHeader(rk).includes(norm));
    if (found && row[found] && row[found] !== 'No aplica' && row[found] !== 'No Aplica' && row[found] !== '-') {
      return row[found].trim();
    }
  }
  return '';
}

// Meses en español → nombre normalizado
const MES_MAP = {
  '1':'Enero','2':'Febrero','3':'Marzo','4':'Abril','5':'Mayo','6':'Junio',
  '7':'Julio','8':'Agosto','9':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre',
  'ene':'Enero','feb':'Febrero','mar':'Marzo','abr':'Abril','may':'Mayo','jun':'Junio',
  'jul':'Julio','ago':'Agosto','sep':'Septiembre','oct':'Octubre','nov':'Noviembre','dic':'Diciembre',
  'enero':'Enero','febrero':'Febrero','marzo':'Marzo','abril':'Abril','mayo':'Mayo','junio':'Junio',
  'julio':'Julio','agosto':'Agosto','septiembre':'Septiembre','octubre':'Octubre','noviembre':'Noviembre','diciembre':'Diciembre',
  'january':'Enero','february':'Febrero','march':'Marzo','april':'Abril','may':'Mayo','june':'Junio',
  'july':'Julio','august':'Agosto','september':'Septiembre','october':'Octubre','november':'Noviembre','december':'Diciembre'
};

function normMes(val) {
  if (!val) return '';
  const v = val.toLowerCase().trim();
  return MES_MAP[v] || val;
}


// ═══════════════════════════════════
//  RECUPERACIÓN LECTURAS DESDE CHAT — v152
//  Reconstruida desde export LUMEN 22-06-2026 + lectura Chéjov 27-06-2026
// ═══════════════════════════════════
function lumenNormTitleForRecovery(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/["'’‘]/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ');
}

const LUMEN_READING_RECOVERY_20260627 = [
  {
    titulo: 'Viaje al Oeste', autor: 'Wu Cheng’en', paginas: 2206, anio: 2026, mes: 'junio', estado: 'leido', progreso: 100, progresoPag: 2206,
    readDates: [
      {date:'2026-01-05',pag:19},{date:'2026-01-07',pag:28},{date:'2026-01-15',pag:68},{date:'2026-01-18',pag:100},
      {date:'2026-01-20',pag:126},{date:'2026-01-24',pag:168},{date:'2026-01-27',pag:200},{date:'2026-01-28',pag:219},
      {date:'2026-02-07',pag:310},{date:'2026-02-28',pag:370},{date:'2026-03-01',pag:380},{date:'2026-03-03',pag:408},
      {date:'2026-03-05',pag:441},{date:'2026-03-06',pag:469},{date:'2026-03-11',pag:503},{date:'2026-03-15',pag:546},
      {date:'2026-03-16',pag:562},{date:'2026-04-05',pag:755},{date:'2026-04-06',pag:765},{date:'2026-04-07',pag:773},
      {date:'2026-04-08',pag:777},{date:'2026-04-09',pag:789},{date:'2026-04-10',pag:801},{date:'2026-04-11',pag:815},
      {date:'2026-04-12',pag:825},{date:'2026-04-13',pag:880},{date:'2026-04-14',pag:901},{date:'2026-04-15',pag:911},
      {date:'2026-04-16',pag:914},{date:'2026-04-17',pag:945},{date:'2026-04-18',pag:1012},{date:'2026-04-19',pag:1066},
      {date:'2026-04-20',pag:1132},{date:'2026-04-21',pag:1158},{date:'2026-04-22',pag:1162},{date:'2026-04-23',pag:1175},
      {date:'2026-04-24',pag:1189},{date:'2026-04-25',pag:1215},{date:'2026-04-26',pag:1242},{date:'2026-04-27',pag:1259},
      {date:'2026-04-28',pag:1290},{date:'2026-04-29',pag:1301},{date:'2026-04-30',pag:1307},{date:'2026-05-01',pag:1318},
      {date:'2026-05-03',pag:1328},{date:'2026-05-05',pag:1344},{date:'2026-05-07',pag:1353},{date:'2026-05-10',pag:1395},
      {date:'2026-05-12',pag:1406},{date:'2026-05-13',pag:1414},{date:'2026-05-14',pag:1425},{date:'2026-05-16',pag:1440},
      {date:'2026-05-17',pag:1457},{date:'2026-05-18',pag:1487},{date:'2026-05-20',pag:1514},{date:'2026-05-21',pag:1563},
      {date:'2026-05-22',pag:1582},{date:'2026-05-23',pag:1618},{date:'2026-05-24',pag:1642},{date:'2026-05-25',pag:1720},
      {date:'2026-05-26',pag:1732},{date:'2026-05-28',pag:1775},{date:'2026-05-29',pag:1786},{date:'2026-05-30',pag:1804},
      {date:'2026-05-31',pag:1816},{date:'2026-06-01',pag:1854},{date:'2026-06-07',pag:2006},{date:'2026-06-13',pag:2206}
    ]
  },
  {
    titulo: 'Cuando China Dominó los Mares', autor: 'Louise Levathes', paginas: 252, anio: 2026, mes: 'marzo', estado: 'leido', progreso: 20, progresoPag: 50,
    readDates: [{date:'2026-02-28',pag:25},{date:'2026-03-02',pag:38},{date:'2026-03-03',pag:45},{date:'2026-03-06',pag:50}]
  },
  {
    titulo: 'El emperador de los mares', autor: 'Jack Weatherford', paginas: 352, anio: 2026, mes: 'junio', estado: 'leyendo', progresoPag: 55,
    readDates: [{date:'2026-04-04',pag:47},{date:'2026-04-05',pag:52},{date:'2026-06-22',pag:55}]
  },
  {
    titulo: 'Arsenio Lupin contra Herlock Sholmes', autor: 'Maurice Leblanc', paginas: 256, anio: 2026, mes: 'junio', estado: 'leido', progreso: 100, progresoPag: 256,
    readDates: [{date:'2026-06-14',pag:5},{date:'2026-06-15',pag:41},{date:'2026-06-17',pag:51},{date:'2026-06-18',pag:97},{date:'2026-06-19',pag:113},{date:'2026-06-20',pag:154},{date:'2026-06-21',pag:187},{date:'2026-06-22',pag:256}]
  },
  {
    titulo: 'Cuentos completos [1885-1886]', autor: 'Antón Chéjov', paginas: 1136, anio: 2026, mes: 'junio', estado: 'leyendo', progresoPag: 57,
    readDates: [{date:'2026-06-27',pag:57}]
  }
];

function downloadRecoveryBackupV152(key, data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = key + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 300);
  } catch (err) {
    console.warn('No se pudo descargar respaldo automático:', err);
  }
}

function recuperarLecturasDesdeChat() {
  const ok = confirm('Se fusionarán las lecturas históricas reconstruidas desde este chat. Antes se guardará un respaldo local automático. ¿Continuar?');
  if (!ok) return;

  try {
    const backupKey = 'lumen_backup_pre_recuperacion_lectura_20260627_' + Date.now();
    safeLocalSetItem(backupKey, JSON.stringify(db));
    downloadRecoveryBackupV152(backupKey, db);
  } catch (err) {
    console.warn('Backup local falló:', err);
  }

  if (!db || !Array.isArray(db.entries)) db = { entries: [] };
  const byTitle = {};
  db.entries.forEach((e, idx) => {
    if (e && e.type === 'libro' && e.titulo) byTitle[lumenNormTitleForRecovery(e.titulo)] = { entry:e, idx };
  });

  let creados = 0, actualizados = 0, fechasAgregadas = 0;
  const now = Date.now();

  LUMEN_READING_RECOVERY_20260627.forEach(src => {
    const key = lumenNormTitleForRecovery(src.titulo);
    let target = byTitle[key] ? byTitle[key].entry : null;
    if (!target) {
      target = {
        id: 'rec_libro_' + key.replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') + '_20260627',
        type: 'libro', titulo: src.titulo, autor: src.autor || '', paginas: src.paginas || 0,
        anio: src.anio || 2026, mes: src.mes || 'junio', estado: src.estado || 'leyendo',
        progreso: src.progreso || null, progresoPag: src.progresoPag || null,
        notas: '', cover: '', readDates: [], _createdAt: now
      };
      db.entries.push(target);
      byTitle[key] = { entry: target, idx: db.entries.length - 1 };
      creados++;
    } else {
      actualizados++;
    }

    // Completar metadatos sin borrar campos existentes valiosos
    target.type = 'libro';
    if (!target.autor && src.autor) target.autor = src.autor;
    if (!target.paginas || target.paginas < src.paginas) target.paginas = src.paginas;
    if (!target.anio && src.anio) target.anio = src.anio;
    if (!target.mes && src.mes) target.mes = src.mes;
    if (src.progresoPag && (!target.progresoPag || target.progresoPag < src.progresoPag)) target.progresoPag = src.progresoPag;
    if (src.progreso && (!target.progreso || target.progreso < src.progreso)) target.progreso = src.progreso;
    if (src.estado === 'leido') target.estado = 'leido';
    else if (!target.estado) target.estado = src.estado || 'leyendo';

    const existing = normalizeReadDates(target.readDates || []);
    const before = existing.length;
    target.readDates = mergeReadDates(existing, src.readDates || []);
    fechasAgregadas += Math.max(0, target.readDates.length - before);
    target._updatedAt = now;
  });

  saveDB();
  try { renderHome(); } catch(e) {}
  try { renderLibrary(); } catch(e) {}
  try { renderStats(); } catch(e) {}
  try { renderHabitos(); } catch(e) {}
  closeModal('modal-import');
  showToast(`✓ Recuperación aplicada: ${creados} libros creados, ${actualizados} actualizados, ${fechasAgregadas} fechas agregadas`, 4200);
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;

    // ── JSON backup ──
    if (file.name.endsWith('.json')) {
      try {
        const imported = JSON.parse(text);
        if (imported.entries) {
          db.entries = [...db.entries, ...imported.entries];
          saveDB();
          closeModal('modal-import');
          showToast(`✓ ${imported.entries.length} entradas importadas`);
          renderHome();
        }
      } catch { showToast('Error en archivo JSON'); }
      return;
    }

    // ── CSV ──
    // Soporte BOM UTF-8
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { showToast('El archivo está vacío o no tiene datos'); return; }

    const rawHeaders = parseCSVLine(lines[0]);
    // Construir mapa header → índice
    const headerMap = {};
    rawHeaders.forEach((h, i) => { headerMap[h.trim()] = i; });

    let count = 0, skipped = 0;
    const importedIds = new Set(db.entries.map(e => e.id));

    let countLibros = 0, countPeliculas = 0, countSeries = 0;
    let skipDuplicados = 0, skipSinCategoria = 0, skipSinTitulo = 0;
    const duplicadosList = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;

      const row = {};
      rawHeaders.forEach((h, idx) => { row[h.trim()] = (cols[idx] || '').trim(); });

      const catRaw = col(row, 'Categoría', 'Categoria', 'tipo', 'type', 'category') || '';
      const cat = catRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      let type = null;
      if (cat.includes('libro')) type = 'libro';
      else if (cat.includes('pelicula') || cat.includes('película') || cat.includes('movie') || cat.includes('film')) type = 'pelicula';
      else if (cat.includes('serie') || cat.includes('series') || cat.includes('tv')) type = 'serie';
      if (!type) { skipSinCategoria++; skipped++; continue; }

      const titulo = col(row, 'Nombre', 'Título', 'Titulo', 'title', 'nombre');
      if (!titulo) { skipSinTitulo++; skipped++; continue; }

      const anioLecRaw = col(row, 'Año de Lec', 'Año de Lec.', 'Anio de Lec', 'año lectura', 'año visto', 'anio', 'year');
      const anio = parseInt(anioLecRaw) || null;
      const mesRaw = col(row, 'Mes de Lec', 'Mes de Lec.', 'mes lectura', 'mes visto', 'mes', 'month');
      const mesNum = col(row, 'N° Mes', 'N Mes', 'Nro Mes', 'num mes');
      const mes = normMes(mesRaw) || normMes(mesNum);

      const autorDir = col(row, 'Autor/Director', 'Autor / Director', 'autor', 'director', 'author', 'director');
      const pagsMin = parseInt(col(row, 'Páginas / Minutos totales', 'Paginas / Minutos totales', 'Páginas', 'Minutos', 'paginas', 'duracion', 'pages', 'minutes', 'duration')) || 0;
      const anioPub = parseInt(col(row, 'Publicación', 'Publicacion', 'Año publicación', 'año estreno', 'estreno', 'year published')) || null;
      const idioma = col(row, 'LEN', 'Idioma', 'Idioma original', 'language', 'lang');
      const editorial = col(row, 'Editorial', 'editorial', 'publisher');
      const traductor = col(row, 'Traductor', 'traductor', 'translator');
      const coleccion = col(row, 'Colección', 'Coleccion', 'collection', 'saga', 'Temporada/ Saga', 'Temporada/Saga');
      const musica = col(row, 'Música', 'Musica', 'music', 'bso', 'soundtrack');
      const fotografia = col(row, 'Fotografía', 'Fotografia', 'photography', 'cinematography');
      const guion = col(row, 'Guion', 'Guión', 'script', 'writer', 'screenplay');
      const protagonista = col(row, 'Protagonista', 'protagonista', 'actor', 'lead');
      const dirigidaPor = col(row, 'Dirigida por', 'Dirigido por', 'director film');
      const basadaEn = col(row, 'Basado en', 'basado en', 'based on');
      const tituloOrig = col(row, 'Título', 'Titulo original', 'title original');
      const ideaOrig = col(row, 'Idea Original', 'idea original', 'original idea', 'autor original');
      const numTemporada = type === 'serie' ? (parseInt(coleccion) || null) : null;

      const uid = `imp_${type}_${titulo}_${numTemporada||''}_${anio || ''}`
        .replace(/['"]/g, '').replace(/\s+/g,'_').toLowerCase();
      if (importedIds.has(uid)) {
        skipDuplicados++;
        skipped++;
        duplicadosList.push({ titulo, type, temporada: numTemporada });
        continue;
      }

      const entry = {
        id: uid, type, titulo, anio, mes, notas: '',
        estado: type === 'libro' ? 'leido' : type === 'serie' ? 'vista' : null,
        progreso: type === 'libro' ? 100 : null,
        autor: type === 'libro' ? autorDir : '',
        editorial, traductor, idioma,
        paginas: type === 'libro' ? pagsMin : 0,
        anio_pub: anioPub,
        coleccion: type !== 'serie' ? coleccion : null,
        director: type !== 'libro' ? (autorDir || dirigidaPor) : '',
        duracion: type !== 'libro' ? pagsMin : 0,
        musica, fotografia, guionista: guion, protagonista,
        anio_est: anioPub,
        temporadas: numTemporada,
        basada: basadaEn ? basadaEn.toLowerCase() : '',
        autor_original: ideaOrig || tituloOrig,
        cover: ''
      };

      db.entries.push(entry);
      importedIds.add(uid);
      count++;
      if (type === 'libro') countLibros++;
      else if (type === 'pelicula') countPeliculas++;
      else if (type === 'serie') countSeries++;
    }

    saveDB();
    closeModal('modal-import');
    renderHome();

    // Mostrar resumen detallado en modal
    showImportResult({ count, countLibros, countPeliculas, countSeries,
      skipped, skipDuplicados, skipSinCategoria, skipSinTitulo, duplicadosList });
  };

  // Intentar UTF-8 primero, luego latin1 si hay error
  reader.readAsText(file, 'UTF-8');
}

function showSyncPreview({ nuevas, actualizadas, sinCambios, remote, onConfirm }) {
  const typeIcon = t => t==='libro'?'📚':t==='pelicula'?'🎬':'📺';
  const fieldLabel = f => ({
    generos:'géneros', notas_lista:'notas', readDates:'días lectura',
    progresoPag:'página actual', progreso:'progreso %', estado:'estado',
    cover:'portada', temporadas:'temporada', capActual:'capítulo actual',
    capTotal:'total caps', musica:'música', guionista:'guionista',
    protagonista:'protagonista', duracion:'duración', idioma:'idioma', notas:'nota'
  }[f] || f);

  let html = `<div style="text-align:center;margin-bottom:16px;">
    <div style="font-size:11px;color:var(--ink4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Resumen de cambios en la nube</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">
      <div class="stat-box"><div class="stat-num" style="font-size:22px;color:var(--green);">${nuevas.length}</div><div class="stat-label">Nuevas</div></div>
      <div class="stat-box"><div class="stat-num" style="font-size:22px;color:var(--gold);">${actualizadas.length}</div><div class="stat-label">Actualizadas</div></div>
      <div class="stat-box"><div class="stat-num" style="font-size:22px;color:var(--ink4);">${sinCambios.length}</div><div class="stat-label">Sin cambios</div></div>
    </div>
  </div>`;

  if (nuevas.length === 0 && actualizadas.length === 0) {
    html += `<div style="text-align:center;padding:12px;background:var(--cream2);border-radius:8px;font-size:13px;color:var(--ink3);margin-bottom:16px;">
      ✅ Los registros de la nube están al día según timestamps.<br>
      <span style="font-size:11px;color:var(--ink4);">Si algo no aparece, usa "Re-merge" para forzar la sincronización de campos.</span>
    </div>`;
  } else {
    // Entradas nuevas (máx 5)
    if (nuevas.length > 0) {
      html += `<div style="margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--green);margin-bottom:6px;">✚ Entradas nuevas</div>`;
      nuevas.slice(0,5).forEach(e => {
        html += `<div style="font-size:12px;color:var(--ink2);padding:4px 0;border-bottom:1px solid var(--cream2);">${typeIcon(e.type)} ${e.titulo||'Sin título'}</div>`;
      });
      if (nuevas.length > 5) html += `<div style="font-size:11px;color:var(--ink4);margin-top:2px;">…y ${nuevas.length-5} más</div>`;
      html += `</div>`;
    }

    // Entradas actualizadas (máx 5)
    if (actualizadas.length > 0) {
      html += `<div style="margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;">↑ Entradas actualizadas</div>`;
      actualizadas.slice(0,5).forEach(({remote: e, fields}) => {
        const fieldStr = fields.map(fieldLabel).join(', ');
        html += `<div style="font-size:12px;color:var(--ink2);padding:4px 0;border-bottom:1px solid var(--cream2);">
          ${typeIcon(e.type)} ${e.titulo||'Sin título'}
          <span style="font-size:10px;color:var(--ink4);display:block;">${fieldStr}</span>
        </div>`;
      });
      if (actualizadas.length > 5) html += `<div style="font-size:11px;color:var(--ink4);margin-top:2px;">…y ${actualizadas.length-5} más</div>`;
      html += `</div>`;
    }
  }

  html += `<div style="display:flex;gap:8px;margin-top:4px;">`;
  const btnLabel = (nuevas.length > 0 || actualizadas.length > 0) ? 'Aplicar cambios' : '🔄 Re-merge (forzar)';
  html += `<button class="btn btn-primary" style="flex:2;" onclick="
    closeModal('modal-sync-preview');
    if(window._syncConfirmFn) window._syncConfirmFn();
  ">${btnLabel}</button>`;
  html += `<button class="btn btn-secondary" style="flex:1;" onclick="closeModal('modal-sync-preview')">Cancelar</button>
  </div>`;

  // Guardar callback
  window._syncConfirmFn = onConfirm;

  // Crear o reutilizar modal
  let modal = document.getElementById('modal-sync-preview');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-sync-preview';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title">📥 Vista previa sincronización</div>
          <button class="btn-icon" onclick="closeModal('modal-sync-preview')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="sync-preview-body"></div>
      </div>`;
    modal.addEventListener('click', function(e) { if (e.target===this) closeModal('modal-sync-preview'); });
    document.body.appendChild(modal);
  }
  document.getElementById('sync-preview-body').innerHTML = html;
  openModal('modal-sync-preview');
}

function showImportResult({ count, countLibros, countPeliculas, countSeries,
    skipped, skipDuplicados, skipSinCategoria, skipSinTitulo, duplicadosList }) {

  const totalRows = count + skipped;
  const icon = count > 0 ? '✅' : '⚠️';

  let html = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:36px;margin-bottom:8px;">${icon}</div>
      <div style="font-family:var(--font-serif);font-size:22px;font-weight:700;">${count} entrada${count!==1?'s':''} importada${count!==1?'s':''}</div>
      <div style="font-size:12px;color:var(--ink4);margin-top:4px;">${totalRows} filas procesadas en total</div>
    </div>`;

  // Desglose de importadas
  if (count > 0) {
    html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">`;
    if (countLibros > 0) html += `<div class="stat-box"><div class="stat-num" style="font-size:24px;">${countLibros}</div><div class="stat-label">📚 Libros</div></div>`;
    if (countPeliculas > 0) html += `<div class="stat-box"><div class="stat-num" style="font-size:24px;">${countPeliculas}</div><div class="stat-label">🎬 Películas</div></div>`;
    if (countSeries > 0) html += `<div class="stat-box"><div class="stat-num" style="font-size:24px;">${countSeries}</div><div class="stat-label">📺 Series</div></div>`;
    html += `</div>`;
  }

  // Desglose de omitidas
  if (skipped > 0) {
    html += `<div style="background:var(--cream2);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:8px;">⚠ ${skipped} omitida${skipped!==1?'s':''}</div>`;

    if (skipDuplicados > 0)
      html += `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--cream3);font-size:13px;">
        <span style="color:var(--ink2);">🔁 Duplicadas (ya existían)</span>
        <span style="font-weight:700;color:var(--ink);">${skipDuplicados}</span>
      </div>`;
    if (skipSinCategoria > 0)
      html += `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--cream3);font-size:13px;">
        <span style="color:var(--ink2);">❓ Sin categoría reconocida</span>
        <span style="font-weight:700;color:var(--ink);">${skipSinCategoria}</span>
      </div>`;
    if (skipSinTitulo > 0)
      html += `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
        <span style="color:var(--ink2);">📭 Sin título</span>
        <span style="font-weight:700;color:var(--ink);">${skipSinTitulo}</span>
      </div>`;
    html += `</div>`;

    // Lista de duplicados (máx 5)
    if (duplicadosList.length > 0) {
      html += `<div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);margin-bottom:6px;">Duplicados detectados</div>`;
      duplicadosList.slice(0, 5).forEach(d => {
        const typeLabel = d.type==='libro'?'📚':d.type==='pelicula'?'🎬':'📺';
        const temp = d.temporada ? ` T${d.temporada}` : '';
        html += `<div style="font-size:12px;color:var(--ink3);padding:3px 0;border-bottom:1px solid var(--cream2);">${typeLabel} ${d.titulo}${temp}</div>`;
      });
      if (duplicadosList.length > 5)
        html += `<div style="font-size:11px;color:var(--ink4);margin-top:4px;">…y ${duplicadosList.length - 5} más</div>`;
      html += `</div>`;
    }
  }

  html += `<button class="btn btn-primary" onclick="closeModal('modal-import-result')">Entendido</button>`;

  // Crear o reutilizar modal de resultado
  let modal = document.getElementById('modal-import-result');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-import-result';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:360px;">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title">Resultado de importación</div>
          <button class="btn-icon" onclick="closeModal('modal-import-result')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="import-result-body"></div>
      </div>`;
    modal.addEventListener('click', function(e) { if (e.target === this) closeModal('modal-import-result'); });
    document.body.appendChild(modal);
  }
  document.getElementById('import-result-body').innerHTML = html;
  openModal('modal-import-result');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `LUMEN_backup_${todaySantiagoStr()}.json`;
  a.click();
  showToast('✓ Datos exportados');
}

function isLumenBase64Image(value) {
  return typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value);
}

function sanitizeLumenBackupValue(value) {
  if (isLumenBase64Image(value)) return '__local_image__';
  if (Array.isArray(value)) return value.map(sanitizeLumenBackupValue);
  if (value && typeof value === 'object') {
    const clean = {};
    Object.keys(value).forEach(key => {
      clean[key] = sanitizeLumenBackupValue(value[key]);
    });
    return clean;
  }
  return value;
}

function readLumenStorageBlock(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return { exists: false, value: null, format: 'missing' };
  try {
    return { exists: true, value: JSON.parse(raw), format: 'json' };
  } catch (_) {
    return { exists: true, value: raw, format: 'text' };
  }
}

function countLumenBlock(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.entries)) return value.entries.length;
    if (Array.isArray(value.influencias) || Array.isArray(value.rutas)) {
      return (value.influencias || []).length + (value.rutas || []).length;
    }
    return Object.keys(value).length;
  }
  return value === null || value === '' ? 0 : 1;
}

function exportarRespaldoIntegral() {
  try {
    const storageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lumen_')) storageKeys.push(key);
    }
    storageKeys.sort();

    const blocks = {};
    const summary = {};
    let replacedImages = 0;

    const replaceAndCount = value => {
      if (isLumenBase64Image(value)) {
        replacedImages++;
        return '__local_image__';
      }
      if (Array.isArray(value)) return value.map(replaceAndCount);
      if (value && typeof value === 'object') {
        const out = {};
        Object.keys(value).forEach(k => { out[k] = replaceAndCount(value[k]); });
        return out;
      }
      return value;
    };

    storageKeys.forEach(key => {
      const block = readLumenStorageBlock(key);
      blocks[key] = {
        format: block.format,
        value: replaceAndCount(block.value)
      };
      summary[key] = {
        format: block.format,
        records: countLumenBlock(block.value)
      };
    });

    // Asegura la biblioteca en memoria aunque localStorage estuviera desactualizado.
    const memoryDb = replaceAndCount(db);
    blocks.__memory_db_snapshot__ = { format: 'json', value: memoryDb };
    summary.__memory_db_snapshot__ = { format: 'json', records: countLumenBlock(db) };

    const payload = {
      schema: 'lumen_respaldo_integral_v1',
      app: 'LUMEN',
      version: 'v161',
      exportedAt: new Date().toISOString(),
      exportedAtSantiago: todaySantiagoStr(),
      imagePolicy: {
        base64Excluded: true,
        replacement: '__local_image__',
        replacedImages
      },
      summary,
      blocks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LUMEN_respaldo_integral_v161_${todaySantiagoStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`✓ Respaldo integral exportado · ${storageKeys.length} bloques`);
  } catch (err) {
    console.error('Error exportando respaldo integral:', err);
    showToast('⚠ No se pudo exportar el respaldo integral');
  }
}



// ═══════════════════════════════════
//  RESTAURACIÓN DE RESPALDO INTEGRAL — v161
// ═══════════════════════════════════
let pendingIntegralRestore = null;

function openIntegralRestorePicker() {
  const input = document.getElementById('integral-restore-input');
  if (!input) return showToast('⚠ No se encontró el selector de respaldo');
  input.value = '';
  input.click();
}

function integralRestoreLabel(key) {
  const labels = {
    lumen_db_v1: 'Biblioteca y actividad principal',
    lumen_inventory_v1: 'Inventario físico',
    lumen_mapas_v1: 'Mapas e influencias',
    lumen_desafios_v1: 'Desafíos',
    lumen_meta_semanal_pags_v1: 'Meta semanal',
    lumen_ruta_custom_v1: 'Rutas personalizadas',
    lumen_ruta_programas_v1: 'Programas de rutas',
    lumen_norm_blacklist_v1: 'Normalizaciones',
    lumen_last_sync: 'Marca de última sincronización'
  };
  if (labels[key]) return labels[key];
  if (key.includes('backup')) return 'Respaldo histórico · ' + key;
  return key;
}

function isIntegralRestoreDefaultKey(key) {
  return !key.startsWith('__') && !key.includes('_backup_before_') && !key.includes('_backup_before_import');
}

function handleIntegralRestoreFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!payload || payload.app !== 'LUMEN' || payload.schema !== 'lumen_respaldo_integral_v1' || !payload.blocks || typeof payload.blocks !== 'object') {
        throw new Error('El archivo no corresponde a un respaldo integral compatible de LUMEN.');
      }
      const keys = Object.keys(payload.blocks).filter(k => !k.startsWith('__'));
      if (!keys.length) throw new Error('El respaldo no contiene bloques restaurables.');
      pendingIntegralRestore = { payload, fileName: file.name, keys };
      renderIntegralRestorePreview();
      closeModal('modal-import');
      openModal('modal-integral-restore');
    } catch (err) {
      console.error('Respaldo integral inválido:', err);
      pendingIntegralRestore = null;
      showToast('⚠ ' + (err.message || 'No se pudo leer el respaldo'));
    }
  };
  reader.onerror = () => showToast('⚠ No se pudo leer el archivo');
  reader.readAsText(file);
}

function renderIntegralRestorePreview() {
  if (!pendingIntegralRestore) return;
  const { payload, fileName, keys } = pendingIntegralRestore;
  const summary = document.getElementById('integral-restore-summary');
  const blocks = document.getElementById('integral-restore-blocks');
  const date = payload.exportedAtSantiago || (payload.exportedAt ? String(payload.exportedAt).slice(0,10) : '—');
  summary.innerHTML = `<div style="font-size:13px;line-height:1.65;color:var(--ink2);"><strong>${escapeHtml(fileName)}</strong><br>Origen: ${escapeHtml(payload.version || 'versión no indicada')} · ${escapeHtml(date)}<br>${keys.length} bloques disponibles</div>`;
  blocks.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:10px;"><button class="btn btn-secondary" style="padding:8px 10px;font-size:11px;" onclick="setIntegralRestoreChecks(true)">Seleccionar principales</button><button class="btn btn-secondary" style="padding:8px 10px;font-size:11px;" onclick="setIntegralRestoreChecks(false)">Deseleccionar</button></div>` + keys.map(key => {
    const meta = payload.summary && payload.summary[key] ? payload.summary[key] : {};
    const checked = isIntegralRestoreDefaultKey(key) ? 'checked' : '';
    const records = Number.isFinite(meta.records) ? `${meta.records} registros` : (meta.format || payload.blocks[key].format || 'bloque');
    return `<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border);font-size:12px;line-height:1.4;"><input type="checkbox" class="integral-restore-check" value="${escapeHtml(key)}" ${checked} style="margin-top:2px;"><span><strong>${escapeHtml(integralRestoreLabel(key))}</strong><br><span style="color:var(--ink4);">${escapeHtml(records)}</span></span></label>`;
  }).join('');
}

function setIntegralRestoreChecks(selectMain) {
  document.querySelectorAll('.integral-restore-check').forEach(cb => {
    cb.checked = selectMain ? isIntegralRestoreDefaultKey(cb.value) : false;
  });
}

function preserveLocalImages(backupValue, currentValue) {
  if (backupValue === '__local_image__') return isLumenBase64Image(currentValue) ? currentValue : '';
  if (Array.isArray(backupValue)) {
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    return backupValue.map((item, index) => {
      let currentItem = currentArray[index];
      if (item && typeof item === 'object' && item.id) currentItem = currentArray.find(x => x && x.id === item.id) || currentItem;
      return preserveLocalImages(item, currentItem);
    });
  }
  if (backupValue && typeof backupValue === 'object') {
    const out = {};
    const currentObj = currentValue && typeof currentValue === 'object' ? currentValue : {};
    Object.keys(backupValue).forEach(key => { out[key] = preserveLocalImages(backupValue[key], currentObj[key]); });
    return out;
  }
  return backupValue;
}

function downloadCurrentSafetyBackup() {
  const originalVersion = document.title;
  exportarRespaldoIntegral();
  return originalVersion;
}

function confirmIntegralRestore() {
  if (!pendingIntegralRestore) return showToast('⚠ No hay respaldo pendiente');
  const selected = Array.from(document.querySelectorAll('.integral-restore-check:checked')).map(cb => cb.value);
  if (!selected.length) return showToast('⚠ Selecciona al menos un bloque');
  if (!confirm(`Se restaurarán ${selected.length} bloques y la app se recargará. ¿Continuar?`)) return;
  try {
    downloadCurrentSafetyBackup();
    const payload = pendingIntegralRestore.payload;
    selected.forEach(key => {
      const block = payload.blocks[key];
      if (!block) return;
      const currentBlock = readLumenStorageBlock(key);
      const restored = preserveLocalImages(block.value, currentBlock.exists ? currentBlock.value : null);
      if (block.format === 'text' && typeof restored === 'string') safeLocalSetItem(key, restored);
      else safeLocalSetItem(key, JSON.stringify(restored));
    });
    safeLocalSetItem('lumen_restore_v1', JSON.stringify({
      restoredAt: new Date().toISOString(),
      sourceVersion: payload.version || '',
      sourceExportedAt: payload.exportedAt || '',
      blocks: selected
    }));
    pendingIntegralRestore = null;
    showToast('✓ Respaldo restaurado · recargando LUMEN');
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    console.error('Error restaurando respaldo integral:', err);
    showToast('⚠ No se pudo completar la restauración');
  }
}

// ═══════════════════════════════════
//  EXPORTADOR CSV HISTÓRICO COMPLETO
// ═══════════════════════════════════
function csvHistoricoNoAplica(v) {
  if (v === null || v === undefined) return 'No aplica';
  if (Array.isArray(v)) return v.length ? v.join(' | ') : 'No aplica';
  const str = String(v).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 'No aplica';
  return str;
}

function csvHistoricoLimpio(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(' | ');
  return String(v).replace(/\r?\n/g, ' | ').trim();
}

function csvHistoricoEscape(v) {
  const str = csvHistoricoLimpio(v);
  return '"' + str.replace(/"/g, '""') + '"';
}

function csvHistoricoCategoria(type) {
  return type === 'libro' ? 'Libro' : type === 'pelicula' ? 'Pelicula' : type === 'serie' ? 'Serie' : type === 'disco' ? 'Disco' : csvHistoricoNoAplica(type);
}

function csvHistoricoNumeroMes(mes) {
  const idx = MESES.indexOf(mes);
  return idx >= 0 ? String(idx + 1) : 'No aplica';
}

function csvHistoricoNotasEstructuradas(e) {
  const notas = Array.isArray(e.notas_lista) ? e.notas_lista : [];
  if (!notas.length) return 'No aplica';
  return notas.map((n, i) => {
    const titulo = csvHistoricoLimpio(n.titulo || `Nota ${i + 1}`);
    const fecha = csvHistoricoLimpio(n.fecha || '');
    const texto = csvHistoricoLimpio(n.texto || '');
    return `Nota ${i + 1} — ${titulo}${fecha ? ' [' + fecha + ']' : ''}: ${texto}`;
  }).join(' || ');
}

function csvHistoricoAutorDirector(e) {
  if (e.type === 'libro') return e.autor;
  if (e.type === 'disco') return e.artista;
  return e.director;
}

function csvHistoricoPublicacion(e) {
  return e.type === 'libro' || e.type === 'disco' ? e.anio_pub : e.anio_est;
}

function csvHistoricoDuracionPaginas(e) {
  if (e.type === 'libro') return e.paginas;
  if (e.type === 'pelicula' || e.type === 'serie') return e.duracion;
  return 'No aplica';
}

function csvHistoricoTemporadaSaga(e) {
  if (e.type === 'serie') return getTemporadaNum(e) || e.temporadas || 'No aplica';
  return e.temporada || e.saga || e.coleccion || 'No aplica';
}

function csvHistoricoBasadoTitulo(e) {
  if (e.basada && e.autor_original) return e.autor_original;
  return e.titulo_original || 'No aplica';
}

function construirCSVHistoricoCompleto() {
  const headers = [
    'ID','Categoría','Nombre','Temporada/Saga','Autor/Director','LEN','Publicación','Año de Lec','Mes de Lec','N° Mes',
    'Traductor','Editorial','Páginas / Minutos totales','Guion','Música','Fotografía','Protagonista','Basado en','Título','Idea Original','Colección','Dirigida por',
    'Estado','Portada','Notas generales','Cantidad notas','Notas estructuradas','Elenco','País','Productora','Géneros cine','Géneros libro','Temporada actual','Capítulo actual','Capítulos totales','Minutos episodio',
    'Disco artista/grupo','Disco productor','Disco discográfica','Disco músicos','Disco colaboraciones','Origen del libro','Fecha de adquisición','Días adquisición a lectura','Fecha actualización'
  ];

  const rows = (db.entries || []).map((e, idx) => {
    const notas = Array.isArray(e.notas_lista) ? e.notas_lista : [];
    const row = [
      e.id || idx + 1,
      csvHistoricoCategoria(e.type),
      e.titulo,
      csvHistoricoTemporadaSaga(e),
      csvHistoricoAutorDirector(e),
      e.type === 'libro' ? e.idioma : 'No aplica',
      csvHistoricoPublicacion(e),
      e.anio,
      e.mes,
      csvHistoricoNumeroMes(e.mes),
      e.type === 'libro' ? e.traductor : 'No aplica',
      e.type === 'libro' ? e.editorial : e.type === 'disco' ? e.discografica : 'No aplica',
      csvHistoricoDuracionPaginas(e),
      e.guionista || 'No aplica',
      e.musica || 'No aplica',
      e.fotografia || 'No aplica',
      e.protagonista || 'No aplica',
      e.basada || 'No aplica',
      csvHistoricoBasadoTitulo(e),
      e.idea_original || e.autor_original || 'No aplica',
      e.coleccion || 'No aplica',
      e.dirigida_por || e.director_original || 'No aplica',
      e.estado || (e.type === 'disco' ? 'Escuchado' : 'No aplica'),
      e.cover || 'No aplica',
      e.notas || 'No aplica',
      notas.length,
      csvHistoricoNotasEstructuradas(e),
      Array.isArray(e.elenco) ? e.elenco : 'No aplica',
      e.pais ? getPaisNombre(e.pais) : 'No aplica',
      e.productora || 'No aplica',
      Array.isArray(e.generos_cine) ? e.generos_cine : 'No aplica',
      Array.isArray(e.generos) ? e.generos : 'No aplica',
      e.temporadaActual || e.temporadas || 'No aplica',
      e.capActual || 'No aplica',
      e.capTotal || e.capsPorTemp || 'No aplica',
      e.minEpisodio || 'No aplica',
      e.type === 'disco' ? e.artista : 'No aplica',
      e.type === 'disco' ? e.productor : 'No aplica',
      e.type === 'disco' ? e.discografica : 'No aplica',
      e.type === 'disco' && Array.isArray(e.musicos) ? e.musicos : 'No aplica',
      e.type === 'disco' && Array.isArray(e.colaboraciones) ? e.colaboraciones : 'No aplica',
      e.type === 'libro' ? (origenAdquisicionLabel(e.origen_adquisicion) || 'No aplica') : 'No aplica',
      e.type === 'libro' ? (e.fecha_adquisicion || 'No aplica') : 'No aplica',
      e.type === 'libro' ? (diasAdquisicionALectura(e) ?? 'No aplica') : 'No aplica',
      e._updatedAt ? new Date(e._updatedAt).toISOString() : 'No aplica'
    ];
    return row.map(v => csvHistoricoEscape(csvHistoricoNoAplica(v))).join(',');
  });

  return '\ufeff' + headers.map(csvHistoricoEscape).join(',') + '\n' + rows.join('\n');
}

function exportarCSVHistoricoCompleto() {
  try {
    const csv = construirCSVHistoricoCompleto();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `LUMEN_csv_historico_completo_${todaySantiagoStr()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('✓ CSV histórico exportado');
  } catch (err) {
    console.error(err);
    showToast('No se pudo exportar el CSV histórico');
  }
}

function clearAll() {
  if (!confirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.')) return;
  db = { entries: [] };
  saveDB();
  closeModal('modal-import');
  showToast('Datos eliminados');
  renderHome();
}

