// LUMEN v185 — viewport ampliado común para mapas.
'use strict';

let _expandedMapWorkspace = null;

function mapWorkspacePanel(name) {
  return document.getElementById('mapa-' + name + '-panel');
}

function mapWorkspaceSvgContainer(name) {
  const ids = {
    influencias: 'mapa-influencias-svg',
    rutas: 'mapa-rutas-svg',
    peliculas: 'mapa-peliculas-svg',
    historia: 'hist-timeline-scroll'
  };
  return document.getElementById(ids[name]);
}

function rerenderExpandedMap(name) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (name === 'influencias' && typeof renderMapaInfluencias === 'function') renderMapaInfluencias();
    else if (name === 'rutas' && typeof renderMapaRutas === 'function') renderMapaRutas();
    else if (name === 'peliculas' && typeof renderMapaPeliculas === 'function') renderMapaPeliculas();
    else if (name === 'historia' && typeof renderMapaHistoria === 'function') renderMapaHistoria();
  }));
}

function exitMapWorkspace() {
  if (!_expandedMapWorkspace) return;
  const name = _expandedMapWorkspace;
  const panel = mapWorkspacePanel(name);
  panel?.classList.remove('map-workspace-expanded');
  document.getElementById('map-expanded-exit')?.remove();
  document.body.classList.remove('map-workspace-mode');
  _expandedMapWorkspace = null;
  rerenderExpandedMap(name);
}

function enterMapWorkspace(name) {
  const panel = mapWorkspacePanel(name);
  if (!panel) return;
  if (_expandedMapWorkspace && _expandedMapWorkspace !== name) exitMapWorkspace();
  _expandedMapWorkspace = name;
  panel.classList.add('map-workspace-expanded');
  document.body.classList.add('map-workspace-mode');

  let exit = document.getElementById('map-expanded-exit');
  if (!exit) {
    exit = document.createElement('button');
    exit.id = 'map-expanded-exit';
    exit.className = 'map-expanded-exit';
    exit.type = 'button';
    exit.textContent = '← Volver a mapas';
    exit.onclick = exitMapWorkspace;
    document.body.appendChild(exit);
  }
  exit.style.display = 'flex';
  rerenderExpandedMap(name);
  initExpandedMapSearch(name);
}

function toggleMapWorkspace(name) {
  if (_expandedMapWorkspace === name) exitMapWorkspace();
  else enterMapWorkspace(name);
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && _expandedMapWorkspace) exitMapWorkspace();
});

window.mapWorkspacePanel = mapWorkspacePanel;
window.mapWorkspaceSvgContainer = mapWorkspaceSvgContainer;
window.rerenderExpandedMap = rerenderExpandedMap;
window.enterMapWorkspace = enterMapWorkspace;
window.exitMapWorkspace = exitMapWorkspace;
window.toggleMapWorkspace = toggleMapWorkspace;

// v213: reflow al girar el dispositivo, sin alterar los datos del grafo.
let _mapOrientationRaf=0;
function refreshExpandedMapViewport(){
  if(!_expandedMapWorkspace)return;
  cancelAnimationFrame(_mapOrientationRaf);
  _mapOrientationRaf=requestAnimationFrame(()=>rerenderExpandedMap(_expandedMapWorkspace));
}
window.addEventListener('orientationchange',refreshExpandedMapViewport);
window.addEventListener('resize',refreshExpandedMapViewport);

const lumenMapFilters={rutas:new Set(['autor','libro','persona','fuente']),influencias:'todos'};
function lumenMapSelectedTypes(name){return lumenMapFilters[name] instanceof Set && _expandedMapWorkspace===name?lumenMapFilters[name]:null;}
function lumenMapInfluenceMode(){return _expandedMapWorkspace==='influencias'?lumenMapFilters.influencias:'todos';}
function toggleExpandedMapControls(){
 const controls=document.getElementById('map-expanded-filter-controls'),btn=document.getElementById('map-expanded-toggle');
 if(!controls||!btn)return;
 const hidden=controls.style.display!=='none';controls.style.display=hidden?'none':'';
 btn.textContent=hidden?'Mostrar controles':'Ocultar controles';
}
function updateLumenMapFilter(key,value,checked){
 if(key==='rutas'){
  if(checked)lumenMapFilters.rutas.add(value);else lumenMapFilters.rutas.delete(value);
 }else lumenMapFilters.influencias=value;
 rerenderExpandedMap(_expandedMapWorkspace);
}
function initExpandedMapSearch(name){
 document.getElementById('map-expanded-search')?.remove();
 if(!['influencias','rutas','peliculas'].includes(name))return;
 const root=document.createElement('div');root.id='map-expanded-search';root.className='map-expanded-search';
 const toggle=document.createElement('button');toggle.type='button';toggle.id='map-expanded-toggle';toggle.className='btn btn-secondary btn-sm';toggle.textContent='Ocultar controles';toggle.onclick=toggleExpandedMapControls;
 root.appendChild(toggle);
 const controls=document.createElement('div');controls.id='map-expanded-filter-controls';
 controls.innerHTML='<input type="search" class="input" placeholder="Buscar y centrar nodo..." aria-label="Buscar nodo" oninput="searchExpandedMapNode(this.value)"><div id="map-expanded-search-results"></div>';
 if(name==='influencias'){
  const group=document.createElement('div');group.className='lumen-expanded-filter-options';
  [['todos','Todos'],['leidos','Autores leídos'],['inventario','En inventario'],['ambos','Leídos + inventario']].forEach(([value,label])=>{
   const wrapper=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='lumen-influence-scope';input.checked=lumenMapFilters.influencias===value;input.onchange=()=>updateLumenMapFilter('influencias',value,true);
   wrapper.append(input,document.createTextNode(' '+label));group.appendChild(wrapper);
  });controls.appendChild(group);
 } else if(name==='rutas'){
  const group=document.createElement('div');group.className='lumen-expanded-filter-options';
  [['autor','Autores'],['libro','Libros'],['persona','Personas'],['fuente','Fuentes y otros']].forEach(([value,label])=>{
   const wrapper=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=lumenMapFilters.rutas.has(value);input.onchange=()=>updateLumenMapFilter('rutas',value,input.checked);
   wrapper.append(input,document.createTextNode(' '+label));group.appendChild(wrapper);
  });controls.appendChild(group);
 }
 root.appendChild(controls);document.body.appendChild(root);
}
function searchExpandedMapNode(term){
 const target=document.getElementById('map-expanded-search-results');if(!target||!_expandedMapWorkspace)return;
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const q=normalize(term);if(q.length<2){target.replaceChildren();return;}
 const c=mapWorkspaceSvgContainer(_expandedMapWorkspace),graph=c?.querySelector('svg')?.__lumenGraph;
 if(!graph){target.textContent='El mapa aún se está dibujando';return;}
 const matches=graph.nodes.filter(n=>normalize(n.label||n.id).includes(q)).slice(0,20);
 target.replaceChildren();if(!matches.length){target.textContent='Sin coincidencias';return;}
 matches.forEach(n=>{const btn=document.createElement('button');btn.type='button';btn.textContent=n.label||n.id;btn.onclick=()=>focusExpandedMapNode(n.id);target.appendChild(btn);});
}
function focusExpandedMapNode(id){
 const c=mapWorkspaceSvgContainer(_expandedMapWorkspace),svg=c?.querySelector('svg'),graph=svg?.__lumenGraph;
 const node=graph?.nodes.find(n=>String(n.id)===String(id));if(!node||!graph)return;
 const w=svg.clientWidth||c.clientWidth,h=svg.clientHeight||c.clientHeight,k=1.6;
 d3.select(svg).transition().duration(650).call(graph.zoom.transform,d3.zoomIdentity.translate(w/2-k*node.x,h/2-k*node.y).scale(k));
 const results=document.getElementById('map-expanded-search-results');if(results)results.replaceChildren();
 graph.selection?.selectAll('g').classed('lumen-node-highlight',d=>d.id===id);
}
const _exitMapWorkspaceOriginal=exitMapWorkspace;
exitMapWorkspace=function(){document.getElementById('map-expanded-search')?.remove();_exitMapWorkspaceOriginal();};
window.exitMapWorkspace=exitMapWorkspace;
