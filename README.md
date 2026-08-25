# LUMEN v190 — Portadas locales para contenidos en curso

## Base
Construida directamente sobre LUMEN v189 modular.

## Cambio aplicado
- Las portadas subidas desde el dispositivo para **libros leyendo**, **manga leyendo** y **series viendo** se guardan como recurso local en IndexedDB.
- La ficha conserva una referencia local `coverAssetId`; la imagen binaria/base64 no se sincroniza a Firebase.
- Las URLs remotas de portada siguen funcionando y sí permanecen en la ficha.
- Al terminar un libro, manga o serie, una portada exclusivamente local deja de formar parte de la ficha; las URLs remotas se conservan.
- Se mantiene compatibilidad con el mecanismo histórico `__local_image__` para datos existentes.

## Archivos principales modificados
- `index.html`
- `js/bootstrap.js`
- `js/data/assets.js` (nuevo)
- `js/core/18-local-persistence-actions.js`
- `js/core/02-canonical-history-sync.js`
- `js/features/08-reading-progress.js`
- `js/features/15-manga.js`
- `js/features/05-library-notes.js`

## Módulos no modificados funcionalmente
- Inventario
- Descubrir / recomendaciones
- Mapas / Influencias / Rutas / Historia
- Hábitos y estadísticas
- Bibliografía / Notas / Referencias
- Login/Auth

## Prueba recomendada
1. Iniciar un libro y subir una portada desde el dispositivo.
2. Confirmar que aparece en Inicio y después de recargar el mismo dispositivo.
3. Repetir con manga y serie en curso.
4. Comprobar que la lectura/progreso sincroniza en otro dispositivo aunque la portada local no viaje.
5. Terminar un elemento con portada local y confirmar que el resto de la ficha/progreso permanece intacto.

## Validación
Ver `AUDIT_v190.md` y `AUDIT_v190.json`.
