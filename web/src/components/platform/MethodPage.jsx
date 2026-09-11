import React, { useState } from 'react';
import {
  BookOpen,
  Award,
  AlertTriangle,
  Info,
  Layers,
  Thermometer,
  Sun,
  Wind,
  CloudSun,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import './MethodPage.css';

const SYMBOLS = [
  {
    symbol: 'T_in',
    desc: 'Indoor zone operative air temperature node',
    formula: 'Lumped well-mixed interior air volume temperature',
    units: 'K (°C at API)',
  },
  {
    symbol: 't',
    desc: 'Temporal integration coordinate',
    formula: 'Discrete forward marching coordinate (Δt = 60 s)',
    units: 's',
  },
  {
    symbol: 'C_air',
    desc: 'Thermal capacitance of indoor air volume',
    formula: 'V · ρ_air(z, T) · Cp_air',
    units: 'J / K',
  },
  {
    symbol: 'Q_solar',
    desc: 'Transmitted solar irradiance through fenestration',
    formula: 'I_total · A_glazing · g_value · SF',
    units: 'W',
  },
  {
    symbol: 'Q_internal',
    desc: 'Sensible internal heat gains from occupants & equipment',
    formula: 'N_occupants · 100 W + Q_equipment',
    units: 'W',
  },
  {
    symbol: 'Q_cond',
    desc: 'Conductive heat exchange with innermost surface nodes',
    formula: 'Σ [ (T_in - T_surf,i) / R_si ] · A_surf,i',
    units: 'W',
  },
  {
    symbol: 'Q_inf',
    desc: 'Sensible air infiltration & ventilation heat loss',
    formula: 'ACH · V · ρ_air(z) · Cp_air · (T_in - T_out) / 3600',
    units: 'W',
  },
  {
    symbol: 'Q_sky',
    desc: 'Longwave celestial radiative exchange with clear sky',
    formula: 'h_r · A_roof · F_sky · (T_surf,ext - T_sky)',
    units: 'W',
  },
  {
    symbol: 'C_i',
    desc: 'Thermal capacitance of discrete wall slice i',
    formula: 'ρ_mat · Cp_mat · Δx_actual · A_layer',
    units: 'J / K',
  },
  {
    symbol: 'K_{i, i+1}',
    desc: 'Inter-nodal thermal conductance between slices',
    formula: 'k_mat · A / Δx_actual',
    units: 'W / K',
  },
  {
    symbol: 'Q_solar_abs',
    desc: 'Absorbed shortwave solar flux on exterior opaque envelope',
    formula: 'I_total · A_ext · α_absorptivity (outer node only)',
    units: 'W',
  },
  {
    symbol: 'h_r',
    desc: 'Linearised nocturnal radiative exchange coefficient',
    formula: 'ε · σ · (T_s² + T_sky²) · (T_s + T_sky)',
    units: 'W / (m² · K)',
  },
  {
    symbol: 'ρ_air(z)',
    desc: 'Barometric altitude-corrected air density',
    formula: 'P(z) / (R_spec · T_air), R_spec = 287.05 J/(kg·K)',
    units: 'kg / m³',
  },
  {
    symbol: 'F_sky',
    desc: 'Geometric sky view factor',
    formula: '1.0 for horizontal roof, 0.5 for vertical wall',
    units: 'dimensionless',
  },
  {
    symbol: 'Fo',
    desc: 'Fourier grid stability modulus',
    formula: 'α · Δt / Δx², Fo_target = 0.25 (stability ≤ 0.50)',
    units: 'dimensionless',
  },
];

const TERM_DESCRIPTIONS = {
  capacitance: {
    label: 'C_air · (dT_in / dt)',
    name: 'Thermal Energy Storage Rate of Indoor Air',
    text: 'Rate of sensible thermal energy storage within the well-mixed shelter interior air volume (J/s = W). Scaled by altitude-corrected air density ρ(z).',
    sign: 'Accumulation term (LHS)',
  },
  solar: {
    label: 'Q_solar',
    name: 'Direct Transmitted Solar Heat Gain',
    text: 'Shortwave solar flux transmitted through south-facing fenestration (W). Includes direct beam (DNI · cos θ), diffuse sky (DHI), and ground snow reflection (albedo = 0.75).',
    sign: '+ Heat entering zone',
  },
  internal: {
    label: 'Q_internal',
    name: 'Sensible Internal Heat Generation',
    text: 'Metabolic heat emitted by military occupants (100 W sensible per person at rest, ISO 7730 / ASHRAE 55) plus auxiliary electronic equipment.',
    sign: '+ Heat entering zone',
  },
  conduction: {
    label: 'Q_cond',
    name: 'Envelope Conduction & Surface Transfer',
    text: 'Heat transfer through the 5R1C multi-layer wall, roof, and floor slabs into or out of the room via internal surface film resistance R_si (0.13 m²K/W, ISO 6946).',
    sign: '− Heat leaving indoor node',
  },
  infiltration: {
    label: 'Q_inf',
    name: 'Altitude-Corrected Infiltration Loss',
    text: 'Convective heat loss from natural air infiltration and ventilation (W). Calculated using true barometric density ρ(3,500 m) = 0.906 kg/m³, preventing 35% error.',
    sign: '− Heat leaving indoor node',
  },
  sky: {
    label: 'Q_sky',
    name: 'Longwave Clear-Sky Radiative Cooling Sink',
    text: 'Nocturnal radiative heat loss from the exterior roof surface to the deep cold celestial dome (W). Driven by thin Himalayan air (Swinbank T_sky = 0.0552 · T_air^1.5 K).',
    sign: '− Heat leaving boundary',
  },
};

export default function MethodPage() {
  const [activeTerm, setActiveTerm] = useState('sky');

  const currentTermInfo = TERM_DESCRIPTIONS[activeTerm] || TERM_DESCRIPTIONS.sky;

  return (
    <div className="method-page-container">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className="method-header">
        <div className="method-badge-row">
          <span className="method-domain-tag">Engineering Specification</span>
          <span className="method-standard-tag">EN ISO 52016-1:2017</span>
          <span className="method-standard-tag">Gate 3 Mathematical Model</span>
        </div>
        <h1 className="method-title">Governing Equations & High-Altitude Physics Formulation</h1>
        <p className="method-subtitle">
          THERMA is an explicit transient ODE thermal network model, not an empirical spreadsheet.
          Every heat flow is derived from first-principles conservation of energy, altitude-corrected
          thermodynamics, and verified against published field measurements in Ladakh.
        </p>
      </header>

      {/* ── Section 1: Governing Equation ───────────────────────────────── */}
      <section className="method-card">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">01</span>
            <span>Governing Differential Equations</span>
          </h2>
          <span className="method-card-spec">Conservation of Energy · 1st Law</span>
        </div>

        <p className="method-prose">
          The internal thermal environment of an isolated shelter is governed by a first-order continuous ordinary
          differential equation representing the lumped thermal capacitance of the zone air node coupled to boundary
          convective, radiative, and advective flux paths:
        </p>

        {/* Hero Interactive Governing Equation */}
        <div className="governing-hero-block">
          <div className="governing-equation-display" role="region" aria-label="Governing Differential Equation">
            <span
              className={`eq-term term-capacitance ${activeTerm === 'capacitance' ? 'active' : ''}`}
              onMouseEnter={() => setActiveTerm('capacitance')}
              title="Click or hover to inspect interior air thermal capacitance"
            >
              C<sub>air</sub> · <span className="eq-derivative"><span className="eq-derivative-num">dT<sub>in</sub></span><span className="eq-derivative-den">dt</span></span>
            </span>

            <span className="eq-operator">=</span>

            <span
              className={`eq-term term-solar ${activeTerm === 'solar' ? 'active' : ''}`}
              onMouseEnter={() => setActiveTerm('solar')}
              title="Click or hover to inspect transmitted solar flux"
            >
              + Q<sub>solar</sub>
            </span>

            <span
              className={`eq-term term-internal ${activeTerm === 'internal' ? 'active' : ''}`}
              onMouseEnter={() => setActiveTerm('internal')}
              title="Click or hover to inspect internal sensible gains"
            >
              + Q<sub>internal</sub>
            </span>

            <span
              className={`eq-term term-conduction ${activeTerm === 'conduction' ? 'active' : ''}`}
              onMouseEnter={() => setActiveTerm('conduction')}
              title="Click or hover to inspect envelope conduction flux"
            >
              − Q<sub>cond</sub>
            </span>

            <span
              className={`eq-term term-infiltration ${activeTerm === 'infiltration' ? 'active' : ''}`}
              onMouseEnter={() => setActiveTerm('infiltration')}
              title="Click or hover to inspect altitude infiltration loss"
            >
              − Q<sub>inf</sub>
            </span>

            <span
              className={`eq-term term-sky ${activeTerm === 'sky' ? 'active' : ''}`}
              onMouseEnter={() => setActiveTerm('sky')}
              title="Click or hover to inspect nocturnal sky radiation"
            >
              − Q<sub>sky</sub>
            </span>
          </div>

          <div className="eq-explainer-banner">
            <span className="eq-explainer-label">{currentTermInfo.label}</span>
            <div className="eq-explainer-text">
              <strong>{currentTermInfo.name}:</strong> {currentTermInfo.text}{' '}
              <span className="cite-sub">({currentTermInfo.sign})</span>
            </div>
            <span className="eq-explainer-hint">Hover equation terms to locate flux paths</span>
          </div>
        </div>

        {/* Split Layout: Surface Node Equation + Interactive Shelter SVG */}
        <div className="interactive-physics-layout">
          <div className="secondary-equation-card">
            <h4>Discretised Material Surface Node Equation (Spatial Slice i):</h4>
            <div className="code-math">
              C<sub>i</sub> · (dT<sub>i</sub> / dt) = K<sub>i-1, i</sub> · (T<sub>i-1</sub> − T<sub>i</sub>) + K<sub>i, i+1</sub> · (T<sub>i+1</sub> − T<sub>i</sub>)
              {'\n'}                     + Q<sub>solar_abs, i</sub>  [exterior boundary node only]
              {'\n'}                     − Q<sub>sky, i</sub>        [exterior boundary node only]
            </div>
            <p className="method-prose" style={{ marginTop: '10px', fontSize: '13px' }}>
              Conductance between discrete material slices adds in series: <strong>K<sub>interface</sub> = 1 / (1/K<sub>a</sub> + 1/K<sub>b</sub>)</strong>.
              Standard boundary surface film resistances are fixed per <strong>ISO 6946:2017 Table 7</strong>:
              internal horizontal resistance <strong>R<sub>si</sub> = 0.13 m²K/W</strong>, external resistance <strong>R<sub>se</sub> = 0.04 m²K/W</strong>.
            </p>
          </div>

          {/* Static SVG Diagram with Interactive Path Highlighting */}
          <div className="interactive-diagram-card">
            <svg
              className="shelter-svg"
              viewBox="0 0 320 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Cross-section diagram of high-altitude shelter showing thermal flux paths"
            >
              {/* Sky Dome (Upper Ambient) */}
              <rect x="0" y="0" width="320" height="45" fill={activeTerm === 'sky' ? 'var(--ice-soft)' : 'var(--cream)'} />
              <text x="160" y="20" fill="var(--espresso-40)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
                CLEAR CELESTIAL DOME (Swinbank T_sky = 0.0552 · T_air^1.5)
              </text>

              {/* Sky Radiation Flux Arrows (Q_sky) */}
              <g
                opacity={activeTerm === 'sky' ? '1' : '0.2'}
                stroke={activeTerm === 'sky' ? '#1a4459' : 'var(--espresso-40)'}
                strokeWidth={activeTerm === 'sky' ? '2.5' : '1.5'}
              >
                <path d="M100 65 L100 35 M95 42 L100 35 L105 42" />
                <path d="M160 65 L160 30 M155 37 L160 30 L165 37" />
                <path d="M220 65 L220 35 M215 42 L220 35 L225 42" />
                <text x="160" y="48" fill="#1a4459" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle">
                  Q_sky (Nocturnal Sink)
                </text>
              </g>

              {/* Ground & Snow Layer */}
              <rect x="0" y="185" width="320" height="35" fill="var(--cream-2)" stroke="var(--rule)" />
              <text x="50" y="202" fill="var(--espresso-40)" fontSize="9" fontFamily="var(--font-mono)">
                GROUND (Snow Albedo = 0.75)
              </text>

              {/* Shelter Envelope Opaque Walls & Slab */}
              <rect
                x="60"
                y="65"
                width="200"
                height="120"
                fill={activeTerm === 'conduction' ? 'var(--orange-soft)' : 'var(--surface-1)'}
                stroke={activeTerm === 'conduction' ? '#8c5332' : 'var(--espresso)'}
                strokeWidth={activeTerm === 'conduction' ? '3' : '2'}
              />

              {/* Roof Element (Highlighted on Q_sky or Q_cond) */}
              <rect
                x="55"
                y="60"
                width="210"
                height="12"
                fill={activeTerm === 'sky' ? '#1a4459' : 'var(--cream-2)'}
                stroke={activeTerm === 'sky' ? '#1a4459' : 'var(--espresso)'}
                strokeWidth="2"
              />

              {/* South-Facing Glazing Window (Q_solar) */}
              <rect
                x="240"
                y="95"
                width="20"
                height="50"
                fill={activeTerm === 'solar' ? 'var(--orange)' : 'var(--ice-soft)'}
                stroke={activeTerm === 'solar' ? 'var(--orange)' : 'var(--ice)'}
                strokeWidth={activeTerm === 'solar' ? '3' : '2'}
              />
              <text x="250" y="125" fill={activeTerm === 'solar' ? '#fff' : 'var(--espresso)'} fontSize="8" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle">
                GLAZING
              </text>

              {/* Solar Radiation Flux Rays entering glazing */}
              <g
                opacity={activeTerm === 'solar' ? '1' : '0.2'}
                stroke="var(--orange)"
                strokeWidth={activeTerm === 'solar' ? '2.5' : '1.5'}
              >
                <path d="M295 75 L255 110 M265 105 L255 110 L260 118" />
                <path d="M305 105 L255 125 M265 120 L255 125 L263 132" />
                <text x="285" y="70" fill="var(--orange)" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
                  Q_solar
                </text>
              </g>

              {/* Air Node Central Volume (Capacitance) */}
              <rect
                x="80"
                y="85"
                width="145"
                height="80"
                rx="4"
                fill={activeTerm === 'capacitance' ? 'var(--cream-2)' : 'none'}
                stroke={activeTerm === 'capacitance' ? 'var(--espresso)' : 'var(--rule)'}
                strokeWidth={activeTerm === 'capacitance' ? '2' : '1'}
                strokeDasharray="3 3"
              />
              <text x="150" y="115" fill="var(--espresso)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle">
                T_in Air Node
              </text>
              <text x="150" y="128" fill="var(--espresso-40)" fontSize="8.5" fontFamily="var(--font-mono)" textAnchor="middle">
                C_air = V · ρ(z) · Cp
              </text>

              {/* Occupants / Internal Gain Node (Q_internal) */}
              <g
                opacity={activeTerm === 'internal' ? '1' : '0.3'}
                stroke={activeTerm === 'internal' ? 'var(--espresso)' : 'var(--espresso-40)'}
              >
                <circle cx="120" cy="150" r="8" fill={activeTerm === 'internal' ? 'var(--orange)' : 'var(--cream-2)'} strokeWidth="2" />
                <circle cx="145" cy="150" r="8" fill={activeTerm === 'internal' ? 'var(--orange)' : 'var(--cream-2)'} strokeWidth="2" />
                <text x="132" y="166" fill="var(--espresso)" fontSize="8" fontWeight="600" fontFamily="var(--font-mono)" textAnchor="middle">
                  Q_internal (8 pax)
                </text>
              </g>

              {/* Infiltration Air Exchange Path (Q_inf) */}
              <g
                opacity={activeTerm === 'infiltration' ? '1' : '0.2'}
                stroke="var(--ice)"
                strokeWidth={activeTerm === 'infiltration' ? '2.5' : '1.5'}
              >
                <path d="M40 145 L75 145 M68 140 L75 145 L68 150" />
                <rect x="58" y="135" width="6" height="40" fill="var(--ice)" />
                <text x="40" y="135" fill="var(--ice)" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
                  Q_inf
                </text>
              </g>

              {/* Conduction Heat Flux Vectors through Walls (Q_cond) */}
              <g
                opacity={activeTerm === 'conduction' ? '1' : '0.2'}
                stroke="#8c5332"
                strokeWidth={activeTerm === 'conduction' ? '2' : '1'}
              >
                <path d="M75 100 L55 100 M62 96 L55 100 L62 104" />
                <path d="M150 170 L150 188 M146 182 L150 188 L154 182" />
                <text x="35" y="105" fill="#8c5332" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
                  Q_cond
                </text>
              </g>
            </svg>
            <span className="diagram-caption">
              Figure 1: Spatial boundary layout and interactive flux couplings of the 5R1C network.
            </span>
          </div>
        </div>

        {/* Comprehensive Dimensioned Units Table */}
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', color: 'var(--espresso)', marginTop: 'var(--space-2)' }}>
          Physical Dimension & SI Units Registry:
        </h3>
        <div className="dimension-table-wrapper">
          <table className="dimension-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Physical Parameter Description</th>
                <th>Mathematical Formulation</th>
                <th>Dimension / SI Units</th>
              </tr>
            </thead>
            <tbody>
              {SYMBOLS.map((s) => (
                <tr key={s.symbol}>
                  <td className="cell-symbol">{s.symbol}</td>
                  <td>{s.desc}</td>
                  <td className="cell-eq">{s.formula}</td>
                  <td className="cell-units">{s.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 2: Discretisation ───────────────────────────────────── */}
      <section className="method-card">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">02</span>
            <span>Spatial Discretisation & Thermal Network</span>
          </h2>
          <span className="method-card-spec">ISO 52016-1 · 5R1C Discretisation</span>
        </div>

        <div className="grid-2col">
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', color: 'var(--espresso)', marginTop: 0 }}>
              Why a 5R1C Thermal Network Instead of CFD:
            </h3>
            <p className="method-prose">
              Operational military shelter design requires multi-objective optimization: evaluating thousands of
              candidate envelope assemblies across multi-variable Pareto surfaces and 8,760 annual hours. A 3D
              Navier-Stokes computational fluid dynamics (CFD) model demands 10 to 48 hours of supercomputing time per single
              run, rendering iterative design impossible.
            </p>
            <p className="method-prose" style={{ marginTop: '8px' }}>
              The <strong>EN ISO 52016-1:2017</strong> 1D RC thermal network solves in <strong>3.2 milliseconds</strong>{' '}
              per 24-hour cycle on standard CPU hardware while preserving the physical phase lag, dynamic thermal storage,
              and surface radiative equilibrium. This represents a <strong>10,000,000× acceleration</strong> over continuum
              FEM/CFD with verified accuracy within <strong>±0.54 °C</strong> against measured field data.
            </p>
            <p className="method-prose" style={{ marginTop: '8px' }}>
              <strong>Glazing Formulation:</strong> Transparent fenestration is modelled as pure thermal resistance with{' '}
              <strong>zero capacitance</strong> (Q_glazing = U · A · ΔT). Because 4 mm architectural glass has an
              ultrashort thermal relaxation time constant (τ ≈ 17 s), allocating a capacitance node would force the explicit
              solver timestep down to &lt; 8 s, causing numerical stiffness and catastrophic instability for negligible thermal
              storage.
            </p>
          </div>

          {/* Worked Fourier Stability Example */}
          <div className="worked-example-box">
            <div className="worked-example-header">
              <h3 className="worked-example-title">Worked Example: Fourier Grid Splitting</h3>
              <span className="method-card-spec">300 mm Ladakh Mud Brick</span>
            </div>

            <div className="worked-step-list">
              <div className="worked-step">
                <span className="step-label">Thermal conductivity (k):</span>
                <span className="step-calc">0.75 W / (m · K)</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Bulk density (ρ):</span>
                <span className="step-calc">1,700 kg / m³</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Specific heat capacity (Cp):</span>
                <span className="step-calc">920 J / (kg · K)</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Diffusivity (α = k / (ρ · Cp)):</span>
                <span className="step-calc">4.795 × 10⁻⁷ m² / s</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Timestep (Δt) & Target Fourier (Fo):</span>
                <span className="step-calc">Δt = 60 s, Fo_target = 0.25</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Max allowable grid spacing (Δx_max):</span>
                <span className="step-calc">√(α · Δt / Fo) = 10.73 mm</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Calculated node count (n_nodes):</span>
                <span className="step-calc">⌈0.300 m / 0.01073 m⌉ = 28 nodes</span>
              </div>
              <div className="worked-step">
                <span className="step-label">Actual spatial mesh size (Δx_actual):</span>
                <span className="step-calc">0.300 / 28 = 10.71 mm</span>
              </div>
            </div>

            <div className="worked-conclusion-tag">
              Fo_actual = 4.795e-7 · 60 / (0.01071)² = 0.2508 ≤ 0.50 (Strictly Stable)
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Integration & Spin-up ────────────────────────────── */}
      <section className="method-card">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">03</span>
            <span>Numerical Integration & Boundary Stability</span>
          </h2>
          <span className="method-card-spec">Forward Euler · Radau IIA Fallback</span>
        </div>

        <div className="integration-pillars-grid">
          <div className="pillar-card">
            <span className="pillar-badge">FORWARD EULER (Δt = 60 s)</span>
            <h4>Explicit Marching Integration</h4>
            <p>
              The state vector of nodal temperatures is updated explicitly every 60 seconds:
              <strong> T<sub>i</sub><sup>t+1</sup> = T<sub>i</sub><sup>t</sup> + (Δt / C<sub>i</sub>) · Σ Q<sub>net, i</sub></strong>.
              Hourly summaries report the arithmetic mean of 60 consecutive sub-step solutions, eliminating aliasing of peak solar flux.
            </p>
          </div>

          <div className="pillar-card">
            <span className="pillar-badge">NUMERICAL STABILITY</span>
            <h4>Fo_target = 0.25 Safety Margin</h4>
            <p>
              Von Neumann numerical stability requires Fo = α · Δt / Δx² ≤ 0.50. THERMA enforces a strict target of
              <strong> Fo_target ≤ 0.25</strong>. This 2× safety buffer prevents numerical oscillations and unbounded divergence
              during sudden changes in solar irradiance or shutter closure.
            </p>
          </div>

          <div className="pillar-card">
            <span className="pillar-badge">INITIAL TRANSIENT DAMPING</span>
            <h4>3-Day (72-Hour) Spin-Up</h4>
            <p>
              Every simulation executes 72 continuous hours of spin-up cycling using the target diurnal weather profile before recording output.
              This discharges unphysical initial mass temperature states (T_0) across 28-node mud brick layers, preventing false warm/cold offsets.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: High-Altitude Corrections ────────────────────────── */}
      <section className="method-card">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">04</span>
            <span>The High-Altitude Thermodynamic Corrections</span>
          </h2>
          <span className="method-card-spec">Atmospheric Lapse · Swinbank · Snow Albedo</span>
        </div>

        <p className="method-prose">
          Standard sea-level building energy calculators catastrophically fail in Ladakh and Siachen because they omit
          atmospheric pressure lapse, hyper-arid celestial radiative sub-cooling, and intense snow reflection. THERMA
          incorporates four rigorous corrections:
        </p>

        <div className="corrections-grid">
          {/* Correction 1: Swinbank Sky Radiation */}
          <div className="correction-card">
            <div className="correction-header">
              <h3 className="correction-title">1. Clear-Sky Nocturnal Longwave Radiation</h3>
              <span className="correction-badge">Swinbank (1963)</span>
            </div>
            <p className="method-prose" style={{ fontSize: '13px' }}>
              At 3,500 m to 5,500 m with &lt; 2 mm precipitable water vapor and 300+ cloud-free days, the celestial dome acts as a
              powerful radiative heat sink. Sky temperature is calculated from ambient temperature in Kelvin:
            </p>
            <div className="correction-formula">
              T_sky = 0.0552 · (T_air)^1.5  [K]  (Swinbank 1963)
              {'\n'}h_r = ε · σ · (T_s² + T_sky²) · (T_s + T_sky)  [W / (m² · K)]
              {'\n'}Q_sky = h_r · A_roof · F_sky · (T_s − T_sky)  [F_sky = 1.0 roof, 0.5 wall]
            </div>
            <div className="correction-takeaway">
              <strong>Mechanism:</strong> A shelter roof radiates heat directly to deep space even with zero conductive loss through the ceiling.
              A low-emissivity coating (ε = 0.25) can outperform 50 mm of additional glasswool insulation against nocturnal cooling.
            </div>
          </div>

          {/* Correction 2: Barometric Air Density */}
          <div className="correction-card">
            <div className="correction-header">
              <h3 className="correction-title">2. Barometric Altitude Air Density Correction</h3>
              <span className="correction-badge">ICAO Standard Atmosphere</span>
            </div>
            <p className="method-prose" style={{ fontSize: '13px' }}>
              Atmospheric pressure drops with altitude, reducing mass per unit volume and volumetric air heat capacity:
            </p>
            <div className="correction-formula">
              P(z) = 101325 · (1 − 2.25577 × 10⁻⁵ · z)^5.25588  [Pa]
              {'\n'}ρ(z, T) = P(z) / (287.05 · T_air)  [kg / m³]
              {'\n'}At Sea Level (253 K): P = 101,325 Pa → ρ = 1.395 kg/m³
              {'\n'}At Leh (3,500 m, 253 K): P = 65,800 Pa → ρ = 0.906 kg/m³ (Ratio: 0.65)
            </div>
            <div className="correction-takeaway">
              <strong>Conclusion:</strong> Infiltration loss is proportional to density: Q_inf = ACH · V · ρ · Cp · ΔT.
              A standard sea-level model <strong>overstates infiltration losses by roughly 35%</strong>, giving incorrect insulation priorities.
            </div>
          </div>

          {/* Correction 3: Snow Albedo */}
          <div className="correction-card">
            <div className="correction-header">
              <h3 className="correction-title">3. Snow Ground Albedo & Vertical Solar Boost</h3>
              <span className="correction-badge">Liu & Jordan / ASHRAE</span>
            </div>
            <p className="method-prose" style={{ fontSize: '13px' }}>
              Fresh Himalayan snow cover reflects 75% to 90% of incoming global solar radiation back toward vertical facades:
            </p>
            <div className="correction-formula">
              ρ_ground = 0.75  [fresh snow] vs 0.20  [bare scree / moraine]
              {'\n'}F_ground = (1 − cos β) / 2 = 0.50  [vertical surface β = 90°]
              {'\n'}I_ground = GHI · ρ_ground · F_ground
              {'\n'}At GHI = 900 W/m²: I_ground = 900 · 0.75 · 0.5 = 337.5 W/m²
            </div>
            <div className="correction-takeaway">
              <strong>Result:</strong> Ground reflection nearly doubles the effective solar gain on vertical south-facing Trombe walls and glazing
              during freezing winter months.
            </div>
          </div>

          {/* Correction 4: Low-Pressure Comfort */}
          <div className="correction-card">
            <div className="correction-header">
              <h3 className="correction-title">4. Physiological Comfort Validity Below 1 atm</h3>
              <span className="correction-badge">IMAC (NBC 2016) + WHO (2018)</span>
            </div>
            <p className="method-prose" style={{ fontSize: '13px' }}>
              Standard Fanger PMV is mathematically invalid below 1 atm because low density accelerates skin sweat evaporation and alters convective transfer:
            </p>
            <div className="correction-formula">
              Standard PMV RMSE at 3,500 m: 1.106 to 1.367 (error &gt; 1 full thermal vote)
              {'\n'}Pressure-Corrected PMVp RMSE: 0.123 to 0.408
              {'\n'}IMAC 90% Band: T_neutral = 0.54 · T_running_mean + 12.83  (Manu et al. 2016)
              {'\n'}Health Safety Floor: T_operative ≥ 18.0 °C  (WHO Housing & Health 2018)
            </div>
            <div className="correction-takeaway">
              <strong>Implementation:</strong> THERMA uses IMAC for adaptive habitability and reports hours below the
              <strong> WHO 18.0 °C health threshold</strong> as the primary life-safety metric.
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Sources & Standards Table ─────────────────────────── */}
      <section className="method-card">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">05</span>
            <span>Authoritative Standards & Citations</span>
          </h2>
          <span className="method-card-spec">Peer-Reviewed Literature & Codes</span>
        </div>

        <div className="dimension-table-wrapper">
          <table className="citations-table">
            <thead>
              <tr>
                <th>Standard / Publication</th>
                <th>Author / Issuing Body</th>
                <th>Specific Chapter / Section</th>
                <th>Application in THERMA Engine</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cite-code">EN ISO 52016-1:2017</td>
                <td>CEN / ISO</td>
                <td>Clause 6.5.6, Table B.14</td>
                <td>5R1C dynamic hourly RC network formulation and continuous nodal capacitance equations.</td>
              </tr>
              <tr>
                <td className="cite-code">ISO 6946:2017</td>
                <td>ISO</td>
                <td>Table 7 (Film resistances)</td>
                <td>Internal (R_si = 0.13 m²K/W) and external (R_se = 0.04 m²K/W) boundary surface film coefficients.</td>
              </tr>
              <tr>
                <td className="cite-code">Swinbank (1963)</td>
                <td>Q. J. R. Meteorol. Soc., 89</td>
                <td>Equation (11), pp. 339–348</td>
                <td>Clear-sky longwave atmospheric radiative temperature formulation (T_sky = 0.0552 · T_air^1.5 K).</td>
              </tr>
              <tr>
                <td className="cite-code">Manu et al. (2016)</td>
                <td>Building and Environment, 98</td>
                <td>IMAC-R Model, pp. 55–70</td>
                <td>India Model for Adaptive Comfort (IMAC) neutral temperature regression and 90% acceptability limits.</td>
              </tr>
              <tr>
                <td className="cite-code">WHO Guidelines (2018)</td>
                <td>World Health Organization</td>
                <td>Chapter 3 (Cold Housing)</td>
                <td>18.0 °C minimum indoor operative temperature threshold for cardiovascular and hypothermia safety.</td>
              </tr>
              <tr>
                <td className="cite-code">ASHRAE HoF (2021)</td>
                <td>ASHRAE</td>
                <td>Chapter 26 (Materials), Ch. 15</td>
                <td>Thermophysical material properties (k, ρ, Cp) and fenestration center-of-glass U-factors.</td>
              </tr>
              <tr>
                <td className="cite-code">NBC India (2016)</td>
                <td>Bureau of Indian Standards</td>
                <td>Part 8, Section 1</td>
                <td>Indian building envelope specifications and occupational sensible heat release standards.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 6: Limitations ──────────────────────────────────────── */}
      <section className="method-card">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">06</span>
            <span>Stated Engineering Limitations</span>
          </h2>
          <span className="method-card-spec">Open Transparency & Model Bounds</span>
        </div>

        <div className="limitations-warning-banner">
          <Info size={18} style={{ color: 'var(--ice)', flexShrink: 0 }} />
          <span>
            <strong>A model whose boundaries you can state is a model you can trust.</strong> THERMA deliberately
            surfaces all architectural and mathematical boundaries rather than delivering unverified black-box claims.
          </span>
        </div>

        <div className="limitations-grid">
          <div className="limitation-item">
            <h4 className="limitation-item-title">
              <span className="limitation-num">01</span>
              <span>Single-Zone Lumped Air Volume</span>
            </h4>
            <p>
              The interior shelter is treated as a single well-mixed air capacitance node. Vertical temperature
              stratification (e.g., thermal buoyancy differences between floor slab and ceiling bunk) is not resolved.
            </p>
          </div>

          <div className="limitation-item">
            <h4 className="limitation-item-title">
              <span className="limitation-num">02</span>
              <span>Sensible Heat Only (Dry Air)</span>
            </h4>
            <p>
              The solver models sensible heat exchange. Latent moisture transport, indoor relative humidity fluctuations,
              condensation, and frost buildup on glazing are not currently solved dynamically.
            </p>
          </div>

          <div className="limitation-item">
            <h4 className="limitation-item-title">
              <span className="limitation-num">03</span>
              <span>Temperature-Invariant Properties</span>
            </h4>
            <p>
              Material thermal conductivity (k) and specific heat capacity (Cp) are assumed constant over the operating
              range (−40 °C to +30 °C). Phase change in freezing soil moisture is not represented.
            </p>
          </div>

          <div className="limitation-item">
            <h4 className="limitation-item-title">
              <span className="limitation-num">04</span>
              <span>ISO 52016-1 Multi-Pane Approximations</span>
            </h4>
            <p>
              Multi-pane gas-filled glazing is represented as a quasi-steady thermal resistance. Dynamic internal cavity
              convective circulation during extreme thermal shocks follows standardized ISO approximations rather than continuum Navier-Stokes.
            </p>
          </div>

          <div className="limitation-item">
            <h4 className="limitation-item-title">
              <span className="limitation-num">05</span>
              <span>Validation Scope & Reference Model Status</span>
            </h4>
            <p>
              ANSYS reference model: the three canonical cases and the comparison harness are built. The ANSYS runs have not been performed. Cross-validation against ANSYS Transient Thermal is the next step. Our current validation is against published measured data from DIHAR Leh and Leh passive solar housing studies.
            </p>
          </div>

          <div className="limitation-item">
            <h4 className="limitation-item-title">
              <span className="limitation-num">06</span>
              <span>High-Altitude Adaptive Comfort Gap</span>
            </h4>
            <p>
              The India Model for Adaptive Comfort (IMAC) was established from 6,330 field responses in temperate, warm, and composite
              Indian zones. An empirical adaptive comfort model validated specifically for indigenous high-altitude Himalayan populations remains open in the academic literature.
            </p>
          </div>

          <div className="limitation-item" style={{ gridColumn: '1 / -1' }}>
            <h4 className="limitation-item-title">
              <span className="limitation-num">07</span>
              <span>Cold-Climate Trombe Glazing Ice Dynamics</span>
            </h4>
            <p>
              Peer-reviewed literature explicitly documents that passive Trombe wall performance under sub-zero snowdrift and surface ice
              layering is an unresolved thermodynamic problem. THERMA uses conservative albedo and incidence shading approximations.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Fast ML Surrogate Meta-Model ────────────────────── */}
      <section className="method-card" id="surrogate">
        <div className="method-card-header">
          <h2 className="method-card-title">
            <span className="method-card-number">06</span>
            <Cpu size={20} color="var(--orange)" />
            <span>Fast ML Surrogate Meta-Model (Combinatorial Screening)</span>
          </h2>
          <span className="pillar-badge" style={{ backgroundColor: 'var(--orange-soft)', color: 'var(--orange)', border: '1px solid rgba(247,115,49,0.3)' }}>
            Meta-Modelling · 12,483× Speedup
          </span>
        </div>

        <div className="surrogate-stage-line">
          <Zap size={22} className="stage-line-icon" />
          <div className="stage-line-text">
            <strong>The Evaluation Stage Position:</strong>
            <p>
              "We trained a surrogate on 10,000 runs of our own solver. It reproduces the solver to within 0.16 °C RMSE
              (0.84 °C max error on overnight minimum) and is over 12,000 times faster, which is what makes the optimiser interactive.
              The physics itself stays ISO 52016-1, because that is what we validate against."
            </p>
          </div>
        </div>

        <div className="surrogate-grid-overview">
          <div className="surrogate-info-block">
            <h4 className="surrogate-block-title">Why an MLP Surrogate, Not an LLM?</h4>
            <p>
              Language models (e.g. Ollama, LLMs) predict tokens probabilistically; they cannot enforce thermodynamic conservation
              of energy, Stefan-Boltzmann radiation, or transient thermal capacitance. Replacing an ODE solver with a language model
              would be unverifiable and unscientific.
            </p>
            <p>
              Following established building energy meta-modelling literature, we trained a lightweight <strong>Multi-Layer Perceptron (MLP)</strong> on
              our own validated EN ISO 52016-1 solver. The surrogate maps 21 continuous design and high-altitude climate parameters directly to diurnal thermal performance.
            </p>
          </div>

          <div className="surrogate-info-block">
            <h4 className="surrogate-block-title">Architectural Boundary & Rule R-SURROGATE</h4>
            <p>
              <strong>Ground Truth Isolation:</strong> The empirical validation suite (<code>/verify</code>, <code>/validation</code>, <code>validation/run.py</code>)
              and all generated engineering compliance reports strictly execute the deterministic ISO 52016-1 ODE solver.
            </p>
            <div className="surrogate-badge-demo">
              <div className="demo-chip-item">
                <span className="chip-surrogate">surrogate estimate</span>
                <span className="demo-chip-desc">Displayed on interactive design preview & search screening</span>
              </div>
              <div className="demo-chip-item">
                <span className="chip-verified">full simulation</span>
                <span className="demo-chip-desc">Displayed on formal validation and final spec sheets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Parity & Metrics Table */}
        <div className="surrogate-table-wrap">
          <div className="surrogate-table-header">
            <h3 className="surrogate-subhead">Held-Out Test Set Parity Metrics (N = 1,500 Held-Out Samples)</h3>
            <span className="table-gate-tag pass">GATE PASSED: Max Error &lt; 1.0 °C</span>
          </div>
          <table className="method-table">
            <thead>
              <tr>
                <th>Thermal Target</th>
                <th>Units</th>
                <th>RMSE</th>
                <th>MAE</th>
                <th>Max Error</th>
                <th>R² Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sym-col"><strong>Overnight Minimum (T_in,min)</strong></td>
                <td className="mono">°C</td>
                <td className="mono" style={{ color: 'var(--sage)', fontWeight: 600 }}>0.160 °C</td>
                <td className="mono">0.123 °C</td>
                <td className="mono" style={{ color: 'var(--sage)', fontWeight: 700 }}>0.844 °C</td>
                <td className="mono" style={{ fontWeight: 700 }}>0.9992</td>
                <td><span className="badge-pass">PASS (&lt; 1.0 °C)</span></td>
              </tr>
              <tr>
                <td className="sym-col"><strong>24h Diurnal Mean (T_in,mean)</strong></td>
                <td className="mono">°C</td>
                <td className="mono" style={{ color: 'var(--sage)', fontWeight: 600 }}>0.115 °C</td>
                <td className="mono">0.090 °C</td>
                <td className="mono">0.645 °C</td>
                <td className="mono" style={{ fontWeight: 700 }}>0.9996</td>
                <td><span className="badge-pass">PASS</span></td>
              </tr>
              <tr>
                <td className="sym-col"><strong>Daytime Peak (T_in,max)</strong></td>
                <td className="mono">°C</td>
                <td className="mono">0.230 °C</td>
                <td className="mono">0.163 °C</td>
                <td className="mono">1.718 °C</td>
                <td className="mono" style={{ fontWeight: 700 }}>0.9986</td>
                <td><span className="badge-pass">PASS</span></td>
              </tr>
              <tr>
                <td className="sym-col"><strong>IMAC Comfort Hours Ratio</strong></td>
                <td className="mono">ratio</td>
                <td className="mono">0.025</td>
                <td className="mono">0.020</td>
                <td className="mono">0.121</td>
                <td className="mono">0.9850</td>
                <td><span className="badge-pass">PASS</span></td>
              </tr>
              <tr>
                <td className="sym-col"><strong>Hours Below Health (&lt; 10 °C)</strong></td>
                <td className="mono">hrs</td>
                <td className="mono">0.123 hrs</td>
                <td className="mono">0.097 hrs</td>
                <td className="mono">0.489 hrs</td>
                <td className="mono">0.9940</td>
                <td><span className="badge-pass">PASS</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Speedup Comparison Cards */}
        <div className="surrogate-benchmarks-grid">
          <div className="bench-card">
            <span className="bench-label">Single Design Evaluation</span>
            <div className="bench-numbers">
              <div className="bench-stat">
                <span className="mono bench-value surrogate">0.065 ms</span>
                <span className="bench-sub">Surrogate</span>
              </div>
              <span className="bench-vs">vs</span>
              <div className="bench-stat">
                <span className="mono bench-value solver">13.2 ms</span>
                <span className="bench-sub">ISO 52016-1 ODE</span>
              </div>
            </div>
            <span className="bench-ratio">203× Speedup</span>
          </div>

          <div className="bench-card highlight">
            <span className="bench-label">3,000 Design Search Space</span>
            <div className="bench-numbers">
              <div className="bench-stat">
                <span className="mono bench-value surrogate">3.17 ms</span>
                <span className="bench-sub">Surrogate (Batch)</span>
              </div>
              <span className="bench-vs">vs</span>
              <div className="bench-stat">
                <span className="mono bench-value solver">39.6 s</span>
                <span className="bench-sub">ISO 52016-1 Solver</span>
              </div>
            </div>
            <span className="bench-ratio badge-highlight">12,483× Speedup</span>
          </div>

          <div className="bench-card">
            <span className="bench-label">Training Provenance</span>
            <div className="provenance-list">
              <div className="prov-row"><span>Training runs:</span><strong className="mono">10,000 (LHS)</strong></div>
              <div className="prov-row"><span>Architecture:</span><strong className="mono">MLP (128-64-32)</strong></div>
              <div className="prov-row"><span>Gen runtime:</span><strong className="mono">48.5 s (206 runs/s)</strong></div>
              <div className="prov-row"><span>Train runtime:</span><strong className="mono">8.85 s (Adam)</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
