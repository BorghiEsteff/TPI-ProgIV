# Matriz E2E QA — CineTrack

Ejecutada contra servicios locales reales en entorno QA aislado (`SQLITE_DB_NAME=db.qa.sqlite3`, `MONGODB_URI=mongodb://127.0.0.1:27017/cinetrack_qa`, `GROQ_API_KEY=""`).

- **`chromium-desktop` (`1440x900`)**: 16/16 specs `PASS` (`02-auth-roles.spec.js` re-verificado 4/4 tras ajuste móvil).
- **`chromium-mobile` (`390x844`, `isMobile: true`)**: 16/16 specs `PASS`.

| Caso | Descripción | Spec Playwright | Desktop | Mobile | Evidencia / Resultado |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **E2E-01** | Invitada explora catálogo, busca, filtra por tipo y abre detalle sin ver obras ocultas ni notas privadas | `01-public-catalog.spec.js` | PASS | PASS | Catálogo muestra publicadas, oculta `Obra Oculta QA` y no expone ratings/reseñas públicas. |
| **E2E-02** | Invitada no puede visitar rutas privadas ni acceder a APIs protegidas | `01-public-catalog.spec.js` | PASS | PASS | Redirección a `/login` en UI; `401` en `/tracking/`, `/submissions/`, `/personal-notes`, `/recommendations`. |
| **E2E-03** | Registro normal, login, recarga y logout limpian sesión sin errores | `02-auth-roles.spec.js` | PASS | PASS | Formulario `/register` sin selector de rol; sesión persiste al recargar y se limpia en logout. |
| **E2E-04** | Registro forzado con `role=ADMIN` y `PATCH /auth/me` no escalan privilegios | `02-auth-roles.spec.js` | PASS | PASS | Siempre asigna `USER`; `role` no escalable. |
| **E2E-05** | Token inválido/ausente rechazado y refresh token funciona | `02-auth-roles.spec.js` | PASS | PASS | `401` con token inválido; `POST /auth/refresh/` emite nuevo `access`. |
| **E2E-06** | `USER` autenticado no puede crear, editar ni borrar `MediaItem` o géneros en REST ni GraphQL | `02-auth-roles.spec.js` | PASS | PASS | `403` en REST/GraphQL mutaciones admin. |
| **E2E-07** | Agregar misma obra aprobada es idempotente y crea/devuelve registro único | `03-private-diary.spec.js` | PASS | PASS | UI cambia a `Abrir mi registro en Mi CineTrack`; segundo `POST /tracking/` devuelve `200` con mismo `id`. |
| **E2E-08** | A y B guardan plataformas distintas (`HBO` vs `Netflix`) sin interferencia | `03-private-diary.spec.js` | PASS | PASS | Cada usuaria conserva su `watch_platform` tras recargar. |
| **E2E-09** | A y B guardan notas privadas independientes sobre la misma obra | `03-private-diary.spec.js` | PASS | PASS | Mongo `cinetrack_qa` aísla por `(userId, trackingEntryId)`. |
| **E2E-10** | Validación de rating `1..5` y persistencia | `03-private-diary.spec.js` | PASS | PASS | Rechaza valores fuera de rango y persiste `1..5`. |
| **E2E-11** | Progreso exacto en segundos (`00:42:35` = `2555s`) | `03-private-diary.spec.js` | PASS | PASS | `PATCH /tracking/:id/` persiste `current_seconds: 2555`. |
| **E2E-12** | Estado `VISTO` y favoritos independientes por usuario | `03-private-diary.spec.js` | PASS | PASS | Favorito y estado `VISTO` aislados en diario de A. |
| **E2E-13** | Filtrado y eliminación en Mi CineTrack no afectan a B ni al catálogo público | `03-private-diary.spec.js` | PASS | PASS | B quita su entrada (`Tu diario está vacío`); A conserva la suya. |
| **E2E-14** | XSS/Unicode en notas privadas renderizado seguro | `03-private-diary.spec.js` | PASS | PASS | Sin ejecución de scripts; caracteres Unicode preservados. |
| **E2E-15** | IDOR horizontal y acceso `ADMIN` a notas privadas bloqueados | `03-private-diary.spec.js` | PASS | PASS | `403`/`404` al intentar leer/editar notas ajenas. |
| **E2E-16** | Usuaria A propone `"Matrix"` con archivo PNG real y plataforma `HBO / Max` | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Propuesta creada `PENDING`; visible inmediatamente en `/my-tracking` de A. |
| **E2E-17** | Usuaria B propone `"The Matrix"` con PNG propio y plataforma `Netflix`; visitante no ve ninguna | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Ambas `PENDING`, invisibles en catálogo público. |
| **E2E-18** | RBAC en cola admin (`/admin/submissions`) bloquea a `USER` | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | `403` para `USER` en endpoints `/api/v1/admin/submissions/`. |
| **E2E-19** | Cola admin inspeccionada vía HTTP real no filtra notas privadas ni identidad | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Respuesta no contiene `Me encantó A`, `Nota privada B` ni `submitted_by`. Evidencia: `docs/qa/evidence/matrix-admin-queue.png`. |
| **E2E-20** | Admin publica `"Matrix"` y vincula `"The Matrix"` a la ficha publicada | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Catálogo público muestra 1 ficha `"Matrix"`. Evidencia: `docs/qa/evidence/matrix-public-catalog.png`. |
| **E2E-21** | A, B y C conservan aislamiento total tras vinculación (`matrix-diary-a.png`, `matrix-diary-b.png`) | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | A conserva `HBO / Max` + `Me encantó A`; B conserva `Netflix` + `Nota privada B`; C inicia vacío. |
| **E2E-22** | Rechazo de propuesta con motivo visible solo para proponente | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Motivo de rechazo en diario/propuestas del autor. |
| **E2E-23** | Colisión de `MediaItem` / título normalizado controlado | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Detección de duplicados y vinculación sin colisión. |
| **E2E-24** | Concurrencia en moderación (`409` al moderar propuesta ya procesada) | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | Segundo intento de moderación responde `409`. |
| **E2E-25** | Protección SSRF y rechazo de SVG en portada externa/archivo | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | URLs privadas (`127.0.0.1`, metadata) y `.svg` rechazados (`400`). |
| **E2E-26** | Subida multipart de PNG válido en propuestas y moderación | `04-submissions-moderation-matrix.spec.js` | PASS | PASS | `poster-a.png` y `poster-b.png` persistidos y renderizados. |
| **E2E-27** | Chat IA (`kdrama romántico del 2026`) devuelve ficha real aprobada (`Amor en Seúl 2026`) | `05-ai-recommendations.spec.js` | PASS | PASS | Renderiza tarjeta con título real del catálogo QA. |
| **E2E-28** | Consulta sin coincidencias (`2099`) responde honestamente sin inventar títulos | `05-ai-recommendations.spec.js` | PASS | PASS | Muestra mensaje `No tengo coincidencias de ese tipo en el catálogo`. |
| **E2E-29** | Modo determinista (`Modo limitado`) activo cuando falta `GROQ_API_KEY` | `05-ai-recommendations.spec.js` | PASS | PASS | Badge `Modo limitado` visible en UI. |
| **E2E-30** | Recomendaciones filtran IDs inválidos y nunca exponen obras ocultas | `05-ai-recommendations.spec.js` | PASS | PASS | `Obra Oculta QA` nunca aparece; criterios estrictos sin match en `/ai/recommend` devuelven `[]`. |
| **E2E-31** | Visitante recibe `401` y prompt `> 500` chars recibe `422` | `05-ai-recommendations.spec.js` | PASS | PASS | Validaciones de auth y longitud en Node + FastAPI. |
| **E2E-32** | REST y GraphQL filtran obras ocultas/no activas | `06-security-rest-graphql-reliability.spec.js` | PASS | PASS | Ni REST ni GraphQL exponen `Obra Oculta QA`. |
| **E2E-33** | Rutas heredadas retiradas (`/api/v1/reviews` -> `410`, `/watch-rooms` redirige) | `06-security-rest-graphql-reliability.spec.js` | PASS | PASS | `410` en Node; redirección a `/my-tracking` o `/login` en frontend. |
| **E2E-34** | Regresión: tarjetas de catálogo no muestran botón ni enlace `Sala en Vivo` | `06-security-rest-graphql-reliability.spec.js` + Vitest | PASS | PASS | Botón actualizado a `Ver ficha`. |
| **E2E-35** | Fallo controlado de red al guardar nota privada muestra error y no éxito falso | `06-security-rest-graphql-reliability.spec.js` | PASS | PASS | Intercepción `500` muestra alerta de error sin falsos positivos. |
| **E2E-36** | Navegación atrás/adelante y recarga mantienen estado consistente | `06-security-rest-graphql-reliability.spec.js` | PASS | PASS | Historial de navegador y recarga en `/media/:id` consistentes. |
| **E2E-37** | Sin overflow horizontal en Home, Mi CineTrack y Recomendaciones (`1440x900` y `390x844`) | `07-responsive-accessibility.spec.js` | PASS | PASS | `scrollWidth <= innerWidth + 2` en todas las vistas. |
| **E2E-38** | Menú hamburguesa móvil operativo en `390x844` | `02-auth-roles.spec.js` | N/A | PASS | `button.navbar-toggler` despliega enlaces privados en móvil. |
| **E2E-39** | Controles de puntuación accesibles por teclado y `aria-label` | `07-responsive-accessibility.spec.js` | PASS | PASS | `button` `4 estrellas` recibe foco vía teclado. |
| **E2E-40** | Consola limpia sin errores JS no capturados (`pageerror`) en flujos principales | `01`, `02`, `07` specs | PASS | PASS | `pageErrors === []`. |
