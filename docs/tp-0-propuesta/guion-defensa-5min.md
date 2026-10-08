# Guion para la Defensa Oral de 5 Minutos (TP 0)

- **Minuto 1: El Problema y la Solución**
  * Presentar CineTrack: tracker para series y películas enfocado en la precisión temporal (temporadas, capítulos y segundo exacto) y la comunidad sin spoilers.
  * Mencionar a los usuarios: espectadores casuales, cinéfilos y moderadores.

- **Minuto 2: Bounded Contexts y Persistencia Políglota**
  * Explicar por qué Django + PostgreSQL maneja el catálogo y el tracking temporal (transacciones ACID y modelo relacional estricto).
  * Explicar por qué Node + MongoDB maneja las reseñas y respuestas anidadas (documentos embebidos y alta tasa de lectura social).

- **Minuto 3: La IA y el Tiempo Real**
  * Justificar el microservicio FastAPI con Ollama: análisis de spoilers antes de guardar la reseña en MongoDB, con esquemas Pydantic v2 y control de degradación.
  * Justificar Socket.IO: salas en vivo (`WatchRooms`) con presencia de espectadores concurrentes.

- **Minuto 4: Fuera de Alcance Vinculante**
  * Enfatizar con firmeza lo que NO hace el sistema para no caer en sobrecarga: no hay streaming de video, no hay pagos ni scraping de plataformas externas.

- **Minuto 5: Demostración del Repositorio y Cierre**
  * Mostrar el monorepo estructurado, entornos listos, `.gitignore` y cero secretos en Git.
