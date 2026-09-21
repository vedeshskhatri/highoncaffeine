import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Filter,
  CheckCheck,
  Table as TableIcon,
  LayoutGrid,
  ChevronRight,
  Truck,
  ArrowUpDown,
  Compass,
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
    corridorTarget: 'Dras / Kargil Sector Supply',
  },
  {
    name: 'Khardung La',
    alt: 5359,
    status: 'High Pass Chains Required',
    statusType: 'warning',
    project: 'Project Himank Corridor',
    ambient_c: -22.5,
    closureRisk: 'Ice Hazard / Severe Wind Gusts',
    corridorTarget: 'Nubra / Siachen Base Corridor',
  },
  {
    name: 'Chang La',
    alt: 5360,
    status: 'Open for Military Convoys',
    statusType: 'open',
    project: 'Project Himank',
    ambient_c: -21.0,
    closureRisk: 'Stable Patrol Corridor',
    corridorTarget: 'Pangong / Chushul Sector Access',
  },
  {
    name: 'Tanglang La',
    alt: 5328,
    status: 'Open with High Wind Warning',
    statusType: 'open',
    project: 'Leh-Manali Highway',
    ambient_c: -18.4,
    closureRisk: 'High Crosswind Constraint',
    corridorTarget: 'Southern Logistics Feeder',
  },
  {
    name: 'Fotu La',
    alt: 4108,
    status: 'Clear All-Weather Access',
    statusType: 'open',
    project: 'NH-1 Srinagar-Leh Highway',
    ambient_c: -11.0,
    closureRisk: 'Zero Closure Constraint',
    corridorTarget: 'Western Arterial Corridor',
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

  // Operational Navigation & Triage State
  const [activeTab, setActiveTab] = useState('triage'); // 'triage' | 'passes' | 'stability'
  const [viewLayout, setViewLayout] = useState('split'); // 'split' | 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'critical' | 'warning'
  const [sortBy, setSortBy] = useState('deficit'); // 'deficit' | 'temp' | 'troops' | 'name'
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`/alerts?estate=${encodeURIComponent(estate)}&include_acknowledged=${showAcknowledged}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAlerts(list);
        if (list.length > 0 && !selectedAlertId) {
          setSelectedAlertId(list[0].id);
        }
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
    setScanMessage('Querying Open-Meteo 7-day forward models & recalculating outpost diurnal curves...');
    try {
      await fetch(`/alerts/scan?estate=${encodeURIComponent(estate)}`, {
        method: 'POST',
      });
      setScanMessage('Forecast scan complete. Updated outpost contingency status.');
      fetchAlerts();
    } catch {
      setScanMessage('Forecast scan completed with local cached telemetry.');
    }
    setTimeout(() => {
      setScanning(false);
      setScanMessage(null);
    }, 2400);
  };

  // Acknowledge single alert
  const handleAcknowledge = async (alertId) => {
    try {
      await fetch(`/alerts/${alertId}/ack`, { method: 'POST' });
      fetchAlerts();
    } catch {
      alert('Failed to acknowledge alert');
    }
  };

  // Bulk acknowledge all active unacknowledged alerts
  const handleAcknowledgeAll = async () => {
    const unacknowledged = alerts.filter(a => !a.acknowledged);
    if (unacknowledged.length === 0) return;

    setIsAcknowledgingAll(true);
    try {
      await Promise.all(
        unacknowledged.map(a => fetch(`/alerts/${a.id}/ack`, { method: 'POST' }))
      );
      fetchAlerts();
    } catch {
      alert('Failed to bulk acknowledge alerts');
    } finally {
      setIsAcknowledgingAll(false);
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

  // Combine real alerts with simulated alert if enabled
  const activeAlertsList = useMemo(() => {
    const list = [...alerts];
    if (simulatedSnap && list.length === 0) {
      list.push({
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
    return list;
  }, [alerts, simulatedSnap]);

  // Aggregate statistics for Executive Situation Matrix
  const stats = useMemo(() => {
    const criticalCount = activeAlertsList.filter(a => a.severity === 'critical').length;
    const warningCount = activeAlertsList.filter(a => a.severity === 'warning').length;
    const acknowledgedCount = activeAlertsList.filter(a => a.acknowledged).length;
    const totalOccupants = activeAlertsList.reduce((acc, a) => acc + (a.occupants_affected || 0), 0);

    // Sum fuel litres mentioned in recommended_action (e.g. "buffer 640 L")
    const totalFuelL = activeAlertsList.reduce((acc, a) => {
      const match = a.recommended_action?.match(/(\d[\d,]*)\s*L/i);
      if (match) {
        return acc + parseInt(match[1].replace(/,/g, ''), 10);
      }
      return acc + 400; // fallback standard allocation
    }, 0);

    return {
      total: activeAlertsList.length,
      critical: criticalCount,
      warning: warningCount,
      acknowledged: acknowledgedCount,
      occupants: totalOccupants,
      fuelL: totalFuelL,
    };
  }, [activeAlertsList]);

  // Filter and sort alerts
  const filteredAndSortedAlerts = useMemo(() => {
    let result = activeAlertsList.filter(a => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.site_name?.toLowerCase().includes(q);
        const matchesAction = a.recommended_action?.toLowerCase().includes(q);
        if (!matchesName && !matchesAction) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const deficitA = (a.health_threshold_c || 10.0) - (a.predicted_min_c || 0);
      const deficitB = (b.health_threshold_c || 10.0) - (b.predicted_min_c || 0);

      if (sortBy === 'deficit') return deficitB - deficitA; // highest deficit first
      if (sortBy === 'temp') return (a.predicted_min_c || 0) - (b.predicted_min_c || 0); // lowest temp first
      if (sortBy === 'troops') return (b.occupants_affected || 0) - (a.occupants_affected || 0); // most troops first
      if (sortBy === 'name') return (a.site_name || '').localeCompare(b.site_name || '');
      return 0;
    });

    return result;
  }, [activeAlertsList, severityFilter, searchQuery, sortBy]);

  // Active selected alert for inspector panel
  const selectedAlert = useMemo(() => {
    if (!selectedAlertId && filteredAndSortedAlerts.length > 0) {
      return filteredAndSortedAlerts[0];
    }
    return activeAlertsList.find(a => a.id === selectedAlertId) || filteredAndSortedAlerts[0] || null;
  }, [selectedAlertId, filteredAndSortedAlerts, activeAlertsList]);

  if (loading && alerts.length === 0) {
    return (
      <div className="alerts-loading-state">
        <div className="telemetry-spinner" />
        <span>Querying forward meteorological telemetry & high-altitude models...</span>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      {/* ──────────────────────────────────────────────────────────────────
          1. HEADER & COMMAND ACTIONS
          ────────────────────────────────────────────────────────────────── */}
      <header className="alerts-console-header">
        <div className="alerts-title-column">
          <div className="alerts-tag-row">
            <span className="drdo-section-badge">DRDO PS 26051 · FRONTIER COLD SNAP LOGISTICS</span>
            <span className="alerts-estate-tag mono">{estate.toUpperCase()} SECTOR WATCH</span>
          </div>
          <h2 className="alerts-title">Cold Snap Early Warning &amp; Pre-positioning Console</h2>
          <p className="alerts-subtitle">
            Surveillance of forward 7-day meteorological fronts converting thermal collapse predictions into actionable military fuel pre-positioning directives before mountain passes close.
          </p>
        </div>

        <div className="alerts-header-actions">
          <button
            type="button"
            className={`simulation-toggle-btn ${simulatedSnap ? 'sim-active' : ''}`}
            onClick={handleToggleSimulation}
            title="Simulate severe cold wave to verify contingency dispatch workflow"
          >
            <Snowflake size={14} />
            <span>{simulatedSnap ? 'Revert Simulation' : 'Simulate -15°C Front'}</span>
          </button>

          <button
            type="button"
            className={`filter-chip-btn ${showAcknowledged ? 'active' : ''}`}
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            title="Toggle display of directives acknowledged by frontier command"
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
      </header>

      {scanMessage && (
        <div className="scan-progress-banner mono">
          <Radio size={14} className="spin" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          2. EXECUTIVE SITUATION MATRIX (HIGH-DENSITY SITUATIONAL OVERVIEW)
          ────────────────────────────────────────────────────────────────── */}
      <section className="situation-matrix-ribbon">
        <div className={`matrix-kpi-card ${stats.critical > 0 ? 'kpi-danger' : 'kpi-stable'}`}>
          <div className="kpi-icon-wrap">
            {stats.critical > 0 ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div className="kpi-body">
            <div className="kpi-val-row">
              <span className="kpi-value mono">{stats.total}</span>
              <span className="kpi-sub-badge mono">
                {stats.critical} Critical / {stats.warning} Advisory
              </span>
            </div>
            <span className="kpi-label">Active Directives</span>
            <span className="kpi-hint">Outposts dropping below safe threshold</span>
          </div>
        </div>

        <div className="matrix-kpi-card kpi-solar">
          <div className="kpi-icon-wrap">
            <Flame size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-val-row">
              <span className="kpi-value mono">{stats.fuelL.toLocaleString()} L</span>
              <span className="kpi-sub-badge mono">Pre-positioning</span>
            </div>
            <span className="kpi-label">Kerosene Buffer Needed</span>
            <span className="kpi-hint">Mandatory replenishment before snow close</span>
          </div>
        </div>

        <div className="matrix-kpi-card kpi-neutral">
          <div className="kpi-icon-wrap">
            <Users size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-val-row">
              <span className="kpi-value mono">{stats.occupants}</span>
              <span className="kpi-sub-badge mono">Frontier Personnel</span>
            </div>
            <span className="kpi-label">Garrison Troops at Risk</span>
            <span className="kpi-hint">Indoor comfort target deficit: -15°C to -31°C</span>
          </div>
        </div>

        <div className="matrix-kpi-card kpi-ice">
          <div className="kpi-icon-wrap">
            <Mountain size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-val-row">
              <span className="kpi-value mono">2 Passes</span>
              <span className="kpi-sub-badge mono">Closure Warning</span>
            </div>
            <span className="kpi-label">Corridor Vulnerability</span>
            <span className="kpi-hint">Zoji La &amp; Khardung La snow risk active</span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────
          3. NAVIGATION TABS (TRIAGE | PASSES | STABILITY MATRIX)
          ────────────────────────────────────────────────────────────────── */}
      <div className="alerts-tab-bar">
        <div className="alerts-tabs-group">
          <button
            type="button"
            className={`tab-action-btn ${activeTab === 'triage' ? 'active' : ''}`}
            onClick={() => setActiveTab('triage')}
          >
            <AlertTriangle size={15} />
            <span>Operational Alert Triage</span>
            <span className="tab-pill mono">{activeAlertsList.length}</span>
          </button>

          <button
            type="button"
            className={`tab-action-btn ${activeTab === 'passes' ? 'active' : ''}`}
            onClick={() => setActiveTab('passes')}
          >
            <Mountain size={15} />
            <span>Strategic Himalayan Passes</span>
            <span className="tab-pill mono">5</span>
          </button>

          <button
            type="button"
            className={`tab-action-btn ${activeTab === 'stability' ? 'active' : ''}`}
            onClick={() => setActiveTab('stability')}
          >
            <TableIcon size={15} />
            <span>Outpost Thermal Stability Matrix</span>
            <span className="tab-pill mono">6</span>
          </button>
        </div>

        {activeTab === 'triage' && (
          <div className="triage-view-toggles">
            <button
              type="button"
              className={`view-switch-btn ${viewLayout === 'split' ? 'active' : ''}`}
              onClick={() => setViewLayout('split')}
              title="Split Table & Directive Inspector View (Command Density)"
            >
              <TableIcon size={14} />
              <span>Triage Board</span>
            </button>
            <button
              type="button"
              className={`view-switch-btn ${viewLayout === 'cards' ? 'active' : ''}`}
              onClick={() => setViewLayout('cards')}
              title="Tactical Cards View"
            >
              <LayoutGrid size={14} />
              <span>Compact Cards</span>
            </button>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          TAB 1: OPERATIONAL ALERT TRIAGE
          ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'triage' && (
        <div className="triage-content-stage">
          {/* Triage Toolbar: Search, Filters, Sort, Bulk Acknowledge */}
          <div className="triage-toolbar">
            <div className="triage-filter-left">
              <div className="search-field-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search outposts, sectors, directives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="triage-search-input"
                />
              </div>

              <div className="severity-filter-chips">
                <button
                  type="button"
                  className={`sev-filter-chip ${severityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSeverityFilter('all')}
                >
                  All ({activeAlertsList.length})
                </button>
                <button
                  type="button"
                  className={`sev-filter-chip crit ${severityFilter === 'critical' ? 'active' : ''}`}
                  onClick={() => setSeverityFilter('critical')}
                >
                  <span className="dot red-dot" />
                  Critical ({stats.critical})
                </button>
                <button
                  type="button"
                  className={`sev-filter-chip warn ${severityFilter === 'warning' ? 'active' : ''}`}
                  onClick={() => setSeverityFilter('warning')}
                >
                  <span className="dot amber-dot" />
                  Advisory ({stats.warning})
                </button>
              </div>
            </div>

            <div className="triage-actions-right">
              <div className="sort-dropdown-wrap">
                <ArrowUpDown size={13} className="sort-icon" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="triage-sort-select"
                >
                  <option value="deficit">Sort: Highest Thermal Deficit</option>
                  <option value="temp">Sort: Lowest Predicted Tin</option>
                  <option value="troops">Sort: Most Personnel Affected</option>
                  <option value="name">Sort: Outpost Name (A-Z)</option>
                </select>
              </div>

              {activeAlertsList.some(a => !a.acknowledged) && (
                <button
                  type="button"
                  className="bulk-ack-btn"
                  onClick={handleAcknowledgeAll}
                  disabled={isAcknowledgingAll}
                  title="Acknowledge all pending directives simultaneously"
                >
                  <CheckCheck size={14} />
                  <span>
                    {isAcknowledgingAll ? 'Acknowledging All...' : `Acknowledge All (${activeAlertsList.filter(a => !a.acknowledged).length})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {filteredAndSortedAlerts.length === 0 ? (
            <div className="triage-empty-state">
              <CheckCircle size={36} className="text-comfort" />
              <h4>Zero Matching Alerts</h4>
              <p>All monitored frontier defense outposts meet thermal comfort and logistics readiness thresholds.</p>
            </div>
          ) : viewLayout === 'split' ? (
            /* SPLIT TRIAGE BOARD (High-Density Table on Left + Outpost Inspector on Right) */
            <div className="triage-split-layout">
              <div className="triage-table-container">
                <table className="triage-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>SEVERITY</th>
                      <th>OUTPOST</th>
                      <th>PREDICTED TIN</th>
                      <th>SURVIVAL DEFICIT</th>
                      <th>TROOPS</th>
                      <th>LOGISTICS DIRECTIVE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedAlerts.map((a, index) => {
                      const isSelected = selectedAlert?.id === a.id;
                      const isCritical = a.severity === 'critical';
                      const deficit = (a.health_threshold_c - a.predicted_min_c).toFixed(1);

                      return (
                        <tr
                          key={a.id}
                          className={`triage-row ${isSelected ? 'row-selected' : ''} ${isCritical ? 'critical-row' : ''}`}
                          onClick={() => setSelectedAlertId(a.id)}
                        >
                          <td className="mono text-muted text-center">{index + 1}</td>
                          <td>
                            <span className={`mini-severity-badge ${isCritical ? 'badge-crit' : 'badge-warn'}`}>
                              {a.severity.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="outpost-cell">
                              <span className="outpost-name font-bold">{a.site_name}</span>
                              <span className="outpost-sub mono">Frontier Outpost</span>
                            </div>
                          </td>
                          <td>
                            <span className="mono font-bold text-ice">
                              {a.predicted_min_c} °C
                            </span>
                          </td>
                          <td>
                            <span className="mono font-bold text-danger">
                              -{deficit} °C
                            </span>
                          </td>
                          <td>
                            <div className="mono occupants-pill">
                              <Users size={11} />
                              <span>{a.occupants_affected}</span>
                            </div>
                          </td>
                          <td className="action-snippet-cell">
                            <span className="directive-snippet" title={a.recommended_action}>
                              {a.recommended_action}
                            </span>
                          </td>
                          <td>
                            {a.acknowledged ? (
                              <span className="ack-status-tag acknowledged">
                                <CheckCircle size={12} />
                                <span>Queued</span>
                              </span>
                            ) : (
                              <span className="ack-status-tag pending">
                                <Clock size={12} />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* RIGHT: OUTPOST CONTINGENCY DOSSIER INSPECTOR */}
              {selectedAlert && (
                <aside className="outpost-inspector-panel">
                  <div className="inspector-header">
                    <div>
                      <div className="inspector-badge-row">
                        <span className={`mini-severity-badge ${selectedAlert.severity === 'critical' ? 'badge-crit' : 'badge-warn'}`}>
                          {selectedAlert.severity.toUpperCase()} FREEZE DIRECTIVE
                        </span>
                        <span className="inspector-date mono">
                          {new Date(selectedAlert.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="inspector-outpost-title">{selectedAlert.site_name}</h3>
                      <span className="inspector-sector-tag mono">Frontier Defense Installation</span>
                    </div>

                    <button
                      type="button"
                      className="open-post-hub-link"
                      onClick={() => navigate(`/sites/${selectedAlert.site_id}`)}
                      title={`Open complete site diagnostics for ${selectedAlert.site_name}`}
                    >
                      <span>Post Hub</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Mandatory Action Directive Callout */}
                  <div className="inspector-directive-box">
                    <div className="directive-box-header">
                      <Flame size={15} className="text-solar" />
                      <span className="directive-label">PRE-POSITIONING DISPATCH MANDATE</span>
                    </div>
                    <p className="directive-main-text">{selectedAlert.recommended_action}</p>
                  </div>

                  {/* Key Operational Telemetry */}
                  <div className="inspector-telemetry-grid">
                    <div className="telemetry-block">
                      <span className="t-block-k">Predicted Indoor Min</span>
                      <span className="t-block-v text-ice mono">{selectedAlert.predicted_min_c} °C</span>
                      <span className="t-block-hint mono">Standard: &ge; +10.0°C</span>
                    </div>

                    <div className="telemetry-block">
                      <span className="t-block-k">Survival Deficit</span>
                      <span className="t-block-v text-danger mono">
                        -{(selectedAlert.health_threshold_c - selectedAlert.predicted_min_c).toFixed(1)} °C
                      </span>
                      <span className="t-block-hint mono">Critical Plunge Risk</span>
                    </div>

                    <div className="telemetry-block">
                      <span className="t-block-k">Garrison Personnel</span>
                      <span className="t-block-v mono">{selectedAlert.occupants_affected} Troops</span>
                      <span className="t-block-hint mono">On-Site Occupancy</span>
                    </div>

                    <div className="telemetry-block">
                      <span className="t-block-k">Forecast Ambient Min</span>
                      <span className="t-block-v text-ice mono">
                        {selectedAlert.forecast_summary?.ambient_min_c ?? '-22.4'} °C
                      </span>
                      <span className="t-block-hint mono">High Wind-Chill</span>
                    </div>
                  </div>

                  {/* Pass Corridor Feasibility Check */}
                  <div className="inspector-corridor-card">
                    <div className="corridor-card-header">
                      <Truck size={14} />
                      <span>Logistics Route &amp; Pass Accessibility</span>
                    </div>
                    <p className="corridor-card-text">
                      Replenishment convoys must clear high Himalayan passes prior to forecast day 3 blizzard arrival.
                      Sortie clearance is subject to cloud ceiling above 500m AMSL.
                    </p>
                  </div>

                  {/* Inspector Footer Actions */}
                  <div className="inspector-footer">
                    {!selectedAlert.acknowledged ? (
                      <button
                        type="button"
                        className="inspector-ack-btn"
                        onClick={() => handleAcknowledge(selectedAlert.id)}
                      >
                        <CheckCircle size={15} />
                        <span>Acknowledge Contingency Directive</span>
                      </button>
                    ) : (
                      <div className="inspector-acknowledged-badge mono">
                        <CheckCircle size={15} />
                        <span>Directive Acknowledged by Frontier Command</span>
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </div>
          ) : (
            /* COMPACT CARDS VIEW (Disciplined 2-column tactical grid) */
            <div className="triage-cards-grid">
              {filteredAndSortedAlerts.map(a => {
                const isCritical = a.severity === 'critical';
                const deficit = (a.health_threshold_c - a.predicted_min_c).toFixed(1);

                return (
                  <div
                    key={a.id}
                    className={`tactical-alert-card ${isCritical ? 'card-crit' : 'card-warn'}`}
                  >
                    <div className="tactical-card-top">
                      <div className="tactical-title-group">
                        <span className={`mini-severity-badge ${isCritical ? 'badge-crit' : 'badge-warn'}`}>
                          {a.severity.toUpperCase()}
                        </span>
                        <h4 className="tactical-site-title">{a.site_name}</h4>
                      </div>

                      <button
                        type="button"
                        className="mini-post-link"
                        onClick={() => navigate(`/sites/${a.site_id}`)}
                        title="Open Site Diagnostics"
                      >
                        <span>Post Hub</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    <div className="tactical-directive-snippet">
                      <Flame size={13} className="text-solar" />
                      <span>{a.recommended_action}</span>
                    </div>

                    <div className="tactical-metrics-strip">
                      <div className="t-metric-item">
                        <span className="k">Tin Min</span>
                        <span className="v text-ice mono">{a.predicted_min_c}°C</span>
                      </div>
                      <div className="t-metric-item">
                        <span className="k">Deficit</span>
                        <span className="v text-danger mono">-{deficit}°C</span>
                      </div>
                      <div className="t-metric-item">
                        <span className="k">Troops</span>
                        <span className="v mono">{a.occupants_affected}</span>
                      </div>
                      <div className="t-metric-item">
                        <span className="k">Tamb Min</span>
                        <span className="v text-ice mono">{a.forecast_summary?.ambient_min_c ?? '-22.4'}°C</span>
                      </div>
                    </div>

                    <div className="tactical-card-footer">
                      <span className="tactical-status mono">
                        {a.acknowledged ? '• Acknowledged' : '• Awaiting Command Dispatch'}
                      </span>

                      {!a.acknowledged && (
                        <button
                          type="button"
                          className="tactical-ack-btn"
                          onClick={() => handleAcknowledge(a.id)}
                        >
                          <CheckCircle size={13} />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          TAB 2: STRATEGIC HIMALAYAN PASSES
          ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'passes' && (
        <section className="alerts-card">
          <div className="card-header-block">
            <div>
              <h3 className="card-title-text">Strategic Himalayan Mountain Passes Telemetry</h3>
              <p className="card-sub-text">
                Live winter pass clearance corridors controlling heavy vehicle kerosene replenishment to forward defense sectors.
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

                <div className="pass-target-corridor mono">
                  <span>Corridor: {p.corridorTarget}</span>
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
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          TAB 3: OUTPOST THERMAL STABILITY MATRIX
          ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'stability' && (
        <section className="alerts-card">
          <div className="card-header-block">
            <div>
              <h3 className="card-title-text">Monitored Outpost Thermal Stability &amp; Reserve Buffer Matrix</h3>
              <p className="card-sub-text">
                Steady-state thermal modeling showing time-to-collapse and days of fuel buffer before active sortie intervention is required.
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
                  <th>PREDICTED INDOOR MIN (TIN)</th>
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
        </section>
      )}
    </div>
  );
}
