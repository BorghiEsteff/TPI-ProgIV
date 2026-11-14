from django.db import models
from django.db.models import Q
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from catalog.models import MediaItem, MediaSubmission


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
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="user_progresses",
        verbose_name="Ítem Multimedia Canónico",
    )
    source_submission = models.ForeignKey(
        MediaSubmission,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="tracking_entries",
        verbose_name="Propuesta Provisional",
    )
    watch_platform = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Plataforma de Visualización",
    )
    status = models.CharField(
        max_length=15,
        choices=WatchStatus.choices,
        default=WatchStatus.PENDIENTE,
        db_index=True,
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
    is_favorite = models.BooleanField(default=False, db_index=True, verbose_name="Favorito")
    needs_reconciliation = models.BooleanField(
        default=False, db_index=True, verbose_name="Requiere conciliación manual"
    )
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="Eliminado lógicamente")
    updated_at = models.DateTimeField(auto_now=True, db_index=True, verbose_name="Última actualización")

    class Meta:
        verbose_name = "Progreso de Usuario"
        verbose_name_plural = "Progresos de Usuarios"
        ordering = ["-updated_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (Q(media_item__isnull=False) & Q(source_submission__isnull=True))
                    | (Q(media_item__isnull=True) & Q(source_submission__isnull=False))
                ),
                name="user_progress_exactly_one_target",
            ),
            models.UniqueConstraint(
                fields=["user", "media_item"],
                condition=Q(media_item__isnull=False, deleted_at__isnull=True),
                name="uniq_active_user_media_item",
            ),
            models.UniqueConstraint(
                fields=["user", "source_submission"],
                condition=Q(source_submission__isnull=False, deleted_at__isnull=True),
                name="uniq_active_user_source_submission",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "media_item"], name="prog_user_media_idx"),
            models.Index(fields=["user", "status"], name="prog_user_status_idx"),
            models.Index(fields=["user", "is_favorite"], name="prog_user_fav_idx"),
        ]

    def clean(self):
        super().clean()
        if self.current_seconds < 0:
            raise ValidationError({"current_seconds": "Los segundos actuales no pueden ser un valor negativo."})

        has_media = self.media_item_id is not None
        has_sub = self.source_submission_id is not None
        if has_media == has_sub:
            raise ValidationError("Cada entrada de diario debe apuntar exactamente a media_item o a source_submission.")

        if has_sub and self.user_id and self.source_submission.submitted_by_id != self.user_id:
            raise ValidationError("La propuesta asociada no pertenece al propietario de esta entrada.")

        if self.status == self.WatchStatus.VIENDO and not self.started_at:
            self.started_at = timezone.now()

        if self.status == self.WatchStatus.VISTO and not self.finished_at:
            self.finished_at = timezone.now()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def display_title(self):
        if self.media_item:
            return self.media_item.title
        if self.source_submission:
            return self.source_submission.title
        return ""

    def __str__(self):
        return f"{self.user.email} - {self.display_title} ({self.get_status_display()})"
