import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Zap,
  SlidersHorizontal,
  Flame,
  Snowflake,
  ShieldAlert,
  Leaf,
  Clock,
  ArrowRight,
  TrendingDown,
  RefreshCw,
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
      <div className="inspo-loading-frame">
        <div className="inspo-spinner" />
        <span>Loading high-altitude habitat diagnostics...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="inspo-loading-frame error">
        <span>Unable to load telemetry. Please verify backend connection.</span>
      </div>
    );
  }

  const aggs = summary.aggregates;
  const isStale = summary.is_stale;
  const costCr = (aggs.annual_cost_inr / 10000000.0).toFixed(2);

  // Emblem codes for forward posts
  const siteEmblems = ['B', 'V', 'A', 'W', 'S', 'N', 'K', 'D'];

  return (
    <div className="inspo-overview-container">
      {/* ── 1. Top Section: Hero Curve Card + 3 Pastel Asset Cards ───────── */}
      <div className="inspo-top-cards-row">
        {/* Main Hero Card: "Portfolio / Estate Thermal Energy Deficit" */}
        <div className="inspo-hero-card">
          <div className="hero-card-header">
            <div className="hero-card-title-group">
              <span className="hero-card-label">Estate Kerosene Exposure</span>
              <h2 className="hero-card-val">₹ {costCr} Cr</h2>
              <span className="hero-card-sub">Annual supply chain delivered cost</span>
            </div>
            <button type="button" className="inspo-icon-menu-btn" aria-label="Card menu">
              <MoreVertical size={16} />
            </button>
          </div>

          {/* Interactive SVG Diurnal Waveform with Floating Black Pin Tag */}
          <div className="hero-chart-area">
            <svg viewBox="0 0 500 120" className="hero-curve-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,85 Q 40,75 80,82 T 160,78 T 240,68 T 320,62 T 360,54 L 375,54 L 375,95 L 390,95 L 390,75 L 430,78 T 500,72 L 500,120 L 0,120 Z"
                fill="url(#heroGradient)"
              />
              <path
                d="M 0,85 Q 40,75 80,82 T 160,78 T 240,68 T 320,62 T 360,54 L 375,54 L 375,95 L 390,95 L 390,75 L 430,78 T 500,72"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Highlight Pin Dot */}
              <circle cx="360" cy="54" r="5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>

            {/* Floating Black Indicator Capsule (from Inspo UI) */}
            <div className="hero-floating-pin" style={{ left: '72%', top: '22%' }}>
              <span className="pin-dot" />
              <span className="pin-text">₹ 14 820 000</span>
            </div>
          </div>

          {/* Time Filter Pill Strip */}
          <div className="hero-time-filters">
            {['1H', '24H', '1W', '1M', '1Y', 'ALL'].map((tf) => (
              <button
                key={tf}
                type="button"
                className={`time-filter-btn ${timeFilter === tf ? 'active' : ''}`}
                onClick={() => setTimeFilter(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Right 3 Pastel Asset Cards (From Inspo UI: BTC, LTC, ETH Cards) */}
        <div className="inspo-pastel-cards-stack">
          {/* Pastel Card 1: Lavender / Severe Cold */}
          <div className="inspo-pastel-card card-lavender">
            <div className="pastel-card-top">
              <div className="pastel-val-group">
                <span className="pastel-headline-val">-28.4 °C</span>
                <span className="pastel-sub-val">Siachen Base Min</span>
              </div>
              <button type="button" className="inspo-icon-menu-btn" aria-label="Menu">
                <MoreVertical size={15} />
              </button>
            </div>

            <div className="pastel-bottom-badge">
              <div className="badge-emblem-icon">❄</div>
              <span className="badge-change-text text-cold">-28.4°C Peak</span>
            </div>
          </div>

          {/* Pastel Card 2: Mint / High Risk Posts */}
          <div className="inspo-pastel-card card-mint">
            <div className="pastel-card-top">
              <div className="pastel-val-group">
                <span className="pastel-headline-val">4 / 11 Posts</span>
                <span className="pastel-sub-val">&gt;1,800 h &lt; 18 °C</span>
              </div>
              <button type="button" className="inspo-icon-menu-btn" aria-label="Menu">
                <MoreVertical size={15} />
              </button>
            </div>

            <div className="pastel-bottom-badge">
              <div className="badge-emblem-icon">⚡</div>
              <span className="badge-change-text text-alert">High Deficit</span>
            </div>
          </div>

          {/* Pastel Card 3: Butter-Sand / Carbon Avoidance */}
          <div className="inspo-pastel-card card-butter">
            <div className="pastel-card-top">
              <div className="pastel-val-group">
                <span className="pastel-headline-val">{aggs.annual_co2_tonnes} t CO₂</span>
                <span className="pastel-sub-val">Avoided / yr</span>
              </div>
              <button type="button" className="inspo-icon-menu-btn" aria-label="Menu">
                <MoreVertical size={15} />
              </button>
            </div>

            <div className="pastel-bottom-badge">
              <div className="badge-emblem-icon">🌿</div>
              <span className="badge-change-text text-gain">100% Lift</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Lower Section: Telemetry Table + Dark Action Card ─────────── */}
      <div className="inspo-lower-grid">
        {/* Left Side: Forward Posts Diagnostics Table */}
        <div className="inspo-telemetry-section">
          <div className="telemetry-section-header">
            <div className="telemetry-title-wrap">
              <h3 className="telemetry-main-title">Estate Deficit is down 14.2%</h3>
              <span className="telemetry-sub-badge">Real-time Telemetry</span>
            </div>

            <div className="telemetry-filter-pills">
              <div className="dropdown-filter-pill">
                <span>24h</span>
                <ChevronDown size={13} />
              </div>
              <div className="dropdown-filter-pill">
                <span>Top Deficit</span>
                <ChevronDown size={13} />
              </div>
            </div>
          </div>

          {/* Clean Data Table (Matching Inspo UI Table) */}
          <div className="inspo-table-container">
            <table className="inspo-clean-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>NIGHT MIN</th>
                  <th>CHANGE / DEFICIT</th>
                  <th>ANNUAL FUEL</th>
                  <th style={{ textAlign: 'center' }}>WATCH</th>
                </tr>
              </thead>
              <tbody>
                {summary.worst_performing_sites.map((s, idx) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/sites/${s.id}`)}
                    className="inspo-table-row"
                  >
                    <td>
                      <div className="table-name-cell">
                        <div className={`table-emblem-badge emblem-${idx % 4}`}>
                          {siteEmblems[idx % siteEmblems.length]}
                        </div>
                        <div className="table-name-text-group">
                          <span className="table-post-title">{s.name}</span>
                          <span className="table-post-district">{s.district} Sector</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="table-price-val">
                        {s.t_in_min_c} °C
                      </span>
                    </td>

                    <td>
                      <span className={`table-change-pill ${s.t_in_min_c < -15 ? 'pill-severe' : 'pill-moderate'}`}>
                        {s.hours_below_health_threshold} hrs &lt; 18°
                      </span>
                    </td>

                    <td>
                      <span className="table-cap-val">
                        {(s.annual_fuel_litres / 1000).toFixed(1)}k L
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={`table-star-btn ${starredSites[s.id] ? 'active' : ''}`}
                        onClick={(e) => toggleStar(s.id, e)}
                        title="Star post"
                      >
                        <Star size={16} fill={starredSites[s.id] ? '#F59E0B' : 'none'} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: The Iconic Dark Floating Card (from Inspo "Earn crypto" card) */}
        <div className="inspo-dark-promo-card">
          <div className="dark-card-content">
            <h3 className="dark-card-headline">
              Deploy <span className="highlight-text">passive solar</span> with THERMA Studio!
            </h3>
            <p className="dark-card-description">
              Simulate 24-hour diurnal heat retention, solar sol-air radiation, and wall insulation retrofits.
            </p>

            <button
              type="button"
              className="dark-card-action-pill"
              onClick={() => navigate('/sites/site_siachen_base/design')}
            >
              <span>Launch Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Abstract Geometric Vector Wireframe Overlay (as seen in inspo) */}
          <div className="dark-card-wireframe-graphics">
            <svg viewBox="0 0 200 160" className="wireframe-svg">
              <path
                d="M 20 140 L 90 20 L 180 60 L 140 150 Z"
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.5"
              />
              <path
                d="M 40 150 L 110 30 L 190 80 L 150 160 Z"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1.5"
              />
              <path
                d="M 90 20 L 110 30 M 180 60 L 190 80 M 140 150 L 150 160"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}


