# Resumen `service-ai` — Recomendaciones IA (`POST /ai/recommend`)

> **Nota:** Este documento resume el alcance exclusivo de `service-ai/` en esta rama. El reporte integral multi-servicio y las capturas de interfaz residen en `main` (`docs/qa/QA_CHAT_FLOTANTE_IA_CLAQUETA_2026-11-19.md` y `docs/qa/ACTA_VALIDACION_FINAL.md`).

## Contrato y pruebas en `service-ai/`
* Endpoint activo: `POST /ai/recommend` y `GET /health` (`service-ai/main.py`, `schemas.py`, `services/recommender.py`).
* Modelo predeterminado en código: `DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"` (con fallback determinista cuando falta `GROQ_API_KEY` o falla Groq).
* Suite asociada: `service-ai/tests/test_recommend.py` (9 pruebas).
