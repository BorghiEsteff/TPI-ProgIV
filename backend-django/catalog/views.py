from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Genre, MediaItem, Season, Episode
from .serializers import (
    GenreSerializer,
    MediaItemSerializer,
    SeasonSerializer,
    EpisodeSerializer,
)
from .filters import MediaItemFilter


class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]


class MediaItemViewSet(viewsets.ModelViewSet):
    queryset = MediaItem.objects.prefetch_related("genres", "seasons__episodes").all()
    serializer_class = MediaItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = MediaItemFilter
    search_fields = ["title", "producer", "synopsis"]
    ordering_fields = ["release_date", "title"]
    ordering = ["-release_date", "title"]


class SeasonViewSet(viewsets.ModelViewSet):
    queryset = Season.objects.select_related("media_item").prefetch_related("episodes").all()
    serializer_class = SeasonSerializer
    filterset_fields = ["media_item", "season_number"]
    ordering_fields = ["season_number"]
    ordering = ["season_number"]


class EpisodeViewSet(viewsets.ModelViewSet):
    queryset = Episode.objects.select_related("season__media_item").all()
    serializer_class = EpisodeSerializer
    filterset_fields = ["season", "episode_number"]
    ordering_fields = ["episode_number", "duration_minutes"]
    ordering = ["episode_number"]
