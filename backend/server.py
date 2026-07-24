from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from PIL import Image
import io
import base64

# ML Core imports
from ml_core.inference import get_inference_engine

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize ML Engine
logger = logging.getLogger(__name__)
inference_engine = None

# Create app and router
app = FastAPI(title="Hybrid Quantum Image Classifier API")
api_router = APIRouter(prefix="/api")


# Models
class PredictionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    predicted_class: str
    confidence: float
    probabilities: dict
    inference_time_ms: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    image_base64: Optional[str] = None
    gradcam_base64: Optional[str] = None
    quantum_state: Optional[List[float]] = None
    classical_features: Optional[List[float]] = None
    bloch_vectors: Optional[List[dict]] = None
    weights_loaded: Optional[bool] = None


class PredictionHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    predicted_class: str
    confidence: float
    timestamp: datetime


# Routes
@api_router.get("/")
async def root():
    return {
        "message": "Hybrid Quantum Image Classifier API",
        "version": "1.0.0",
        "status": "running"
    }


@api_router.get("/health")
async def health_check():
    """Health check endpoint."""
    global inference_engine
    try:
        if inference_engine is None:
            inference_engine = get_inference_engine()
        return {
            "status": "healthy",
            "model_loaded": inference_engine is not None,
            "device": str(inference_engine.device) if inference_engine else "unknown"
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@api_router.get("/stats")
async def get_stats():
    """Get aggregated statistics from all predictions in history."""
    try:
        predictions = await db.predictions.find(
            {},
            {"_id": 0, "image_base64": 0, "gradcam_base64": 0, "quantum_state": 0, "classical_features": 0, "bloch_vectors": 0}
        ).to_list(10000)
        
        if not predictions:
            return {
                "total": 0,
                "by_class": {"Rain": 0, "Road": 0, "Sky": 0},
                "avg_confidence": {"Rain": 0.0, "Road": 0.0, "Sky": 0.0},
                "avg_latency_ms": 0.0,
                "latency_histogram": [],
                "class_distribution": [],
                "confidence_distribution": [],
                "recent_timeline": []
            }
        
        from collections import defaultdict
        import numpy as np
        
        counts = defaultdict(int)
        conf_sums = defaultdict(float)
        confidences_by_class = defaultdict(list)
        latencies = []
        
        for p in predictions:
            cls = p['predicted_class']
            counts[cls] += 1
            conf_sums[cls] += p['confidence']
            confidences_by_class[cls].append(p['confidence'])
            latencies.append(p['inference_time_ms'])
        
        total = len(predictions)
        avg_conf = {
            cls: (conf_sums[cls] / counts[cls]) if counts[cls] else 0.0
            for cls in ['Rain', 'Road', 'Sky']
        }
        by_class = {cls: counts.get(cls, 0) for cls in ['Rain', 'Road', 'Sky']}
        
        # Latency histogram
        if latencies:
            hist_counts, edges = np.histogram(latencies, bins=8)
            latency_hist = [
                {"bin": f"{edges[i]:.0f}", "range": f"{edges[i]:.0f}-{edges[i+1]:.0f}ms", "count": int(hist_counts[i])}
                for i in range(len(hist_counts))
            ]
        else:
            latency_hist = []
        
        # Class distribution for pie chart
        class_dist = [
            {"name": cls, "value": counts.get(cls, 0)}
            for cls in ['Rain', 'Road', 'Sky']
        ]
        
        # Confidence distribution (avg per class) for bar chart
        conf_dist = [
            {"class": cls, "avg_confidence": round(avg_conf[cls] * 100, 2)}
            for cls in ['Rain', 'Road', 'Sky']
        ]
        
        # Recent timeline (last 30 predictions)
        recent = sorted(predictions, key=lambda x: x['timestamp'])[-30:]
        recent_timeline = [
            {
                "index": i,
                "predicted_class": p['predicted_class'],
                "confidence": round(p['confidence'] * 100, 2),
                "latency": round(p['inference_time_ms'], 1)
            }
            for i, p in enumerate(recent)
        ]
        
        return {
            "total": total,
            "by_class": by_class,
            "avg_confidence": avg_conf,
            "avg_latency_ms": float(np.mean(latencies)) if latencies else 0.0,
            "min_latency_ms": float(np.min(latencies)) if latencies else 0.0,
            "max_latency_ms": float(np.max(latencies)) if latencies else 0.0,
            "latency_histogram": latency_hist,
            "class_distribution": class_dist,
            "confidence_distribution": conf_dist,
            "recent_timeline": recent_timeline
        }
        
    except Exception as e:
        logger.error(f"Stats aggregation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/circuit-info")
async def get_circuit_info():
    """Get quantum circuit topology for visualization."""
    global inference_engine
    try:
        if inference_engine is None:
            inference_engine = get_inference_engine()
        return inference_engine.get_circuit_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/upload-weights")
async def upload_weights(file: UploadFile = File(...)):
    """Upload trained model checkpoint (.pt file)."""
    global inference_engine
    try:
        # Save uploaded file
        checkpoint_dir = ROOT_DIR / "assets" / "checkpoints"
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = checkpoint_dir / "best_model.pt"
        
        contents = await file.read()
        checkpoint_path.write_bytes(contents)
        
        # Reload engine with new weights
        from ml_core import inference as inf_mod
        inf_mod._inference_engine = None
        inference_engine = get_inference_engine()
        
        return {
            "success": True,
            "message": "Weights uploaded and loaded",
            "weights_loaded": inference_engine.weights_loaded,
            "size_bytes": len(contents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.post("/predict", response_model=PredictionResult)
async def predict_image(file: UploadFile = File(...)):
    """Predict environmental scene from uploaded image."""
    global inference_engine
    
    try:
        # Initialize engine if needed
        if inference_engine is None:
            inference_engine = get_inference_engine()
        
        # Read and validate image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Run inference
        result = inference_engine.predict(image)
        
        # Generate GradCAM
        gradcam = inference_engine.generate_gradcam(image, result['predicted_class_idx'])
        
        # Compute Bloch vectors for each qubit
        bloch_vectors = inference_engine.get_bloch_vectors(image)
        
        # Convert image to base64 for response
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Create prediction object
        prediction = PredictionResult(
            predicted_class=result['predicted_class'],
            confidence=result['confidence'],
            probabilities=result['probabilities'],
            inference_time_ms=result['inference_time_ms'],
            image_base64=f"data:image/png;base64,{img_base64}",
            gradcam_base64=gradcam,
            quantum_state=result.get('quantum_state', []),
            classical_features=result.get('classical_features', []),
            bloch_vectors=bloch_vectors,
            weights_loaded=result.get('weights_loaded', False)
        )
        
        # Save to database
        doc = prediction.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.predictions.insert_one(doc)
        
        return prediction
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@api_router.post("/predict/frame")
async def predict_frame(file: UploadFile = File(...)):
    """Fast prediction for camera frames (no database storage)."""
    global inference_engine
    
    try:
        if inference_engine is None:
            inference_engine = get_inference_engine()
        
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        result = inference_engine.predict(image)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Frame prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/predict/video")
async def predict_video(file: UploadFile = File(...), max_frames: int = 30):
    """Analyze video frame-by-frame. Extracts up to max_frames uniformly spaced frames."""
    global inference_engine
    import cv2
    import tempfile
    
    try:
        if inference_engine is None:
            inference_engine = get_inference_engine()
        
        # Save uploaded video to temp file (OpenCV needs a path)
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail="Could not open video file")
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            duration_sec = total_frames / fps if fps else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Choose frame indices uniformly
            n_samples = min(max_frames, total_frames) if total_frames > 0 else max_frames
            if n_samples <= 0:
                raise HTTPException(status_code=400, detail="Video has no readable frames")
            
            if total_frames > 0:
                sample_indices = [int(i * total_frames / n_samples) for i in range(n_samples)]
            else:
                sample_indices = list(range(n_samples))
            
            predictions_per_frame = []
            
            for idx, frame_idx in enumerate(sample_indices):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret:
                    continue
                
                # Convert BGR to RGB and to PIL
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(frame_rgb)
                
                # Predict
                result = inference_engine.predict(pil_img)
                
                # Encode a small thumbnail
                thumb = pil_img.copy()
                thumb.thumbnail((160, 160))
                buf = io.BytesIO()
                thumb.save(buf, format='JPEG', quality=70)
                thumb_b64 = base64.b64encode(buf.getvalue()).decode()
                
                predictions_per_frame.append({
                    "index": idx,
                    "frame_number": frame_idx,
                    "timestamp_sec": round(frame_idx / fps, 3) if fps else 0,
                    "predicted_class": result['predicted_class'],
                    "confidence": result['confidence'],
                    "probabilities": result['probabilities'],
                    "inference_time_ms": result['inference_time_ms'],
                    "thumbnail": f"data:image/jpeg;base64,{thumb_b64}"
                })
            
            cap.release()
            
            # Compute summary
            from collections import Counter
            class_counts = Counter(f['predicted_class'] for f in predictions_per_frame)
            dominant = class_counts.most_common(1)[0][0] if class_counts else None
            avg_conf = sum(f['confidence'] for f in predictions_per_frame) / len(predictions_per_frame) if predictions_per_frame else 0
            
            return {
                "video_info": {
                    "total_frames": total_frames,
                    "fps": round(fps, 2),
                    "duration_sec": round(duration_sec, 2),
                    "width": width,
                    "height": height,
                    "frames_analyzed": len(predictions_per_frame)
                },
                "summary": {
                    "dominant_class": dominant,
                    "class_counts": dict(class_counts),
                    "avg_confidence": avg_conf
                },
                "frames": predictions_per_frame
            }
        finally:
            os.remove(tmp_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/history", response_model=List[PredictionHistory])
async def get_prediction_history(limit: int = 50):
    """Get prediction history."""
    try:
        predictions = await db.predictions.find(
            {},
            {"_id": 0, "image_base64": 0, "gradcam_base64": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Convert ISO timestamps back to datetime
        for pred in predictions:
            if isinstance(pred['timestamp'], str):
                pred['timestamp'] = datetime.fromisoformat(pred['timestamp'])
        
        return predictions
        
    except Exception as e:
        logger.error(f"History fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/prediction/{prediction_id}")
async def get_prediction(prediction_id: str):
    """Get specific prediction by ID."""
    try:
        prediction = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        if isinstance(prediction['timestamp'], str):
            prediction['timestamp'] = datetime.fromisoformat(prediction['timestamp'])
        
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/history")
async def clear_history():
    """Clear all prediction history."""
    try:
        result = await db.predictions.delete_many({})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("startup")
async def startup_event():
    """Initialize ML model on startup."""
    global inference_engine
    logger.info("Starting Hybrid Quantum Image Classifier API...")
    try:
        inference_engine = get_inference_engine()
        logger.info("✓ ML Engine loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load ML engine: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
