# LUMEN v177 — acciones y persistencia desacopladas

Base: v176 entregada por el usuario.

## Corrección crítica
- Se eliminó del `saveDB()` común la normalización masiva de todos los libros y la reconstrucción/normalización de todos los mapas.
- El guardado local usa directamente el snapshot liviano y mueve portadas base64 a IndexedDB en segundo plano; ya no intenta primero guardar una copia completa pesada en `localStorage`.
- Firebase V2 queda desacoplado del cierre de modales: la sincronización se agenda en segundo plano y un fallo de nube no impide guardar/cerrar una acción local.
- Se agregó `lumenSafeAction()` como cortafuego común para las acciones persistentes principales.
- Se protegieron explícitamente: Guardar progreso, Terminé, Empezar a seguir, notas, ficha general, Historia rápida, progreso de series, influencias, rutas y editor de elenco.
- `saveMapas()` ya no normaliza toda la red en cada click; las relaciones se normalizan al crearse/editarse.
- Se agregaron trazas globales de errores y promesas no controladas para que un fallo no vuelva a parecer un botón muerto.

## Qué no cambia
- Modelo de sincronización Firebase V2 por bloques.
- Modelo canónico de autores/editoriales/traductores y JSON bibliográfico.
- Inventario, Historia, Gephi, métricas, hábitos, películas, series, mangas y discos.

## Pruebas prioritarias
1. Abrir un libro en lectura y usar **Actualizar → Guardar**; el modal debe cerrar inmediatamente y el progreso debe verse en Inicio.
2. Repetir con **Terminé**.
3. Crear una **Lectura en curso** y pulsar **Empezar a seguir**.
4. Guardar una nota, Historia rápida, una influencia y una ruta.
5. Guardar en nube y cargar desde otro dispositivo para confirmar que los cambios sobreviven.
6. En Safari/iPhone, confirmar que no reaparece `QuotaExceededError` al guardar progreso.
