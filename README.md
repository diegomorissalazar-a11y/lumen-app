# LUMEN v181
Fecha: 2026-08-20

## Cambios
- Influencias: al seleccionar/editar el libro destino, los campos bibliográficos se sincronizan desde la ficha canónica del libro.
- ISO 690: usa el año/edición consultada para la referencia; mantiene separado el año histórico/original cuando exista en el modelo.
- Aviso de ficha bibliográfica incompleta con acceso a completar la ficha.
- Mapas > Influencias: nuevo botón “Referencias” con bibliografía deduplicada y ordenada.
- Notas de libros: sección “Referencias” al final cuando existen notas.

## No tocado
- Login/Auth.
- Firebase/sincronización.
- Navegación inferior.
- Exportadores.
- Estilos globales.

## Validación
- Sintaxis JavaScript revisada con `node --check` sobre los scripts inline.
- Se verificaron los nuevos handlers de selección, referencias y sincronización bibliográfica.

## Prueba breve
1. Editar una influencia y seleccionar un libro con ficha bibliográfica cargada.
2. Confirmar que editorial, ciudad, edición y año se completen automáticamente y que la referencia ISO se actualice.
3. Abrir Mapas > Influencias > Referencias.
4. Abrir un libro con notas y expandir Notas; revisar “Referencias” al final.
