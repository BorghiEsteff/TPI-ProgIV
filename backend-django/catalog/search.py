import re
import unicodedata
from difflib import SequenceMatcher
from django.db.models import Case, IntegerField, Value, When

MAX_QUERY_CHARS = 200

_BRAND_PATTERNS = (
    (re.compile(r"\bdisney\s*(?:\+|plus)(?!\w)", re.IGNORECASE), "disneyplus"),
    (re.compile(r"\bapple\s*tv\s*(?:\+|plus)(?!\w)", re.IGNORECASE), "appletvplus"),
    (re.compile(r"\bparamount\s*(?:\+|plus)(?!\w)", re.IGNORECASE), "paramountplus"),
    (re.compile(r"\bstar\s*(?:\+|plus)(?!\w)", re.IGNORECASE), "starplus"),
    (re.compile(r"\bvix\s*(?:\+|plus)(?!\w)", re.IGNORECASE), "vixplus"),
)


def normalize_search_text(text: str | None, *, max_len: int = MAX_QUERY_CHARS) -> str:
    """
    Normaliza texto para búsqueda tolerante a tildes, puntuación y variantes de marcas (+/plus).
    Preserva la letra 'ñ' de forma consistente y mantiene intacto normalize_title() para duplicados.
    """
    if not text:
        return ""
    raw = str(text)[:max_len].strip()
    if not raw:
        return ""

    # Preservar ñ/Ñ antes de descomponer diacríticos
    protected = raw.replace("ñ", "\uffff").replace("Ñ", "\uffff")
    decomposed = unicodedata.normalize("NFKD", protected)
    without_diacritics = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    restored = without_diacritics.replace("\uffff", "ñ").casefold()

    for pattern, replacement in _BRAND_PATTERNS:
        restored = pattern.sub(f" {replacement} ", restored)

    cleaned = re.sub(r"[^\w\s]", " ", restored)
    return re.sub(r"\s+", " ", cleaned).strip()


def _all_tokens_present(q_tokens: list[str], target_norm: str) -> bool:
    if not q_tokens or not target_norm:
        return False
    target_tokens = target_norm.split()
    return all(any(qt in tt for tt in target_tokens) for qt in q_tokens)


def _best_fuzzy_ratio(q_norm: str, q_tokens: list[str], target_norm: str) -> float:
    if not q_norm or not target_norm:
        return 0.0
    compact = q_norm.replace(" ", "")
    if len(compact) <= 2 or compact.isdigit():
        return 0.0

    best = SequenceMatcher(None, q_norm, target_norm).ratio()
    target_tokens = target_norm.split()
    n_q = len(q_tokens)

    if n_q == 1 and target_tokens:
        qt = q_tokens[0]
        for tt in target_tokens:
            if len(qt) >= 4 and len(tt) >= 4:
                best = max(best, SequenceMatcher(None, qt, tt).ratio())
    elif n_q > 1 and len(target_tokens) >= n_q:
        for i in range(len(target_tokens) - n_q + 1):
            window = " ".join(target_tokens[i : i + n_q])
            best = max(best, SequenceMatcher(None, q_norm, window).ratio())

    return best


def score_media_candidate(
    q_norm: str,
    q_tokens: list[str],
    title_norm: str,
    producer_norm: str,
    country_norm: str,
    synopsis_norm: str,
) -> int:
    """
    Calcula puntaje jerárquico determinista:
    Tier 1 (1000): coincidencia exacta normalizada de título.
    Tier 2 (720-850): prefijo, subcadena o todos los tokens en título.
    Tier 3 (460-650): coincidencia en productora, país o sinopsis.
    Tier 4 (200-299): fuzzy moderado solo en título/productora cuando no hay match fuerte.
    """
    if title_norm == q_norm:
        return 1000
    if title_norm.startswith(q_norm):
        return 850
    if q_norm in title_norm:
        return 780
    if _all_tokens_present(q_tokens, title_norm):
        return 720

    if producer_norm == q_norm:
        return 650
    if producer_norm and (q_norm in producer_norm or _all_tokens_present(q_tokens, producer_norm)):
        return 580
    if country_norm and (q_norm in country_norm or _all_tokens_present(q_tokens, country_norm)):
        return 520
    if synopsis_norm and (q_norm in synopsis_norm or _all_tokens_present(q_tokens, synopsis_norm)):
        return 460

    fuzzy_title = _best_fuzzy_ratio(q_norm, q_tokens, title_norm)
    fuzzy_prod = _best_fuzzy_ratio(q_norm, q_tokens, producer_norm)
    best_fuzzy = max(fuzzy_title, fuzzy_prod)
    if best_fuzzy >= 0.78:
        return 200 + int(best_fuzzy * 100)

    return 0


def _preserve_id_order(queryset, ordered_ids: list[int]):
    if not ordered_ids:
        return queryset.none()
    preserved = Case(
        *[When(pk=pk, then=Value(idx)) for idx, pk in enumerate(ordered_ids)],
        output_field=IntegerField(),
    )
    return queryset.filter(pk__in=ordered_ids).order_by(preserved)


def search_media_queryset(queryset, raw_query: str | None):
    """Aplica búsqueda tolerante y ordenada por relevancia sobre un queryset ya filtrado por seguridad/filtros."""
    q_norm = normalize_search_text(raw_query)
    if not q_norm:
        return queryset

    q_tokens = q_norm.split()
    scored = []
    for pk, title, producer, country, synopsis in queryset.values_list(
        "id", "title", "producer", "country_of_origin", "synopsis"
    ):
        score = score_media_candidate(
            q_norm,
            q_tokens,
            normalize_search_text(title),
            normalize_search_text(producer),
            normalize_search_text(country),
            normalize_search_text(synopsis),
        )
        if score > 0:
            scored.append((score, pk))

    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    ordered_ids = [pk for _score, pk in scored]
    return _preserve_id_order(queryset, ordered_ids)


def search_tracking_queryset(queryset, raw_query: str | None):
    """Aplica búsqueda global normalizada sobre título de obra, título provisional y plataforma privada."""
    q_norm = normalize_search_text(raw_query)
    if not q_norm:
        return queryset

    q_tokens = q_norm.split()
    scored = []
    for pk, media_title, sub_title, watch_platform, sub_platform in queryset.values_list(
        "id",
        "media_item__title",
        "source_submission__title",
        "watch_platform",
        "source_submission__submitted_platform",
    ):
        effective_title = media_title or sub_title or ""
        effective_platform = watch_platform or sub_platform or ""
        title_norm = normalize_search_text(effective_title)
        plat_norm = normalize_search_text(effective_platform)

        score = 0
        if title_norm == q_norm or plat_norm == q_norm:
            score = 1000
        elif title_norm.startswith(q_norm) or plat_norm.startswith(q_norm):
            score = 850
        elif q_norm in title_norm or q_norm in plat_norm:
            score = 780
        elif _all_tokens_present(q_tokens, title_norm) or _all_tokens_present(q_tokens, plat_norm):
            score = 720
        else:
            fuzzy = max(
                _best_fuzzy_ratio(q_norm, q_tokens, title_norm),
                _best_fuzzy_ratio(q_norm, q_tokens, plat_norm),
            )
            if fuzzy >= 0.78:
                score = 200 + int(fuzzy * 100)

        if score > 0:
            scored.append((score, pk))

    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    ordered_ids = [pk for _score, pk in scored]
    return _preserve_id_order(queryset, ordered_ids)
