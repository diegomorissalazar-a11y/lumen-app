# LUMEN v180

Fecha: 20-08-2026

## Cambios aplicados
- Importador bibliográfico compatible con `lumen_bibliografia_import_v1`.
- Compatibilidad conservada con `lumen_ficha_bibliografica_v1`.
- Normalización previa de comillas tipográficas y bloques ```json antes de `JSON.parse`.
- Detección de editorial, ISBN, edición, ciudad, país, traductores, título/idioma original, año/período original y notas bibliográficas.
- Para rangos de obra original se conserva inicio/fin y se usa el año menor como referencia cronológica.
- Flujo modal corregido: JSON bibliográfico se abre encima de Editar libro; Revisar ocurre dentro del mismo modal; Aplicar cierra solo el modal hijo y vuelve al editor.
- En edición, los cambios bibliográficos quedan pendientes hasta pulsar Guardar en la ficha del libro.
- Editoriales y traductores continúan vinculándose al catálogo canónico.
- Separación de año de la edición consultada y año/período original dentro del modelo bibliográfico.

## Archivos modificados
- `index.html`

## Módulos no modificados funcionalmente
- Login / autenticación.
- Navegación global.
- Inventario.
- Mapas Historia.
- Seguimiento de lectura.
- Exportadores.

## Validaciones realizadas
- Extracción y revisión de todos los scripts inline.
- `node --check` sobre JavaScript inline: OK.
- Verificación de handlers del modal bibliográfico y campos del editor.
- Verificación de versión de sync V2: v180.

## Prueba recomendada
1. Biblioteca → Cuentos completos → Editar.
2. Pulsar `Cargar JSON bibliográfico`.
3. Pegar `lumen_bibliografia_import_v1` (también con comillas tipográficas para probar tolerancia).
4. Pulsar `Revisar JSON`: deben aparecer los campos detectados.
5. Pulsar `Aplicar cambios`: debe volver al editor sin cerrarlo.
6. Verificar editorial, año de edición, edición, ciudad y traductores.
7. Pulsar Guardar en el editor.
8. Volver a abrir la ficha y comprobar persistencia.
