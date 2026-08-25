# Auditoría LUMEN v189

**Base usada:** LUMEN v188 modular.

- SHA-256 árbol base v188: `967060150675dfb68015a5e1311022f27235b879a92c2308939efe99a562178d`
- SHA-256 árbol v189: `ac35d03e05f963bf1d1747013f33cbd34d472abb37a34c087091a3883e70869e`

## Continuidad estática

- Funciones declaradas: **641 → 651** · eliminados: **0** · agregados: **10**
- Callables detectables: **707 → 718** · eliminados: **0** · agregados: **11**
- Variables detectadas: **1289 → 1299** · eliminados: **0** · agregados: **10**
- IDs DOM estáticos: **574 → 574** · eliminados: **0** · agregados: **0**
- Handlers onclick: **109 → 109** · eliminados: **0** · agregados: **0**

## Validaciones

- Rutas faltantes del manifest: **0**
- IDs estáticos duplicados: **0**
- Todos los archivos JS se validan con `node --check`.

## Cambios v189

- Pool de Descubrir unificado con Inventario y estado de lectura normalizado.
- `finishDate` deriva año/mes; año+mes implican `leido`.
- Autor canónico por ID/alias para afinidad y conexiones.
- Cuento se trata como clasificación exacta, sin subcategorías.
- Recalculo inmediato ante eventos relevantes, género/categoría, inventario y normalización de autor.
- Acción `Empezar a leer` desde una recomendación y retorno inmediato a Inicio.
- Jerarquía visual mejorada del botón Descubrir.
