# LUMEN v167 — Inventario integrado

**Fecha:** 8 de agosto de 2026

## Base utilizada

- LUMEN v166 — lectura, inventario y mapa histórico.

## Cambios aplicados

- Se simplificó el alta de libros al inventario físico: **Inventario** ahora aparece como una etiqueta/chip junto a los géneros del libro.
- La etiqueta **📦 Inventario** usa un color propio y se activa/desactiva con un toque.
- El flag sigue usando el mismo campo `enInventario`; no crea un segundo libro ni un estado de lectura paralelo.
- La pestaña **Inventario** ahora se comporta como la vista de **Libros**: usa las mismas tarjetas completas, portadas, autor, editorial, estado, géneros, notas y acceso a ficha.
- Se retiraron los KPI de la vista principal del Inventario.
- Se agregó el botón **📊 Ver datos del inventario**.
- El nuevo modal de datos muestra KPI de biblioteca física y estadísticas de autores, editoriales y géneros.
- El ratio de lectura usa el estado real del mismo libro de Biblioteca (`leido`, `leyendo`, `pendiente`, `abandonado`).
- Los registros importados por CSV que todavía no están vinculados se muestran aparte como **Pendientes de vincular**.
- Se conserva el importador CSV de inventario.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos conservados

- Corrección de **Empezar a seguir** de v166.
- Arquitectura Firebase / sincronización por bloques.
- Respaldo y restauración integral.
- Métricas reconciliadas de lectura.
- Mapa de influencias y escala por influencias originadas.
- Fichas históricas y mapa de línea de tiempo de Historia.
- Discos, mangas, películas y series.
- Reglas semanales y zona horaria de Santiago.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de versión visible v167.
- Confirmación de que la etiqueta Inventario conserva el campo `enInventario`.
- Confirmación de que la vista Inventario reutiliza las tarjetas de Biblioteca.
- Confirmación de que los KPI ya no aparecen en la vista principal.
- Confirmación de presencia del modal **Ver datos del inventario**.
- Confirmación de que el ZIP contiene `index.html` y `README.md`.

## Prueba sugerida

1. Editar un libro y tocar **📦 Inventario** junto a sus géneros.
2. Guardar y comprobar que aparece el badge de Inventario en Biblioteca.
3. Abrir **Biblioteca → Inventario** y verificar que el libro se muestra con la misma tarjeta completa que en Libros.
4. Confirmar que la pantalla principal de Inventario no muestra KPI.
5. Pulsar **📊 Ver datos del inventario** y comprobar total físico, leídos, ratio, estados, autores, editoriales y géneros.
6. Desmarcar **📦 Inventario**, guardar y comprobar que el libro desaparece de la pestaña Inventario sin borrarse de Biblioteca.
7. Guardar en nube y cargar desde otro dispositivo para verificar que el flag se conserva.
