import math
from typing import Any, Dict, List, Tuple

import torch
import torch.nn as nn
from ml_core.utils.logger import get_logger

try:
    import pennylane as qml
except ImportError:
    raise ImportError("PennyLane required: pip install pennylane")

logger = get_logger(__name__)

class VariationalQuantumCircuit(nn.Module):
    """Advanced Quantum Circuit using PennyLane."""
    SUPPORTED_EMBEDDINGS = {'angle', 'amplitude', 'iqp'}
    SUPPORTED_ANSATZES = {'strongly_entangling', 'basic', 'hardware_efficient'}

    def __init__(self, config: Any):
        super().__init__()
        
        self.n_qubits = getattr(config, 'n_qubits', 4)
        self.n_layers = getattr(config, 'n_quantum_layers', 2)
        self.embedding_type = getattr(config, 'embedding_type', 'angle').lower()
        self.ansatz_type = getattr(config, 'ansatz_type', 'strongly_entangling').lower()
        self.backend_name = getattr(config, 'backend_name', 'default.qubit').lower()
        
        if self.embedding_type not in self.SUPPORTED_EMBEDDINGS:
            raise ValueError(f"Unsupported embedding: {self.embedding_type}")
        
        if self.ansatz_type not in self.SUPPORTED_ANSATZES:
            raise ValueError(f"Unsupported ansatz: {self.ansatz_type}")
        
        self.dev = self._initialize_device()
        self.weight_shapes = self._get_weight_shapes()
        self.qnode = qml.QNode(self._circuit, self.dev, interface="torch")
        self.q_layer = qml.qnn.TorchLayer(self.qnode, self.weight_shapes)
        
        logger.info(f"VQC: {self.n_qubits} Qubits | Embedding: {self.embedding_type} | Ansatz: {self.ansatz_type}")

    def _initialize_device(self):
        logger.info(f"Initializing quantum backend: {self.backend_name}")
        try:
            if self.backend_name == 'lightning.qubit':
                return qml.device("lightning.qubit", wires=self.n_qubits)
        except Exception as e:
            logger.warning(f"Failed to load {self.backend_name}: {e}. Using default.qubit")
        return qml.device("default.qubit", wires=self.n_qubits)

    def _get_weight_shapes(self) -> Dict[str, Tuple[int, ...]]:
        if self.ansatz_type == 'strongly_entangling':
            return {"weights": (self.n_layers, self.n_qubits, 3)}
        elif self.ansatz_type == 'basic':
            return {"weights": (self.n_layers, self.n_qubits)}
        elif self.ansatz_type == 'hardware_efficient':
            return {"weights": (self.n_layers, self.n_qubits, 2)}
        return {}

    def _apply_embedding(self, inputs: torch.Tensor):
        if self.embedding_type == 'angle':
            qml.AngleEmbedding(inputs, wires=range(self.n_qubits), rotation='Y')
        elif self.embedding_type == 'amplitude':
            qml.AmplitudeEmbedding(inputs, wires=range(self.n_qubits), normalize=True, pad_with=0.0)
        elif self.embedding_type == 'iqp':
            qml.IQPEmbedding(inputs, wires=range(self.n_qubits), n_repeats=2)

    def _apply_ansatz(self, weights: torch.Tensor):
        if self.ansatz_type == 'strongly_entangling':
            qml.StronglyEntanglingLayers(weights, wires=range(self.n_qubits))
        elif self.ansatz_type == 'basic':
            qml.BasicEntanglerLayers(weights, wires=range(self.n_qubits))
        elif self.ansatz_type == 'hardware_efficient':
            for layer in range(self.n_layers):
                for i in range(self.n_qubits):
                    qml.RY(weights[layer, i, 0], wires=i)
                    qml.RZ(weights[layer, i, 1], wires=i)
                for i in range(self.n_qubits - 1):
                    qml.CNOT(wires=[i, i + 1])
                if self.n_qubits > 2:
                    qml.CNOT(wires=[self.n_qubits - 1, 0])

    def _circuit(self, inputs: torch.Tensor, weights: torch.Tensor) -> List[Any]:
        self._apply_embedding(inputs)
        self._apply_ansatz(weights)
        return [qml.expval(qml.PauliZ(wires=i)) for i in range(self.n_qubits)]

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.q_layer(x)