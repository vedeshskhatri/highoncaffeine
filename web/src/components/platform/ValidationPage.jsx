import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import './StaticPages.css';

export default function ValidationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/validation');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidation();
  }, []);

  return (
    <div className="static-page-container">
      <div className="static-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="static-title">Empirical Validation Suite (V1–V4)</h1>
            <p className="static-subtitle">
              Comparison of THERMA transient 5R1C engine predictions against published empirical field trials and ASHRAE test benchmarks.
            </p>
          </div>
          <button
            onClick={fetchValidation}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--espresso)',
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Re-verify
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--espresso-40)' }}>
          Running verification against solver suite...
        </div>
      )}

      {error && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--ice-soft)', color: 'var(--ice)', borderRadius: 'var(--radius-sm)' }}>
          Validation endpoint error: {error}
        </div>
      )}

      {data && (
        <>
          <div className="static-card">
            <h2 className="section-title">Field Calibration & Benchmarks Summary</h2>
            <p>
              THERMA enforces empirical validation gates against peer-reviewed high-altitude experimental shelter data. All model predictions must fall within field tolerance envelopes to qualify for deployment planning.
            </p>

            <table className="validation-table">
              <thead>
                <tr>
                  <th>Validation Scenario</th>
                  <th>Ambient</th>
                  <th>Measured Range</th>
                  <th>THERMA Model</th>
                  <th>Citation / Evidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.scenarios?.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.label}</strong>
                      <div className="cite-sub">{s.id}</div>
                    </td>
                    <td className="mono">{s.ambient_c !== null ? `${s.ambient_c} °C` : 'Dynamic'}</td>
                    <td className="mono">
                      {s.measured_min_c} to {s.measured_max_c} °C
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {s.model_min_c} to {s.model_max_c} °C
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--espresso-70)' }}>
                      {s.source}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {s.pass ? (
                        <span className="badge-pass">
                          <CheckCircle2 size={13} />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="badge-fail">
                          <XCircle size={13} />
                          <span>FAIL</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="static-card">
            <h2 className="section-title">Gate A Acceptance Criteria</h2>
            <ul>
              <li><strong>Zero Solar Radiation Inversion:</strong> Night-time indoor temperatures cannot exceed daylight solar peaks without supplementary active heat generation.</li>
              <li><strong>External Thermal Conduction Coupling:</strong> Swinbank clear-sky longwave radiation is coupled strictly to the outer envelope boundary, preventing unphysical radiative bypass.</li>
              <li><strong>Numerical Stability:</strong> Enforces energy conservation with 60 s timesteps over 72-hour spinup cycles.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
