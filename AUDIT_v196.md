# LUMEN v196 — Auditoría de continuidad

Base: v195 modular.

## Cambio funcional
- Influencias: el tamaño de autor se calcula solo con autores únicos influidos (aristas salientes únicas).
- Evidencias/citas repetidas entre el mismo par de autores no aumentan el tamaño.
- Influencias recibidas no aumentan el tamaño; siguen participando en fuerzas/posición topológica.
- Nivel visual 1 queda anclado exactamente al radio mínimo.
- Nivel 2 o superior crece con escala de raíz cuadrada desde baseline 1.
- La escala global previa se conserva para Rutas y Películas; se añadió una variante específica para semánticas con baseline 1.

## Validación
- `js/maps/graph-metrics.js`: node --check OK.
- `js/features/12-routes-graphs.js`: node --check OK.
- No se modificó el modelo persistido de influencias ni sus evidencias.
