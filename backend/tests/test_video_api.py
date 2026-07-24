"""Backend tests for /api/predict/video endpoint (Video Analysis feature)."""
import io
import os
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "")
    if not url:
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as fh:
                for line in fh:
                    if line.strip().startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
    return url.rstrip("/")

BASE_URL = _load_base_url()
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

TEST_VIDEO = "/tmp/test.mp4"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


def test_video_file_exists():
    assert os.path.exists(TEST_VIDEO), f"Test video missing: {TEST_VIDEO}"
    assert os.path.getsize(TEST_VIDEO) > 0


def test_predict_video_basic(session):
    with open(TEST_VIDEO, "rb") as f:
        files = {"file": ("test.mp4", f, "video/mp4")}
        r = session.post(f"{API}/predict/video", files=files, timeout=180)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
    data = r.json()

    # Structure
    assert set(["video_info", "summary", "frames"]).issubset(data.keys())

    vi = data["video_info"]
    for k in ["total_frames", "fps", "duration_sec", "width", "height", "frames_analyzed"]:
        assert k in vi, f"Missing video_info.{k}"
    assert vi["total_frames"] > 0
    assert vi["width"] == 256 and vi["height"] == 256
    assert vi["frames_analyzed"] > 0

    s = data["summary"]
    for k in ["dominant_class", "class_counts", "avg_confidence"]:
        assert k in s
    assert s["dominant_class"] in ["Rain", "Road", "Sky"]
    assert 0.0 <= s["avg_confidence"] <= 1.0

    frames = data["frames"]
    assert len(frames) == vi["frames_analyzed"]
    for f in frames:
        for k in ["index", "frame_number", "timestamp_sec", "predicted_class",
                  "confidence", "probabilities", "inference_time_ms", "thumbnail"]:
            assert k in f, f"frame missing {k}"
        assert f["predicted_class"] in ["Rain", "Road", "Sky"]
        assert f["thumbnail"].startswith("data:image/jpeg;base64,")
        assert set(f["probabilities"].keys()) == {"Rain", "Road", "Sky"}


def test_predict_video_max_frames(session):
    with open(TEST_VIDEO, "rb") as f:
        files = {"file": ("test.mp4", f, "video/mp4")}
        r = session.post(f"{API}/predict/video?max_frames=5", files=files, timeout=120)
    assert r.status_code == 200
    data = r.json()
    assert data["video_info"]["frames_analyzed"] <= 5
    assert len(data["frames"]) <= 5


def test_predict_video_invalid_file(session):
    # Send a text file pretending to be a video
    fake = io.BytesIO(b"this is not a video, just text data" * 20)
    files = {"file": ("fake.mp4", fake, "video/mp4")}
    r = session.post(f"{API}/predict/video", files=files, timeout=30)
    assert r.status_code in (400, 422, 500), f"Expected error, got {r.status_code}: {r.text[:200]}"
