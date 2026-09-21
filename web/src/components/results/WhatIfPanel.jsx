import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMaterialSpec } from '../materialsData';

/**
 * WhatIfPanel.jsx — Phase 3: What-If Analysis
 *
 * Requirements:
 *  - Modify one design variable at a time
 *  - Clear units displayed for all inputs and metrics
 *  - Valid ranges strictly derived from existing schema (no invented limits)
 *  - Reset to baseline control
 *  - Authoritative server simulation (no independent JS physics calculations)
 *  - Loading, error, and unavailable-data states
 *  - Display: peak indoor temp, min indoor temp, comfort hours, heating demand, and other metrics if available
 */

// Authoritative fallback variable specifications matching engine.what_if.SUPPORTED_VARIABLES
const DEFAULT_VARIABLE_SPECS = {
  wall_thickness: {
    label: 'Wall Thickness',
    unit: 'm',
    min: 0.05,
    max: 1.50,
    step: 0.05,
    description: 'Primary structural wall layer thickness',
  },
  roof_thickness: {
    label: 'Roof Thickness',
    unit: 'm',
    min: 0.05,
    max: 1.00,
    step: 0.05,
    description: 'Primary roof slab/deck layer thickness',
  },
  insulation: {
    label: 'EPS Insulation Thickness',
    unit: 'm',
    min: 0.0,
    max: 0.25,
    step: 0.025,
    description: 'Expanded Polystyrene (EPS) thermal insulation layer',
  },
  glazing_area: {
    label: 'South Glazing Area',
    unit: 'm²',
    min: 0.0,
    max: 20.0,
    step: 0.5,
    description: 'Total south-facing passive solar glazing aperture',
  },
  orientation: {
    label: 'Orientation (Azimuth)',
    unit: '°',
    min: 0.0,
    max: 360.0,
    step: 15.0,
    description: 'Orientation angle (0=North, 90=East, 180=South, 270=West)',
  },
  ach: {
    label: 'Infiltration / Ventilation',
    unit: 'ACH',
    min: 0.10,
    max: 5.00,
    step: 0.05,
    description: 'Air changes per hour (ACH >= 0.35 required for unvented heating)',
  },
  shading: {
    label: 'Night Shutter',
    unit: 'boolean',
    options: [true, false],
    description: 'Movable insulating night shutters deployed 18:00 to 06:00',
  },
  material: {
    label: 'Wall Material',
    unit: 'material_id',
    options: [
      'mud_brick',
      'rammed_earth',
      'stone_masonry',
      'puf_sandwich',
      'cgi_sheet',
      'dense_concrete',
    ],
    description: 'Primary structural masonry/cladding material from library',
  },
};

function formatDelta(delta, unit = '', decimals = 2) {
  if (delta === null || delta === undefined || isNaN(delta)) {
    return '—';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(decimals)} ${unit}`.trim();
}

function extractBaselineValue(request, parameter) {
  if (!request) return null;
  const env = request.envelope || {};
  const walls = env.walls || [];
  const roof = env.roof || [];
  const openings = request.openings || [];
  const geom = request.geometry || {};
  const vent = request.ventilation || {};

  switch (parameter) {
    case 'wall_thickness':
      return walls[0]?.thickness_m ?? 0.30;
    case 'roof_thickness':
      return roof[0]?.thickness_m ?? 0.15;
    case 'insulation': {
      const insLayer = walls.find((l) => ['eps', 'rockwool', 'straw_bale'].includes(l.material));
      return insLayer?.thickness_m ?? 0.0;
    }
    case 'glazing_area': {
      const southOp = openings.find((op) => (op.facing || '').toLowerCase().includes('south'));
      return southOp?.area_m2 ?? 0.0;
    }
    case 'orientation':
      return geom.orientation_deg ?? 180.0;
    case 'ach':
      return vent.ach ?? 0.6;
    case 'shading': {
      const southOp = openings.find((op) => (op.facing || '').toLowerCase().includes('south'));
      return !!southOp?.night_shutter;
    }
    case 'material':
      return walls[0]?.material ?? 'mud_brick';
    default:
      return null;
  }
}

export default function WhatIfPanel({ request, result, baselineData, onApplyDesign }) {
  const [variableSpecs, setVariableSpecs] = useState(DEFAULT_VARIABLE_SPECS);
  const [selectedVar, setSelectedVar] = useState('wall_thickness');
  const [currentValue, setCurrentValue] = useState(0.30);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const debounceTimerRef = useRef(null);
  const reqIdRef = useRef(0);

  // Active baseline request
  const effectiveRequest = request || baselineData?.request || {
    location: { lat: 34.1526, lon: 77.5771, altitude_m: 3500.0 },
    weather: { mode: 'typical_day', date: '2026-01-15', hours: 24, user_csv_id: null },
    geometry: { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180.0 },
    envelope: {
      walls: [
        { material: 'mud_brick', thickness_m: 0.30 },
        { material: 'eps', thickness_m: 0.05 },
      ],
      roof: [{ material: 'dense_concrete', thickness_m: 0.15 }],
      floor: [{ material: 'dense_concrete', thickness_m: 0.10 }],
      roof_emissivity: 0.90,
    },
    openings: [
      { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
    ],
    ventilation: { ach: 0.6, heater_type: 'none' },
    occupancy: { people: 8, watts_per_person: 100 },
    ground: { snow_cover: true, albedo: null },
    comfort: { model: 'imac', health_threshold_c: 18.0 },
    simulation: { timestep_s: 60, spinup_days: 3 },
  };

  // Fetch variable specifications from server
  useEffect(() => {
    fetch('/what-if/variables')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.variables) {
          setVariableSpecs(data.variables);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_VARIABLE_SPECS is already set
      });
  }, []);

  // Update current value when selected variable or baseline changes
  useEffect(() => {
    const baseVal = extractBaselineValue(effectiveRequest, selectedVar);
    if (baseVal !== null) {
      setCurrentValue(baseVal);
    }
  }, [selectedVar, effectiveRequest]);

  // Execute authoritative what-if calculation on server
  const runWhatIf = useCallback((variableKey, val) => {
    setLoading(true);
    setError(null);
    setWarning(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const thisReqId = ++reqIdRef.current;
      try {
        const payload = {
          baseline: effectiveRequest,
          parameter: variableKey,
          value: val,
        };

        const res = await fetch('/what-if', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        if (thisReqId === reqIdRef.current) {
          if (data.refused) {
            setError(`Simulation Refused: ${data.refusal_reason}`);
            setWhatIfResult(null);
          } else {
            setWhatIfResult(data);
            setWarning(data.warning || null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (thisReqId === reqIdRef.current) {
          setError(err.message || 'What-If calculation failed');
          setLoading(false);
        }
      }
    }, 120);
  }, [effectiveRequest]);

  // Trigger calculation whenever variable or value changes
  useEffect(() => {
    runWhatIf(selectedVar, currentValue);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [selectedVar, currentValue, runWhatIf]);

  const activeSpec = variableSpecs[selectedVar] || DEFAULT_VARIABLE_SPECS[selectedVar];
  const baselineVal = extractBaselineValue(effectiveRequest, selectedVar);
  const isBaseline = currentValue === baselineVal;

  const handleReset = () => {
    if (baselineVal !== null) {
      setCurrentValue(baselineVal);
    }
  };

  const metrics = whatIfResult?.metrics || {};

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
      id="what-if-analysis-panel"
    >
      {/* Header & Description */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--accent)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-1)',
          }}>
            PHASE 3 · DECISION SUPPORT
          </div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-h3-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            What-If Single-Variable Analysis
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-body-size)',
            color: 'var(--text-secondary)',
            margin: 'var(--space-1) 0 0 0',
          }}>
            Modify exactly one design variable against the baseline. Physics evaluated authoritatively on the server.
          </p>
        </div>

        {/* Reset to Baseline Button */}
        <button
          type="button"
          onClick={handleReset}
          disabled={isBaseline || loading}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption-size)',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: isBaseline ? 'var(--surface-2)' : 'var(--surface-3)',
            color: isBaseline ? 'var(--text-muted)' : 'var(--text-primary)',
            border: 'var(--border-width) solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            cursor: isBaseline ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isBaseline ? 'Baseline Active' : '↺ Reset to Baseline'}
        </button>
      </div>

      {/* Control Strip: Variable Selector & Bound Range Input */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 2fr',
          gap: 'var(--space-4)',
          backgroundColor: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          alignItems: 'center',
        }}
      >
        {/* Variable Dropdown */}
        <div>
          <label
            htmlFor="whatif-var-select"
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption-size)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-1)',
              textTransform: 'uppercase',
            }}
          >
            Design Variable (One at a time)
          </label>
          <select
            id="whatif-var-select"
            value={selectedVar}
            onChange={(e) => setSelectedVar(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-size)',
              backgroundColor: 'var(--surface-1)',
              color: 'var(--text-primary)',
              border: 'var(--border-width) solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {Object.entries(variableSpecs).map(([key, spec]) => (
              <option key={key} value={key}>
                {spec.label} ({spec.unit})
              </option>
            ))}
          </select>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-1)',
          }}>
            {activeSpec?.description}
          </div>
        </div>

        {/* Input Value Control */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption-size)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              Modified Value:
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-body-size)',
              fontWeight: 700,
              color: isBaseline ? 'var(--text-muted)' : 'var(--accent)',
            }}>
              {String(currentValue)} {activeSpec?.unit !== 'boolean' && activeSpec?.unit !== 'material_id' ? activeSpec?.unit : ''}
              {isBaseline && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(Baseline)</span>}
            </span>
          </div>

          {/* Render slider / number input if continuous */}
          {activeSpec?.min !== undefined && activeSpec?.max !== undefined ? (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <input
                type="range"
                min={activeSpec.min}
                max={activeSpec.max}
                step={activeSpec.step || 0.05}
                value={currentValue}
                onChange={(e) => setCurrentValue(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <input
                type="number"
                min={activeSpec.min}
                max={activeSpec.max}
                step={activeSpec.step || 0.05}
                value={currentValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setCurrentValue(val);
                }}
                style={{
                  width: '90px',
                  padding: 'var(--space-1) var(--space-2)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-body-size)',
                  backgroundColor: 'var(--surface-1)',
                  color: 'var(--text-primary)',
                  border: 'var(--border-width) solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'right',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption-size)', color: 'var(--text-muted)' }}>
                {activeSpec.unit}
              </span>
            </div>
          ) : activeSpec?.options && selectedVar === 'shading' ? (
            /* Boolean Shading toggle */
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => setCurrentValue(true)}
                style={{
                  flex: 1,
                  padding: 'var(--space-2)',
                  backgroundColor: currentValue ? 'var(--accent)' : 'var(--surface-1)',
                  color: currentValue ? 'var(--bg-base)' : 'var(--text-primary)',
                  border: 'var(--border-width) solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: currentValue ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                Deployed (Night Shutter Active)
              </button>
              <button
                type="button"
                onClick={() => setCurrentValue(false)}
                style={{
                  flex: 1,
                  padding: 'var(--space-2)',
                  backgroundColor: !currentValue ? 'var(--accent)' : 'var(--surface-1)',
                  color: !currentValue ? 'var(--bg-base)' : 'var(--text-primary)',
                  border: 'var(--border-width) solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: !currentValue ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                Retracted (Bare Glazing)
              </button>
            </div>
          ) : activeSpec?.options && selectedVar === 'material' ? (
            /* Material selector dropdown & Authoritative Spec Card */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <select
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-body-size)',
                  backgroundColor: 'var(--surface-1)',
                  color: 'var(--text-primary)',
                  border: 'var(--border-width) solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {activeSpec.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {getMaterialSpec(opt).name}
                  </option>
                ))}
              </select>

              {/* Authoritative Live Material Properties & Citation */}
              {(() => {
                const spec = getMaterialSpec(currentValue);
                return (
                  <div
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{spec.name}</span>
                      {spec.citation && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9.5px',
                          color: '#059669',
                          background: 'rgba(16, 185, 129, 0.08)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          fontWeight: 600,
                        }}>
                          Standard: {spec.citation}
                        </span>
                      )}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Conductivity (k)</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{spec.conductivity_w_mk} W/m·K</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Density (ρ)</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{spec.density_kg_m3} kg/m³</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Spec Heat (cp)</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{spec.specific_heat_j_kgk} J/kg·K</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Unit Cost</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {spec.cost_inr_m2 ? `₹${spec.cost_inr_m2}/m²` : spec.cost_inr_m3 ? `₹${spec.cost_inr_m3}/m³` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Apply to 3D Shelter Button */}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedWalls = [...(effectiveRequest.envelope?.walls || [])];
                          if (updatedWalls.length > 0) {
                            updatedWalls[0] = { ...updatedWalls[0], material: currentValue };
                          }
                          const updatedReq = {
                            ...effectiveRequest,
                            envelope: {
                              ...effectiveRequest.envelope,
                              walls: updatedWalls,
                            },
                          };
                          if (onApplyDesign) {
                            onApplyDesign(updatedReq);
                            setAppliedNotice(true);
                            setTimeout(() => setAppliedNotice(false), 2500);
                          }
                        }}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 12px',
                          background: 'var(--solar, #C2410C)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 1px 4px rgba(194, 65, 12, 0.25)',
                        }}
                      >
                        Apply to 3D Shelter
                      </button>
                      {appliedNotice && (
                        <span style={{ color: '#059669', fontSize: '11px', fontWeight: 600 }}>
                          ✓ Synchronized to 3D Shelter
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}

          {/* Valid range hint */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-1)',
          }}>
            {activeSpec?.min !== undefined && (
              <span>Range: [{activeSpec.min}, {activeSpec.max}] {activeSpec.unit} (derived from schema)</span>
            )}
            {baselineVal !== null && (
              <span>Baseline: {String(baselineVal)} {activeSpec?.unit !== 'boolean' && activeSpec?.unit !== 'material_id' ? activeSpec?.unit : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Warning / Safety Banner */}
      {warning && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--accent)',
          }}
        >
          ⚠ {warning}
        </div>
      )}

      {/* Error State Banner */}
      {error && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-body-size)',
            color: 'var(--danger)',
          }}
        >
          ✕ {error}
        </div>
      )}

      {/* Loading State Overlay / Indicator */}
      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
          color: 'var(--accent)',
        }}>
          <span className="spinner" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          Simulating variant on server...
        </div>
      )}

      {/* Side-by-Side Authoritative Metric Comparison Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-3)',
      }}>
        {/* 1. Peak Indoor Temperature */}
        <MetricCard
          label="Peak Indoor Temp"
          metric={metrics.peak_indoor_temp_c}
          positiveIsGood={true}
        />

        {/* 2. Minimum Indoor Temperature */}
        <MetricCard
          label="Minimum Indoor Temp"
          metric={metrics.min_indoor_temp_c}
          positiveIsGood={true}
        />

        {/* 3. Comfort Hours Ratio */}
        <MetricCard
          label="Comfort Ratio"
          metric={metrics.comfort_hours_ratio}
          formatter={(v) => `${(v * 100).toFixed(1)}%`}
          deltaFormatter={(d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%`}
          positiveIsGood={true}
        />

        {/* 4. Heating Demand (Kerosene / Fuel) */}
        <MetricCard
          label="Heating Demand"
          metric={metrics.heating_demand_litres}
          positiveIsGood={false}
        />

        {/* 5. Heating Demand (kWh) */}
        <MetricCard
          label="Heating Energy"
          metric={metrics.heating_demand_kwh}
          positiveIsGood={false}
        />

        {/* 6. Total Heat Loss */}
        <MetricCard
          label="Total Heat Loss"
          metric={metrics.total_heat_loss_kwh}
          positiveIsGood={false}
        />

        {/* 7. Solar Heat Gain */}
        <MetricCard
          label="Solar Heat Gain"
          metric={metrics.solar_gain_kwh}
          positiveIsGood={true}
        />

        {/* 8. Annual Fuel Cost */}
        <MetricCard
          label="Annual Fuel Cost"
          metric={metrics.annual_fuel_cost_inr}
          formatter={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
          deltaFormatter={(d) => `${d > 0 ? '+' : ''}₹${Math.round(d).toLocaleString('en-IN')}`}
          positiveIsGood={false}
        />
      </div>

      {/* Hourly Delta Temperature Strip (Diurnal delta T_variant - T_baseline) */}
      {whatIfResult?.hourly_delta_t && whatIfResult.hourly_delta_t.length === 24 && (
        <div style={{
          backgroundColor: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-2)',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption-size)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}>
              Diurnal Delta Curve: ΔT(t) = Tin,variant(t) − Tin,baseline(t) [°C]
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption-size)',
              color: 'var(--text-muted)',
            }}>
              24-Hour Horizon (00:00 → 23:00)
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(24, 1fr)',
            gap: '2px',
            alignItems: 'flex-end',
            height: '60px',
            backgroundColor: 'var(--surface-1)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
          }}>
            {whatIfResult.hourly_delta_t.map((dT, idx) => {
              const isPositive = dT >= 0;
              const absVal = Math.min(Math.abs(dT), 5.0);
              const heightPct = Math.max(8, (absVal / 5.0) * 100);
              const barColor = isPositive ? 'var(--comfort)' : 'var(--danger)';

              return (
                <div
                  key={idx}
                  title={`Hour ${String(idx).padStart(2, '0')}:00 · ΔT: ${dT > 0 ? '+' : ''}${dT.toFixed(2)} °C`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    height: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: barColor,
                      borderRadius: '1px',
                      opacity: dT === 0 ? 0.3 : 0.85,
                      transition: 'height 0.2s ease',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            marginTop: '4px',
          }}>
            <span>00:00 (Midnight)</span>
            <span>06:00 (Dawn)</span>
            <span>12:00 (Solar Noon)</span>
            <span>18:00 (Dusk)</span>
            <span>23:00</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  metric,
  positiveIsGood = true,
  formatter = null,
  deltaFormatter = null,
}) {
  if (!metric || metric.available === false) {
    return (
      <div
        style={{
          backgroundColor: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          opacity: 0.7,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-body-size)',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}>
          — (Unavailable)
        </span>
      </div>
    );
  }

  const { baseline, variant, delta, unit } = metric;
  const isZero = delta === 0 || delta === 0.0;
  const isFavorable = positiveIsGood ? delta > 0 : delta < 0;

  const bText = formatter ? formatter(baseline) : `${baseline} ${unit}`;
  const vText = formatter ? formatter(variant) : `${variant} ${unit}`;
  const dText = deltaFormatter ? deltaFormatter(delta) : formatDelta(delta, unit);

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-2)',
        border: 'var(--border-width) solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-h3-size)',
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          {vText}
        </span>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption-size)',
            fontWeight: 700,
            color: isZero ? 'var(--text-muted)' : isFavorable ? 'var(--comfort)' : 'var(--danger)',
          }}
        >
          {dText}
        </span>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 2,
      }}>
        <span>Base: {bText}</span>
        <span>Unit: {unit}</span>
      </div>
    </div>
  );
}
