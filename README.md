# LUMEN v192 — taxonomías literarias por flags y propagación asistida

## Base
Construida directamente sobre **LUMEN v191 modular**.

## Cambios aplicados
- **Poesía**: tradición/ámbito poético y período/corriente dejan de ser campos de texto libre y pasan a chips canónicos reutilizables. Se mantienen IDs persistentes y opción **+ Otra** para crear una categoría nueva sin duplicar variantes de escritura.
- La taxonomía inicial de tradición poética se presenta como: **Chilena, Hispanoamericana, Española, Francesa y Anglófona**. Los IDs existentes de v191 se conservan, por lo que no se duplican taxonomías previas.
- **Historia**: el ámbito histórico pasa al mismo selector por chips canónicos (Eurasia, Europa, Chile, América, + Otra), tanto en Editar como en el modal rápido de Historia. Línea histórica y fechas siguen siendo datos separados.
- **Biblioteca/Inventario**: las tarjetas muestran etiquetas secundarias reutilizables junto al género principal: por ejemplo `Poesía` + `Chilena` + `Vanguardias`, `Historia` + `Eurasia`, o `Cuento` + `Recopilación`.
- **Propagación asistida por Autor canónico + Poesía**:
  - al guardar una tradición poética, LUMEN detecta otros libros de poesía del mismo autor;
  - si el autor solo aparece como poeta, ofrece aplicar la tradición a todos los libros de poesía compatibles;
  - si el autor tiene libros en más de un género, pide confirmar libro por libro;
  - período/corriente siempre se revisa libro por libro antes de propagarse;
  - nunca se propagan ámbitos de Historia ni períodos de recopilaciones por autor.
- Los cambios propagados invalidan/recalculan Descubrir mediante el mecanismo ya existente.

## Archivos modificados
- `index.html`
- `manifest.json`
- `js/bootstrap.js`
- `js/literary-metadata.js`
- `js/core/03-navigation-entry-search.js`
- `js/features/05-library-notes.js`
- `views/modals/add-entry.html`
- `views/modals/genres.html`
- `views/modals/manga-detail-history.html`
- `css/10-literary-metadata.css`

## No se modificó funcionalmente
- Login/Auth
- Firebase y modelo de sincronización
- Registro diario de lectura
- Exportador
- Películas/Series/Manga
- Referencias/Notas/Bibliografía
- Centralidad de mapas v191
- Motor de scoring de Descubrir v191

## Validación
- Base verificada: **v191**.
- Todos los archivos JS pasan `node --check`.
- Rutas declaradas en `manifest.json` verificadas en disco.
- IDs DOM duplicados: 0.
- Continuidad estática v191 → v192: **690 → 700 declaraciones function**, **731 → 741 callables**, **1352 → 1361 variables**, **615 → 621 IDs DOM**, **109 → 109 handlers**, con **0 eliminados** en esas categorías.

## Pruebas sugeridas
1. Editar un libro de Poesía y seleccionar `Chilena`; comprobar que queda visible como segundo flag en Biblioteca/Inventario.
2. Crear una nueva tradición con `+ Otra`; reabrir otro libro y confirmar que queda disponible como opción canónica.
3. Guardar `Poesía + Chilena` en un autor con varios libros de poesía y comprobar la propuesta de propagación.
4. Probar un autor con libros de Poesía y Novela: LUMEN debe pedir revisión uno a uno para los otros libros de poesía.
5. Asignar un período/corriente y comprobar que la propagación siempre solicita confirmación por libro.
6. Editar Historia y comprobar que el ámbito se selecciona como chip canónico y se conserva separado de línea/fechas.
