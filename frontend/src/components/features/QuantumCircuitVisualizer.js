import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './QuantumCircuitVisualizer.css';

const QuantumCircuitVisualizer = ({ quantumState, weightsLoaded }) => {
  const [circuit, setCircuit] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const url = `${process.env.REACT_APP_BACKEND_URL}/api/circuit-info`;
        const r = await fetch(url);
        const d = await r.json();
        setCircuit(d);
      } catch (e) {
        console.error('Failed to load circuit info', e);
      }
    };
    load();
  }, []);

  if (!circuit) return null;

  const nQubits = circuit.n_qubits;
  const gates = circuit.gates;
  const maxLayer = Math.max(...gates.map(g => g.layer));

  // Layout constants
  const laneHeight = 60;
  const laneStart = 120;
  const laneEnd = 100;

  // Compute layer x positions
  const layerSpacing = 80;
  const layerX = (l) => laneStart + l * layerSpacing;
  const totalWidth = layerX(maxLayer) + laneEnd;
  const totalHeight = laneStart + nQubits * laneHeight;

  const gateColor = (type) => {
    switch (type) {
      case 'encoding': return '#00D4FF';
      case 'variational': return '#6C63FF';
      case 'entangle': return '#00FFC8';
      case 'measure': return '#FF8C42';
      default: return '#ffffff';
    }
  };

  return (
    <motion.div
      className="quantum-circuit-card glass-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.6 }}
      data-testid="quantum-circuit-visualizer"
    >
      <div className="circuit-header">
        <div>
          <h3>Variational Quantum Circuit</h3>
          <p className="circuit-subtitle">
            {circuit.n_qubits} qubits · {circuit.n_layers} layers · {circuit.ansatz_type} ansatz · {circuit.total_params} trainable params
          </p>
        </div>
        <div className="backend-badge">
          <span className="backend-dot"></span>
          {circuit.backend}
        </div>
      </div>

      <div className="circuit-scroll">
        <svg
          className="circuit-svg"
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="qwire" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#6C63FF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00FFC8" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Qubit wires with labels */}
          {Array.from({ length: nQubits }).map((_, q) => {
            const y = laneStart + q * laneHeight;
            const stateVal = quantumState?.[q] ?? 0;
            return (
              <g key={`wire-${q}`}>
                <text
                  x={laneStart - 24}
                  y={y + 5}
                  fill="#00D4FF"
                  fontSize="14"
                  fontFamily="Fira Code, monospace"
                  textAnchor="end"
                >
                  |q{q}⟩
                </text>
                <line
                  x1={laneStart - 10}
                  x2={totalWidth - laneEnd}
                  y1={y}
                  y2={y}
                  stroke="url(#qwire)"
                  strokeWidth="2"
                />
                <g transform={`translate(${totalWidth - laneEnd + 10}, ${y})`}>
                  <rect
                    x="0"
                    y="-16"
                    width="80"
                    height="32"
                    rx="8"
                    fill="rgba(255, 140, 66, 0.1)"
                    stroke="rgba(255, 140, 66, 0.5)"
                    strokeWidth="1"
                  />
                  <text
                    x="40"
                    y="5"
                    fill="#FF8C42"
                    fontSize="12"
                    fontFamily="Fira Code, monospace"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {stateVal.toFixed(3)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Layer separators */}
          {Array.from({ length: maxLayer + 1 }).map((_, l) => (
            <line
              key={`sep-${l}`}
              x1={layerX(l) + 30}
              x2={layerX(l) + 30}
              y1={laneStart - 40}
              y2={totalHeight - 20}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          {/* Layer labels: ENCODING, then rotation+entangle pairs per block, then MEASURE */}
          <text x={layerX(0)} y={laneStart - 50} fill="rgba(255,255,255,0.5)" fontSize="11" textAnchor="middle" fontFamily="Sora, sans-serif">ENCODING</text>
          {Array.from({ length: circuit.n_layers }).map((_, l) => {
            const rotLayer = 1 + l * 2;
            const entLayer = 2 + l * 2;
            const midX = (layerX(rotLayer) + layerX(entLayer)) / 2;
            return (
              <text
                key={`lbl-${l}`}
                x={midX}
                y={laneStart - 50}
                fill="rgba(255,255,255,0.5)"
                fontSize="11"
                textAnchor="middle"
                fontFamily="Sora, sans-serif"
              >
                BLOCK {l + 1}
              </text>
            );
          })}
          <text x={layerX(maxLayer)} y={laneStart - 50} fill="rgba(255,255,255,0.5)" fontSize="11" textAnchor="middle" fontFamily="Sora, sans-serif">MEASURE</text>

          {/* Gates */}
          {gates.map((g, i) => {
            const y = laneStart + g.qubit * laneHeight;
            const x = layerX(g.layer);
            const color = gateColor(g.type);

            if (g.type === 'entangle') {
              const yTarget = laneStart + g.target * laneHeight;
              return (
                <motion.g
                  key={`gate-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.02 * i }}
                >
                  <circle cx={x} cy={y} r="5" fill={color} filter="url(#glow)" />
                  <line x1={x} x2={x} y1={y} y2={yTarget} stroke={color} strokeWidth="2" opacity="0.7" />
                  <circle cx={x} cy={yTarget} r="10" fill="none" stroke={color} strokeWidth="2" />
                  <line x1={x - 10} x2={x + 10} y1={yTarget} y2={yTarget} stroke={color} strokeWidth="2" />
                  <line x1={x} x2={x} y1={yTarget - 10} y2={yTarget + 10} stroke={color} strokeWidth="2" />
                </motion.g>
              );
            }

            if (g.type === 'measure') {
              return (
                <motion.g
                  key={`gate-${i}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.02 * i }}
                >
                  <rect
                    x={x - 18}
                    y={y - 14}
                    width="36"
                    height="28"
                    rx="6"
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <path
                    d={`M ${x - 10} ${y + 4} A 10 10 0 0 1 ${x + 10} ${y + 4}`}
                    stroke={color}
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <line x1={x} x2={x + 7} y1={y + 4} y2={y - 5} stroke={color} strokeWidth="1.5" />
                </motion.g>
              );
            }

            return (
              <motion.g
                key={`gate-${i}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.02 * i }}
              >
                <rect
                  x={x - 24}
                  y={y - 16}
                  width="48"
                  height="32"
                  rx="8"
                  fill={`${color}22`}
                  stroke={color}
                  strokeWidth="1.5"
                  filter="url(#glow)"
                />
                <text
                  x={x}
                  y={y + 5}
                  fill={color}
                  fontSize="11"
                  fontFamily="Fira Code, monospace"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {g.gate}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>

      <div className="circuit-legend">
        <div className="legend-item"><span className="legend-swatch" style={{ background: '#00D4FF' }}></span>Angle Encoding (Ry)</div>
        <div className="legend-item"><span className="legend-swatch" style={{ background: '#6C63FF' }}></span>Rotation (Rot)</div>
        <div className="legend-item"><span className="legend-swatch" style={{ background: '#00FFC8' }}></span>Entanglement (CNOT)</div>
        <div className="legend-item"><span className="legend-swatch" style={{ background: '#FF8C42' }}></span>PauliZ Measurement</div>
      </div>

      {weightsLoaded === false && (
        <div className="weights-notice" data-testid="weights-notice">
          <span className="notice-dot"></span>
          <div>
            Model is using <strong>untrained (random) weights</strong> — expectation values above reflect the live circuit but predictions are not semantically meaningful yet. Drop your trained checkpoint at <code>/app/backend/assets/checkpoints/best_model.pt</code> or upload via <code>POST /api/upload-weights</code>.
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default QuantumCircuitVisualizer;
