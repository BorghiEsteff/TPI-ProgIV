# CineTracker — Rama Especializada `backend-django` (Django + `service-ai`)

Esta rama contiene los dos servicios Python del ecosistema: `backend-django/` (API REST/GraphQL, JWT, catálogo, diario y moderación) y `service-ai/` (FastAPI + Groq/fallback). No incluye `backend-node/`, `frontend/` ni `docker-compose.yml` (que residen integrados en `main`).

> **Nota de divergencia respecto a `main`:** en esta instantánea de la rama, `backend-django/requirements.txt` declara `Django>=5.0,<5.2` (mientras que `main` declara `Django>=5.0,<6.2`) y `seed_data.py` aún conserva la referencia heredada `User.Role.CRITIC`. No prometer Django 6.1 al instalar desde este `requirements.txt` sin alinear la dependencia.

---

## Arranque desde clon limpio

### 1. Backend Django (`backend-django/`, puerto `8000`)
```bash
git clone -b backend-django https://github.com/BorghiEsteff/TPI-ProgIV.git
cd TPI-ProgIV/backend-django
cp .env.example .env
python -m venv venv
# Windows: .\venv\Scripts\python.exe -m pip install -r requirements.txt
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 2. Microservicio IA (`service-ai/`, puerto `8002`)
```bash
cd ../service-ai
cp .env.example .env
python -m venv venv
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002
```
* Si `GROQ_API_KEY` está vacía, `service-ai` responde en modo determinista (`degraded: true`). El default en código (`services/recommender.py`) es `openai/gpt-oss-20b`.

### Pruebas autocontenidas
* **Django:** `cd backend-django && pytest -v` (en Windows PowerShell con SQLite QA: `$env:DB_ENGINE="django.db.backends.sqlite3"; pytest -v`)
* **FastAPI:** `cd service-ai && pytest -v`
* Ver detalle en [docs/backend-django/QA_COMMANDS.md](docs/backend-django/QA_COMMANDS.md).
