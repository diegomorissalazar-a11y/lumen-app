// LUMEN v183 — bootstrap modular
'use strict';

const LUMEN_HTML_MANIFEST = {
  "auth": [
    "views/shell/auth.html"
  ],
  "app": [
    "views/screens/home.html",
    "views/screens/library.html",
    "views/screens/year.html",
    "views/screens/stats.html",
    "views/screens/habits.html",
    "views/screens/maps.html",
    "views/modals/wiki-export.html",
    "views/modals/bibliography.html",
    "views/modals/influences.html",
    "views/modals/routes.html",
    "views/shell/user-menu.html",
    "views/shell/bottom-nav.html"
  ],
  "modal": [
    "views/modals/add-entry.html",
    "views/modals/manga-detail-history.html",
    "views/modals/import-restore-inventory.html",
    "views/modals/reading-current.html",
    "views/modals/series-current.html",
    "views/modals/progress.html",
    "views/modals/notes.html",
    "views/modals/challenge.html",
    "views/modals/genres.html",
    "views/modals/auth-sync.html"
  ]
};
const LUMEN_JS_MANIFEST = [
  "js/core/01-firebase-data.js",
  "js/core/02-canonical-history-sync.js",
  "js/core/03-navigation-entry-search.js",
  "js/features/04-home-plan.js",
  "js/features/05-library-notes.js",
  "js/features/06-year-stats.js",
  "js/features/07-import-recovery.js",
  "js/features/08-reading-progress.js",
  "js/core/09-auth-runtime.js",
  "js/features/10-habits.js",
  "js/features/11-maps-influences.js",
  "js/features/12-routes-graphs.js",
  "js/features/13-movies-normalization.js",
  "js/features/14-reading-export.js",
  "js/features/15-manga.js",
  "js/features/16-inventory.js",
  "js/core/17-sync-v2.js",
  "js/core/18-local-persistence-actions.js"
];

async function loadFragment(path, targetId) {
  const res = await fetch(path, {cache:'no-cache'});
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
  const html = await res.text();
  document.getElementById(targetId).insertAdjacentHTML('beforeend', html);
}

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = path;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${path}`));
    document.body.appendChild(s);
  });
}

async function bootLumen() {
  const status = document.getElementById('boot-status');
  try {
    for (const path of LUMEN_HTML_MANIFEST.auth) await loadFragment(path, 'lumen-auth-root');
    for (const path of LUMEN_HTML_MANIFEST.app) await loadFragment(path, 'app');
    for (const path of LUMEN_HTML_MANIFEST.modal) await loadFragment(path, 'lumen-modal-root');
    for (const path of LUMEN_JS_MANIFEST) await loadScript(path);
    document.documentElement.classList.add('lumen-ready');
    if (status) status.remove();
    window.__LUMEN_MODULAR_BOOT_OK__ = true;
  } catch (err) {
    console.error('[LUMEN v183] Error de arranque modular:', err);
    if (status) status.innerHTML = `<strong>No se pudo iniciar LUMEN.</strong><br>${String(err.message||err)}`;
    window.__LUMEN_MODULAR_BOOT_ERROR__ = String(err.message||err);
  }
}

bootLumen();
