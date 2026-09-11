import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldAlert, 
  Sun, 
  Cpu, 
  Compass, 
  Activity, 
  FileText, 
  Flame, 
  Building2, 
  Layers 
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="editorial-landing">
      {/* Top Editorial Nav */}
      <header className="editorial-nav">
        <Link to="/" className="editorial-brand">
          <span className="editorial-logo">THERMA</span>
        </Link>
        <div className="editorial-nav-links">
          <Link to="/dashboard" className="editorial-nav-cta">
            <span>Enter Platform</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Main Editorial Hero */}
      <section className="editorial-hero">
        <h1 className="editorial-hero-title">
          It costs <em>₹2,400</em> to deliver one litre of kerosene to Siachen.
        </h1>

        <p className="editorial-hero-dek">
          At 5,400 metres, light helicopters operate near their structural ceiling carrying hundreds of kilograms of fuel just to warm uninsulated corrugated tin. THERMA turns passive solar physics into an estate-wide asset management system for high-altitude defence and relief shelters.
        </p>

        <div className="editorial-hero-actions">
          <Link to="/dashboard" className="btn-primary-editorial">
            <span>Open Estate Dashboard</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/sites/site_siachen_base/design" className="btn-secondary-editorial">
            <span>Launch Interactive Shelter Studio</span>
          </Link>
        </div>
      </section>

      {/* Headline Metric Strip */}
      <section className="editorial-strip">
        <div className="editorial-strip-inner">
          <div className="strip-stat">
            <span className="strip-value">12</span>
            <span className="strip-label">Frontier military outposts & relief sites monitored</span>
          </div>
          <div className="strip-stat">
            <span className="strip-value">228,800 L <span className="estimate-chip">estimate</span></span>
            <span className="strip-label">Annual baseline kerosene exposure across active Ladakh posts</span>
          </div>
          <div className="strip-stat">
            <span className="strip-value">508 <span className="estimate-chip">estimate</span></span>
            <span className="strip-label">Helicopter sorties required annually (@ 450 L useful load)</span>
          </div>
          <div className="strip-stat">
            <span className="strip-value">18.0 °C</span>
            <span className="strip-label">WHO Housing and Health habitability baseline guaranteed</span>
          </div>
        </div>
      </section>

      {/* Narrative Section: The Contrast */}
      <section className="editorial-narrative">
        <div className="narrative-card danger">
          <span className="narrative-kicker danger">The Logistics Crisis</span>
          <h2 className="narrative-title">The 04:00 AM Thermal Collapse</h2>
          <p className="narrative-body">
            Standard corrugated galvanized iron (CGI) shelters lack thermal capacitance and nighttime radiative suppression. When high-altitude plateaus experience clear-sky sub-zero radiation (-35 °C sky temperatures), internal air collapses below freezing in the early morning hours, forcing round-the-clock bukhari stove operation and severe carbon monoxide hazard.
          </p>
        </div>

        <div className="narrative-card accent">
          <span className="narrative-kicker accent">The Engineering Intervention</span>
          <h2 className="narrative-title">Passive Solar Architecture as Logistics Relief</h2>
          <p className="narrative-body">
            By coupling direct solar gain through oriented double glazing, high thermal inertia mass walls (mud-brick, stone masonry), exterior expanded polystyrene (EPS) wraps, and insulated night shutters, internal shelter temperatures remain above the WHO 18.0 °C standard throughout the night with zero active fuel combustion.
          </p>
        </div>
      </section>

      {/* Platform Capabilities Grid */}
      <section className="editorial-features">
        <div className="features-header">
          <h2>Thermal Asset Management at Scale</h2>
          <p>THERMA shifts operations from a single-room thermal calculator to an estate-level planning system for commanders, engineers, and coordinators.</p>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon"><Building2 size={20} /></div>
            <h3>Estate Multi-Tenancy</h3>
            <p>Partition logistics between distinct operational theaters — Ladakh Northern Command defence posts vs. Nepal humanitarian relief camps.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Flame size={20} /></div>
            <h3>Retrofit Programme Planner</h3>
            <p>Input sanctioned capital budgets (e.g. ₹2.0 Cr) and automatically rank posts by kerosene litres saved per rupee invested.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><ShieldAlert size={20} /></div>
            <h3>Cold Snap Warning System</h3>
            <p>Live meteorological ingestion triggers habitability risk alerts when ambient temperatures threaten hypothermia thresholds.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Layers size={20} /></div>
            <h3>Standard Drawing Library</h3>
            <p>Version-controlled CAD drawings (Rapid Glamping, DIHAR Solar Trombe) with one-click bulk rollout to matching field outposts.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Cpu size={20} /></div>
            <h3>EN ISO 52016-1 Engine</h3>
            <p>Transient 5R1C lumped capacitance solver validated against real empirical field trials at DIHAR Leh and ASHRAE benchmarks.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><FileText size={20} /></div>
            <h3>Formal Submission Packs</h3>
            <p>Instant print-ready engineering reports detailing heat loss balances, design specs, and verified fuel paybacks for military procurement.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="editorial-footer">
        <div className="editorial-footer-inner">
          <div>THERMA Platform · High-Altitude Solar Shelter Thermal Comfort Engineering</div>
          <div>Autonomous Engineering Systems · Defence & Humanitarian Thermal Architecture</div>
        </div>
      </footer>
    </div>
  );
}
