/*
 * App.jsx — THERMA High-Altitude Architectural Shelter Studio
 * Inspired by contemporary architectural 3D CAD design tools ("hut.").
 */
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, SlidersHorizontal } from 'lucide-react';
import './App.css';
import DesignCanvas from './components/DesignCanvas';
import SimulateCanvas from './components/SimulateCanvas';
import OptimizeCanvas from './components/OptimizeCanvas';
import InspectorPanel from './components/InspectorPanel';

const STEPS = [
  { id: 'design',   label: 'Design Studio', number: 1 },
  { id: 'simulate', label: 'Simulation',    number: 2 },
  { id: 'optimize', label: 'Optimization',  number: 3 },
];

const INITIAL_SIMULATE_REQUEST = {
  location: {
    lat: 34.1526,
    lon: 77.5771,
    altitude_m: 3500,
  },
  weather: {
    mode: 'typical_day',
    date: '2026-01-15',
    hours: 24,
    user_csv_id: null,
  },
  geometry: {
    length_m: 6.0,
    width_m: 4.0,
    height_m: 2.6,
    orientation_deg: 180,
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
  const [currentStep, setCurrentStep] = useState('design');
  const [simulateRequest, setSimulateRequest] = useState(INITIAL_SIMULATE_REQUEST);
  const [gridNote, setGridNote] = useState(null);
  const [simulateResult, setSimulateResult] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const accessibleSteps = useMemo(() => new Set(['design', 'simulate', 'optimize']), []);

  const handleStepClick = useCallback((stepId) => {
    if (accessibleSteps.has(stepId)) {
      setCurrentStep(stepId);
      setMobileDrawerOpen(false);
    }
  }, [accessibleSteps]);

  const updateRequest = useCallback((updater) => {
    setSimulateRequest(prev =>
      typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
    );
  }, []);

  const handleSimulate = useCallback(async () => {
    try {
      const resp = await fetch('http://localhost:8000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateRequest),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSimulateResult(data);
        if (data?.weather_provenance?.grid_note) {
          setGridNote(data.weather_provenance.grid_note);
        }
      }
    } catch (e) {
      console.warn('Backend not reachable or simulation failed:', e);
    }
    setCurrentStep('simulate');
  }, [simulateRequest]);

  const floorArea = (simulateRequest.geometry.length_m * simulateRequest.geometry.width_m).toFixed(1);

  return (
    <>
      {/* ── 1. Top Navigation Bar ──────────────────────────────────────── */}
      <header className="app-topbar" role="banner">
        <div className="topbar-left">
          <div className="app-wordmark" aria-label="THERMA application">
            <span>THERMA</span>
            <span className="wordmark-dot">.</span>
            <span className="app-badge">STUDIO</span>
          </div>

          {/* Active Shelter Configuration Breadcrumb */}
          <div className="topbar-config-pill">
            <span className="config-name">Ladakh_Rapid_Shelter</span>
            <span className="config-divider">/</span>
            <span className="config-meta">
              {floorArea} m² ({simulateRequest.geometry.length_m}m × {simulateRequest.geometry.width_m}m × {simulateRequest.geometry.height_m}m)
            </span>
          </div>
        </div>

        <div className="topbar-right">
          {/* Step Pill Rail */}
          <nav className="step-rail" aria-label="Application steps">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isClickable = accessibleSteps.has(step.id) && !isActive;
              return (
                <button
                  key={step.id}
                  id={`step-btn-${step.id}`}
                  className={`step-item ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}`}
                  onClick={() => isClickable && handleStepClick(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="step-pill-slider"
                      className="step-pill-indicator"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="step-number" aria-hidden="true" style={{ position: 'relative', zIndex: 2 }}>
                    {step.number}
                  </span>
                  <span style={{ position: 'relative', zIndex: 2 }}>{step.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Primary Action Button */}
          <button
            className="topbar-action-btn"
            id="topbar-run-sim-btn"
            onClick={handleSimulate}
            title="Execute 24-hour thermal diurnal simulation"
          >
            <Play size={13} fill="currentColor" />
            <span>Simulate</span>
          </button>
        </div>
      </header>

      {/* ── 2. Studio Body ─────────────────────────────────────────────── */}
      <div className="app-body">
        {/* Mobile Drawer Overlay */}
        {mobileDrawerOpen && (
          <div
            className="drawer-overlay"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Canvas Area */}
        <main className="canvas-area" id="main-canvas" aria-label={`${currentStep} canvas`}>
          {currentStep === 'design' && (
            <DesignCanvas request={simulateRequest} onSimulate={handleSimulate} />
          )}

          {currentStep === 'simulate' && (
            <div className="step-results-wrapper">
              <SimulateCanvas result={simulateResult} request={simulateRequest} />
            </div>
          )}

          {currentStep === 'optimize' && (
            <div className="step-results-wrapper">
              <OptimizeCanvas result={optimizeResult} request={simulateRequest} />
            </div>
          )}
        </main>

        {/* Right Inspector Panel (Step 1: Design Studio) */}
        {currentStep === 'design' && (
          <div className={`inspector-wrapper ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
            <InspectorPanel
              request={simulateRequest}
              onUpdate={updateRequest}
              onSimulate={handleSimulate}
              gridNote={gridNote}
              collapsed={inspectorCollapsed}
              onToggleCollapse={() => setInspectorCollapsed(c => !c)}
            />
          </div>
        )}
      </div>

      {/* Mobile Inspector Drawer Toggle */}
      {currentStep === 'design' && (
        <button
          className="drawer-toggle-btn"
          id="drawer-toggle"
          onClick={() => setMobileDrawerOpen(o => !o)}
          aria-expanded={mobileDrawerOpen}
          aria-label="Toggle input panel"
        >
          <SlidersHorizontal size={14} />
          <span>{mobileDrawerOpen ? 'Close Inspector' : 'Inspector'}</span>
        </button>
      )}
    </>
  );
}
