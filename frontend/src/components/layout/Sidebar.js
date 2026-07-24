import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Upload, Camera, Video, History, Settings } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeView, setActiveView }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'upload', label: 'Upload Image', icon: Upload },
    { id: 'camera', label: 'Live Camera', icon: Camera },
    { id: 'video', label: 'Video Analysis', icon: Video },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <motion.div
      className="sidebar glass-card"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      data-testid="sidebar"
    >
      <div className="sidebar-header">
        <motion.div
          className="logo"
          whileHover={{ scale: 1.05 }}
          data-testid="logo"
        >
          <div className="logo-icon">⚛️</div>
          {isExpanded && (
            <div className="logo-text">
              <div className="logo-title">HQIC</div>
              <div className="logo-subtitle">Quantum Vision</div>
            </div>
          )}
        </motion.div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <motion.button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.95 }}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="nav-icon" size={22} />
              {isExpanded && <span className="nav-label">{item.label}</span>}
              {isActive && (
                <motion.div
                  className="active-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <div className="status-dot"></div>
          {isExpanded && <span>Model Active</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;