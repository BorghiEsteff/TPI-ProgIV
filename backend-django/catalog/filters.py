import django_filters
from .models import MediaItem


class MediaItemFilter(django_filters.FilterSet):
    title = django_filters.CharFilter(field_name="title", lookup_expr="icontains")
    producer = django_filters.CharFilter(field_name="producer", lookup_expr="icontains")
    genres = django_filters.BaseInFilter(field_name="genres__id", distinct=True)
    media_type = django_filters.ChoiceFilter(choices=MediaItem.MediaType.choices)

    class Meta:
        model = MediaItem
        fields = ["title", "producer", "genres", "media_type", "is_active"]

