# QA Refinamiento Visual: Barra de Filtros y Contorno de Portadas (`2026-11-16`)

## 1. Alcance Implementado
- **P0-A — Barra de búsqueda y filtros (`.ct-filter-bar`):**
  - Agregados tokens locales en [index.css](../../frontend/src/index.css): `--filter-surface: #EDE2F7`, `--filter-border: #D3B9EC` y `--filter-shadow: 0 4px 16px rgba(91, 14, 166, 0.08)` (sin alterar `--bg-secondary` global).
  - Aplicados en [App.css](../../frontend/src/App.css) manteniendo la estructura de controles (`Buscar obra`, `Buscar`, `Tipo`, `Género`, `Limpiar`), inputs blancos `#FFFFFF` con texto `#180828`, y el selector técnico oculto salvo `?debug=1`.
- **P0-B — Contorno difuminado violeta-orquídea en carteleras y pósteres:**
  - Agregado pseudo-elemento `::after` (`position: absolute; inset: 0; pointer-events: none;`) compartido entre `.ct-poster-frame` y `.ct-poster-fallback` en [App.css](../../frontend/src/App.css), visible en reposo (`1.5px solid rgba(147, 95, 211, 0.42)`, `0 0 14px rgba(91, 14, 166, 0.16)`, `inset 0 0 12px rgba(174, 30, 196, 0.08)`) y sutilmente intensificado en hover/`focus-within`, sin aplicar `filter: blur()` sobre `<img>` y respetando `@media (prefers-reduced-motion: reduce)`.
  - Agregado fallback limpio ante error de carga de imagen (`onError`) en [MediaCard.jsx](../../frontend/src/components/catalog/MediaCard.jsx) y [MediaDetailPage.jsx](../../frontend/src/pages/MediaDetailPage.jsx).
- **Documentación y Tests:**
  - Actualizado [DESIGN.md](../../DESIGN.md) con los tokens de barra de filtros y reglas de contorno de póster.
  - Ampliados [catalogButtons.test.jsx](../../frontend/src/tests/catalogButtons.test.jsx) y [08-categories-and-visual-qa.spec.js](../../frontend/e2e/specs/08-categories-and-visual-qa.spec.js) (estilos computados de `.ct-filter-bar`, razón `2:3`, `pointer-events: none` en `::after`, `filter: none` en `<img>` y `prefers-reduced-motion`).

## 2. Evidencias Visuales (Antes / Después)
- **Baseline:** `docs/qa/screenshots/refinamiento-2026-11-16/baseline/` (`catalog-desktop-1440.png`, `catalog-tablet-768.png`, `catalog-mobile-390.png`, `detail-desktop-1440.png`)
- **Después:** `docs/qa/screenshots/refinamiento-2026-11-16/after/` (`catalog-desktop-1440.png`, `catalog-tablet-768.png`, `catalog-mobile-390.png`, `catalog-mobile-360.png`, `catalog-mobile-320.png`, `catalog-hover-input-focus-1440.png`, `detail-desktop-1440.png`)

## 3. Resultados Reales de Ejecución
- `npm run lint` (`oxlint`): **PASS** (0 errores; 14 warnings preexistentes de React Compiler).
- `npm test -- --run` (Vitest): **PASS** (5 archivos, 16 tests passed).
- `npm run build` (Vite): **PASS** (`435 modules`, `869ms`).
- `impeccable.cmd detect --json http://127.0.0.1:5173/`: **PASS** (`[]`, 0 hallazgos).
- `npm run test:e2e -- --project=chromium-desktop`: **17/18 PASS, 1 FAIL** en `05-ai-recommendations.spec.js:15` porque el servicio IA local tiene configurada una `GROQ_API_KEY` real en `service-ai/.env` y respondió con Groq real (`degraded: false`), mientras ese test asume modo determinista (`Modo limitado`).
- `npm run test:e2e -- --project=chromium-mobile`: **17/18 PASS, 1 FAIL** en `05-ai-recommendations.spec.js:15` por la misma razón (`GROQ_API_KEY` real activa en `service-ai/.env`, respondiendo con Groq real en lugar de `Modo limitado`). Todas las pruebas de catálogo, filtros, portadas `2:3`, responsive (`1440/768/390/360/320`), `prefers-reduced-motion` y aislamiento pasaron **100%**.
