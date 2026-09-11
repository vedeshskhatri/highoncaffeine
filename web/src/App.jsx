import { useState, useCallback } from 'react';
import './App.css';
import InputRail from './components/InputRail';
import DesignCanvas from './components/DesignCanvas';
import SimulateCanvas from './components/SimulateCanvas';
import OptimizeCanvas from './components/OptimizeCanvas';

/*
 * STEPS — the three phases of THERMA
 * A step is only clickable if it is already accessible (valid input reached it).
 * Phase S2 wires up the validation logic; for now only Design is accessible.
 */
const STEPS = [
  { id: 'design',   label: 'Design',   number: 1 },
  { id: 'simulate', label: 'Simulate', number: 2 },
  { id: 'optimize', label: 'Optimize', number: 3 },
];

/*
 * INITIAL STATE — mirrors SimulateRequest from 07_API_CONTRACT.md exactly.
 * Fields that drive UI display but are not in the contract (drawerOpen) are
 * held separately.
 *
 * grid_note: populated from weather_provenance.grid_note in a /simulate
 * response when mode is design_winter_night. Null until first response.
 */
const INITIAL_SIMULATE_REQUEST = {
  location: {
    lat: 34.1526,
    lon: 77.5771,
    altitude_m: 3500,
  },
  weather: {
    mode: 'typical_day',       // 'typical_day' | 'design_winter_night' | 'user_csv'
    date: '2026-01-15',
    hours: 24,
    user_csv_id: null,
  },
  geometry: {
    length_m: 6.0,
    width_m: 4.0,
    height_m: 2.6,
    orientation_deg: 180,      // 0=N 90=E 180=S 270=W
  },
  envelope: {
    walls: [
      { material: 'mud_brick', thickness_m: 0.30 },
      { material: 'eps',       thickness_m: 0.05 },
    ],
    roof:  [{ material: 'concrete', thickness_m: 0.15 }],
    floor: [{ material: 'concrete', thickness_m: 0.10 }],
    roof_emissivity: 0.90,
  },
  openings: [
    { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
  ],
  ventilation: { ach: 0.6, heater_type: 'none' },
  occupancy:   { people: 8, watts_per_person: 100 },
  ground:      { snow_cover: true, albedo: null },
  comfort:     { model: 'imac', health_threshold_c: 18.0 },
  simulation:  { timestep_s: 60, spinup_days: 3 },
};

export default function App() {
  /* ── Step state ─────────────────────────────────────────────────── */
  const [currentStep, setCurrentStep] = useState('design');

  /*
   * ── Simulate request state ───────────────────────────────────────
   * Single object lifted to App. InputRail receives this + a setter.
   * The rail never remounts — only the canvas swaps on step change.
   */
  const [simulateRequest, setSimulateRequest] = useState(INITIAL_SIMULATE_REQUEST);

  /*
   * ── grid_note ────────────────────────────────────────────────────
   * Populated from a /simulate response weather_provenance.grid_note.
   * Shown as caption under the weather toggle when mode is P1.
   */
  const [gridNote, setGridNote] = useState(null);

  /* ── Simulate / optimize results ────────────────────────────────── */
  const [simulateResult, setSimulateResult] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);

  /* ── Mobile drawer state (UI only — not in SimulateRequest) ─────── */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ── Accessible steps ───────────────────────────────────────────── */
  // Phase S2 will gate on valid input; for now only Design is reachable.
  const accessibleSteps = new Set(['design']);

  const handleStepClick = useCallback((stepId) => {
    if (accessibleSteps.has(stepId)) {
      setCurrentStep(stepId);
      setDrawerOpen(false);
    }
  }, [accessibleSteps]);

  /* ── Partial update helpers ─────────────────────────────────────── */
  const updateWeatherMode = useCallback((mode) => {
    setSimulateRequest(prev => ({
      ...prev,
      weather: { ...prev.weather, mode },
    }));
    // Clear grid_note when switching to typical_day
    if (mode === 'typical_day') setGridNote(null);
  }, []);

  const updateRequest = useCallback((updater) => {
    setSimulateRequest(prev =>
      typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
    );
  }, []);

  /* ── Canvas by step ─────────────────────────────────────────────── */
  const canvasMap = {
    design:   <DesignCanvas request={simulateRequest} />,
    simulate: <SimulateCanvas result={simulateResult} request={simulateRequest} />,
    optimize: <OptimizeCanvas result={optimizeResult} />,
  };

  const isP1 = simulateRequest.weather.mode === 'design_winter_night';

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="app-topbar" role="banner">
        <span className="app-wordmark" aria-label="THERMA application">THERMA</span>

        {/* Step rail */}
        <nav className="step-rail" aria-label="Application steps">
          {STEPS.map((step, i) => {
            const isActive = step.id === currentStep;
            const isClickable = accessibleSteps.has(step.id) && !isActive;
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <div className="step-divider" aria-hidden="true" />}
                <button
                  id={`step-btn-${step.id}`}
                  className={[
                    'step-item',
                    isActive ? 'active' : '',
                    isClickable ? 'clickable' : '',
                  ].join(' ')}
                  onClick={() => isClickable && handleStepClick(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-disabled={!isClickable && !isActive}
                  title={
                    !accessibleSteps.has(step.id) && !isActive
                      ? 'Complete the current step to unlock'
                      : undefined
                  }
                >
                  <span className="step-number" aria-hidden="true">{step.number}</span>
                  {step.label}
                </button>
              </div>
            );
          })}
        </nav>
      </header>

      {/* ── App body ─────────────────────────────────────────────── */}
      <div className="app-body">

        {/* Mobile overlay */}
        {drawerOpen && (
          <div
            className="drawer-overlay"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/*
         * ── InputRail ───────────────────────────────────────────────
         * NEVER remounts. The canvas swaps; this stays mounted.
         * Verified in Phase S1 verification step.
         */}
        <aside
          className={`input-rail ${drawerOpen ? 'open' : ''}`}
          aria-label="Shelter design inputs"
        >
          {/* Weather mode toggle — MUST be at the very top of the rail */}
          <div className="weather-mode-section">
            <div className="weather-mode-label" id="weather-mode-label">
              Weather mode
            </div>
            <div
              className="weather-toggle"
              role="group"
              aria-labelledby="weather-mode-label"
            >
              <button
                id="weather-toggle-typical"
                className={`weather-toggle-btn ${!isP1 ? 'active' : ''}`}
                onClick={() => updateWeatherMode('typical_day')}
                aria-pressed={!isP1}
              >
                Typical day
              </button>
              <button
                id="weather-toggle-p1"
                className={`weather-toggle-btn ${isP1 ? 'active' : ''}`}
                onClick={() => updateWeatherMode('design_winter_night')}
                aria-pressed={isP1}
              >
                Design winter night
              </button>
            </div>
            {/* grid_note: must be visible when P1 active — never hidden */}
            {isP1 && (
              <p className="grid-note" role="note">
                {gridNote
                  ? gridNote
                  : 'Weather from regional grid estimate (NASA POWER archive). Not a local measurement.'}
              </p>
            )}
          </div>

          {/* InputRail fields — never remounts */}
          <InputRail
            request={simulateRequest}
            onUpdate={updateRequest}
          />
        </aside>

        {/* ── Canvas — swaps by step ─────────────────────────────── */}
        <main className="canvas-area" id="main-canvas" aria-label={`${currentStep} canvas`}>
          {canvasMap[currentStep]}
        </main>
      </div>

      {/* Mobile drawer toggle */}
      <button
        className="drawer-toggle-btn"
        id="drawer-toggle"
        onClick={() => setDrawerOpen(o => !o)}
        aria-expanded={drawerOpen}
        aria-controls="main-canvas"
        aria-label="Toggle input panel"
      >
        {drawerOpen ? '✕ Close' : '⚙ Inputs'}
      </button>
    </>
  );
}
