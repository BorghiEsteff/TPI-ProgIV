# TP 1: Persistencia Dual (SQL + MongoDB) y Dominio CineTrack

## Alcance vigente en `main`
1. **Persistencia Relacional (`backend-django/` + PostgreSQL 16 / SQLite QA):**
   - Catálogo unificado (`Genre`, `MediaItem`, `Season`, `Episode`), propuestas comunitarias y moderación (`MediaSubmission`) y diario privado (`UserProgress`).
2. **Persistencia Documental (`backend-node/` + MongoDB 7):**
   - Notas personales privadas y calificación `1..5` (`PersonalNote`, colección `personalnotes`), aisladas por `(userId, mediaId)` en reemplazo de las reseñas públicas iniciales.

Ver el detalle actualizado de modelos e integración en [modelado.md](modelado.md), [integracion.md](integracion.md) y [ARQUITECTURA_AS_BUILT.md](../ARQUITECTURA_AS_BUILT.md).
