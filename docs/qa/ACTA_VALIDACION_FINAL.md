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
| **Playwright E2E (`db.qa.sqlite3` + `cinetrack_qa`)** | `npx playwright test --reporter=list` | **41 passed, 3 failed** en 4.6 m (**22/22 `chromium-desktop`**, **19/22 `chromium-mobile`**; incluye `10-floating-ai-clapper.spec.js` en verde en ambos viewports) | PARCIAL (3 fallos en móvil) |
| **Benchmark Django (`benchmark_queries`)** | `SQLITE_DB_NAME=db.qa.sqlite3` (SQLite QA) y `postgres:16-alpine` (PG16) | SQLite QA: 13.59 ms (4 SQL) / 2.19 ms (1 SQL). PG16: `Index Scan using catalog_mediaitem_media_type_87b4bd2e_like` (0 N+1) | PASS |
| **Regeneración OpenAPI Django** | `.\venv\Scripts\python.exe manage.py spectacular --format openapi-json --file ..\docs\tp-4-contenedores-despliegue\openapi-django.json` | Salida `0`, `Errors: 0` (19 warnings de type hints en serializers/views) | PASS |
| **Validación y Build Docker Compose** | `docker compose --env-file .env.example config --quiet` y `docker compose build --no-cache` | Salida `0` en ambos; 4 imágenes construidas (`frontend`, `node-backend`, `service-ai`, `django-backend`) | PASS |

---

## 2. Detalle de fallos y bloqueos observados

### 2.1 Playwright E2E (`chromium-mobile`, 3 fallos de 44 totales)
En la corrida completa sobre `db.qa.sqlite3` + `cinetrack_qa` sin reinicializar entre desktop y móvil:
1. `[chromium-mobile] › e2e\specs\03-private-diary.spec.js:7:3` (`E2E-07..E2E-13`).
2. `[chromium-mobile] › e2e\specs\04-submissions-moderation-matrix.spec.js:10:3` (`Matrix E2E irrenunciable`).
3. `[chromium-mobile] › e2e\specs\08-categories-and-visual-qa.spec.js:9:3` (`GEN-E2E-01..09`, espera `/publicada como obra #/i`).

Los 22 casos de `chromium-desktop` (incluido `10-floating-ai-clapper.spec.js`) y 19 de 22 casos de `chromium-mobile` (incluido `10-floating-ai-clapper.spec.js` móvil) pasaron en esa misma ejecución.

### 2.2 Bloqueos de infraestructura local (fuera del código)
1. **PostgreSQL 18 local:** el servicio `postgresql-x64-18` de Windows rechaza la contraseña configurada en `backend-django/.env` para `cinetrack_user` (validación real de PostgreSQL ejecutada y aprobada contra contenedor `postgres:16-alpine` en Docker).
2. **Protección de rama `main` en GitHub:** requiere configuración directa en GitHub (`Settings > Branches`) con credenciales de propietario del repositorio (`gh` CLI no instalado).
