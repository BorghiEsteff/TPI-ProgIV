# TP 1: Modelado de Datos Vigente (`main`)

## 1. Modelo Relacional (`backend-django`)
- **`CustomUser` (`users/models.py`):** `email` (login), `username`, `role` (`USER` | `ADMIN`), `is_active`.
- **`Genre` (`catalog/models.py`):** nombre único (`unique=True`).
- **`MediaItem` (`catalog/models.py`):** `title`, `normalized_title`, `media_type` (`PELICULA` | `SERIE`), `release_date`, `release_year`, `country_of_origin`, `producer`, `poster_image`, `synopsis`, `is_active`, `genres` (M2M). Índices: `media_type_active_idx`, `media_date_title_idx`, `media_norm_type_idx`.
- **`Season` y `Episode` (`catalog/models.py`):** jerarquía para `SERIE` (`unique_together` por número).
- **`MediaSubmission` (`catalog/models.py`, migraciones `0003`–`0004`):** `submitted_by`, `title`, `normalized_title`, `media_type`, `poster_url`, `poster_file`, `submitted_platform`, `release_year`, `country_of_origin`, `genres` (M2M), `status` (`PENDING` | `PUBLISHED` | `MERGED` | `REJECTED`), `resolved_media`, `rejection_reason`, `resolved_by`.
- **`UserProgress` (`tracking/models.py`, migraciones `0001`–`0004`):** `user`, `media_item`, `status` (`PENDIENTE` | `VIENDO` | `VISTO` | `ABANDONADO`), `is_favorite`, `watch_platform`, `current_season`, `current_episode`, `current_seconds`, `episode_history`.

## 2. Modelo Documental (`backend-node` / MongoDB 7)
- **`PersonalNote` (`backend-node/src/models/PersonalNote.js`, colección `personalnotes`):** `userId`, `mediaId`, `rating` (`1..5`), `notes` (máx. 2000 chars), timestamps e índice único `{ userId: 1, mediaId: 1 }`.
