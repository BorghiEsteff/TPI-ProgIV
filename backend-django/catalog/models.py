from django.db import models
from django.core.exceptions import ValidationError


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

    title = models.CharField(max_length=255, verbose_name="Título")
    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.PELICULA,
        verbose_name="Tipo de Medio",
    )
    release_date = models.DateField(verbose_name="Fecha de Estreno")
    producer = models.CharField(max_length=255, verbose_name="Productora")
    poster_image = models.URLField(max_length=500, blank=True, null=True, verbose_name="URL del Póster")
    synopsis = models.TextField(verbose_name="Sinopsis")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    genres = models.ManyToManyField(Genre, related_name="media_items", verbose_name="Géneros")

    class Meta:
        verbose_name = "Ítem Multimedia"
        verbose_name_plural = "Ítems Multimedia"
        ordering = ["-release_date", "title"]

    def __str__(self):
        return f"{self.title} ({self.get_media_type_display()})"


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

    def clean(self):
        super().clean()
        if self.season and self.season.media_item.media_type != MediaItem.MediaType.SERIE:
            raise ValidationError("No se pueden agregar episodios a una película.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"S{self.season.season_number:02d}E{self.episode_number:02d} - {self.title}"
