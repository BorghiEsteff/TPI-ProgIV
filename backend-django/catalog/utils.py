import ipaddress
import re
import unicodedata
from difflib import SequenceMatcher
from urllib.parse import urlparse
from django.core.exceptions import ValidationError

LEADING_ARTICLES = {"the", "a", "an", "el", "la", "los", "las", "un", "una", "unos", "unas"}
MAX_POSTER_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
BLOCKED_URL_EXTENSIONS = (".svg", ".html", ".htm", ".js", ".php", ".exe", ".sh", ".bat")


def normalize_title(title: str) -> str:
    """Normaliza un título para comparación editorial (NFKD, sin diacríticos, minúsculas, sin puntuación)."""
    if not title:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(title))
    without_diacritics = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    cleaned = re.sub(r"[^\w\s]", " ", without_diacritics.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _strip_leading_article(normalized: str) -> str:
    tokens = normalized.split()
    if len(tokens) > 1 and tokens[0] in LEADING_ARTICLES:
        return " ".join(tokens[1:])
    return normalized


def compute_title_similarity(title_a: str, title_b: str) -> float:
    norm_a = normalize_title(title_a)
    norm_b = normalize_title(title_b)
    if not norm_a or not norm_b:
        return 0.0
    if norm_a == norm_b:
        return 1.0

    core_a = _strip_leading_article(norm_a)
    core_b = _strip_leading_article(norm_b)
    if core_a == core_b:
        return 0.95

    seq_ratio = SequenceMatcher(None, core_a, core_b).ratio()
    tokens_a = set(core_a.split())
    tokens_b = set(core_b.split())
    jaccard = len(tokens_a & tokens_b) / len(tokens_a | tokens_b) if (tokens_a | tokens_b) else 0.0
    return round(max(seq_ratio, (seq_ratio + jaccard) / 2), 3)


def find_duplicate_candidates(
    title: str,
    media_type: str | None = None,
    release_year: int | None = None,
    exclude_submission_id: int | None = None,
    limit: int = 10,
) -> list[dict]:
    """
    Busca posibles obras duplicadas en el catálogo canónico y en propuestas pendientes.
    Nunca utiliza la plataforma de visionado para distinguir o agrupar obras.
    """
    from catalog.models import MediaItem, MediaSubmission

    norm_query = normalize_title(title)
    if not norm_query:
        return []

    candidates = []

    for item in MediaItem.objects.filter(is_active=True).only("id", "title", "normalized_title", "media_type", "release_year", "poster_image"):
        score = compute_title_similarity(norm_query, item.normalized_title or item.title)
        if media_type and item.media_type == media_type:
            score = min(1.0, score + 0.05) if score >= 0.55 else score
        if release_year and item.release_year and item.release_year == release_year and score >= 0.55:
            score = min(1.0, score + 0.05)

        if score >= 0.65 or _strip_leading_article(norm_query) in _strip_leading_article(item.normalized_title or normalize_title(item.title)):
            match_level = "EXACT_MATCH" if score >= 0.95 else "POSSIBLE_MATCH"
            candidates.append({
                "source": "MEDIA_ITEM",
                "media_item_id": item.id,
                "submission_id": None,
                "title": item.title,
                "media_type": item.media_type,
                "release_year": item.release_year,
                "poster_url": item.poster_image or "",
                "similarity": round(score, 2),
                "match_level": match_level,
            })

    pending_qs = MediaSubmission.objects.filter(status=MediaSubmission.Status.PENDING).only(
        "id", "title", "normalized_title", "media_type", "release_year", "poster_url"
    )
    if exclude_submission_id is not None:
        pending_qs = pending_qs.exclude(id=exclude_submission_id)

    for sub in pending_qs:
        score = compute_title_similarity(norm_query, sub.normalized_title or sub.title)
        if score >= 0.65:
            match_level = "EXACT_MATCH" if score >= 0.95 else "POSSIBLE_MATCH"
            candidates.append({
                "source": "PENDING_SUBMISSION",
                "media_item_id": None,
                "submission_id": sub.id,
                "title": sub.title,
                "media_type": sub.media_type,
                "release_year": sub.release_year,
                "poster_url": sub.poster_url or "",
                "similarity": round(score, 2),
                "match_level": match_level,
            })

    candidates.sort(key=lambda c: (c["source"] != "MEDIA_ITEM", -c["similarity"]))
    return candidates[:limit]


def validate_safe_poster_url(url: str) -> str:
    """Valida URL externa de portada evitando SSRF hacia redes internas y contenido ejecutable."""
    if not url:
        return ""
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValidationError("La URL de portada debe usar protocolo http o https válido.")

    hostname = (parsed.hostname or "").lower()
    if hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or hostname.endswith((".local", ".internal", ".localhost")):
        raise ValidationError("La URL de portada no puede apuntar a hosts locales o internos.")

    try:
        ip_obj = ipaddress.ip_address(hostname)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved or ip_obj.is_multicast:
            raise ValidationError("La URL de portada no puede apuntar a direcciones IP privadas o reservadas.")
    except ValueError:
        pass

    lower_path = (parsed.path or "").lower()
    if lower_path.endswith(BLOCKED_URL_EXTENSIONS):
        raise ValidationError("El formato de la URL de portada no está permitido (solo imágenes seguras).")

    return url.strip()


def validate_poster_file(uploaded_file) -> None:
    """Valida archivo de portada por tamaño, extensión, MIME y firma real de bytes."""
    if uploaded_file.size > MAX_POSTER_BYTES:
        raise ValidationError("La portada no puede superar los 5 MB.")

    name_lower = (uploaded_file.name or "").lower()
    if not any(name_lower.endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS):
        raise ValidationError("Formato de archivo no permitido. Usa JPG, PNG o WEBP.")

    content_type = getattr(uploaded_file, "content_type", "")
    if content_type and content_type.lower() not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValidationError("Tipo MIME de portada no permitido. Usa JPG, PNG o WEBP.")

    pos = uploaded_file.tell()
    header = uploaded_file.read(16)
    uploaded_file.seek(pos)

    is_jpeg = header.startswith(b"\xff\xd8\xff")
    is_png = header.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_webp):
        raise ValidationError("El contenido del archivo no corresponde a una imagen JPG, PNG o WEBP válida.")
