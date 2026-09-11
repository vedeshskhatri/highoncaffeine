import React from 'react';
import './HeroSection.css';

export default function HeroSection({ onScrollToBuilder }) {
  return (
    <section className="hero-section">
      <div className="hero-inner">
        <div className="hero-eyebrow">
          <span className="eyebrow-rule"></span>
          <span className="eyebrow-text">SIH 2026 · PS 26051 · HIGH ALTITUDE DEFENCE SHELTER THERMAL OPTIMIZATION</span>
        </div>

        <h1 className="hero-headline">
          Rs 2,400 to deliver one litre of kerosene to Siachen.
        </h1>

        <p className="hero-subhead">
          High-altitude military outposts receive over 1,000 W/m² of peak solar irradiance through thin, cloudless Himalayan skies. Yet soldiers burn up to 40 litres of airlifted fossil fuel every night because poorly insulated shelters lose heat faster than their bukharis can burn.
        </p>

        <div className="hero-actions">
          <button type="button" className="hero-cta-btn" onClick={onScrollToBuilder}>
            Explore the Interactive Shelter Builder
          </button>
          <div className="hero-stats">
            <div className="stat-pill">
              <span className="stat-value">3,500 m+</span>
              <span className="stat-label">Operating Altitude</span>
            </div>
            <div className="stat-pill">
              <span className="stat-value">ISO 52016-1</span>
              <span className="stat-label">Validated Physics</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
