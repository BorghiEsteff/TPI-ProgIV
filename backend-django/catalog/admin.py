from django.contrib import admin
from .models import Genre, MediaItem, Season, Episode


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


class SeasonInline(admin.TabularInline):
    model = Season
    extra = 1


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "media_type", "release_date", "producer", "is_active")
    list_filter = ("media_type", "is_active", "genres")
    search_fields = ("title", "producer")
    inlines = [SeasonInline]


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 1


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("id", "media_item", "season_number", "episode_count")
    list_filter = ("media_item",)
    inlines = [EpisodeInline]


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ("id", "season", "episode_number", "title", "duration_minutes")
    list_filter = ("season__media_item",)
    search_fields = ("title",)
