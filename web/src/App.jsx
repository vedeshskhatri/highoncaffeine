/*
 * App.jsx — THERMA High-Altitude Architectural Shelter Studio
 * Inspired by contemporary architectural 3D CAD design tools ("hut.").
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import './App.css';
import TokensPage from './TokensPage';
import DesignCanvas from './components/DesignCanvas';
import SimulateCanvas from './components/SimulateCanvas';
import OptimizeCanvas from './components/OptimizeCanvas';
import InspectorPanel from './components/InspectorPanel';
import WatchView from './components/WatchView';
import CommandBar from './components/CommandBar';
import { SITE_PRESETS, FALLBACK_MATERIALS } from './lib/presets';
import DemoModeController from './components/DemoModeController';
import TacticalMapModal from './components/TacticalMapModal';

const STEPS = [
  { id: 'design', label: 'Design Studio', number: 1 },
  { id: 'simulate', label: 'Simulation', number: 2 },
  { id: 'optimize', label: 'Optimization', number: 3 },
  { id: 'watch', label: 'Forecast Watch', number: 4 },
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
      { material: 'adobe_block', thickness_m: 0.30 },
      { material: 'eps', thickness_m: 0.10 },
      { material: 'gypsum_board', thickness_m: 0.015 },
    ],
    roof: [{ material: 'concrete', thickness_m: 0.15 }],
    floor: [{ material: 'concrete', thickness_m: 0.10 }],
    roof_emissivity: 0.90,
  },
  openings: [
    { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
  ],
  ventilation: { ach: 0.6, heater_type: 'none' },
  occupancy: { people: 8, watts_per_person: 100 },
  ground: { snow_cover: true, albedo: null },
  comfort: { model: 'imac', health_threshold_c: 18.0 },
  simulation: { timestep_s: 60, spinup_days: 3 },
};

export default function App() {
  const { id: siteId } = useParams();
  const navigate = useNavigate();

  // Check if viewing /tokens
  const viewTokens =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/tokens' ||
      window.location.search.includes('view=tokens') ||
      window.location.hash === '#tokens');

  const [currentStep, setCurrentStep] = useState('design');
  const [simulateRequest, setSimulateRequest] = useState(INITIAL_SIMULATE_REQUEST);
  const [activeSiteName, setActiveSiteName] = useState(null);
  const [siteWeather, setSiteWeather] = useState(null);
  const [allEstateSites, setAllEstateSites] = useState([]);
  const [gridNote, setGridNote] = useState(null);
  const [simulateResult, setSimulateResult] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [tacticalMapOpen, setTacticalMapOpen] = useState(false);

  // Ensure dark mode attributes and storage are completely removed
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('therma_theme');
    }
  }, []);

  // 1. Fetch estate sites and load active siteId from route URL
  useEffect(() => {
    fetch('http://127.0.0.1:8000/sites')
      .then(r => r.ok ? r.json() : [])
      .then(sites => {
        if (Array.isArray(sites) && sites.length > 0) {
          setAllEstateSites(sites);
        }
      })
      .catch(() => {});

    if (!siteId) return;

    fetch(`http://127.0.0.1:8000/sites/${siteId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(site => {
        if (!site) return;
        setActiveSiteName(site.name);
        setSimulateRequest(prev => {
          const next = {
            ...prev,
            location: {
              lat: site.lat !== undefined ? site.lat : prev.location.lat,
              lon: site.lon !== undefined ? site.lon : prev.location.lon,
              altitude_m: site.altitude_m !== undefined ? site.altitude_m : prev.location.altitude_m,
            },
          };
          if (site.current_design) {
            if (site.current_design.geometry) next.geometry = { ...prev.geometry, ...site.current_design.geometry };
            if (site.current_design.envelope) next.envelope = { ...prev.envelope, ...site.current_design.envelope };
            if (site.current_design.openings) next.openings = site.current_design.openings;
            if (site.current_design.ventilation) next.ventilation = { ...prev.ventilation, ...site.current_design.ventilation };
            if (site.current_design.occupancy) next.occupancy = { ...prev.occupancy, ...site.current_design.occupancy };
          }
          return next;
        });
      })
      .catch(err => {
        console.warn('Could not load site details for', siteId, err);
      });
  }, [siteId]);

  // 2. Fetch live meteorological profile & reverse geocode when coordinates change
  useEffect(() => {
    const lat = simulateRequest?.location?.lat;
    const lon = simulateRequest?.location?.lon;
    if (lat === undefined || lon === undefined) return;

    let isMounted = true;
    const fetchWeatherAndLocation = async () => {
      // Reverse geocode place name
      try {
        const revRes = await fetch(`http://127.0.0.1:8000/location/reverse?lat=${lat}&lon=${lon}`);
        if (revRes.ok) {
          const revData = await revRes.json();
          if (isMounted && revData?.name) {
            setActiveSiteName(revData.region ? `${revData.name}, ${revData.region}` : revData.name);
          }
        }
      } catch {}

      // Fetch meteorological preview
      try {
        const wRes = await fetch(`http://127.0.0.1:8000/location/weather?lat=${lat}&lon=${lon}`);
        if (wRes.ok) {
          const wData = await wRes.json();
          if (isMounted) {
            setSiteWeather(wData);
            if (wData?.metrics?.snow_cover !== undefined) {
              setSimulateRequest(prev => ({
                ...prev,
                ground: { ...prev.ground, snow_cover: wData.metrics.snow_cover },
              }));
            }
          }
        }
      } catch {}
    };

    const timer = setTimeout(fetchWeatherAndLocation, 160);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [simulateRequest?.location?.lat, simulateRequest?.location?.lon]);

  const accessibleSteps = useMemo(() => new Set(['design', 'simulate', 'optimize', 'watch']), []);

  const handleStepClick = useCallback((stepId) => {
    if (accessibleSteps.has(stepId)) {
      setCurrentStep(stepId);
      setDemoMode(false); // Seamlessly exit demo mode so the chosen step view is shown
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
      const res = await fetch('http://127.0.0.1:8000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = await res.json();
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

    // If triggering demo mode
    if (action.type === 'START_DEMO') {
      setDemoMode(true);
      return;
    }

    // Any normal studio command automatically exits demo mode so user sees the commanded state
    setDemoMode(false);

    switch (action.type) {
      case 'EXIT_DEMO': {
        setDemoMode(false);
        break;
      }
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
          {/* Exit / Return to Platform Navigation */}
          <button
            type="button"
            className="studio-exit-btn"
            onClick={() => navigate(siteId ? `/sites/${siteId}` : '/dashboard')}
            title="Exit Shelter Studio and return to THERMA Platform"
          >
            <ArrowLeft size={13} />
            <span>Platform</span>
          </button>

          <div className="app-wordmark" aria-label="THERMA application">
            <span>THERMA</span>
            <span className="wordmark-dot">·</span>
            <span className="app-badge">STUDIO</span>
          </div>

          {/* Active Shelter Configuration Pill */}
          <div
            className="topbar-config-pill"
            title={`Site: ${activeSiteName || 'Custom'} | Coords: ${simulateRequest.location.lat}°N, ${simulateRequest.location.lon}°E | Altitude: ${simulateRequest.location.altitude_m}m ASL`}
            onClick={() => {
              if (currentStep !== 'design') setCurrentStep('design');
              setInspectorCollapsed(false);
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="config-dot" />
            <span className="config-name">{activeSiteName || 'Alpine Field Post'}</span>
            <span className="config-meta">{simulateRequest.location.altitude_m}m ASL · {floorArea} m²</span>
            {siteWeather?.metrics && (
              <span
                className="config-weather-badge mono"
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: siteWeather.metrics.t_air_min < 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: siteWeather.metrics.t_air_min < 0 ? '#38bdf8' : '#f59e0b',
                  fontWeight: 600,
                  marginLeft: 4,
                }}
              >
                {siteWeather.metrics.t_air_min > 0 ? `+${siteWeather.metrics.t_air_min}` : siteWeather.metrics.t_air_min}°C
              </span>
            )}
          </div>
        </div>

        {/* Center: Sleek Unified Command & Search Dock */}
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
              const isActive = !demoMode && step.id === currentStep;
              const isClickable = accessibleSteps.has(step.id);
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
                  <span className="step-number" aria-hidden="true">
                    0{step.number}
                  </span>
                  <span className="step-label">{step.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Demo Mode Toggle Button */}
          <button
            className={`topbar-demo-btn ${demoMode ? 'active' : ''}`}
            id="topbar-demo-mode-btn"
            onClick={() => setDemoMode(d => !d)}
            title="Toggle 8-Stage Deterministic Demo Mode"
          >
            <span className="demo-dot" />
            <span>{demoMode ? 'Live Demo' : 'Demo'}</span>
          </button>

          {/* Primary Action Button */}
          <button
            className="topbar-action-btn"
            id="topbar-run-sim-btn"
            onClick={handleSimulate}
            title="Execute 24-hour thermal diurnal simulation"
          >
            <Play size={12} fill="currentColor" />
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
        <main
          className={`canvas-area ${inspectorCollapsed && !demoMode && currentStep === 'design' ? 'inspector-collapsed' : ''}`}
          id="main-canvas"
          aria-label={demoMode ? 'demo mode canvas' : `${currentStep} canvas`}
        >
          {demoMode ? (
            <div className="step-results-wrapper" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: 'var(--space-2) 0' }}>
              <DemoModeController
                onExitDemo={() => setDemoMode(false)}
                onApplyScenarioToBuilder={(cfg) => {
                  setSimulateRequest(cfg);
                }}
                onSimulationCompleted={(data) => {
                  setSimulateResult(data);
                  if (data?.weather_provenance?.grid_note) {
                    setGridNote(data.weather_provenance.grid_note);
                  }
                }}
                onOptimizationCompleted={(optData) => {
                  setOptimizeResult(optData);
                }}
              />
            </div>
          ) : (
            <>
              {currentStep === 'design' && (
                <DesignCanvas
                  request={simulateRequest}
                  onSimulate={handleSimulate}
                  activeSiteName={activeSiteName}
                  siteWeather={siteWeather}
                  onOpenLocation={() => setTacticalMapOpen(true)}
                  onApplyBuildUp={(updates) => {
                    setSimulateRequest((prev) => ({
                      ...prev,
                      envelope: {
                        ...prev.envelope,
                        ...updates.envelope,
                      },
                      openings: updates.openings || prev.openings,
                    }));
                  }}
                />
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
            </>
          )}
        </main>

        {/* Right Inspector Panel (Step 1: Design Studio) */}
        {!demoMode && currentStep === 'design' && (
          <div className={`inspector-wrapper ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
            <InspectorPanel
              request={simulateRequest}
              onUpdate={updateRequest}
              onSimulate={handleSimulate}
              gridNote={gridNote}
              collapsed={inspectorCollapsed}
              onToggleCollapse={() => setInspectorCollapsed(c => !c)}
              activeSiteName={activeSiteName}
              siteWeather={siteWeather}
              onOpenTacticalMap={() => setTacticalMapOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Full-Screen Planetary Tactical Map Modal with Blurred Backdrop */}
      <TacticalMapModal
        isOpen={tacticalMapOpen}
        onClose={() => setTacticalMapOpen(false)}
        location={simulateRequest.location}
        onSelectLocation={(loc) => {
          updateRequest({ location: loc });
        }}
        onApplyRecommendedEnvelope={(envUpdates) => {
          updateRequest((prev) => ({
            ...prev,
            envelope: {
              ...prev.envelope,
              ...envUpdates.envelope,
            },
          }));
        }}
        activeSiteName={activeSiteName}
      />

      {/* Mobile Inspector Drawer Toggle */}
      {!demoMode && currentStep === 'design' && (
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
