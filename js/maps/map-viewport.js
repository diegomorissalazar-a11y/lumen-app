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
    exit.textContent = '↙ Salir de ampliar';
    exit.onclick = exitMapWorkspace;
    document.body.appendChild(exit);
  }
  exit.style.display = 'flex';
  rerenderExpandedMap(name);
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
