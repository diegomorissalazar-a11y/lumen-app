# LUMEN v187 — Inventario multiobra, orden y centralidad única

Construida directamente sobre **LUMEN v186 modular**.

## Cambios funcionales

- Inventario ordenado por **Título A–Z** por defecto.
- Selector **Autor A–Z** disponible en el Inventario.
- Soporte de **ejemplares físicos multiobra** mediante `containedWorkIds`.
- Un ejemplar multiobra puede quedar completo en Inventario cuando todas sus obras vinculadas están leídas, sin sumar un libro leído adicional en las estadísticas generales.
- Los títulos compuestos con `/` buscan y sugieren obras ya existentes del mismo autor.
- Modal **Obras contenidas** para revisar, vincular o corregir manualmente las obras de un ejemplar.
- El importador JSON del Inventario detecta y vincula automáticamente obras contenidas cuando encuentra coincidencias >=90%.
- En Influencias, múltiples citas entre la misma pareja `autor fuente → autor destino` cuentan **una sola conexión estructural** para centralidad, tamaño y fuerzas del grafo.
- Todas las citas/evidencias continúan visibles y editables en la lista de Influencias.

## Arquitectura

Se mantiene la arquitectura modular v186. Los cambios están limitados a:

- `js/features/16-inventory.js`
- `js/inventory-json-import.js`
- `js/features/12-routes-graphs.js`
- `views/modals/import-restore-inventory.html`
- `css/07-inventory.css`

No se modifican Login/Auth, persistencia, sincronización V2, exportadores, hábitos, estadísticas generales ni modelo bibliográfico canónico.

Consulta `AUDIT_v187.md` y `AUDIT_v187.json` para la validación de continuidad v186 → v187.
