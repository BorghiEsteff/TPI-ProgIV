# CineTracker Python (`backend-django` + `service-ai`) — Comandos de QA

Esta rama incluye únicamente `backend-django/` y `service-ai/`. Para pruebas integrales E2E con interfaz web y notas privadas en MongoDB, se requieren `backend-node` (`:5000`) y `frontend` (`:5173`) ejecutándose desde `main` o sus ramas respectivas.

## 1. Inicializar BD QA aislada (`db.qa.sqlite3`)
```powershell
Remove-Item -ErrorAction SilentlyContinue backend-django\db.qa.sqlite3
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:SQLITE_DB_NAME="db.qa.sqlite3"
.\venv\Scripts\python.exe manage.py migrate --noinput
.\venv\Scripts\python.exe seed_qa.py
```

## 2. Levantar ambos servicios Python localmente
```powershell
# Terminal 1: Django (:8000)
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:SQLITE_DB_NAME="db.qa.sqlite3"
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload

# Terminal 2: FastAPI IA (:8002)
cd service-ai
$env:GROQ_API_KEY=""
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002
```

## 3. Suites automatizadas
```powershell
# Django (29 tests)
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
.\venv\Scripts\python.exe -m pytest -v

# FastAPI (9 tests)
cd service-ai
.\venv\Scripts\python.exe -m pytest -v
```
