// ═══════════════════════════════════════════════════════════════
// v173 — Persistencia local robusta para Safari/iOS
// Las portadas base64 se respaldan en IndexedDB y localStorage
// conserva solo el modelo liviano. Así un QuotaExceededError no
// interrumpe los botones de Guardar/Terminé ni deja modales abiertos.
// ═══════════════════════════════════════════════════════════════
const LUMEN_ASSET_DB = 'lumen_assets_v1';
const LUMEN_ASSET_STORE = 'images';
let _assetDbPromise = null;

function openLumenAssetDB() {
  if (_assetDbPromise) return _assetDbPromise;
  _assetDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB no disponible')); return; }
    const req = indexedDB.open(LUMEN_ASSET_DB, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(LUMEN_ASSET_STORE)) idb.createObjectStore(LUMEN_ASSET_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB'));
  });
  return _assetDbPromise;
}

function localAssetKey(entryId, field='cover') { return `${entryId || 'sin-id'}:${field}`; }

async function putLocalAsset(key, value) {
  if (!value || !isBase64Image(value)) return false;
  const idb = await openLumenAssetDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(LUMEN_ASSET_STORE, 'readwrite');
    tx.objectStore(LUMEN_ASSET_STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la imagen local'));
  });
}

async function getLocalAsset(key) {
  try {
    const idb = await openLumenAssetDB();
    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(LUMEN_ASSET_STORE, 'readonly');
      const req = tx.objectStore(LUMEN_ASSET_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (_) { return null; }
}

function lightweightLocalDB(sourceDb) {
  const clone = JSON.parse(JSON.stringify(sourceDb || {entries:[]}));
  (clone.entries || []).forEach(e => {
    Object.keys(e || {}).forEach(k => {
      if (isBase64Image(e[k])) e[k] = '__local_image__';
    });
  });
  return clone;
}

async function stashLocalImages(entries) {
  const jobs = [];
  (entries || []).forEach(e => {
    Object.keys(e || {}).forEach(k => {
      if (isBase64Image(e[k])) jobs.push(putLocalAsset(localAssetKey(e.id, k), e[k]).catch(err => console.warn('[LUMEN v183] asset IDB:', err)));
    });
  });
  if (jobs.length) await Promise.all(jobs);
  return jobs.length;
}

async function hydrateLocalImagesFromIDB() {
  let restored = 0;
  const jobs = [];
  (db.entries || []).forEach(e => {
    Object.keys(e || {}).forEach(k => {
      if (e[k] === '__local_image__') {
        jobs.push(getLocalAsset(localAssetKey(e.id, k)).then(v => { if (v) { e[k] = v; restored++; } }));
      }
    });
  });
  if (jobs.length) await Promise.all(jobs);
  if (restored) {
    console.info(`[LUMEN v183] ${restored} imagen(es) restauradas desde IndexedDB`);
    try { refreshCurrentScreen(); } catch (_) {}
  }
  return restored;
}

function isQuotaExceeded(err) {
  return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || /quota/i.test(err.message || ''));
}

function pruneTransientLocalBackups() {
  const patterns = [
    /^lumen_mapas_backup_before_/,
    /^lumen_mapas_v1_backup_before_import$/,
    /^lumen_db_v1_backup_/,
    /^lumen_wiki_rollback/,
    /^lumen_restore_v1$/
  ];
  const doomed = [];
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && patterns.some(rx => rx.test(k))) doomed.push(k);
  }
  doomed.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
  if (doomed.length) console.info('[LUMEN v183] backups locales transitorios limpiados:', doomed.length);
  return doomed.length;
}

function safeLocalSetItem(key, value, opts={}) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaExceeded(err)) {
      console.error('[LUMEN v183] localStorage error:', key, err);
      return false;
    }
    console.warn('[LUMEN v183] Cuota local excedida en', key);
    if (opts.prune !== false) pruneTransientLocalBackups();
    try { localStorage.setItem(key, value); return true; }
    catch (err2) { console.warn('[LUMEN v183] Reintento local falló:', key, err2); return false; }
  }
}

function persistDBLocal() {
  // v177: persistencia local deliberadamente liviana y no bloqueante.
  // Las normalizaciones masivas NO pertenecen al click de Guardar.
  try {
    // Las imágenes base64 se guardan aparte en IndexedDB sin bloquear la acción.
    stashLocalImages(db.entries || []).catch(err => console.warn('[LUMEN v183] asset IDB:', err));

    // Guardar siempre el snapshot liviano: evita intentar primero una copia enorme
    // que en Safari/iOS dispara QuotaExceededError y corta la UX.
    const light = JSON.stringify(lightweightLocalDB(db));
    if (safeLocalSetItem(DB_KEY, light, {prune:true})) {
      return { ok:true, compact:true };
    }

    console.error('[LUMEN v183] No fue posible persistir el snapshot local liviano.');
    return { ok:false, compact:true };
  } catch (err) {
    console.error('[LUMEN v183] persistDBLocal:', err);
    return { ok:false, compact:true, error:err };
  }
}

async function compactLocalDBOnStartup() {
  try {
    const hasBase64 = (db.entries || []).some(e => Object.values(e || {}).some(v => isBase64Image(v)));
    if (!hasBase64) { await hydrateLocalImagesFromIDB(); return; }
    await stashLocalImages(db.entries || []);
    const light = JSON.stringify(lightweightLocalDB(db));
    try { localStorage.setItem(DB_KEY, light); }
    catch (err) {
      if (isQuotaExceeded(err)) {
        pruneTransientLocalBackups();
        try { localStorage.removeItem(DB_KEY); } catch (_) {}
        localStorage.setItem(DB_KEY, light);
      } else throw err;
    }
    console.info('[LUMEN v183] Migración local inicial completada.');
  } catch (err) {
    console.warn('[LUMEN v183] Migración local inicial no completada:', err);
  }
}

async function syncToFirestore() {
  if (!currentUser) return;
  try {
    await getValidToken();
    const result = await writeCloudV162(currentUser.uid);
    setSyncStatus('ok');
    setLastSync();
    console.info('[LUMEN v183] Sync V2 OK', result);
    return result;
  } catch(e) {
    setSyncStatus('offline');
    console.error('[LUMEN v183] Sync V2 error:', e.code || '', e.message, e);
    throw e;
  }
}

function queueCloudSyncV178(delay=900) {
  if (!currentUser) return;
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(async () => {
    setSyncStatus('syncing');
    try {
      await syncToFirestore();
    } catch (e) {
      // La nube nunca bloquea una acción local ya aceptada.
      console.warn('[LUMEN v183] sync pendiente:', e?.message || e);
      showToast(`⚠ Cambio local guardado; nube pendiente${e?.message ? ': '+e.message : ''}`, 4200);
    }
  }, delay);
}

function saveDB() {
  // v178: el guardado común NO recorre toda la biblioteca ni reconstruye Gephi.
  // Las entidades se normalizan en sus propios flujos (libro, influencia, historia, JSON).
  let localResult;
  try {
    localResult = persistDBLocal();
  } catch (err) {
    // Último cortafuego: ningún error de persistencia debe matar el onclick.
    console.error('[LUMEN v183] saveDB:', err);
    localResult = {ok:false, error:err};
  }

  if (!localResult?.ok) {
    // El cambio ya está en memoria. Informar sin lanzar excepción ni impedir cerrar el modal.
    showToast('⚠ Cambio aplicado en esta sesión; falta persistencia local.', 4200);
  }
  queueCloudSyncV178(900);
  return localResult?.ok !== false;
}

// Wrapper reutilizable para acciones de botones que persisten datos.
// Centraliza errores para que un fallo JS no parezca un botón "muerto".
function lumenSafeAction(label, action, opts={}) {
  try {
    const result = action();
    if (result && typeof result.then === 'function') {
      return result.catch(err => {
        console.error(`[LUMEN v183] ${label}:`, err);
        showToast(`⚠ ${label}: ${err?.message || 'error inesperado'}`, 4800);
        return false;
      });
    }
    return result;
  } catch (err) {
    console.error(`[LUMEN v183] ${label}:`, err);
    showToast(`⚠ ${label}: ${err?.message || 'error inesperado'}`, 4800);
    return false;
  }
}

async function manualSaveToCloud() {
  closeUserMenu();
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  setSyncStatus('syncing');
  showToast('⏳ Guardando por bloques...', 2200);
  try {
    await getValidToken();
    const result = await writeCloudV162(currentUser.uid);
    setLastSync();
    setSyncStatus('ok');
    showToast(`✓ ${result.entryCount} registros guardados en ${result.chunkCount} bloque${result.chunkCount===1?'':'s'}`, 3800);
  } catch(e) {
    setSyncStatus('offline');
    showToast(`⚠ Error al guardar: ${e.message}`, 5000);
    console.error('[LUMEN v183] manualSave error:', e);
  }
}

async function pullAndMerge(uid, silent) {
  try {
    if (auth.currentUser) await auth.currentUser.getIdToken(false);
    const remote = await readCloudCompatibleV162(uid);
    if (!remote) { if (!silent) showToast('La nube no tiene datos aún'); return; }
    const merged = mergeEntries(db.entries, remote.entries || []);
    restoreLocalImages(merged);
    db.entries = merged;
    safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
    applyRemoteModulesV162(remote);
    setLastSync();
    setSyncStatus('ok');
    if (!silent) showToast(`✓ Nube cargada: ${db.entries.length} registros`, 3200);
    renderHome();
  } catch(e) {
    setSyncStatus('offline');
    console.error('[LUMEN v183] pull error:', e);
    if (!silent) showToast(`⚠ Error al cargar: ${e.message}`, 4500);
  }
}

async function manualLoadFromCloud() {
  closeUserMenu();
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  setSyncStatus('syncing');
  showToast('⏳ Leyendo bloques de nube...', 2200);
  await pullAndMerge(currentUser.uid, false);
}

function subscribeToFirestore(uid) {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  const manifestRef = cloudDocRefV162(uid, LUMEN_SYNC_MANIFEST_DOC);
  unsubscribeSnapshot = manifestRef.onSnapshot({ includeMetadataChanges:false }, async snap => {
    if (!snap.exists || snap.metadata.hasPendingWrites || isSyncing) return;
    try {
      const remote = await readCloudV162(uid);
    if(remote?.canonicalEntities) saveCanonicalEntities(remote.canonicalEntities);
      if (!remote) return;
      const merged = mergeEntries(db.entries, remote.entries || []);
      restoreLocalImages(merged);
      db.entries = merged;
      safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
      applyRemoteModulesV162(remote);
      setLastSync();
      setSyncStatus('ok');
      renderHome();
    } catch(e) {
      console.warn('[LUMEN v183] snapshot error:', e.message);
    }
  }, e => {
    setSyncStatus('offline');
    console.warn('[LUMEN v183] listener error:', e.message);
  });
}

window.lumenSyncDiagnostico = function() {
  const { entries, modules } = buildCloudDataV162();
  const chunks = chunkEntriesV162(entries);
  const report = {
    version:'v177', schema:LUMEN_SYNC_SCHEMA,
    registros:entries.length,
    bloques:chunks.length,
    bloquesKB:chunks.map(c => Math.round(lumenUtf8Bytes({entries:c})/1024)),
    modulosKB:Math.round(lumenUtf8Bytes(modules)/1024),
    localStorageKB:Math.round(lumenUtf8Bytes(localStorage.getItem(DB_KEY)||'')/1024),
    usuario:currentUser ? currentUser.uid : null
  };
  console.table(report);
  console.info('[LUMEN v183] Diagnóstico completo', report);
  return report;
};


// v177 — diagnóstico global de acciones: deja trazabilidad de excepciones de clicks sin romper la app.
window.addEventListener('error', function(ev){
  if (ev?.error) console.error('[LUMEN v183] error global de UI:', ev.error);
});
window.addEventListener('unhandledrejection', function(ev){
  console.error('[LUMEN v183] promesa no controlada:', ev.reason);
});
