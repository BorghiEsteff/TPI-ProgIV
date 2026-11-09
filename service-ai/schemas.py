from typing import Literal
from pydantic import BaseModel, Field


class ReviewGuardRequest(BaseModel):
    comment: str = Field(
        ...,
        min_length=1,
        description="Texto de la reseña o comentario a clasificar",
    )
    media_item_id: int = Field(
        ...,
        gt=0,
        description="Identificador positivo de la obra multimedia en catálogo",
    )


class ReviewGuardResponse(BaseModel):
    contains_spoiler: bool = Field(
        ...,
        description="Indica si la reseña revela giros argumentales críticos o finales",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Grado de certeza del modelo o analizador (0.0 a 1.0)",
    )
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"] = Field(
        ...,
        description="Polaridad emocional detectada en el comentario",
    )

