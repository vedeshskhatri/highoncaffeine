import React from 'react';
import './DayScrubber.css';

export default function DayScrubber({ scrubHour, onChangeScrubHour, simulateResult }) {
  const series = simulateResult?.series || [];
  const curData = series.find((s) => s.hour === scrubHour) || series[0] || {};
  const tIn = curData.t_in ?? -32.28;
  const tOut = curData.t_out ?? -28.1;
  const ghi = curData.ghi ?? 0;
  const surfaces = simulateResult?.surfaces || [];
  const roofFlux = surfaces.find((s) => s.name?.includes('roof'))?.flux_w ?? 45.0;
  const wallFlux = surfaces.find((s) => s.name?.includes('wall'))?.flux_w ?? 30.0;

  return (
    <div className="day-scrubber-container">
      <div className="scrubber-top-row">
        <div className="scrubber-badge-group">
          <span className="scrubber-label">24-HOUR DIURNAL TIMELINE</span>
          <span className="scrubber-time-hero mono">
            {String(scrubHour).padStart(2, '0')}:00 {scrubHour < 12 ? 'AM' : 'PM'}
          </span>
          <span className="scrubber-sun-phase mono">
            {scrubHour >= 6 && scrubHour <= 18 ? '☀ Daytime Solar' : '🌙 Night Vacuum Radiation'}
          </span>
        </div>

        <div className="scrubber-telemetry-ticking">
          <div className="tick-stat">
            <span className="tick-label">T_in:</span>
            <span className="tick-val mono" style={{ color: tIn >= 18 ? 'var(--sage)' : tIn >= 0 ? 'var(--orange)' : 'var(--ice)' }}>
              {tIn.toFixed(1)} °C
            </span>
          </div>
          <div className="tick-stat">
            <span className="tick-label">T_out:</span>
            <span className="tick-val mono">{tOut.toFixed(1)} °C</span>
          </div>
          <div className="tick-stat">
            <span className="tick-label">Solar GHI:</span>
            <span className="tick-val mono">{Math.round(ghi)} W/m²</span>
          </div>
          <div className="tick-stat">
            <span className="tick-label">Roof Sky Flux:</span>
            <span className="tick-val mono">{Math.round(roofFlux)} W</span>
          </div>
          <div className="tick-stat">
            <span className="tick-label">Wall Heat Loss:</span>
            <span className="tick-val mono">{Math.round(wallFlux)} W</span>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="slider-wrapper">
        <input
          type="range"
          min="0"
          max="23"
          step="1"
          value={scrubHour}
          onChange={(e) => onChangeScrubHour(Number(e.target.value))}
          className="scrubber-slider"
        />
        <div className="slider-hour-marks">
          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hr) => (
            <span
              key={hr}
              className={`hour-mark mono ${hr === scrubHour ? 'active' : ''}`}
              onClick={() => onChangeScrubHour(hr)}
            >
              {String(hr).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
