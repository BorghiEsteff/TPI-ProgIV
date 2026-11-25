# CineTracker / CineTrack

Plataforma web full-stack para descubrimiento de catálogo audiovisual, diario personal de visualización, propuestas comunitarias con moderación administrativa y asistente conversacional de recomendaciones con IA.

Proyecto Integrador de **Programación IV** — UTN Facultad Regional Resistencia (Extensión Áulica Goya).

---

## Arquitectura actual (4 componentes)

| Componente | Carpeta | Stack principal | Puerto local | Responsabilidad |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Central** | `backend-django/` | Django 6.1.2, DRF, SimpleJWT, Graphene, drf-spectacular | `8000` | Identidad/RBAC (`USER`, `ADMIN`), catálogo público, propuestas/moderación, diario privado, REST, GraphQL y OpenAPI |
| **Microservicio IA** | `service-ai/` | FastAPI, Pydantic v2, httpx, Groq Cloud API | `8002` | Endpoint `POST /ai/recommend` limitado al catálogo publicado (default en código: `openai/gpt-oss-20b` en `recommender.py`; `docker-compose.yml` fija `llama-3.1-8b-instant` si no se define `GROQ_MODEL`), con degradación determinista (`degraded: true`) ante ausencia o fallo de `GROQ_API_KEY` |
| **Backend Complementario** | `backend-node/` | Node.js 20+, Express, Mongoose (MongoDB 7), Apollo/GraphQL | `5000` | Verificación JWT compartida, notas privadas (`PersonalNote`), proxy `/api/v1/recommendations` y endpoints heredados desactivados (`410`) |
| **Frontend SPA** | `frontend/` | React 19, Vite 8, Axios, Vitest, Playwright | `5173` | Catálogo público, detalle, diario personal, propuestas, panel de moderación y asistente flotante IA con claqueta |

---

## Requisitos previos

* **Python 3.12+** (entorno validado en Windows con Python 3.14)
* **Node.js 20+** y **npm 10+**
* **PostgreSQL 16+** (o SQLite para desarrollo/QA local rápido)
* **MongoDB 7+**
* **Docker Desktop / Docker Compose** (opcional, para levantar los 6 contenedores en un solo comando)

---

## Instalación y ejecución local desde clon limpio

### 1. Clonar el repositorio

```bash
git clone https://github.com/BorghiEsteff/TPI-ProgIV.git
cd TPI-ProgIV
```

### 2. Backend Django (`backend-django/`, puerto 8000)

Copiar `.env.example` a `.env` y configurar `SECRET_KEY`, `JWT_SIGNING_KEY` y base de datos (`DB_ENGINE=django.db.backends.postgresql` o `django.db.backends.sqlite3` para pruebas locales):

**Linux / macOS:**
```bash
cd backend-django
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8000
```

**Windows (PowerShell):**
```powershell
cd backend-django
Copy-Item .env.example .env
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py seed_data
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

### 3. Microservicio IA (`service-ai/`, puerto 8002)

Si `GROQ_API_KEY` se deja vacía, el servicio opera automáticamente en modo fallback determinista (`degraded: true`) sobre el catálogo recibido.

**Linux / macOS:**
```bash
cd service-ai
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002
```

**Windows (PowerShell):**
```powershell
cd service-ai
Copy-Item .env.example .env
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002
```

### 4. Backend Node.js (`backend-node/`, puerto 5000)

Requiere MongoDB activo y el mismo `JWT_SIGNING_KEY` configurado en `backend-django/.env`.

```bash
cd backend-node
cp .env.example .env
npm install
npm start
```

### 5. Frontend React (`frontend/`, puerto 5173)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Abrir en el navegador: `http://localhost:5173`.

> **Notas importantes de puesta en marcha desde un clon limpio:**
> * **Datos iniciales:** `manage.py seed_data` carga un catálogo y usuarios de demostración iniciales (las bases locales con datos personales no se suben al repositorio).
> * **SQLite local vs. PostgreSQL:** si no tenés PostgreSQL instalado localmente, definí `DB_ENGINE=django.db.backends.sqlite3` en `backend-django/.env` antes de correr `migrate` y `seed_data`.
> * **Modo directo vs. proxy/Tailscale:** `frontend/.env.example` apunta por defecto a `http://localhost:8000` y `http://localhost:5000` para funcionar directo en `http://localhost:5173`. Si querés usar el proxy unificado o Tailscale Serve, activá las rutas `/django/...` y `/node/...` en `frontend/.env`, ejecutá `node proxy/local-proxy.mjs` y abrí `http://localhost:8088`.

---

## Ejecución con Docker Compose

El archivo `docker-compose.yml` orquesta **PostgreSQL 16**, **MongoDB 7**, **django-backend**, **node-backend**, **service-ai** y **frontend**.

```bash
cp .env.example .env
# Editar .env definiendo DB_PASSWORD, SECRET_KEY y JWT_SIGNING_KEY
docker compose up --build
```

---

## Pruebas automatizadas y QA

* **Django (`backend-django/`):** `pytest -v`
* **FastAPI IA (`service-ai/`):** `pytest -v`
* **Node.js (`backend-node/`):** `npm test`
* **Frontend unitario (`frontend/`):** `npm test` y `npm run build`
* **Playwright E2E (`frontend/`):** ver guía de entorno QA aislado en [docs/qa/QA_COMMANDS.md](docs/qa/QA_COMMANDS.md) y el acta vigente en [docs/qa/ACTA_VALIDACION_FINAL.md](docs/qa/ACTA_VALIDACION_FINAL.md).

---

## Documentación académica y técnica

* Especificación IEEE Std 830 (SRS completa en Markdown): [CineTrack_TPI_IEEE830.md](CineTrack_TPI_IEEE830.md)
* Especificación IEEE Std 830 en Word (`.docx`): [docs/CineTrack_IEEE830_SRS.docx](docs/CineTrack_IEEE830_SRS.docx)
* Manual de Usuario final: [MANUAL_USUARIO.md](MANUAL_USUARIO.md)
* Arquitectura *as-built*, C4, DER, casos de uso y justificaciones: [docs/ARQUITECTURA_AS_BUILT.md](docs/ARQUITECTURA_AS_BUILT.md)
* Matriz de cumplimiento TP0–TP5 y trazabilidad TDD: [docs/CUMPLIMIENTO_TP0_TP5.md](docs/CUMPLIMIENTO_TP0_TP5.md)
* Contratos OpenAPI vigentes: [docs/tp-4-contenedores-despliegue/openapi-django.json](docs/tp-4-contenedores-despliegue/openapi-django.json) y [docs/tp-4-contenedores-despliegue/openapi.json](docs/tp-4-contenedores-despliegue/openapi.json)
* Índice de pruebas y evidencias QA: [docs/qa/INDICE_PRUEBAS_Y_EVIDENCIAS.md](docs/qa/INDICE_PRUEBAS_Y_EVIDENCIAS.md)
* Acceso privado multi-dispositivo con Tailscale Serve: [docs/TAILSCALE_ACCESO_PRIVADO.md](docs/TAILSCALE_ACCESO_PRIVADO.md) y [docs/qa/QA_TAILSCALE_MULTIDISPOSITIVO.md](docs/qa/QA_TAILSCALE_MULTIDISPOSITIVO.md)
