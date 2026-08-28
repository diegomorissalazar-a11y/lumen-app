# LUMEN v197 — rendimiento de Normalizar → Libros

Base: **LUMEN v196 modular**.

## Cambio principal
Optimización de la bandeja `Mapas → Normalizar → Libros` para bibliotecas grandes y para aplicar varias sugerencias consecutivas sin congelar la app.

## Implementación
- Índices reutilizables por autor y autor+género.
- Análisis de metadatos en una sola pasada.
- Render progresivo de filas.
- Guardado, recálculo de Descubrir y reconstrucción visual agrupados durante ráfagas de clics.
- Feedback inmediato mientras analiza.

No se modifican los criterios de inferencia ni el modelo de datos.
