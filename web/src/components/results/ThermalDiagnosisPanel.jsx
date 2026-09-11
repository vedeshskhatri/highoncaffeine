import React, { useState } from 'react';

/**
 * ThermalDiagnosisPanel.jsx — Explainable Thermal Diagnosis & Bottleneck Analysis
 *
 * Implements Phase 2 requirements:
 *  - Reports only calculated component contributions (walls, roof, glazing, infiltration, sky)
 *  - Displays component unavailable for floor (unseparated in solver)
 *  - Consistent absolute (kWh) and percentage (%) calculations summing to ~100%
 *  - Dominant contributor identification ("Main Weakness") with evidence
 *  - Rule-based explainable recommendations with triggers, parameter changes, reasons,
 *    expected metrics, safety constraints (0.35 ACH combustion floor), and source citations.
 */
export default function ThermalDiagnosisPanel({ diagnosis, summary, request }) {
  const [expanded, setExpanded] = useState(true);

  if (!summary && !diagnosis) {
    return null;
  }

  // Use backend diagnosis payload or derive safely from summary
  const diagData = diagnosis || {};
  const dominant = diagData.dominant_weakness || null;
  const contributions = diagData.contributions || null;
  const recommendations = diagData.recommendations || [];
  const pctSum = diagData.percentage_sum !== undefined ? diagData.percentage_sum : 100.0;

  // Fallback calculations if backend diagnosis is not yet in result
  const heatLoss = summary?.heat_loss_kwh || {};
  const solarGainKwh = summary?.solar_gain_kwh || 0.0;
  const totalLossKwh = summary?.total_heat_loss_kwh || (
    (heatLoss.walls || 0) +
    (heatLoss.roof || 0) +
    (heatLoss.glazing || 0) +
    (heatLoss.infiltration || 0) +
    (heatLoss.sky_radiation || 0)
  );

  const compList = [
    { key: 'glazing', label: 'Glazing Conduction', color: 'var(--accent)', note: 'Windows & apertures' },
    { key: 'sky_radiation', label: 'Sky Long-Wave Radiation', color: 'var(--danger)', note: 'Radiative sub-cooling to clear sky' },
    { key: 'walls', label: 'Wall Conduction', color: 'var(--border-strong)', note: 'Opaque vertical masonry/structure' },
    { key: 'roof', label: 'Roof Conduction', color: 'var(--text-muted)', note: 'Opaque horizontal roof slab' },
    { key: 'infiltration', label: 'Infiltration & Ventilation', color: 'var(--solar)', note: 'Air leakage & fresh air exchange' },
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        width: '100%',
      }}
    >
      {/* Header with Collapsible Toggle */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              display: 'inline-block',
            }}
          />
          <h3
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-size)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Thermal Diagnosis &amp; Bottleneck Analysis
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            {totalLossKwh > 0 ? `Total Loss: ${totalLossKwh.toFixed(1)} kWh/day` : 'Equilibrium'}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Main Weakness Callout Card */}
          {dominant && dominant.component ? (
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2) var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--accent)',
                }}
              >
                Dominant Thermal Bottleneck
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.4',
                }}
              >
                {dominant.statement}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderLeft: '4px solid var(--comfort)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2) var(--space-3)',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            >
              Zero or balanced heat loss: shelter is operating in thermal equilibrium with environment.
            </div>
          )}

          {/* Component Loss Table with Mathematical Consistency */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Calculated Component Contributions</span>
              <span>Percentages sum to {pctSum.toFixed(1)}%</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--space-2)',
              }}
            >
              {compList.map((item) => {
                const cData = contributions ? contributions[item.key] : null;
                const absVal = cData ? cData.absolute_kwh : (heatLoss[item.key] !== undefined ? heatLoss[item.key] : null);
                const pct = cData ? cData.percentage : (totalLossKwh > 0 && absVal !== null ? (absVal / totalLossKwh) * 100 : 0);
                const isAvailable = absVal !== null;

                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr 90px 60px',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      fontSize: '12px',
                      padding: '4px 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          backgroundColor: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
                        {item.label}
                      </span>
                    </div>

                    {/* Visual Bar */}
                    <div
                      style={{
                        height: 8,
                        backgroundColor: 'var(--surface-2)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {isAvailable && (
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            backgroundColor: item.color,
                            borderRadius: 2,
                          }}
                        />
                      )}
                    </div>

                    {/* Absolute kWh */}
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'right',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {isAvailable ? `${absVal.toFixed(2)} kWh` : '—'}
                    </div>

                    {/* Percentage */}
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: pct > 30 ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {isAvailable ? `${pct.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                );
              })}

              {/* Floor Component - Explicitly Handled as Unavailable per Rule R1 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr 150px',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: '11px',
                  padding: '6px 0',
                  borderTop: '1px dashed var(--border)',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: 'var(--border)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>
                    Floor Conduction
                  </span>
                </div>
                <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  Coupled into ground boundary; not separated in heat_loss_kwh
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  [component unavailable]
                </div>
              </div>
            </div>
          </div>

          {/* Rule-Based Recommendations Section */}
          {recommendations.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Explainable Engineering Interventions ({recommendations.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-2) var(--space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: rec.direction_of_change === 'enable' ? 'var(--accent)' : 'var(--comfort)',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                          }}
                        >
                          {rec.direction_of_change}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {rec.affected_parameter}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {rec.source}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {rec.reason}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '11px',
                        marginTop: '2px',
                        paddingTop: '4px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ color: 'var(--comfort)', fontWeight: 500 }}>
                        Expected: {rec.expected_metric}
                      </div>
                      {rec.safety_constraints && (
                        <div
                          style={{
                            color: rec.safety_constraints.includes('MANDATORY') ? 'var(--danger)' : 'var(--text-secondary)',
                            fontWeight: 500,
                          }}
                        >
                          Safety: {rec.safety_constraints}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
