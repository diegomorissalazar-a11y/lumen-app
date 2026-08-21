// ══════════════════════════════════════════════════════
//  EXPORTADOR DE LECTURA
// ══════════════════════════════════════════════════════

function exportarLectura() {
  const modal = document.getElementById('modal-exportar-lectura');
  if (modal) modal.style.display = 'flex';
  generarExportLectura();
}

function generarExportLectura() {
  // Fuente única compartida con Inicio, Mi Año y Estadísticas.
  const registros = getReadingDailyRecords();

  if (!registros.length) {
    document.getElementById('exportar-lectura-output').value = 'Sin registros de lectura diaria encontrados.';
    return;
  }

  // Ordenar por fecha
  registros.sort((a,b) => a.fecha.localeCompare(b.fecha));

  // Agrupar por semana ISO
  const semanas = {};
  registros.forEach(r => {
    const wk = getISOWeekKey(r.fecha);
    if (!semanas[wk]) semanas[wk] = [];
    semanas[wk].push(r);
  });

  // Construir texto de exportación
  const lineas = [];
  lineas.push('═══════════════════════════════════════════════');
  lineas.push('EXPORTACIÓN DE LECTURA — LUMEN');
  lineas.push('Generado: ' + new Date().toLocaleString('es-CL', { timeZone: LUMEN_TZ }));
  lineas.push('═══════════════════════════════════════════════');
  lineas.push('');

  // Resumen global
  const totalPags = registros.reduce((s,r) => s + r.pags, 0);
  const anioActual = new Date().getFullYear();
  const totalAnioActual = paginasRegistradasEnAnio(anioActual);
  const diasConLectura = new Set(registros.map(r => r.fecha)).size;
  const semanaKeys = Object.keys(semanas).sort();
  const promPorSemana = semanaKeys.length ? Math.round(totalPags / semanaKeys.length) : 0;

  lineas.push('RESUMEN GLOBAL');
  lineas.push('─────────────────────────────────────────────');
  lineas.push('Total páginas registradas : ' + totalPags);
  lineas.push('Páginas registradas ' + anioActual + ' : ' + totalAnioActual);
  lineas.push('Días con lectura          : ' + diasConLectura);
  lineas.push('Semanas con actividad     : ' + semanaKeys.length);
  lineas.push('Promedio páginas/semana   : ' + promPorSemana);
  lineas.push('');

  // Detalle por semana
  lineas.push('DETALLE POR SEMANA');
  lineas.push('─────────────────────────────────────────────');
  semanaKeys.forEach(wk => {
    const regs = semanas[wk];
    const totalSem = regs.reduce((s,r) => s + r.pags, 0);
    const dias = [...new Set(regs.map(r => r.fecha))].sort();
    const libros = [...new Set(regs.map(r => r.titulo))];
    lineas.push('');
    lineas.push('Semana ' + wk + '  (' + wk + ' → ' + addDaysToDateStr(wk, 6) + ')');
    lineas.push('  Páginas     : ' + totalSem);
    lineas.push('  Días activos: ' + dias.length + '/7');
    lineas.push('  Libros      : ' + libros.join(' | '));
    // Día a día
    dias.forEach(fecha => {
      const del_dia = regs.filter(r => r.fecha === fecha);
      const pag_dia = del_dia.reduce((s,r) => s + r.pags, 0);
      const dia_nombre = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {weekday:'short', day:'2-digit', month:'2-digit', timeZone:LUMEN_TZ});
      lineas.push('    ' + dia_nombre + '  ' + pag_dia + ' págs');
    });
  });

  lineas.push('');
  lineas.push('═══════════════════════════════════════════════');
  lineas.push('DATOS CRUDOS (fecha, libro, páginas_leídas)');
  lineas.push('─────────────────────────────────────────────');
  lineas.push('fecha,libro,autor,pags_leidas,pag_actual,total_pags');
  registros.forEach(r => {
    lineas.push([r.fecha, '"'+r.titulo+'"', '"'+(r.autor||'')+'"', r.pags, r.pagActual, r.totalPags||''].join(','));
  });

  document.getElementById('exportar-lectura-output').value = lineas.join('\n');
}

function copiarExportLectura() {
  const ta = document.getElementById('exportar-lectura-output');
  ta.select();
  document.execCommand('copy');
  showToast('✓ Copiado al portapapeles');
}

