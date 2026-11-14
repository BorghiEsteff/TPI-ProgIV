from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from catalog.models import MediaItem
from .models import UserProgress
from .serializers import UserProgressSerializer


class UserProgressViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el diario privado del usuario (Mi CineTrack).
    Cada usuario únicamente consulta, crea, edita o elimina sus propias entradas.
    """

    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["media_item", "status", "is_favorite"]
    ordering_fields = ["updated_at", "started_at", "finished_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return UserProgress.objects.none()
        return UserProgress.objects.filter(
            user=user, deleted_at__isnull=True
        ).select_related("media_item", "source_submission")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media_item = serializer.validated_data.get("media_item")

        existing = UserProgress.objects.filter(
            user=request.user, media_item=media_item, deleted_at__isnull=True
        ).first()
        if existing:
            return Response(
                self.get_serializer(existing).data, status=status.HTTP_200_OK
            )

        serializer.save(user=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])

    @action(detail=True, methods=["post"], url_path="link-media")
    def link_media(self, request, pk=None):
        """Permite a la dueña vincular manualmente una entrada provisional (p.ej. rechazada) a una ficha publicada."""
        entry = self.get_object()
        media_item_id = request.data.get("media_item_id")
        if not media_item_id:
            return Response(
                {"code": "MISSING_MEDIA_ITEM_ID", "message": "Se requiere media_item_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_media = get_object_or_404(MediaItem, pk=media_item_id, is_active=True)
        already_exists = UserProgress.objects.filter(
            user=request.user, media_item=target_media, deleted_at__isnull=True
        ).exclude(pk=entry.pk).exists()
        if already_exists:
            return Response(
                {
                    "code": "DUPLICATE_CANONICAL_ENTRY",
                    "message": "Ya tienes esta obra en tu diario. Conserva tu nota actual para evitar sobrescritura.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        entry.media_item = target_media
        entry.source_submission = None
        entry.needs_reconciliation = False
        entry.save()
        return Response(self.get_serializer(entry).data, status=status.HTTP_200_OK)
