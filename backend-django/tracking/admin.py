from django.contrib import admin
from .models import UserProgress


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "media_item",
        "status",
        "current_season_number",
        "current_episode_number",
        "is_favorite",
        "updated_at",
    )
    list_filter = ("status", "is_favorite", "updated_at")
    search_fields = ("user__username", "media_item__title")
