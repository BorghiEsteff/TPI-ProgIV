# CineTrack — Tablero Kanban y Planificación (TP0–TP5)

Consolidación del estado real del proyecto alineada con `Planificacion_CineTrack_2026.xlsx`, `IMPLEMENTATION_STATUS.md`, `docs/CUMPLIMIENTO_TP0_TP5.md` y el `docs/qa/ACTA_VALIDACION_FINAL.md` (corte `main` al cierre).

---

## 1. Tablero Kanban Consolidado

| Backlog / Descartado (Fuera de alcance `main`) | Por Hacer (To Do) | En Progreso (In Progress) | En Revisión / QA (QA / Review) | Completado (Done) |
| :--- | :--- | :--- | :--- | :--- |
| • **WatchRooms en vivo (Socket.IO):** deshabilitado en `socketService.js` y retirado de `App.jsx` por política de privacidad.<br>• **Reseñas públicas (`/api/v1/reviews`):** retiradas (`410 Gone`) y reemplazadas por notas privadas.<br>• **Rol `CRITIC`:** consolidado en `USER` mediante migración `0002_migrate_critic_to_user`.<br>• **Ollama local (`llama3.2:1b`) y `/ai/review-guard`:** reemplazados por Groq Cloud + fallback determinista. | • **Configuración externa en GitHub:** activar *Branch Protection* en `main` desde `Settings > Branches` (requiere permisos de propietario en GitHub). | *(Sin tareas activas de código pendientes; cierre documental y entrega final en curso).* | • **Entrega Final y Defensa Oral:** validación de `Documentacion/INFORME_FINAL_CINETRACK.pdf` y ensayo de presentación. | • **TP0:** Propuesta, mapa tecnológico y arquitectura distribuida.<br>• **TP1:** Modelos SQL (`MediaItem`, `Genre`, `Season`, `Episode`, `UserProgress`), migraciones y `PersonalNote` en MongoDB.<br>• **TP2:** SimpleJWT centralizado, verificación desacoplada en Node, RBAC `USER`/`ADMIN`, anti-escalada y protección SSRF/SVG.<br>• **TP3:** `service-ai` (`POST /ai/recommend`) con Groq + fallback determinista y claqueta flotante `<FloatingRecommendationChat />`.<br>• **TP4:** OpenAPI (`drf-spectacular`), GraphQL (Graphene + `express-graphql`), 4 Dockerfiles, `docker-compose.yml` (7 servicios con `proxy`) y CI en verde.<br>• **TP5 / QA:** Suites Pytest (Django 29, AI 9), Jest (25), Vitest (24), Playwright E2E (22 desktop + 22 mobile), benchmark SQL y guía Tailscale Serve. |

---

## 2. Evolución por Hitos (TP0 a TP5)

| Fase | Periodo Planificado | Frente Python / IA (Estefanía Borghi) | Frente JS / Node / Frontend (Ariana / Equipo) | Estado Verificado |
| :--- | :--- | :--- | :--- | :--- |
| **TP0 — Propuesta** | Pre-28/10/2026 | Definición de dominio, stack Python/Django/FastAPI y propuesta inicial | Definición de stack Node/Express/MongoDB/React | **Completado** |
| **TP1 — CRUD & Persistencia** | 28/10 – 02/11/2026 | Modelos `catalog` y `tracking`, filtros, paginación, `seed_data`, tests `pytest` | Conexión MongoDB, validadores Zod, `PersonalNote`, cliente Axios a Django | **Completado (Adaptado a diario privado)** |
| **TP2 — Seguridad & JWT** | 03/11 – 06/11/2026 | `CustomUser`, SimpleJWT HS256 con claims, `IsAdminRole`, anti-escalada y SSRF | `authMiddleware.js` desacoplado, aislamiento por `ownerUserId`, tests `401`/`403` | **Completado** |
| **TP3 — IA & Tiempo Real** | 07/11 – 11/11/2026 | FastAPI `POST /ai/recommend` con Groq + fallback determinista y anti-alucinación | Proxy `/api/v1/recommendations` con rate-limit + claqueta flotante React | **Completado (Adaptado: WatchRooms retirado)** |
| **TP4 — Contenedores & CI** | 12/11 – 15/11/2026 | `openapi-django.json`, Graphene GraphQL, Dockerfile Django/AI, `benchmark_queries` | `openapi.json`, GraphQL `publicMediaDetails`, Dockerfile Node/Frontend, `docker-compose.yml` + `proxy` | **Completado (CI verde)** |
| **TP5 — Informe & Defensa** | 16/11 – 25/11/2026 | Consolidación técnica, actas QA, reproducibilidad y PDF final | E2E Playwright (desktop + mobile), refinamiento visual y guion de defensa | **Completado** |

---

## 3. Riesgos Residuales y Deuda Técnica Controlada

1. **Revocación inmediata de roles en Node.js:** al validar JWT localmente sin consultar a Django por cada request, un cambio de rol en Django impacta en `backend-node` al expirar el access token (60 min). *Mitigación:* access tokens de vida acotada y validación directa contra BD en Django para moderación/catálogo.
2. **Aislamiento de base QA en Playwright:** al ejecutar `chromium-desktop` y `chromium-mobile` en secuencia sin reiniciar `db.qa.sqlite3` y `cinetrack_qa`, pueden quedar mutaciones residuales. *Mitigación:* documentado en `docs/qa/QA_COMMANDS.md` y `GUIA_REPRODUCIBILIDAD.md` el reinicio previo entre proyectos.
3. **Componentes heredados en `frontend/src/`:** archivos históricos de WatchRooms y reseñas (`WatchRoomPage.jsx`, `components/reviews/`) permanecen sin montar en `App.jsx` únicamente referenciados por sus tests unitarios históricos.
