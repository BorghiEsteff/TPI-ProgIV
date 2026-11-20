# CineTrack — Contribución al Informe Final Integrador (TP 5)
## Frente Tecnológico: JavaScript, Node.js, Express y MongoDB

**Responsable:** Ari (Línea Node.js y Coordinación de Repositorio)  
**Cátedra:** Programación IV (Plan 2024) - UTN Facultad Regional Resistencia (Extensión Áulica Goya)  
**Proyecto:** CineTrack (Plataforma Políglota de Seguimiento Multimedia)

---

## 1. Responsabilidad Técnica y Alcance Arquitectónico

En la arquitectura distribuida y políglota vigente en `main`, el sistema se organiza entre dos frentes complementarios:
- **Frente Python (Estefanía):** Catálogo relacional centralizado (`MediaItem`, `Genre`, `Season`, `Episode`, `MediaSubmission`) y diario privado (`UserProgress`) en Django 6.1 / PostgreSQL 16, además del microservicio de recomendaciones en FastAPI (`service-ai`).
- **Frente JavaScript / Node.js (Ari):** API REST de notas personales privadas (`PersonalNote` en MongoDB), proxy resiliente hacia el microservicio de recomendaciones IA (`/api/v1/recommendations`) con *rate limiting* por usuario, verificación criptográfica desacoplada de identidad (SimpleJWT), consulta GraphQL `publicMediaDetails`, retiro controlado (`410 Gone`) de reseñas públicas heredadas y contenedorización `node:20-alpine`.

---

## 2. Arquitectura del Backend Node.js y Estructura Modular

```text
backend-node/
├── src/
│   ├── config/          # Conexión a MongoDB con Mongoose (db.js)
│   ├── controllers/     # personalNoteController.js, recommendationController.js (+ legado reviewController.js -> 410)
│   ├── graphql/         # Esquema GraphQL (publicMediaDetails)
│   ├── middlewares/     # Seguridad JWT (authMiddleware.js) y errorHandler.js
│   ├── models/          # PersonalNote.js (+ legado Review.js / ActivityLog.js)
│   ├── routes/          # personalNoteRoutes.js, recommendationRoutes.js
│   ├── services/        # Clientes resilientes (djangoService.js, aiService.js) y socketService.js (deshabilitado)
│   ├── validators/      # Validación estricta Zod
│   ├── app.js           # Express, Helmet, CORS, GraphQL y /health
│   └── server.js        # Servidor HTTP con orígenes permitidos configurables
├── tests/               # 6 suites Jest (25 tests)
└── Dockerfile           # Construcción multietapa en Node 20 Alpine
```

---

## 3. Modelo de Datos Documental (MongoDB + Mongoose)

La colección activa **`personalnotes`** (`backend-node/src/models/PersonalNote.js`) almacena las anotaciones privadas del usuario:
- **`userId` (Number, indexado):** Identidad extraída del claim `user_id` del JWT emitido por Django.
- **`mediaId` (Number, indexado):** Referencia lógica a `MediaItem` en Django.
- **Índice compuesto único `{ userId: 1, mediaId: 1 }`:** Garantiza una nota privada por usuario y obra.
- **`rating` (Number, entero `1..5`, opcional) y `notes` (String, máx. 2000 caracteres).**

Los endpoints heredados `/api/v1/reviews` devuelven **`410 Gone`** y las WatchRooms (`socketService.js`) permanecen deshabilitadas para proteger la privacidad del diario personal.

---

## 4. Integración Resiliente con Django y `service-ai`

1. **Verificación de propiedad y catálogo (`djangoService.js`):**
   - Antes de crear/leer notas o recomendar, Node consulta a Django (`verify-ownership` / catálogo activo `is_active=True`).
   - Si Django no está disponible o agota el timeout, falla de forma cerrada/segura sin filtrar obras ocultas ni datos ajenos.
2. **Proxy de recomendaciones IA (`recommendationController.js` + `aiService.js`):**
   - Protegido por `authenticateJWT` y `createRecommendationRateLimiter` (límite por `userId`).
   - Envía consulta, catálogo publicado e historial acotado a `service-ai` (`POST /ai/recommend`) con timeout de 4000 ms, propagando `degraded: true` y revalidando IDs para impedir recomendaciones fuera del catálogo activo.

---

## 5. Seguridad, GraphQL y Despliegue

- **JWT Desacoplado (`authMiddleware.js`):** Valida firma HS256 compartida (`JWT_SIGNING_KEY`) y expiración sin consultar a Django en cada request; distingue roles `USER` y `ADMIN`.
- **GraphQL (`/graphql`):** Expone `publicMediaDetails`, preservando el aislamiento de notas privadas.
- **OpenAPI 3.0:** Contrato vigente documentado en `docs/tp-4-contenedores-despliegue/openapi.json`.
- **Contenedorización:** `node:20-alpine` ejecutando bajo usuario no privilegiado `node`.

---

## 6. Calidad de Software: Suite de Pruebas Automatizadas (Jest)

Suite verificada de **6 archivos y 25 tests pasando** (`npm test`):
- `tests/personalNote.test.js`: CRUD privado, límites `1..5` y aislamiento por propietario.
- `tests/recommendations.test.js`: proxy IA, filtrado de obras ocultas, modo degradado y *rate limit*.
- `tests/auth.test.js`: verificación JWT, expiración y rechazo `401`.
- `tests/graphql.test.js`: consulta `publicMediaDetails`.
- `tests/review.test.js` y `tests/realtime.test.js`: verificación de respuesta `410 Gone` y comportamiento legado deshabilitado.
