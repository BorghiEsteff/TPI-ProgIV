# Resumen Node.js — Proxy de Recomendaciones IA

> **Nota:** Este documento resume el alcance de `backend-node/` en esta rama. El reporte integral multi-servicio y las capturas de interfaz residen en `main` (`docs/qa/QA_CHAT_FLOTANTE_IA_CLAQUETA_2026-11-19.md` y `docs/qa/ACTA_VALIDACION_FINAL.md`).

## Alcance en `backend-node/`
* Ruta protegida por JWT y *rate limiting* por usuario: `POST /api/v1/recommendations` (`src/routes/recommendationRoutes.js`, `src/controllers/recommendationController.js`).
* Consulta catálogo publicado en Django, delega inferencia a `service-ai` (`POST /ai/recommend`), revalida IDs y propaga `X-Degraded-AI: true` / `degraded: true` en modo fallback.
* Suite asociada: `backend-node/tests/recommendations.test.js`.
