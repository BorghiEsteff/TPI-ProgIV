# Reporte QA — Asistente Flotante IA Claqueta (CineTrack)

**Fecha:** 2026-11-19  
**Rama base:** `feature/frontend-cinetrack` (`30a1dae26076a50eb535000d3494372e60b2f1ff`)  
**Rama de implementacion:** `feat/cinetrack-floating-ai-clapper`  
**Alcance:** Conversion del recomendador IA existente en un asistente flotante con claqueta de cine animada, contexto conversacional acotado (hasta 3 intercambios), preseleccion sobre catalogo activo completo, proteccion de cuota y validacion estricta de dominio/seguridad.

---

## 1. Cambios Implementados por Archivo

| Capa | Archivo | Descripcion |
| :--- | :--- | :--- |
| FastAPI IA | `service-ai/schemas.py` | Agrega `HistoryMessage` (max 6 mensajes, roles `user`/`assistant`) y `duration_minutes` opcional en `CandidateMedia`. |
| FastAPI IA | `service-ai/main.py` | Propaga `history` hacia `recommend_from_catalog`. |
| FastAPI IA | `service-ai/services/recommender.py` | Actualiza modelo por defecto a `openai/gpt-oss-20b`, agrega guardia de dominio y anti-injection, reconstruye contexto conversacional solo en seguimientos, limita a 1-3 recomendaciones sin alucinaciones ni relleno arbitrario, y mantiene fallback determinista. |
| FastAPI IA | `service-ai/.env.example` | Actualiza `GROQ_MODEL=openai/gpt-oss-20b` y `REQUEST_TIMEOUT_SECONDS=4.5`. |
| FastAPI IA | `service-ai/tests/test_recommend.py` | Amplia a 9 pruebas unitarias (dominio, injection, contexto 3 intercambios, limite de 3, modelo por defecto, fallback). |
| Node.js | `backend-node/src/services/djangoService.js` | Amplia paginacion hasta 50 paginas (2500 obras) filtrando `is_active !== false`. |
| Node.js | `backend-node/src/services/aiService.js` | Preselección por relevancia sobre todo el catalogo activo antes de recortar a <=30 candidatos hacia FastAPI; pasa `history` y unifica fallback. |
| Node.js | `backend-node/src/routes/recommendationRoutes.js` | Agrega `createRecommendationRateLimiter` por usuario autenticado con `express-rate-limit` (default 5/min, HTTP 429). |
| Node.js | `backend-node/src/controllers/recommendationController.js` | Valida `history` (<=6 mensajes, sin rol `system`), revalida cada ID recomendado contra Django al responder y loguea metricas sin contenido ni tokens. |
| Node.js | `backend-node/tests/recommendations.test.js` | Amplia a 6 pruebas de integracion/seguridad (401, 422, 503, revalidacion activa, catalogo 250+, rate limit 429 por usuario). |
| React Frontend | `frontend/public/animations/clapperboard-clap.svg` | Copia local del SVG animado MIT de Gentleface. |
| React Frontend | `docs/attributions.md` | Atribucion y licencia MIT de Gentleface Animated Clapperboard. |
| React Frontend | `frontend/src/services/recommendationService.js` | Soporte opcional de `history` (<=6 mensajes) y timeout de 15s. |
| React Frontend | `frontend/src/components/recommendations/ClapperboardLauncher.jsx` | Boton accesible `<button type="button">` con SVG claqueta animada y variante quieta. |
| React Frontend | `frontend/src/components/recommendations/FloatingRecommendationChat.jsx` | Panel conversacional flotante, chips rapidos, historial efimero en memoria, limpieza al logout, limite 300 chars, manejo 429/503/fallback. |
| React Frontend | `frontend/src/components/recommendations/FloatingRecommendationChat.css` | Estilos CineTrack, animacion periodica de tapa y soporte `@media (prefers-reduced-motion: reduce)`. |
| React Frontend | `frontend/src/App.jsx` | Montaje unico global de `<FloatingRecommendationChat />` bajo `AuthProvider`. |
| QA Frontend | `frontend/src/tests/floatingRecommendationChat.test.jsx` | 4 pruebas unitarias/accesibilidad Vitest (UI-01..UI-16). |
| QA E2E | `frontend/e2e/specs/10-floating-ai-clapper.spec.js` | Pruebas E2E Playwright en desktop (`1440x900`) y movil (`390x844`). |

---

## 2. Matriz de Verificacion y Resultados

| Area / Requisito | Archivo / Suite | Comando | Resultado | Evidencia |
| :--- | :--- | :--- | :--- | :--- |
| FastAPI IA (AI-01..AI-14) | `service-ai/tests/test_recommend.py` | `python -m pytest -q` | PASS (9/9) | 9 pruebas unitarias en verde (incluye modelo `openai/gpt-oss-20b`, injection, contexto, fallback). |
| Groq SDK Real (`openai/gpt-oss-20b`) | `service-ai/services/recommender.py` | Llamada controlada con `load_dotenv('.env')` | PASS (1/1) | `GROQ_REAL_MS: 1613`, `DEGRADED: False`, `RECS: [1]` (`Amor en Seul 2026`). Sin exponer API key. |
| Node/Express (API-01..API-16) | `backend-node/tests/recommendations.test.js` + suite completa | `npm test` | PASS (25/25 en 6 suites) | 401, 422, 429 per-user, 503, catalogo 280 obras, revalidacion activa. |
| Django Backend | `backend-django/` | `python -m pytest -q` | PASS (29/29) | Sin regresiones en catalogo, auth, moderacion ni tracking. |
| React Lint & Build | `frontend/` | `npm run lint` / `npm run build` | PASS (0 errores) | `oxlint`: 0 errores (15 warnings previos). `vite build`: 441 modulos en ~1.15s. |
| React Unit / A11y (UI-01..UI-16) | `frontend/src/tests/` | `npm test` | PASS (24/24 en 7 suites) | Incluye 4 tests nuevos en `floatingRecommendationChat.test.jsx`. |
| Playwright Flotante Desktop & Movil | `frontend/e2e/specs/10-floating-ai-clapper.spec.js` | `npx playwright test e2e/specs/10-floating-ai-clapper.spec.js` | PASS (3/3 desktop, 3/3 movil) | Integracion real contra Django + Node + FastAPI, animacion tapa, `prefers-reduced-motion`, teclado, 401/429/modo limitado. |
| Regresion General Desktop | `frontend/e2e/specs/*.spec.js` | `npm run test:e2e -- --project=chromium-desktop` | 21/22 PASS | 21/22 en verde (incluyendo `10-floating-ai-clapper` 3/3). `03-private-diary` fallo por datos residuales en `db.qa.sqlite3` al reutilizar la BD QA entre corridas sin re-seed. |
| Base de datos PostgreSQL Docker | `docker-compose.yml` | N/A | BLOCKED / NOT_RUN | Motor Docker Desktop no iniciado en el host; validado contra SQLite QA + MongoDB `cinetrack_qa`. |

---

## 3. Evidencias Visuales (Capturas)

Alojadas en `docs/qa/screenshots/floating-clapper-2026-11-19/`:
- `launcher-closed-desktop.png` (1440x900)
- `launcher-closed-mobile.png` (390x844)
- `panel-response-desktop.png` (panel abierto con recomendacion real de catalogo)
- `panel-response-mobile.png` (panel abierto en movil sin overflow horizontal)
- `reduced-motion-desktop.png` (`prefers-reduced-motion: reduce` con `animationName === 'none'`)
- `reduced-motion-mobile.png`

---

## 4. Comparacion Antes vs. Despues

- **Antes:** El recomendador vivia unicamente como formulario de consulta unica en `/recommendations` (`RecommendationChat.jsx`), enviando los primeros 50 registros sin preseleccion, usando el modelo retirado `llama-3.1-8b-instant`, sin historial conversacional, sin rate limit por usuario y sin revalidacion final contra Django.
- **Despues:** Se mantiene `/recommendations` operativa sin regresiones y se incorpora un widget flotante global con claqueta animada MIT de Gentleface visible solo para usuarios autenticados, con dialogo de hasta 3 intercambios en memoria efimera, preseleccion sobre todo el catalogo activo, revalidacion final de IDs activos, rate limit por usuario y modelo `openai/gpt-oss-20b` con fallback determinista.

---

## 5. Dictamen

**Listo para revisar / Listo para PR** sobre la rama `feat/cinetrack-floating-ai-clapper` (derivada de `feature/frontend-cinetrack`).  
Condicion documentada para cierre en entorno con contenedores: ejecutar una corrida final de `03-private-diary.spec.js` sobre `db.qa.sqlite3` recien inicializada y validar `docker compose` con PostgreSQL activo cuando el demonio de Docker Desktop este en ejecucion.
