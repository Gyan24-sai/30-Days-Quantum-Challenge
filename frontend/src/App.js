import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';

// Layout Components
import QuantumBackground from './components/layout/QuantumBackground';
import Sidebar from './components/layout/Sidebar';

// Pages
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import CameraPage from './pages/CameraPage';
import VideoPage from './pages/VideoPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  const [activeView, setActiveView] = useState('home');

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomePage setActiveView={setActiveView} />;
      case 'upload':
        return <UploadPage />;
      case 'camera':
        return <CameraPage />;
      case 'video':
        return <VideoPage />;
      case 'history':
        return <HistoryPage />;
      default:
        return <HomePage setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="App" data-testid="app">
      <QuantumBackground />
      
      <div className="app-layout">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        
        <main className="main-content" data-testid="main-content">
          <AnimatePresence mode="wait">
            <div key={activeView}>
              {renderView()}
            </div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
