# QA Multi-Dispositivo — Acceso Privado con Tailscale Serve

**Fecha:** 20/11/2026  
**Rama:** `main`  
**Alcance verificado en anfitrión:** Arquitectura de proxy único (`127.0.0.1:8088`) con Docker Compose (7 servicios) + verificación de compilación `VITE_*` build-time + no regresión de suites.  
**Limitación observada en este equipo:** `tailscale` CLI no está instalado en este Windows (`TAILSCALE_NOT_INSTALLED`), por lo que las pruebas que dependen de una tailnet real y dos dispositivos físicos quedan registradas como **BLOCKED** hasta que el usuario instale Tailscale e inicie sesión manualmente.

---

## 1. Matriz de pruebas (TS-01..TS-16)

| ID | Prueba | Estado | Evidencia / Resultado observado |
| :--- | :--- | :--- | :--- |
| **TS-01** | Conexión de los 2 dispositivos a la tailnet | **BLOCKED** | `tailscale` no está instalado en la PC anfitriona (`TAILSCALE_NOT_INSTALLED`). Requiere instalación e inicio de sesión manual. |
| **TS-02** | `tailscale serve status` | **BLOCKED** | Depende de TS-01. Scripts listos en `scripts/tailscale-serve-up.ps1` y `scripts/tailscale-diag.ps1`. |
| **TS-03** | Acceso Dispositivo A por red diferente | **BLOCKED** | Requiere tailnet activa y segundo dispositivo en red externa. |
| **TS-04** | Acceso simultáneo Dispositivo B (Android físico) | **BLOCKED** | Requiere tailnet activa y teléfono físico conectado. |
| **TS-05** | Catálogo + detalle + imágenes vía entrada única | **PASS (proxy local)** | Vía `http://127.0.0.1:8088`: `/` -> `200`, `/django/api/v1/genres/` -> `200`, `/django/api/v1/media/` -> `200`; `SERVE_MEDIA=True` y `USE_X_FORWARDED_HOST=True` activos. |
| **TS-06** | Login / refresh / logout | **PASS (proxy local + suites)** | `POST /django/api/v1/auth/login/` vía `127.0.0.1:8088` devolvió JWT válido (`PROXY_LOGIN_OK=True`); aislamiento en `localStorage` verificado en Vitest/Playwright. |
| **TS-07** | Notas privadas, diario y persistencia | **PASS (suites)** | `backend-node` Jest (25/25) y `backend-django` pytest (29/29) en verde; aislamiento por `userId`. |
| **TS-08** | Roles `ADMIN` / `USER` separados | **PASS (suites)** | Validado por `test_p1_security.py`, `test_p1_catalog_security.py` y `authAndRoles.test.jsx`. |
| **TS-09** | Asistente claqueta / recomendaciones IA | **PASS (proxy local)** | `POST /node/api/v1/recommendations` vía `127.0.0.1:8088` con Bearer JWT respondió `200` (`PROXY_NODE_AI_OK=True`). |
| **TS-10** | Recarga profunda de rutas SPA (`/login`) | **PASS (proxy local)** | `GET http://127.0.0.1:8088/login` devolvió `200`. |
| **TS-11** | Bundle JS sin URLs `localhost` internas | **PASS (verificado en `dist/`)** | Inspección del bundle `dist/assets/index-BsQPdAza.js` servido por `127.0.0.1:8088`: `JS_HAS_DJANGO_PROXY=True`, `JS_HAS_NODE_PROXY=True`, `JS_HAS_LOCALHOST_8000=False`, `JS_HAS_LOCALHOST_5000=False`. |
| **TS-12** | Puertos internos protegidos | **PASS (Docker Compose)** | `docker compose ps` confirma `postgres` (`5432/tcp`), `mongo` (`27017/tcp`) y `service-ai` (`8002/tcp`) sin puertos publicados en el host; `proxy` limitado a `127.0.0.1:8088->80/tcp`. |
| **TS-13** | Cortar Tailscale del cliente | **BLOCKED** | Depende de TS-01. |
| **TS-14** | Recuperación tras reconectar | **BLOCKED** | Depende de TS-01. |
| **TS-15** | QA existente sin regresión | **PASS** | Ejecuciones tras los últimos cambios: Django pytest (29/29), Node Jest (25/25), FastAPI pytest (9/9), Frontend Vitest (24/24). |
| **TS-16** | Reinicio de navegador en A/B | **BLOCKED (multidispositivo)** | Persistencia de JWT en `localStorage` verificada en desktop/Playwright; pendiente prueba física en A y B. |

---

## 2. Archivos modificados y agregados para esta entrega

* Proxy y Docker: `proxy/nginx.conf`, `proxy/local-proxy.mjs`, `docker-compose.yml`, `frontend/Dockerfile`, `.env.example`, `frontend/.env.example`.
* Backend Django: `backend-django/core/settings.py` (`USE_X_FORWARDED_HOST`, `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS`, `SERVE_MEDIA`), `backend-django/core/urls.py`.
* Scripts operativos (sin secretos): `scripts/tailscale-serve-up.ps1`, `scripts/tailscale-serve-down.ps1`, `scripts/tailscale-diag.ps1`.
* Documentación: `docs/TAILSCALE_ACCESO_PRIVADO.md`, `README.md`, `docs/qa/QA_TAILSCALE_MULTIDISPOSITIVO.md`.
