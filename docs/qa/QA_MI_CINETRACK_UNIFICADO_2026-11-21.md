# QA Rediseño Mi CineTrack Unificado (2026-11-21)

## 1. Cambios verificados
- **Navbar minimalista (`AppNavbar.jsx`)**: solo `Catálogo` y `Mi CineTrack` (más `Moderación` para `ADMIN`), eliminando `Agregar Obra`, `Mis Propuestas` y `Recomendaciones IA`.
- **Pantalla unificada `MyTrackingPage.jsx`**:
  - Tabs integradas: **Mis obras** (`view=tracking`), **Mis propuestas** (`view=proposals`), **+ Agregar obra** (`view=add` con búsqueda rápida en catálogo publicado + `SubmissionForm`).
  - Alias `/my-cinetrack` y redirecciones de compatibilidad `/new-entry` -> `/my-tracking?view=add` y `/my-submissions` -> `/my-tracking?view=proposals`.
- **Editor único `TrackingProgressEditor.jsx`**:
  - Formulario controlado único por tarjeta al abrir **Editar progreso**: `watch_platform`, `status` (`PENDIENTE`, `VIENDO`, `VISTO`, `ABANDONADO`), `hours` + `minutes`, `season` + `episode` solo para `SERIE` (ocultos en `PELICULA`), favorito único, `Guardar progreso`, `Cancelar` y `Quitar del diario`.
  - Preservación exacta de `current_seconds` (ej. `01:24:35` = `5075s`) si no se editan horas/minutos ni se cambia capítulo.
  - Cambio de episodio en series prepara `00:00` sin autoguardar en `onBlur`.
  - `PersonalNoteEditor` independiente (1-5 estrellas + 2000 caracteres en Mongo).
- **Backend `tracking/serializers.py` (`P0.4`)**:
  - Actualizar plataforma u otros campos en una serie ya `VISTO` no duplica ni reescribe `episode_history`.
  - Revertir `VISTO` a `VIENDO`/`PENDIENTE` limpia `finished_at` sin borrar `episode_history`.

## 2. Resultados de pruebas
- `backend-django` pytest (`sqlite3` `:memory:`): **39 passed** (incluyendo 3 tests nuevos en `tracking/tests/test_tracking.py` y `test_lote02...` en `catalog/tests/test_tolerant_search.py`).
- `backend-node` Jest: **6 suites, 25 passed**.
- `service-ai` pytest: **9 passed**.
- `frontend` Vitest: **8 archivos, 28 passed** (incluyendo `trackingButtons.test.jsx` sobre `TrackingProgressEditor`).
- `frontend` `vite build`: **PASS** (`dist/assets/index-C_wW4uME.js`).
- Playwright E2E (`db.qa.sqlite3` + `cinetrack_qa`):
  - `chromium-desktop`: **25/25 passed**.
  - `chromium-mobile`: primera corrida completa **24/25 passed** (fallo único por navbar colapsado en `390px` en `12-unified-my-cinetrack.spec.js`), corregido y re-verificado en desktop y móvil (`2/2 passed` en `12-unified-my-cinetrack.spec.js`).
- **Evidencias visuales**:
  - `docs/qa/screenshots/unified-2026-11-21/mi-cinetrack-desktop.png`
  - `docs/qa/screenshots/unified-2026-11-21/mi-cinetrack-editor-desktop.png`
  - `docs/qa/screenshots/unified-2026-11-21/mi-cinetrack-mobile.png`
