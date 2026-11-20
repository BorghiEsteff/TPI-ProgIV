# CineTracker Backend Node.js — Comandos de QA

Esta rama contiene únicamente `backend-node/`.

## 1. Suite unitaria / integración (autocontenida)
```powershell
cd backend-node
npm ci
npm test
```

## 2. Pruebas en vivo contra servicios externos
Requiere MongoDB activo y que `backend-django` (`:8000`) y `service-ai` (`:8002`) estén levantados desde `main` o desde la rama `backend-django`:
```powershell
cd backend-node
$env:PORT="5000"
$env:MONGODB_URI="mongodb://127.0.0.1:27017/cinetrack_qa"
$env:DJANGO_API_URL="http://127.0.0.1:8000/api/v1"
$env:AI_SERVICE_URL="http://127.0.0.1:8002/ai"
$env:CLIENT_ORIGIN="http://localhost:5173,http://127.0.0.1:5173"
node src/server.js
```
Verificar `GET http://127.0.0.1:5000/health`.
