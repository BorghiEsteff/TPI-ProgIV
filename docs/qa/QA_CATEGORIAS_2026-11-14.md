# QA Categorías / Géneros en Propuestas y Catálogo — CineTrack (`2026-11-14`)

## 1. Alcance Implementado (P0)
- **Modelo y Migración (`backend-django/catalog/models.py`, `catalog/migrations/0004_mediasubmission_genres.py`):**
  - Agregada relación `MediaSubmission.genres = ManyToManyField(Genre, blank=True, related_name="submissions")`.
  - Seed idempotente `ensure_base_genres()` con los 16 géneros base: `Acción`, `Drama`, `Ciencia Ficción`, `Fantasía`, `Thriller`, `Romance`, `Comedia`, `Terror`, `Aventura`, `Animación`, `Documental`, `Misterio`, `Crimen`, `Histórico`, `Infantil/Familiar`, `Musical`.
- **Validación y Serialización (`backend-django/catalog/serializers.py`, `catalog/views.py`):**
  - `POST /api/v1/submissions/` (JSON y `multipart/form-data` con `poster_file`) exige entre **1 y 5** géneros válidos y deduplica repetidos.
  - `PATCH /api/v1/submissions/{id}/` permite actualizar `genres` mientras la propuesta está `PENDING`.
  - `AdminSubmissionSerializer` y `MediaSubmissionMineSerializer` exponen `genres: [{id, name}]` y `effective_poster_url` normalizado a URL absoluta.
  - `AdminSubmissionViewSet.publish()` hereda `submission.genres` si el admin no envía `genres`, valida estrictamente `1..5` IDs reales si los envía (`400` en caso contrario), y exige `confirm_new=True` ante duplicados fuertes (`409 POSSIBLE_DUPLICATE_EXISTS`).
  - `AdminSubmissionViewSet.merge()` conserva intactos los géneros de la obra canónica salvo reemplazo explícito del admin.
  - `GenreViewSet` bloquea duplicados normalizados por mayúsculas o acentos (`"accion"` vs `"Acción"`).
- **GraphQL (`backend-django/catalog/schema.py`):**
  - `allMediaItems` soporta `genreId: Int` y `search: String`, manteniendo ocultas las obras con `is_active=False`.
- **Frontend (`frontend/src/`):**
  - `GenreMultiSelect.jsx`: selector accesible con buscador, chips, contador `X/5 seleccionados`, mínimo 1, máximo 5, estados loading/error/retry y objetivos táctiles `>= 44px`.
  - Integrado en `SubmissionForm.jsx` (`/new-entry`), `MySubmissionsPage.jsx` (`/my-submissions` para editar propuestas `PENDING`), `SubmissionQueue.jsx` (`/admin/submissions`), y `AdminMediaEditPage.jsx` (`/admin/media/:id`).
  - `MediaFilterBar.jsx` y `CatalogPage.jsx` habilitan filtrado por género también en modo GraphQL (`genreId`).
