# CineTrack — Cierre Técnico, Auditoría Final y Validación Previa a PR

## 1. Identificación, Contexto Git y Variables
- **Fecha/hora de cierre:** 2026-11-13 22:48 (-03:00)
- **Workspace:** `c:\Proyecto-Programacion\TPI-ProgramacionIV`
- **Rama local:** `feature/frontend-cinetrack`
- **SHA `HEAD`:** `e8f5abad2a718842806f93e5c7b347e6ddd87301`
- **Remoto:** `origin https://github.com/BorghiEsteff/TPI-ProgIV.git`
- **Estado Git:** Working tree con cambios locales sin staging (`git diff --cached --stat` vacío), `0` commits creados, `0` pushes, `0` PRs abiertos. `git diff --check` limpio.
- **Stack:** `backend-django` (Django 6.1.2 + DRF + Graphene), `backend-node` (Express + Mongoose + GraphQL), `service-ai` (FastAPI + Groq SDK), `frontend` (React + Vite 8.3.8 + Vitest + Playwright).
- **Presencia de variables (sin exponer valores):**
  - `backend-django/.env`: `SECRET_KEY=PRESENT`, `DEBUG=SET`, `ALLOWED_HOSTS=SET`, `DB_NAME=SET`, `DB_USER=SET`, `DB_PASSWORD=PRESENT`, `DB_HOST=SET`, `DB_PORT=SET`, `JWT_SIGNING_KEY=PRESENT`, `CORS_ALLOWED_ORIGINS=SET`.
  - `service-ai/.env`: `PORT=SET`, `ENVIRONMENT=SET`, `GROQ_API_KEY=MISSING`, `GROQ_MODEL=SET`, `REQUEST_TIMEOUT_SECONDS=SET`.

## 2. Inventario Git y Riesgo del Diff

| Ruta | Motivo | Riesgo | Acción / Estado | Prueba |
|---|---|---|---|---|
| `.gitignore` | Excluir `db.qa.sqlite3`, `backups/`, `playwright-report/`, `test-results/`, `.env` | P2 | Auditado OK | `git status` |
| `backend-django/core/settings.py` | `SQLITE_DB_NAME` + `DB_STRICT`/`_EXPLICIT_PG` sin fallback silencioso a SQLite | P1 | Hardened y verificado | Check CLI `DB_PORT=5499` -> `postgresql` |
| `backend-django/core/urls.py` | Rutas `submissions`, `admin/submissions`, `tracking`, `media` | P1 | Auditado OK | `pytest -q` + Playwright |
| `backend-django/users/*` | Eliminación de rol `CRITIC`, migración `0002_migrate_critic_to_user` | P1 | Auditado OK | `test_auth.py`, `test_p1_security.py` |
| `backend-django/catalog/*` | `MediaSubmission`, `is_active`, moderación atómica, SSRF/SVG, GraphQL filtrado | P0 | Auditado OK | `test_p1_catalog_security.py`, `test_submissions_and_moderation.py`, Matrix E2E |
| `backend-django/tracking/*` | `UserProgress` único por `(user, media_item)` y `(user, source_submission)` | P0 | Auditado en SQLite (pendiente PG) | `test_tracking.py`, `03-private-diary.spec.js` |
| `backend-django/seed_qa.py` | Seeder idempotente restringido a `SQLITE_DB_NAME=db.qa.sqlite3` | P2 | Auditado OK | Ejecutado en QA |
| `backend-node/src/app.js` | `/api/v1/personal-notes`, `/api/v1/recommendations`, `/api/v1/reviews` -> `410`, CORS allowlist | P0 | Hardened (sin `'*'` en dev) | Jest + curl/fetch live |
| `backend-node/src/graphql/schema.js` | Solo `publicMediaDetails` público, sin notas privadas | P1 | Auditado OK | `graphql.test.js` + live POST `/graphql` |
| `backend-node/src/services/socketService.js` | JWT obligatorio y `watch_room_disabled` (`FEATURE_DISABLED`) | P1 | Auditado OK | `realtime.test.js` |
| `backend-node/src/controllers/personalNoteController.js`, `recommendationController.js`, `models/PersonalNote.js`, `routes/*`, `validators/*` | Notas privadas aisladas por `(userId, trackingEntryId)` y recomendaciones autenticadas | P0 | Auditado OK | `personalNote.test.js`, `recommendations.test.js`, Playwright E2E |
| `service-ai/main.py`, `schemas.py`, `services/recommender.py`, `tests/test_recommend.py` | `POST /ai/recommend` filtrado por catálogo + fallback determinista | P1 | Hardened (test de fallos Groq) | `pytest -q` (`5 passed`) |
| `frontend/src/pages/*`, `components/*`, `services/*`, `App.jsx` | Diario privado, propuestas, moderación admin, chat IA, fix P0 `MyTrackingPage` -> `SecondsInputControl`, limpieza `Sala en Vivo` en `MediaCard` y `LoginPage` | P0 | Corregido y verificado | Vitest `15/15`, Vite build, Playwright `16/16` x2 |
| `frontend/package.json`, `package-lock.json`, `vite.config.js`, `playwright.config.js`, `frontend/e2e/*` | Suite Playwright (`chromium-desktop`, `chromium-mobile`) y config Vitest | P2 | Auditado OK | Playwright `chromium-desktop` y `chromium-mobile` |
| `docs/qa/*` | Documentación QA, matriz, bugs y cierre pre-PR | P2 | Auditado OK | Evidencias verificables en workspace |
| `Equipo/Guia_Arquitectura_CineTrack.pdf`, `IMPLEMENTATION_STATUS.md` | Documentación de arquitectura/estado | P3 | Untracked, revisar antes de commit | Inspección |

**Riesgos abiertos:**
- **P0 (Entorno):** PostgreSQL real `BLOCKED` (sin ejecución contra motor PostgreSQL).
- **P1/P2 (Entorno):** `GROQ_API_KEY` ausente (`NOT_RUN` llamada remota real a Groq).

## 3. Entorno de Prueba Ejecutado
- **Django QA (`127.0.0.1:8000`):** `DB_ENGINE=django.db.backends.sqlite3`, `SQLITE_DB_NAME=db.qa.sqlite3`.
- **Node QA (`127.0.0.1:5000`):** `MONGODB_URI=mongodb://127.0.0.1:27017/cinetrack_qa`, `CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173`.
- **FastAPI QA (`127.0.0.1:8002`):** `GROQ_API_KEY=""` (modo determinista).
- **Frontend QA (`127.0.0.1:5173`):** Vite dev server.

## 4. Auditoría PostgreSQL REAL
- **Estado:** **BLOCKED**.
- **Diagnóstico:** El servicio Windows `postgresql-x64-18` está en ejecución (`Running`), pero rechaza las credenciales configuradas en `backend-django/.env` para `cinetrack_user` (`psycopg2.connect` falla con error de autenticación). Adicionalmente, el daemon de Docker Desktop está detenido (`//./pipe/dockerDesktopLinuxEngine` no disponible).
- **Hardening aplicado:** Se actualizó [settings.py](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/backend-django/core/settings.py#L85-L115) con `DB_STRICT` / `_EXPLICIT_PG`: cuando se solicita PostgreSQL explícitamente (`DB_ENGINE=django.db.backends.postgresql` o `DB_STRICT=1`), Django **ya no** hace fallback silencioso a SQLite (verificado conectando a puerto `5499` -> `ENGINE: django.db.backends.postgresql`).
- **Acción de desbloqueo:** Iniciar Docker Desktop para levantar un contenedor PostgreSQL QA descartable, o proveer credenciales válidas de un usuario/BD QA en `postgresql-x64-18`, y ejecutar los comandos de la Sección 2 de `docs/qa/QA_REPRODUCCION_FINAL.md`.

## 5. FastAPI y Groq REAL vs Modo Limitado
| Prueba | Modo | HTTP | Resultado funcional | Estado |
|---|---|---|---|---|
| Llamada real a `api.groq.com` | `GROQ_REAL` | N/A | `GROQ_API_KEY` ausente en `service-ai/.env` | **NOT_RUN** |
| `kdrama romántico del 2026` | `FALLBACK_DETERMINISTA` | 200 | Devuelve `Amor en Seúl 2026` (`degraded=true`, badge `Modo limitado`) | **PASS** |
| `kdrama romántico del 2099` | `FALLBACK_DETERMINISTA` | 200 | Devuelve `[]` y mensaje honesto sin inventar títulos | **PASS** |
| Filtro de IDs alucinados (`9999`) | Mock Groq | 200 | Filtra `9999`, retorna solo IDs del catálogo (`[12]`) | **PASS** |
| Fallo `429`/timeout y JSON malformado | Mock Groq | 200 | Header `X-Degraded-AI: true`, fallback determinista sin exponer clave | **PASS** |

## 6. Matriz de 40 Escenarios (Relación Escenario -> Spec -> Resultado)
Los 40 escenarios funcionales (`E2E-01`..`E2E-40`) están trazados en [QA_MATRIX.md](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/docs/qa/QA_MATRIX.md) y cubiertos por **16 tests Playwright por proyecto** (`chromium-desktop` y `chromium-mobile`) más pruebas unitarias/integración complementarias:
- `01-public-catalog.spec.js` (2 tests): `E2E-01`, `E2E-02` -> **PASS**
- `02-auth-roles.spec.js` (4 tests): `E2E-03`..`E2E-06`, `E2E-38` (móvil) -> **PASS**
- `03-private-diary.spec.js` (2 tests): `E2E-07`..`E2E-15` -> **PASS**
- `04-submissions-moderation-matrix.spec.js` (2 tests): `E2E-16`..`E2E-26` (Matrix completo) -> **PASS**
- `05-ai-recommendations.spec.js` (2 tests): `E2E-27`..`E2E-31` -> **PASS**
- `06-security-rest-graphql-reliability.spec.js` (3 tests): `E2E-32`..`E2E-36` -> **PASS**
- `07-responsive-accessibility.spec.js` (1 test): `E2E-37`, `E2E-39`, `E2E-40` -> **PASS**

## 7. Resumen de Suites Ejecutadas (Estado Final)

| Suite / Comando | Ambiente | Total | PASS | FAIL | SKIP | BLOCKED | Duración |
|---|---|---:|---:|---:|---:|---:|---|
| `npm run test:e2e -- --project=chromium-desktop` | SQLite QA + Mongo QA + Fallback (`1440x900`) | 16 | 16 | 0 | 0 | 0 | 1.1m |
| `npm run test:e2e -- --project=chromium-mobile` | SQLite QA + Mongo QA + Fallback (`390x844`, emulación Chromium) | 16 | 16 | 0 | 0 | 0 | 1.2m |
| `backend-django`: `.\venv\Scripts\pytest.exe -q` | SQLite (`db.qa.sqlite3`) | 23 | 23 | 0 | 0 | 0 | 36.05s |
| `backend-django`: `pytest` en PostgreSQL real | PostgreSQL 18 | - | 0 | 0 | 0 | **ALL** | BLOCKED (credenciales/Docker) |
| `backend-node`: `npm test` | Jest (con mocks) | 21 | 21 | 0 | 0 | 0 | 16.48s |
| `service-ai`: `.\venv\Scripts\pytest.exe -q` | FastAPI TestClient | 5 | 5 | 0 | 0 | 0 | 1.47s |
| `frontend`: `npm test -- --run` | Vitest + jsdom | 15 | 15 | 0 | 0 | 0 | 8.22s |
| `frontend`: `npm run build` | Vite 8.3.8 | 1 | 1 | 0 | 0 | 0 | 959ms |

## 8. Registro de Defectos
Ver detalle completo en [QA_BUGS_FIXED.md](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/docs/qa/QA_BUGS_FIXED.md):
- **P0 corregido:** Crash en `MyTrackingPage.jsx` al no pasar `progress` a `SecondsInputControl.jsx`.
- **P1 corregido:** Botón heredado `Sala en Vivo` en `MediaCard.jsx`, subtítulo heredado en `LoginPage.jsx`, y `CLIENT_ORIGIN` multi-origen + allowlist específica (sin `'*'`) en `backend-node/src/app.js`.
- **P1 hardening:** `settings.py` sin fallback silencioso cuando se solicita PostgreSQL explícitamente.
- **P0 abierto (entorno):** PostgreSQL real `BLOCKED`.

## 9. Auditoría de Seguridad y Privacidad
- Roles y escalada: `USER` forzado en registro; `PATCH /auth/me` no escala `role`; mutaciones de catálogo bloqueadas con `403` en REST y GraphQL.
- Diario privado / IDOR: aislado por `(user, media_item)` en Django y `(userId, trackingEntryId)` en Mongo; `ADMIN` recibe `403`/`404` sobre notas ajenas.
- Cola admin (`/api/v1/admin/submissions/`): verificada respuesta HTTP real sin `Me encantó A`, `Nota privada B` ni `submitted_by`.
- Catálogo REST y GraphQL: filtran `is_active=True` y nunca exponen `PENDING`/`REJECTED`/`Obra Oculta QA`.
- Subida de imágenes: PNG real validado; URLs privadas/SSRF y `.svg` rechazados (`400`).
- Node API: CORS allowlist verificada en vivo (`http://127.0.0.1:5173` permitido, `http://evil.example.com` sin header ACAO); `/api/v1/reviews` retorna `410`; `socketService.js` exige JWT y emite `watch_room_disabled`.

## 10. Evidencias Reales
- Capturas en `docs/qa/evidence/closeout/`: `matrix-admin-queue.png`, `matrix-public-catalog.png`, `matrix-diary-a.png`, `matrix-diary-b.png`.
- Logs de ejecución en `.system_generated/tasks/` (locales).

## 11. Integridad de Datos de Desarrollo
- `backend-django/db.sqlite3`: **INTACTO** — SHA256 prefijo `2eb373e8569fd85e` antes y después; `{'users_customuser': 4, 'catalog_mediaitem': 3, 'catalog_genre': 5, 'tracking_userprogress': 1}`.
- `backend-django/backups/db.sqlite3.baseline.bak`: **INTACTO** — SHA256 prefijo `68ef5bf8478041ba` antes y después; mismos conteos.
- MongoDB desarrollo: no alterado (QA usó exclusivamente `cinetrack_qa`).

## 12. Dictamen Final y Pendientes
**NO APTO — BLOQUEADO** (únicamente por el bloqueo de entorno para ejecutar **PostgreSQL real**; todo lo ejecutable en SQLite QA + Mongo QA + Modo IA determinista pasó 100%).
- **Para pasar a `APTO PARA REVISIÓN DE PR`:** levantar Docker Desktop o habilitar credenciales QA en `postgresql-x64-18` y ejecutar la batería PostgreSQL de `docs/qa/QA_REPRODUCCION_FINAL.md` (y opcionalmente `GROQ_API_KEY` si se requiere validar Groq remoto).
