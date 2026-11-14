import json
import logging
import os
import re
import unicodedata
from typing import List, Optional, Tuple
from groq import Groq
from schemas import CandidateMedia, RecommendationItem, RecommendResponse

logger = logging.getLogger("service_ai.recommender")

GENRE_ALIASES = {
    "romance": {"romance", "romantico", "romantica", "amor"},
    "drama": {"drama", "dramatico", "dramatica"},
    "terror": {"terror", "horror", "miedo"},
    "ciencia ficcion": {"ciencia ficcion", "sci-fi", "scifi", "futurista"},
    "accion": {"accion", "pelea"},
    "comedia": {"comedia", "gracioso", "divertida", "humor"},
    "suspenso": {"suspenso", "thriller", "misterio"},
    "animacion": {"animacion", "anime", "animada"},
}


def _norm(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", (text or "").lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def _extract_criteria(prompt: str) -> dict:
    norm_p = _norm(prompt)
    year_match = re.search(r"\b(19\d{2}|20\d{2})\b", norm_p)
    target_year = int(year_match.group(1)) if year_match else None

    target_type: Optional[str] = None
    target_country: Optional[str] = None

    if "kdrama" in norm_p or "k-drama" in norm_p or "corean" in norm_p or "dorama" in norm_p:
        target_type = "SERIE"
        if "kdrama" in norm_p or "k-drama" in norm_p or "corean" in norm_p:
            target_country = "KR"
    elif any(w in norm_p for w in ("serie", "series", "temporada", "capitulo")):
        target_type = "SERIE"
    elif any(w in norm_p for w in ("pelicula", "peliculas", "peli", "film", "cine")):
        target_type = "PELICULA"

    target_genres = []
    for canonical, keywords in GENRE_ALIASES.items():
        if any(kw in norm_p for kw in keywords):
            target_genres.append(canonical)

    return {
        "year": target_year,
        "media_type": target_type,
        "country": target_country,
        "genres": target_genres,
        "tokens": [t for t in re.findall(r"\w+", norm_p) if len(t) >= 3],
    }


def _filter_strict_candidates(candidates: List[CandidateMedia], criteria: dict) -> List[CandidateMedia]:
    filtered = []
    for c in candidates:
        if criteria["media_type"] and c.media_type.upper() != criteria["media_type"]:
            continue
        if criteria["year"] and c.release_year != criteria["year"]:
            continue
        if criteria["country"]:
            origin = _norm(c.country_of_origin)
            if origin not in {_norm(criteria["country"]), "corea", "corea del sur", "south korea", "korea"}:
                continue
        if criteria["genres"]:
            cand_genres = {_norm(g) for g in c.genres} | {_norm(t) for t in c.tags}
            cand_text = _norm(f"{c.title} {c.synopsis}")
            if not all(
                any(g in cg for cg in cand_genres) or g in cand_text
                for g in criteria["genres"]
            ):
                continue
        filtered.append(c)
    return filtered


def deterministic_recommend(prompt: str, candidates: List[CandidateMedia], degraded: bool = True) -> RecommendResponse:
    if not candidates:
        return RecommendResponse(
            message="No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.",
            recommendations=[],
            degraded=degraded,
        )

    criteria = _extract_criteria(prompt)
    matched = _filter_strict_candidates(candidates, criteria)

    if not matched:
        return RecommendResponse(
            message="No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.",
            recommendations=[],
            degraded=degraded,
        )

    scored: List[Tuple[int, CandidateMedia]] = []
    for c in matched:
        haystack = _norm(f"{c.title} {c.synopsis} {' '.join(c.genres)} {' '.join(c.tags)} {c.country_of_origin}")
        score = sum(1 for tok in criteria["tokens"] if tok in haystack)
        scored.append((score, c))

    scored.sort(key=lambda pair: -pair[0])
    top = [c for _, c in scored[:5]]

    recs = [
        RecommendationItem(
            media_item_id=c.id,
            reason=f"Coincide en el catálogo ({c.media_type.lower()}"
            + (f", {c.release_year}" if c.release_year else "")
            + (f", {', '.join(c.genres[:2])}" if c.genres else "")
            + ").",
        )
        for c in top
    ]

    msg = (
        f"Encontré {len(recs)} opción(es) en el catálogo (modo determinista)."
        if degraded
        else f"Encontré {len(recs)} recomendación(es) en el catálogo."
    )
    return RecommendResponse(message=msg, recommendations=recs, degraded=degraded)


def recommend_from_catalog(prompt: str, candidates: List[CandidateMedia]) -> RecommendResponse:
    """
    Recomienda hasta 5 obras reales del catálogo aprobado.
    Nunca inventa IDs ni títulos; aplica fallback determinista si Groq no está disponible.
    """
    if not candidates:
        return RecommendResponse(
            message="No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.",
            recommendations=[],
            degraded=False,
        )

    criteria = _extract_criteria(prompt)
    strict_candidates = _filter_strict_candidates(candidates, criteria)
    if not strict_candidates:
        return RecommendResponse(
            message="No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.",
            recommendations=[],
            degraded=False,
        )

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.info("GROQ_API_KEY no configurada. Usando fallback determinista de catálogo.")
        return deterministic_recommend(prompt, strict_candidates, degraded=True)

    model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    allowed_ids = {c.id for c in strict_candidates}
    compact_candidates = [
        {
            "id": c.id,
            "title": c.title,
            "media_type": c.media_type,
            "release_year": c.release_year,
            "genres": c.genres[:4],
            "country_of_origin": c.country_of_origin,
            "synopsis": (c.synopsis or "")[:200],
        }
        for c in strict_candidates[:30]
    ]

    system_prompt = (
        "Eres el asistente de recomendaciones de CineTrack. "
        "Recomienda como máximo 5 obras EXCLUSIVAMENTE de la lista JSON de candidatos provista. "
        "Nunca inventes títulos ni IDs. Responde SOLO con JSON válido: "
        '{"message": "texto breve en español", "recommendations": [{"media_item_id": int, "reason": "motivo corto"}]}'
    )

    try:
        client = Groq(api_key=api_key, timeout=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "2.8")))
        completion = client.chat.completions.create(
            model=model_name,
            temperature=0.2,
            max_tokens=400,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Pedido: {prompt[:500]}\nCandidatos: {json.dumps(compact_candidates, ensure_ascii=False)}",
                },
            ],
        )
        raw = json.loads(completion.choices[0].message.content)
        valid_recs = []
        seen_ids = set()
        for item in raw.get("recommendations", []):
            mid = item.get("media_item_id")
            if isinstance(mid, int) and mid in allowed_ids and mid not in seen_ids:
                seen_ids.add(mid)
                valid_recs.append(
                    RecommendationItem(
                        media_item_id=mid,
                        reason=str(item.get("reason") or "Coincide con tu búsqueda.")[:240],
                    )
                )
            if len(valid_recs) >= 5:
                break

        if not valid_recs:
            return deterministic_recommend(prompt, strict_candidates, degraded=True)

        return RecommendResponse(
            message=str(raw.get("message") or "Aquí tienes recomendaciones del catálogo:")[:300],
            recommendations=valid_recs,
            degraded=False,
        )
    except Exception as exc:
        logger.warning("Fallo Groq en recomendaciones (%s). Usando fallback determinista.", exc)
        return deterministic_recommend(prompt, strict_candidates, degraded=True)
