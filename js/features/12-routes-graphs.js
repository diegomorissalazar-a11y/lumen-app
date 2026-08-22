// ══════════════════════════
//  RUTAS — CRUD
// ══════════════════════════
// ── localStorage key para nodos custom (charlas, personas, etc.) ──
const RUTA_CUSTOM_KEY = 'lumen_ruta_custom_v1';

function loadRutaCustomNodes() {
  try { return JSON.parse(localStorage.getItem(RUTA_CUSTOM_KEY) || '{}'); }
  catch { return {}; }
}
const PROGRAMA_KEY = 'lumen_ruta_programas_v1';
function loadProgramas() {
  try { return JSON.parse(localStorage.getItem(PROGRAMA_KEY) || '[]'); } catch { return []; }
}
function saveProgramaCustom(nombre) {
  nombre = (nombre||'').trim();
  if (!nombre) return;
  const arr = loadProgramas();
  if (!arr.some(p => p.trim() === nombre)) { arr.push(nombre); safeLocalSetItem(PROGRAMA_KEY, JSON.stringify(arr)); }
}
function rellenarProgramaSel() {
  const sel      = document.getElementById('ruta-programa-sel');
  const libre    = document.getElementById('ruta-programa-libre');
  const hint     = document.getElementById('ruta-programa-hint');
  const nodoWrap = document.getElementById('ruta-programa-nodo-wrap');
  const nodoCb   = document.getElementById('ruta-programa-nodo');
  if (!sel) return;
  if (nodoWrap) nodoWrap.style.display = 'none';
  if (nodoCb)   nodoCb.checked = false;
  const fromRutas = [...new Set((mapas.rutas||[]).filter(r=>r.programa).map(r=>r.programa.trim()))];
  const custom    = loadProgramas();
  const todos     = [...new Set([...fromRutas,...custom])].sort((a,b)=>a.localeCompare(b,'es'));
  sel.innerHTML = '<option value="">— Sin programa —</option>';
  todos.forEach(p => { const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
  const oN=document.createElement('option'); oN.value='__nuevo__'; oN.textContent='✏ Agregar nuevo...'; sel.appendChild(oN);
  if (libre) libre.style.display='none';
  if (hint)  hint.style.display='none';
}
function onProgramaLibreInput() {
  const libre    = document.getElementById('ruta-programa-libre');
  const nodoWrap = document.getElementById('ruta-programa-nodo-wrap');
  if (nodoWrap) nodoWrap.style.display = libre?.value.trim() ? 'flex' : 'none';
}
function onProgramaSelChange() {
  const sel      = document.getElementById('ruta-programa-sel');
  const libre    = document.getElementById('ruta-programa-libre');
  const hint     = document.getElementById('ruta-programa-hint');
  const nodoWrap = document.getElementById('ruta-programa-nodo-wrap');
  if (!sel) return;
  if (sel.value === '__nuevo__') {
    libre.style.display = 'block'; hint.style.display = 'block'; libre.focus();
  } else {
    libre.style.display = 'none'; hint.style.display = 'none'; if(libre) libre.value = '';
  }
  if (nodoWrap) nodoWrap.style.display = (sel.value && sel.value !== '__nuevo__') ? 'flex' : 'none';
}

function saveRutaCustomNode(tipo, titulo) {
  titulo = (titulo||'').trim();
  if (!titulo) return;
  const map = loadRutaCustomNodes();
  if (!map[tipo]) map[tipo] = [];
  // Comparar sin espacios para evitar duplicados por trim
  if (!map[tipo].some(t => t.trim() === titulo)) {
    map[tipo].push(titulo);
    safeLocalSetItem(RUTA_CUSTOM_KEY, JSON.stringify(map));
  }
}
function getRutaCustomNodes(tipo) {
  return loadRutaCustomNodes()[tipo] || [];
}

// También recolectar nodos de rutas ya guardadas
function getRutaNodesFromHistory(tipo) {
  const nodes = new Set();
  mapas.rutas.forEach(r => {
    if (r.tipo === tipo && r.fuente && r.fuente !== '⭐ Origen') nodes.add(r.fuente);
  });
  getRutaCustomNodes(tipo).forEach(n => nodes.add(n));
  return [...nodes].sort();
}

// Selecciona el tipo de conexión y actualiza paneles
function selectRutaTipoConexion(tipo, btn) {
  document.getElementById('ruta-tipo').value = tipo;

  document.querySelectorAll('.ruta-tipo-conexion').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background  = '#fff';
    b.style.color       = 'var(--ink3)';
    b.classList.remove('active');
  });
  if (btn) {
    btn.style.borderColor = 'var(--gold)';
    btn.style.background  = '#fff8e8';
    btn.style.color       = 'var(--gold)';
    btn.classList.add('active');
  }

  const esMismoAutor = tipo === 'mismo_autor';
  document.getElementById('ruta-panel-mismo-autor').style.display = esMismoAutor ? 'block' : 'none';
  document.getElementById('ruta-panel-fuente').style.display      = esMismoAutor ? 'none'  : 'block';
  document.getElementById('ruta-destino-field').style.display     = esMismoAutor ? 'none'  : 'block';

  if (!esMismoAutor) {
    rellenarRutaFuentePanel(tipo);
    rellenarRutaDestinoLibros();
  }
}

// Rellena el selector de fuente según el tipo
function rellenarRutaFuentePanel(tipo) {
  const labels = {
    libro:   '📚 Libro que me llevó aquí',
    charla:  '🎙 Conferencista / Entrevistado',
    serie:   '📺 Serie que me llevó aquí',
    pelicula:'🎬 Película que me llevó aquí',
    persona: '👤 Persona',
    cancion: '🎵 Intérprete',
    podcast: '🎧 Nombre del podcast',
  };
  const lbl = document.getElementById('ruta-fuente-label');
  if (lbl) lbl.textContent = labels[tipo] || 'Fuente';

  const sel = document.getElementById('ruta-fuente-sel');
  const libre = document.getElementById('ruta-fuente-libre');
  const hint  = document.getElementById('ruta-fuente-libre-hint');

  // Limpiar
  sel.innerHTML = '<option value="">— Selecciona o escribe abajo —</option>';
  libre.style.display = 'none';
  libre.value = '';
  hint.style.display = 'none';

  let opciones = [];

  // Helper: etiqueta con año entre paréntesis
  const conAnio = (e, campoAnio) => {
    const yr = e[campoAnio] || e.anio;
    return yr ? `${e.titulo} (${yr})` : e.titulo;
  };

  // {label, value} para cada opción — value siempre es el título sin año
  let opcionesObj = [];

  if (tipo === 'libro') {
    opcionesObj = db.entries
      .filter(e => e.type === 'libro' && (e.estado === 'leido' || e.estado === 'leyendo'))
      .sort((a,b) => a.titulo.localeCompare(b.titulo, 'es'))
      .map(e => ({ value: e.titulo, label: conAnio(e, 'anio') }));
  } else if (tipo === 'serie') {
    const delDB = db.entries
      .filter(e => e.type === 'serie' && (e.estado === 'vista' || e.estado === 'viendo'))
      .sort((a,b) => a.titulo.localeCompare(b.titulo, 'es'))
      .map(e => ({ value: e.titulo, label: conAnio(e, 'anio') }));
    const custom = getRutaNodesFromHistory('serie')
      .filter(t => !delDB.some(o => o.value === t))
      .sort((a,b) => a.localeCompare(b, 'es'))
      .map(t => ({ value: t, label: t }));
    opcionesObj = [...delDB, ...custom];
  } else if (tipo === 'pelicula') {
    const delDB = db.entries
      .filter(e => e.type === 'pelicula')
      .sort((a,b) => a.titulo.localeCompare(b.titulo, 'es'))
      .map(e => ({ value: e.titulo, label: conAnio(e, 'anio') }));
    const custom = getRutaNodesFromHistory('pelicula')
      .filter(t => !delDB.some(o => o.value === t))
      .sort((a,b) => a.localeCompare(b, 'es'))
      .map(t => ({ value: t, label: t }));
    opcionesObj = [...delDB, ...custom];
  } else if (tipo === 'charla' || tipo === 'persona' || tipo === 'cancion' || tipo === 'podcast') {
    opcionesObj = getRutaNodesFromHistory(tipo)
      .sort((a,b) => a.localeCompare(b, 'es'))
      .map(t => ({ value: t, label: t }));
  }

  opcionesObj.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value; opt.textContent = o.label;
    sel.appendChild(opt);
  });

  // Siempre mostrar la opción "otro"
  const optOtro = document.createElement('option');
  optOtro.value = '__otro__'; optOtro.textContent = '✏ Escribir uno nuevo...';
  sel.appendChild(optOtro);

  // Mostrar campo canción solo para tipo cancion
  const cancionField = document.getElementById('ruta-cancion-field');
  if (cancionField) {
    cancionField.style.display = tipo === 'cancion' ? 'block' : 'none';
    const cancionInput = document.getElementById('ruta-cancion-titulo');
    if (cancionInput) cancionInput.value = '';
  }
  // Mostrar campo charla solo para tipo charla
  const charlaField = document.getElementById('ruta-charla-field');
  if (charlaField) {
    charlaField.style.display = tipo === 'charla' ? 'block' : 'none';
    const charlaInput = document.getElementById('ruta-charla-titulo');
    if (charlaInput) charlaInput.value = '';
  }
  // Mostrar campo podcast solo para tipo podcast
  const podcastField = document.getElementById('ruta-podcast-field');
  if (podcastField) {
    podcastField.style.display = tipo === 'podcast' ? 'block' : 'none';
    const podcastInput = document.getElementById('ruta-podcast-host');
    if (podcastInput) podcastInput.value = '';
  }
  // Mostrar sub-opción regalo/recomendación solo para persona
  const personaField = document.getElementById('ruta-persona-field');
  if (personaField) {
    personaField.style.display = tipo === 'persona' ? 'block' : 'none';
    // Reset a recomendación por defecto
    if (tipo === 'persona') selectPersonaSub('recomendacion', document.querySelector('.ruta-persona-sub[data-sub="recomendacion"]'));
  }
}

function selectPersonaSub(sub, btn) {
  document.getElementById('ruta-persona-sub-val').value = sub;
  document.querySelectorAll('.ruta-persona-sub').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background  = '#fff';
    b.style.color       = 'var(--ink3)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--gold)';
    btn.style.background  = '#fff8e8';
    btn.style.color       = 'var(--gold)';
  }
}

function onRutaFuenteSelChange() {
  const sel   = document.getElementById('ruta-fuente-sel');
  const libre = document.getElementById('ruta-fuente-libre');
  const hint  = document.getElementById('ruta-fuente-libre-hint');
  if (sel.value === '__otro__') {
    libre.style.display = 'block';
    hint.style.display  = 'block';
    libre.focus();
  } else {
    libre.style.display = 'none';
    hint.style.display  = 'none';
    libre.value = '';
  }
}

function onRutaFuenteLibreInput() {
  // nada — solo feedback visual via hint
}

// Rellena el selector de libro destino (solo libros leídos/leyendo)
function rellenarRutaDestinoLibros() {
  const sel = document.getElementById('ruta-destino-sel');
  sel.innerHTML = '<option value="">— Selecciona el libro —</option>';
  db.entries
    .filter(e => e.type === 'libro' && (e.estado === 'leido' || e.estado === 'leyendo'))
    .sort((a,b) => a.titulo.localeCompare(b.titulo, 'es'))
    .forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.titulo;
      opt.textContent = e.anio ? `${e.titulo} (${e.anio})` : e.titulo;
      sel.appendChild(opt);
    });
}

function onRutaAutorChange() {
  const autor = document.getElementById('ruta-autor-sel').value;
  const wrap = document.getElementById('ruta-autor-libros');
  const list = document.getElementById('ruta-autor-libros-list');
  const fuenteSel = document.getElementById('ruta-mismo-fuente');
  const destSel   = document.getElementById('ruta-mismo-destino');
  if (!autor) { wrap.style.display = 'none'; return; }

  const libros = db.entries
    .filter(e => e.type === 'libro' && (e.autor||'').trim() === autor)
    .sort((a,b) => (a.anio||0)-(b.anio||0));

  list.innerHTML = libros.map(e => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--cream2);border-radius:4px;">
      <span style="font-size:11px;color:var(--ink4);min-width:36px;">${e.anio||'—'}</span>
      <span style="font-size:13px;font-weight:700;color:var(--ink);font-family:var(--font-serif);">${e.titulo}</span>
      <span style="font-size:10px;color:var(--ink4);margin-left:auto;">${e.estado==='leido'?'✓ Leído':e.estado==='leyendo'?'Leyendo':'—'}</span>
    </div>`).join('');

  const opts = libros.map(e => `<option value="${e.titulo.replace(/"/g,'&quot;')}">${e.titulo}</option>`).join('');
  fuenteSel.innerHTML = opts;
  destSel.innerHTML   = opts;
  if (libros.length >= 2) {
    fuenteSel.value = libros[0].titulo;
    destSel.value   = libros[libros.length-1].titulo;
  }
  wrap.style.display = 'block';
}

// Helpers autores con múltiples libros
function getAutoresConLibros() {
  const map = {};
  db.entries.filter(e => e.type === 'libro' && e.autor && e.autor.trim()).forEach(e => {
    const a = e.autor.trim();
    if (!map[a]) map[a] = [];
    map[a].push(e);
  });
  return Object.entries(map).sort((a,b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function openModalRuta(editId) {
  // Poblar selector de autores
  const autorSel = document.getElementById('ruta-autor-sel');
  const todosAutores = [...new Set(db.entries.filter(e=>e.type==='libro'&&e.autor).map(e=>e.autor.trim()))].sort();
  autorSel.innerHTML = '<option value="">— Selecciona un autor —</option>' +
    todosAutores.map(a => {
      const n = db.entries.filter(e=>e.type==='libro'&&(e.autor||'').trim()===a).length;
      return `<option value="${a.replace(/"/g,'&quot;')}">${a} (${n} libro${n!==1?'s':''})`;
    }).join('');

  document.getElementById('ruta-edit-id').value = editId||'';
  document.getElementById('ruta-autor-libros').style.display = 'none';
  document.getElementById('ruta-nota').value = '';

  if (editId) {
    const ruta = mapas.rutas.find(x => x.id === editId);
    if (ruta) {
      document.getElementById('ruta-nota').value = ruta.nota||'';
      const btn = document.querySelector(`.ruta-tipo-conexion[data-tipo="${ruta.tipo||'libro'}"]`);
      selectRutaTipoConexion(ruta.tipo||'libro', btn);

      if (ruta.tipo === 'mismo_autor') {
        const libroFuente = db.entries.find(e => e.titulo === ruta.fuente);
        if (libroFuente && libroFuente.autor) {
          autorSel.value = libroFuente.autor.trim();
          onRutaAutorChange();
          setTimeout(() => {
            document.getElementById('ruta-mismo-fuente').value = ruta.fuente||'';
            document.getElementById('ruta-mismo-destino').value = ruta.destino||'';
          }, 50);
        }
      } else {
        // Preseleccionar fuente
        const sel = document.getElementById('ruta-fuente-sel');
        if ([...sel.options].some(o => o.value === ruta.fuente)) {
          sel.value = ruta.fuente;
        } else if (ruta.fuente) {
          // No está en lista — mostrar en campo libre
          sel.value = '__otro__';
          const libre = document.getElementById('ruta-fuente-libre');
          libre.style.display = 'block';
          libre.value = ruta.fuente;
          document.getElementById('ruta-fuente-libre-hint').style.display = 'block';
        }
        // Preseleccionar destino
        const destSel = document.getElementById('ruta-destino-sel');
        if ([...destSel.options].some(o => o.value === ruta.destino)) {
          destSel.value = ruta.destino;
        }
        // Recuperar campos extra desde la nota
        if (ruta.tipo === 'cancion' || ruta.tipo === 'charla' || ruta.tipo === 'podcast' || ruta.tipo === 'entrevista') {
          if (ruta.tipo === 'entrevista') {
            rellenarProgramaSel();
            setTimeout(() => {
              const pSel  = document.getElementById('ruta-programa-sel');
              const pNodo = document.getElementById('ruta-programa-nodo');
              const pWrap = document.getElementById('ruta-programa-nodo-wrap');
              if (pSel && ruta.programa) {
                pSel.value = ruta.programa;
                if (pWrap) pWrap.style.display = 'flex';
                if (pNodo) pNodo.checked = !!(ruta.programaNodo);
              }
            }, 50);
          }
          if (ruta.nota) {
            const partes = ruta.nota.split(' · ');
            const idMap = { cancion:'ruta-cancion-titulo', charla:'ruta-charla-titulo', podcast:'ruta-podcast-host', entrevista:'ruta-entrevista-titulo' };
            const extraInput = document.getElementById(idMap[ruta.tipo]);
            if (extraInput) extraInput.value = partes[0] || '';
            document.getElementById('ruta-nota').value = partes.slice(1).join(' · ');
          }
        } else if (ruta.tipo === 'persona' && ruta.nota) {
          // Recuperar sub (primera parte: "💬 Recomendación" o "🎁 Regalo")
          const partes = ruta.nota.split(' · ');
          const sub = partes[0].includes('Regalo') ? 'regalo' : 'recomendacion';
          document.getElementById('ruta-persona-sub-val').value = sub;
          const subBtn = document.querySelector(`.ruta-persona-sub[data-sub="${sub}"]`);
          selectPersonaSub(sub, subBtn);
          document.getElementById('ruta-nota').value = partes.slice(1).join(' · ');
        }
      }
    }
  } else {
    const hayMultiples = getAutoresConLibros().length > 0;
    const tipoDefault  = hayMultiples ? 'mismo_autor' : 'libro';
    const btn = document.querySelector(`.ruta-tipo-conexion[data-tipo="${tipoDefault}"]`);
    selectRutaTipoConexion(tipoDefault, btn);
  }

  openModal('modal-ruta');
}

function saveRuta() {
  return lumenSafeAction("Guardar ruta", () => {
  const tipo   = document.getElementById('ruta-tipo').value;
  const editId = document.getElementById('ruta-edit-id').value;
  let fuente = '', destino = '', fuente_tipo = tipo;

  if (tipo === 'mismo_autor') {
    fuente  = document.getElementById('ruta-mismo-fuente')?.value.trim() || '';
    destino = document.getElementById('ruta-mismo-destino')?.value.trim() || '';
    if (!fuente || !destino) { showToast('Selecciona los dos libros'); return; }
    if (fuente === destino)  { showToast('Los dos libros deben ser distintos'); return; }
  } else {
    // Fuente: tomar del select o del campo libre
    const sel   = document.getElementById('ruta-fuente-sel');
    const libre = document.getElementById('ruta-fuente-libre');
    if (sel.value === '__otro__' || sel.value === '') {
      fuente = libre.value.trim();
    } else {
      fuente = sel.value.trim();
    }
    // Trim de espacios al inicio/fin
    fuente = fuente.trim();
    // Guardar nodo custom si fue texto libre
    if (sel.value === '__otro__' && fuente && (tipo === 'charla' || tipo === 'persona' || tipo === 'serie' || tipo === 'pelicula' || tipo === 'cancion' || tipo === 'podcast')) {
      saveRutaCustomNode(tipo, fuente);
    }

    destino = document.getElementById('ruta-destino-sel').value.trim();
    if (!destino) { showToast('Selecciona el libro al que llegaste'); return; }
    if (!fuente)  { showToast('Indica la fuente de la conexión'); return; }
    if (fuente === destino) { showToast('La fuente y el destino no pueden ser iguales'); return; }
  }

  // Enriquecer la nota con campos extra según tipo
  let notaFinal = document.getElementById('ruta-nota').value.trim();
  if (tipo === 'cancion') {
    const extra = document.getElementById('ruta-cancion-titulo')?.value.trim();
    if (extra) notaFinal = extra + (notaFinal ? ' · ' + notaFinal : '');
  } else if (tipo === 'charla') {
    const extra = document.getElementById('ruta-charla-titulo')?.value.trim();
    if (extra) notaFinal = extra + (notaFinal ? ' · ' + notaFinal : '');
  } else if (tipo === 'podcast') {
    const extra = document.getElementById('ruta-podcast-host')?.value.trim();
    if (extra) notaFinal = extra + (notaFinal ? ' · ' + notaFinal : '');
  } else if (tipo === 'persona') {
    const sub = document.getElementById('ruta-persona-sub-val')?.value || 'recomendacion';
    const subLabel = sub === 'regalo' ? '🎁 Regalo' : '💬 Recomendación';
    notaFinal = subLabel + (notaFinal ? ' · ' + notaFinal : '');
  }

  // Leer programa y flag nodo (solo para entrevista)
  let programa = '', programaNodo = false;
  if (tipo === 'entrevista') {
    const pSel   = document.getElementById('ruta-programa-sel');
    const pLibre = document.getElementById('ruta-programa-libre');
    const pNodo  = document.getElementById('ruta-programa-nodo');
    if (pSel?.value === '__nuevo__') { programa=(pLibre?.value||'').trim(); if(programa) saveProgramaCustom(programa); }
    else { programa=(pSel?.value||'').trim(); }
    programaNodo = !!(pNodo?.checked && programa);
  }
  const obj = {
    id:        editId || 'ruta_' + Date.now(),
    tipo, fuente_tipo,
    fuente, destino, programa, programaNodo,
    nota:      notaFinal,
    createdAt: editId ? (mapas.rutas.find(x=>x.id===editId)?.createdAt||Date.now()) : Date.now()
  };
  if (editId) { const i = mapas.rutas.findIndex(x=>x.id===editId); if(i>=0) mapas.rutas[i]=obj; }
  else mapas.rutas.push(obj);
  saveMapas();
  closeModal('modal-ruta');
  showToast('✓ Conexión guardada');
  generarRutasMismoAutor(true);

  });
}

function generarRutasMismoAutor(silencioso = false) {
  // Índice de meses para ordenar cronológicamente
  const MESES_IDX = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Función para convertir anio+mes a un número comparable
  const toSortKey = e => {
    const yr = parseInt(e.anio) || 0;
    const mo = MESES_IDX.indexOf(e.mes || '');
    return yr * 100 + (mo >= 0 ? mo : 0);
  };

  // Agrupar libros leídos por autor
  const porAutor = {};
  db.entries
    .filter(e => e.type === 'libro' && e.estado === 'leido' && e.autor && e.autor.trim() && e.anio)
    .forEach(e => {
      const a = e.autor.trim();
      if (!porAutor[a]) porAutor[a] = [];
      porAutor[a].push(e);
    });

  let creadas = 0, reemplazadas = 0;

  Object.entries(porAutor).forEach(([autor, libros]) => {
    if (libros.length < 2) return;

    // Ordenar cronológicamente
    const ordenados = libros.slice().sort((a, b) => toSortKey(a) - toSortKey(b));

    // Crear conexión en cadena: 0→1, 1→2, 2→3...
    for (let i = 0; i < ordenados.length - 1; i++) {
      const fuente  = ordenados[i].titulo;
      const destino = ordenados[i + 1].titulo;

      // Buscar si ya existe una conexión mismo_autor entre este par
      const existeIdx = mapas.rutas.findIndex(r =>
        r.tipo === 'mismo_autor' && r.fuente === fuente && r.destino === destino
      );

      const obj = {
        id:         existeIdx >= 0 ? mapas.rutas[existeIdx].id : 'ruta_' + Date.now() + '_' + i,
        tipo:       'mismo_autor',
        fuente_tipo:'mismo_autor',
        fuente, destino,
        nota:       autor,
        createdAt:  existeIdx >= 0 ? mapas.rutas[existeIdx].createdAt : Date.now()
      };

      if (existeIdx >= 0) {
        mapas.rutas[existeIdx] = obj;
        reemplazadas++;
      } else {
        mapas.rutas.push(obj);
        creadas++;
      }
    }
  });

  if (creadas + reemplazadas === 0) {
    if (!silencioso) showToast('No hay autores con 2+ libros leídos');
    return;
  }

  saveMapas();
  renderMapaRutas();
  if (!silencioso) showToast(`✓ ${creadas} conexiones creadas${reemplazadas ? ', ' + reemplazadas + ' actualizadas' : ''}`);
}

function onRutaSearch(q) {
  q = q.trim().toLowerCase();
  const svgEl = document.querySelector('#mapa-rutas-svg svg');
  const svg   = d3.select('#mapa-rutas-svg svg g');
  if (!svg.node()) return;

  // Atenuar nodos y links que no coinciden
  let matchNode = null;
  svg.selectAll('g[cursor]').each(function(d) {
    if (!d) return;
    const match = !q || d.label.toLowerCase().includes(q);
    d3.select(this).selectAll('circle').attr('opacity', match ? 1 : 0.15);
    d3.select(this).selectAll('text').attr('opacity', match ? 1 : 0.15);
    if (match && q) matchNode = d;
  });

  svg.selectAll('line').attr('opacity', function(d) {
    if (!q) return 0.75;
    const s = typeof d.source === 'object' ? d.source.label : d.source;
    const t = typeof d.target === 'object' ? d.target.label : d.target;
    return (s.toLowerCase().includes(q) || t.toLowerCase().includes(q)) ? 0.75 : 0.08;
  });

  // Zoom al primer nodo que coincide
  if (matchNode && svgEl && svgEl.__zoomBehavior) {
    const W = svgEl.clientWidth  || 360;
    const H = svgEl.clientHeight || 480;
    const scale = 1.8;
    const tx = W/2 - scale * matchNode.x;
    const ty = H/2 - scale * matchNode.y;
    d3.select(svgEl).transition().duration(600)
      .call(svgEl.__zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale));
  }
}

function actualizarBadgeSinConectar() {
  const btn      = document.getElementById('ruta-sin-conectar-btn');
  const countEl  = document.getElementById('ruta-sin-count');
  const listaEl  = document.getElementById('ruta-sin-lista');
  if (!btn) return;

  // Libros leídos/leyendo que no aparecen en ninguna ruta como fuente NI como destino
  const enRutas = new Set([
    ...mapas.rutas.map(r => r.destino).filter(Boolean),
    ...mapas.rutas.map(r => r.fuente).filter(Boolean)
  ]);
  const sinConectar = db.entries
    .filter(e => e.type === 'libro' && (e.estado === 'leido' || e.estado === 'leyendo') && !enRutas.has(e.titulo))
    .sort((a,b) => a.titulo.localeCompare(b.titulo,'es'));

  if (sinConectar.length === 0) { btn.style.display = 'none'; return; }
  btn.style.display = 'inline-flex';
  countEl.textContent = sinConectar.length;

  listaEl.innerHTML = sinConectar.map(e => `
    <div style="padding:8px 12px;border-bottom:1px solid var(--cream2);font-size:12px;color:var(--ink);
      display:flex;align-items:center;gap:8px;cursor:pointer;"
      onclick="buscarNodoEnGrafo('${e.titulo.replace(/'/g,"\\'")}')">
      <span style="flex:1;font-weight:700;font-family:var(--font-serif);">${e.titulo}</span>
      <span style="font-size:10px;color:var(--ink4);">${e.anio||''}</span>
    </div>`).join('');
}

function toggleSinConectar() {
  const dd = document.getElementById('ruta-sin-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  // Cerrar al click fuera
  if (dd.style.display === 'block') {
    setTimeout(() => {
      const handler = (e) => {
        if (!dd.contains(e.target) && !document.getElementById('ruta-sin-conectar-btn').contains(e.target)) {
          dd.style.display = 'none';
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 10);
  }
}

function buscarNodoEnGrafo(titulo) {
  // Cerrar dropdown
  document.getElementById('ruta-sin-dropdown').style.display = 'none';
  // Llenar búsqueda y disparar zoom
  const input = document.getElementById('ruta-search');
  if (input) { input.value = titulo; onRutaSearch(titulo); }
}

function deleteRuta(id) {
  if (!confirm('¿Eliminar esta conexión?')) return;
  mapas.rutas=mapas.rutas.filter(x=>x.id!==id);
  saveMapas(); generarRutasMismoAutor(true); showToast('Conexión eliminada');
}

// ══════════════════════════
//  D3 GRAPH ENGINE
// ══════════════════════════
function buildD3Graph(containerId, nodes, links, colorFn, tooltipEdgeFn, fuenteTipo = {}, onLinkClick = null) {
  const container=document.getElementById(containerId); if(!container) return;
  d3.select('#'+containerId).selectAll('*').remove();
  const W=container.clientWidth||360, H=container.clientHeight||480;
  const svg=d3.select('#'+containerId).append('svg').attr('width',W).attr('height',H);
  const g=svg.append('g');
  const zoomBehavior = d3.zoom().scaleExtent([0.15,4]).on('zoom',e=>g.attr('transform',e.transform));
  svg.call(zoomBehavior);
  // Exponer zoom para búsqueda externa
  svg.node().__zoomBehavior = zoomBehavior;
  svg.node().__zoomG = g;

  // ── Métricas del grafo ──
  // v185: una sola gramática visual. Cada mapa entrega su semántica en sizeMetric;
  // fixedRadius permite mantener obras con tamaño estable. La escala común es raíz cuadrada.
  const graphDegrees = GraphMetrics.degrees(nodes, links);
  const degree = graphDegrees.totalDegree;
  const visualMetric = {};
  nodes.forEach(n => {
    visualMetric[n.id] = Number.isFinite(Number(n.sizeMetric))
      ? Math.max(0, Number(n.sizeMetric))
      : (degree[n.id] || 0);
  });
  const maxVisualMetric = Math.max(1, ...Object.values(visualMetric));
  const nodeR = d => {
    if (Number.isFinite(Number(d.fixedRadius))) return Number(d.fixedRadius);
    const minR = d.isEvent ? 10 : 12;
    return GraphMetrics.sqrtRadius(visualMetric[d.id]||0, maxVisualMetric, minR, 34, 1);
  };

  // Arrow markers per tipo
  const defs=svg.append('defs');
  [...new Set(links.map(l=>l.tipo))].forEach(tipo=>{
    defs.append('marker').attr('id','arr-'+tipo)
      .attr('viewBox','0 -5 10 10').attr('refX',28).attr('refY',0)
      .attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
      .append('path').attr('d','M0,-5L10,0L0,5').attr('fill',colorFn(tipo));
  });

  const simulation=d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d=>d.id).distance(d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return 120 + (degree[s]||0)*4 + (degree[t]||0)*4;
    }))
    .force('charge', d3.forceManyBody().strength(d => -300 - (degree[d.id]||0)*30))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide(d => nodeR(d) + 14));

  // Links
  const link=g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', d=>colorFn(d.tipo))
    .attr('stroke-width', 2).attr('stroke-opacity', 0.75)
    .attr('marker-end', d=>`url(#arr-${d.tipo})`)
    .style('cursor', onLinkClick ? 'pointer' : 'default')
    .on('click', function(event, d) {
      if (!onLinkClick) return;
      event.stopPropagation();
      onLinkClick(d);
    });
  link.append('title').text(d=>tooltipEdgeFn(d));

  // Nodes
  const node=g.append('g').selectAll('g').data(nodes).join('g').attr('cursor','pointer')
    .call(d3.drag()
      .on('start',(e,d)=>{ if(!e.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e,d)=>{ d.fx=e.x; d.fy=e.y; })
      .on('end',  (e,d)=>{ if(!e.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; })
    );

  node.append('circle')
    .attr('r', d=>nodeR(d))
    .attr('fill', d=>d.inLibrary?'var(--ink)':(d.isEvent?'#e8e0d0':'#fff'))
    .attr('stroke', d=>d.inLibrary?'var(--gold)':'var(--border)')
    .attr('stroke-width', d => 1 + Math.min(3, (visualMetric[d.id]||0)));

  node.append('text').attr('text-anchor','middle').attr('dy',4)
    .attr('font-size', d => Math.max(9, Math.min(13, 9 + (visualMetric[d.id]||0))))
    .attr('fill', d=>d.inLibrary?'var(--gold)':'var(--ink3)')
    .text(d=>d.icon||'●');

  node.append('text').attr('text-anchor','middle')
    .attr('dy', d => nodeR(d) + 12)
    .attr('font-size', d => Math.max(9, Math.min(12, 9 + Math.floor((visualMetric[d.id]||0)/2))))
    .attr('fill','var(--ink2)').attr('font-weight','700')
    .text(d=>d.label.length>22?d.label.slice(0,20)+'…':d.label);

  node.append('title').text(d=>d.metricTooltip || `${d.tooltip||d.label}\nConexiones: ${degree[d.id]||0}`);

  // ── Popup flotante al hacer click en nodo fuente ──────────
  const popup = g.append('g').attr('class','node-popup').style('display','none');
  const PW = 220;
  const popupRect = popup.append('rect')
    .attr('rx', 7).attr('ry', 7)
    .attr('width', PW)
    .attr('fill', 'rgba(22,18,14,0.92)')
    .attr('stroke', 'rgba(200,149,42,0.55)')
    .attr('stroke-width', 1.5);

  let activePopupNode = null;

  node.on('click', function(event, d) {
    event.stopPropagation();

    // Toggle: cerrar si ya estaba abierto
    if (activePopupNode === d.id) {
      popup.style('display','none'); activePopupNode = null; return;
    }

    // Buscar conexiones salientes
    const salientes = links.filter(l => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      return src === d.id;
    });
    if (!salientes.length) return;
    activePopupNode = d.id;

    const tipoNodo = fuenteTipo[d.id] || null;
    const tipoLabel = {
      charla:'Conferencia', cancion:'Canción', podcast:'Podcast',
      serie:'Serie', pelicula:'Película', persona:'Persona',
      libro:'Libro', mismo_autor:'Mismo autor', entrevista:'Entrevista', programa:'Programa'
    }[tipoNodo] || '';
    const conDetalle = tipoNodo === 'charla' || tipoNodo === 'cancion' || tipoNodo === 'podcast' || tipoNodo === 'entrevista';

    // Limpiar items anteriores
    popup.selectAll('.popup-item,.popup-title,.popup-divider').remove();

    // Calcular altura: título(22) + separador(1) + N * (linea destino 18 + detalle si hay 14) + padding
    let totalH = 28;
    salientes.forEach(l => {
      const nota0 = ((l.nota||'').split(' · ')[0]);
      totalH += conDetalle && nota0 ? 32 : 20;
    });

    popupRect.attr('height', totalH);

    // Título del nodo
    const labelTrunc = d.label.length > 24 ? d.label.slice(0,22)+'…' : d.label;
    popup.append('text').attr('class','popup-title')
      .attr('x', 10).attr('y', 16)
      .attr('font-size', 9).attr('font-weight', 700)
      .attr('letter-spacing', 1.3)
      .attr('fill', 'rgba(200,149,42,0.95)')
      .attr('font-family', 'Lato, sans-serif')
      .text(labelTrunc.toUpperCase() + (tipoLabel ? '  ·  ' + tipoLabel.toUpperCase() : ''));

    // Línea separadora
    popup.append('line').attr('class','popup-divider')
      .attr('x1', 8).attr('x2', PW - 8).attr('y1', 22).attr('y2', 22)
      .attr('stroke', 'rgba(200,149,42,0.3)').attr('stroke-width', 0.5);

    // Items
    let curY = 28;
    salientes.forEach(l => {
      const destino = typeof l.target === 'object' ? l.target.id : l.target;
      const nota0   = (l.nota||'').split(' · ')[0];
      const detalle = conDetalle ? nota0 : '';
      const dTrunc  = destino.length > 28 ? destino.slice(0,26)+'…' : destino;

      popup.append('text').attr('class','popup-item')
        .attr('x', 14).attr('y', curY + 12)
        .attr('font-size', 10.5).attr('fill', '#f2ede6')
        .attr('font-family', 'Lato, sans-serif')
        .text('· ' + dTrunc);

      curY += 18;

      if (detalle) {
        const deTrunc = detalle.length > 32 ? detalle.slice(0,30)+'…' : detalle;
        popup.append('text').attr('class','popup-item')
          .attr('x', 20).attr('y', curY + 6)
          .attr('font-size', 9).attr('fill', 'rgba(200,149,42,0.75)')
          .attr('font-style', 'italic')
          .attr('font-family', 'Lato, sans-serif')
          .text(deTrunc);
        curY += 14;
      }
    });

    // Posicionar debajo del nodo
    const r = nodeR(d);
    popup.attr('transform', `translate(${d.x - PW/2},${d.y + r + 6})`);
    popup.style('display', null);
    popup.raise();
  });

  // Click en fondo SVG → cerrar
  svg.on('click', () => { popup.style('display','none'); activePopupNode = null; });

  simulation.on('tick',()=>{
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
        .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
    // Mantener popup pegado al nodo activo durante la simulación
    if (activePopupNode) {
      const dn = nodes.find(n=>n.id===activePopupNode);
      if (dn) {
        const r = nodeR(dn);
        popup.attr('transform', `translate(${dn.x - PW/2},${dn.y + r + 6})`);
      }
    }
  });
}

// ══════════════════════════
//  RENDER INFLUENCIAS
// ══════════════════════════
const INF_TIPO_LABELS = {
  cita_directa:      '🟠 Cita directa',
  cita_indirecta:    '🟡 Cita indirecta',
  uso_personaje:     '🔵 Uso de personaje',
  contexto_historico:'🟢 Contexto histórico',
  continuacion:      '🟣 Continuación',
};

function renderListaInfluencias() {
  const el = document.getElementById('inf-lista'); if (!el) return;
  const data = mapas.influencias;
  if (data.length === 0) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = data.map(r => `
    <div onclick="openInfluenciaDetalle('${r.id}')" style="display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--cream2);cursor:pointer;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          <span style="color:var(--ink3);">${escapeHtml(r.fuente)}</span> → <span>${escapeHtml(r.destino)}</span>
        </div>
        <div style="font-size:10px;color:var(--ink4);margin-top:2px;">${escapeHtml(INF_TIPO_LABELS[r.tipo]||r.tipo)}${r.libro_ref?' · '+escapeHtml(r.libro_ref):''}${r.ubicacion_detalle?' · '+escapeHtml((r.ubicacion_tipo==='pagina'?'p.':(r.ubicacion_tipo==='loc'?'LOC ':' '))+r.ubicacion_detalle):''}</div>
      </div>
      <button onclick="event.stopPropagation();openModalInfluencia('${r.id}')"
        style="flex-shrink:0;padding:5px 10px;border:1.5px solid var(--border);border-radius:4px;background:#fff;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font-sans);color:var(--ink3);">
        ✏ Editar
      </button>
      <button onclick="event.stopPropagation();deleteInfluencia('${r.id}')"
        style="flex-shrink:0;padding:5px 10px;border:1.5px solid var(--border);border-radius:4px;background:#fff;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font-sans);color:var(--red);">
        🗑
      </button>
    </div>`).join('');
}

function renderMapaInfluencias() {
  migrateInfluenciasToAuthorGraph();
  const data=mapas.influencias;
  const elCount = document.getElementById('inf-count');
  const elEmpty = document.getElementById('inf-empty');
  if (elCount) elCount.textContent=`${data.length} relación${data.length!==1?'es':''}`;
  if (elEmpty) elEmpty.style.display=data.length===0?'flex':'none';
  renderListaInfluencias();
  if (data.length===0) { d3.select('#mapa-influencias-svg').selectAll('svg').remove(); return; }

  const libTitles=new Set(db.entries.map(e=>e.titulo)); const libAuthorIds=new Set(); (db.entries||[]).filter(e=>e.type==='libro').forEach(e=>{ensureBookCanonicalRefs(e);(e.autorIds||[]).forEach(id=>libAuthorIds.add(id));});
  const nodeMap=new Map(),outDegree={},inDegree={};
  data.forEach(rel=>{
    const sid=rel.fuente_autor_id||canonicalEntityId('aut',rel.fuente), tid=rel.destino_autor_id||canonicalEntityId('aut',rel.destino_autor||rel.destino);
    const sl=canonicalNameById('aut',sid,rel.fuente), tl=canonicalNameById('aut',tid,rel.destino_autor||rel.destino);
    if(!nodeMap.has(sid))nodeMap.set(sid,sl); if(!nodeMap.has(tid))nodeMap.set(tid,tl); outDegree[sid]=(outDegree[sid]||0)+1;inDegree[tid]=(inDegree[tid]||0)+1;
  });
  const nodes=[...nodeMap.entries()].map(([id,name])=>({id,label:name,inLibrary:libAuthorIds.has(id),icon:libAuthorIds.has(id)?'✍':'◉',tooltip:name,sizeMetric:outDegree[id]||0,metricTooltip:`${name}\nInfluencias originadas: ${outDegree[id]||0}\nInfluencias recibidas: ${inDegree[id]||0}`}));
  const links=data.map(d=>({source:d.fuente_autor_id||canonicalEntityId('aut',d.fuente),target:d.destino_autor_id||canonicalEntityId('aut',d.destino_autor||d.destino),tipo:d.tipo,id:d.id,pagina:d.pagina,texto:d.texto,libro_ref:d.libro_ref}));

  buildD3Graph('mapa-influencias-svg', nodes, links,
    tipo=>INF_COLORS[tipo]||'#999',
    d=>`${INF_LABELS[d.tipo]||d.tipo}${d.libro_ref?' · '+d.libro_ref:''}${d.pagina?' p.'+d.pagina:''}${d.texto?'\n"'+d.texto+'"':''}`,
    {},
    d=>openInfluenciaDetalle(d.id)
  );
}

// ══════════════════════════
//  RENDER RUTAS
// ══════════════════════════
const RUTA_TIPO_LABELS = {
  mismo_autor: '✍ Mismo autor',
  libro:       '📚 Libro',
  charla:      '🎙 Conferencia',
  entrevista:  '🎤 Entrevista',
  programa:    '🎞 Programa',
  entrevista:  '🎤 Entrevista',
  programa:    '🎞 Programa',
  serie:       '📺 Serie',
  pelicula:    '🎬 Película',
  persona:     '👤 Persona',
  cancion:     '🎵 Canción',
  podcast:     '🎧 Podcast',
};

function renderListaRutas() {
  const el = document.getElementById('ruta-lista'); if (!el) return;
  const data = mapas.rutas;
  if (data.length === 0) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const hayMas = data.length > 4;
  el.innerHTML = data.map(r => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--cream2);scroll-snap-align:start;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          <span style="color:var(--ink3);">${r.fuente}</span> → <span>${r.destino}</span>
        </div>
        <div style="font-size:10px;color:var(--ink4);margin-top:2px;">${RUTA_TIPO_LABELS[r.tipo]||r.tipo}${r.nota?' · '+r.nota:''}</div>
      </div>
      <button onclick="openModalRuta('${r.id}')"
        style="flex-shrink:0;padding:5px 10px;border:1.5px solid var(--border);border-radius:4px;background:#fff;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font-sans);color:var(--ink3);">
        ✏
      </button>
      <button onclick="deleteRuta('${r.id}')"
        style="flex-shrink:0;padding:5px 10px;border:1.5px solid var(--border);border-radius:4px;background:#fff;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font-sans);color:var(--red);">
        🗑
      </button>
    </div>`).join('') +
    (hayMas ? `<div style="text-align:center;padding:4px 0 5px;font-size:10px;color:var(--ink4);background:var(--cream2);letter-spacing:0.5px;">↕ ${data.length} conexiones · desliza para ver todas</div>` : '');
}


function renderMapaRutas() {
  const data=mapas.rutas;
  const elCount = document.getElementById('ruta-count');
  const elEmpty = document.getElementById('ruta-empty');
  if (elCount) elCount.textContent=`${data.length} conexión${data.length!==1?'es':''}`;
  if (elEmpty) elEmpty.style.display=data.length===0?'flex':'none';
  renderListaRutas();
  actualizarBadgeSinConectar();
  if (data.length===0) { d3.select('#mapa-rutas-svg').selectAll('svg').remove(); return; }


  const libTitles=new Set(db.entries.map(e=>e.titulo));

  // Determinar ícono por tipo de conexión del nodo fuente
  const iconByTipo = {
    libro:     '📚',
    serie:     '📺',
    pelicula:  '🎬',
    charla:    '🎙',
    podcast:   '🎧',
    cancion:   '🎵',
    persona:   '👤',
    entrevista:'🎤',
    programa:  '🎞',
  };

  // Mapa nombre → tipo (programa tiene su propio tipo)
  const fuenteTipo = {};
  data.forEach(d => {
    if (d.fuente && d.fuente !== '⭐ Origen') fuenteTipo[d.fuente] = d.tipo;
    if (d.programa) fuenteTipo[d.programa] = 'programa';
  });

  const iconForNode = (name) => {
    if (name === '⭐ Origen') return '⭐';
    const tipo = fuenteTipo[name];
    if (tipo) {
      if (tipo === 'persona') {
        const esRegalo = data.some(d => d.fuente === name && d.tipo === 'persona' && (d.nota||'').startsWith('🎁'));
        return esRegalo ? '👤🎁' : '👤';
      }
      return iconByTipo[tipo] || '◉';
    }
    return '📖';
  };

  // Construir nodos y links — entrevistas con programa generan nodo extra
  const nodeSet = new Set();
  const links   = [];

  data.forEach(d => {
    if (d.programa && d.programaNodo && d.tipo === 'entrevista') {
      nodeSet.add(d.programa);
      nodeSet.add(d.fuente);
      nodeSet.add(d.destino);
      // link programa → entrevistado (solo uno por par)
      if (!links.some(l => l.source === d.programa && l.target === d.fuente)) {
        links.push({ source: d.programa, target: d.fuente, tipo: 'programa', id: 'prog_' + d.id, nota: '' });
      }
      links.push({ source: d.fuente, target: d.destino, tipo: d.tipo, id: d.id, nota: d.nota });
    } else {
      nodeSet.add(d.fuente);
      nodeSet.add(d.destino);
      links.push({ source: d.fuente, target: d.destino, tipo: d.tipo, id: d.id, nota: d.nota });
    }
  });

  // v185: Rutas comunica capacidad de originar nuevas lecturas. Los libros son obras
  // estructurales de tamaño fijo; personas, entrevistas, películas, series y otros estímulos
  // crecen por cantidad de rutas que originan.
  const rutaDegrees = GraphMetrics.degrees([...nodeSet].map(id => ({id})), links);
  const nodes = [...nodeSet].map(name => {
    const isBook = libTitles.has(name);
    const out = rutaDegrees.outDegree[name] || 0;
    const incoming = rutaDegrees.inDegree[name] || 0;
    return {
      id: name, label: name,
      inLibrary: isBook,
      isEvent: !isBook && name !== '⭐ Origen',
      icon: iconForNode(name),
      tooltip: name,
      fixedRadius: isBook ? 13 : undefined,
      sizeMetric: isBook ? 0 : out,
      metricTooltip: isBook
        ? `${name}\nLibro · tamaño fijo\nRutas originadas: ${out}\nRutas recibidas: ${incoming}`
        : `${name}\nRutas originadas: ${out}\nRutas recibidas: ${incoming}`
    };
  });

  buildD3Graph('mapa-rutas-svg', nodes, links,
    tipo=>RUTA_COLORS[tipo]||'#999',
    d=>`${RUTA_LABELS[d.tipo]||d.tipo}${d.nota?'\n'+d.nota:''}`,
    fuenteTipo
  );
}

// ── Wire Habitos screen ──
function initHabitos() {
  renderHabitos();
}
document.getElementById('tab-login')?.addEventListener('click', () => authTab('login'));
document.getElementById('tab-register')?.addEventListener('click', () => authTab('register'));
document.getElementById('btn-login-email')?.addEventListener('click', () => loginEmail());
document.getElementById('btn-register-email')?.addEventListener('click', () => registerEmail());
document.getElementById('btn-forgot-password')?.addEventListener('click', () => resetPassword());
document.getElementById('auth-email')?.addEventListener('keydown', e => { if(e.key==='Enter') loginEmail(); });
document.getElementById('auth-password')?.addEventListener('keydown', e => { if(e.key==='Enter') loginEmail(); });
document.getElementById('auth-reg-email')?.addEventListener('keydown', e => { if(e.key==='Enter') registerEmail(); });
document.getElementById('auth-reg-password')?.addEventListener('keydown', e => { if(e.key==='Enter') registerEmail(); });

