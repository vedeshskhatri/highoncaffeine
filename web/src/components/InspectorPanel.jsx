/*
 * InspectorPanel.jsx — Tabbed Architectural Inspector (Right Drawer)
 * Replaces the congested vertical rail with a spacious, structured layout.
 *
 * Preserves 100% of field IDs, data contracts, and validations.
 */
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Layers,
  Sun,
  Wind,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';
import CompassControl from './CompassControl';
import EnvelopeBuilder from './EnvelopeBuilder';
import LocationPicker from './LocationPicker';
import { validateRequest, fieldError } from './validation';
import { computeTotalU } from './materialsData';
import './InspectorPanel.css';

const FALLBACK_MATERIALS = [
  { id: 'mud_brick',    name: 'Mud brick (adobe)' },
  { id: 'rammed_earth', name: 'Rammed earth' },
  { id: 'stone',        name: 'Stone (local)' },
  { id: 'concrete',     name: 'Concrete' },
  { id: 'eps',          name: 'EPS insulation' },
  { id: 'xps',          name: 'XPS insulation' },
  { id: 'timber',       name: 'Timber (softwood)' },
  { id: 'plywood',      name: 'Plywood' },
  { id: 'polythene',    name: 'Polythene sheet' },
];

const GLAZING_OPTIONS = [
  { value: 'single_pane', label: 'Single pane (U=5.7)' },
  { value: 'double_pane', label: 'Double pane (U=2.8)' },
  { value: 'triple_pane', label: 'Triple pane (U=1.4)' },
];

const HEATER_OPTIONS = [
  { value: 'none',               label: 'None (Passive only)' },
  { value: 'unflued_combustion', label: 'Bukhari / Unflued' },
  { value: 'flued_stove',        label: 'Flued wood stove' },
  { value: 'electric',           label: 'Electric resistance' },
];

export default function InspectorPanel({
  request,
  onUpdate,
  onSimulate,
  gridNote,
  collapsed = false,
  onToggleCollapse,
}) {
  const [activeTab, setActiveTab] = useState('properties');
  const [materials, setMaterials] = useState(FALLBACK_MATERIALS);

  // Fetch materials once from API or keep fallback
  useEffect(() => {
    fetch('http://localhost:8000/materials')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (Array.isArray(data?.materials) && data.materials.length > 0) {
          setMaterials(data.materials.map(m => ({ id: m.id, name: m.name })));
        }
      })
      .catch(() => {});
  }, []);

  const materialIds = useMemo(() => materials.map(m => m.id), [materials]);
  const errors = useMemo(() => validateRequest(request, materialIds), [request, materialIds]);
  const hasErrors = Object.keys(errors).length > 0;

  const setLoc  = (patch) => onUpdate(p => ({ ...p, location:  { ...p.location,  ...patch } }));
  const setGeo  = (patch) => onUpdate(p => ({ ...p, geometry:  { ...p.geometry,  ...patch } }));
  const setEnv  = (patch) => onUpdate(p => ({ ...p, envelope:  { ...p.envelope,  ...patch } }));
  const setVent = (patch) => onUpdate(p => ({ ...p, ventilation: { ...p.ventilation, ...patch } }));
  const setOcc  = (patch) => onUpdate(p => ({ ...p, occupancy:  { ...p.occupancy,  ...patch } }));
  const setGnd  = (patch) => onUpdate(p => ({ ...p, ground:  { ...p.ground,  ...patch } }));

  const setWeatherMode = (mode) => {
    onUpdate(p => ({ ...p, weather: { ...p.weather, mode } }));
  };

  const setOpening = (i, patch) => onUpdate(p => {
    const ops = [...(p.openings || [])];
    ops[i] = { ...ops[i], ...patch };
    return { ...p, openings: ops };
  });

  const isP1 = request.weather.mode === 'design_winter_night';
  const wallU = computeTotalU(request?.envelope?.walls || []);
  const floorArea = ((request?.geometry?.length_m || 6) * (request?.geometry?.width_m || 4)).toFixed(1);

  return (
    <>
      {/* ── Togglable Arrow Tab when Inspector is Collapsed ──────────── */}
      <AnimatePresence>
        {collapsed && (
          <motion.button
            key="inspector-expand-tab"
            className="inspector-expand-tab"
            onClick={onToggleCollapse}
            title="Expand Shelter Inspector"
            aria-label="Expand Shelter Inspector"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <ChevronLeft size={16} className="inspector-expand-chevron" />
            <span className="inspector-expand-label">Inspector</span>
          </motion.button>
        )}
      </AnimatePresence>

      <aside
        className={`inspector-panel ${collapsed ? 'collapsed' : ''}`}
        aria-label="Shelter Design Inspector"
      >
        {/* ── 1. Inspector Header & Tab Bar ──────────────────────────────── */}
        <div className="inspector-header">
          <div className="inspector-title-row">
            <h3 className="inspector-heading">Shelter Inspector</h3>
            <button
              className="inspector-collapse-btn"
              onClick={onToggleCollapse}
              title="Collapse inspector"
              aria-label="Collapse inspector panel"
            >
              <ChevronRight size={16} />
            </button>
          </div>

        {/* Tab Pills */}
        <div className="inspector-tabs" role="tablist">
          {[
            { id: 'properties', label: 'Properties', icon: Sliders },
            { id: 'envelope',   label: 'Envelope',   icon: Layers },
            { id: 'openings',   label: 'Glazing',    icon: Sun },
            { id: 'climate',    label: 'Climate',    icon: Wind },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`inspector-tab-btn ${isActive ? 'active' : ''}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
              >
                {isActive && (
                  <motion.div
                    layoutId="inspector-tab-slider"
                    className="tab-indicator-slider"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 2 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Scrollable Body ─────────────────────────────────────────── */}
      <div className="inspector-body">
        <AnimatePresence mode="wait">
          {/* ═══ TAB 1: PROPERTIES ════════════════════════════════════════ */}
          {activeTab === 'properties' && (
            <motion.div
              key="properties"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              {/* Universal Site & Location Card */}
              <div className="inspector-card">
                <div className="card-title">
                  <span>Site &amp; Location</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    Global · DEM Altitude
                  </span>
                </div>
                <LocationPicker
                  location={request.location}
                  onChange={(locUpdates) => setLoc(locUpdates)}
                  errors={errors}
                />
              </div>

              {/* Shelter Geometry Card */}
              <div className="inspector-card">
                <div className="card-title">
                  <span>Geometry &amp; Dimensions</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                    {floorArea} m² Floor Area
                  </span>
                </div>

                <div className="dimension-grid">
                  <div className="dim-field">
                    <label className="dim-label" htmlFor="field-length">Length (m)</label>
                    <input
                      id="field-length"
                      className={`dim-input ${errors['geometry.length_m'] ? 'invalid' : ''}`}
                      type="number"
                      value={request.geometry.length_m}
                      min={0.1} step={0.1}
                      onChange={e => setGeo({ length_m: parseFloat(e.target.value) })}
                    />
                    {fieldError(errors, 'geometry.length_m') && (
                      <span className="inspector-error">{fieldError(errors, 'geometry.length_m')}</span>
                    )}
                  </div>

                  <div className="dim-field">
                    <label className="dim-label" htmlFor="field-width">Width (m)</label>
                    <input
                      id="field-width"
                      className={`dim-input ${errors['geometry.width_m'] ? 'invalid' : ''}`}
                      type="number"
                      value={request.geometry.width_m}
                      min={0.1} step={0.1}
                      onChange={e => setGeo({ width_m: parseFloat(e.target.value) })}
                    />
                    {fieldError(errors, 'geometry.width_m') && (
                      <span className="inspector-error">{fieldError(errors, 'geometry.width_m')}</span>
                    )}
                  </div>

                  <div className="dim-field">
                    <label className="dim-label" htmlFor="field-height">Height (m)</label>
                    <input
                      id="field-height"
                      className={`dim-input ${errors['geometry.height_m'] ? 'invalid' : ''}`}
                      type="number"
                      value={request.geometry.height_m}
                      min={0.1} step={0.1}
                      onChange={e => setGeo({ height_m: parseFloat(e.target.value) })}
                    />
                    {fieldError(errors, 'geometry.height_m') && (
                      <span className="inspector-error">{fieldError(errors, 'geometry.height_m')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Compass & Orientation Card */}
              <div className="inspector-card">
                <div className="card-title">Solar Orientation (°Azimuth)</div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                  <CompassControl
                    value={request.geometry.orientation_deg}
                    onChange={deg => setGeo({ orientation_deg: deg })}
                  />
                </div>
                {fieldError(errors, 'geometry.orientation_deg') && (
                  <span className="inspector-error">{fieldError(errors, 'geometry.orientation_deg')}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ TAB 2: ENVELOPE & MATERIALS ══════════════════════════════ */}
          {activeTab === 'envelope' && (
            <motion.div
              key="envelope"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              {/* Thermal Summary Card */}
              <div className="inspector-card" style={{ background: 'var(--surface-2)' }}>
                <div className="card-title" style={{ margin: 0 }}>
                  <span>Wall Thermal Transmittance</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                    U = {wallU.toFixed(2)} W/m²K
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  Overall wall R-value: {(1 / (wallU || 1)).toFixed(2)} m²·K/W. Multi-layer resistance against extreme night temperatures.
                </p>
              </div>

              {/* Envelope Builders (Walls, Roof, Floor) */}
              <div className="inspector-card">
                <EnvelopeBuilder
                  id="walls"
                  label="Walls"
                  layers={request.envelope.walls || []}
                  materials={materials}
                  errors={errors}
                  errPrefix="envelope.walls"
                  onChange={walls => setEnv({ walls })}
                />
              </div>

              <div className="inspector-card">
                <EnvelopeBuilder
                  id="roof"
                  label="Roof"
                  layers={request.envelope.roof || []}
                  materials={materials}
                  errors={errors}
                  errPrefix="envelope.roof"
                  onChange={roof => setEnv({ roof })}
                />
                <div className="dim-field" style={{ marginTop: 8 }}>
                  <label className="dim-label" htmlFor="field-emissivity">Roof Emissivity (0–1)</label>
                  <input
                    id="field-emissivity"
                    className={`dim-input ${errors['envelope.roof_emissivity'] ? 'invalid' : ''}`}
                    type="number"
                    value={request.envelope.roof_emissivity}
                    min={0} max={1} step={0.01}
                    onChange={e => setEnv({ roof_emissivity: parseFloat(e.target.value) })}
                  />
                  {fieldError(errors, 'envelope.roof_emissivity') && (
                    <span className="inspector-error">{fieldError(errors, 'envelope.roof_emissivity')}</span>
                  )}
                </div>
              </div>

              <div className="inspector-card">
                <EnvelopeBuilder
                  id="floor"
                  label="Floor"
                  layers={request.envelope.floor || []}
                  materials={materials}
                  errors={errors}
                  errPrefix="envelope.floor"
                  onChange={floor => setEnv({ floor })}
                />
              </div>
            </motion.div>
          )}

          {/* ═══ TAB 3: OPENINGS & GLAZING ═══════════════════════════════ */}
          {activeTab === 'openings' && (
            <motion.div
              key="openings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              {(request.openings || []).map((op, i) => (
                <div key={i} className="inspector-card">
                  <div className="card-title">
                    <span>Aperture {i + 1} ({op.facing.toUpperCase()})</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                      {op.area_m2} m²
                    </span>
                  </div>

                  <div className="dim-field">
                    <label className="dim-label" htmlFor={`opening-${i}-area`}>Glazed Area (m²)</label>
                    <input
                      id={`opening-${i}-area`}
                      className={`dim-input ${errors[`openings[${i}].area_m2`] ? 'invalid' : ''}`}
                      type="number"
                      value={op.area_m2}
                      min={0.1} step={0.1}
                      onChange={e => setOpening(i, { area_m2: parseFloat(e.target.value) || 0.1 })}
                    />
                    {fieldError(errors, `openings[${i}].area_m2`) && (
                      <span className="inspector-error">{fieldError(errors, `openings[${i}].area_m2`)}</span>
                    )}
                  </div>

                  <div className="dim-field">
                    <label className="dim-label" htmlFor={`opening-${i}-glazing`}>Glazing Unit</label>
                    <select
                      id={`opening-${i}-glazing`}
                      className="dim-input"
                      value={op.glazing}
                      onChange={e => setOpening(i, { glazing: e.target.value })}
                    >
                      {GLAZING_OPTIONS.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Night Shutter Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 8,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600 }}>
                        Insulated Night Shutter
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>
                        Reduces heat loss during sub-zero night hours
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id={`opening-${i}-shutter`}
                      checked={!!op.night_shutter}
                      onChange={e => setOpening(i, { night_shutter: e.target.checked })}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ═══ TAB 4: CLIMATE & VENTILATION ════════════════════════════ */}
          {activeTab === 'climate' && (
            <motion.div
              key="climate"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              {/* Weather Mode Card */}
              <div className="inspector-card">
                <div className="card-title">Weather Scenario</div>
                <div className="weather-toggle" role="group" aria-label="Weather Scenario Mode">
                  <button
                    id="weather-toggle-typical"
                    className={`weather-toggle-btn ${!isP1 ? 'active' : ''}`}
                    onClick={() => setWeatherMode('typical_day')}
                    aria-pressed={!isP1}
                  >
                    Typical day
                  </button>
                  <button
                    id="weather-toggle-p1"
                    className={`weather-toggle-btn ${isP1 ? 'active' : ''}`}
                    onClick={() => setWeatherMode('design_winter_night')}
                    aria-pressed={isP1}
                  >
                    Design winter night
                  </button>
                </div>
                {isP1 && (
                  <p className="grid-note" role="note" style={{ margin: '6px 0 0 0' }}>
                    {gridNote
                      ? gridNote
                      : 'Weather from regional grid estimate (NASA POWER archive). Not a local measurement.'}
                  </p>
                )}
              </div>

              {/* Ventilation & Heating Card */}
              <div className="inspector-card">
                <div className="card-title">Air Exchange &amp; Heating</div>
                <div className="dimension-grid">
                  <div className="dim-field" style={{ gridColumn: 'span 2' }}>
                    <label className="dim-label" htmlFor="field-heater">Auxiliary Heater</label>
                    <select
                      id="field-heater"
                      className="dim-input"
                      value={request.ventilation.heater_type}
                      onChange={e => setVent({ heater_type: e.target.value })}
                    >
                      {HEATER_OPTIONS.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="dim-field">
                    <label className="dim-label" htmlFor="field-ach">Air ACH</label>
                    <input
                      id="field-ach"
                      className="dim-input"
                      type="number"
                      value={request.ventilation.ach}
                      min={0.1} max={5.0} step={0.1}
                      onChange={e => setVent({ ach: parseFloat(e.target.value) || 0.5 })}
                    />
                  </div>
                </div>
              </div>

              {/* Occupancy & Snow Card */}
              <div className="inspector-card">
                <div className="card-title">Occupancy &amp; Ground</div>
                <div className="dimension-grid">
                  <div className="dim-field">
                    <label className="dim-label" htmlFor="field-people">People</label>
                    <input
                      id="field-people"
                      className={`dim-input ${errors['occupancy.people'] ? 'invalid' : ''}`}
                      type="number"
                      value={request.occupancy.people}
                      min={1} max={50} step={1}
                      onChange={e => setOcc({ people: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div className="dim-field" style={{ gridColumn: 'span 2' }}>
                    <label className="dim-label" htmlFor="field-watts">Heat (W/person)</label>
                    <input
                      id="field-watts"
                      className={`dim-input ${errors['occupancy.watts_per_person'] ? 'invalid' : ''}`}
                      type="number"
                      value={request.occupancy.watts_per_person}
                      min={40} max={250} step={5}
                      onChange={e => setOcc({ watts_per_person: parseFloat(e.target.value) || 100 })}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    marginTop: 6,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600 }}>
                      Ground Snow Cover
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>
                      High-albedo solar ground reflection
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="field-snow"
                    checked={!!request.ground.snow_cover}
                    onChange={e => setGnd({ snow_cover: e.target.checked })}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. Footer Simulation Action ────────────────────────────────── */}
      <div className="inspector-footer">
        <button
          className="inspector-sim-btn"
          id="btn-run-simulation"
          onClick={onSimulate}
          disabled={hasErrors}
          title={hasErrors ? 'Resolve validation errors to run simulation' : 'Run 24-Hour Diurnal Simulation'}
        >
          <Play size={14} fill="currentColor" />
          <span>Run Thermal Simulation</span>
        </button>
      </div>
    </aside>
  </>
  );
}
