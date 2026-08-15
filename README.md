# LUMEN v169 — Sincronización completa de campos entre dispositivos

**Fecha:** 15 de agosto de 2026

## Cambios aplicados

- Se corrigió el merge de entradas entre teléfono y computador para que no dependa de una lista fija de campos.
- La entrada más reciente ahora transmite todos sus campos, incluidos los incorporados en versiones posteriores.
- Se sincroniza correctamente el flag `enInventario`, por lo que los libros marcados desde Biblioteca en el teléfono aparecen también en Inventario del computador.
- Se sincroniza el objeto `historia` completo, incluidos línea histórica, ámbito y períodos.
- Los valores válidos `false`, `0`, cadenas vacías y arreglos vacíos pueden propagarse cuando representan una edición real; esto permite, por ejemplo, quitar un libro del inventario desde otro dispositivo.
- Se mantiene fusión especial para `readDates` y `notas_lista` para no perder historial acumulativo.
- Se mantiene protección contra retrocesos accidentales de progreso por página al fusionar historiales.
- El diagnóstico manual de diferencias ahora contempla `enInventario` e `historia`.
- El manifest y diagnóstico de sincronización informan versión v169.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados

- Login y autenticación.
- Estructura Firestore V2 por bloques.
- Diseño de Biblioteca e Inventario.
- Mapa de influencias, rutas, películas e Historia.
- Métricas de lectura.
- Discos y mangas.
- Reglas semanales y zona horaria.

## Validaciones realizadas

- Revisión de sintaxis de todo el JavaScript embebido mediante `node --check`.
- Confirmación de versión visible v169.
- Confirmación de `appVersion: v169` en manifest V2.
- Revisión del merge para propagación de `enInventario: true` y `enInventario: false`.
- Revisión del merge para propagación del objeto `historia` y de campos futuros no predefinidos.
- Confirmación de conservación de la fusión acumulativa de `readDates` y `notas_lista`.

## Prueba sugerida

1. En el teléfono, pulsar **Guardar en nube** y confirmar que finaliza correctamente.
2. En el computador, pulsar **Cargar desde nube**.
3. Abrir Biblioteca → Inventario y comprobar que el total coincide con el teléfono (en la prueba reportada: 104 libros físicos, 101 leídos y 3 leyendo).
4. Marcar un libro nuevo como **+ Inventario** en el computador y guardar en nube.
5. Cargar en el teléfono y confirmar que aparece marcado allí.
6. Quitar un libro del inventario en uno de los dispositivos, guardar/cargar y confirmar que también se quita en el otro.
7. Editar un libro de Historia con un período, sincronizar y verificar el mismo contenido en el segundo dispositivo.
