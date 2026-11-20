# Despliegue en Contenedores — `backend-node`

Esta rama incluye únicamente `backend-node/Dockerfile` (imagen `node:20-alpine` con usuario no privilegiado `node`). La orquestación integral de los 6 servicios (`docker-compose.yml`) reside en `main`.

## Variables de entorno del contenedor
* `PORT=5000`
* `NODE_ENV=production`
* `MONGODB_URI` (nota: en `main:docker-compose.yml` ya está unificada como `MONGODB_URI`)
* `JWT_SIGNING_KEY` (compartida con Django)
* `DJANGO_API_URL`, `AI_SERVICE_URL`, `CLIENT_ORIGIN`

## Endpoints activos expuestos
* `GET /health`
* `GET/PUT/DELETE /api/v1/personal-notes/*`
* `POST /api/v1/recommendations`
* `POST /graphql` (`publicMediaDetails`)
* `/api/v1/reviews` -> `410 Gone`
