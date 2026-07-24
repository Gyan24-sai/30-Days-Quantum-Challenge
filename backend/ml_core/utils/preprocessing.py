import cv2
import numpy as np
import torch
import torchvision.transforms.v2 as v2
from PIL import Image
from typing import Tuple

class AdvancedPhotometricEnhancement:
    """Applies CLAHE and Gamma Correction for quantum encoding."""
    def __init__(self, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8), gamma: float = 1.2):
        self.clip_limit = clip_limit
        self.tile_grid_size = tile_grid_size
        self.gamma = gamma

    def __call__(self, img: Image.Image) -> Image.Image:
        img_np = np.array(img)
        lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=self.clip_limit, tileGridSize=self.tile_grid_size)
        cl = clahe.apply(l)
        
        limg = cv2.merge((cl, a, b))
        img_clahe = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
        
        # Gamma Correction
        inv_gamma = 1.0 / self.gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        img_gamma = cv2.LUT(img_clahe, table)
        
        return Image.fromarray(img_gamma)


class QuantumPreprocessor:
    """Production-grade preprocessing for quantum inference."""
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]

    def __init__(self, image_size: Tuple[int, int] = (64, 64)):
        self.image_size = image_size

    def get_inference_transforms(self) -> v2.Compose:
        """Clean, deterministic pipeline for inference."""
        return v2.Compose([
            v2.Resize(self.image_size, interpolation=v2.InterpolationMode.BILINEAR, antialias=True),
            AdvancedPhotometricEnhancement(clip_limit=2.0, gamma=1.2),
            v2.ToImage(),
            v2.ToDtype(torch.float32, scale=True),
            v2.Normalize(mean=self.IMAGENET_MEAN, std=self.IMAGENET_STD)
        ])