# LUMEN v198 — Filtro taxonómico de Biblioteca + proyección anual

Base: **v197 modular**.

## Cambios
- Biblioteca → Libros incorpora botón **⚑ Filtrar** junto al buscador.
- Biblioteca → Inventario reutiliza exactamente el mismo filtro facetado.
- Los filtros consultan datos canónicos existentes: género, tradición literaria, período/corriente, líneas históricas, idioma original y tipo de recopilación.
- Semántica: OR dentro de una misma faceta y AND entre facetas.
- Los filtros activos se muestran como chips y pueden retirarse individualmente o limpiarse todos.
- No se crea una taxonomía nueva ni se duplican etiquetas: se reutiliza `TaxonomyRegistry`, `historyLineIdsForEntry()` y la metadata literaria existente.
- Inicio → tarjeta de ritmo muestra explícitamente **Proy. cierre: N págs**, calculada con el ritmo promedio actual × días del año.
- Se corrigió el rótulo de arranque para identificar correctamente **v198**.

## Rendimiento y alcance
- El filtro se aplica solo sobre libros ya cargados en memoria y no genera lecturas adicionales de red.
- Inventario filtra después de resolver su universo unificado y antes de ordenar/renderizar.
- No se modifican reglas de sincronización, inferencia, Descubrir, Historia, Influencias ni persistencia.

## Auditoría estática v197 → v198
- Funciones declaradas: **755 → 771**.
- Variables declaradas: **1415 → 1420**.
- IDs DOM: **631 → 635**, todos únicos.
- Funciones eliminadas: **0**.
- Variables eliminadas: **0**.
- IDs eliminados: **0**.
- Todos los archivos JS pasan `node --check`.
- Referencias locales de `index.html` y `bootstrap.js`: **0 faltantes**.
