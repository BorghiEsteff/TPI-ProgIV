from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from tracking.models import UserProgress
from .models import Genre, MediaItem, MediaSubmission, Season, Episode
from .permissions import IsAdminOrReadOnly, IsAdminRole, is_admin_user
from .serializers import (
    GenreSerializer,
    MediaItemSerializer,
    MediaSubmissionCreateSerializer,
    MediaSubmissionMineSerializer,
    AdminSubmissionSerializer,
    SeasonSerializer,
    EpisodeSerializer,
)
from .filters import MediaItemFilter
from .utils import find_duplicate_candidates, validate_safe_poster_url


class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]


class MediaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = MediaItemFilter
    search_fields = ["title", "producer", "synopsis", "country_of_origin"]
    ordering_fields = ["release_date", "release_year", "title"]
    ordering = ["-release_date", "title"]

    def get_queryset(self):
        qs = MediaItem.objects.prefetch_related("genres", "seasons__episodes")
        if (
            is_admin_user(getattr(self.request, "user", None))
            and self.request.query_params.get("include_inactive") == "true"
        ):
            return qs.all()
        return qs.filter(is_active=True)


class SeasonViewSet(viewsets.ModelViewSet):
    serializer_class = SeasonSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["media_item", "season_number"]
    ordering_fields = ["season_number"]
    ordering = ["season_number"]

    def get_queryset(self):
        qs = Season.objects.select_related("media_item").prefetch_related("episodes")
        if is_admin_user(getattr(self.request, "user", None)):
            return qs.all()
        return qs.filter(media_item__is_active=True)


class EpisodeViewSet(viewsets.ModelViewSet):
    serializer_class = EpisodeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["season", "episode_number"]
    ordering_fields = ["episode_number", "duration_minutes"]
    ordering = ["episode_number"]

    def get_queryset(self):
        qs = Episode.objects.select_related("season__media_item")
        if is_admin_user(getattr(self.request, "user", None)):
            return qs.all()
        return qs.filter(season__media_item__is_active=True)


class MediaSubmissionViewSet(viewsets.GenericViewSet):
    """Permite a usuarias autenticadas proponer obras nuevas y consultar sus propias propuestas."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MediaSubmissionCreateSerializer

    def get_queryset(self):
        return MediaSubmission.objects.filter(submitted_by=self.request.user)

    def list(self, request):
        serializer = MediaSubmissionMineSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        serializer = MediaSubmissionMineSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = MediaSubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            submission = serializer.save(
                submitted_by=request.user,
                status=MediaSubmission.Status.PENDING,
            )
            progress = UserProgress.objects.create(
                user=request.user,
                source_submission=submission,
                watch_platform=submission.submitted_platform,
                status=UserProgress.WatchStatus.PENDIENTE,
            )

        possible_duplicates = find_duplicate_candidates(
            title=submission.title,
            media_type=submission.media_type,
            release_year=submission.release_year,
            exclude_submission_id=submission.id,
        )

        return Response(
            {
                "submission_id": submission.id,
                "status": submission.status,
                "tracking_entry_id": progress.id,
                "visible_in_public_catalog": False,
                "possible_duplicates": possible_duplicates,
            },
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, pk=None):
        submission = get_object_or_404(self.get_queryset(), pk=pk)
        if submission.status != MediaSubmission.Status.PENDING:
            return Response(
                {
                    "code": "SUBMISSION_ALREADY_RESOLVED",
                    "message": "No puedes modificar una propuesta que ya fue resuelta.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = MediaSubmissionCreateSerializer(
            submission, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()

        possible_duplicates = find_duplicate_candidates(
            title=submission.title,
            media_type=submission.media_type,
            release_year=submission.release_year,
            exclude_submission_id=submission.id,
        )
        data = MediaSubmissionMineSerializer(submission).data
        data["possible_duplicates"] = possible_duplicates
        return Response(data, status=status.HTTP_200_OK)


class AdminSubmissionViewSet(viewsets.GenericViewSet):
    """Cola de moderación exclusiva para ADMIN (DTO sanitizado sin notas ni ratings)."""

    permission_classes = [IsAdminRole]
    serializer_class = AdminSubmissionSerializer

    def get_queryset(self):
        qs = MediaSubmission.objects.all()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs

    def list(self, request):
        serializer = AdminSubmissionSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        submission = get_object_or_404(MediaSubmission, pk=pk)
        return Response(AdminSubmissionSerializer(submission).data)

    @action(detail=True, methods=["get"], url_path="candidates")
    def candidates(self, request, pk=None):
        submission = get_object_or_404(MediaSubmission, pk=pk)
        matches = find_duplicate_candidates(
            title=submission.title,
            media_type=submission.media_type,
            release_year=submission.release_year,
            exclude_submission_id=submission.id,
        )
        return Response({"submission_id": submission.id, "candidates": matches})

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        with transaction.atomic():
            submission = get_object_or_404(
                MediaSubmission.objects.select_for_update(), pk=pk
            )
            if submission.status != MediaSubmission.Status.PENDING:
                return Response(
                    {
                        "code": "SUBMISSION_ALREADY_RESOLVED",
                        "message": "Esta propuesta ya fue resuelta anteriormente.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            title = " ".join((request.data.get("title") or submission.title).split())
            media_type = request.data.get("media_type") or submission.media_type
            poster_image = request.data.get("poster_image") or submission.effective_poster_url
            if poster_image and poster_image.startswith(("http://", "https://")):
                validate_safe_poster_url(poster_image)

            release_year = request.data.get("release_year", submission.release_year)
            country_of_origin = request.data.get("country_of_origin", submission.country_of_origin)
            synopsis = request.data.get("synopsis", "")
            producer = request.data.get("producer", "")
            tags = request.data.get("tags", submission.tags)

            media_item = MediaItem.objects.create(
                title=title,
                media_type=media_type,
                poster_image=poster_image,
                release_year=release_year,
                country_of_origin=country_of_origin,
                synopsis=synopsis,
                producer=producer,
                tags=tags if isinstance(tags, list) else [],
                is_active=True,
            )

            genre_ids = request.data.get("genres")
            if isinstance(genre_ids, list) and genre_ids:
                media_item.genres.set(Genre.objects.filter(id__in=genre_ids))

            submission.status = MediaSubmission.Status.PUBLISHED
            submission.resolved_media = media_item
            submission.resolved_at = timezone.now()
            submission.resolved_by = request.user
            submission.save()

            UserProgress.objects.filter(
                source_submission=submission, deleted_at__isnull=True
            ).update(media_item=media_item, source_submission=None)

        return Response(
            {
                "submission_id": submission.id,
                "status": submission.status,
                "media_item_id": media_item.id,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="merge")
    def merge(self, request, pk=None):
        media_item_id = request.data.get("media_item_id")
        if not media_item_id:
            return Response(
                {"code": "MISSING_MEDIA_ITEM_ID", "message": "Se requiere media_item_id para vincular."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            submission = get_object_or_404(
                MediaSubmission.objects.select_for_update(), pk=pk
            )
            if submission.status != MediaSubmission.Status.PENDING:
                return Response(
                    {
                        "code": "SUBMISSION_ALREADY_RESOLVED",
                        "message": "Esta propuesta ya fue resuelta anteriormente.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            target_media = get_object_or_404(MediaItem, pk=media_item_id, is_active=True)

            submission.status = MediaSubmission.Status.MERGED
            submission.resolved_media = target_media
            submission.resolved_at = timezone.now()
            submission.resolved_by = request.user
            submission.save()

            entries = list(
                UserProgress.objects.select_for_update().filter(
                    source_submission=submission, deleted_at__isnull=True
                )
            )
            migrated_count = 0
            reconciliation_conflicts = 0

            for entry in entries:
                has_canonical = UserProgress.objects.filter(
                    user=entry.user, media_item=target_media, deleted_at__isnull=True
                ).exists()
                if has_canonical:
                    # Conservar ambas sin sobreescribir notas privadas
                    entry.needs_reconciliation = True
                    entry.deleted_at = timezone.now()
                    entry.save(update_fields=["needs_reconciliation", "deleted_at", "updated_at"])
                    reconciliation_conflicts += 1
                else:
                    entry.media_item = target_media
                    entry.source_submission = None
                    entry.save(update_fields=["media_item", "source_submission", "updated_at"])
                    migrated_count += 1

        return Response(
            {
                "submission_id": submission.id,
                "status": submission.status,
                "media_item_id": target_media.id,
                "migrated_entries": migrated_count,
                "reconciliation_conflicts": reconciliation_conflicts,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        reason = " ".join((request.data.get("rejection_reason") or "").split())
        if not reason:
            return Response(
                {"code": "MISSING_REASON", "message": "Debes indicar un motivo breve de rechazo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            submission = get_object_or_404(
                MediaSubmission.objects.select_for_update(), pk=pk
            )
            if submission.status != MediaSubmission.Status.PENDING:
                return Response(
                    {
                        "code": "SUBMISSION_ALREADY_RESOLVED",
                        "message": "Esta propuesta ya fue resuelta anteriormente.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            submission.status = MediaSubmission.Status.REJECTED
            submission.rejection_reason = reason
            submission.resolved_at = timezone.now()
            submission.resolved_by = request.user
            submission.save()

        return Response(
            {
                "submission_id": submission.id,
                "status": submission.status,
                "rejection_reason": submission.rejection_reason,
            },
            status=status.HTTP_200_OK,
        )
