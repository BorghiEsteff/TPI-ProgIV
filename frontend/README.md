# CineTracker Frontend (React + Vite)

Interfaz SPA de **CineTracker / CineTrack** construida con React 19, Vite 8 y React Router. Consume la API REST/GraphQL de `backend-django` (puerto `8000`) y la API REST/GraphQL de `backend-node` (puerto `5000`), incluyendo el asistente flotante de recomendaciones IA (`service-ai` vía `backend-node`).

---

## Requisitos e instalación

* Node.js 20+ y npm 10+

```bash
cd frontend
cp .env.example .env
npm install
```

### Variables de entorno (`.env`)

| Variable | Valor por defecto local | Descripción |
| :--- | :--- | :--- |
| `VITE_DJANGO_API_URL` | `http://localhost:8000/api/v1` | Base REST de catálogo, autenticación, diario y moderación |
| `VITE_DJANGO_GRAPHQL_URL` | `http://localhost:8000/graphql/` | Endpoint GraphQL de Django |
| `VITE_NODE_API_URL` | `http://localhost:5000/api/v1` | Base REST de notas privadas y recomendaciones IA |
| `VITE_NODE_GRAPHQL_URL` | `http://localhost:5000/graphql` | Endpoint GraphQL de Node |
| `VITE_NODE_SOCKET_URL` | `http://localhost:5000` | URL base heredada (WatchRooms deshabilitadas en versión actual) |

---

## Scripts disponibles

| Script | Comando | Uso |
| :--- | :--- | :--- |
| Desarrollo | `npm run dev` | Levanta servidor Vite en `http://localhost:5173` |
| Build producción | `npm run build` | Genera bundle optimizado en `dist/` |
| Preview | `npm run preview` | Sirve `dist/` localmente |
| Tests unitarios | `npm test` | Ejecuta la suite de Vitest (`src/tests/*.test.jsx`) |
| Tests E2E | `npm run test:e2e` | Ejecuta Playwright (`e2e/specs/*.spec.js`) en desktop y móvil |
| Reporte E2E | `npm run test:e2e:report` | Abre el reporte HTML de Playwright |

---

## Rutas principales (`src/App.jsx`)

* `/`: Catálogo público paginado con filtros por tipo, género y búsqueda (`CatalogPage`).
* `/media/:id`: Ficha técnica de obra, tracking privado y notas personales (`MediaDetailPage`).
* `/login` y `/register`: Autenticación JWT y registro con rol `USER` (`LoginPage`, `RegisterPage`).
* `/my-tracking`: Diario personal privado del usuario autenticado (`MyTrackingPage`, protegido).
* `/new-entry` y `/my-submissions`: Propuesta de nuevas obras y seguimiento de estado (`NewEntryPage`, `MySubmissionsPage`, protegido).
* `/recommendations`: Vista dedicada de recomendaciones IA (`RecommendationsPage`, protegido).
* `/admin/submissions`: Cola de moderación, publicación, fusión de duplicados y rechazo (`AdminSubmissionsPage`, restringido a rol `ADMIN`).
* Componente global flotante: `FloatingRecommendationChat` + `ClapperboardLauncher` (visible para usuarios autenticados en todas las vistas).

---

## Estructura de carpetas (`src/`)

* `api/`: clientes Axios (`djangoClient.js`, `nodeClient.js`) e interceptores JWT.
* `context/`: `AuthContext.jsx` (sesión, tokens, normalización de roles `USER`/`ADMIN`).
* `components/`: componentes reutilizables (`common/`, `catalog/`, `tracking/`, `notes/`, `recommendations/`, `admin/`, más legado en `reviews/` y `watchroom/`).
* `pages/`: páginas asociadas a cada ruta.
* `tests/`: tests unitarios con Vitest y React Testing Library.
* `e2e/`: fixtures y especificaciones Playwright (`01` a `10`).
