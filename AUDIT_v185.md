# Auditoría de continuidad — LUMEN v185

## Base confirmada
- Base: **LUMEN v184 modular** extraída de `LUMEN_v184_fix_bibliografia_cronologia.zip`.
- SHA-256 de `index.html` base: `ce31bf3da867a23fa02edc445a658740850a1881438dd1d844500e9722e5b5cc`.
- Objetivo: cambios únicamente en UX/métricas de Mapas, preservando el resto de la arquitectura y funcionalidad.

## Comparación estática
| Métrica | v184 | v185 | Resultado |
|---|---:|---:|---|
| Archivos JS | 19 | 21 | OK |
| Archivos HTML | 24 | 24 | OK |
| Archivos CSS | 9 | 9 | OK |
| Declaraciones `function` | 587 | 598 | OK |
| Callables únicos detectados | 648 | 661 | OK |
| Declaraciones de variables | 2372 | 2406 | OK |
| Variables únicas detectadas | 1191 | 1214 | OK |
| IDs DOM estáticos únicos | 560 | 560 | OK |
| `onclick` totales | 264 | 268 | OK |
| Handlers `onclick` únicos | 103 | 104 | OK |

## Continuidad
- Funciones/callables eliminados respecto de v184: **0**.
- Variables por nombre eliminadas respecto de v184: **0**.
- IDs DOM eliminados: **0**.
- Handlers inline eliminados: **0**.
- IDs duplicados en v185: **0**.

## Funciones nuevas
- `GraphMetrics`
- `degrees`
- `endpointId`
- `enterMapWorkspace`
- `exitMapWorkspace`
- `mapWorkspacePanel`
- `mapWorkspaceSvgContainer`
- `movieNodeRadius`
- `rerenderExpandedMap`
- `sqrtRadius`
- `toggleMapWorkspace`
- `uniqueMoviesByNode`
- `uniqueNeighborCounts`

## Validaciones de código
- `node --check` ejecutado sobre todos los archivos JS: **OK**.
- `manifest.json` y `bootstrap.js` incluyen `js/maps/graph-metrics.js` y `js/maps/map-viewport.js`.
- No se modificaron los modelos persistentes de Biblioteca, Notas, Historia, Inventario, Bibliografía ni Sync.

## Criterio v185
- Influencias: tamaño por influencias originadas (`outDegree`) con escala raíz cuadrada.
- Rutas: libros de tamaño fijo; otros estímulos crecen por rutas originadas (`outDegree`).
- Películas: películas, país, productora y género de tamaño fijo; director, guionista, música/compositor, protagonista, elenco y fotografía crecen por películas únicas conectadas.
- Historia: sin centralidad por tamaño; conserva cobertura temporal.
- Influencias, Rutas, Películas e Historia incorporan modo **Ampliar**.
