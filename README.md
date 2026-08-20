# LUMEN v175 — Influencias canónicas y ficha bibliográfica JSON

**Fecha:** 19 de agosto de 2026  
**Base:** LUMEN v174

## Cambios aplicados

### 1. Autores canónicos en Influencias
- Los autores usados en Biblioteca e Influencias quedan disponibles en un selector reutilizable.
- Un autor nuevo puede escribirse libremente la primera vez; al guardarse queda cristalizado con un `authorId` canónico.
- Al editar una influencia se puede escoger otro autor canónico y volver a vincular la relación sin crear otro nodo.
- Coincidencias normalizadas altas solicitan confirmación antes de crear una entidad nueva.
- Umbral base: 90% de similitud normalizada. También se reconoce de forma estricta una variante breve del nombre cuando el apellido coincide exactamente, útil para transliteraciones como `Lev Tolstói` / `León Tolstói`.
- Las variantes confirmadas quedan guardadas como alias del autor canónico.
- El grafo de Influencias ahora construye los nodos usando `authorId`, no solamente el texto visible del nombre.

### 2. Importador JSON de influencias
- Se corrigió la lectura de `evidencia.pagina`.
- Se corrigió la lectura de `evidencia.texto`.
- Se añadió soporte para `evidencia.loc` y `evidencia.capitulo`.
- El libro destino se resuelve contra la ficha canónica de Biblioteca usando título + autor.
- Editorial, año de edición, ciudad y edición se obtienen desde la ficha del libro cuando existe.
- La vista previa avisa cuando la ficha bibliográfica del libro destino está incompleta.

### 3. Referencia ISO visible
- El detalle de una influencia muestra la referencia ISO 690 generada desde la ficha canónica del libro leído.
- Página, LOC o capítulo quedan incorporados a la referencia.
- La lista de relaciones muestra de forma más visible la ubicación de la evidencia.
- La relación puede guardarse aunque la ficha bibliográfica esté incompleta; queda visible la advertencia para completarla después.

### 4. Ficha bibliográfica JSON
- En `Biblioteca → Editar libro` se agregó **📥 Cargar JSON bibliográfico**.
- El importador acepta `lumen_ficha_bibliografica_v1`.
- Antes de aplicar, muestra una comparación entre datos actuales y datos nuevos.
- Se guardan por separado:
  - datos de la edición consultada;
  - datos históricos/originales de la obra;
  - historial de ediciones.
- Si existe un período original de dos años, el año principal de publicación original usa el año inicial/más antiguo.
- Se incorporan ISBN, ciudad, colección, número/descripción de edición, traductores, prólogo, introducción, notas e impresor cuando vienen en el JSON.

### 5. Editoriales y traductores canónicos
- Editoriales y traductores también reciben IDs canónicos reutilizables.
- Las coincidencias altas pueden confirmarse antes de crear una nueva entidad.
- Las variantes confirmadas quedan como alias.
- Los catálogos canónicos se incluyen en la sincronización V2 por bloques.

## Modelo bibliográfico v1

```json
{
  "schema": "lumen_ficha_bibliografica_v1",
  "libro": {
    "titulo": "",
    "autor": "",
    "obra_original": {
      "titulo_original": "",
      "idioma_original": "",
      "anio_publicacion_original": null,
      "periodo_inicio": null,
      "periodo_fin": null
    },
    "edicion_consultada": {
      "editorial": "",
      "ciudad": "",
      "pais": "",
      "anio": null,
      "mes": "",
      "numero_edicion": null,
      "descripcion_edicion": "",
      "isbn": "",
      "coleccion": "",
      "traductores": [],
      "prologo": [],
      "introduccion": [],
      "notas": [],
      "impresor": ""
    },
    "historial_ediciones": [
      {
        "numero": null,
        "mes": "",
        "anio": null
      }
    ]
  }
}
```

## Prompt recomendado para generar el JSON desde fotos

Usar este texto en el chat junto con las fotografías de la página legal, créditos, portada o páginas editoriales del libro:

> Analiza estas fotografías de un libro y genera **solo un JSON válido**, sin explicación adicional, usando el schema `lumen_ficha_bibliografica_v1` que aparece abajo.  
>  
> Reglas:  
> 1. No inventes información. Si un dato no aparece o no puede leerse con seguridad, usa `null`, `""` o `[]` según corresponda.  
> 2. Distingue estrictamente entre la **edición que estoy leyendo** y la **fecha histórica/original de la obra**.  
> 3. `edicion_consultada.anio` corresponde al año de esta edición/ejemplar.  
> 4. `obra_original.anio_publicacion_original` corresponde a la primera publicación histórica de la obra, solo si las fotografías permiten determinarla.  
> 5. Si la obra o volumen cubre un rango de publicación, guarda `periodo_inicio` y `periodo_fin` y usa el año más antiguo como `anio_publicacion_original`.  
> 6. Conserva todos los traductores visibles como elementos separados de `traductores`.  
> 7. Registra todas las ediciones explícitamente indicadas en `historial_ediciones`.  
> 8. Normaliza solo espacios y errores evidentes de lectura; conserva los nombres editoriales y personales tal como aparecen en la fuente. LUMEN se encargará después de la normalización canónica.  
> 9. ISBN debe conservar guiones si aparecen impresos.  
> 10. No deduzcas ciudad, país, traductor, año original ni número de edición por conocimiento externo.
>
> ```json
> {
>   "schema": "lumen_ficha_bibliografica_v1",
>   "libro": {
>     "titulo": "",
>     "autor": "",
>     "obra_original": {
>       "titulo_original": "",
>       "idioma_original": "",
>       "anio_publicacion_original": null,
>       "periodo_inicio": null,
>       "periodo_fin": null
>     },
>     "edicion_consultada": {
>       "editorial": "",
>       "ciudad": "",
>       "pais": "",
>       "anio": null,
>       "mes": "",
>       "numero_edicion": null,
>       "descripcion_edicion": "",
>       "isbn": "",
>       "coleccion": "",
>       "traductores": [],
>       "prologo": [],
>       "introduccion": [],
>       "notas": [],
>       "impresor": ""
>     },
>     "historial_ediciones": []
>   }
> }
> ```

## Archivos modificados
- `index.html`
- `README.md`

## Módulos no modificados
- Autenticación / login.
- Arquitectura Firebase V2 por bloques.
- Inventario y ratio de lectura.
- Línea de tiempo histórica.
- Rutas de lectura.
- Películas, series, discos y mangas.
- Métricas de Inicio y Hábitos.

## Validaciones realizadas
- Revisión de sintaxis de todos los scripts JavaScript embebidos con `node --check`.
- Confirmación de versión visible `v175`.
- Confirmación de existencia del modal de JSON bibliográfico y botón en ficha de libro.
- Confirmación de soporte para `evidencia.pagina`, `evidencia.texto`, `evidencia.loc` y `evidencia.capitulo`.
- Confirmación de construcción del grafo por IDs canónicos de autor.
- Confirmación de inclusión de catálogos canónicos en sincronización V2.

## Pruebas sugeridas
1. Editar una influencia que diga `Lev Tolstói` y seleccionar el autor canónico existente correspondiente. Guardar y confirmar que el grafo usa un solo nodo.
2. Importar el JSON de ejemplo con `evidencia.pagina: "723"` y verificar que aparece `p. 723` y el texto citado.
3. Abrir el detalle de la relación y comprobar que aparece la referencia ISO 690.
4. Editar un libro, cargar un JSON bibliográfico y revisar la comparación antes de aplicar.
5. Guardar en nube y cargar desde otro dispositivo para comprobar que autores/editoriales/traductores canónicos se conservan.
