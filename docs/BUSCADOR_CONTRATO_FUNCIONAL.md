# Contrato Funcional del Buscador Universal (Lote 02)

## 1. Objetivo
Garantizar una búsqueda tolerante, simétrica y determinista tanto en el catálogo público (`/api/v1/media/`, GraphQL `allMediaItems`) como en el diario privado (`/api/v1/tracking/`) y en los filtros de UI (`GenreMultiSelect`).

## 2. Normalización Simétrica (`backend-django/catalog/search.py` y `frontend/src/utils/textSearch.js`)
- Conversión case-insensitive (`.casefold()` en Python / `.toLowerCase()` en JS).
- Descomposición `NFKD` con eliminación de diacríticos (`tildes`) y preservación explícita de `ñ`/`Ñ`.
- Manejo genérico del signo `+` (`+` -> ` plus `): soporta `Disney+`, `disney plus`, `disney+`, `Paramount+`, `Apple TV+` y `C++` sin reglas hardcodeadas por marca.
- Reemplazo uniforme de separadores (`-`, `_`, `.`, `:`, `,`, `(`, `)`, `/`) por espacios simples.
- **Sin truncamiento en campos de base de datos**: la normalización de consulta se limita a 200 caracteres, pero los campos del registro (`title`, `producer`, `country_of_origin`, `synopsis`) se evalúan completos (incluyendo sinopsis extensas > 200 caracteres).

## 3. Estrategia de Coincidencia y Ranking
1. **Tier 1 (1000)**: coincidencia exacta normalizada de título o variante compacta sin separadores (`>= 4` caracteres, ej. `spiderman` <-> `Spider-Man`).
2. **Tier 2 (720-850)**: prefijo, subcadena directa, subcadena compacta o presencia de todos los tokens en título.
3. **Tier 3 (460-650)**: coincidencia en productora (`producer`), país de origen (`country_of_origin`) o sinopsis completa (`synopsis`).
4. **Tier 4 (200-299)**: coincidencia fuzzy moderada (`SequenceMatcher >= 0.78`) sobre título o productora únicamente cuando no hay coincidencia directa.
5. **Consultas muy cortas (1-2 caracteres) o símbolos (`Up`, `C++`, `a`)**: exigen coincidencia de palabra/prefijo controlada para evitar inundar resultados con subcadenas accidentales.
6. **Seguridad e invariantes**: respeta siempre `is_active=True` en catálogo público, `request.user` en Mi CineTrack y la intersección con filtros de tipo/género/favoritos.

## 4. Diagnóstico del caso `disney` en la instancia local
- Inspección directa sobre `backend-django/db.sqlite3`:
  - `catalog_mediaitem`: 152 obras activas; 0 obras mencionan `disney` en `title`, `producer`, `country_of_origin` o `synopsis`.
  - `tracking_userprogress`: 18 registros privados tienen `watch_platform = 'Disney+'`.
- Causa raíz: **DATO AUSENTE en catálogo público** (`Disney+` existe solo en la plataforma privada del diario `tracking_userprogress.watch_platform`). En Mi CineTrack, el buscador global sí encuentra los registros con `watch_platform = 'Disney+'`.
