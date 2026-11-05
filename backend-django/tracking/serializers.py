from rest_framework import serializers
from .models import UserProgress
from catalog.serializers import MediaItemSerializer


class UserProgressSerializer(serializers.ModelSerializer):
    media_item_detail = MediaItemSerializer(source="media_item", read_only=True)

    class Meta:
        model = UserProgress
        fields = [
            "id",
            "user",
            "media_item",
            "media_item_detail",
            "status",
            "started_at",
            "finished_at",
            "current_season_number",
            "current_episode_number",
            "current_seconds",
            "is_favorite",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "updated_at"]

    def validate_current_seconds(self, value):
        if value < 0:
            raise serializers.ValidationError("Los segundos acumulados no pueden ser negativos.")
        return value

    def validate(self, attrs):
        status_value = attrs.get("status")
        instance = getattr(self, "instance", None)
        current_status = instance.status if instance else None

        # Autocompletar started_at con el timestamp actual al pasar a 'VIENDO' si no vino provisto
        if status_value == UserProgress.WatchStatus.VIENDO or (
            current_status != UserProgress.WatchStatus.VIENDO and status_value == UserProgress.WatchStatus.VIENDO
        ):
            if not attrs.get("started_at") and (not instance or not instance.started_at):
                from django.utils import timezone
                attrs["started_at"] = timezone.now()

        # Autocompletar finished_at si se marca como 'VISTO'
        if status_value == UserProgress.WatchStatus.VISTO:
            if not attrs.get("finished_at") and (not instance or not instance.finished_at):
                from django.utils import timezone
                attrs["finished_at"] = timezone.now()

        return attrs
