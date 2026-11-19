# CineTrack — Rama Especializada `frontend` (React 19 + Vite)

Esta rama contiene una instantanea selectiva y no destructiva desde `main` (`7b7c1712bd3c31e5493ccc414e5f88f3582d5950`) enfocada exclusivamente en la aplicacion web SPA de CineTrack:

- **`frontend/`**: Aplicacion React 19 + Vite + React-Bootstrap + React Router 7, clientes Axios (`djangoClient`, `nodeClient`, interceptores JWT/refresh/degraded), servicios de dominio, `AuthContext`, paginas (`CatalogPage`, `MediaDetailPage`, `MyTrackingPage`, `NewEntryPage`, `MySubmissionsPage`, `AdminSubmissionsPage`, `RecommendationsPage`, `LoginPage`, `RegisterPage`), asistente flotante con claqueta animada (`FloatingRecommendationChat`, `ClapperboardLauncher`), pruebas Vitest y E2E Playwright, `Dockerfile` y `.env.example`.
- **`docs/frontend/`**: Copias de referencia de `DESIGN.md`, `PRODUCT.md`, atribuciones MIT de la claqueta, reportes QA visuales/E2E y capturas del asistente flotante (la documentacion integral completa permanece en `main`).

## Dependencias Externas (No Duplicadas)

La SPA requiere los backends activos para operar en vivo:
- **Backend Django (`VITE_DJANGO_API_URL=http://localhost:8000/api/v1`):** Autenticacion, catalogo, propuestas, moderacion y diario privado.
- **Backend Node.js (`VITE_NODE_API_URL=http://localhost:5000/api/v1`):** Notas personales privadas y recomendaciones IA.
- **Restriccion de merge:** No fusionar esta rama completa hacia `main` (contiene unicamente el frontend). Integrar cambios puntuales mediante cherry-pick o rutas especificas.

## Ejecucion de Verificaciones

```bash
cd frontend
npm ci
npm run lint
npm test
npm run build
```
