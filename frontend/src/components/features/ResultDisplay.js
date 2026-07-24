import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { getSceneInfo, formatConfidence, formatTime } from '../../utils/helpers';
import QuantumCircuitVisualizer from './QuantumCircuitVisualizer';
import './ResultDisplay.css';

const ResultDisplay = ({ result, onReset }) => {
  const sceneInfo = getSceneInfo(result.predicted_class);

  return (
    <div className="result-display" data-testid="result-display">
      <motion.div
        className="result-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="result-header">
          <motion.button
            className="back-button"
            onClick={onReset}
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
            <span>New Prediction</span>
          </motion.button>
          <h1 className="result-title">Prediction Results</h1>
        </div>

        <div className="result-grid">
          {/* Image Display */}
          <motion.div
            className="result-image-card glass-card"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h3>Input Image</h3>
            <div className="image-wrapper">
              <img
                src={result.image_base64}
                alt="Uploaded"
                className="result-image"
                data-testid="result-image"
              />
            </div>
          </motion.div>

          {/* Main Prediction */}
          <motion.div
            className="prediction-card glass-card glow-border"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            data-testid="prediction-card"
          >
            <div className="prediction-header">
              <div className="scene-icon" style={{ fontSize: '64px' }}>
                {sceneInfo.icon}
              </div>
              <div className="scene-badge" style={{ background: `${sceneInfo.color}20`, borderColor: `${sceneInfo.color}40`, color: sceneInfo.color }}>
                {result.predicted_class}
              </div>
            </div>

            <div className="confidence-ring-wrapper">
              <svg className="confidence-ring" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - result.confidence) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  transform="rotate(-90 100 100)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00D4FF" />
                    <stop offset="100%" stopColor="#00FFC8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="confidence-text">
                <div className="confidence-value">{formatConfidence(result.confidence)}</div>
                <div className="confidence-label">Confidence</div>
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-item">
                <Clock size={20} />
                <div>
                  <div className="metric-value">{formatTime(result.inference_time_ms)}</div>
                  <div className="metric-label">Inference Time</div>
                </div>
              </div>
              <div className="metric-item">
                <TrendingUp size={20} />
                <div>
                  <div className="metric-value">Quantum</div>
                  <div className="metric-label">Processing</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Probability Distribution */}
        <motion.div
          className="probabilities-card glass-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <h3>Probability Distribution</h3>
          <div className="prob-bars">
            {Object.entries(result.probabilities).map(([name, prob], idx) => (
              <div key={name} className="prob-item">
                <div className="prob-header">
                  <span className="prob-name">{name}</span>
                  <span className="prob-percent">{(prob * 100).toFixed(2)}%</span>
                </div>
                <div className="prob-bar-bg">
                  <motion.div
                    className="prob-bar-fill"
                    style={{ width: `${prob * 100}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${prob * 100}%` }}
                    transition={{ delay: 0.6 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* GradCAM Heatmap */}
        {result.gradcam_base64 && (
          <motion.div
            className="gradcam-card glass-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h3>Attention Heatmap (GradCAM)</h3>
            <div className="gradcam-wrapper">
              <img
                src={result.gradcam_base64}
                alt="GradCAM"
                className="gradcam-image"
                data-testid="gradcam-image"
              />
            </div>
            <p className="gradcam-description">
              Highlighted regions show where the ResNet50 last conv layer focused during prediction
            </p>
          </motion.div>
        )}

        {/* Quantum Circuit Visualizer */}
        <QuantumCircuitVisualizer
          quantumState={result.quantum_state}
          weightsLoaded={result.weights_loaded}
        />

        {/* Scene Information */}
        <motion.div
          className="scene-info-card glass-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="info-header">
            <AlertCircle size={24} color={sceneInfo.color} />
            <h3>{sceneInfo.description}</h3>
          </div>
          <ul className="info-details">
            {sceneInfo.details.map((detail, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + idx * 0.1, duration: 0.4 }}
              >
                {detail}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResultDisplay;