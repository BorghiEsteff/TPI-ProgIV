# CineTracker — Rama Especializada `backend-node`

Esta rama contiene exclusivamente el servicio Node.js / Express (`backend-node/`) y su documentación pertinente. No incluye `backend-django/`, `service-ai/`, `frontend/` ni `docker-compose.yml` (disponibles integrados en `main`).

> **Nota de divergencia respecto a `main`:** en esta instantánea de la rama, `backend-node/src/server.js` conserva `origin: process.env.CLIENT_ORIGIN || '*'` en la configuración de Socket.IO, mientras que `main` restringe los orígenes por defecto. Esto no reactiva WatchRooms: `backend-node/src/services/socketService.js` mantiene la funcionalidad deshabilitada.

---

## Arranque desde clon limpio

```bash
git clone -b backend-node https://github.com/BorghiEsteff/TPI-ProgIV.git
cd TPI-ProgIV/backend-node
cp .env.example .env
npm ci
npm start
```

### Variables y dependencias externas en ejecución real
* **MongoDB 7:** configurar `MONGODB_URI` (ej. `mongodb://127.0.0.1:27017/cinetrack_social`).
* **JWT compartido:** `JWT_SIGNING_KEY` debe coincidir exactamente con el de `backend-django`.
* **Servicios externos:** `DJANGO_API_URL` (`http://127.0.0.1:8000/api/v1`) y `AI_SERVICE_URL` (`http://127.0.0.1:8002/ai`).
* **Health-check:** `GET http://127.0.0.1:5000/health`

### Pruebas autocontenidas
```bash
cd backend-node
npm test
```
Ejecuta las 6 suites Jest (25 tests) con mocks de integración.
