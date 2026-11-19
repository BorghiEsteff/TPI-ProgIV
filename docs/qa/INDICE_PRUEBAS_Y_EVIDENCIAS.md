# Índice de Pruebas, Reportes Históricos y Evidencias QA

Este índice separa la **validación vigente sobre el estado final** de los **reportes históricos** generados durante hitos previos de desarrollo.

---

## 1. Validación vigente (estado actual)

* **[ACTA_VALIDACION_FINAL.md](ACTA_VALIDACION_FINAL.md):** acta consolidada con fecha, ambiente, comandos exactos, resultados observados (Pytest Django, Pytest FastAPI, Jest Node, Vitest, Vite Build, `benchmark_queries`, prueba live Groq y Playwright E2E) y bloqueos externos reales (PostgreSQL local sin credenciales coincidentes y Docker Desktop detenido).

---

## 2. Reportes históricos (referencia de hitos previos)

Los siguientes documentos corresponden a cortes anteriores al cierre final y deben leerse en contexto de su fecha:

* [QA_CHAT_FLOTANTE_IA_CLAQUETA_2026-11-19.md](QA_CHAT_FLOTANTE_IA_CLAQUETA_2026-11-19.md) — diseño y verificación inicial del chat flotante con claqueta (19/11/2026).
* [QA_AUTENTICACION_ROLES_CIERRE_2026-11-16.md](QA_AUTENTICACION_ROLES_CIERRE_2026-11-16.md) — cierre de autenticación y roles (16/11/2026).
* [QA_REFINAMIENTO_FILTROS_POSTERS_2026-11-16.md](QA_REFINAMIENTO_FILTROS_POSTERS_2026-11-16.md) — refinamiento de filtros y posters (16/11/2026).
* [QA_CATEGORIAS_2026-11-14.md](QA_CATEGORIAS_2026-11-14.md) — validación de categorías y géneros (14/11/2026).
* [QA_IMPECCABLE_VISUAL.md](QA_IMPECCABLE_VISUAL.md) — auditoría visual responsiva (capturas en `screenshots/baseline/` y `screenshots/after/`).
* [QA_MATRIX.md](QA_MATRIX.md), [QA_CIERRE_PRE_PR.md](QA_CIERRE_PRE_PR.md), [QA_FINAL_REPORT.md](QA_FINAL_REPORT.md), [QA_BASELINE.md](QA_BASELINE.md), [QA_BUGS_FIXED.md](QA_BUGS_FIXED.md), [QA_REPORTE_POST_GITHUB.md](QA_REPORTE_POST_GITHUB.md), [QA_REPRODUCCION_FINAL.md](QA_REPRODUCCION_FINAL.md), [QA_GIT_PREPARACION.md](QA_GIT_PREPARACION.md) — registros históricos del proceso QA.
* [QA_COMMANDS.md](QA_COMMANDS.md) — guía vigente de comandos para inicializar `db.qa.sqlite3` y `cinetrack_qa` de forma aislada.
