import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../utils/api';
import ResultDisplay from '../components/features/ResultDisplay';
import LoadingAnimation from '../components/features/LoadingAnimation';
import './UploadPage.css';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect({ target: { files: [file] } });
    }
  }, [handleFileSelect]);

  const handlePredict = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.predict(selectedFile);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (result) {
    return <ResultDisplay result={result} onReset={handleReset} />;
  }

  return (
    <div className="upload-page" data-testid="upload-page">
      <motion.div
        className="upload-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="upload-header">
          <h1 className="page-title" data-testid="upload-title">Upload Image</h1>
          <p className="page-subtitle">
            Upload an image to analyze environmental scenes
          </p>
        </div>

        {!preview ? (
          <motion.div
            className="dropzone glass-card glow-border"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            whileHover={{ scale: 1.02 }}
            data-testid="dropzone"
          >
            <input
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              data-testid="file-input"
            />
            <label htmlFor="file-input" className="dropzone-content">
              <motion.div
                className="upload-icon-wrapper"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Upload size={64} />
              </motion.div>
              <h3>Drag & Drop or Click to Upload</h3>
              <p>Supports PNG, JPEG, JPG, BMP, WEBP</p>
            </label>
          </motion.div>
        ) : (
          <motion.div
            className="preview-section"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            data-testid="preview-section"
          >
            <div className="preview-card glass-card">
              <button
                className="preview-close"
                onClick={handleReset}
                data-testid="reset-button"
              >
                <X size={20} />
              </button>
              <img
                src={preview}
                alt="Preview"
                className="preview-image"
                data-testid="preview-image"
              />
            </div>

            <motion.button
              className="predict-button quantum-btn"
              onClick={handlePredict}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="predict-button"
            >
              <ImageIcon size={20} />
              <span>Run Quantum Inference</span>
            </motion.button>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              data-testid="error-message"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="upload-info glass-card">
          <h3>Supported Formats</h3>
          <div className="format-tags">
            <span className="format-tag">PNG</span>
            <span className="format-tag">JPEG</span>
            <span className="format-tag">JPG</span>
            <span className="format-tag">BMP</span>
            <span className="format-tag">WEBP</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPage;