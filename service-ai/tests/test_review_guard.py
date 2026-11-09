import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from schemas import ReviewGuardResponse

client = TestClient(app)


def test_health_endpoints():
    """Verifica endpoints de salud en /health y /ai/health."""
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json() == {"status": "ok", "service": "service-ai"}

    res2 = client.get("/ai/health")
    assert res2.status_code == 200
    assert res2.json() == {"status": "ok", "service": "service-ai"}


def test_review_guard_with_mocked_groq_success():
    """
    Test 1: Simula una respuesta exitosa de Groq LPU detectando spoiler
    y polaridad positiva.
    """
    mock_groq_content = (
        '{"contains_spoiler": true, "confidence": 0.95, "sentiment": "POSITIVE"}'
    )

    with patch.dict("os.environ", {"GROQ_API_KEY": "gsk-mock-key-12345"}), \
         patch("services.groq_analyzer.Groq") as mock_groq_cls:
        
        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = mock_groq_content
        mock_completion = MagicMock(choices=[mock_choice])
        mock_client.chat.completions.create.return_value = mock_completion
        mock_groq_cls.return_value = mock_client

        payload = {
            "comment": "Gran obra maestra pero el villano muere al final.",
            "media_item_id": 1,
        }
        res = client.post("/ai/review-guard", json=payload)

        assert res.status_code == 200
        data = res.json()
        assert data["contains_spoiler"] is True
        assert data["confidence"] == 0.95
        assert data["sentiment"] == "POSITIVE"
        assert "X-Degraded-AI" not in res.headers


def test_review_guard_fallback_when_api_key_missing_or_timeout():
    """
    Test 2: Funcionamiento del fallback heurístico determinista cuando:
    - No hay GROQ_API_KEY o Groq da timeout.
    - Se analiza 'El villano muere al final' y se detecta spoiler = True.
    - Se valida que retorne 200 OK y la cabecera 'X-Degraded-AI: true'.
    """
    with patch.dict("os.environ", {"GROQ_API_KEY": ""}):
        payload = {
            "comment": "Una serie increíble pero el villano muere en la última temporada.",
            "media_item_id": 2,
        }
        res = client.post("/ai/review-guard", json=payload)

        assert res.status_code == 200
        data = res.json()
        assert data["contains_spoiler"] is True
        assert data["confidence"] >= 0.70
        assert data["sentiment"] == "POSITIVE"
        assert res.headers.get("X-Degraded-AI") == "true"


def test_review_guard_fallback_on_groq_exception():
    """Verifica que ante excepción o timeout de Groq se active el fallback."""
    with patch.dict("os.environ", {"GROQ_API_KEY": "gsk-some-key"}), \
         patch("services.groq_analyzer.Groq") as mock_groq_cls:
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("ReadTimeout from Groq LPU")
        mock_groq_cls.return_value = mock_client

        payload = {
            "comment": "Pésima película, un bodrio absoluto.",
            "media_item_id": 3,
        }
        res = client.post("/ai/review-guard", json=payload)

        assert res.status_code == 200
        data = res.json()
        assert data["contains_spoiler"] is False
        assert data["sentiment"] == "NEGATIVE"
        assert res.headers.get("X-Degraded-AI") == "true"


def test_review_guard_validation_error():
    """
    Test 3: Validación Pydantic v2 retornando 422 Unprocessable Entity
    ante payloads inválidos.
    """
    # 1. Falta 'comment'
    res1 = client.post("/ai/review-guard", json={"media_item_id": 1})
    assert res1.status_code == 422

    # 2. 'media_item_id' no numérico o <= 0
    res2 = client.post("/ai/review-guard", json={"comment": "Hola", "media_item_id": -5})
    assert res2.status_code == 422

    # 3. 'comment' vacío
    res3 = client.post("/ai/review-guard", json={"comment": "", "media_item_id": 1})
    assert res3.status_code == 422

