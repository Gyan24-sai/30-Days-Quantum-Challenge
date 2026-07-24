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
- [x] Result display with confidence ring, probability bars, scene info
- [x] History page with prediction cards
- [x] Loading animation with quantum atom, orbits, electrons
- [x] Backend tested: 8/8 pytest cases pass
- [x] Frontend tested: All flows verified

## Iteration 2 (2026-07-24)
- [x] **Real GradCAM** on ResNet50 layer4 (forward + backward hooks, gradient-weighted activation maps, upsampled to 512x512, JET colormap overlay)
- [x] **Quantum Circuit Visualizer** SVG component - shows 4 qubit wires, RY encoding gates, Rot rotation gates, CNOT entanglement ring, PauliZ measurements with LIVE expectation values from every inference
- [x] `/api/circuit-info` endpoint returns full gate topology
- [x] **Robust Weights Loading** - handles both raw state_dict and wrapped checkpoint (with 'model_state_dict' key from trainer); `/api/upload-weights` endpoint for uploading trained .pt file
- [x] Weights notice on result page directs user to drop checkpoint at `/app/backend/assets/checkpoints/best_model.pt` when running with random init

## Iteration 3 (2026-07-24)
- [x] **Bloch Sphere Visualizer** - SVG-based 3D-projected Bloch sphere per qubit showing live X/Y/Z Pauli expectation values, state vector arrow, coordinates, and purity bar. Diagnostic PennyLane QNode runs the trained circuit with PauliX/PauliY/PauliZ observables
- [x] **Analytics Dashboard** (`/api/stats` + StatsPage) - Recharts-based research view: summary cards (total, avg/min/max latency), predicted class distribution pie, avg confidence bar, latency histogram, recent confidence timeline. Aggregates from live MongoDB predictions
- [x] **Settings Page** with checkpoint upload UI - drag-drop .pt/.pth file → POST /api/upload-weights → hot-reload engine. Model status card (device, loaded, health) + 5-stage architecture flow diagram
- [x] Backend: 13/13 pytest cases pass. Frontend: all nav + new pages verified

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
