/*
 * SolarController.jsx — Interactive Diurnal Solar Station & Sun Controller
 * Allows real-time solar scrubbing, 3D shadow tracking, astronomical telemetry,
 * and seasonal solstice analysis.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Play,
  Pause,
  Clock,
  Compass,
  Zap,
  Flame,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Calendar,
} from 'lucide-react';
import './SolarController.css';

export const SEASONS = {
  winter: { name: 'Winter Solstice (Dec 21)', maxAlt: 32.4, peakDni: 920, sunrise: 7.2, sunset: 17.1 },
  equinox: { name: 'Spring Equinox (Mar 21)', maxAlt: 55.8, peakDni: 1040, sunrise: 6.2, sunset: 18.2 },
  summer: { name: 'Summer Solstice (Jun 21)', maxAlt: 79.2, peakDni: 1080, sunrise: 5.3, sunset: 19.4 },
};

/**
 * Computes solar altitude, azimuth, and direct beam radiation for high-altitude Leh (34.15° N, 3500m)
 */
export function computeSolarPosition(hourFloat, seasonKey = 'winter', orientationDeg = 180) {
  const season = SEASONS[seasonKey] || SEASONS.winter;
  const { maxAlt, sunrise, sunset, peakDni } = season;

  const isDay = hourFloat >= sunrise && hourFloat <= sunset;
  if (!isDay) {
    return {
      altitudeDeg: 0,
      azimuthDeg: 0,
      dni_wm2: 0,
      apertureGainKw: 0,
      isDay: false,
    };
  }

  // Sinusoidal elevation curve between sunrise and sunset
  const dayProgress = (hourFloat - sunrise) / (sunset - sunrise); // 0 to 1
  const altitudeDeg = Math.max(0, Math.sin(dayProgress * Math.PI) * maxAlt);

  // Azimuth tracks from East (approx 120° in winter) through South (180°) to West (approx 240°)
  const azimuthSpan = seasonKey === 'summer' ? 220 : 120;
  const startAz = 180 - azimuthSpan / 2;
  const azimuthDeg = startAz + dayProgress * azimuthSpan;

  // Clear-sky high-altitude DNI (W/m²) scaled by optical air mass
  const altRad = (altitudeDeg * Math.PI) / 180;
  const dni_wm2 = Math.round(peakDni * Math.pow(Math.sin(altRad), 0.65));

  // Gain incident on South-facing aperture
  const relAzimuthRad = ((azimuthDeg - orientationDeg) * Math.PI) / 180;
  const cosIncidence = Math.max(0, Math.cos(altRad) * Math.cos(relAzimuthRad));
  const apertureGainKw = ((dni_wm2 * cosIncidence * 4.0 * 0.72) / 1000).toFixed(2);

  return {
    altitudeDeg: parseFloat(altitudeDeg.toFixed(1)),
    azimuthDeg: parseFloat(azimuthDeg.toFixed(1)),
    dni_wm2,
    apertureGainKw: parseFloat(apertureGainKw),
    isDay: true,
  };
}

export default function SolarController({
  solarHour = 12.0,
  onHourChange,
  season = 'winter',
  onSeasonChange,
  orientationDeg = 180,
  southGlazingArea = 4.0,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());

  // Diurnal animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const loop = (now) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Advance 1 hour every 2.5 seconds
      const hourDelta = deltaSec * 0.45;
      const nextHour = solarHour + hourDelta;

      if (nextHour > 18.0) {
        onHourChange(6.5);
      } else {
        onHourChange(nextHour);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, solarHour, onHourChange]);

  const telemetry = computeSolarPosition(solarHour, season, orientationDeg);

  // Format hour into HH:MM AM/PM
  const formatTime = (h) => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    const padH = hours % 12 === 0 ? 12 : hours % 12;
    const padM = minutes < 10 ? `0${minutes}` : minutes;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${padH}:${padM} ${ampm}`;
  };

  return (
    <div className={`solar-controller-dock ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* ── Header Row ──────────────────────────────────────────────── */}
      <div className="solar-controller-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="solar-title-group">
          <div className="solar-icon-pulse">
            <Sun size={15} className="solar-sun-icon" />
          </div>
          <div>
            <div className="solar-main-title">Solar Celestial Station</div>
            <div className="solar-sub-title">
              {formatTime(solarHour)} · {telemetry.altitudeDeg}° Alt
            </div>
          </div>
        </div>

        <div className="solar-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`solar-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Diurnal Animation' : 'Play 24h Diurnal Solar Transit'}
            aria-label="Toggle Solar Animation"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: 2 }} />}
          </button>
          <button
            className="solar-collapse-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Station' : 'Expand Station'}
          >
            {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Controls & Telemetry ───────────────────────────── */}
      {isExpanded && (
        <div className="solar-controller-body">
          {/* Time Scrubber Slider */}
          <div className="solar-scrubber-group">
            <div className="solar-scrubber-labels">
              <span className="scrubber-label">Dawn (07:00)</span>
              <span className="scrubber-current">{formatTime(solarHour)}</span>
              <span className="scrubber-label">Dusk (17:30)</span>
            </div>
            <div className="scrubber-track-container">
              <input
                type="range"
                min="6.5"
                max="18.0"
                step="0.05"
                value={solarHour}
                onChange={(e) => {
                  setIsPlaying(false);
                  onHourChange(parseFloat(e.target.value));
                }}
                className="solar-time-slider"
                aria-label="Solar Time Scrubber"
              />
            </div>
          </div>

          {/* Quick Jump Buttons */}
          <div className="solar-quick-times">
            <button
              className={`solar-time-chip ${Math.abs(solarHour - 7.5) < 0.4 ? 'active' : ''}`}
              onClick={() => { setIsPlaying(false); onHourChange(7.5); }}
            >
              Dawn 07:30
            </button>
            <button
              className={`solar-time-chip ${Math.abs(solarHour - 12.0) < 0.3 ? 'active' : ''}`}
              onClick={() => { setIsPlaying(false); onHourChange(12.0); }}
            >
              Solar Noon 12:00
            </button>
            <button
              className={`solar-time-chip ${Math.abs(solarHour - 16.5) < 0.4 ? 'active' : ''}`}
              onClick={() => { setIsPlaying(false); onHourChange(16.5); }}
            >
              Dusk 16:30
            </button>
          </div>

          {/* Real-Time Telemetry Grid */}
          <div className="solar-telemetry-grid">
            <div className="solar-stat-card">
              <div className="stat-label">Altitude</div>
              <div className="stat-value">{telemetry.altitudeDeg}°</div>
              <div className="stat-caption">Elevation Angle</div>
            </div>
            <div className="solar-stat-card">
              <div className="stat-label">Azimuth</div>
              <div className="stat-value">{telemetry.azimuthDeg}°</div>
              <div className="stat-caption">{telemetry.azimuthDeg > 180 ? 'South-West' : 'South-East'}</div>
            </div>
            <div className="solar-stat-card highlight">
              <div className="stat-label">Direct Radiation</div>
              <div className="stat-value">{telemetry.dni_wm2} <span className="stat-unit">W/m²</span></div>
              <div className="stat-caption">3,500m Clear Sky DNI</div>
            </div>
            <div className="solar-stat-card solar-gain">
              <div className="stat-label">Aperture Gain</div>
              <div className="stat-value">{telemetry.apertureGainKw} <span className="stat-unit">kW</span></div>
              <div className="stat-caption">Through South Glazing</div>
            </div>
          </div>

          {/* Season Selector */}
          <div className="solar-season-row">
            <span className="season-row-label">Solstice:</span>
            <div className="season-pills">
              {Object.keys(SEASONS).map((sKey) => (
                <button
                  key={sKey}
                  className={`season-pill ${season === sKey ? 'active' : ''}`}
                  onClick={() => onSeasonChange && onSeasonChange(sKey)}
                >
                  {sKey === 'winter' ? 'Winter Dec 21' : sKey === 'equinox' ? 'Equinox Mar 21' : 'Summer Jun 21'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
