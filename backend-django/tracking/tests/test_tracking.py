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

    def test_update_preserves_exact_seconds_when_not_sent(self):
        """P0.4: Editar plataforma u otro campo sin reenviar current_seconds preserva segundos exactos (ej: 01:24:35 = 5075)."""
        progress = UserProgress.objects.create(
            user=self.user,
            media_item=self.pelicula,
            status=UserProgress.WatchStatus.VIENDO,
            current_seconds=5075,
            watch_platform="Netflix",
        )
        serializer = UserProgressSerializer(
            instance=progress,
            data={"watch_platform": "Disney+"},
            partial=True,
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.watch_platform == "Disney+"
        assert updated.current_seconds == 5075

    def test_updating_already_visto_series_does_not_rewrite_episode_history(self):
        """P0.4: Editar plataforma o tiempo en una serie ya VISTO no duplica ni reescribe episode_history."""
        original_watched_at = "2026-10-01T12:00:00+00:00"
        initial_history = [
            {
                "season": 1,
                "episode": 5,
                "status": "VISTO",
                "seconds": 2700,
                "watched_at": original_watched_at,
            }
        ]
        progress = UserProgress.objects.create(
            user=self.user,
            media_item=self.serie,
            status=UserProgress.WatchStatus.VISTO,
            current_season_number=1,
            current_episode_number=5,
            current_seconds=2700,
            watch_platform="Netflix",
            finished_at=timezone.now(),
            episode_history=initial_history,
        )
        serializer = UserProgressSerializer(
            instance=progress,
            data={"watch_platform": "Prime Video"},
            partial=True,
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.watch_platform == "Prime Video"
        assert updated.episode_history == initial_history

    def test_reverting_visto_to_viendo_clears_finished_at_and_keeps_history(self):
        """P0.4: Pasar de VISTO a VIENDO limpia finished_at pero conserva episode_history."""
        initial_history = [
            {
                "season": 1,
                "episode": 3,
                "status": "VISTO",
                "seconds": 1800,
                "watched_at": "2026-10-01T12:00:00+00:00",
            }
        ]
        progress = UserProgress.objects.create(
            user=self.user,
            media_item=self.serie,
            status=UserProgress.WatchStatus.VISTO,
            current_season_number=1,
            current_episode_number=3,
            current_seconds=1800,
            finished_at=timezone.now(),
            episode_history=initial_history,
        )
        serializer = UserProgressSerializer(
            instance=progress,
            data={"status": UserProgress.WatchStatus.VIENDO},
            partial=True,
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.status == UserProgress.WatchStatus.VIENDO
        assert updated.finished_at is None
        assert updated.episode_history == initial_history
