# CineTracker — Rama Especializada `frontend`

Esta rama contiene exclusivamente la SPA React/Vite (`frontend/`) y su documentación/evidencia visual pertinente. No incluye `backend-django/`, `backend-node/`, `service-ai/` ni `docker-compose.yml` (que viven integrados en `main`).

---

## Arranque desde clon limpio

```bash
git clone -b frontend https://github.com/BorghiEsteff/TPI-ProgIV.git
cd TPI-ProgIV/frontend
cp .env.example .env
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

### Dependencias externas necesarias en tiempo de ejecución
Para operar la aplicación completa y correr Playwright E2E, deben estar levantados los servicios de `main` (o de las ramas `backend-django` y `backend-node`):
* `backend-django` en `http://localhost:8000`
* `backend-node` en `http://localhost:5000`
* `service-ai` en `http://localhost:8002` (consumido por `backend-node`)

### Pruebas de esta rama
* **Unitarias (Vitest):** `cd frontend && npm test`
* **Build de producción:** `cd frontend && npm run build`
* **E2E (Playwright):** requiere `npx playwright install chromium` y los 3 servicios backend activos; ver [docs/frontend/QA_COMMANDS.md](docs/frontend/QA_COMMANDS.md).
