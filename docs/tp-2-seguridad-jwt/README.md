# TP 2: Seguridad, Autenticación JWT y Matriz RBAC

## Roles vigentes en `main`
- **`Visitante` (no autenticado):** solo lectura sobre catálogo público (`is_active=True`).
- **`USER`:** diario privado (`UserProgress`), notas privadas (`PersonalNote`), propuestas (`MediaSubmission`) y recomendaciones IA (`/api/v1/recommendations`).
- **`ADMIN`:** todo lo de `USER` + moderación de propuestas (`/api/v1/admin/submissions/`) y gestión de catálogo/géneros. El antiguo rol `CRITIC` fue migrado a `USER` (`users/migrations/0002_migrate_critic_to_user.py`).

Ver detalles de JWT y permisos en [contrato-jwt.md](contrato-jwt.md) y [seguridad.md](seguridad.md).
