import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Shield, 
  Sun, 
  Play, 
  Layers, 
  Flame, 
  Compass, 
  ChevronRight,
  ThermometerSnowflake,
  ShieldCheck
} from 'lucide-react';
import FloatingChatOrb from './FloatingChatOrb';
import AlpineSolarBackground from './AlpineSolarBackground';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* ───────────────────────────────────────────────────────────
          1. Minimalist Architectural Header
          ─────────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="nav-container">
          <Link to="/" className="brand-group">
            <div className="brand-logo-box">
              <img 
                src="/thermometer_sticker.png" 
                alt="THERMA Thermometer Logo" 
                className="brand-thermometer-img" 
              />
            </div>
            <span className="brand-title">THERMA</span>
          </Link>

          <div className="nav-actions">
            <Link to="/dashboard" className="nav-cta-btn">
              <span>Enter Platform</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
          2. Hero Section: Focused, Minimal, Grand Typography (Inspo Style)
          ─────────────────────────────────────────────────────────── */}
      <section className="hero-section">
        <AlpineSolarBackground />
        <div className="hero-container">
          
          <div className="hero-kicker">
            <span className="kicker-pill">HIMALAYAN PASSIVE SOLAR ARCHITECTURE</span>
          </div>

          <h1 className="hero-headline">
            It costs <span className="highlight-terracotta">₹2,400</span> to lift one litre of fuel to Siachen.
          </h1>

          <p className="hero-subtext">
            At 5,400 metres, helicopters fly at their ceiling carrying kerosene just to heat uninsulated tin. 
            THERMA uses passive solar thermodynamics to engineer zero-fuel thermal habitability across the Himalayan frontier.
          </p>

          <div className="hero-cta-bar">
            <Link
              to="/dashboard"
              className="btn-pill-primary"
              id="hero-enter-platform"
              onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
            >
              <span>Explore Platform</span>
              <div className="play-circle">
                <Play size={11} fill="currentColor" />
              </div>
            </Link>

            <Link
              to="/sites/site_siachen_base/design"
              className="btn-pill-secondary"
              id="hero-launch-studio"
              onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
            >
              <span>3D Shelter Studio</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* 3 Clean Focal Pillars (No Data Overload) */}
          <div className="hero-pillars">
            <div className="pillar-item">
              <span className="pillar-num">₹2,400<small> / L</small></span>
              <span className="pillar-title">Helicopter Fuel Cost</span>
              <span className="pillar-desc">Aviation supply burden eliminated</span>
            </div>

            <div className="pillar-item">
              <span className="pillar-num highlight">+18.0 °C</span>
              <span className="pillar-title">WHO Habitability</span>
              <span className="pillar-desc">Maintained 100% passively</span>
            </div>

            <div className="pillar-item">
              <span className="pillar-num">0 Litres</span>
              <span className="pillar-title">Fuel Required</span>
              <span className="pillar-desc">Zero soot, zero carbon monoxide risk</span>
            </div>
          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          3. The Core Challenge: Clear, Human Storytelling
          ─────────────────────────────────────────────────────────── */}
      <section className="story-section">
        <div className="story-container">
          
          <div className="story-header">
            <span className="section-eyebrow">THE FRONTIER PROBLEM</span>
            <h2 className="story-title">The 04:00 AM Thermal Collapse</h2>
            <p className="story-dek">
              Clear Himalayan skies radiate heat directly into deep space (-35 °C effective sky temperature). 
              Standard corrugated iron shelters have zero thermal capacitance — by dawn, inside temperatures crash below freezing.
            </p>
          </div>

          <div className="story-comparison">
            {/* Standard Shelter */}
            <div className="story-card problem">
              <div className="story-card-top">
                <span className="story-badge red">CURRENT BASELINE</span>
                <span className="story-tag">Corrugated Galvanized Iron (CGI)</span>
              </div>
              <h3 className="card-title">Continuous Fuel Combustion</h3>
              <p className="card-body">
                Lacking insulation or thermal mass, barracks bleed heat immediately. Troops must run bukhari stoves 24/7, 
                consuming hundreds of kilograms of kerosene and exposing personnel to toxic carbon monoxide accumulation.
              </p>
              <div className="card-metric-row">
                <div className="metric-pill">
                  <span className="metric-v red">-18 °C</span>
                  <span className="metric-l">Unheated Dawn T_in</span>
                </div>
                <div className="metric-pill">
                  <span className="metric-v red">24/7 Stove</span>
                  <span className="metric-l">CO & Soot Hazard</span>
                </div>
              </div>
            </div>

            {/* THERMA Shelter */}
            <div className="story-card solution">
              <div className="story-card-top">
                <span className="story-badge green">THERMA INTERVENTION</span>
                <span className="story-tag">Passive Solar Mass Wall</span>
              </div>
              <h3 className="card-title">Stored Solar Inertia</h3>
              <p className="card-body">
                South-facing double glazing harvests intense high-altitude daytime radiation. A 300mm local stone or mud-brick mass wall 
                stores the thermal energy, and insulated nocturnal shutters lock it in — gently discharging heat throughout the night.
              </p>
              <div className="card-metric-row">
                <div className="metric-pill">
                  <span className="metric-v green">+18 °C</span>
                  <span className="metric-l">Guaranteed Dawn T_in</span>
                </div>
                <div className="metric-pill">
                  <span className="metric-v green">0 Litres</span>
                  <span className="metric-l">Combustion Free</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          4. 3 Core Platform Capabilities (Not 9 Cluttered Cards)
          ─────────────────────────────────────────────────────────── */}
      <section className="modules-section">
        <div className="modules-container">
          
          <div className="modules-header">
            <span className="section-eyebrow">ENGINEERING PLATFORM</span>
            <h2 className="modules-title">Built for High-Altitude Command & Design</h2>
          </div>

          <div className="modules-grid">
            {/* 1. 3D Architectural Studio */}
            <Link to="/sites/site_siachen_base/design" className="module-card">
              <div className="module-icon-box">
                <Layers size={22} />
              </div>
              <h3 className="module-name">Interactive 3D Shelter Studio</h3>
              <p className="module-desc">
                Tune building geometry, orientation, mass wall thickness, and nocturnal shutters with real-time 5R1C lumped capacitance thermal simulation.
              </p>
              <span className="module-link">
                <span>Launch 3D Studio</span>
                <ArrowRight size={14} />
              </span>
            </Link>

            {/* 2. Outpost Portfolio */}
            <Link to="/sites" className="module-card">
              <div className="module-icon-box">
                <Compass size={22} />
              </div>
              <h3 className="module-name">Frontier Outpost Registry</h3>
              <p className="module-desc">
                Monitors 12 critical forward posts from Siachen Base Camp (5,400m) to Daulat Beg Oldie and DIHAR Leh with real-time solar tracking.
              </p>
              <span className="module-link">
                <span>View 12 Outposts</span>
                <ArrowRight size={14} />
              </span>
            </Link>

            {/* 3. Retrofit Programme */}
            <Link to="/programme" className="module-card">
              <div className="module-icon-box">
                <Flame size={22} />
              </div>
              <h3 className="module-name">₹2.0 Cr Capital Allocator</h3>
              <p className="module-desc">
                Budget-constrained retrofit optimization: ranks forward posts by kerosene litres saved per rupee invested, proving fast capital payback.
              </p>
              <span className="module-link">
                <span>Run Allocator</span>
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          5. Minimal, Clean Call to Action
          ─────────────────────────────────────────────────────────── */}
      <section className="cta-strip-section">
        <div className="cta-strip-container">
          <div className="cta-strip-content">
            <h2 className="cta-strip-title">Ready to explore the thermal management platform?</h2>
            <p className="cta-strip-desc">
              Access the live estate dashboard, outposts telemetry, and 3D architectural solver.
            </p>
            <div className="cta-strip-actions">
              <Link
                to="/dashboard"
                className="btn-pill-primary"
                onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
              >
                <span>Open Estate Dashboard</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/sites/site_siachen_base/design"
                className="btn-pill-secondary"
                onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
              >
                <span>Open 3D Studio</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          6. Clean, Grounded Footer
          ─────────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="footer-brand">
              <div className="footer-logo-box">
                <img 
                  src="/thermometer_sticker.png" 
                  alt="THERMA Logo" 
                  className="footer-thermometer-img" 
                />
              </div>
              <span className="brand-title">THERMA</span>
            </div>
            <p className="footer-sub">
              Area-specific high-altitude passive solar shelter engineering for defence outposts and humanitarian relief.
            </p>
          </div>

          <div className="footer-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/sites">Outposts</Link>
            <Link to="/sites/site_siachen_base/design">3D Studio</Link>
            <Link to="/programme">Retrofit</Link>
            <Link to="/method">Physics</Link>
            <Link to="/validation">Validation</Link>
          </div>
        </div>
      </footer>

      <FloatingChatOrb />
    </div>
  );
}
