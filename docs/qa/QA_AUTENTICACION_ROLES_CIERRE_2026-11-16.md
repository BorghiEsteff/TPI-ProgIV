# QA Autenticación, Roles y Cierre Integral — CineTrack (`2026-11-16`)

## 1. Rama, SHA base y estado local
- **Rama:** `feature/frontend-cinetrack`
- **SHA base remoto:** `e042194`
- **Estado:** todos los cambios visuales y de autenticación permanecen **exclusivamente locales** (sin `commit`, `push`, `merge` ni modificación del PR #11).
- **Archivos modificados/creados en esta auditoría:**
  - `backend-django/users/serializers.py` (normalización case-insensitive de email en `CustomTokenObtainPairSerializer`)
  - `backend-django/users/tests/test_auth.py` (login con mayúsculas/espacios, `ADMIN` JWT y `/auth/me/`, refresh token, usuario inactivo 401)
  - `frontend/src/api/interceptors.js` (unwrap recursivo de `detail` anidado para evitar crash de React en `ErrorMessage`)
  - `frontend/src/components/common/ErrorMessage.jsx` (guardia estricta de tipo string en render)
  - `frontend/src/services/authService.js` (login atómico con limpieza previa y rollback si falla `/auth/me/`)
  - `frontend/src/context/AuthContext.jsx` (estado `justLoggedOut`, `isAuthenticated = Boolean(token && user)`)
  - `frontend/src/components/layout/ProtectedRoute.jsx` (evita capturar `state.from` del usuario anterior al cerrar sesión)
  - `frontend/src/components/layout/RoleGuard.jsx` (espera `loadingAuth` antes de mostrar restricción)
  - `frontend/src/components/layout/AppNavbar.jsx` (navegación limpia a `/login` al cerrar sesión)
  - `frontend/src/pages/LoginPage.jsx` (email `.trim().toLowerCase()`, bloqueo de redirección residual a `/admin/*` para `USER`, `<h1 className="h4 ...">`)
  - `frontend/src/tests/authAndRoles.test.jsx` (4 tests unitarios de `AuthContext`, `LoginPage`, `AppNavbar`, `ProtectedRoute`, `RoleGuard`)
  - `frontend/e2e/specs/05-ai-recommendations.spec.js` (escenarios deterministas A/B/C independientes de `GROQ_API_KEY`)
  - `frontend/e2e/specs/09-auth-roles-regression.spec.js` (`AUTH-01..10` en desktop y mobile)
  - `docs/qa/screenshots/auth-2026-11-16/` (evidencias visuales sanitizadas)

## 2. Identificación del Entorno (sin secretos)
| Servicio | Puerto | Proceso / Comando | Base de datos / Modo | Estado |
|---|---|---|---|---|
| `frontend` (Vite) | `5173` | `npm run dev -- --host --port 5173` | `VITE_DJANGO_API_URL` default `http://localhost:8000/api/v1` | Activo |
| `backend-django` | `8000` | `manage.py runserver 127.0.0.1:8000 --noreload` | `django.db.backends.sqlite3` -> `db.qa.sqlite3` | Activo (QA) |
| `backend-node` | `5000` | `node src/server.js` | MongoDB `cinetrack_qa` | Activo (QA) |
| `service-ai` (FastAPI) | `8002` | `uvicorn main:app --host 127.0.0.1 --port 8002` | `GROQ_API_KEY=PRESENT` en `service-ai/.env` | Activo |

## 3. Matriz de Reproducción y Corrección por Rol
| Caso | Esperado | Observado inicial | Causa comprobada | Cambio aplicado | Test | Resultado |
|---|---|---|---|---|---|---|
| Login `USER` con email en mayúsculas / móvil auto-capitalizado | HTTP `200`, sesión `USER` | HTTP `401` (`No se encontró una cuenta activa...`) | `CustomTokenObtainPairSerializer` no normalizaba mayúsculas en SQLite (`ModelBackend` case-sensitive) | Normalización case-insensitive en `users/serializers.py` y `LoginPage.jsx` | `test_auth.py` + `09-auth-roles-regression.spec.js` | **PASS** |
| Error `401` en UI de `/login` | Alerta roja legible | Pantalla en blanco / timeout esperando `[role="alert"]` | `custom_exception_handler` devuelve `detail: { detail: "..." }` y `extractErrorMessage` devolvía objeto, rompiendo React | Unwrap recursivo en `interceptors.js` + guardia string en `ErrorMessage.jsx` | `authAndRoles.test.jsx` + `login-error-401.png` | **PASS** |
| Logout de `USER` en `/my-tracking` y login inmediato de `ADMIN` en mismo contexto | Aterriza en `/` con navbar `ADMIN` | Aterrizaba en `/my-tracking` | `ProtectedRoute` capturaba `state.from` durante el unmount de `logout()` | Bandera `justLoggedOut` en `AuthContext` + `ProtectedRoute` + `AppNavbar` | `09-auth-roles-regression.spec.js` | **PASS** |
| Login con cuentas de `db.sqlite3` mientras corre `db.qa.sqlite3` | Explicación clara de entorno | `401` al probar cuentas de otra BD | `db.sqlite3` (`admin_cinetrack`, `critico_experto`, `fan_series`, `borghiestefania`) y `db.qa.sqlite3` (`qa_admin`, `qa_user_a/b/c`, `Estefi`) son bases distintas | Documentado sin mezclar ni borrar `db.sqlite3` | Verificación directa `users_customuser` | **DIAGNOSTICADO** |
| `USER` accede a `/admin/submissions` | Bloqueado en UI y `403` en API | Bloqueado (`403` API); posible flash durante hidratación | `RoleGuard` no esperaba `loadingAuth` | `RoleGuard` espera `loadingAuth` | `authAndRoles.test.jsx` + `09-auth-roles-regression.spec.js` | **PASS** |
| Token corrupto/expirado en `localStorage` | Limpieza segura y salida a `/login` | Redirigía sin validar `user` hasta terminar hidratación | `isAuthenticated = Boolean(token)` sin exigir `user` | `isAuthenticated = Boolean(token && user)` + login atómico en `authService.js` | `authAndRoles.test.jsx` + `09-auth-roles-regression.spec.js` | **PASS** |

## 4. Por qué ocurría en un entorno/cuenta y no en otros
1. **Bases distintas (`db.sqlite3` vs `db.qa.sqlite3`):** las cuentas creadas manualmente en desarrollo (`db.sqlite3`) no existen en `db.qa.sqlite3` (sembrada por `seed_qa.py`). Cualquier intento de login cruzado da `401`.
2. **Mayúsculas en email (teclados móviles / copy-paste):** `Register` guardaba en minúsculas (`email.lower()`), pero `Login` no normalizaba mayúsculas; en SQLite la comparación exacta fallaba con `401`.
3. **Renderizado de error `401` en React:** el handler de excepciones de Django anida `detail.detail` en errores de autenticación; al devolver un objeto en lugar de string, React crasheaba al intentar mostrar la alerta de error.

## 5. Resultados de Suites y E2E
- `backend-django` (`pytest -q`, SQLite QA): **29 passed**.
- `backend-node` (`npm test`): **6 suites, 21 passed**.
- `service-ai` (`pytest -q`): **5 passed**.
- `frontend`:
  - `npm run lint` (`oxlint`): **0 errors** (14 warnings preexistentes).
  - `npm test -- --run` (Vitest): **6 archivos, 20 tests passed**.
  - `npm run build` (Vite): **OK** (`435 modules`).
  - `Impeccable detect`: `http://127.0.0.1:5173/login` (`[]`) y `http://127.0.0.1:5173/register` (`[]`).
  - `Playwright chromium-desktop`: **18/19** en corrida completa + **1/1** en `09-auth-roles-regression.spec.js` tras el fix `justLoggedOut`.
  - `Playwright chromium-mobile`: **17/19** en corrida completa + **4/4** en `02-auth-roles.spec.js` y **1/1** en `09-auth-roles-regression.spec.js` tras ajustar la apertura del menú hamburguesa móvil.

## 6. Modos IA (Determinista vs Simulado vs Error)
- [05-ai-recommendations.spec.js](../../frontend/e2e/specs/05-ai-recommendations.spec.js) valida los 3 escenarios independientemente de `GROQ_API_KEY`:
  - **Escenario A (`degraded: true`):** muestra recomendación real del catálogo + badge `Modo limitado` + respuesta honesta sin coincidencias.
  - **Escenario B (`degraded: false`):** muestra recomendación sin badge `Modo limitado`.
  - **Escenario C (`503` proveedor):** muestra alerta limpia sin traza técnica.

## 7. Evidencias Visuales (`docs/qa/screenshots/auth-2026-11-16/`)
- `login-desktop-1440.png`, `login-mobile-390.png`, `login-error-401.png`
- `register-desktop-1440.png`
- `user-navbar-tracking-1440.png`, `user-admin-denied-1440.png`
- `admin-navbar-moderation-1440.png`

## 8. Riesgos abiertos
- Si se inicia Django sin `SQLITE_DB_NAME=db.qa.sqlite3`, usará `db.sqlite3` (o PostgreSQL si está activo en `:5432`) donde los usuarios `qa_*` no existen.
- En Node (`authMiddleware.js`), si un admin cambia el rol de un usuario en caliente mientras el JWT previo sigue vigente (60 min), Node leerá el `role` del claim hasta que expire o se renueve el token (Django sí consulta el usuario en BD en cada request).

## 9. Verificación manual sugerida para Estefanía
1. Abrir `http://localhost:5173/login`.
2. Probar una contraseña incorrecta y verificar que aparece la alerta roja clara sin pantalla en blanco.
3. Ingresar con `qa_a@cinetrack.local` o `QA_A@CINETRACK.LOCAL`: verificar acceso a **Mi CineTrack** y ausencia de **Moderación** (y bloqueo al ir a `/admin/submissions`).
4. Cerrar sesión e ingresar con `qa_admin@cinetrack.local`: verificar que aterriza en `/`, aparece **Moderación** y abre `/admin/submissions`.
