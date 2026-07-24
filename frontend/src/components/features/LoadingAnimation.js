import React from 'react';
import { motion } from 'framer-motion';
import './LoadingAnimation.css';

const LoadingAnimation = () => {
  return (
    <div className="loading-animation" data-testid="loading-animation">
      <motion.div
        className="loading-container"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Quantum Atom Animation */}
        <div className="quantum-loader">
          <motion.div
            className="nucleus"
            animate={{
              scale: [1, 1.2, 1],
              boxShadow: [
                '0 0 20px rgba(0, 212, 255, 0.6)',
                '0 0 40px rgba(0, 212, 255, 0.9)',
                '0 0 20px rgba(0, 212, 255, 0.6)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="orbit"
              style={{
                transform: `rotate(${i * 60}deg)`,
              }}
              animate={{
                rotate: [i * 60, i * 60 + 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="electron" />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="loading-text"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <h2>Running Hybrid Quantum Inference...</h2>
          <p>Processing through Quantum Circuit</p>
        </motion.div>

        <div className="loading-steps">
          {[
            'Preprocessing Image',
            'Classical Feature Extraction',
            'Quantum Encoding',
            'VQC Processing',
            'Classification',
          ].map((step, idx) => (
            <motion.div
              key={step}
              className="loading-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.2, duration: 0.4 }}
            >
              <motion.div
                className="step-indicator"
                animate={{
                  scale: [1, 1.3, 1],
                  backgroundColor: [
                    'rgba(0, 212, 255, 0.3)',
                    'rgba(0, 212, 255, 1)',
                    'rgba(0, 212, 255, 0.3)',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: idx * 0.3,
                  ease: 'easeInOut',
                }}
              />
              <span>{step}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="progress-bar-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="progress-bar-track">
            <motion.div
              className="progress-bar-fill"
              animate={{ width: ['0%', '100%'] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoadingAnimation;