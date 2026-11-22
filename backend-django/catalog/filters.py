import django_filters
from .models import MediaItem
from .search import normalize_search_text


class MediaItemFilter(django_filters.FilterSet):
    title = django_filters.CharFilter(method="filter_normalized_title")
    producer = django_filters.CharFilter(method="filter_normalized_producer")
    genres = django_filters.BaseInFilter(field_name="genres__id", distinct=True)
    media_type = django_filters.ChoiceFilter(choices=MediaItem.MediaType.choices)

    class Meta:
        model = MediaItem
        fields = ["title", "producer", "genres", "media_type", "is_active"]

    def filter_normalized_title(self, queryset, _name, value):
        norm = normalize_search_text(value)
        if not norm:
            return queryset
        matched_ids = [
            pk for pk, t in queryset.values_list("id", "title")
            if norm in normalize_search_text(t)
        ]
        return queryset.filter(id__in=matched_ids)

    def filter_normalized_producer(self, queryset, _name, value):
        norm = normalize_search_text(value)
        if not norm:
            return queryset
        matched_ids = [
            pk for pk, p in queryset.values_list("id", "producer")
            if norm in normalize_search_text(p)
        ]
        return queryset.filter(id__in=matched_ids)

