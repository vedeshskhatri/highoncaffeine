import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Boxes,
  MapPin,
  Clock,
  Truck,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Flame,
  Snowflake,
  Sun,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import './MaterialsPage.css';

const PRESETS = [
  {
    id: 'leh',
    name: 'Leh Military Outpost',
    lat: 34.1526,
    lon: 77.5771,
    altitude_m: 3500.0,
    target_in: 20.0,
    outdoor: -20.0,
    tag: 'Extreme Winter High Altitude',
  },
  {
    id: 'siachen',
    name: 'Siachen Glacier Forward Post',
    lat: 35.4212,
    lon: 77.1095,
    altitude_m: 5400.0,
    target_in: 18.0,
    outdoor: -25.0,
    tag: 'Ultra-High Altitude Severe Cold',
  },
  {
    id: 'rasuwa',
    name: 'Rasuwa Relief Shelter (Nepal)',
    lat: 28.1200,
    lon: 85.2800,
    altitude_m: 2400.0,
    target_in: 20.0,
    outdoor: -0.6,
    tag: 'Himalayan Winter Humanitarian',
  },
  {
    id: 'chennai',
    name: 'Chennai Coastal Sector',
    lat: 13.0827,
    lon: 80.2707,
    altitude_m: 6.0,
    target_in: 24.0,
    outdoor: 34.0,
    tag: 'Hot & Humid Cooling Regime',
  },
  {
    id: 'jaisalmer',
    name: 'Jaisalmer Border Post',
    lat: 26.9157,
    lon: 70.9083,
    altitude_m: 225.0,
    target_in: 25.0,
    outdoor: 42.0,
    tag: 'Hot Desert Arid Cooling',
  },
];

const DISTRICT_OPTIONS = ['Leh', 'Chushul', 'DBO', 'Kargil', 'Rasuwa'];

export default function MaterialsPage() {
  const { estate } = useOutletContext();
  const [activeTab, setActiveTab] = useState('suggest'); // 'suggest' | 'catalog'

  // --- TAB 1: Material Suggestion State ---
  const [selectedPreset, setSelectedPreset] = useState('leh');
  const [targetIndoorC, setTargetIndoorC] = useState(20.0);
  const [designOutdoorC, setDesignOutdoorC] = useState(-20.0);
  const [useSiteP1, setUseSiteP1] = useState(false);
  const [locallyOnly, setLocallyOnly] = useState(false);
  const [maxBudgetInr, setMaxBudgetInr] = useState('');
  const [activeLocation, setActiveLocation] = useState({
    lat: 34.1526,
    lon: 77.5771,
    altitude_m: 3500.0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedRank, setSelectedRank] = useState(1);

  // --- TAB 2: Regional Catalog State ---
  const [district, setDistrict] = useState('Leh');
  const [materials, setMaterials] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Apply preset
  const handleSelectPreset = (p) => {
    setSelectedPreset(p.id);
    setTargetIndoorC(p.target_in);
    setDesignOutdoorC(p.outdoor);
    setUseSiteP1(false);
    setActiveLocation({
      lat: p.lat,
      lon: p.lon,
      altitude_m: p.altitude_m,
    });
  };

  // Run Material Suggestion computation
  const handleCompute = useCallback(async () => {
    setLoading(true);
    setError(null);

    const payload = {
      target_indoor_c: Number(targetIndoorC),
      design_outdoor_c: useSiteP1 ? null : Number(designOutdoorC),
      location: activeLocation,
      geometry: { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180 },
      occupancy: { people: 8, watts_per_person: 100 },
      max_cost_inr: maxBudgetInr ? Number(maxBudgetInr) : null,
      locally_available_only: Boolean(locallyOnly),
    };

    try {
      // Support both relative /api/suggest-materials and localhost:8000
      let resp;
      try {
        resp = await fetch('http://localhost:8000/api/suggest-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        resp = await fetch('http://127.0.0.1:8000/suggest-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Engine returned ${resp.status}: ${text}`);
      }

      const json = await resp.json();
      setResults(json);
      setSelectedRank(1);
    } catch (err) {
      console.error('Material suggestion computation error:', err);
      setError(err.message || 'Simulation failed to evaluate envelopes.');
    } finally {
      setLoading(false);
    }
  }, [targetIndoorC, designOutdoorC, useSiteP1, activeLocation, maxBudgetInr, locallyOnly]);

  // Initial computation on mount
  useEffect(() => {
    handleCompute();
  }, []);

  // Fetch catalog on district change
  useEffect(() => {
    setCatalogLoading(true);
    fetch(`http://127.0.0.1:8000/materials/availability?district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(data => {
        setMaterials(Array.isArray(data) ? data : []);
        setCatalogLoading(false);
      })
      .catch(() => setCatalogLoading(false));
  }, [district]);

  return (
    <div className="materials-page">
      {/* 1. Header & High-Level Tab Bar */}
      <div className="materials-header">
        <div>
          <h2 className="materials-title">Materials & Requirement-Driven Envelope Design</h2>
          <p className="materials-subtitle">
            Inverse physics solver computing optimal wall, roof, and floor layer build-ups directly from thermal criteria and microclimate.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="materials-mode-tabs" role="tablist">
          <button
            type="button"
            className={`mode-tab-btn ${activeTab === 'suggest' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggest')}
            role="tab"
            aria-selected={activeTab === 'suggest'}
          >
            <Sparkles size={14} />
            <span>Inverse Material Suggestion</span>
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
            role="tab"
            aria-selected={activeTab === 'catalog'}
          >
            <Boxes size={14} />
            <span>Regional Supply Catalog</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT */}
      {activeTab === 'suggest' ? (
        <div className="suggestion-view-layout">
          {/* Preset Chips Bar */}
          <div className="presets-chip-strip">
            <span className="presets-label">Operational Presets:</span>
            <div className="presets-group">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-chip-btn ${selectedPreset === p.id ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(p)}
                >
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-tag">{p.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Controls Card */}
          <div className="suggestion-inputs-card">
            <div className="inputs-grid">
              {/* Target Indoor */}
              <div className="input-group">
                <div className="input-header-row">
                  <label htmlFor="target-in-range">Target Indoor Temperature</label>
                  <span className="input-value mono">{Number(targetIndoorC).toFixed(1)} °C</span>
                </div>
                <input
                  id="target-in-range"
                  type="range"
                  min="10"
                  max="28"
                  step="0.5"
                  value={targetIndoorC}
                  onChange={e => setTargetIndoorC(parseFloat(e.target.value))}
                  className="range-slider"
                />
                <span className="input-hint">Minimum required nocturnal baseline (WHO comfort: 18–21 °C)</span>
              </div>

              {/* Design Outdoor */}
              <div className="input-group">
                <div className="input-header-row">
                  <label htmlFor="design-out-range">Design Outdoor Condition</label>
                  <span className="input-value mono">
                    {useSiteP1 ? 'P1 Night (Auto)' : `${Number(designOutdoorC).toFixed(1)} °C`}
                  </span>
                </div>
                <input
                  id="design-out-range"
                  type="range"
                  min="-35"
                  max="45"
                  step="1"
                  disabled={useSiteP1}
                  value={designOutdoorC}
                  onChange={e => setDesignOutdoorC(parseFloat(e.target.value))}
                  className="range-slider"
                />
                <div className="checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useSiteP1}
                      onChange={e => setUseSiteP1(e.target.checked)}
                    />
                    <span>Use site worst-night P1 extreme climatology</span>
                  </label>
                </div>
              </div>

              {/* Budget & Constraints */}
              <div className="input-group">
                <div className="input-header-row">
                  <label htmlFor="max-budget">Capital Budget Cap (₹, optional)</label>
                </div>
                <input
                  id="max-budget"
                  type="number"
                  placeholder="e.g. 150000 (unconstrained)"
                  value={maxBudgetInr}
                  onChange={e => setMaxBudgetInr(e.target.value)}
                  className="text-input"
                />
                <div className="checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={locallyOnly}
                      onChange={e => setLocallyOnly(e.target.checked)}
                    />
                    <span>Locally available materials only (zero airlift)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="inputs-action-row">
              <div className="location-summary-pill">
                <MapPin size={13} />
                <span>
                  {activeLocation.lat.toFixed(4)}° N, {activeLocation.lon.toFixed(4)}° E • {activeLocation.altitude_m}m ASL
                </span>
              </div>

              <button
                type="button"
                className="calculate-btn"
                onClick={handleCompute}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Evaluating Envelopes (ISO 52016-1)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Calculate Optimal Envelopes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Results Area */}
          {results && (
            <div className="results-container">
              {/* Honest-Negative / Physics Boundary Banner */}
              {!results.passive_only_sufficient ? (
                <div className="honest-negative-banner">
                  <div className="banner-icon-box warn">
                    <ShieldAlert size={22} />
                  </div>
                  <div className="banner-content">
                    <div className="banner-badge-row">
                      <span className="banner-badge warn">Physics Reality Interlock</span>
                      <span className="banner-sub">
                        Target {Number(targetIndoorC).toFixed(1)} °C requires auxiliary energy
                      </span>
                    </div>
                    <p className="banner-message">
                      {results.passive_ceiling_warning ||
                        `Passive design alone reaches a maximum baseline of ${results.achieved_passive_min_c?.toFixed(1)} °C during this condition. To bridge the remaining ${results.gap_to_target_c?.toFixed(1)} °C deficit, auxiliary heating of ${results.auxiliary_heating_kw?.toFixed(2)} kW is physically required.`}
                    </p>
                    <div className="banner-metrics-strip">
                      <div className="b-metric">
                        <span className="b-label">Passive Minimum</span>
                        <span className="b-val mono">{results.achieved_passive_min_c?.toFixed(1)} °C</span>
                      </div>
                      <div className="b-metric">
                        <span className="b-label">Thermal Lift</span>
                        <span className="b-val mono text-orange">+{results.temperature_lift_c?.toFixed(1)} °C</span>
                      </div>
                      <div className="b-metric">
                        <span className="b-label">Comfort Deficit</span>
                        <span className="b-val mono text-red">{results.gap_to_target_c?.toFixed(1)} °C</span>
                      </div>
                      {results.regime === 'cooling' ? (
                        <div className="b-metric">
                          <span className="b-label">Active AC Load</span>
                          <span className="b-val mono">{results.active_cooling_kwh_day?.toFixed(1)} kWh/day</span>
                        </div>
                      ) : (
                        <div className="b-metric">
                          <span className="b-label">Night Fuel Demand</span>
                          <span className="b-val mono">{results.auxiliary_kerosene_l_night?.toFixed(2)} L/night</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="honest-negative-banner success">
                  <div className="banner-icon-box success">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="banner-content">
                    <span className="banner-badge success">100% Passive Comfort Attained</span>
                    <p className="banner-message">
                      The recommended envelope maintains interior temperatures at or above {Number(targetIndoorC).toFixed(1)} °C purely through high-performance insulation, thermal mass storage, and solar capture with zero heating fuel consumption.
                    </p>
                  </div>
                </div>
              )}

              {/* 3 Candidate Build-up Cards */}
              <div className="candidate-cards-grid">
                {(results.recommendations || []).map((cand) => {
                  const isSelected = cand.rank === selectedRank;
                  const isCooling = results.regime === 'cooling';
                  const b = cand.buildup || {};

                  return (
                    <div
                      key={cand.rank}
                      className={`candidate-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRank(cand.rank)}
                    >
                      {/* Card Header */}
                      <div className="candidate-header">
                        <div className="rank-indicator">
                          <span className="rank-badge">RANK #{cand.rank}</span>
                          <span className="cand-tagline">
                            {cand.rank === 1
                              ? 'Top Recommended'
                              : cand.rank === 2
                              ? 'Low Capital Cost'
                              : 'High Thermal Mass'}
                          </span>
                        </div>
                        <span className="cand-cost mono">₹{cand.estimated_cost_inr?.toLocaleString()}</span>
                      </div>

                      {/* Performance Metrics Strip */}
                      <div className="cand-metrics-row">
                        <div className="c-box">
                          <span className="c-k">Indoor Min</span>
                          <span className="c-v mono font-bold">
                            {cand.achieved_t_in_min_c?.toFixed(1)} °C
                          </span>
                        </div>
                        <div className="c-box">
                          <span className="c-k">Peak Diurnal</span>
                          <span className="c-v mono">
                            {cand.achieved_t_in_max_c?.toFixed(1)} °C
                          </span>
                        </div>
                        <div className="c-box">
                          <span className="c-k">{isCooling ? 'AC Capacity' : 'Backup Heat'}</span>
                          <span className="c-v mono">
                            {isCooling
                              ? `${cand.active_cooling_kw?.toFixed(1)} kW`
                              : `${cand.auxiliary_heating_kw?.toFixed(2)} kW`}
                          </span>
                        </div>
                      </div>

                      {/* Build-Up Layers Stack */}
                      <div className="cand-buildup-stack">
                        <span className="buildup-title">Envelope Build-Up:</span>

                        {/* Wall */}
                        <div className="layer-row">
                          <span className="layer-type">Wall:</span>
                          <span className="layer-desc font-bold">
                            {(b.walls || [])
                              .map(w => `${w.material_id.replace(/_/g, ' ')} (${Math.round(w.thickness_m * 1000)}mm)`)
                              .join(' + ')}
                          </span>
                        </div>

                        {/* Roof */}
                        <div className="layer-row">
                          <span className="layer-type">Roof:</span>
                          <span className="layer-desc">
                            {(b.roof || [])
                              .map(r => `${r.material_id.replace(/_/g, ' ')} (${Math.round(r.thickness_m * 1000)}mm)`)
                              .join(' + ')}
                          </span>
                        </div>

                        {/* Floor */}
                        <div className="layer-row">
                          <span className="layer-type">Floor:</span>
                          <span className="layer-desc">
                            {(b.floor || [])
                              .map(f => `${f.material_id.replace(/_/g, ' ')} (${Math.round(f.thickness_m * 1000)}mm)`)
                              .join(' + ')}
                          </span>
                        </div>

                        {/* Glazing */}
                        <div className="layer-row">
                          <span className="layer-type">Glazing:</span>
                          <span className="layer-desc">
                            {(b.openings || []).map(o => `${o.glazing.replace(/_/g, ' ')} (${o.facing})`).join(', ') || 'Double Pane Low-E'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="cand-footer">
                        <span className="cand-candidates-note">
                          Evaluated against {results.total_candidates_evaluated || 120} candidates
                        </span>
                        <Link
                          to="/design"
                          className="studio-cta-btn"
                          title="Open in 3D Shelter Studio"
                        >
                          <span>Open in Studio</span>
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: Regional Supply Catalog */
        <div className="catalog-view-layout">
          {/* District Switcher */}
          <div className="district-filter-strip">
            <span className="filter-lead">Active Supply Sector:</span>
            <div className="district-pill-group">
              {DISTRICT_OPTIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`district-pill ${district === d ? 'active' : ''}`}
                  onClick={() => setDistrict(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Table Card */}
          <div className="materials-card">
            {catalogLoading ? (
              <div className="catalog-loading">
                <Loader2 size={24} className="spin-icon" />
                <span>Loading regional material logistics...</span>
              </div>
            ) : (
              <table className="materials-table">
                <thead>
                  <tr>
                    <th>Material Name</th>
                    <th>Category</th>
                    <th>Conductivity (k)</th>
                    <th>Cost / m³</th>
                    <th>Cost Basis</th>
                    <th>Local Availability</th>
                    <th>Transit Lead Time</th>
                    <th>Logistics & Transport Constraint</th>
                    <th>Sourced Cite</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(m => (
                    <tr key={m.id}>
                      <td className="font-bold">{m.name}</td>
                      <td>
                        <span className="category-chip">{m.category}</span>
                      </td>
                      <td className="mono">{m.k ? m.k.toFixed(3) : '—'} W/m·K</td>
                      <td className="mono">
                        {m.cost_per_m3 ? `₹${m.cost_per_m3.toLocaleString()}` : '—'}
                      </td>
                      <td>
                        <span className={`cost-basis-chip basis-${m.cost_basis}`}>
                          [{m.cost_basis}]
                        </span>
                      </td>
                      <td>
                        {m.locally_available ? (
                          <span className="avail-tag tag-yes">Local Stock</span>
                        ) : (
                          <span className="avail-tag tag-no">Air/Convoy Only</span>
                        )}
                      </td>
                      <td className="mono">
                        <strong>{m.lead_time_days}</strong> days
                      </td>
                      <td className="constraint-cell">{m.transport_constraint}</td>
                      <td className="cite-cell">{m.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
