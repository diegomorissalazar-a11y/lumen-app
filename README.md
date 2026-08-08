# LUMEN v166 — Lectura en curso, inventario y mapa histórico

**Fecha:** 8 de agosto de 2026

## Cambios aplicados

### 1. Corrección de “Empezar a seguir”
- Se reforzó `saveReadingEntry()` para que el botón de **Lectura en curso** no quede silencioso ante un error.
- Valida los campos del formulario antes de usarlos.
- Si un libro pendiente/leyendo ya existe en Biblioteca, reutiliza ese registro en vez de crear un duplicado.
- Mantiene metadatos existentes cuando el formulario no aporta un valor nuevo.
- Registra `_updatedAt` y conserva `startDate`.
- Si el guardado local falla, revierte el alta parcial y muestra el error en pantalla.
- Si el fallo corresponde a cuota de almacenamiento, muestra explícitamente **“almacenamiento local lleno”**.

### 2. Inventario físico corregido
- Se eliminó del Inventario toda la lógica visible de **carrito**.
- Inventario vuelve a representar únicamente los ejemplares físicos que posee el usuario.
- El estado de lectura se deriva del libro vinculado en Biblioteca; no mantiene un segundo estado paralelo.
- Nuevo KPI principal: **Leídos X de Y · %**.
- Las tarjetas ahora responden al estado real:
  - leído → `Abrir ficha`;
  - leyendo → `Continuar lectura`;
  - pendiente/abandonado → `Comenzar lectura`;
  - sin vínculo → `Comenzar lectura` creando/vinculando el libro.
- Un libro ya leído no puede ser convertido accidentalmente a “leyendo” desde Inventario.

### 3. Mapa histórico v1
- Se agregó una nueva pestaña **🕰 Historia** dentro de Mapas.
- Usa los datos históricos estructurados incorporados en v165.
- Muestra los libros y sus tramos sobre una línea de tiempo real.
- Admite años a. C. mediante valores negativos y los presenta como `a. C.` en la interfaz.
- Cada tramo aparece como barra entre año inicial y final; un hecho puntual aparece como barra mínima.
- Diferencia visualmente libros leídos, leyendo y pendientes.
- Permite filtrar por:
  - línea histórica principal;
  - estado de lectura.
- Muestra KPIs de libros históricos, tramos fechados y tramos sin fecha.
- Los libros históricos sin fechas suficientes quedan listados como **Sin fecha suficiente** en vez de inventar una ubicación temporal.
- Tocar un tramo abre la ficha del libro.

## Arquitectura conservada
- Se mantiene la sincronización Firebase por bloques de v165.
- Se conserva el exportador y restaurador integral.
- Se conservan las métricas reconciliadas de lectura.
- No se modifican Discos, Mangas, Películas, Series ni los mapas existentes de Influencias y Rutas.

## Pruebas sugeridas

1. Abrir **Inicio → + Lectura en curso**, completar título y pulsar **Empezar a seguir**.
2. Repetir la prueba con y sin portada y verificar que el modal cierre y el libro aparezca en “Leyendo ahora”.
3. Probar con un libro pendiente ya existente y confirmar que se actualiza sin duplicarse.
4. Abrir **Biblioteca → Inventario** y confirmar que ya no aparece Carrito.
5. Con un inventario de 1 libro leído, verificar **Leídos 1 de 1 · 100%**.
6. Confirmar que una tarjeta leída no muestre “Comenzar lectura”.
7. Editar un libro, marcar **Historia** y cargar al menos un período con años inicial/final.
8. Abrir **Mapas → Historia** y comprobar que el libro aparece en la línea de tiempo.
9. Probar un tramo a. C., por ejemplo `-480` a `-479`.
10. Probar filtros por línea histórica y estado de lectura.
