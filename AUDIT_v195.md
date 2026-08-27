# AUDIT v195

Base confirmada: **v194 modular**.

- Funciones declaradas: 725 → 746; eliminadas: 0; agregadas: 21.
- Callables detectables: 802 → 824; eliminados: 0.
- Variables por nombre: 1384 → 1401; eliminadas: 0.
- IDs DOM: 629 → 631; eliminados: 0; duplicados estáticos: 0.
- Handlers onclick únicos: 107 → 108; eliminados: 0.
- Rutas faltantes de manifest/bootstrap: 0.
- SHA-256 manifest base v194: `b6731d05679a5f45cfa98e3660afaedcd858175db2fec9b4a8b6bbd90b879c41`.

## Alcance v195
- MetadataInferenceEngine derivado, sin nueva fuente de verdad.
- Normalizar → Libros como bandeja de completitud + sugerencias + propagación.
- Propagación Autor canónico + Género únicamente sobre campos vacíos.
- Inferencias con procedencia y confianza.
- JSON bibliográfico sigue siendo el único importador bibliográfico.

La validación sintáctica de todos los archivos JS se ejecutó con `node --check`.
