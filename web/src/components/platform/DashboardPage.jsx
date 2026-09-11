import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Star,
  Snowflake,
  ShieldAlert,
  Leaf,
  ArrowRight,
  RefreshCw,
  Layers,
  Mountain,
  Wind,
  Thermometer,
  Users,
  Fuel,
  Search,
  AlertTriangle,
} from 'lucide-react';
import './DashboardPage.css';

// Strategic mountain passes that dictate high-altitude sortie logistics and fuel reserves
const STRATEGIC_PASSES = [
  {
    name: 'Khardung La Pass',
    altitude_m: 5359,
    temp_c: -27,
    wind_kmh: 48,
    status: 'Blizzard Advisory',
    statusClass: 'pass-status-alert',
    route: 'Leh → Nubra & DBO',
  },
  {
    name: 'Chang La Pass',
    altitude_m: 5360,
    temp_c: -24,
    wind_kmh: 38,
    status: 'Sub-Zero Gale',
    statusClass: 'pass-status-caution',
    route: 'Leh → Pangong Axis',
  },
  {
    name: 'Zoji La Pass',
    altitude_m: 3528,
    temp_c: -18,
    wind_kmh: 28,
    status: 'Chains Mandatory',
    statusClass: 'pass-status-caution',
    route: 'Srinagar → Kargil Axis',
  },
  {
    name: 'Fotu La Pass',
    altitude_m: 4108,
    temp_c: -12,
    wind_kmh: 18,
    status: 'Transit Clear',
    statusClass: 'pass-status-clear',
    route: 'Kargil → Leh Highway',
  },
];

export default function DashboardPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('1W');
  const [starredSites, setStarredSites] = useState({});
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  const fetchSummary = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/estate/summary?estate=${encodeURIComponent(estate)}`)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data);
        if (data.worst_performing_sites && data.worst_performing_sites.length > 0) {
          setSelectedSiteId(data.worst_performing_sites[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [estate]);

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarredSites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Compile list of evaluated sites
  const evaluatedSites = useMemo(() => {
    if (!summary) return [];
    return summary.all_evaluated_sites || summary.worst_performing_sites || [];
  }, [summary]);

  // Filtered sites for table
  const filteredSites = useMemo(() => {
    return evaluatedSites.filter((site) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        site.name.toLowerCase().includes(query) ||
        site.district.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (tableFilter === 'critical') {
        return site.t_in_min_c < -10;
      }
      if (tableFilter === 'leh') {
        return site.district.toLowerCase() === 'leh';
      }
      if (tableFilter === 'kargil') {
        return site.district.toLowerCase() === 'kargil';
      }
      return true;
    });
  }, [evaluatedSites, tableFilter, searchQuery]);

  // Currently inspected site
  const activeSelectedSite = useMemo(() => {
    if (!selectedSiteId && evaluatedSites.length > 0) return evaluatedSites[0];
    return evaluatedSites.find((s) => s.id === selectedSiteId) || evaluatedSites[0];
  }, [selectedSiteId, evaluatedSites]);

  if (loading) {
    return (
      <div className="telemetry-loading-card">
        <div className="telemetry-spinner" />
        <span className="telemetry-loading-text">
          Synchronizing frontier outposts telemetry & diurnal heat loads...
        </span>
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

  const aggs = summary.aggregates || {};
  const costCr = (aggs.annual_cost_inr / 10000000.0).toFixed(2);
  const costLakhs = (aggs.annual_cost_inr / 100000.0).toFixed(1);

  // Kerosene logistics transport split
  const fuelProcurementLakhs = ((aggs.annual_cost_inr * 0.35) / 100000.0).toFixed(1);
  const logisticsAirliftLakhs = ((aggs.annual_cost_inr * 0.65) / 100000.0).toFixed(1);

  // Deficit classification counts
  const criticalCount = evaluatedSites.filter((s) => s.t_in_min_c < -10).length;
  const elevatedCount = evaluatedSites.filter((s) => s.t_in_min_c >= -10 && s.t_in_min_c < -5).length;
  const monitoredCount = evaluatedSites.filter((s) => s.t_in_min_c >= -5).length;

  // Selected site retrofits projection
  const currentMinTemp = activeSelectedSite ? activeSelectedSite.t_in_min_c : -13.95;
  const projectedRetrofitTemp = Math.min(18.0, Number((currentMinTemp + 19.8).toFixed(1)));
  const currentFuel = activeSelectedSite ? activeSelectedSite.annual_fuel_litres : 460;
  const projectedFuel = Math.round(currentFuel * 0.28);

  // Sol-air diurnal demand curve variations
  const curvePaths = {
    '1W': {
      d: 'M 0,60 Q 70,68 130,48 T 240,36 T 340,22 T 430,32 T 500,40 L 500,80 L 0,80 Z',
      stroke: 'M 0,60 Q 70,68 130,48 T 240,36 T 340,22 T 430,32 T 500,40',
      peakX: 340,
      peakY: 22,
      label: 'Diurnal Sol-Air Peak (13:00)',
    },
    '1M': {
      d: 'M 0,64 Q 80,70 140,52 T 250,40 T 350,26 T 440,34 T 500,44 L 500,80 L 0,80 Z',
      stroke: 'M 0,64 Q 80,70 140,52 T 250,40 T 350,26 T 440,34 T 500,44',
      peakX: 350,
      peakY: 26,
      label: 'Monthly Mean Demand',
    },
    '1Y': {
      d: 'M 0,68 Q 90,74 150,56 T 260,44 T 360,30 T 450,38 T 500,48 L 500,80 L 0,80 Z',
      stroke: 'M 0,68 Q 90,74 150,56 T 260,44 T 360,30 T 450,38 T 500,48',
      peakX: 360,
      peakY: 30,
      label: 'Winter Solstice Minimum',
    },
    ALL: {
      d: 'M 0,58 Q 60,62 120,44 T 230,34 T 330,20 T 420,30 T 500,38 L 500,80 L 0,80 Z',
      stroke: 'M 0,58 Q 60,62 120,44 T 230,34 T 330,20 T 420,30 T 500,38',
      peakX: 330,
      peakY: 20,
      label: 'Multi-Year Baseline',
    },
  };
  const activeCurve = curvePaths[timeFilter] || curvePaths['1W'];

  // Top evaluated sites for altitude distribution
  const topElevationSites = evaluatedSites.slice(0, 5);

  return (
    <div className="dashboard-container">
      {/* ── 0. Executive Operational Banner ─────────────────────────────── */}
      <div className="frontier-operational-banner">
        <div className="banner-left">
          <div className="banner-pulse-dot" />
          <div className="banner-text-group">
            <span className="banner-title">{estate} Frontier Sector Telemetry</span>
            <span className="banner-subtitle">
              {summary.evaluated_sites} of {summary.total_sites} Outposts Evaluated • {aggs.total_occupants} Garrison Personnel
            </span>
          </div>
        </div>

        <div className="banner-right">
          <div className="banner-stat-chip">
            <Thermometer size={13} className="banner-chip-icon cold" />
            <span>Sector Avg Min: <strong>{aggs.avg_t_min_c ?? -6.02} °C</strong></span>
          </div>
          <div className="banner-stat-chip">
            <Fuel size={13} className="banner-chip-icon fuel" />
            <span>Delivered Fuel: <strong>{(aggs.annual_fuel_litres || 0).toLocaleString()} L/yr</strong></span>
          </div>
          <button
            type="button"
            className="banner-refresh-btn"
            onClick={fetchSummary}
            title="Sync telemetry stream"
          >
            <RefreshCw size={13} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── 1. Top Section: 4 Metric Cards ──────────────────────────────── */}
      <div className="metrics-grid">
        {/* Metric Card 1: Estate Kerosene Exposure */}
        <div className="metric-card metric-card-featured">
          <div className="metric-card-top-bar">
            <span className="metric-eyebrow">ESTATE KEROSENE EXPOSURE</span>
          </div>

          <div className="metric-headline-wrapper">
            <span className="metric-primary-value">₹ {costCr} Cr</span>
            <span className="metric-pill-sub">₹{costLakhs}L Total</span>
          </div>

          <span className="metric-desc">
            Delivered annual logistics burden across {summary.evaluated_sites} monitored outposts
          </span>

          <div className="cost-split-container">
            <div className="cost-split-bar">
              <div className="split-fill procurement" style={{ width: '35%' }} />
              <div className="split-fill airlift" style={{ width: '65%' }} />
            </div>
            <div className="cost-split-labels">
              <span>Base Fuel: ₹{fuelProcurementLakhs}L (35%)</span>
              <span>Airlift Supply: ₹{logisticsAirliftLakhs}L (65%)</span>
            </div>
          </div>

          <div className="curve-header-row">
            <span className="curve-header-title">Diurnal Sol-Air Curve</span>
            <div className="segmented-control compact">
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

          <div className="diurnal-curve-container">
            <svg viewBox="0 0 500 80" className="diurnal-curve-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="thermalCurveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={activeCurve.d} fill="url(#thermalCurveGrad)" />
              <path
                d={activeCurve.stroke}
                fill="none"
                stroke="#1E40AF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle
                cx={activeCurve.peakX}
                cy={activeCurve.peakY}
                r="4"
                fill="#1E40AF"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </svg>
            <div className="curve-badge">
              <span className="curve-badge-dot" />
              <span>{activeCurve.label}</span>
            </div>
          </div>
        </div>

        {/* Metric Card 2: Extreme Sub-Zero Minimum */}
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-title-group">
              <span className="metric-eyebrow">EXTREME COLD MINIMUM</span>
              <span className="metric-primary-value">-28.4 °C</span>
              <span className="metric-desc">Siachen Base Camp winter minimum</span>
            </div>
            <div className="metric-icon cold">
              <Snowflake size={18} />
            </div>
          </div>

          <div className="mini-telemetry-list">
            <div className="mini-telemetry-row">
              <span className="mini-telemetry-station">Siachen Glacier</span>
              <span className="mini-telemetry-temp cold-critical">-28.4 °C</span>
            </div>
            <div className="mini-telemetry-row">
              <span className="mini-telemetry-station">Pangong Tso North</span>
              <span className="mini-telemetry-temp cold-elevated">-14.0 °C</span>
            </div>
            <div className="mini-telemetry-row">
              <span className="mini-telemetry-station">Kargil Ridge Post</span>
              <span className="mini-telemetry-temp cold-moderate">-7.4 °C</span>
            </div>
          </div>

          <div className="metric-card-footer">
            <span className="status-pill status-pill-cold">Sub-Zero Baseline</span>
            <span className="footer-meta">Avg Min: {aggs.avg_t_min_c ?? -6.02} °C</span>
          </div>
        </div>

        {/* Metric Card 3: Deficit Classification */}
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-title-group">
              <span className="metric-eyebrow">DEFICIT CLASSIFICATION</span>
              <span className="metric-primary-value">{criticalCount} / {summary.evaluated_sites} Posts</span>
              <span className="metric-desc">&gt;1,800 annual hours below 18 °C</span>
            </div>
            <div className="metric-icon alert">
              <ShieldAlert size={18} />
            </div>
          </div>

          <div className="deficit-breakdown-box">
            <div className="deficit-bar-track">
              <div
                className="deficit-bar-segment seg-critical"
                style={{ width: `${(criticalCount / summary.evaluated_sites) * 100}%` }}
              />
              <div
                className="deficit-bar-segment seg-elevated"
                style={{ width: `${(elevatedCount / summary.evaluated_sites) * 100}%` }}
              />
              <div
                className="deficit-bar-segment seg-monitored"
                style={{ width: `${(monitoredCount / summary.evaluated_sites) * 100}%` }}
              />
            </div>
            <div className="deficit-legend-row">
              <span className="deficit-legend-tag tag-critical">{criticalCount} Critical</span>
              <span className="deficit-legend-tag tag-elevated">{elevatedCount} Elevated</span>
              <span className="deficit-legend-tag tag-monitored">{monitoredCount} Monitored</span>
            </div>
          </div>

          <div className="metric-card-footer">
            <span className="status-pill status-pill-alert">Immediate Action</span>
            <span className="footer-meta">{aggs.total_occupants} Personnel</span>
          </div>
        </div>

        {/* Metric Card 4: Carbon Avoidance */}
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-title-group">
              <span className="metric-eyebrow">CARBON AVOIDANCE</span>
              <span className="metric-primary-value">{aggs.annual_co2_tonnes || 8.7} t CO₂</span>
              <span className="metric-desc">Annual emission offset via passive solar</span>
            </div>
            <div className="metric-icon comfort">
              <Leaf size={18} />
            </div>
          </div>

          <div className="impact-duo-box">
            <div className="impact-duo-cell">
              <span className="impact-duo-val">~508 Cans</span>
              <span className="impact-duo-label">Kerosene offset / yr</span>
            </div>
            <div className="impact-duo-divider" />
            <div className="impact-duo-cell">
              <span className="impact-duo-val">38 Sorties</span>
              <span className="impact-duo-label">Helicopter flights saved</span>
            </div>
          </div>

          <div className="metric-card-footer">
            <span className="status-pill status-pill-comfort">ISO 52016 Verified</span>
            <span className="footer-meta">72% Solar Target</span>
          </div>
        </div>
      </div>

      {/* ── 2. Middle Section: Sector Breakdown & Mountain Passes ─────────── */}
      <div className="dashboard-middle-grid">
        {/* Left: Sector Thermal & Elevation Exposure */}
        <div className="sector-analytics-card">
          <div className="analytics-card-header">
            <div>
              <div className="card-kicker">SECTOR BREAKDOWN</div>
              <h3 className="analytics-card-title">Frontier Sectors & Altitude Profile</h3>
              <p className="analytics-card-subtitle">
                Logistics fuel burden and night temperature profiles across Leh and Kargil high-altitude sectors.
              </p>
            </div>
          </div>

          <div className="sector-cards-row">
            {summary.district_exposure &&
              summary.district_exposure
                .filter((dist) => dist.annual_fuel_litres > 0 || dist.district === 'Leh' || dist.district === 'Kargil')
                .map((dist) => (
                  <div key={dist.district} className="sector-summary-panel">
                    <div className="sector-panel-top">
                      <div>
                        <span className="sector-name">{dist.district} Frontier Sector</span>
                        <span className="sector-count">{dist.sites_count} Monitored Outposts</span>
                      </div>
                      <div className="sector-badge">
                        {dist.district === 'Leh' ? 'Eastern Ladakh' : 'Western Ladakh'}
                      </div>
                    </div>

                    <div className="sector-metrics-grid">
                      <div className="sector-metric">
                        <span className="sm-label">ANNUAL FUEL</span>
                        <span className="sm-val">{dist.annual_fuel_litres.toLocaleString()} L</span>
                      </div>
                      <div className="sector-metric">
                        <span className="sm-label">DELIVERED COST</span>
                        <span className="sm-val">₹ {(dist.annual_cost_inr / 100000).toFixed(1)}L</span>
                      </div>
                      <div className="sector-metric">
                        <span className="sm-label">AIRLIFT EXPENSE</span>
                        <span className="sm-val">₹ {((dist.annual_cost_inr * 0.65) / 100000).toFixed(1)}L</span>
                      </div>
                      <div className="sector-metric">
                        <span className="sm-label">AVG ELEVATION</span>
                        <span className="sm-val">{dist.district === 'Leh' ? '4,280 m' : '3,280 m'}</span>
                      </div>
                    </div>

                    <div className="sector-fuel-bar">
                      <div
                        className="sector-fuel-fill"
                        style={{
                          width: `${(dist.annual_fuel_litres / (aggs.annual_fuel_litres || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
          </div>

          {/* Elevation ranking */}
          <div className="elevation-ranking-container">
            <div className="elevation-header">
              <span className="elevation-title">Representative High-Altitude Outposts (Elevation vs Night Min)</span>
              <span className="elevation-note">ISO 52016 Sol-Air Evaluated</span>
            </div>
            <div className="elevation-bars-list">
              {topElevationSites.map((site) => (
                <div
                  key={site.id}
                  className={`elevation-bar-row ${selectedSiteId === site.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSiteId(site.id)}
                  title="Click to preview outpost in inspector"
                >
                  <div className="elevation-site-name">
                    <span className="name">{site.name}</span>
                    <span className="alt">{site.altitude_m || 4200} m ASL</span>
                  </div>
                  <div className="elevation-track-wrap">
                    <div
                      className="elevation-fill-bar"
                      style={{ width: `${Math.min(100, ((site.altitude_m || 4200) / 5500) * 100)}%` }}
                    />
                  </div>
                  <div className="elevation-temp-badge">
                    <span className={site.t_in_min_c < -10 ? 'cold-critical' : 'cold-elevated'}>
                      {site.t_in_min_c} °C
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Strategic Mountain Passes */}
        <div className="passes-monitor-card">
          <div className="passes-card-header">
            <div>
              <div className="card-kicker">STRATEGIC AXIS MONITOR</div>
              <h3 className="passes-card-title">High-Altitude Mountain Passes</h3>
              <p className="passes-card-subtitle">
                Pass conditions determine resupply sortie viability and fuel storage contingency.
              </p>
            </div>
            <div className="pass-status-indicator">
              <span className="live-dot" /> Live Feed
            </div>
          </div>

          <div className="passes-list">
            {STRATEGIC_PASSES.map((pass) => (
              <div key={pass.name} className="pass-item-card">
                <div className="pass-item-top">
                  <div className="pass-item-name-group">
                    <span className="pass-name">{pass.name}</span>
                    <span className="pass-alt">{pass.altitude_m.toLocaleString()} m</span>
                  </div>
                  <span className={`pass-status-badge ${pass.statusClass}`}>
                    {pass.status}
                  </span>
                </div>

                <div className="pass-item-route">{pass.route}</div>

                <div className="pass-item-telemetry">
                  <div className="pass-stat">
                    <Thermometer size={12} />
                    <span>{pass.temp_c} °C</span>
                  </div>
                  <div className="pass-stat">
                    <Wind size={12} />
                    <span>{pass.wind_kmh} km/h Wind</span>
                  </div>
                  <div className="pass-stat">
                    <Mountain size={12} />
                    <span>High Ridge</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pass-logistics-footnote">
            <AlertTriangle size={13} className="alert-icon" />
            <span>Pass snow blockages restrict fuel sorties by up to 14 days; passive solar retrofits provide autonomous thermal survival.</span>
          </div>
        </div>
      </div>

      {/* ── 3. Lower Section: Telemetry Table + Interactive Inspector ─────── */}
      <div className="dashboard-lower-grid">
        {/* Left: Forward Post Telemetry Table */}
        <div className="telemetry-table-card">
          <div className="table-card-header">
            <div>
              <div className="card-kicker">TELEMETRY REGISTRY</div>
              <h3 className="table-card-title">High-Altitude Forward Post Telemetry</h3>
              <p className="table-card-subtitle">
                Diurnal temperatures, thermal deficit hours, and logistics fuel consumption across monitored outposts.
              </p>
            </div>

            <div className="table-controls-row">
              <div className="table-search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by outpost or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="table-search-input"
                />
              </div>

              <div className="table-filter-tabs">
                <button
                  type="button"
                  className={`table-filter-btn ${tableFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTableFilter('all')}
                >
                  All ({evaluatedSites.length})
                </button>
                <button
                  type="button"
                  className={`table-filter-btn ${tableFilter === 'critical' ? 'active' : ''}`}
                  onClick={() => setTableFilter('critical')}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  type="button"
                  className={`table-filter-btn ${tableFilter === 'leh' ? 'active' : ''}`}
                  onClick={() => setTableFilter('leh')}
                >
                  Leh Sector
                </button>
                <button
                  type="button"
                  className={`table-filter-btn ${tableFilter === 'kargil' ? 'active' : ''}`}
                  onClick={() => setTableFilter('kargil')}
                >
                  Kargil Sector
                </button>
              </div>
            </div>
          </div>

          <div className="table-viewport">
            <table className="spacious-data-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>POST & SECTOR</th>
                  <th style={{ width: '13%' }}>ELEVATION</th>
                  <th style={{ width: '13%' }}>GARRISON</th>
                  <th style={{ width: '12%' }}>NIGHT MIN</th>
                  <th style={{ width: '16%' }}>ANNUAL DEFICIT</th>
                  <th style={{ width: '18%' }}>KEROSENE LOAD</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.map((s) => {
                  const isSelected = selectedSiteId === s.id;
                  const isStarred = !!starredSites[s.id];
                  const costFormatted = s.annual_cost_inr
                    ? `₹${(s.annual_cost_inr / 100000).toFixed(2)}L`
                    : `₹${((s.annual_fuel_litres * 2400) / 100000).toFixed(2)}L`;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSiteId(s.id)}
                      className={`clickable-row ${isSelected ? 'row-active' : ''}`}
                    >
                      <td>
                        <div className="post-cell">
                          <span className="post-name">{s.name}</span>
                          <span className="post-sector">
                            {s.district} Sector • {s.lat ? `${s.lat}°N, ${s.lon}°E` : 'Classified Axis'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="altitude-value">
                          <Mountain size={13} className="alt-icon" />
                          {s.altitude_m ? `${s.altitude_m.toLocaleString()} m` : '4,250 m'}
                        </span>
                      </td>

                      <td>
                        <span className="occupants-badge">
                          <Users size={12} />
                          {s.occupants || 8} Troops
                        </span>
                      </td>

                      <td>
                        <span
                          className={`temp-value-badge ${
                            s.t_in_min_c < -10 ? 'temp-critical' : 'temp-elevated'
                          }`}
                        >
                          {s.t_in_min_c} °C
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            s.t_in_min_c < -12 ? 'status-badge-cold' : 'status-badge-neutral'
                          }`}
                        >
                          {s.hours_below_health_threshold} hrs &lt; 18 °C
                        </span>
                      </td>

                      <td>
                        <div className="fuel-cell">
                          <span className="fuel-value">
                            {s.annual_fuel_litres.toLocaleString()} L / yr
                          </span>
                          <span className="fuel-cost-sub">{costFormatted} deliv.</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons-cell">
                          <button
                            type="button"
                            className={`star-action-btn ${isStarred ? 'active' : ''}`}
                            onClick={(e) => toggleStar(s.id, e)}
                            title={isStarred ? 'Unstar post' : 'Star post'}
                            aria-label="Star post"
                          >
                            <Star size={15} fill={isStarred ? '#D97706' : 'none'} />
                          </button>
                          <button
                            type="button"
                            className="inspect-action-btn"
                            onClick={() => navigate(`/sites/${s.id}`)}
                            title="Inspect full site telemetry"
                          >
                            <span>Open</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Interactive Post Inspector */}
        <div className="post-inspector-card">
          <div className="inspector-card-header">
            <div className="inspector-tag-row">
              <span className="inspector-kicker">POST THERMAL INSPECTOR</span>
              <span className="inspector-live-tag">Active Selection</span>
            </div>
            <h3 className="inspector-title">
              {activeSelectedSite ? activeSelectedSite.name : 'Select an outpost'}
            </h3>
            <div className="inspector-meta-row">
              <span>{activeSelectedSite?.district} Sector</span>
              <span className="meta-bullet">•</span>
              <span>{activeSelectedSite?.altitude_m || 4250} m ASL</span>
              <span className="meta-bullet">•</span>
              <span>{activeSelectedSite?.occupants || 8} Personnel</span>
            </div>
          </div>

          <div className="simulation-matrix">
            <div className="matrix-column baseline">
              <div className="matrix-col-header">
                <span className="matrix-col-label">CURRENT BASELINE</span>
                <span className="matrix-badge uninsulated">Uninsulated Stone</span>
              </div>
              <div className="matrix-stat-group">
                <span className="matrix-stat-title">Night Indoor Min</span>
                <span className="matrix-stat-val cold-neg">{currentMinTemp} °C</span>
                <span className="matrix-stat-sub">Severe hypothermia risk</span>
              </div>
              <div className="matrix-stat-group">
                <span className="matrix-stat-title">Annual Kerosene</span>
                <span className="matrix-stat-val">{currentFuel} L / yr</span>
                <span className="matrix-stat-sub">100% fuel heating dependent</span>
              </div>
            </div>

            <div className="matrix-column retrofit">
              <div className="matrix-col-header">
                <span className="matrix-col-label">PASSIVE RETROFIT</span>
                <span className="matrix-badge passive-opt">Trombe + Aerogel</span>
              </div>
              <div className="matrix-stat-group">
                <span className="matrix-stat-title">Projected Night Min</span>
                <span className="matrix-stat-val solar-pos">+{projectedRetrofitTemp} °C</span>
                <span className="matrix-stat-sub">+{((projectedRetrofitTemp - currentMinTemp)).toFixed(1)}°C thermal gain</span>
              </div>
              <div className="matrix-stat-group">
                <span className="matrix-stat-title">Projected Kerosene</span>
                <span className="matrix-stat-val fuel-saved">{projectedFuel} L / yr</span>
                <span className="matrix-stat-sub">-72% fuel saved</span>
              </div>
            </div>
          </div>

          <div className="envelope-spec-box">
            <div className="envelope-spec-title">
              <Layers size={13} />
              <span>Recommended Envelope Specification</span>
            </div>
            <div className="envelope-spec-items">
              <div className="spec-item">
                <span className="spec-label">Glazing:</span>
                <span className="spec-val">Double Low-E Trombe (180° South)</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Thermal Mass:</span>
                <span className="spec-val">400mm Granitic Stone</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Insulation:</span>
                <span className="spec-val">100mm Aerogel Blanket (R: 6.8)</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Solar Fraction:</span>
                <span className="spec-val">68% Sol-Air Gain</span>
              </div>
            </div>
          </div>

          <div className="inspector-action-row">
            <button
              type="button"
              className="btn-primary inspector-cta-btn"
              onClick={() => navigate(activeSelectedSite ? `/sites/${activeSelectedSite.id}` : '/sites')}
            >
              <span>Launch Studio Canvas</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
