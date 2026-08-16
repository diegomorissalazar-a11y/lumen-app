# LUMEN v173 — Persistencia local robusta y corrección de clicks

**Fecha:** 16 de agosto de 2026

## Cambios aplicados

- Se corrigió la causa común de botones de guardado que parecían no responder cuando Safari/iOS devolvía `QuotaExceededError`.
- `saveDB()` ya no deja la ejecución interrumpida por una escritura fallida en `localStorage`, por lo que los flujos Guardar / Terminé / notas / Historia / Inventario / mangas / series pueden completar el cierre del modal después de persistir el cambio.
- Se agregó almacenamiento de portadas locales base64 en **IndexedDB** (`lumen_assets_v1`) para sacar imágenes pesadas del objeto principal guardado en `localStorage`.
- Se agregó migración automática al iniciar: si existen portadas base64 locales, se respaldan en IndexedDB y el snapshot de `localStorage` se compacta con placeholders.
- Se agregó hidratación de portadas desde IndexedDB cuando el dispositivo dispone de la imagen local.
- Se agregó fallback de persistencia liviana si Safari alcanza la cuota y limpieza limitada de respaldos locales transitorios antiguos antes de reintentar.
- Las escrituras auxiliares de `localStorage` usadas por acciones de la app pasan por el guardado seguro para evitar que un error de cuota corte un click.
- Se conserva la sincronización Firestore V2 por bloques de v172.
- Auditoría estática de handlers inline: no se detectaron referencias personalizadas faltantes; `_syncConfirmFn` es dinámica por diseño.

## Archivos modificados

- `index.html`

## Módulos no modificados funcionalmente

- Cálculo de lectura y KPIs.
- Inventario y sus estadísticas.
- Gephi / Influencias.
- Línea de tiempo histórica.
- Rutas de lectura.
- Películas, series, discos y mangas, salvo la capa común de persistencia al guardar.
- Autenticación y modelo Firestore V2.

## Validaciones realizadas

- Sintaxis de todo el JavaScript embebido validada con `node --check`.
- Confirmación de versión visible `v173`.
- Auditoría de 206 referencias de funciones usadas por eventos inline (`onclick`, `onchange`, `oninput`, etc.).
- Confirmación de que las escrituras directas de `localStorage` fuera de la capa segura fueron eliminadas.
- Confirmación de que `saveDB()` devuelve sin lanzar `QuotaExceededError` y mantiene el intento de sincronización V2.
- ZIP verificado con `index.html` y `README.md`.

## Pruebas sugeridas

1. Abrir v173 en el iPhone y esperar unos segundos para que ejecute la migración local de portadas.
2. Abrir una lectura en curso, cambiar la página y pulsar **Guardar**. Debe guardar y cerrar el modal.
3. Repetir con **Terminé** en un libro de prueba o cuando corresponda.
4. Editar una nota y guardar; el modal debe cerrarse normalmente.
5. Editar Historia desde su acceso rápido y guardar.
6. Marcar/desmarcar Inventario desde Biblioteca.
7. Probar una edición de película/serie y una actualización de manga si existen registros disponibles.
8. Verificar que ya no aparezca `The quota has been exceeded` durante estos guardados.
9. Pulsar **Guardar en nube** y luego cargar desde el computador para confirmar persistencia entre dispositivos.
