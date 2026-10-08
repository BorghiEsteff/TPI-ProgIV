# TP 4: Contenedores Multietapa, CI/CD, OpenAPI y Capa GraphQL

**Asignatura:** Programación IV (Plan 2024) - UTN FRRE (Extensión Áulica Goya)  
**Proyecto:** CineTrack  

---

## 1. Objetivos del Trabajo Práctico
Containerizar y orquestar el ecosistema políglota completo mediante Docker Compose, establecer pipelines de integración continua en GitHub Actions, y publicar especificaciones de API modernas (OpenAPI y GraphQL).

---

## 2. Requisitos y Entregables

### 2.1 Dockerización Multietapa (`Multi-Stage Builds`)
- `backend-django/Dockerfile`: Imagen base ligera (Python slim/alpine), separación de etapas para compilación de dependencias y ejecución sin privilegios de root (`non-root user`).
- `backend-node/Dockerfile`: Etapa de dependencias/build y etapa final optimizada con Node alpine.
- `service-ai/Dockerfile`: Contenedor para FastAPI y conectividad hacia Ollama.
- `docker-compose.yml` integral para orquestar: PostgreSQL, MongoDB, Django, Node, FastAPI y Ollama bajo redes aisladas.

### 2.2 Integración Continua (GitHub Actions)
- Pipeline automatizado en `.github/workflows/ci.yml`:
  - Linting de código (flake8 / ruff para Python, eslint / prettier para JavaScript).
  - Ejecución de pruebas unitarias y de integración (Pytest y Jest).
  - Verificación de builds de contenedores Docker.

### 2.3 Documentación de APIs (OpenAPI / Swagger y GraphQL)
- **OpenAPI 3.0:** Generación de especificación Swagger en Django mediante `drf-spectacular` accesible en `/api/schema/swagger-ui/`.
- **Capa GraphQL:** Exposición de consultas unificadas para consultar catálogo y reseñas mediante GraphQL (ej. Strawberry o Apollo Server).
