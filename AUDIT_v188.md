# AUDIT v188 — continuidad v187 → v188

Base confirmada: **LUMEN v187 modular**.

- SHA-256 `index.html` base: `3f6017ff2d69dfda3eab656f3250a119b5fc1a02d753f565db8f8db062abb003`
- Declaraciones `function`: 621 → 641
- Callables detectables: 657 → 680
- Variables declaradas únicas: 1265 → 1289
- IDs DOM únicos: 568 → 574
- Handlers `onclick` únicos: 105 → 107
- Archivos JS: 22 → 24

## Continuidad

- Funciones eliminadas: 0
- Callables eliminados: 0
- Variables por nombre eliminadas: 0
- IDs eliminados: 0
- Handlers eliminados: 0
- IDs duplicados: 0
- Handlers estáticos no resueltos: 0

## v188

- AJ-188A: Inventario muestra **No leídos** en vez de Pendientes.
- AJ-188B: Normalizar incorpora **Libros** con completitud obligatoria: editorial, año de edición, edición, ciudad, ISBN y publicación original.
- Biblioteca incorpora **Descubrir**, cinco candidatos por Historia, Poesía, Cuentos y Novela desde el inventario no leído.
- Recomendaciones se invalidan por eventos relevantes y se recalculan al abrir Descubrir o al pulsar Recalcular.
- Poesía exige idioma original español/castellano cuando el dato está disponible en la ficha.

Todos los JS fueron validados con `node --check`.
