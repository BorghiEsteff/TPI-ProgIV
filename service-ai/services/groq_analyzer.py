import os
import json
import logging
from typing import Tuple
from groq import Groq
from schemas import ReviewGuardResponse

logger = logging.getLogger("service_ai.groq")

# Palabras clave heurísticas para detección determinista de contingencia
SPOILER_KEYWORDS = {
    "muere", "muerte", "final", "asesino", "traiciona", "traición",
    "descubre que", "spoiler", "revive", "culpable", "villano muere",
    "el malo era", "termina muriendo", "se suicida", "mata a", "vence a"
}

POSITIVE_WORDS = {
    "excelente", "increíble", "buen", "buena", "bueno", "genial",
    "maravilla", "obra maestra", "fascinante", "gran", "encantó", "gustó",
    "sublime", "perfecta", "perfecto", "recomendada", "joya"
}

NEGATIVE_WORDS = {
    "mala", "malo", "pésima", "pésimo", "aburrida", "aburrido",
    "decepción", "horrible", "mediocre", "bodrio", "lenta", "incongruente",
    "odiosa", "insufrible", "basura", "desastre"
}


def fallback_heuristic_analyzer(comment: str) -> ReviewGuardResponse:
    """
    Analizador heurístico determinista ejecutado en caso de:
    - Ausencia de GROQ_API_KEY
    - Timeout de red con la API de Groq
    - Rate limits (429) o errores 5xx de Groq
    Garantiza disponibilidad constante del servicio y respuesta en < 50ms.
    """
    comment_lower = comment.lower()

    # Detección de spoilers por coincidencia de palabras clave
    contains_spoiler = any(kw in comment_lower for kw in SPOILER_KEYWORDS)
    confidence = 0.85 if contains_spoiler else 0.75

    # Análisis léxico de polaridad de sentimiento
    pos_count = sum(1 for w in POSITIVE_WORDS if w in comment_lower)
    neg_count = sum(1 for w in NEGATIVE_WORDS if w in comment_lower)

    if pos_count > neg_count:
        sentiment = "POSITIVE"
    elif neg_count > pos_count:
        sentiment = "NEGATIVE"
    else:
        sentiment = "NEUTRAL"

    return ReviewGuardResponse(
        contains_spoiler=contains_spoiler,
        confidence=confidence,
        sentiment=sentiment,
    )


def analyze_review_with_groq(comment: str, media_item_id: int) -> Tuple[ReviewGuardResponse, bool]:
    """
    Analiza una reseña multimedia optimizando el consumo de tokens y tiempo de respuesta:
    - Recorta el comentario a 800 caracteres.
    - System prompt ultracompacto para respuesta en formato JSON estricto.
    - Timeout estricto de 2.8 segundos.
    - Retorna una tupla (ReviewGuardResponse, is_degraded).
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.info("GROQ_API_KEY no configurada. Ejecutando fallback heurístico.")
        return fallback_heuristic_analyzer(comment), True

    model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    truncated_comment = comment[:800].strip()

    system_prompt = (
        "Clasifica la reseña. Devuelve EXCLUSIVAMENTE este JSON: "
        '{"contains_spoiler": bool, "confidence": float (0.0-1.0), "sentiment": "POSITIVE"|"NEGATIVE"|"NEUTRAL"}'
    )

    try:
        # Timeout de 2.8 segundos para asegurar respuesta antes del corte de Node (4.0s)
        client = Groq(api_key=api_key, timeout=2.8)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"MediaItem ID: {media_item_id}\nReseña: \"{truncated_comment}\"",
                },
            ],
            model=model_name,
            temperature=0.0,
            max_tokens=80,
            response_format={"type": "json_object"},
        )

        raw_content = chat_completion.choices[0].message.content
        data = json.loads(raw_content)

        sentiment_raw = str(data.get("sentiment", "NEUTRAL")).upper()
        if sentiment_raw not in ["POSITIVE", "NEGATIVE", "NEUTRAL"]:
            sentiment_raw = "NEUTRAL"

        confidence_val = float(data.get("confidence", 0.9))
        confidence_val = max(0.0, min(1.0, confidence_val))

        response = ReviewGuardResponse(
            contains_spoiler=bool(data.get("contains_spoiler", False)),
            confidence=round(confidence_val, 2),
            sentiment=sentiment_raw,
        )
        return response, False

    except Exception as exc:
        logger.warning(
            "Fallo o timeout al consultar Groq (%s). Activando fallback heurístico.", exc
        )
        return fallback_heuristic_analyzer(comment), True

