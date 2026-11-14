from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SAMPLE_CANDIDATES = [
    {
        "id": 12,
        "title": "Amor en Seúl 2026",
        "media_type": "SERIE",
        "release_year": 2026,
        "genres": ["Romance", "Drama"],
        "country_of_origin": "KR",
        "synopsis": "Una historia romántica en Seúl.",
    },
    {
        "id": 15,
        "title": "The Matrix",
        "media_type": "PELICULA",
        "release_year": 1999,
        "genres": ["Ciencia Ficción", "Acción"],
        "country_of_origin": "US",
        "synopsis": "Realidad simulada.",
    },
]


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_recommend_kdrama_2026_deterministic_without_groq_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    resp = client.post(
        "/ai/recommend",
        json={"prompt": "quiero un kdrama romántico del 2026", "candidates": SAMPLE_CANDIDATES},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["degraded"] is True
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["media_item_id"] == 12


def test_recommend_returns_empty_honest_message_when_no_match(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    resp = client.post(
        "/ai/recommend",
        json={"prompt": "quiero un kdrama romántico del 2028", "candidates": SAMPLE_CANDIDATES},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["recommendations"] == []
    assert "No tengo coincidencias" in data["message"]


def test_recommend_filters_out_hallucinated_ids_from_groq(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-test-key")
    mock_msg = MagicMock()
    mock_msg.content = '{"message": "Te sugiero:", "recommendations": [{"media_item_id": 9999, "reason": "Inventada"}, {"media_item_id": 12, "reason": "Real"}]}'
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch("services.recommender.Groq") as mock_groq_cls:
        mock_groq_cls.return_value.chat.completions.create.return_value = mock_completion
        resp = client.post(
            "/ai/recommend",
            json={"prompt": "quiero un kdrama romántico del 2026", "candidates": SAMPLE_CANDIDATES},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["degraded"] is False
    ids = [r["media_item_id"] for r in data["recommendations"]]
    assert ids == [12]
    assert 9999 not in ids


def test_recommend_falls_back_cleanly_on_groq_error_or_malformed_json(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-test-key")
    with patch("services.recommender.Groq") as mock_groq_cls:
        mock_groq_cls.return_value.chat.completions.create.side_effect = TimeoutError("429 / timeout")
        resp = client.post(
            "/ai/recommend",
            json={"prompt": "quiero un kdrama romántico del 2026", "candidates": SAMPLE_CANDIDATES},
        )
    assert resp.status_code == 200
    assert resp.headers.get("x-degraded-ai") == "true"
    data = resp.json()
    assert data["degraded"] is True
    assert [r["media_item_id"] for r in data["recommendations"]] == [12]

    mock_msg = MagicMock()
    mock_msg.content = "NOT_VALID_JSON"
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    with patch("services.recommender.Groq") as mock_groq_cls:
        mock_groq_cls.return_value.chat.completions.create.return_value = mock_completion
        resp_bad = client.post(
            "/ai/recommend",
            json={"prompt": "quiero un kdrama romántico del 2026", "candidates": SAMPLE_CANDIDATES},
        )
    assert resp_bad.status_code == 200
    assert resp_bad.json()["degraded"] is True
