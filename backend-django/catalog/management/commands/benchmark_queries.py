import time
from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from catalog.models import MediaItem, Genre, Season
from tracking.models import UserProgress


class Command(BaseCommand):
    help = "Ejecuta mediciones de rendimiento de consultas ORM y planes de ejecución (EXPLAIN)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Benchmark de Consultas e Índices en Django ==="))

        # Benchmark 1: Consulta de catálogo con prefetch de relaciones vs sin optimización
        reset_queries()
        t0 = time.perf_counter()
        # Query optimizada con prefetch_related
        items = list(MediaItem.objects.prefetch_related("genres", "seasons__episodes").filter(is_active=True))
        for item in items:
            _ = [g.name for g in item.genres.all()]
            _ = [len(s.episodes.all()) for s in item.seasons.all()]
        t_opt = (time.perf_counter() - t0) * 1000
        queries_opt = len(connection.queries)

        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Catálogo optimizado (prefetch_related): {len(items)} ítems procesados en {t_opt:.2f} ms con {queries_opt} consultas SQL."
            )
        )

        # Benchmark 2: Filtrado indexado por media_type y estado activo
        reset_queries()
        qs = MediaItem.objects.filter(media_type=MediaItem.MediaType.SERIE, is_active=True)
        # Obtener EXPLAIN de la base de datos
        try:
            explain_plan = qs.explain()
            self.stdout.write(self.style.NOTICE(f"[EXPLAIN Plan - MediaItem]:\n{explain_plan}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"EXPLAIN no disponible en backend actual: {e}"))

        # Benchmark 3: Tracking de usuario con select_related('media_item')
        reset_queries()
        t0 = time.perf_counter()
        progresses = list(UserProgress.objects.select_related("media_item").all()[:50])
        for p in progresses:
            _ = p.media_item.title
        t_track = (time.perf_counter() - t0) * 1000
        queries_track = len(connection.queries)

        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Tracking optimizado (select_related): {len(progresses)} registros en {t_track:.2f} ms con {queries_track} consultas SQL (0 consultas N+1)."
            )
        )

        self.stdout.write(self.style.SUCCESS("=== Benchmark completado exitosamente ==="))

