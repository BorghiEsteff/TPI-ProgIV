# TP 0 — Mapa Tecnológico (Propuesta Inicial vs As-Built en `main`)

| Capa | Propuesta inicial (TP 0) | Estado vigente *as-built* (`main`) |
| :--- | :--- | :--- |
| **Frontend** | SPA React + Vite | React 19 + Vite 8 (`frontend/`): catálogo público, diario privado, propuestas, moderación y asistente flotante IA con claqueta |
| **Backend Central** | Django + DRF + PostgreSQL (3 roles: `ADMIN`, `CRITIC`, `USER`) | Django 6.1.2 + DRF + SimpleJWT + Graphene (`backend-django/`) con **2 roles (`ADMIN`, `USER`)**, catálogo, propuestas/conciliación y tracking |
| **Backend Complementario** | Node.js + MongoDB (reseñas públicas y WatchRooms Socket.IO) | Node.js 20 + Express + Mongoose (`backend-node/`): **notas personales privadas (`PersonalNote`)**, proxy IA y `publicMediaDetails` (`/api/v1/reviews` -> `410 Gone`) |
| **Microservicio IA** | FastAPI + Ollama local (`review-guard` spoilers) | FastAPI (`service-ai/`): `POST /ai/recommend` con Groq Cloud (`openai/gpt-oss-20b` en código / `llama-3.1-8b-instant` en Compose) y fallback determinista |
| **Contenedores y CI** | Docker Compose básico | `docker-compose.yml` (6 servicios) + `.github/workflows/ci.yml` |
