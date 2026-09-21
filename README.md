# LUMEN v206

Fecha: 21-09-2026

## Cambios
- Reparación no destructiva de identidades canónicas en Relaciones/Influencias.
- Respaldo local automático del mapa antes de la primera reconciliación v206.
- Recuperación de referencias bibliográficas antiguas migradas de `cita_directa` a `referencia`.
- Grafo autor→autor reconciliado por ID canónico para evitar nodos duplicados por variantes del nombre.
- Nuevo flujo simplificado para cargar relaciones: tipo → subtipo → autor/libro fuente → JSON de evidencia.
- El libro fuente puede estar leído, en curso o simplemente existir en Biblioteca.
- Los datos ISO se reutilizan desde la ficha bibliográfica seleccionada.
- JSON simplificado compatible con `autor_citado`, `obra_citada`, `pagina` y `texto_citado`.
- Compatibilidad conservada con JSON completos/anteriores y taxonomía v205.
- Exportación Gephi mantiene familias, subtipos y atributos; nombre de exportación actualizado a v206.

## Archivos modificados
- `index.html`
- `manifest.json`
- `js/bootstrap.js`
- `js/core/02-canonical-history-sync.js`
- `js/features/11-maps-influences.js`
- `js/features/12-routes-graphs.js`
- `views/modals/influences.html`

## No tocado
- Firebase/Auth y reglas de sincronización.
- Estadísticas, hábitos, inventario, películas, historia y recomendaciones fuera de las referencias necesarias.
- Paleta de colores de las seis familias de relaciones.

## Validación realizada
- `node --check` sobre los JS modificados.
- Verificación de integridad del manifest y existencia de recursos declarados.
- Verificación estática de IDs del nuevo cargador.
- Revisión de compatibilidad de tipos antiguos y `referencia`.

## Prueba recomendada
1. Abrir Mapas → Influencias.
2. Confirmar que referencias antiguas vuelven a aparecer.
3. Confirmar que autores equivalentes aparecen como un único nodo cuando ya están normalizados/canonizados.
4. Crear una relación: elegir tipo, subtipo, autor/libro y cargar JSON simplificado.
5. Confirmar que la vista previa hereda bibliografía de la ficha del libro.
6. Guardar, cerrar y volver a abrir la relación.
7. Exportar Gephi y comprobar IDs canónicos y atributos.

Solo la carpeta `github/` debe publicarse en GitHub Pages. La carpeta `documentation/` del ZIP es de auditoría y no necesita subirse.
