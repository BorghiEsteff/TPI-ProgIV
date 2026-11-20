# CineTrack — Informe Técnico Integral (TP 5)
## Frente Tecnológico: Python, Django REST Framework, PostgreSQL 16, FastAPI, Groq LPU y DevOps

> **Nota de actualización al estado final (`main`):** este documento conserva el detalle histórico de TP1–TP4. En la versión integrada final de `main`, el ecosistema incorpora **6 contenedores en `docker-compose.yml`** (incluyendo `frontend`), roles consolidados en **`USER` y `ADMIN`** (`CRITIC` migrado), **notas privadas en MongoDB** en reemplazo de reseñas públicas/WatchRooms, y **Groq Cloud + fallback determinista** (`POST /ai/recommend`) con asistente flotante en React. Ver [ARQUITECTURA_AS_BUILT.md](../ARQUITECTURA_AS_BUILT.md), [CUMPLIMIENTO_TP0_TP5.md](../CUMPLIMIENTO_TP0_TP5.md) y [ACTA_VALIDACION_FINAL.md](../qa/ACTA_VALIDACION_FINAL.md).
**Responsable:** Estefanía Borghi  
**Cátedra:** Programación IV (Plan 2024) - UTN Facultad Regional Resistencia (Extensión Áulica Goya)  
**Proyecto:** CineTrack (Plataforma Políglota de Seguimiento Multimedia y Capa Social)

---

## 1. Arquitectura del Sistema y Topología de Red

El proyecto **CineTrack** resuelve la disparidad de requisitos de una plataforma multimedia moderna mediante una **arquitectura políglota de microservicios contenerizados**. Cada componente se implementó con la tecnología más idónea para su dominio de persistencia y concurrencia.

```mermaid
flowchart TD
    subgraph Clients [Capa de Clientes / Consumidores]
        WebClient["Frontend Web / SPA"]
        APIClient["Swagger UI / GraphiQL / Postman"]
    end

    subgraph Network [Red Virtual Bridge: cinetrack-net]
        subgraph CoreIdentity [Servicio Central de Identidad y Catálogo]
            Django["django-backend (Port 8000)<br/>Python 3.12 / DRF + GraphQL"]
            PG[("PostgreSQL 16 (Port 5432)<br/>cinetrack_db<br/>Single Source of Truth")]
        end

        subgraph SocialLayer [Servicio de Reseñas y Tiempo Real]
            Node["node-backend (Port 5000)<br/>Node.js 20 / Express + Socket.IO"]
            Mongo[("MongoDB 7 (Port 27017)<br/>cinetrack_social<br/>Colección Reviews")]
        end

        subgraph AIService [Microservicio Semántico de IA]
            FastAPI["service-ai (Port 8002)<br/>FastAPI / Pydantic v2"]
            GroqCloud["Groq Cloud LPU API<br/>llama-3.1-8b-instant"]
        end
    end

    WebClient -->|HTTP / OpenAPI / GraphQL| Django
    WebClient -->|REST / WebSocket| Node
    APIClient -->|Documentación y Testing| Django

    Django -->|Transaccional relacional| PG
    Node -->|Documentos y comentarios| Mongo
    Node -->|Validación HTTP 2500ms| Django
    Node -->|Detección Spoilers HTTP 4000ms| FastAPI
    FastAPI -->|Inferencia ultrarrápida 2.8s| GroqCloud
```

### Topología de Red y Contenedores (`docker-compose.yml`)
Los 6 contenedores principales (más `proxy` Nginx opcional en `feat/tailscale-serve-proxy`) conviven en la red virtual bridge `cinetrack-net`:
1. `cinetrack_postgres`: PostgreSQL 16 Alpine (`5432`), volumen persistente `postgres_data` y healthcheck `pg_isready`.
2. `cinetrack_mongo`: MongoDB 7 (`27017`), volumen persistente `mongo_data` y healthcheck `mongosh ping`.
3. `cinetrack_django`: Django 6.1.2 REST + Graphene GraphQL (`8000`), dependiente de `postgres` saludable.
4. `cinetrack_node`: Express + GraphQL (`5000`), dependiente de `mongo`, `django-backend` y `service-ai`.
5. `cinetrack_ai`: FastAPI + Groq / fallback determinista (`8002`), healthcheck en `/health`.
6. `cinetrack_frontend`: SPA React 19 + Vite 8 (`5173`).

---

## 2. Frente TP 1: Persistencia Relacional y Modelo de Dominio

### 2.1 Modelo Entidad-Relación en PostgreSQL 16
Implementado en `backend-django/catalog/models.py` y `backend-django/tracking/models.py`:
- **`Genre`**: Nombre único (`unique=True`) para categorización taxonómica.
- **`MediaItem`**: Catálogo unificado con discriminador `media_type` (`SERIE` o `PELICULA`), título, productora, fecha de estreno, póster y relación ManyToMany con `Genre`.
- **`Season`**: Foreign Key a `MediaItem`, `season_number` y restricción `unique_together = ('media_item', 'season_number')`.
- **`Episode`**: Foreign Key a `Season`, `episode_number`, título, duración en minutos y restricción `unique_together = ('season', 'episode_number')`.
- **`UserProgress`**: Seguimiento granular de visualización vinculado a `CustomUser` y `MediaItem`, con restricción de unicidad estricta `unique_together = ('user', 'media_item')`.

### 2.2 Invariantes de Dominio y Justificación del Tracking Temporal
1. **Unificación Jerárquica:** Se evitó dividir películas y series en tablas separadas. La entidad `MediaItem` actúa como raíz polimórfica. A nivel de modelos (`clean()`) y serializers DRF, se restringe que una `PELICULA` no pueda asociar temporadas ni episodios.
2. **Progreso en Segundos Acumulados (`current_seconds`):**
   - Elimina problemas de conversión de formatos de tiempo (ej. `HH:MM:SS`), discrepancias de zona horaria y redondeos de coma flotante.
   - Es directamente interoperable con APIs HTML5 (`HTMLMediaElement.currentTime`).
   - La tupla (`current_season_number`, `current_episode_number`, `current_seconds`) identifica el fotograma exacto pausado en series, mientras que en películas `current_seconds` representa la posición temporal absoluta.
3. **Autocompletado de Estados:** Al pasar a estado `VIENDO`, el serializer autocompleta `started_at` si estaba vacío; al marcarse como `VISTO`, autocompleta `finished_at`.

---

## 3. Frente TP 2: Identidad Centralizada, JWT y Matriz RBAC

### 3.1 Autoridad Central de Identidad (Single Source of Truth)
Django REST Framework es el emisor exclusivo de identidad y credenciales en CineTrack:
- **Modelo `CustomUser` (`backend-django/users/models.py`):** Hereda de `AbstractUser` configurando `USERNAME_FIELD = 'email'` y `REQUIRED_FIELDS = ['username']`. Define dos roles efectivos: `ADMIN` y `USER` (la migración `users/0002_migrate_critic_to_user.py` consolidó el antiguo `CRITIC` en `USER`).
- **Almacenamiento de Contraseñas:** Procesadas mediante `PBKDF2` con sal criptográfica y hash `SHA-256` (720.000 iteraciones). Cero contraseñas en texto plano.

### 3.2 SimpleJWT con Custom Claims y Verificación Desacoplada
Configurado en `core/settings.py` y `users/serializers.py` (`CustomTokenObtainPairSerializer`):
- **Algoritmo:** `HS256` (HMAC con SHA-256).
- **Clave compartida:** `JWT_SIGNING_KEY` distribuida a través de variables de entorno entre Django y Node.js.
- **Vida útil:** 60 minutos (access token) y 24 horas (refresh token).
- **Claims inyectados en el access token:**
  ```json
  {
    "user_id": 1,
    "username": "estefania",
    "email": "estefania@cinetrack.local",
    "role": "USER",
    "exp": 1731175200,
    "iat": 1731171600
  }
  ```
- **Interoperabilidad:** Node.js valida la firma sin consultar a la base de datos de Django en cada petición, desacoplando completamente la carga de red.

### 3.3 Matriz de Roles (RBAC) y Seguridad en Endpoints
- **Permisos `IsAdminRole` y `IsAdminOrReadOnly` (`core/permissions.py`):** Restringen la creación/edición directa del catálogo, géneros y moderación de propuestas exclusivamente al rol `ADMIN`.
- **Aislamiento por Objeto en `/api/v1/tracking/`:** Protegido con `IsAuthenticated`. `get_queryset()` filtra forzosamente por `user=request.user`, impidiendo ataques IDOR (Insecure Direct Object References).

---

## 4. Frente TP 3: Microservicio de Recomendaciones IA y Optimización de Consultas

### 4.1 Microservicio FastAPI con Groq (`service-ai/`)
Estructurado con FastAPI y Pydantic v2 en el puerto `8002`, consumido exclusivamente *backend-to-backend* por `backend-node`:
- **Endpoint vigente:** `POST /ai/recommend` (el antiguo `/ai/review-guard` fue retirado junto con las reseñas públicas).
- **Request (`RecommendRequest`):** `prompt: str`, `catalog: List[CandidateMedia]`, `history: List[HistoryMessage]`, `limit: int`.
- **Response (`RecommendResponse`):** `message: str`, `recommendations: List[RecommendationItem]` (máx. 3), `degraded: bool`.

### 4.2 Modelo e Inferencia Segura
- **Modelo por defecto:** `service-ai/services/recommender.py` define `DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"`, mientras que `docker-compose.yml` establece `llama-3.1-8b-instant` si no se define `GROQ_MODEL`.
- **Validación estricta:** Protección contra *prompt injection*, revalidación de IDs contra el catálogo publicado (`is_active=True`) para evitar títulos inventados, y timeout de `2.8s` (4000 ms en el cliente Node).

### 4.3 Circuito de Contingencia / Fallback Determinista
Si no existe `GROQ_API_KEY`, o si la API de Groq responde con error o JSON inválido:
- Se activa el motor determinista (`degraded: true`), evaluando coincidencias reales de géneros, tipo y sinopsis sobre el catálogo recibido sin inventar títulos de relleno.

### 4.4 Optimización Relacional y Erradicación de N+1 en Django
- **Índices en Modelos:**
  - `MediaItem`: `db_index=True` e índices compuestos `media_type_active_idx` sobre `(media_type, is_active)` y `media_date_title_idx` sobre `(release_date, title)`.
  - `Season` & `Episode`: Índices compuestos sobre `(media_item, season_number)` y `(season, episode_number)`.
  - `UserProgress`: Índices compuestos sobre `(user, media_item)`, `(user, status)` y `(user, is_favorite)`.
- **Erradicación de N+1:** Uso de `prefetch_related("genres", "seasons__episodes")` en `MediaItemViewSet` y `select_related("media_item")` en `UserProgressViewSet`.
- **Comando de Benchmark (`benchmark_queries.py`):** Demuestra planes de búsqueda `SEARCH TABLE catalog_mediaitem USING INDEX media_type_active_idx` y reducción de consultas anidadas a 4 consultas SQL globales para todo el catálogo.

---

## 5. Frente TP 4: OpenAPI 3.0, GraphQL y Contenedorización

### 5.1 OpenAPI 3.0 y Swagger UI en Django
- Configurado con `drf-spectacular` en `/api/schema/`, `/api/docs/` y `/api/redoc/`.
- Exportación estática en `docs/tp-4-contenedores-despliegue/openapi-django.json` (OpenAPI 3.0.3, **27 rutas documentadas**).

### 5.2 Capa GraphQL en Django (`graphene-django`)
- Expuesto en `/graphql/` con GraphiQL interactivo cuando `DEBUG=True`.
- Resolvers `allMediaItems` y `mediaItemById` (filtrando `is_active=True`) con precarga optimizada.

### 5.3 Contenedorización Multi-Stage y Seguridad
- **`backend-django/Dockerfile`:** Multi-stage build con `python:3.12-slim`, compilación aislada en builder y ejecución final con usuario no-root `appuser` (UID 1000).
- **`service-ai/Dockerfile`:** Imagen limpia con usuario `aiuser` (UID 1001) y servidor `uvicorn`.

---

## 6. Resultados de Validación y Cobertura de Pruebas

Cierre vigente en `main` (ver detalle completo en [ACTA_VALIDACION_FINAL.md](../qa/ACTA_VALIDACION_FINAL.md)):
- **Backend Django (`pytest`):** **29/29 tests pasados** (tanto en SQLite como en PostgreSQL 16 Docker).
- **Service AI (`pytest`):** **9/9 tests pasados** + prueba en vivo con Groq (`degraded: false`).
- **Backend Node.js (`npm test`):** **25/25 tests pasados** en 6 suites.
- **Frontend Vitest (`npm test`):** **24/24 tests pasados** en 7 archivos + `npm run build` exitoso.
- **Playwright E2E:** **22/22 `chromium-desktop`** + **22/22 `chromium-mobile`** (con re-sembrado de `db.qa.sqlite3` entre proyectos).
- **Pruebas de Interoperabilidad Cruzada:** Validadas con éxito (emisión y verificación de tokens entre Django y Node, y federación GraphQL híbrida entre ambos backends).

