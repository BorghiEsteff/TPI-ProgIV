# QA Búsqueda Tolerante a Tildes, Marcas y Errores Tipográficos (21/11/2026)

**Rama:** `fix/search-tolerant-accent-fuzzy` (desde `main` `eb1bafca0cca1a0898840e05854cf2240b9c31a6`)  
**Motor validado:** SQLite (`pytest` y `db.qa.sqlite3` para Playwright E2E) + Vitest + `vite build`.  
**Limitación observada:** Docker Desktop se encontraba detenido en esta corrida (`open //./pipe/dockerDesktopLinuxEngine` no disponible), por lo que la ejecución sobre PostgreSQL 16 Docker (`BUS-22`) queda registrada como **BLOCKED** en este corte.

---

## 1. Matriz de 24 casos (`BUS-01`..`BUS-24`)

| ID | Contexto | Caso / Entrada | Estado | Evidencia / Resultado |
| :--- | :--- | :--- | :---: | :--- |
| **BUS-01** | Catálogo REST | `asi aprenderas` -> *Así aprenderás* | **PASS** | `test_bus01_05_06_07_08_rest_accents_and_brand_variants` (`pytest`) |
| **BUS-02** | Catálogo GraphQL | `ASI   APRENDERAS` -> misma obra que REST | **PASS** | `test_bus02_20_graphql_parity_with_rest` (`pytest`) |
| **BUS-03** | Catálogo REST/GraphQL | `asii aprenderas` -> *Así aprenderás* | **PASS** | `test_bus03_04_fuzzy_minor_typos_and_precision` (`pytest`) |
| **BUS-04** | Catálogo REST/GraphQL | `straner things` -> *Stranger Things* | **PASS** | `test_bus03_04_fuzzy_minor_typos_and_precision` + `11-tolerant-search.spec.js` |
| **BUS-05** | Catálogo REST/GraphQL | `anima` -> *Ánima* | **PASS** | `test_bus01_05_06_07_08_rest_accents_and_brand_variants` (`pytest`) |
| **BUS-06** | Catálogo REST/GraphQL | `Disney +` -> *Disney+* (productora) | **PASS** | `test_bus01_05_06_07_08_rest_accents_and_brand_variants` (`pytest`) |
| **BUS-07** | Catálogo REST/GraphQL | `disney plus` -> *Disney+* sin fuga privada | **PASS** | `test_bus01_05_06_07_08_rest_accents_and_brand_variants` (`pytest`) |
| **BUS-08** | Catálogo REST/GraphQL | `Disney+` -> coincidencia fuerte | **PASS** | `test_bus01_05_06_07_08_rest_accents_and_brand_variants` (`pytest`) |
| **BUS-09** | Catálogo | `asi aprenderas` + `media_type=SERIE` -> 0 | **PASS** | `test_bus09_10_11_12_24_filters_security_and_edge_cases` (`pytest`) |
| **BUS-10** | Catálogo | `asi aprenderas` + género incompatible -> 0 | **PASS** | `test_bus09_10_11_12_24_filters_security_and_edge_cases` (`pytest`) |
| **BUS-11** | Catálogo | Búsqueda similar a obra `is_active=False` | **PASS** | `test_bus09_10_11_12_24_filters_security_and_edge_cases` (`pytest`) |
| **BUS-12** | Catálogo | `zz` (2 caracteres) sin falsos positivos | **PASS** | `test_bus09_10_11_12_24_filters_security_and_edge_cases` (`pytest`) |
| **BUS-13** | Catálogo | Paginación/conteo sobre conjunto filtrado | **PASS** | `MediaItemViewSet.filter_queryset` + `test_p1_pagination_25_plus` |
| **BUS-14** | Catálogo | Búsqueda vacía / Limpiar restaura catálogo | **PASS** | `search_media_queryset` devuelve queryset intacto + `01-public-catalog.spec.js` |
| **BUS-15** | Mi CineTrack | `Disney +` -> `watch_platform="Disney+"` | **PASS** | `test_bus15_16_17_18_tracking_global_search_and_isolation` (`pytest`) + `tolerantSearch.test.jsx` |
| **BUS-16** | Mi CineTrack | `asi aprenderas` encontrado desde página 2+ | **PASS** | `test_bus15_16_17_18_tracking_global_search_and_isolation` (`pytest`) |
| **BUS-17** | Mi CineTrack | Consulta de título de otro usuario -> 0 | **PASS** | `test_bus15_16_17_18_tracking_global_search_and_isolation` (`pytest`) |
| **BUS-18** | Mi CineTrack | `is_favorite=true` + búsqueda | **PASS** | `test_bus15_16_17_18_tracking_global_search_and_isolation` + `tolerantSearch.test.jsx` |
| **BUS-19** | Selector de género | `animacion` / `ficcion` mantiene chips/IDs | **PASS** | `tolerantSearch.test.jsx` (`Vitest`) + `11-tolerant-search.spec.js` (`Playwright`) |
| **BUS-20** | REST vs GraphQL | Mismo orden e IDs entre REST y GraphQL | **PASS** | `test_bus02_20_graphql_parity_with_rest` (`gql_ids == rest_ids`) |
| **BUS-21** | Regresión | `Blade`, login, detalles, suites previas | **PASS** | `01-public-catalog.spec.js` + 35/35 `pytest` + 27/27 `Vitest` |
| **BUS-22** | Motores SQLite vs PG | SQLite `PASS`; PostgreSQL 16 Docker | **BLOCKED (PG)** | SQLite 35/35 `PASS`; Docker daemon detenido en este equipo |
| **BUS-23** | Rendimiento | Catálogo de 1.000 ítems (`Catalogo Masivo 999`) | **PASS** | `test_bus23_performance_1000_items` (`elapsed < 1.5s`) |
| **BUS-24** | Seguridad / Unicode | `'`, `%_%`, `!!!???`, emojis, 250 chars | **PASS** | `test_bus09_10_11_12_24_filters_security_and_edge_cases` (`200` sin 500) |

---

## 2. Comandos ejecutados y resultados

* **Django `pytest` (SQLite):** `DB_ENGINE=django.db.backends.sqlite3 .\venv\Scripts\python.exe -m pytest -v` -> **35 passed** (incluyendo 6 tests nuevos en `catalog/tests/test_tolerant_search.py`).
* **Frontend Vitest:** `npm test` -> **8 archivos, 27 passed** (incluyendo 3 tests en `src/tests/tolerantSearch.test.jsx`).
* **Frontend Build:** `npm run build` -> `439 modules transformed`, `built in 1.19 s`.
* **Playwright E2E (`http://127.0.0.1:8088` sobre `db.qa.sqlite3`):** `npx playwright test 11-tolerant-search.spec.js --reporter=list` -> **4 passed en 9.7 s** (`chromium-desktop` y `chromium-mobile`).
