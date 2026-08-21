# Auditoría de continuidad — LUMEN v183

## Base

- Fuente funcional: **LUMEN v182 auditada**.
- SHA-256 del `index.html` v182 utilizado: `cba56f3833ec9f2851135aebd49eb43aea9bed8ef3cdfb33ad7100c0912228bc`.
- v183 cambia la estructura física a archivos modulares. No introduce cambios funcionales intencionales.

## Paridad estática

- CSS concatenado idéntico a v182 (salvo etiqueta de versión): **True**.
- JavaScript funcional concatenado idéntico a v182 (salvo v182→v183): **True**.
- IDs DOM estáticos base: **553**; preservados: **553**; faltantes: **0**.
- `onclick` estáticos base: **264**; v183: **264**; conjunto preservado: **True**.
- Candidatos a handlers faltantes: **0**.
- Errores de sintaxis JS (`node --check` por archivo): **0**.

## Tamaño modular

- Archivos totales del paquete: **57**.
- Parciales HTML: **23**.
- Hojas CSS: **9** (incluye bootstrap visual).
- Archivos JS: **19** (incluye bootstrap).

## Funciones

La medición se hace con criterios explícitos para evitar mezclar métricas:

- Declaraciones `function nombre(...)`: **582**.
- Asignaciones `window.nombre = function(...)`: **23**.
- Funciones arrow asignadas a variables: **27**.
- Nombres callable únicos detectados por esas tres reglas: **615**.

## Restricción operativa

La v183 usa parciales HTML cargados por `fetch`. Debe desplegarse mediante **GitHub Pages / HTTP(S)**. No debe abrirse directamente como `file://`.
