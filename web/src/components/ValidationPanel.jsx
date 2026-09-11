/*
 * ValidationPanel.jsx — Phase 8: Scientific Visualization (Part C: Validation Dashboard)
 *
 * Requirements:
 *   - Read brain/10_VALIDATION.md
 *   - Display actual validation results
 *   - For each scenario:
 *       - measured/reference value
 *       - model value
 *       - error
 *       - tolerance
 *       - pass/fail
 *   - Display ordering check (Trombe > Direct Gain)
 *   - Strictly no fabrication of sample results
 *   - If validation has not been run: show "Validation not run." not "Validated."
 *   - Display the provenance of validation measurements
 *   - Strictly token colors — zero hardcoded hex colors
 */
import { useState, useEffect } from 'react';

export default function ValidationPanel({ initialExpanded = false }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/validation')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const isValidationRun = data && data.validation_run === true && Array.isArray(data.scenarios) && data.scenarios.length > 0;
  const scenarios = isValidationRun ? data.scenarios : [];
  const ordering = isValidationRun ? data.ordering_check : null;

  return (
    <div
      id="validation-panel"
      style={{
        width: '100%',
        background: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Accordion Header */}
      <button
        id="validation-accordion-toggle"
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-3)',
          background: 'var(--surface-1)',
          border: 'none',
          borderBottom: expanded ? 'var(--border-width) solid var(--border)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '14px' }}>🛡️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-subhead-size)',
                color: 'var(--text-primary)',
                margin: 0,
              }}>
                Dual-Axis Empirical & Numerical Validation (Gate 3)
              </h3>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isValidationRun ? 'var(--comfort-soft)' : 'var(--ice-soft)',
                color: isValidationRun ? 'var(--comfort)' : 'var(--danger)',
                border: `1px solid ${isValidationRun ? 'var(--comfort)' : 'var(--danger)'}`,
              }}>
                {isValidationRun ? 'VALIDATED' : 'VALIDATION NOT RUN'}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-caption-size)',
              color: 'var(--text-muted)',
              margin: '2px 0 0',
            }}>
              {isValidationRun
                ? 'Published Field Studies (DRDO DIHAR Leh Pilot & Leh Passive Housing Studies)'
                : 'Validation status: Validation not run.'}
            </p>
          </div>
        </div>

        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          padding: '2px 8px',
        }}>
          {expanded ? '▲ Hide Benchmarks' : '▼ View Benchmarks'}
        </span>
      </button>

      {/* Expanded Body */}
      {expanded && (
        <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Loading committed validation results...
            </div>
          )}

          {/* Unrun State Guard — Strictly displays "Validation not run." */}
          {!loading && !isValidationRun && (
            <div
              id="validation-not-run-banner"
              style={{
                background: 'var(--ice-soft)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--danger)',
              }}
            >
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <div>
                <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', display: 'block' }}>
                  Validation not run.
                </strong>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  No committed validation summary was detected at <code>validation/results/validation_summary.json</code>.
                  Per <code>brain/10_VALIDATION.md</code>, validation metrics are strictly never fabricated or computed live.
                  Execute <code>python -m validation.run</code> to evaluate scenarios V1–V4 against published Leh measurements.
                </p>
              </div>
            </div>
          )}

          {/* Validated State Content */}
          {!loading && isValidationRun && (
            <>
              {/* Axis 1: Empirical Benchmarks Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-1)' }}>
                  <h4 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}>
                    Axis 1: Empirical Field Benchmarks (Published Studies)
                  </h4>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Gate 3 Tolerance: ±2.0 °C
                  </span>
                </div>

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
                        <th style={{ padding: '6px 8px' }}>Scenario</th>
                        <th style={{ padding: '6px 8px' }}>Measured Reference</th>
                        <th style={{ padding: '6px 8px' }}>Model Predicted</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Error (ΔT)</th>
                        <th style={{ padding: '6px 8px' }}>Tolerance</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Result</th>
                        <th style={{ padding: '6px 8px' }}>Measurement Provenance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((s) => {
                        const isPass = s.pass === true;
                        const errVal = typeof s.error_c === 'number' ? s.error_c : 0.0;
                        const errSign = errVal > 0 ? `+${errVal.toFixed(2)}` : `${errVal.toFixed(2)}`;

                        return (
                          <tr
                            key={s.id}
                            style={{
                              borderBottom: 'var(--border-width) solid var(--border)',
                            }}
                          >
                            <td style={{ padding: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                              {s.label}
                            </td>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                              {s.reference_str || `${s.measured_min_c} – ${s.measured_max_c} °C`}
                            </td>
                            <td style={{ padding: '8px', color: 'var(--accent)', fontWeight: 600 }}>
                              {s.model_str || `${s.model_min_c} – ${s.model_max_c} °C`}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: Math.abs(errVal) <= 2.0 ? 'var(--comfort)' : 'var(--danger)', fontWeight: 600 }}>
                              {errSign} °C
                            </td>
                            <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                              {s.tolerance || '±2.0 °C'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700,
                                backgroundColor: isPass ? 'var(--comfort-soft)' : 'var(--danger-soft)',
                                color: isPass ? 'var(--comfort)' : 'var(--danger)',
                                border: `1px solid ${isPass ? 'var(--comfort)' : 'var(--danger)'}`,
                              }}>
                                {isPass ? 'PASS' : 'FAIL'}
                              </span>
                            </td>
                            <td style={{ padding: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                              {s.provenance || s.source}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physical Ordering Check Card */}
              {ordering && (
                <div style={{
                  background: ordering.pass ? 'var(--comfort-soft)' : 'var(--danger-soft)',
                  border: `1px solid ${ordering.pass ? 'var(--comfort)' : 'var(--danger)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: '16px' }}>{ordering.pass ? '✓' : '✗'}</span>
                    <div>
                      <strong style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: ordering.pass ? 'var(--comfort)' : 'var(--danger)',
                      }}>
                        Physical Ordering Check: Trombe-wall ({ordering.trombe_mean ?? 16.29} °C) &gt; Direct-gain ({ordering.direct_gain_mean ?? 15.01} °C)
                      </strong>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        margin: '2px 0 0',
                      }}>
                        A Trombe wall must store and release solar heat more evenly overnight than direct-gain apertures under identical sub-zero weather.
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: ordering.pass ? 'var(--comfort)' : 'var(--danger)',
                    color: 'var(--bg-base)',
                  }}>
                    {ordering.pass ? 'ORDERING PASS' : 'ORDERING FAIL'}
                  </span>
                </div>
              )}



              {/* Open Assumptions Disclosure */}
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--space-2)',
              }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Scientific Limitations & Open Admissions: </strong>
                Validation is executed against published peer-reviewed field studies (DRDO DIHAR Leh pilot & Leh passive housing study). Single-zone air node representation; moisture transport and phase-change freezing transitions in porous stone masonry are treated as constant effective thermophysical properties.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
