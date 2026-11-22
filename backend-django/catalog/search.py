import re
import unicodedata
from difflib import SequenceMatcher
from django.db.models import Case, IntegerField, Value, When

MAX_QUERY_CHARS = 200


def normalize_search_text(text: str | None, *, max_len: int | None = None) -> str:
    """
    Normalización simétrica para búsqueda tolerante a tildes, mayúsculas, puntuación,
    espacios múltiples y separadores (+, -, _, ., :, etc.).
    Preserva la letra 'ñ' de forma consistente y no trunca campos salvo que max_len se indique.
    """
    if not text:
        return ""
    raw = str(text)
    if max_len is not None:
        raw = raw[:max_len]
    raw = raw.strip()
    if not raw:
        return ""

    # Preservar ñ/Ñ antes de descomponer diacríticos
    protected = raw.replace("ñ", "\uffff").replace("Ñ", "\uffff")
    decomposed = unicodedata.normalize("NFKD", protected)
    without_diacritics = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    restored = without_diacritics.replace("\uffff", "ñ").casefold()

    # Manejo genérico de '+' sin reglas hardcodeadas por marca ("Disney+" -> "disney plus", "C++" -> "c plus plus")
    restored = restored.replace("+", " plus ")

    cleaned = re.sub(r"[^\w\s]", " ", restored)
    return re.sub(r"\s+", " ", cleaned).strip()


def _compact_text(norm_text: str) -> str:
    return norm_text.replace(" ", "") if norm_text else ""


def _all_tokens_present(q_tokens: list[str], target_norm: str) -> bool:
    if not q_tokens or not target_norm:
        return False
    target_tokens = target_norm.split()
    for qt in q_tokens:
        if len(qt) <= 1:
            if not any(tt == qt for tt in target_tokens):
                return False
        elif len(qt) == 2:
            if not any(tt == qt or tt.startswith(qt) for tt in target_tokens):
                return False
        else:
            if not any(qt in tt for tt in target_tokens):
                return False
    return True


def _contains_match(q_norm: str, q_compact: str, q_tokens: list[str], target_norm: str) -> bool:
    if not target_norm or not q_norm:
        return False
    if len(q_tokens) == 1 and len(q_tokens[0]) <= 2:
        return _all_tokens_present(q_tokens, target_norm)
    if q_norm in target_norm:
        return True
    if len(q_compact) >= 4 and q_compact in _compact_text(target_norm):
        return True
    return _all_tokens_present(q_tokens, target_norm)


def _best_fuzzy_ratio(q_norm: str, q_tokens: list[str], target_norm: str) -> float:
    if not q_norm or not target_norm:
        return 0.0
    compact = _compact_text(q_norm)
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
    q_compact: str | None = None,
) -> int:
    """
    Calcula puntaje jerárquico determinista:
    Tier 1 (1000): coincidencia exacta normalizada (o compacta >=4 chars) de título.
    Tier 2 (720-850): prefijo, subcadena directa, variante sin separadores o tokens en título.
    Tier 3 (460-650): coincidencia en productora, país o sinopsis completa (sin truncar).
    Tier 4 (200-299): fuzzy moderado solo en título/productora cuando no hay match directo.
    """
    if q_compact is None:
        q_compact = _compact_text(q_norm)
    title_compact = _compact_text(title_norm)

    if title_norm == q_norm or (len(q_compact) >= 4 and title_compact == q_compact):
        return 1000
    if title_norm.startswith(q_norm) or (len(q_compact) >= 4 and title_compact.startswith(q_compact)):
        return 850
    if (len(q_norm) >= 3 and q_norm in title_norm) or (len(q_compact) >= 4 and q_compact in title_compact):
        return 780
    if _all_tokens_present(q_tokens, title_norm):
        return 720

    if producer_norm == q_norm or (len(q_compact) >= 4 and _compact_text(producer_norm) == q_compact):
        return 650
    if _contains_match(q_norm, q_compact, q_tokens, producer_norm):
        return 580
    if _contains_match(q_norm, q_compact, q_tokens, country_norm):
        return 520
    if _contains_match(q_norm, q_compact, q_tokens, synopsis_norm):
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
    q_norm = normalize_search_text(raw_query, max_len=MAX_QUERY_CHARS)
    if not q_norm:
        return queryset

    q_compact = _compact_text(q_norm)
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
            q_compact=q_compact,
        )
        if score > 0:
            scored.append((score, pk))

    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    ordered_ids = [pk for _score, pk in scored]
    return _preserve_id_order(queryset, ordered_ids)


def search_tracking_queryset(queryset, raw_query: str | None):
    """Aplica búsqueda global normalizada sobre título de obra, título provisional y plataforma privada."""
    q_norm = normalize_search_text(raw_query, max_len=MAX_QUERY_CHARS)
    if not q_norm:
        return queryset

    q_compact = _compact_text(q_norm)
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
        title_compact = _compact_text(title_norm)
        plat_compact = _compact_text(plat_norm)

        score = 0
        if (
            title_norm == q_norm
            or plat_norm == q_norm
            or (len(q_compact) >= 4 and (title_compact == q_compact or plat_compact == q_compact))
        ):
            score = 1000
        elif (
            title_norm.startswith(q_norm)
            or plat_norm.startswith(q_norm)
            or (len(q_compact) >= 4 and (title_compact.startswith(q_compact) or plat_compact.startswith(q_compact)))
        ):
            score = 850
        elif _contains_match(q_norm, q_compact, q_tokens, title_norm) or _contains_match(
            q_norm, q_compact, q_tokens, plat_norm
        ):
            score = 780
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
