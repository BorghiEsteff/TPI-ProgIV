import pytest
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from catalog.models import MediaItem, Genre

User = get_user_model()


@pytest.mark.django_db
class TestAuthAndJWTSecurity:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.register_url = "/api/v1/auth/register/"
        self.login_url = "/api/v1/auth/login/"
        self.refresh_url = "/api/v1/auth/token/refresh/"
        self.tracking_url = "/api/v1/tracking/"

        # Crear usuario de prueba
        self.password = "ValidSecurePass123!"
        self.user = User.objects.create_user(
            email="tester@cinetrack.local",
            username="tester_jwt",
            password=self.password,
            role=User.Role.USER,
            bio="Usuario de pruebas",
        )

        # Crear item de catalogo para test de tracking
        self.genre, _ = Genre.objects.get_or_create(name="Terror")
        self.media = MediaItem.objects.create(
            title="Alien",
            media_type=MediaItem.MediaType.PELICULA,
            release_date=date(1979, 5, 25),
            producer="20th Century Fox",
            synopsis="En el espacio nadie puede oír tus gritos.",
        )
        self.media.genres.add(self.genre)

    def test_user_creation_and_hashed_password(self):
        """Verificar persistencia de usuario y hashing de contraseña (nunca en texto plano)."""
        user = User.objects.get(email="tester@cinetrack.local")
        assert user.check_password(self.password) is True
        assert user.password != self.password
        assert user.password.startswith("pbkdf2_sha256$") or user.password.startswith("argon2")

    def test_successful_login_and_token_payload_claims(self):
        """Verificar login exitoso y presencia de claims personalizados (user_id, username, email, role)."""
        payload = {
            "email": "tester@cinetrack.local",
            "password": self.password,
        }
        response = self.client.post(self.login_url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "access" in data
        assert "refresh" in data
        assert data["user"]["email"] == "tester@cinetrack.local"
        assert data["user"]["role"] == User.Role.USER

        # Decodificar el token con la clave compartida HS256
        access_token = data["access"]
        decoded_payload = jwt.decode(
            access_token,
            settings.SIMPLE_JWT["SIGNING_KEY"],
            algorithms=[settings.SIMPLE_JWT["ALGORITHM"]],
        )

        assert decoded_payload["user_id"] == self.user.id
        assert decoded_payload["email"] == self.user.email
        assert decoded_payload["username"] == self.user.username
        assert decoded_payload["role"] == User.Role.USER

    def test_rejected_login_invalid_credentials(self):
        """Verificar rechazo de login ante credenciales erróneas (401 Unauthorized)."""
        payload = {
            "email": "tester@cinetrack.local",
            "password": "WrongPassword123!",
        }
        response = self.client.post(self.login_url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tracking_requires_authentication(self):
        """Verificar que /api/v1/tracking/ rechaza peticiones sin token Bearer (401)."""
        response = self.client.get(self.tracking_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tracking_access_granted_with_bearer_token(self):
        """Verificar acceso concedido con token Bearer y aislamiento por usuario."""
        login_res = self.client.post(
            self.login_url,
            {"email": "tester@cinetrack.local", "password": self.password},
            format="json",
        )
        access_token = login_res.json()["access"]

        # Autenticar con cabecera Bearer
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(self.tracking_url)
        assert response.status_code == status.HTTP_200_OK

        # Crear tracking para el usuario autenticado
        create_res = self.client.post(
            self.tracking_url,
            {
                "media_item": self.media.id,
                "status": "VIENDO",
                "current_seconds": 120,
            },
            format="json",
        )
        assert create_res.status_code == status.HTTP_201_CREATED
        assert create_res.json()["user"] == self.user.id

