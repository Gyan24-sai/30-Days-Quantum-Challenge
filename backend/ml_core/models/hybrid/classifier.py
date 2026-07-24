from typing import List, Optional

import torch
import torch.nn as nn

from ml_core.config.settings import ModelConfig
from ml_core.models.classical.feature_extractor import ClassicalFeatureExtractor
from ml_core.models.quantum.circuit import VariationalQuantumCircuit
from ml_core.utils.logger import get_logger

logger = get_logger(__name__)

class FeatureAttentionBlock(nn.Module):
    """Self-Attention for classical features before quantum encoding."""
    def __init__(self, embed_dim: int, dropout: float = 0.1):
        super().__init__()
        self.attention = nn.MultiheadAttention(
            embed_dim, num_heads=1, dropout=dropout, batch_first=True
        )
        self.norm1 = nn.LayerNorm(embed_dim)
        self.norm2 = nn.LayerNorm(embed_dim)
        
        self.ffn = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim * 2, embed_dim)
        )
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x_seq = x.unsqueeze(1)
        attn_out, _ = self.attention(x_seq, x_seq, x_seq)
        x_seq = self.norm1(x_seq + self.dropout(attn_out))
        ffn_out = self.ffn(x_seq)
        x_seq = self.norm2(x_seq + self.dropout(ffn_out))
        return x_seq.squeeze(1)


class FlexibleClassifierHead(nn.Module):
    """Flexible classification head with configurable layers."""
    def __init__(self, in_features: int, num_classes: int,
                 hidden_dims: Optional[List[int]] = None, dropout: float = 0.3):
        super().__init__()
        
        if hidden_dims is None:
            hidden_dims = [in_features // 2] if in_features > 4 else []
        
        layers = []
        current_dim = in_features
        
        for h_dim in hidden_dims:
            if h_dim > 0:
                layers.extend([
                    nn.Linear(current_dim, h_dim),
                    nn.LayerNorm(h_dim),
                    nn.GELU(),
                    nn.Dropout(dropout)
                ])
                current_dim = h_dim
        
        layers.append(nn.Linear(current_dim, num_classes))
        self.head = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(x)


class HybridQuantumClassifier(nn.Module):
    """Hybrid Quantum-Classical Model combining CNN, Attention, and VQC."""
    def __init__(self, config: ModelConfig, clf_hidden_dims: Optional[List[int]] = None,
                 dropout_rate: float = 0.3):
        super().__init__()
        self.config = config
        logger.info("Initializing Hybrid Quantum-Classical Classifier")
        
        # Classical Feature Extraction
        backbone = getattr(config, 'backbone_name', 'resnet50')
        self.feature_extractor = ClassicalFeatureExtractor(
            output_dim=config.n_qubits,
            backbone_name=backbone
        )
        
        # Attention Bridge
        self.attention_block = FeatureAttentionBlock(
            embed_dim=config.n_qubits,
            dropout=dropout_rate
        )
        
        # Quantum Circuit
        self.quantum_circuit = VariationalQuantumCircuit(config)
        
        # Skip Connection: Concat classical + quantum
        combined_dim = config.n_qubits * 2
        
        # Classifier Head
        self.classifier = FlexibleClassifierHead(
            in_features=combined_dim,
            num_classes=config.num_classes,
            hidden_dims=clf_hidden_dims,
            dropout=dropout_rate
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Classical features
        x_c = self.feature_extractor(x)
        
        # Attention refinement
        x_attn = self.attention_block(x_c)
        
        # Quantum processing
        x_q = self.quantum_circuit(x_attn)
        
        # Skip connection: concat classical + quantum
        x_skip = torch.cat([x_attn, x_q], dim=1)
        
        # Classification
        out = self.classifier(x_skip)
        return out