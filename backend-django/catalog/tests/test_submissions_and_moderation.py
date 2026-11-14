import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from catalog.models import Genre, MediaItem, MediaSubmission
from tracking.models import UserProgress

User = get_user_model()


@pytest.mark.django_db
class TestSubmissionsAndModerationFlow:
    def setup_method(self):
        self.user_a = User.objects.create_user(
            email="a@cinetrack.local", username="user_a", password="StrongPassword123!", role="USER"
        )
        self.user_b = User.objects.create_user(
            email="b@cinetrack.local", username="user_b", password="StrongPassword123!", role="USER"
        )
        self.user_c = User.objects.create_user(
            email="c@cinetrack.local", username="user_c", password="StrongPassword123!", role="USER"
        )
        self.admin = User.objects.create_user(
            email="admin@cinetrack.local", username="admin", password="StrongPassword123!", role="ADMIN"
        )
        self.scifi_genre, _ = Genre.objects.get_or_create(name="Ciencia Ficción")

    def test_matrix_end_to_end_moderation_and_isolation(self):
        # 1. Usuaria A propone Matrix en HBO
        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        resp_a = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "Matrix",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/matrix-a.jpg",
                "watch_platform": "HBO",
                "release_year": 1999,
                "genres": [self.scifi_genre.id],
            },
            format="json",
        )
        assert resp_a.status_code == 201
        sub_a_id = resp_a.data["submission_id"]
        prog_a_id = resp_a.data["tracking_entry_id"]
        assert resp_a.data["status"] == "PENDING"
        assert resp_a.data["visible_in_public_catalog"] is False

        # No aparece en catálogo público
        anon = APIClient()
        assert anon.get("/api/v1/media/").data["count"] == 0

        # 2. Usuaria B propone The Matrix en Netflix
        client_b = APIClient()
        client_b.force_authenticate(user=self.user_b)
        resp_b = client_b.post(
            "/api/v1/submissions/",
            {
                "title": "The Matrix",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/matrix-b.jpg",
                "watch_platform": "Netflix",
                "release_year": 1999,
                "genres": [self.scifi_genre.id],
            },
            format="json",
        )
        assert resp_b.status_code == 201
        sub_b_id = resp_b.data["submission_id"]
        prog_b_id = resp_b.data["tracking_entry_id"]

        # B solo ve sus propias propuestas, nunca las de A
        mine_b = client_b.get("/api/v1/submissions/mine/")
        assert len(mine_b.data) == 1
        assert mine_b.data[0]["id"] == sub_b_id

        # 3. Admin ve cola sanitizada (sin submitted_by ni notas/estrellas)
        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin)
        queue = client_admin.get("/api/v1/admin/submissions/?status=PENDING")
        assert queue.status_code == 200
        assert len(queue.data) == 2
        for item in queue.data:
            assert "submitted_by" not in item
            assert "rating" not in item
            assert "comment" not in item

        # Admin ve sugerencia de duplicado entre Matrix y The Matrix
        cand_resp = client_admin.get(f"/api/v1/admin/submissions/{sub_b_id}/candidates/")
        assert cand_resp.status_code == 200
        assert any(c["submission_id"] == sub_a_id for c in cand_resp.data["candidates"])

        # 4. Admin publica propuesta A y vincula propuesta B a la misma ficha
        pub_resp = client_admin.post(
            f"/api/v1/admin/submissions/{sub_a_id}/publish/",
            {"title": "The Matrix", "poster_image": "https://cdn.example.com/matrix-canonical.jpg"},
            format="json",
        )
        assert pub_resp.status_code == 200
        canonical_id = pub_resp.data["media_item_id"]

        merge_resp = client_admin.post(
            f"/api/v1/admin/submissions/{sub_b_id}/merge/",
            {"media_item_id": canonical_id},
            format="json",
        )
        assert merge_resp.status_code == 200
        assert merge_resp.data["migrated_entries"] == 1

        # Doble resolución concurrente/repetida devuelve 409 Conflict (ACC-17)
        double_resp = client_admin.post(
            f"/api/v1/admin/submissions/{sub_b_id}/merge/",
            {"media_item_id": canonical_id},
            format="json",
        )
        assert double_resp.status_code == 409

        # 5. Catálogo público tiene exactamente 1 película
        pub_list = anon.get("/api/v1/media/")
        assert pub_list.data["count"] == 1
        assert pub_list.data["results"][0]["title"] == "The Matrix"

        # A y B conservan sus IDs de UserProgress y plataformas independientes
        prog_a = UserProgress.objects.get(id=prog_a_id)
        prog_b = UserProgress.objects.get(id=prog_b_id)
        assert prog_a.media_item_id == canonical_id
        assert prog_a.watch_platform == "HBO"
        assert prog_b.media_item_id == canonical_id
        assert prog_b.watch_platform == "Netflix"

        # 6. Usuaria C agrega la ficha publicada idempotente
        client_c = APIClient()
        client_c.force_authenticate(user=self.user_c)
        add1 = client_c.post(
            "/api/v1/tracking/",
            {"media_item": canonical_id, "watch_platform": "Prime Video"},
            format="json",
        )
        assert add1.status_code == 201
        add2 = client_c.post(
            "/api/v1/tracking/",
            {"media_item": canonical_id, "watch_platform": "Prime Video"},
            format="json",
        )
        assert add2.status_code == 200
        assert add1.data["id"] == add2.data["id"]

    def test_rejection_preserves_private_tracking_entry(self):
        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        resp = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "Obra Rechazada",
                "media_type": "SERIE",
                "poster_url": "https://cdn.example.com/rejected.jpg",
                "watch_platform": "Otro - TV",
                "genres": [self.scifi_genre.id],
            },
            format="json",
        )
        sub_id = resp.data["submission_id"]
        prog_id = resp.data["tracking_entry_id"]

        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin)
        rej = client_admin.post(
            f"/api/v1/admin/submissions/{sub_id}/reject/",
            {"rejection_reason": "Imagen ilegible"},
            format="json",
        )
        assert rej.status_code == 200

        # La entrada privada sigue intacta en el diario de A
        tracking_list = client_a.get("/api/v1/tracking/")
        assert tracking_list.status_code == 200
        entries = tracking_list.data["results"]
        assert any(e["id"] == prog_id and e["submission_status"] == "REJECTED" for e in entries)

    def test_same_user_merge_collision_preserves_both_for_reconciliation(self):
        canonical = MediaItem.objects.create(
            title="Inception", media_type="PELICULA", is_active=True
        )
        existing_prog = UserProgress.objects.create(
            user=self.user_a, media_item=canonical, watch_platform="HBO"
        )

        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        resp = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "El Origen",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/inception.jpg",
                "watch_platform": "Netflix",
                "genres": [self.scifi_genre.id],
            },
            format="json",
        )
        sub_id = resp.data["submission_id"]
        provisional_prog_id = resp.data["tracking_entry_id"]

        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin)
        merge_resp = client_admin.post(
            f"/api/v1/admin/submissions/{sub_id}/merge/",
            {"media_item_id": canonical.id},
            format="json",
        )
        assert merge_resp.status_code == 200
        assert merge_resp.data["reconciliation_conflicts"] == 1

        existing_prog.refresh_from_db()
        provisional = UserProgress.objects.get(id=provisional_prog_id)
        assert existing_prog.watch_platform == "HBO"
        assert provisional.needs_reconciliation is True
        assert provisional.watch_platform == "Netflix"

    def test_ssrf_and_invalid_poster_file_rejected(self):
        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)

        ssrf_resp = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "SSRF Test",
                "media_type": "PELICULA",
                "poster_url": "http://127.0.0.1:8000/secret.jpg",
                "watch_platform": "Netflix",
            },
            format="json",
        )
        assert ssrf_resp.status_code == 400

        svg_resp = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "SVG Test",
                "media_type": "PELICULA",
                "poster_url": "https://cdn.example.com/xss.svg",
                "watch_platform": "Netflix",
            },
            format="json",
        )
        assert svg_resp.status_code == 400

        fake_png = SimpleUploadedFile("fake.png", b"<script>alert(1)</script>", content_type="image/png")
        file_resp = client_a.post(
            "/api/v1/submissions/",
            {
                "title": "Fake PNG",
                "media_type": "PELICULA",
                "poster_file": fake_png,
                "watch_platform": "Netflix",
            },
            format="multipart",
        )
        assert file_resp.status_code == 400
