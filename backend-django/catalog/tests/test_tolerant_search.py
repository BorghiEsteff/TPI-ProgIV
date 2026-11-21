import time
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from catalog.models import Genre, MediaItem
from tracking.models import UserProgress

User = get_user_model()


@pytest.fixture
def search_fixtures(db):
    drama, _ = Genre.objects.get_or_create(name="Drama")
    scifi, _ = Genre.objects.get_or_create(name="Ciencia Ficción")
    anim, _ = Genre.objects.get_or_create(name="Animación")

    asi = MediaItem.objects.create(
        title="Así aprenderás",
        media_type=MediaItem.MediaType.PELICULA,
        release_year=2024,
        country_of_origin="Corea del Sur",
        producer="Studio Test",
        synopsis="Historia de superación académica.",
        is_active=True,
    )
    asi.genres.add(drama)

    stranger = MediaItem.objects.create(
        title="Stranger Things",
        media_type=MediaItem.MediaType.SERIE,
        release_year=2016,
        country_of_origin="Estados Unidos",
        producer="Netflix",
        synopsis="Misterios sobrenaturales en Hawkins.",
        is_active=True,
    )
    stranger.genres.add(scifi)

    anima = MediaItem.objects.create(
        title="Ánima",
        media_type=MediaItem.MediaType.PELICULA,
        release_year=2021,
        country_of_origin="España",
        producer="Indie Films",
        synopsis="Relato introspectivo.",
        is_active=True,
    )
    anima.genres.add(drama)

    disney_work = MediaItem.objects.create(
        title="Encanto Especial",
        media_type=MediaItem.MediaType.PELICULA,
        release_year=2021,
        country_of_origin="Estados Unidos",
        producer="Disney+",
        synopsis="Aventura musical familiar.",
        is_active=True,
    )
    disney_work.genres.add(anim)

    hidden = MediaItem.objects.create(
        title="Así aprenderás Secreto Oculto",
        media_type=MediaItem.MediaType.PELICULA,
        release_year=2025,
        producer="Disney+",
        is_active=False,
    )

    unrelated = MediaItem.objects.create(
        title="El Padrino",
        media_type=MediaItem.MediaType.PELICULA,
        release_year=1972,
        producer="Paramount",
        synopsis="Saga criminal clásica.",
        is_active=True,
    )

    user_a = User.objects.create_user(
        email="bus_a@cinetrack.local", username="bus_a", password="Password123!"
    )
    user_b = User.objects.create_user(
        email="bus_b@cinetrack.local", username="bus_b", password="Password123!"
    )

    # Create 25 extra catalog items + tracking entries for user_a so "Así aprenderás" falls on page 2+
    extra_items = []
    for i in range(25):
        m = MediaItem.objects.create(
            title=f"Obra Relleno {i:02d}",
            media_type=MediaItem.MediaType.PELICULA,
            release_year=2020,
            is_active=True,
        )
        extra_items.append(m)

    # Oldest updated_at goes to page 2 when ordered by -updated_at; create target first then extras
    p_asi = UserProgress.objects.create(
        user=user_a,
        media_item=asi,
        status=UserProgress.WatchStatus.VISTO,
        is_favorite=True,
        watch_platform="Netflix",
    )
    p_disney = UserProgress.objects.create(
        user=user_a,
        media_item=stranger,
        status=UserProgress.WatchStatus.VIENDO,
        is_favorite=False,
        watch_platform="Disney+",
    )
    for m in extra_items:
        UserProgress.objects.create(
            user=user_a,
            media_item=m,
            status=UserProgress.WatchStatus.PENDIENTE,
            watch_platform="YouTube",
        )

    # User B private entry that User A must NEVER see
    UserProgress.objects.create(
        user=user_b,
        media_item=unrelated,
        status=UserProgress.WatchStatus.VISTO,
        watch_platform="Disney+",
    )

    return {
        "drama": drama,
        "scifi": scifi,
        "anim": anim,
        "asi": asi,
        "stranger": stranger,
        "anima": anima,
        "disney_work": disney_work,
        "hidden": hidden,
        "unrelated": unrelated,
        "user_a": user_a,
        "user_b": user_b,
        "p_asi": p_asi,
        "p_disney": p_disney,
    }


@pytest.mark.django_db
class TestTolerantCatalogAndTrackingSearch:
    def test_bus01_05_06_07_08_rest_accents_and_brand_variants(self, search_fixtures):
        client = APIClient()

        r1 = client.get("/api/v1/media/", {"search": "asi aprenderas"})
        assert r1.status_code == 200
        titles1 = [item["title"] for item in r1.data["results"]]
        assert "Así aprenderás" in titles1

        r5 = client.get("/api/v1/media/", {"search": "anima"})
        assert r5.status_code == 200
        assert "Ánima" in [item["title"] for item in r5.data["results"]]

        for q in ("Disney +", "disney plus", "Disney+"):
            r = client.get("/api/v1/media/", {"search": q})
            assert r.status_code == 200
            titles = [item["title"] for item in r.data["results"]]
            assert "Encanto Especial" in titles
            assert "Así aprenderás Secreto Oculto" not in titles
            assert "Stranger Things" not in titles

    def test_bus02_20_graphql_parity_with_rest(self, search_fixtures):
        client = APIClient()
        query = """
        query($search: String, $mediaType: String, $genreId: Int) {
          allMediaItems(search: $search, mediaType: $mediaType, genreId: $genreId) {
            id
            title
          }
        }
        """
        r_gql = client.post(
            "/graphql/",
            {"query": query, "variables": {"search": "ASI   APRENDERAS"}},
            format="json",
        )
        assert r_gql.status_code == 200
        gql_ids = [int(x["id"]) for x in r_gql.json()["data"]["allMediaItems"]]
        assert search_fixtures["asi"].id in gql_ids

        r_rest = client.get("/api/v1/media/", {"search": "ASI   APRENDERAS"})
        rest_ids = [item["id"] for item in r_rest.data["results"]]
        assert gql_ids == rest_ids

    def test_bus03_04_fuzzy_minor_typos_and_precision(self, search_fixtures):
        client = APIClient()

        r3 = client.get("/api/v1/media/", {"search": "asii aprenderas"})
        assert r3.status_code == 200
        assert r3.data["results"][0]["title"] == "Así aprenderás"

        r4 = client.get("/api/v1/media/", {"search": "straner things"})
        assert r4.status_code == 200
        assert r4.data["results"][0]["title"] == "Stranger Things"

    def test_bus09_10_11_12_24_filters_security_and_edge_cases(self, search_fixtures):
        client = APIClient()

        # BUS-09: wrong media_type
        r9 = client.get("/api/v1/media/", {"search": "asi aprenderas", "media_type": "SERIE"})
        assert r9.status_code == 200
        assert r9.data["count"] == 0

        # BUS-10: incompatible genre
        r10 = client.get(
            "/api/v1/media/",
            {"search": "asi aprenderas", "genres": str(search_fixtures["scifi"].id)},
        )
        assert r10.status_code == 200
        assert r10.data["count"] == 0

        # BUS-11: inactive hidden item never leaks
        r11 = client.get("/api/v1/media/", {"search": "Secreto Oculto"})
        assert r11.status_code == 200
        assert search_fixtures["hidden"].id not in [x["id"] for x in r11.data["results"]]

        # BUS-12: short/nonsense query does not flood results
        r12 = client.get("/api/v1/media/", {"search": "zz"})
        assert r12.status_code == 200
        assert r12.data["count"] == 0

        # BUS-24: malformed / special chars never 500
        for bad in ("'", "%_%", "!!!???", "🎬🔥", "x" * 250):
            r = client.get("/api/v1/media/", {"search": bad})
            assert r.status_code == 200

    def test_bus15_16_17_18_tracking_global_search_and_isolation(self, search_fixtures):
        client = APIClient()
        client.force_authenticate(user=search_fixtures["user_a"])

        # BUS-15: watch_platform Disney+ matched by "Disney +"
        r15 = client.get("/api/v1/tracking/", {"search": "Disney +"})
        assert r15.status_code == 200
        ids15 = [x["id"] for x in r15.data["results"]]
        assert search_fixtures["p_disney"].id in ids15
        # User B's El Padrino on Disney+ must never appear
        assert all(x["display_title"] != "El Padrino" for x in r15.data["results"])

        # BUS-16: entry that was pushed to page 2 is found globally
        r16 = client.get("/api/v1/tracking/", {"search": "asi aprenderas", "page_size": 20})
        assert r16.status_code == 200
        assert r16.data["count"] == 1
        assert r16.data["results"][0]["id"] == search_fixtures["p_asi"].id

        # BUS-17: searching User B's exclusive title returns 0 for User A
        r17 = client.get("/api/v1/tracking/", {"search": "El Padrino"})
        assert r17.status_code == 200
        assert r17.data["count"] == 0

        # BUS-18: FAVORITOS + search intersection
        r18 = client.get(
            "/api/v1/tracking/",
            {"search": "asi aprenderas", "is_favorite": "true"},
        )
        assert r18.status_code == 200
        assert r18.data["count"] == 1

    def test_bus23_performance_1000_items(self, db):
        items = [
            MediaItem(
                title=f"Catálogo Masivo {i}",
                media_type=MediaItem.MediaType.PELICULA,
                producer="Studio Bulk",
                synopsis="Descripción estándar de prueba.",
                is_active=True,
            )
            for i in range(1000)
        ]
        MediaItem.objects.bulk_create(items)
        client = APIClient()
        t0 = time.perf_counter()
        r = client.get("/api/v1/media/", {"search": "Catalogo Masivo 999"})
        elapsed = time.perf_counter() - t0
        assert r.status_code == 200
        assert r.data["count"] >= 1
        assert elapsed < 1.5
