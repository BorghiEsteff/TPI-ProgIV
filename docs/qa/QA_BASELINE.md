# CineTrack — QA Baseline (Fase 0)

**Fecha:** 2026-11-13  
**Rama local:** `feature/frontend-cinetrack`  
**Commit base (HEAD):** `e8f5abad2a718842806f93e5c7b347e6ddd87301`  
**Respaldo BD desarrollo:** `backend-django/backups/db.sqlite3.baseline.bak` (4 usuarios, 3 MediaItem, 5 Genre, 2 Season, 6 Episode, 1 UserProgress)

---

## Entorno Local Detectado

| Componente | Estado / Versión | Observaciones |
|---|---|---|
| OS | Windows | PowerShell |
| Node / npm | `v24.16.0` / `11.13.0` | Operativo |
| Python (venvs) | `3.14.7` en `backend-django/venv` y `service-ai/venv` | Operativo |
| PostgreSQL 18 (local port 5432) | Servicio `postgresql-x64-18` Running | Rechaza credenciales `.env` (`cinetrack_user`), no se modifica servicio del sistema |
| Docker Desktop | `Docker 29.9.3` instalado, daemon apagado | `docker compose config` válido; contenedores no levantados |
| MongoDB (local port 27017) | Servicio `MongoDB` Running | Conectividad verificada hacia BD aislada `cinetrack_qa` |
| `GROQ_API_KEY` (`service-ai/.env`) | Ausente / vacía | Se valida modo determinista; llamada real a Groq queda `NOT_RUN` |

---

## Matriz Inicial (Antes de Playwright E2E)

| Componente | Encontrado | Estado inicial | Evidencia | Deuda / Riesgo |
|---|---|---|---|---|
| `backend-django` | Modelos, permisos P1, `MediaSubmission`, `UserProgress`, migraciones `0002`/`0003` | Tests unitarios/integración SQLite OK (23 passed) | `pytest -q` | Constraints en PostgreSQL real pendientes (`BLOCKED` por credenciales PG/Docker apagado) |
| `backend-node` | `PersonalNote`, `/api/v1/recommendations`, `/api/v1/reviews` -> 410, GraphQL público | Tests Jest con mocks OK (21 passed) | `npm test` | Falta validación en vivo contra MongoDB `cinetrack_qa` + Django real |
| `service-ai` | `POST /ai/recommend` + fallback determinista | Tests FastAPI OK (4 passed) | `pytest -q` | Sin `GROQ_API_KEY` real |
| `frontend` | SPA React/Vite + páginas `NewEntry`, `MySubmissions`, `Recommendations`, `AdminSubmissions`, `AdminMediaEdit` | Vitest (15 passed) + Vite build OK | `npm test -- --run`, `npm run build` | Sin `@playwright/test` ni pruebas E2E en navegador real todavía |

---

## Aislamiento del Entorno QA

- **Django QA:** `DB_ENGINE=django.db.backends.sqlite3`, `SQLITE_DB_NAME=db.qa.sqlite3`, puerto `8000` (o puerto QA dedicado `8001` si `8000` estuviera ocupado; actualmente `8000`, `5000`, `8002`, `5173` están libres).
- **Node QA:** `MONGODB_URI=mongodb://127.0.0.1:27017/cinetrack_qa`, `DJANGO_API_URL=http://127.0.0.1:8000/api/v1`, `AI_SERVICE_URL=http://127.0.0.1:8002/ai`, puerto `5000`.
- **FastAPI QA:** puerto `8002`.
- **Frontend QA:** Vite dev server en `http://127.0.0.1:5173`.
