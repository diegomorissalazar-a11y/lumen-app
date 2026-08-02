# LUMEN v164 — Métricas de lectura reconciliadas

**Fecha:** 1 de agosto de 2026

## Cambios aplicados

- Se creó una fuente única para las páginas registradas basada en las diferencias positivas del historial diario `readDates`.
- Inicio ahora muestra explícitamente **páginas registradas este año**.
- Mi Año distingue:
  - páginas registradas por fecha;
  - páginas totales de libros terminados;
  - libros terminados.
- El gráfico de lectura de Mi Año usa páginas registradas para páginas y ritmo.
- Estadísticas de libros incorpora un selector entre:
  - **Libros terminados**;
  - **Lectura registrada**.
- Los nombres de los KPI se hicieron explícitos para evitar mezclar ambas métricas.
- El exportador de lectura usa la misma fuente de registros diarios que Inicio, Mi Año y Estadísticas.
- El exportador incluye el total de páginas registradas del año actual para facilitar la conciliación.
- Se conserva la arquitectura de sincronización por bloques y el ajuste de escala de influencias de v163.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados

- Autenticación y login.
- Modelo de sincronización por bloques de Firebase.
- Inventario.
- Discos y mangas.
- Mapas, salvo conservar la escala de influencias ya incluida en v163.
- Reglas semanales de lunes a domingo y zona horaria de Santiago.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de versión visible v164.
- Confirmación de que Inicio, Mi Año, Estadísticas y Exportación comparten la función de páginas registradas.
- Confirmación de que el ZIP contiene `index.html` y `README.md`.

## Prueba sugerida

1. Abrir Inicio y anotar el total de páginas registradas del año.
2. Abrir Mi Año y comprobar que “Páginas registradas” coincide con Inicio.
3. Verificar que “Págs. de libros terminados” aparece como indicador separado.
4. Abrir Estadísticas > Libros.
5. Alternar entre “Libros terminados” y “Lectura registrada”.
6. En “Lectura registrada”, comprobar que el total anual coincide con Inicio y Mi Año.
7. Exportar historial de lectura y comprobar que “Páginas registradas 2026” coincide con las otras vistas.
8. Confirmar que Guardar en nube y Cargar desde nube siguen funcionando.
