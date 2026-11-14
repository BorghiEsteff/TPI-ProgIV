import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Response, status
from fastapi.middleware.cors import CORSMiddleware

from schemas import RecommendRequest, RecommendResponse
from services.recommender import recommend_from_catalog

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(
    title="CineTrack AI Service",
    description="Microservicio de Inteligencia Artificial para recomendaciones basadas en catálogo publicado",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_router = APIRouter(prefix="/ai", tags=["AI Operations"])


@app.get("/health", tags=["Health"])
@ai_router.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "service-ai"}


@ai_router.post(
    "/recommend",
    response_model=RecommendResponse,
    status_code=status.HTTP_200_OK,
    summary="Recomienda obras aprobadas del catálogo según consulta del usuario",
)
def recommend_endpoint(payload: RecommendRequest, response: Response):
    result = recommend_from_catalog(
        prompt=payload.prompt,
        candidates=payload.candidates,
    )
    if result.degraded:
        response.headers["X-Degraded-AI"] = "true"
    return result


app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
