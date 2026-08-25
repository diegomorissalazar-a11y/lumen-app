# AUDIT v190 — continuidad contra v189

- Base obligatoria: `LUMEN_v189_descubrir_eventos_lectura.zip`
- SHA-256 base: `2154aa11d151240fa49e8277e323e684f3f0d6698392de7b7aadd5678b460ed6`
- JS: **OK** (`node --check` en todos los módulos)
- Rutas faltantes en bootstrap: **0**
- IDs estáticos duplicados: **0**

- Archivos: **77 → 80**
- Funciones declaradas: **651 → 658** · eliminados **0** · agregados **7**
- Callables: **691 → 698** · eliminados **0** · agregados **7**
- Variables: **1299 → 1302** · eliminados **0** · agregados **3**
- IDs DOM: **574 → 574** · eliminados **0** · agregados **0**
- Handlers onclick: **109 → 109** · eliminados **0** · agregados **0**

## Alcance validado
- Nuevo módulo `js/data/assets.js`.
- Portadas locales permitidas solo para libro `leyendo`, manga `leyendo` y serie `viendo`.
- Persistencia binaria en IndexedDB; `localStorage` continúa con snapshot liviano.
- `coverAssetId` no se sincroniza a Firebase.
- URLs remotas de portada se conservan.
- Al terminar un contenido, una portada exclusivamente local se desacopla sin afectar progreso, ficha ni estadísticas.

## Sin cambios funcionales
Inventario, Descubrir, Mapas, Historia, Hábitos, Bibliografía, Notas, referencias, login/auth y exportadores mantienen la lógica de v189.
