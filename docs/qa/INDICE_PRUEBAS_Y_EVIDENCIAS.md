# Índice de Pruebas, Reportes Históricos y Evidencias QA

Este índice clasifica las evidencias del repositorio en **validación vigente**, **pruebas condicionadas al entorno** y **reportes históricos**.

---

## 1. Validación vigente (estado actual en `main`)
* **[ACTA_VALIDACION_FINAL.md](ACTA_VALIDACION_FINAL.md):** acta consolidada incluyendo el cierre pre-defensa **26/11/2026 (`158/158`)**: Django **41/41**, FastAPI **9/9**, Node.js **25/25**, Vitest **29/29** (`oxlint` 0 errores + `vite build` OK), Playwright **27/27 desktop** + **27/27 mobile** sobre `db.qa.sqlite3` y `cinetrack_qa` aisladas (conservando el registro histórico base del 19–20/11/2026).
* **[QA_COMMANDS.md](QA_COMMANDS.md)** y **[QA_REPRODUCCION_FINAL.md](QA_REPRODUCCION_FINAL.md):** instructivos vigentes para levantar `db.qa.sqlite3` (`python seed_qa.py` en UTF-8), `cinetrack_qa` y el proxy único `proxy/local-proxy.mjs` (`:8088` / `:8188`).

## 2. Pruebas condicionadas al entorno
* **PostgreSQL 18 local en Windows:** bloqueado por discrepancia de contraseña local para `cinetrack_user`; validado en su lugar contra `postgres:16-alpine` en Docker (`ACTA_VALIDACION_FINAL.md`).
* **Tailscale Serve multi-dispositivo:** documentado y validado vía proxy local `127.0.0.1:8088` en la rama `feat/tailscale-serve-proxy` (`QA_TAILSCALE_MULTIDISPOSITIVO.md`).

## 3. Reportes históricos (referencia de fases previas, no usar como totales finales)
* [QA_CHAT_FLOTANTE_IA_CLAQUETA_2026-11-19.md](QA_CHAT_FLOTANTE_IA_CLAQUETA_2026-11-19.md) — verificación de integración de la claqueta IA (19/11/2026).
* [QA_MATRIX.md](QA_MATRIX.md) — matriz E2E del corte 16/16 (13–14/11/2026).
* [QA_AUTENTICACION_ROLES_CIERRE_2026-11-16.md](QA_AUTENTICACION_ROLES_CIERRE_2026-11-16.md), [QA_REFINAMIENTO_FILTROS_POSTERS_2026-11-16.md](QA_REFINAMIENTO_FILTROS_POSTERS_2026-11-16.md), [QA_CATEGORIAS_2026-11-14.md](QA_CATEGORIAS_2026-11-14.md), [QA_IMPECCABLE_VISUAL.md](QA_IMPECCABLE_VISUAL.md).
* [QA_BASELINE.md](QA_BASELINE.md), [QA_BUGS_FIXED.md](QA_BUGS_FIXED.md), [QA_CIERRE_PRE_PR.md](QA_CIERRE_PRE_PR.md), [QA_FINAL_REPORT.md](QA_FINAL_REPORT.md), [QA_GIT_PREPARACION.md](QA_GIT_PREPARACION.md), [QA_REPORTE_POST_GITHUB.md](QA_REPORTE_POST_GITHUB.md), [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md).
