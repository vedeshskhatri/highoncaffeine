import React, { useState } from 'react';
import { 
  Sun, 
  Snowflake, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Thermometer, 
  Activity,
  AlertTriangle
} from 'lucide-react';
import './ThermalCollapseComparison.css';

// Keyframe presets for the diurnal cycle (Indices based on 10:00 AM start, 0 to 24)
const KEYFRAMES = [
  {
    hour: 14,
    index: 4,
    label: '14:00 · Peak Solar Gain',
    note: 'South glazing harvests 1,050 W/m² direct Himalayan solar flux. 300mm Trombe stone core actively absorbs and accumulates sensible heat.'
  },
  {
    hour: 18,
    index: 8,
    label: '18:00 · Sunset & Shutter Seal',
    note: 'Solar flux ceases. Automated R-2.5 nocturnal insulation blanket seals south envelope. CGI tin barracks begin immediate, steep thermal collapse.'
  },
  {
    hour: 4,
    index: 18,
    label: '04:00 · Critical Thermal Crash',
    note: 'Peak radiative heat drain into -35°C deep sky void. CGI crashes to -18°C. THERMA 300mm mass wall releases phase-delayed heat, holding +18.0°C without fuel.'
  },
  {
    hour: 8,
    index: 22,
    label: '08:00 · Dawn Solar Return',
    note: 'Morning sun re-emerges over Himalayan ridgeline. Nocturnal shutters retract as direct insolation begins recharging thermal mass for the next diurnal cycle.'
  }
];

export default function ThermalCollapseComparison() {
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState(2); // default 04:00 AM Crash
  const activeFrame = KEYFRAMES[selectedKeyframeIndex];

  // SVG Chart Dimensions
  const chartW = 760;
  const chartH = 210;
  const padL = 48;
  const padR = 28;
  const padT = 32;
  const padB = 36;

  // Evenly spaced 24-hour timeline checkpoints
  const hourCheckpoints = [
    { index: 0,  text: '10:00' },
    { index: 4,  text: '14:00' },
    { index: 8,  text: '18:00' },
    { index: 12, text: '22:00' },
    { index: 14, text: '00:00' },
    { index: 18, text: '04:00 CRASH', isCrash: true },
    { index: 22, text: '08:00' },
    { index: 24, text: '10:00' }
  ];

  // Temperature domain: -32°C to +26°C
  const minTemp = -32;
  const maxTemp = 26;
  const getX = (idx24) => padL + (idx24 / 24) * (chartW - padL - padR);
  const getY = (t) => padT + (1 - (t - minTemp) / (maxTemp - minTemp)) * (chartH - padT - padB);

  // 25 data points (index 0 = 10:00 AM, index 18 = 04:00 AM, index 24 = 10:00 AM next day)
  const ambient24 = [
    -10, -8, -6, -5, -6, -8, -11, -14, -17, -19, -21, -23, -25, -27, -27, -28, -28, -28, -28, -26, -23, -20, -17, -13, -10
  ];
  const cgi24 = [
    -2, 2, 6, 8, 7, 5, 2, -1, -5, -8, -11, -13, -15, -16, -17, -17, -18, -18, -18, -17, -14, -10, -6, -2, 1
  ];
  const therma24 = [
    18, 19.5, 21.0, 22.0, 21.8, 21.4, 21.0, 20.6, 20.2, 19.8, 19.5, 19.2, 18.9, 18.6, 18.4, 18.2, 18.1, 18.0, 18.0, 18.1, 18.3, 18.6, 19.0, 19.6, 20.2
  ];

  const ambientPath = ambient24.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(t).toFixed(1)}`).join(' ');
  const cgiPath = cgi24.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(t).toFixed(1)}`).join(' ');
  const thermaPath = therma24.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(t).toFixed(1)}`).join(' ');

  // Shaded WHO Comfort zone (18°C to 24°C)
  const yComfortTop = getY(24);
  const yComfortBottom = getY(18);
  const comfortHeight = yComfortBottom - yComfortTop;

  const activeHourIndex = activeFrame.index;
  const activeX = getX(activeHourIndex);

  return (
    <section className="thermal-collapse-section" id="thermal-collapse-benchmark">
      <div className="thermal-collapse-container">
        
        {/* ── 1. Architectural Section Header ── */}
        <div className="collapse-header">
          <div className="collapse-header-meta">
            <span className="dossier-pill">DRDO DIHAR FIELD BENCHMARK · PS 26051</span>
            <span className="dossier-coordinates">SIACHEN SECTOR · 5,400M AMSL · ATMOSPHERIC DENSITY 52%</span>
          </div>

          <h2 className="collapse-main-title">
            The 04:00 AM Thermal Collapse
          </h2>

          <p className="collapse-lede">
            Under hyper-arid Himalayan night skies, black-body radiation bleeds heat directly into deep space 
            (<strong>-35 °C</strong> effective radiative sky sink). Standard tin shelters suffer immediate thermal exhaustion. 
            Here is the physical divergence between uninsulated iron and phase-delayed solar inertia.
          </p>
        </div>

        {/* ── 2. Interactive Diurnal Thermal Cycle Visualizer ── */}
        <div className="diurnal-cycle-card">
          <div className="cycle-card-topbar">
            <div className="cycle-title-group">
              <span className="cycle-tag">DIURNAL SIMULATION (5R1C TRANSIENT SOLVER)</span>
              <h3 className="cycle-heading">24-Hour Interior vs. Radiative Sky Temperature</h3>
            </div>

            {/* Keyframe Selector Tabs */}
            <div className="cycle-keyframe-controls" role="tablist" aria-label="Thermal timeline keyframes">
              {KEYFRAMES.map((kf, idx) => (
                <button
                  key={kf.hour}
                  type="button"
                  role="tab"
                  aria-selected={idx === selectedKeyframeIndex}
                  className={`keyframe-tab ${idx === selectedKeyframeIndex ? 'active' : ''}`}
                  onClick={() => setSelectedKeyframeIndex(idx)}
                >
                  <Clock size={12} className="tab-clock-icon" />
                  <span>{kf.label.split('·')[0].trim()}</span>
                  {kf.hour === 4 && <span className="tab-mini-badge">CRASH</span>}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Transient Response Chart */}
          <div className="cycle-svg-wrap">
            <svg 
              className="cycle-svg" 
              viewBox={`0 0 ${chartW} ${chartH}`}
              preserveAspectRatio="xMidYMid meet"
              aria-label="24-hour diurnal thermal simulation graph"
            >
              <defs>
                <linearGradient id="comfortGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#15803D" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#15803D" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[-20, -10, 0, 18].map((temp) => (
                <g key={temp}>
                  <line 
                    x1={padL} 
                    y1={getY(temp)} 
                    x2={chartW - padR} 
                    y2={getY(temp)} 
                    stroke={temp === 0 ? '#94A3B8' : temp === 18 ? 'rgba(21, 128, 61, 0.4)' : '#E2E8F0'} 
                    strokeWidth={temp === 0 ? '1.5' : '1'}
                    strokeDasharray={temp === 18 ? '4,4' : 'none'}
                  />
                  <text 
                    x={padL - 8} 
                    y={getY(temp) + 3.5} 
                    textAnchor="end" 
                    className="chart-axis-label"
                    fill={temp === 18 ? '#15803D' : temp === 0 ? '#475569' : '#94A3B8'}
                  >
                    {temp > 0 ? `+${temp}°` : `${temp}°`}
                  </text>
                </g>
              ))}

              {/* WHO Comfort Band */}
              <rect 
                x={padL} 
                y={yComfortTop} 
                width={chartW - padL - padR} 
                height={comfortHeight} 
                fill="url(#comfortGrad)" 
              />
              <text 
                x={chartW - padR - 8} 
                y={yComfortTop - 6} 
                textAnchor="end" 
                className="chart-comfort-label"
              >
                WHO Standard Habitability Band (+18 °C to +24 °C)
              </text>

              {/* Time X-Axis Checkpoints */}
              {hourCheckpoints.map((cp) => {
                const xPos = getX(cp.index);
                return (
                  <g key={cp.text}>
                    <line x1={xPos} y1={chartH - padB} x2={xPos} y2={chartH - padB + 5} stroke={cp.isCrash ? '#DC2626' : '#CBD5E1'} strokeWidth={cp.isCrash ? '1.5' : '1'} />
                    <text 
                      x={xPos} 
                      y={chartH - padB + 16} 
                      textAnchor="middle" 
                      className={`chart-time-label ${cp.isCrash ? 'crash-label' : ''}`}
                    >
                      {cp.text}
                    </text>
                  </g>
                );
              })}

              {/* Ambient Curve */}
              <path d={ambientPath} fill="none" stroke="#94A3B8" strokeWidth="1.6" strokeDasharray="4,3" opacity="0.8" />

              {/* CGI Baseline Curve */}
              <path d={cgiPath} fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* THERMA Curve */}
              <path d={thermaPath} fill="none" stroke="#C2410C" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Active Keyframe Vertical Guide Line */}
              <line 
                x1={activeX} 
                y1={padT - 6} 
                x2={activeX} 
                y2={chartH - padB} 
                stroke="#0F172A" 
                strokeWidth="1.6" 
                strokeDasharray="3,3"
                opacity="0.85" 
              />

              {/* Active Marker Nodes */}
              <circle cx={activeX} cy={getY(ambient24[activeHourIndex])} r="3.5" fill="#64748B" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx={activeX} cy={getY(cgi24[activeHourIndex])} r="5.5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx={activeX} cy={getY(therma24[activeHourIndex])} r="6.5" fill="#C2410C" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Keyframe Context Ribbon */}
          <div className="cycle-context-bar">
            <div className="cycle-context-lead">
              <span className="context-hour-pill">{activeFrame.label}</span>
              <p className="context-note">{activeFrame.note}</p>
            </div>

            <div className="cycle-context-stats">
              <div className="stat-duo cold">
                <span className="stat-duo-label">CGI Tin T_in:</span>
                <span className="stat-duo-val">{cgi24[activeHourIndex] > 0 ? `+${cgi24[activeHourIndex]}°C` : `${cgi24[activeHourIndex]}°C`}</span>
              </div>
              <div className="stat-duo solar">
                <span className="stat-duo-label">THERMA T_in:</span>
                <span className="stat-duo-val">{`+${therma24[activeHourIndex]}°C`}</span>
              </div>
              <div className="stat-duo ambient">
                <span className="stat-duo-label">Ambient T_out:</span>
                <span className="stat-duo-val">{`${ambient24[activeHourIndex]}°C`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Comparative Technical Dossier (Side-by-Side Architectural Blueprint) ── */}
        <div className="dossier-grid">
          
          {/* ── DOSSIER A: CURRENT BASELINE (CGI TIN BARRACKS) ── */}
          <article className="dossier-panel baseline-panel">
            <div className="panel-chrome">
              <div className="panel-classification">
                <span className="spec-code">SPEC 01 // CGI-BARRACKS</span>
                <span className="panel-status-tag cold-tag">
                  <AlertTriangle size={12} />
                  <span>CRITICAL THERMAL COLLAPSE</span>
                </span>
              </div>
              <span className="panel-meta-elevation">Standard Military Issue · Uninsulated</span>
            </div>

            <div className="panel-body">
              <h3 className="panel-title">Corrugated Galvanized Iron Envelope</h3>
              <p className="panel-description">
                Single-sheet 0.8mm corrugated iron provides virtually zero thermal resistance (<span className="mono">R ≈ 0.17</span>). 
                At 04:00 AM, high-altitude black-body radiation bleeds heat into the -35°C deep-space void. 
                Troops must run bukhari stoves 24/7, consuming hundreds of litres of kerosene with dangerous carbon monoxide buildup.
              </p>

              {/* Architectural Micro-Schematic (CGI) */}
              <div className="schematic-box cold-schematic" aria-label="CGI Shelter Cross-Section Diagram">
                <div className="schematic-badge">THERMAL FAILURE CROSS-SECTION</div>
                <svg viewBox="0 0 460 145" className="schematic-svg" preserveAspectRatio="xMidYMid meet">
                  {/* Sky background with radiative sink note */}
                  <rect x="0" y="0" width="460" height="34" fill="rgba(2, 132, 199, 0.05)" />
                  <text x="220" y="15" textAnchor="middle" className="svg-label-sky">
                    Deep Space Radiative Heat Sink: -35 °C
                  </text>

                  {/* Radiative loss arrows up into sky */}
                  {[90, 150, 210, 270, 330].map((x) => (
                    <g key={x}>
                      <line x1={x} y1="36" x2={x} y2="24" stroke="#0284C7" strokeWidth="1.5" />
                      <polygon points={`${x},20 ${x - 3},26 ${x + 3},26`} fill="#0284C7" />
                    </g>
                  ))}

                  {/* Corrugated Roof Line */}
                  <path 
                    d="M 60 48 L 210 38 L 360 48" 
                    fill="none" 
                    stroke="#64748B" 
                    strokeWidth="3" 
                  />
                  <text x="210" y="32" textAnchor="middle" className="svg-anno-text" fill="#475569">0.8mm Single-Skin CGI (U = 5.88 W/m²·K)</text>

                  {/* Shelter Walls & Ground */}
                  <line x1="75" y1="48" x2="75" y2="120" stroke="#94A3B8" strokeWidth="2" />
                  <line x1="345" y1="48" x2="345" y2="120" stroke="#94A3B8" strokeWidth="2" />
                  <line x1="40" y1="120" x2="420" y2="120" stroke="#64748B" strokeWidth="1.8" strokeDasharray="4,2" />

                  {/* Cold wind draft ingress */}
                  <path d="M 25 78 C 45 74, 60 82, 80 84" fill="none" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3,2" />
                  <text x="30" y="72" className="svg-anno-text" fill="#0284C7">Gale Infiltration</text>

                  {/* Interior Freezing Area */}
                  <rect x="95" y="60" width="130" height="46" rx="4" fill="rgba(2, 132, 199, 0.08)" stroke="rgba(2, 132, 199, 0.28)" />
                  <text x="160" y="78" textAnchor="middle" className="svg-core-temp red">Dawn T_in: -18.0 °C</text>
                  <text x="160" y="94" textAnchor="middle" className="svg-anno-text" fill="#DC2626">Critical Hypothermia</text>

                  {/* Smoking Bukhari Stove */}
                  <g transform="translate(255, 74)">
                    <rect x="0" y="16" width="28" height="28" rx="2" fill="#334155" />
                    <line x1="14" y1="16" x2="14" y2="-12" stroke="#475569" strokeWidth="2.5" />
                    {/* Soot / smoke curl */}
                    <path d="M 14 -14 Q 20 -22 17 -30 T 23 -38" fill="none" stroke="#78716C" strokeWidth="2" strokeDasharray="2,2" opacity="0.8" />
                    <text x="36" y="28" className="svg-anno-text" fill="#DC2626">Bukhari: 14L/night</text>
                    <text x="36" y="40" className="svg-anno-text" fill="#991B1B">CO & Soot Toxicity</text>
                  </g>
                </svg>
              </div>

              {/* Rigorous Engineering Field Telemetry Matrix */}
              <div className="telemetry-matrix">
                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <Thermometer size={13} className="telemetry-icon" />
                      Dawn Core Temp (04:00 AM)
                    </span>
                    <span className="telemetry-val cold-text">-18.0 °C</span>
                  </div>
                  <span className="telemetry-impact">Inside temperature crashes below freezing without active fire</span>
                </div>

                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <Flame size={13} className="telemetry-icon" />
                      Kerosene Consumption
                    </span>
                    <span className="telemetry-val cold-text">14 – 18 L / night</span>
                  </div>
                  <span className="telemetry-impact">₹33,600 / shelter daily airlift expense via ALH/Cheetah</span>
                </div>

                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <ShieldAlert size={13} className="telemetry-icon" />
                      Atmospheric Toxicity
                    </span>
                    <span className="telemetry-val danger-text">High CO Hazard (&gt;55 ppm)</span>
                  </div>
                  <span className="telemetry-impact">Severe risk of asphyxiation and soot inhalation during sleep</span>
                </div>

                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <Activity size={13} className="telemetry-icon" />
                      Thermal Capacitance Lag
                    </span>
                    <span className="telemetry-val mono">&lt; 20 minutes</span>
                  </div>
                  <span className="telemetry-impact">Near-instantaneous thermal drain once heating is extinguished</span>
                </div>
              </div>
            </div>
          </article>

          {/* ── DOSSIER B: THERMA PASSIVE SOLAR ENVELOPE (THE SOLUTION) ── */}
          <article className="dossier-panel solution-panel">
            <div className="panel-chrome">
              <div className="panel-classification">
                <span className="spec-code solar-code">SPEC 04B // THERMA TROMBE</span>
                <span className="panel-status-tag solar-tag">
                  <ShieldCheck size={12} />
                  <span>WHO HABITABILITY COMPLIANT</span>
                </span>
              </div>
              <span className="panel-meta-elevation">Passive Solar Mass Core · Local Stone</span>
            </div>

            <div className="panel-body">
              <h3 className="panel-title">Phase-Shifted Solar Mass Wall</h3>
              <p className="panel-description">
                South-facing double glazing harvests high-altitude daytime insolation (1,050 W/m²). 
                A 300mm local stone Trombe wall stores thermal energy, while automated nocturnal shutters 
                seal out cold. Heat discharges naturally with an 8.5-hour phase delay, peaking at 04:00 AM dawn.
              </p>

              {/* Architectural Micro-Schematic (THERMA) */}
              <div className="schematic-box solar-schematic" aria-label="THERMA Mass Wall Cross-Section Diagram">
                <div className="schematic-badge solar-badge">PASSIVE MASS ENERGY STORAGE SCHEMATIC</div>
                <svg viewBox="0 0 460 145" className="schematic-svg" preserveAspectRatio="xMidYMid meet">
                  {/* Sky barrier with nocturnal shutter indication */}
                  <rect x="0" y="0" width="460" height="34" fill="rgba(194, 65, 12, 0.04)" />
                  <text x="230" y="15" textAnchor="middle" className="svg-label-sky solar">
                    Nocturnal Shutter Sealed (R = 2.5) · Zero Direct Radiation Loss
                  </text>

                  {/* Insulated Roof Line */}
                  <path 
                    d="M 60 48 L 210 38 L 360 48" 
                    fill="none" 
                    stroke="#C2410C" 
                    strokeWidth="3.5" 
                  />
                  <text x="210" y="32" textAnchor="middle" className="svg-anno-text" fill="#C2410C">R-15 Insulated Envelope (U = 0.38 W/m²·K)</text>

                  {/* Insulated Walls & Ground */}
                  <line x1="75" y1="48" x2="75" y2="120" stroke="#C2410C" strokeWidth="2.5" />
                  <line x1="345" y1="48" x2="345" y2="120" stroke="#C2410C" strokeWidth="2.5" />
                  <line x1="40" y1="120" x2="420" y2="120" stroke="#1E293B" strokeWidth="1.8" />

                  {/* South-Facing Double Glazing & Shutter */}
                  <g transform="translate(82, 52)">
                    {/* Double glazing lines */}
                    <line x1="0" y1="0" x2="0" y2="66" stroke="#0284C7" strokeWidth="2.5" opacity="0.8" />
                    <line x1="5" y1="0" x2="5" y2="66" stroke="#0284C7" strokeWidth="2" opacity="0.6" />
                    {/* Nocturnal Quilted Shutter Deployed */}
                    <rect x="-6" y="0" width="5" height="66" rx="1" fill="#EA580C" />
                    <text x="12" y="14" className="svg-anno-text" fill="#EA580C">Nocturnal Shutter</text>
                  </g>

                  {/* 300mm Thermal Trombe Mass Core */}
                  <g transform="translate(122, 56)">
                    <rect x="0" y="0" width="34" height="62" rx="3" fill="#9A3412" stroke="#EA580C" strokeWidth="1.5" />
                    <text x="17" y="32" textAnchor="middle" className="svg-stone-text">300mm</text>
                    <text x="17" y="44" textAnchor="middle" className="svg-stone-sub">Stone</text>
                    
                    {/* Radiant heat discharge arrows into interior */}
                    <path d="M 38 20 Q 52 18 66 23" fill="none" stroke="#EA580C" strokeWidth="2" strokeDasharray="3,2" />
                    <path d="M 38 40 Q 52 38 66 43" fill="none" stroke="#EA580C" strokeWidth="2" strokeDasharray="3,2" />
                    <polygon points="68,23 60,20 62,26" fill="#EA580C" />
                    <polygon points="68,43 60,40 62,46" fill="#EA580C" />
                  </g>

                  {/* Heated Interior Living Quarters */}
                  <rect x="210" y="60" width="125" height="48" rx="4" fill="rgba(21, 128, 61, 0.08)" stroke="rgba(21, 128, 61, 0.3)" />
                  <text x="272" y="78" textAnchor="middle" className="svg-core-temp green">Dawn T_in: +18.0 °C</text>
                  <text x="272" y="94" textAnchor="middle" className="svg-anno-text" fill="#15803D">WHO Comfort · 100% Passive</text>

                  {/* Clean Zero-Combustion Stamp */}
                  <g transform="translate(230, 114)">
                    <text x="42" y="-2" textAnchor="middle" className="svg-anno-text" fill="#15803D">
                      Zero Combustion · 0.0L Fuel · Sealed Air Zone
                    </text>
                  </g>
                </svg>
              </div>

              {/* Rigorous Engineering Field Telemetry Matrix */}
              <div className="telemetry-matrix">
                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <Thermometer size={13} className="telemetry-icon" />
                      Dawn Core Temp (04:00 AM)
                    </span>
                    <span className="telemetry-val solar-text">+18.0 °C</span>
                  </div>
                  <span className="telemetry-impact">Full physiological habitability maintained passively</span>
                </div>

                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <Sun size={13} className="telemetry-icon" />
                      Heating Energy Source
                    </span>
                    <span className="telemetry-val solar-text">0.0 Litres (100% Solar)</span>
                  </div>
                  <span className="telemetry-impact">Combustion-free; complete fuel supply independence</span>
                </div>

                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <ShieldCheck size={13} className="telemetry-icon" />
                      Indoor Air Quality
                    </span>
                    <span className="telemetry-val safe-text">Hermetic Clean Air (&lt;5 ppm CO)</span>
                  </div>
                  <span className="telemetry-impact">Zero smoke, zero soot particulate, uncompromised safety</span>
                </div>

                <div className="telemetry-row">
                  <div className="telemetry-metric">
                    <span className="telemetry-label">
                      <Clock size={13} className="telemetry-icon" />
                      Phase Shift Discharge
                    </span>
                    <span className="telemetry-val mono">8.5 Hours Lag</span>
                  </div>
                  <span className="telemetry-impact">Daytime solar energy synchronized to coldest dawn peak</span>
                </div>
              </div>
            </div>
          </article>

        </div>

        {/* ── 4. High-Altitude Field Datum Strip ── */}
        <div className="dossier-datum-bar">
          <div className="datum-item">
            <span className="datum-label">ANNUAL KEROSENE SAVINGS</span>
            <span className="datum-value">5,110 Litres <small>/ shelter</small></span>
          </div>
          <div className="datum-item">
            <span className="datum-label">AIRLIFT CAPITAL AVOIDED</span>
            <span className="datum-value highlight">₹1.22 Crore <small>/ year</small></span>
          </div>
          <div className="datum-item">
            <span className="datum-label">CARBON MONOXIDE REDUCTION</span>
            <span className="datum-value">100% <small>Combustion Free</small></span>
          </div>
          <div className="datum-item">
            <span className="datum-label">FIELD RETROFIT CYCLE</span>
            <span className="datum-value">48 Hours <small>Assembly Time</small></span>
          </div>
        </div>

      </div>
    </section>
  );
}
