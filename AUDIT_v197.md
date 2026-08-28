# LUMEN v197 — Auditoría de rendimiento Normalizar → Libros

Base: **v196 modular**.

## Problema corregido
- `Normalizar → Libros` recalculaba pares del mismo autor recorriendo `db.entries` para cada ficha, generando un patrón cercano a O(n²).
- Cada botón `Aplicar` ejecutaba de inmediato persistencia local, recálculo de Descubrir y reconstrucción completa de la bandeja, por lo que varios clics seguidos podían bloquear la interfaz.
- La lista completa se construía y se insertaba en un único `innerHTML`, bloqueando el hilo principal mientras se analizaban cientos de fichas.

## Corrección
- Índices en memoria por `autor canónico` y `autor + género`; se construyen una vez por ciclo de análisis.
- Una sola pasada (`metadataAnalyzeAll`) produce filas incompletas/sugerencias y grupos de propagación.
- Persistencia, recálculo de Descubrir y rerender se agrupan con debounce corto cuando se aplican varias sugerencias seguidas.
- La pestaña pinta inmediatamente `Analizando biblioteca…` y cede un frame antes del trabajo pesado.
- Render progresivo en lotes de 36 filas usando `requestIdleCallback` cuando está disponible, con fallback a `setTimeout(0)`.
- Protección por generación de render para cancelar lotes viejos si el usuario vuelve a cambiar datos o pestañas.

## Alcance
No cambia reglas de inferencia, taxonomías, datos persistidos ni criterios de completitud. Solo optimiza cálculo, persistencia agrupada y renderizado.

## Validación
- Todos los archivos JS: `node --check` OK.
- Sin IDs DOM eliminados ni duplicados nuevos.
- La base utilizada es v196.
