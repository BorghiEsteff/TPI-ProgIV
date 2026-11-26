# CineTrack — Guía Completa de Reproducibilidad

Esta guía describe los pasos verificados contra el código fuente de `main` para clonar, configurar, levantar, poblar y probar **CineTrack** tanto con **Docker Compose** como en **modo desarrollo / QA local**.

---

## 1. Prerrequisitos de Software

* **Git** 2.40+
* **Opción A (Contenedores — recomendada para evaluación integral):**
  * **Docker Desktop / Docker Engine** con **Docker Compose v2** (`docker compose version`)
* **Opción B (Ejecución local servicio por servicio):**
  * **Python 3.12+** (validado en Windows con Python `3.14.7`)
  * **Node.js 20+** y **npm 10+** (validado con Node `v24.16.0` y npm `11.13.0`)
  * **PostgreSQL 16+** (o **SQLite** para desarrollo/QA rápido sin servidor PG)
  * **MongoDB 7+** activo en `127.0.0.1:27017`

---

## 2. Clonado del Repositorio

```bash
git clone https://github.com/BorghiEsteff/TPI-ProgIV.git
cd TPI-ProgIV
```

---

## 3. Opción A: Ejecución Completa con Docker Compose

El archivo `docker-compose.yml` orquesta **7 servicios** en la red interna `cinetrack-net`:
`postgres`, `mongo`, `django-backend`, `node-backend`, `service-ai`, `frontend` y `proxy` (Nginx en `127.0.0.1:8088`).

### 3.1 Configuración de `.env` raíz
Copia `.env.example` a `.env` en la raíz del proyecto y define al menos las credenciales obligatorias:

```bash
cp .env.example .env
```

Variables clave en `.env` (raíz):
```env
DB_NAME=cinetrack_db
DB_USER=cinetrack_user
DB_PASSWORD=replace-with-strong-db-password
MONGO_DB=cinetrack_social
SECRET_KEY=replace-with-strong-django-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,django-backend
CSRF_TRUSTED_ORIGINS=http://127.0.0.1:8088,http://localhost:8088
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8088,http://localhost:8088
SERVE_MEDIA=True
JWT_SIGNING_KEY=replace-with-shared-jwt-signing-key-min-32-chars
CLIENT_ORIGIN=http://127.0.0.1:8088,http://localhost:8088
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
PROXY_PORT=8088
VITE_DJANGO_API_URL=/django/api/v1
VITE_DJANGO_GRAPHQL_URL=/django/graphql/
VITE_NODE_API_URL=/node/api/v1
VITE_NODE_GRAPHQL_URL=/node/graphql
VITE_NODE_SOCKET_URL=
```

> **Nota sobre `GROQ_API_KEY`:** si se deja vacía, `service-ai` funciona automáticamente en modo fallback determinista (`degraded: true`) sin errores.

### 3.2 Construcción, arranque y datos iniciales

```bash
docker compose up --build -d
docker compose ps
```

Puertos locales expuestos (solo en `127.0.0.1` por seguridad):
* **Proxy unificado (recomendado):** `http://localhost:8088`
* **Frontend directo:** `http://localhost:5173`
* **Django API / Swagger / GraphQL:** `http://localhost:8000/api/docs/` y `http://localhost:8000/graphql/`
* **Node.js Health / GraphQL:** `http://localhost:5000/health` y `http://localhost:5000/graphql`
* **Service AI:** interno en `cinetrack-net` (`http://service-ai:8002/health`)

Para cargar datos de demostración en el contenedor Django (si la base está vacía):
```bash
docker compose exec django-backend python manage.py migrate
docker compose exec django-backend python manage.py seed_data
```

---

## 4. Opción B: Ejecución Local (Servicio por Servicio)

### 4.1 Variables de entorno por servicio
Copia cada `.env.example` a `.env` dentro de su respectiva carpeta:
* `backend-django/.env` (desde `backend-django/.env.example`):
  * Para usar SQLite en local sin PostgreSQL, agrega `DB_ENGINE=django.db.backends.sqlite3`.
  * Asegúrate de que `JWT_SIGNING_KEY` sea **idéntica** a la de `backend-node/.env`.
* `backend-node/.env` (desde `backend-node/.env.example`):
  * Verifica `MONGODB_URI=mongodb://localhost:27017/cinetrack_social`, `DJANGO_API_URL=http://localhost:8000/api/v1`, `AI_SERVICE_URL=http://localhost:8002/ai`.
* `service-ai/.env` (desde `service-ai/.env.example`):
  * `PORT=8002`, `GROQ_API_KEY=` (opcional).
* `frontend/.env` (desde `frontend/.env.example`):
  * Modo directo: `VITE_DJANGO_API_URL=http://localhost:8000/api/v1`, `VITE_NODE_API_URL=http://localhost:5000/api/v1`.

### 4.2 Arranque en Windows (PowerShell)

**1. Backend Django (`:8000`):**
```powershell
cd backend-django
Copy-Item .env.example .env
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py seed_data
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

**2. Microservicio IA (`:8002`):**
```powershell
cd service-ai
Copy-Item .env.example .env
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002
```

**3. Backend Node.js (`:5000`):**
```powershell
cd backend-node
Copy-Item .env.example .env
npm install
npm start
```

**4. Frontend React (`:5173`):**
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 5. Datos Semilla y Credenciales de Prueba

### 5.1 Semilla estándar (`manage.py seed_data`)
Carga géneros base, catálogo inicial y 3 usuarios de demostración:

| Email | Username | Contraseña | Rol |
| :--- | :--- | :--- | :--- |
| `admin@cinetrack.local` | `admin_cinetrack` | `AdminPassword123!` | `ADMIN` |
| `critic@cinetrack.local` | `critico_experto` | `CriticPassword123!` | `USER` |
| `user@cinetrack.local` | `fan_series` | `UserPassword123!` | `USER` |

Además existe el fixture `backend-django/catalog/fixtures/initial_data.json` cargable mediante `manage.py loaddata initial_data`.

### 5.2 Semilla aislada para QA y E2E (`seed_qa.py`)
Requiere `SQLITE_DB_NAME=db.qa.sqlite3` para proteger la base de desarrollo:
```powershell
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:SQLITE_DB_NAME="db.qa.sqlite3"
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe seed_qa.py
```

Cuentas QA creadas por `seed_qa.py`:
| Email | Username | Contraseña | Rol |
| :--- | :--- | :--- | :--- |
| `qa_admin@cinetrack.local` | `qa_admin` | `QaAdminPass123!` | `ADMIN` |
| `qa_a@cinetrack.local` | `qa_user_a` | `QaUserPass123!` | `USER` |
| `qa_b@cinetrack.local` | `qa_user_b` | `QaUserPass123!` | `USER` |
| `qa_c@cinetrack.local` | `qa_user_c` | `QaUserPass123!` | `USER` |

---

## 6. Ejecución de Suites de Pruebas Automatizadas

| Servicio | Comando | Alcance Verificado (Acta 19/11/2026) |
| :--- | :--- | :--- |
| **Django (`backend-django/`)** | `.\venv\Scripts\python.exe -m pytest -v` | 29 passed (SQLite y PostgreSQL 16) |
| **Service AI (`service-ai/`)** | `.\venv\Scripts\python.exe -m pytest -v` | 9 passed (fallback, anti-alucinación, prompt injection) |
| **Node.js (`backend-node/`)** | `npm test` | 6 suites, 25 passed (`auth`, `personalNote`, `recommendations`, `review`, `graphql`, `realtime`) |
| **Frontend Unit (`frontend/`)** | `npm test` y `npm run build` | 7 archivos, 24 passed; build Vite 438 módulos |
| **Playwright E2E (`frontend/`)** | `npm run test:e2e -- --project=chromium-desktop` y `--project=chromium-mobile` | 22/22 desktop + 22/22 mobile (aislando `db.qa.sqlite3` y `cinetrack_qa` entre corridas) |
| **Benchmark SQL (`backend-django/`)** | `.\venv\Scripts\python.exe manage.py benchmark_queries` | Validación de índices y prevención N+1 |
