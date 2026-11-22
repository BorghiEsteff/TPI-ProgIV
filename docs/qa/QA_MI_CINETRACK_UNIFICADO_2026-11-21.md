# QA Rediseño Mi CineTrack Unificado — Cierre Lote 03 (2026-11-21)

## 1. Correcciones implementadas sobre `a759627`
- **H-01 (`backend-django/tracking/serializers.py`)**: eliminada la condición `episode_changed_while_visto` en `UserProgressSerializer.update()`. Cambiar temporada, episodio, posición o plataforma en una serie ya `VISTO` no agrega ni reescribe `episode_history`.
- **H-02 (`backend-django/tracking/serializers.py`)**: extendida la limpieza de `finished_at = None` al revertir desde `VISTO` a `VIENDO`, `PENDIENTE` **o `ABANDONADO`**, conservando `episode_history`.
- **H-03 y H-04 (`frontend/src/tests/trackingButtons.test.jsx`, `frontend/e2e/specs/12-unified-my-cinetrack.spec.js`)**: reemplazada la verificación superficial por pruebas segregadas con aserciones de API + UI + recarga, más corrida completa `chromium-desktop` y `chromium-mobile` desde base QA limpia.
- **H-05 (`frontend/src/components/notes/PersonalNoteEditor.jsx`)**: textarea compactada a `rows={1}` manteniendo puntuación 1-5 y comentario privado siempre accesibles sin romper el contrato de tarjetas.
- **MC-15 (`frontend/src/services/trackingService.js`, `frontend/src/pages/MyTrackingPage.jsx`)**: agregado `createTrackingWithMeta` para diferenciar alta nueva (`201`) de entrada ya existente (`200` idempotente) y refresco de `summaryCounts` al editar progreso.

## 2. Resultados de comandos ejecutados
| Suite | Comando | Exit Code | Resultado |
|---|---|---:|---|
| Django Backend | `pytest -q` (`DB_ENGINE=sqlite3`, `DB_NAME=:memory:`) | 0 | **41 passed** |
| Node Backend | `npm test` (Jest) | 0 | **6 suites, 25 passed** |
| Service AI | `pytest -q` | 0 | **9 passed** |
| Frontend Vitest | `npm test -- --run` | 0 | **8 files, 29 passed** |
| Frontend Build | `npm run build` | 0 | **PASS** (`dist/assets/index-ZAJCvmk_.js`) |
| Playwright Desktop | `npx playwright test --project=chromium-desktop` | 0 | **27/27 passed** |
| Playwright Mobile | `npx playwright test --project=chromium-mobile` | 0 | **27/27 passed** |

## 3. Matriz trazable MC-01..MC-25
| ID | Referencia automatizada exacta | Estado |
|---|---|---|
| MC-01 | `12-unified-my-cinetrack.spec.js` (`MC-01..MC-10`, T2E11 -> T2E12 before/after API + `trackingButtons.test.jsx`) | PASS |
| MC-02 | `test_mc02_editing_chapter_while_visto_does_not_auto_mark_episode_in_history` (`test_tracking.py`) + `12-unified-my-cinetrack.spec.js` | PASS |
| MC-03 | `test_updating_already_visto_series_does_not_rewrite_episode_history` (`test_tracking.py`) + `12-unified-my-cinetrack.spec.js` | PASS |
| MC-04 | `test_update_preserves_exact_seconds_when_not_sent` (`test_tracking.py`) + `trackingButtons.test.jsx` + `12-unified-my-cinetrack.spec.js` (5075s) | PASS |
| MC-05 | `trackingButtons.test.jsx` + `12-unified-my-cinetrack.spec.js` (1h 30m -> 5400s) | PASS |
| MC-06 | `trackingButtons.test.jsx` + `12-unified-my-cinetrack.spec.js` (Cancelar revierte borrador) | PASS |
| MC-07 | `12-unified-my-cinetrack.spec.js` (`page.reload()` sobre `tracking-card-*`) | PASS |
| MC-08 | `trackingButtons.test.jsx` + `12-unified-my-cinetrack.spec.js` (0 inputs Temp./Ep. en película) | PASS |
| MC-09 | `trackingButtons.test.jsx` + `12-unified-my-cinetrack.spec.js` (minutos=75 bloqueado sin POST/PATCH) | PASS |
| MC-10 | `test_reverting_visto_to_viendo_...` y `test_mc10_reverting_visto_to_abandonado_and_pendiente_...` (`test_tracking.py`) + `12-unified-my-cinetrack.spec.js` | PASS |
| MC-11 | `03-private-diary.spec.js` + `12-unified-my-cinetrack.spec.js` (estrellas 1/3/5 tras recarga) | PASS |
| MC-12 | `03-private-diary.spec.js` + `12-unified-my-cinetrack.spec.js` (opinión Unicode privada y ausente en catálogo) | PASS |
| MC-13 | `03-private-diary.spec.js` (`E2E-15` IDOR horizontal y bloqueo `ADMIN`) | PASS |
| MC-14 | `12-unified-my-cinetrack.spec.js` (alta rápida desde catálogo) | PASS |
| MC-15 | `03-private-diary.spec.js` (`200` idempotente API) + `12-unified-my-cinetrack.spec.js` (UI mensaje sin duplicar) | PASS |
| MC-16 | `04-submissions-moderation-matrix.spec.js` (`Matrix E2E`) + `08-categories-and-visual-qa.spec.js` | PASS |
| MC-17 | `08-categories-and-visual-qa.spec.js` (`GEN-E2E-01..05` 1-5 géneros en PENDING) | PASS |
| MC-18 | `04-submissions-moderation-matrix.spec.js` + `test_submissions_and_moderation.py` | PASS |
| MC-19 | `12-unified-my-cinetrack.spec.js` (`/new-entry` -> `?view=add`, `/my-submissions` -> `?view=proposals`) + `01-public-catalog.spec.js` | PASS |
| MC-20 | `12-unified-my-cinetrack.spec.js` + `05-ai-recommendations.spec.js` + `02-auth-roles.spec.js` | PASS |
| MC-21 | `05-ai-recommendations.spec.js` (mocks 503/degraded + API 401/422) + `10-floating-ai-clapper.spec.js` (interacción real contra microservicios) | PASS |
| MC-22 | `test_bus15_16_17_18_tracking_global_search_and_isolation` (`test_tolerant_search.py`) + `12-unified-my-cinetrack.spec.js` (`disney` en diario) | PASS |
| MC-23 | `12-unified-my-cinetrack.spec.js` (`disney` en catálogo público retorna 0 resultados) | PASS |
| MC-24 | `12-unified-my-cinetrack.spec.js` (filtros/conteos) + `test_p1_pagination_25_plus_verify_ownership_and_reconciliation` | PASS |
| MC-25 | Corridas completas `chromium-desktop` (27/27) y `chromium-mobile` (27/27) + capturas en `docs/qa/screenshots/unified-2026-11-21/` | PASS |

## 4. Capturas verificadas (`docs/qa/screenshots/unified-2026-11-21/`)
- `mi-cinetrack-desktop.png`, `mi-cinetrack-editor-desktop.png`, `tab-mis-propuestas-desktop.png`, `tab-agregar-obra-desktop.png`, `chatbot-ia-desktop.png`, `mi-cinetrack-mobile.png`, `chatbot-ia-mobile.png`.
