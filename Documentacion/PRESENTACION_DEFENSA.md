# CineTrack — Material de Presentación y Defensa Oral

**Duración sugerida:** 8 minutos de exposición + demo en vivo + ronda de preguntas.  
**Objetivo:** Demostrar el valor funcional de **CineTrack**, la solidez de su arquitectura políglota de microservicios, la seguridad JWT/RBAC, la resiliencia de la IA y la calidad verificada por QA automatizado.

---

## 1. Estructura Diapositiva por Diapositiva (12 Diapositivas)

### Diapositiva 1 — Portada
* **Título:** CineTrack — Plataforma Full-Stack de Seguimiento, Catálogo y Recomendación Audiovisual
* **Subtítulo:** Proyecto Integrador de Programación IV — UTN FRRE (Extensión Áulica Goya)
* **Integrantes:** Estefanía Borghi (Línea Python / IA / DevOps) & Ariana (Línea Node.js / MongoDB / Integración)
* **Notas del orador:** Presentar el proyecto en una frase: un diario audiovisual privado con curaduría comunitaria moderada y recomendaciones inteligentes acotadas al catálogo real.

### Diapositiva 2 — El Problema y la Oportunidad
* **Puntos clave:**
  * Dispersión de plataformas de streaming y pérdida del punto exacto de visualización (temporada, episodio, minuto/segundo).
  * Falta de privacidad en redes sociales de reseñas abiertas (spoilers, ruido, moderación compleja).
  * Recomendadores genéricos de IA que inventan títulos inexistentes (*alucinaciones*).
* **Notas del orador:** Explicar por qué decidimos priorizar un diario privado seguro en lugar de una red social abierta de reseñas.

### Diapositiva 3 — Nuestra Solución: CineTrack
* **Puntos clave:**
  * Catálogo público curado (`PELICULA` / `SERIE`) con búsqueda tolerante a acentos y errores tipográficos.
  * Diario privado unificado (`/my-tracking`): estado, plataforma, favorito, avance granular y notas privadas `1..5`.
  * Propuestas comunitarias con detección automática de duplicados y moderación administrativa sin pérdida de datos.
  * Asistente flotante de IA (claqueta) que solo recomienda obras publicadas.

### Diapositiva 4 — Arquitectura Políglota de Microservicios
* **Visual:** Diagrama de Contenedores (Frontend React 19, Django 6.1, Node.js, FastAPI `service-ai`, PostgreSQL 16, MongoDB 7, Proxy Nginx).
* **Puntos clave:**
  * **Django + PostgreSQL:** Integridad ACID, identidad, catálogo, tracking y moderación transaccional.
  * **Node.js + MongoDB:** Notas privadas flexibles (`PersonalNote`), GraphQL y orquestación con *rate limiting*.
  * **FastAPI + Groq:** Inferencia rápida desacoplada con fallback determinista.

### Diapositiva 5 — Evolución de Alcance y Decisiones de Diseño (TP0–TP5)
* **Puntos clave:**
  * Consolidación de roles (`CRITIC` → `USER`) dejando `USER` y `ADMIN`.
  * Retiro controlado de reseñas públicas (`410 Gone`) y WatchRooms; reemplazo por `PersonalNote` privado.
  * Migración de Ollama local a Groq Cloud + fallback determinista (`degraded: true`) para portabilidad en CI y evaluación.

### Diapositiva 6 — Seguridad, JWT Desacoplado y OWASP
* **Puntos clave:**
  * Emisión única de JWT **HS256** en Django (`user_id`, `username`, `email`, `role`).
  * Verificación criptográfica en Node.js sin consultar a Django por cada token.
  * Anti-escalada en registro/perfil, aislamiento por `userId` (cero IDOR), verificación *fail-closed* y protección anti-SSRF/SVG en portadas.

### Diapositiva 7 — Inteligencia Artificial Segura y Resiliente
* **Puntos clave:**
  * Flujo: Claqueta React → Node (`rate limit 5/min`) → catálogo activo Django → FastAPI → Groq (`2.8s` timeout).
  * Revalidación estricta de IDs contra el catálogo publicado (`is_active=True`): **0 % alucinaciones**.
  * Si falta `GROQ_API_KEY` o hay error de red: **modo degradado determinista** (`X-Degraded-AI: true`) sin romper la UX.

### Diapositiva 8 — Moderación Transaccional y Búsqueda Tolerante
* **Puntos clave:**
  * Detección automática de duplicados (`Matrix` vs `The Matrix`) antes de crear propuestas.
  * Moderación con `select_for_update`: `PUBLISHED`, `MERGED` (conciliación automática del diario) o `REJECTED` (sin perder el progreso privado del usuario).

### Diapositiva 9 — Contenedores, OpenAPI, GraphQL y Despliegue
* **Puntos clave:**
  * 7 servicios en `docker-compose.yml` con healthchecks y red interna `cinetrack-net`.
  * Contratos OpenAPI 3.0 (`drf-spectacular` + Node) y GraphQL (`allMediaItems`, `publicMediaDetails`).
  * Proxy único `:8088` listo para exposición privada con Tailscale Serve.

### Diapositiva 10 — Calidad de Software y QA Automatizado
* **Puntos clave (métricas reales del Acta Final):**
  * **Django:** 29 passed (SQLite y PostgreSQL 16) + benchmark sin N+1 (`Index Scan`).
  * **Node.js:** 6 suites, 25 passed (Jest + Supertest).
  * **Service AI:** 9 passed + prueba live con Groq (`degraded: false`).
  * **Frontend:** 24 passed (Vitest) + build Vite limpio (`438` módulos).
  * **Playwright E2E:** 22/22 desktop + 22/22 mobile.

### Diapositiva 11 — Demostración en Vivo (Guion Paso a Paso)
1. **Visitante (`/`):** Mostrar catálogo público, filtros por tipo/género y búsqueda tolerante (ej. `matrix` sin tilde/artículo).
2. **Login (`USER`):** Iniciar sesión con `user@cinetrack.local` y abrir `/my-tracking`.
3. **Diario y Nota Privada:** Actualizar progreso/plataforma en Django y guardar calificación/nota privada en MongoDB.
4. **Claqueta Flotante IA:** Abrir la claqueta, pedir una recomendación y mostrar tarjetas con enlace directo al catálogo (y explicar qué ocurre en modo degradado).
5. **Propuesta + Moderación (`ADMIN`):** Enviar propuesta de obra, iniciar sesión como `admin@cinetrack.local`, ir a `/admin/submissions` y aprobar/fusionar mostrando la conciliación.

### Diapositiva 12 — Conclusiones y Trabajo Futuro
* **Puntos clave:**
  * Cumplimiento integral de TP0 a TP5 con arquitectura políglota justificada y verificada E2E.
  * **Trabajo futuro:** listas compartibles opcionales bajo consentimiento, notificaciones push de nuevos episodios y sincronización con APIs externas (TMDB) bajo moderación.

---

## 2. Preguntas Frecuentes del Tribunal y Respuestas Clave

1. **¿Por qué usar PostgreSQL y MongoDB al mismo tiempo?**
   * *Respuesta:* PostgreSQL garantiza integridad referencial y transacciones ACID para usuarios, jerarquía Serie→Temporada→Episodio, propuestas y moderación (`select_for_update`). MongoDB modela notas personales privadas flexibles (`PersonalNote`) aisladas por `ownerUserId` sin acoplar el esquema social al catálogo relacional.
2. **¿Cómo evitan que un usuario se registre como `ADMIN` o vea notas de otro?**
   * *Respuesta:* En Django, el serializer de registro fuerza `role='USER'` como solo lectura e ignora cambios en `/auth/me/`. En Node.js, el `ownerUserId` se extrae exclusivamente del JWT verificado con `JWT_SIGNING_KEY` y se verifica propiedad contra Django (*fail-closed*).
3. **¿Qué pasa si la API de Groq se cae o no hay clave configurada?**
   * *Respuesta:* `service-ai` captura el timeout (`2.8s`) o ausencia de `GROQ_API_KEY` y activa automáticamente el motor determinista sobre los candidatos del catálogo publicado, devolviendo `degraded: true` y la cabecera `X-Degraded-AI: true` sin interrumpir al usuario.
4. **¿Por qué retiraron WatchRooms y reseñas públicas si estaban en la propuesta inicial?**
   * *Respuesta:* Para evitar riesgos de moderación abierta y proteger la privacidad del diario personal. La infraestructura quedó documentada y probada (endpoints de reseñas retornando `410 Gone` y Socket.IO deshabilitado de forma controlada).
5. **¿Cómo garantizan que la IA no recomiende películas que no existen en CineTrack?**
   * *Respuesta:* `backend-node` envía únicamente las obras activas (`is_active=True`) como lista cerrada de candidatos; tanto `service-ai` como `backend-node` revalidan cada ID devuelto antes de enviarlo al frontend.
