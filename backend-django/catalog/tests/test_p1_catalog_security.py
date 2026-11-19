import json
import pytest
from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from catalog.models import Genre, MediaItem

User = get_user_model()


@pytest.mark.django_db
class TestP1CatalogPermissionsAndFiltering:
    def setup_method(self):
        self.user = User.objects.create_user(
            email="user_p1@cinetrack.local",
            username="user_p1",
            password="StrongPassword123!",
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            email="admin_p1@cinetrack.local",
            username="admin_p1",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )
        self.genre = Genre.objects.create(name="Sci-Fi")
        self.active_media = MediaItem.objects.create(
            title="Public Movie",
            media_type=MediaItem.MediaType.PELICULA,
            release_date=date(2024, 1, 1),
            producer="Studio A",
            synopsis="Visible",
            is_active=True,
        )
        self.active_media.genres.add(self.genre)

        self.hidden_media = MediaItem.objects.create(
            title="Hidden Draft",
            media_type=MediaItem.MediaType.PELICULA,
            release_date=date(2024, 2, 1),
            producer="Studio B",
            synopsis="Hidden",
            is_active=False,
        )

    def test_public_catalog_hides_inactive_items(self):
        client = APIClient()
        list_resp = client.get("/api/v1/media/")
        assert list_resp.status_code == 200
        ids = [item["id"] for item in list_resp.data["results"]]
        assert self.active_media.id in ids
        assert self.hidden_media.id not in ids

        detail_resp = client.get(f"/api/v1/media/{self.hidden_media.id}/")
        assert detail_resp.status_code == 404

    def test_visitor_cannot_write_catalog_or_genres(self):
        client = APIClient()
        resp = client.post(
            "/api/v1/media/",
            {
                "title": "Unauthorized",
                "media_type": "PELICULA",
                "release_date": "2024-01-01",
                "producer": "X",
                "synopsis": "X",
                "genres": [self.genre.id],
            },
            format="json",
        )
        assert resp.status_code == 401
        assert client.post("/api/v1/genres/", {"name": "Horror"}, format="json").status_code == 401

    def test_regular_user_cannot_write_catalog_or_genres(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        resp = client.post(
            "/api/v1/media/",
            {
                "title": "User Attempt",
                "media_type": "PELICULA",
                "release_date": "2024-01-01",
                "producer": "X",
                "synopsis": "X",
                "genres": [self.genre.id],
            },
            format="json",
        )
        assert resp.status_code == 403
        assert client.patch(f"/api/v1/media/{self.active_media.id}/", {"title": "Hacked"}, format="json").status_code == 403
        assert client.delete(f"/api/v1/media/{self.active_media.id}/").status_code == 403
        assert client.post("/api/v1/genres/", {"name": "Horror"}, format="json").status_code == 403

    def test_admin_can_write_catalog(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        resp = client.post(
            "/api/v1/media/",
            {
                "title": "Admin Created",
                "media_type": "PELICULA",
                "release_date": "2024-03-01",
                "producer": "Studio C",
                "synopsis": "Ok",
                "genres": [self.genre.id],
            },
            format="json",
        )
        assert resp.status_code == 201

    def test_graphql_hides_inactive_media_by_id(self):
        client = APIClient()
        query = """
        query ($id: Int!) {
          mediaItemById(id: $id) {
            id
            title
          }
        }
        """
        resp = client.post(
            "/graphql/",
            data=json.dumps({"query": query, "variables": {"id": self.hidden_media.id}}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["mediaItemById"] is None
