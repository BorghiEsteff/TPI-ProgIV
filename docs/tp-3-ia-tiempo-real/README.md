# TP 3: Microservicio de Recomendaciones IA y Optimización

## Estado vigente en `main`
- **Microservicio IA (`service-ai/`, puerto `8002`):** FastAPI + Pydantic v2 exponiendo `POST /ai/recommend` (consumido por `backend-node`).
  - **Modelo por defecto:** `openai/gpt-oss-20b` en `service-ai/services/recommender.py` (`DEFAULT_GROQ_MODEL`), mientras que `docker-compose.yml` fija `llama-3.1-8b-instant` si no se define `GROQ_MODEL`.
  - **Fallback determinista:** ante ausencia o error de `GROQ_API_KEY`, responde `degraded: true` filtrando exclusivamente sobre el catálogo publicado (`is_active=True`), con soporte de historial acotado y protección contra *prompt injection*.
- **Tiempo Real (WatchRooms / Socket.IO):** retirado de la UI activa y del alcance de producción para priorizar el diario privado (ver documento histórico [tiempo-real-ia.md](tiempo-real-ia.md)).

Ver el detalle de esquemas y benchmarking en [reporte-ia-optimizacion.md](reporte-ia-optimizacion.md).
