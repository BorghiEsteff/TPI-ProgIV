# CineTrack — Guion de Defensa Oral Individual y Banco de Preguntas
**Alumna:** Estefanía Borghi  
**Cátedra:** Programación IV (Plan 2024) - UTN FRRE (Extensión Áulica Goya)  
**Rol Técnico:** Líder de Arquitectura Relacional, Identidad Centralizada, Microservicio de IA y DevOps  
**Tiempo Estimado de Exposición:** 5 a 7 minutos

---

## 1. Guion de Exposición Oral Minuto a Minuto

### Minuto 0:00 - 1:00 | Introducción y Planteo Arquitectónico
> "Buenas tardes, profesores. Mi nombre es Estefanía Borghi. En el desarrollo de **CineTrack**, asumí la responsabilidad de la arquitectura central del sistema: el diseño del modelo de datos transaccional en PostgreSQL 16, la autoridad central de identidad con SimpleJWT en Django REST Framework, el microservicio de inferencia semántica con FastAPI y Groq LPU, y la orquestación general de los 5 contenedores en Docker.
> Nuestro desafío principal fue diseñar una arquitectura políglota desacoplada, donde cada servicio cumple una responsabilidad única, comunicándose bajo contratos estrictos y tolerantes a fallos."

### Minuto 1:00 - 2:30 | TP 1 y TP 2: Persistencia Relacional e Identidad Centralizada
> "En el **TP 1**, establecimos a Django y PostgreSQL como la única fuente de verdad transaccional (`Single Source of Truth`). Diseñé el modelo de catálogo unificando series y películas bajo la entidad `MediaItem`, utilizando un discriminador de tipo y validaciones estrictas que impiden que una película tenga temporadas o episodios.
> Para el progreso de visualización en `UserProgress`, opté por almacenar el avance en segundos enteros acumulados (`current_seconds`). Esto elimina problemas de formato de fecha o zonas horarias y se sincroniza atómicamente con los reproductores HTML5.
> En el **TP 2**, implementé el sistema de identidad con `CustomUser`, autenticando mediante correo electrónico y contraseñas hasheadas con `PBKDF2-SHA256`. Para integrar con el backend de Node.js desarrollado por Ari, configuré `SimpleJWT` con algoritmo `HS256` y un serializer personalizado que inyecta en el payload claims esenciales: `user_id`, `username`, `email` y `role`. De este modo, Node.js verifica la firma criptográfica en memoria sin sobrecargar la base relacional en cada petición."

### Minuto 2:30 - 4:00 | TP 3: Microservicio de IA con Groq LPU y Optimización SQL
> "En el **TP 3**, construí el microservicio semántico `service-ai` con FastAPI y Pydantic v2 en el puerto 8002. Para la detección de spoilers y análisis de sentimiento, integré el LLM `llama-3.1-8b-instant` a través de la infraestructura LPU de Groq Cloud.
> Aplicamos una estrategia agresiva de ahorro de tokens: truncamos el texto a 800 caracteres, fijamos `temperature=0.0`, `max_tokens=80` y exigimos formato JSON nativo con un timeout estricto de 2.8 segundos.
> Pero lo más relevante a nivel de ingeniería es nuestro **circuito de contingencia**: si la API de Groq experimenta demoras o agota el timeout, se activa inmediatamente un analizador determinista local por palabras clave que responde en menos de 5 milisegundos con la cabecera `X-Degraded-AI: true`. Esto garantiza que Node.js nunca supere su corte de 4 segundos y que el usuario jamás quede bloqueado.
> En paralelo, en Django optimizamos las consultas creando índices B-Tree compuestos en `MediaItem`, `Season` y `UserProgress`, y erradicamos consultas N+1 mediante `prefetch_related` y `select_related`, reduciendo la carga del catálogo a solo 4 consultas SQL constantes."

### Minuto 4:00 - 5:30 | TP 4 y Conclusiones: OpenAPI 3.0, GraphQL y Docker
> "En el **TP 4**, estandarizamos la interfaz del sistema: expusimos OpenAPI 3.0 con Swagger UI en `/api/docs/` y montamos una capa GraphQL en `/graphql/` con `graphene-django` para consultas optimizadas de catálogo.
> Para el despliegue, elaboré los `Dockerfile` multietapa de Django y FastAPI ejecutando bajo usuarios sin privilegios (`appuser` y `aiuser`), orquestando los 5 servicios en `docker-compose.yml` con healthchecks automáticos en la red `cinetrack-net`.
> El proyecto cuenta con **35 pruebas automatizadas pasando al 100% en verde** entre Django, Node y FastAPI. CineTrack demuestra que es posible coordinar equipos con diferentes lenguajes respetando principios de alta cohesión, seguridad y resiliencia. Quedo a disposición del tribunal para las preguntas."

---

## 2. Banco de Preguntas Críticas del Tribunal Examinador (y Respuestas Técnicas)

### P1: ¿Por qué eligieron una arquitectura políglota en lugar de hacer todo el proyecto en Django o en Node.js?
* **Respuesta Técnica:** Porque cada dominio del problema tiene patrones de acceso y concurrencia muy diferentes. Django y PostgreSQL son ideales como fuente única de verdad relacional y transaccional (integridad referencial, relaciones complejas de temporadas/episodios y manejo robusto de usuarios y migraciones). Node.js con MongoDB destaca en la capa social, donde las reseñas y los árboles anidados de comentarios crecen jerárquicamente y requieren lecturas ultrarrápidas y eventos en tiempo real con Socket.IO. Mantenerlos separados permitió modelar cada base de datos de acuerdo a su naturaleza de acceso.

### P2: ¿Cómo garantizan que un token JWT emitido por Django sea confiable en Node.js sin que Node consulte a PostgreSQL?
* **Respuesta Técnica:** Utilizamos criptografía simétrica HMAC con SHA-256 (`HS256`). Ambos microservicios comparten la misma clave secreta (`JWT_SIGNING_KEY`) a través de variables de entorno. Cuando Django emite el access token en `users/serializers.py` (`CustomTokenObtainPairSerializer`), firma digitalmente el payload que contiene `user_id`, `username`, `email` y `role`. Cuando el cliente hace una petición a Node.js, su middleware `authMiddleware.js` ejecuta `jwt.verify(token, secretKey, { algorithms: ['HS256'] })`. Si la firma coincide y el token no ha expirado, Node confía plenamente en los claims sin emitir ninguna consulta de red.

### P3: ¿Por qué guardaron el progreso del usuario (`current_seconds`) como un entero positivo y no como un campo de tipo Time o Duration?
* **Respuesta Técnica:** Se diseñó en `tracking/models.py` con `PositiveIntegerField` por tres razones:
  1. **Interoperabilidad web:** La API estándar HTML5 de video entrega la propiedad `currentTime` en segundos. Al guardarlo como entero exacto, las llamadas `PATCH /api/v1/tracking/` son inmediatas y no requieren conversiones de cadenas ni cálculos de zonas horarias.
  2. **Atomicidad:** Evita discrepancias de precisión de punto flotante en microsegundos o problemas de parseo entre diferentes clientes (móvil, web, SmartTV).
  3. **Universalidad:** En películas representa el segundo absoluto acumulado, y en series, combinado con `current_season_number` y `current_episode_number`, ubica exactamente la escena donde se pausó el episodio.

### P4: ¿Cómo previnieron vulnerabilidades de tipo IDOR (Insecure Direct Object References) en el endpoint de tracking?
* **Respuesta Técnica:** En `tracking/views.py`, en el `UserProgressViewSet`, sobrescribimos el método `get_queryset()`:
  ```python
  def get_queryset(self):
      return UserProgress.objects.filter(user=self.request.user).select_related("media_item")
  ```
  De esta forma, aunque un usuario malicioso envíe por URL el ID de progreso de otra persona (`GET /api/v1/tracking/99/`), la consulta filtra forzosamente por el usuario autenticado en el token (`request.user`), retornando un 404. Además, en `perform_create()` se asigna forzosamente `serializer.save(user=self.request.user)`.

### P5: En el microservicio de IA, ¿qué sucede si la API de Groq Cloud se cae o agota el timeout?
* **Respuesta Técnica:** Implementamos un patrón de resiliencia con fallback heurístico determinista en `service-ai/services/groq_analyzer.py`. Configuramos la llamada de Groq con un timeout de 2.8 segundos. Si la llamada lanza una excepción o excede ese tiempo, el bloque `except` captura el fallo e invoca inmediatamente `fallback_heuristic_analyzer(comment)`. Este analizador local ejecuta una búsqueda léxica sobre un conjunto de palabras clave de giros argumentales (`muere`, `asesino`, `final`, `traiciona`, etc.) y devuelve un `ReviewGuardResponse` válido con `200 OK` y la cabecera `X-Degraded-AI: true` en menos de 5 ms. Esto asegura que Node.js reciba la respuesta mucho antes de su timeout de 4s y la reseña se publique sin fricción.

### P6: ¿Cómo evitaron el problema de consultas N+1 en el listado del catálogo de Django?
* **Respuesta Técnica:** En `catalog/views.py`, en `MediaItemViewSet`, configuramos:
  ```python
  queryset = MediaItem.objects.prefetch_related("genres", "seasons__episodes").all()
  ```
  Sin esta optimización, si el catálogo tiene 100 obras, Django ejecutaría 1 consulta para las obras, 100 para los géneros ManyToMany y 100 para las temporadas con sus episodios (más de 200 consultas). Con `prefetch_related`, Django ejecuta únicamente 4 consultas SQL estructuradas con cláusulas `IN` y une los objetos en memoria Python. Nuestro comando `benchmark_queries.py` verifica que para todo el catálogo se ejecutan únicamente 4 consultas SQL.

### P7: ¿Qué índices de base de datos crearon y cómo verificaron su impacto?
* **Respuesta Técnica:** En `catalog/models.py` añadimos índices simples (`db_index=True`) en `title`, `media_type`, `release_date`, `producer` e `is_active`, y definimos dos índices compuestos B-Tree:
  - `media_type_active_idx` sobre `(media_type, is_active)` para acelerar los filtros combinados más comunes.
  - `media_date_title_idx` sobre `(release_date, title)` para ordenar cronológicamente.
  En `tracking/models.py` creamos el índice compuesto `prog_user_media_idx` sobre `(user, media_item)`.
  Verificamos su impacto ejecutando `qs.explain()` mediante `manage.py benchmark_queries`, donde la base de datos reporta el uso directo del plan `SEARCH TABLE catalog_mediaitem USING INDEX media_type_active_idx`.

### P8: ¿Cómo funciona la consulta GraphQL federada entre Node.js y Django?
* **Respuesta Técnica:** En Node.js, Ari implementó en `src/graphql/schema.js` el resolver `mediaDetailsWithReviews(mediaItemId)`. Cuando un cliente ejecuta esta consulta:
  1. Node realiza una llamada HTTP interna a Django REST `GET /api/v1/media/{id}/` a través de `djangoService.js` (con timeout de 2500 ms).
  2. Django le responde con la entidad `MediaItem` (`title`, `media_type`, `synopsis`, `release_date`).
  3. Node consulta en MongoDB las reseñas vinculadas a ese `mediaItemId` y calcula el `averageRating` y `totalReviews`.
  4. Node unifica ambas respuestas en un único objeto JSON GraphQL y lo entrega al cliente en un solo viaje de red.

### P9: ¿Qué medidas de seguridad implementaron en los Dockerfiles de producción?
* **Respuesta Técnica:** Aplicamos dos principios fundamentales de seguridad en contenedores:
  1. **Multi-Stage Builds:** En `backend-django/Dockerfile`, la etapa `builder` descarga e instala paquetes y herramientas de compilación (`build-essential`, `libpq-dev`). En la etapa final solo se copian las librerías necesarias, reduciendo drásticamente el peso de la imagen y la superficie de ataque.
  2. **Usuarios Non-Root:** Por defecto, los contenedores corren como `root`. En Django creamos y configuramos el usuario `appuser` (UID 1000) y en FastAPI el usuario `aiuser` (UID 1001), asegurando que ningún proceso se ejecute con privilegios de superusuario dentro del contenedor.

### P10: ¿Qué estrategia adoptaron para evitar que las herramientas de asistencia por IA ensuciaran el repositorio formal de la cátedra?
* **Respuesta Técnica:** Implementamos una política estricta de aislamiento en tres capas:
  1. En `.gitignore` excluimos explícitamente `.specify/`, `.antigravity/`, `*.prompt.md` y `*.agent.md`.
  2. Configuramos un hook de Git en `.git/hooks/pre-commit` que intercepta cualquier commit y aborta la operación si detecta algún archivo de agentes o metodologías SDD en el área de staging.
  3. Fijamos reglas operativas de equipo en `.antigravity/rules.md`. De este modo, los artefactos de asistencia de IA permanecieron exclusivamente en el entorno local del desarrollador y el repositorio público de GitHub contiene código académico y de negocio 100% puro.

