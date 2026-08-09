# LUMEN v168 — Acceso rápido a Inventario y navegación de Mapas

**Fecha:** 8 de agosto de 2026

## Cambios aplicados

- En **Biblioteca → Libros**, cada tarjeta de libro muestra ahora un chip accionable de inventario:
  - `📦 + Inventario` cuando el libro no forma parte del inventario físico.
  - `📦 Inventario` cuando ya está marcado.
- Un toque en `+ Inventario` agrega el mismo registro de libro al inventario físico, sin abrir modales, sin duplicarlo y sin modificar su estado de lectura.
- Al quitar un libro del inventario se solicita confirmación para evitar eliminaciones accidentales.
- El estado de lectura (`Leído`, `Leyendo`, `Pendiente`, etc.) se mantiene en el mismo registro y continúa alimentando los datos del inventario.
- Se corrigió la barra de navegación de **Mapas** para las cinco pestañas: Influencias, Rutas, Películas, Historia y Normalizar.
- En móvil, las cinco pestañas usan una grilla de ancho fijo al viewport, icono y etiqueta compacta; **Normalizar ya no se desplaza fuera de pantalla**.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados

- Autenticación y login.
- Arquitectura Firebase por bloques.
- Restauración y exportación integral.
- Métricas de lectura.
- Línea de tiempo histórica y sus datos.
- Influencias, rutas y mapas en su lógica interna.
- Discos y mangas.
- Reglas semanales y zona horaria.

## Validaciones realizadas

- Revisión de sintaxis del JavaScript embebido con `node --check`.
- Confirmación de versión visible `v168`.
- Confirmación de acción rápida `📦 + Inventario` en tarjetas de libros.
- Confirmación de que la acción no crea un segundo registro de Biblioteca.
- Confirmación de layout responsive de cinco pestañas en Mapas sin ancho mínimo que fuerce desbordamiento.
- Confirmación de presencia de `index.html` y `README.md` en el ZIP.

## Prueba sugerida

1. Abrir **Biblioteca → Libros** y localizar un libro leído que no esté en inventario.
2. Pulsar `📦 + Inventario` directamente en su tarjeta.
3. Confirmar que el chip cambia a `📦 Inventario` y que el libro aparece en la pestaña Inventario conservando su estado `Leído`.
4. Abrir **Mapas** en el teléfono y recorrer las cinco pestañas.
5. Confirmar que `Normalizar` queda completamente visible y alineado dentro del ancho de pantalla.
6. Guardar en nube y comprobar en otro dispositivo que el flag de inventario se conserva.
