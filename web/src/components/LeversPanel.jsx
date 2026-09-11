/*
 * LeversPanel.jsx — Phase S4
 * Ranked sensitivity levers showing temperature effect, cost, effort, and [estimate] tags.
 *
 * Mandatory rule: When cost_basis is "estimate", render the [estimate] tag in --estimate.
 * NEVER HIDE IT.
 *
 * Strictly token colors — zero hardcoded hex colors.
 */
import { useMemo } from 'react';

const DEFAULT_LEVERS = [
  {
    id: 'night_shutters',
    label: 'Night shutters',
    effect_c: 6.1,
    cost_text: '~₹500 / window',
    effort_text: 'local craftsman, 1 day',
    cost_basis: 'estimate',
    source: 'Local builder interview, Leh market',
  },
  {
    id: 'wall_insulation',
    label: '50 mm EPS exterior insulation',
    effect_c: 4.8,
    cost_text: '₹140 / m²',
    effort_text: 'standard masonry crew, 2 days',
    cost_basis: 'sourced',
    source: 'CPWD DSR 2023 Item 12.41',
  },
  {
    id: 'south_glazing',
    label: 'Enlarge south glazing to 5.5 m²',
    effect_c: 3.9,
    cost_text: '₹1,800 / m²',
    effort_text: 'double-pane framing, 1 day',
    cost_basis: 'sourced',
    source: 'BIS 3548 / CPWD market rate',
  },
  {
    id: 'low_e_roof',
    label: 'Low-e roof coating (ε = 0.25)',
    effect_c: 2.7,
    cost_text: '₹85 / m²',
    effort_text: 'surface paint application, 4 hours',
    cost_basis: 'sourced',
    source: 'Manufacturer technical data sheet',
  },
  {
    id: 'air_tightness',
    label: 'Weather-strip doors & windows (0.4 ACH)',
    effect_c: 2.2,
    cost_text: '~₹350 / door',
    effort_text: 'carpenter weather-stripping, 3 hours',
    cost_basis: 'estimate',
    source: 'Field retrofit survey, Choglamsar',
  },
];

export default function LeversPanel({ levers = DEFAULT_LEVERS }) {
  const sorted = useMemo(() => {
    return [...(levers || DEFAULT_LEVERS)].sort((a, b) => b.effect_c - a.effect_c);
  }, [levers]);

  const maxEffect = Math.max(...sorted.map(l => l.effect_c), 7.0);

  return (
    <div style={{
      width: '100%',
      background: 'var(--surface-1)',
      border: 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-subhead-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Thermal Design Levers (Sensitivity Ranking)
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Ranked by impact on minimum indoor temperature · Cost, labor &amp; provenance transparency
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--estimate)',
          background: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
        }}>
          Honest Provenance
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {sorted.map((lever) => {
          const pct = Math.min(100, Math.max(8, (lever.effect_c / maxEffect) * 100));
          const isEstimate = lever.cost_basis === 'estimate';

          return (
            <div key={lever.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Top row: Label, bar, and effect °C */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{
                  width: 220,
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-caption-size)',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  flexShrink: 0,
                }}>
                  {lever.label}
                </span>

                <div style={{
                  flex: 1,
                  height: 14,
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'var(--solar)',
                    borderRadius: 'var(--radius-sm)',
                  }} />
                </div>

                <span style={{
                  width: 65,
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-caption-size)',
                  fontWeight: 600,
                  color: 'var(--solar)',
                  flexShrink: 0,
                }}>
                  +{lever.effect_c.toFixed(1)} °C
                </span>
              </div>

              {/* Bottom row: cost, effort, and [estimate] tag */}
              <div style={{
                paddingLeft: 228,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                <span>{lever.cost_text} · {lever.effort_text}</span>
                {isEstimate && (
                  <span
                    style={{
                      color: 'var(--estimate)',
                      background: 'var(--surface-2)',
                      border: 'var(--border-width) solid var(--estimate)',
                      borderRadius: 2,
                      padding: '0 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                    }}
                    title={`Cost source: ${lever.source}`}
                  >
                    [estimate]
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
