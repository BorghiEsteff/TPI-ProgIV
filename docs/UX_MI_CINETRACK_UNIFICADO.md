# UX y Arquitectura de Mi CineTrack Unificado

## 1. Navegación Simplificada
- Barra superior para usuario autenticado (`AppNavbar.jsx`):
  - `CineTrack | Catálogo | Mi CineTrack [Usuario] [Cerrar Sesión]` (y `Moderación` para rol `ADMIN`).
- Acceso único al asistente de recomendaciones IA: lanzador flotante de claqueta (`FloatingRecommendationChat`). `/recommendations` redirige a `/`.

## 2. Subflujos Integrados en `/my-tracking` (alias `/my-cinetrack`)
- **`Mis obras` (`view=tracking`, por defecto)**:
  - Filtros de estado (`TODOS`, `PENDIENTE`, `VIENDO`, `VISTO`, `ABANDONADO`, `FAVORITOS`), búsqueda global en el diario y paginación.
  - Panel de reconciliaciones pendientes cuando existen conflictos.
  - Tarjetas compactas con resumen visible (plataforma, capítulo actual en series, tiempo acumulado, fechas) y editor expandible único al presionar **Editar progreso**.
  - Notas privadas (`PersonalNoteEditor`: 1-5 estrellas + comentario privado hasta 2000 caracteres) con guardado independiente (`Guardar nota privada`).
- **`Mis propuestas` (`view=proposals`)**:
  - Lista de obras propuestas por el usuario con estado (`PENDING`, `PUBLISHED`, `MERGED`, `REJECTED`), edición de categorías (1-5) en estado `PENDING`, motivo de rechazo y enlace a la ficha publicada.
- **`Agregar obra` (`view=add`)**:
  - **Camino 1**: buscador rápido del catálogo público publicado para agregar una obra existente al diario sin duplicar propuestas.
  - **Camino 2**: formulario `SubmissionForm` para proponer una obra nueva (con detección previa de duplicados y alta inmediata en el diario).
- Compatibilidad de rutas heredadas: `/new-entry` redirige a `/my-tracking?view=add` y `/my-submissions` redirige a `/my-tracking?view=proposals`.

## 3. Editor Único de Progreso (`TrackingProgressEditor`)
- Formulario controlado único por tarjeta con:
  - `watch_platform` (texto editable)
  - `status` (`PENDIENTE`, `VIENDO`, `VISTO` obra terminada, `ABANDONADO`)
  - `season` y `episode` (solo en obras `SERIE`; ocultos en `PELICULA`)
  - `hours` (`>= 0`) y `minutes` (`0..59`) como posición de pausa del capítulo o película actual
  - Switch único de favorito y botones **Guardar progreso**, **Cancelar** y **Quitar del diario**.
- **Invariantes de tiempo, estado e historial**:
  - `status = VISTO` significa **obra terminada** (no "capítulo visto"). Cambiar temporada, episodio, posición o plataforma mientras la obra ya está en `VISTO` nunca marca implícitamente el nuevo episodio en `episode_history`.
  - Si el usuario edita solo plataforma/estado/favorito sin modificar horas/minutos ni capítulo, el payload omite `current_seconds` para preservar los segundos exactos previos (ej. `01:24:35` = `5075s`).
  - Al cambiar de temporada o episodio en una serie, el editor prepara `00:00` visualmente sin autoguardar en `onBlur`; solo persiste al confirmar con **Guardar progreso**.
  - En backend (`UserProgressSerializer`), revertir de `VISTO` a `VIENDO`, `PENDIENTE` o `ABANDONADO` limpia `finished_at` (`None`) sin borrar `episode_history` preexistente.
