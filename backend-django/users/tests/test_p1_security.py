import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestP1UserRoleSecurity:
    def test_register_ignores_admin_role_and_staff_flags(self):
        client = APIClient()
        payload = {
            "email": "attacker@cinetrack.local",
            "username": "attacker",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "role": "ADMIN",
            "is_staff": True,
            "is_superuser": True,
        }
        response = client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == 201
        user = User.objects.get(email="attacker@cinetrack.local")
        assert user.role == User.Role.USER
        assert user.is_staff is False
        assert user.is_superuser is False
        assert response.data["user"]["role"] == User.Role.USER

    def test_profile_patch_cannot_escalate_role(self):
        user = User.objects.create_user(
            email="normal@cinetrack.local",
            username="normal",
            password="StrongPassword123!",
            role=User.Role.USER,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.patch(
            "/api/v1/auth/me/",
            {"username": "normal_updated", "role": "ADMIN", "is_staff": True},
            format="json",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.username == "normal_updated"
        assert user.role == User.Role.USER
        assert user.is_staff is False
