# Despliegue en Contenedores — `backend-django` y `service-ai`

Esta rama incluye los Dockerfiles individuales `backend-django/Dockerfile` y `service-ai/Dockerfile`. La orquestación global de los 6 servicios (`docker-compose.yml`) reside en `main`.

## Contenedores incluidos en esta rama
* **`backend-django/Dockerfile`:** Python 3.12 slim multi-stage bajo usuario no privilegiado `appuser` (puerto `8000`), expone REST (`/api/v1/`), OpenAPI (`/api/schema/`, `/api/docs/`) y GraphQL (`/graphql/`).
* **`service-ai/Dockerfile`:** Python 3.12 slim bajo usuario `aiuser` (puerto `8002`), ejecuta `uvicorn main:app` (`POST /ai/recommend`, `GET /health`).
