# TP 3: Reporte Técnico de IA (`POST /ai/recommend`) y Optimización SQL

## 1. Contrato vigente en `service-ai/` (`schemas.py` y `services/recommender.py`)
- **Endpoint:** `POST /ai/recommend` (y `GET /health`). El antiguo `/ai/review-guard` fue retirado junto con las reseñas públicas.
- **`RecommendRequest`:** `prompt` (str), `catalog` (`List[CandidateMedia]`), `history` (`List[HistoryMessage]`, acotado), `limit` (máx. 3).
- **`RecommendResponse`:** `message` (str, máx. 320 chars), `recommendations` (`List[RecommendationItem]`, máx. 3 con `reason` máx. 160 chars), `degraded` (bool).
- **Garantías:** revalidación estricta de IDs contra `catalog` (cero títulos inventados), rechazo de *prompt injection* y fallback determinista cuando falta `GROQ_API_KEY` o Groq devuelve error/JSON inválido.
- **Modelo Groq:** `DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"` en `recommender.py`; `docker-compose.yml` define `GROQ_MODEL=${GROQ_MODEL:-llama-3.1-8b-instant}`.

## 2. Optimización SQL y erradicación de N+1 en `backend-django/`
- **Índices:** `media_type_active_idx`, `media_date_title_idx`, `media_norm_type_idx`, `sub_status_created_idx`, `sub_norm_type_idx`.
- **Consultas optimizadas:** `prefetch_related("genres", "seasons__episodes")` en `MediaItemViewSet` y `select_related("media_item")` en `UserProgressViewSet`.
- **Benchmark verificado (`manage.py benchmark_queries`):** SQLite QA en 13.59 ms (4 SQL) y 2.19 ms (1 SQL); PostgreSQL 16 Docker con `Index Scan` sin N+1 (ver [ACTA_VALIDACION_FINAL.md](../qa/ACTA_VALIDACION_FINAL.md)).
