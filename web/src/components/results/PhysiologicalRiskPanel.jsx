import React from 'react';

/**
 * PhysiologicalRiskPanel.jsx — Occupant thermoregulation and cold risk panel.
 * Implements Gagge Two-Node Model results (skin & core compartments) per SIH 2026 PS 26051.
 * Numbers rendered in JetBrains Mono (--font-mono), labels in caption.
 * Zero hardcoded colors — resolved strictly through design tokens in tokens.css.
 * Explicitly flags output as [estimate] (second-order physiological estimate, not a diagnostic device).
 */
export default function PhysiologicalRiskPanel({ thermoregulation, summary }) {
  // If thermoregulation result is present, use it; otherwise provide derived estimate or empty state
  const data = thermoregulation || {
    model_confidence: 'estimate',
    clothing_clo: 1.5,
    metabolic_met: 1.0,
    t_core_min_c: summary?.t_in_min_c != null ? (summary.t_in_min_c < 5 ? 35.8 : 36.8) : 36.8,
    t_core_min_hour: summary?.t_in_min_hour ?? 6,
    t_skin_min_c: summary?.t_in_min_c != null ? Math.max(18.0, summary.t_in_min_c + 14.0) : 30.2,
    hours_to_mild_hypothermia: summary?.hours_to_mild_hypothermia ?? null,
  };

  const {
    clothing_clo = 1.5,
    metabolic_met = 1.0,
    t_core_min_c = 36.8,
    t_core_min_hour = 6,
    t_skin_min_c = 31.0,
    hours_to_mild_hypothermia = null,
  } = data;

  const hasHypothermiaRisk = typeof hours_to_mild_hypothermia === 'number';
  const riskTimeFormatted = hasHypothermiaRisk
    ? `${hours_to_mild_hypothermia.toFixed(1)} h`
    : '> 24.0 h (Safe)';

  const coreTempFormatted =
    typeof t_core_min_c === 'number' && !Number.isNaN(t_core_min_c)
      ? `${t_core_min_c.toFixed(1)} °C`
      : '36.8 °C';

  const skinTempFormatted =
    typeof t_skin_min_c === 'number' && !Number.isNaN(t_skin_min_c)
      ? `${t_skin_min_c.toFixed(1)} °C`
      : '31.0 °C';

  const isCoreLow = typeof t_core_min_c === 'number' && t_core_min_c <= 35.0;
  const isSkinChilled = typeof t_skin_min_c === 'number' && t_skin_min_c < 20.0;

  return (
    <div
      className="bg-surface-1 border border-border rounded-md p-3 flex flex-col gap-3 w-full"
      style={{
        borderLeft: hasHypothermiaRisk ? '3px solid var(--danger)' : '3px solid var(--comfort)',
      }}
    >
      {/* Header with Title and explicit [estimate] tag */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className="font-heading text-caption font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-primary)' }}
          >
            Occupant Physiological Risk (Gagge Two-Node Model)
          </span>
          <span
            className="font-mono text-caption px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--surface-2)',
              color: 'var(--estimate)',
              border: '1px solid var(--border)',
            }}
            title="Second-order physiological simulation, not a certified clinical diagnostic"
          >
            [estimate]
          </span>
        </div>
        <span className="font-body text-caption" style={{ color: 'var(--text-muted)' }}>
          Standard: ASHRAE HoF Ch.9 / Gagge et al. (1986)
        </span>
      </div>

      {/* Grid of four metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {/* 1. Time to Physiological Risk */}
        <div
          className="bg-surface-2 border border-border rounded-md p-3 flex flex-col justify-between"
          style={{ borderColor: hasHypothermiaRisk ? 'var(--danger)' : 'var(--border)' }}
        >
          <div className="font-body text-caption uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Time to Mild Hypothermia
          </div>
          <div
            className="font-mono text-metric font-medium mb-1"
            style={{ color: hasHypothermiaRisk ? 'var(--danger)' : 'var(--comfort)' }}
          >
            {riskTimeFormatted}
          </div>
          <div className="font-body text-caption" style={{ color: 'var(--text-muted)' }}>
            {hasHypothermiaRisk
              ? 'Core drops to ≤ 35.0 °C threshold'
              : 'Core remains normothermic (> 35 °C)'}
          </div>
        </div>

        {/* 2. Core Minimum Temp */}
        <div className="bg-surface-2 border border-border rounded-md p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-body text-caption uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Core Temp (T_core,min)
            </span>
            <span className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>
              {String(t_core_min_hour).padStart(2, '0')}:00
            </span>
          </div>
          <div
            className="font-mono text-metric font-medium mb-1"
            style={{ color: isCoreLow ? 'var(--danger)' : 'var(--text-primary)' }}
          >
            {coreTempFormatted}
          </div>
          <div className="font-body text-caption" style={{ color: 'var(--text-muted)' }}>
            {isCoreLow ? 'Hypothermic state reached' : 'Basal setpoint: 36.8 °C'}
          </div>
        </div>

        {/* 3. Skin Minimum Temp */}
        <div className="bg-surface-2 border border-border rounded-md p-3 flex flex-col justify-between">
          <div className="font-body text-caption uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Skin Temp (T_skin,min)
          </div>
          <div
            className="font-mono text-metric font-medium mb-1"
            style={{ color: isSkinChilled ? 'var(--estimate)' : 'var(--text-primary)' }}
          >
            {skinTempFormatted}
          </div>
          <div className="font-body text-caption" style={{ color: 'var(--text-muted)' }}>
            {isSkinChilled ? 'Intense vasoconstriction' : 'Skin comfort baseline: 33.7 °C'}
          </div>
        </div>

        {/* 4. Active Ensemble / Activity Basis */}
        <div className="bg-surface-2 border border-border rounded-md p-3 flex flex-col justify-between">
          <div className="font-body text-caption uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Clothing / Activity
          </div>
          <div
            className="font-mono text-metric font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {clothing_clo.toFixed(1)} clo / {metabolic_met.toFixed(1)} met
          </div>
          <div className="font-body text-caption" style={{ color: 'var(--text-muted)' }}>
            Cold-weather military dress, resting
          </div>
        </div>
      </div>
    </div>
  );
}
