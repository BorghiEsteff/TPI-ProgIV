# TP 2: Contrato de Identidad JWT (Django SimpleJWT <-> Node.js)

## 1. Emisión en Django (`backend-django/users/`)
- **Login:** `POST /api/v1/auth/login/` (email insensible a mayúsculas + password).
- **Registro:** `POST /api/v1/auth/register/` (asigna siempre `role: "USER"`, ignora cualquier intento de escalada).
- **Refresh:** `POST /api/v1/auth/token/refresh/`.
- **Perfil:** `GET/PATCH /api/v1/auth/me/` (`role` de solo lectura).
- **Algoritmo y clave:** `HS256` con `JWT_SIGNING_KEY` compartida entre `backend-django` y `backend-node` (access 60 min, refresh 24 h).

## 2. Claims del Access Token
```json
{
  "user_id": 1,
  "username": "usuario",
  "email": "usuario@cinetrack.local",
  "role": "USER",
  "exp": 1731175200,
  "iat": 1731171600
}
```

## 3. Verificación en Node.js (`backend-node/src/middlewares/authMiddleware.js`)
- Verifica firma HS256 y expiración en memoria para `/api/v1/personal-notes/*` y `/api/v1/recommendations`.
- **Limitación conocida:** ante cambio de rol o desactivación en Django, Node confía en el claim `role` del access token hasta su expiración natural (60 min); las acciones administrativas críticas en Django validan contra la base de datos en cada petición.
