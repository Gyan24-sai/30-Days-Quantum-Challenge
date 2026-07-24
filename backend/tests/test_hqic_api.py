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


# ---- NEW: Stats endpoint ----
def test_stats_empty_after_clear(session):
    # Ensure DB is empty
    session.delete(f"{API}/history", timeout=30)
    r = session.get(f"{API}/stats", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total"] == 0
    assert d["by_class"] == {"Rain": 0, "Road": 0, "Sky": 0}
    assert d["latency_histogram"] == []
    assert d["class_distribution"] == []
    assert d["confidence_distribution"] == []
    assert d["recent_timeline"] == []


def test_predict_returns_bloch_vectors(session):
    img = make_image_bytes()
    files = {"file": ("test.png", img, "image/png")}
    r = session.post(f"{API}/predict", files=files, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "bloch_vectors" in d and isinstance(d["bloch_vectors"], list)
    assert len(d["bloch_vectors"]) == 4
    for bv in d["bloch_vectors"]:
        assert set(["x", "y", "z", "purity"]).issubset(bv.keys())
        for k in ("x", "y", "z"):
            assert isinstance(bv[k], (int, float))
            assert -1.001 <= bv[k] <= 1.001
        assert isinstance(bv["purity"], (int, float))
    pytest.shared_prediction_id2 = d["id"]


def test_stats_populated(session):
    # After the predict above there is at least 1 doc
    r = session.get(f"{API}/stats", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total"] >= 1
    assert "Rain" in d["by_class"] and "Road" in d["by_class"] and "Sky" in d["by_class"]
    assert isinstance(d["latency_histogram"], list) and len(d["latency_histogram"]) > 0
    assert len(d["class_distribution"]) == 3
    assert len(d["confidence_distribution"]) == 3
    assert isinstance(d["recent_timeline"], list) and len(d["recent_timeline"]) >= 1
    assert d["avg_latency_ms"] > 0
    assert d["min_latency_ms"] > 0
    assert d["max_latency_ms"] >= d["min_latency_ms"]


# ---- NEW: Upload weights endpoint ----
def test_upload_weights_wrapped_checkpoint(session):
    """Upload a wrapped checkpoint {'model_state_dict': {...}, 'epoch': N}."""
    import torch, tempfile
    ckpt = {"model_state_dict": {"dummy.weight": torch.zeros(3, 3)}, "epoch": 1}
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
        torch.save(ckpt, f.name)
        tmp_path = f.name
    with open(tmp_path, "rb") as fp:
        files = {"file": ("wrapped.pt", fp, "application/octet-stream")}
        r = session.post(f"{API}/upload-weights", files=files, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["success"] is True
    assert "weights_loaded" in d
    assert d["size_bytes"] > 0


def test_upload_weights_raw_state_dict(session):
    """Upload a raw state_dict."""
    import torch, tempfile
    sd = {"dummy.weight": torch.zeros(2, 2)}
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
        torch.save(sd, f.name)
        tmp_path = f.name
    with open(tmp_path, "rb") as fp:
        files = {"file": ("raw.pt", fp, "application/octet-stream")}
        r = session.post(f"{API}/upload-weights", files=files, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["success"] is True
    assert d["size_bytes"] > 0
