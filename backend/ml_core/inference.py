import time
from typing import Dict, Tuple, Optional
import io
import base64
import os
from pathlib import Path

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


class GradCAM:
    """GradCAM for ResNet50 last conv layer (layer4)."""
    
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.gradients = None
        
        # Register hooks
        target_layer.register_forward_hook(self._save_activations)
        target_layer.register_full_backward_hook(self._save_gradients)
    
    def _save_activations(self, module, input, output):
        self.activations = output.detach()
    
    def _save_gradients(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()
    
    def generate(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        """Generate GradCAM heatmap for target class."""
        # Enable gradient tracking on input
        input_tensor = input_tensor.clone().detach().requires_grad_(True)
        
        # Forward pass in train mode context to allow gradient flow
        self.model.eval()
        for param in self.target_layer.parameters():
            param.requires_grad_(True)
        
        # Forward
        output = self.model(input_tensor)
        
        # Backward from target class
        self.model.zero_grad()
        target_score = output[0, target_class]
        target_score.backward(retain_graph=False)
        
        # Restore frozen state
        for param in self.target_layer.parameters():
            param.requires_grad_(False)
        
        if self.activations is None or self.gradients is None:
            return None
        
        # Compute weights (global average pool of gradients)
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)  # (1, C, 1, 1)
        
        # Weighted sum of activations
        cam = (weights * self.activations).sum(dim=1, keepdim=True)  # (1, 1, H, W)
        cam = F.relu(cam)
        
        # Normalize
        cam = cam.squeeze().cpu().numpy()
        if cam.max() > 0:
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        
        return cam


class InferenceEngine:
    """Production inference engine for Hybrid Quantum Classifier."""
    
    CLASS_NAMES = ['Rain', 'Road', 'Sky']
    
    def __init__(self, model_path: Optional[str] = None):
        self.config = ModelConfig()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Inference Engine initialized on device: {self.device}")
        
        # Load model
        self.model = HybridQuantumClassifier(self.config)
        
        # Try to load trained weights
        default_ckpt = Path(__file__).parent.parent / "assets" / "checkpoints" / "best_model.pt"
        checkpoint_path = model_path or (str(default_ckpt) if default_ckpt.exists() else None)
        
        self.weights_loaded = False
        if checkpoint_path and os.path.exists(checkpoint_path):
            try:
                checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
                
                # Handle both raw state_dict and wrapped checkpoint from trainer
                if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                    state_dict = checkpoint['model_state_dict']
                    logger.info(f"Loaded wrapped checkpoint (epoch {checkpoint.get('epoch', '?')})")
                else:
                    state_dict = checkpoint
                
                self.model.load_state_dict(state_dict, strict=False)
                self.weights_loaded = True
                logger.info(f"✓ Trained weights loaded from {checkpoint_path}")
            except Exception as e:
                logger.warning(f"Could not load model weights: {e}. Using random initialization.")
        else:
            logger.warning("No trained checkpoint found. Using random initialization (predictions won't be accurate).")
        
        self.model.to(self.device)
        self.model.eval()
        
        # Preprocessing
        self.preprocessor = QuantumPreprocessor(image_size=self.config.image_size)
        self.transform = self.preprocessor.get_inference_transforms()
        
        # Setup GradCAM on ResNet50 layer4 (last conv block)
        self.gradcam = None
        try:
            resnet_backbone = self.model.feature_extractor.backbone
            if hasattr(resnet_backbone, 'layer4'):
                self.gradcam = GradCAM(self.model, resnet_backbone.layer4)
                logger.info("✓ GradCAM initialized on ResNet50 layer4")
        except Exception as e:
            logger.warning(f"Could not init GradCAM: {e}")
        
        # Capture quantum state hook
        self._last_quantum_state = None
        self._last_classical_features = None
        self._setup_quantum_hooks()
    
    def _setup_quantum_hooks(self):
        """Register hooks to capture quantum circuit outputs."""
        def capture_quantum(module, input, output):
            self._last_quantum_state = output.detach().cpu().numpy()
        
        def capture_classical(module, input, output):
            self._last_classical_features = output.detach().cpu().numpy()
        
        self.model.quantum_circuit.register_forward_hook(capture_quantum)
        self.model.attention_block.register_forward_hook(capture_classical)
    
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
        
        # Extract quantum state
        quantum_state = []
        if self._last_quantum_state is not None:
            quantum_state = self._last_quantum_state[0].tolist()  # First batch item
        
        classical_features = []
        if self._last_classical_features is not None:
            classical_features = self._last_classical_features[0].tolist()
        
        result = {
            "predicted_class": self.CLASS_NAMES[predicted_class],
            "predicted_class_idx": predicted_class,
            "confidence": float(confidence),
            "probabilities": {
                name: float(prob) for name, prob in zip(self.CLASS_NAMES, probabilities.cpu().numpy())
            },
            "inference_time_ms": float(inference_time * 1000),
            "quantum_state": quantum_state,
            "classical_features": classical_features,
            "weights_loaded": self.weights_loaded
        }
        
        return result
    
    def generate_gradcam(self, image: Image.Image, target_class: int) -> Optional[str]:
        """Generate real GradCAM heatmap overlaid on original image."""
        if self.gradcam is None:
            return None
        
        try:
            # Preprocess for model
            input_tensor = self.preprocess_image(image)
            
            # Generate CAM
            cam = self.gradcam.generate(input_tensor, target_class)
            if cam is None:
                return None
            
            # Get original image at model input size
            img_array = np.array(image.convert('RGB').resize(self.config.image_size))
            
            # Upsample CAM to image size
            cam_resized = cv2.resize(cam, self.config.image_size)
            cam_uint8 = (cam_resized * 255).astype(np.uint8)
            
            # Apply colormap
            heatmap = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
            heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
            
            # Overlay
            overlay = cv2.addWeighted(img_array, 0.55, heatmap, 0.45, 0)
            
            # Upscale for better display quality
            display_size = (512, 512)
            overlay = cv2.resize(overlay, display_size, interpolation=cv2.INTER_CUBIC)
            
            # Convert to base64
            pil_img = Image.fromarray(overlay)
            buffer = io.BytesIO()
            pil_img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            logger.error(f"GradCAM generation failed: {e}")
            return None
    
    def get_circuit_info(self) -> Dict:
        """Get quantum circuit topology and specifications."""
        vqc = self.model.quantum_circuit
        
        # Build gate description with sub-layers for clean visualization
        gates = []
        layer_idx = 0
        
        # Encoding layer
        for q in range(vqc.n_qubits):
            gates.append({
                "type": "encoding",
                "gate": "RY",
                "qubit": q,
                "layer": layer_idx,
                "label": "Ry(x)"
            })
        layer_idx += 1
        
        # Variational layers (each = rotation sub-layer + entanglement sub-layer)
        for layer in range(vqc.n_layers):
            # Rotation sub-layer
            for q in range(vqc.n_qubits):
                gates.append({
                    "type": "variational",
                    "gate": "Rot",
                    "qubit": q,
                    "layer": layer_idx,
                    "label": f"Rot(θ,φ,ω)",
                    "block": layer + 1
                })
            layer_idx += 1
            
            # Entanglement sub-layer
            for q in range(vqc.n_qubits):
                target = (q + 1) % vqc.n_qubits
                gates.append({
                    "type": "entangle",
                    "gate": "CNOT",
                    "qubit": q,
                    "target": target,
                    "layer": layer_idx,
                    "block": layer + 1
                })
            layer_idx += 1
        
        # Measurement
        for q in range(vqc.n_qubits):
            gates.append({
                "type": "measure",
                "gate": "PauliZ",
                "qubit": q,
                "layer": layer_idx,
                "label": "⟨Z⟩"
            })
        
        return {
            "n_qubits": vqc.n_qubits,
            "n_layers": vqc.n_layers,
            "embedding_type": vqc.embedding_type,
            "ansatz_type": vqc.ansatz_type,
            "backend": vqc.backend_name,
            "total_params": int(np.prod(vqc.weight_shapes["weights"])),
            "gates": gates
        }


# Global inference engine instance
_inference_engine = None

def get_inference_engine() -> InferenceEngine:
    """Get or create global inference engine."""
    global _inference_engine
    if _inference_engine is None:
        _inference_engine = InferenceEngine()
    return _inference_engine
