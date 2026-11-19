# CineTrack — Rama Especializada `backend-django` (Python: Django + FastAPI IA)

Esta rama contiene una instantanea selectiva y no destructiva desde `main` (`7b7c1712bd3c31e5493ccc414e5f88f3582d5950`) enfocada exclusivamente en el frente Python del ecosistema CineTrack:

- **`backend-django/`**: API REST (DRF), GraphQL (`graphene-django`), OpenAPI 3.0 (`drf-spectacular`), autenticacion centralizada SimpleJWT (`HS256`), catalogo relacional (`MediaItem`, `Genre`, `Season`, `Episode`, `MediaSubmission`), diario privado (`UserProgress`) y conciliacion de duplicados.
- **`service-ai/`**: Microservicio independiente en FastAPI + Pydantic + Groq (`openai/gpt-oss-20b` con fallback determinista) para recomendaciones sobre el catalogo publicado (`POST /ai/recommend`).
- **`docs/backend-django/`** y **`docs/service-ai/`**: Copias de referencia de la documentacion, contratos OpenAPI y reportes QA pertinentes a este frente (la documentacion integral completa permanece en `main`).

## Dependencias Externas y Contratos

- **Base de datos relacional:** PostgreSQL 16 (o SQLite local para desarrollo/QA mediante `DB_ENGINE=django.db.backends.sqlite3`).
- **Consumidores externos:**
  - `backend-node` verifica los tokens JWT emitidos por Django (`JWT_SIGNING_KEY` compartido), consulta `/api/v1/media/` y `/api/v1/tracking/verify-ownership/`, y consume `POST http://localhost:8002/ai/recommend`.
  - `frontend` consume la API REST (`/api/v1/`), GraphQL (`/graphql/`) y OpenAPI (`/api/docs/`).
- **Restriccion de merge:** No fusionar esta rama completa hacia `main` (contiene unicamente el frente Python). Integrar cambios puntuales mediante cherry-pick o rutas especificas.

## Ejecucion de Pruebas

```bash
# Backend Django
cd backend-django
python -m pytest -q

# Microservicio IA (FastAPI)
cd ../service-ai
python -m pytest -q
```
