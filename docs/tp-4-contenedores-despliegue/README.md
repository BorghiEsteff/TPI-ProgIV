# TP 4: OpenAPI 3.0, GraphQL y Despliegue Multi-Servicio

## Artefactos vigentes en `main`
- **Contratos OpenAPI 3.0:**
  - Django (27 rutas): [openapi-django.json](openapi-django.json)
  - Node.js (notas privadas, recomendaciones, `/health`, `/graphql`, `/api/v1/reviews` 410): [openapi.json](openapi.json)
- **GraphQL:**
  - Django (`/graphql/`): `allMediaItems`, `mediaItemById`.
  - Node.js (`/graphql`): `publicMediaDetails`.
- **Orquestación (`docker-compose.yml`):** 6 servicios (`postgres`, `mongo`, `django-backend`, `node-backend`, `service-ai`, `frontend`).
- **CI/CD (`.github/workflows/ci.yml`):** pipeline configurado para Django (PostgreSQL 16), FastAPI, Node.js y Frontend (Vitest + Build).

Ver topología y arranque en [despliegue-contenedores.md](despliegue-contenedores.md).
