# LUMEN v160

Fecha: 23-07-2026

## Cambios aplicados

- Se agregó **Exportar respaldo integral** al menú de usuario.
- Se agregó la misma acción dentro de **Importar / Exportar CSV**.
- El respaldo reúne todas las claves locales de LUMEN (`lumen_*`) en un único JSON.
- Incluye una copia adicional de la base `db` que está activa en memoria al momento de exportar.
- Las imágenes en formato base64 se excluyen y se reemplazan por `__local_image__`.
- El archivo incluye metadatos, versión, fecha, política de imágenes y resumen por bloque.
- Se mantuvo el exportador JSON anterior para respaldar solo la biblioteca.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados funcionalmente

- Autenticación.
- Sincronización Firebase.
- Biblioteca e inventario.
- Historial y métricas de lectura.
- Películas, series, discos y mangas.
- Mapas, citas y rutas.
- Diseño general de LUMEN.

## Validaciones realizadas

- Revisión de sintaxis JavaScript con `node --check`.
- Verificación de versión visible v160.
- Verificación de acceso al respaldo desde ambos lugares.
- Verificación de exclusión recursiva de imágenes base64.
- Verificación del nombre y estructura del archivo descargado.

## Prueba breve

1. Abrir el menú de usuario y seleccionar `Exportar respaldo integral`.
2. Confirmar la descarga de `LUMEN_respaldo_integral_v160_YYYY-MM-DD.json`.
3. Repetir desde `Importar / Exportar CSV`.
4. Abrir el JSON y comprobar que contiene `schema`, `summary` y `blocks`.
5. Buscar `data:image`; no debe existir. Las portadas locales deben aparecer como `__local_image__`.
