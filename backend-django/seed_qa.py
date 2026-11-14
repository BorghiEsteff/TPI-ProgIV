import os
import sys
import django

if os.getenv("SQLITE_DB_NAME") != "db.qa.sqlite3":
    print("ERROR: seed_qa.py solo puede ejecutarse con SQLITE_DB_NAME=db.qa.sqlite3", file=sys.stderr)
    sys.exit(1)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from datetime import date
from django.contrib.auth import get_user_model
from catalog.models import Genre, MediaItem, Season, Episode

User = get_user_model()

qa_accounts = [
    ("qa_admin@cinetrack.local", "qa_admin", "QaAdminPass123!", "ADMIN"),
    ("qa_a@cinetrack.local", "qa_user_a", "QaUserPass123!", "USER"),
    ("qa_b@cinetrack.local", "qa_user_b", "QaUserPass123!", "USER"),
    ("qa_c@cinetrack.local", "qa_user_c", "QaUserPass123!", "USER"),
]

for email, username, password, role in qa_accounts:
    user, created = User.objects.get_or_create(
        email=email,
        defaults={"username": username, "role": role, "is_staff": role == "ADMIN"},
    )
    user.role = role
    user.is_staff = role == "ADMIN"
    user.set_password(password)
    user.save()

scifi, _ = Genre.objects.get_or_create(name="Ciencia Ficción")
romance, _ = Genre.objects.get_or_create(name="Romance")
drama, _ = Genre.objects.get_or_create(name="Drama")

blade, _ = MediaItem.objects.get_or_create(
    title="Blade Runner 2049",
    defaults={
        "media_type": MediaItem.MediaType.PELICULA,
        "release_date": date(2017, 10, 6),
        "release_year": 2017,
        "country_of_origin": "US",
        "producer": "Warner Bros",
        "poster_image": "https://via.placeholder.com/300x450?text=Blade+Runner+2049",
        "synopsis": "Un nuevo blade runner descubre un secreto enterrado.",
        "is_active": True,
    },
)
blade.genres.add(scifi)

st, _ = MediaItem.objects.get_or_create(
    title="Stranger Things",
    defaults={
        "media_type": MediaItem.MediaType.SERIE,
        "release_date": date(2016, 7, 15),
        "release_year": 2016,
        "country_of_origin": "US",
        "producer": "Netflix",
        "poster_image": "https://via.placeholder.com/300x450?text=Stranger+Things",
        "synopsis": "Misterios sobrenaturales en Hawkins.",
        "is_active": True,
    },
)
st.genres.add(scifi, drama)
s2, _ = Season.objects.get_or_create(media_item=st, season_number=2, defaults={"episode_count": 9})
Episode.objects.get_or_create(season=s2, episode_number=4, defaults={"title": "Will the Wise", "duration_minutes": 46})

kdrama, _ = MediaItem.objects.get_or_create(
    title="Amor en Seúl 2026",
    defaults={
        "media_type": MediaItem.MediaType.SERIE,
        "release_date": date(2026, 2, 14),
        "release_year": 2026,
        "country_of_origin": "KR",
        "producer": "Studio Dragon",
        "poster_image": "https://via.placeholder.com/300x450?text=Amor+en+Seul+2026",
        "synopsis": "Un romance coreano ambientado en Seúl en 2026.",
        "is_active": True,
    },
)
kdrama.genres.add(romance, drama)

MediaItem.objects.get_or_create(
    title="Obra Oculta QA",
    defaults={
        "media_type": MediaItem.MediaType.PELICULA,
        "release_year": 2025,
        "synopsis": "No debe verse en catálogo público.",
        "is_active": False,
    },
)

print("QA_SEED_OK")
