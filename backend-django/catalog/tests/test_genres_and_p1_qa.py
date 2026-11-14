import base64
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from catalog.models import Genre, MediaItem, MediaSubmission
from catalog.utils import BASE_GENRES, ensure_base_genres
from tracking.models import UserProgress

User = get_user_model()

MINIMAL_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def _make_png_upload(name="poster.png"):
    return SimpleUploadedFile(name, MINIMAL_PNG_BYTES, content_type="image/png")


@pytest.mark.django_db
class TestGenresPaginationAndReconciliation:
    def setup_method(self):
        self.user_a = User.objects.create_user(
            email="gen_a@cinetrack.local", username="gen_a", password="StrongPassword123!", role="USER"
        )
        self.user_b = User.objects.create_user(
            email="gen_b@cinetrack.local", username="gen_b", password="StrongPassword123!", role="USER"
        )
        self.admin = User.objects.create_user(
            email="gen_admin@cinetrack.local", username="gen_admin", password="StrongPassword123!", role="ADMIN"
        )
        ensure_base_genres(Genre)
        self.genres = {g.name: g for g in Genre.objects.all()}

    def test_gen01_base_genres_seeded_idempotently(self):
        ensure_base_genres(Genre)
        names = set(Genre.objects.values_list("name", flat=True))
        for expected in BASE_GENRES:
            assert expected in names

        anon = APIClient()
        resp = anon.get("/api/v1/genres/?page_size=100")
        assert resp.status_code == 200
        returned_names = {item["name"] for item in resp.data["results"]}
        assert {"Romance", "Comedia", "Terror", "Animación", "Documental", "Ciencia Ficción"} <= returned_names

    def test_gen02_gen03_submission_genres_json_and_multipart_validation(self):
        client = APIClient()
        client.force_authenticate(user=self.user_a)

        # 0 géneros -> 400
        r_empty = client.post(
            "/api/v1/submissions/",
            {
                "title": "Sin Género",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/1.jpg",
                "watch_platform": "Netflix",
                "genres": [],
            },
            format="json",
        )
        assert r_empty.status_code == 400

        # >5 géneros -> 400
        six_ids = list(Genre.objects.values_list("id", flat=True)[:6])
        r_too_many = client.post(
            "/api/v1/submissions/",
            {
                "title": "Seis Géneros",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/2.jpg",
                "watch_platform": "Netflix",
                "genres": six_ids,
            },
            format="json",
        )
        assert r_too_many.status_code == 400

        # Multipart FormData con poster_file PNG y géneros repetidos (se deduplican)
        romance_id = self.genres["Romance"].id
        drama_id = self.genres["Drama"].id
        r_multi = client.post(
            "/api/v1/submissions/",
            {
                "title": "Obra Con Portada Local",
                "media_type": "SERIE",
                "poster_file": _make_png_upload(),
                "watch_platform": "Viki",
                "release_year": 2025,
                "genres": [str(romance_id), str(drama_id), str(romance_id)],
            },
            format="multipart",
        )
        assert r_multi.status_code == 201
        sub = MediaSubmission.objects.get(id=r_multi.data["submission_id"])
        assert set(sub.genres.values_list("id", flat=True)) == {romance_id, drama_id}

        mine = client.get("/api/v1/submissions/mine/")
        assert mine.status_code == 200
        item = next(x for x in mine.data if x["id"] == sub.id)
        assert {g["name"] for g in item["genres"]} == {"Romance", "Drama"}
        assert item["effective_poster_url"].startswith("http://testserver/media/")

    def test_gen04_gen05_gen06_gen07_edit_publish_merge_and_admin_edit(self):
        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        romance_id = self.genres["Romance"].id
        comedia_id = self.genres["Comedia"].id
        drama_id = self.genres["Drama"].id

        # Crear propuesta A
        resp = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "Comedia Romántica QA",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/romcom.jpg",
                "watch_platform": "Netflix",
                "genres": [romance_id],
            },
            format="json",
        )
        assert resp.status_code == 201
        sub_id = resp.data["submission_id"]

        # GEN-04: editar PENDING actualiza géneros
        patch_resp = client_a.patch(
            f"/api/v1/submissions/{sub_id}/",
            {"genres": [romance_id, comedia_id]},
            format="json",
        )
        assert patch_resp.status_code == 200
        assert {g["id"] for g in patch_resp.data["genres"]} == {romance_id, comedia_id}

        # Admin ve géneros en cola y publica heredando géneros de la propuesta
        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin)
        queue = client_admin.get("/api/v1/admin/submissions/?status=PENDING")
        assert queue.status_code == 200
        queued = next(x for x in queue.data if x["id"] == sub_id)
        assert {g["name"] for g in queued["genres"]} == {"Romance", "Comedia"}

        # Rechaza publish con lista de géneros vacía o inválida
        bad_pub = client_admin.post(
            f"/api/v1/admin/submissions/{sub_id}/publish/",
            {"genres": []},
            format="json",
        )
        assert bad_pub.status_code == 400

        pub_resp = client_admin.post(
            f"/api/v1/admin/submissions/{sub_id}/publish/",
            {},
            format="json",
        )
        assert pub_resp.status_code == 200
        media_id = pub_resp.data["media_item_id"]
        media = MediaItem.objects.get(id=media_id)
        assert set(media.genres.values_list("id", flat=True)) == {romance_id, comedia_id}

        # Duplicado fuerte al publicar otra propuesta con mismo título exige confirm_new=True
        sub_dup = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "Comedia Romantica QA",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/romcom2.jpg",
                "watch_platform": "Prime Video",
                "genres": [drama_id],
            },
            format="json",
        )
        dup_id = sub_dup.data["submission_id"]
        dup_pub = client_admin.post(f"/api/v1/admin/submissions/{dup_id}/publish/", {}, format="json")
        assert dup_pub.status_code == 409
        assert dup_pub.data["code"] == "POSSIBLE_DUPLICATE_EXISTS"

        # GEN-06: Merge no mezcla géneros silenciosamente en la obra canónica
        merge_resp = client_admin.post(
            f"/api/v1/admin/submissions/{dup_id}/merge/",
            {"media_item_id": media_id},
            format="json",
        )
        assert merge_resp.status_code == 200
        media.refresh_from_db()
        assert set(media.genres.values_list("id", flat=True)) == {romance_id, comedia_id}

        # GEN-07: Admin puede editar géneros en PATCH /api/v1/media/{id}/; usuario común recibe 403
        forbidden_edit = client_a.patch(f"/api/v1/media/{media_id}/", {"genres": [drama_id]}, format="json")
        assert forbidden_edit.status_code == 403
        admin_edit = client_admin.patch(f"/api/v1/media/{media_id}/", {"genres": [drama_id]}, format="json")
        assert admin_edit.status_code == 200
        media.refresh_from_db()
        assert list(media.genres.values_list("id", flat=True)) == [drama_id]

    def test_gen08_gen09_graphql_genre_filter_and_normalized_genre_uniqueness(self):
        drama = self.genres["Drama"]
        romance = self.genres["Romance"]

        m1 = MediaItem.objects.create(title="Obra Drama", media_type="PELICULA", is_active=True)
        m1.genres.add(drama)
        m2 = MediaItem.objects.create(title="Obra Romance", media_type="SERIE", is_active=True)
        m2.genres.add(romance)
        m3 = MediaItem.objects.create(title="Obra Oculta", media_type="PELICULA", is_active=False)
        m3.genres.add(drama)

        anon = APIClient()
        gql = anon.post(
            "/graphql/",
            {
                "query": f'query {{ allMediaItems(genreId: {drama.id}) {{ id title genres {{ id name }} }} }}'
            },
            format="json",
        )
        assert gql.status_code == 200
        items = gql.json()["data"]["allMediaItems"]
        assert [i["title"] for i in items] == ["Obra Drama"]

        # GEN-09: No permite crear género duplicado normalizado
        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin)
        dup_genre = client_admin.post("/api/v1/genres/", {"name": "accion"}, format="json")
        assert dup_genre.status_code == 400

    def test_p1_pagination_25_plus_verify_ownership_and_reconciliation(self):
        scifi = self.genres["Ciencia Ficción"]
        created_ids = []
        for idx in range(25):
            item = MediaItem.objects.create(title=f"Obra Paginada {idx:02d}", media_type="PELICULA", is_active=True)
            item.genres.add(scifi)
            created_ids.append(item.id)

        anon = APIClient()
        page_big = anon.get("/api/v1/media/?page_size=50")
        assert page_big.status_code == 200
        assert page_big.data["count"] == 25
        assert len(page_big.data["results"]) == 25

        # Crear 15 entradas de tracking para user_a y 1 para user_b
        a_tracking_ids = []
        for mid in created_ids[:15]:
            prog = UserProgress.objects.create(user=self.user_a, media_item_id=mid, watch_platform="Netflix")
            a_tracking_ids.append(prog.id)
        b_prog = UserProgress.objects.create(user=self.user_b, media_item_id=created_ids[20], watch_platform="HBO")

        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        verify = client_a.post(
            "/api/v1/tracking/verify-ownership/",
            {"tracking_ids": a_tracking_ids + [b_prog.id]},
            format="json",
        )
        assert verify.status_code == 200
        assert set(verify.data["owned_ids"]) == set(a_tracking_ids)
        assert b_prog.id not in verify.data["owned_ids"]

        # Reconciliación de colisión tras merge
        sub = MediaSubmission.objects.create(
            title="Obra Paginada 00 Duplicate",
            media_type="PELICULA",
            poster_url="https://cdn.example.com/dup.jpg",
            submitted_platform="Prime Video",
            submitted_by=self.user_a,
        )
        sub.genres.add(scifi)
        conflict_prog = UserProgress.objects.create(
            user=self.user_a,
            source_submission=sub,
            watch_platform="Prime Video",
            status="COMPLETADO",
            current_seconds=3600,
        )

        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin)
        m_resp = client_admin.post(
            f"/api/v1/admin/submissions/{sub.id}/merge/",
            {"media_item_id": created_ids[0]},
            format="json",
        )
        assert m_resp.status_code == 200
        assert m_resp.data["reconciliation_conflicts"] == 1

        rec_list = client_a.get("/api/v1/tracking/reconciliations/")
        assert rec_list.status_code == 200
        assert rec_list.data["count"] == 1
        assert rec_list.data["results"][0]["id"] == conflict_prog.id
        assert rec_list.data["results"][0]["canonical_entry"]["id"] == a_tracking_ids[0]

        rec_resolve = client_a.post(
            f"/api/v1/tracking/{conflict_prog.id}/reconcile/",
            {"resolution": "apply_archived_progress"},
            format="json",
        )
        assert rec_resolve.status_code == 200
        canonical_after = UserProgress.objects.get(id=a_tracking_ids[0])
        assert canonical_after.status == "COMPLETADO"
        assert canonical_after.current_seconds == 3600
        assert client_a.get("/api/v1/tracking/reconciliations/").data["count"] == 0
