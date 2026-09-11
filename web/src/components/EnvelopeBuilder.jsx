/*
 * EnvelopeBuilder.jsx — Architectural Multi-Layer Assembly Builder
 * Provides complete engineering justification, dynamic thermal physics calculations,
 * layer-by-layer R-values, assembly presets, and intuitive thickness adjustments.
 */
import { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  getMaterialSpec,
  computeLayerR,
  computeTotalU,
  computeTotalHeatCapacity,
  ENVELOPE_PRESETS,
  MATERIAL_SPECS,
} from './materialsData';
import './EnvelopeBuilder.css';

export default function EnvelopeBuilder({
  id = 'walls', // 'walls' | 'roof' | 'floor'
  label = 'Walls',
  layers = [],
  materials = [],
  errors = {},
  errPrefix = 'envelope.walls',
  onChange,
}) {
  const [expandedRationale, setExpandedRationale] = useState({});
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Surface thermal physics calculations
  const totalThickness_m = useMemo(
    () => layers.reduce((s, l) => s + (Math.max(0, Number(l.thickness_m)) || 0), 0),
    [layers]
  );
  const totalThickness_mm = Math.round(totalThickness_m * 1000);
  const totalU = useMemo(() => computeTotalU(layers), [layers]);
  const totalR = totalU > 0 ? 1 / totalU : 0;
  const totalCapacity_kJ = useMemo(() => computeTotalHeatCapacity(layers), [layers]);

  // CPWD DSR / NBC Cold Climate Compliance check (U <= 0.35 W/m²K recommended for Western Himalayas)
  const isCompliant = totalU > 0 && totalU <= 0.38;

  // Assembly presets for this specific surface
  const presets = ENVELOPE_PRESETS[id] || [];

  const addLayer = (materialId = 'eps', thickness_m = 0.10) => {
    onChange([...layers, { material: materialId, thickness_m }]);
  };

  const removeLayer = (i) => {
    if (layers.length <= 1) return; // Retain at least 1 layer
    onChange(layers.filter((_, idx) => idx !== i));
  };

  const moveOutside = (i) => {
    if (i === 0) return;
    const next = [...layers];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveInside = (i) => {
    if (i === layers.length - 1) return;
    const next = [...layers];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  const setMaterial = (i, mat) => {
    const next = [...layers];
    next[i] = { ...next[i], material: mat };
    onChange(next);
  };

  const setThicknessMm = (i, mmVal) => {
    const next = [...layers];
    const clampedMm = Math.max(1, Math.min(1000, Number(mmVal) || 10));
    next[i] = { ...next[i], thickness_m: Number((clampedMm / 1000).toFixed(3)) };
    onChange(next);
  };

  const adjustThicknessMm = (i, deltaMm) => {
    const currentMm = Math.round((Number(layers[i]?.thickness_m) || 0.1) * 1000);
    setThicknessMm(i, currentMm + deltaMm);
  };

  const applyPreset = (preset) => {
    if (preset?.layers) {
      onChange(preset.layers.map(l => ({ ...l })));
    }
  };

  const toggleRationale = (i) => {
    setExpandedRationale(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="envelope-builder-container">
      {/* ── 1. Surface Performance Summary ─────────────────────────── */}
      <div className="envelope-header-card">
        <div className="envelope-header-top">
          <div className="envelope-surface-title">
            <Layers size={14} style={{ color: 'var(--accent)' }} />
            <span>{label} Assembly</span>
          </div>
          <span className={`envelope-compliance-chip ${isCompliant ? 'compliant' : 'warning'}`}>
            {isCompliant ? '✓ CPWD High-Altitude Spec' : '⚠ High Conductive Loss'}
          </span>
        </div>

        {/* Telemetry Readouts */}
        <div className="envelope-summary-metrics">
          <div className="envelope-metric-item">
            <span className="envelope-metric-label">Transmittance</span>
            <span className="envelope-metric-val">U = {totalU.toFixed(2)}</span>
          </div>
          <div className="envelope-metric-item">
            <span className="envelope-metric-label">Resistance</span>
            <span className="envelope-metric-val">R = {totalR.toFixed(2)}</span>
          </div>
          <div className="envelope-metric-item">
            <span className="envelope-metric-label">Total Thickness</span>
            <span className="envelope-metric-val">{totalThickness_mm} mm</span>
          </div>
        </div>

        {/* Assembly Presets Pill Row */}
        {presets.length > 0 && (
          <div className="envelope-preset-row">
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
              Presets:
            </span>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className="envelope-preset-chip"
                onClick={() => applyPreset(p)}
                title={p.description}
              >
                {p.name.split(' (')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Dynamic Visual Layer Sandwich Preview ───────────────── */}
      {layers.length > 0 && totalThickness_mm > 0 && (
        <div className="envelope-sandwich-wrapper">
          <div className="sandwich-labels">
            <span>← Exterior (Cold Atmosphere)</span>
            <span>Interior (Heated Space) →</span>
          </div>
          <div className="sandwich-track">
            {layers.map((layer, i) => {
              const spec = getMaterialSpec(layer.material);
              const mm = Math.round((Number(layer.thickness_m) || 0) * 1000);
              const pct = Math.max(12, Math.min(80, (mm / totalThickness_mm) * 100));
              return (
                <div
                  key={i}
                  className="sandwich-slice"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: spec.color || '#64748B',
                    opacity: hoveredSlice === i ? 1 : 0.9,
                  }}
                  onMouseEnter={() => setHoveredSlice(i)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  title={`Layer ${i + 1}: ${spec.name} (${mm}mm)`}
                >
                  <span>{mm}mm</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Structured Architectural Layer Cards ────────────────── */}
      <div className="envelope-layers-list">
        {layers.map((layer, i) => {
          const spec = getMaterialSpec(layer.material);
          const mm = Math.round((Number(layer.thickness_m) || 0.1) * 1000);
          const layerR = computeLayerR(layer.material, layer.thickness_m);
          const rShare = totalR > 0 ? Math.round((layerR / totalR) * 100) : 0;

          const isExterior = i === 0;
          const isInterior = i === layers.length - 1;
          const positionLabel = isExterior
            ? 'EXTERIOR LAYER'
            : isInterior
            ? 'INTERIOR LAYER'
            : `CORE LAYER ${i + 1}`;

          const isExpanded = !!expandedRationale[i];

          return (
            <div
              key={i}
              className={`layer-card ${hoveredSlice === i ? 'highlighted' : ''}`}
            >
              {/* Card Header */}
              <div className="layer-card-header">
                <div className="layer-card-index-wrap">
                  <span className="layer-badge">#{i + 1}</span>
                  <span className="layer-position-tag">{positionLabel}</span>
                  <span className="layer-role-tag">{spec.role || spec.category}</span>
                </div>

                <div className="layer-card-actions">
                  <button
                    type="button"
                    className="layer-action-btn"
                    onClick={() => moveOutside(i)}
                    disabled={i === 0}
                    title="Move toward exterior (cold side)"
                    aria-label="Move layer toward exterior"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="layer-action-btn"
                    onClick={() => moveInside(i)}
                    disabled={i === layers.length - 1}
                    title="Move toward interior (warm side)"
                    aria-label="Move layer toward interior"
                  >
                    <ChevronDown size={14} />
                  </button>
                  {layers.length > 1 && (
                    <button
                      type="button"
                      className="layer-action-btn delete"
                      onClick={() => removeLayer(i)}
                      title="Remove this layer"
                      aria-label="Remove layer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="layer-card-body">
                {/* Material Selector */}
                <div className="layer-select-field">
                  <label className="layer-field-label" htmlFor={`layer-${id}-${i}-mat`}>
                    Selected Material &amp; Specification
                  </label>
                  <select
                    id={`layer-${id}-${i}-mat`}
                    className="layer-material-dropdown"
                    value={layer.material}
                    onChange={(e) => setMaterial(i, e.target.value)}
                  >
                    <optgroup label="Thermal Insulation (High Resistance)">
                      <option value="eps">EPS insulation (Type II High-Density) — k = 0.038 W/m·K</option>
                      <option value="xps">XPS insulation (Moisture Resistant) — k = 0.034 W/m·K</option>
                      <option value="rockwool">Rockwool mineral wool batt — k = 0.038 W/m·K</option>
                    </optgroup>
                    <optgroup label="Thermal Mass (Diurnal Storage)">
                      <option value="mud_brick">Mud brick (adobe sun-dried) — k = 0.75 W/m·K</option>
                      <option value="rammed_earth">Rammed earth (compacted) — k = 1.25 W/m·K</option>
                      <option value="concrete">Dense reinforced concrete — k = 1.75 W/m·K</option>
                    </optgroup>
                    <optgroup label="Structural Framing & Enclosure">
                      <option value="stone">Stone masonry (local granite) — k = 2.20 W/m·K</option>
                      <option value="timber">Timber softwood (Deodar/Poplar) — k = 0.13 W/m·K</option>
                      <option value="plywood">Structural plywood (BWP Marine) — k = 0.13 W/m·K</option>
                    </optgroup>
                    <optgroup label="Air Barrier & Membrane">
                      <option value="polythene">Vapor retarder membrane (200μm) — k = 0.33 W/m·K</option>
                    </optgroup>
                  </select>
                </div>

                {/* Thickness Controls */}
                <div className="layer-thickness-row">
                  <div className="thickness-input-wrap">
                    <input
                      type="number"
                      className="thickness-num-input"
                      value={mm}
                      min={5}
                      max={1000}
                      step={5}
                      onChange={(e) => setThicknessMm(i, e.target.value)}
                      aria-label="Layer thickness in millimeters"
                    />
                    <span className="thickness-unit">mm</span>
                  </div>

                  <input
                    type="range"
                    className="thickness-slider"
                    value={mm}
                    min={10}
                    max={500}
                    step={5}
                    onChange={(e) => setThicknessMm(i, e.target.value)}
                    aria-label="Layer thickness slider"
                  />

                  <div className="thickness-quick-steps">
                    <button
                      type="button"
                      className="thickness-step-btn"
                      onClick={() => adjustThicknessMm(i, 25)}
                      title="Add 25mm thickness"
                    >
                      +25
                    </button>
                    <button
                      type="button"
                      className="thickness-step-btn"
                      onClick={() => adjustThicknessMm(i, 50)}
                      title="Add 50mm thickness"
                    >
                      +50
                    </button>
                  </div>
                </div>

                {/* Dynamic Physics Matrix */}
                <div className="layer-specs-matrix">
                  <div className="layer-spec-cell">
                    <span className="layer-spec-caption">Conductivity</span>
                    <span className="layer-spec-value">{spec.k} W/m·K</span>
                  </div>
                  <div className="layer-spec-cell">
                    <span className="layer-spec-caption">Density</span>
                    <span className="layer-spec-value">{spec.rho} kg/m³</span>
                  </div>
                  <div className="layer-spec-cell">
                    <span className="layer-spec-caption">Specific Heat</span>
                    <span className="layer-spec-value">{spec.cp} J/kg·K</span>
                  </div>
                  <div className="layer-spec-cell">
                    <span className="layer-spec-caption">Resistance</span>
                    <span className="layer-spec-value highlight">
                      R={layerR.toFixed(2)} ({rShare}%)
                    </span>
                  </div>
                </div>

                {/* "Why this material?" Engineering Justification Drawer */}
                <button
                  type="button"
                  className="layer-rationale-toggle"
                  onClick={() => toggleRationale(i)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={13} style={{ color: 'var(--accent)' }} />
                    <span>Why use this material &amp; position?</span>
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {isExpanded ? 'Hide' : 'Explain'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="layer-rationale-content">
                    <div>{spec.whyUse || spec.description}</div>
                    <div className="layer-rationale-meta">
                      <span>Ref: {spec.standardsRef || 'CPWD / NBC'}</span>
                      <span>·</span>
                      <span>{spec.logistics || (spec.local ? '100% Locally Sourced' : 'Transported Item')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 4. Add Layer Action ────────────────────────────────────── */}
      <button
        type="button"
        className="add-layer-action-card"
        onClick={() => addLayer('eps', 0.05)}
      >
        <Plus size={14} />
        <span>Add Assembly Layer (+50mm EPS)</span>
      </button>
    </div>
  );
}
