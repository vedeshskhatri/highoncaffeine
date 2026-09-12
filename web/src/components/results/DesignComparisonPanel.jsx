import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DesignComparisonPanel.jsx — Phase 4: Design Comparison
 *
 * Requirements:
 *  - Compare 2 to 4 independently simulated shelter designs.
 *  - Display only authoritative metrics returned by the backend:
 *      * Peak Tin (°C)
 *      * Minimum Tin (°C)
 *      * Comfort hours (hours & ratio)
 *      * Heating demand (L/night fuel & kWh/night energy)
 *      * Capital cost with explicit basis: SOURCED / ESTIMATE / UNAVAILABLE
 *      * Safety status: SAFE / REFUSED
 *  - Multi-criteria rankings:
 *      * 🏆 Best Thermal Comfort (highest comfort ratio, tie-break: max min Tin)
 *      * 💰 Lowest Cost (lowest capital cost among safe designs with known cost)
 *      * ⚖️ Best Trade-Off (Pareto Knee Point via Normalized Utopia Distance)
 *  - Safety interlock: Any REFUSED design is disqualified from rankings.
 *  - Interactive diurnal 24-hour temperature overlay chart for all compared designs.
 *  - No client-side physics calculations; server remains authoritative.
 */

const COLOR_PALETTE = [
  { stroke: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', label: 'Design A' },
  { stroke: '#059669', bg: 'rgba(5, 150, 105, 0.12)', label: 'Design B' },
  { stroke: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', label: 'Design C' },
  { stroke: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', label: 'Design D' },
];

// Curated Comparison Preset Scenarios
const PRESET_SCENARIOS = {
  insulation_tradeoff: {
    id: 'insulation_tradeoff',
    title: 'Insulation & Solar Aperture (3 Designs)',
    description: 'Compares baseline against high-insulation and direct-gain passive solar configurations.',
    names: ['Baseline Shelter', 'Super-Insulated Arctic', 'Direct-Gain High Mass'],
    buildDesigns: (baseReq) => {
      const d1 = JSON.parse(JSON.stringify(baseReq));
      d1.envelope.walls = [
        { material: 'mud_brick', thickness_m: 0.30 },
        { material: 'eps', thickness_m: 0.05 },
      ];

      const d2 = JSON.parse(JSON.stringify(baseReq));
      d2.envelope.walls = [
        { material: 'mud_brick', thickness_m: 0.30 },
        { material: 'eps', thickness_m: 0.15 },
      ];
      d2.openings[0].night_shutter = true;
      d2.ventilation.ach = 0.5;

      const d3 = JSON.parse(JSON.stringify(baseReq));
      d3.envelope.walls = [
        { material: 'rammed_earth', thickness_m: 0.40 },
        { material: 'eps', thickness_m: 0.05 },
      ];
      d3.openings[0].area_m2 = 8.0;
      d3.openings[0].night_shutter = false;

      return [d1, d2, d3];
    },
  },

  materials_cost_basis: {
    id: 'materials_cost_basis',
    title: 'Materials & Cost Uncertainty (3 Designs)',
    description: 'Demonstrates SOURCED vs ESTIMATE cost basis with conventional vs bio-based vs composite walls.',
    names: ['Sourced Mud + EPS', 'Straw Bale Eco-Wall (Estimate)', 'Lightweight PUF Sandwich'],
    buildDesigns: (baseReq) => {
      const d1 = JSON.parse(JSON.stringify(baseReq));
      d1.envelope.walls = [
        { material: 'mud_brick', thickness_m: 0.30 },
        { material: 'eps', thickness_m: 0.05 },
      ];

      const d2 = JSON.parse(JSON.stringify(baseReq));
      d2.envelope.walls = [
        { material: 'mud_brick', thickness_m: 0.20 },
        { material: 'straw_bale', thickness_m: 0.20 },
      ];

      const d3 = JSON.parse(JSON.stringify(baseReq));
      d3.envelope.walls = [
        { material: 'puf_sandwich', thickness_m: 0.10 },
      ];

      return [d1, d2, d3];
    },
  },

  safety_interlock: {
    id: 'safety_interlock',
    title: 'Safety Interlock Refusal (2 Designs)',
    description: 'Evaluates safe ventilation (ACH 0.60) against hazardous low-ventilation combustion heating (ACH 0.20).',
    names: ['Safe Electric Heat (ACH 0.6)', 'Unvented Combustion (ACH 0.20 - Unsafe)'],
    buildDesigns: (baseReq) => {
      const d1 = JSON.parse(JSON.stringify(baseReq));
      d1.ventilation = { ach: 0.6, heater_type: 'electric' };

      const d2 = JSON.parse(JSON.stringify(baseReq));
      d2.ventilation = { ach: 0.20, heater_type: 'kerosene' };

      return [d1, d2];
    },
  },
};

// Fallback Baseline Request
const DEFAULT_REQUEST = {
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

export default function DesignComparisonPanel({ request, baselineResult }) {
  const effectiveRequest = request || DEFAULT_REQUEST;

  const [activeScenario, setActiveScenario] = useState('insulation_tradeoff');
  const [designConfigs, setDesignConfigs] = useState(() => {
    return PRESET_SCENARIOS.insulation_tradeoff.buildDesigns(effectiveRequest);
  });
  const [designNames, setDesignNames] = useState(() => {
    return PRESET_SCENARIOS.insulation_tradeoff.names;
  });

  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredHour, setHoveredHour] = useState(null);

  const reqIdRef = useRef(0);

  // Switch Scenario Presets
  const handleSelectScenario = (scenarioKey) => {
    const scenario = PRESET_SCENARIOS[scenarioKey];
    if (!scenario) return;
    setActiveScenario(scenarioKey);
    const newDesigns = scenario.buildDesigns(effectiveRequest);
    setDesignConfigs(newDesigns);
    setDesignNames([...scenario.names]);
  };

  // Add a 4th design if fewer than 4
  const handleAddDesign = () => {
    if (designConfigs.length >= 4) return;
    const nextIdx = designConfigs.length;
    const clone = JSON.parse(JSON.stringify(designConfigs[designConfigs.length - 1]));
    // Give slight variation so it's distinct
    if (clone.envelope?.walls?.length > 0) {
      clone.envelope.walls[0].thickness_m = Math.min(0.60, clone.envelope.walls[0].thickness_m + 0.10);
    }
    setDesignConfigs([...designConfigs, clone]);
    setDesignNames([...designNames, `Design ${chr(65 + nextIdx)}`]);
  };

  // Remove a design down to minimum 2
  const handleRemoveDesign = (indexToRemove) => {
    if (designConfigs.length <= 2) return;
    const newConfigs = designConfigs.filter((_, idx) => idx !== indexToRemove);
    const newNames = designNames.filter((_, idx) => idx !== indexToRemove);
    setDesignConfigs(newConfigs);
    setDesignNames(newNames);
  };

  // Update Design Name
  const handleNameChange = (idx, newName) => {
    const updated = [...designNames];
    updated[idx] = newName;
    setDesignNames(updated);
  };

  // Run Authoritative Backend Comparison
  const runComparison = useCallback(async () => {
    if (designConfigs.length < 2 || designConfigs.length > 4) {
      setError('Design comparison requires 2 to 4 designs.');
      return;
    }

    setLoading(true);
    setError(null);
    const thisReqId = ++reqIdRef.current;

    try {
      const payload = {
        designs: designConfigs,
        design_names: designNames,
      };

      const res = await fetch('/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Comparison failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (thisReqId === reqIdRef.current) {
        setComparisonData(data);
        setLoading(false);
      }
    } catch (err) {
      if (thisReqId === reqIdRef.current) {
        setError(err.message || 'Error communicating with comparison server.');
        setLoading(false);
      }
    }
  }, [designConfigs, designNames]);

  // Execute comparison on mount and when designs change
  useEffect(() => {
    runComparison();
  }, [runComparison]);

  const designs = comparisonData?.designs || [];
  const rankings = comparisonData?.rankings || {};
  const hourlySeries = comparisonData?.hourly_series || {};

  // Best trade-off, comfort, and cost designs
  const bestComfortDesign = designs.find((d) => d.id === rankings.best_comfort_id);
  const lowestCostDesign = designs.find((d) => d.id === rankings.lowest_cost_id);
  const bestTradeoffDesign = designs.find((d) => d.id === rankings.best_tradeoff_id);

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
      id="design-comparison-panel"
    >
      {/* 1. Header & Title Strip */}
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
            PHASE 4 · MULTI-CRITERIA DECISION SUPPORT
          </div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-h3-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Multi-Design Thermal &amp; Economic Comparison
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-body-size)',
            color: 'var(--text-secondary)',
            margin: 'var(--space-1) 0 0 0',
          }}>
            Simulate 2 to 4 shelter designs side-by-side with authoritative server physics, transparent cost basis, and safety interlocks.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {designConfigs.length < 4 && (
            <button
              type="button"
              onClick={handleAddDesign}
              disabled={loading}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-primary)',
                border: 'var(--border-width) solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              + Add Design
            </button>
          )}

          <button
            type="button"
            onClick={runComparison}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption-size)',
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            {loading ? 'Simulating...' : '↻ Re-Evaluate'}
          </button>
        </div>
      </div>

      {/* 2. Preset Scenario Selector Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        backgroundColor: 'var(--surface-2)',
        padding: 'var(--space-2)',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--border)',
      }}>
        {Object.entries(PRESET_SCENARIOS).map(([key, sc]) => {
          const isActive = activeScenario === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectScenario(key)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-caption-size)',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: isActive ? 'var(--surface-1)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? 'var(--border-width) solid var(--border-strong)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {sc.title}
            </button>
          );
        })}
      </div>

      {/* 3. Error Banner */}
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

      {/* 4. Multi-Criteria Ranking Badges (Headline Winners) */}
      {designs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-3)',
        }}>
          {/* Best Thermal Comfort */}
          <div style={{
            backgroundColor: 'var(--surface-2)',
            border: 'var(--border-width) solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            borderLeft: '4px solid var(--comfort)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--comfort)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                🏆 Best Thermal Comfort
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--text-muted)',
              }}>
                Highest Comfort Ratio
              </span>
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-subhead-size)',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}>
              {bestComfortDesign ? bestComfortDesign.name : 'None (All Refused)'}
            </div>
            {bestComfortDesign && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-1)',
              }}>
                Comfort: {((bestComfortDesign.comfort_hours_ratio || 0) * 100).toFixed(1)}% ({bestComfortDesign.comfort_hours}h) · Min Tin: {bestComfortDesign.t_in_min_c !== null ? `${bestComfortDesign.t_in_min_c} °C` : '—'}
              </div>
            )}
          </div>

          {/* Lowest Capital Cost */}
          <div style={{
            backgroundColor: 'var(--surface-2)',
            border: 'var(--border-width) solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            borderLeft: '4px solid var(--accent)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                💰 Lowest Cost
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--text-muted)',
              }}>
                Safe Designs Only
              </span>
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-subhead-size)',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}>
              {lowestCostDesign ? lowestCostDesign.name : 'Cost Data Unavailable'}
            </div>
            {lowestCostDesign && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-1)',
              }}>
                Capital: ₹{Number(lowestCostDesign.capital_cost_inr).toLocaleString('en-IN')} ({lowestCostDesign.cost_basis})
              </div>
            )}
          </div>

          {/* Best Trade-Off (Pareto Knee Point) */}
          <div style={{
            backgroundColor: 'var(--surface-2)',
            border: 'var(--border-width) solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            borderLeft: '4px solid #7c3aed',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: '#7c3aed',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                ⚖️ Best Trade-Off
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--text-muted)',
              }}>
                Pareto Knee Point
              </span>
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-subhead-size)',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}>
              {bestTradeoffDesign ? bestTradeoffDesign.name : 'Requires Cost & Comfort Data'}
            </div>
            {bestTradeoffDesign && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption-size)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-1)',
              }}>
                Utopia Distance: {bestTradeoffDesign.utopia_distance !== undefined ? bestTradeoffDesign.utopia_distance : '—'} (Norm. Euclidean)
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Multi-Column Comparison Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(2, designs.length || designConfigs.length)}, 1fr)`,
        gap: 'var(--space-3)',
        overflowX: 'auto',
      }}>
        {(designs.length > 0 ? designs : designConfigs.map((cfg, idx) => ({
          id: `design_${idx + 1}`,
          name: designNames[idx] || `Design ${chr(65 + idx)}`,
          safety_status: 'SAFE',
          cost_basis: 'ESTIMATE',
        }))).map((item, idx) => {
          const colorMeta = COLOR_PALETTE[idx % COLOR_PALETTE.length];
          const isRefused = item.safety_status === 'REFUSED';

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--surface-2)',
                border: item.is_best_tradeoff
                  ? '2px solid #7c3aed'
                  : 'var(--border-width) solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                position: 'relative',
              }}
            >
              {/* Card Header & Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: colorMeta.stroke,
                      display: 'inline-block',
                    }}
                  />
                  <input
                    type="text"
                    value={designNames[idx] || item.name}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--text-body-size)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px dashed var(--border-strong)',
                      padding: '2px',
                      maxWidth: '160px',
                    }}
                  />
                </div>

                {designConfigs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDesign(idx)}
                    title="Remove this design"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-caption-size)',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Chips Strip */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {/* Safety Status */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isRefused ? 'rgba(239, 68, 68, 0.2)' : 'rgba(74, 124, 89, 0.2)',
                    color: isRefused ? 'var(--danger)' : 'var(--comfort)',
                    fontWeight: 600,
                  }}
                >
                  {isRefused ? '✕ REFUSED' : '✓ SAFE'}
                </span>

                {/* Cost Basis Chip */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      item.cost_basis === 'SOURCED'
                        ? 'rgba(74, 124, 89, 0.15)'
                        : item.cost_basis === 'ESTIMATE'
                        ? 'rgba(247, 115, 49, 0.15)'
                        : 'rgba(154, 140, 132, 0.15)',
                    color:
                      item.cost_basis === 'SOURCED'
                        ? 'var(--comfort)'
                        : item.cost_basis === 'ESTIMATE'
                        ? 'var(--accent)'
                        : 'var(--text-muted)',
                  }}
                  title={
                    item.cost_basis === 'SOURCED'
                      ? 'All envelope materials cited in CPWD DSR 2023'
                      : item.cost_basis === 'ESTIMATE'
                      ? 'Material cost derived from empirical or default fallback rates'
                      : 'Capital cost data unavailable'
                  }
                >
                  {item.cost_basis || 'ESTIMATE'}
                </span>

                {/* Winner Pill */}
                {item.is_best_tradeoff && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(124, 58, 237, 0.2)',
                      color: '#7c3aed',
                      fontWeight: 600,
                    }}
                  >
                    ⚖️ BEST TRADE-OFF
                  </span>
                )}
                {item.is_best_comfort && !item.is_best_tradeoff && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(74, 124, 89, 0.2)',
                      color: 'var(--comfort)',
                      fontWeight: 600,
                    }}
                  >
                    🏆 BEST COMFORT
                  </span>
                )}
                {item.is_lowest_cost && !item.is_best_tradeoff && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(247, 115, 49, 0.2)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                    }}
                  >
                    💰 LOWEST COST
                  </span>
                )}
              </div>

              {/* Refusal Warning Callout */}
              {isRefused && item.refusal_reason && (
                <div style={{
                  padding: '6px 8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: 'var(--danger)',
                  lineHeight: 1.3,
                }}>
                  Refusal: {item.refusal_reason}
                </div>
              )}

              {/* Metric Breakdown Rows */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: 'var(--space-1)',
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--space-2)',
              }}>
                {/* 1. Minimum Indoor Temp */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Min Temp (Dawn)
                  </span>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: item.t_in_min_c !== null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {item.t_in_min_c !== null && item.t_in_min_c !== undefined ? `${item.t_in_min_c} °C` : '—'}
                  </span>
                </div>

                {/* 2. Peak Indoor Temp */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Peak Temp
                  </span>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: item.t_in_max_c !== null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {item.t_in_max_c !== null && item.t_in_max_c !== undefined ? `${item.t_in_max_c} °C` : '—'}
                  </span>
                </div>

                {/* 3. Comfort Hours Ratio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Comfort Hours
                  </span>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: item.comfort_hours_ratio !== null ? 'var(--comfort)' : 'var(--text-muted)' }}>
                    {item.comfort_hours_ratio !== null && item.comfort_hours_ratio !== undefined
                      ? `${(item.comfort_hours_ratio * 100).toFixed(1)}% (${item.comfort_hours}h)`
                      : '—'}
                  </span>
                </div>

                {/* 4. Hours Below Health Threshold */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Below 18°C Risk
                  </span>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--danger)' }}>
                    {item.hours_below_health !== null && item.hours_below_health !== undefined ? `${item.hours_below_health} hrs` : '—'}
                  </span>
                </div>

                {/* 5. Heating Demand (Kerosene L/night) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Fuel Demand
                  </span>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {item.heating_demand_litres !== null && item.heating_demand_litres !== undefined ? `${item.heating_demand_litres} L/night` : '0.00 L'}
                  </span>
                </div>

                {/* 6. Capital Cost */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Capital Cost
                  </span>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                    {item.capital_cost_inr !== null && item.capital_cost_inr !== undefined
                      ? `₹${Number(item.capital_cost_inr).toLocaleString('en-IN')}`
                      : 'Unavailable'}
                  </span>
                </div>

                {/* 7. Total Heat Loss */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Total Heat Loss
                  </span>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {item.total_heat_loss_kwh !== null && item.total_heat_loss_kwh !== undefined ? `${item.total_heat_loss_kwh} kWh` : '—'}
                  </span>
                </div>

                {/* 8. Solar Gain */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Solar Gain
                  </span>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {item.solar_gain_kwh !== null && item.solar_gain_kwh !== undefined ? `${item.solar_gain_kwh} kWh` : '—'}
                  </span>
                </div>

                {/* 9. Utopia Distance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#7c3aed' }}>
                    Utopia Dist D_i
                  </span>
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>
                    {item.utopia_distance !== null && item.utopia_distance !== undefined ? item.utopia_distance : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Diurnal Temperature Overlay Curves (24-Hour Horizon) */}
      <div style={{
        backgroundColor: 'var(--surface-2)',
        border: 'var(--border-width) solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-body-size)',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Diurnal Temperature Profiles: Tin(t) vs Tout(t)
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption-size)',
              color: 'var(--text-muted)',
            }}>
              24-Hour Horizon (00:00 to 23:00) with Comfort Threshold (18°C)
            </div>
          </div>

          {/* Interactive Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
            {/* Outdoor Tout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 16, height: 2, backgroundColor: '#94a3b8', display: 'inline-block', borderTop: '2px dashed #94a3b8' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                Outdoor Tout
              </span>
            </div>

            {/* Comfort Line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 16, height: 2, backgroundColor: 'var(--comfort)', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--comfort)' }}>
                Comfort (18°C)
              </span>
            </div>

            {/* Compared Designs */}
            {designs.map((d, idx) => {
              const colorMeta = COLOR_PALETTE[idx % COLOR_PALETTE.length];
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: colorMeta.stroke, display: 'inline-block' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {d.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG Chart */}
        <ComparisonDiurnalChart
          designs={designs}
          hourlySeries={hourlySeries}
          hoveredHour={hoveredHour}
          onHoverHour={setHoveredHour}
        />
      </div>

      {/* 7. Mathematical Formulation Footnote */}
      <div style={{
        padding: 'var(--space-3)',
        backgroundColor: 'var(--surface-2)',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Authoritative Formulation &amp; Transparency:
        </div>
        <div>
          • <strong>Best Thermal Comfort:</strong> Highest 24-hour comfort hours ratio (tie-breaker: maximum dawn minimum Tin).
        </div>
        <div>
          • <strong>Lowest Cost:</strong> Minimum capital expenditure in INR among safe designs with verified or estimated cost.
        </div>
        <div>
          • <strong>Best Trade-Off (Pareto Knee Point):</strong> Evaluated via <em>Normalized Euclidean Distance to Utopia Point (C*=1.0, K*=0.0)</em>:
          <span className="mono" style={{ marginLeft: '6px', color: '#7c3aed' }}>
            D_i = √[ (1.0 − c_i*)^2 + (k_i* − 0.0)^2 ]
          </span>
          , where <span className="mono">c_i* = (C_i − C_min) / (C_max − C_min)</span> and <span className="mono">k_i* = (K_i − K_min) / (K_max − K_min)</span>.
          No arbitrary or subjective weights are applied.
        </div>
        <div>
          • <strong>Safety Interlock:</strong> Designs failing ventilation thresholds (e.g., unvented combustion with ACH &lt; 0.35) are marked <span style={{ color: 'var(--danger)', fontWeight: 600 }}>REFUSED</span> and disqualified from winning rankings.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Diurnal Temperature Overlay Chart
// ---------------------------------------------------------------------------
function ComparisonDiurnalChart({ designs, hourlySeries, hoveredHour, onHoverHour }) {
  const width = 880;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Determine global temperature bounds across all series
  let allTemps = [-15, 25]; // baseline fallback
  if (hourlySeries.t_out && hourlySeries.t_out.length === 24) {
    allTemps.push(...hourlySeries.t_out);
  }
  designs.forEach((d) => {
    const s = hourlySeries[d.id];
    if (Array.isArray(s)) {
      allTemps.push(...s);
    }
  });

  const minTemp = Math.floor(Math.min(...allTemps) - 2);
  const maxTemp = Math.ceil(Math.max(...allTemps) + 2);
  const tempRange = maxTemp - minTemp || 1;

  const getX = (hour) => padding.left + (hour / 23) * plotWidth;
  const getY = (temp) => padding.top + plotHeight - ((temp - minTemp) / tempRange) * plotHeight;

  // Build SVG path from 24-point array
  const buildPath = (curve) => {
    if (!curve || curve.length !== 24) return '';
    return curve
      .map((t, h) => `${h === 0 ? 'M' : 'L'} ${getX(h).toFixed(1)} ${getY(t).toFixed(1)}`)
      .join(' ');
  };

  const comfortY = getY(18.0);
  const freezingY = getY(0.0);

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => onHoverHour(null)}
      >
        {/* Horizontal grid lines and temperature labels */}
        {[-20, -10, 0, 10, 18, 25].filter((t) => t >= minTemp && t <= maxTemp).map((t) => {
          const y = getY(t);
          const isComfort = t === 18;
          const isFreezing = t === 0;

          return (
            <g key={t}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isComfort ? 'var(--comfort)' : isFreezing ? 'var(--danger)' : 'var(--border)'}
                strokeDasharray={isComfort ? '4,4' : isFreezing ? '2,2' : 'none'}
                strokeWidth={isComfort ? 1.5 : 1}
                opacity={0.7}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize="10"
                fill={isComfort ? 'var(--comfort)' : isFreezing ? 'var(--danger)' : 'var(--text-muted)'}
              >
                {t}°C
              </text>
            </g>
          );
        })}

        {/* Vertical hour markers */}
        {[0, 4, 8, 12, 16, 20, 23].map((h) => {
          const x = getX(h);
          return (
            <g key={h}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="var(--border)"
                strokeDasharray="2,4"
                opacity={0.5}
              />
              <text
                x={x}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {String(h).padStart(2, '0')}:00
              </text>
            </g>
          );
        })}

        {/* Ambient Outdoor Tout Series */}
        {hourlySeries.t_out && (
          <path
            d={buildPath(hourlySeries.t_out)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.75"
            strokeDasharray="4,4"
            opacity={0.8}
          />
        )}

        {/* Each Design Series */}
        {designs.map((d, idx) => {
          const s = hourlySeries[d.id];
          if (!s || s.length !== 24) return null;
          const colorMeta = COLOR_PALETTE[idx % COLOR_PALETTE.length];

          return (
            <path
              key={d.id}
              d={buildPath(s)}
              fill="none"
              stroke={colorMeta.stroke}
              strokeWidth={d.is_best_tradeoff ? 3.0 : 2.0}
              opacity={0.9}
            />
          );
        })}

        {/* Hover Crosshair Column */}
        {hoveredHour !== null && (
          <g>
            <line
              x1={getX(hoveredHour)}
              y1={padding.top}
              x2={getX(hoveredHour)}
              y2={height - padding.bottom}
              stroke="var(--text-primary)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Dots for each curve at hovered hour */}
            {designs.map((d, idx) => {
              const s = hourlySeries[d.id];
              if (!s || s[hoveredHour] === undefined) return null;
              const colorMeta = COLOR_PALETTE[idx % COLOR_PALETTE.length];
              return (
                <circle
                  key={d.id}
                  cx={getX(hoveredHour)}
                  cy={getY(s[hoveredHour])}
                  r="4"
                  fill={colorMeta.stroke}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        )}

        {/* Transparent Interactive Overlay Rects for Hover */}
        {Array.from({ length: 24 }).map((_, h) => {
          const xStart = h === 0 ? padding.left : getX(h - 0.5);
          const xEnd = h === 23 ? width - padding.right : getX(h + 0.5);
          return (
            <rect
              key={h}
              x={xStart}
              y={padding.top}
              width={xEnd - xStart}
              height={plotHeight}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => onHoverHour(h)}
            />
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredHour !== null && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Hour {String(hoveredHour).padStart(2, '0')}:00
          </div>
          {hourlySeries.t_out && (
            <div style={{ color: '#94a3b8' }}>
              Outdoor Tout: {hourlySeries.t_out[hoveredHour]}°C
            </div>
          )}
          {designs.map((d, idx) => {
            const s = hourlySeries[d.id];
            if (!s || s[hoveredHour] === undefined) return null;
            const colorMeta = COLOR_PALETTE[idx % COLOR_PALETTE.length];
            return (
              <div key={d.id} style={{ color: colorMeta.stroke }}>
                {d.name}: {s[hoveredHour]}°C
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chr(code) {
  return String.fromCharCode(code);
}
