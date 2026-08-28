# LUMEN v196 — Inferencia y normalización asistida

Base: LUMEN v194 modular.

## Cambios
- `MetadataInferenceEngine`: propone metadatos faltantes sin sobrescribir datos existentes.
- Inferencia de idioma original desde la taxonomía (p. ej. tradición Chilena → Español) y desde consenso Autor + Género.
- Inferencia asistida de tradición, período/corriente y generación para Poesía a partir de obras del mismo autor y género.
- `Normalizar → Libros` pasa a ser una bandeja única con completitud bibliográfica, sugerencias con confianza/procedencia y propagaciones seguras.
- Propagación masiva asistida por Autor + Género: solo completa campos vacíos y solo aparece con consenso total entre las fuentes conocidas.
- Las inferencias aplicadas guardan procedencia y confianza en `metadataProvenance`; los datos explícitos existentes nunca se reemplazan.
- El mismo importador `lumen_bibliografia_import_v1` se mantiene como fuente bibliográfica; no se crea un segundo importador.

## Política
LUMEN propone; el usuario confirma. Las sugerencias de alta confianza pueden aplicarse en lote desde Normalizar, siempre sin pisar valores existentes.

## Auditoría
Ver `AUDIT_v196.md` y `AUDIT_v196.json` para continuidad v194 → v196.
