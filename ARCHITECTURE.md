# LUMEN v200 — Arquitectura modular

Base estructural heredada de v198; v200 no altera la arquitectura.

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

## v187 — Ejemplar físico multiobra y centralidad estructural

- `Book` mantiene la ficha canónica del registro, mientras un ejemplar físico multiobra puede declarar `inventoryContainer=true` y `containedWorkIds[]`.
- El estado de lectura del contenedor en Inventario se deriva de las obras vinculadas; no se reutiliza `estado='leido'` para evitar duplicar libros terminados en estadísticas.
- Influencias separa **evidencia documental** de **conexión estructural**: N citas entre la misma pareja de autores conservan N evidencias, pero generan una sola arista para centralidad y tamaño.

## v189 — módulos agregados

- `js/bibliography-completeness.js`: contrato de completitud bibliográfica y listado de fichas incompletas en Normalizar. Reutiliza el importador bibliográfico existente; no duplica parsing ni normalización.
- `js/recommendations.js`: motor de **Descubrir**, limitado a libros disponibles en Inventario y organizado por Historia, Poesía, Cuentos y Novela. Mantiene caché derivada e invalidación por eventos de dominio.
- `views/modals/discover.html`: presentación de recomendaciones desde Biblioteca.
- `css/09-recommendations.css`: estilos de Descubrir y listado de bibliografía incompleta.

La recomendación es dato derivado: no altera fichas, inventario, mapas ni estadísticas. La fuente de verdad sigue siendo `db.entries`, Inventario, `mapas` e Historia.


## v190 — Assets locales
Se incorpora `js/data/assets.js` como capa de política de recursos locales. La persistencia física continúa en IndexedDB (`lumen_assets_v1/images`) y el modelo de dominio solo mantiene `coverAssetId` cuando una portada local corresponde a un contenido en curso. `coverAssetId` no se exporta a Firestore.

Política:
- libro + `estado=leyendo` → portada local permitida;
- manga + `estado=leyendo` → portada local permitida;
- serie + `estado=viendo` → portada local permitida;
- URL remota → se conserva normalmente;
- contenido terminado → la portada exclusivamente local se desacopla de la ficha.

## v191 — Capa literaria canónica

Se incorpora `js/literary-metadata.js` como capa compartida para metadatos que no deben duplicarse entre Inventario, Biblioteca y Descubrir.

- **Taxonomías canónicas**: tradición poética, corriente/período poético y ámbito histórico se persisten por ID y nombre normalizado en `lumen_literary_taxonomy_v1` y se sincronizan en el bloque auxiliar de nube.
- **Autor canónico**: nacimiento, muerte y `aunVivo` viven en `canonicalEntities.authors`; no se copian por libro.
- **Cuentos/antologías**: el período de las obras vive en `entry.cuentos`, separado de `anio_pub` y de la fecha bibliográfica de la edición. El fallback por ciclo vital solo se usa cuando el usuario lo marca y nunca para antologías multi-autor.
- **Historia**: `ambitoId/ambito` queda separado de `lineaPrincipalId/lineaPrincipal` y de `fechaInicio/fechaFin`.
- **Descubrir**: consume estas entidades y rangos sin convertir aproximaciones en datos bibliográficos reales.


## v192 — Taxonomías secundarias y propagación asistida

Las etiquetas secundarias literarias son entidades canónicas por ID, no cadenas libres. Poesía usa `tradicionId` y `corrienteId`; Historia usa `ambitoId`. La presentación mediante chips es solo una vista sobre la misma taxonomía persistente y sincronizable introducida en v191.

La propagación se realiza sobre **Autor canónico + Género principal**, nunca sobre el autor de forma global. Para Poesía, la tradición puede propagarse de forma masiva únicamente cuando el autor no presenta mezcla de géneros; ante mezcla de géneros se revisan individualmente los libros de poesía. Corriente/período siempre requiere revisión individual. Historia y períodos de recopilaciones no se infieren por autor.


## v193 — Historia como taxonomía multietiqueta

Historia adopta un modelo facetado/multietiqueta: cada libro puede pertenecer a varias líneas históricas canónicas a través de `historia.lineaIds[]`. El catálogo vive en `lumen_historical_lines_v1`; la relación entre dos líneas se deriva de libros que pertenecen a ambas, en lugar de mantener un segundo mecanismo manual de “líneas relacionadas”.

Compatibilidad de migración:
- `ambito/ambitoId` legacy se transforma en una línea histórica normalizada;
- `lineaPrincipal*` y `lineasRelacionadas*` se incorporan a `lineaIds[]`;
- por compatibilidad, el primer ID sigue espejado en `lineaPrincipalId` y los restantes en `lineasRelacionadasIds`, pero ya no son la fuente de verdad de la UX.

El mapa temporal materializa una vista por línea: un mismo libro puede aparecer en varias filas sin duplicarse como entidad. Descubrir evalúa intersección de líneas, apertura de líneas nuevas y función de puente.

## v195 — MetadataInferenceEngine
Se agrega `js/metadata-inference.js` como capa derivada entre entidades/taxonomías y la UX de Normalizar. No es una nueva fuente de verdad: calcula sugerencias desde datos canónicos existentes y registra procedencia solo cuando el usuario las aplica. La propagación masiva opera por Autor canónico + Género y nunca sobrescribe valores existentes.
