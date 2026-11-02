from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import UserProgress
from .serializers import UserProgressSerializer


class UserProgressViewSet(viewsets.ModelViewSet):
    queryset = UserProgress.objects.select_related("user", "media_item").all()
    serializer_class = UserProgressSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["user", "media_item", "status", "is_favorite"]
    ordering_fields = ["updated_at", "started_at", "finished_at"]
    ordering = ["-updated_at"]

    def perform_create(self, serializer):
        # Si se encuentra autenticado, asociar automáticamente el usuario
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
