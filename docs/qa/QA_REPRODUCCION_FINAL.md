# CineTrack — Reproducción Final QA (Windows PowerShell)

## Modo 1: `SQLite QA + Mongo QA + Fallback Determinista` (Verificado PASS)

```powershell
# 1. Inicializar BD QA aislada
cd backend-django
if (Test-Path db.qa.sqlite3) { Remove-Item db.qa.sqlite3 -Force }
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:SQLITE_DB_NAME="db.qa.sqlite3"
.\venv\Scripts\python.exe manage.py migrate --noinput
.\venv\Scripts\python.exe seed_qa.py

cd ..\backend-node
node -e "const m=require('mongoose'); m.connect('mongodb://127.0.0.1:27017/cinetrack_qa').then(async()=>{await m.connection.db.dropDatabase(); process.exit(0);});"
```

Levantar los 4 servicios en terminales separadas:
```powershell
# Terminal 1: Django QA (:8000)
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"; $env:SQLITE_DB_NAME="db.qa.sqlite3"
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload

# Terminal 2: FastAPI IA (:8002)
cd service-ai
$env:GROQ_API_KEY=""
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002

# Terminal 3: Node Express (:5000)
cd backend-node
$env:PORT="5000"; $env:MONGODB_URI="mongodb://127.0.0.1:27017/cinetrack_qa"
$env:DJANGO_API_URL="http://127.0.0.1:8000/api/v1"; $env:AI_SERVICE_URL="http://127.0.0.1:8002/ai"
$env:CLIENT_ORIGIN="http://localhost:5173,http://127.0.0.1:5173"
node src/server.js

# Terminal 4: Vite (:5173)
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Ejecutar pruebas:
```powershell
cd frontend
npm run test:e2e -- --project=chromium-desktop
# (opcional: re-sembrar antes de mobile)
npm run test:e2e -- --project=chromium-mobile
npm test -- --run
npm run build
```

---

## Modo 2: `PostgreSQL QA Real + Mongo QA + Fallback Determinista`

```powershell
# Ejemplo usando contenedor PostgreSQL QA descartable (requiere Docker Desktop activo)
docker run -d --name cinetrack-pg-qa -p 5433:5432 `
  -e POSTGRES_DB=cinetrack_qa -e POSTGRES_USER=qa_user -e POSTGRES_PASSWORD=qa_pass `
  postgres:16-alpine

cd backend-django
$env:DB_ENGINE="django.db.backends.postgresql"
$env:DB_STRICT="1"
$env:DB_NAME="cinetrack_qa"; $env:DB_USER="qa_user"; $env:DB_PASSWORD="qa_pass"
$env:DB_HOST="127.0.0.1"; $env:DB_PORT="5433"
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py migrate --noinput
.\venv\Scripts\python.exe -m pytest -q
# Sembrar QA (adaptar SQLITE_DB_NAME o usar script equivalente sobre PG QA) y correr Django en :8000
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload

# Limpieza exclusiva del contenedor QA descartable:
docker rm -f cinetrack-pg-qa
```

---

## Modo 3: `PostgreSQL QA Real + Mongo QA + Groq Real`

Igual al Modo 2, configurando en la terminal de `service-ai`:
```powershell
cd service-ai
$env:GROQ_API_KEY="<TU_GROQ_API_KEY>"
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002
```
Luego ejecutar `05-ai-recommendations.spec.js` (verificando hasta 3 solicitudes reales contra `api.groq.com`).
