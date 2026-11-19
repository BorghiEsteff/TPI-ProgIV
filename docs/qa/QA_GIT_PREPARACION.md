# CineTrack — Preparación para Git y PR (Solo Revisión Humana)

> **Nota:** No se ejecutó `git add`, `git commit` ni `git push`.

## Checklist Pre-Commit
- [x] `git diff --check` sin errores de formato.
- [x] `.gitignore` excluye `.env`, `*.env`, `venv/`, `node_modules/`, `db.sqlite3`, `db.qa.sqlite3`, `backups/`, `frontend/playwright-report/`, `frontend/test-results/`.
- [x] Sin secretos ni credenciales en archivos trackeados o untracked.
- [x] `backend-django/db.sqlite3` y `backups/db.sqlite3.baseline.bak` intactos.
- [ ] **Pendiente antes de merge a `main`:** ejecutar validación sobre PostgreSQL real.

## Comandos de Revisión (No modifican Git)
```powershell
git status --short
git diff --stat
git diff --check
```

## Recomendación de División de PR
Dado que el diff abarca `36` archivos modificados/eliminados y nuevos módulos por servicio, se recomienda organizar en **2 commits/PRs lógicos** o **1 PR con commits atómicos**:
1. **Commit 1 — Backend & Modelo de Datos:** migraciones `0002`/`0003`, `MediaSubmission`, `UserProgress`, seguridad P1, CORS/GraphQL/Notes en Node y recomendador en `service-ai`.
2. **Commit 2 — Frontend, Playwright E2E y Documentación QA:** vistas nuevas/corregidas (`MyTrackingPage`, `MediaCard`, `LoginPage`, etc.), suite `frontend/e2e/` y reportes `docs/qa/`.
