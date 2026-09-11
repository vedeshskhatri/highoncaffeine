/*
 * CanvasToolbar.jsx — Modern CAD Viewport Floating Toolbars
 * Styled after contemporary architectural 3D tools ("hut." inspiration).
 */
import { motion } from 'framer-motion';
import {
  Ruler,
  Layers,
  Sun,
  Flame,
  Snowflake,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Sparkles,
  FileText,
  Play,
} from 'lucide-react';
import './CanvasToolbar.css';

export default function CanvasToolbar({
  mode = '3d',
  onModeChange,
  viewMode = 'solid',
  onViewModeChange,
  showDimensions = true,
  onToggleDimensions,
  showSolarRays = true,
  onToggleSolarRays,
  snowCover = true,
  onToggleSnowCover,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSimulate,
  onOpenNotes,
}) {
  return (
    <>
      {/* ── 1. Top-Right 2D / 3D Mode Toggle Pill ──────────────────────── */}
      <div className="mode-toggle-pill" role="tablist" aria-label="Viewport Mode">
        {['2d', '3d'].map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              id={`toggle-mode-${m}`}
              className={`mode-toggle-btn ${isActive ? 'active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => onModeChange(m)}
            >
              {isActive && (
                <motion.div
                  layoutId="mode-slider"
                  className="mode-indicator-slider"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  style={{
                    inset: 0,
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 2 }}>{m.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* ── 2. Top-Left Zoom & History Controls ────────────────────────── */}
      <div className="viewport-zoom-pill" aria-label="Viewport Navigation Controls">
        <button className="zoom-tool-btn" title="Undo change" onClick={() => {}}>
          <Undo2 size={14} />
        </button>
        <button className="zoom-tool-btn" title="Redo change" onClick={() => {}}>
          <Redo2 size={14} />
        </button>
        <div className="zoom-divider" />
        <button className="zoom-tool-btn" title="Zoom Out" onClick={onZoomOut}>
          <ZoomOut size={14} />
        </button>
        <span className="zoom-label">{zoomLevel}%</span>
        <button className="zoom-tool-btn" title="Zoom In" onClick={onZoomIn}>
          <ZoomIn size={14} />
        </button>
        <div className="zoom-divider" />
        <button className="zoom-tool-btn" title="Reset Viewport" onClick={onResetZoom}>
          <RotateCcw size={13} />
        </button>
      </div>

      {/* ── 3. Left Floating CAD Tool Rail ─────────────────────────────── */}
      <div className="cad-tool-rail" aria-label="Shelter Tools">
        {/* Dimensions */}
        <button
          className={`cad-tool-btn ${showDimensions ? 'active' : ''}`}
          onClick={onToggleDimensions}
          aria-label="Toggle Dimensions"
        >
          <Ruler size={17} />
          <span className="cad-tool-tooltip">Dimensions & Bounds</span>
        </button>

        {/* Exploded / Layer Separation */}
        <button
          className={`cad-tool-btn ${viewMode === 'exploded' ? 'active' : ''}`}
          onClick={() => onViewModeChange(viewMode === 'exploded' ? 'solid' : 'exploded')}
          aria-label="Toggle Exploded Layers"
        >
          <Layers size={17} />
          <span className="cad-tool-tooltip">
            {viewMode === 'exploded' ? 'Solid Envelope' : 'Exploded Layers View'}
          </span>
        </button>

        {/* Sun & Solar Radiation Rays */}
        <button
          className={`cad-tool-btn ${showSolarRays ? 'active' : ''}`}
          onClick={onToggleSolarRays}
          aria-label="Toggle Solar Ray Simulation"
        >
          <Sun size={17} />
          <span className="cad-tool-tooltip">Winter Solar Trajectory</span>
        </button>

        {/* Thermal Heatmap Mode */}
        <button
          className={`cad-tool-btn ${viewMode === 'thermal' ? 'active' : ''}`}
          onClick={() => onViewModeChange(viewMode === 'thermal' ? 'solid' : 'thermal')}
          aria-label="Toggle Thermal Heatmap"
        >
          <Flame size={17} />
          <span className="cad-tool-tooltip">
            {viewMode === 'thermal' ? 'Realistic Materials' : 'Thermal Heatmap Mode'}
          </span>
        </button>

        {/* Snow Cover / Winter Ground */}
        <button
          className={`cad-tool-btn ${snowCover ? 'active' : ''}`}
          onClick={onToggleSnowCover}
          aria-label="Toggle Ground Snow Cover"
        >
          <Snowflake size={17} />
          <span className="cad-tool-tooltip">Ground Snow Albedo (0.80)</span>
        </button>
      </div>

      {/* ── 4. Bottom Floating Action Pill ────────────────────────────── */}
      <div className="canvas-bottom-pill">
        <button
          className="bottom-pill-btn secondary"
          onClick={onOpenNotes}
          title="View shelter design notes"
        >
          <FileText size={14} />
          <span>Design Notes</span>
        </button>
        <button
          className="bottom-pill-btn primary"
          onClick={onSimulate}
          id="btn-run-simulation-floating"
          title="Run full thermal diurnal simulation"
        >
          <Play size={13} fill="currentColor" />
          <span>Run Simulation</span>
        </button>
      </div>
    </>
  );
}
