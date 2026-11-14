import os
import uuid
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from .utils import normalize_title


def submission_poster_upload_path(_instance, filename):
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        ext = ".jpg"
    return f"submission_posters/{uuid.uuid4().hex}{ext}"


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre")

    class Meta:
        verbose_name = "Género"
        verbose_name_plural = "Géneros"
        ordering = ["name"]

    def __str__(self):
        return self.name


class MediaItem(models.Model):
    class MediaType(models.TextChoices):
        SERIE = "SERIE", "Serie"
        PELICULA = "PELICULA", "Película"

    title = models.CharField(max_length=255, db_index=True, verbose_name="Título")
    normalized_title = models.CharField(
        max_length=255, db_index=True, blank=True, default="", verbose_name="Título Normalizado"
    )
    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.PELICULA,
        db_index=True,
        verbose_name="Tipo de Medio",
    )
    release_date = models.DateField(null=True, blank=True, db_index=True, verbose_name="Fecha de Estreno")
    release_year = models.PositiveIntegerField(null=True, blank=True, db_index=True, verbose_name="Año de Estreno")
    country_of_origin = models.CharField(
        max_length=100, blank=True, default="", db_index=True, verbose_name="País de Origen"
    )
    tags = models.JSONField(default=list, blank=True, verbose_name="Etiquetas")
    producer = models.CharField(max_length=255, blank=True, default="", db_index=True, verbose_name="Productora")
    poster_image = models.URLField(max_length=500, blank=True, null=True, verbose_name="URL del Póster")
    synopsis = models.TextField(blank=True, default="", verbose_name="Sinopsis")
    is_active = models.BooleanField(default=True, db_index=True, verbose_name="Activo")
    genres = models.ManyToManyField(Genre, related_name="media_items", blank=True, verbose_name="Géneros")

    class Meta:
        verbose_name = "Ítem Multimedia"
        verbose_name_plural = "Ítems Multimedia"
        ordering = ["-release_date", "title"]
        indexes = [
            models.Index(fields=["media_type", "is_active"], name="media_type_active_idx"),
            models.Index(fields=["release_date", "title"], name="media_date_title_idx"),
            models.Index(fields=["normalized_title", "media_type"], name="media_norm_type_idx"),
        ]

    def save(self, *args, **kwargs):
        self.title = " ".join((self.title or "").split())
        self.normalized_title = normalize_title(self.title)
        if self.release_date and not self.release_year:
            self.release_year = self.release_date.year
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.get_media_type_display()})"


class MediaSubmission(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        PUBLISHED = "PUBLISHED", "Publicada"
        MERGED = "MERGED", "Vinculada a existente"
        REJECTED = "REJECTED", "Rechazada"

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_submissions",
        verbose_name="Proponente",
    )
    title = models.CharField(max_length=255, db_index=True, verbose_name="Título Propuesto")
    normalized_title = models.CharField(
        max_length=255, db_index=True, blank=True, default="", verbose_name="Título Normalizado"
    )
    media_type = models.CharField(
        max_length=10,
        choices=MediaItem.MediaType.choices,
        default=MediaItem.MediaType.PELICULA,
        db_index=True,
        verbose_name="Tipo de Medio",
    )
    poster_url = models.URLField(max_length=500, blank=True, default="", verbose_name="URL de Portada Candidata")
    poster_file = models.FileField(
        upload_to=submission_poster_upload_path, null=True, blank=True, verbose_name="Archivo de Portada Candidata"
    )
    submitted_platform = models.CharField(max_length=100, verbose_name="Plataforma Declarada")
    release_year = models.PositiveIntegerField(null=True, blank=True, verbose_name="Año de Estreno")
    country_of_origin = models.CharField(max_length=100, blank=True, default="", verbose_name="País de Origen")
    tags = models.JSONField(default=list, blank=True, verbose_name="Etiquetas")
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Estado de Moderación",
    )
    resolved_media = models.ForeignKey(
        MediaItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_submissions",
        verbose_name="Obra Canónica Resuelta",
    )
    rejection_reason = models.TextField(blank=True, default="", verbose_name="Motivo de Rechazo")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Creado el")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado el")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Resuelto el")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="moderated_submissions",
        verbose_name="Moderado por",
    )

    class Meta:
        verbose_name = "Propuesta de Obra"
        verbose_name_plural = "Propuestas de Obras"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="sub_status_created_idx"),
            models.Index(fields=["normalized_title", "media_type"], name="sub_norm_type_idx"),
        ]

    def save(self, *args, **kwargs):
        self.title = " ".join((self.title or "").split())
        self.normalized_title = normalize_title(self.title)
        super().save(*args, **kwargs)

    @property
    def effective_poster_url(self) -> str:
        if self.poster_file:
            try:
                return self.poster_file.url
            except ValueError:
                return ""
        return self.poster_url or ""

    def __str__(self):
        return f"{self.title} [{self.status}]"


class Season(models.Model):
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="seasons",
        limit_choices_to={"media_type": MediaItem.MediaType.SERIE},
        verbose_name="Serie",
    )
    season_number = models.PositiveIntegerField(verbose_name="Número de Temporada")
    episode_count = models.PositiveIntegerField(default=0, verbose_name="Cantidad de Episodios")

    class Meta:
        verbose_name = "Temporada"
        verbose_name_plural = "Temporadas"
        unique_together = ("media_item", "season_number")
        ordering = ["season_number"]
        indexes = [
            models.Index(fields=["media_item", "season_number"], name="season_media_num_idx"),
        ]

    def clean(self):
        super().clean()
        if self.media_item and self.media_item.media_type != MediaItem.MediaType.SERIE:
            raise ValidationError("No se pueden agregar temporadas a un ítem que no sea del tipo 'SERIE'.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.media_item.title} - Temporada {self.season_number}"


class Episode(models.Model):
    season = models.ForeignKey(
        Season,
        on_delete=models.CASCADE,
        related_name="episodes",
        verbose_name="Temporada",
    )
    episode_number = models.PositiveIntegerField(verbose_name="Número de Episodio")
    title = models.CharField(max_length=255, verbose_name="Título del Episodio")
    duration_minutes = models.PositiveIntegerField(verbose_name="Duración (minutos)")

    class Meta:
        verbose_name = "Episodio"
        verbose_name_plural = "Episodios"
        unique_together = ("season", "episode_number")
        ordering = ["episode_number"]
        indexes = [
            models.Index(fields=["season", "episode_number"], name="ep_season_num_idx"),
        ]

    def clean(self):
        super().clean()
        if self.season and self.season.media_item.media_type != MediaItem.MediaType.SERIE:
            raise ValidationError("No se pueden agregar episodios a una película.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"S{self.season.season_number:02d}E{self.episode_number:02d} - {self.title}"
