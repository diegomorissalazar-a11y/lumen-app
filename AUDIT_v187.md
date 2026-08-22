# Auditoría LUMEN v187 — Inventario multiobra, orden y centralidad única

## Base de código
La v187 fue construida directamente sobre **LUMEN v186 modular**. No se utilizó una versión anterior como base.

- SHA-256 `index.html` v186: `b2769022440f1fe209d8e2989eb8c4e1de7070b9573756490cb0a5c996e10aba`
- SHA-256 `index.html` v187: `3f6017ff2d69dfda3eab656f3250a119b5fc1a02d753f565db8f8db062abb003`

## Continuidad automática
- Archivos: **67 → 68**
- Declaraciones `function`: **609 → 621**
- Callables únicos: **668 → 681**
- Variables únicas detectadas: **1239 → 1265**
- IDs DOM: **564 → 568**
- `onclick` totales: **381 → 385**
- Handlers `onclick` únicos: **149 → 151**

### Eliminaciones detectadas
- Funciones: **0**
- Callables: **0**
- Variables: **0**
- IDs DOM: **0**
- Handlers onclick: **0**

## Cambios v187
- Inventario ordenado por título A–Z por defecto y opción Autor A–Z.
- Modelo de ejemplar físico multiobra con `inventoryContainer` + `containedWorkIds[]`.
- Detección y sugerencia de obras contenidas al importar JSON con títulos separados por `/`.
- Modal para vincular/corregir obras contenidas sin duplicar libros leídos.
- Ratio de lectura del Inventario deriva el estado de ejemplares multiobra desde sus obras vinculadas.
- Influencias deduplica `autor fuente → autor destino` para centralidad, tamaño y fuerzas del grafo, conservando todas las evidencias documentales.

## Validaciones
- Errores de sintaxis JS (`node --check`): **0**
- Rutas faltantes en `manifest.json`: **0**
- Rutas faltantes en `bootstrap.js`: **0**
- Handlers `onclick` sin callable detectado: **0**
