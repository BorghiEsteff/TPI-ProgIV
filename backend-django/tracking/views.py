from django.db import transaction
from django.db.models import Q
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

    @action(detail=False, methods=["post"], url_path="verify-ownership")
    def verify_ownership(self, request):
        """Verifica en un solo llamado qué IDs de tracking pertenecen al usuario autenticado."""
        raw_ids = request.data.get("tracking_ids")
        if not isinstance(raw_ids, list):
            return Response(
                {"code": "INVALID_TRACKING_IDS", "message": "tracking_ids debe ser una lista de enteros."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parsed_ids = []
        for raw_id in raw_ids:
            try:
                parsed_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue
        if not parsed_ids:
            return Response({"owned_ids": []}, status=status.HTTP_200_OK)

        owned_ids = list(
            UserProgress.objects.filter(
                user=request.user,
                id__in=parsed_ids,
            )
            .filter(Q(deleted_at__isnull=True) | Q(needs_reconciliation=True))
            .values_list("id", flat=True)
        )
        return Response({"owned_ids": owned_ids}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="reconciliations")
    def reconciliations(self, request):
        """Lista entradas en conflicto por merge pendientes de reconciliación privada del usuario."""
        conflicts = (
            UserProgress.objects.filter(
                user=request.user,
                needs_reconciliation=True,
            )
            .select_related("media_item", "source_submission", "source_submission__resolved_media")
            .order_by("-updated_at")
        )
        items = []
        for entry in conflicts:
            serialized = self.get_serializer(entry).data
            target_media = (
                entry.source_submission.resolved_media
                if entry.source_submission and entry.source_submission.resolved_media_id
                else entry.media_item
            )
            canonical_data = None
            if target_media:
                canonical = UserProgress.objects.filter(
                    user=request.user,
                    media_item=target_media,
                    deleted_at__isnull=True,
                ).select_related("media_item", "source_submission").first()
                if canonical:
                    canonical_data = self.get_serializer(canonical).data
            serialized["canonical_entry"] = canonical_data
            items.append(serialized)
        return Response({"results": items, "count": len(items)}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reconcile")
    def reconcile(self, request, pk=None):
        """Resuelve una colisión de merge de forma explícita sin perder datos ni notas."""
        entry = get_object_or_404(
            UserProgress.objects.select_related("source_submission", "source_submission__resolved_media"),
            pk=pk,
            user=request.user,
            needs_reconciliation=True,
        )
        resolution = request.data.get("resolution", "keep_canonical")
        if resolution not in {"keep_canonical", "apply_archived_progress"}:
            return Response(
                {"code": "INVALID_RESOLUTION", "message": "Resolución inválida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            target_media = (
                entry.source_submission.resolved_media
                if entry.source_submission and entry.source_submission.resolved_media_id
                else entry.media_item
            )
            canonical = None
            if target_media:
                canonical = UserProgress.objects.filter(
                    user=request.user,
                    media_item=target_media,
                    deleted_at__isnull=True,
                ).first()

            if resolution == "apply_archived_progress" and canonical is not None:
                canonical.watch_platform = entry.watch_platform or canonical.watch_platform
                canonical.status = entry.status
                canonical.current_season_number = entry.current_season_number
                canonical.current_episode_number = entry.current_episode_number
                canonical.current_seconds = entry.current_seconds
                canonical.is_favorite = canonical.is_favorite or entry.is_favorite
                canonical.save()

            entry.needs_reconciliation = False
            entry.save(update_fields=["needs_reconciliation", "updated_at"])

        return Response(
            {
                "reconciled_id": entry.id,
                "resolution": resolution,
                "canonical_entry": self.get_serializer(canonical).data if canonical else None,
            },
            status=status.HTTP_200_OK,
        )
