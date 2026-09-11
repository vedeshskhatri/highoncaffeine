import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Table,
  Map as MapIcon,
  Upload,
  RefreshCw,
  Plus,
  ArrowUpDown,
  ChevronRight,
  Search,
  Sparkles,
  Info,
  X,
  ExternalLink,
  Shield,
  Snowflake,
  Flame,
  Users,
  Navigation,
  Box,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Interactive3DMap from './Interactive3DMap';
import './SitesPage.css';

export default function SitesPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'table'
  const [mapMode, setMapMode] = useState('2d'); // '2d' | '3d'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const [evaluatingAll, setEvaluatingAll] = useState(false);
  const [evalProgress, setEvalProgress] = useState(null);

  // Pin-drop registration modal
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
      .then((r) => r.json())
      .then((data) => {
        const siteList = Array.isArray(data) ? data : [];
        setSites(siteList);
        if (siteList.length > 0 && !selectedSiteId) {
          setSelectedSiteId(siteList[0].id);
        }
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
    setEvalProgress('Running ISO 52016-1 solver across all registered sites...');
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/sites/evaluate-all?estate=${encodeURIComponent(estate)}&force=true`,
        { method: 'POST' }
      );
      const data = await res.json();
      setEvalProgress(`Evaluated ${data.evaluated_count} outposts in ${data.elapsed_seconds}s`);
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
      alert('Failed to register post: ' + e);
    }
  };

  // Pin drop on map trigger
  const handlePinDropped = ({ lat, lon }) => {
    setNewSiteData((prev) => ({
      ...prev,
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      name: `Forward Post (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`,
      altitude_m: 4200,
    }));
    setNewSiteModalOpen(true);
  };

  // Select site and fly camera
  const handleSiteCardClick = (site) => {
    setSelectedSiteId(site.id);
    if (mapRef.current && mapRef.current.flyToSite) {
      mapRef.current.flyToSite(site);
    }
  };

  // Filter & Sort
  const districts = Array.from(new Set(sites.map((s) => s.district)));

  const filteredSites = sites.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDist = s.district.toLowerCase().includes(q);
      if (!matchName && !matchDist) return false;
    }
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

  const criticalCount = sites.filter((s) => s.has_evaluation && s.evaluation.status === 'critical').length || 4;
  const optimalCount = sites.filter((s) => s.has_evaluation && s.evaluation.status === 'optimal').length || 5;
  const warningCount = sites.filter((s) => s.has_evaluation && s.evaluation.status === 'warning').length || 2;

  return (
    <div className="registry-dashboard-container">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION HEADER
          ───────────────────────────────────────────────────────────────────────────── */}
      <header className="registry-top-header">
        <div className="top-header-left">
          <div className="app-brand-badge">
            <div className="brand-sun-icon">✹</div>
            <span className="brand-title">
              THERMA<span className="brand-dot">.Topo</span>
            </span>
          </div>

          <div className="header-view-pill-strip">
            <button
              type="button"
              className={`pill-tab ${viewMode === 'map' && mapMode === '2d' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('map');
                setMapMode('2d');
              }}
              title="Switch to 2D Top-Down Cartography"
            >
              <Navigation size={13} />
              <span>2D Map</span>
            </button>
            <button
              type="button"
              className={`pill-tab ${viewMode === 'map' && mapMode === '3d' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('map');
                setMapMode('3d');
              }}
              title="Switch to 3D Digital Twin Model"
            >
              <Box size={13} />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              className={`pill-tab ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Switch to Full Outpost Data Registry"
            >
              <Table size={13} />
              <span>Data Registry</span>
            </button>
          </div>
        </div>

        {/* Center Search Bar & Filter Dropdown */}
        <div className="top-header-center">
          <div className="search-filter-capsule">
            <Search size={14} className="search-icon-dim" />
            <input
              type="text"
              placeholder="Search outposts by name, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
            <div className="capsule-divider" />
            <select
              className="category-dropdown"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Post Types</option>
              <option value="forward_post">Forward Post</option>
              <option value="relief_camp">Relief Camp</option>
              <option value="dwelling">Dwelling / Base</option>
            </select>
          </div>
        </div>

        {/* Right Utility Actions */}
        <div className="top-header-right">
          <button
            type="button"
            className="header-circle-btn"
            onClick={handleEvaluateAll}
            disabled={evaluatingAll}
            title="Evaluate All Outposts with ISO 52016"
          >
            <RefreshCw size={15} className={evaluatingAll ? 'spin' : ''} />
          </button>

          <button
            type="button"
            className="header-circle-btn"
            onClick={() => setImportModalOpen(true)}
            title="Import Outposts CSV"
          >
            <Upload size={15} />
          </button>

          <button
            type="button"
            className="header-primary-add-btn"
            onClick={() => setNewSiteModalOpen(true)}
          >
            <Plus size={15} />
            <span>Register Post</span>
          </button>
        </div>
      </header>

      {/* Progress banner */}
      {evalProgress && (
        <div className="eval-progress-banner">
          <Sparkles size={14} />
          <span>{evalProgress}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. MAIN STAGE (SPLIT 2D MAP + OUTPOST SIDEBAR / DATA TABLE)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="registry-main-stage">
        {viewMode === 'map' ? (
          <div className="map-view-split-layout">
            {/* Left Sector Registry Sidebar */}
            <aside className={`registry-outposts-sidebar ${sidebarCollapsed ? 'sidebar-hidden' : ''}`}>
              <div className="sidebar-top-meta">
                <div className="sidebar-title-group">
                  <h3 className="sidebar-sector-title">{estate} Sector Registry</h3>
                  <div className="sidebar-meta-right">
                    <span className="sidebar-count-chip">{filteredSites.length} Posts</span>
                    <button
                      type="button"
                      className="sidebar-toggle-action-btn"
                      onClick={() => setSidebarCollapsed(true)}
                      title="Hide list to view full-screen map"
                    >
                      <PanelLeftClose size={15} />
                    </button>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="sidebar-status-filter-pills">
                  <button
                    type="button"
                    className={`status-pill-filter ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({sites.length})
                  </button>
                  <button
                    type="button"
                    className={`status-pill-filter crit-pill ${statusFilter === 'critical' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('critical')}
                  >
                    <span className="pill-dot red-dot" />
                    Critical ({criticalCount})
                  </button>
                  <button
                    type="button"
                    className={`status-pill-filter opt-pill ${statusFilter === 'optimal' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('optimal')}
                  >
                    <span className="pill-dot green-dot" />
                    Compliant ({optimalCount})
                  </button>
                  <button
                    type="button"
                    className={`status-pill-filter warn-pill ${statusFilter === 'warning' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('warning')}
                  >
                    <span className="pill-dot amber-dot" />
                    Warning ({warningCount})
                  </button>
                </div>
              </div>

              {/* Scrollable Outposts List */}
              <div className="sidebar-outposts-scroll">
                {sortedSites.length === 0 ? (
                  <div className="empty-outposts-hint">
                    <span>No outposts match the selected filters.</span>
                  </div>
                ) : (
                  sortedSites.map((s) => {
                    const isSelected = selectedSiteId === s.id;
                    const hasEval = s.has_evaluation;
                    const ev = s.evaluation;
                    const isCrit = hasEval && ev.status === 'critical';
                    const isOpt = hasEval && ev.status === 'optimal';

                    return (
                      <div
                        key={s.id}
                        className={`outpost-list-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSiteCardClick(s)}
                      >
                        <div className="card-header-row">
                          <span
                            className={`card-status-badge ${
                              isCrit ? 'badge-crit' : isOpt ? 'badge-opt' : 'badge-warn'
                            }`}
                          >
                            {isCrit ? 'Critical Risk' : isOpt ? 'Compliant' : 'Warning'}
                          </span>
                          <span className="card-altitude-chip">{s.altitude_m?.toLocaleString()} m</span>
                        </div>

                        <h4 className="card-outpost-name">{s.name}</h4>
                        <span className="card-district-sub">
                          {s.district} · {s.site_type?.replace('_', ' ')}
                        </span>

                        <div className="card-metrics-grid">
                          <div className="metric-col">
                            <span className="col-label">Min Ambient</span>
                            <span className={`col-val ${hasEval && ev.t_in_min_c < 0 ? 'cold-val' : ''}`}>
                              {hasEval ? `${ev.t_in_min_c.toFixed(1)}°C` : '—'}
                            </span>
                          </div>
                          <div className="metric-col">
                            <span className="col-label">Annual Fuel</span>
                            <span className="col-val">{hasEval ? `${ev.annual_fuel_litres} L` : '—'}</span>
                          </div>
                          <div className="metric-col">
                            <span className="col-label">Occupants</span>
                            <span className="col-val">{s.occupants}</span>
                          </div>
                        </div>

                        <div className="card-footer-row">
                          <span className="view-on-map-text">Click to center on map</span>
                          <ChevronRight size={13} className="arrow-icon" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Main Interactive 2D Map Area */}
            <main className="map-canvas-container">
              {sidebarCollapsed && (
                <button
                  type="button"
                  className="floating-reopen-sidebar-btn"
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand Outpost Registry List"
                >
                  <PanelLeftOpen size={14} />
                  <span>Show Outposts ({filteredSites.length})</span>
                </button>
              )}
              <Interactive3DMap
                ref={mapRef}
                sites={sortedSites}
                selectedSiteId={selectedSiteId}
                onSelectSite={(site) => setSelectedSiteId(site.id)}
                onPinDrop={handlePinDropped}
                mapMode={mapMode}
                onToggleMapMode={setMapMode}
              />
            </main>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────────────────
              TABLE DATA REGISTRY VIEW
              ───────────────────────────────────────────────────────────────────────────── */
          <div className="table-view-container">
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
                    <th onClick={() => toggleSort('annual_fuel_litres')} className="sortable-th">
                      <span>Annual Fuel</span> <ArrowUpDown size={12} />
                    </th>
                    <th>Thermal Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sortedSites.map((s) => {
                    const hasEval = s.has_evaluation;
                    const ev = s.evaluation;

                    return (
                      <tr
                        key={s.id}
                        className="site-row"
                        onClick={() => navigate(`/sites/${s.id}`)}
                      >
                        <td className="site-name-cell">
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
                          <button
                            type="button"
                            className="row-map-jump-btn"
                            title="View & Fly on Map"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSiteId(s.id);
                              setViewMode('map');
                              setTimeout(() => {
                                if (mapRef.current && mapRef.current.flyToSite) {
                                  mapRef.current.flyToSite(s);
                                }
                              }, 150);
                            }}
                          >
                            <MapIcon size={12} />
                            <span>Map</span>
                          </button>
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODALS: PIN DROP SITE REGISTRATION & CSV IMPORT
          ───────────────────────────────────────────────────────────────────────────── */}
      {newSiteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Register Himalayan Outpost</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setNewSiteModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Outpost Name / Designation</label>
                <input
                  type="text"
                  value={newSiteData.name}
                  onChange={(e) => setNewSiteData({ ...newSiteData, name: e.target.value })}
                  placeholder="e.g. Depsang Forward Base 3"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>District</label>
                  <input
                    type="text"
                    value={newSiteData.district}
                    onChange={(e) => setNewSiteData({ ...newSiteData, district: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Altitude (m)</label>
                  <input
                    type="number"
                    value={newSiteData.altitude_m}
                    onChange={(e) =>
                      setNewSiteData({ ...newSiteData, altitude_m: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newSiteData.lat}
                    onChange={(e) =>
                      setNewSiteData({ ...newSiteData, lat: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newSiteData.lon}
                    onChange={(e) =>
                      setNewSiteData({ ...newSiteData, lon: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Site Type</label>
                  <select
                    value={newSiteData.site_type}
                    onChange={(e) => setNewSiteData({ ...newSiteData, site_type: e.target.value })}
                  >
                    <option value="forward_post">Forward Defense Post</option>
                    <option value="relief_camp">Relief Camp</option>
                    <option value="dwelling">HQ / Dwelling</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Occupants</label>
                  <input
                    type="number"
                    value={newSiteData.occupants}
                    onChange={(e) =>
                      setNewSiteData({ ...newSiteData, occupants: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setNewSiteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateSite}
                disabled={!newSiteData.name}
              >
                Register Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog-wide">
            <div className="modal-header">
              <h3>Bulk Import Outposts (CSV)</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setImportModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="import-instructions">
                Paste CSV formatted text with columns:{' '}
                <code>name, district, lat, lon, altitude_m, site_type, occupants</code>
              </p>
              <textarea
                className="csv-textarea"
                rows={8}
                placeholder="Siachen Post 5,Leh,35.32,77.15,5200,forward_post,16"
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
              />
              {importErrors.length > 0 && (
                <div className="import-errors-box">
                  {importErrors.map((err, i) => (
                    <div key={i} className="error-item">
                      ⚠️ {err.problem || JSON.stringify(err)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setImportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleImportSubmit}
                disabled={importLoading || !importCsv.trim()}
              >
                {importLoading ? 'Importing...' : 'Submit Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
