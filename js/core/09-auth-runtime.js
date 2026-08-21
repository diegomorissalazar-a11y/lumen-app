// ═══════════════════════════════════
//  AUTH — email / contraseña
// ═══════════════════════════════════
function authTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-form-login').style.display    = isLogin ? 'flex' : 'none';
  document.getElementById('auth-form-register').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tab-login').style.background    = isLogin ? 'var(--gold)' : 'transparent';
  document.getElementById('tab-login').style.color         = isLogin ? 'var(--ink)'  : 'var(--ink4)';
  document.getElementById('tab-register').style.background = isLogin ? 'transparent' : 'var(--gold)';
  document.getElementById('tab-register').style.color      = isLogin ? 'var(--ink4)' : 'var(--ink)';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').style.display = 'none';
}

function authErr(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  const suc = document.getElementById('auth-success');
  suc.style.display = 'none';
}
function authOk(msg) {
  const suc = document.getElementById('auth-success');
  suc.textContent = msg;
  suc.style.display = 'block';
  document.getElementById('auth-error').textContent = '';
}

async function loginEmail() {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-password').value;
  if (!email || !pass) { authErr('Ingresa tu correo y contraseña.'); return; }
  authErr('');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(e) {
    const msgs = {
      'auth/user-not-found':     'No existe una cuenta con ese correo.',
      'auth/wrong-password':     'Contraseña incorrecta.',
      'auth/invalid-email':      'Correo no válido.',
      'auth/too-many-requests':  'Demasiados intentos. Espera unos minutos.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    };
    authErr(msgs[e.code] || 'Error: ' + e.message);
  }
}

async function registerEmail() {
  const name  = document.getElementById('auth-reg-name').value.trim();
  const email = document.getElementById('auth-reg-email').value.trim();
  const pass  = document.getElementById('auth-reg-password').value;
  if (!email || !pass) { authErr('Ingresa correo y contraseña.'); return; }
  if (pass.length < 6) { authErr('La contraseña debe tener al menos 6 caracteres.'); return; }
  authErr('');
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    if (name) await cred.user.updateProfile({ displayName: name });
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/invalid-email':        'Correo no válido.',
      'auth/weak-password':        'Contraseña muy débil (mínimo 6 caracteres).',
    };
    authErr(msgs[e.code] || 'Error: ' + e.message);
  }
}

async function resetPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { authErr('Ingresa tu correo primero.'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    authOk('✓ Te enviamos un correo para restablecer tu contraseña.');
  } catch(e) {
    authErr('No se pudo enviar el correo. Verifica la dirección.');
  }
}

async function logOut() {
  closeModal('modal-logout-confirm');
  closeUserMenu();
  if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  await auth.signOut();
}

async function confirmLogOut() {
  closeUserMenu();
  const statusEl = document.getElementById('logout-sync-status');
  statusEl.textContent = `Tienes ${db.entries.length} registros locales.`;
  requestAnimationFrame(() => openModal('modal-logout-confirm'));
}

async function saveAndLogOut() {
  const statusEl = document.getElementById('logout-sync-status');
  const btn = document.getElementById('btn-save-and-logout');
  btn.textContent = '⏳ Guardando...';
  btn.disabled = true;
  statusEl.textContent = 'Subiendo datos a la nube...';
  try {
    await getValidToken();
    await firestore.collection('users').doc(currentUser.uid).collection('data').doc('library').set(
      cleanForFirestore({ entries: db.entries, inventory: loadInventory(), updatedAt: Date.now() })
    );
    statusEl.textContent = `✓ ${db.entries.length} registros guardados. Cerrando sesión...`;
    setTimeout(() => logOut(), 1200);
  } catch(e) {
    statusEl.textContent = `⚠ Error al guardar: ${e.message}. ¿Cerrar de todas formas?`;
    btn.textContent = '📤 Reintentar';
    btn.disabled = false;
  }
}

// Obtener token válido — resuelve el problema de Safari
async function getValidToken() {
  if (!auth.currentUser) throw new Error('No hay sesión activa');
  await auth.currentUser.getIdToken(true); // true = forzar refresh
}

// Repara portadas: sube imágenes locales que Firestore tiene como __local_image__
// Útil cuando subiste una imagen desde otro dispositivo y no se sincronizó
async function sincronizarPortadas() {
  closeUserMenu();
  if (!currentUser) { showToast('Inicia sesión primero'); return; }

  // Contar portadas locales que pueden subirse
  const conImagenLocal = db.entries.filter(e =>
    e.cover && isBase64Image(e.cover) && e.cover.length <= 666666
  );

  // Contar portadas pendientes (marcador de otro dispositivo)
  const pendientes = db.entries.filter(e => e.cover === '__local_image__');

  if (conImagenLocal.length === 0 && pendientes.length === 0) {
    showToast('No hay portadas pendientes de sincronizar', 3000);
    return;
  }

  setSyncStatus('syncing');
  showToast(`⏳ Sincronizando ${conImagenLocal.length} portada${conImagenLocal.length!==1?'s':''}...`, 3000);

  try {
    await getValidToken();
    // Subir todo — las imágenes locales pequeñas van en Firestore ahora
    await syncToFirestore();
    setSyncStatus('ok');
    const msg = conImagenLocal.length > 0
      ? `✓ ${conImagenLocal.length} portada${conImagenLocal.length!==1?'s':''} sincronizada${conImagenLocal.length!==1?'s':''}`
      : pendientes.length > 0
        ? `ℹ ${pendientes.length} portada${pendientes.length!==1?'s':''} pendiente${pendientes.length!==1?'s':''} — súbelas desde el dispositivo donde están`
        : '✓ Portadas sincronizadas';
    showToast(msg, 3500);
    renderHome();
  } catch(e) {
    setSyncStatus('offline');
    showToast('⚠ Error al sincronizar', 3000);
  }
}

async function manualSaveToCloudLegacyV1() {
  closeUserMenu();
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  setSyncStatus('syncing');
  showToast('⏳ Guardando en nube...', 2000);
  try {
    await getValidToken();
    await firestore.collection('users').doc(currentUser.uid).collection('data').doc('library').set(
      cleanForFirestore({ entries: db.entries, updatedAt: Date.now() })
    );
    setLastSync();
    setSyncStatus('ok');
    showToast(`✓ ${db.entries.length} registros guardados en la nube`, 3000);
  } catch(e) {
    setSyncStatus('offline');
    showToast(`⚠ Error: ${e.message}`, 4000);
    console.error('manualSave error:', e);
  }
}

async function manualLoadFromCloudLegacyV1() {
  closeUserMenu();
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  setSyncStatus('syncing');
  showToast('⏳ Leyendo nube...', 2000);
  try {
    await getValidToken();
    const snap = await firestore.collection('users').doc(currentUser.uid).collection('data').doc('library').get();
    if (!snap.exists) {
      setSyncStatus('ok');
      showToast('La nube no tiene datos aún. Usa 📤 Guardar primero.', 3500);
      return;
    }
    const remoteRaw = snap.data().entries || [];

    // Normalizar entradas remotas igual que mergeEntries
    const normalizeEntry = e => {
      if (e.type) {
        const t = e.type.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if (t.includes('libro')) e.type = 'libro';
        else if (t.includes('pelicula')||t.includes('movie')||t.includes('film')) e.type = 'pelicula';
        else if (t.includes('serie')||t.includes('series')||t.includes('tv')) e.type = 'serie';
      }
      if (e.id && e.id.includes("'")) e.id = e.id.replace(/'/g,'');
      if (e.type==='serie' && !e.estado) e.estado='vista';
      return e;
    };
    const remote = remoteRaw.map(normalizeEntry);

    // Analizar diferencias
    const localMap = {};
    db.entries.forEach(e => { localMap[e.id] = e; });

    const nuevas = [], actualizadas = [], sinCambios = [];
    remote.forEach(e => {
      const loc = localMap[e.id];
      if (!loc) {
        // Verificar si es un duplicado semántico (mismo título+tipo+temporada, distinto ID)
        const isDupTitle = db.entries.some(l =>
          l.type === e.type &&
          (l.titulo||'').trim().toLowerCase().replace(/['"]/g,'') ===
          (e.titulo||'').trim().toLowerCase().replace(/['"]/g,'') &&
          // Para series: también debe coincidir la temporada
          (e.type !== 'serie' || String(l.temporadas||'') === String(e.temporadas||'')) &&
          l.id !== e.id
        );
        if (!isDupTitle) nuevas.push(e);
        // si es duplicado semántico, se ignora (el merge lo resolverá)
      } else {
        const remoteTs = e._updatedAt || 0;
        const localTs  = loc._updatedAt || 0;
        if (remoteTs > localTs) {
          // Detectar qué campos cambiaron
          const changedFields = [];
          ['generos','notas_lista','readDates','progresoPag','progreso','estado',
           'cover','temporadas','capActual','capTotal','musica','guionista',
           'protagonista','duracion','idioma','notas','enInventario','historia'].forEach(f => {
            const rv = JSON.stringify(e[f]||null);
            const lv = JSON.stringify(loc[f]||null);
            if (rv !== lv) changedFields.push(f);
          });
          if (changedFields.length > 0) actualizadas.push({ remote: e, local: loc, fields: changedFields });
          else sinCambios.push(e);
        } else {
          sinCambios.push(e);
        }
      }
    });

    // Mostrar resumen con confirmación
    showSyncPreview({ nuevas, actualizadas, sinCambios, remote, onConfirm: async () => {
      // "Cargar desde nube" = el usuario quiere los datos del servidor.
      // Para libros en curso: el remoto manda en campos de progreso,
      // independiente de timestamps (evita que relojes desincronizados descarten datos)
      const PROGRESO_FIELDS = ['progreso','progresoPag','readingMode','readDates',
        'estado','capActual','capTotal','temporadaActual','cover'];

      const merged = mergeEntries(db.entries, remote);

      // Segunda pasada: para entries que vienen del remoto con cambios,
      // forzar los campos de progreso desde el remoto
      const remoteMap = {};
      remote.forEach(e => { remoteMap[e.id] = e; });

      merged.forEach(entry => {
        const rem = remoteMap[entry.id];
        if (!rem) return;
        // Solo forzar si el remoto tiene _updatedAt más reciente O
        // si el entry está en curso (leyendo/viendo) — siempre tomar el progreso remoto
        const esEnCurso = rem.estado === 'leyendo' || rem.estado === 'viendo';
        const remEsMasNuevo = (rem._updatedAt || 0) >= (entry._updatedAt || 0);
        if (esEnCurso || remEsMasNuevo) {
          PROGRESO_FIELDS.forEach(f => {
            const rv = rem[f];
            const hasVal = rv !== null && rv !== undefined && rv !== '';
            if (hasVal) {
              // readDates: merge, no reemplazar
              if (f === 'readDates' && Array.isArray(rv) && Array.isArray(entry[f])) {
                entry[f] = mergeReadDates(entry[f], rv);
              } else {
                entry[f] = rv;
              }
            }
          });
        }
      });

      // Restaurar imágenes locales que el remoto tiene como placeholder
      restoreLocalImages(merged);

      // Restaurar mapas y desafíos desde remoto
      if (remote.mapas) {
        const localMapas = loadMapas();
        const mergedMapas = {
          influencias: mergeArrayById(localMapas.influencias||[], remote.mapas.influencias||[]),
          rutas:       mergeArrayById(localMapas.rutas||[],       remote.mapas.rutas||[])
        };
        safeLocalSetItem(MAPAS_KEY, JSON.stringify(mergedMapas));
        mapas = mergedMapas;
      }
      if (remote.normBlacklist && Array.isArray(remote.normBlacklist)) {
        normBlacklist = remote.normBlacklist;
        saveNormBlacklist(normBlacklist, true);
      }
      if (remote.desafios) {
        const localDes = loadDesafios();
        const mergedDes = { ...localDes };
        Object.entries(remote.desafios).forEach(([yr, val]) => {
          if (!mergedDes[yr] || (val.createdAt||0) > (mergedDes[yr].createdAt||0)) {
            mergedDes[yr] = val;
          }
        });
        safeLocalSetItem(DESAFIO_KEY, JSON.stringify(mergedDes));
      }

      const now = Date.now();
      merged.forEach(e => { if (!e._updatedAt) e._updatedAt = now; });
      db.entries = merged;
      safeLocalSetItem(DB_KEY, JSON.stringify(lightweightLocalDB(db)), {prune:true});
      setLastSync();
      setSyncStatus('ok');
      await syncToFirestore();
      refreshCurrentScreen();
      showToast(`✓ Sincronización completa · ${merged.length} registros`, 3000);
    }});

  } catch(e) {
    setSyncStatus('offline');
    showToast(`⚠ Error: ${e.message}`, 4000);
    console.error('manualLoad error:', e);
  }
}

async function forcSync() {
  closeUserMenu();
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  setSyncStatus('syncing');
  try {
    await getValidToken();
    await pullAndMerge(currentUser.uid, true);
    refreshCurrentScreen();
  } catch(e) {
    setSyncStatus('offline');
    showToast(`⚠ Error de sincronización: ${e.message}`, 4000);
  }
}

function setSyncStatus(state) {
  const dot = document.getElementById('sync-dot');
  const mdot = document.getElementById('menu-sync-dot');
  const mtxt = document.getElementById('menu-sync-text');
  const colors = { ok: '#7ec98f', syncing: '#c8952a', offline: '#f08080', error: '#f08080' };
  const labels = { ok: 'Sincronizado', syncing: 'Sincronizando…', offline: 'Sin conexión', error: 'Error de auth' };
  const c = colors[state] || colors.ok;
  if (dot) dot.style.background = c;
  if (mdot) mdot.style.background = c;
  if (mtxt) mtxt.textContent = labels[state] || labels.ok;
}

function openMenuAction(modalId) {
  closeUserMenu();
  requestAnimationFrame(() => openModal(modalId));
}

function showUserMenu() {
  const menu = document.getElementById('user-menu');
  const isOpen = menu.classList.contains('open');
  // Cerrar todos los otros menús primero
  menu.classList.toggle('open', !isOpen);
}

function closeUserMenu() {
  document.getElementById('user-menu').classList.remove('open');
}

// Click outside — usando mousedown en document para capturar antes del click
document.addEventListener('mousedown', function(e) {
  const menu = document.getElementById('user-menu');
  const btn  = document.getElementById('user-initials') || document.getElementById('user-avatar');
  if (!menu) return;
  if (!menu.contains(e.target) && !e.target.closest('#user-initials') && !e.target.closest('#user-avatar')) {
    menu.classList.remove('open');
  }
});

function updateUserUI(user) {
  if (!user) return;
  document.getElementById('menu-name').textContent = user.displayName || 'Usuario';
  document.getElementById('menu-email').textContent = user.email || '';
  const avatar = document.getElementById('user-avatar');
  const initials = document.getElementById('user-initials');
  if (user.photoURL) {
    avatar.src = user.photoURL;
    avatar.style.display = 'block';
    initials.style.display = 'none';
  } else {
    const parts = (user.displayName || user.email || 'U').split(' ');
    initials.textContent = parts.map(p=>p[0]).join('').slice(0,2).toUpperCase();
    initials.style.display = 'flex';
    avatar.style.display = 'none';
  }
}

function refreshCurrentScreen() {
  if (currentScreen === 'home') renderHome();
  else if (currentScreen === 'library') renderLibrary();
  else if (currentScreen === 'year') renderYear();
  else if (currentScreen === 'stats') renderStats();
  else if (currentScreen === 'habitos') renderHabitos();
}

// ── Watch online/offline ──
window.addEventListener('online', () => {
  setSyncStatus('syncing');
  syncToFirestore().then(() => setSyncStatus('ok'));
});
window.addEventListener('offline', () => setSyncStatus('offline'));

// Fallback: si Firebase no responde en 5s, ocultar overlay y continuar offline
setTimeout(() => {
  const overlay = document.getElementById('auth-overlay');
  if (overlay && overlay.style.display !== 'none') {
    console.warn('Firebase timeout — modo offline');
    overlay.style.display = 'none';
    db = loadDB();
    renderHome();
  }
}, 5000);

// ═══════════════════════════════════
//  AUTH STATE OBSERVER — main entry point
// ═══════════════════════════════════
auth.onAuthStateChanged(async user => {
  const overlay = document.getElementById('auth-overlay');
  if (user) {
    currentUser = user;
    overlay.style.display = 'none';
    updateUserUI(user);
    loadLastSync();

    // Mostrar datos locales INMEDIATAMENTE — no esperar a Firestore
    renderHome();

    // Sincronizar con Firestore en background
    setSyncStatus('syncing');
    try {
      await pullAndMerge(user.uid, false);
      subscribeToFirestore(user.uid);
      // Re-renderizar si la pantalla activa es biblioteca o home
      refreshCurrentScreen();
      setSyncStatus('ok');
    } catch(e) {
      // Aunque falle el sync, mostrar datos locales con estado offline
      setSyncStatus('offline');
      console.warn('Auth sync error:', e.code || e.message, e);
      refreshCurrentScreen();
    }
  } else {
    currentUser = null;
    if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
    overlay.style.display = 'flex';
    authTab('login');
  }
});

// ── Al cerrar / salir: forzar sync si hay usuario activo ──
window.addEventListener('beforeunload', (e) => {
  if (currentUser) {
    // Intento silencioso de sync al salir
    syncToFirestore().catch(()=>{});
  }
});

// ── Visibilidad: al volver a la app (desde otra pestaña o al desbloquear móvil) ──
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && currentUser) {
    try {
      const snap = await firestore.collection('users').doc(currentUser.uid).collection('data').doc('library').get();
      if (snap.exists) {
        const remoteEntries = snap.data().entries || [];
        const remoteCount = remoteEntries.length;
        const localCount  = db.entries.length;
        // Si la nube tiene más datos que local → sincronizar automáticamente
        if (remoteCount > localCount) {
          setSyncStatus('syncing');
          await pullAndMerge(currentUser.uid, true);
          refreshCurrentScreen();
        }
      }
    } catch(e) { /* sin conexión */ }
  }
});

// ═══════════════════════════════════
//  EXPOSE FUNCTIONS TO HTML onclick
//  (needed because script type="module" is scoped)
// ═══════════════════════════════════
// ═══════════════════════════════════
