# Auditoría LUMEN v194

Base: **v193 modular**.

- Funciones declaradas: 707 → 725; eliminadas: 0.
- Variables detectadas: 1372 → 1384; eliminadas: 0.
- IDs DOM únicos: 640 → 646; eliminados: 0; duplicados: 3.
- Handlers onclick únicos: 179 → 179; eliminados: 0.

## Cambios
- TaxonomyRegistry facetado canónico para idioma, tradición, período/corriente, generación/grupo y líneas históricas.
- Alias y deduplicación por etiqueta normalizada; Inglesa conserva Anglófona como alias.
- Idioma original participa como faceta y puede relacionar tradición, período y generación.
- Recopilación/antología pasa a `collectionMetadata` transversal para Cuento y Poesía, conservando `cuentos` como espejo legacy cuando corresponde.
- Poesía recopilatoria usa período real de las obras para afinidad temporal de Descubrir; fallback por ciclo vital solo cuando se solicita y no es antología multi-autor.
- Historia multilínea de v193 se conserva.
