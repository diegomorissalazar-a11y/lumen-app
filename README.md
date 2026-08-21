# LUMEN v183 — Arquitectura modular

## Base funcional

Esta versión fue migrada directamente desde **LUMEN v182 auditada**.

- SHA-256 de `index.html` v182 usado como fuente: `cba56f3833ec9f2851135aebd49eb43aea9bed8ef3cdfb33ad7100c0912228bc`
- Objetivo: cambio estructural de archivos, **sin cambios funcionales intencionales**.
- La interfaz sigue usando los mismos IDs, handlers, modelo local y sincronización V2 de v182.

## Arquitectura

- `index.html`: shell mínimo y dependencias externas.
- `css/`: 9 hojas de estilo ordenadas según la cascada original.
- `views/screens/`: pantallas principales.
- `views/modals/`: modales separados por dominio.
- `views/shell/`: autenticación, menú de usuario y navegación.
- `js/core/`: datos, sincronización, persistencia, autenticación y navegación base.
- `js/features/`: módulos funcionales cargados en el mismo orden de ejecución de v182.
- `assets/icons/`: recursos visuales propios.

## Compatibilidad

Los archivos JavaScript se cargan como scripts clásicos en orden estricto. Esto conserva el ámbito global requerido por los `onclick` existentes mientras permite auditar y modificar cada dominio por separado.

La carga de parciales HTML usa `fetch`, por lo que LUMEN debe servirse por HTTP/HTTPS (por ejemplo GitHub Pages); no abrir `index.html` directamente con `file://`.

## Validaciones de build

El build comprueba:

- reconstrucción exacta del CSS al concatenar módulos;
- reconstrucción exacta del JavaScript al concatenar módulos, salvo el cambio de etiqueta v182→v183;
- conservación de IDs DOM de la base;
- conservación de handlers `onclick`;
- sintaxis JavaScript mediante `node --check`;
- prueba de arranque mediante Chromium sobre servidor HTTP local.
