from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        USER = "USER", "Usuario"

    email = models.EmailField(unique=True, verbose_name="Correo Electrónico")
    username = models.CharField(max_length=150, verbose_name="Nombre de Usuario")
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER,
        verbose_name="Rol en la Plataforma",
    )
    bio = models.TextField(blank=True, default="", verbose_name="Biografía")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = "Usuario Personalizado"
        verbose_name_plural = "Usuarios Personalizados"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
