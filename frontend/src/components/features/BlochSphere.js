import React from 'react';
import { motion } from 'framer-motion';
import './BlochSphere.css';

/**
 * BlochSphere - SVG rendering of a single qubit's Bloch sphere state.
 * Uses simple orthographic projection with slight rotation for depth.
 * Axes: X (red), Y (green), Z (blue up).
 */
const BlochSphere = ({ qubitIndex, vector, size = 180 }) => {
  const { x = 0, y = 0, z = 0, purity = 0 } = vector || {};
  
  // Sphere center
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  
  // Isometric-ish projection: rotate viewpoint slightly
  // View: yaw -25deg around vertical, pitch 20deg
  const yaw = -0.44;   // ~-25 deg
  const pitch = 0.35;  // ~20 deg
  
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  
  // Project 3D vector (bloch coords, z up) to 2D
  const project = (px, py, pz) => {
    // rotate around Y (vertical axis in world = our Z axis for state)
    const x1 = px * cosY + py * sinY;
    const y1 = -px * sinY + py * cosY;
    const z1 = pz;
    // pitch around X axis
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;
    return {
      sx: cx + x1 * radius,
      sy: cy - z2 * radius,
      depth: y2, // for z-ordering
    };
  };
  
  // Axis endpoints
  const xAxisP = project(1, 0, 0);
  const xAxisN = project(-1, 0, 0);
  const yAxisP = project(0, 1, 0);
  const yAxisN = project(0, -1, 0);
  const zAxisP = project(0, 0, 1);
  const zAxisN = project(0, 0, -1);
  
  // State vector endpoint
  const stateP = project(x, y, z);
  
  const purityPct = Math.round(purity * 100);
  
  return (
    <div className="bloch-sphere-wrapper" data-testid={`bloch-sphere-q${qubitIndex}`}>
      <div className="bloch-header">
        <span className="bloch-label">|q{qubitIndex}⟩</span>
        <span className="bloch-purity">|r| = {purity.toFixed(3)}</span>
      </div>
      
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="bloch-svg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: qubitIndex * 0.1 }}
      >
        <defs>
          <radialGradient id={`sphere-grad-${qubitIndex}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.15)" />
            <stop offset="70%" stopColor="rgba(108, 99, 255, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
          <linearGradient id={`vec-grad-${qubitIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#00FFC8" />
          </linearGradient>
          <filter id={`vec-glow-${qubitIndex}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Sphere gradient fill */}
        <circle cx={cx} cy={cy} r={radius} fill={`url(#sphere-grad-${qubitIndex})`} />
        
        {/* Equator ellipse (perspective) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={radius}
          ry={radius * Math.abs(sinP)}
          fill="none"
          stroke="rgba(0, 212, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        
        {/* Meridian ellipse */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={radius * Math.abs(sinY)}
          ry={radius}
          fill="none"
          stroke="rgba(108, 99, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        
        {/* Outer sphere outline */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
        />
        
        {/* Axes (back-facing dashed, front-facing solid) */}
        {/* X axis: red */}
        <line x1={xAxisN.sx} y1={xAxisN.sy} x2={cx} y2={cy}
              stroke="rgba(255, 100, 100, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={cx} y1={cy} x2={xAxisP.sx} y2={xAxisP.sy}
              stroke="rgba(255, 100, 100, 0.9)" strokeWidth="1.5" />
        
        {/* Y axis: green */}
        <line x1={yAxisN.sx} y1={yAxisN.sy} x2={cx} y2={cy}
              stroke="rgba(100, 255, 150, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={cx} y1={cy} x2={yAxisP.sx} y2={yAxisP.sy}
              stroke="rgba(100, 255, 150, 0.9)" strokeWidth="1.5" />
        
        {/* Z axis: blue (vertical) */}
        <line x1={zAxisN.sx} y1={zAxisN.sy} x2={cx} y2={cy}
              stroke="rgba(120, 180, 255, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={cx} y1={cy} x2={zAxisP.sx} y2={zAxisP.sy}
              stroke="rgba(120, 180, 255, 0.9)" strokeWidth="1.5" />
        
        {/* Axis labels */}
        <text x={xAxisP.sx + 6} y={xAxisP.sy + 4} fill="rgba(255, 100, 100, 0.9)" fontSize="10" fontFamily="Fira Code">x</text>
        <text x={yAxisP.sx + 6} y={yAxisP.sy + 4} fill="rgba(100, 255, 150, 0.9)" fontSize="10" fontFamily="Fira Code">y</text>
        <text x={zAxisP.sx - 4} y={zAxisP.sy - 6} fill="rgba(120, 180, 255, 0.9)" fontSize="10" fontFamily="Fira Code">|0⟩</text>
        <text x={zAxisN.sx - 4} y={zAxisN.sy + 12} fill="rgba(120, 180, 255, 0.6)" fontSize="10" fontFamily="Fira Code">|1⟩</text>
        
        {/* State vector arrow */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={stateP.sx}
          y2={stateP.sy}
          stroke={`url(#vec-grad-${qubitIndex})`}
          strokeWidth="3"
          strokeLinecap="round"
          filter={`url(#vec-glow-${qubitIndex})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: qubitIndex * 0.1 + 0.3, ease: 'easeOut' }}
        />
        
        {/* State vector endpoint */}
        <motion.circle
          cx={stateP.sx}
          cy={stateP.sy}
          r="5"
          fill="#00FFC8"
          filter={`url(#vec-glow-${qubitIndex})`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: qubitIndex * 0.1 + 1.2, type: 'spring' }}
        />
        
        {/* Origin dot */}
        <circle cx={cx} cy={cy} r="2" fill="rgba(255, 255, 255, 0.8)" />
      </motion.svg>
      
      <div className="bloch-coords">
        <div className="coord"><span className="coord-axis coord-x">x</span> {x.toFixed(3)}</div>
        <div className="coord"><span className="coord-axis coord-y">y</span> {y.toFixed(3)}</div>
        <div className="coord"><span className="coord-axis coord-z">z</span> {z.toFixed(3)}</div>
      </div>
      
      <div className="purity-bar">
        <div className="purity-bar-fill" style={{ width: `${Math.min(purityPct, 100)}%` }} />
        <div className="purity-label">Purity {purityPct}%</div>
      </div>
    </div>
  );
};

const BlochSphereGrid = ({ blochVectors }) => {
  if (!blochVectors || blochVectors.length === 0) return null;
  
  return (
    <motion.div
      className="bloch-grid-card glass-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      data-testid="bloch-sphere-grid"
    >
      <div className="bloch-grid-header">
        <div>
          <h3>Live Quantum State — Bloch Spheres</h3>
          <p className="bloch-subtitle">
            Post-circuit qubit states measured on X, Y, Z Pauli axes · |r| = 1 means pure state, &lt; 1 indicates entanglement
          </p>
        </div>
        <div className="axes-legend">
          <span><span className="dot dot-x"></span>PauliX</span>
          <span><span className="dot dot-y"></span>PauliY</span>
          <span><span className="dot dot-z"></span>PauliZ</span>
        </div>
      </div>
      
      <div className="bloch-grid">
        {blochVectors.map((bv, i) => (
          <BlochSphere key={i} qubitIndex={i} vector={bv} />
        ))}
      </div>
    </motion.div>
  );
};

export default BlochSphereGrid;
