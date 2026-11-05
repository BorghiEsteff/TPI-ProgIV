from datetime import timedelta
import os
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer de SimpleJWT personalizado para enriquecer el access token
    con los claims necesarios para Node.js y el Frontend:
    - user_id
    - username
    - email
    - role
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Inyectar claims personalizados en el payload del access token
        token["user_id"] = user.id
        token["username"] = user.username
        token["email"] = user.email
        token["role"] = getattr(user, "role", "USER")

        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Añadir información del usuario en el cuerpo de la respuesta HTTP de login
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "role": getattr(self.user, "role", "USER"),
            "bio": getattr(self.user, "bio", ""),
        }
        return data


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "password",
            "password_confirm",
            "role",
            "bio",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "role": {"default": "USER"},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario registrado con este correo electrónico.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "role", "bio", "created_at"]
        read_only_fields = ["id", "email", "created_at"]

