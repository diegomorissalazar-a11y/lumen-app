# LUMEN v159

Fecha: 19-07-2026

## Cambios aplicados

- Nueva pestaña independiente **Inventario** dentro de Biblioteca.
- Importación de CSV con cuatro columnas: `ID`, `Título`, `Autor`, `Editorial`.
- Análisis previo de registros nuevos, vinculados, duplicados exactos, posibles ediciones e incompletos.
- Vinculación automática del ejemplar físico con libros existentes de LUMEN.
- Estadísticas del inventario físico.
- Carrito de lectura.
- Acción para iniciar una lectura desde el inventario sin duplicar un libro ya existente.
- Persistencia local y sincronización del inventario con Firestore.
- Corrección de referencias internas de versión a v159.

## Archivos modificados

- `index.html`
- `README.md`

## Módulos no modificados funcionalmente

- Autenticación.
- Historial y métricas de lectura.
- Películas, series y mangas.
- Mapas, citas y rutas.
- Diseño general de LUMEN.

## Validaciones realizadas

- Revisión de sintaxis JavaScript con `node --check`.
- Verificación de presencia de la pestaña y modal de inventario.
- Verificación del flujo importar, analizar, confirmar, vincular, carrito e iniciar lectura.
- Verificación de persistencia local y payload de sincronización.

## Prueba breve

1. Abrir Biblioteca > Inventario.
2. Seleccionar `Importar CSV`.
3. Cargar un CSV con las cuatro columnas indicadas.
4. Revisar el resumen y confirmar.
5. Agregar un libro al carrito y luego usar `Comenzar lectura`.
