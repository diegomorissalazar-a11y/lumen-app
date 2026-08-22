# Auditoría de continuidad — LUMEN v184

## Base confirmada

- Base funcional: LUMEN v183 modular.
- Arquitectura modular preservada.
- No se utilizó v182 monolítica ni otra versión antigua como fuente de desarrollo.

## Continuidad estática

- Declaraciones `function` v183: 585.
- Declaraciones `function` v184: 587.
- Funciones eliminadas: 0.
- Funciones nuevas: `getBookOriginalPublicationYear`, `getBookStatsSortValue`.
- Callables únicos detectados v183: 646.
- Callables únicos detectados v184: 648.
- IDs DOM estáticos v183: 552.
- IDs DOM estáticos v184: 556.
- IDs eliminados: 0.
- IDs nuevos: `f-isbn`, `f-anio-original`, `f-titulo-original`, `f-periodo-original`.
- Handlers `onclick` únicos v183: 104.
- Handlers `onclick` únicos v184: 104.
- Handlers eliminados: 0.

## Corrección funcional

La edición consultada y la cronología original dejan de compartir una misma interpretación visual:

- `anio_pub` = año de esta edición.
- `anio_publicacion_original` = año original usado para cronología.
- El gráfico de libros en el tiempo usa publicación original.
- Los registros antiguos sin fecha original usan `anio_pub` como fallback.

## Validaciones

- Todos los JS pasan `node --check`.
- 0 IDs estáticos duplicados detectados entre parciales.
- Todos los recursos de `manifest.json` existen.
- JSON bibliográfico `lumen_bibliografia_import_v1` probado con Nadja:
  - edición consultada = 2000;
  - publicación original = 1928;
  - ISBN = 956-289-027-9;
  - período original inicia en 1928.
