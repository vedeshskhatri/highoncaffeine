/*
 * InspectorPanel.jsx — Modern Architectural Inspector (Right Drawer)
 * Tactile, sleek architectural controls with 1-click building archetypes,
 * compact location quick-selector, smooth dimension sliders, and visual layer stacks.
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
  ChevronDown,
  ChevronUp,
  MapPin,
  Mountain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  Shield,
  Home,
  Building2,
  Globe,
  Maximize2,
} from 'lucide-react';
import CompassControl from './CompassControl';
import EnvelopeBuilder from './EnvelopeBuilder';
import LocationPicker from './LocationPicker';
import { validateRequest, fieldError } from './validation';
import { computeTotalU } from './materialsData';
import { detectBiome, getBiomeMeta } from './threeUtils/himalayanEnvironment';
import './InspectorPanel.css';

const FALLBACK_MATERIALS = [
  { id: 'mud_brick',    name: 'Mud brick (adobe)' },
  { id: 'rammed_earth', name: 'Rammed earth' },
  { id: 'stone',        name: 'Local stone masonry' },
  { id: 'concrete',     name: 'Reinforced concrete' },
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

const STRATEGIC_OUTPOSTS = [
  { id: 'siachen', label: 'Siachen', region: 'Karakoram', lat: 35.2000, lon: 77.2100, altitude_m: 3600, tag: 'Glacial Zone' },
  { id: 'dras', label: 'Dras', region: 'Ladakh', lat: 34.4327, lon: 75.7547, altitude_m: 3280, tag: '-35°C Extreme' },
  { id: 'leh', label: 'Leh', region: 'Ladakh', lat: 34.1526, lon: 77.5771, altitude_m: 3500, tag: 'Cold Plateau' },
  { id: 'manali', label: 'Manali', region: 'Himachal', lat: 32.2396, lon: 77.1887, altitude_m: 2050, tag: 'Alpine Valley' },
  { id: 'jaisalmer', label: 'Jaisalmer', region: 'Rajasthan', lat: 26.9157, lon: 70.9083, altitude_m: 225, tag: 'Arid Desert' },
  { id: 'delhi', label: 'New Delhi', region: 'NCR', lat: 28.6139, lon: 77.2090, altitude_m: 216, tag: 'Lowland Plain' },
];

const ARCHETYPES = [
  {
    id: 'sentry',
    label: 'Alpine Sentry',
    dims: '6.0×4.0m',
    desc: 'Adobe thermal mass + 100mm continuous EPS, south Trombe wall absorber.',
    tags: ['Trombe Wall', '100mm EPS', 'South 180°'],
    icon: Shield,
    l: 6.0, w: 4.0, h: 2.6,
    walls: [{ material: 'mud_brick', thickness_m: 0.30 }, { material: 'eps', thickness_m: 0.10 }],
    roof: [{ material: 'concrete', thickness_m: 0.15 }, { material: 'eps', thickness_m: 0.12 }],
    floor: [{ material: 'concrete', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.08 }],
    glazingArea: 4.0,
  },
  {
    id: 'hq',
    label: 'Passive Solar HQ',
    dims: '8.0×5.0m',
    desc: 'Rammed earth + 120mm XPS, high-mass floor, Low-E double glazing aperture.',
    tags: ['Rammed Earth', '120mm XPS', 'High Mass'],
    icon: Sun,
    l: 8.0, w: 5.0, h: 2.8,
    walls: [{ material: 'rammed_earth', thickness_m: 0.35 }, { material: 'xps', thickness_m: 0.12 }],
    roof: [{ material: 'timber', thickness_m: 0.05 }, { material: 'eps', thickness_m: 0.15 }],
    floor: [{ material: 'concrete', thickness_m: 0.15 }, { material: 'xps', thickness_m: 0.10 }],
    glazingArea: 6.0,
  },
  {
    id: 'bunk',
    label: 'Arctic Bunkhouse',
    dims: '10.0×6.0m',
    desc: 'Structural insulated panels (SIPs), east arctic airlock mudroom, triple pane.',
    tags: ['Arctic Vestibule', '150mm SIPs', 'Triple Low-E'],
    icon: Home,
    l: 10.0, w: 6.0, h: 2.8,
    walls: [{ material: 'timber', thickness_m: 0.05 }, { material: 'eps', thickness_m: 0.15 }],
    roof: [{ material: 'timber', thickness_m: 0.05 }, { material: 'eps', thickness_m: 0.20 }],
    floor: [{ material: 'concrete', thickness_m: 0.12 }, { material: 'xps', thickness_m: 0.12 }],
    glazingArea: 8.0,
  },
];

export default function InspectorPanel({
  request,
  onUpdate,
  onSimulate,
  gridNote,
  collapsed = false,
  onToggleCollapse,
  activeSiteName,
  siteWeather,
  onOpenTacticalMap,
}) {
  const [activeTab, setActiveTab] = useState('properties');
  const [envelopeSurface, setEnvelopeSurface] = useState('walls');
  const [materials, setMaterials] = useState(FALLBACK_MATERIALS);
  const [customLocationOpen, setCustomLocationOpen] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState(null);

  // Fetch materials once from API or keep fallback
  useEffect(() => {
    fetch('/materials')
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

  const applyArchetype = (arch) => {
    setActiveArchetype(arch.id);
    onUpdate(prev => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        length_m: arch.l,
        width_m: arch.w,
        height_m: arch.h,
        orientation_deg: 180,
      },
      envelope: {
        ...prev.envelope,
        walls: arch.walls,
        roof: arch.roof,
        floor: arch.floor,
      },
      openings: [
        {
          facing: 'south',
          area_m2: arch.glazingArea,
          glazing: arch.id === 'bunk' ? 'triple_pane' : 'double_pane',
          night_shutter: true,
        },
      ],
    }));
  };

  const isP1 = request.weather.mode === 'design_winter_night';
  const wallU = computeTotalU(request?.envelope?.walls || []);
  const roofU = computeTotalU(request?.envelope?.roof || []);
  const floorU = computeTotalU(request?.envelope?.floor || []);

  const length_m = request?.geometry?.length_m || 6;
  const width_m = request?.geometry?.width_m || 4;
  const height_m = request?.geometry?.height_m || 2.6;
  const floorArea = (length_m * width_m).toFixed(1);
  const volume_m3 = (length_m * width_m * height_m).toFixed(1);
  const envelopeArea = (2 * (length_m + width_m) * height_m + 2 * length_m * width_m).toFixed(1);

  const biome = detectBiome(request?.location);
  const biomeMeta = getBiomeMeta(biome);

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
            initial={{ opacity: 0, x: 24, y: '-50%' }}
            animate={{ opacity: 1, x: 0, y: '-50%' }}
            exit={{ opacity: 0, x: 24, y: '-50%' }}
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
            <h3 className="inspector-heading">Shelter Studio Inspector</h3>
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
                {/* ── 1. Compact Location Hero Card with 1-Click Outposts ── */}
                <div className="inspector-card">
                  <div className="card-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} style={{ color: 'var(--solar, #C2410C)' }} />
                      <span>Site &amp; Microclimate</span>
                    </div>
                    <span className="biome-badge-pill">{biomeMeta.label}</span>
                  </div>

                  {/* Active Site Telemetry Line */}
                  <div className="location-active-strip">
                    <div className="location-active-main">
                      <span className="location-active-coords mono">
                        {request?.location?.lat?.toFixed(2)}°N, {request?.location?.lon?.toFixed(2)}°E · {request?.location?.altitude_m}m ASL
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Outpost Quick-Switch Chips */}
                  <div className="outpost-quick-grid">
                    {STRATEGIC_OUTPOSTS.map((outpost) => {
                      const isSelected =
                        Math.abs((request.location.lat || 0) - outpost.lat) < 0.05 &&
                        Math.abs((request.location.lon || 0) - outpost.lon) < 0.05;
                      return (
                        <button
                          key={outpost.id}
                          type="button"
                          className={`outpost-quick-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setLoc({
                              lat: outpost.lat,
                              lon: outpost.lon,
                              altitude_m: outpost.altitude_m,
                            });
                            if (outpost.id === 'siachen' || outpost.id === 'dras') {
                              setGnd({ snow_cover: true });
                            }
                          }}
                        >
                          <div className="outpost-chip-header">
                            <span className="outpost-chip-name">{outpost.label}</span>
                            {isSelected && <span className="outpost-active-pip" />}
                          </div>
                          <div className="outpost-chip-meta">
                            <span className="outpost-chip-alt mono">{outpost.altitude_m.toLocaleString()}m</span>
                            <span className="outpost-chip-region">{outpost.region}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Full-Screen Tactical Planetary Map Trigger */}
                  {onOpenTacticalMap && (
                    <button
                      type="button"
                      className="tactical-full-map-trigger-btn"
                      onClick={onOpenTacticalMap}
                      title="Open full-screen planetary tactical map with GPS lock and blurred backdrop"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Globe size={13} style={{ color: 'var(--solar, #C2410C)' }} />
                        <span>Open Planetary Tactical Map &amp; GPS</span>
                      </div>
                      <Maximize2 size={13} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}

                  {/* Expandable Custom Search / Map Accordion */}
                  <button
                    type="button"
                    className="custom-loc-toggle-btn"
                    onClick={() => setCustomLocationOpen(!customLocationOpen)}
                  >
                    <span>{customLocationOpen ? 'Hide Custom Map & Search' : 'Search Global Places or Coords'}</span>
                    {customLocationOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <AnimatePresence>
                    {customLocationOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden', marginTop: 8 }}
                      >
                        <LocationPicker
                          location={request.location}
                          onChange={(locUpdates) => setLoc(locUpdates)}
                          errors={errors}
                          onOpenTacticalMap={onOpenTacticalMap}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── 2. Building Typology Archetypes (1-Click Presets) ── */}
                <div className="inspector-card">
                  <div className="card-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={13} style={{ color: 'var(--solar, #C2410C)' }} />
                      <span>Architectural Typology</span>
                    </div>
                    <span className="typology-preset-tag">1-Click Presets</span>
                  </div>

                  <div className="archetypes-grid">
                    {ARCHETYPES.map((arch) => {
                      const IconComponent = arch.icon || Sparkles;
                      const isSelected = activeArchetype === arch.id;
                      return (
                        <button
                          key={arch.id}
                          type="button"
                          className={`archetype-card-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => applyArchetype(arch)}
                        >
                          <div className="archetype-card-top">
                            <div className="archetype-title-group">
                              <IconComponent size={14} className="archetype-icon" />
                              <span className="archetype-name">{arch.label}</span>
                            </div>
                            <span className="archetype-dims mono">{arch.dims}</span>
                          </div>
                          <p className="archetype-desc">{arch.desc}</p>
                          <div className="archetype-tags-row">
                            {arch.tags.map((tag) => (
                              <span key={tag} className="archetype-tag-pill">{tag}</span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── 3. Tactile Geometry Sliders & Dimensions ── */}
                <div className="inspector-card">
                  <div className="card-title">
                    <span>Geometry &amp; Dimensions</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--solar, #C2410C)' }}>
                      {floorArea} m² Floor Area
                    </span>
                  </div>

                  {/* Length Slider */}
                  <div className="tactile-dim-row">
                    <div className="tactile-dim-header">
                      <label className="dim-label" htmlFor="field-length">Length</label>
                      <span className="tactile-val-badge mono">{length_m.toFixed(1)} m</span>
                    </div>
                    <div className="tactile-slider-wrap">
                      <input
                        type="range"
                        min={3.0}
                        max={16.0}
                        step={0.5}
                        value={length_m}
                        onChange={e => setGeo({ length_m: parseFloat(e.target.value) })}
                        className="tactile-range"
                      />
                      <input
                        id="field-length"
                        className={`dim-input-mini ${errors['geometry.length_m'] ? 'invalid' : ''}`}
                        type="number"
                        value={request.geometry.length_m}
                        min={0.1}
                        step={0.1}
                        onChange={e => setGeo({ length_m: parseFloat(e.target.value) })}
                      />
                    </div>
                    {fieldError(errors, 'geometry.length_m') && (
                      <span className="inspector-error">{fieldError(errors, 'geometry.length_m')}</span>
                    )}
                  </div>

                  {/* Width Slider */}
                  <div className="tactile-dim-row">
                    <div className="tactile-dim-header">
                      <label className="dim-label" htmlFor="field-width">Width</label>
                      <span className="tactile-val-badge mono">{width_m.toFixed(1)} m</span>
                    </div>
                    <div className="tactile-slider-wrap">
                      <input
                        type="range"
                        min={2.5}
                        max={12.0}
                        step={0.5}
                        value={width_m}
                        onChange={e => setGeo({ width_m: parseFloat(e.target.value) })}
                        className="tactile-range"
                      />
                      <input
                        id="field-width"
                        className={`dim-input-mini ${errors['geometry.width_m'] ? 'invalid' : ''}`}
                        type="number"
                        value={request.geometry.width_m}
                        min={0.1}
                        step={0.1}
                        onChange={e => setGeo({ width_m: parseFloat(e.target.value) })}
                      />
                    </div>
                    {fieldError(errors, 'geometry.width_m') && (
                      <span className="inspector-error">{fieldError(errors, 'geometry.width_m')}</span>
                    )}
                  </div>

                  {/* Height Slider */}
                  <div className="tactile-dim-row">
                    <div className="tactile-dim-header">
                      <label className="dim-label" htmlFor="field-height">Eave Height</label>
                      <span className="tactile-val-badge mono">{height_m.toFixed(1)} m</span>
                    </div>
                    <div className="tactile-slider-wrap">
                      <input
                        type="range"
                        min={2.2}
                        max={4.5}
                        step={0.1}
                        value={height_m}
                        onChange={e => setGeo({ height_m: parseFloat(e.target.value) })}
                        className="tactile-range"
                      />
                      <input
                        id="field-height"
                        className={`dim-input-mini ${errors['geometry.height_m'] ? 'invalid' : ''}`}
                        type="number"
                        value={request.geometry.height_m}
                        min={0.1}
                        step={0.1}
                        onChange={e => setGeo({ height_m: parseFloat(e.target.value) })}
                      />
                    </div>
                    {fieldError(errors, 'geometry.height_m') && (
                      <span className="inspector-error">{fieldError(errors, 'geometry.height_m')}</span>
                    )}
                  </div>

                  {/* Quick Metric Badges */}
                  <div className="dim-metrics-bar">
                    <div className="dim-metric-item">
                      <span className="dim-metric-label">Enclosed Vol</span>
                      <span className="dim-metric-val mono">{volume_m3} m³</span>
                    </div>
                    <div className="dim-metric-item">
                      <span className="dim-metric-label">Aspect Ratio</span>
                      <span className="dim-metric-val mono">{(length_m / width_m).toFixed(2)}:1</span>
                    </div>
                    <div className="dim-metric-item">
                      <span className="dim-metric-label">Surface Envelope</span>
                      <span className="dim-metric-val mono">{envelopeArea} m²</span>
                    </div>
                  </div>
                </div>

                {/* ── 4. Solar Orientation & Compass ── */}
                <div className="inspector-card">
                  <div className="card-title">
                    <span>Solar Orientation (°Azimuth)</span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--solar, #C2410C)' }}>
                      {request.geometry.orientation_deg}°
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                    <CompassControl
                      value={request.geometry.orientation_deg}
                      onChange={deg => setGeo({ orientation_deg: deg })}
                    />
                  </div>

                  {/* Orientation Quick Pills */}
                  <div className="orientation-quick-row">
                    {[
                      { label: 'True South (180°)', deg: 180 },
                      { label: 'South-East (150°)', deg: 150 },
                      { label: 'South-West (210°)', deg: 210 },
                    ].map(p => (
                      <button
                        key={p.deg}
                        type="button"
                        className={`orient-pill ${request.geometry.orientation_deg === p.deg ? 'active' : ''}`}
                        onClick={() => setGeo({ orientation_deg: p.deg })}
                      >
                        {p.label}
                      </button>
                    ))}
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
                <div className="surface-selector-bar" role="tablist">
                  {[
                    { id: 'walls', label: 'Walls Assembly', uVal: wallU },
                    { id: 'roof',  label: 'Roof Assembly',  uVal: roofU },
                    { id: 'floor', label: 'Floor Assembly', uVal: floorU },
                  ].map((s) => {
                    const isSurfaceActive = envelopeSurface === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`surface-btn ${isSurfaceActive ? 'active' : ''}`}
                        onClick={() => setEnvelopeSurface(s.id)}
                      >
                        <span>{s.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                          (U={s.uVal.toFixed(2)})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {envelopeSurface === 'walls' && (
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
                )}

                {envelopeSurface === 'roof' && (
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
                    <div className="dim-field" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="dim-label" htmlFor="field-emissivity">
                          Roof Surface Emissivity (0–1)
                        </label>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                          ε = {request.envelope.roof_emissivity || 0.9}
                        </span>
                      </div>
                      <input
                        id="field-emissivity"
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.01}
                        value={request.envelope.roof_emissivity || 0.9}
                        onChange={e => setEnv({ roof_emissivity: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: 'var(--solar, #C2410C)', cursor: 'pointer', marginTop: 4 }}
                      />
                    </div>
                  </div>
                )}

                {envelopeSurface === 'floor' && (
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
                )}
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
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--solar, #C2410C)' }}>
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
                        min={0.1}
                        step={0.1}
                        onChange={e => setOpening(i, { area_m2: parseFloat(e.target.value) || 0.1 })}
                      />
                      {fieldError(errors, `openings[${i}].area_m2`) && (
                        <span className="inspector-error">{fieldError(errors, `openings[${i}].area_m2`)}</span>
                      )}
                    </div>

                    <div className="dim-field">
                      <label className="dim-label" htmlFor={`opening-${i}-glazing`}>Glazing Specification</label>
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
                          Deploys at dusk to eliminate sub-zero radiation loss
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id={`opening-${i}-shutter`}
                        checked={!!op.night_shutter}
                        onChange={e => setOpening(i, { night_shutter: e.target.checked })}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--solar, #C2410C)' }}
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
                        : 'Weather from regional grid estimate (NASA POWER archive).'}
                    </p>
                  )}
                </div>

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
                        Reflective snow albedo (0.75 ground bounce gain)
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="field-snow"
                      checked={!!request.ground.snow_cover}
                      onChange={e => setGnd({ snow_cover: e.target.checked })}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--solar, #C2410C)' }}
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
