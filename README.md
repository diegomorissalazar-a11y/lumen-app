# LUMEN v191 — metadatos literarios y Descubrir temporal

## Base
Construida directamente sobre **LUMEN v190 modular**.

## Cambios aplicados
- **Poesía**: al marcar la etiqueta aparecen campos canónicos de tradición/ámbito poético y período/corriente. Se añaden nacimiento, muerte y flag `aún vivo` al autor canónico.
- **Historia**: se agrega **Ámbito histórico** canónico (Eurasia, Europa, Chile, América u otro reutilizable), separado de la línea histórica y de las fechas tratadas.
- **Cuentos**: nuevo flag **Es recopilación / antología**. Permite indicar tipo, fecha del primer cuento/obra y fecha del último. Si no hay fechas, puede marcarse `No contamos con fechas` y, para recopilaciones de un solo autor, usar opcionalmente nacimiento/muerte como aproximación. En antologías multi-autor este fallback se deshabilita.
- Los mismos campos están disponibles en **Etiquetar libro** desde Biblioteca/Inventario; si se añade Historia por primera vez se abre el modal simplificado de Historia.
- **Descubrir**: mantiene el pool como libros vinculados al Inventario, no leídos, no leyendo y no abandonados. Usa afinidad temporal por publicación original para Novela y Cuentos; para recopilaciones usa el período real de las obras o el fallback explícito del autor. Poesía suma afinidad por tradición, corriente y proximidad temporal. Historia incorpora ámbito + línea + cercanía temporal.
- Se renueva la caché de recomendaciones (`lumen_recommendations_v3`) para forzar el algoritmo v191.
- **Influencias**: el tamaño visual usa conexiones únicas y `max(outUnique, inUnique, 1)`, evitando que un autor receptor quede por debajo del mínimo visual y sin inflarse por citas repetidas.
- La taxonomía literaria canónica se sincroniza junto con los módulos auxiliares de nube.

## Archivos principales modificados
- `index.html`
- `js/bootstrap.js`
- `views/modals/add-entry.html`
- `views/modals/genres.html`
- `views/modals/manga-detail-history.html`
- `js/core/03-navigation-entry-search.js`
- `js/features/05-library-notes.js`
- `js/features/12-routes-graphs.js`
- `js/core/17-sync-v2.js`
- `js/recommendations.js`
- `manifest.json`

## Archivos nuevos
- `js/literary-metadata.js`
- `css/10-literary-metadata.css`

## No se modificó funcionalmente
- Login/Auth
- Lectura diaria y exportador
- Películas/Series/Manga salvo consumo de módulos comunes ya existentes
- Bibliografía/Notas/Referencias
- Persistencia de portadas locales v190

## Validación
- Base verificada: ZIP v190.
- Sintaxis de todos los JS: OK (`node --check`).
- Rutas del bootstrap: 60/60 accesibles por HTTP local.
- IDs DOM duplicados: 0.
- Funciones, callables, variables, IDs y handlers de v190 conservados; ver `AUDIT_v191.md` y `AUDIT_v191.json`.

## Pruebas sugeridas
1. En Inventario, abrir Etiquetar sobre un libro de Poesía y comprobar que aparecen tradición/corriente y datos temporales del autor.
2. Marcar Historia en un libro sin Historia previa; guardar etiquetas y confirmar apertura del modal histórico con Ámbito + Línea + Fechas.
3. En Cuento, marcar recopilación, ingresar 1885–1886 y guardar; reabrir y comprobar persistencia.
4. Marcar fechas desconocidas en una recopilación de autor y activar fallback por nacimiento/muerte; probar también `Aún vivo`.
5. Abrir Descubrir y comprobar que recalcula con la nueva caché y muestra razones temporales cuando existen datos.
6. Revisar Influencias con autores que reciben una y dos conexiones únicas y confirmar la escala visual.
