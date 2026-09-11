/*
 * DesignCanvas.jsx — Hero Architectural Studio Canvas
 * Seamlessly integrates the 3D Shelter WebGL Studio and the 2D Technical Cross-Section.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPanel from './AnimatedPanel';
import Shelter3DCanvas from './Shelter3DCanvas';
import CrossSectionSVG from './CrossSectionSVG';
import CanvasToolbar from './CanvasToolbar';
import MaterialSuggestionPanel from './MaterialSuggestionPanel';
import { X, Check, MapPin, Wind, Sun, Snowflake } from 'lucide-react';
import './DesignCanvas.css';

const CATEGORIES = [
  { label: 'structural', color: 'var(--solar)' },
  { label: 'insulation', color: 'var(--accent)' },
  { label: 'glazing',    color: 'var(--text-secondary)' },
  { label: 'mass',       color: 'var(--comfort)' },
  { label: 'membrane',   color: 'var(--text-muted)' },
];

export default function DesignCanvas({
  request,
  onSimulate,
  onApplyBuildUp,
  activeSiteName,
  siteWeather,
  onOpenLocation,
}) {
  const [mode, setMode] = useState('3d'); // '3d' | '2d'
  const [viewMode, setViewMode] = useState('solid'); // 'solid' | 'exploded' | 'thermal'
  const [showDimensions, setShowDimensions] = useState(true);
  const [showSolarRays, setShowSolarRays] = useState(true);
  const [snowCover, setSnowCover] = useState(request?.ground?.snow_cover ?? true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [notesOpen, setNotesOpen] = useState(false);
  const [materialSuggestionOpen, setMaterialSuggestionOpen] = useState(false);

  const length_m = request?.geometry?.length_m ?? 6.0;
  const width_m = request?.geometry?.width_m ?? 4.0;
  const height_m = request?.geometry?.height_m ?? 2.6;
  const orientation_deg = request?.geometry?.orientation_deg ?? 180;
  const wallLayers = request?.envelope?.walls || [];
  const totalWall_m = wallLayers.reduce((s, l) => s + (Math.max(0, Number(l.thickness_m)) || 0), 0);
  const totalWall_mm = Math.round(totalWall_m * 1000);

  return (
    <div className="design-canvas-stage">
      {/* ── 0. Floating Location & Climate Telemetry Widget ─────────────── */}
      <div className="canvas-telemetry-banner">
        <div className="telemetry-main-row">
          <div className="telemetry-pin-badge">
            <MapPin size={13} className="telemetry-icon" />
            <span className="telemetry-name">{activeSiteName || 'Site Location'}</span>
          </div>
          <span className="telemetry-coord mono">
            {request?.location?.lat?.toFixed(2)}°N, {request?.location?.lon?.toFixed(2)}°E · {request?.location?.altitude_m}m ASL
          </span>
          {onOpenLocation && (
            <button
              type="button"
              className="telemetry-change-btn"
              onClick={onOpenLocation}
              title="Change Site Location & Weather"
            >
              <span>Switch Site</span>
            </button>
          )}
        </div>

        {siteWeather?.metrics && (
          <div className="telemetry-metrics-row">
            <div className="telemetry-metric-item" title="Minimum Diurnal Air Temperature">
              <span className="metric-tag">T_MIN</span>
              <span className="metric-val mono" style={{ color: siteWeather.metrics.t_air_min < 0 ? '#38bdf8' : 'inherit' }}>
                {siteWeather.metrics.t_air_min > 0 ? `+${siteWeather.metrics.t_air_min}` : siteWeather.metrics.t_air_min}°C
              </span>
            </div>
            <div className="telemetry-metric-sep" />
            <div className="telemetry-metric-item" title="Mean Diurnal Air Temperature">
              <span className="metric-tag">T_MEAN</span>
              <span className="metric-val mono">{siteWeather.metrics.t_air_mean}°C</span>
            </div>
            <div className="telemetry-metric-sep" />
            <div className="telemetry-metric-item" title="Maximum Diurnal Air Temperature">
              <span className="metric-tag">T_MAX</span>
              <span className="metric-val mono">{siteWeather.metrics.t_air_max > 0 ? `+${siteWeather.metrics.t_air_max}` : siteWeather.metrics.t_air_max}°C</span>
            </div>
            <div className="telemetry-metric-sep" />
            <div className="telemetry-metric-item" title="Direct Normal Solar Irradiance Peak">
              <span className="metric-tag">DNI_PEAK</span>
              <span className="metric-val mono" style={{ color: '#f59e0b' }}>
                {Math.round(siteWeather.metrics.solar_dni_peak_wm2)} W/m²
              </span>
            </div>
            <div className="telemetry-metric-sep" />
            <div className="telemetry-metric-item" title="Snow Cover Status">
              <span className="metric-tag">SNOW</span>
              <span className="metric-val" style={{ color: siteWeather.metrics.snow_cover ? '#38bdf8' : '#64748b' }}>
                {siteWeather.metrics.snow_cover ? 'Active' : 'None'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 1. Main Viewport (3D or 2D) ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {mode === '3d' ? (
          <motion.div
            key="3d-viewport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', height: '100%', position: 'relative' }}
          >
            <Shelter3DCanvas
              request={request}
              viewMode={viewMode}
              showDimensions={showDimensions}
              showSolarRays={showSolarRays}
              snowCover={snowCover}
              activeSiteName={activeSiteName}
            />
          </motion.div>
        ) : (
          <motion.div
            key="2d-viewport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="design-2d-container"
          >
            <div className="design-2d-inner">
              <AnimatedPanel delay={0}>
                <div className="design-2d-header">
                  <h3 className="design-2d-title">Technical Cross-Section Elevation</h3>
                  <div className="design-2d-meta">
                    <span>span={length_m}m × {width_m}m</span>
                    <span style={{ margin: '0 6px', color: 'var(--border-strong)' }}>|</span>
                    <span>wall {totalWall_mm}mm</span>
                    <span style={{ margin: '0 6px', color: 'var(--border-strong)' }}>|</span>
                    <span>orient {orientation_deg}°</span>
                  </div>
                </div>
              </AnimatedPanel>

              {/* Technical 2D CrossSection */}
              <AnimatedPanel delay={0.08}>
                <CrossSectionSVG request={request} />
              </AnimatedPanel>

              {/* Legend row */}
              <AnimatedPanel
                delay={0.14}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-caption-size)',
                  color: 'var(--text-muted)',
                  paddingTop: 8,
                }}
              >
                {CATEGORIES.map(cat => (
                  <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: cat.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{cat.label}</span>
                  </div>
                ))}
              </AnimatedPanel>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Floating CAD Viewport Toolbars ───────────────────────────── */}
      <CanvasToolbar
        mode={mode}
        onModeChange={setMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showDimensions={showDimensions}
        onToggleDimensions={() => setShowDimensions(s => !s)}
        showSolarRays={showSolarRays}
        onToggleSolarRays={() => setShowSolarRays(s => !s)}
        snowCover={snowCover}
        onToggleSnowCover={() => setSnowCover(s => !s)}
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel(z => Math.min(160, z + 10))}
        onZoomOut={() => setZoomLevel(z => Math.max(60, z - 10))}
        onResetZoom={() => setZoomLevel(100)}
        onSimulate={onSimulate}
        onOpenNotes={() => setNotesOpen(true)}
        onOpenMaterialSuggestion={() => setMaterialSuggestionOpen(true)}
      />

      {/* ── 2.5 Requirement-Driven Material Suggestion Panel (Evaluator Ask) ── */}
      <MaterialSuggestionPanel
        isOpen={materialSuggestionOpen}
        onClose={() => setMaterialSuggestionOpen(false)}
        request={request}
        onApplyBuildUp={(buildup) => {
          if (onApplyBuildUp) onApplyBuildUp(buildup);
          setMaterialSuggestionOpen(false);
        }}
      />

      {/* ── 3. Design Notes Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div
            className="notes-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotesOpen(false)}
          >
            <motion.div
              className="notes-modal-card"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="notes-modal-header">
                <h3 className="notes-modal-title">Himalayan Shelter Design Strategy</h3>
                <button
                  onClick={() => setNotesOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="notes-modal-body">
                <p>
                  <strong>Passive Solar Principles for Leh &amp; Ladakh:</strong>
                </p>
                <ul style={{ paddingLeft: 18, margin: '8px 0' }}>
                  <li>
                    <strong>Orientation:</strong> Maintain a true South orientation (180°) within ±15° to capture peak direct solar radiation during sub-zero winter solstices.
                  </li>
                  <li>
                    <strong>Thermal Mass &amp; EPS Insulation:</strong> Placing EPS insulation on the <em>exterior</em> of high-capacitance mud brick or stone prevents thermal bridging and retains diurnal heat.
                  </li>
                  <li>
                    <strong>Insulated Night Shutters:</strong> Deploying insulated shutters over south glazing at dusk prevents drastic radiative loss through the glass panes.
                  </li>
                </ul>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  className="bottom-pill-btn primary"
                  onClick={() => setNotesOpen(false)}
                >
                  <Check size={14} />
                  <span>Got it</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
