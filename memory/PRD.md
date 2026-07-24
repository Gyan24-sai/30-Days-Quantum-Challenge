# Hybrid Quantum Image Classifier (HQIC) - PRD

## Original Problem Statement
Build a world-class, research-grade AI platform for environmental scene classification using Hybrid Quantum Machine Learning. Preserve existing Python backend (PyTorch + PennyLane + ResNet50 + VQC). Redesign only frontend with premium dark space theme, glassmorphism, and quantum aesthetics inspired by IBM Quantum / Google Quantum AI / NASA. Support 3 modes: Image Upload, Live Camera, Video Analysis. Show scene-specific info (Rain/Road/Sky).

## Architecture

### Backend (`/app/backend/`)
- **FastAPI** REST API with `/api` prefix
- **ML Core** (`/app/backend/ml_core/`):
  - `config/settings.py` - ModelConfig dataclass
  - `models/classical/feature_extractor.py` - ResNet50 backbone + ResidualLinearBlock + FeatureReductionHead
  - `models/quantum/circuit.py` - VariationalQuantumCircuit (PennyLane, StronglyEntanglingLayers, AngleEmbedding)
  - `models/hybrid/classifier.py` - HybridQuantumClassifier (CNN + Attention + VQC + Skip Connection + Classifier)
  - `utils/preprocessing.py` - CLAHE + Gamma correction + ImageNet normalization
  - `inference.py` - InferenceEngine singleton
- **MongoDB** for prediction history

### Frontend (`/app/frontend/`)
- **React** SPA with framer-motion animations
- **Dark space theme**: #050816 background, glassmorphism cards, cyan/purple/violet gradients
- **Typography**: Sora + Space Grotesk
- **Pages**: HomePage, UploadPage, CameraPage, VideoPage (Coming Soon), HistoryPage
- **Components**: QuantumBackground (particles), Sidebar, ResultDisplay, LoadingAnimation

## Core Requirements
- 3 environmental classes: Rain, Road, Sky
- Real-time inference via /api/predict endpoint
- Prediction history persistence in MongoDB
- Premium glassmorphism UI with quantum animations
- Responsive design (desktop, tablet, mobile)

## What's Been Implemented (2026-07-24)
- [x] Full ML pipeline preserved from user's hqic.py (ResNet50 + VQC + Attention + Skip)
- [x] FastAPI REST endpoints: /health, /predict, /predict/frame, /history, /prediction/{id}, DELETE /history
- [x] MongoDB storage of predictions
- [x] Premium React frontend with dark space theme
- [x] Quantum particle background animation
- [x] Sidebar navigation with active state indicator
- [x] Home page with hero, tech badges, feature cards
- [x] Upload page with drag & drop, preview, prediction
- [x] Live Camera page with webcam integration
- [x] Result display with confidence ring, probability bars, GradCAM placeholder, scene info
- [x] History page with prediction cards
- [x] Loading animation with quantum atom, orbits, electrons
- [x] Backend tested: 8/8 pytest cases pass
- [x] Frontend tested: All flows verified

## Prioritized Backlog
### P0 (Blocking / Core)
- None currently

### P1 (High Value)
- [ ] Real GradCAM implementation against ResNet50 last conv layer (currently placeholder)
- [ ] Video Analysis page - frame extraction + batch prediction + timeline visualization
- [ ] Trained model checkpoint loading (currently uses random initialization)

### P2 (Nice to Have)
- [ ] Quantum circuit visualization on result page
- [ ] Compare predictions side-by-side
- [ ] Export prediction reports as PDF
- [ ] Multi-image batch upload
- [ ] Dark/Light theme toggle

## User Personas
- **AI Researchers**: Want to explore quantum ML on real-world imagery
- **Academics**: Need to demonstrate hybrid quantum-classical architecture
- **Product Reviewers**: Evaluating premium research platforms (Google I/O, NVIDIA GTC audience)
