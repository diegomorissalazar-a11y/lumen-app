# LUMEN v170 — Modelo canónico de libros, citas e Historia

**Fecha:** 15 de agosto de 2026

## Cambios aplicados

- Se consolidó la ficha de **Libro** como fuente canónica para los módulos de LUMEN.
- Cada libro incorpora referencias canónicas estables para:
  - autor (`autorId` / `autorIds`);
  - editorial (`editorialId`);
  - esquema de libro (`_canonicalModel`).
- Los IDs canónicos son determinísticos: una misma forma normalizada de autor o editorial produce el mismo identificador en Biblioteca, Inventario, Mapas y sincronización.
- Se agregaron a la ficha de libro los datos bibliográficos **Edición** y **Ciudad / lugar de publicación**.
- Los mismos datos están disponibles al iniciar una **Lectura en curso**, para que el libro creado desde Seguimiento mantenga la misma ficha bibliográfica.
- Las relaciones de **Influencias** ahora almacenan referencias estables cuando pueden resolverse contra Biblioteca:
  - `fuente_autor_id`;
  - `fuente_libro_id`;
  - `destino_autor_id`;
  - `destino_libro_id`;
  - `evidencia_libro_id`;
  - `editorial_id`.
- La referencia ISO 690 de una influencia se genera desde el **libro leído / libro evidencia** seleccionado como destino, reutilizando autor, título, editorial, año, edición y lugar de publicación de su ficha de Biblioteca.
- Editorial, año, edición y ciudad del bloque ISO pasan a ser datos derivados de Biblioteca y ya no una segunda fuente editable dentro de Influencias.
- Se eliminó el autocompletado incorrecto que tomaba la editorial/año del primer libro disponible del autor citado.
- Las relaciones antiguas se normalizan de forma compatible al cargarse: si LUMEN puede identificar el libro de evidencia, vincula sus IDs y actualiza la bibliografía canónica sin eliminar los campos históricos de la relación.
- Las Rutas conservan el formato anterior, pero agregan `fuente_libro_id` y `destino_libro_id` cuando sus nodos corresponden a libros de Biblioteca.
- El objeto `historia` queda identificado con el esquema `lumen_historia_v1` y continúa perteneciendo al mismo registro canónico del libro.
- La normalización canónica se ejecuta también al hacer merge y antes de guardar/sincronizar, manteniendo compatibilidad con el modelo por bloques de Firestore de v169.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados funcionalmente

- Login y autenticación.
- Arquitectura Firebase por bloques.
- Inventario y su ratio de lectura.
- Métricas de lectura.
- Discos y mangas.
- Visual de Historia y Gephi, salvo que ahora consumen datos con referencias canónicas cuando están disponibles.
- Reglas semanales y zona horaria de Santiago.

## Compatibilidad

- Se mantienen los campos de texto existentes (`autor`, `editorial`, `fuente`, `destino`, `libro_ref`) para que datos, exportaciones y relaciones antiguas sigan funcionando.
- Los nuevos IDs se agregan como referencias estables; no se eliminan datos previos.
- El merge extensible de v169 continúa conservando `enInventario`, `historia` y futuros campos de la ficha.

## Validaciones realizadas

- Revisión de sintaxis de todo el JavaScript embebido con `node --check`.
- Confirmación de versión visible v170.
- Confirmación de campos Edición y Ciudad / lugar de publicación en alta/edición de libro y Lectura en curso.
- Confirmación de generación de IDs canónicos para autores, editoriales y libros vinculados en Influencias.
- Confirmación de referencia ISO derivada del libro destino/evidencia.
- Confirmación de que `historia` sigue dentro de la entrada del libro y recibe `schema: lumen_historia_v1`.
- Confirmación de normalización canónica durante merge y guardado V2.

## Prueba sugerida

1. Editar un libro existente y completar editorial, año, edición y ciudad/lugar de publicación.
2. Guardarlo y volver a abrir la ficha para verificar los datos.
3. Crear o editar una influencia usando ese libro como **Libro influido / destino**.
4. Verificar que la vista previa ISO muestre automáticamente la bibliografía del libro leído y que editorial/año/edición/ciudad no deban escribirse otra vez en Influencias.
5. Guardar la relación y volver a abrir su detalle.
6. Probar el mismo libro en móvil y computador mediante Guardar/Cargar desde nube y verificar que autor/editorial, inventario e Historia coincidan.
7. Editar un libro de Historia, cambiar un período y confirmar que el cambio aparece en el otro dispositivo y en la línea de tiempo.
