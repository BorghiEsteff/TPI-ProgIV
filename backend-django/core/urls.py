from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from catalog.views import (
    GenreViewSet,
    MediaItemViewSet,
    SeasonViewSet,
    EpisodeViewSet,
)
from tracking.views import UserProgressViewSet

# Registro de routers para la API REST v1
router = DefaultRouter()
router.register(r"genres", GenreViewSet, basename="genre")
router.register(r"media", MediaItemViewSet, basename="media")
router.register(r"seasons", SeasonViewSet, basename="season")
router.register(r"episodes", EpisodeViewSet, basename="episode")
router.register(r"tracking", UserProgressViewSet, basename="tracking")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Autenticación y Autorización Centralizada (TP 2)
    path("api/v1/auth/", include("users.urls")),
    # API endpoints de catálogo y tracking
    path("api/v1/", include(router.urls)),
    # Documentación OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
