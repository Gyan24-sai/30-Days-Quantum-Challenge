"""Backend tests for Hybrid Quantum Image Classifier API."""
import io
import os
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://scene-intelligence-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def make_image_bytes(fmt="PNG", size=(224, 224), color=(120, 180, 200)):
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# ---- Health ----
def test_health(session):
    r = session.get(f"{API}/health", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "device" in data


def test_root(session):
    r = session.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "message" in r.json()


# ---- Predict ----
def test_predict_returns_valid_result(session):
    img = make_image_bytes()
    files = {"file": ("test.png", img, "image/png")}
    r = session.post(f"{API}/predict", files=files, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["predicted_class"] in ["Rain", "Road", "Sky"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert set(data["probabilities"].keys()) == {"Rain", "Road", "Sky"}
    for v in data["probabilities"].values():
        assert 0.0 <= v <= 1.0
    assert data["inference_time_ms"] > 0
    assert "id" in data
    assert data.get("image_base64", "").startswith("data:image")
    # Return id for possible re-use
    pytest.shared_prediction_id = data["id"]


def test_predict_frame(session):
    img = make_image_bytes(fmt="JPEG")
    files = {"file": ("frame.jpg", img, "image/jpeg")}
    r = session.post(f"{API}/predict/frame", files=files, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["predicted_class"] in ["Rain", "Road", "Sky"]
    assert "probabilities" in data


# ---- History ----
def test_get_history_contains_prediction(session):
    r = session.get(f"{API}/history?limit=50", timeout=30)
    assert r.status_code == 200
    hist = r.json()
    assert isinstance(hist, list)
    assert len(hist) >= 1
    entry = hist[0]
    assert "id" in entry and "predicted_class" in entry and "confidence" in entry


def test_get_prediction_by_id(session):
    pid = getattr(pytest, "shared_prediction_id", None)
    assert pid, "no prediction id available"
    r = session.get(f"{API}/prediction/{pid}", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == pid
    assert data["predicted_class"] in ["Rain", "Road", "Sky"]


def test_get_prediction_not_found(session):
    r = session.get(f"{API}/prediction/nonexistent-id-xyz", timeout=30)
    assert r.status_code == 404


def test_clear_history(session):
    r = session.delete(f"{API}/history", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "deleted_count" in data
    # verify empty
    r2 = session.get(f"{API}/history", timeout=30)
    assert r2.status_code == 200
    assert r2.json() == []
