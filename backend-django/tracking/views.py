from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import UserProgress
from .serializers import UserProgressSerializer


class UserProgressViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión del progreso de visualización de contenidos.
    Protegido: Solo usuarios autenticados pueden interactuar con este endpoint.
    Cada usuario únicamente consulta, crea o actualiza su propio registro de progreso.
    """
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["media_item", "status", "is_favorite"]
    ordering_fields = ["updated_at", "started_at", "finished_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        # Restricción estricta de objeto: un usuario solo ve su propio progreso
        user = self.request.user
        if not user or not user.is_authenticated:
            return UserProgress.objects.none()
        return UserProgress.objects.filter(user=user).select_related("media_item")

    def perform_create(self, serializer):
        # Asignar forzosamente el usuario de la sesión/token
        serializer.save(user=self.request.user)
