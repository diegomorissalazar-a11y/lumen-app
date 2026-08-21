// ═══════════════════════════════════════════════════════════════
//  LUMEN v165 — SINCRONIZACIÓN POR BLOQUES (ARQUITECTURA V2)
//  Mantiene el documento legacy intacto como respaldo y evita el
//  límite de 1 MiB dividiendo entradas y módulos en varios docs.
// ═══════════════════════════════════════════════════════════════
const LUMEN_SYNC_SCHEMA = 'lumen_cloud_v2';
const LUMEN_SYNC_MANIFEST_DOC = 'library_v2_manifest';
const LUMEN_SYNC_MODULES_DOC = 'library_v2_modules';
const LUMEN_SYNC_CHUNK_PREFIX = 'library_v2_entries_';
const LUMEN_SYNC_CHUNK_TARGET = 430000; // margen amplio bajo el límite Firestore

function lumenUtf8Bytes(value) {
  try { return new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length; }
  catch(e) { return unescape(encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))).length; }
}

function cleanForFirestoreV162(obj, depth = 0) {
  if (depth > 20 || obj === undefined) return null;
  if (obj === null || typeof obj === 'boolean') return obj;
  if (typeof obj === 'number') return Number.isFinite(obj) ? obj : null;
  if (typeof obj === 'string') return isBase64Image(obj) ? '__local_image__' : obj;
  if (typeof obj === 'function') return null;
  if (Array.isArray(obj)) return obj.map(v => cleanForFirestoreV162(v, depth + 1)).filter(v => v !== undefined);
  if (typeof obj === 'object') {
    const clean = {};
    Object.entries(obj).forEach(([k,v]) => {
      if (v === undefined) return;
      clean[k] = cleanForFirestoreV162(v, depth + 1);
    });
    return clean;
  }
  return null;
}

function buildCloudDataV162() {
  normalizeAllBookReading(db.entries || [], { repairBasic:true, source:'buildCloudDataV162' });
  const entries = (db.entries || []).map(e => cleanForFirestoreV162(e));
  const modules = cleanForFirestoreV162({
    mapas: loadMapas(),
    desafios: loadDesafios(),
    rutaCustom: loadRutaCustomNodes(),
    rutaProgramas: loadProgramas(),
    inventory: loadInventory(),
    normBlacklist: loadNormBlacklist(),
    idiomasAprobados: loadIdiomasAprobados(),
    historicalLines: historicalLinesCatalog(),
    canonicalEntities: loadCanonicalEntities()
  });
  return { entries, modules };
}

function chunkEntriesV162(entries) {
  const chunks = [];
  let current = [];
  let currentBytes = 2;
  entries.forEach(entry => {
    const entryBytes = lumenUtf8Bytes(entry) + 1;
    if (current.length && currentBytes + entryBytes > LUMEN_SYNC_CHUNK_TARGET) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(entry);
    currentBytes += entryBytes;
  });
  if (current.length || chunks.length === 0) chunks.push(current);
  return chunks;
}

function cloudDocRefV162(uid, docId) {
  return firestore.collection('users').doc(uid).collection('data').doc(docId);
}

async function writeCloudV162(uid) {
  const { entries, modules } = buildCloudDataV162();
  const chunks = chunkEntriesV162(entries);
  const moduleBytes = lumenUtf8Bytes(modules);
  if (moduleBytes > 850000) {
    const err = new Error(`Los módulos auxiliares pesan ${Math.round(moduleBytes/1024)} KB y exceden el margen seguro.`);
    err.code = 'lumen/modules-too-large';
    throw err;
  }

  const oldManifestSnap = await cloudDocRefV162(uid, LUMEN_SYNC_MANIFEST_DOC).get();
  const oldChunkCount = oldManifestSnap.exists ? Number(oldManifestSnap.data().chunkCount || 0) : 0;
  const now = Date.now();
  const batchSize = 400;
  const operations = [];

  chunks.forEach((chunk, index) => {
    const id = LUMEN_SYNC_CHUNK_PREFIX + String(index).padStart(3,'0');
    operations.push({ type:'set', ref:cloudDocRefV162(uid,id), data:{ schema:LUMEN_SYNC_SCHEMA, index, entries:chunk, updatedAt:now } });
  });
  operations.push({ type:'set', ref:cloudDocRefV162(uid,LUMEN_SYNC_MODULES_DOC), data:{ schema:LUMEN_SYNC_SCHEMA, ...modules, updatedAt:now } });
  operations.push({ type:'set', ref:cloudDocRefV162(uid,LUMEN_SYNC_MANIFEST_DOC), data:{
    schema:LUMEN_SYNC_SCHEMA,
    appVersion:'v182',
    entryCount:entries.length,
    chunkCount:chunks.length,
    moduleBytes,
    updatedAt:now
  }});
  for (let i = chunks.length; i < oldChunkCount; i++) {
    const id = LUMEN_SYNC_CHUNK_PREFIX + String(i).padStart(3,'0');
    operations.push({ type:'delete', ref:cloudDocRefV162(uid,id) });
  }

  for (let i=0; i<operations.length; i+=batchSize) {
    const batch = firestore.batch();
    operations.slice(i,i+batchSize).forEach(op => op.type === 'delete' ? batch.delete(op.ref) : batch.set(op.ref, op.data));
    await batch.commit();
  }
  return { entryCount:entries.length, chunkCount:chunks.length, moduleBytes, updatedAt:now };
}

async function readCloudV162(uid) {
  const manifestSnap = await cloudDocRefV162(uid, LUMEN_SYNC_MANIFEST_DOC).get();
  if (!manifestSnap.exists || manifestSnap.data().schema !== LUMEN_SYNC_SCHEMA) return null;
  const manifest = manifestSnap.data();
  const count = Number(manifest.chunkCount || 0);
  const reads = [];
  for (let i=0; i<count; i++) {
    reads.push(cloudDocRefV162(uid, LUMEN_SYNC_CHUNK_PREFIX + String(i).padStart(3,'0')).get());
  }
  const [moduleSnap, ...chunkSnaps] = await Promise.all([
    cloudDocRefV162(uid, LUMEN_SYNC_MODULES_DOC).get(),
    ...reads
  ]);
  const entries = [];
  chunkSnaps.forEach(s => { if (s.exists && Array.isArray(s.data().entries)) entries.push(...s.data().entries); });
  const modules = moduleSnap.exists ? moduleSnap.data() : {};
  return { ...modules, entries, manifest };
}

async function readCloudCompatibleV162(uid) {
  const v2 = await readCloudV162(uid);
  if (v2) return v2;
  const legacy = await firestore.collection('users').doc(uid).collection('data').doc('library').get();
  return legacy.exists ? { ...legacy.data(), manifest:{ schema:'legacy', entryCount:(legacy.data().entries||[]).length, chunkCount:1 } } : null;
}

function applyRemoteModulesV162(remote) {
  if (remote.inventory) safeLocalSetItem(INVENTORY_KEY, JSON.stringify(mergeInventory(loadInventory(), remote.inventory)));
  if (remote.mapas) {
    const localMapas = loadMapas();
    const mergedMapas = {
      influencias: mergeArrayById(localMapas.influencias||[], remote.mapas.influencias||[]),
      rutas: mergeArrayById(localMapas.rutas||[], remote.mapas.rutas||[])
    };
    safeLocalSetItem(MAPAS_KEY, JSON.stringify(mergedMapas));
    mapas = mergedMapas;
  }
  if (Array.isArray(remote.normBlacklist)) { normBlacklist = remote.normBlacklist; saveNormBlacklist(normBlacklist, true); }
  if (remote.rutaCustom) safeLocalSetItem(RUTA_CUSTOM_KEY, JSON.stringify(remote.rutaCustom));
  if (remote.rutaProgramas) safeLocalSetItem(PROGRAMA_KEY, JSON.stringify(remote.rutaProgramas));
  if (remote.desafios) safeLocalSetItem(DESAFIO_KEY, JSON.stringify(remote.desafios));
  if (Array.isArray(remote.idiomasAprobados)) safeLocalSetItem(IDIOMAS_APROBADOS_KEY, JSON.stringify(remote.idiomasAprobados));
  if (Array.isArray(remote.historicalLines)) saveHistoricalLinesCatalog([...historicalLinesCatalog(),...remote.historicalLines]);
}


