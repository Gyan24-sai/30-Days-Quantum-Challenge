import torch
import torch.nn as nn
import torchvision.models as models
from typing import List, Optional
from ml_core.utils.logger import get_logger

logger = get_logger(__name__)

class ResidualLinearBlock(nn.Module):
    """Residual block for feature reduction."""
    def __init__(self, in_dim: int, out_dim: int, dropout_rate: float, norm_type: str):
        super().__init__()
        self.fc = nn.Linear(in_dim, out_dim)
        
        if norm_type == 'batch':
            self.norm = nn.BatchNorm1d(out_dim)
        elif norm_type == 'layer':
            self.norm = nn.LayerNorm(out_dim)
        else:
            raise ValueError(f"Unsupported norm_type: {norm_type}")
        
        self.activation = nn.GELU()
        self.dropout = nn.Dropout(dropout_rate)
        self.shortcut = nn.Identity() if in_dim == out_dim else nn.Linear(in_dim, out_dim, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.shortcut(x)
        out = self.fc(x)
        out = self.norm(out)
        out = out + residual
        out = self.activation(out)
        out = self.dropout(out)
        return out


class FeatureReductionHead(nn.Module):
    """Reduces classical features to qubit dimension."""
    def __init__(self, in_features: int, out_features: int, hidden_dims: List[int],
                 dropout_rate: float = 0.3, norm_type: str = 'layer'):
        super().__init__()
        logger.info(f"Building Reduction Head: {in_features} -> {hidden_dims} -> {out_features}")
        
        layers = []
        current_dim = in_features
        
        for h_dim in hidden_dims:
            layers.append(ResidualLinearBlock(current_dim, h_dim, dropout_rate, norm_type))
            current_dim = h_dim
        
        self.blocks = nn.Sequential(*layers)
        self.final_norm = nn.BatchNorm1d(current_dim) if norm_type == 'batch' else nn.LayerNorm(current_dim)
        self.final_fc = nn.Linear(current_dim, out_features)
        self.final_act = nn.Tanh()
        
        self._initialize_weights()

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity='linear')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.blocks(x)
        x = self.final_norm(x)
        x = self.final_fc(x)
        return self.final_act(x)


class ClassicalFeatureExtractor(nn.Module):
    """Classical CNN backbone for feature extraction."""
    SUPPORTED_BACKBONES = {'resnet50', 'efficientnet_b0', 'efficientnet_v2_s',
                           'convnext_tiny', 'mobilenet_v3'}

    def __init__(self, output_dim: int, backbone_name: str = 'resnet50',
                 hidden_dims: Optional[List[int]] = None, dropout_rate: float = 0.3,
                 norm_type: str = 'layer'):
        super().__init__()
        self.backbone_name = backbone_name.lower()
        self.output_dim = output_dim
        
        if hidden_dims is None:
            hidden_dims = [256, 64]
        
        if self.backbone_name not in self.SUPPORTED_BACKBONES:
            raise ValueError(f"Backbone '{self.backbone_name}' not supported")
        
        logger.info(f"Initializing {self.backbone_name.upper()} as Classical Feature Extractor")
        self.backbone = self._build_backbone()
        self._freeze_backbone()
        
        in_features = self._get_feature_dim()
        logger.info(f"Backbone feature dimension: {in_features}")
        
        self.reduction_head = FeatureReductionHead(
            in_features=in_features,
            out_features=self.output_dim,
            hidden_dims=hidden_dims,
            dropout_rate=dropout_rate,
            norm_type=norm_type
        )

    def _build_backbone(self) -> nn.Module:
        if self.backbone_name == 'resnet50':
            model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
            model.fc = nn.Identity()
        elif self.backbone_name == 'efficientnet_b0':
            model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
            model.classifier = nn.Identity()
        elif self.backbone_name == 'efficientnet_v2_s':
            model = models.efficientnet_v2_s(weights=models.EfficientNet_V2_S_Weights.DEFAULT)
            model.classifier = nn.Identity()
        elif self.backbone_name == 'convnext_tiny':
            model = models.convnext_tiny(weights=models.ConvNeXt_Tiny_Weights.DEFAULT)
            model.classifier = nn.Identity()
        elif self.backbone_name == 'mobilenet_v3':
            model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.DEFAULT)
            model.classifier = nn.Identity()
        return model

    def _freeze_backbone(self):
        for param in self.backbone.parameters():
            param.requires_grad = False
        logger.info("Backbone layers frozen")

    def _get_feature_dim(self) -> int:
        dummy_input = torch.randn(1, 3, 64, 64)
        with torch.no_grad():
            out = self.backbone(dummy_input)
            out = torch.flatten(out, 1)
        return out.shape[1]

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = torch.flatten(x, 1)
        x = self.reduction_head(x)
        return x