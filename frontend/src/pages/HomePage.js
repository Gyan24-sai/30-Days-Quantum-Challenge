import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, Video, Zap } from 'lucide-react';
import './HomePage.css';

const HomePage = ({ setActiveView }) => {
  const features = [
    {
      icon: Upload,
      title: 'Upload Image',
      description: 'Analyze environmental scenes from images',
      action: () => setActiveView('upload'),
      gradient: 'linear-gradient(135deg, #00D4FF, #6C63FF)',
      testId: 'home-upload-card'
    },
    {
      icon: Camera,
      title: 'Live Camera',
      description: 'Real-time prediction from webcam',
      action: () => setActiveView('camera'),
      gradient: 'linear-gradient(135deg, #6C63FF, #7C4DFF)',
      testId: 'home-camera-card'
    },
    {
      icon: Video,
      title: 'Video Analysis',
      description: 'Process video files frame by frame',
      action: () => setActiveView('video'),
      gradient: 'linear-gradient(135deg, #7C4DFF, #00FFC8)',
      testId: 'home-video-card'
    },
  ];

  return (
    <div className="home-page" data-testid="home-page">
      <motion.div
        className="hero-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="quantum-atom"
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          ⚛️
        </motion.div>
        
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          data-testid="hero-title"
        >
          Hybrid Quantum Image Classifier
        </motion.h1>
        
        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          data-testid="hero-subtitle"
        >
          Real-Time Environmental Scene Intelligence using
          <br />
          <span className="gradient-text">Hybrid Quantum Machine Learning</span>
        </motion.p>

        <motion.div
          className="tech-badges"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="tech-badge">
            <Zap size={16} />
            <span>PennyLane</span>
          </div>
          <div className="tech-badge">
            <Zap size={16} />
            <span>PyTorch</span>
          </div>
          <div className="tech-badge">
            <Zap size={16} />
            <span>ResNet50</span>
          </div>
          <div className="tech-badge">
            <Zap size={16} />
            <span>Quantum VQC</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="features-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              className="feature-card glass-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -10, scale: 1.02 }}
              onClick={feature.action}
              data-testid={feature.testId}
            >
              <div 
                className="feature-icon-wrapper"
                style={{ background: feature.gradient }}
              >
                <Icon size={32} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-arrow">→</div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="info-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <div className="info-card glass-card">
          <h3>Quantum-Classical Hybrid Architecture</h3>
          <p>
            Leverages ResNet50 for classical feature extraction, combined with
            Variational Quantum Circuits (VQC) using PennyLane for quantum
            processing. The hybrid architecture achieves superior performance
            on environmental scene classification.
          </p>
        </div>
        
        <div className="info-card glass-card">
          <h3>Supported Environments</h3>
          <div className="env-tags">
            <span className="env-tag">Rain</span>
            <span className="env-tag">Road</span>
            <span className="env-tag">Sky</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;