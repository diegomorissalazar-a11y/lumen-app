# LUMEN v209

Fecha: 21-09-2026

## Cambios
- Normalizador de duplicados separado por entidad: Autores, Libros/obras y Películas/series.
- Autores: fusión por ID canónico; actualiza relaciones de Influencias, Rutas y libros vinculados.
- Autores: edición manual del nombre canónico desde Normalizar.
- Editar relación: selección por ID canónico del autor fuente y selector explícito para reparar el autor destino/influido.
- El guardado de la relación actualiza nombre + ID usados por el grafo sin alterar cita, página, obra ni bibliografía.
- Tooltip de nodos de Influencias: conserva el autor canónico como encabezado y agrega cita/evidencia y referencia ISO separadas por saltos de línea.
- Se evita usar el reparador global v208 como flujo principal de corrección.

## Archivos modificados
- `index.html`
- `manifest.json`
- `views/screens/maps.html`
- `views/modals/influences.html`
- `js/features/11-maps-influences.js`
- `js/features/12-routes-graphs.js`
- `js/features/13-movies-normalization.js`

## No tocado
- Firebase/Auth/Sync.
- Home, estadísticas, hábitos, inventario y notas.
- Modelo de evidencia/citas y taxonomía v205.

## Pruebas sugeridas
1. Mapas → Normalizar → Duplicados → Autores: analizar, fusionar un duplicado y comprobar que Influencias conserva las aristas.
2. Usar “Editar nombre” y comprobar el cambio en el nodo.
3. Abrir una relación → Editar: cambiar autor fuente o autor destino y guardar.
4. Pulsar un nodo: comprobar autor canónico + cita + ISO.
5. Revisar Rutas e Influencias tras recargar la app.
