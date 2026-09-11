/*
 * App.jsx — THERMA High-Altitude Architectural Shelter Studio
 * Inspired by contemporary architectural 3D CAD design tools ("hut.").
 */
import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, SlidersHorizontal } from 'lucide-react';
import './App.css';
import TokensPage from './TokensPage';
import DesignCanvas from './components/DesignCanvas';
import SimulateCanvas from './components/SimulateCanvas';
import OptimizeCanvas from './components/OptimizeCanvas';
import InspectorPanel from './components/InspectorPanel';
import WatchView from './components/WatchView';
import CommandBar from './components/CommandBar';
import { SITE_PRESETS, FALLBACK_MATERIALS } from './lib/presets';

const STEPS = [
  { id: 'design',   label: 'Design Studio', number: 1 },
  { id: 'simulate', label: 'Simulation',    number: 2 },
  { id: 'optimize', label: 'Optimization',  number: 3 },
  { id: 'watch',    label: 'Forecast Watch', number: 4 },
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
  // Check if viewing /tokens
  const viewTokens =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/tokens' ||
      window.location.search.includes('view=tokens') ||
      window.location.hash === '#tokens');

  const [currentStep, setCurrentStep] = useState('design');
  const [simulateRequest, setSimulateRequest] = useState(INITIAL_SIMULATE_REQUEST);
  const [gridNote, setGridNote] = useState(null);
  const [simulateResult, setSimulateResult] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const accessibleSteps = useMemo(() => new Set(['design', 'simulate', 'optimize', 'watch']), []);

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

  const handleSimulate = useCallback(async (customRequest) => {
    const req = (customRequest && customRequest.location) ? customRequest : simulateRequest;
    try {
      const resp = await fetch('http://localhost:8000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
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

  const handleCommand = useCallback((action) => {
    if (!action || !action.type) return;

    // Trigger brief visual instrument pulse on canvas
    const canvas = document.getElementById('main-canvas');
    if (canvas) {
      canvas.classList.remove('instrument-pulse');
      void canvas.offsetWidth; // Force reflow
      canvas.classList.add('instrument-pulse');
      setTimeout(() => canvas.classList.remove('instrument-pulse'), 380);
    }

    switch (action.type) {
      case 'NAVIGATE_STEP': {
        if (action.step === 'validation panel toggle') {
          setCurrentStep('simulate');
          setTimeout(() => {
            const el = document.getElementById('validation-panel');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 80);
        } else if (accessibleSteps.has(action.step)) {
          setCurrentStep(action.step);
        }
        break;
      }
      case 'SET_SITE_AND_NAVIGATE': {
        const updatedReq = {
          ...simulateRequest,
          location: {
            lat: action.site.lat,
            lon: action.site.lon,
            altitude_m: action.site.altitude_m,
          },
        };
        setSimulateRequest(updatedReq);
        setCurrentStep('simulate');
        handleSimulate(updatedReq);
        break;
      }
      case 'SET_SITE_AND_MATERIAL_AND_NAVIGATE': {
        const updatedWalls = simulateRequest.envelope.walls.map((w, idx) =>
          idx === 0 ? { ...w, material: action.material.id } : w
        );
        const updatedReq = {
          ...simulateRequest,
          location: {
            lat: action.site.lat,
            lon: action.site.lon,
            altitude_m: action.site.altitude_m,
          },
          envelope: {
            ...simulateRequest.envelope,
            walls: updatedWalls,
          },
        };
        setSimulateRequest(updatedReq);
        setCurrentStep('simulate');
        handleSimulate(updatedReq);
        break;
      }
      case 'COMPARE_MATERIALS': {
        setCurrentStep('simulate');
        setTimeout(() => {
          const compPanel = document.getElementById('design-comparison-panel');
          if (compPanel) {
            compPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 80);
        break;
      }
      default:
        break;
    }
  }, [simulateRequest, accessibleSteps, handleSimulate]);

  if (viewTokens) {
    return <TokensPage />;
  }

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

        {/* ── Center Terminal Command Bar ─────────────────────────────── */}
        <div className="topbar-center">
          <CommandBar
            context={{ sitePresets: SITE_PRESETS, materialIds: FALLBACK_MATERIALS }}
            onCommand={handleCommand}
          />
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

          {currentStep === 'watch' && (
            <div className="step-results-wrapper" style={{ padding: 'var(--space-3) 0' }}>
              <WatchView design={simulateRequest} />
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
