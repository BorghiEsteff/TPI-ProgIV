from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
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
from .utils import find_duplicate_candidates, normalize_genre_name, validate_safe_poster_url


def _resolve_validated_genres(raw_genre_ids) -> list[Genre]:
    if not isinstance(raw_genre_ids, list) or len(raw_genre_ids) == 0:
        raise DRFValidationError({"genres": "Debes seleccionar entre 1 y 5 géneros válidos."})
    parsed_ids = []
    seen = set()
    for raw_id in raw_genre_ids:
        try:
            gid = int(raw_id)
        except (TypeError, ValueError):
            raise DRFValidationError({"genres": f"ID de género inválido: {raw_id}."})
        if gid not in seen:
            seen.add(gid)
            parsed_ids.append(gid)
    if len(parsed_ids) > 5:
        raise DRFValidationError({"genres": "Puedes asignar como máximo 5 géneros."})
    genres_by_id = {g.id: g for g in Genre.objects.filter(id__in=parsed_ids)}
    if len(genres_by_id) != len(parsed_ids):
        missing = [gid for gid in parsed_ids if gid not in genres_by_id]
        raise DRFValidationError({"genres": f"Los siguientes géneros no existen: {missing}."})
    return [genres_by_id[gid] for gid in parsed_ids]


class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]

    def _validate_unique_normalized_name(self, name: str, exclude_id: int | None = None) -> None:
        norm = normalize_genre_name(name)
        if not norm:
            raise DRFValidationError({"name": "El nombre del género no puede estar vacío."})
        qs = Genre.objects.all()
        if exclude_id is not None:
            qs = qs.exclude(pk=exclude_id)
        for existing in qs.only("id", "name"):
            if normalize_genre_name(existing.name) == norm:
                raise DRFValidationError({"name": f"Ya existe un género equivalente: '{existing.name}'."})

    def perform_create(self, serializer):
        self._validate_unique_normalized_name(serializer.validated_data.get("name", ""))
        serializer.save()

    def perform_update(self, serializer):
        if "name" in serializer.validated_data:
            self._validate_unique_normalized_name(
                serializer.validated_data.get("name", ""),
                exclude_id=serializer.instance.pk,
            )
        serializer.save()


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
        serializer = MediaSubmissionMineSerializer(
            self.get_queryset(), many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        serializer = MediaSubmissionMineSerializer(
            self.get_queryset(), many=True, context={"request": request}
        )
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

            confirm_new = bool(request.data.get("confirm_new", False))
            if not confirm_new:
                dup_candidates = [
                    c for c in find_duplicate_candidates(
                        title=title,
                        media_type=media_type,
                        release_year=request.data.get("release_year", submission.release_year),
                        exclude_submission_id=submission.id,
                    )
                    if c["source"] == "MEDIA_ITEM" and c["similarity"] >= 0.90
                ]
                if dup_candidates:
                    return Response(
                        {
                            "code": "POSSIBLE_DUPLICATE_EXISTS",
                            "message": "Ya existe una obra muy similar en el catálogo canónico. Confirma la creación con confirm_new=true o vincula con merge.",
                            "candidates": dup_candidates,
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

            poster_image = request.data.get("poster_image") or submission.effective_poster_url
            if poster_image and poster_image.startswith("/"):
                poster_image = request.build_absolute_uri(poster_image)
            elif poster_image and poster_image.startswith(("http://", "https://")):
                validate_safe_poster_url(poster_image)

            release_year = request.data.get("release_year", submission.release_year)
            country_of_origin = request.data.get("country_of_origin", submission.country_of_origin)
            synopsis = request.data.get("synopsis", "")
            producer = request.data.get("producer", "")
            tags = request.data.get("tags", submission.tags)

            if "genres" in request.data:
                resolved_genres = _resolve_validated_genres(request.data.get("genres"))
            else:
                resolved_genres = list(submission.genres.all())
                if not resolved_genres:
                    return Response(
                        {
                            "code": "MISSING_GENRES",
                            "message": "La obra debe tener entre 1 y 5 géneros válidos para publicarse.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

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

            media_item.genres.set(resolved_genres)

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

            if "genres" in request.data:
                resolved_genres = _resolve_validated_genres(request.data.get("genres"))
                target_media.genres.set(resolved_genres)

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
