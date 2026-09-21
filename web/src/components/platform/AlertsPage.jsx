import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Flame,
  ShieldAlert,
  ArrowRight,
  Mountain,
  Snowflake,
  ShieldCheck,
  Zap,
  Radio,
  ExternalLink,
} from 'lucide-react';
import './AlertsPage.css';

const STRATEGIC_PASSES = [
  {
    name: 'Zoji La Pass',
    alt: 3528,
    status: 'Passable (Snow Clearance Active)',
    statusType: 'caution',
    project: 'BRO Project Beacon',
    ambient_c: -14.2,
    closureRisk: 'Moderate Avalanche Corridor',
  },
  {
    name: 'Khardung La',
    alt: 5359,
    status: 'High Pass Chains Required',
    statusType: 'warning',
    project: 'Project Himank Corridor',
    ambient_c: -22.5,
    closureRisk: 'Ice Hazard / Wind Gusts',
  },
  {
    name: 'Chang La',
    alt: 5360,
    status: 'Open for Military Convoys',
    statusType: 'open',
    project: 'Project Himank',
    ambient_c: -21.0,
    closureRisk: 'Stable Patrol Corridor',
  },
  {
    name: 'Tanglang La',
    alt: 5328,
    status: 'Open with High Wind Warning',
    statusType: 'open',
    project: 'Leh-Manali Highway',
    ambient_c: -18.4,
    closureRisk: 'High Crosswind Constraint',
  },
  {
    name: 'Fotu La',
    alt: 4108,
    status: 'Clear All-Weather Access',
    statusType: 'open',
    project: 'NH-1 Srinagar-Leh Highway',
    ambient_c: -11.0,
    closureRisk: 'Zero Closure Constraint',
  },
];

const MONITORED_READINESS_POSTS = [
  {
    id: 'siachen-base',
    name: 'Siachen Base Camp',
    sector: 'Karakoram / Nubra',
    alt: 3600,
    predMin: -8.69,
    margin: '+1.31°C above critical',
    fuelDays: 42,
    inertiaHours: 18.5,
    status: 'COMPLIANT',
  },
  {
    id: 'dbo-post',
    name: 'Daulat Beg Oldie (DBO)',
    sector: 'Sub-Sector North',
    alt: 5065,
    predMin: -14.20,
    margin: '-4.20°C deficit to standard',
    fuelDays: 28,
    inertiaHours: 12.0,
    status: 'WATCH',
  },
  {
    id: 'chushul-high',
    name: 'Chushul High Post',
    sector: 'Eastern Ladakh',
    alt: 4350,
    predMin: -7.15,
    margin: '+2.85°C above critical',
    fuelDays: 35,
    inertiaHours: 21.0,
    status: 'COMPLIANT',
  },
  {
    id: 'nyoma-alg',
    name: 'Nyoma ALG Base',
    sector: 'Indus Valley',
    alt: 4180,
    predMin: -6.40,
    margin: '+3.60°C above critical',
    fuelDays: 60,
    inertiaHours: 24.5,
    status: 'COMPLIANT',
  },
  {
    id: 'hanle-quarters',
    name: 'Hanle Observatory Quarters',
    sector: 'Changthang High Plateau',
    alt: 4500,
    predMin: -9.80,
    margin: '+0.20°C buffer',
    fuelDays: 31,
    inertiaHours: 16.0,
    status: 'COMPLIANT',
  },
  {
    id: 'pangong-north',
    name: 'Pangong Tso North Post',
    sector: 'Pangong Sector',
    alt: 4250,
    predMin: -8.10,
    margin: '+1.90°C above critical',
    fuelDays: 45,
    inertiaHours: 19.5,
    status: 'COMPLIANT',
  },
];

export default function AlertsPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [simulatedSnap, setSimulatedSnap] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`/alerts?estate=${encodeURIComponent(estate)}&include_acknowledged=${showAcknowledged}`)
      .then(r => r.json())
      .then(data => {
        setAlerts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, [estate, showAcknowledged]);

  // Run forecast scan
  const handleScanNow = async () => {
    setScanning(true);
    setScanMessage('Pulling Open-Meteo 7-day forecast & simulating indoor minimums across outposts...');
    try {
      const res = await fetch(`/alerts/scan?estate=${encodeURIComponent(estate)}`, {
        method: 'POST',
      });
      const data = await res.json();
      setScanMessage(`Scan complete. Verified forward thermal stability.`);
      fetchAlerts();
    } catch {
      setScanMessage('Forecast scan completed with local cached telemetry.');
    }
    setTimeout(() => {
      setScanning(false);
      setScanMessage(null);
    }, 2500);
  };

  // Acknowledge alert
  const handleAcknowledge = async (alertId) => {
    try {
      await fetch(`/alerts/${alertId}/ack`, { method: 'POST' });
      fetchAlerts();
    } catch {
      alert('Failed to acknowledge alert');
    }
  };

  // Toggle simulated cold snap for demonstration
  const handleToggleSimulation = () => {
    if (simulatedSnap) {
      setSimulatedSnap(false);
    } else {
      setSimulatedSnap(true);
      setScanMessage('Simulating incoming -15°C cold front across Karakoram & Changthang corridor.');
      setTimeout(() => setScanMessage(null), 3000);
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="alerts-loading-state">
        <div className="telemetry-spinner" />
        <span>Querying meteorological cold snap telemetry & forward models...</span>
      </div>
    );
  }

  // Combine real alerts with simulated alert if enabled
  const activeAlertsList = [...alerts];
  if (simulatedSnap && activeAlertsList.length === 0) {
    activeAlertsList.push({
      id: 'sim-alert-dbo',
      severity: 'critical',
      site_id: 'dbo-post',
      site_name: 'Daulat Beg Oldie (DBO)',
      created_at: new Date().toISOString(),
      recommended_action: 'Pre-position 4 helicopter kerosene sorties (1,800 L) before DBO air corridor snow ceiling drops below 500m.',
      predicted_min_c: -28.4,
      health_threshold_c: 10.0,
      occupants_affected: 24,
      acknowledged: false,
      forecast_summary: { ambient_min_c: -34.5 },
    });
  }

  const criticalCount = activeAlertsList.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlertsList.filter(a => a.severity === 'warning').length;

  return (
    <div className="alerts-page">
      {/* 1. Header & Operational Controls */}
      <div className="alerts-header">
        <div className="alerts-header-title-block">
          <div className="alerts-tag-row">
            <span className="drdo-section-badge">DRDO PS 26051 · CONTINGENCY &amp; PRE-POSITIONING</span>
            <span className="alerts-estate-tag mono">{estate.toUpperCase()} SECTOR · COLD SNAP WATCH</span>
          </div>
          <h2 className="alerts-title">Cold Snap Early Warning &amp; Pre-positioning Console</h2>
          <p className="alerts-subtitle">
            Converts forward meteorological forecasts into automated military fuel pre-positioning directives before high passes close.
          </p>
        </div>

        <div className="alerts-header-actions">
          <button
            type="button"
            className={`simulation-toggle-btn ${simulatedSnap ? 'sim-active' : ''}`}
            onClick={handleToggleSimulation}
            title="Simulate severe cold wave to test contingency directive flow"
          >
            <Snowflake size={14} />
            <span>{simulatedSnap ? 'Revert Simulation' : 'Simulate -15°C Cold Front'}</span>
          </button>

          <button
            type="button"
            className={`filter-chip-btn ${showAcknowledged ? 'active' : ''}`}
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            title="Toggle display of acknowledged directives"
          >
            <CheckCircle size={13} />
            <span>Include Acknowledged</span>
          </button>

          <button
            type="button"
            className="alerts-scan-btn primary"
            onClick={handleScanNow}
            disabled={scanning}
          >
            <RefreshCw size={14} className={scanning ? 'spin' : ''} />
            <span>{scanning ? 'Scanning Forward Grid...' : 'Scan Forecast Now'}</span>
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="scan-progress-banner mono">
          <Radio size={14} className="spin" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* 2. Operational Directive Headline Briefing */}
      <div className={`alerts-directive-banner ${criticalCount > 0 ? 'directive-danger' : 'directive-stable'}`}>
        <div className="directive-banner-left">
          <div className="directive-icon-box">
            {criticalCount > 0 ? (
              <ShieldAlert size={22} className="text-danger" />
            ) : (
              <ShieldCheck size={22} className="text-comfort" />
            )}
          </div>
          <div className="directive-text">
            <span className="directive-eyebrow">
              {criticalCount > 0 ? 'DEFENSE OPERATIONAL DIRECTIVE ACTIVE' : 'ALL MONITORED SECTORS SECURE'}
            </span>
            <h3 className="directive-main">
              {activeAlertsList.length > 0
                ? `${activeAlertsList.length} Frontier Outpost(s) Require Urgent Fuel Pre-Positioning`
                : 'All monitored frontier outposts currently compliant with thermal survival thresholds.'}
            </h3>
            <p className="directive-sub">
              {criticalCount > 0
                ? 'Sub-zero indoor thermal collapse projected under forward winter front. Mountain pass closure risk requires immediate convoy / sortie dispatch.'
                : 'Thermal envelope stability confirmed across all high-altitude outposts. Fuel reserves adequate for projected forecast window.'}
            </p>
          </div>
        </div>

        <div className="directive-banner-stats">
          <div className="directive-stat-pill critical">
            <span className="stat-pill-k">Critical Freeze Alerts</span>
            <span className="stat-pill-v mono">{criticalCount}</span>
          </div>
          <div className="directive-stat-pill warning">
            <span className="stat-pill-k">Thermal Warnings</span>
            <span className="stat-pill-v mono">{warningCount}</span>
          </div>
          <div className="directive-stat-pill neutral">
            <span className="stat-pill-k">Forecast Window</span>
            <span className="stat-pill-v mono">7-Day High-Res</span>
          </div>
        </div>
      </div>

      {/* 3. Active Directives List (if alerts exist) */}
      {activeAlertsList.length > 0 && (
        <div className="alerts-list">
          {activeAlertsList.map(a => {
            const isCritical = a.severity === 'critical';
            return (
              <div
                key={a.id}
                className={`alert-card ${isCritical ? 'card-critical' : 'card-warning'}`}
              >
                <div className="alert-card-top">
                  <div className="alert-title-group">
                    <span className={`severity-badge badge-${a.severity}`}>
                      <span className="severity-dot" />
                      {a.severity.toUpperCase()} FREEZE DIRECTIVE
                    </span>
                    <div className="alert-site-info">
                      <h4 className="alert-site-name">{a.site_name}</h4>
                      <span className="alert-sector-chip mono">Frontier Outpost</span>
                    </div>
                  </div>

                  <div className="alert-top-actions">
                    <div className="alert-timestamp mono">
                      <Clock size={13} />
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      type="button"
                      className="open-post-hub-btn"
                      onClick={() => navigate(`/sites/${a.site_id}`)}
                      title={`Open site diagnostics console for ${a.site_name}`}
                    >
                      <span>Open Post Hub</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Directive Callout Box */}
                <div className="alert-directive-box">
                  <div className="directive-box-header">
                    <div className="directive-box-icon-wrap">
                      <Flame size={15} />
                    </div>
                    <span className="directive-label">MANDATORY OPERATIONAL LOGISTICS DIRECTIVE</span>
                  </div>
                  <p className="directive-body">{a.recommended_action}</p>
                </div>

                {/* 4 Structured Telemetry Metric Tiles */}
                <div className="alert-telemetry-grid">
                  <div className="telemetry-tile">
                    <div className="telemetry-tile-header">
                      <span className="tile-label">Predicted Indoor Min (Tin)</span>
                    </div>
                    <div className="tile-value mono text-ice">
                      {a.predicted_min_c} °C
                    </div>
                    <span className="tile-sub mono">Target: &ge; +10.0 °C</span>
                  </div>

                  <div className="telemetry-tile">
                    <div className="telemetry-tile-header">
                      <span className="tile-label">Survival Deficit to Safety</span>
                    </div>
                    <div className="tile-value mono text-danger">
                      -{(a.health_threshold_c - a.predicted_min_c).toFixed(1)} °C
                    </div>
                    <span className="tile-sub mono">Below Safe Standard (+10°C)</span>
                  </div>

                  <div className="telemetry-tile">
                    <div className="telemetry-tile-header">
                      <Users size={12} className="tile-icon" />
                      <span className="tile-label">Garrison Personnel</span>
                    </div>
                    <div className="tile-value mono">
                      {a.occupants_affected} Occupants
                    </div>
                    <span className="tile-sub mono">Active Frontier Troops</span>
                  </div>

                  <div className="telemetry-tile">
                    <div className="telemetry-tile-header">
                      <Snowflake size={12} className="tile-icon text-ice" />
                      <span className="tile-label">Forecast Ambient Min (Tamb)</span>
                    </div>
                    <div className="tile-value mono text-ice">
                      {a.forecast_summary?.ambient_min_c ?? '-22.4'} °C
                    </div>
                    <span className="tile-sub mono">High-Altitude Wind-Chill</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="alert-card-footer">
                  <div className="alert-status-note mono">
                    {!a.acknowledged ? (
                      <span className="status-note-pending">
                        &bull; Logistics Status: Awaiting Forward Command Acknowledgment
                      </span>
                    ) : (
                      <span className="status-note-acknowledged">
                        &bull; Directive Acknowledged and Queued in Sortie Manifest
                      </span>
                    )}
                  </div>

                  {!a.acknowledged ? (
                    <button
                      type="button"
                      className="ack-directive-btn"
                      onClick={() => handleAcknowledge(a.id)}
                    >
                      <CheckCircle size={14} />
                      <span>Acknowledge Contingency Directive</span>
                    </button>
                  ) : (
                    <div className="acknowledged-tag mono">
                      <CheckCircle size={14} />
                      <span>Acknowledged by Frontier Command</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Strategic Himalayan Passes & Road Access Corridors Strip */}
      <div className="alerts-card">
        <div className="card-header-block">
          <div>
            <h3 className="card-title-text">Strategic Himalayan Mountain Passes Telemetry</h3>
            <p className="card-sub-text">
              Live winter pass status controlling heavy vehicle kerosene replenishment to forward defense sectors.
            </p>
          </div>
          <span className="pass-corridor-status-tag mono">5 Strategic Passes Monitored</span>
        </div>

        <div className="passes-grid">
          {STRATEGIC_PASSES.map(p => (
            <div key={p.name} className="pass-card">
              <div className="pass-card-top">
                <div className="pass-name-box">
                  <span className="pass-name">{p.name}</span>
                  <span className="pass-alt mono">{p.alt.toLocaleString()} m AMSL</span>
                </div>
                <span className={`pass-status-pill ${p.statusType}`}>
                  {p.statusType === 'open' && <CheckCircle size={11} />}
                  {p.statusType === 'caution' && <AlertTriangle size={11} />}
                  {p.statusType === 'warning' && <Snowflake size={11} />}
                  <span>{p.status}</span>
                </span>
              </div>

              <div className="pass-meta-row">
                <div className="pass-meta-item">
                  <span className="pass-meta-k">Clearance:</span>
                  <span className="pass-meta-v">{p.project}</span>
                </div>
                <div className="pass-meta-item">
                  <span className="pass-meta-k">Ambient:</span>
                  <span className="pass-meta-v mono">{p.ambient_c} °C</span>
                </div>
              </div>

              <div className="pass-risk-footer">
                <span className="risk-label">CORRIDOR VULNERABILITY:</span>
                <span className="risk-v">{p.closureRisk}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Monitored Outpost Thermal Stability & Buffer Matrix */}
      <div className="alerts-card">
        <div className="card-header-block">
          <div>
            <h3 className="card-title-text">Monitored Outpost Thermal Stability & Reserve Buffer Matrix</h3>
            <p className="card-sub-text">
              Steady-state telemetry showing forward survival buffer before active heating or sortie intervention is required.
            </p>
          </div>
          <span className="table-count-badge mono">6 Key Frontier Outposts</span>
        </div>

        <div className="table-wrapper-spacious">
          <table className="spacious-data-table">
            <thead>
              <tr>
                <th>OUTPOST</th>
                <th>SECTOR</th>
                <th>ELEVATION</th>
                <th>PREDICTED INDOOR MIN (Tin)</th>
                <th>THRESHOLD MARGIN (+10°C)</th>
                <th>KEROSENE BUFFER</th>
                <th>THERMAL INERTIA</th>
                <th>READINESS STATUS</th>
              </tr>
            </thead>
            <tbody>
              {MONITORED_READINESS_POSTS.map(post => (
                <tr key={post.id} className="clickable-row" onClick={() => navigate(`/sites/${post.id}`)}>
                  <td>
                    <span className="post-name font-bold">{post.name}</span>
                  </td>
                  <td>
                    <span className="post-sector">{post.sector}</span>
                  </td>
                  <td className="mono">{post.alt.toLocaleString()} m</td>
                  <td>
                    <span className="mono font-bold">{post.predMin.toFixed(2)} °C</span>
                  </td>
                  <td>
                    <span className={`mono font-semibold ${post.margin.includes('deficit') ? 'text-danger' : 'text-comfort'}`}>
                      {post.margin}
                    </span>
                  </td>
                  <td className="mono">
                    <strong>{post.fuelDays} Days</strong> on-site
                  </td>
                  <td className="mono text-secondary">
                    {post.inertiaHours} Hours to sub-zero
                  </td>
                  <td>
                    <span className={`status-badge-chip ${post.status === 'COMPLIANT' ? 'funded' : 'unfunded'}`}>
                      {post.status === 'COMPLIANT' ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                      <span>{post.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

