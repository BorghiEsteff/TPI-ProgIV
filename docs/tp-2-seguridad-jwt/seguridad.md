# TP 2: Matriz de Seguridad y Control de Acceso (RBAC)

| Recurso / Endpoint | Visitante | `USER` | `ADMIN` |
| :--- | :---: | :---: | :---: |
| `GET /api/v1/media/`, `GET /api/v1/genres/` | Permitido (`is_active=True`) | Permitido | Permitido |
| `POST/PATCH/DELETE /api/v1/media/` y `/genres/` | `401` | `403` | Permitido |
| `GET/POST/PATCH/DELETE /api/v1/tracking/` | `401` | Solo propio (`user=request.user`) | Solo propio |
| `POST/GET/PATCH /api/v1/submissions/` | `401` | Solo propias | Solo propias |
| `GET/POST /api/v1/admin/submissions/` | `401` | `403` | Permitido (publicar, fusionar, rechazar) |
| `GET/PUT/DELETE /api/v1/personal-notes/*` (Node) | `401` | Solo propias (`userId` + ownership Django) | Solo propias (sin acceso a notas ajenas) |
| `POST /api/v1/recommendations` (Node) | `401` | Permitido (rate limit por usuario) | Permitido |
| `GET/POST /api/v1/reviews` (Node legado) | `410 Gone` | `410 Gone` | `410 Gone` |

* Validación de portadas y anti-SSRF/SVG en `backend-django/catalog/utils.py`.
