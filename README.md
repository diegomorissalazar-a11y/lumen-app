# LUMEN v200

Base: **v198 modular**.
Fecha: 2026-08-30.

## Cambios aplicados
- Los libros admiten **Fecha de finalización** exacta en la ficha de edición.
- Cuando existe `finishDate`, LUMEN deriva y guarda automáticamente **Mes lectura** y **Año lectura**, y normaliza el libro como leído.
- La fecha exacta queda visible en la ficha de detalle como **Finalizado**.
- Al agregar/enriquecer un libro nuevo mediante JSON bibliográfico, si falta el idioma original LUMEN pregunta si es **Español**.
- Al agregar un libro mediante JSON y faltar la fecha de adquisición, LUMEN pregunta si la adquisición fue **hoy** y usa la fecha local de Santiago.
- El flujo aplica tanto al cargador bibliográfico del editor como a **Inventario → + Libro con JSON** sin sobrescribir datos ya existentes.

## Archivos modificados
- `views/modals/add-entry.html`
- `js/core/03-navigation-entry-search.js`
- `js/features/05-library-notes.js`
- `js/features/11-maps-influences.js`
- `js/inventory-json-import.js`
- `index.html`
- `manifest.json`
- `js/bootstrap.js`

## No tocado
- Login/Auth.
- Firebase/sincronización.
- Mapas e Influencias.
- Descubrir/scoring.
- Normalizar/rendimiento.
- Estadísticas y Control de Plan.
- Notas.

## Validación
- Todos los archivos JS pasan `node --check`.
- 0 funciones declaradas eliminadas respecto de v198.
- 0 variables declaradas eliminadas respecto de v198.
- 0 IDs DOM eliminados y 0 IDs duplicados.
- 0 referencias locales faltantes desde `index.html`/`bootstrap.js`.

## Prueba rápida
1. Editar un libro leído y cargar una fecha exacta de finalización; comprobar que Mes/Año se actualizan y que la ficha muestra `Finalizado`.
2. Crear un libro nuevo, cargar JSON bibliográfico sin idioma, confirmar `Español`, confirmar adquisición de hoy y guardar.
3. Probar `Inventario → + Libro con JSON` con una ficha sin fecha de adquisición.

## v200 — Confirmaciones secuenciales al agregar libros con JSON
- Modal propio de LUMEN en vez de `confirm()` del navegador.
- Si falta idioma original: confirma Español Sí/No.
- Si falta fecha de adquisición: confirma si es hoy.
- Si es hoy: exige clasificar la adquisición como Compra o Regalo.
- Los valores ya presentes en JSON/ficha nunca son sobreescritos por estas preguntas.
