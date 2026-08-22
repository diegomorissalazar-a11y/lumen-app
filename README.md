# LUMEN v186 — Inventario con JSON bibliográfico

Base obligatoria usada: **LUMEN v185 modular**.

## Cambios funcionales
- Inventario muestra tres acciones principales: **Importar inventario**, **Datos del inventario** y **Libro con JSON**.
- **Libro con JSON** acepta `lumen_bibliografia_import_v1`, reutilizando el mismo parser bibliográfico de Biblioteca.
- Antes de aplicar se revisan título, autor, editorial, ISBN, edición, traductores y período original.
- Autor/editorial/traductores se resuelven contra las entidades canónicas existentes; coincidencias relevantes se consultan antes de crear una entidad nueva.
- El libro se busca primero por ISBN y luego por título + autor. Las coincidencias de título cercanas se confirman antes de enriquecer una ficha existente.
- Si el libro ya existe, se enriquece la misma ficha y se marca `enInventario=true`.
- Si no existe, se crea una ficha de Biblioteca editable, en estado `pendiente`, ya integrada al Inventario.
- La importación CSV básica ahora crea o vincula fichas canónicas de Biblioteca, de modo que cada libro importado queda disponible para edición posterior.

## Arquitectura
Se mantiene íntegramente la arquitectura modular de v185 y se agrega un único módulo especializado:

- `js/inventory-json-import.js`

Este módulo consume la infraestructura existente de:
- `normalizeBibliographicPayload()` para JSON bibliográfico;
- catálogo canónico de autores/editoriales/traductores;
- ficha `Book` existente;
- persistencia y sincronización ya definidas.

No se modifica la lógica de Mapas, sincronización V2, hábitos, notas, películas, Historia ni estadísticas.

Consulta `AUDIT_v186.md` y `AUDIT_v186.json` para la comparación automática v185 → v186.
