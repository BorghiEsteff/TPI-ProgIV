# TP 1: Contrato de Integración HTTP entre Node.js y Django

## 1. Contexto y Responsabilidades Arquitectónicas

En la arquitectura políglota de **CineTrack**:
- **Django (PostgreSQL 16):** Es la **fuente única de verdad (Single Source of Truth)** para el catálogo de obras (`MediaItem`), episodios, temporadas y usuarios.
- **Node.js (MongoDB 7):** Gestiona de forma descentralizada las **reseñas (`reviews`) y el árbol de comentarios**.

Para garantizar la integridad referencial distribuida, el servicio Node.js **debe validar la existencia previa y el estado activo del `media_id`** antes de persistir cualquier reseña en MongoDB.

---

## 2. Especificación del Endpoint Canónico

### `GET /api/v1/media/{id}/`
Verifica la existencia y obtiene el detalle consolidado de un contenido multimedia.

- **Método:** `GET`
- **URL Base:** `http://localhost:8000/api/v1/media/{id}/` (o `http://django-backend:8000/api/v1/media/{id}/` en Docker)
- **Headers Requeridos:**
  - `Accept: application/json`

---

## 3. Esquemas de Respuesta

### Caso de Éxito: 200 OK
El contenido existe y está disponible en el catálogo relacional.

```json
{
  "id": 1,
  "title": "Stranger Things",
  "media_type": "SERIE",
  "release_date": "2016-07-15",
  "producer": "Netflix / 21 Laps Entertainment",
  "poster_image": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
  "synopsis": "A raíz de la desaparición de un niño, un pueblo desvela un misterio relacionado con experimentos secretos.",
  "is_active": true,
  "genres": [
    { "id": 1, "name": "Ciencia Ficción" },
    { "id": 2, "name": "Drama" },
    { "id": 4, "name": "Suspenso" }
  ],
  "seasons": [
    {
      "id": 1,
      "media_item": 1,
      "season_number": 1,
      "episode_count": 8,
      "episodes": [
        {
          "id": 1,
          "season": 1,
          "episode_number": 1,
          "title": "Capítulo uno: La desaparición de Will Byers",
          "duration_minutes": 48
        }
      ]
    }
  ]
}
```

### Caso de Error: 404 Not Found (Estandarizado por `core/exceptions.py`)
Si el ID no existe o no corresponde a una obra registrada.

```json
{
  "status_code": 404,
  "error": "Http404",
  "detail": {
    "detail": "No MediaItem matches the given query."
  }
}
```

---

## 4. Directivas de Integración para el Servicio Node.js

Para el desarrollo del módulo de reseñas en Express/Node.js a cargo de Ari:

1. **Validación Previa Obligatoria:**
   - Antes de ejecutar `Review.create({ media_id, ... })`, realizar una llamada HTTP `GET` a `/api/v1/media/${media_id}/`.
   - Si la respuesta es `404`, responder al cliente con `400 Bad Request` indicando que el contenido referenciado no existe en el catálogo general.

2. **Timeout Estricto:**
   - Toda solicitud HTTP hacia Django debe configurarse con un timeout máximo de **2500 ms** (utilizando `axios`, `fetch` con `AbortSignal.timeout(2500)` o cliente HTTP equivalente).

3. **Estrategia ante Indisponibilidad (Fallback / Modo Degradado):**
   - Si Django retorna error `5xx` o la llamada excede el timeout (2500 ms):
     - **No bloquear el servidor Node.**
     - Registrar un log de advertencia estructurado (`[WARN] Django catalog service unavailable for media validation`).
     - Responder con código `503 Service Unavailable` o incluir la cabecera HTTP `X-Degraded-Mode: true` informando que el servicio de catálogo temporalmente no puede validar la existencia de títulos.

4. **Variables de Entorno en `backend-node/.env`:**
   ```env
   DJANGO_API_URL=http://localhost:8000/api/v1
   DJANGO_TIMEOUT_MS=2500
   ```
