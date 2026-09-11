import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  ChevronDown,
  Star,
  Flame,
  Snowflake,
  ShieldAlert,
  Leaf,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Compass,
  Layers,
} from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('1W');
  const [starredSites, setStarredSites] = useState({});

  const fetchSummary = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/estate/summary?estate=${encodeURIComponent(estate)}`)
      .then(r => r.json())
      .then(data => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [estate]);

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarredSites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="telemetry-loading-card">
        <div className="telemetry-spinner" />
        <span>Loading high-altitude habitat diagnostics & telemetry...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="telemetry-loading-card error">
        <span>Unable to load estate telemetry. Please ensure the backend engine is running.</span>
      </div>
    );
  }

  const aggs = summary.aggregates;
  const costCr = (aggs.annual_cost_inr / 10000000.0).toFixed(2);

  return (
    <div className="dashboard-container">
      {/* ── 1. Top Section: Unified Telemetry Cards ─────────────────────── */}
      <div className="metrics-grid">
        {/* Metric Card 1: Estate Kerosene Cost Exposure (Spacious Hero Metric) */}
        <div className="metric-card metric-card-featured">
          <div className="metric-card-top">
            <div className="metric-header-group">
              <span className="metric-category-label">ESTATE EXPOSURE</span>
              <h2 className="metric-headline-val">₹ {costCr} Cr</h2>
              <span className="metric-caption-text">Annual supply chain delivered kerosene cost</span>
            </div>
            <div className="segmented-control">
              {['1W', '1M', '1Y', 'ALL'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`segmented-tab ${timeFilter === tf ? 'active' : ''}`}
                  onClick={() => setTimeFilter(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Smooth Sol-Air Thermal Demand Curve */}
          <div className="diurnal-curve-box">
            <svg viewBox="0 0 500 90" className="diurnal-curve-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="thermalCurveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,65 Q 60,68 120,50 T 240,42 T 340,30 T 420,38 T 500,45 L 500,90 L 0,90 Z"
                fill="url(#thermalCurveGrad)"
              />
              <path
                d="M 0,65 Q 60,68 120,50 T 240,42 T 340,30 T 420,38 T 500,45"
                fill="none"
                stroke="#1E40AF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="340" cy="30" r="4.5" fill="#1E40AF" stroke="#FFFFFF" strokeWidth="2" />
            </svg>
            <div className="curve-annotation">
              <span className="annotation-dot" />
              <span className="annotation-label">Peak Winter Diurnal Deficit</span>
            </div>
          </div>
        </div>

        {/* Metric Card 2: Peak Sub-Zero Temperature */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-header-group">
              <span className="metric-category-label">EXTREME COLD PEAK</span>
              <h2 className="metric-headline-val">-28.4 °C</h2>
              <span className="metric-caption-text">Siachen Base Camp winter minimum</span>
            </div>
            <div className="metric-icon-wrap cold">
              <Snowflake size={18} />
            </div>
          </div>
          <div className="metric-card-footer">
            <span className="status-badge status-badge-cold">
              Sub-Zero Baseline
            </span>
            <span className="metric-trend-info">Sector Min: -34.2 °C</span>
          </div>
        </div>

        {/* Metric Card 3: Deficit Outposts Count */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-header-group">
              <span className="metric-category-label">HIGH DEFICIT POSTS</span>
              <h2 className="metric-headline-val">4 / 11 Posts</h2>
              <span className="metric-caption-text">&gt;1,800 annual hours below 18 °C</span>
            </div>
            <div className="metric-icon-wrap alert">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="metric-card-footer">
            <span className="status-badge status-badge-solar">
              Immediate Priority
            </span>
            <span className="metric-trend-info">Critical Exposure</span>
          </div>
        </div>

        {/* Metric Card 4: Decarbonization & Avoided Emissions */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-header-group">
              <span className="metric-category-label">CARBON AVOIDANCE</span>
              <h2 className="metric-headline-val">{aggs.annual_co2_tonnes} t CO₂</h2>
              <span className="metric-caption-text">Annual emission offset via passive solar</span>
            </div>
            <div className="metric-icon-wrap comfort">
              <Leaf size={18} />
            </div>
          </div>
          <div className="metric-card-footer">
            <span className="status-badge status-badge-comfort">
              ISO 52016 Verified
            </span>
            <span className="metric-trend-info">Zero Fuel Dependency</span>
          </div>
        </div>
      </div>

      {/* ── 2. Lower Section: Telemetry Table + Studio Action Card ─────── */}
      <div className="dashboard-lower-grid">
        {/* Left Side: Forward Posts Diagnostics Table */}
        <div className="telemetry-table-card">
          <div className="table-card-header">
            <div>
              <h3 className="table-card-title">High-Altitude Forward Post Telemetry</h3>
              <p className="table-card-subtitle">
                Diurnal temperatures, thermal deficit hours, and logistics fuel consumption across monitored outposts.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={fetchSummary}
              title="Refresh telemetry"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="table-viewport">
            <table className="spacious-data-table">
              <thead>
                <tr>
                  <th>POST & SECTOR</th>
                  <th>NIGHT MIN</th>
                  <th>ANNUAL DEFICIT</th>
                  <th>KEROSENE LOAD</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {summary.worst_performing_sites.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/sites/${s.id}`)}
                    className="clickable-row"
                  >
                    <td>
                      <div className="post-cell">
                        <span className="post-name">{s.name}</span>
                        <span className="post-sector">{s.district} Sector</span>
                      </div>
                    </td>

                    <td>
                      <span className="temp-value">
                        {s.t_in_min_c} °C
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge ${s.t_in_min_c < -12 ? 'status-badge-cold' : 'status-badge-neutral'}`}>
                        {s.hours_below_health_threshold} hrs &lt; 18 °C
                      </span>
                    </td>

                    <td>
                      <span className="fuel-value">
                        {(s.annual_fuel_litres / 1000).toFixed(1)}k L / yr
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`star-action-btn ${starredSites[s.id] ? 'active' : ''}`}
                        onClick={(e) => toggleStar(s.id, e)}
                        title="Star post"
                        aria-label="Star post"
                      >
                        <Star size={16} fill={starredSites[s.id] ? '#D97706' : 'none'} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Architectural Studio Card */}
        <div className="studio-callout-card">
          <div className="studio-callout-content">
            <div className="studio-tag">PHYSICS STUDIO</div>
            <h3 className="studio-headline">
              Deploy Passive Solar Envelopes with THERMA Studio
            </h3>
            <p className="studio-description">
              Simulate 24-hour diurnal heat retention, solar sol-air radiation, Trombe wall gains, and aerogel insulation retrofits.
            </p>

            <button
              type="button"
              className="btn-primary studio-cta-btn"
              onClick={() => navigate('/sites/site_siachen_base/design')}
            >
              <span>Launch Studio Canvas</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="studio-blueprint-graphics">
            <svg viewBox="0 0 200 160" className="blueprint-svg">
              <path
                d="M 20 140 L 90 20 L 180 60 L 140 150 Z"
                fill="none"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1.5"
              />
              <path
                d="M 40 150 L 110 30 L 190 80 L 150 160 Z"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1.5"
              />
              <circle cx="90" cy="20" r="3" fill="#38BDF8" />
              <circle cx="180" cy="60" r="3" fill="#38BDF8" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
