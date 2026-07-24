import React from 'react';
import { motion } from 'framer-motion';
import { Video, Construction } from 'lucide-react';
import './VideoPage.css';

const VideoPage = () => {
  return (
    <div className="video-page" data-testid="video-page">
      <motion.div
        className="coming-soon-container glass-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="icon-wrapper"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Video size={80} />
        </motion.div>
        <h1>Video Analysis</h1>
        <p>Frame-by-frame quantum prediction for video files</p>
        <div className="construction-badge">
          <Construction size={20} />
          <span>Coming Soon</span>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoPage;