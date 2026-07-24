from dataclasses import dataclass
from typing import Tuple

@dataclass
class ModelConfig:
    """Centralized configuration for the Hybrid Quantum Model."""
    image_size: Tuple[int, int] = (64, 64)
    batch_size: int = 32
    learning_rate: float = 0.001
    epochs: int = 20
    n_qubits: int = 4
    n_quantum_layers: int = 2
    num_classes: int = 3  # Rain, Road, Sky
    backbone_name: str = 'resnet50'
    embedding_type: str = 'angle'
    ansatz_type: str = 'strongly_entangling'
    backend_name: str = 'default.qubit'
    checkpoint_dir: str = "./assets/checkpoints/"
    model_path: str = "./assets/checkpoints/best_model.pt"