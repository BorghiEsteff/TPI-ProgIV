# CineTracker — Acceso Privado con Tailscale Serve (2 Dispositivos)

Guía operativa para exponer una única instancia de CineTracker corriendo en la PC anfitriona hacia dos dispositivos (por ejemplo PC + teléfono Android en redes distintas) mediante **Tailscale Serve** (HTTPS privado dentro de la tailnet, sin abrir puertos en el router ni usar Tailscale Funnel).

---

## 1. Arquitectura de entrada única (`127.0.0.1:8088`)

```text
Dispositivo A (PC / Android) ──┐
                               ├── Tailnet privada (Tailscale)
Dispositivo B (PC / Android) ──┘          │
                                          ▼
                   https://<equipo>.<tailnet>.ts.net
                                          │
                                Tailscale Serve (HTTPS)
                                          │
                              Proxy local 127.0.0.1:8088
                       ┌──────────────────┼──────────────────┐
                       ▼                  ▼                  ▼
                 React / Vite          Django             Node.js
                    :5173              :8000               :5000
                                         │                   │
                                    PostgreSQL        MongoDB + FastAPI (:8002)
```

### Rutas del proxy único
* `/` y rutas SPA (`/login`, `/my-tracking`, `/media/:id`, etc.) -> Frontend (`:5173`)
* `/django/...` -> Backend Django (`:8000`, elimina prefijo `/django`)
* `/node/...` -> Backend Node.js (`:5000`, elimina prefijo `/node`)
* `/media/...` y `/static/...` -> Recursos estáticos y portadas de Django (`:8000`)
* `service-ai` (`:8002`), PostgreSQL (`:5432`) y MongoDB (`:27017`) permanecen internos y no se publican hacia clientes.

---

## 2. Preparación de variables de entorno

### Opción A — Con Docker Compose (7 servicios incluyendo `proxy`)
1. Copiar `.env.example` a `.env` en la raíz y definir secretos fuertes (`DB_PASSWORD`, `SECRET_KEY`, `JWT_SIGNING_KEY`).
2. Agregar el hostname real de tu equipo en la tailnet (obtenido con `tailscale status` o `tailscale serve status`):
   ```dotenv
   ALLOWED_HOSTS=localhost,127.0.0.1,django-backend,<equipo>.<tailnet>.ts.net
   CSRF_TRUSTED_ORIGINS=http://127.0.0.1:8088,http://localhost:8088,https://<equipo>.<tailnet>.ts.net
   CORS_ALLOWED_ORIGINS=http://127.0.0.1:8088,http://localhost:8088,https://<equipo>.<tailnet>.ts.net
   CLIENT_ORIGIN=http://127.0.0.1:8088,http://localhost:8088,https://<equipo>.<tailnet>.ts.net
   VITE_DJANGO_API_URL=/django/api/v1
   VITE_DJANGO_GRAPHQL_URL=/django/graphql/
   VITE_NODE_API_URL=/node/api/v1
   VITE_NODE_GRAPHQL_URL=/node/graphql
   VITE_NODE_SOCKET_URL=
   ```
3. Compilar y levantar (las variables `VITE_*` se inyectan en tiempo de build en `frontend/Dockerfile`):
   ```powershell
   docker compose build frontend
   docker compose up -d
   ```

### Opción B — En Windows local sin Docker (4 procesos + `proxy/local-proxy.mjs`)
1. Configurar `frontend/.env` con las URLs relativas del mismo origen (`/django/api/v1`, `/django/graphql/`, `/node/api/v1`, `/node/graphql`).
2. En `backend-django/.env`, incluir `<equipo>.<tailnet>.ts.net` en `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` y `CORS_ALLOWED_ORIGINS`.
3. En `backend-node/.env`, incluir `https://<equipo>.<tailnet>.ts.net` en `CLIENT_ORIGIN`.
4. Levantar los 4 servicios locales (`8000`, `8002`, `5000`, `5173`) y además el proxy local único:
   ```powershell
   node proxy/local-proxy.mjs
   ```
   (Escucha en `http://127.0.0.1:8088`.)

---

## 3. Activar Tailscale Serve en la PC anfitriona

1. Instalar Tailscale en Windows (<https://tailscale.com/download>) e iniciar sesión manualmente en tu tailnet.
2. En PowerShell (preferentemente **Ejecutar como administrador**), ejecutar:
   ```powershell
   .\scripts\tailscale-serve-up.ps1
   ```
   (Equivalente manual: `tailscale serve --bg http://127.0.0.1:8088` y `tailscale serve status`.)
3. Verificar que `tailscale serve status` muestre la URL privada `https://<equipo>.<tailnet>.ts.net` (nunca `funnel`).

---

## 4. Uso desde Dispositivo A y Dispositivo B

1. Instalar Tailscale en ambos dispositivos (ej. PC por Wi-Fi y teléfono Android por datos móviles) e iniciar sesión en la **misma tailnet**.
2. Abrir la misma URL `https://<equipo>.<tailnet>.ts.net` en el navegador de cada dispositivo.
3. Iniciar sesión en CineTracker en cada navegador (la cuenta de Tailscale es independiente de la cuenta de CineTracker; cada dispositivo conserva su propio JWT en `localStorage`).

---

## 5. Diagnóstico y apagado seguro

* **Diagnóstico:** `.\scripts\tailscale-diag.ps1` (ejecuta `tailscale status`, `tailscale ip -4`, `tailscale serve status`, `docker compose ps` y prueba `/`, `/django/api/v1/genres/` y `/node/health` vía `127.0.0.1:8088`).
* **Apagar acceso privado (no borra datos):**
  ```powershell
  .\scripts\tailscale-serve-down.ps1
  ```
  (Equivalente manual: `tailscale serve off` y `tailscale serve status`.)
