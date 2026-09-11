import React from 'react';
import './LiveTempCurve.css';

export default function LiveTempCurve({
  simulateResult,
  prevMinTemp,
  isPending,
  inlineError,
  scrubHour = 4,
}) {
  const summary = simulateResult?.summary || {};
  const tMin = summary.t_in_min_c ?? -32.28;
  const tMax = summary.t_in_max_c ?? -26.11;
  const comfortRatio = summary.comfort_hours_ratio ?? 0.0;
  const delta = prevMinTemp !== null ? tMin - prevMinTemp : 0.0;

  // Series points
  const series = simulateResult?.series || [];
  const hours = series.length === 24
    ? series.map((s) => s.t_in)
    : [
        -27.5, -28.2, -29.6, -31.4, -32.28, -32.1, -31.0, -30.2,
        -29.0, -27.8, -26.5, -26.11, -26.4, -26.9, -27.6, -28.4,
        -29.1, -29.8, -30.5, -31.0, -31.4, -31.8, -32.0, -32.1
      ];

  const ambientSeries = series.length === 24 ? series.map((s) => s.t_out) : [];

  const w = 400;
  const h = 260;
  const padL = 36;
  const padR = 16;
  const padT = 20;
  const padB = 24;

  // Temperature range from -40 C to +24 C
  const minTempScale = -40;
  const maxTempScale = 24;

  const getX = (hr) => padL + (hr / 23) * (w - padL - padR);
  const getY = (temp) => padT + (1 - (temp - minTempScale) / (maxTempScale - minTempScale)) * (h - padT - padB);

  const pointsIndoor = hours.map((t, hr) => `${getX(hr)},${getY(t)}`).join(' ');
  const pointsOutdoor = ambientSeries.length === 24
    ? ambientSeries.map((t, hr) => `${getX(hr)},${getY(t)}`).join(' ')
    : '';

  // Comfort band (18 C to 26 C)
  const y18 = getY(18);
  const y24 = getY(24);
  const y0 = getY(0);

  const scrubX = getX(scrubHour);

  return (
    <div className="live-curve-container">
      <div className="curve-header">
        <div className="curve-title-col">
          <span className="curve-title">LIVE THERMAL PERFORMANCE</span>
          <span className="curve-subtitle">Transient 24-Hour Solver Response</span>
        </div>
        {isPending && (
          <span className="recomputing-chip mono">
            <span className="pulse-dot"></span> Solving...
          </span>
        )}
      </div>

      {inlineError && (
        <div className="inline-error-banner">
          <span className="error-icon">⚠</span>
          <span className="error-text">{inlineError}</span>
        </div>
      )}

      {/* Main Big Mono Telemetry Readout */}
      <div className="primary-readout-card">
        <div className="readout-col">
          <span className="readout-label">Overnight Minimum (04:00)</span>
          <div className="readout-row">
            <span className="readout-hero mono">{tMin.toFixed(1)} °C</span>
            {prevMinTemp !== null && Math.abs(delta) >= 0.05 && (
              <span className={`delta-chip mono ${delta >= 0 ? 'delta-pos' : 'delta-neg'}`}>
                {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} °C
              </span>
            )}
          </div>
        </div>
        <div className="readout-stats-col">
          <div className="sub-stat">
            <span className="sub-label">Day Peak:</span>
            <span className="sub-val mono">{tMax.toFixed(1)} °C</span>
          </div>
          <div className="sub-stat">
            <span className="sub-label">Comfort (18-26°C):</span>
            <span className="sub-val mono">{(comfortRatio * 24).toFixed(1)} hrs</span>
          </div>
        </div>
      </div>

      {/* Interactive 24-hour SVG curve */}
      <div className="svg-curve-wrapper">
        <svg className="live-curve-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          {/* Comfort Band Highlight (18 to 26 C) */}
          <rect
            x={padL}
            y={Math.min(y18, y24)}
            width={w - padL - padR}
            height={Math.abs(y18 - y24)}
            fill="var(--sage-soft)"
            opacity="0.8"
          />
          <text x={w - padR - 4} y={y18 - 4} textAnchor="end" className="band-label mono">
            Comfort Band (18 °C)
          </text>

          {/* Sub-zero Frost Danger Region (< 0 C) */}
          <line x1={padL} y1={y0} x2={w - padR} y2={y0} stroke="var(--ice)" strokeWidth="1" strokeDasharray="3 3" />
          <text x={padL + 4} y={y0 - 4} className="zero-label mono">0 °C Freezing</text>

          {/* Grid lines */}
          {[-30, -20, -10, 0, 10, 20].map((t) => (
            <g key={`grid-${t}`}>
              <line x1={padL} y1={getY(t)} x2={w - padR} y2={getY(t)} className="chart-grid-line" />
              <text x={padL - 4} y={getY(t) + 3} textAnchor="end" className="chart-y-axis mono">{t}</text>
            </g>
          ))}

          {/* Hour labels */}
          {[0, 6, 12, 18, 23].map((hr) => (
            <text key={`hr-${hr}`} x={getX(hr)} y={h - 6} textAnchor="middle" className="chart-x-axis mono">
              {String(hr).padStart(2, '0')}:00
            </text>
          ))}

          {/* Outdoor Ambient curve (dashed ice) */}
          {pointsOutdoor && (
            <polyline
              points={pointsOutdoor}
              fill="none"
              stroke="var(--espresso-40)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          )}

          {/* Indoor Air curve (bold orange to ice) */}
          <polyline
            points={pointsIndoor}
            fill="none"
            stroke="var(--orange)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Scrubber vertical line indicator */}
          <line
            x1={scrubX}
            y1={padT}
            x2={scrubX}
            y2={h - padB}
            stroke="var(--espresso)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <circle cx={scrubX} cy={getY(hours[scrubHour] ?? tMin)} r="4" fill="var(--orange)" stroke="var(--cream)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="curve-legend">
        <div className="legend-item">
          <span className="legend-line orange-line"></span>
          <span className="legend-text">T_indoor (live solver)</span>
        </div>
        <div className="legend-item">
          <span className="legend-line dashed-line"></span>
          <span className="legend-text">T_outdoor</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch sage-swatch"></span>
          <span className="legend-text">Comfort Zone</span>
        </div>
      </div>
    </div>
  );
}
