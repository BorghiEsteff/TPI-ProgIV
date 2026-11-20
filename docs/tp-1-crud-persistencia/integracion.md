# TP 1: Contrato de Integración Django <-> Node.js <-> FastAPI

## 1. Flujo vigente en `main`

1. **Notas privadas (`PUT/GET/DELETE /api/v1/personal-notes/:trackingEntryId`):**
   - `backend-node` verifica JWT (`user_id`), valida propiedad de la entrada en Django (`GET /api/v1/tracking/verify-ownership/?tracking_entry_id=...`) y persiste `PersonalNote` en MongoDB (`{ userId, mediaId }`).
   - Ante fallo de autenticación responde `401`; si la entrada pertenece a otro usuario responde `403`; si Django no responde, falla de forma cerrada (`503`) sin exponer datos ajenos.
2. **Recomendaciones IA (`POST /api/v1/recommendations`):**
   - `backend-node` consulta el catálogo publicado (`GET /api/v1/media/?is_active=true` en Django), envía `prompt`, `catalog` e `history` a `service-ai` (`POST /ai/recommend`) y revalida que los IDs devueltos existan en el catálogo activo.
   - Si `service-ai` activa fallback determinista, propaga `degraded: true` y cabecera `X-Degraded-AI: true`.
3. **Endpoints retirados:**
   - `/api/v1/reviews` responde `410 Gone`.
