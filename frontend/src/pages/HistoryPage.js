import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Trash2, Clock, TrendingUp } from 'lucide-react';
import { api } from '../utils/api';
import { formatConfidence } from '../utils/helpers';
import './HistoryPage.css';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory(50);
      setHistory(data);
      setError(null);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all prediction history?')) return;
    
    try {
      await api.clearHistory();
      setHistory([]);
    } catch (err) {
      setError('Failed to clear history');
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="history-page" data-testid="history-page">
      <motion.div
        className="history-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="history-header">
          <div>
            <h1 className="page-title" data-testid="history-title">
              <HistoryIcon size={40} />
              Prediction History
            </h1>
            <p className="page-subtitle">
              {history.length} predictions recorded
            </p>
          </div>
          {history.length > 0 && (
            <motion.button
              className="clear-button"
              onClick={handleClearHistory}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="clear-history-button"
            >
              <Trash2 size={18} />
              <span>Clear All</span>
            </motion.button>
          )}
        </div>

        {loading ? (
          <div className="loading-state">Loading history...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : history.length === 0 ? (
          <motion.div
            className="empty-state glass-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            data-testid="empty-state"
          >
            <HistoryIcon size={64} opacity={0.3} />
            <h3>No predictions yet</h3>
            <p>Start by uploading an image or using live camera</p>
          </motion.div>
        ) : (
          <div className="history-grid">
            {history.map((item, idx) => (
              <motion.div
                key={item.id}
                className="history-card glass-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                whileHover={{ y: -5, scale: 1.02 }}
                data-testid={`history-item-${idx}`}
              >
                <div className="card-header">
                  <div className="prediction-badge">
                    {item.predicted_class}
                  </div>
                  <div className="confidence-badge">
                    <TrendingUp size={14} />
                    {formatConfidence(item.confidence)}
                  </div>
                </div>
                
                <div className="card-footer">
                  <div className="timestamp">
                    <Clock size={14} />
                    {formatDate(item.timestamp)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HistoryPage;