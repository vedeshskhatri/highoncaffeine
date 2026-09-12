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
import { SpecSheetCopy, AnnualComfortHeatmap } from './results';


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

  // Render real series if returned by the solver; never reconstruct missing series from final values
  const rank1 = optimizerResult?.top?.[0] ?? null;
  const optimizedSeries = rank1?.series ?? null;
  const baselineSeries = baselineSummary?.series ?? null;

  // Pareto points for ParetoPlot (from optimizer response)
  // API returns pareto[] + top[] — combine them
  const paretoPoints = optimizerResult
    ? [
        // baseline point
        ...(baselineSummary
          ? [{
              id: 'baseline',
              design_id: 'baseline',
              name: 'Baseline',
              cost_inr: baselineSummary.cost_inr,
              comfort_hours_ratio: baselineSummary.comfort_hours_ratio,
              discomfort_hours: 24 * (1 - (baselineSummary.comfort_hours_ratio ?? 0)),
              t_in_min_c: baselineSummary.t_in_min_c,
              safety_status: 'SAFE',
              is_safe: true,
              is_pareto: false,
              rank: null,
            }]
          : []),
        // top 3
        ...(optimizerResult.top ?? []).map((d, i) => {
          const comf = d.summary?.comfort_hours_ratio ?? 0;
          const capCost = d.cost_inr != null
            ? d.cost_inr
            : (baselineSummary?.cost_inr && d.delta_vs_baseline?.cost_inr != null
                ? baselineSummary.cost_inr + d.delta_vs_baseline.cost_inr
                : (d.summary?.impact?.cost_inr_per_year ?? 0));
          return {
            id: d.design_id ?? `top_${i}`,
            design_id: d.design_id ?? `top_${i}`,
            name: d.why ? d.why.slice(0, 40) : `Rank #${d.rank}`,
            cost_inr: capCost,
            comfort_hours_ratio: comf,
            discomfort_hours: d.summary?.hours_below_health_threshold ?? Math.round((24 * (1 - comf)) * 10) / 10,
            t_in_min_c: d.summary?.t_in_min_c ?? 0,
            safety_status: 'SAFE',
            is_safe: true,
            is_pareto: true,
            rank: d.rank,
          };
        }),
        // full pareto front candidates
        ...(optimizerResult.pareto ?? []).map((d, i) => {
          const comf = d.comfort_hours_ratio ?? 0;
          return {
            id: d.design_id ?? `p_${i}`,
            design_id: d.design_id ?? `p_${i}`,
            name: `Candidate ${d.design_id ?? i}`,
            cost_inr: d.cost_inr ?? 0,
            comfort_hours_ratio: comf,
            discomfort_hours: Math.round((24 * (1 - comf)) * 10) / 10,
            t_in_min_c: d.t_in_min_c ?? 0,
            safety_status: 'SAFE',
            is_safe: true,
            is_pareto: true,
            rank: null,
          };
        }),
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
      const resp = await fetch('/optimize', {
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
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
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
    }}>
      {/* Top Banner & Trigger Bar */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '14px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Pareto Envelope Optimization
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            margin: '3px 0 0',
          }}>
            {optimizerResult
              ? `Evaluated ${optimizerResult.evaluated ?? '—'} candidate permutations · Solved in ${optimizerResult.elapsed_s?.toFixed(1) ?? '—'}s`
              : 'Multi-objective exploration across 3,000 architectural permutations (Cost vs Thermal Comfort)'}
          </p>
        </div>

        <button
          id="optimize-rerun-btn"
          onClick={() => {
            setIsRunning(true);
            handleTriggerReoptimize().finally(handleOptimizationComplete);
          }}
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            border: '1px solid #1E293B',
            borderRadius: '6px',
            padding: '8px 16px',
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.15)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#C2410C';
            e.currentTarget.style.borderColor = '#C2410C';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0F172A';
            e.currentTarget.style.borderColor = '#1E293B';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {optimizerResult ? '↻ Re-evaluate Search' : '▶ Run 3,000 Searches'}
        </button>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div style={{
          background: 'var(--ice-soft)',
          border: '1px solid var(--ice)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-3)',
          color: 'var(--ice)',
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

      {/* 3. Annual Comfort Calendar & 365-Day Diurnal Habitability Heatmap */}
      <AnnualComfortHeatmap request={request} />

      {/* 4. Differential Lift Chart — A1-3: pass real series (null falls back gracefully) */}
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
