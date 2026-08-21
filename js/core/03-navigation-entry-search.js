// ═══════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════
let currentScreen = 'home';
let currentYear = new Date().getFullYear();
let libFilter = 'todos';
let currentRating = 0;
let currentType = 'libro';
let searchTimeout = null;
let editingId = null;

function gotoScreen(s) {
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
  document.getElementById('screen-' + s).classList.add('active');
  document.getElementById('nav-' + s).classList.add('active');
  currentScreen = s;
  if (s === 'home') renderHome();
  if (s === 'library') renderLibrary();
  if (s === 'year') renderYear();
  if (s === 'stats') renderStats();
  if (s === 'habitos') initHabitos();
  if (s === 'mapas') switchMapaTab('influencias');
}

function openGeneroQuick(entryId) {
  const e = db.entries.find(x => x.id === entryId); if(!e) return;
  document.getElementById('genero-quick-id').value = entryId;
  document.getElementById('genero-quick-title').textContent = e.titulo;
  const current = e.generos || [];
  const generos = [
    'Novela','Cuento','Poesía','Ensayo','Historia','Biografía',
    'Crónica','Ciencia ficción','Filosofía','Teatro','Infantil',
    'Entrevista','Religión','Mitología'
  ];
  document.getElementById('genero-quick-chips').innerHTML = generos.map(g => `
    <button type="button" class="genero-chip${current.includes(g)?' active':''}"
      data-g="${g}" onclick="toggleGenero(this)"
      style="padding:7px 14px;font-size:12px;">${g}</button>
  `).join('');
  openModal('modal-genero-quick');
}

function saveGeneroQuick() {
  const entryId = document.getElementById('genero-quick-id').value;
  const e = db.entries.find(x => x.id === entryId); if(!e) return;
  e.generos = [...document.querySelectorAll('#genero-quick-chips .genero-chip.active')].map(b=>b.dataset.g);
  e._updatedAt = Date.now();
  saveDB();
  closeModal('modal-genero-quick');
  showToast('✓ Etiquetas guardadas');
  renderLibrary();
}

function openAddModal() {
  editingId = null;
  _pendingFormBibliography = null;
  openModal('modal-add');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-add' && !editingId) {
    resetForm();
    document.getElementById('f-anio-lect').value = new Date().getFullYear();
    document.getElementById('fp-anio-visto').value = new Date().getFullYear();
    document.getElementById('fs-anio-visto').value = new Date().getFullYear();
    const fdYear = document.getElementById('fd-anio-escuchado'); if (fdYear) fdYear.value = new Date().getFullYear();
  }
  if (id === 'modal-add') {
    // Pre-poblar datalists con datos de la biblioteca
    setTimeout(() => { fillMainAutorList(); fillMainEditorialList(); }, 50);
  }
  if (id === 'modal-add-watching') {
    setTimeout(() => {
      const sug = document.getElementById('watching-title-suggestions');
      if (sug) { sug.innerHTML = ''; sug.style.display = 'none'; }
    }, 50);
  }
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', function(e) { if (e.target === this) closeModal(this.id); });
});

// ═══════════════════════════════════
//  TYPE SELECTOR
// ═══════════════════════════════════
function selectType(type, btn) {
  currentType = type;
  document.querySelectorAll('.type-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background = '#fff';
    b.style.color = 'var(--ink3)';
  });
  const colors = { libro: 'var(--green)', pelicula: 'var(--red)', serie: 'var(--blue)', disco: 'var(--gold)' };
  const bgs = { libro: '#e8f0e8', pelicula: '#f0e8e8', serie: '#e8eef5', disco: '#f7f0df' };
  btn.style.borderColor = colors[type];
  btn.style.background = bgs[type];
  btn.style.color = colors[type];
  ['form-libro','form-pelicula','form-serie','form-disco'].forEach(f => { const el=document.getElementById(f); if(el) el.style.display = 'none'; });
  document.getElementById('form-' + (type === 'pelicula' ? 'pelicula' : type === 'serie' ? 'serie' : type === 'disco' ? 'disco' : 'libro')).style.display = 'block';
  const labels = { libro: 'Buscar libro en Google Books', pelicula: 'Buscar película (OMDB/TMDB)', serie: 'Buscar serie', disco: 'Registrar disco manualmente' };
  document.getElementById('search-label').textContent = labels[type];
  document.getElementById('add-search').value = '';
  document.getElementById('add-search-results').style.display = 'none';
}

function resetForm() {
  ['f-titulo','f-autor','f-editorial','f-paginas','f-anio-pub','f-edicion','f-ciudad-pub','f-traductor','f-idioma','f-cover','f-notas','f-origen-adq','f-fecha-adq',
   'fp-titulo','fp-director','fp-anio-est','fp-duracion','fp-foto','fp-musica','fp-protagonista','fp-guionista','fp-cover','fp-elenco','fp-productora',
   'fs-titulo','fs-director','fs-anio-est','fs-duracion','fs-caps-por-temp','fs-min-episodio','fs-musica','fs-protagonista','fs-guionista','fs-cover','fs-elenco',
   'fd-titulo','fd-artista','fd-anio-pub','fd-productor','fd-discografica','fd-musicos','fd-colaboraciones','fd-mes','fd-anio-escuchado','fd-cover']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  // Limpiar previews de portada
  ['f-cover-preview','fp-cover-preview','fs-cover-preview','fd-cover-preview'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  const calcEl = document.getElementById('fs-duracion-calc');
  if (calcEl) calcEl.textContent = '';
  document.getElementById('f-estado').value = 'leido';
  document.getElementById('f-progreso').value = 0;
  document.getElementById('prog-pct').textContent = '0';
  document.getElementById('abandono-field').style.display = 'none';
  document.getElementById('f-abandono').value = '';
  populateIdiomaSelect('');
  document.getElementById('f-idioma-otro').style.display = 'none';
  document.getElementById('f-idioma-otro').value = '';
  const origenAdqEl = document.getElementById('f-origen-adq'); if (origenAdqEl) origenAdqEl.value = '';
  const fechaAdqEl = document.getElementById('f-fecha-adq'); if (fechaAdqEl) fechaAdqEl.value = '';
  const invFlagEl = document.getElementById('f-en-inventario'); if (invFlagEl) invFlagEl.checked = false; syncInventoryChipState();
  resetHistoriaFields();
  resetGeneros();
  updateHistoriaFieldsVisibility();
  setGenerosCineSeleccionados([]);
  document.getElementById('fp-pais').value = '';
  document.getElementById('fp-basada').value = '';
  ['fp-autor-original','fp-obra-original','fs-autor-original','fs-obra-original'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const fpOrig=document.getElementById('fp-autor-original-field'); if(fpOrig) fpOrig.style.display='none';
  document.getElementById('fs-basada').value = '';
  const fsOrig=document.getElementById('fs-autor-original-field'); if(fsOrig) fsOrig.style.display='none';
  selectType('libro', document.querySelector('.type-btn[data-type="libro"]'));
}

function calcSeriesDuracion() {
  const caps    = parseInt(document.getElementById('fs-caps-por-temp')?.value) || 0;
  const minEp   = parseInt(document.getElementById('fs-min-episodio')?.value) || 0;
  const totalMin  = caps * minEp;
  const durInput  = document.getElementById('fs-duracion');
  const calcEl    = document.getElementById('fs-duracion-calc');
  if (totalMin > 0 && durInput) {
    durInput.value = totalMin;
    if (calcEl) calcEl.textContent = `${caps} caps × ${minEp} min = ${fmtMin(totalMin)} esta temporada`;
  } else if (calcEl) {
    calcEl.textContent = '';
  }
}

document.getElementById('fp-basada').addEventListener('change', function() {
  document.getElementById('fp-autor-original-field').style.display = this.value ? 'grid' : 'none';
});
document.getElementById('fs-basada').addEventListener('change', function() {
  const panel=document.getElementById('fs-autor-original-field'); if(panel) panel.style.display=this.value?'grid':'none';
});
document.getElementById('f-estado').addEventListener('change', function() {
  document.getElementById('progreso-field').style.display  = this.value === 'leyendo'   ? 'block' : 'none';
  document.getElementById('abandono-field').style.display  = this.value === 'abandonado' ? 'block' : 'none';
});

function toggleGenero(btn) {
  btn.classList.toggle('active');
  if (btn.closest && btn.closest('#generos-chips')) updateHistoriaFieldsVisibility();
}

function updateHistoriaFieldsVisibility(){const panel=document.getElementById('historia-fields');if(!panel)return;const active=!!document.querySelector('#generos-chips .genero-chip[data-g="Historia"].active');panel.style.display=active?'block':'none';if(active){fillHistoricalLineDatalists();const rel=document.getElementById('hist-related-lines');if(rel&&!rel.querySelector('[data-line-id]'))renderHistoricalLineChoices('hist-related-lines',[])}}
function getHistoriaFromForm(){const lineaPrincipal=document.getElementById('hist-linea-principal')?.value?.trim()||'',lineaPrincipalId=registerHistoricalLine(lineaPrincipal),ri=document.getElementById('hist-fecha-inicio')?.value,rf=document.getElementById('hist-fecha-fin')?.value,inicio=ri===''||ri==null?null:Number(ri),fin=rf===''||rf==null?null:Number(rf),lineasRelacionadasIds=selectedHistoricalLineIds('hist-related-lines',lineaPrincipalId),lineasRelacionadas=historicalLineNamesFromIds(lineasRelacionadasIds);return{schema:'lumen_historia_v3',lineaPrincipal,lineaPrincipalId,fechaInicio:inicio,fechaFin:fin,lineasRelacionadas,lineasRelacionadasIds,periodos:(inicio!==null||fin!==null)?[{nombre:'',tema:'',inicio:inicio??fin,fin:fin??inicio,precision:'aproximada',cobertura:'periodo',periodoId:canonicalEntityId('histperiod',`${lineaPrincipalId||lineaPrincipal}|${inicio??fin}_${fin??inicio}`)}]:[]}}
function resetHistoriaFields(){['hist-linea-principal','hist-fecha-inicio','hist-fecha-fin'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});renderHistoricalLineChoices('hist-related-lines',[])}
function setHistoriaFields(historia){const h=historia||{},b=historyBounds(h),set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??''};set('hist-linea-principal',h.lineaPrincipal||'');set('hist-fecha-inicio',b.inicio);set('hist-fecha-fin',b.fin);updateHistoriaFieldsVisibility();fillHistoricalLineDatalists();renderHistoricalLineChoices('hist-related-lines',h.lineasRelacionadasIds||[])}
function formatHistoriaYear(y) { const n=Number(y); if(!Number.isFinite(n)) return ''; return n<0?`${Math.abs(n)} a. C.`:`${n} d. C.`; }

function getGenerosSeleccionados() {
  return [...document.querySelectorAll('#generos-chips .genero-chip.active')].map(b => b.dataset.g);
}

function setGenerosSeleccionados(generos) {
  document.querySelectorAll('#generos-chips .genero-chip').forEach(b => {
    b.classList.toggle('active', (generos||[]).includes(b.dataset.g));
  });
}

function resetGeneros() {
  document.querySelectorAll('#generos-chips .genero-chip').forEach(b => b.classList.remove('active'));
}

// ═══════════════════════════════════
//  SEARCH (Google Books + OMDB)
// ═══════════════════════════════════
function debounceSearch() {
  clearTimeout(searchTimeout);
  const q = document.getElementById('add-search').value.trim();
  if (q.length < 3) { document.getElementById('add-search-results').style.display = 'none'; return; }
  searchTimeout = setTimeout(() => doSearch(q), 500);
}

async function doSearch(q) {
  const resultsEl = document.getElementById('add-search-results');
  resultsEl.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--ink3);">Buscando...</div>';
  resultsEl.style.display = 'block';
  try {
    if (currentType === 'disco') {
      resultsEl.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--ink3);">Los discos se registran manualmente por ahora.</div>';
      return;
    }
    if (currentType === 'libro') {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&langRestrict=`);
      const data = await res.json();
      if (!data.items || data.items.length === 0) { resultsEl.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--ink3);">Sin resultados.</div>'; return; }
      resultsEl.innerHTML = data.items.map(item => {
        const v = item.volumeInfo;
        const cover = v.imageLinks ? v.imageLinks.thumbnail : '';
        const authors = v.authors ? v.authors.join(', ') : '—';
        return `<div class="search-result-item" onclick='fillBookForm(${JSON.stringify({
          title: v.title || '',
          authors: authors,
          publisher: v.publisher || '',
          pages: v.pageCount || '',
          pubYear: v.publishedDate ? v.publishedDate.slice(0,4) : '',
          language: v.language || '',
          cover: cover,
          description: v.description || ''
        }).replace(/'/g,"&#39;")})'>
          ${cover ? `<img src="${cover}" class="sr-cover">` : '<div class="sr-cover"></div>'}
          <div>
            <div class="sr-title">${v.title || ''}</div>
            <div class="sr-sub">${authors} · ${v.publisher || ''} · ${v.publishedDate ? v.publishedDate.slice(0,4) : ''}</div>
          </div>
        </div>`;
      }).join('');
    } else {
      // OMDB free API (open, no key needed for basic search)
      const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(q)}&type=${currentType === 'pelicula' ? 'movie' : 'series'}&apikey=trilogy`);
      const data = await res.json();
      if (data.Response === 'False' || !data.Search) {
        // Fallback: manual entry notice
        resultsEl.innerHTML = `<div style="padding:12px 14px;font-size:13px;color:var(--ink3);">Búsqueda automática disponible con API key de OMDB (omdbapi.com). Rellena manualmente.</div>`;
        return;
      }
      resultsEl.innerHTML = data.Search.slice(0,5).map(item => `
        <div class="search-result-item" onclick="fillMovieFromOMDB('${item.imdbID}')">
          ${item.Poster !== 'N/A' ? `<img src="${item.Poster}" class="sr-cover">` : '<div class="sr-cover"></div>'}
          <div>
            <div class="sr-title">${item.Title}</div>
            <div class="sr-sub">${item.Year} · ${item.Type}</div>
          </div>
        </div>`).join('');
    }
  } catch(e) {
    resultsEl.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--ink3);">Error de búsqueda. Rellena manualmente.</div>';
  }
}

function fillBookForm(data) {
  document.getElementById('f-titulo').value = data.title;
  document.getElementById('f-autor').value = data.authors;
  document.getElementById('f-editorial').value = data.publisher;
  document.getElementById('f-paginas').value = data.pages;
  document.getElementById('f-anio-pub').value = data.pubYear;
  populateIdiomaSelect(normalizeIdioma(data.language));
  document.getElementById('f-cover').value = data.cover;
  document.getElementById('add-search-results').style.display = 'none';
  document.getElementById('add-search').value = data.title;
  showToast('✓ Datos importados de Google Books');
}

async function fillMovieFromOMDB(imdbId) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=trilogy`);
    const d = await res.json();
    if (currentType === 'pelicula') {
      document.getElementById('fp-titulo').value = d.Title || '';
      document.getElementById('fp-director').value = d.Director || '';
      document.getElementById('fp-anio-est').value = d.Year ? d.Year.slice(0,4) : '';
      const dur = d.Runtime ? parseInt(d.Runtime) : '';
      document.getElementById('fp-duracion').value = dur;
      document.getElementById('fp-protagonista').value = d.Actors ? d.Actors.split(',')[0].trim() : '';
      document.getElementById('fp-guionista').value = d.Writer || '';
      document.getElementById('fp-cover').value = d.Poster !== 'N/A' ? d.Poster : '';
    } else {
      document.getElementById('fs-titulo').value = d.Title || '';
      document.getElementById('fs-director').value = d.Director || '';
      document.getElementById('fs-anio-est').value = d.Year ? d.Year.slice(0,4) : '';
      document.getElementById('fs-protagonista').value = d.Actors ? d.Actors.split(',')[0].trim() : '';
      document.getElementById('fs-guionista').value = d.Writer || '';
      document.getElementById('fs-cover').value = d.Poster !== 'N/A' ? d.Poster : '';
    }
    document.getElementById('add-search-results').style.display = 'none';
    showToast('✓ Datos importados');
  } catch { showToast('Error al obtener detalles'); }
}

// ═══════════════════════════════════
//  WIKIPEDIA IMPORT
// ═══════════════════════════════════
async function importFromWikipedia() {
  const urlInput = document.getElementById('fp-wiki-url');
  const status   = document.getElementById('fp-wiki-status');
  const raw = urlInput.value.trim();
  if (!raw) { status.textContent = 'Pega la URL de una página de Wikipedia.'; return; }

  // Extract article title from URL
  // Supports: https://es.wikipedia.org/wiki/TITULO or https://en.wikipedia.org/wiki/TITULO
  const match = raw.match(/wikipedia\.org\/wiki\/([^?#]+)/i);
  if (!match) { status.textContent = '⚠ URL de Wikipedia no válida.'; return; }

  const articleTitle = decodeURIComponent(match[1]);
  // Detect language
  const langMatch = raw.match(/\/\/([\w-]+)\.wikipedia/);
  const lang = langMatch ? langMatch[1] : 'es';

  status.textContent = '⏳ Cargando desde Wikipedia...';

  try {
    // Use Wikipedia REST API to get page summary + infobox via action API
    const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`;
    const res = await fetch(apiUrl);
    const json = await res.json();
    const pages = json.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing) throw new Error('Página no encontrada');

    const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';
    const fields = parseWikipediaInfobox(wikitext);

    // Fill form fields
    if (fields.titulo)       document.getElementById('fp-titulo').value = fields.titulo;
    if (fields.director)     document.getElementById('fp-director').value = fields.director;
    if (fields.anio)         document.getElementById('fp-anio-est').value = fields.anio;
    if (fields.duracion)     document.getElementById('fp-duracion').value = fields.duracion;
    if (fields.protagonista) document.getElementById('fp-protagonista').value = fields.protagonista;
    if (fields.guionista)    document.getElementById('fp-guionista').value = fields.guionista;
    if (fields.musica)       document.getElementById('fp-musica').value = fields.musica;
    if (fields.fotografia)   document.getElementById('fp-foto').value = fields.fotografia;
    if (fields.cover)        document.getElementById('fp-cover').value = fields.cover;
    if (fields.pais)         document.getElementById('fp-pais').value = fields.pais;
    if (fields.productora)   document.getElementById('fp-productora').value = fields.productora;
    if (fields.generos_cine) setGenerosCineSeleccionados(fields.generos_cine);

    const filled = Object.keys(fields).length;
    status.textContent = `✓ ${filled} campo${filled!==1?'s':''} importado${filled!==1?'s':''}. Revisa y edita si es necesario.`;
    status.style.color = 'var(--green)';
    showToast('✓ Datos importados de Wikipedia');
  } catch(e) {
    status.textContent = '⚠ Error al cargar. Verifica la URL e intenta de nuevo.';
    status.style.color = 'var(--red)';
  }
}

function parseWikipediaInfobox(wikitext) {
  const fields = {};
  // Extract infobox block (between {{ and }})
  const infoboxMatch = wikitext.match(/\{\{[Ff]icha de película[\s\S]*?(?=\n\}\})/i)
    || wikitext.match(/\{\{[Ii]nfobox film[\s\S]*?(?=\n\}\})/i)
    || wikitext.match(/\{\{[Ff]ilm[\s\S]*?(?=\n\}\})/i)
    || wikitext.match(/\{\{[Ii]nfobox[\s\S]*?(?=\n\}\})/i);

  const text = infoboxMatch ? infoboxMatch[0] : wikitext;

  // Helper: extract field value, stripping wiki markup
  const getField = (patterns) => {
    for (const pat of patterns) {
      const r = new RegExp(`\\|\\s*${pat}\\s*=\\s*([^\\n|\\}]+)`, 'i');
      const m = text.match(r);
      if (m) return cleanWikiText(m[1]);
    }
    return null;
  };

  const t = getField(['título','titulo','title','nombre','name']);
  if (t) fields.titulo = t;

  const d = getField(['dirección','director','directed_by','dirección']);
  if (d) fields.director = d;

  // Year: try to extract from release_date or año
  const yr = getField(['año','year','release_date','fecha de lanzamiento','fecha_de_lanzamiento']);
  if (yr) { const ym = yr.match(/\d{4}/); if(ym) fields.anio = parseInt(ym[0]); }

  const dur = getField(['duración','runtime','running_time','duracion']);
  if (dur) { const dm = dur.match(/\d+/); if(dm) fields.duracion = parseInt(dm[0]); }

  const stars = getField(['protagonista','starring','reparto','actores']);
  if (stars) fields.protagonista = stars.split(/[,·]/)[0].trim();

  const scr = getField(['guión','screenplay','guion','written_by','writer']);
  if (scr) fields.guionista = scr.split(/[,·]/)[0].trim();

  const mus = getField(['música','music','composer','musica']);
  if (mus) fields.musica = mus.split(/[,·]/)[0].trim();

  const cin = getField(['fotografía','cinematography','cinematógrafo','fotografia']);
  if (cin) fields.fotografia = cin;

  // País de producción → código ISO
  const paisRaw = getField(['país','country','pais','país_de_producción','nation']);
  if (paisRaw) {
    const PAIS_MAP = {
      'argentina':'AR','australia':'AU','austria':'AT','bélgica':'BE','belgium':'BE',
      'brasil':'BR','brazil':'BR','canadá':'CA','canada':'CA','chile':'CL','china':'CN',
      'colombia':'CO','croacia':'HR','república checa':'CZ','czech':'CZ',
      'dinamarca':'DK','denmark':'DK','egipto':'EG','egypt':'EG','finlandia':'FI','finland':'FI',
      'francia':'FR','france':'FR','alemania':'DE','germany':'DE','grecia':'GR','greece':'GR',
      'hong kong':'HK','hungría':'HU','hungary':'HU','india':'IN','indonesia':'ID',
      'irán':'IR','iran':'IR','irlanda':'IE','ireland':'IE','israel':'IL',
      'italia':'IT','italy':'IT','japón':'JP','japan':'JP','corea del sur':'KR',
      'south korea':'KR','mexico':'MX','méxico':'MX','marruecos':'MA','morocco':'MA',
      'países bajos':'NL','netherlands':'NL','nueva zelanda':'NZ','new zealand':'NZ',
      'noruega':'NO','norway':'NO','pakistan':'PK','perú':'PE','peru':'PE',
      'polonia':'PL','poland':'PL','portugal':'PT','rumanía':'RO','romania':'RO',
      'rusia':'RU','russia':'RU','sudáfrica':'ZA','south africa':'ZA',
      'españa':'ES','spain':'ES','suecia':'SE','sweden':'SE','suiza':'CH','switzerland':'CH',
      'taiwán':'TW','taiwan':'TW','tailandia':'TH','thailand':'TH',
      'turquía':'TR','turkey':'TR','ucrania':'UA','ukraine':'UA',
      'reino unido':'GB','united kingdom':'GB','gran bretaña':'GB','uk':'GB',
      'estados unidos':'US','united states':'US','usa':'US','ee. uu.':'US',
      'venezuela':'VE','vietnam':'VN','yugoslavia':'YU'
    };
    const paisLower = paisRaw.toLowerCase().replace(/['']/g,"'");
    for (const [nombre, codigo] of Object.entries(PAIS_MAP)) {
      if (paisLower.includes(nombre)) { fields.pais = codigo; break; }
    }
  }

  // Productora — preservar múltiples separadas por coma
  const prod = getField(['productora','production_company','producer','empresa_productora','distribución','production']);
  if (prod) fields.productora = cleanWikiTextList(prod);

  // Género → mapear a lista controlada
  const genRaw = getField(['género','genre','genero']);
  if (genRaw) {
    const GENERO_MAP = {
      'drama':'Drama','comedia':'Comedia','comedy':'Comedia','thriller':'Thriller',
      'terror':'Terror','horror':'Terror','ciencia ficción':'Ciencia ficción',
      'science fiction':'Ciencia ficción','sci-fi':'Ciencia ficción','animación':'Animación',
      'animation':'Animación','documental':'Documental','documentary':'Documental',
      'romance':'Romance','romantic':'Romance','acción':'Acción','action':'Acción',
      'aventura':'Aventura','adventure':'Aventura','histórico':'Histórico',
      'historical':'Histórico','historia':'Histórico','crimen':'Crimen','crime':'Crimen',
      'misterio':'Misterio','mystery':'Misterio','musical':'Musical','fantasía':'Fantasía',
      'fantasy':'Fantasía','bélico':'Bélico','war':'Bélico','guerra':'Bélico',
      'biográfico':'Biográfico','biography':'Biográfico','biographical':'Biográfico',
      'western':'Western'
    };
    const genLower = genRaw.toLowerCase();
    const generos = [];
    for (const [key, val] of Object.entries(GENERO_MAP)) {
      if (genLower.includes(key) && !generos.includes(val)) generos.push(val);
      if (generos.length >= 2) break;
    }
    if (generos.length) fields.generos_cine = generos;
  }

  // Try to get cover from image field
  const img = getField(['imagen','image','image_name','poster']);
  if (img) {
    const imgClean = img.replace(/\[\[.*?\]\]/g,'').replace(/File:|Archivo:/gi,'').trim();
    if (imgClean) {
      // Construct Wikimedia Commons thumbnail URL
      const encoded = encodeURIComponent(imgClean.replace(/ /g,'_'));
      fields.cover = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=300`;
    }
  }

  return fields;
}

function cleanWikiText(str) {
  return str
    // Plainlist / unbulleted list: extraer contenido y separar ítems con coma
    .replace(/\{\{(?:plainlist|unbulleted list|ubl|hlist)[^}]*\|([\s\S]*?)\}\}/gi, (_, inner) => {
      return inner.split(/\*|\n/).map(s => s.trim()).filter(Boolean).join(', ');
    })
    // Flatlist similar
    .replace(/\{\{flatlist\|([\s\S]*?)\}\}/gi, (_, inner) => {
      return inner.split(/\*|\n/).map(s => s.trim()).filter(Boolean).join(', ');
    })
    // Saltos de línea entre ítems (ej: líneas con * al inicio) → coma
    .replace(/\n\s*\*/g, ', ')
    // [[link|text]] → text
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
    // {{template}} → '' (después de los especiales de lista)
    .replace(/\{\{[^}]*\}\}/g, '')
    // HTML tags
    .replace(/<[^>]+>/g, '')
    // bold/italic
    .replace(/'''?/g, '')
    // Comas duplicadas
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

// Versión especial para campos de lista (productora, país) — preserva múltiples valores
function cleanWikiTextList(str) {
  const clean = cleanWikiText(str);
  // Separar por coma, punto, &, newline y retornar primeros 3 máximo
  return clean.split(/[,&\n·]/).map(s => s.trim()).filter(s => s.length > 1).slice(0, 3).join(', ');
}
function setRating(n) { currentRating = n; updateStars(n); }
function updateStars(n) {
  document.querySelectorAll('#rating-stars .star').forEach((s, i) => s.classList.toggle('filled', i < n));
}


// ═══════════════════════════════════
//  SAFE EDIT MERGE — v154
// ═══════════════════════════════════
function mergeEntryForSafeEdit(prev, next) {
  if (!prev) return next;

  const merged = { ...prev, ...next };

  // Al editar metadatos desde el formulario general no se deben perder
  // campos operativos que no aparecen en ese formulario. El caso crítico son
  // los libros en curso: readDates/progresoPag/readingMode alimentan Control
  // de Plan, heatmaps, rachas y exportador de lectura.
  const protectedFields = [
    'readDates',
    'progresoPag',
    'readingMode',
    'notas_lista',
    'capActual',
    'capTotal',
    'temporadaActual',
    'rutas',
    'influencias',
    'historia',
    'enInventario'
  ];

  protectedFields.forEach(k => {
    const prevVal = prev[k];
    const nextVal = next[k];
    const nextMissing = nextVal === undefined || nextVal === null ||
      (Array.isArray(nextVal) && nextVal.length === 0 && Array.isArray(prevVal) && prevVal.length > 0);

    if (nextMissing && prevVal !== undefined && prevVal !== null) {
      merged[k] = prevVal;
    }
  });

  // Si un libro tiene historial diario, la última marca manda sobre una
  // edición general de metadatos. Esto evita que cambiar fecha de adquisición
  // convierta todo el avance acumulado en lectura de hoy.
  if (prev.type === 'libro' && next.type === 'libro' && Array.isArray(prev.readDates) && prev.readDates.length) {
    const ordered = prev.readDates
      .filter(r => r && (r.date || r.fecha) && Number.isFinite(Number(r.pag)))
      .sort((a, b) => String(a.date || a.fecha).localeCompare(String(b.date || b.fecha)));

    if (ordered.length) {
      const lastPag = Number(ordered[ordered.length - 1].pag);
      if (Number.isFinite(lastPag) && lastPag >= 0) {
        merged.readDates = prev.readDates;
        merged.progresoPag = lastPag;
        merged.readingMode = prev.readingMode || 'pag';
        if (merged.paginas && Number(merged.paginas) > 0) {
          merged.progreso = Math.max(0, Math.min(100, Math.round((lastPag / Number(merged.paginas)) * 100)));
        }
      }
    }
  }

  merged._updatedAt = next._updatedAt || Date.now();
  return merged;
}

// ═══════════════════════════════════
//  INVENTARIO ↔ BIBLIOTECA (v165)
// ═══════════════════════════════════
function bookHasInventoryRecord(bookId) { return loadInventory().some(x => x.linkedEntryId === bookId); }
function toggleBookInventoryQuick(bookId) {
  const book=(db.entries||[]).find(e=>e&&e.id===bookId&&e.type==='libro');
  if(!book){showToast('Libro no encontrado');return;}
  const inv=loadInventory();
  const linked=inv.filter(x=>x.linkedEntryId===bookId);
  const active=!!book.enInventario||linked.length>0;
  if(active){
    if(!confirm('¿Quitar este libro de tu inventario físico?')) return;
    book.enInventario=false;
    const nextInv=inv.filter(x=>x.linkedEntryId!==bookId);
    try{saveInventory(nextInv,false);book._updatedAt=Date.now();saveDB();}
    catch(err){console.error('[LUMEN v183] Quitar inventario:',err);showToast('⚠ No se pudo actualizar el inventario',4000);return;}
    showToast('✓ Quitado del inventario');
  }else{
    book.enInventario=true;
    book._updatedAt=Date.now();
    try{saveDB();}
    catch(err){console.error('[LUMEN v183] Agregar inventario:',err);book.enInventario=false;showToast('⚠ No se pudo actualizar el inventario',4000);return;}
    showToast('✓ Agregado al inventario');
  }
  if(currentScreen==='library') renderLibrary();
}

function syncInventoryChipState(){const cb=document.getElementById('f-en-inventario'),chip=document.getElementById('f-inventory-chip');if(!cb||!chip)return;chip.classList.toggle('active',!!cb.checked);chip.setAttribute('aria-pressed',cb.checked?'true':'false');chip.title=cb.checked?'Quitar del inventario físico':'Agregar al inventario físico';}
function toggleInventoryChip(){const cb=document.getElementById('f-en-inventario');if(!cb)return;cb.checked=!cb.checked;syncInventoryChipState();}

function syncInventoryFromBook(book) {
  if (!book || book.type !== 'libro') return;
  let inv = loadInventory();
  const linked = inv.filter(x => x.linkedEntryId === book.id);
  if (book.enInventario) {
    if (!linked.length) {
      inv.push({inventoryId:'inv_flag_'+Date.now(),sourceId:'library_flag',titulo:book.titulo||'',autor:book.autor||'',editorial:book.editorial||'',linkedEntryId:book.id,inCart:false,_updatedAt:Date.now()});
    } else {
      linked.forEach(x=>{x.titulo=book.titulo||x.titulo;x.autor=book.autor||x.autor;x.editorial=book.editorial||x.editorial;x._updatedAt=Date.now();});
    }
  } else if (linked.length) {
    inv = inv.filter(x => x.linkedEntryId !== book.id);
  }
  saveInventory(inv,false);
}

// ═══════════════════════════════════
//  SAVE ENTRY
// ═══════════════════════════════════
function saveEntry() {
  return lumenSafeAction("Guardar ficha", () => {
  let entry = { id: editingId || 'e_' + Date.now(), type: currentType, notas: document.getElementById('f-notas').value };
  if (currentType === 'libro') {
    const titulo = document.getElementById('f-titulo').value.trim();
    if (!titulo) { showToast('Ingresa el título del libro'); return; }
    entry = { ...entry, titulo, autor: document.getElementById('f-autor').value, editorial: document.getElementById('f-editorial').value,
      paginas: parseInt(document.getElementById('f-paginas').value) || 0,
      anio_pub: parseInt(document.getElementById('f-anio-pub').value) || (editingId ? (db.entries.find(e=>e.id===editingId)||{}).anio_pub||null : null),
      edicion: document.getElementById('f-edicion')?.value?.trim() || '',
      ciudad_publicacion: document.getElementById('f-ciudad-pub')?.value?.trim() || '',
      traductor: document.getElementById('f-traductor').value,
      idioma: getIdiomaValueFromForm(),
      mes: document.getElementById('f-mes').value,
      anio: parseInt(document.getElementById('f-anio-lect').value) || new Date().getFullYear(),
      origen_adquisicion: document.getElementById('f-origen-adq')?.value || null,
      fecha_adquisicion: document.getElementById('f-fecha-adq')?.value || null,
      estado: document.getElementById('f-estado').value,
      progreso: parseInt(document.getElementById('f-progreso').value),
      abandono: document.getElementById('f-abandono').value.trim() || null,
      generos: getGenerosSeleccionados(),
      enInventario: !!document.getElementById('f-en-inventario')?.checked,
      historia: getGenerosSeleccionados().includes('Historia') ? getHistoriaFromForm() : null,
      cover: document.getElementById('f-cover').value };
    if (editingId) { const prev=db.entries.find(e=>e.id===editingId); if(prev?.bibliografia) entry.bibliografia=prev.bibliografia; if(prev?.isbn)entry.isbn=prev.isbn; if(prev?.anio_publicacion_original!=null)entry.anio_publicacion_original=prev.anio_publicacion_original; if(prev?.periodo_publicacion_inicio!=null)entry.periodo_publicacion_inicio=prev.periodo_publicacion_inicio; if(prev?.periodo_publicacion_fin!=null)entry.periodo_publicacion_fin=prev.periodo_publicacion_fin; }
    if (_pendingFormBibliography) { entry.bibliografia=_pendingFormBibliography; const bo=_pendingFormBibliography.obraOriginal||{},be=_pendingFormBibliography.edicionConsultada||{}; if(be.isbn)entry.isbn=be.isbn;if(be.editorialId)entry.editorialId=be.editorialId;if(be.traductorIds)entry.traductorIds=be.traductorIds;if(bo.anioPublicacionOriginal!=null)entry.anio_publicacion_original=Number(bo.anioPublicacionOriginal);if(bo.periodoInicio!=null)entry.periodo_publicacion_inicio=Number(bo.periodoInicio);if(bo.periodoFin!=null)entry.periodo_publicacion_fin=Number(bo.periodoFin); _pendingFormBibliography=null; }
  } else if (currentType === 'pelicula') {
    const titulo = document.getElementById('fp-titulo').value.trim();
    if (!titulo) { showToast('Ingresa el título'); return; }
    entry = { ...entry, titulo, director: document.getElementById('fp-director').value,
      anio_est: parseInt(document.getElementById('fp-anio-est').value) || null,
      duracion: parseInt(document.getElementById('fp-duracion').value) || 0,
      fotografia: document.getElementById('fp-foto').value,
      musica: document.getElementById('fp-musica').value,
      protagonista: document.getElementById('fp-protagonista').value,
      guionista: document.getElementById('fp-guionista').value,
      elenco: document.getElementById('fp-elenco').value.split('\n').map(s=>s.trim()).filter(Boolean),
      pais: document.getElementById('fp-pais').value || null,
      productora: document.getElementById('fp-productora').value.trim() || null,
      generos_cine: getGenerosCineSeleccionados(),
      autor_original: document.getElementById('fp-autor-original').value.trim(),
      obra_original: document.getElementById('fp-obra-original').value.trim(),
      mes: document.getElementById('fp-mes').value,
      anio: parseInt(document.getElementById('fp-anio-visto').value) || new Date().getFullYear(),
      cover: document.getElementById('fp-cover').value };
  } else if (currentType === 'disco') {
    const titulo = document.getElementById('fd-titulo').value.trim();
    if (!titulo) { showToast('Ingresa el nombre del disco'); return; }
    entry = { ...entry, titulo,
      artista: document.getElementById('fd-artista').value.trim(),
      anio_pub: parseInt(document.getElementById('fd-anio-pub').value) || null,
      productor: document.getElementById('fd-productor').value.trim() || null,
      discografica: document.getElementById('fd-discografica').value.trim() || null,
      musicos: document.getElementById('fd-musicos').value.split('\n').map(s=>s.trim()).filter(Boolean),
      colaboraciones: document.getElementById('fd-colaboraciones').value.split('\n').map(s=>s.trim()).filter(Boolean),
      mes: document.getElementById('fd-mes').value,
      anio: parseInt(document.getElementById('fd-anio-escuchado').value) || new Date().getFullYear(),
      cover: document.getElementById('fd-cover').value };
  } else {
    const titulo = document.getElementById('fs-titulo').value.trim();
    if (!titulo) { showToast('Ingresa el título'); return; }
    entry = { ...entry, titulo, director: document.getElementById('fs-director').value,
      anio_est: parseInt(document.getElementById('fs-anio-est').value) || null,
      temporadas: parseInt(document.getElementById('fs-temporadas').value) || 1,
      capsPorTemp: parseInt(document.getElementById('fs-caps-por-temp').value) || null,
      minEpisodio: parseInt(document.getElementById('fs-min-episodio').value) || null,
      duracion: parseInt(document.getElementById('fs-duracion').value) || 0,
      musica: document.getElementById('fs-musica').value,
      protagonista: document.getElementById('fs-protagonista').value,
      guionista: document.getElementById('fs-guionista').value,
      elenco: document.getElementById('fs-elenco').value.split('\n').map(s=>s.trim()).filter(Boolean),
      estado: document.getElementById('fs-estado').value,
      basada: document.getElementById('fs-basada').value,
      autor_original: document.getElementById('fs-autor-original')?.value.trim() || '',
      obra_original: document.getElementById('fs-obra-original')?.value.trim() || '',
      mes: document.getElementById('fs-mes').value,
      anio: parseInt(document.getElementById('fs-anio-visto').value) || new Date().getFullYear(),
      cover: document.getElementById('fs-cover').value };
  }
  if (entry.type === 'libro') ensureBookCanonicalRefs(entry);
  if (editingId) {
    entry._updatedAt = Date.now();
    const idx = db.entries.findIndex(e => e.id === editingId);
    if (idx >= 0) {
      const prevEntry = db.entries[idx];
      db.entries[idx] = mergeEntryForSafeEdit(prevEntry, entry);
    }
  } else {
    entry._updatedAt = Date.now();
    // Detectar duplicados — mismo título, mismo tipo
    const dupSameType = db.entries.find(e =>
      e.id !== entry.id &&
      e.type === entry.type &&
      e.titulo.trim().toLowerCase() === entry.titulo.trim().toLowerCase()
    );
    // Detectar mismo título pero distinto tipo
    const dupOtherType = db.entries.find(e =>
      e.id !== entry.id &&
      e.type !== entry.type &&
      e.titulo.trim().toLowerCase() === entry.titulo.trim().toLowerCase()
    );
    if (dupSameType) {
      const typeLabel = entry.type==='libro'?'libro':entry.type==='pelicula'?'película':entry.type==='disco'?'disco':'serie';
      if (!confirm(`Ya tienes un ${typeLabel} con el título "${entry.titulo}". ¿Añadir de todas formas?`)) return;
    } else if (dupOtherType) {
      const typeOtro = dupOtherType.type==='libro'?'libro':dupOtherType.type==='pelicula'?'película':dupOtherType.type==='disco'?'disco':'serie';
      showToast(`ℹ También tienes este título como ${typeOtro}`, 3000);
    }
    db.entries.push(entry);
  }
  if (currentType === 'libro') {
    const finalBook = db.entries.find(e => e.id === entry.id);
    syncInventoryFromBook(finalBook);
  }
  saveDB();
  closeModal('modal-add');
  showToast('✓ Guardado en biblioteca');
  if (currentScreen === 'home') renderHome();
  if (currentScreen === 'library') renderLibrary();
  if (currentScreen === 'year') renderYear();
  if (currentScreen === 'stats') renderStats();

  });
}

// ═══════════════════════════════════
//  UPDATE BOOK PROGRESS
// ═══════════════════════════════════
function updateProgress(id, val) {
  const e = db.entries.find(x => x.id === id);
  if (e) { e.progreso = parseInt(val); saveDB(); }
  document.getElementById('pp-' + id).textContent = val + '%';
  document.getElementById('pb-' + id).style.width = val + '%';
}

// ── Helper: minutos → "Xh Ym" ──────
function fmtMin(min) {
  const m = parseInt(min) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r} min` : `${h}h`;
}

// ── Helper: días transcurridos del año hasta el mismo día-mes que hoy, para un año dado ──
function diasHastaHoyEnAnio(year) {
  const now = new Date();
  // Misma fecha (mes+día) pero en el año target
  const sameDate = new Date(year, now.getMonth(), now.getDate());
  const jan1 = new Date(year, 0, 1);
  return Math.max(1, Math.floor((sameDate - jan1) / 86400000) + 1);
}

// ── Helper: páginas leídas en un año dado, hasta el mismo mes/día que hoy ──
// Para el año en curso incluye libros en curso. Para años pasados sólo finalizados.
function getReadingDailyRecords() {
  const registros = [];
  (db.entries || []).filter(e => e.type === 'libro' && Array.isArray(e.readDates) && e.readDates.length > 0).forEach(libro => {
    const norm = normalizeBookReadDates(libro.readDates).filter(r => r.pag !== null).sort((a,b) => a.date.localeCompare(b.date));
    for (let i = 0; i < norm.length; i++) {
      const pags = i === 0 ? Number(norm[i].pag || 0) : Math.max(0, Number(norm[i].pag || 0) - Number(norm[i-1].pag || 0));
      if (pags <= 0) continue;
      registros.push({
        fecha: norm[i].date,
        titulo: libro.titulo || '',
        autor: libro.autor || '',
        pags,
        pagActual: norm[i].pag,
        totalPags: libro.paginas || null,
        libroId: libro.id
      });
    }
  });
  return registros.sort((a,b) => a.fecha.localeCompare(b.fecha));
}

function paginasRegistradasEnAnio(year) {
  const prefijo = String(year) + '-';
  return getReadingDailyRecords().filter(r => r.fecha.startsWith(prefijo)).reduce((s,r) => s + r.pags, 0);
}

function paginasRegistradasPorMes(year) {
  const data = Array(12).fill(0);
  getReadingDailyRecords().forEach(r => {
    if (!r.fecha.startsWith(String(year) + '-')) return;
    const mes = Number(r.fecha.slice(5,7)) - 1;
    if (mes >= 0 && mes < 12) data[mes] += r.pags;
  });
  return data;
}

// Páginas registradas hasta el mismo mes/día que hoy.
// La fuente única son las diferencias positivas del historial diario readDates.
function pagsHastaDia(year) {
  const now = new Date();
  const limite = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const prefijo = String(year) + '-';
  return getReadingDailyRecords()
    .filter(r => r.fecha.startsWith(prefijo) && r.fecha <= limite)
    .reduce((s,r) => s + r.pags, 0);
}

function diasEnAnio(year) {
  const y=Number(year); return (y%4===0 && (y%100!==0 || y%400===0)) ? 366 : 365;
}
function paginasFinalesLibrosEnAnio(year) {
  const y=Number(year);
  return (db.entries||[]).filter(e=>e&&e.type==='libro'&&e.estado==='leido'&&Number(e.anio)===y)
    .reduce((sum,e)=>sum+(Number(e.paginas)||0),0);
}
function historicoRitmoAnualAntesDe(year) {
  const y=Number(year);
  const years=[...new Set((db.entries||[]).filter(e=>e&&e.type==='libro'&&e.estado==='leido'&&Number(e.anio)<y&&Number(e.anio)>0).map(e=>Number(e.anio)))].sort((a,b)=>a-b);
  return years.map(anio=>{const paginas=paginasFinalesLibrosEnAnio(anio);return {anio,paginas,dias:diasEnAnio(anio),ritmo:paginas/diasEnAnio(anio)};}).filter(x=>x.paginas>0);
}

