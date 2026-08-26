# AUDIT v191 — continuidad sobre v190

- Base: **v190 modular**
- SHA-256 ZIP base: `448ff14ed8b2374f6c553b0cc71e0e3eeb6bffa5b5323a6ba25c2db0c705cc8f`
- Sintaxis JS: **OK**
- Bootstrap/HTTP: **OK (60/60)**
- Rutas faltantes: **0**
- IDs estáticos duplicados: **0**

## Continuidad

| Métrica | v190 | v191 | Eliminados |
|---|---:|---:|---:|
| Funciones | 658 | 690 | 0 |
| Callables | 729 | 763 | 0 |
| Variables | 1302 | 1352 | 0 |
| IDs DOM | 574 | 615 | 0 |
| Handlers | 153 | 157 | 0 |

No se eliminó ninguna función, callable, variable, ID DOM ni handler detectado en v190.

## Módulos nuevos
- `js/literary-metadata.js`
- `css/10-literary-metadata.css`

## Alcance revisado
- Poesía: taxonomía canónica + ciclo vital de autor.
- Historia: ámbito canónico separado de línea/fechas.
- Cuentos: recopilación/antología + período de obras + fallback explícito.
- Descubrir: afinidad temporal y específica por categoría.
- Influencias: tamaño por grado estructural único entrante/saliente.
- Sync: taxonomía literaria incluida y fusionada en módulos auxiliares.
