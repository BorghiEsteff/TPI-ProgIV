# CineTrack — Documentación Técnica Completa (As-Built)

**Proyecto:** CineTrack / CineTracker — Plataforma Full-Stack de Seguimiento, Catálogo y Recomendación Audiovisual  
**Asignatura:** Programación IV (Plan 2024) — UTN Facultad Regional Resistencia (Extensión Áulica Goya)  
**Repositorio:** `https://github.com/BorghiEsteff/TPI-ProgIV` (rama `main`)  
**Versión de referencia:** Cierre TP0–TP5 (`main` integrado)

---

## 1. Visión General y Arquitectura de Microservicios

**CineTrack** implementa una arquitectura **políglota de microservicios contenerizados** orientada a separar responsabilidades por dominio de datos, concurrencia y seguridad:

1. **`frontend/` (SPA React 19 + Vite 8):** Interfaz única para visitantes, usuarios registrados (`USER`) y administradores (`ADMIN`). Consume las APIs REST y GraphQL de Django y Node.js.
2. **`backend-django/` (Django 6.1.2 + DRF + SimpleJWT + Graphene):** *Single Source of Truth* para identidad, control de acceso (RBAC), catálogo audiovisual oficial (`MediaItem`, `Genre`, `Season`, `Episode`), propuestas comunitarias (`MediaSubmission`) con moderación transaccional y diario privado de seguimiento (`UserProgress`).
3. **`backend-node/` (Node.js + Express + Mongoose + GraphQL):** Servicio complementario desacoplado para persistencia documental privada en MongoDB (`PersonalNote`: calificación `1..5` y notas privadas), consulta GraphQL `publicMediaDetails`, y orquestación resiliente (con *rate limiting*) hacia el microservicio de IA (`POST /api/v1/recommendations`).
4. **`service-ai/` (Python + FastAPI + Pydantic v2 + Groq):** Microservicio de recomendaciones acotadas estrictamente al catálogo publicado (`is_active=True`), con integración a Groq Cloud API y motor determinista de respaldo (`degraded: true`).
5. **`proxy/` & `scripts/` (Nginx 1.27 Alpine / `local-proxy.mjs` + Tailscale):** Proxy inverso unificado en `127.0.0.1:8088` que enruta `/` al frontend, `/django/` al backend Django y `/node/` al backend Node.js, habilitando exposición privada multi-dispositivo vía Tailscale Serve.

### 1.1 Decisiones de Diseño y Evolución de Alcance (TP0–TP5)

| Decisión | Contexto Inicial (TP0–TP3) | Estado Vigente (`main`) | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Consolidación RBAC** | 3 roles (`USER`, `CRITIC`, `ADMIN`) | 2 roles efectivos (`USER`, `ADMIN`), migración `users/0002_migrate_critic_to_user.py` | Al enfocar la plataforma en diario privado + curaduría comunitaria moderada, un rol intermedio generaba superficie innecesaria sin privilegios exclusivos activos. |
| **Privacidad del Diario** | Reseñas públicas (`/api/v1/reviews`) y salas `WatchRooms` (Socket.IO) | Retirados: `/api/v1/reviews` responde `410 Gone`; `socketService.js` deshabilitado; reemplazado por `PersonalNote` privado en MongoDB | Evita moderación de contenido social abierto, garantiza privacidad total del diario (ni siquiera `ADMIN` accede a notas ajenas) y mantiene la arquitectura políglota SQL + NoSQL. |
| **Proveedor de IA** | Ollama local (`llama3.2:1b`) y `/ai/review-guard` | Groq Cloud API (`POST /ai/recommend`) + fallback determinista (`degraded: true`) | Ollama requiere GPU/RAM elevada y descarga de pesos de varios GB. Groq ofrece baja latencia en la nube y el fallback determinista asegura disponibilidad 100 % sin clave ni red externa. |
| **UX Unificada** | Páginas separadas para IA, alta y propuestas | Claqueta flotante `<FloatingRecommendationChat />` + pestañas unificadas en `/my-tracking` | Reduce fricción de navegación; `/recommendations`, `/new-entry` y `/my-submissions` redirigen limpiamente. |

---

## 2. Stack Tecnológico Exacto (Verificado en Manifiestos)

### 2.1 `backend-django/` (`requirements.txt`)
* **Python:** `3.12+` (validado en Windows con `3.14.7`)
* **Framework Web / API:** `Django>=5.0,<6.2` (`6.1.2`), `djangorestframework>=3.15.0`
* **Autenticación JWT:** `djangorestframework-simplejwt>=5.3.0`
* **OpenAPI / Swagger / Redoc:** `drf-spectacular>=0.27.1`
* **GraphQL:** `graphene-django>=3.2.0`
* **Filtros y CORS:** `django-filter>=24.1`, `django-cors-headers>=4.3.1`
* **Base de datos y utilidades:** `psycopg2-binary>=2.9.9` (PostgreSQL 16), `python-dotenv>=1.0.1`
* **Testing:** `pytest>=8.0.0`, `pytest-django>=4.8.0`

### 2.2 `backend-node/` (`package.json`)
* **Runtime:** Node.js `20+` (validado en `v24.16.0`), ESM (`"type": "module"`)
* **Framework HTTP:** `express ^4.19.2`
* **MongoDB ODM:** `mongoose ^8.3.0` (MongoDB 7)
* **Seguridad y Red:** `jsonwebtoken ^9.0.2`, `helmet ^7.1.0`, `cors ^2.8.5`, `express-rate-limit ^7.2.0`
* **Validación y HTTP Client:** `zod ^3.22.4`, `axios ^1.6.8`, `dotenv ^16.4.5`
* **GraphQL y Realtime (deshabilitado):** `express-graphql ^0.12.0`, `graphql ^15.11.0`, `socket.io ^4.7.5`
* **Testing:** `jest ^29.7.0`, `supertest ^6.3.4`, `mongodb-memory-server ^9.1.1`

### 2.3 `service-ai/` (`requirements.txt`)
* **Framework:** `fastapi>=0.110.0`, `uvicorn[standard]>=0.28.0`
* **Validación:** `pydantic>=2.6.4`
* **Cliente HTTP e Inferencia:** `httpx>=0.27.0`, `groq>=0.9.0`, `python-dotenv>=1.0.1`
* **Testing:** `pytest>=8.0.0`, `pytest-asyncio>=0.23.0`

### 2.4 `frontend/` (`package.json`)
* **Core UI:** `react ^19.3.1`, `react-dom ^19.3.1`, `react-router-dom ^7.18.5`
* **Estilos:** `bootstrap ^5.3.9`, `react-bootstrap ^2.10.10`
* **HTTP / Realtime:** `axios ^1.21.1`, `socket.io-client ^4.8.4`
* **Build / Lint / Testing:** `vite ^8.3.6`, `oxlint ^1.90.0`, `vitest ^5.1.0`, `@testing-library/react ^16.3.3`, `@playwright/test ^1.65.1`

---

## 3. Estructura de Directorios del Repositorio

```text
TPI-ProgramacionIV/
├── backend-django/
│   ├── catalog/               # MediaItem, Genre, Season, Episode, MediaSubmission, búsqueda tolerante
│   ├── core/                  # settings.py, urls.py, permissions.py, pagination.py, exceptions.py
│   ├── tracking/              # UserProgress, historial de episodios, aislamiento por usuario
│   ├── users/                 # CustomUser (email login), SimpleJWT custom claims, anti-escalada
│   ├── manage.py
│   ├── seed_qa.py             # Semilla aislada para entorno QA (db.qa.sqlite3)
│   └── Dockerfile
├── backend-node/
│   ├── src/
│   │   ├── config/            # Conexión Mongoose (db.js)
│   │   ├── controllers/       # personalNoteController.js, recommendationController.js, reviewController.js (410)
│   │   ├── graphql/           # Esquema GraphQL (publicMediaDetails)
│   │   ├── middlewares/       # authMiddleware.js (JWT HS256), errorHandler.js
│   │   ├── models/            # PersonalNote.js (+ modelos heredados)
│   │   ├── routes/            # personalNoteRoutes.js, recommendationRoutes.js
│   │   ├── services/          # djangoService.js, aiService.js, socketService.js (deshabilitado)
│   │   ├── validators/        # Esquemas Zod
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/                 # 6 suites Jest (25 tests)
│   └── Dockerfile
├── service-ai/
│   ├── services/              # recommender.py (Groq + fallback determinista + anti-alucinación)
│   ├── tests/                 # test_recommend.py (9 tests)
│   ├── main.py                # FastAPI (/health, /ai/health, /ai/recommend)
│   ├── schemas.py             # Modelos Pydantic v2
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/               # djangoClient.js, nodeClient.js, interceptors.js
│   │   ├── components/        # admin, catalog, common, layout, notes, recommendations, submissions, tracking
│   │   ├── context/           # AuthContext.jsx
│   │   ├── pages/             # CatalogPage, MediaDetailPage, MyTrackingPage, AdminSubmissionsPage, etc.
│   │   ├── services/          # Servicios REST/GraphQL por dominio
│   │   ├── tests/             # Suites unitarias Vitest
│   │   └── utils/             # textSearch.js, timeFormat.js
│   ├── e2e/                   # Specs Playwright E2E (desktop + mobile)
│   └── Dockerfile
├── proxy/
│   ├── nginx.conf             # Proxy inverso unificado para Docker Compose
│   └── local-proxy.mjs        # Proxy HTTP local en Node para desarrollo sin Docker
├── scripts/                   # Scripts PowerShell para diagnóstico y Tailscale Serve
├── docs/                      # Documentación académica TP0–TP5, QA y contratos OpenAPI
├── Documentacion/             # Documentación integral consolidada y PDF final
├── docker-compose.yml         # Orquestación de 7 servicios (incluyendo proxy)
└── .env.example
```

---

## 4. Inventario de Endpoints, GraphQL y Modelos de Datos

### 4.1 Endpoints REST y GraphQL — `backend-django` (Puerto `8000`)

| Recurso / Prefijo | Métodos | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register/` | `POST` | Público | Registro de usuario; fuerza `role='USER'` (ignora intentos de escalada). |
| `/api/v1/auth/login/` | `POST` | Público | Emite `access` (60 min) y `refresh` (24 h) con claims `user_id`, `username`, `email`, `role`. |
| `/api/v1/auth/token/refresh/` | `POST` | Público | Renueva access token usando refresh token válido. |
| `/api/v1/auth/me/` | `GET`, `PATCH` | Autenticado | Consulta/edita perfil propio bloqueando modificación de `role`. |
| `/api/v1/genres/` | `GET` / `POST, PATCH, DELETE` | Público / `ADMIN` | Listado y gestión taxonómica de géneros. |
| `/api/v1/media/` | `GET` / `POST, PATCH, DELETE` | Público (`is_active=True`) / `ADMIN` | Catálogo con búsqueda tolerante, filtros por tipo/género y paginación. |
| `/api/v1/seasons/` & `/api/v1/episodes/` | `GET` / `POST, PATCH, DELETE` | Público / `ADMIN` | Jerarquía de temporadas y episodios asociada a `SERIE`. |
| `/api/v1/tracking/` | `GET, POST, PATCH, DELETE` | Autenticado (propio) | Diario privado (`UserProgress`): estado, plataforma, avance, favoritos, `verify-ownership`. |
| `/api/v1/submissions/` | `GET, POST` | Autenticado | Propuestas comunitarias de nuevas obras y detección de posibles duplicados. |
| `/api/v1/admin/submissions/` | `GET, POST` | `ADMIN` | Cola de moderación: publicar (`PUBLISHED`), fusionar (`MERGED` con reconciliación) o rechazar (`REJECTED`). |
| `/graphql/` | `POST` | Público | Consultas GraphQL (`allMediaItems`, filtrado por género/tipo). |
| `/api/schema/`, `/api/docs/`, `/api/redoc/` | `GET` | Público | Esquema OpenAPI 3.0 (`drf-spectacular`) y UI interactiva Swagger/Redoc. |

### 4.2 Endpoints REST y GraphQL — `backend-node` (Puerto `5000`)

| Ruta | Métodos | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/api/v1/personal-notes/` | `GET` | Autenticado | Obtiene notas privadas por lote para las entradas del usuario autenticado. |
| `/api/v1/personal-notes/:trackingEntryId` | `GET`, `PUT`, `DELETE` | Autenticado (dueño) | CRUD de nota privada (`rating: 1..5 | null`, `comment: 0..2000 chars`) tras verificar propiedad en Django. |
| `/api/v1/recommendations/` | `POST` | Autenticado + Rate Limit | Orquesta catálogo activo desde Django + llamada a `service-ai` (`max 5 req/min` por usuario). |
| `/api/v1/reviews/*` | `*` | Todos | **Retirado (`410 Gone`)** por transición a diario privado. |
| `/graphql` | `POST` | Público | Consulta `publicMediaDetails` sin exponer notas privadas. |
| `/health` | `GET` | Público | Estado operativo del servicio Node.js. |

### 4.3 Endpoints — `service-ai` (Puerto `8002`)

| Ruta | Método | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/health` y `/ai/health` | `GET` | Red interna / Local | Verificación de disponibilidad del microservicio. |
| `/ai/recommend` | `POST` | Backend-to-Backend (`backend-node`) | Recibe `prompt`, `candidates` (catálogo activo) e `history`; devuelve hasta 3 recomendaciones válidas y flag `degraded`. |

---

## 5. Funcionamiento Interno y Flujos Críticos

### 5.1 Ciclo de Vida JWT y Verificación Desacoplada
1. El usuario inicia sesión en `POST /api/v1/auth/login/` (Django). `CustomTokenObtainPairSerializer` firma un JWT **HS256** con `JWT_SIGNING_KEY` incluyendo `user_id`, `username`, `email` y `role`.
2. En el frontend, `interceptors.js` adjunta `Authorization: Bearer <access>` en cada petición hacia Django y Node.js; ante un `401`, intenta refrescar automáticamente vía `/api/v1/auth/token/refresh/`.
3. `backend-node` valida firma y expiración localmente mediante `authMiddleware.js` usando la misma `JWT_SIGNING_KEY`, sin consultar a Django por cada token.
4. Para operaciones sensibles sobre entradas de seguimiento (`PersonalNote`), `djangoService.js` verifica propiedad contra Django (*fail-closed*: si Django no responde, la operación se deniega sin filtrar datos).

### 5.2 Motor de Búsqueda Tolerante y Validación Segura de Portadas
* **Búsqueda tolerante (`backend-django/catalog/search.py` & `frontend/src/utils/textSearch.js`):** Normaliza acentos/diacríticos, mayúsculas y variaciones tipográficas para encontrar obras (ej. `Matrix` vs `The Matrix`) y detectar duplicados al enviar propuestas.
* **Seguridad de portadas (`backend-django/catalog/utils.py`):** Valida URLs externas bloqueando direcciones privadas/loopback (anti-SSRF), rechaza SVG y verifica extensión, tamaño y *magic bytes* en subidas de imagen.

### 5.3 Recomendaciones IA con Protección Anti-Alucinación y Degradación Elegante
1. `backend-node` obtiene el catálogo activo (`is_active=True`) desde Django y lo envía junto con el `prompt` y el historial reciente a `POST /ai/recommend`.
2. `service-ai` aplica sanitización contra *prompt injection* y consulta a Groq Cloud API con timeout de `2.8s` (`docker-compose.yml` fija `llama-3.1-8b-instant` por defecto; `recommender.py` usa `openai/gpt-oss-20b` si no se define `GROQ_MODEL`).
3. Si `GROQ_API_KEY` está vacía, hay timeout o Groq devuelve JSON inválido/IDs inexistentes, `recommender.py` activa el **fallback determinista** sobre los `candidates` recibidos, marcando `degraded: true` y la cabecera `X-Degraded-AI: true`.
4. Tanto `service-ai` como `backend-node` revalidan los IDs recomendados contra el catálogo publicado, garantizando **cero alucinaciones** y **cero filtración de obras ocultas**.
