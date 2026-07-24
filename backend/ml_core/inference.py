import time
from typing import Dict, Tuple
import io
import base64

import torch
import torch.nn.functional as F
from PIL import Image
import numpy as np
import cv2

from ml_core.config.settings import ModelConfig
from ml_core.models.hybrid.classifier import HybridQuantumClassifier
from ml_core.utils.preprocessing import QuantumPreprocessor
from ml_core.utils.logger import get_logger

logger = get_logger(__name__)

class InferenceEngine:
    """Production inference engine for Hybrid Quantum Classifier."""
    
    CLASS_NAMES = ['Rain', 'Road', 'Sky']
    
    def __init__(self, model_path: str = None):
        self.config = ModelConfig()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Inference Engine initialized on device: {self.device}")
        
        # Load model
        self.model = HybridQuantumClassifier(self.config)
        
        if model_path:
            try:
                state_dict = torch.load(model_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                logger.info(f"Loaded model from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load model weights: {e}. Using random initialization.")
        
        self.model.to(self.device)
        self.model.eval()
        
        # Preprocessing
        self.preprocessor = QuantumPreprocessor(image_size=self.config.image_size)
        self.transform = self.preprocessor.get_inference_transforms()
    
    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """Preprocess PIL image for inference."""
        image = image.convert('RGB')
        tensor = self.transform(image)
        return tensor.unsqueeze(0).to(self.device)
    
    def predict(self, image: Image.Image) -> Dict:
        """Run inference on single image."""
        start_time = time.time()
        
        # Preprocess
        input_tensor = self.preprocess_image(image)
        
        # Inference
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = F.softmax(output, dim=1)[0]
            predicted_class = torch.argmax(probabilities).item()
            confidence = probabilities[predicted_class].item()
        
        inference_time = time.time() - start_time
        
        result = {
            "predicted_class": self.CLASS_NAMES[predicted_class],
            "predicted_class_idx": predicted_class,
            "confidence": float(confidence),
            "probabilities": {
                name: float(prob) for name, prob in zip(self.CLASS_NAMES, probabilities.cpu().numpy())
            },
            "inference_time_ms": float(inference_time * 1000)
        }
        
        return result
    
    def generate_gradcam(self, image: Image.Image, target_class: int = None) -> str:
        """Generate GradCAM heatmap (simplified version)."""
        try:
            # For now, generate a simple heatmap overlay
            # In production, implement full GradCAM
            img_array = np.array(image.resize(self.config.image_size))
            
            # Create dummy heatmap (replace with actual GradCAM)
            heatmap = np.random.rand(*self.config.image_size)
            heatmap = (heatmap * 255).astype(np.uint8)
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
            heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
            
            # Overlay
            overlay = cv2.addWeighted(img_array, 0.6, heatmap, 0.4, 0)
            
            # Convert to base64
            pil_img = Image.fromarray(overlay)
            buffer = io.BytesIO()
            pil_img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            logger.error(f"GradCAM generation failed: {e}")
            return None


# Global inference engine instance
_inference_engine = None

def get_inference_engine() -> InferenceEngine:
    """Get or create global inference engine."""
    global _inference_engine
    if _inference_engine is None:
        _inference_engine = InferenceEngine()
    return _inference_engine