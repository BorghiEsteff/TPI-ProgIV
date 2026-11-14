from typing import List, Optional
from pydantic import BaseModel, Field


class CandidateMedia(BaseModel):
    id: int
    title: str
    media_type: str
    release_year: Optional[int] = None
    genres: List[str] = Field(default_factory=list)
    country_of_origin: str = ""
    tags: List[str] = Field(default_factory=list)
    synopsis: str = ""


class RecommendRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500, description="Consulta en lenguaje natural")
    candidates: List[CandidateMedia] = Field(default_factory=list, max_length=50)


class RecommendationItem(BaseModel):
    media_item_id: int
    reason: str


class RecommendResponse(BaseModel):
    message: str
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    degraded: bool = False
