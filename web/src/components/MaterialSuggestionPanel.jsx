/*
 * MaterialSuggestionPanel.jsx — Requirement-First Material Suggestion
 * SIH 2026, PS 26051, DRDO — Phase M1
 *
 * "I need ___ °C inside when it is ___ °C outside."
 * Inverts the optimizer to compute envelope build-ups from real physics and weather.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ArrowRight,
  Layers,
  ShieldAlert,
  Loader2,
  Info,
} from 'lucide-react';
import './MaterialSuggestionPanel.css';

export default function MaterialSuggestionPanel({
  isOpen,
  onClose,
  request,
  onApplyBuildUp,
}) {
  const [targetIndoorC, setTargetIndoorC] = useState(20.0);
  const [designOutdoorC, setDesignOutdoorC] = useState(-20.0);
  const [useSiteP1, setUseSiteP1] = useState(false);
  const [locallyOnly, setLocallyOnly] = useState(false);
  const [maxBudgetInr, setMaxBudgetInr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedRank, setSelectedRank] = useState(1);

  // Sync P1 design temp if checkbox checked
  useEffect(() => {
    if (useSiteP1) {
      // In Leh winter P1 night, design ambient typically reaches -20°C to -24°C
      // We pass null to let the backend resolve the exact NASA POWER P1 night
      setDesignOutdoorC(-20.0);
    }
  }, [useSiteP1]);

  const handleCompute = useCallback(async () => {
    setLoading(true);
    setError(null);

    const payload = {
      target_indoor_c: Number(targetIndoorC),
      design_outdoor_c: useSiteP1 ? null : Number(designOutdoorC),
      location: request?.location || { lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
      geometry: request?.geometry || { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180 },
      occupancy: request?.occupancy || { people: 8, watts_per_person: 100 },
      max_cost_inr: maxBudgetInr ? Number(maxBudgetInr) : null,
      locally_available_only: Boolean(locallyOnly),
    };

    try {
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
        const errText = await resp.text();
        throw new Error(`Server returned ${resp.status}: ${errText}`);
      }

      const json = await resp.json();
      setData(json);
      setSelectedRank(1);
    } catch (err) {
      console.error('Failed to compute material suggestions:', err);
      setError(err.message || 'Simulation failed to evaluate envelopes');
    } finally {
      setLoading(false);
    }
  }, [targetIndoorC, designOutdoorC, useSiteP1, request, maxBudgetInr, locallyOnly]);

  const handleApply = (recommendation) => {
    if (!recommendation?.buildup) return;
    const b = recommendation.buildup;

    const newWalls = b.walls.map(w => ({
      material: w.material_id,
      thickness_m: w.thickness_m,
    }));

    const newRoof = b.roof.map(r => ({
      material: r.material_id,
      thickness_m: r.thickness_m,
    }));

    const newFloor = b.floor.map(f => ({
      material: f.material_id,
      thickness_m: f.thickness_m,
    }));

    const newOpenings = [
      {
        facing: 'south',
        area_m2: request?.openings?.[0]?.area_m2 || 4.0,
        glazing: b?.glazing?.glazing_id || b?.glazing?.glazing_type || 'double_pane',
        night_shutter: Boolean(b?.glazing?.night_shutter),
      },
    ];

    if (onApplyBuildUp) {
      onApplyBuildUp({
        envelope: {
          walls: newWalls,
          roof: newRoof,
          floor: newFloor,
          roof_emissivity: 0.90,
        },
        openings: newOpenings,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="material-suggestion-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="material-suggestion-container"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        >
          {/* Header */}
          <div className="ms-header">
            <div className="ms-header-title-row">
              <div className="ms-badge">
                <Sparkles size={13} />
                <span>EVALUATOR ASK &middot; PHASE M1</span>
              </div>
              <button className="ms-close-btn" onClick={onClose} aria-label="Close Material Suggestion">
                <X size={16} />
              </button>
            </div>
            <h2 className="ms-title">Material Suggestion Engine</h2>
            <p className="ms-subtitle">
              Inverts the solver: state your thermal requirement and the engine computes the required envelope build-up from real weather and cited materials.
            </p>
          </div>

          {/* Form: Requirement-First */}
          <div className="ms-form-card">
            <div className="ms-requirement-headline">
              &ldquo;I need{' '}
              <input
                type="number"
                step="0.5"
                className="ms-inline-input"
                value={targetIndoorC}
                onChange={e => setTargetIndoorC(e.target.value)}
                aria-label="Target Indoor Temperature"
              />{' '}
              &deg;C inside when it is{' '}
              <input
                type="number"
                step="0.5"
                disabled={useSiteP1}
                className={`ms-inline-input ${useSiteP1 ? 'disabled' : ''}`}
                value={designOutdoorC}
                onChange={e => setDesignOutdoorC(e.target.value)}
                aria-label="Design Outdoor Temperature"
              />{' '}
              &deg;C outside.&rdquo;
            </div>

            {/* Checkbox row */}
            <div className="ms-options-grid">
              <label className="ms-checkbox-label">
                <input
                  type="checkbox"
                  checked={useSiteP1}
                  onChange={e => setUseSiteP1(e.target.checked)}
                />
                <span>Use Site P1 Winter Night (-20.0&deg;C at Leh)</span>
              </label>

              <label className="ms-checkbox-label">
                <input
                  type="checkbox"
                  checked={locallyOnly}
                  onChange={e => setLocallyOnly(e.target.checked)}
                />
                <span>Locally Available Materials Only</span>
              </label>

              <div className="ms-budget-row">
                <span className="ms-budget-label">Max Budget:</span>
                <input
                  type="number"
                  placeholder="Optional limit (INR)"
                  className="ms-budget-input"
                  value={maxBudgetInr}
                  onChange={e => setMaxBudgetInr(e.target.value)}
                />
              </div>
            </div>

            <button
              className="ms-submit-btn"
              onClick={handleCompute}
              disabled={loading}
              id="btn-compute-materials"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="ms-spinner" />
                  <span>Solving 144 Diurnal Envelopes...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Compute Material Recommendations</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="ms-error-alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Results section */}
          {data && (
            <div className="ms-results-section">
              {/* Honest Negative Result Banner */}
              {!data.all_met_passively && (
                <div className="ms-negative-banner">
                  <div className="ms-negative-header">
                    <ShieldAlert size={18} />
                    <strong>Honest Engineering Result: Passive Boundary Exceeded</strong>
                  </div>
                  <p className="ms-negative-text">
                    &ldquo;{data.recommendations?.[0]?.backup_heat?.summary_note ||
                      `The best passive design reaches +${data.recommendations?.[0]?.achieved_indoor_c_min?.toFixed(1)} \u00b0C. The remaining deficit requires backup heating.`}&rdquo;
                  </p>
                </div>
              )}

              {/* Three Specification Cards */}
              <div className="ms-cards-header">
                <h3>Recommended Specifications ({data.recommendations?.length || 0})</h3>
                <span className="ms-cards-meta">
                  Sorted by {data.all_met_passively ? 'Cost (Low to High)' : 'Thermal Performance'} &middot; Full Layer Stacks
                </span>
              </div>

              <div className="ms-cards-list">
                {data.recommendations?.map((rec) => {
                  const isSelected = selectedRank === rec.rank;
                  const isMet = rec.target_met;
                  const b = rec.buildup;

                  return (
                    <div
                      key={rec.rank}
                      className={`ms-spec-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRank(rec.rank)}
                    >
                      <div className="ms-card-top">
                        <div className="ms-rank-badge">
                          <span>Rank #{rec.rank}</span>
                          <span className="ms-rank-sub">
                            {rec.rank === 1 ? (isMet ? 'Best Value' : 'Highest Passive Retention') : `Option ${rec.rank}`}
                          </span>
                        </div>
                        <div className="ms-card-badges">
                          <span className={`ms-temp-badge ${isMet ? 'met' : 'gap'}`}>
                            Achieves {rec.achieved_indoor_c_min?.toFixed(1)}&deg;C
                          </span>
                          <span className="ms-cost-badge">
                            &#8377;{Math.round(rec.estimated_cost_inr).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="ms-primary-material">
                        <strong>{rec.primary_wall_material}</strong>
                        <span className="ms-wall-type">{rec.wall_description}</span>
                      </div>

                      {/* Backup Heat Details if unachieved */}
                      {!isMet && rec.backup_heat && (
                        <div className="ms-backup-box">
                          <div className="ms-backup-row">
                            <Flame size={14} className="ms-flame-icon" />
                            <span>Deficit: <strong>{rec.residual_gap_c?.toFixed(1)}&deg;C</strong></span>
                            <span>&middot;</span>
                            <span>Heater: <strong>{rec.backup_heat.required_kw?.toFixed(1)} kW</strong></span>
                            <span>&middot;</span>
                            <span>{rec.backup_heat.operating_hours_per_night} hrs/night</span>
                          </div>
                          <div className="ms-backup-fuel">
                            Kerosene Backup: <strong>{rec.backup_heat.kerosene_liters_per_night?.toFixed(1)} L/night</strong>
                          </div>
                        </div>
                      )}

                      {/* Full Layer Stack */}
                      <div className="ms-buildup-layers">
                        <div className="ms-layer-group">
                          <span className="ms-group-label">Wall Layers:</span>
                          <div className="ms-group-items">
                            {b.walls.map((w, idx) => (
                              <div key={idx} className="ms-layer-chip">
                                <span className="ms-chip-name">{w.material_name}</span>
                                <span className="ms-chip-thick">{Math.round(w.thickness_m * 1000)}mm</span>
                                <span className="ms-chip-k">k={w.thermal_conductivity_w_mk}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="ms-layer-group">
                          <span className="ms-group-label">Roof &amp; Glazing:</span>
                          <div className="ms-group-items">
                            {b.roof.map((r, idx) => (
                              <div key={idx} className="ms-layer-chip">
                                <span className="ms-chip-name">{r.material_name}</span>
                                <span className="ms-chip-thick">{Math.round(r.thickness_m * 1000)}mm</span>
                              </div>
                            ))}
                            <div className="ms-layer-chip accent">
                              <span className="ms-chip-name">
                                {b?.glazing?.name || (b?.glazing?.glazing_id || b?.glazing?.glazing_type || 'double_pane').replace(/_/g, ' ')}
                              </span>
                              {b?.glazing?.night_shutter && (
                                <span className="ms-chip-shutter">+ Night Shutter</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Apply button */}
                      <div className="ms-card-footer">
                        <button
                          className="ms-apply-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(rec);
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Apply to 3D Model</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
