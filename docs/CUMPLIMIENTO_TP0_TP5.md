# CineTracker / CineTrack — Cumplimiento TP0–TP5, Trazabilidad RF/RNF y Evidencia TDD

## 1. Matriz de cumplimiento contra consignas TP0–TP5

| Hito / TP | Requisito principal histórico | Estado en `main` | Clasificación | Evidencia / justificación |
| :--- | :--- | :--- | :--- | :--- |
| **TP0 — Propuesta** | Arquitectura distribuida (Django + Node + IA + React) | Implementado en 4 módulos (`backend-django`, `backend-node`, `service-ai`, `frontend`) | Obligatorio cumplido | `docker-compose.yml` (6 servicios incluyendo PostgreSQL y MongoDB) |
| **TP1 — CRUD y Persistencia** | Catálogo SQL + persistencia MongoDB | Catálogo, temporadas/episodios, diario (`UserProgress`), propuestas (`MediaSubmission`) en SQL; `PersonalNote` en MongoDB. Reseñas públicas reemplazadas por notas privadas | Obligatorio adaptado | `backend-django/catalog/`, `tracking/`, `backend-node/src/models/PersonalNote.js` |
| **TP2 — Seguridad y JWT** | Emisión central SimpleJWT + verificación Node + RBAC | Login, refresh, anti-escalada en registro/perfil, RBAC `USER`/`ADMIN`. Rol `CRITIC` consolidado en `USER` | Obligatorio adaptado | `backend-django/users/`, `users/migrations/0002_migrate_critic_to_user.py`, `backend-node/src/middlewares/authMiddleware.js` |
| **TP3 — IA y Tiempo Real** | Microservicio FastAPI + funcionalidad realtime | `service-ai` con Groq + fallback determinista (`POST /ai/recommend`) y claqueta flotante React. WatchRooms/Socket.IO deshabilitados en UI | Parcial / adaptado | `service-ai/main.py`, `FloatingRecommendationChat.jsx`; WatchRooms retirado y justificado |
| **TP4 — OpenAPI, GraphQL, Docker, CI** | Esquemas REST/OpenAPI, GraphQL, Dockerfiles, Compose y CI | OpenAPI regenerados (`openapi-django.json` con 27 rutas y `openapi.json` actualizado para Node), GraphQL (`allMediaItems`, `publicMediaDetails`), 4 Dockerfiles, `docker-compose.yml` (6 servicios) y `.github/workflows/ci.yml` configurado (pendiente verificar corrida remota en GitHub Actions) | Obligatorio cumplido (CI configurada) | [openapi-django.json](tp-4-contenedores-despliegue/openapi-django.json), [openapi.json](tp-4-contenedores-despliegue/openapi.json), `docker-compose.yml`, `.github/workflows/ci.yml` |
| **TP5 — Informe Final y QA** | Documentación consolidada, benchmarks, E2E y defensa | Informe actualizado mediante documentos *as-built*, acta de validación vigente y suite ejecutada | Obligatorio en cierre | `docs/ARQUITECTURA_AS_BUILT.md`, `docs/qa/ACTA_VALIDACION_FINAL.md` |

---

## 2. Catálogo vigente de RF / RNF y trazabilidad a pruebas

| ID | Requisito | Ruta / Servicio | Suites que lo verifican |
| :--- | :--- | :--- | :--- |
| **RF-01** | Catálogo público solo muestra obras activas (`is_active=True`), búsqueda y filtro por tipo/género | `backend-django/catalog/views.py`, `schema.py`, `CatalogPage.jsx` | `catalog/tests/test_p1_catalog_security.py`, `test_genres_and_p1_qa.py`, `01-public-catalog.spec.js` |
| **RF-02** | Autenticación JWT centralizada y prevención de escalada de rol | `backend-django/users/`, `backend-node/src/middlewares/authMiddleware.js` | `users/tests/test_auth.py`, `test_p1_security.py`, `backend-node/tests/auth.test.js`, `02-auth-roles.spec.js`, `09-auth-roles-regression.spec.js` |
| **RF-03** | Diario personal privado (`UserProgress`: estado, plataforma, avance HH:MM:SS, favoritos) | `backend-django/tracking/`, `MyTrackingPage.jsx` | `tracking/tests/test_tracking.py`, `trackingButtons.test.jsx`, `03-private-diary.spec.js` |
| **RF-04** | Notas personales privadas y rating `1..5` en MongoDB con aislamiento por usuario | `backend-node/src/controllers/personalNoteController.js` | `backend-node/tests/personalNote.test.js`, `03-private-diary.spec.js` |
| **RF-05** | Propuestas comunitarias, moderación (`APPROVED`, `MERGED`, `REJECTED`), conciliación de duplicados y protección SSRF/SVG | `backend-django/catalog/views.py`, `utils.py`, `AdminSubmissionsPage.jsx` | `catalog/tests/test_submissions_and_moderation.py`, `04-submissions-moderation-matrix.spec.js` |
| **RF-06** | Recomendaciones IA acotadas al catálogo publicado, con historial conversacional y fallback determinista | `service-ai/main.py`, `backend-node/src/controllers/recommendationController.js`, `FloatingRecommendationChat.jsx` | `service-ai/tests/test_recommend.py`, `backend-node/tests/recommendations.test.js`, `floatingRecommendationChat.test.jsx`, `05-ai-recommendations.spec.js`, `10-floating-ai-clapper.spec.js` |
| **RNF-01** | Contratos REST, OpenAPI (`drf-spectacular`) y GraphQL (Graphene / Apollo) | `core/urls.py`, `backend-node/src/graphql/` | `test_openapi_graphql.py`, `backend-node/tests/graphql.test.js`, `06-security-rest-graphql-reliability.spec.js` |
| **RNF-02** | Diseño responsivo multi-viewport (desktop 1440px, tablet 768px, móvil 320–390px) y accesibilidad por teclado | `frontend/src/` | `07-responsive-accessibility.spec.js`, `08-categories-and-visual-qa.spec.js` |

---

## 3. Ejemplos trazables de evolución TDD / QA en historial Git

1. **Seguridad de roles y registro no escalable:**
   * Pruebas agregadas en `backend-django/users/tests/test_p1_security.py` (`test_register_ignores_admin_role_and_staff_flags`, `test_profile_patch_cannot_escalate_role`) y `frontend/src/tests/authAndRoles.test.jsx` verificando rechazo `401` y normalización de email.
2. **Géneros, paginación y conciliación de duplicados:**
   * Pruebas en `backend-django/catalog/tests/test_genres_and_p1_qa.py` (`test_gen01`..`test_p1_pagination_25_plus_verify_ownership_and_reconciliation`) asegurando idempotencia, filtros GraphQL por género y conciliación sin pérdida del diario privado.
3. **Asistente flotante IA y modo degradado:**
   * Contrato validado primero en `service-ai/tests/test_recommend.py` (rechazo de IDs alucinados, tope de 3 recomendaciones, fallback sin `GROQ_API_KEY` y rechazo de prompt injection), seguido por `frontend/src/tests/floatingRecommendationChat.test.jsx` y `frontend/e2e/specs/10-floating-ai-clapper.spec.js`.

---

## 4. Saneamiento de inconsistencias detectadas en el inventario (P2)

* **Archivos Excel de planificación:** se comparó el contenido XML de ambos archivos:
  * `Planificacion_CineTrack_2026.xlsx` (raíz, 19.798 bytes, 02/11/2026) contiene **278 cadenas compartidas** con la planificación completa (`Cronograma Diario`, `Backlog por Fases (TPs)`, `Matriz de Roles y Tareas`). Es la **versión oficial**.
  * `docs/Planificacion_CineTrack_2026.xlsx` (15.697 bytes, 28/10/2026) tiene **0 cadenas compartidas** (plantilla vacía previa).
* **Componentes heredados en `frontend/src/`:** mediante búsqueda de imports se comprobó que `WatchRoomPage.jsx`, `components/watchroom/` y `components/reviews/` no están montados en `frontend/src/App.jsx` y solo permanecen referenciados por sus tests unitarios históricos (`watchroomAndCommonButtons.test.jsx`, `reviewButtons.test.jsx`). Además, en el cierre del 21/11/2026 se retiraron las pantallas y controles redundantes `RecommendationsPage.jsx`, `RecommendationChat.jsx`, `NewEntryPage.jsx`, `MySubmissionsPage.jsx`, `SecondsInputControl.jsx` y `ProgressTrackerBar.jsx`: `/recommendations` redirige a `/` dejando `<FloatingRecommendationChat />` como único acceso visual de IA, mientras que `/new-entry` y `/my-submissions` redirigen a las pestañas unificadas de `/my-tracking`.
* **Dependencias Python (`backend-django/requirements.txt`):** alineado a `Django>=5.0,<6.2` para reflejar la versión `Django 6.1.2` instalada y verificada en las pruebas.
