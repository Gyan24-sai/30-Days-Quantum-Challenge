import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import { Camera, CameraOff, Zap, Activity } from 'lucide-react';
import { api } from '../utils/api';
import { formatConfidence } from '../utils/helpers';
import './CameraPage.css';

const CameraPage = () => {
  const webcamRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);

  const captureAndPredict = useCallback(async () => {
    if (!webcamRef.current || isProcessing) return;

    const startTime = performance.now();
    setIsProcessing(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      const blob = await fetch(imageSrc).then(r => r.blob());
      const result = await api.predictFrame(blob);
      
      setPrediction(result);
      setError(null);
      
      const endTime = performance.now();
      const newFps = 1000 / (endTime - startTime);
      setFps(newFps.toFixed(1));
    } catch (err) {
      setError('Prediction failed');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const toggleCamera = () => {
    setIsActive(!isActive);
    if (isActive) {
      setPrediction(null);
      setFps(0);
    }
  };

  return (
    <div className="camera-page" data-testid="camera-page">
      <motion.div
        className="camera-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="camera-header">
          <h1 className="page-title" data-testid="camera-title">Live Camera</h1>
          <p className="page-subtitle">
            Real-time environmental scene prediction from webcam
          </p>
        </div>

        <div className="camera-main">
          <div className="camera-view-wrapper">
            <div className="camera-view glass-card glow-border" data-testid="camera-view">
              {isActive ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="webcam"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: 'user',
                  }}
                  data-testid="webcam"
                />
              ) : (
                <div className="camera-placeholder">
                  <CameraOff size={80} />
                  <p>Camera is off</p>
                </div>
              )}
              
              {isActive && (
                <div className="camera-overlay">
                  <div className="camera-corners">
                    <div className="corner top-left"></div>
                    <div className="corner top-right"></div>
                    <div className="corner bottom-left"></div>
                    <div className="corner bottom-right"></div>
                  </div>
                  
                  <div className="camera-status">
                    <div className="status-indicator">
                      <Activity className="pulse-icon" size={16} />
                      <span>LIVE</span>
                    </div>
                    <div className="fps-counter">
                      {fps} FPS
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="camera-controls">
              <motion.button
                className={`control-btn ${isActive ? 'active' : ''}`}
                onClick={toggleCamera}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="toggle-camera-button"
              >
                {isActive ? <CameraOff size={24} /> : <Camera size={24} />}
                <span>{isActive ? 'Stop Camera' : 'Start Camera'}</span>
              </motion.button>

              {isActive && (
                <motion.button
                  className="predict-btn quantum-btn"
                  onClick={captureAndPredict}
                  disabled={isProcessing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="capture-predict-button"
                >
                  <Zap size={20} />
                  <span>{isProcessing ? 'Processing...' : 'Capture & Predict'}</span>
                </motion.button>
              )}
            </div>
          </div>

          {prediction && (
            <motion.div
              className="live-prediction glass-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              data-testid="live-prediction"
            >
              <h3>Live Prediction</h3>
              
              <div className="prediction-result">
                <div className="predicted-class">
                  {prediction.predicted_class}
                </div>
                <div className="confidence-display">
                  {formatConfidence(prediction.confidence)}
                </div>
              </div>

              <div className="probability-bars">
                {Object.entries(prediction.probabilities || {}).map(([name, prob]) => (
                  <div key={name} className="prob-bar-wrapper">
                    <div className="prob-label">
                      <span>{name}</span>
                      <span>{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="prob-bar-track">
                      <motion.div
                        className="prob-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${prob * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="inference-time">
                Inference: {prediction.inference_time_ms?.toFixed(2)}ms
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CameraPage;
