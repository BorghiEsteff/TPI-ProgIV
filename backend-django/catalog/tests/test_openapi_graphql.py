import pytest
import json
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from catalog.models import MediaItem, Genre
from datetime import date

User = get_user_model()


@pytest.mark.django_db
class TestOpenAPIAndGraphQL:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.genre = Genre.objects.create(name="Cyberpunk")
        self.media = MediaItem.objects.create(
            title="Blade Runner 2049",
            media_type=MediaItem.MediaType.PELICULA,
            release_date=date(2017, 10, 6),
            producer="Alcon Entertainment",
            synopsis="Un nuevo Blade Runner desentierra un secreto oculto.",
            is_active=True,
        )
        self.media.genres.add(self.genre)

    def test_openapi_schema_endpoint(self):
        """Test 1: Verifica que GET /api/schema/ devuelva 200 OK y OpenAPI 3.0."""
        response = self.client.get("/api/schema/?format=json")
        assert response.status_code == status.HTTP_200_OK
        data = json.loads(response.content.decode("utf-8"))
        assert "openapi" in data
        assert data["openapi"].startswith("3.0")
        assert "paths" in data
        assert "/api/v1/media/" in data["paths"]
        assert "/api/v1/auth/login/" in data["paths"]

    def test_swagger_ui_endpoint(self):
        """Test 2: Verifica que GET /api/docs/ cargue Swagger UI con 200 OK."""
        response = self.client.get("/api/docs/")
        assert response.status_code == status.HTTP_200_OK
        assert "swagger-ui" in response.content.decode("utf-8").lower()

    def test_graphql_all_media_and_by_id_queries(self):
        """Test 3: Ejecuta consulta GraphQL solicitando allMediaItems y mediaItemById."""
        query = """
        query GetMedia($id: Int!) {
            allMediaItems {
                id
                title
                mediaType
                genres {
                    name
                }
            }
            mediaItemById(id: $id) {
                id
                title
                producer
                releaseDate
                synopsis
            }
        }
        """
        response = self.client.post(
            "/graphql/",
            data=json.dumps({"query": query, "variables": {"id": self.media.id}}),
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "errors" not in result

        data = result["data"]
        assert len(data["allMediaItems"]) >= 1
        assert data["allMediaItems"][0]["title"] == "Blade Runner 2049"
        assert data["allMediaItems"][0]["genres"][0]["name"] == "Cyberpunk"

        assert data["mediaItemById"] is not None
        assert data["mediaItemById"]["id"] == str(self.media.id)
        assert data["mediaItemById"]["title"] == "Blade Runner 2049"
        assert data["mediaItemById"]["producer"] == "Alcon Entertainment"
