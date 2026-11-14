from django.utils import timezone
from rest_framework import serializers
from .models import UserProgress
from catalog.serializers import MediaItemSerializer


class UserProgressSerializer(serializers.ModelSerializer):
    media_item_detail = MediaItemSerializer(source="media_item", read_only=True)
    display_title = serializers.SerializerMethodField()
    display_poster_url = serializers.SerializerMethodField()
    display_media_type = serializers.SerializerMethodField()
    display_release_year = serializers.SerializerMethodField()
    submission_status = serializers.SerializerMethodField()
    submission_rejection_reason = serializers.SerializerMethodField()
    is_published = serializers.SerializerMethodField()

    class Meta:
        model = UserProgress
        fields = [
            "id",
            "user",
            "media_item",
            "source_submission",
            "media_item_detail",
            "watch_platform",
            "status",
            "started_at",
            "finished_at",
            "current_season_number",
            "current_episode_number",
            "current_seconds",
            "is_favorite",
            "needs_reconciliation",
            "updated_at",
            "display_title",
            "display_poster_url",
            "display_media_type",
            "display_release_year",
            "submission_status",
            "submission_rejection_reason",
            "is_published",
        ]
        read_only_fields = [
            "id",
            "user",
            "source_submission",
            "needs_reconciliation",
            "updated_at",
        ]

    def get_display_title(self, obj):
        return obj.display_title

    def get_display_poster_url(self, obj):
        if obj.media_item:
            return obj.media_item.poster_image or ""
        if obj.source_submission:
            return obj.source_submission.effective_poster_url
        return ""

    def get_display_media_type(self, obj):
        if obj.media_item:
            return obj.media_item.media_type
        if obj.source_submission:
            return obj.source_submission.media_type
        return ""

    def get_display_release_year(self, obj):
        if obj.media_item:
            return obj.media_item.release_year
        if obj.source_submission:
            return obj.source_submission.release_year
        return None

    def get_submission_status(self, obj):
        if obj.source_submission:
            return obj.source_submission.status
        return None

    def get_submission_rejection_reason(self, obj):
        if obj.source_submission and obj.source_submission.status == "REJECTED":
            return obj.source_submission.rejection_reason
        return ""

    def get_is_published(self, obj):
        return bool(obj.media_item_id and obj.media_item and obj.media_item.is_active)

    def validate_current_seconds(self, value):
        if value < 0:
            raise serializers.ValidationError("Los segundos acumulados no pueden ser negativos.")
        return value

    def validate_current_season_number(self, value):
        if value < 1:
            raise serializers.ValidationError("La temporada debe ser un entero positivo.")
        return value

    def validate_current_episode_number(self, value):
        if value < 1:
            raise serializers.ValidationError("El episodio debe ser un entero positivo.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if not instance and not attrs.get("media_item"):
            raise serializers.ValidationError(
                {"media_item": "Debes indicar una obra publicada del catálogo."}
            )
        media_item = attrs.get("media_item")
        if media_item and not media_item.is_active:
            raise serializers.ValidationError(
                {"media_item": "La obra seleccionada no está publicada en el catálogo."}
            )

        status_value = attrs.get("status")
        if status_value == UserProgress.WatchStatus.VIENDO:
            if not attrs.get("started_at") and (not instance or not instance.started_at):
                attrs["started_at"] = timezone.now()

        if status_value == UserProgress.WatchStatus.VISTO:
            if not attrs.get("finished_at") and (not instance or not instance.finished_at):
                attrs["finished_at"] = timezone.now()

        return attrs
