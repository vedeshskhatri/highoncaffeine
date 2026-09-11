import React from 'react';

/**
 * HeatLossBreakdown.jsx — Horizontal stacked bar of heat losses by path.
 * Per brain/08_UI_SPEC.md. Sky radiation is prominently highlighted as the key
 * physical differentiator at high altitude (Ladakh 3500 m clear sky radiation sink).
 * Zero hardcoded colors — strictly token variables.
 */
export default function HeatLossBreakdown({ heat_loss_kwh }) {
  if (!heat_loss_kwh) {
    return (
      <div className="bg-surface-1 border border-border rounded-md p-3 w-full">
        <div className="font-body text-label text-text-secondary uppercase mb-2">
          Heat Loss Breakdown
        </div>
        <div className="font-mono text-body text-text-muted">—</div>
      </div>
    );
  }

  const {
    walls = 0,
    roof = 0,
    glazing = 0,
    infiltration = 0,
    sky_radiation = 0,
  } = heat_loss_kwh;

  const total = walls + roof + glazing + infiltration + sky_radiation;
  const safeTotal = total > 0 ? total : 1;

  const segments = [
    { id: 'walls', label: 'Walls', value: walls, color: 'var(--border-strong)' },
    { id: 'roof', label: 'Roof', value: roof, color: 'var(--text-muted)' },
    { id: 'glazing', label: 'Glazing', value: glazing, color: 'var(--accent)' },
    { id: 'infiltration', label: 'Infiltration', value: infiltration, color: 'var(--solar)' },
    { id: 'sky_radiation', label: 'Sky Radiation', value: sky_radiation, color: 'var(--danger)', highlight: true },
  ];

  return (
    <div className="bg-surface-1 border border-border rounded-md p-3 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="font-body text-label font-medium text-text-primary uppercase tracking-wider">
          Heat Loss by Path (24 h)
        </div>
        <div className="font-mono text-caption text-text-secondary">
          Total: <span className="text-text-primary font-medium">{total.toFixed(1)} kWh</span>
        </div>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="w-full h-6 bg-surface-2 rounded-sm overflow-hidden flex border border-border mb-3">
        {segments.map((seg) => {
          const pct = Math.max(0, (seg.value / safeTotal) * 100);
          if (pct === 0) return null;
          return (
            <div
              key={seg.id}
              className="h-full relative group transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.label}: ${seg.value.toFixed(1)} kWh (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Sky Radiation Callout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-border text-caption">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / safeTotal) * 100);
          return (
            <div key={seg.id} className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="font-body text-text-secondary truncate">
                  {seg.label}
                  {seg.highlight && (
                    <span
                      className="ml-1 px-1 py-0.2 rounded text-[10px] uppercase font-mono"
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                      }}
                    >
                      radiative sink
                    </span>
                  )}
                </span>
              </div>
              <div className="font-mono text-text-primary mt-0.5 pl-4">
                {seg.value.toFixed(1)} kWh <span className="text-text-muted text-[11px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
