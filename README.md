# LUMEN v161 — Restauración de respaldo integral

**Fecha:** 23 de julio de 2026

## Cambios aplicados

- Se agregó la acción **Restaurar respaldo integral** al menú de usuario.
- Se agregó la misma acción al modal **Importar datos**.
- Valida que el archivo corresponda al esquema `lumen_respaldo_integral_v1` de LUMEN.
- Muestra versión de origen, fecha, cantidad de bloques y registros antes de restaurar.
- Permite seleccionar los bloques principales o elegirlos individualmente.
- Antes de aplicar la restauración descarga automáticamente un respaldo de seguridad del estado actual.
- Conserva portadas locales base64 cuando el respaldo contiene el placeholder `__local_image__` y existe una imagen local equivalente.
- Al finalizar, registra metadatos de restauración y recarga la app.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados

- Autenticación y login.
- Guardado y carga desde Firebase.
- Biblioteca, estadísticas, hábitos, mapas e inventario en su funcionamiento normal.
- Importadores CSV existentes.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de presencia del exportador v161 y del restaurador integral.
- Confirmación de que el ZIP contiene `index.html` y `README.md`.

## Prueba sugerida

1. Abrir el menú de usuario.
2. Pulsar **Restaurar respaldo integral**.
3. Elegir un JSON generado por **Exportar respaldo integral**.
4. Revisar el resumen y los bloques seleccionados.
5. Confirmar la restauración.
6. Verificar que primero se descargue un respaldo de seguridad y que luego LUMEN se recargue con los datos restaurados.
