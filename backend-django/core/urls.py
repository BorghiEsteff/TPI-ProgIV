from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from graphene_django.views import GraphQLView

from catalog.views import (
    GenreViewSet,
    MediaItemViewSet,
    MediaSubmissionViewSet,
    AdminSubmissionViewSet,
    SeasonViewSet,
    EpisodeViewSet,
)
from tracking.views import UserProgressViewSet

router = DefaultRouter()
router.register(r"genres", GenreViewSet, basename="genre")
router.register(r"media", MediaItemViewSet, basename="media")
router.register(r"seasons", SeasonViewSet, basename="season")
router.register(r"episodes", EpisodeViewSet, basename="episode")
router.register(r"tracking", UserProgressViewSet, basename="tracking")
router.register(r"submissions", MediaSubmissionViewSet, basename="submission")
router.register(r"admin/submissions", AdminSubmissionViewSet, basename="admin-submission")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("users.urls")),
    path("api/v1/", include(router.urls)),
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=settings.DEBUG)), name="graphql"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
