# LUMEN v171 — Ritmo histórico y línea de tiempo navegable

**Fecha:** 16 de agosto de 2026

## Cambios aplicados

- Se corrigió el KPI de ritmo lector de Inicio.
- El año actual usa páginas registradas hasta hoy divididas por los días transcurridos del año.
- La comparación `vs año anterior` usa siempre el resultado final del año anterior: páginas totales de libros terminados dividido por 365/366 días.
- El `mejor año` se obtiene entre todos los años históricos cerrados con la misma regla anual.
- Se agregó proyección de cierre del año actual y diferencia estimada contra el récord histórico.
- Se rediseñó la línea de tiempo de Historia para agrupar todos los libros de una misma línea histórica en una sola fila.
- Los libros que se solapan temporalmente se apilan dentro de la misma línea, permitiendo comparar coberturas complementarias o coincidentes.
- Al seleccionar una línea histórica se activa zoom automático al rango temporal de esa línea.
- El nombre de cada línea también se puede tocar para entrar directamente a su zoom.
- Las barras muestran libro, período y fechas; al tocarlas se abre la ficha del libro.
- Se mantuvieron visibles los vacíos temporales para preparar futuras sugerencias de próximas lecturas.
- Se agregó filtro `En inventario · no leídos` para visualizar libros disponibles que podrían cubrir períodos aún pendientes.
- Se incorporaron IDs canónicos determinísticos para líneas históricas (`lineaPrincipalId`) y períodos (`periodoId`), manteniendo compatibilidad con los nombres actuales.
- Las líneas relacionadas reciben también IDs canónicos para futuras conexiones entre líneas históricas.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados

- Arquitectura de sincronización Firebase V2 por bloques.
- Inventario integrado y su sincronización.
- Modelo canónico de libros, autores y editoriales de v170.
- Gephi de influencias y rutas de lectura.
- Discos, mangas y películas.
- Importadores y exportadores existentes.
- Reglas semanales y zona horaria de Santiago.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de versión visible v171.
- Confirmación de permanencia del modelo V2 de sincronización.
- Confirmación de generación de IDs históricos sin eliminar campos legacy.
- Confirmación de agrupación del render por `lineaPrincipalId`.
- Confirmación de cálculo del año anterior y mejor histórico usando años cerrados completos.

## Prueba sugerida

1. Abrir Inicio y verificar que aparezca comparación contra 2025 si existen libros terminados en 2025.
2. Verificar que `Mejor` muestre el año histórico con mayor promedio anual final y la proyección 2026 contra ese récord.
3. Abrir Mapas → Historia.
4. Confirmar que tres libros con `Historia de Eurasia` aparezcan en una sola fila.
5. Seleccionar `Historia de Eurasia` en el filtro y comprobar que el eje haga zoom automáticamente.
6. Comprobar que libros con períodos solapados se apilen y sigan siendo legibles.
7. Probar el filtro `En inventario · no leídos`.
8. Guardar en nube desde un dispositivo y cargar desde otro para comprobar que los campos históricos sigan sincronizándose.
