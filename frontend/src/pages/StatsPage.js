import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Zap, Clock, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { api } from '../utils/api';
import './StatsPage.css';

const CLASS_COLORS = {
  Rain: '#00D4FF',
  Road: '#6C63FF',
  Sky: '#00FFC8',
};

const StatsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/stats`;
      const r = await fetch(url);
      const d = await r.json();
      setStats(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="stats-page" data-testid="stats-page">
        <div className="stats-loading">Loading analytics…</div>
      </div>
    );
  }

  const empty = !stats || stats.total === 0;

  return (
    <div className="stats-page" data-testid="stats-page">
      <motion.div
        className="stats-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="stats-header">
          <div>
            <h1 className="page-title">
              <BarChart2 size={38} />
              Analytics
            </h1>
            <p className="page-subtitle">
              Aggregated inference metrics across {stats?.total || 0} predictions
            </p>
          </div>
          <motion.button
            className="refresh-button"
            onClick={load}
            whileHover={{ scale: 1.05, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            data-testid="refresh-stats"
          >
            <RefreshCw size={18} />
          </motion.button>
        </div>

        {empty ? (
          <motion.div
            className="empty-analytics glass-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            data-testid="empty-analytics"
          >
            <BarChart2 size={64} opacity={0.3} />
            <h3>No predictions yet</h3>
            <p>
              Analytics build as you run inferences. Upload an image or use the live camera
              to start populating this dashboard with real data.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="summary-grid">
              <SummaryCard
                icon={<Activity size={22} />}
                label="Total Inferences"
                value={stats.total}
                accent="#00D4FF"
                testId="stat-total"
              />
              <SummaryCard
                icon={<Clock size={22} />}
                label="Avg Latency"
                value={`${stats.avg_latency_ms.toFixed(1)} ms`}
                accent="#6C63FF"
                testId="stat-latency"
              />
              <SummaryCard
                icon={<TrendingUp size={22} />}
                label="Fastest"
                value={`${stats.min_latency_ms.toFixed(1)} ms`}
                accent="#00FFC8"
                testId="stat-fastest"
              />
              <SummaryCard
                icon={<Zap size={22} />}
                label="Slowest"
                value={`${stats.max_latency_ms.toFixed(1)} ms`}
                accent="#FF8C42"
                testId="stat-slowest"
              />
            </div>

            <div className="charts-grid">
              {/* Class Distribution Pie */}
              <div className="chart-card glass-card" data-testid="chart-class-distribution">
                <h3>Predicted Class Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.class_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {stats.class_distribution.map((entry) => (
                        <Cell key={entry.name} fill={CLASS_COLORS[entry.name]} stroke="rgba(5,8,22,0.6)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'rgba(5,8,22,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Average Confidence Bar */}
              <div className="chart-card glass-card" data-testid="chart-avg-confidence">
                <h3>Average Confidence per Class</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.confidence_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="class" stroke="rgba(255,255,255,0.6)" style={{ fontSize: 12, fontFamily: 'Sora' }} />
                    <YAxis unit="%" stroke="rgba(255,255,255,0.6)" style={{ fontSize: 12, fontFamily: 'Sora' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(5,8,22,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 12 }}
                      cursor={{ fill: 'rgba(0,212,255,0.05)' }}
                    />
                    <Bar dataKey="avg_confidence" radius={[8, 8, 0, 0]}>
                      {stats.confidence_distribution.map((entry) => (
                        <Cell key={entry.class} fill={CLASS_COLORS[entry.class]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Latency Histogram */}
              <div className="chart-card glass-card wide" data-testid="chart-latency-histogram">
                <h3>Inference Latency Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.latency_histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="range" stroke="rgba(255,255,255,0.6)" style={{ fontSize: 11, fontFamily: 'Fira Code' }} />
                    <YAxis stroke="rgba(255,255,255,0.6)" style={{ fontSize: 12, fontFamily: 'Sora' }} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(5,8,22,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 12 }}
                      cursor={{ fill: 'rgba(0,212,255,0.05)' }}
                    />
                    <Bar dataKey="count" fill="#6C63FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Confidence Timeline */}
              <div className="chart-card glass-card wide" data-testid="chart-timeline">
                <h3>Recent Confidence Timeline</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats.recent_timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="index" stroke="rgba(255,255,255,0.6)" style={{ fontSize: 11 }} />
                    <YAxis unit="%" stroke="rgba(255,255,255,0.6)" style={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(5,8,22,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 12 }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke="#00D4FF"
                      strokeWidth={2.5}
                      dot={{ fill: '#00FFC8', r: 4, strokeWidth: 0 }}
                      name="Confidence %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, accent, testId }) => (
  <motion.div
    className="summary-card glass-card"
    whileHover={{ y: -5 }}
    data-testid={testId}
  >
    <div className="summary-icon" style={{ background: `${accent}22`, color: accent }}>
      {icon}
    </div>
    <div className="summary-content">
      <div className="summary-value" style={{ color: accent }}>{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  </motion.div>
);

export default StatsPage;
