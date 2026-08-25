# LUMEN v188 — Descubrir + normalización bibliográfica

Base: LUMEN v187 modular.

Cambios funcionales:
- Biblioteca incorpora **✦ Descubrir** con 5 próximas lecturas por Historia, Poesía, Cuentos y Novela, priorizadas dentro del inventario no leído.
- El motor de recomendaciones considera disponibilidad, historial de autor, conexiones de Influencias, Rutas e Historia y se invalida en eventos relevantes.
- Inventario: KPI visible **Pendientes** pasa a **No leídos** sin modificar el estado interno.
- Mapas → Normalizar incorpora **📚 Libros**, listado A–Z de fichas bibliográficas incompletas.
- Completitud obligatoria: editorial, año de esta edición, edición, ciudad, ISBN y publicación original.
- Cada libro incompleto reutiliza el importador existente `lumen_bibliografia_import_v1`; al aplicar vuelve a Normalizar → Libros y recalcula la lista.

No se cambia el schema de datos existente ni la sincronización.
