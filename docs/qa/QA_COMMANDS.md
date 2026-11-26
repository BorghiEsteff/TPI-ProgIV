# CineTrack — Comandos de QA Local (Windows / PowerShell)

Estos comandos levantan un entorno QA completamente aislado sin tocar `db.sqlite3` ni la base de desarrollo de MongoDB.

## 1. Inicializar base QA aislada
```powershell
Remove-Item -ErrorAction SilentlyContinue backend-django\db.qa.sqlite3
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:SQLITE_DB_NAME="db.qa.sqlite3"
$env:PYTHONIOENCODING="utf-8"
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe seed_qa.py
```

> **Nota sobre codificación y portadas QA:** ejecutar `seed_qa.py` directamente con Python (evitar `Get-Content | manage.py shell` en PowerShell sin UTF-8 para no duplicar géneros acentuados como `Ciencia Ficción`). Las portadas locales de `seed_qa.py` residen en `frontend/public/qa-posters/*.png`.

Limpiar BD MongoDB QA:
```powershell
cd backend-node
node -e "import('mongoose').then(async ({default: m}) => { await m.connect('mongodb://127.0.0.1:27017/cinetrack_qa'); await m.connection.dropDatabase(); await m.disconnect(); })"
```

## 2. Levantar los 4 servicios QA (en terminales separadas)

**Terminal 1 — Django (puerto 8000):**
```powershell
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:SQLITE_DB_NAME="db.qa.sqlite3"
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload
```

**Terminal 2 — FastAPI IA (puerto 8002):**
```powershell
cd service-ai
$env:GROQ_API_KEY=""
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002
```

**Terminal 3 — Node/Express (puerto 5000):**
```powershell
cd backend-node
$env:PORT="5000"
$env:MONGODB_URI="mongodb://127.0.0.1:27017/cinetrack_qa"
$env:DJANGO_API_URL="http://127.0.0.1:8000/api/v1"
$env:AI_SERVICE_URL="http://127.0.0.1:8002/ai"
node src/server.js
```

**Terminal 4 — Frontend Vite (puerto 5173):**
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

**Terminal 5 — Proxy unificado local (puerto 8088, obligatorio si `frontend/.env` usa rutas relativas `/django/*` y `/node/*`):**
```powershell
node proxy/local-proxy.mjs
```
> El proxy enruta `/django/*` al backend Django, `/node/*` al backend Node.js, `/media/submission_posters/` y archivos de imagen a Django, y deja `/media/:id` para el SPA de Vite (habilitando apertura y recarga directa de fichas). Para correr QA en puertos alternativos, usar `PROXY_PORT=8188 DJANGO_PORT=8100 NODE_PORT=5100 FRONTEND_PORT=5174` y `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8188`.

## 3. Ejecutar Playwright E2E
> **Nota importante:** para evitar estado residual entre desktop y móvil, reinicializar `db.qa.sqlite3` (`python seed_qa.py`) y `cinetrack_qa` antes de correr cada proyecto por separado. Total vigente: **27/27 `chromium-desktop` + 27/27 `chromium-mobile`**.
```powershell
cd frontend
npm run test:e2e -- --project=chromium-desktop
npm run test:e2e -- --project=chromium-mobile
npm run test:e2e:report
```

## 4. Ejecutar suites unitarias / integración
```powershell
# Django
cd backend-django
$env:DB_ENGINE="django.db.backends.sqlite3"
.\venv\Scripts\python.exe -m pytest -q

# Node
cd backend-node
npm test

# FastAPI
cd service-ai
.\venv\Scripts\python.exe -m pytest -q

# Frontend Vitest + Build
cd frontend
npm test -- --run
npm run build
```
