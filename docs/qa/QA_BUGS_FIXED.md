# Bugs Detectados y Corregidos Durante QA

## Bugs reales de producto detectados por Playwright

### 1. Crash P0 en `MyTrackingPage` (`TypeError: Cannot read properties of undefined (reading 'media_item_detail')`)
- **Detectado en:** `07-responsive-accessibility.spec.js` y `04-submissions-moderation-matrix.spec.js` (pantalla blanca al renderizar entradas en `/my-tracking`).
- **Causa raíz:** `frontend/src/pages/MyTrackingPage.jsx` invocaba `<SecondsInputControl>` pasando props obsoletas (`initialSeconds`, `initialStatus`, `saving`, `onSave`), mientras que `frontend/src/components/tracking/SecondsInputControl.jsx` esperaba `{ progress, isSaving, onUpdateProgress, onDeleteProgress }` y leía `progress.media_item_detail`. Las pruebas unitarias de Vitest no lo detectaron porque testeaban `SecondsInputControl` aislado con mocks.
- **Corrección:** Actualizado `frontend/src/pages/MyTrackingPage.jsx` para pasar `progress={item}`, `isSaving={savingId === item.id}`, `onUpdateProgress={handleUpdateProgress}` y `onDeleteProgress={setDeleteTarget}`.
- **Verificación:** `03-private-diary.spec.js`, `04-submissions-moderation-matrix.spec.js` y `07-responsive-accessibility.spec.js` en `chromium-desktop` y `chromium-mobile` (`PASS`, `pageErrors === []`).

### 2. Botón heredado `Sala en Vivo` (`/watch-rooms/:id`) aún visible en `MediaCard`
- **Detectado en:** `01-public-catalog.spec.js` / revisión de UI en catálogo público.
- **Causa raíz:** `frontend/src/components/catalog/MediaCard.jsx` seguía renderizando el botón `Sala en Vivo` apuntando a `/watch-rooms/${item.id}` y el texto `"Detalle y Resenas"`, además de no enlazar el título de la tarjeta hacia la ficha pública.
- **Corrección:** Eliminado el botón `Sala en Vivo` en `frontend/src/components/catalog/MediaCard.jsx`, renombrado el botón principal a `"Ver ficha"` y enlazado el título de la tarjeta a `/media/${item.id}`. Actualizado el test unitario `frontend/src/tests/catalogButtons.test.jsx` para verificar la ausencia de `Sala en Vivo`.
- **Verificación:** Vitest `5/5` archivos (`15/15` tests `PASS`) y Playwright `01-public-catalog` / `04-submissions-moderation-matrix`.

### 3. Subtítulo heredado en `LoginPage` mencionando reseñas y salas en vivo
- **Detectado en:** Inspección de `frontend/src/pages/LoginPage.jsx` durante diagnóstico de login E2E.
- **Causa raíz:** El subtítulo aún decía `"para acceder al seguimiento personal, resenas y salas en vivo."`.
- **Corrección:** Actualizado a `"para acceder a su diario privado de series y peliculas."`.

### 4. CORS en `backend-node` bloqueaba peticiones de `http://127.0.0.1:5173` hacia `http://localhost:5000`
- **Detectado en:** `05-ai-recommendations.spec.js` (alerta `"No se pudo establecer conexion con el servidor."`).
- **Causa raíz:** `backend-node/src/app.js` tomaba `process.env.CLIENT_ORIGIN` como string único (por defecto `http://localhost:5173` en `.env`), rechazando peticiones originadas desde `http://127.0.0.1:5173`.
- **Corrección:** `backend-node/src/app.js` ahora parsea `CLIENT_ORIGIN` separado por comas en un arreglo de orígenes permitidos, permitiendo configurar `http://localhost:5173,http://127.0.0.1:5173` en QA.
- **Verificación:** `05-ai-recommendations.spec.js` y `03-private-diary.spec.js` (`PASS` en desktop y mobile).

---

## Ajustes en fixtures y selectores E2E (sin debilitar aserciones)

1. `frontend/e2e/fixtures/apiClients.js`: `uiLogin` buscaba botón `/Iniciar Sesi/i`; actualizado al texto real `^Ingresar$`.
2. `frontend/e2e/specs/01-public-catalog.spec.js` y `03-private-diary.spec.js`: React-Bootstrap `<Button as={Link}>` expone `role="button"` en el árbol ARIA, ajustado de `getByRole('link', ...)` a `getByRole('button', ...)`.
3. `frontend/e2e/specs/03-private-diary.spec.js`, `04-submissions-moderation-matrix.spec.js`, `07-responsive-accessibility.spec.js`: `getByLabel('N estrellas')` y `getByRole('button', { name: 'Quitar' })` chocaban con `aria-label` contenedores/secundarios (`Quitar puntuación`, `grupo 1 a 5 estrellas`); acotados con `getByRole('button', { name: 'N estrellas' })` y `{ exact: true }`.
4. `frontend/e2e/specs/04-submissions-moderation-matrix.spec.js`: clic en tarjeta de catálogo dirigido al botón `Ver ficha`.
5. `frontend/e2e/specs/05-ai-recommendations.spec.js`: `E2E-30` verifica que el prompt `'Obra Oculta QA'` jamás incluye esa obra oculta en `/api/v1/recommendations` y que `/ai/recommend` retorna `[]` ante criterios estrictos sin coincidencia (`'kdrama del 2099'`).
6. `frontend/e2e/specs/02-auth-roles.spec.js`: en `chromium-mobile` (`390x844`), abre `button.navbar-toggler` antes de verificar enlaces colapsados en el navbar responsive.
