# CineTrack — Estado de Implementación (Reenfoque P0–P6)

**Fecha de actualización:** 2026-11-14  
**Rama:** `feature/frontend-cinetrack` (basada en `7874503`)  
**Respaldo local BD SQLite:** `backend-django/backups/db.sqlite3.baseline.bak` (base de desarrollo `db.sqlite3` intacta)

---

## Resultados de Suites Ejecutadas (después del último cambio)

| Servicio | Comando | Resultado Real | Observaciones |
|---|---|---|---|
| `backend-django` | `pytest -q` (SQLite QA `db.qa.sqlite3`) | **28 passed** | Incluye `GEN-01..09`, paginación 25+, `verify-ownership` y reconciliación |
| `backend-node` | `npm test` (Jest + Supertest + mocks) | **6 suites, 21 passed** | MongoDB QA `cinetrack_qa` validado en E2E real |
| `service-ai` | `pytest -q` (FastAPI TestClient + Groq mock) | **5 passed** | Fallback determinista y filtrado anti-alucinación verificados |
| `frontend` | `npm test -- --run` + `npm run build` | **5 archivos, 15 passed**; build Vite OK (`434 modules`) | Build de producción limpio |
| `Playwright E2E` | `npx playwright test --project=chromium-desktop` y `--project=chromium-mobile` | **18/18 desktop** + **18/18 mobile** | Incluye `GEN-E2E-01..09`, `VIS-01..16` y caso Matrix |
| `Impeccable` | `impeccable.cmd detect --json http://localhost:5173/` | **0 hallazgos (`[]`)** | `PRODUCT.md` y `DESIGN.md` documentados |
| `PostgreSQL / Groq` | — | **BLOCKED / NOT_RUN** | Sin Docker/PG local ni `GROQ_API_KEY` configurados |

---

## Matriz Requisito → Implementación → Test → Resultado

| Requisito / Escenario | Implementación | Test Automatizado | Estado |
|---|---|---|---|
| **ACC-01 / ACC-05** Catálogo público filtrado (`is_active=True`) y escritura solo `ADMIN` | `backend-django/catalog/permissions.py`, `catalog/views.py`, `catalog/schema.py`, `core/settings.py` | `catalog/tests/test_p1_catalog_security.py` | **HECHO** |
| **ACC-03 / ACC-04** Registro fuerza `USER`, perfil bloquea `role`, migración `CRITIC -> USER` | `backend-django/users/models.py`, `users/serializers.py`, `users/migrations/0002_migrate_critic_to_user.py`, `frontend/src/pages/RegisterPage.jsx` | `users/tests/test_p1_security.py`, `frontend/src/tests/cinetrackRefocus.test.jsx` | **HECHO** |
| **ACC-06 / ACC-09 / ACC-10** Diario privado, alta idempotente, plataforma, favorito, avance | `backend-django/tracking/models.py`, `tracking/serializers.py`, `tracking/views.py`, `frontend/src/pages/MyTrackingPage.jsx` | `tracking/tests/test_tracking.py`, `catalog/tests/test_submissions_and_moderation.py` | **HECHO** |
| **ACC-07 / ACC-08 / ACC-23** `PersonalNote` (1–5 o null, 0..2000 chars), lote, *fail-closed* si Django cae | `backend-node/src/models/PersonalNote.js`, `src/validators/personalNoteValidator.js`, `src/controllers/personalNoteController.js`, `src/services/djangoService.js` | `backend-node/tests/personalNote.test.js` | **HECHO** |
| **ACC-11..ACC-17** Propuestas (`MediaSubmission`), detección duplicados `Matrix`/`The Matrix`, moderación transaccional con `select_for_update`, conciliación en colisión, rechazo sin pérdida | `backend-django/catalog/models.py`, `catalog/utils.py`, `catalog/views.py`, `frontend/src/pages/NewEntryPage.jsx`, `MySubmissionsPage.jsx`, `AdminSubmissionsPage.jsx` | `catalog/tests/test_submissions_and_moderation.py` | **HECHO** |
| **ACC-18 / ACC-19** Chat IA recomendaciones sobre catálogo publicado + fallback determinista sin Groq | `service-ai/services/recommender.py`, `service-ai/main.py`, `backend-node/src/controllers/recommendationController.js`, `frontend/src/pages/RecommendationsPage.jsx` | `service-ai/tests/test_recommend.py`, `backend-node/tests/recommendations.test.js`, `frontend/src/tests/cinetrackRefocus.test.jsx` | **HECHO** |
| **ACC-20** Cierre `/api/v1/reviews` (`410 Gone`), GraphQL sin reseñas, WatchRooms/Socket.IO deshabilitado | `backend-node/src/app.js`, `src/graphql/schema.js`, `src/services/socketService.js`, `frontend/src/App.jsx`, `AppNavbar.jsx` | `backend-node/tests/review.test.js`, `graphql.test.js`, `realtime.test.js` | **HECHO** |
| **ACC-22** Validación segura de portadas (SSRF + extensión + tamaño + magic bytes) | `backend-django/catalog/utils.py`, `catalog/serializers.py` | `catalog/tests/test_submissions_and_moderation.py` | **HECHO** |
| **ACC-24 / ACC-25** Validación en PostgreSQL/MongoDB/Docker real y E2E Playwright | `docker-compose.yml` validado con `docker compose config` | — | **NO VERIFICADO** (requiere iniciar Docker Desktop) |
