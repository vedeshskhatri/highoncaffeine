import React from 'react';
import './ScenarioCards.css';

export const SCENARIO_PRESETS = {
  forward_post: {
    id: 'forward_post',
    title: 'FORWARD POST',
    tagline: 'Ladakh 3,500 m · Stone, EPS, Prefab panel',
    question: 'How much kerosene do I avoid?',
    siteName: 'Chushul / Nyoma Forward Post (3,500 m)',
    location: { lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
    weather: { mode: 'design_winter_night', date: '2026-01-15', hours: 24, user_csv_id: null },
    geometry: { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180 },
    envelope: {
      walls: [
        { material: 'stone_masonry', thickness_m: 0.30 },
        { material: 'eps', thickness_m: 0.05 },
      ],
      roof: [{ material: 'concrete', thickness_m: 0.15 }],
      floor: [{ material: 'stone_floor', thickness_m: 0.10 }],
      roof_emissivity: 0.90,
    },
    openings: [
      { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
    ],
    ventilation: { ach: 0.6, heater_type: 'none' },
    occupancy: { people: 8, watts_per_person: 100 },
    allowedMaterialIds: ['stone_masonry', 'eps', 'prefab_sandwich', 'concrete', 'stone_floor', 'double_pane', 'double_pane_shutter'],
    framingNote: 'Optimizing for fuel airlift avoidance. Target: minimize nocturnal heater burn while maintaining survivable conditions.',
  },

  relief_shelter: {
    id: 'relief_shelter',
    title: 'RELIEF SHELTER',
    tagline: 'Rasuwa, Nepal 2,400 m · Tarpaulin, Plastic, Mud skirt',
    question: 'Will people survive the winter?',
    siteName: 'Rasuwa District Post-Disaster Camp (2,400 m)',
    location: { lat: 28.1450, lon: 85.2910, altitude_m: 2400 },
    weather: { mode: 'typical_day', date: '2026-01-15', hours: 24, user_csv_id: null },
    geometry: { length_m: 4.0, width_m: 3.0, height_m: 2.2, orientation_deg: 180 },
    envelope: {
      walls: [
        { material: 'mud_skirt', thickness_m: 0.15 },
        { material: 'tarpaulin', thickness_m: 0.01 },
      ],
      roof: [
        { material: 'blanket_layer', thickness_m: 0.02 },
        { material: 'tarpaulin', thickness_m: 0.01 },
      ],
      floor: [
        { material: 'straw_bale', thickness_m: 0.05 },
        { material: 'plastic_sheeting', thickness_m: 0.005 },
      ],
      roof_emissivity: 0.90,
    },
    openings: [
      { facing: 'south', area_m2: 0.5, glazing: 'single_pane', night_shutter: false },
    ],
    ventilation: { ach: 1.0, heater_type: 'none' },
    occupancy: { people: 5, watts_per_person: 100 },
    allowedMaterialIds: ['tarpaulin', 'plastic_sheeting', 'blanket_layer', 'mud_skirt', 'straw_bale', 'single_pane'],
    framingNote: 'A standard family tent at 2,400 m reaches +1.2 C inside by 04:00. A compacted mud skirt and insulated floor mat raise the overnight minimum to +5.3 C for about Rs 1,900 per shelter.',
  },

  village_home: {
    id: 'village_home',
    title: 'VILLAGE HOME',
    tagline: 'Leh Valley 3,500 m · Mud brick, Trombe, Local timber',
    question: 'What is the cheapest fix?',
    siteName: 'Leh Rural Homestead (3,500 m)',
    location: { lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
    weather: { mode: 'typical_day', date: '2026-01-15', hours: 24, user_csv_id: null },
    geometry: { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180 },
    envelope: {
      walls: [{ material: 'mud_brick', thickness_m: 0.30 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      roof_emissivity: 0.90,
    },
    openings: [
      { facing: 'south', area_m2: 3.0, glazing: 'double_pane', night_shutter: false },
    ],
    ventilation: { ach: 0.6, heater_type: 'none' },
    occupancy: { people: 4, watts_per_person: 100 },
    allowedMaterialIds: ['mud_brick', 'rammed_earth', 'straw_bale', 'concrete', 'double_pane', 'double_pane_shutter', 'air_gap'],
    framingNote: 'Comparing low-cost indigenous retrofits: passive Trombe glazing vs local straw insulation to lift night minimum above 10 C.',
  },
};

export default function ScenarioCards({ activeScenarioId, onSelectScenario }) {
  return (
    <div className="scenario-section">
      <div className="scenario-header">
        <span className="scenario-tag">SELECT MISSION CONTEXT</span>
        <h3 className="scenario-title">Three Operational Scenarios</h3>
        <p className="scenario-intro">
          Pick who you are. Each scenario preloads real geographical coordinates, weather profiles, and site-appropriate materials into the shelter builder.
        </p>
      </div>

      <div className="scenario-cards-grid">
        {Object.values(SCENARIO_PRESETS).map((s) => {
          const isActive = s.id === activeScenarioId;
          return (
            <div
              key={s.id}
              className={`scenario-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectScenario(s.id)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
