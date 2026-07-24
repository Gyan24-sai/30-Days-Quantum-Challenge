import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Upload, Play, Pause, X, Film, Zap } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { getSceneInfo, formatConfidence } from '../utils/helpers';
import LoadingAnimation from '../components/features/LoadingAnimation';
import './VideoPage.css';

const CLASS_COLORS = {
  Rain: '#00D4FF',
  Road: '#6C63FF',
  Sky: '#00FFC8',
};

const VideoPage = () => {
  const videoRef = useRef(null);
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    setFile(f);
    setError(null);
    setAnalysis(null);
    setVideoUrl(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = `${process.env.REACT_APP_BACKEND_URL}/api/predict/video?max_frames=30`;
      const r = await fetch(url, { method: 'POST', body: formData });
      
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail || 'Analysis failed');
      }
      
      const d = await r.json();
      setAnalysis(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setAnalysis(null);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Find current frame based on currentTime
  const currentFrame = useMemo(() => {
    if (!analysis?.frames?.length) return null;
    const frames = analysis.frames;
    let closest = frames[0];
    let minDiff = Math.abs(frames[0].timestamp_sec - currentTime);
    for (const f of frames) {
      const diff = Math.abs(f.timestamp_sec - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = f;
      }
    }
    return closest;
  }, [analysis, currentTime]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!analysis?.frames) return [];
    return analysis.frames.map((f) => ({
      t: f.timestamp_sec,
      Rain: Math.round((f.probabilities?.Rain || 0) * 100),
      Road: Math.round((f.probabilities?.Road || 0) * 100),
      Sky: Math.round((f.probabilities?.Sky || 0) * 100),
    }));
  }, [analysis]);

  if (loading) {
    return <LoadingAnimation />;
  }

  return (
    <div className="video-page" data-testid="video-page">
      <motion.div
        className="video-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="video-page-header">
          <h1 className="page-title" data-testid="video-title">
            <Film size={38} />
            Video Analysis
          </h1>
          <p className="page-subtitle">
            Frame-by-frame quantum inference with timeline scrubber
          </p>
        </div>

        {!videoUrl ? (
          <motion.div
            className="video-dropzone glass-card glow-border"
            whileHover={{ scale: 1.01 }}
            data-testid="video-dropzone"
          >
            <input
              type="file"
              id="video-input"
              accept="video/*"
              onChange={handleFile}
              style={{ display: 'none' }}
              data-testid="video-file-input"
            />
            <label htmlFor="video-input" className="video-dropzone-label">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Video size={72} />
              </motion.div>
              <h3>Drop a video file</h3>
              <p>MP4, WebM, MOV — up to 30 frames analyzed automatically</p>
            </label>
          </motion.div>
        ) : (
          <>
            <div className="video-main">
              <div className="video-player-card glass-card">
                <button
                  className="video-close"
                  onClick={handleReset}
                  data-testid="video-reset-btn"
                >
                  <X size={18} />
                </button>
                
                <div className="video-wrapper">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="video-element"
                    onLoadedMetadata={(e) => setDuration(e.target.duration)}
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    data-testid="video-element"
                  />
                  
                  {analysis && currentFrame && (
                    <motion.div
                      className="frame-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ borderColor: `${CLASS_COLORS[currentFrame.predicted_class]}80` }}
                      data-testid="frame-overlay"
                    >
                      <div className="overlay-class" style={{ color: CLASS_COLORS[currentFrame.predicted_class] }}>
                        {currentFrame.predicted_class}
                      </div>
                      <div className="overlay-conf">
                        {formatConfidence(currentFrame.confidence)}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="video-controls">
                  <button className="play-btn" onClick={togglePlay} data-testid="play-btn">
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  
                  <div className="timeline-wrapper">
                    <div className="time-display">
                      <span>{formatTime(currentTime)}</span>
                      <span className="time-sep">/</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    
                    <div className="timeline-track" data-testid="timeline-track">
                      {/* Prediction segments as background */}
                      {analysis?.frames?.map((f, i, arr) => {
                        const nextT = arr[i + 1]?.timestamp_sec ?? duration;
                        const startPct = (f.timestamp_sec / duration) * 100;
                        const widthPct = ((nextT - f.timestamp_sec) / duration) * 100;
                        return (
                          <div
                            key={i}
                            className="timeline-segment"
                            style={{
                              left: `${startPct}%`,
                              width: `${widthPct}%`,
                              background: `${CLASS_COLORS[f.predicted_class]}44`,
                              borderColor: `${CLASS_COLORS[f.predicted_class]}`,
                            }}
                            title={`${f.timestamp_sec.toFixed(2)}s: ${f.predicted_class}`}
                          />
                        );
                      })}
                      
                      {/* Progress indicator */}
                      <div
                        className="timeline-progress"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                      
                      {/* Scrubber */}
                      <input
                        type="range"
                        min="0"
                        max={duration || 1}
                        step="0.01"
                        value={currentTime}
                        onChange={(e) => seekTo(parseFloat(e.target.value))}
                        className="timeline-scrubber"
                        data-testid="timeline-scrubber"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!analysis && (
                <motion.button
                  className="analyze-btn quantum-btn"
                  onClick={handleAnalyze}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  data-testid="analyze-video-btn"
                >
                  <Zap size={20} />
                  <span>Run Quantum Analysis</span>
                </motion.button>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="video-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {analysis && (
              <>
                {/* Summary */}
                <motion.div
                  className="video-summary glass-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  data-testid="video-summary"
                >
                  <div className="summary-stat">
                    <span className="stat-key">Frames Analyzed</span>
                    <span className="stat-val">{analysis.video_info.frames_analyzed} / {analysis.video_info.total_frames}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-key">Duration</span>
                    <span className="stat-val">{analysis.video_info.duration_sec}s</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-key">Resolution</span>
                    <span className="stat-val">{analysis.video_info.width}×{analysis.video_info.height}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-key">Dominant Scene</span>
                    <span className="stat-val" style={{ color: CLASS_COLORS[analysis.summary.dominant_class] }}>
                      {analysis.summary.dominant_class}
                    </span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-key">Avg Confidence</span>
                    <span className="stat-val">{formatConfidence(analysis.summary.avg_confidence)}</span>
                  </div>
                </motion.div>

                {/* Confidence Chart */}
                <motion.div
                  className="chart-panel glass-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  data-testid="video-confidence-chart"
                >
                  <h3>Per-Frame Confidence Over Time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="t"
                        stroke="rgba(255,255,255,0.6)"
                        style={{ fontSize: 11, fontFamily: 'Fira Code' }}
                        label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      />
                      <YAxis
                        unit="%"
                        stroke="rgba(255,255,255,0.6)"
                        style={{ fontSize: 12, fontFamily: 'Sora' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{ background: 'rgba(5,8,22,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 12 }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Rain" stroke={CLASS_COLORS.Rain} strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="Road" stroke={CLASS_COLORS.Road} strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="Sky" stroke={CLASS_COLORS.Sky} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Frame Strip */}
                <motion.div
                  className="frame-strip-panel glass-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3>Frame Thumbnails</h3>
                  <div className="frame-strip" data-testid="frame-strip">
                    {analysis.frames.map((f, i) => (
                      <motion.div
                        key={i}
                        className="frame-thumb"
                        onClick={() => seekTo(f.timestamp_sec)}
                        whileHover={{ scale: 1.05, y: -3 }}
                        style={{ borderColor: CLASS_COLORS[f.predicted_class] }}
                        data-testid={`frame-thumb-${i}`}
                      >
                        <img src={f.thumbnail} alt={`Frame ${i}`} />
                        <div className="thumb-info">
                          <div className="thumb-class" style={{ color: CLASS_COLORS[f.predicted_class] }}>
                            {f.predicted_class}
                          </div>
                          <div className="thumb-time">{f.timestamp_sec.toFixed(1)}s</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default VideoPage;
