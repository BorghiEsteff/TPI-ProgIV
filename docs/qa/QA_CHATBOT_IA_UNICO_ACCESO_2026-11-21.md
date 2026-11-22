# QA Unificación de Acceso Chatbot IA (2026-11-21)

## 1. Cambios implementados y verificados
- `frontend/src/components/layout/AppNavbar.jsx`: eliminado el enlace independiente `Recomendaciones IA`.
- `frontend/src/components/layout/Footer.jsx`: eliminado el enlace `/recommendations`.
- `frontend/src/App.jsx`: eliminada la página dedicada `RecommendationsPage`; `/recommendations` redirige a `/` (`<Navigate to="/" replace />`).
- Eliminados los componentes sin uso `frontend/src/pages/RecommendationsPage.jsx` y `frontend/src/components/recommendations/RecommendationChat.jsx` tras verificar cero importaciones activas.
- Mantenido `FloatingRecommendationChat.jsx` + `ClapperboardLauncher.jsx` como único acceso visual para usuarios autenticados.

## 2. Cobertura y resultados (IA-UNI-01..20)
- **Vitest (`cinetrackRefocus.test.jsx`, `floatingRecommendationChat.test.jsx`)**: **PASS** (28/28 tests en 8 archivos).
- **Playwright `chromium-desktop` & `chromium-mobile` (`01-public-catalog.spec.js`, `05-ai-recommendations.spec.js`, `07-responsive-accessibility.spec.js`, `10-floating-ai-clapper.spec.js`, `12-unified-my-cinetrack.spec.js`)**: **PASS**:
  - Visitante no visualiza la claqueta y recibe `401` en `POST /api/v1/recommendations`.
  - `/recommendations` redirige a `/`.
  - Navbar autenticado no contiene enlace `Recomendaciones IA`.
  - Flujos de claqueta flotante (`degraded: true`, `degraded: false`, `503`, `429`, `422 > 500 chars`, historial efímero, teclado y cero overflow horizontal) verificados en desktop y móvil.
- **Evidencias visuales**:
  - `docs/qa/screenshots/unified-2026-11-21/chatbot-ia-desktop.png`
  - `docs/qa/screenshots/unified-2026-11-21/chatbot-ia-mobile.png`
