# TP 4: Despliegue en Contenedores (`docker-compose.yml`)

## 1. Servicios orquestados (6 servicios en red `cinetrack-net`)

1. **`postgres` (`postgres:16-alpine`, puerto `5432`):** base relacional de Django con healthcheck `pg_isready`.
2. **`mongo` (`mongo:7`, puerto `27017`):** base documental de Node.js (`PersonalNote`) con healthcheck `mongosh ping`.
3. **`django-backend` (`backend-django/Dockerfile`, puerto `8000`):** API REST, JWT, GraphQL y `/api/docs/`.
4. **`service-ai` (`service-ai/Dockerfile`, puerto `8002`):** FastAPI `POST /ai/recommend` (`GROQ_MODEL=${GROQ_MODEL:-llama-3.1-8b-instant}`).
5. **`node-backend` (`backend-node/Dockerfile`, puerto `5000`):** Express + Mongoose (`MONGODB_URI`) + GraphQL (`publicMediaDetails`).
6. **`frontend` (`frontend/Dockerfile`, puerto `5173`):** React 19 + Vite 8.

## 2. Arranque reproducible
```bash
cp .env.example .env
# Configurar DB_PASSWORD, SECRET_KEY y JWT_SIGNING_KEY en .env
docker compose up --build
```
