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
