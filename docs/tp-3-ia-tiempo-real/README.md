# TP 3: Inteligencia Artificial Local, Tiempo Real y Optimización

**Asignatura:** Programación IV (Plan 2024) - UTN FRRE (Extensión Áulica Goya)  
**Proyecto:** CineTrack  

---

## 1. Objetivos del Trabajo Práctico
Integrar un microservicio de Inteligencia Artificial local para análisis predictivo/semántico, implementar salas de presencia en tiempo real con WebSockets, y documentar optimizaciones de consultas de base de datos con planes de ejecución.

---

## 2. Requisitos y Entregables

### 2.1 Microservicio de IA Determinista (FastAPI + Ollama)
- Motor de inferencia local mediante Ollama ejecutando el modelo ultraliviano `llama3.2:1b`.
- Endpoints estructurados con validación estricta vía Pydantic v2:
  - `POST /ai/review-guard`: Detección automática de spoilers y clasificación de sentimiento (`contains_spoiler`, `confidence`, `sentiment`).
  - `POST /ai/recommend`: Generación de recomendaciones personalizadas basadas en historial y preferencias.
- Control de timeout (4000 ms) y fallback de contingencia.

### 2.2 Tiempo Real con Socket.IO (`WatchRooms`)
- Implementación de salas por contenido/episodio en el backend de Node.js.
- Funcionalidades:
  - Presencia activa de usuarios conectados visualizando el mismo título.
  - Eventos de sincronización y notificaciones en vivo.
  - Autenticación del handshake de Socket.IO con el token JWT.

### 2.3 Optimización y Análisis de Consultas (`optimizacion.md`)
- Análisis con `EXPLAIN ANALYZE` en PostgreSQL para consultas críticas de tracking y catálogo.
- Creación de índices compuestos (por ejemplo: `(user_id, media_item_id)`, `(season_id, episode_number)`).
- Documento `docs/tp-3-ia-tiempo-real/optimizacion.md` con benchmarks de antes y después de indexar.
