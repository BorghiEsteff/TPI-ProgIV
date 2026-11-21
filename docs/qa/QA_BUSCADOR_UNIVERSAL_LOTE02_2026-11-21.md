# QA Buscador Universal — Lote 02 (2026-11-21)

## 1. Diagnóstico del caso `disney` en la instancia real (`backend-django/db.sqlite3`)
- Inspección directa ejecutada sobre `backend-django/db.sqlite3`:
  - `catalog_mediaitem`: 152 registros activos, 0 coinciden con `disney` en `title`, `producer`, `country_of_origin` o `synopsis` (`producer` solo registra `''`, `AMC / Sony Pictures Television`, `Acemaker Movieworks`, `Netflix`, `Netflix / 21 Laps Entertainment`, `Realies Pictures`, `Studio Dragon`, `Take Studio`, `Toho`, `Warner Bros. / Village Roadshow`, `Yong Film / Netflix`).
  - `tracking_userprogress`: 18 registros tienen `watch_platform = 'Disney+'`.
- **Clasificación de causa raíz**: `DATO AUSENTE` en el catálogo público (`Disney+` existe solo en `tracking_userprogress.watch_platform`, que es privado de Mi CineTrack).

## 2. Cambios verificados
- `backend-django/catalog/search.py`:
  - Normalización simétrica `NFKD` sin tildes, con preservación de `ñ`, conversión genérica `+` -> ` plus ` sin reglas hardcodeadas por marca y reemplazo uniforme de separadores (`-`, `_`, `.`, `:`, etc.).
  - Eliminación del truncamiento `[:200]` sobre campos almacenados (`title`, `producer`, `country_of_origin`, `synopsis`).
  - Soporte simétrico de variantes compactas (`>= 4` caracteres: `spiderman` <-> `Spider-Man: No Way Home`, `misionimposible` <-> `Misión: Imposible`) y control de precisión para consultas cortas/símbolos (`Up`, `C++`, `a`).
  - Ranking determinista (exacto > prefijo/subcadena/tokens > productora/país/sinopsis > fuzzy `>= 0.78`).
- `frontend/src/utils/textSearch.js`: alineado con `normalizeSearchText` y `matchesSearchQuery`.

## 3. Matriz de casos (S-01..S-20)
- `S-01`..`S-08` (tildes, mayúsculas, espacios múltiples, subcadenas en título/productora/país/sinopsis > 200 chars): **PASS** (`backend-django/catalog/tests/test_tolerant_search.py` + `11-tolerant-search.spec.js`).
- `S-09`..`S-13` (separadores genéricos `Spider-Man`/`spiderman`, `Misión: Imposible`/`mision-imposible`, `+`/`plus` para `Paramount+`/`Disney+` sin hardcodeo, preservación de `ñ`): **PASS** (`test_lote02_universal_substrings_separators_long_synopsis_and_short_symbols`).
- `S-14`..`S-16` (consultas cortas/símbolos `Up`, `C++`, `zz`, caracteres especiales): **PASS** (`Up` encuentra `Up` sin inundar `Superman`; `C++` y `zz` retornan 0 resultados sin error 500).
- `S-17`..`S-20` (seguridad `is_active=True`, aislamiento por usuario en `watch_platform` de Mi CineTrack, paridad REST/GraphQL, rendimiento sobre 1,000 obras `< 1.5s`, filtro tolerante en `GenreMultiSelect`): **PASS**.
