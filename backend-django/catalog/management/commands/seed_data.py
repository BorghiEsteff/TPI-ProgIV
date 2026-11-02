from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from catalog.models import Genre, MediaItem, Season, Episode
from tracking.models import UserProgress
from datetime import date


class Command(BaseCommand):
    help = "Carga datos iniciales (seed) de demostración para el catálogo y progreso de CineTrack"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando la carga de datos iniciales..."))

        # 1. Crear o recuperar superusuario / usuario de prueba
        user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@cinetrack.local",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            user.set_password("admin123")
            user.save()
            self.stdout.write(self.style.SUCCESS("Usuario demo 'admin' creado (password: admin123)."))

        # 2. Géneros requeridos (mínimo 3)
        genres_names = ["Ciencia Ficción", "Drama", "Acción", "Suspenso", "Fantasía"]
        genres = {}
        for name in genres_names:
            genre_obj, _ = Genre.objects.get_or_create(name=name)
            genres[name] = genre_obj
        self.stdout.write(self.style.SUCCESS(f"{len(genres)} géneros cargados con éxito."))

        # 3. Series de demostración (mínimo 2 series con temporadas y episodios)
        # Serie 1: Stranger Things
        st, created = MediaItem.objects.get_or_create(
            title="Stranger Things",
            defaults={
                "media_type": MediaItem.MediaType.SERIE,
                "release_date": date(2016, 7, 15),
                "producer": "Netflix / 21 Laps Entertainment",
                "poster_image": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
                "synopsis": "A raíz de la desaparición de un niño, un pueblo desvela un misterio relacionado con experimentos secretos.",
                "is_active": True,
            },
        )
        st.genres.set([genres["Ciencia Ficción"], genres["Drama"], genres["Suspenso"]])

        st_s1, _ = Season.objects.get_or_create(
            media_item=st, season_number=1, defaults={"episode_count": 8}
        )
        st_episodes_data = [
            (1, "Capítulo uno: La desaparición de Will Byers", 48),
            (2, "Capítulo dos: La loca de la calle Maple", 55),
            (3, "Capítulo tres: Todo bien", 51),
        ]
        for ep_num, title, duration in st_episodes_data:
            Episode.objects.get_or_create(
                season=st_s1,
                episode_number=ep_num,
                defaults={"title": title, "duration_minutes": duration},
            )

        # Serie 2: Breaking Bad
        bb, created = MediaItem.objects.get_or_create(
            title="Breaking Bad",
            defaults={
                "media_type": MediaItem.MediaType.SERIE,
                "release_date": date(2008, 1, 20),
                "producer": "AMC / Sony Pictures Television",
                "poster_image": "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
                "synopsis": "Un profesor de química diagnosticado con cáncer inoperable recurre a la fabricación de metanfetamina para asegurar el futuro de su familia.",
                "is_active": True,
            },
        )
        bb.genres.set([genres["Drama"], genres["Suspenso"]])

        bb_s1, _ = Season.objects.get_or_create(
            media_item=bb, season_number=1, defaults={"episode_count": 7}
        )
        bb_episodes_data = [
            (1, "Piloto", 58),
            (2, "El gato está en la bolsa...", 48),
            (3, "...Y la bolsa está en el río", 48),
        ]
        for ep_num, title, duration in bb_episodes_data:
            Episode.objects.get_or_create(
                season=bb_s1,
                episode_number=ep_num,
                defaults={"title": title, "duration_minutes": duration},
            )

        # Película adicional para demostrar validación de dominio
        matrix, _ = MediaItem.objects.get_or_create(
            title="The Matrix",
            defaults={
                "media_type": MediaItem.MediaType.PELICULA,
                "release_date": date(1999, 3, 31),
                "producer": "Warner Bros. / Village Roadshow",
                "poster_image": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
                "synopsis": "Un hacker descubre la verdadera naturaleza de su realidad y su rol en la guerra contra sus controladores.",
                "is_active": True,
            },
        )
        matrix.genres.set([genres["Ciencia Ficción"], genres["Acción"]])

        # 4. Progreso inicial del usuario
        UserProgress.objects.get_or_create(
            user=user,
            media_item=st,
            defaults={
                "status": UserProgress.WatchStatus.VIENDO,
                "current_season_number": 1,
                "current_episode_number": 2,
                "current_seconds": 1240,
                "is_favorite": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("¡Carga de seed completada exitosamente!"))

