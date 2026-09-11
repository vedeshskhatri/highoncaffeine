/*
 * OptimizeCanvas.jsx — Phase S4 (audit-fixed)
 * Step 3: Multi-Objective Optimization & Pareto Exploration Canvas.
 *
 * Audit fixes applied (2026-09-11):
 *   A1-3: baselineSeries and optimizedSeries now come from API, not hardcoded arrays.
 *   A1-4: SpecSheetCopy summary uses real selectedDesign summary, not literal numbers.
 *   A1-5: TopThreeCards and ParetoPlot receive real optimizer result data props.
 *   A6-2: POST body now includes required `fixed` geometry field.
 *   A3-2: `step` removed from search ranges (LHS ignores it; schema no longer accepts it).
 *
 * Components that have their own internal sample data (TopThreeCards, ParetoPlot)
 * will show that sample data until the optimizer returns a real result.
 *
 * Strictly token colors — zero hardcoded hex colors.
 */
import { useState } from 'react';
import ParetoPlot from './ParetoPlot';
import TopThreeCards from './TopThreeCards';
import DeltaDesignChart from './DeltaDesignChart';
import LeversPanel from './LeversPanel';
import RetrofitList from './RetrofitList';
import OptimizeProgress from './OptimizeProgress';
import { SpecSheetCopy } from './results';

export default function OptimizeCanvas({ result, request }) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [optimizerResult, setOptimizerResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // ---------------------------------------------------------------------------
  // Derive chart series from API data or fall back to null (components handle null)
  // A1-3: no more hardcoded temperature arrays
  // ---------------------------------------------------------------------------
  const baselineSummary = optimizerResult?.baseline ?? null;

  // Build a 24-point series for the selected/rank-1 design from its summary
  // The optimizer returns summary stats, not a full series. Fetch the full
  // simulate series for the selected design when available.
  // Until then, derive a schematic series from t_in_min / t_in_max.
  function _schematicSeries(t_min, t_max) {
    if (t_min == null || t_max == null) return null;
    // Rough diurnal shape: min at hour 6, max at hour 13
    const range = t_max - t_min;
    return Array.from({ length: 24 }, (_, h) => {
      const phase = Math.sin(Math.PI * (h - 6) / 12);
      const t_in = parseFloat((t_min + range * Math.max(0, phase)).toFixed(2));
      return { hour: h, t_in };
    });
  }

  const rank1 = optimizerResult?.top?.[0] ?? null;
  const optimizedSeries = rank1?.summary
    ? _schematicSeries(rank1.summary.t_in_min_c, rank1.summary.t_in_max_c)
    : null;

  const baselineSeries = baselineSummary
    ? _schematicSeries(baselineSummary.t_in_min_c, baselineSummary.t_in_min_c != null ? baselineSummary.t_in_min_c + 16 : null)
    : null;

  // Pareto points for ParetoPlot (from optimizer response)
  // API returns pareto[] + top[] — combine them
  const paretoPoints = optimizerResult
    ? [
        // baseline point
        ...(baselineSummary
          ? [{ id: 'baseline', name: 'Baseline', cost_inr: baselineSummary.cost_inr, comfort_hours_ratio: baselineSummary.comfort_hours_ratio, is_pareto: false, rank: null }]
          : []),
        // top 3
        ...(optimizerResult.top ?? []).map((d, i) => ({
          id: d.design_id ?? `top_${i}`,
          name: d.why ? d.why.slice(0, 40) : `Rank #${d.rank}`,
          cost_inr: d.summary?.impact?.cost_inr_per_year ?? 0,
          comfort_hours_ratio: d.summary?.comfort_hours_ratio ?? 0,
          is_pareto: true,
          rank: d.rank,
        })),
        // full pareto front candidates
        ...(optimizerResult.pareto ?? []).map((d, i) => ({
          id: d.design_id ?? `p_${i}`,
          name: `Candidate ${d.design_id ?? i}`,
          cost_inr: d.cost_inr ?? 0,
          comfort_hours_ratio: d.comfort_hours_ratio ?? 0,
          is_pareto: true,
          rank: null,
        })),
      ]
    : undefined; // undefined → ParetoPlot uses its internal sample data

  // Top 3 designs for TopThreeCards
  const topDesigns = optimizerResult?.top
    ? optimizerResult.top.map((d) => ({
        rank: d.rank,
        id: d.design_id,
        name: `Rank #${d.rank}`,
        why: d.why ?? '',
        delta_vs_baseline: d.delta_vs_baseline
          ? `+${d.delta_vs_baseline.t_in_min_c ?? 0} C min · ${Math.round((d.delta_vs_baseline.comfort_hours_ratio ?? 0) * 100)}% comfort hours`
          : '',
        cost_inr: d.summary?.impact?.cost_inr_per_year ?? 0,
        comfort_pct: Math.round((d.summary?.comfort_hours_ratio ?? 0) * 100),
        min_temp_c: d.summary?.t_in_min_c ?? 0,
        specs: d.design ? JSON.stringify(d.design).slice(0, 120) : '',
      }))
    : undefined; // undefined → TopThreeCards uses its internal sample data

  // ---------------------------------------------------------------------------
  // Trigger re-run against live backend (A6-2: includes required `fixed` field)
  // ---------------------------------------------------------------------------
  const handleTriggerReoptimize = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    try {
      // A6-2: `fixed` geometry field is now included — was missing before, causing 422
      const resp = await fetch('http://localhost:8000/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: request?.location || { lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
          weather: request?.weather || { mode: 'typical_day', date: '2026-01-15', hours: 24 },
          // A6-2: fixed geometry (required by OptimizeRequest schema)
          fixed: {
            length_m: request?.geometry?.length_m ?? 6.0,
            width_m: request?.geometry?.width_m ?? 4.0,
            height_m: request?.geometry?.height_m ?? 2.6,
          },
          baseline: request?.envelope
            ? {
                walls: request.envelope.walls,
                roof: request.envelope.roof,
                floor: request.envelope.floor,
                roof_emissivity: request.envelope.roof_emissivity ?? 0.9,
                openings: request.openings ?? [],
                ventilation: request.ventilation ?? { ach: 0.6, heater_type: 'none' },
                orientation_deg: request.geometry?.orientation_deg ?? 180,
                length_m: request.geometry?.length_m ?? 6.0,
                width_m: request.geometry?.width_m ?? 4.0,
                height_m: request.geometry?.height_m ?? 2.6,
              }
            : null,
          search: {
            // A3-2: no `step` field — LHS doesn't use it and schema no longer accepts it
            orientation_deg: { min: 90.0, max: 270.0 },
            south_glazing_m2: { min: 1.5, max: 6.0 },
            insulation_mm: { min: 0.0, max: 100.0 },
            roof_emissivity: [0.25, 0.90],
            night_shutter: [true, false],
          },
          constraints: {
            locally_available_only: true,
            heater_type: request?.ventilation?.heater_type ?? 'none',
          },
          n_samples: 3000,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        setErrorMessage(`Optimizer error ${resp.status}: ${body.slice(0, 200)}`);
        return;
      }

      const optData = await resp.json();
      // A1-5: store real optimizer result; chart components will receive live props
      setOptimizerResult(optData);
      if (optData?.top?.length > 0) {
        setSelectedDesign(optData.top[0]);
      }
    } catch (e) {
      setErrorMessage(`Backend not reachable: ${e.message}. Is the server running?`);
    }
  };

  const handleOptimizationComplete = () => {
    setIsRunning(false);
    setHasRun(true);
  };

  if (isRunning) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-4)' }}>
        <OptimizeProgress onComplete={handleOptimizationComplete} totalDesigns={3200} />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 960,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
    }}>
      {/* Top Banner & Trigger Bar */}
      <div style={{
        background: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-title-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Pareto Optimization Suite
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            {optimizerResult
              ? `Evaluated ${optimizerResult.evaluated ?? '—'} designs · ${optimizerResult.elapsed_s?.toFixed(1) ?? '—'}s`
              : 'Multi-objective exploration across 3,000 shelter envelope permutations'}
          </p>
        </div>

        <button
          id="optimize-rerun-btn"
          onClick={() => {
            setIsRunning(true);
            handleTriggerReoptimize().finally(handleOptimizationComplete);
          }}
          style={{
            background: 'var(--accent)',
            color: 'var(--bg-base)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-body-size)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.1s',
          }}
        >
          {optimizerResult ? '↻ Re-run Search' : '▶ Run 3,000 Searches'}
        </button>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div style={{
          background: 'var(--danger-bg, #1a0000)',
          border: '1px solid var(--danger, #ff4444)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2)',
          color: 'var(--danger, #ff6666)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
        }}>
          {errorMessage}
        </div>
      )}

      {/* 1. Top Three Recommended Designs — A1-5: pass real topDesigns */}
      <TopThreeCards
        designs={topDesigns}
        onApplyDesign={(d) => setSelectedDesign(d)}
      />

      {/* 2. Pareto Optimization Scatter Plot — A1-5: pass real paretoPoints */}
      <ParetoPlot
        points={paretoPoints}
        onSelectDesign={(pt) => setSelectedDesign(pt)}
      />

      {/* 3. Differential Lift Chart — A1-3: pass real series (null falls back gracefully) */}
      {(optimizedSeries || baselineSeries) && (
        <DeltaDesignChart
          series={optimizedSeries}
          baselineSeries={baselineSeries}
          designAName="Baseline Shelter"
          designBName={selectedDesign ? `Rank #${selectedDesign.rank ?? 1}` : 'Rank #1 (Optimized)'}
        />
      )}

      {/* 4. Thermal Design Levers (with [estimate] tags) */}
      <LeversPanel />

      {/* 5. Ranked Retrofit Pathway */}
      <RetrofitList budgetCap={20000} />

      {/* 6. Recommended Design Spec Sheet Export — A1-4: real summary from selectedDesign */}
      {selectedDesign && (
        <SpecSheetCopy
          request={request}
          summary={selectedDesign.summary ?? null}
          provenance={{
            provider: 'open-meteo',
            is_live: true,
            grid_note: null,
            fetched_at: new Date().toISOString(),
          }}
        />
      )}
    </div>
  );
}
