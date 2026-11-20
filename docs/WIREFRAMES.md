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

* En `/media/:id` (autenticado): ficha completa + selector de estado (`PENDIENTE`, `VIENDO`, `VISTO`, `ABANDONADO`), plataforma, avance `HH:MM:SS` (`+30s`, `+5m`, `+15m`) y bloque de **Nota Privada + Rating 1..5** (MongoDB).

---

## 2. Diario Privado (`/my-tracking`) y Propuestas (`/new-entry`, `/my-submissions`)

```text
+-------------------------------------------------------------------+
| Mi Diario Privado                                                 |
| [Filtro estado] [Solo favoritos]                                  |
+-------------------------------------------------------------------+
| Obra | Plataforma | Estado | Avance HH:MM:SS | Nota Privada | Ac |
| ...  | Netflix    | VIENDO | 00:42:15         | 5/5 + texto  |    |
+-------------------------------------------------------------------+
```

* En `/new-entry`: formulario de título, tipo (`PELICULA` / `SERIE`), plataforma, año, país, 1–5 géneros y URL/archivo de portada validado (anti-SSRF/SVG).
* En `/my-submissions`: listado del usuario con estados `PENDING` (editable), `PUBLISHED`, `MERGED` (con botón de conciliación de diario) o `REJECTED` (con motivo).

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
