import pytest
from datetime import date
from django.contrib.auth import get_user_model
from django.utils import timezone
from catalog.models import Genre, MediaItem
from tracking.models import UserProgress
from tracking.serializers import UserProgressSerializer
from catalog.serializers import SeasonSerializer

User = get_user_model()


@pytest.mark.django_db
class TestCineTrackModelsAndSerializers:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.user = User.objects.create_user(
            email="cinelover@cinetrack.local",
            username="cinelover",
            password="secretpassword123",
        )
        self.genre_scifi = Genre.objects.create(name="Sci-Fi")

        # Serie
        self.serie = MediaItem.objects.create(
            title="Dark",
            media_type=MediaItem.MediaType.SERIE,
            release_date=date(2017, 12, 1),
            producer="Wiedemann & Berg Television",
            synopsis="La desaparición de dos niños en el pueblo alemán de Winden.",
        )
        self.serie.genres.add(self.genre_scifi)

        # Película
        self.pelicula = MediaItem.objects.create(
            title="Inception",
            media_type=MediaItem.MediaType.PELICULA,
            release_date=date(2010, 7, 16),
            producer="Syncopy / Warner Bros.",
            synopsis="Un ladrón que roba secretos corporativos a través del sueño.",
        )

    def test_pelicula_cannot_have_seasons(self):
        """Regla de Negocio: Validar que si media_type es 'PELICULA', no se puedan asociar temporadas."""
        data = {
            "media_item": self.pelicula.id,
            "season_number": 1,
            "episode_count": 5,
        }
        serializer = SeasonSerializer(data=data)
        assert not serializer.is_valid()
        assert "media_item" in serializer.errors

    def test_tracking_current_seconds_cannot_be_negative(self):
        """Regla de Negocio: Validar que current_seconds no sea negativo."""
        data = {
            "media_item": self.serie.id,
            "status": UserProgress.WatchStatus.PENDIENTE,
            "current_seconds": -120,
        }
        serializer = UserProgressSerializer(data=data)
        assert not serializer.is_valid()
        assert "current_seconds" in serializer.errors

    def test_tracking_started_at_autocomplete_on_watching(self):
        """Regla de Negocio: Autocompletar started_at con el timestamp actual al pasar a 'VIENDO' si estaba vacío."""
        data = {
            "media_item": self.serie.id,
            "status": UserProgress.WatchStatus.VIENDO,
            "current_seconds": 300,
        }
        serializer = UserProgressSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        instance = serializer.save(user=self.user)

        assert instance.status == UserProgress.WatchStatus.VIENDO
        assert instance.started_at is not None
        assert (timezone.now() - instance.started_at).total_seconds() < 5

    def test_user_progress_unique_together_constraint(self):
        """Regla de Base de Datos: Un usuario solo puede tener un registro de progreso por contenido."""
        UserProgress.objects.create(
            user=self.user,
            media_item=self.serie,
            status=UserProgress.WatchStatus.VIENDO,
            current_seconds=500,
        )

        with pytest.raises(Exception):
            UserProgress.objects.create(
                user=self.user,
                media_item=self.serie,
                status=UserProgress.WatchStatus.VISTO,
                current_seconds=1500,
            )
