/**
 * THERMA Predefined Scenario Library (Phase 11)
 * Standardized, physically grounded shelter scenarios built ONLY from valid repository data.
 * 
 * Required concepts:
 * 1. cold_high_altitude: Cold high-altitude shelter (Ladakh alpine desert, passive solar envelope)
 * 2. hot_dry: Hot-dry shelter (Thar desert, high thermal mass lag & solar attenuation)
 * 3. warm_humid: Warm-humid shelter (Eastern Command, high natural air exchange & convective cooling)
 * 4. existing_retrofit: Existing shelter retrofit (Tangtse/Pangong outpost, uninsulated stone envelope, retrofit ranking)
 * 
 * Invariant: Expected demonstration capabilities must remain qualitative without invented numerical claims.
 */

export const SCENARIO_LIBRARY = [
  {
    id: 'cold_high_altitude',
    concept: 'cold_high_altitude',
    title: 'Cold High-Altitude Alpine Shelter',
    tagline: 'Ladakh 3,500 m · Stone masonry + EPS · Sub-zero passive solar',
    description: 'High-altitude military forward post in the Ladakh Himalayas subjected to severe sub-zero ambient temperatures (-20°C nocturnal dips), extreme diurnal swings, and intense daytime solar irradiance.',
    purpose: 'Demonstrate passive solar envelope design, solar heat gain capture through south-facing double glazing, envelope thermal resistance using stone masonry with EPS, and baseline heating demand reduction.',
    input_configuration: {
      location: { lat: 34.1526, lon: 77.5771, altitude_m: 3500.0 },
      weather: { mode: 'design_winter_night', date: '2026-01-15', hours: 24, user_csv_id: null },
      geometry: { length_m: 6.0, width_m: 4.0, height_m: 2.6, orientation_deg: 180.0 },
      envelope: {
        walls: [
          { material: 'stone_masonry', thickness_m: 0.30 },
          { material: 'eps', thickness_m: 0.05 },
        ],
        roof: [
          { material: 'concrete', thickness_m: 0.15 },
          { material: 'eps', thickness_m: 0.05 },
        ],
        floor: [
          { material: 'stone_floor', thickness_m: 0.10 },
        ],
        roof_emissivity: 0.90,
      },
      openings: [
        { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: false },
      ],
      ventilation: { ach: 0.6, heater_type: 'none' },
      occupancy: { people: 8, watts_per_person: 100.0 },
    },
    weather_source: {
      provider: 'Open-Meteo Historical & Climate Reanalysis / ECMWF ERA5',
      mode: 'design_winter_night',
      date: '2026-01-15',
      grid_note: 'Grid cell 34.15N, 77.58E (Nyoma/Chushul sector) at 3,500m elevation; clear-sky sub-zero winter diurnal regime.',
    },
    expected_demonstration_capability: 'Demonstrates passive solar heat retention, nighttime envelope conductive heat loss, and baseline heating demand under extreme Himalayan winter conditions.',
  },

  {
    id: 'hot_dry',
    concept: 'hot_dry',
    title: 'Hot-Dry Desert Outpost',
    tagline: 'Thar Desert 225 m · Rammed earth mass · Solar attenuation',
    description: 'Arid border post in the Thar Desert subjected to extreme daytime solar irradiation, elevated peak ambient temperatures, and significant diurnal temperature swings.',
    purpose: 'Demonstrate high-mass envelope thermal lag damping using rammed earth, solar heat attenuation via high-reflectance roof surfaces, and prevention of daytime interior overheating.',
    input_configuration: {
      location: { lat: 26.9157, lon: 70.9083, altitude_m: 225.0 },
      weather: { mode: 'typical_day', date: '2026-05-15', hours: 24, user_csv_id: null },
      geometry: { length_m: 6.0, width_m: 4.0, height_m: 3.0, orientation_deg: 180.0 },
      envelope: {
        walls: [
          { material: 'rammed_earth', thickness_m: 0.40 },
        ],
        roof: [
          { material: 'concrete', thickness_m: 0.20 },
        ],
        floor: [
          { material: 'stone_floor', thickness_m: 0.15 },
        ],
        roof_emissivity: 0.85,
      },
      openings: [
        { facing: 'north', area_m2: 1.5, glazing: 'double_pane', night_shutter: false },
      ],
      ventilation: { ach: 1.5, heater_type: 'none' },
      occupancy: { people: 4, watts_per_person: 100.0 },
    },
    weather_source: {
      provider: 'Open-Meteo Surface Reanalysis / IMD Climatological Normals',
      mode: 'typical_day',
      date: '2026-05-15',
      grid_note: 'Grid cell 26.92N, 70.91E (Jaisalmer sector) at 225m elevation; arid desert high-insolation regime.',
    },
    expected_demonstration_capability: 'Demonstrates thermal inertia phase delay through earthen masonry walls, diurnal temperature fluctuation damping, and passive cooling performance.',
  },

  {
    id: 'warm_humid',
    concept: 'warm_humid',
    title: 'Warm-Humid Monsoon Outpost',
    tagline: 'Eastern Command 120 m · Lightweight prefab panel · High natural ventilation',
    description: 'Tropical forward outpost in the Eastern Command valley subjected to elevated humidity, high nocturnal temperatures, and diffused overcast solar radiation.',
    purpose: 'Demonstrate convective cooling through elevated natural ventilation rates, lightweight modular envelope thermal response, and operative comfort maintenance under humid monsoon conditions.',
    input_configuration: {
      location: { lat: 26.7271, lon: 88.3953, altitude_m: 120.0 },
      weather: { mode: 'typical_day', date: '2026-07-20', hours: 24, user_csv_id: null },
      geometry: { length_m: 5.0, width_m: 4.0, height_m: 2.8, orientation_deg: 180.0 },
      envelope: {
        walls: [
          { material: 'prefab_sandwich', thickness_m: 0.08 },
        ],
        roof: [
          { material: 'cgi_sheet', thickness_m: 0.005 },
          { material: 'rockwool', thickness_m: 0.05 },
        ],
        floor: [
          { material: 'dense_concrete', thickness_m: 0.10 },
        ],
        roof_emissivity: 0.85,
      },
      openings: [
        { facing: 'south', area_m2: 3.0, glazing: 'single_pane', night_shutter: false },
      ],
      ventilation: { ach: 4.0, heater_type: 'none' },
      occupancy: { people: 6, watts_per_person: 100.0 },
    },
    weather_source: {
      provider: 'Open-Meteo Surface Reanalysis / IMD Tropical Monsoon Data',
      mode: 'typical_day',
      date: '2026-07-20',
      grid_note: 'Grid cell 26.73N, 88.40E (Siliguri/Teesta corridor) at 120m elevation; tropical monsoon high-humidity regime.',
    },
    expected_demonstration_capability: 'Demonstrates natural ventilation convective heat dissipation, lightweight envelope thermal tracking, and indoor operative comfort bounds.',
  },

  {
    id: 'existing_retrofit',
    concept: 'existing_retrofit',
    title: 'Existing Shelter Retrofit',
    tagline: 'Tangtse 3,900 m · Uninsulated granite stone barrack · Design Doctor retrofit',
    description: 'Legacy uninsulated granite stone masonry barrack at an alpine outpost exhibiting severe envelope conduction losses and infiltration drafts, requiring targeted cost-ranked retrofit interventions.',
    purpose: 'Demonstrate Design Doctor thermal bottleneck diagnosis, generation of feasible envelope interventions, cost-effectiveness ranking (degrees per 1000 INR), and safety interlocks.',
    input_configuration: {
      location: { lat: 34.0167, lon: 78.1667, altitude_m: 3900.0 },
      weather: { mode: 'design_winter_night', date: '2026-01-15', hours: 24, user_csv_id: null },
      geometry: { length_m: 7.0, width_m: 4.5, height_m: 2.6, orientation_deg: 180.0 },
      envelope: {
        walls: [
          { material: 'stone_masonry', thickness_m: 0.35 },
        ],
        roof: [
          { material: 'concrete', thickness_m: 0.12 },
        ],
        floor: [
          { material: 'stone_floor', thickness_m: 0.10 },
        ],
        roof_emissivity: 0.90,
      },
      openings: [
        { facing: 'south', area_m2: 2.0, glazing: 'single_pane', night_shutter: false },
      ],
      ventilation: { ach: 1.2, heater_type: 'none' },
      occupancy: { people: 8, watts_per_person: 100.0 },
    },
    weather_source: {
      provider: 'Open-Meteo Surface Reanalysis / ERA5 Alpine Grid',
      mode: 'design_winter_night',
      date: '2026-01-15',
      grid_note: 'Grid cell 34.02N, 78.17E (Tangtse/Pangong sector) at 3,900m elevation; severe sub-zero winter conditions.',
    },
    expected_demonstration_capability: 'Demonstrates diagnostic identification of envelope heat loss weaknesses, Pareto-ranked retrofit intervention generation, cost-benefit evaluation, and heating fuel reduction.',
  },
];

export const DEMO_STAGES = [
  { id: 'select_scenario', label: '1. SELECT SCENARIO', shortLabel: 'Scenario' },
  { id: 'run_simulation', label: '2. RUN SIMULATION', shortLabel: 'Simulate' },
  { id: 'show_results', label: '3. SHOW RESULTS', shortLabel: 'Results' },
  { id: 'show_diagnosis', label: '4. SHOW DIAGNOSIS', shortLabel: 'Diagnosis' },
  { id: 'optimize', label: '5. OPTIMIZE', shortLabel: 'Optimize' },
  { id: 'show_recommendation', label: '6. SHOW RECOMMENDATION', shortLabel: 'Recommendation' },
  { id: 'show_safety', label: '7. SHOW SAFETY', shortLabel: 'Safety' },
  { id: 'show_impact', label: '8. SHOW IMPACT', shortLabel: 'Impact' },
];

export const SCENARIO_PRESETS = {
  cold_high_altitude: {
    ...SCENARIO_LIBRARY[0],
    ...SCENARIO_LIBRARY[0].input_configuration,
    question: 'How much fuel airlift can passive solar envelope design avoid?',
    siteName: 'Chushul / Nyoma Forward Post (3,500 m)',
    framingNote: SCENARIO_LIBRARY[0].description,
  },
  hot_dry: {
    ...SCENARIO_LIBRARY[1],
    ...SCENARIO_LIBRARY[1].input_configuration,
    question: 'How much does thermal mass lag attenuate diurnal peak overheating?',
    siteName: 'Jaisalmer / Pokhran Border Post (225 m)',
    framingNote: SCENARIO_LIBRARY[1].description,
  },
  warm_humid: {
    ...SCENARIO_LIBRARY[2],
    ...SCENARIO_LIBRARY[2].input_configuration,
    question: 'How much convective heat dissipation does natural ventilation achieve?',
    siteName: 'Siliguri / Teesta Valley Outpost (120 m)',
    framingNote: SCENARIO_LIBRARY[2].description,
  },
  existing_retrofit: {
    ...SCENARIO_LIBRARY[3],
    ...SCENARIO_LIBRARY[3].input_configuration,
    question: 'What is the highest-ranked thermal retrofit per Rs 1,000 invested?',
    siteName: 'Tangtse / Pangong Barrack (3,900 m)',
    framingNote: SCENARIO_LIBRARY[3].description,
  },
  // Legacy aliases for backward compatibility
  forward_post: {
    ...SCENARIO_LIBRARY[0],
    ...SCENARIO_LIBRARY[0].input_configuration,
    id: 'forward_post',
    question: 'How much kerosene do I avoid?',
    siteName: 'Chushul / Nyoma Forward Post (3,500 m)',
    framingNote: SCENARIO_LIBRARY[0].description,
  },
  relief_shelter: {
    ...SCENARIO_LIBRARY[2],
    ...SCENARIO_LIBRARY[2].input_configuration,
    id: 'relief_shelter',
    question: 'Will people survive the winter?',
    siteName: 'Eastern Outpost Camp',
    framingNote: SCENARIO_LIBRARY[2].description,
  },
  village_home: {
    ...SCENARIO_LIBRARY[3],
    ...SCENARIO_LIBRARY[3].input_configuration,
    id: 'village_home',
    question: 'What is the cheapest fix?',
    siteName: 'Tangtse Barrack',
    framingNote: SCENARIO_LIBRARY[3].description,
  },
};

/**
 * Validates that a capability string does not contain invented numerical claims.
 * @param {string} capability 
 * @returns {boolean} True if safe from invented numerical claims
 */
export function isCapabilitySafeFromFabricatedNumbers(capability) {
  if (!capability || typeof capability !== 'string') return false;
  // Check for invented numbers with physics/financial units
  const pattern = /\b\d+(\.\d+)?\s*(kw|kwh|°c|c|deg|%|w|inr|rs|litres|l)\b/i;
  return !pattern.test(capability);
}

/**
 * Lookup a scenario by ID
 * @param {string} id 
 * @returns {object|null}
 */
export function getScenarioById(id) {
  return SCENARIO_LIBRARY.find(s => s.id === id) || null;
}
