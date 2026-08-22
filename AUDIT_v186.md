# Auditoría LUMEN v186 — Inventario JSON y normalización canónica

## Base de código
La v186 fue construida directamente sobre **LUMEN v185 modular**. No se usó una versión anterior como base.

- SHA-256 `index.html` v185: `f52509ffdef9a71466035694598e71275c3d3aadce34d4d8d1bef94c254d3f24`
- SHA-256 `index.html` v186: `b2769022440f1fe209d8e2989eb8c4e1de7070b9573756490cb0a5c996e10aba`

## Continuidad automática
- Archivos: **64 → 67**
- Declaraciones `function`: **598 → 609**
- Callables únicos: **661 → 672**
- Variables únicas detectadas: **1214 → 1239**
- IDs DOM: **560 → 564**
- `onclick` totales: **268 → 272**
- Handlers `onclick` únicos: **102 → 104**

### Eliminaciones detectadas
- Funciones: **0**
- Callables: **0**
- Variables: **0**
- IDs DOM: **0**
- Handlers onclick: **0**

### Adiciones principales
- Nuevo módulo `js/inventory-json-import.js`.
- Modal `modal-inventory-json`.
- Botón **Libro con JSON** en Inventario.
- Alta/enriquecimiento por `lumen_bibliografia_import_v1`.
- Detección de libro existente por ISBN, título + autor y similitud >=90%.
- Normalización canónica de autor, editorial y traductores reutilizando la infraestructura existente.
- Importación CSV ahora crea/vincula fichas de Biblioteca editables y marca `enInventario=true`.

## Validaciones
- Errores de sintaxis JS (`node --check`): **0**
- Rutas faltantes en `manifest.json`: **0**
- Rutas faltantes en `bootstrap.js`: **0**
- Handlers `onclick` sin callable detectado: **0**
