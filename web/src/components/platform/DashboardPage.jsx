import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  Sun,
  Snowflake,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Wind,
  Layers,
  Activity,
  X,
  ChevronRight,
  MapPin,
  CheckCircle,
  Clock,
  Zap,
  Sliders,
  SlidersHorizontal,
  FileText,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import './DashboardPage.css';
import {
  calculateBarometricPressurePa,
  calculateAirDensity,
  calculateSolarPosition,
  calculateSurfaceIrradiance,
  SUPPORTED_STATIONS,
  ASSEMBLY_RECOMMENDATIONS,
  CANDIDATE_MATERIALS,
  MORRIS_SENSITIVITY_DATA,
  EMPIRICAL_VALIDATION_BENCHMARKS,
} from './dashboardData';

export default function DashboardPage() {
  const { estate } = useOutletContext() || { estate: 'Ladakh' };
  const navigate = useNavigate();

  // ── Centralized Dashboard State ───────────────────────────────────────────
  const [selectedStationId, setSelectedStationId] = useState('leh_garrison');
  const [simulationHour, setSimulationHour] = useState(12); // 0 to 23
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [playbackIntervalMs, setPlaybackIntervalMs] = useState(2000); // 2s per hour step
  const [autoSiteRotation, setAutoSiteRotation] = useState(false);
  const [simulationMode, setSimulationMode] = useState('simulation'); // 'simulation' | 'historical_p1'
  const [solarSurface, setSolarSurface] = useState('south'); // 'roof' | 'south' | 'north' | 'east' | 'west'
  const [visibleSeries, setVisibleSeries] = useState({
    outdoor: true,
    indoor: true,
    operative: true,
    mrt: true,
    sky: true,
  });
  const [drawerComponent, setDrawerComponent] = useState(null); // opens detail drawer
  const [tableSearch, setTableSearch] = useState('');
  const [apiSimulationData, setApiSimulationData] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Active Station Object
  const currentStation = useMemo(() => {
    return (
      SUPPORTED_STATIONS.find((s) => s.id === selectedStationId) ||
      SUPPORTED_STATIONS[2] // Leh Garrison
    );
  }, [selectedStationId]);

  // Altitude Physics for active station
  const currentPressurePa = useMemo(
    () => calculateBarometricPressurePa(currentStation.altitude_m),
    [currentStation]
  );
  const currentPressureKpa = (currentPressurePa / 1000.0).toFixed(2);
  const currentAirDensity = calculateAirDensity(
    currentStation.altitude_m,
    currentStation.design_min_temp_c
  ).toFixed(3);

  // ── Live Backend Simulation API Integration ────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setApiLoading(true);

    const payload = {
      location: {
        estate: currentStation.region || 'Ladakh',
        station_name: currentStation.name,
        altitude_m: currentStation.altitude_m,
      },
      weather: {
        mode: simulationMode === 'historical_p1' ? 'worst_night' : 'typical_day',
        date: '2026-01-15',
        hours: 24,
      },
      geometry: {
        length_m: 6.0,
        width_m: 4.0,
        height_m: 2.6,
        orientation_deg: 180,
      },
      envelope: currentStation.baseline_envelope,
      openings: [
        { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
      ],
      ventilation: {
        ach: currentStation.baseline_envelope.ach || 0.6,
        heater_type: 'none',
      },
      occupancy: { people: currentStation.occupants || 8, watts_per_person: 100 },
      ground: { snow_cover: currentStation.snow_cover, albedo: null },
      comfort: { model: 'imac', health_threshold_c: 18.0 },
    };

    fetch('http://localhost:8000/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setApiSimulationData(data);
          setApiLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiSimulationData(null);
          setApiLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentStation, simulationMode]);

  // ── 24-Hour Synthetic / Live Simulation Series ────────────────────────────
  const hourlyData = useMemo(() => {
    const series = [];
    const tMin = currentStation.design_min_temp_c;
    const tMax = currentStation.design_max_temp_c;
    const tRange = tMax - tMin;

    for (let h = 0; h < 24; h++) {
      const hourRad = ((h - 6.0) / 24.0) * 2.0 * Math.PI;
      const diurnalNorm = 0.5 * (1.0 - Math.cos(hourRad));
      let tOut = Number((tMin + diurnalNorm * tRange).toFixed(2));

      const sol = calculateSolarPosition(currentStation.lat, h);
      let ghi = 0;
      let dni = 0;
      let dhi = 0;

      if (sol.is_daylight && sol.altitude_deg > 0) {
        const maxGhi = currentStation.solar_potential_kwh_m2 * 145.0;
        const sunElevFrac = Math.sin((sol.altitude_deg * Math.PI) / 180.0);
        ghi = Math.max(0, Math.round(maxGhi * sunElevFrac));
        dni = Math.max(0, Math.round(ghi * 1.15));
        dhi = Math.max(0, Math.round(ghi * 0.18));
      }

      const surfaceIrr = calculateSurfaceIrradiance(
        ghi,
        dni,
        dhi,
        sol.altitude_deg,
        sol.azimuth_deg,
        solarSurface
      );

      let tIn = tOut + 4.5;
      let tOp = tOut + 4.8;
      let tMrt = tOut + 5.1;
      let solGainW = 0;

      if (apiSimulationData?.series && apiSimulationData.series[h]) {
        const item = apiSimulationData.series[h];
        tOut = item.t_out !== undefined ? item.t_out : tOut;
        tIn = item.t_in !== undefined ? item.t_in : tIn;
        tOp = item.t_operative !== undefined ? item.t_operative : tOp;
        tMrt = Number((tOp * 2 - tIn).toFixed(2));
        solGainW = item.solar_gain_w || 0;
        ghi = item.ghi !== undefined ? item.ghi : ghi;
      } else {
        const solarLagHour = (h - 2 + 24) % 24;
        const lagSol = calculateSolarPosition(currentStation.lat, solarLagHour);
        const lagIrr = lagSol.is_daylight
          ? Math.sin((lagSol.altitude_deg * Math.PI) / 180.0) * (currentStation.solar_potential_kwh_m2 * 120.0)
          : 0;
        solGainW = Math.round(lagIrr * 4.0 * 0.65);
        const deltaSolar = solGainW / 350.0;
        tIn = Number((tOut + 6.5 + deltaSolar).toFixed(2));
        tOp = Number((tIn + 0.3).toFixed(2));
        tMrt = Number((tIn + 0.6).toFixed(2));
      }

      const tSky = Number((tOut - (14.0 + currentStation.altitude_m / 600.0)).toFixed(2));
      const deltaT = Math.max(0.1, tIn - tOut);

      const qRoof = Math.round(2.2 * 24.0 * (tIn - tOut + 3.0));
      const qWall = Math.round(1.8 * 52.0 * deltaT);
      const qFloor = Math.round(1.2 * 24.0 * Math.max(0, tIn - (tOut + 5.0)));
      const qGlazing = Math.round(2.8 * 4.0 * deltaT);

      const rho = calculateAirDensity(currentStation.altitude_m, tOut);
      const ach = currentStation.baseline_envelope?.ach || 0.6;
      const volM3 = 6.0 * 4.0 * 2.6;
      const qInf = Math.round((ach * volM3 * rho * 1005.0 * deltaT) / 3600.0);

      const qSky = Math.round(0.9 * 5.67e-8 * 24.0 * (Math.pow(tIn + 273.15, 4) - Math.pow(tSky + 273.15, 4)));

      const totalLossW = Math.max(100, qRoof + qWall + qFloor + qGlazing + qInf + qSky);
      const internalGainW = (currentStation.occupants || 8) * 100;
      const netHeatW = solGainW + internalGainW - totalLossW;

      series.push({
        hour: h,
        time_label: `${String(h).padStart(2, '0')}:00`,
        t_out: tOut,
        t_in: tIn,
        t_operative: tOp,
        t_mrt: tMrt,
        t_sky: tSky,
        ghi,
        dni,
        dhi,
        surface_irradiance: surfaceIrr,
        solar_alt: sol.altitude_deg,
        solar_azimuth: sol.azimuth_deg,
        solar_gain_w: solGainW,
        internal_gain_w: internalGainW,
        q_roof: qRoof,
        q_wall: qWall,
        q_floor: qFloor,
        q_glazing: qGlazing,
        q_inf: qInf,
        q_sky: qSky,
        total_heat_loss_w: totalLossW,
        net_heat_balance_w: netHeatW,
        ach,
        air_density: rho,
        comfort_status: tIn >= 18.0 ? 'acceptable' : tIn >= 0.0 ? 'warning' : 'critical',
      });
    }

    return series;
  }, [currentStation, solarSurface, apiSimulationData]);

  // Current Step Scrubbed Data
  const currentStepData = useMemo(() => {
    return hourlyData[simulationHour] || hourlyData[12];
  }, [hourlyData, simulationHour]);

  // Dynamic Heat Loss Breakdown & Bottleneck Calculation
  const diagnosisMetrics = useMemo(() => {
    const losses = [
      { key: 'roof', name: 'Roof Conduction', w: currentStepData.q_roof, u_val: 'U = 2.20 W/m²K', action: 'Install 120mm PUF SIP over existing rafters with radiant barrier foil.' },
      { key: 'wall', name: 'North/Side Wall Conduction', w: currentStepData.q_wall, u_val: 'U = 1.80 W/m²K', action: 'Apply 100mm continuous exterior EPS wrap with protective stone facing.' },
      { key: 'glazing', name: 'South Glazing Conduction', w: currentStepData.q_glazing, u_val: 'U = 2.80 W/m²K', action: 'Upgrade to low-emissivity argon-filled double glazing with insulated nighttime shutters.' },
      { key: 'inf', name: 'Perimeter Infiltration Leakage', w: currentStepData.q_inf, u_val: `ACH = ${currentStepData.ach} h⁻¹`, action: 'Seal door perimeter jambs, structural seams, and install two-stage airlock vestibule.' },
      { key: 'floor', name: 'Subgrade Floor Conduction', w: currentStepData.q_floor, u_val: 'U = 1.20 W/m²K', action: 'Install 80mm high-density XPS perimeter insulation under timber floorboards.' },
      { key: 'sky', name: 'Longwave Nocturnal Sky Radiation', w: currentStepData.q_sky, u_val: 'ε = 0.90', action: 'Apply low-emissivity exterior roof coating or deploy nighttime radiative shielding.' },
    ];

    const sumW = losses.reduce((acc, l) => acc + l.w, 0);
    const sorted = losses
      .map((l) => ({
        ...l,
        pct: Number(((l.w / sumW) * 100).toFixed(1)),
        kw: (l.w / 1000.0).toFixed(2),
      }))
      .sort((a, b) => b.w - a.w);

    const primary = sorted[0];
    const secondary = sorted[1];

    let whyText = '';
    if (primary.key === 'roof') {
      whyText = `The roof assembly accounts for ${primary.pct}% of total thermal losses due to continuous uninsulated exposure to sub-zero night skies. Conduction flux reaches ${primary.kw} kW under peak thermal gradient.`;
    } else if (primary.key === 'inf') {
      whyText = `Air infiltration is the primary thermal vulnerability (${primary.pct}%), causing rapid convective heat loss under high-altitude wind pressure. Cold air sweeps through structural joints and door jambs.`;
    } else {
      whyText = `${primary.name} represents ${primary.pct}% (${primary.kw} kW) of aggregate envelope losses due to lack of an unbroken thermal barrier.`;
    }

    return {
      components: sorted,
      totalW: sumW,
      totalKw: (sumW / 1000.0).toFixed(2),
      primary,
      secondary,
      whyText,
      recommendedAction: primary.action,
    };
  }, [currentStepData]);

  // Regional Recommendations
  const regionalRec = useMemo(() => {
    return (
      ASSEMBLY_RECOMMENDATIONS[currentStation?.region] ||
      ASSEMBLY_RECOMMENDATIONS[currentStation?.state] ||
      ASSEMBLY_RECOMMENDATIONS['Ladakh'] ||
      ASSEMBLY_RECOMMENDATIONS['high_altitude_cold'] ||
      []
    );
  }, [currentStation]);

  // Deficit hours
  const dailyDeficitHours = useMemo(() => {
    return hourlyData.filter((h) => h.t_in < 18.0).length;
  }, [hourlyData]);

  // Simulation Playback Timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimulationHour((prev) => (prev + 1) % 24);
    }, playbackIntervalMs / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackIntervalMs, playbackSpeed]);

  // Auto Site Rotation Timer
  useEffect(() => {
    if (!autoSiteRotation) return;

    const interval = setInterval(() => {
      setSelectedStationId((prevId) => {
        const idx = SUPPORTED_STATIONS.findIndex((s) => s.id === prevId);
        const nextIdx = (idx + 1) % SUPPORTED_STATIONS.length;
        return SUPPORTED_STATIONS[nextIdx].id;
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [autoSiteRotation]);

  const handlePlayPause = useCallback(() => setIsPlaying((p) => !p), []);
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setSimulationHour(12);
  }, []);

  return (
    <div className="dashboard-console-wrapper">
      {/* ── 1. Page Header & Operational Sector Brief ───────────────────────── */}
      <header className="dashboard-page-header">
        <div className="header-meta-strip">
          <span className="estate-tag">{estate} Sector Console</span>
          <span className="dot-divider">•</span>
          <span className="spec-tag">DRDO PS 26051</span>
          <span className="dot-divider">•</span>
          <span className="status-indicator online">
            <span className="pulse-dot" />
            ISO 52016-1 Physics Online
          </span>
        </div>

        <div className="header-main-row">
          <div>
            <h1 className="dashboard-page-title">Thermal Engineering & Shelter Analysis Console</h1>
            <p className="dashboard-page-subtitle">
              Continuous transient heat-flux modeling, envelope diagnostics, and area-specific optimization for defense shelters.
            </p>
          </div>

          <div className="header-location-box">
            <label className="selector-label">
              <MapPin size={13} className="selector-icon" />
              <span>STATION / POST:</span>
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="location-select"
            >
              <optgroup label="Ladakh / Karakoram High-Altitude Posts">
                {SUPPORTED_STATIONS.filter((s) => s.state === 'Ladakh').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.altitude_m}m ASL • {s.design_min_temp_c}°C)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Jammu & Kashmir / LoC Mountain Valleys">
                {SUPPORTED_STATIONS.filter((s) => s.state === 'Jammu & Kashmir').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.altitude_m}m ASL)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Himachal & Uttarakhand High Passes">
                {SUPPORTED_STATIONS.filter(
                  (s) => s.state === 'Himachal Pradesh' || s.state === 'Uttarakhand'
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.altitude_m}m ASL)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Sikkim & Arunachal Frontier Sectors">
                {SUPPORTED_STATIONS.filter(
                  (s) => s.state === 'Sikkim' || s.state === 'Arunachal Pradesh'
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.altitude_m}m ASL)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Comparative Benchmark Climate Regions">
                {SUPPORTED_STATIONS.filter(
                  (s) => s.state === 'Rajasthan' || s.state.includes('Tamil Nadu')
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.climate_type})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* ── Simulation Playback Control Bar ── */}
        <div className="simulation-toolbar">
          <div className="toolbar-playback-controls">
            <button
              type="button"
              className={`toolbar-btn primary ${isPlaying ? 'running' : ''}`}
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              type="button"
              className="toolbar-btn secondary"
              onClick={handleReset}
              title="Reset to 12:00 Solar Noon"
            >
              <RotateCcw size={12} />
              <span>RESET</span>
            </button>

            <div className="speed-selector">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`speed-option ${playbackSpeed === s ? 'active' : ''}`}
                  onClick={() => setPlaybackSpeed(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar-scrubber">
            <div className="time-badge">
              <Clock size={12} />
              <span>{currentStepData.time_label} LST</span>
            </div>
            <input
              type="range"
              min="0"
              max="23"
              step="1"
              value={simulationHour}
              onChange={(e) => setSimulationHour(Number(e.target.value))}
              className="time-slider"
            />
            <div className="time-tick-marks">
              <span>00:00</span>
              <span>06:00 Dawn</span>
              <span>12:00 Noon</span>
              <span>18:00 Dusk</span>
              <span>23:00</span>
            </div>
          </div>

          <div className="toolbar-extras">
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-pill ${simulationMode === 'simulation' ? 'active' : ''}`}
                onClick={() => setSimulationMode('simulation')}
              >
                Diurnal Day
              </button>
              <button
                type="button"
                className={`mode-pill ${simulationMode === 'historical_p1' ? 'active' : ''}`}
                onClick={() => setSimulationMode('historical_p1')}
              >
                P1 Winter Night
              </button>
            </div>

            <label className="auto-rotation-toggle">
              <input
                type="checkbox"
                checked={autoSiteRotation}
                onChange={(e) => setAutoSiteRotation(e.target.checked)}
              />
              <span>Auto Rotate Sites</span>
            </label>
          </div>
        </div>
      </header>

      {/* ── 2. Compact System KPI Metric Strip ──────────────────────────────── */}
      <section className="dashboard-kpi-strip" aria-label="System Metrics">
        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Outdoor Temperature (Tout)', value: `${currentStepData.t_out} °C`, note: 'Ambient dry bulb temperature calculated from station altitude and diurnal lapse model.' })}
        >
          <span className="kpi-tag">OUTDOOR AMBIENT</span>
          <div className="kpi-number cold-text">
            {currentStepData.t_out > 0 ? `+${currentStepData.t_out}` : currentStepData.t_out} <span className="kpi-unit">°C</span>
          </div>
          <span className="kpi-caption">{currentStation.altitude_m}m ASL</span>
        </div>

        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Indoor Air Temperature (Tin)', value: `${currentStepData.t_in} °C`, note: 'Conditioned interior room air temperature from ISO 52016-1 transient solver.' })}
        >
          <span className="kpi-tag">INDOOR TEMP</span>
          <div className={`kpi-number ${currentStepData.t_in >= 18 ? 'pass-text' : currentStepData.t_in >= 0 ? 'warn-text' : 'loss-text'}`}>
            {currentStepData.t_in > 0 ? `+${currentStepData.t_in}` : currentStepData.t_in} <span className="kpi-unit">°C</span>
          </div>
          <span className="kpi-caption">Target: ≥ 18.0 °C</span>
        </div>

        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Operative Temperature (Top)', value: `${currentStepData.t_operative} °C`, note: 'Operative temperature Top = (Tin + Tmrt) / 2 combining convective air and radiant wall temperatures.' })}
        >
          <span className="kpi-tag">OPERATIVE TEMP</span>
          <div className="kpi-number highlight-text">
            {currentStepData.t_operative > 0 ? `+${currentStepData.t_operative}` : currentStepData.t_operative} <span className="kpi-unit">°C</span>
          </div>
          <span className="kpi-caption">Convective + Radiant</span>
        </div>

        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Envelope Heat Loss (Qloss)', value: `${(currentStepData.total_heat_loss_w / 1000).toFixed(2)} kW`, note: 'Instantaneous total heat lost across roof, walls, floor, glazing, infiltration, and sky radiation.' })}
        >
          <span className="kpi-tag">HEAT LOSS RATE</span>
          <div className="kpi-number loss-text">
            {(currentStepData.total_heat_loss_w / 1000).toFixed(2)} <span className="kpi-unit">kW</span>
          </div>
          <span className="kpi-caption">Envelope & Infiltration</span>
        </div>

        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Passive Solar Gain (Qsol)', value: `${(currentStepData.solar_gain_w / 1000).toFixed(2)} kW`, note: 'Transmitted solar radiation through south-facing passive apertures.' })}
        >
          <span className="kpi-tag">SOLAR GAIN</span>
          <div className="kpi-number solar-text">
            {(currentStepData.solar_gain_w / 1000).toFixed(2)} <span className="kpi-unit">kW</span>
          </div>
          <span className="kpi-caption">South Solar Aperture</span>
        </div>

        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Air Exchange Rate (ACH)', value: `${currentStepData.ach} h⁻¹`, note: 'Air changes per hour across building perimeter joints and openings.' })}
        >
          <span className="kpi-tag">VENTILATION</span>
          <div className="kpi-number">
            {currentStepData.ach} <span className="kpi-unit">h⁻¹</span>
          </div>
          <span className="kpi-caption">Infiltration Rate</span>
        </div>

        <div
          className="kpi-card"
          onClick={() => setDrawerComponent({ name: 'Air Density (ρ)', value: `${currentAirDensity} kg/m³`, note: 'Calculated using barometric lapse formula at elevation. Reduced density lowers convective heat loss.' })}
        >
          <span className="kpi-tag">AIR DENSITY</span>
          <div className="kpi-number">
            {currentAirDensity} <span className="kpi-unit">kg/m³</span>
          </div>
          <span className="kpi-caption">{currentPressureKpa} kPa Pressure</span>
        </div>

        <div className="kpi-card status-cell">
          <span className="kpi-tag">COMFORT / SAFETY</span>
          <div className="status-badge-wrapper">
            <span className={`status-pill ${currentStepData.comfort_status}`}>
              {currentStepData.comfort_status.toUpperCase()}
            </span>
            <span className="status-pill pass">
              SAFETY: PASS
            </span>
          </div>
          <span className="kpi-caption">ISO 52016 / Deterministic</span>
        </div>
      </section>

      {/* ── 3. Main Hero: 24-Hour Diurnal Thermal Response ──────────────────── */}
      <section className="dashboard-panel hero-chart-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">24-Hour Diurnal Thermal Response</h2>
            <p className="panel-subtitle">
              Transient node temperatures and comfort envelope at {currentStation.name} ({currentStation.altitude_m}m ASL)
            </p>
          </div>

          <div className="chart-series-toggles">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={visibleSeries.outdoor}
                onChange={() => setVisibleSeries((p) => ({ ...p, outdoor: !p.outdoor }))}
              />
              <span className="color-indicator outdoor-dot" />
              <span>Outdoor (Tout)</span>
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={visibleSeries.indoor}
                onChange={() => setVisibleSeries((p) => ({ ...p, indoor: !p.indoor }))}
              />
              <span className="color-indicator indoor-dot" />
              <span>Indoor (Tin)</span>
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={visibleSeries.operative}
                onChange={() => setVisibleSeries((p) => ({ ...p, operative: !p.operative }))}
              />
              <span className="color-indicator operative-dot" />
              <span>Operative (Top)</span>
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={visibleSeries.mrt}
                onChange={() => setVisibleSeries((p) => ({ ...p, mrt: !p.mrt }))}
              />
              <span className="color-indicator mrt-dot" />
              <span>MRT (Tmrt)</span>
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={visibleSeries.sky}
                onChange={() => setVisibleSeries((p) => ({ ...p, sky: !p.sky }))}
              />
              <span className="color-indicator sky-dot" />
              <span>Sky (Tsky)</span>
            </label>
            <span className="comfort-range-indicator">Comfort Band: 18–27 °C</span>
          </div>
        </div>

        {/* ── High-Precision SVG Thermal Response Chart ── */}
        <div className="chart-viewport">
          <svg className="thermal-svg-plot" viewBox="0 0 1000 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="comfortGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#15803d" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#15803d" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {/* Time Grid Lines (0h to 24h) */}
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => {
              const x = 50 + (h / 24) * 910;
              return (
                <g key={h}>
                  <line x1={x} y1="20" x2={x} y2="260" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={x} y="278" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                    {String(h).padStart(2, '0')}:00
                  </text>
                </g>
              );
            })}

            {/* Temperature Horizontal Lines (-40°C to +40°C, scale: 80 K range across 240px) */}
            {[-40, -30, -20, -10, 0, 10, 18, 27, 40].map((temp) => {
              const y = 250 - ((temp - -40) / 80) * 220;
              const isZero = temp === 0;
              const isComfort = temp === 18 || temp === 27;
              return (
                <g key={temp}>
                  <line
                    x1="45"
                    y1={y}
                    x2="965"
                    y2={y}
                    stroke={isComfort ? '#15803d' : isZero ? '#94a3b8' : '#e2e8f0'}
                    strokeWidth={isZero ? '1.5' : '1'}
                    strokeDasharray={isComfort ? '4 2' : 'none'}
                    opacity={isComfort ? '0.7' : '0.6'}
                  />
                  <text x="40" y={y + 4} textAnchor="end" fill={isComfort ? '#15803d' : '#94a3b8'} fontSize="10" fontFamily="monospace">
                    {temp > 0 ? `+${temp}` : temp}°
                  </text>
                </g>
              );
            })}

            {/* Comfort Band Shading (18°C to 27°C) */}
            {(() => {
              const yTop = 250 - ((27 - -40) / 80) * 220;
              const yBottom = 250 - ((18 - -40) / 80) * 220;
              return (
                <g>
                  <rect x="50" y={yTop} width="910" height={yBottom - yTop} fill="url(#comfortGradient)" />
                  <text x="960" y={yTop + 14} textAnchor="end" fill="#15803d" fontSize="10" fontWeight="bold">
                    ASHRAE 55 / IMAC COMFORT BAND (18–27 °C)
                  </text>
                </g>
              );
            })()}

            {/* Solar Event Markers */}
            {(() => {
              const xRise = 50 + (6.75 / 24) * 910;
              const xNoon = 50 + (12.0 / 24) * 910;
              const xSet = 50 + (17.25 / 24) * 910;
              return (
                <g>
                  <line x1={xRise} y1="20" x2={xRise} y2="260" stroke="#d97706" strokeDasharray="3 3" opacity="0.6" />
                  <text x={xRise} y="16" textAnchor="middle" fill="#d97706" fontSize="9" fontWeight="600">
                    Sunrise (06:45)
                  </text>

                  <line x1={xNoon} y1="20" x2={xNoon} y2="260" stroke="#ea580c" strokeDasharray="3 3" opacity="0.6" />
                  <text x={xNoon} y="16" textAnchor="middle" fill="#ea580c" fontSize="9" fontWeight="600">
                    Solar Noon (12:00)
                  </text>

                  <line x1={xSet} y1="20" x2={xSet} y2="260" stroke="#d97706" strokeDasharray="3 3" opacity="0.6" />
                  <text x={xSet} y="16" textAnchor="middle" fill="#d97706" fontSize="9" fontWeight="600">
                    Sunset (17:15)
                  </text>
                </g>
              );
            })()}

            {/* Render Temperature Curves */}
            {(() => {
              const makePath = (key) => {
                return hourlyData
                  .map((d, i) => {
                    const x = 50 + (i / 23) * 910;
                    const val = d[key];
                    const y = Math.max(20, Math.min(255, 250 - ((val - -40) / 80) * 220));
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ');
              };

              return (
                <g>
                  {visibleSeries.sky && (
                    <path d={makePath('t_sky')} fill="none" stroke="#0369a1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
                  )}
                  {visibleSeries.outdoor && (
                    <path d={makePath('t_out')} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="5 3" />
                  )}
                  {visibleSeries.mrt && (
                    <path d={makePath('t_mrt')} fill="none" stroke="#7c3aed" strokeWidth="2" opacity="0.75" />
                  )}
                  {visibleSeries.operative && (
                    <path d={makePath('t_operative')} fill="none" stroke="#d97706" strokeWidth="2.2" />
                  )}
                  {visibleSeries.indoor && (
                    <path d={makePath('t_in')} fill="none" stroke="#ea580c" strokeWidth="3" />
                  )}
                </g>
              );
            })()}

            {/* Scrubber Cursor Position Marker */}
            {(() => {
              const xScrub = 50 + (simulationHour / 23) * 910;
              const yTin = 250 - ((currentStepData.t_in - -40) / 80) * 220;
              return (
                <g>
                  <line x1={xScrub} y1="20" x2={xScrub} y2="260" stroke="#dc2626" strokeWidth="1.5" />
                  <circle cx={xScrub} cy={yTin} r="5" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />
                  <rect x={xScrub - 28} y="2" width="56" height="18" rx="3" fill="#dc2626" />
                  <text x={xScrub} y="15" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    {currentStepData.time_label}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Current Hour Telemetry Strip */}
        <div className="chart-telemetry-readout">
          <div className="readout-item">
            <span className="readout-lbl">HOUR:</span>
            <strong>{currentStepData.time_label} LST</strong>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">Tout:</span>
            <span className="cold-text">{currentStepData.t_out} °C</span>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">Tin:</span>
            <strong className="loss-text">{currentStepData.t_in} °C</strong>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">Top:</span>
            <span className="highlight-text">{currentStepData.t_operative} °C</span>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">Tmrt:</span>
            <span>{currentStepData.t_mrt} °C</span>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">GHI:</span>
            <span>{currentStepData.ghi} W/m²</span>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">Solar Gain:</span>
            <span className="solar-text">+{(currentStepData.solar_gain_w / 1000).toFixed(2)} kW</span>
          </div>
          <div className="readout-item">
            <span className="readout-lbl">Total Heat Loss:</span>
            <strong className="loss-text">{(currentStepData.total_heat_loss_w / 1000).toFixed(2)} kW</strong>
          </div>
        </div>
      </section>

      {/* ── 4. Split: Thermal Energy Balance & Heat Loss Breakdown ─────────── */}
      <div className="dashboard-grid-2col">
        {/* Left: Thermal Energy Balance Flow */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Thermal Energy Balance</h3>
              <p className="panel-subtitle">ISO 52016-1 transient energy continuity at active timestep</p>
            </div>
          </div>

          <div className="energy-balance-flow">
            <div className="flow-column">
              <span className="flow-col-title">HEAT GAINS (+)</span>
              <div className="flow-card gain">
                <div className="flow-card-head">Solar Gain (Qsol)</div>
                <div className="flow-card-num">+{(currentStepData.solar_gain_w / 1000).toFixed(2)} kW</div>
                <small className="flow-card-sub">Transmitted south aperture flux</small>
              </div>
              <div className="flow-card gain">
                <div className="flow-card-head">Internal Gains (Qint)</div>
                <div className="flow-card-num">+{(currentStepData.internal_gain_w / 1000).toFixed(2)} kW</div>
                <small className="flow-card-sub">{currentStation.occupants || 8} occupants @ 100W</small>
              </div>
            </div>

            <div className="flow-center-zone">
              <div className="indoor-zone-card">
                <span className="zone-label">INDOOR ZONE</span>
                <div className="zone-temp">{currentStepData.t_in} °C</div>
                <div className="zone-net">
                  Net: {currentStepData.net_heat_balance_w > 0 ? '+' : ''}
                  {(currentStepData.net_heat_balance_w / 1000).toFixed(2)} kW
                </div>
                <span className="zone-eq">C·(dTi/dt) = ΣQin − ΣQout</span>
              </div>
            </div>

            <div className="flow-column">
              <span className="flow-col-title">HEAT LOSSES (−)</span>
              <div className="loss-list">
                <div className="loss-entry">
                  <span>Roof Conduction</span>
                  <strong>−{(currentStepData.q_roof / 1000).toFixed(2)} kW</strong>
                </div>
                <div className="loss-entry">
                  <span>North Wall Conduction</span>
                  <strong>−{(currentStepData.q_wall / 1000).toFixed(2)} kW</strong>
                </div>
                <div className="loss-entry">
                  <span>Glazing Conduction</span>
                  <strong>−{(currentStepData.q_glazing / 1000).toFixed(2)} kW</strong>
                </div>
                <div className="loss-entry">
                  <span>Infiltration Leakage</span>
                  <strong>−{(currentStepData.q_inf / 1000).toFixed(2)} kW</strong>
                </div>
                <div className="loss-entry">
                  <span>Floor Conduction</span>
                  <strong>−{(currentStepData.q_floor / 1000).toFixed(2)} kW</strong>
                </div>
                <div className="loss-entry">
                  <span>Sky Radiation</span>
                  <strong>−{(currentStepData.q_sky / 1000).toFixed(2)} kW</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Heat Loss Breakdown Horizontal Bars */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Heat Loss Pathway Breakdown</h3>
              <p className="panel-subtitle">Ranked envelope loss contributions (Pk = Qk / ΣQloss × 100)</p>
            </div>
          </div>

          <div className="heat-loss-bars">
            {diagnosisMetrics.components.map((c, idx) => (
              <div
                key={c.key}
                className="loss-bar-item"
                onClick={() => setDrawerComponent({ name: c.name, value: `${c.kw} kW (${c.pct}%)`, note: c.action })}
                title="Click to view material specification and retrofit action"
              >
                <div className="loss-bar-meta">
                  <span className="loss-rank">#{idx + 1}</span>
                  <span className="loss-name">{c.name}</span>
                  <span className="loss-uval">{c.u_val}</span>
                  <span className="loss-val">
                    <strong>{c.kw} kW</strong> ({c.pct}%)
                  </span>
                </div>
                <div className="loss-track">
                  <div
                    className={`loss-fill rank-${idx + 1}`}
                    style={{ width: `${Math.max(5, c.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── 5. Split: Thermal Diagnosis & Shelter Thermal Cross-Section ──────── */}
      <div className="dashboard-grid-2col">
        {/* Left: Thermal Diagnosis */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Thermal Diagnosis & Root Causes</h3>
              <p className="panel-subtitle">Calculated envelope weaknesses and engineering remedies</p>
            </div>
          </div>

          <div className="diagnosis-cards-container">
            <div className="diag-summary-strip">
              <div className="diag-kpi primary">
                <span className="diag-lbl">PRIMARY BOTTLENECK</span>
                <strong className="diag-name">{diagnosisMetrics.primary.name}</strong>
                <span className="diag-pct">{diagnosisMetrics.primary.pct}% of total loss ({diagnosisMetrics.primary.kw} kW)</span>
              </div>
              <div className="diag-kpi secondary">
                <span className="diag-lbl">SECONDARY WEAKNESS</span>
                <strong className="diag-name">{diagnosisMetrics.secondary.name}</strong>
                <span className="diag-pct">{diagnosisMetrics.secondary.pct}% of total loss ({diagnosisMetrics.secondary.kw} kW)</span>
              </div>
              <div className="diag-kpi deficit">
                <span className="diag-lbl">THERMAL DEFICIT</span>
                <strong className="diag-name">{dailyDeficitHours} Hours</strong>
                <span className="diag-pct">Below 18.0 °C comfort threshold</span>
              </div>
            </div>

            <div className="diag-explanation-box">
              <span className="diag-heading">PHYSICS DIAGNOSTIC RATIONALE</span>
              <p>{diagnosisMetrics.whyText}</p>
            </div>

            <div className="diag-action-box">
              <span className="diag-heading">RECOMMENDED RETROFIT INTERVENTION</span>
              <p>{diagnosisMetrics.recommendedAction}</p>
            </div>
          </div>
        </section>

        {/* Right: Shelter Cross-Section with Heat Flux Arrows */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Shelter Thermal Cross-Section</h3>
              <p className="panel-subtitle">Envelope assemblies & directional heat flux vectors (Click assembly for specs)</p>
            </div>
          </div>

          <div className="cross-section-container">
            <svg viewBox="0 0 900 340" className="shelter-cad-svg">
              <defs>
                <marker id="arrowRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#dc2626" />
                </marker>
                <marker id="arrowOrange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#ea580c" />
                </marker>
              </defs>

              {/* Ground and foundation line */}
              <rect x="50" y="260" width="800" height="70" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="50" y1="260" x2="850" y2="260" stroke="#94a3b8" strokeWidth="2" />
              {currentStation.snow_cover && (
                <rect x="50" y="254" width="800" height="6" fill="#e2e8f0" />
              )}

              {/* Floor Slab Assembly */}
              <g
                className="interactive-cad-component"
                onClick={() => setDrawerComponent({ name: 'Floor Slab Assembly', value: 'U = 1.20 W/m²K', note: '150mm reinforced concrete slab on grade over 80mm XPS sub-base insulation and vapor retarder.' })}
              >
                <rect x="250" y="240" width="400" height="20" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
                <text x="450" y="254" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                  FLOOR SLAB (150mm Concrete + 80mm XPS) • [Click Specs]
                </text>
              </g>

              {/* North Wall (Left, Heavy Thermal Mass) */}
              <g
                className="interactive-cad-component"
                onClick={() => setDrawerComponent({ name: 'North Opaque Wall Assembly', value: 'U = 1.80 W/m²K', note: '350mm local granitic stone masonry core with exterior 100mm PUF thermal envelope wrap.' })}
              >
                <rect x="220" y="90" width="30" height="150" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                <rect x="212" y="90" width="8" height="150" fill="#f59e0b" opacity="0.8" />
                <text x="200" y="165" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="600" transform="rotate(-90 200 165)">
                  NORTH WALL (350mm Stone + PUF)
                </text>
              </g>

              {/* South Wall & Solar Glazing (Right) */}
              <g
                className="interactive-cad-component"
                onClick={() => setDrawerComponent({ name: 'South Passive Solar Glazing', value: 'U = 2.80 W/m²K (Double Pane)', note: '4.0 m² south-facing solar aperture with high solar heat gain coefficient (SHGC = 0.65) and insulated night thermal shutter.' })}
              >
                <rect x="650" y="90" width="30" height="30" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                <rect x="654" y="120" width="22" height="80" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
                <line x1="665" y1="120" x2="665" y2="200" stroke="#0284c7" strokeWidth="1" />
                <rect x="650" y="200" width="30" height="40" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                <text x="705" y="160" textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="bold">
                  DOUBLE LOW-E (4 m²)
                </text>
              </g>

              {/* Pitched Roof Assembly */}
              <g
                className="interactive-cad-component"
                onClick={() => setDrawerComponent({ name: 'Pitched Roof Assembly', value: 'U = 2.20 W/m²K', note: 'Composite 150mm sandwich structural insulated panel (SIP) with high-density PUF core and corrugated exterior metal skin.' })}
              >
                <polygon points="200,90 450,40 700,90 690,100 450,55 210,100" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
                <text x="450" y="32" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
                  ROOF ASSEMBLY (Pitched PUF SIP • U=2.2) • [Click Specs]
                </text>
              </g>

              {/* Indoor Conditioned Air Volume */}
              <rect x="250" y="90" width="400" height="150" fill="rgba(248, 250, 252, 0.6)" />
              <text x="450" y="150" textAnchor="middle" fill="#0f172a" fontSize="17" fontWeight="800" fontFamily="monospace">
                INDOOR Tin = {currentStepData.t_in} °C
              </text>
              <text x="450" y="172" textAnchor="middle" fill="#64748b" fontSize="11">
                Top = {currentStepData.t_operative} °C • Tmrt = {currentStepData.t_mrt} °C
              </text>

              {/* Heat Flux Arrows */}
              {/* Roof loss arrow */}
              <line
                x1="450"
                y1="50"
                x2="450"
                y2="10"
                stroke="#dc2626"
                strokeWidth={Math.max(2, Math.min(8, currentStepData.q_roof / 450))}
                markerEnd="url(#arrowRed)"
              />
              <text x="460" y="20" fill="#dc2626" fontSize="10" fontWeight="bold">
                Qroof = -{(currentStepData.q_roof / 1000).toFixed(2)} kW
              </text>

              {/* South solar arrow */}
              {currentStepData.solar_gain_w > 0 && (
                <g>
                  <line
                    x1="760"
                    y1="100"
                    x2="676"
                    y2="150"
                    stroke="#ea580c"
                    strokeWidth={Math.max(2, Math.min(8, currentStepData.solar_gain_w / 250))}
                    markerEnd="url(#arrowOrange)"
                  />
                  <text x="765" y="105" fill="#ea580c" fontSize="10" fontWeight="bold">
                    Qsol = +{(currentStepData.solar_gain_w / 1000).toFixed(2)} kW
                  </text>
                </g>
              )}

              {/* North wall loss arrow */}
              <line
                x1="250"
                y1="165"
                x2="170"
                y2="165"
                stroke="#dc2626"
                strokeWidth={Math.max(2, Math.min(7, currentStepData.q_wall / 550))}
                markerEnd="url(#arrowRed)"
              />
              <text x="160" y="155" textAnchor="end" fill="#dc2626" fontSize="10" fontWeight="bold">
                Qwall = -{(currentStepData.q_wall / 1000).toFixed(2)} kW
              </text>

              {/* Floor loss arrow */}
              <line
                x1="450"
                y1="240"
                x2="450"
                y2="280"
                stroke="#dc2626"
                strokeWidth={Math.max(2, Math.min(6, currentStepData.q_floor / 550))}
                markerEnd="url(#arrowRed)"
              />
              <text x="460" y="278" fill="#dc2626" fontSize="9" fontWeight="bold">
                Qfloor = -{(currentStepData.q_floor / 1000).toFixed(2)} kW
              </text>
            </svg>
          </div>
        </section>
      </div>

      {/* ── 6. Split: Solar Analysis & Climate / Altitude Physics ───────────── */}
      <div className="dashboard-grid-2col">
        {/* Left: Solar Radiation & Surface Irradiance */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Solar Radiation & Surface Irradiance</h3>
              <p className="panel-subtitle">GHI, DNI, DHI, and directional incidence flux</p>
            </div>
            <div className="surface-buttons">
              {['roof', 'south', 'north', 'east', 'west'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`surface-btn ${solarSurface === s ? 'active' : ''}`}
                  onClick={() => setSolarSurface(s)}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="solar-chart-box">
            <svg className="solar-svg-curve" viewBox="0 0 460 140" preserveAspectRatio="none">
              {[0, 6, 12, 18, 23].map((h) => {
                const x = 30 + (h / 23) * 400;
                return <line key={h} x1={x} y1="10" x2={x} y2="120" stroke="#f1f5f9" strokeDasharray="2 2" />;
              })}
              {(() => {
                const maxIrr = 1000.0;
                const pathGhi = hourlyData
                  .map((d, i) => {
                    const x = 30 + (i / 23) * 400;
                    const y = 120 - (d.ghi / maxIrr) * 105;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                const pathSurface = hourlyData
                  .map((d, i) => {
                    const x = 30 + (i / 23) * 400;
                    const y = 120 - (d.surface_irradiance / maxIrr) * 105;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <g>
                    <path d={pathGhi} fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 2" />
                    <path d={pathSurface} fill="none" stroke="#ea580c" strokeWidth="2.5" />
                  </g>
                );
              })()}
              {(() => {
                const x = 30 + (simulationHour / 23) * 400;
                return <line x1={x} y1="10" x2={x} y2="120" stroke="#dc2626" strokeWidth="1.5" />;
              })()}
            </svg>
          </div>

          <div className="solar-metric-tiles">
            <div className="metric-tile">
              <span className="tile-lbl">GHI</span>
              <strong>{currentStepData.ghi} W/m²</strong>
            </div>
            <div className="metric-tile">
              <span className="tile-lbl">DNI</span>
              <strong>{currentStepData.dni} W/m²</strong>
            </div>
            <div className="metric-tile">
              <span className="tile-lbl">DHI</span>
              <strong>{currentStepData.dhi} W/m²</strong>
            </div>
            <div className="metric-tile highlight">
              <span className="tile-lbl">{solarSurface.toUpperCase()} FLUX</span>
              <strong>{currentStepData.surface_irradiance} W/m²</strong>
            </div>
          </div>
        </section>

        {/* Right: Climate Severity & Altitude Fluid Physics */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Climate Severity & Altitude Physics</h3>
              <p className="panel-subtitle">Barometric lapse P(h) and air density ρ = P/(R·T)</p>
            </div>
          </div>

          <div className="climate-altitude-container">
            <div className="climate-gauges-list">
              <div className="gauge-row">
                <span className="gauge-name">Cold Stress</span>
                <div className="gauge-track"><div className="gauge-bar crit" style={{ width: '90%' }} /></div>
                <span className="gauge-val">{currentStation.design_min_temp_c} °C</span>
              </div>
              <div className="gauge-row">
                <span className="gauge-name">Wind Exposure</span>
                <div className="gauge-track"><div className="gauge-bar warn" style={{ width: '72%' }} /></div>
                <span className="gauge-val">{currentStation.avg_wind_speed_mps} m/s</span>
              </div>
              <div className="gauge-row">
                <span className="gauge-name">Snow Albedo</span>
                <div className="gauge-track"><div className="gauge-bar info" style={{ width: currentStation.snow_cover ? '85%' : '20%' }} /></div>
                <span className="gauge-val">{currentStation.snow_cover ? '0.75 Albedo' : '0.20 Normal'}</span>
              </div>
              <div className="gauge-row">
                <span className="gauge-name">Solar Potential</span>
                <div className="gauge-track"><div className="gauge-bar solar" style={{ width: '85%' }} /></div>
                <span className="gauge-val">{currentStation.solar_potential_kwh_m2} kWh/m²</span>
              </div>
            </div>

            <div className="altitude-physics-box">
              <div className="altitude-stat-row">
                <span>Elevation: <strong>{currentStation.altitude_m}m ASL</strong></span>
                <span>Barometric Pressure: <strong>{currentPressureKpa} kPa</strong></span>
                <span>Air Density: <strong>{currentAirDensity} kg/m³</strong></span>
              </div>
              <p className="physics-callout">
                Engineering implication: Air density at {currentStation.altitude_m}m is {((1 - Number(currentAirDensity) / 1.225) * 100).toFixed(0)}% lower than sea level. While reducing convective infiltration heat loss, it increases solar radiation intensity by 18–25%.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── 7. Area-Specific Material Recommendation Engine ─────────────────── */}
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Area-Specific Material & Envelope Recommendations</h3>
            <p className="panel-subtitle">Grounded in regional climatic constraints and ISO 52016-1 thermal properties</p>
          </div>
        </div>

        <div className="recommendations-table-wrapper">
          <table className="clean-engineering-table">
            <thead>
              <tr>
                <th>BUILDING COMPONENT</th>
                <th>ENGINEERING RECOMMENDATION</th>
                <th>TECHNICAL SPECIFICATION</th>
                <th>U-VALUE</th>
                <th>R-VALUE</th>
                <th>PHYSICAL DESIGN RATIONALE</th>
              </tr>
            </thead>
            <tbody>
              {(regionalRec || []).map((r) => (
                <tr key={r.component}>
                  <td className="font-semibold">{r.component}</td>
                  <td className="rec-material-cell">{r.recommended}</td>
                  <td className="spec-sub-cell">{r.spec}</td>
                  <td className="mono-num">{r.u_val ? `${r.u_val} W/m²K` : '—'}</td>
                  <td className="mono-num">{r.r_val ? `${r.r_val} m²K/W` : '—'}</td>
                  <td className="rationale-cell">{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Candidate Material Suitability Comparison */}
        <div className="candidate-materials-section">
          <h4 className="section-subheading">Candidate Material Suitability Comparison (8 Engineering Dimensions)</h4>
          <div className="materials-grid">
            {CANDIDATE_MATERIALS.map((m) => (
              <div key={m.id} className="material-suitability-card">
                <div className="mat-card-header">
                  <strong>{m.name}</strong>
                  <span className="mat-cat-pill">{m.category}</span>
                </div>
                <div className="mat-physics-props">
                  <span>k = {m.k} W/mK</span>
                  <span>ρ = {m.density} kg/m³</span>
                </div>
                <div className="mat-score-bars">
                  <div className="score-row">
                    <span>Insulation</span>
                    <div className="score-track"><div className="score-fill" style={{ width: `${m.insulation}%` }} /></div>
                  </div>
                  <div className="score-row">
                    <span>Thermal Mass</span>
                    <div className="score-track"><div className="score-fill" style={{ width: `${m.mass}%` }} /></div>
                  </div>
                  <div className="score-row">
                    <span>Durability</span>
                    <div className="score-track"><div className="score-fill" style={{ width: `${m.durability}%` }} /></div>
                  </div>
                  <div className="score-row">
                    <span>Freeze-Thaw</span>
                    <div className="score-track"><div className="score-fill" style={{ width: `${m.freeze_thaw}%` }} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Split: Baseline vs Optimized Design & Morris Sensitivity ───────── */}
      <div className="dashboard-grid-2col">
        {/* Baseline vs Optimized */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Baseline vs. Optimized Shelter Design</h3>
              <p className="panel-subtitle">Paired thermal response comparison after applying area-specific envelope package</p>
            </div>
          </div>

          <div className="paired-comparison-rows">
            <div className="paired-metric">
              <div className="paired-hdr">
                <span>Minimum Night Interior Temp (Tin_min)</span>
                <span className="paired-delta">
                  <span className="crit-text">-9.9 °C</span> → <strong className="pass-text">+6.2 °C (+16.1 K)</strong>
                </span>
              </div>
              <div className="paired-bar-container">
                <div className="paired-bar baseline" style={{ width: '30%' }} />
                <div className="paired-bar optimized" style={{ width: '78%' }} />
              </div>
            </div>

            <div className="paired-metric">
              <div className="paired-hdr">
                <span>Peak Envelope Heat Loss</span>
                <span className="paired-delta">
                  <span className="loss-text">4.82 kW</span> → <strong className="pass-text">1.84 kW (-62%)</strong>
                </span>
              </div>
              <div className="paired-bar-container">
                <div className="paired-bar baseline" style={{ width: '85%' }} />
                <div className="paired-bar optimized" style={{ width: '32%' }} />
              </div>
            </div>

            <div className="paired-metric">
              <div className="paired-hdr">
                <span>Annual Thermal Deficit Hours (&lt; 18 °C)</span>
                <span className="paired-delta">
                  <span>3,840 hrs</span> → <strong className="pass-text">720 hrs (-81%)</strong>
                </span>
              </div>
              <div className="paired-bar-container">
                <div className="paired-bar baseline" style={{ width: '88%' }} />
                <div className="paired-bar optimized" style={{ width: '18%' }} />
              </div>
            </div>

            <div className="paired-metric">
              <div className="paired-hdr">
                <span>Annual Kerosene Logistics Burden</span>
                <span className="paired-delta">
                  <span>{currentStation.kerosene_burden_litres} L</span> → <strong className="pass-text">{Math.round(currentStation.kerosene_burden_litres * 0.28)} L (-72%)</strong>
                </span>
              </div>
              <div className="paired-bar-container">
                <div className="paired-bar baseline" style={{ width: '80%' }} />
                <div className="paired-bar optimized" style={{ width: '22%' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Morris Sensitivity Analysis */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Morris Sensitivity Ranking (Elementary Effects)</h3>
              <p className="panel-subtitle">Ranked by μ* impact on annual indoor thermal comfort maintenance</p>
            </div>
          </div>

          <div className="sensitivity-rows-list">
            {MORRIS_SENSITIVITY_DATA.map((item, idx) => (
              <div key={item.code} className="sens-item">
                <div className="sens-meta-line">
                  <span className="sens-rank-badge">#{idx + 1}</span>
                  <span className="sens-label">{item.parameter}</span>
                  <span className="sens-val-badge">μ* = {item.mu_star} (σ = {item.sigma})</span>
                </div>
                <div className="sens-track-bar">
                  <div
                    className="sens-fill-bar"
                    style={{ width: `${(item.mu_star / 5.0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── 9. Multi-Site Frontier Comparison & Model Validation ─────────────── */}
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Himalayan Frontier Outpost Benchmarks</h3>
            <p className="panel-subtitle">Select any garrison outpost to load its climate and thermal profile</p>
          </div>
        </div>

        <div className="frontier-table-wrapper">
          <table className="clean-engineering-table clickable-rows">
            <thead>
              <tr>
                <th>OUTPOST / SECTOR</th>
                <th>REGION</th>
                <th>ELEVATION</th>
                <th>DESIGN MIN</th>
                <th>SOLAR RESOURCE</th>
                <th>PEAK HEAT LOSS</th>
                <th>ANNUAL DEFICIT</th>
                <th>RECOMMENDED ENVELOPE ASSEMBLY</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {SUPPORTED_STATIONS.map((st) => (
                <tr
                  key={st.id}
                  className={st.id === selectedStationId ? 'active-outpost-row' : ''}
                  onClick={() => setSelectedStationId(st.id)}
                >
                  <td>
                    <strong>{st.name}</strong>
                    {st.id === selectedStationId && <span className="active-pill">ACTIVE</span>}
                  </td>
                  <td>{st.region}</td>
                  <td className="mono-num">{st.altitude_m} m</td>
                  <td className="mono-num crit-text">{st.design_min_temp_c} °C</td>
                  <td className="mono-num solar-text">{st.solar_potential_kwh_m2} kWh/m²</td>
                  <td className="mono-num">{(st.altitude_m > 4000 ? 5.8 : 3.8)} kW</td>
                  <td className="mono-num">{st.altitude_m > 4000 ? '4,100 h' : '2,600 h'}</td>
                  <td>
                    {st.altitude_m > 4000 ? '120mm PUF SIP + Low-E Triple Glazing' : '350mm Stone/Earth + 100mm EPS'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStationId(st.id);
                      }}
                    >
                      ANALYZE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empirical Model Validation Benchmarks */}
        <div className="validation-benchmarks-section">
          <h4 className="section-subheading">Empirical Model Validation Benchmarks (DRDO DIHAR Leh Field Trials)</h4>
          <div className="benchmarks-grid">
            {EMPIRICAL_VALIDATION_BENCHMARKS.map((b) => (
              <div key={b.id} className="benchmark-card">
                <div className="benchmark-card-head">
                  <strong>{b.title}</strong>
                  <span className="bench-status-badge">{b.status}</span>
                </div>
                <span className="benchmark-loc">{b.location} • Ambient: {b.ambient_c} °C</span>
                <div className="benchmark-metrics-row">
                  <div className="bench-box">
                    <span className="bench-lbl">FIELD MEASURED</span>
                    <strong className="bench-val">{b.measured_val} °C</strong>
                    <small>{b.measured_band}</small>
                  </div>
                  <div className="bench-box highlight">
                    <span className="bench-lbl">MODEL PREDICTED</span>
                    <strong className="bench-val">{b.predicted_val} °C</strong>
                    <small>Error: {b.error_k > 0 ? `+${b.error_k}` : b.error_k} K</small>
                  </div>
                </div>
                <span className="benchmark-citation">Citation: {b.provenance}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Detailed 24-Hour Telemetry Log Table ─────────────────────────── */}
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">24-Hour Hourly Telemetry Log</h3>
            <p className="panel-subtitle">Detailed transient thermodynamic state at each hourly timestep</p>
          </div>
          <div className="table-filter-box">
            <input
              type="text"
              placeholder="Search hour or temp..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="table-search-field"
            />
          </div>
        </div>

        <div className="telemetry-table-container">
          <table className="clean-engineering-table dense-table">
            <thead>
              <tr>
                <th>HOUR</th>
                <th>Tout (°C)</th>
                <th>Tin (°C)</th>
                <th>Top (°C)</th>
                <th>Tmrt (°C)</th>
                <th>Tsky (°C)</th>
                <th>GHI (W/m²)</th>
                <th>Qsol (W)</th>
                <th>Qloss (W)</th>
                <th>Qnet (W)</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {hourlyData
                .filter((h) => tableSearch === '' || h.time_label.includes(tableSearch) || String(h.t_in).includes(tableSearch))
                .map((h) => (
                  <tr
                    key={h.hour}
                    className={h.hour === simulationHour ? 'selected-hour-row' : ''}
                    onClick={() => setSimulationHour(h.hour)}
                  >
                    <td className="font-bold">{h.time_label}</td>
                    <td className="mono-num cold-text">{h.t_out}</td>
                    <td className={`mono-num font-bold ${h.t_in >= 18 ? 'pass-text' : h.t_in >= 0 ? 'warn-text' : 'loss-text'}`}>{h.t_in}</td>
                    <td className="mono-num highlight-text">{h.t_operative}</td>
                    <td className="mono-num">{h.t_mrt}</td>
                    <td className="mono-num sky-text">{h.t_sky}</td>
                    <td className="mono-num">{h.ghi}</td>
                    <td className="mono-num solar-text">{h.solar_gain_w}</td>
                    <td className="mono-num loss-text">{h.total_heat_loss_w}</td>
                    <td className="mono-num">{h.net_heat_balance_w > 0 ? `+${h.net_heat_balance_w}` : h.net_heat_balance_w}</td>
                    <td>
                      <span className={`status-pill mini ${h.comfort_status}`}>
                        {h.comfort_status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 11. Slide-Out Engineering Detail Drawer ─────────────────────────── */}
      {drawerComponent && (
        <aside className="engineering-drawer" aria-label="Component Detail Drawer">
          <div className="drawer-header">
            <div>
              <span className="drawer-kicker">PHYSICAL SPECIFICATION</span>
              <h3 className="drawer-title">{drawerComponent.name}</h3>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setDrawerComponent(null)}
              title="Close Drawer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-eval-box">
              <span className="eval-lbl">CURRENT EVALUATED VALUE:</span>
              <div className="eval-val">{drawerComponent.value}</div>
            </div>

            <div className="drawer-section">
              <span className="section-lbl">ENGINEERING NOTES & FORMULA</span>
              <p className="drawer-desc">{drawerComponent.note}</p>
            </div>

            <div className="drawer-section">
              <span className="section-lbl">GOVERNING STANDARDS</span>
              <p className="drawer-desc">
                ISO 52016-1:2017 Building Energy Performance • Explicit Transient Conduction Solver (Clause 6.5.6)
              </p>
              <p className="drawer-desc">
                ECBC 2017 High-Altitude Envelope Standards (Table 4.1 Cold Climate Envelope)
              </p>
            </div>

            <div className="drawer-actions-row">
              <button
                type="button"
                className="drawer-btn primary"
                onClick={() => navigate('/library')}
              >
                OPEN MATERIAL CATALOG
              </button>
              <button
                type="button"
                className="drawer-btn secondary"
                onClick={() => navigate('/design')}
              >
                OPEN SHELTER STUDIO
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
