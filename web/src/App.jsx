import { useState, useEffect, useRef } from 'react';
import './App.css';
import TokensPage from './TokensPage';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CollapseSection from './components/CollapseSection';
import PhysicsSolvedSection from './components/PhysicsSolvedSection';
import ScenarioCards, { SCENARIO_PRESETS } from './components/ScenarioCards';
import ShelterBuilder from './components/ShelterBuilder';
import ReportSection from './components/ReportSection';
import ValidationSection from './components/ValidationSection';
import WatchView from './components/WatchView';
import MethodModal from './components/MethodModal';

export default function App() {
  // Check if viewing /tokens
  const [viewTokens, setViewTokens] = useState(() => {
    return (
      window.location.pathname === '/tokens' ||
      window.location.search.includes('view=tokens') ||
      window.location.hash === '#tokens'
    );
  });

  // Active Scenario state (default: Forward Post)
  const [activeScenarioId, setActiveScenarioId] = useState('forward_post');
  const activeScenario = SCENARIO_PRESETS[activeScenarioId] || SCENARIO_PRESETS.forward_post;

  // Baseline data for CollapseSection & ReportSection
  const [baselineData, setBaselineData] = useState(null);

  // Method modal state
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  // Fetch initial baseline simulation
  useEffect(() => {
    const payload = {
      location: activeScenario.location,
      weather: activeScenario.weather,
      geometry: activeScenario.geometry,
      envelope: activeScenario.envelope,
      openings: activeScenario.openings,
      ventilation: activeScenario.ventilation,
      occupancy: activeScenario.occupancy,
      ground: { snow_cover: true, albedo: null },
      comfort: { model: 'imac', health_threshold_c: 18.0 },
      simulation: { timestep_s: 60, spinup_days: 3 },
    };

    fetch('http://127.0.0.1:8000/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.refused) {
          setBaselineData(data);
        }
      })
      .catch((err) => {
        console.warn('Initial baseline fetch failed:', err);
      });
  }, [activeScenario]);

  // Smooth scroll helpers
  const scrollToBuilder = () => {
    const el = document.getElementById('shelter-builder');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToValidation = () => {
    const el = document.getElementById('validation');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToWatch = () => {
    const el = document.getElementById('forecast-watch');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (viewTokens) {
    return <TokensPage />;
  }

  return (
    <div className="product-app-shell">
      {/* Header */}
      <Header
        onOpenMethod={() => setMethodModalOpen(true)}
        onScrollToBuilder={scrollToBuilder}
        onScrollToValidation={scrollToValidation}
        onScrollToWatch={scrollToWatch}
      />

      <main>
        {/* 1. Hero Section (Cream) */}
        <HeroSection onScrollToBuilder={scrollToBuilder} />

        {/* 2. The Collapse Section (Full-bleed Midnight Espresso) */}
        <CollapseSection baselineData={baselineData} />

        {/* 3. The Physics is Solved, The Decision Isn't (Cream) */}
        <PhysicsSolvedSection onScrollToBuilder={scrollToBuilder} />

        {/* Container for Workbench Area */}
        <div className="workbench-wrapper">
          {/* 4. Three Operational Scenarios (Phase S8) */}
          <ScenarioCards
            activeScenarioId={activeScenarioId}
            onSelectScenario={(id) => setActiveScenarioId(id)}
          />

          {/* 5. The Shelter Builder (Phase S6 & S7) */}
          <ShelterBuilder
            key={activeScenarioId}
            activeScenario={activeScenario}
            initialEnvelope={activeScenario.envelope}
          />
        </div>

        {/* 6. Results as a Designed Spec Sheet / Report (Phase S9) */}
        <ReportSection
          scenario={activeScenario}
          simulateResult={baselineData}
        />

        {/* 7. Empirical Validation Section (Full-bleed Midnight Espresso) */}
        <ValidationSection />

        {/* 8. Multi-Post Forecast Early-Warning Watch (Feature 2) */}
        <section id="forecast-watch" style={{ padding: 'var(--space-4) var(--space-3)', backgroundColor: 'var(--bg-base)' }}>
          <WatchView design={activeScenario} />
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span className="footer-logo">THERMA</span>
            <span className="footer-desc">
              Area-Specific Shelter Thermal Optimization System · DRDO SIH 2026 (PS 26051)
            </span>
          </div>
          <div className="footer-links">
            <button type="button" className="footer-link-btn" onClick={() => setMethodModalOpen(true)}>
              Methodology Reference
            </button>
            <a href="/?view=tokens" className="footer-link-btn">
              Design Tokens
            </a>
            <button type="button" className="footer-link-btn" onClick={scrollToWatch}>
              Forecast Watch
            </button>
            <button type="button" className="footer-link-btn" onClick={scrollToValidation}>
              Empirical Validation
            </button>
          </div>
        </div>
      </footer>

      {/* Method Modal */}
      <MethodModal
        isOpen={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
      />
    </div>
  );
}
