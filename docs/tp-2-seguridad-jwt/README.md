# TP 2: Seguridad, Autenticación y Autorización Centralizada

**Asignatura:** Programación IV (Plan 2024) - UTN FRRE (Extensión Áulica Goya)  
**Proyecto:** CineTrack  

---

## 1. Objetivos del Trabajo Práctico
Implementar un esquema de autenticación desacoplado y seguro utilizando tokens JWT compartidos entre múltiples tecnologías, aplicando directrices de seguridad OWASP Top 10.

---

## 2. Requisitos y Entregables

### 2.1 Emisor Único de Tokens (Django + SimpleJWT)
- Django actúa como **único emisor** de tokens JWT.
- Endpoints de autenticación:
  - `POST /api/v1/auth/register/` (alta con hash seguro de contraseña via Argon2/PBKDF2).
  - `POST /api/v1/auth/login/` (emisión de par access/refresh token).
  - `POST /api/v1/auth/token/refresh/`.
- **Payload mínimo y estricto:** `user_id` (UUID), `username`, `email` y `role`. Cero datos sensibles en el token.

### 2.2 Validación Criptográfica Desacoplada (Node.js)
- Express valida tokens sin contactar la base de datos relacional de Django.
- Verificación con librería `jsonwebtoken` utilizando la clave simétrica compartida `JWT_SIGNING_KEY`.
- Middleware de extracción y validación de `Bearer Token`.

### 2.3 Matriz de Roles y Permisos (`seguridad.md`)
- Definición formal de roles:
  - **ADMIN:** Gestión total del catálogo de medios, temporadas y episodios.
  - **CRITIC:** Publicación de críticas destacadas y moderación de comentarios.
  - **USER:** Seguimiento de progreso personal, reseñas y comentarios.
- Documento `docs/tp-2-seguridad-jwt/seguridad.md` detallando la matriz RBAC (Role-Based Access Control).

### 2.4 Medidas OWASP Top 10
- Protección contra inyecciones SQL y NoSQL mediante ORM/ODM y schemas fuertemente tipados.
- Limitación de tasa de solicitudes (`express-rate-limit` / DRF Throttling).
- Headers HTTP seguros mediante `helmet` y configuración estricta de CORS.
