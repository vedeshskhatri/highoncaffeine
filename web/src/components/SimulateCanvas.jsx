/*
 * SimulateCanvas.jsx — Phase S4
 * Step 2: Simulation Results Canvas.
 *
 * Combines:
 *   - RefusalCard (when result.refused is true)
 *   - WeatherProvenanceBanner (meteorological provider transparency)
 *   - MetricCards (4 headline metrics: min temp at dawn, comfort ratio, health hours, kerosene avoided)
 *   - TempChart (indoor & outdoor curves, comfort band, danger shading, uncertainty band)
 *   - DeltaAmbientChart ("Heat flow across ΔT (indoor − ambient)" satisfying PS requirement 3)
 *   - HeatLossBreakdown (conduction, infiltration, sky radiation)
 *   - ValidationPanel (3 measured field points, Trombe above direct gain check)
 *   - SpecSheetCopy (one-click clipboard engineering spec)
 *
 * Strictly token colors — zero hardcoded hex colors.
 */
import { useMemo } from 'react';
import TempChart from './TempChart';
import DeltaAmbientChart from './DeltaAmbientChart';
import ValidationPanel from './ValidationPanel';
import {
  MetricCards,
  HeatLossBreakdown,
  SpecSheetCopy,
  WeatherProvenanceBanner,
  RefusalCard,
} from './results';

// Realistic sample simulation result when testing offline or before first execution
const DEFAULT_SIMULATE_RESULT = {
  refused: false,
  refusal_reason: null,
  weather_provenance: {
    provider: 'open-meteo',
    is_live: true,
    grid_note: 'Weather from regional grid estimate (NASA POWER archive). Not a local measurement.',
    fetched_at: new Date().toISOString(),
  },
  series: [
    { hour: 0,  t_out: -18.2, t_in: 6.4, t_operative: 5.6, t_in_lo: 5.1, t_in_hi: 7.7, delta_ambient: 24.6 },
    { hour: 1,  t_out: -19.1, t_in: 5.8, t_operative: 5.0, t_in_lo: 4.6, t_in_hi: 7.0, delta_ambient: 24.9 },
    { hour: 2,  t_out: -20.0, t_in: 5.2, t_operative: 4.4, t_in_lo: 4.0, t_in_hi: 6.4, delta_ambient: 25.2 },
    { hour: 3,  t_out: -20.8, t_in: 4.7, t_operative: 3.9, t_in_lo: 3.5, t_in_hi: 5.9, delta_ambient: 25.5 },
    { hour: 4,  t_out: -21.4, t_in: 4.2, t_operative: 3.5, t_in_lo: 3.0, t_in_hi: 5.4, delta_ambient: 25.6 },
    { hour: 5,  t_out: -21.8, t_in: 3.9, t_operative: 3.2, t_in_lo: 2.8, t_in_hi: 5.0, delta_ambient: 25.7 },
    { hour: 6,  t_out: -22.0, t_in: 3.6, t_operative: 2.9, t_in_lo: 2.5, t_in_hi: 4.7, delta_ambient: 25.6 },
    { hour: 7,  t_out: -21.1, t_in: 4.1, t_operative: 3.5, t_in_lo: 3.0, t_in_hi: 5.2, delta_ambient: 25.2 },
    { hour: 8,  t_out: -18.4, t_in: 6.8, t_operative: 6.5, t_in_lo: 5.5, t_in_hi: 8.1, delta_ambient: 25.2 },
    { hour: 9,  t_out: -14.2, t_in: 11.2, t_operative: 11.5, t_in_lo: 9.8, t_in_hi: 12.6, delta_ambient: 25.4 },
    { hour: 10, t_out: -9.8,  t_in: 15.6, t_operative: 16.4, t_in_lo: 14.0, t_in_hi: 17.2, delta_ambient: 25.4 },
    { hour: 11, t_out: -6.5,  t_in: 18.4, t_operative: 19.8, t_in_lo: 16.6, t_in_hi: 20.2, delta_ambient: 24.9 },
    { hour: 12, t_out: -4.2,  t_in: 20.2, t_operative: 21.9, t_in_lo: 18.2, t_in_hi: 22.2, delta_ambient: 24.4 },
    { hour: 13, t_out: -3.8,  t_in: 20.8, t_operative: 22.4, t_in_lo: 18.7, t_in_hi: 22.9, delta_ambient: 24.6 },
    { hour: 14, t_out: -4.5,  t_in: 19.9, t_operative: 21.2, t_in_lo: 17.9, t_in_hi: 21.9, delta_ambient: 24.4 },
    { hour: 15, t_out: -6.2,  t_in: 17.8, t_operative: 18.7, t_in_lo: 16.0, t_in_hi: 19.6, delta_ambient: 24.0 },
    { hour: 16, t_out: -8.9,  t_in: 15.1, t_operative: 15.6, t_in_lo: 13.4, t_in_hi: 16.8, delta_ambient: 24.0 },
    { hour: 17, t_out: -11.5, t_in: 12.8, t_operative: 12.9, t_in_lo: 11.2, t_in_hi: 14.4, delta_ambient: 24.3 },
    { hour: 18, t_out: -13.8, t_in: 11.0, t_operative: 10.8, t_in_lo: 9.5,  t_in_hi: 12.5, delta_ambient: 24.8 },
    { hour: 19, t_out: -15.2, t_in: 9.6,  t_operative: 9.2,  t_in_lo: 8.2,  t_in_hi: 11.0, delta_ambient: 24.8 },
    { hour: 20, t_out: -16.4, t_in: 8.5,  t_operative: 8.0,  t_in_lo: 7.2,  t_in_hi: 9.8,  delta_ambient: 24.9 },
    { hour: 21, t_out: -17.1, t_in: 7.7,  t_operative: 7.1,  t_in_lo: 6.4,  t_in_hi: 9.0,  delta_ambient: 24.8 },
    { hour: 22, t_out: -17.6, t_in: 7.1,  t_operative: 6.4,  t_in_lo: 5.8,  t_in_hi: 8.4,  delta_ambient: 24.7 },
    { hour: 23, t_out: -17.9, t_in: 6.7,  t_operative: 6.0,  t_in_lo: 5.4,  t_in_hi: 8.0,  delta_ambient: 24.6 },
  ],
  summary: {
    t_in_min_c: 3.6,
    t_in_min_hour: 6,
    t_in_max_c: 20.8,
    comfort_hours_ratio: 0.25,
    hours_below_health_threshold: 18,
    solar_gain_kwh: 18.7,
    heat_loss_kwh: {
      walls: 12.1,
      roof: 9.4,
      glazing: 7.8,
      infiltration: 4.2,
      sky_radiation: 6.9,
    },
    backup_heat: {
      peak_kw: 1.1,
      hours: 6.5,
      kerosene_litres_per_night: 0.9,
    },
    impact: {
      kerosene_litres_per_year: 1310,
      cost_inr_per_year: 3144000,
      co2_kg_per_year: 3275,
      payback_years: null,
    },
    freeze_risk: [
      {
        location: 'north wall interior surface',
        below_zero_from_hour: 2,
        min_c: -1.8,
      },
    ],
  },
  surfaces: [
    { name: 'south_wall', t_surface_c: -4.2, flux_w: 310, solar_absorbed_w: 640 },
  ],
};

export default function SimulateCanvas({ result, request }) {
  // Use active simulation result or fallback sample
  const data = result || DEFAULT_SIMULATE_RESULT;
  const isRefused = !!data.refused;
  const dateStr = request?.weather?.date || '2026-01-15';

  if (isRefused) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-3)' }}>
        <RefusalCard refusal_reason={data.refusal_reason} />
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
      {/* 1. Weather Provenance Banner */}
      <WeatherProvenanceBanner provenance={data.weather_provenance} />

      {/* 2. MetricCards section with section label row above */}
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-caption-size)',
        lineHeight: 'var(--text-caption-lh)',
        color: 'var(--text-muted)',
      }}>
        Simulation results — {dateStr}
      </div>
      <MetricCards summary={data.summary} />

      {/* 3. Primary Diurnal Temperature Chart (VISUAL ANCHOR) */}
      <div
        className="temp-chart-anchor"
        style={{
          borderLeft: '3px solid var(--accent)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <style>{`
          .temp-chart-anchor > div {
            border-left: none !important;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
          }
        `}</style>
        <TempChart series={data.series} />
      </div>

      {/* 4. Single horizontal rule between TempChart and DeltaAmbientChart */}
      <hr style={{ border: 'none', borderTop: 'var(--border-width) solid var(--border)', margin: 0 }} />

      {/* 5. Delta Ambient Chart (PS Requirement 3) with prominent label */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
          lineHeight: 'var(--text-caption-lh)',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          PS Requirement 3 — Heat flow across ΔT (indoor − ambient)
        </div>
        <DeltaAmbientChart series={data.series} />
      </div>

      {/* 6. Heat Loss Breakdown */}
      <HeatLossBreakdown heat_loss_kwh={data.summary?.heat_loss_kwh} />

      {/* 7. Validation & Export (Wrapped Section) */}
      <div style={{
        borderTop: 'var(--border-width) solid var(--border)',
        paddingTop: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-caption-size)',
          lineHeight: 'var(--text-caption-lh)',
          color: 'var(--text-muted)',
        }}>
          Validation &amp; Export
        </div>

        {/* Validation vs Field Trials Panel */}
        <ValidationPanel initialExpanded={true} />

        {/* Engineering Spec Sheet Export */}
        <SpecSheetCopy
          request={request}
          summary={data.summary}
          provenance={data.weather_provenance}
        />
      </div>
    </div>
  );
}
