import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Upload, CheckCircle2, AlertCircle, FileWarning } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health`);
        setHealth(await r.json());
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [result]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.pt') && !f.name.endsWith('.pth')) {
      setError('Please select a .pt or .pth checkpoint file');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload-weights`, {
        method: 'POST',
        body: formData,
      });
      
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail || 'Upload failed');
      }
      
      const d = await r.json();
      setResult(d);
      setFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="settings-page" data-testid="settings-page">
      <motion.div
        className="settings-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="settings-header">
          <h1 className="page-title">
            <SettingsIcon size={38} />
            Settings
          </h1>
          <p className="page-subtitle">
            Manage the model checkpoint powering the Hybrid Quantum Classifier
          </p>
        </div>

        {/* Model Status Card */}
        <motion.div
          className="status-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="model-status-card"
        >
          <h3>Model Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-key">Device</span>
              <span className="status-val">{health?.device || '—'}</span>
            </div>
            <div className="status-item">
              <span className="status-key">Model Loaded</span>
              <span className="status-val" style={{ color: health?.model_loaded ? '#00FFC8' : '#FF8C42' }}>
                {health?.model_loaded ? '✓ Ready' : '✗ Not Ready'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-key">Backend Status</span>
              <span className="status-val" style={{ color: health?.status === 'healthy' ? '#00FFC8' : '#FF4444' }}>
                {health?.status || 'unknown'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Checkpoint Upload */}
        <motion.div
          className="upload-card glass-card glow-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Upload Trained Checkpoint</h3>
          <p className="upload-hint">
            Drop your trained <code>best_model.pt</code> file below. Both raw <code>state_dict</code>
            and wrapped checkpoints from the trainer (<code>{'{'}"model_state_dict": ..., "epoch": ...{'}'}</code>)
            are supported. The engine will hot-reload automatically.
          </p>

          <div className="upload-zone" data-testid="weight-upload-zone">
            <input
              type="file"
              id="ckpt-input"
              accept=".pt,.pth"
              onChange={handleFile}
              style={{ display: 'none' }}
              data-testid="ckpt-file-input"
            />
            <label htmlFor="ckpt-input" className="upload-zone-label">
              <Upload size={40} />
              <div className="upload-text">
                {file ? file.name : 'Click to select .pt / .pth file'}
              </div>
              {file && <div className="upload-size">{formatSize(file.size)}</div>}
            </label>
          </div>

          {file && !result && (
            <motion.button
              className="upload-btn quantum-btn"
              onClick={handleUpload}
              disabled={uploading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="upload-weights-btn"
            >
              <Upload size={18} />
              <span>{uploading ? 'Uploading & Loading Weights…' : 'Upload & Activate'}</span>
            </motion.button>
          )}

          {error && (
            <motion.div
              className="msg-card msg-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="upload-error"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {result && (
            <motion.div
              className="msg-card msg-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="upload-success"
            >
              <CheckCircle2 size={18} />
              <div>
                <strong>Weights loaded successfully</strong>
                <div className="msg-sub">
                  {formatSize(result.size_bytes)} · Engine reloaded · Trained weights: {result.weights_loaded ? 'active' : 'not active (check .pt format)'}
                </div>
              </div>
            </motion.div>
          )}

          {!result && (
            <div className="msg-card msg-warn" data-testid="untrained-notice">
              <FileWarning size={18} />
              <div>
                <strong>Currently running on random weights</strong>
                <div className="msg-sub">
                  Predictions will not be semantically accurate until you upload a trained checkpoint.
                  Alternatively, drop your file directly at <code>/app/backend/assets/checkpoints/best_model.pt</code>.
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Architecture Info */}
        <motion.div
          className="arch-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Model Architecture</h3>
          <div className="arch-grid">
            <div className="arch-block">
              <div className="arch-num">01</div>
              <div className="arch-name">Classical Backbone</div>
              <div className="arch-desc">ResNet50 (frozen, ImageNet pretrained)</div>
            </div>
            <div className="arch-connector">→</div>
            <div className="arch-block">
              <div className="arch-num">02</div>
              <div className="arch-name">Reduction Head</div>
              <div className="arch-desc">2048 → 256 → 64 → 4 (Tanh)</div>
            </div>
            <div className="arch-connector">→</div>
            <div className="arch-block">
              <div className="arch-num">03</div>
              <div className="arch-name">Attention Bridge</div>
              <div className="arch-desc">Multi-Head Self-Attention</div>
            </div>
            <div className="arch-connector">→</div>
            <div className="arch-block quantum">
              <div className="arch-num">04</div>
              <div className="arch-name">VQC</div>
              <div className="arch-desc">4 qubits · 2 layers · StronglyEntangling</div>
            </div>
            <div className="arch-connector">→</div>
            <div className="arch-block">
              <div className="arch-num">05</div>
              <div className="arch-name">Classifier</div>
              <div className="arch-desc">Skip-concat → 3 classes</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
