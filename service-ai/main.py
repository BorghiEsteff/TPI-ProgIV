import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Response, status
from fastapi.middleware.cors import CORSMiddleware

from schemas import ReviewGuardRequest, ReviewGuardResponse
from services.groq_analyzer import analyze_review_with_groq

# Cargar variables de entorno locales
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(
    title="CineTrack AI Service",
    description="Microservicio de Inteligencia Artificial para análisis de reseñas y detección de spoilers (TP 3)",
    version="1.0.0",
)

# CORS para consumo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router con prefijo /ai (requerido por el cliente de Node.js)
ai_router = APIRouter(prefix="/ai", tags=["AI Operations"])


@app.get("/health", tags=["Health"])
@ai_router.get("/health", tags=["Health"])
def health_check():
    """Endpoint de comprobación de salud del microservicio."""
    return {"status": "ok", "service": "service-ai"}


@ai_router.post(
    "/review-guard",
    response_model=ReviewGuardResponse,
    status_code=status.HTTP_200_OK,
    summary="Analiza una reseña para detectar spoilers y polaridad de sentimiento",
)
def review_guard_endpoint(payload: ReviewGuardRequest, response: Response):
    """
    Endpoint principal consumido por Express / Node.js.
    - Contrato: POST /ai/review-guard
    - Devuelve: { "contains_spoiler": bool, "confidence": float, "sentiment": str }
    - Si se activa el fallback de contingencia, añade la cabecera 'X-Degraded-AI: true'.
    """
    analysis_result, is_degraded = analyze_review_with_groq(
        comment=payload.comment,
        media_item_id=payload.media_item_id,
    )

    if is_degraded:
        response.headers["X-Degraded-AI"] = "true"

    return analysis_result


app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

