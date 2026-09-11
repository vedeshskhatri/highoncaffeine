import React from 'react';
import './PhysicsSolvedSection.css';

const PRECEDENTS = [
  {
    id: 'dihar',
    name: 'DIHAR Solar Shelter',
    site: 'Leh, Ladakh · 3,500 m',
    temp: '16.0–18.4 °C',
    measured: '15–20 °C measured',
    description: 'Direct passive solar gain shelter engineered by DRDO Defence Institute of High Altitude Research. Proves passive comfort is possible at sub-zero temperatures.',
    badge: 'DRDO Benchmark',
  },
  {
    id: 'adm',
    name: 'ADM Block Passive Army Barracks',
    site: 'Nyoma, Ladakh · 4,180 m',
    temp: '18.9 °C at 06:00',
    measured: '20 °C design goal',
    description: 'Mass-timber and heavy earth envelope design delivering reliable passive heating for forward operational deployment without daytime diesel generation.',
    badge: 'Military Precedent',
  },
  {
    id: 'ledeg',
    name: 'LEDeG Trombe Wall',
    site: 'Leh Valley · 3,500 m',
    temp: '16.3 °C mean Feb',
    measured: '17.4 °C field pilot',
    description: 'Glazed masonry thermal storage wall that absorbs daytime solar flux and slowly conducts warmth into living quarters through nocturnal freezing hours.',
    badge: 'Civic Tradition',
  },
];

export default function PhysicsSolvedSection({ onScrollToBuilder }) {
  return (
    <section className="precedents-section">
      <div className="precedents-inner">
        <div className="precedents-header">
          <div className="precedents-tag">EMPIRICAL FOUNDATION</div>
          <h2 className="precedents-title">
            The Physics is Solved. The Decision Isn’t.
          </h2>
          <p className="precedents-intro">
            These three buildings in Ladakh stay warm without heaters. Every one was hand-engineered by an expert architect over months for one exact location, orientation, and microclimate. When an army platoon moves 20 km or emergency relief needs 500 shelters in 48 hours, expert consulting does not scale.
          </p>
        </div>

        <div className="precedents-grid">
          {PRECEDENTS.map((p) => (
            <div key={p.id} className="precedent-card">
              <div className="precedent-top">
                <span className="precedent-badge mono">{p.badge}</span>
                <span className="precedent-site">{p.site}</span>
              </div>
              <h3 className="precedent-name">{p.name}</h3>
              <p className="precedent-desc">{p.description}</p>
              <div className="precedent-metric-box">
                <span className="p-metric-label">Modeled Performance:</span>
                <span className="p-metric-val mono">{p.temp}</span>
                <span className="p-metric-sub mono">({p.measured})</span>
              </div>
            </div>
          ))}
        </div>

        <div className="precedents-turn">
          <div className="turn-box">
            <h4 className="turn-title">THERMA brings expert passive engineering to every site in seconds.</h4>
            <p className="turn-text">
              By combining transient EN ISO 52016-1 thermal physics with algorithmic multi-objective Pareto search, THERMA lets any operator explore thousands of envelope permutations and find the exact combination of mud, stone, EPS, and glazing for their site.
            </p>
            <button type="button" className="turn-cta" onClick={onScrollToBuilder}>
              Try it for your site below ↓
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
