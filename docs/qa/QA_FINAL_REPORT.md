# Reporte Final de QA — CineTrack

- **Rama Git:** `feature/frontend-cinetrack` (sin `git push` ni commits remotos).
- **Entorno QA aislado:**
  - Django (`127.0.0.1:8000`): `DB_ENGINE=django.db.backends.sqlite3`, `SQLITE_DB_NAME=db.qa.sqlite3` (base de desarrollo `db.sqlite3` intacta).
  - Node.js (`127.0.0.1:5000`): `MONGODB_URI=mongodb://127.0.0.1:27017/cinetrack_qa`.
  - FastAPI IA (`127.0.0.1:8002`): `GROQ_API_KEY=""` (modo determinista local).
  - Vite Frontend (`127.0.0.1:5173`).

## Resumen de Ejecución Final (tras últimas ediciones)

| Suite / Capa | Comando | Resultado | Observaciones |
| :--- | :--- | :---: | :--- |
| **Playwright E2E (`chromium-desktop`, `1440x900`)** | `npm run test:e2e -- --project=chromium-desktop` | **16/16 PASS** | `02-auth-roles.spec.js` re-verificado `4/4 PASS` tras ajuste de navbar móvil. Incluye Matrix E2E completo. |
| **Playwright E2E (`chromium-mobile`, `390x844`)** | `npm run test:e2e -- --project=chromium-mobile` | **16/16 PASS** | Sin overflow horizontal (`scrollWidth <= innerWidth + 2`) ni errores JS (`pageErrors === []`). |
| **Backend Django (`pytest`)** | `.\venv\Scripts\pytest.exe -q` | **23/23 PASS** | Seguridad P1, `MediaSubmission`, `UserProgress`, moderación, colisión, concurrencia 409, SSRF/SVG. |
| **Backend Node (`jest`)** | `npm test` | **6 suites / 21 PASS** | Pruebas unitarias/integración con mocks de dependencias externas. |
| **Microservicio IA (`pytest`)** | `.\venv\Scripts\pytest.exe -q` | **4/4 PASS** | `POST /ai/recommend` y fallback determinista. |
| **Frontend Vitest + Build** | `npm test -- --run; npm run build` | **5 archivos / 15 PASS + Build OK** | Sin errores de compilación Vite (`dist/`). |

## Evidencias generadas (Caso Matrix)
- [matrix-admin-queue.png](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/docs/qa/evidence/matrix-admin-queue.png)
- [matrix-public-catalog.png](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/docs/qa/evidence/matrix-public-catalog.png)
- [matrix-diary-a.png](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/docs/qa/evidence/matrix-diary-a.png)
- [matrix-diary-b.png](file:///c:/Proyecto-Programacion/TPI-ProgramacionIV/docs/qa/evidence/matrix-diary-b.png)

## Elementos NO verificados / Bloqueados en este entorno
- **Restricciones reales en PostgreSQL:** **BLOCKED**. El servicio local `postgresql-x64-18` rechaza las credenciales de `cinetrack_user` y el daemon de Docker Desktop está detenido.
- **Llamada real a Groq API:** **NOT_RUN**. `service-ai/.env` no tiene `GROQ_API_KEY`; se verificó el modo degradado/determinista (`Modo limitado`).

## Dictamen Técnico
**LISTO PARA COMMIT Y PR LOCAL (CON RESERVAS DE ENTORNO EXTERNO):** Todos los flujos E2E desktop y mobile, el caso Matrix completo y las suites unitarias/integración locales pasan al 100% tras corregir un bug crítico P0 en `MyTrackingPage.jsx`, limpiar botones/textos heredados en `MediaCard.jsx`/`LoginPage.jsx` y habilitar múltiples orígenes CORS en `backend-node/src/app.js`. Queda pendiente validar PostgreSQL real y `GROQ_API_KEY` en un entorno con esas credenciales activas.
