# Arquitectura LUMEN v185

LUMEN mantiene la arquitectura modular introducida en v183: HTML, CSS y JavaScript viven en archivos separados y `js/bootstrap.js` ensambla las vistas antes de ejecutar la lógica funcional.

## Regla de evolución

Cada mejora se realiza únicamente en el módulo responsable. Una corrección bibliográfica no reemplaza ni reescribe módulos de sincronización, autenticación, hábitos o medios.

## Separación temporal del libro

Desde v184 se explicita en UX y estadísticas la distinción ya existente en el modelo:

- **Edición consultada**: `anio_pub` y `bibliografia.edicionConsultada`.
- **Obra original**: `anio_publicacion_original`, `periodo_publicacion_inicio`, `periodo_publicacion_fin` y `bibliografia.obraOriginal`.

Las referencias ISO consumen la edición consultada. Los análisis cronológicos de libros consumen la publicación original, con fallback a `anio_pub` solo para registros todavía no enriquecidos.

## Próximas etapas

- v185: robustez de esquema, migraciones explícitas y diagnóstico interno.
- v186: índices en memoria, dirty modules y optimización de renders/sync.
- v187: mejoras UX adicionales, incluyendo JSON bibliográfico desde Lectura en curso.


## v185 — infraestructura común de mapas

Los mapas mantienen sus datos en los módulos existentes, pero comparten dos servicios sin estado persistente:

- `js/maps/graph-metrics.js`: grado dirigido, vecinos únicos, películas únicas conectadas y escala visual raíz cuadrada.
- `js/maps/map-viewport.js`: modo Ampliar/Salir de ampliar para Influencias, Rutas, Películas e Historia.

Semántica visual:
- Influencias: nodo grande = más influencias originadas.
- Rutas: estímulo grande = más rutas originadas; libros con tamaño fijo.
- Películas: roles creativos/personales grandes = más películas únicas conectadas; películas y categorías contextuales con tamaño fijo.
- Historia: no usa centralidad por tamaño; conserva cobertura temporal como dimensión principal.

## v186 — Inventario como puerta de entrada a la ficha canónica

Inventario no introduce una segunda entidad de libro. Tanto CSV como JSON terminan en el mismo registro `Book` utilizado por Biblioteca, lectura, notas, Influencias, Historia y estadísticas.

Flujos:

```text
CSV básico → normalizar autor/editorial → vincular o crear Book → enInventario=true
JSON bibliográfico → validar → resolver entidades canónicas → buscar Book → enriquecer/crear → enInventario=true
```

El nuevo módulo `js/inventory-json-import.js` reutiliza el parser de `lumen_bibliografia_import_v1` y el catálogo canónico. No replica normalizadores ni crea un schema específico para Inventario.
