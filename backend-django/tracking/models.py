from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from catalog.models import MediaItem


class UserProgress(models.Model):
    class WatchStatus(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        VIENDO = "VIENDO", "Viendo"
        VISTO = "VISTO", "Visto"
        ABANDONADO = "ABANDONADO", "Abandonado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="progresses",
        verbose_name="Usuario",
    )
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="user_progresses",
        verbose_name="Ítem Multimedia",
    )
    status = models.CharField(
        max_length=15,
        choices=WatchStatus.choices,
        default=WatchStatus.PENDIENTE,
        verbose_name="Estado de visualización",
    )
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Iniciado el")
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name="Finalizado el")
    current_season_number = models.PositiveIntegerField(
        default=1, verbose_name="Número de temporada actual"
    )
    current_episode_number = models.PositiveIntegerField(
        default=1, verbose_name="Número de episodio actual"
    )
    current_seconds = models.PositiveIntegerField(
        default=0, verbose_name="Segundos actuales reproducidos"
    )
    is_favorite = models.BooleanField(default=False, verbose_name="Favorito")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        verbose_name = "Progreso de Usuario"
        verbose_name_plural = "Progresos de Usuarios"
        unique_together = ("user", "media_item")
        ordering = ["-updated_at"]

    def clean(self):
        super().clean()
        if self.current_seconds < 0:
            raise ValidationError({"current_seconds": "Los segundos actuales no pueden ser un valor negativo."})

        # Al pasar a VIENDO, autocompletar started_at si está vacío
        if self.status == self.WatchStatus.VIENDO and not self.started_at:
            self.started_at = timezone.now()

        # Al pasar a VISTO, autocompletar finished_at si está vacío
        if self.status == self.WatchStatus.VISTO and not self.finished_at:
            self.finished_at = timezone.now()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} - {self.media_item.title} ({self.get_status_display()})"
