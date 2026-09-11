import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Table,
  Map as MapIcon,
  Upload,
  RefreshCw,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import './SitesPage.css';

export default function SitesPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'map'
  const [districtFilter, setDistrictFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const [evaluatingAll, setEvaluatingAll] = useState(false);
  const [evalProgress, setEvalProgress] = useState(null);

  // New site modal for pin-drop / quick add
  const [newSiteModalOpen, setNewSiteModalOpen] = useState(false);
  const [newSiteData, setNewSiteData] = useState({
    name: '',
    district: 'Leh',
    lat: 34.2,
    lon: 77.6,
    altitude_m: 3500,
    site_type: 'forward_post',
    occupants: 10,
    notes: 'Dropped pin post',
  });

  const fetchSites = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/sites?estate=${encodeURIComponent(estate)}`)
      .then(r => r.json())
      .then(data => {
        setSites(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSites();
  }, [estate]);

  // Bulk evaluate
  const handleEvaluateAll = async () => {
    setEvaluatingAll(true);
    setEvalProgress('Running solver across all registered sites...');
    try {
      const res = await fetch(`http://127.0.0.1:8000/sites/evaluate-all?estate=${encodeURIComponent(estate)}&force=true`, {
        method: 'POST',
      });
      const data = await res.json();
      setEvalProgress(`Evaluated ${data.evaluated_count} sites in ${data.elapsed_seconds}s`);
      fetchSites();
    } catch {
      setEvalProgress('Batch evaluation failed.');
    }
    setTimeout(() => {
      setEvaluatingAll(false);
      setEvalProgress(null);
    }, 2500);
  };

  // CSV Import handler
  const handleImportSubmit = async () => {
    setImportLoading(true);
    setImportErrors([]);
    try {
      const res = await fetch('http://127.0.0.1:8000/sites/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csv_text: importCsv }),
      });
      if (res.ok) {
        setImportModalOpen(false);
        setImportCsv('');
        fetchSites();
      } else {
        const errData = await res.json();
        setImportErrors(Array.isArray(errData.detail) ? errData.detail : [{ problem: String(errData.detail) }]);
      }
    } catch {
      setImportErrors([{ problem: 'Network error communicating with API' }]);
    }
    setImportLoading(false);
  };

  // Create site from pin drop
  const handleCreateSite = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSiteData, estate }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewSiteModalOpen(false);
        fetchSites();
        navigate(`/sites/${created.id}`);
      }
    } catch (e) {
      alert('Failed to register site: ' + e);
    }
  };

  // Filter & Sort
  const districts = Array.from(new Set(sites.map(s => s.district)));

  const filteredSites = sites.filter(s => {
    if (districtFilter !== 'all' && s.district !== districtFilter) return false;
    if (typeFilter !== 'all' && s.site_type !== typeFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'evaluated' && !s.has_evaluation) return false;
      if (statusFilter === 'unevaluated' && s.has_evaluation) return false;
      if (['optimal', 'warning', 'critical'].includes(statusFilter)) {
        if (!s.has_evaluation || s.evaluation.status !== statusFilter) return false;
      }
    }
    return true;
  });

  const sortedSites = [...filteredSites].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 't_in_min_c') {
      valA = a.has_evaluation ? a.evaluation.t_in_min_c : -999;
      valB = b.has_evaluation ? b.evaluation.t_in_min_c : -999;
    } else if (sortField === 'annual_fuel_litres') {
      valA = a.has_evaluation ? a.evaluation.annual_fuel_litres : -1;
      valB = b.has_evaluation ? b.evaluation.annual_fuel_litres : -1;
    } else if (sortField === 'hours_below') {
      valA = a.has_evaluation ? a.evaluation.hours_below_health_threshold : -1;
      valB = b.has_evaluation ? b.evaluation.hours_below_health_threshold : -1;
    }

    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="sites-page">
      {/* Page Header */}
      <div className="sites-header">
        <div>
          <h2 className="sites-title">Site Registry & Topology</h2>
          <p className="sites-subtitle">
            Managing {sites.length} operational thermal assets in {estate} Estate.
          </p>
        </div>

        <div className="sites-actions">
          <div className="view-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <Table size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={14} />
              <span>Himalaya Map</span>
            </button>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={handleEvaluateAll}
            disabled={evaluatingAll}
          >
            <RefreshCw size={14} className={evaluatingAll ? 'spin' : ''} />
            <span>{evaluatingAll ? 'Evaluating...' : 'Evaluate All'}</span>
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setNewSiteModalOpen(true)}
          >
            <Plus size={14} />
            <span>Register New Post</span>
          </button>
        </div>
      </div>

      {evalProgress && (
        <div className="eval-progress-banner">
          <span>{evalProgress}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="sites-filter-bar">
        <div className="filter-group">
          <Filter size={14} className="filter-icon" />
          <span className="filter-label">Filters:</span>

          <select
            className="filter-select"
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
          >
            <option value="all">All Districts</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All Post Types</option>
            <option value="forward_post">Forward Post</option>
            <option value="relief_camp">Relief Camp</option>
            <option value="dwelling">Dwelling / Base</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Thermal States</option>
            <option value="optimal">Compliant (Optimal)</option>
            <option value="warning">Warning (Sub-Standard)</option>
            <option value="critical">Critical (Severe Freeze)</option>
            <option value="unevaluated">Not Evaluated</option>
          </select>
        </div>

        <div className="sites-count-label">
          Showing {sortedSites.length} of {sites.length} posts
        </div>
      </div>

      {/* Main View Mode */}
      {viewMode === 'table' ? (
        <div className="sites-table-card">
          <table className="sites-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('name')} className="sortable-th">
                  <span>Site / Outpost</span> <ArrowUpDown size={12} />
                </th>
                <th onClick={() => toggleSort('district')} className="sortable-th">
                  <span>District</span> <ArrowUpDown size={12} />
                </th>
                <th onClick={() => toggleSort('altitude_m')} className="sortable-th">
                  <span>Altitude</span> <ArrowUpDown size={12} />
                </th>
                <th>Type</th>
                <th>Occupants</th>
                <th onClick={() => toggleSort('t_in_min_c')} className="sortable-th">
                  <span>Overnight Min</span> <ArrowUpDown size={12} />
                </th>
                <th onClick={() => toggleSort('hours_below')} className="sortable-th">
                  <span>Hours &lt; Threshold</span> <ArrowUpDown size={12} />
                </th>
                <th onClick={() => toggleSort('annual_fuel_litres')} className="sortable-th">
                  <span>Annual Fuel</span> <ArrowUpDown size={12} />
                </th>
                <th>Thermal Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedSites.map(s => {
                const hasEval = s.has_evaluation;
                const ev = s.evaluation;
                const statusDotClass = !hasEval
                  ? 'dot-unevaluated'
                  : ev.status === 'optimal'
                  ? 'dot-optimal'
                  : ev.status === 'warning'
                  ? 'dot-warning'
                  : 'dot-critical';

                return (
                  <tr
                    key={s.id}
                    className="site-row"
                    onClick={() => navigate(`/sites/${s.id}`)}
                  >
                    <td className="site-name-cell">
                      <span className={`status-dot ${statusDotClass}`} />
                      <div>
                        <span className="site-primary-name">{s.name}</span>
                        <span className="site-coords">
                          {s.lat.toFixed(2)}°N, {s.lon.toFixed(2)}°E
                        </span>
                      </div>
                    </td>
                    <td>{s.district}</td>
                    <td className="mono-val">{s.altitude_m.toLocaleString()} m</td>
                    <td>
                      <span className={`type-tag tag-${s.site_type}`}>
                        {s.site_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="mono-val">{s.occupants}</td>
                    <td className="mono-val">
                      {hasEval ? (
                        <span className={ev.t_in_min_c < 0 ? 'text-danger' : ''}>
                          {ev.t_in_min_c.toFixed(1)} °C
                        </span>
                      ) : (
                        <span className="not-eval-tag">Not evaluated</span>
                      )}
                    </td>
                    <td className="mono-val">
                      {hasEval ? `${ev.hours_below_health_threshold} h` : '—'}
                    </td>
                    <td className="mono-val">
                      {hasEval ? `${ev.annual_fuel_litres.toLocaleString()} L` : '—'}
                    </td>
                    <td>
                      {hasEval ? (
                        <span className={`status-pill pill-${ev.status}`}>
                          {ev.status}
                        </span>
                      ) : (
                        <span className="status-pill pill-unevaluated">
                          unevaluated
                        </span>
                      )}
                    </td>
                    <td className="chevron-cell">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                );
              })}

              {sortedSites.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-table-cell">
                    No sites found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Himalaya Interactive Pin-Drop Map */
        <div className="sites-map-container">
          <div className="map-instruction-bar">
            <span>
              Click anywhere on the terrain to <strong>drop a pin</strong> and register a new post at that exact latitude & longitude.
            </span>
          </div>

          <div
            className="himalaya-map-canvas"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              // Map approximate bounds for Ladakh: lat 32.0 to 36.0, lon 75.0 to 79.5
              const lat = Number((36.0 - (y / rect.height) * 4.0).toFixed(4));
              const lon = Number((75.0 + (x / rect.width) * 4.5).toFixed(4));
              setNewSiteData(prev => ({ ...prev, lat, lon, name: `New Post (${lat}, ${lon})` }));
              setNewSiteModalOpen(true);
            }}
          >
            {/* SVG Terrain Background */}
            <svg className="map-terrain-svg" viewBox="0 0 900 500">
              <defs>
                <linearGradient id="terrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--cream-2)" />
                  <stop offset="100%" stopColor="var(--cream)" />
                </linearGradient>
              </defs>
              <rect width="900" height="500" fill="url(#terrainGrad)" />

              {/* Major Himalayan Ridge Lines & Contours */}
              <path
                d="M 50 150 Q 250 80 450 120 T 850 180"
                fill="none"
                stroke="var(--rule)"
                strokeWidth="3"
                strokeDasharray="4 4"
              />
              <path
                d="M 120 280 Q 380 200 600 240 T 880 320"
                fill="none"
                stroke="var(--rule)"
                strokeWidth="2"
              />
              <path
                d="M 80 400 Q 300 340 580 370 T 820 440"
                fill="none"
                stroke="var(--rule)"
                strokeWidth="1.5"
              />

              {/* Geographic Labels */}
              <text x="350" y="70" fill="var(--espresso-40)" fontFamily="var(--font-heading)" fontSize="13" letterSpacing="0.1em">
                KARAKORAM RANGE
              </text>
              <text x="420" y="220" fill="var(--espresso-40)" fontFamily="var(--font-heading)" fontSize="12" letterSpacing="0.1em">
                LADAKH RANGE (LEH CORRIDOR)
              </text>
              <text x="500" y="380" fill="var(--espresso-40)" fontFamily="var(--font-heading)" fontSize="12" letterSpacing="0.1em">
                ZANSKAR & CHANGTHANG
              </text>
            </svg>

            {/* Render Site Pins */}
            {sortedSites.map(s => {
              // Convert lat/lon to map percentage
              const topPct = Math.max(5, Math.min(95, ((36.0 - s.lat) / 4.0) * 100));
              const leftPct = Math.max(5, Math.min(95, ((s.lon - 75.0) / 4.5) * 100));

              const pinColor = !s.has_evaluation
                ? 'var(--espresso-40)'
                : s.evaluation.status === 'optimal'
                ? 'var(--sage)'
                : s.evaluation.status === 'warning'
                ? 'var(--orange)'
                : 'var(--ice)';

              return (
                <div
                  key={s.id}
                  className="map-site-pin"
                  style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sites/${s.id}`);
                  }}
                  title={`${s.name} (${s.district}) - ${s.has_evaluation ? `${s.evaluation.t_in_min_c} °C` : 'Not evaluated'}`}
                >
                  <div className="pin-head" style={{ backgroundColor: pinColor }}>
                    <span className="pin-dot" />
                  </div>
                  <div className="pin-tooltip">
                    <span className="pin-title">{s.name}</span>
                    <span className="pin-meta">
                      {s.altitude_m}m · {s.has_evaluation ? `${s.evaluation.t_in_min_c} °C` : 'Not evaluated'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="modal-backdrop" onClick={() => setImportModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Import Sites from CSV</h3>
            <p className="modal-desc">
              Paste CSV with required headers: <code>name,estate,district,lat,lon,altitude_m,site_type,occupants</code>.
              Per Rule 09 §6, all column-level errors are reported simultaneously.
            </p>

            <textarea
              className="csv-textarea"
              rows={8}
              placeholder="name,estate,district,lat,lon,altitude_m,site_type,occupants&#10;Sector Post 9,Ladakh,Leh,34.50,77.20,3800,forward_post,12"
              value={importCsv}
              onChange={e => setImportCsv(e.target.value)}
            />

            {importErrors.length > 0 && (
              <div className="csv-errors-box">
                <div className="errors-title">
                  <AlertTriangle size={14} />
                  <span>Validation Errors ({importErrors.length})</span>
                </div>
                <ul>
                  {importErrors.map((err, i) => (
                    <li key={i}>
                      Row {err.row || '?'}, Column <strong>{err.column || 'general'}</strong>: {err.problem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setImportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={importLoading || !importCsv.trim()}
                onClick={handleImportSubmit}
              >
                {importLoading ? 'Validating...' : 'Import Posts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Register / Dropped Pin Modal */}
      {newSiteModalOpen && (
        <div className="modal-backdrop" onClick={() => setNewSiteModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Register New Post / Dropped Pin</h3>
            <p className="modal-desc">
              Define the geographic coordinates and operational requirements for this post.
            </p>

            <div className="modal-form-grid">
              <div className="form-field">
                <label>Post Name</label>
                <input
                  type="text"
                  value={newSiteData.name}
                  onChange={e => setNewSiteData({ ...newSiteData, name: e.target.value })}
                  placeholder="e.g. Spanggur Ridge Post 2"
                />
              </div>

              <div className="form-field">
                <label>District</label>
                <select
                  value={newSiteData.district}
                  onChange={e => setNewSiteData({ ...newSiteData, district: e.target.value })}
                >
                  <option value="Leh">Leh</option>
                  <option value="Kargil">Kargil</option>
                  <option value="Rasuwa">Rasuwa</option>
                </select>
              </div>

              <div className="form-field">
                <label>Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newSiteData.lat}
                  onChange={e => setNewSiteData({ ...newSiteData, lat: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-field">
                <label>Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newSiteData.lon}
                  onChange={e => setNewSiteData({ ...newSiteData, lon: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-field">
                <label>Altitude (m)</label>
                <input
                  type="number"
                  value={newSiteData.altitude_m}
                  onChange={e => setNewSiteData({ ...newSiteData, altitude_m: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-field">
                <label>Post Type</label>
                <select
                  value={newSiteData.site_type}
                  onChange={e => setNewSiteData({ ...newSiteData, site_type: e.target.value })}
                >
                  <option value="forward_post">Forward Post (Military)</option>
                  <option value="relief_camp">Relief Camp (Disaster/Emergency)</option>
                  <option value="dwelling">Dwelling / Civilian Base</option>
                </select>
              </div>

              <div className="form-field">
                <label>Occupants</label>
                <input
                  type="number"
                  value={newSiteData.occupants}
                  onChange={e => setNewSiteData({ ...newSiteData, occupants: parseInt(e.target.value, 10) })}
                />
              </div>

              <div className="form-field">
                <label>Operational Notes</label>
                <input
                  type="text"
                  value={newSiteData.notes}
                  onChange={e => setNewSiteData({ ...newSiteData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setNewSiteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleCreateSite}
              >
                Save & Open Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
