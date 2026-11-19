# CineTrack — Rama Especializada `backend-node` (Node.js + Express + MongoDB)

Esta rama contiene una instantanea selectiva y no destructiva desde `main` (`7b7c1712bd3c31e5493ccc414e5f88f3582d5950`) enfocada exclusivamente en el servicio Node.js del ecosistema CineTrack:

- **`backend-node/`**: API REST en Express, Mongoose (`PersonalNote`, `ActivityLog` y codigo historico de `Review` / `socketService.js`), verificacion JWT (`HS256` emitido por Django), endpoint `/api/v1/recommendations` (con preseleccion sobre catalogo activo, rate limiting y revalidacion), GraphQL (`express-graphql`), pruebas Jest/Supertest, `Dockerfile` y `.env.example`.
- **`docs/backend-node/`**: Copias de referencia de la documentacion de integracion, contrato JWT, OpenAPI Node y reportes QA pertinentes (la documentacion integral completa permanece en `main`).

## Dependencias Externas (No Duplicadas)

Este servicio no puede ejecutarse de forma aislada completa sin sus dependencias externas:
- **MongoDB (`MONGODB_URI`):** Base documental para notas personales y registros de actividad.
- **Backend Django (`http://localhost:8000/api/v1`):** Autoridad emisora de JWT (`JWT_SIGNING_KEY` compartido), catalogo publicado y verificacion de propiedad de entradas (`verify-ownership`).
- **Service AI FastAPI (`http://localhost:8002/ai`):** Inferencia de recomendaciones (`/recommend`) con fallback determinista local en Node si FastAPI no responde.
- **Restriccion de merge:** No fusionar esta rama completa hacia `main` (contiene unicamente el servicio Node). Integrar cambios puntuales mediante cherry-pick o rutas especificas.

## Ejecucion de Pruebas

```bash
cd backend-node
npm ci
npm test
```
