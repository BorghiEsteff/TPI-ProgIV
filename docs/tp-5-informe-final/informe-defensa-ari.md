# CineTrack — Contribución al Informe Final Integrador (TP 5)
## Frente Tecnológico: JavaScript, Node.js, Express, MongoDB y Tiempo Real
**Responsable:** Ari (Línea Node.js y Coordinación de Repositorio)  
**Cátedra:** Programación IV (Plan 2024) - UTN Facultad Regional Resistencia (Extensión Áulica Goya)  
**Proyecto:** CineTrack (Plataforma Políglota de Seguimiento Multimedia y Capa Social)

---

## 1. Responsabilidad Técnica y Alcance Arquitectónico

En el marco de la arquitectura distribuida y políglota de **CineTrack**, el sistema se divide limpiamente entre dos frentes complementarios:
- **Frente Python (Estefi):** Gestión del catálogo relacional centralizado (`MediaItem`, temporadas, episodios) en Django REST Framework sobre PostgreSQL 16, microservicio de Inteligencia Artificial en FastAPI con inferencia local de modelos LLM, y orquestación general.
- **Frente JavaScript / Node.js (Ari):** Diseño e implementación integral de la API REST de reseñas, árbol de respuestas anidadas, capa de presencia e interacción social en tiempo real (WatchRooms con Socket.IO 4), verificación criptográfica desacoplada de identidad (JWT), federación de consultas mediante GraphQL, containerización de producción y administración del flujo de integración en GitHub.

---

## 2. Arquitectura del Backend Node.js y Estructura Modular

El servicio Node.js adopta un patrón arquitectónico en capas (`Controller-Service-Repository/Model`), permitiendo alta cohesión, desacoplamiento y facilidad de testeo unitario:

```text
backend-node/
├── src/
│   ├── config/          # Conexión a MongoDB con Mongoose (db.js)
│   ├── controllers/     # Controladores HTTP de reseñas y capa social (reviewController.js)
│   ├── graphql/         # Esquema federado y resolvers unificados (schema.js)
│   ├── middlewares/     # Seguridad JWT (authMiddleware.js) y manejo de errores (errorHandler.js)
│   ├── models/          # Modelos de datos Mongoose (Review.js, ActivityLog.js)
│   ├── routes/          # Definición y ruteo de endpoints REST (reviewRoutes.js)
│   ├── services/        # Clientes resilientes (djangoService.js, aiService.js, socketService.js)
│   ├── validators/      # Esquemas de validación estricta Zod (reviewValidator.js)
│   ├── app.js           # Ensamblado de Express, middlewares globales y GraphQL
│   └── server.js        # Inicialización del servidor HTTP, Socket.IO y conexión a DB
├── tests/               # Pruebas automatizadas con Jest (review, auth, realtime, graphql)
└── Dockerfile           # Construcción multietapa ligera en Node 20 Alpine
```

---

## 3. Modelo de Datos Documental (MongoDB + Mongoose 8)

El modelo de datos social se diseñó bajo un enfoque documental óptimo para lectura y atomicidad:

### 3.1 Esquema `Review` y Subdocumento `Reply`
- **`mediaItemId` (Number):** Clave foránea lógica que referencia al identificador primario de la obra en el catálogo relacional de Django (PostgreSQL).
- **`userId` (String) y `userName` (String):** Identidad del autor, validada y extraída del token criptográfico JWT.
- **`rating` (Number):** Valor numérico entero estrictamente validado entre 1 y 10.
- **`comment` (String):** Reseña con longitud máxima de 2000 caracteres.
- **`isSpoiler` (Boolean):** Indicador de revelación de trama (clasificado por el usuario o sugerido por el microservicio de IA).
- **`replies` (Array de Subdocumentos):** Estructura embebida para comentarios anidados, permitiendo recuperar en una sola operación de lectura toda la conversación sin requerir joins costosos.
- **Índice Compuesto:** `{ mediaItemId: 1, createdAt: -1 }`, optimizado para soportar consultas con paginación y orden cronológico inverso inmediato.

### 3.2 Esquema `ActivityLog`
Registra eventos de auditoría sobre acciones sociales (`CREATE_REVIEW`, `UPDATE_REVIEW`, `DELETE_REVIEW`, `ADD_REPLY`) para seguimiento analítico y seguridad.

---

## 4. Integración Resiliente con Django y Modo Degradado

De acuerdo al contrato documentado en `docs/tp-1-crud-persistencia/integracion.md`, Node.js consulta a Django (`GET /api/v1/media/{id}/`) antes de persistir una reseña. Se implementó una estrategia estricta de resiliencia en `djangoService.js`:
1. **Timeout Estricto:** Máximo 2500 ms configurado mediante variable de entorno (`DJANGO_TIMEOUT_MS`).
2. **Respuesta 404:** Si Django indica que la obra no existe, la petición es rechazada de inmediato con HTTP 404 (`MEDIA_NOT_FOUND`), preservando la integridad referencial distribuida.
3. **Falla de Servicio o Timeout (5xx / ECONNREFUSED):** Si el catálogo Django se encuentra temporalmente inaccesible o agota los 2.5s, Node.js **no se cuelga ni bloquea**. Se activa el **Modo Degradado** (`{ exists: true, degraded: true }`) y se emite la cabecera HTTP `X-Degraded-Mode: true` al cliente, informando la contingencia sin interrumpir el servicio.

---

## 5. Seguridad Criptográfica y Control de Acceso (RBAC)

- **Desacoplamiento Total:** Node.js valida la autenticidad y expiración del token JWT emitido por Django SimpleJWT mediante la clave simétrica compartida `JWT_SIGNING_KEY` (algoritmo `HS256`), sin necesidad de consultar la base de datos de usuarios en cada solicitud.
- **Control de Autoría:** Se implementó una verificación estricta en operaciones de modificación (`PUT`) y eliminación (`DELETE`): únicamente el usuario que creó originalmente la reseña (`review.userId === req.user.id`) o un usuario con rol de administrador (`ADMIN`) pueden alterar o borrar el registro.
- **Mitigación OWASP Top 10:** Headers de seguridad mediante `helmet`, protección contra inyecciones vía tipado fuerte con Zod, y manejo centralizado de respuestas HTTP 401 y 403.

---

## 6. Tiempo Real (WatchRooms con Socket.IO 4) e Inteligencia Artificial

- **Salas de Presencia Compartida:** Permite a múltiples usuarios interactuar mientras ven el mismo título, sincronizar el estado de reproducción (`sync_playback_state`) y emitir comentarios en vivo (`new_room_message`).
- **Autenticación en Handshake:** Los sockets validan el token JWT al momento de establecer la conexión WebSocket.
- **Integración con Microservicio IA:** Cliente HTTP (`aiService.js`) que consume el endpoint `/ai/review-guard` de FastAPI para detectar spoilers con timeout de 4000 ms y fallback automático ante caídas del modelo.

---

## 7. Capa GraphQL y Despliegue en Contenedores

- **GraphQL Federado (`/graphql`):** Expone consultas unificadas (`mediaDetailsWithReviews`) que resuelven simultáneamente la metadata de la película o serie (desde Django/PostgreSQL) y el historial de reseñas, promedio de calificación y comentarios anidados (desde Node/MongoDB).
- **OpenAPI 3.0:** Documentación formal de la API REST en `docs/tp-4-contenedores-despliegue/openapi.json`.
- **Dockerfile Multietapa:** Construcción en dos fases (builder + imagen final `node:20-alpine`) bajo usuario no privilegiado `node` para máxima seguridad y mínima superficie de ataque en producción.

---

## 8. Calidad de Software: Suite de Pruebas Automatizadas

Se diseñó e implementó una suite exhaustiva de **18 pruebas unitarias y de integración simulada** ejecutadas con Jest bajo ESModules, con un 100% de éxito:

| Suite de Pruebas | Archivo | Pruebas | Cobertura Funcional |
|---|---|---|---|
| **Reseñas & CRUD** | `tests/review.test.js` | 7 tests | Creación, límites Zod, replies anidados, timeout degradado, 404 Django, actualización y baja. |
| **Seguridad & RBAC** | `tests/auth.test.js` | 6 tests | Acceso válido SimpleJWT, ausencia de token, firma corrupta, expiración y control de roles. |
| **Tiempo Real & IA** | `tests/realtime.test.js` | 3 tests | Clasificación de spoiler, fallback de IA por timeout y presencia/eventos en WatchRooms. |
| **Capa GraphQL** | `tests/graphql.test.js` | 2 tests | Consulta de reseñas por obra y resolver federado catálogo-social con cálculo de promedio. |
| **TOTAL** | **4 suites** | **18 tests** | **100% Exitosos (0 fallos)** |

---

## 9. Guion Práctico de Defensa Oral para Ari (5 Minutos)

1. **Introducción y Enfoque Políglota (1 min):**  
   *"En CineTrack tuve a mi cargo la línea tecnológica de Node.js, Express y MongoDB. Elegimos MongoDB y Node para la capa social porque el volumen de reseñas y comentarios anidados se adapta naturalmente al formato documental, permitiendo lecturas atómicas sin sobrecargar la base de datos relacional del catálogo general."*

2. **Resiliencia e Integración con Django (1.5 min):**  
   *"Para mantener la integridad sin acoplar fuertemente los servicios, implementé un cliente Axios con timeout de 2.5 segundos que valida la existencia del contenido en Django. Si la película no existe responde 404; pero si Django se cae, el servidor Node activa el modo degradado (`X-Degraded-Mode: true`) garantizando alta disponibilidad."*

3. **Seguridad y Autoría (1 min):**  
   *"Implementé autenticación JWT desacoplada compatible con Django SimpleJWT. Node valida la firma simétrica con `JWT_SIGNING_KEY` en memoria. Además, aseguré el control de autoría: nadie puede editar o borrar una reseña que no le pertenezca, salvo un usuario con rol ADMIN."*

4. **Tiempo Real, IA y GraphQL (1.5 min):**  
   *"Completé la capa de WatchRooms con Socket.IO para sincronizar reproducción y chat en vivo con autenticación en el handshake. Conecté el microservicio de IA para detección de spoilers con fallback seguro, y finalmente expuse un endpoint GraphQL que unifica la consulta de catálogo y reseñas en una sola petición. Toda la solución está respaldada por 18 pruebas automatizadas y empaquetada en un Dockerfile multietapa optimizado."*
