from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Genre, MediaItem, MediaSubmission, Season, Episode
from .utils import validate_poster_file, validate_safe_poster_url


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name"]


class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        fields = ["id", "season", "episode_number", "title", "duration_minutes"]

    def validate(self, attrs):
        season = attrs.get("season")
        if season and season.media_item.media_type != MediaItem.MediaType.SERIE:
            raise serializers.ValidationError(
                {"season": "No se pueden asociar episodios a un contenido que no sea de tipo 'SERIE'."}
            )
        return attrs


class SeasonSerializer(serializers.ModelSerializer):
    episodes = EpisodeSerializer(many=True, read_only=True)

    class Meta:
        model = Season
        fields = ["id", "media_item", "season_number", "episode_count", "episodes"]

    def validate(self, attrs):
        media_item = attrs.get("media_item")
        if media_item and media_item.media_type != MediaItem.MediaType.SERIE:
            raise serializers.ValidationError(
                {"media_item": "No se pueden asociar temporadas a una 'PELICULA'. Solo se permiten en 'SERIE'."}
            )
        return attrs


class MediaItemSerializer(serializers.ModelSerializer):
    genres_details = GenreSerializer(source="genres", many=True, read_only=True)
    genres = serializers.PrimaryKeyRelatedField(
        queryset=Genre.objects.all(), many=True, write_only=True, required=False
    )
    seasons = SeasonSerializer(many=True, read_only=True)

    class Meta:
        model = MediaItem
        fields = [
            "id",
            "title",
            "normalized_title",
            "media_type",
            "release_date",
            "release_year",
            "country_of_origin",
            "tags",
            "producer",
            "poster_image",
            "synopsis",
            "is_active",
            "genres",
            "genres_details",
            "seasons",
        ]
        read_only_fields = ["normalized_title"]
        extra_kwargs = {
            "release_date": {"required": False, "allow_null": True},
            "release_year": {"required": False, "allow_null": True},
            "country_of_origin": {"required": False, "allow_blank": True},
            "tags": {"required": False},
            "producer": {"required": False, "allow_blank": True},
            "synopsis": {"required": False, "allow_blank": True},
        }

    def validate_poster_image(self, value):
        if value:
            try:
                return validate_safe_poster_url(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages)
        return value

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["genres"] = GenreSerializer(instance.genres.all(), many=True).data
        representation.pop("genres_details", None)
        return representation


class MediaSubmissionCreateSerializer(serializers.ModelSerializer):
    watch_platform = serializers.CharField(write_only=True, required=False, allow_blank=False)
    submitted_platform = serializers.CharField(required=False, allow_blank=False)

    class Meta:
        model = MediaSubmission
        fields = [
            "id",
            "title",
            "media_type",
            "poster_url",
            "poster_file",
            "watch_platform",
            "submitted_platform",
            "release_year",
            "country_of_origin",
            "tags",
        ]
        read_only_fields = ["id"]

    def validate_title(self, value):
        cleaned = " ".join((value or "").split())
        if not cleaned:
            raise serializers.ValidationError("El título no puede estar vacío.")
        return cleaned

    def validate_poster_url(self, value):
        if value:
            try:
                return validate_safe_poster_url(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages)
        return value

    def validate_poster_file(self, value):
        if value:
            try:
                validate_poster_file(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages)
        return value

    def validate(self, attrs):
        platform = attrs.pop("watch_platform", None) or attrs.get("submitted_platform")
        instance = getattr(self, "instance", None)
        if not platform and not instance:
            raise serializers.ValidationError({"watch_platform": "La plataforma de visualización es obligatoria."})
        if platform is not None:
            cleaned_platform = " ".join(platform.split())
            if not cleaned_platform:
                raise serializers.ValidationError({"watch_platform": "La plataforma no puede estar vacía."})
            attrs["submitted_platform"] = cleaned_platform

        poster_url = attrs.get("poster_url", getattr(instance, "poster_url", ""))
        poster_file = attrs.get("poster_file", getattr(instance, "poster_file", None))
        if not poster_url and not poster_file:
            raise serializers.ValidationError({"poster_url": "Debes proporcionar una portada (URL válida o archivo)."})
        return attrs


class MediaSubmissionMineSerializer(serializers.ModelSerializer):
    effective_poster_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaSubmission
        fields = [
            "id",
            "title",
            "media_type",
            "poster_url",
            "effective_poster_url",
            "submitted_platform",
            "release_year",
            "country_of_origin",
            "tags",
            "status",
            "resolved_media",
            "rejection_reason",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def get_effective_poster_url(self, obj):
        return obj.effective_poster_url


class AdminSubmissionSerializer(serializers.ModelSerializer):
    """DTO sanitizado para moderación: excluye submitted_by, notas, estrellas y progreso."""
    effective_poster_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaSubmission
        fields = [
            "id",
            "title",
            "normalized_title",
            "media_type",
            "effective_poster_url",
            "submitted_platform",
            "release_year",
            "country_of_origin",
            "tags",
            "status",
            "resolved_media",
            "rejection_reason",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def get_effective_poster_url(self, obj):
        return obj.effective_poster_url
