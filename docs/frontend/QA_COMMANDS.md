# CineTracker Frontend — Comandos de QA

Esta rama contiene únicamente `frontend/`. Para ejecutar Playwright E2E se requieren los servicios externos (`backend-django` en `:8000`, `backend-node` en `:5000`, `service-ai` en `:8002`) iniciados desde `main` o desde sus respectivas ramas.

## 1. Pruebas unitarias y build (autocontenidos en esta rama)
```powershell
cd frontend
npm ci
npm test
npm run build
```

## 2. Pruebas E2E Playwright (requiere backends QA activos)
1. En el clon de `main` (o `backend-django` + `backend-node`), inicializar la base QA aislada (`db.qa.sqlite3` con `python seed_qa.py` y `cinetrack_qa` en MongoDB) y levantar los 3 servicios backend.
2. Instalar navegadores la primera vez y ejecutar:
```powershell
cd frontend
npx playwright install chromium
npm run test:e2e -- --project=chromium-desktop
# Re-sembrar db.qa.sqlite3 y limpiar cinetrack_qa antes de mobile:
npm run test:e2e -- --project=chromium-mobile
npm run test:e2e:report
```
