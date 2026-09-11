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
} from 'lucide-react';
import './AlertsPage.css';

export default function AlertsPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/alerts?estate=${encodeURIComponent(estate)}&include_acknowledged=${showAcknowledged}`)
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
    setScanMessage('Pulling Open-Meteo 7-day forecast & simulating indoor minimums...');
    try {
      const res = await fetch(`http://127.0.0.1:8000/alerts/scan?estate=${encodeURIComponent(estate)}`, {
        method: 'POST',
      });
      const data = await res.json();
      setScanMessage(`Scan complete. Evaluated forward weather profiles.`);
      fetchAlerts();
    } catch {
      setScanMessage('Forecast scan failed.');
    }
    setTimeout(() => {
      setScanning(false);
      setScanMessage(null);
    }, 2500);
  };

  // Acknowledge alert
  const handleAcknowledge = async (alertId) => {
    try {
      await fetch(`http://127.0.0.1:8000/alerts/${alertId}/ack`, { method: 'POST' });
      fetchAlerts();
    } catch {
      alert('Failed to acknowledge alert');
    }
  };

  if (loading && alerts.length === 0) {
    return <div className="loading-state">Querying meteorological cold snap alerts...</div>;
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="alerts-page">
      {/* 1. Header & Operational Controls */}
      <div className="alerts-header">
        <div>
          <h2 className="alerts-title">Cold Snap Early Warning & Pre-positioning</h2>
          <p className="alerts-subtitle">
            Converts forward weather forecasts into actionable fuel pre-positioning directives before passes close.
          </p>
        </div>

        <div className="alerts-header-actions">
          <label className="ack-toggle-label">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={e => setShowAcknowledged(e.target.checked)}
            />
            <span>Include Acknowledged</span>
          </label>

          <button
            type="button"
            className="primary-btn"
            onClick={handleScanNow}
            disabled={scanning}
          >
            <RefreshCw size={14} className={scanning ? 'spin' : ''} />
            <span>{scanning ? 'Scanning Forecast...' : 'Scan Forecast Now'}</span>
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="scan-progress-banner">
          <span>{scanMessage}</span>
        </div>
      )}

      {/* 2. Operational Directive Headline */}
      <div className="alerts-directive-banner">
        <div className="directive-icon-box">
          <ShieldAlert size={24} className="text-ice" />
        </div>
        <div className="directive-text">
          <h3 className="directive-main">
            {alerts.length > 0
              ? `Operational Action Required: ${alerts.length} posts fall below thermal safety thresholds.`
              : `All monitored outposts currently compliant with thermal thresholds.`}
          </h3>
          <span className="directive-sub">
            {criticalCount} critical freeze hazard alert(s) · {warningCount} sub-standard thermal warnings.
          </span>
        </div>
      </div>

      {/* 3. Alerts List */}
      <div className="alerts-list">
        {alerts.map(a => {
          const isCritical = a.severity === 'critical';
          return (
            <div
              key={a.id}
              className={`alert-card ${isCritical ? 'card-critical' : 'card-warning'}`}
            >
              <div className="alert-card-top">
                <div className="alert-title-group">
                  <span className={`severity-badge badge-${a.severity}`}>
                    {a.severity}
                  </span>
                  <h4 className="alert-site-name">{a.site_name}</h4>
                  <span className="alert-post-link" onClick={() => navigate(`/sites/${a.site_id}`)}>
                    Open Post Hub →
                  </span>
                </div>

                <div className="alert-timestamp mono">
                  <Clock size={12} />
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Directive Body */}
              <div className="alert-directive-box">
                <span className="directive-label">RECOMMENDED LOGISTICS ACTION</span>
                <p className="directive-body">{a.recommended_action}</p>
              </div>

              {/* Forecast & Physics Metrics */}
              <div className="alert-metrics-strip">
                <div className="alert-metric-item">
                  <span className="metric-k">Predicted Indoor Min:</span>
                  <span className={`metric-v mono ${a.predicted_min_c < 0 ? 'text-ice font-bold' : ''}`}>
                    {a.predicted_min_c} °C
                  </span>
                </div>
                <div className="alert-metric-item">
                  <span className="metric-k">Threshold Deficit:</span>
                  <span className="metric-v mono text-orange">
                    {(a.health_threshold_c - a.predicted_min_c).toFixed(1)} °C below safe
                  </span>
                </div>
                <div className="alert-metric-item">
                  <span className="metric-k">Troops Affected:</span>
                  <span className="metric-v mono font-bold">
                    {a.occupants_affected} occupants
                  </span>
                </div>
                {a.forecast_summary?.ambient_min_c && (
                  <div className="alert-metric-item">
                    <span className="metric-k">Forecast Ambient Min:</span>
                    <span className="metric-v mono text-ice">
                      {a.forecast_summary.ambient_min_c} °C
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="alert-card-footer">
                {!a.acknowledged ? (
                  <button
                    type="button"
                    className="ack-btn"
                    onClick={() => handleAcknowledge(a.id)}
                  >
                    <CheckCircle size={14} />
                    <span>Acknowledge Directive</span>
                  </button>
                ) : (
                  <span className="acknowledged-tag mono">
                    <CheckCircle size={12} /> Acknowledged by Command
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="empty-alerts-card">
            <CheckCircle size={32} className="text-sage" />
            <div>
              <h4>No Active Cold Snap Alerts</h4>
              <p>
                Live forecast predictions show indoor shelter temperatures remain within safe operating parameters across {estate} Estate.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
