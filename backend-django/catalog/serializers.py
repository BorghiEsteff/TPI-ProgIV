from rest_framework import serializers
from .models import Genre, MediaItem, Season, Episode


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
        queryset=Genre.objects.all(), many=True, write_only=True
    )
    seasons = SeasonSerializer(many=True, read_only=True)

    class Meta:
        model = MediaItem
        fields = [
            "id",
            "title",
            "media_type",
            "release_date",
            "producer",
            "poster_image",
            "synopsis",
            "is_active",
            "genres",
            "genres_details",
            "seasons",
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Presentar géneros expandidos por defecto en la respuesta
        representation["genres"] = GenreSerializer(instance.genres.all(), many=True).data
        representation.pop("genres_details", None)
        return representation

