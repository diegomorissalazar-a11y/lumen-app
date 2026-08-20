# LUMEN v176 — Corrección crítica de arranque y login

**Fecha:** 20 de agosto de 2026

## Cambios aplicados

- Corrige la regresión de v175 que podía detener la ejecución de JavaScript antes de conectar los botones de Login/Auth.
- `mapas` ahora se declara antes de la migración canónica inicial y se carga realmente solo cuando `MAPAS_KEY` ya está disponible.
- `allKnownEntityNames()` tolera correctamente el estado previo a la carga de Mapas.
- La migración canónica inicial de libros queda protegida con `try/catch`: una incidencia de normalización ya no puede bloquear el arranque de LUMEN.
- Se mantiene íntegro el modelo canónico de v175 para autores, editoriales, traductores, ficha bibliográfica e Influencias.

## Archivos modificados

- `index.html`

## Módulos no modificados

- Firebase/Auth y credenciales.
- Sincronización V2 por bloques.
- Inventario.
- Historial de lectura y KPIs.
- Historia y línea de tiempo.
- Gephi/Mapas, salvo la inicialización segura de su variable global.
- Importadores y exportadores.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de una sola declaración `let mapas` y carga posterior por asignación.
- Confirmación de listeners de Login, registro, recuperación de contraseña y Enter.
- Confirmación de versión visible `v176`.

## Prueba sugerida

1. Abrir LUMEN v176 desde cero.
2. Introducir correo y contraseña y pulsar **Entrar**.
3. Confirmar que abre Inicio.
4. Cerrar sesión y volver a entrar.
5. Abrir Biblioteca y Mapas para comprobar que ambos módulos cargan.
6. Verificar que las funciones bibliográficas/canónicas incorporadas en v175 siguen disponibles.
