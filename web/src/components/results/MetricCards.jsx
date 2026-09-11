import React from 'react';

/**
 * MetricCards.jsx — Four headline thermal and logistics metrics per brain/08_UI_SPEC.md.
 * Numbers rendered in JetBrains Mono (--font-mono), labels in caption.
 * Zero hardcoded colors — resolved strictly through tokens.
 */
export default function MetricCards({ summary }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-1 border border-border rounded-md p-3">
            <div className="text-caption text-text-muted uppercase tracking-wider mb-1">—</div>
            <div className="font-mono text-metric text-text-muted">—</div>
          </div>
        ))}
      </div>
    );
  }

  const {
    t_in_min_c,
    t_in_min_hour = 6,
    comfort_hours_ratio,
    hours_below_health_threshold,
    impact,
  } = summary;

  const minTempFormatted =
    typeof t_in_min_c === 'number' && !Number.isNaN(t_in_min_c)
      ? `${t_in_min_c.toFixed(1)} °C`
      : '—';

  const hourFormatted =
    typeof t_in_min_hour === 'number'
      ? `${String(t_in_min_hour).padStart(2, '0')}:00`
      : '—';

  const comfortPctFormatted =
    typeof comfort_hours_ratio === 'number' && !Number.isNaN(comfort_hours_ratio)
      ? `${Math.round(comfort_hours_ratio * 100)}%`
      : '—';

  const healthHoursFormatted =
    typeof hours_below_health_threshold === 'number' && !Number.isNaN(hours_below_health_threshold)
      ? `${hours_below_health_threshold} / 24 h`
      : '—';

  const keroseneAvoidedFormatted =
    impact && typeof impact.kerosene_litres_per_year === 'number' && !Number.isNaN(impact.kerosene_litres_per_year)
      ? `${Math.round(impact.kerosene_litres_per_year).toLocaleString()} L`
      : '—';

  const isBelowSafe = typeof t_in_min_c === 'number' && t_in_min_c < 18.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      {/* 1. Dawn Minimum */}
      <div
        className="bg-surface-1 border rounded-md p-3 flex flex-col justify-between"
        style={{ borderColor: isBelowSafe ? 'var(--danger)' : 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-body text-caption text-text-secondary uppercase tracking-wider">
            Overnight Min (Dawn)
          </span>
          <span className="font-mono text-caption text-text-muted">{hourFormatted}</span>
        </div>
        <div
          className="font-mono text-metric font-medium mb-1"
          style={{ color: isBelowSafe ? 'var(--danger)' : 'var(--text-primary)' }}
        >
          {minTempFormatted}
        </div>
        <div className="font-body text-caption text-text-muted">
          {isBelowSafe ? 'Below 18 °C threshold' : 'Maintains safe temperature'}
        </div>
      </div>

      {/* 2. Comfort Band Hours */}
      <div className="bg-surface-1 border border-border rounded-md p-3 flex flex-col justify-between">
        <div className="font-body text-caption text-text-secondary uppercase tracking-wider mb-1">
          Comfort Hours
        </div>
        <div
          className="font-mono text-metric font-medium mb-1"
          style={{ color: 'var(--comfort)' }}
        >
          {comfortPctFormatted}
        </div>
        <div className="font-body text-caption text-text-muted">
          Inside IMAC adaptive band
        </div>
      </div>

      {/* 3. Hours below Health Threshold */}
      <div className="bg-surface-1 border border-border rounded-md p-3 flex flex-col justify-between">
        <div className="font-body text-caption text-text-secondary uppercase tracking-wider mb-1">
          Cold Exposure Risk
        </div>
        <div
          className="font-mono text-metric font-medium mb-1"
          style={{
            color: hours_below_health_threshold > 0 ? 'var(--danger)' : 'var(--comfort)',
          }}
        >
          {healthHoursFormatted}
        </div>
        <div className="font-body text-caption text-text-muted">
          Hours &lt; 18.0 °C (WHO guidance)
        </div>
      </div>

      {/* 4. Kerosene Fuel Avoided */}
      <div className="bg-surface-1 border border-border rounded-md p-3 flex flex-col justify-between">
        <div className="font-body text-caption text-text-secondary uppercase tracking-wider mb-1">
          Kerosene Saved
        </div>
        <div
          className="font-mono text-metric font-medium mb-1"
          style={{ color: 'var(--solar)' }}
        >
          {keroseneAvoidedFormatted}
        </div>
        <div className="font-body text-caption text-text-muted">
          Per post per year heating saving
        </div>
      </div>
    </div>
  );
}
