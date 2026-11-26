# CineTrack — Diagramas UML, Arquitectura y Flujos de Proceso

Todos los diagramas de este documento están escritos en sintaxis **Mermaid** válida y reflejan fielmente los componentes, modelos, rutas y flujos reales de la rama `main`.

---

## 1. Diagrama de Arquitectura / Componentes (Microservicios)

```mermaid
flowchart LR
    U["Visitante / Usuario / Admin (Navegador)"] --> PRX["Proxy Unificado (Nginx :8088 / local-proxy.mjs)"]
    PRX -->|"/"| FE["Frontend SPA (React 19 + Vite 8, :5173)"]
    PRX -->|"/django/*"| DJ["Backend Central (Django 6.1 + DRF + Graphene, :8000)"]
    PRX -->|"/node/*"| ND["Backend Complementario (Node.js + Express + GraphQL, :5000)"]
    FE -.->|"Modo local directo (CORS)"| DJ
    FE -.->|"Modo local directo (CORS)"| ND
    DJ -->|"ORM / ACID"| PG[("PostgreSQL 16 / SQLite QA")]
    ND -->|"Mongoose ODM"| MG[("MongoDB 7 (PersonalNote)")]
    ND -->|"GET /api/v1/media/ y verify-ownership"| DJ
    ND -->|"POST /ai/recommend (timeout 4s)"| AI["Microservicio IA (FastAPI + Pydantic v2, :8002)"]
    AI -->|"HTTPS (timeout 2.8s)"| GQ["Groq Cloud API (o Fallback Determinista)"]
```

---

## 2. Diagrama de Despliegue (Contenedores Docker + Red Interna)

```mermaid
flowchart TB
    Host["Host Local / Tailscale Serve (127.0.0.1:8088)"]
    subgraph DockerNet["Red Docker Bridge: cinetrack-net"]
        Proxy["cinetrack_proxy\nnginx:1.27-alpine\n127.0.0.1:8088 -> :80"]
        Frontend["cinetrack_frontend\nReact 19 + Vite\n127.0.0.1:5173"]
        Django["cinetrack_django\nDjango 6.1.2 + DRF\n127.0.0.1:8000"]
        Node["cinetrack_node\nNode.js 20 + Express\n127.0.0.1:5000"]
        AI["cinetrack_ai\nFastAPI + Uvicorn\n:8002 (solo red interna)"]
        PG[("cinetrack_postgres\npostgres:16-alpine\nVolumen: postgres_data")]
        MG[("cinetrack_mongo\nmongo:7\nVolumen: mongo_data")]
    end
    Ext["Groq Cloud API\n(HTTPS externo)"]

    Host --> Proxy
    Proxy --> Frontend
    Proxy --> Django
    Proxy --> Node
    Django --> PG
    Node --> MG
    Node --> Django
    Node --> AI
    AI --> Ext
```

---

## 3. Diagrama de Casos de Uso

```mermaid
flowchart LR
    V(["Visitante"])
    U(["Usuario Registrado (USER)"])
    A(["Administrador (ADMIN)"])

    UC1["Explorar catálogo activo y filtrar por tipo/género"]
    UC2["Búsqueda tolerante de obras y ver ficha /media/:id"]
    UC3["Registrarse e iniciar sesión (JWT)"]
    UC4["Gestionar diario privado /my-tracking (estado, plataforma, avance, favoritos)"]
    UC5["Crear/editar/eliminar notas privadas y rating 1..5 (MongoDB)"]
    UC6["Consultar asistente IA flotante (Claqueta)"]
    UC7["Proponer nuevas obras (MediaSubmission) y revisar propuestas"]
    UC8["Moderar propuestas: Publicar, Fusionar duplicados o Rechazar"]
    UC9["Crear/editar obras y géneros oficiales del catálogo"]

    V --> UC1
    V --> UC2
    V --> UC3

    U --> UC1
    U --> UC2
    U --> UC4
    U --> UC5
    U --> UC6
    U --> UC7

    A --> UC4
    A --> UC5
    A --> UC6
    A --> UC8
    A --> UC9
```

---

## 4. Diagramas de Secuencia

### 4.1 Autenticación JWT Centralizada y Consumo Desacoplado

```mermaid
sequenceDiagram
    actor User as Usuario
    participant FE as Frontend (AuthContext)
    participant DJ as backend-django (:8000)
    participant ND as backend-node (:5000)

    User->>FE: Ingresa email y contraseña
    FE->>DJ: POST /api/v1/auth/login/
    DJ-->>FE: 200 OK {access, refresh, user{id, role}}
    FE->>FE: Guarda tokens y decodifica sesión

    User->>FE: Guarda nota privada en /my-tracking
    FE->>ND: PUT /api/v1/personal-notes/:id (Bearer access)
    ND->>ND: Verifica firma HS256 con JWT_SIGNING_KEY
    ND->>DJ: GET /api/v1/tracking/:id/verify-ownership/
    DJ-->>ND: 200 OK (propietario verificado)
    ND-->>FE: 200 OK (PersonalNote guardada en MongoDB)
```

### 4.2 Recomendación IA con Claqueta Flotante y Fallback

```mermaid
sequenceDiagram
    actor User as Usuario Autenticado
    participant UI as FloatingRecommendationChat
    participant ND as backend-node (:5000)
    participant DJ as backend-django (:8000)
    participant AI as service-ai (:8002)
    participant GQ as Groq Cloud / Fallback

    User->>UI: Envía consulta en lenguaje natural
    UI->>ND: POST /api/v1/recommendations (Bearer JWT)
    ND->>ND: Valida JWT + Rate Limiter (5 req/min/user)
    ND->>DJ: GET /api/v1/media/ (is_active=True)
    DJ-->>ND: Catálogo publicado
    ND->>AI: POST /ai/recommend (prompt, candidates, history)
    AI->>GQ: Inferencia JSON estructurada (timeout 2.8s)
    alt Groq responde OK
        GQ-->>AI: IDs válidos del catálogo
    else Sin GROQ_API_KEY o fallo/timeout
        AI->>AI: Fallback determinista (degraded=true)
    end
    AI-->>ND: Hasta 3 recomendaciones filtradas + degraded
    ND-->>UI: Respuesta JSON + X-Degraded-AI
    UI-->>User: Renderiza tarjetas con enlace /media/:id
```

### 4.3 Moderación Transaccional de Propuestas (`PUBLISHED` / `MERGED` / `REJECTED`)

```mermaid
sequenceDiagram
    actor Admin as Administrador (ADMIN)
    participant FE as AdminSubmissionsPage
    participant DJ as backend-django (:8000)
    participant DB as PostgreSQL (select_for_update)

    Admin->>FE: Revisa propuesta PENDING + candidatos duplicados
    FE->>DJ: POST /api/v1/admin/submissions/:id/approve|merge|reject/
    DJ->>DB: BEGIN TRANSACTION + SELECT FOR UPDATE
    alt Aprobar (Publicar nueva obra)
        DJ->>DB: Crea MediaItem(is_active=True), actualiza MediaSubmission=PUBLISHED
        DJ->>DB: Actualiza UserProgress del proponente sin duplicar entrada
    else Fusionar contra obra existente (MERGED)
        DJ->>DB: Reconcilia UserProgress hacia resolved_media evitando colisión
    else Rechazar (REJECTED)
        DJ->>DB: Marca REJECTED + rejection_reason preservando diario privado
    end
    DB-->>DJ: COMMIT
    DJ-->>FE: 200 OK estado actualizado
```

### 4.4 Estado de WatchRooms en Tiempo Real (Heredado / Deshabilitado en `main`)

```mermaid
sequenceDiagram
    actor User as Cliente
    participant FE as Frontend (App.jsx)
    participant ND as backend-node (socketService.js)

    Note over FE,ND: En TP3 se diseñaron WatchRooms con Socket.IO.<br/>En el reenfoque de privacidad (main) fueron deshabilitadas.
    User->>FE: Navega por la SPA
    FE->>FE: Ruta /watchroom no montada (redirige a /)
    User->>ND: Conexión Socket.IO directa o POST /api/v1/reviews
    ND-->>User: Evento room_disabled / HTTP 410 Gone
```

---

## 5. Diagrama Entidad-Relación y Colección Documental

```mermaid
erDiagram
    User ||--o{ UserProgress : "registra"
    User ||--o{ MediaSubmission : "propone"
    MediaItem ||--o{ UserProgress : "seguida en"
    MediaItem ||--o{ Season : "contiene"
    Season ||--o{ Episode : "contiene"
    MediaItem }o--o{ Genre : "clasificada en"
    MediaSubmission }o--o{ Genre : "propone"
    MediaSubmission }o--o| MediaItem : "resuelve en"
    UserProgress ||--o| PersonalNote_Mongo : "anota en MongoDB"

    User {
        int id PK
        string email UK
        string username UK
        string role "USER | ADMIN"
        bool is_active
    }
    MediaItem {
        int id PK
        string title
        string media_type "PELICULA | SERIE"
        int release_year
        bool is_active
        string country_of_origin
        string poster_image
    }
    Genre {
        int id PK
        string name UK
    }
    Season {
        int id PK
        int media_item_id FK
        int season_number
    }
    Episode {
        int id PK
        int season_id FK
        int episode_number
        string title
        int duration_minutes
    }
    UserProgress {
        int id PK
        int user_id FK
        int media_item_id FK
        int source_submission_id FK
        string status "PENDIENTE | VIENDO | VISTO"
        bool is_favorite
        string watch_platform
        int current_season_number
        int current_episode_number
        int current_seconds
    }
    MediaSubmission {
        int id PK
        int submitted_by_id FK
        int resolved_media_id FK
        string title
        string status "PENDING | PUBLISHED | MERGED | REJECTED"
        string rejection_reason
    }
    PersonalNote_Mongo {
        string ownerUserId "Indexado (JWT user_id)"
        int trackingEntryId "Indexado (UserProgress.id)"
        int rating "1..5 o null"
        string comment "max 2000 chars"
    }
```

---

## 6. Diagramas de Flujo de Procesos Clave

### 6.1 Flujo de Búsqueda Tolerante (`catalog/search.py` & `textSearch.js`)

```mermaid
flowchart TD
    A["Usuario escribe consulta (ej. 'matrix' o 'ciencia ficcion')"] --> B["Normalización Unicode (NFD), eliminación de acentos y minúsculas"]
    B --> C["Tokenización y limpieza de artículos/puntuación"]
    C --> D{"¿Coincidencia exacta o por subcadena?"}
    D -->|"Sí"| E["Prioriza coincidencias exactas / prefijo"]
    D -->|"No"| F["Evaluación difusa (similitud / distancia de edición)"]
    E --> G["Filtra únicamente obras con is_active=True"]
    F --> G
    G --> H["Retorna resultados paginados y ordenados por relevancia"]
```

### 6.2 Flujo de Aprobación y Conciliación de Propuestas (`MediaSubmission`)

```mermaid
flowchart TD
    A["Usuario envía propuesta en /my-tracking"] --> B["Validación de campos y portada (anti-SSRF / magic bytes)"]
    B --> C["Detección automática de duplicados (ej. 'Matrix' vs 'The Matrix')"]
    C --> D["Creación de MediaSubmission (PENDING) + entrada en UserProgress"]
    D --> E["Administrador revisa en /admin/submissions"]
    E --> F{"Decisión de Moderación"}
    F -->|"Publicar"| G["Crea MediaItem activo y vincula UserProgress"]
    F -->|"Fusionar"| H["Vincula a MediaItem existente y concilia duplicados"]
    F -->|"Rechazar"| I["Registra rejection_reason y conserva progreso privado"]
```
