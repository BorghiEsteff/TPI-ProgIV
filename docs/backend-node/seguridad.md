# TP 2: Especificación de Seguridad, Autenticación JWT y Matriz RBAC

## 1. Arquitectura de Seguridad Desacoplada

En la arquitectura políglota de **CineTrack**:
- **Django (SimpleJWT):** Actúa como la **Autoridad de Identidad (IdP)** emitiendo tokens criptográficos firmados con HMAC-SHA256 (`HS256`).
- **Node.js (Express):** Valida de forma completamente desacoplada y estricta la firma simétrica y vigencia del token JWT mediante `process.env.JWT_SIGNING_KEY`, sin golpear la base de datos de PostgreSQL en cada petición.

---

## 2. Matriz de Roles y Control de Acceso (RBAC)

| Recurso / Operación | Método & Endpoint | Roles Autorizados | Regla de Negocio / Autoría |
|---|---|---|---|
| **Catálogo de Medios** | `GET /api/v1/media/` | Público | Lectura abierta del catálogo |
| **Reseñas por Título** | `GET /api/v1/reviews/media/:id` | Público | Lectura paginada abierta |
| **Crear Reseña** | `POST /api/v1/reviews/` | `USER`, `CRITIC`, `ADMIN` | Identidad extraída del token JWT (`req.user.id`) |
| **Actualizar Reseña** | `PUT /api/v1/reviews/:id` | Autor o `ADMIN` | Solo el autor original o un usuario con rol `ADMIN` pueden editar |
| **Responder a Reseña** | `POST /api/v1/reviews/:id/replies` | `USER`, `CRITIC`, `ADMIN` | Agrega reply anidado asociando identidad del token |
| **Eliminar Reseña** | `DELETE /api/v1/reviews/:id` | Autor o `ADMIN` | Solo el creador de la reseña o un moderador `ADMIN` pueden borrar |

---

## 3. Checklist de Mitigación OWASP Top 10 en Node.js

1. **A01: Broken Access Control:** Verificación estricta en middleware (`authenticateJWT`) y comparación de autoría (`review.userId === req.user.id || req.user.role === 'ADMIN'`).
2. **A02: Cryptographic Failures:** Firma criptográfica HMAC-SHA256 con clave secreta compartida (`JWT_SIGNING_KEY`). Rechazo inmediato ante firmas adulteradas o tokens expirados.
3. **A03: Injection:** Esquemas estrictos de validación con **Zod** y tipado Mongoose. Ninguna concatenación de strings en queries a base de datos.
4. **A04: Insecure Design:** Modo degradado documentado (`X-Degraded-Mode: true`) que no bloquea la aplicación si Django sufre un corte de servicio.
5. **A05: Security Misconfiguration:** Headers de seguridad HTTP activados globalmente con **Helmet**. CORS restringido por variable de entorno (`CLIENT_ORIGIN`).
6. **A07: Identification and Authentication Failures:** Uso estricto de Bearer tokens temporales (1 hora de vigencia en access token) y manejo unificado de códigos HTTP 401 y 403.
