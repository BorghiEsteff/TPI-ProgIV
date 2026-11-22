# Wireframes Funcionales — CineTracker / CineTrack

Esquemas estructurales de baja fidelidad correspondientes a las vistas activas en `frontend/src/App.jsx` (alineados a `DESIGN.md` y `PRODUCT.md`).

---

## 1. Catálogo Público (`/`) y Ficha Técnica (`/media/:id`)

```text
+-------------------------------------------------------------------+
| [CineTrack]  Catálogo   Mi Diario   Propuestas   [Login/Usuario]  |
+-------------------------------------------------------------------+
| [Buscar título...]  [Tipo: Todos|Película|Serie]  [Género] [Limpiar]|
+-------------------------------------------------------------------+
|  +-------------+   +-------------+   +-------------+              |
|  | [Poster 2:3]|   | [Poster 2:3]|   | [Poster 2:3]|              |
|  | Título (Año)|   | Título (Año)|   | Título (Año)|              |
|  | Géneros     |   | Géneros     |   | Géneros     |              |
|  | [Ver ficha] |   | [Ver ficha] |   | [Ver ficha] |              |
|  +-------------+   +-------------+   +-------------+              |
|                  < Anterior  [Página 1 / N]  Siguiente >          |
+-------------------------------------------------------------------+
                                                       [Claqueta IA]
```

* En `/media/:id` (autenticado): ficha completa + acceso directo para agregar a **Mi CineTrack** (`PENDIENTE` idempotente) o abrir el registro existente en `/my-tracking`, además de la consulta de disponibilidad y metadatos públicos.

---

## 2. Mi CineTrack Unificado (`/my-tracking`, alias `/my-cinetrack`)

```text
+-------------------------------------------------------------------+
| Mi CineTrack  [Mis obras]  [Mis propuestas]  [+ Agregar obra]     |
| [TODOS | PENDIENTE | VIENDO | VISTO | ABANDONADO | FAVORITOS]     |
| [Buscar en mi diario...]                                          |
+-------------------------------------------------------------------+
| Tarjeta compacta: Portada | Título | Plataforma | T/E | Posición  |
|   -> [Editar progreso] (TrackingProgressEditor único: plataforma, |
|      estado, Temp./Ep. en series, horas+min, Guardar / Cancelar)  |
|   -> [Valoración privada 1..5 estrellas + Comentario privado]     |
+-------------------------------------------------------------------+
```

* En `?view=add` (y redirección desde `/new-entry`): buscador rápido en el catálogo publicado para agregar sin duplicados, más el formulario `SubmissionForm` (título, tipo `PELICULA`/`SERIE`, plataforma, año, país, 1–5 géneros y URL/archivo de portada validado anti-SSRF/SVG).
* En `?view=proposals` (y redirección desde `/my-submissions`): listado propio con estados `PENDING` (categorías editables), `PUBLISHED`, `MERGED` (con conciliación si aplica) o `REJECTED` (con motivo).

---

## 3. Moderación Administrativa (`/admin/submissions`, solo `ADMIN`)

```text
+-------------------------------------------------------------------+
| Cola de Moderación (ADMIN)                                        |
+-------------------------------------------------------------------+
| [Propuesta: título, usuario, plataforma, géneros, portada]        |
|   -> [Publicar nueva]  [Vincular/Fusionar con existente] [Rechazar]
+-------------------------------------------------------------------+
```

---

## 4. Asistente Flotante IA con Claqueta (Global, autenticado)

```text
                                      +-----------------------------+
                                      | CineTrack IA  [Reiniciar][X]|
                                      +-----------------------------+
                                      | Burbuja usuario             |
                                      | Respuesta IA (solo catálogo)|
                                      | +-------------------------+ |
                                      | | Poster | Título  [TIPO] | |
                                      | | Sinopsis breve          | |
                                      | | [Ver ficha] [Agregar]   | |
                                      | +-------------------------+ |
                                      | [Escribe tu consulta...] [>]|
                                      +-----------------------------+
                                                       [Claqueta IA]
```
