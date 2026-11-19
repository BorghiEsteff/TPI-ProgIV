# QA Visual & Impeccable — CineTrack (`2026-11-14`)

## 1. Artefactos de Dirección Visual
- `PRODUCT.md`: Definición de identidad de producto, superficies (`/` catálogo público, `/media/:id`, `/my-tracking`, `/new-entry`, `/my-submissions`, `/admin/submissions`, `/recommendations`, `/watch-rooms/:id`) y regla estricta de aislamiento privado/público.
- `DESIGN.md`: Sistema editorial **Editorial Cinephile Notebook** (`--ct-bg: #f6f4ef`, `--ct-surface: #ffffff`, `--ct-ink: #18181b`, `--ct-ink-muted: #52525b`, `--ct-accent: #991b1b`), portadas `2:3`, `tabular-nums`, `:focus-visible`, `@media (prefers-reduced-motion: reduce)` y objetivos táctiles `>= 44px`.

## 2. Auditoría Automática (`impeccable.cmd detect`)
### Baseline (`http://localhost:5173/`)
- `low-contrast` (advisory): `span.badge.text-light` (`4.3:1` sobre `#0d6efd`, requería `>= 4.5:1`).
- `low-contrast` (warning): `span.text-secondary` en footer oscuro (`3.3:1` sobre `#212529`).
- `skipped-heading` (warning): `<h1>` en `CatalogPage` seguido de `<h5>` en `MediaCard`.

### Correcciones Aplicadas
- `frontend/src/index.css` y `frontend/src/App.css`: Reemplazo total del CSS plantilla de Vite por tokens editoriales CineTrack (`--ct-*`), foco visible `:focus-visible`, `prefers-reduced-motion: reduce`, `aspect-ratio: 2 / 3; object-fit: cover` en `.ct-poster-frame` / `.ct-poster-fallback`, badges de alto contraste (`.ct-badge-pelicula` `#18181b`, `.ct-badge-serie` `#1e3a8a`) y controles táctiles `>= 44px` en móvil.
- `frontend/src/components/catalog/MediaCard.jsx`: Jerarquía semántica `h1 -> h2` (`Card.Title as="h2"`), contenedor `2:3` y fallback de alto contraste.
- `frontend/src/components/layout/AppNavbar.jsx`: Navbar unificada con borde acento `#991b1b` y enlaces táctiles `>= 44px`.
- `frontend/src/components/layout/Footer.jsx`: Reemplazo de `text-secondary` por `text-light opacity-75` (`> 10:1` de contraste).

### Verificación Post-Cambio
- `impeccable.cmd detect --json http://localhost:5173/`: `[]` (0 hallazgos, exit code `0`).
- Capturas comparativas guardadas en `docs/qa/screenshots/baseline/` y `docs/qa/screenshots/after/` para `1440x900`, `768x1024`, `390x844`, `360x800` y `320x568`.
