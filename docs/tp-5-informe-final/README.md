# TP 5: Informe Final de Cierre y Guion de Defensa Oral

**Asignatura:** Programación IV (Plan 2024) - UTN FRRE (Extensión Áulica Goya)  
**Proyecto:** CineTrack  

---

## 1. Objetivos del Trabajo Práctico
Elaborar el informe técnico final integral (documento PDF de 20 a 35 páginas) y preparar el guion y presentación para la defensa oral presencial de 8 minutos.

---

## 2. Estructura Obligatoria del Informe Final (20 a 35 páginas)

### Sección 1: Introducción y Contexto del Problema
- Planteamiento del problema, objetivos generales y específicos.
- Perfiles de usuario y propuesta de valor de CineTrack.

### Sección 2: Arquitectura del Sistema y Persistencia Políglota
- Diagramas C4 (Contexto, Contenedores y Componentes).
- Justificación detallada de bounded contexts: PostgreSQL (transaccional ACID) vs MongoDB (social/documental).
- Diagrama Entidad-Relación y Esquemas de Colecciones.

### Sección 3: Seguridad, Autenticación y Autorización
- Mecanismo de emisión y validación descentralizada de tokens JWT.
- Matriz RBAC implementada y mitigación de riesgos OWASP Top 10.

### Sección 4: Inteligencia Artificial Local y Tiempo Real
- Arquitectura del microservicio FastAPI con modelo local Ollama (`llama3.2:1b`).
- Esquemas de validación Pydantic v2 y estrategia de fallback.
- Diseño de salas en tiempo real con Socket.IO (`WatchRooms`).

### Sección 5: Optimización de Base de Datos y Rendimiento
- Informes de `EXPLAIN ANALYZE` en PostgreSQL antes y después de indexar.
- Análisis de impacto en latencia y throughput bajo carga.

### Sección 6: Conclusiones, Lecciones Aprendidas y Trabajo Futuro
- Evaluación de resultados frente a los objetivos iniciales.
- Retos superados en integración políglota y recomendaciones para evolución del producto.

---

## 3. Guion de Defensa Oral (8 Minutos)

- **Minuto 1:** Presentación del equipo, problema y demo conceptual de CineTrack.
- **Minuto 2-3:** Justificación de la arquitectura políglota (Django + Postgres / Node + Mongo) y demostración de integridad referencial.
- **Minuto 4:** Demostración en vivo de emisión y validación cruzada de JWT.
- **Minuto 5:** Demostración del microservicio de IA local (clasificación de spoilers) y presencia Socket.IO.
- **Minuto 6:** Explicación técnica de optimización con `EXPLAIN ANALYZE`.
- **Minuto 7:** Demostración de CI/CD en GitHub Actions y orquestación con Docker Compose.
- **Minuto 8:** Conclusiones, preguntas del jurado y cierre.
