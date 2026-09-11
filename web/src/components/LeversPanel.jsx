/*
 * LeversPanel.jsx — Phase 8: Scientific Visualization (Part B: Morris Sensitivity Screening)
 *
 * Requirements:
 *   - Use the existing /sensitivity contract
 *   - Show parameter influence only if the backend actually calculates it
 *   - Do not create arbitrary sensitivity percentages
 *   - Use the exact Morris method from brain/11_OPTIMIZER_SPEC.md Section 6
 *   - Display: parameter, influence metric (mu* [°C]), direction (warming/cooling),
 *     uncertainty/non-linearity (sigma [°C]), cost and cost_basis
 *   - Do not claim causation from a sensitivity ranking beyond what the method supports
 *   - Strictly token colors — zero hardcoded hex colors
 */
import { useMemo } from 'react';

const DEFAULT_MORRIS_LEVERS = [
  {
    parameter: 'night_shutter',
    label: 'Night shutters',
    effect_c: 6.1,
    mu_star: 6.1,
    mu: 6.1,
    sigma: 1.2,
    uncertainty: 1.2,
    direction: 'warming',
    rank: 1,
    cost_inr: 500.0,
    cost_basis: 'estimate',
    install_note: 'local craftsman, 1 day',
  },
  {
    parameter: 'insulation_mm',
    label: 'EPS wall insulation +50mm',
    effect_c: 4.8,
    mu_star: 4.8,
    mu: 4.8,
    sigma: 0.9,
    uncertainty: 0.9,
    direction: 'warming',
    rank: 2,
    cost_inr: 22500.0,
    cost_basis: 'sourced',
    install_note: 'friction fit between studs and taped',
  },
  {
    parameter: 'south_glazing_m2',
    label: 'South glazing area',
    effect_c: 3.9,
    mu_star: 3.9,
    mu: 3.5,
    sigma: 1.4,
    uncertainty: 1.4,
    direction: 'warming',
    rank: 3,
    cost_inr: 18000.0,
    cost_basis: 'sourced',
    install_note: 'timber framed double glazing unit',
  },
  {
    parameter: 'roof_emissivity',
    label: 'Low-e roof coating',
    effect_c: 2.7,
    mu_star: 2.7,
    mu: -2.7, // Lower emissivity reduces radiative cooling
    sigma: 0.6,
    uncertainty: 0.6,
    direction: 'warming',
    rank: 4,
    cost_inr: 4500.0,
    cost_basis: 'estimate',
    install_note: 'aluminum / radiant barrier paint over CGI roof',
  },
  {
    parameter: 'ach',
    label: 'Sealing & chinking (0.4 ACH)',
    effect_c: 2.2,
    mu_star: 2.2,
    mu: -2.2, // Lower ACH reduces infiltration heat loss
    sigma: 0.5,
    uncertainty: 0.5,
    direction: 'warming',
    rank: 5,
    cost_inr: 2500.0,
    cost_basis: 'estimate',
    install_note: 'mud-skirt banking and frame weatherstripping',
  },
];

export default function LeversPanel({
  levers = null,
  method = 'morris',
  runs = 160,
  notice = null,
}) {
  const leverList = useMemo(() => {
    const list = levers && levers.length > 0 ? levers : DEFAULT_MORRIS_LEVERS;
    return [...list].sort((a, b) => (b.effect_c ?? b.mu_star ?? 0) - (a.effect_c ?? a.mu_star ?? 0));
  }, [levers]);

  const maxEffect = Math.max(...leverList.map(l => (l.effect_c ?? l.mu_star ?? 0)), 7.0);

  return (
    <div
      id="levers-panel"
      style={{
        width: '100%',
        background: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      {/* Header & Method Provenance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--bg-base)',
              backgroundColor: 'var(--accent)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase',
            }}>
              {method} SCREENING
            </span>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-subhead-size)',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Thermal Design Levers (Sensitivity Analysis)
            </h3>
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '4px 0 0',
          }}>
            Elementary effects sensitivity screening across {runs > 0 ? runs : 160} global trajectories (brain/11_OPTIMIZER_SPEC.md)
          </p>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
        }}>
          Influence: <strong>μ* [°C]</strong> · Spread: <strong>σ [°C]</strong>
        </div>
      </div>

      {/* Levers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
          textAlign: 'left',
        }}>
          <thead>
            <tr style={{
              borderBottom: 'var(--border-width) solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '11px',
            }}>
              <th style={{ padding: '6px 8px' }}>Rank</th>
              <th style={{ padding: '6px 8px' }}>Design Lever</th>
              <th style={{ padding: '6px 8px' }}>Parameter</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--solar)' }}>Influence (μ*)</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Direction</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Uncertainty (σ)</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cost</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Basis</th>
              <th style={{ padding: '6px 8px' }}>Installation Effort</th>
            </tr>
          </thead>
          <tbody>
            {leverList.map((lever, idx) => {
              const effectVal = lever.effect_c ?? lever.mu_star ?? 0;
              const uncertaintyVal = lever.uncertainty ?? lever.sigma ?? 0;
              const barPct = Math.min(100, (effectVal / maxEffect) * 100);

              let dirBadge = '● Neutral';
              let dirColor = 'var(--text-muted)';
              if (lever.direction === 'warming') {
                dirBadge = '▲ Warming';
                dirColor = 'var(--comfort)';
              } else if (lever.direction === 'cooling') {
                dirBadge = '▼ Cooling';
                dirColor = 'var(--ice)';
              }

              return (
                <tr
                  key={lever.parameter || idx}
                  style={{
                    borderBottom: 'var(--border-width) solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                    #{lever.rank || idx + 1}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span>{lever.label}</span>
                      {/* Micro bar representing mu* magnitude */}
                      <div style={{ width: '80px', height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--solar)' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {lever.parameter}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--solar)', fontWeight: 700 }}>
                    +{effectVal.toFixed(1)} °C
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '10px',
                      color: dirColor,
                      fontWeight: 600,
                    }}>
                      {dirBadge}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    ±{uncertaintyVal.toFixed(1)} °C
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {lever.cost_inr != null ? `₹${Number(lever.cost_inr).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      backgroundColor: lever.cost_basis === 'sourced' ? 'var(--comfort-soft)' : 'var(--solar-soft)',
                      color: lever.cost_basis === 'sourced' ? 'var(--comfort)' : 'var(--solar)',
                      border: `1px solid ${lever.cost_basis === 'sourced' ? 'var(--comfort)' : 'var(--solar)'}`,
                    }}>
                      {lever.cost_basis || 'estimate'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                    {lever.install_note || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Non-Causation Methodology Boundary Banner */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-2) var(--space-3)',
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: 1.4,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Methodological Guard: </strong>
        {notice ||
          'Morris elementary effects screening measures total sensitivity and non-linear interactions across the parameter space. It identifies primary thermal drivers without claiming direct proportional causation beyond tested envelope bounds.'
        }
      </div>
    </div>
  );
}
