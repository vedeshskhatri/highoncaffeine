import React, { useState } from 'react';
import MetricCards from './MetricCards';
import HeatLossBreakdown from './HeatLossBreakdown';
import SpecSheetCopy from './SpecSheetCopy';
import WeatherProvenanceBanner from './WeatherProvenanceBanner';
import RefusalCard from './RefusalCard';

/**
 * ResultsTestView.jsx — Full integration showcase for Phase R4 Results components.
 * Renders against real API responses, tests refusal mode, and allows previewing copy text.
 */
export default function ResultsTestView({
  result,
  request,
  testRefusal = false,
  testFallback = false,
}) {
  const [showRefusal, setShowRefusal] = useState(testRefusal);
  const [useFallback, setUseFallback] = useState(testFallback);

  // Sample simulation data matching contract shape if not provided
  const sampleResult = result || {
    refused: false,
    refusal_reason: null,
    weather_provenance: {
      provider: useFallback ? 'fallback' : 'open-meteo',
      is_live: !useFallback,
      grid_note: useFallback ? 'Offline fallback dataset (Leh typical winter day)' : null,
      fetched_at: '2026-09-11T04:12:00Z',
    },
    series: [],
    summary: {
      t_in_min_c: 3.1,
      t_in_min_hour: 6,
      t_in_max_c: 19.4,
      comfort_hours_ratio: 0.21,
      hours_below_health_threshold: 17,
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
        kerosene_litres_per_year: 1310.0,
        cost_inr_per_year: 3144000.0,
        co2_kg_per_year: 3275.0,
        payback_years: 2.4,
      },
    },
  };

  const sampleRequest = request || {
    location: { lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
    weather: { mode: 'typical_day', date: '2026-01-15' },
    geometry: { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180 },
    envelope: {
      walls: [
        { material: 'mud_brick', thickness_m: 0.30 },
        { material: 'eps', thickness_m: 0.05 },
      ],
      roof: [{ material: 'concrete', thickness_m: 0.15 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      roof_emissivity: 0.90,
    },
    openings: [
      { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
    ],
  };

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-5xl mx-auto">
      {/* Dev Controls for verification checks */}
      <div className="flex items-center gap-3 p-2 rounded bg-surface-2 border border-border text-caption">
        <span className="font-body text-text-secondary font-medium">Phase R4 Test Controls:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showRefusal}
            onChange={(e) => setShowRefusal(e.target.checked)}
          />
          <span>Test Refusal State (200 OK)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useFallback}
            onChange={(e) => setUseFallback(e.target.checked)}
          />
          <span>Test Fallback Weather</span>
        </label>
      </div>

      {/* 5. Refusal Card */}
      {showRefusal && (
        <RefusalCard
          refusal_reason="Ventilation 0.30 ACH is below the safe minimum for an unflued combustion heater. Carbon monoxide risk. Increase ventilation or specify a flued stove."
        />
      )}

      {/* 4. Weather Provenance Banner */}
      <WeatherProvenanceBanner provenance={sampleResult.weather_provenance} />

      {/* 1. Headline Metric Cards */}
      <MetricCards summary={sampleResult.summary} />

      {/* 2. Heat Loss Breakdown */}
      <HeatLossBreakdown heat_loss_kwh={sampleResult.summary?.heat_loss_kwh} />

      {/* 3. Spec Sheet Clipboard Copy */}
      <div className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border mt-2">
        <span className="font-body text-body font-medium text-text-primary">
          Export Shelter Specification
        </span>
        <SpecSheetCopy
          request={sampleRequest}
          summary={sampleResult.summary}
          provenance={sampleResult.weather_provenance}
        />
      </div>
    </div>
  );
}
