import graphene
from graphene_django import DjangoObjectType
from catalog.models import Genre, MediaItem, Season, Episode
from tracking.models import UserProgress


class GenreType(DjangoObjectType):
    class Meta:
        model = Genre
        fields = ("id", "name")


class EpisodeType(DjangoObjectType):
    class Meta:
        model = Episode
        fields = ("id", "season", "episode_number", "title", "duration_minutes")


class SeasonType(DjangoObjectType):
    episodes = graphene.List(EpisodeType)

    class Meta:
        model = Season
        fields = ("id", "media_item", "season_number", "episode_count")

    def resolve_episodes(self, info):
        return self.episodes.all()


class MediaItemType(DjangoObjectType):
    genres = graphene.List(GenreType)
    seasons = graphene.List(SeasonType)

    class Meta:
        model = MediaItem
        fields = (
            "id",
            "title",
            "media_type",
            "release_date",
            "producer",
            "poster_image",
            "synopsis",
            "is_active",
        )

    def resolve_genres(self, info):
        return self.genres.all()

    def resolve_seasons(self, info):
        return self.seasons.all()


class UserProgressType(DjangoObjectType):
    media_item = graphene.Field(MediaItemType)

    class Meta:
        model = UserProgress
        fields = (
            "id",
            "user",
            "status",
            "started_at",
            "finished_at",
            "current_season_number",
            "current_episode_number",
            "current_seconds",
            "is_favorite",
            "updated_at",
        )


from django.db.models import Q

class Query(graphene.ObjectType):
    all_media_items = graphene.List(
        MediaItemType,
        media_type=graphene.String(required=False),
        genre_id=graphene.Int(required=False),
        search=graphene.String(required=False),
        description="Lista de películas y series con optimización prefetch de géneros y temporadas",
    )
    media_item_by_id = graphene.Field(
        MediaItemType,
        id=graphene.Int(required=True),
        description="Detalle completo de una obra multimedia por su ID",
    )
    my_progress = graphene.List(
        UserProgressType,
        description="Progreso del usuario autenticado (requiere contexto de usuario)",
    )

    def resolve_all_media_items(self, info, media_type=None, genre_id=None, search=None):
        qs = MediaItem.objects.prefetch_related("genres", "seasons__episodes").filter(is_active=True)
        if media_type:
            qs = qs.filter(media_type=media_type.upper())
        if genre_id is not None:
            qs = qs.filter(genres__id=genre_id).distinct()
        if search:
            term = search.strip()
            if term:
                qs = qs.filter(
                    Q(title__icontains=term)
                    | Q(synopsis__icontains=term)
                    | Q(producer__icontains=term)
                    | Q(country_of_origin__icontains=term)
                )
        return qs

    def resolve_media_item_by_id(self, info, id):
        try:
            return (
                MediaItem.objects.prefetch_related("genres", "seasons__episodes")
                .get(pk=id, is_active=True)
            )
        except MediaItem.DoesNotExist:
            return None

    def resolve_my_progress(self, info):
        user = info.context.user
        if not user or not user.is_authenticated:
            return []
        return UserProgress.objects.filter(user=user).select_related("media_item")


schema = graphene.Schema(query=Query)
