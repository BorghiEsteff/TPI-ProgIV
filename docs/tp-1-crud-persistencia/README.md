# TP 1: APIs CRUD, Persistencia Políglota e Integración Inter-Servicios

**Asignatura:** Programación IV (Plan 2024) - UTN FRRE (Extensión Áulica Goya)  
**Proyecto:** CineTrack  

---

## 1. Objetivos del Trabajo Práctico
Implementar las capas fundamentales de persistencia políglota y endpoints RESTful, articulando la comunicación inter-servicios con tolerancia a fallos.

---

## 2. Requisitos y Entregables

### 2.1 Backend Django (PostgreSQL 16)
- **Modelos relacionales:**
  - `User`, `Genre`, `MediaItem`, `Season`, `Episode`, `UserProgress`.
  - Migraciones consistentes y sin conflictos.
- **Serializers y ViewSets (DRF):**
  - CRUD completo para catálogo y tracking granular.
  - Endpoint especializado para actualización de progreso: `PATCH /api/v1/tracking/series/:id/progress/`.
  - Paginación estándar y filtros por género, productora, estado y favoritos.

### 2.2 Backend Node.js / Express (MongoDB 7)
- **Modelos y Schemas Mongoose:**
  - Colección `reviews` con puntuación (1-10), comentario, bandera `is_spoiler` y subdocumentos anidados para respuestas (`replies`).
- **Arquitectura en capas:**
  - Schemas, Repositories/Services, Controllers y validación exhaustiva con Zod.
- **Endpoints CRUD:**
  - `POST /api/v1/reviews/`, `GET /api/v1/reviews/series/:id`, `POST /api/v1/reviews/:id/replies`.

### 2.3 Integración Inter-Servicios (`integracion.md`)
- Consumo de la API de Django desde Node.js mediante cliente Axios configurado con:
  - Timeout estricto de 2500 ms.
  - Estrategia de degradación elegante: ante caída o demora de Django, retornar los datos sociales disponibles con el header `X-Degraded-Mode: true`.
- Documento formal explicativo en `docs/tp-1-crud-persistencia/integracion.md`.

### 2.4 Suite de Pruebas Unitarias
- **Django:** Tests con Pytest / `pytest-django` para validar integridad referencial y lógica de tracking en segundos.
- **Node.js:** Tests con Jest y Supertest para validar contratos de entrada Zod y operaciones sobre subdocumentos.
