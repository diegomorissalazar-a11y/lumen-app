// ═══════════════════════════════════════════════════════════════
// LUMEN v190 — Política de portadas locales para elementos en curso
// Las portadas subidas desde el dispositivo viven en IndexedDB y
// solo se usan como recurso local en libros/manga/series en curso.
// Las URLs remotas continúan funcionando como antes.
// ═══════════════════════════════════════════════════════════════

function isLocalCoverEligible(entry) {
  if (!entry) return false;
  return (entry.type === 'libro' && entry.estado === 'leyendo') ||
         (entry.type === 'manga' && entry.estado === 'leyendo') ||
         (entry.type === 'serie' && entry.estado === 'viendo');
}

function localCoverAssetId(entry) {
  if (!entry || !entry.id) return '';
  return typeof localAssetKey === 'function' ? localAssetKey(entry.id, 'cover') : `${entry.id}:cover`;
}

function ensureLocalCoverReference(entry) {
  if (!entry || !isLocalCoverEligible(entry)) return entry;
  if (isBase64Image(entry.cover) || entry.cover === '__local_image__') {
    entry.coverAssetId = entry.coverAssetId || localCoverAssetId(entry);
  } else {
    // Vacío o URL remota: desacoplar cualquier asset local anterior.
    const previousAssetId = entry.coverAssetId;
    delete entry.coverAssetId;
    if (previousAssetId && typeof deleteLocalAsset === 'function') {
      deleteLocalAsset(previousAssetId).catch(err => console.warn('[LUMEN v190] limpieza portada reemplazada:', err));
    }
  }
  return entry;
}

function applyLocalCoverPolicy(entry) {
  if (!entry) return entry;
  if (isLocalCoverEligible(entry)) {
    ensureLocalCoverReference(entry);
    if (isBase64Image(entry.cover) && typeof putLocalAsset === 'function') {
      const assetId = localCoverAssetId(entry);
      entry.coverAssetId = assetId;
      putLocalAsset(assetId, entry.cover).catch(err => console.warn('[LUMEN v190] portada local IDB:', err));
    }
    return entry;
  }

  // Si el elemento dejó de estar en curso y su portada era exclusivamente
  // local, se elimina del modelo visible. Una cover URL remota se conserva.
  if (isBase64Image(entry.cover) || (entry.coverAssetId && entry.cover === '__local_image__')) {
    const assetId = entry.coverAssetId || localCoverAssetId(entry);
    entry.cover = '';
    delete entry.coverAssetId;
    if (typeof deleteLocalAsset === 'function') {
      deleteLocalAsset(assetId).catch(err => console.warn('[LUMEN v190] limpieza portada local:', err));
    }
  }
  return entry;
}

function prepareLocalCoverForCloud(entry) {
  if (!entry) return entry;
  const out = {...entry};
  // coverAssetId describe un recurso local de IndexedDB; nunca viaja a nube.
  delete out.coverAssetId;
  if (isLocalCoverEligible(entry) && (isBase64Image(entry.cover) || entry.cover === '__local_image__')) {
    out.cover = '';
  }
  return out;
}

function normalizeLocalCoverRefs(entries) {
  let changed = 0;
  (entries || []).forEach(entry => {
    if (!entry) return;
    if (isLocalCoverEligible(entry) && (isBase64Image(entry.cover) || entry.cover === '__local_image__') && !entry.coverAssetId) {
      entry.coverAssetId = localCoverAssetId(entry);
      changed++;
    }
  });
  return changed;
}
