import React from 'react';
import { SCENARIO_PRESETS } from './scenariosData.js';
import './ScenarioCards.css';

export { SCENARIO_PRESETS };

const DISPLAY_SCENARIO_IDS = ['cold_high_altitude', 'hot_dry', 'warm_humid', 'existing_retrofit'];

export default function ScenarioCards({ activeScenarioId, onSelectScenario }) {
  return (
    <div className="scenario-section">
      <div className="scenario-header">
        <span className="scenario-tag">SELECT MISSION CONTEXT</span>
        <h3 className="scenario-title">Standardized Operational Scenarios</h3>
        <p className="scenario-intro">
          Standardized scenario library built strictly from valid repository data. Each scenario preloads real geographical coordinates, weather profiles, and verified materials from <code>data/materials.csv</code>.
        </p>
      </div>

      <div className="scenario-cards-grid">
        {DISPLAY_SCENARIO_IDS.map((sid) => {
          const s = SCENARIO_PRESETS[sid];
          const isActive = s.id === activeScenarioId || (activeScenarioId === 'forward_post' && s.id === 'cold_high_altitude');
          return (
            <div
              key={s.id}
              className={`scenario-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectScenario(s.id)}
              id={`preset-card-${s.id}`}
            >
              <div className="card-top-row">
                <span className="card-title-badge mono">{s.title}</span>
                {isActive && <span className="active-pill mono">ACTIVE</span>}
              </div>
              <div className="card-tagline">{s.tagline}</div>
              <div className="card-question-box">
                <span className="q-label">KEY QUESTION:</span>
                <span className="q-text">{s.question}</span>
              </div>
              <p className="card-note">{s.framingNote}</p>
              {s.expected_demonstration_capability && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent, #38bdf8)', borderTop: '1px dashed var(--border, #242b35)', paddingTop: '6px' }}>
                  <strong>Capability:</strong> {s.expected_demonstration_capability}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
