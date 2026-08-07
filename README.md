# LUMEN v165 — Inventario vinculado y ficha histórica

**Fecha:** 7 de agosto de 2026

## Cambios aplicados

- Se agregó a la ficha de cada libro el flag **“Este ejemplar está en mi inventario”**.
- El flag no crea una segunda lectura: vincula el mismo registro de Biblioteca con el módulo Inventario.
- Los libros marcados muestran un badge **📦 Inventario** en Biblioteca.
- Si un libro ya está vinculado desde el inventario existente, el flag aparece activo al editarlo.
- Al importar inventario, los libros vinculados quedan marcados automáticamente como presentes en inventario.
- Se agregó un bloque de **Período histórico** que aparece solo cuando el libro tiene la etiqueta **Historia**.
- La ficha histórica permite registrar:
  - línea histórica principal;
  - líneas relacionadas;
  - ámbito geográfico;
  - enfoque principal;
  - uno o varios tramos históricos.
- Cada tramo admite nombre del período/hecho, tema/proceso, año inicial, año final, precisión y tipo de cobertura.
- Los años a. C. se guardan como valores negativos para preparar la futura línea de tiempo histórica.
- El detalle del libro muestra la información histórica estructurada y los tramos registrados.
- El nuevo modelo de sincronización por bloques de v164 se conserva y sincroniza los nuevos campos dentro de cada entrada.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados

- Autenticación y login.
- Arquitectura Firebase por bloques.
- Métricas reconciliadas de lectura.
- Discos y mangas.
- Mapas existentes.
- Reglas semanales de lunes a domingo y zona horaria de Santiago.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de versión visible v165.
- Confirmación de flag de inventario en alta y edición de libros.
- Confirmación de badge de inventario en Biblioteca.
- Confirmación de múltiples períodos históricos en libros con etiqueta Historia.
- Confirmación de visualización de los datos históricos en la ficha de detalle.
- Confirmación de que el ZIP contiene `index.html` y `README.md`.

## Prueba sugerida

1. Editar un libro leído y marcar **Este ejemplar está en mi inventario**.
2. Guardar y verificar el badge **📦 Inventario** en Biblioteca.
3. Abrir la pestaña Inventario y confirmar que aparece vinculado al mismo libro.
4. Editar un libro, marcar la etiqueta **Historia** y comprobar que aparece el bloque histórico.
5. Registrar una línea histórica, un ámbito y al menos dos períodos.
6. Guardar y abrir la ficha del libro para verificar la información histórica.
7. Probar un período a. C. usando un año negativo, por ejemplo `-480`.
8. Guardar en nube y cargar desde otro dispositivo para comprobar que el flag y los períodos se conservan.
