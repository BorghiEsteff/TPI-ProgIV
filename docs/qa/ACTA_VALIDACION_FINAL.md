# Acta Única de Validación Final — CineTracker / CineTrack

**Fecha:** 19/11/2026  
**Rama:** `main`  
**Entorno:** Windows (PowerShell), Python 3.14.7, Django 6.1.2, Node.js v24.16.0, npm 11.13.0, MongoDB Server (activo en `127.0.0.1:27017`), PostgreSQL Server 18 (`postgresql-x64-18` activo en `5432`).

---

## 1. Resumen de ejecuciones reales

| Suite / Verificación | Comando ejecutado | Resultado exacto | Estado |
| :--- | :--- | :--- | :--- |
| **Backend Django (SQLite)** | `DB_ENGINE=django.db.backends.sqlite3 .\venv\Scripts\python.exe -m pytest -v` | **29 passed** en 50.34 s (0 fallos, 0 omitidos) | PASS |
| **Backend Django (PostgreSQL 16 Docker)** | `postgres:16-alpine` + `migrate` + `DB_ENGINE=django.db.backends.postgresql .\venv\Scripts\python.exe -m pytest -v` | **29 passed** en 52.80 s (0 fallos, 0 omitidos) | PASS |
| **Backend Django (PostgreSQL 18 local)** | `DB_ENGINE=django.db.backends.postgresql .\venv\Scripts\python.exe -m pytest -v` | **29 errors** (`FATAL: la autentificación password falló para el usuario «cinetrack_user»`) | BLOCKED (credenciales PG locales) |
| **Microservicio IA (`service-ai`)** | `.\venv\Scripts\python.exe -m pytest -v` | **9 passed** en 1.78 s (cubre health, fallback sin clave, error/JSON inválido de Groq, anti-alucinación, prompt injection e historial) | PASS |
| **Prueba live Groq (`POST /ai/recommend`)** | `Invoke-RestMethod http://127.0.0.1:8002/ai/recommend` con `GROQ_API_KEY` configurada | HTTP 200 con `degraded: false` | PASS |
| **Backend Node.js (`backend-node`)** | `npm test` | **6 suites, 25 passed** en 18.203 s (`auth`, `personalNote`, `recommendations`, `review`, `graphql`, `realtime`) | PASS |
| **Frontend Unitario (Vitest)** | `npm test` | **7 archivos, 24 passed** en 10.32 s | PASS |
| **Frontend Build (Vite)** | `npm run build` | `438 modules transformed`, `built in 1.17 s` (`dist/`) | PASS |
| **Playwright E2E (`db.qa.sqlite3` + `cinetrack_qa`)** | `npx playwright test --reporter=list` + reejecución aislada `--project=chromium-mobile` | **22/22 `chromium-desktop`** + **19/22 `chromium-mobile`** en corrida compartida; los 3 specs móviles (`03`, `04`, `08`) pasaron **6/6** (57.7 s) al aislar `db.qa.sqlite3` | PASS (aislando BD QA) |
| **Benchmark Django (`benchmark_queries`)** | `SQLITE_DB_NAME=db.qa.sqlite3` (SQLite QA) y `postgres:16-alpine` (PG16) | SQLite QA: 13.59 ms (4 SQL) / 2.19 ms (1 SQL). PG16: `Index Scan using catalog_mediaitem_media_type_87b4bd2e_like` (0 N+1) | PASS |
| **Regeneración OpenAPI Django** | `.\venv\Scripts\python.exe manage.py spectacular --format openapi-json --file ..\docs\tp-4-contenedores-despliegue\openapi-django.json` | Salida `0`, `Errors: 0` (19 warnings de type hints en serializers/views) | PASS |
| **Docker Compose completo (6 servicios)** | `docker compose build --no-cache` + `docker compose up -d` | **6 contenedores levantados** (`postgres`, `mongo`, `service-ai`, `django-backend`, `node-backend`, `frontend`) con healthchecks en verde y `HTTP 200` en `:8000`, `:5000`, `:8002`, `:5173` | PASS |

---

## 2. Detalle de fallos y bloqueos observados

### 2.1 Playwright E2E (`chromium-mobile`)
En la corrida conjunta sin reinicializar la base entre proyectos, 3 casos de `chromium-mobile` (`03-private-diary.spec.js`, `04-submissions-moderation-matrix.spec.js` y `08-categories-and-visual-qa.spec.js`) fallaron por estado residual de la corrida desktop. Al reinicializar `db.qa.sqlite3` y `cinetrack_qa` y reejecutar esos 3 archivos con `--project=chromium-mobile`, pasaron **6/6 en 57.7 s**.

### 2.2 Hallazgo corregido durante la validación Docker Compose
* `backend-django/catalog/management/commands/seed_data.py` mantenía una referencia obsoleta a `User.Role.CRITIC`, lo que impedía completar el arranque inicial del contenedor `cinetrack_django`. Se corrigió a `User.Role.USER` y se verificó el arranque completo de los 6 servicios.

### 2.3 Pendientes externos fuera de código
1. **Protección de rama `main` en GitHub:** requiere configuración directa en GitHub (`Settings > Branches`) con credenciales de propietario del repositorio.
