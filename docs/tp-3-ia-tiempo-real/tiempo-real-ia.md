# TP 3: Especificación de WatchRooms (Socket.IO) e Integración con Microservicio IA

## 1. Módulo de Tiempo Real: WatchRooms (`Socket.IO 4`)

El backend de Node.js implementa salas de presencia compartida para sincronización entre espectadores de una misma película o serie:

### 1.1 Autenticación de Conexión
- Se evalúa el token JWT en el evento handshake (`socket.handshake.auth.token` o cabecera `Authorization`).
- Si el token es válido, se mapea el usuario con su `id`, `username` y `role`.
- Si el usuario no envía token, se asigna una identidad efímera con rol `GUEST` para permitir visualización en modo invitado.

### 1.2 Eventos de WebSocket
| Evento (Inbound) | Payload | Acción del Servidor | Evento Emitido (Outbound) |
|---|---|---|---|
| `join_watch_room` | `{ roomId }` | Asocia el socket a la sala e inicializa el mapa de presencia | `room_presence_sync` (al emisor), `user_joined_room` (a la sala) |
| `sync_playback_state` | `{ state, currentTime }` | Difunde el estado de reproducción (`PLAYING`, `PAUSED`, `SEEKING`) | `playback_state_updated` (a la sala) |
| `send_room_message` | `{ message }` | Envía mensaje de chat en vivo con timestamp y autor | `new_room_message` (broadcast a la sala) |
| `leave_watch_room` / `disconnect` | - | Remueve al usuario del mapa de presencia y notifica | `user_left_room` (a la sala) |

---

## 2. Cliente de IA: Detección Automática de Spoilers (`aiService.js`)

- **Target:** Microservicio FastAPI (`http://localhost:8002/ai/review-guard`) con Ollama (`llama3.2:1b`).
- **Timeout Estricto:** 4000 ms (`AI_TIMEOUT_MS`).
- **Resiliencia & Fallback:** Si FastAPI no responde o agota el timeout, la función activa el modo degradado retornando `{ containsSpoiler: false, degraded: true, sentiment: 'UNKNOWN' }`, asegurando que una caída del modelo de lenguaje no impida al usuario enviar su reseña.
