import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, isValid, fieldError } from './validation.js';

const VALID_REQUEST = {
  location: { lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
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
      { material: 'eps', thickness_m: 0.05 },
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

const KNOWN_MATERIALS = ['mud_brick', 'eps', 'concrete', 'stone', 'rammed_earth'];

test('valid request produces zero errors', () => {
  const errors = validateRequest(VALID_REQUEST, KNOWN_MATERIALS);
  assert.equal(isValid(errors), true);
  assert.deepEqual(errors, {});
});

test('negative thickness produces inline error and invalid state', () => {
  const req = structuredClone(VALID_REQUEST);
  req.envelope.walls[0].thickness_m = -0.05;
  const errors = validateRequest(req, KNOWN_MATERIALS);
  assert.equal(isValid(errors), false);
  assert.equal(fieldError(errors, 'envelope.walls[0].thickness_m'), 'Thickness must be > 0');
});

test('zero thickness produces inline error', () => {
  const req = structuredClone(VALID_REQUEST);
  req.envelope.roof[0].thickness_m = 0;
  const errors = validateRequest(req, KNOWN_MATERIALS);
  assert.equal(isValid(errors), false);
  assert.equal(fieldError(errors, 'envelope.roof[0].thickness_m'), 'Thickness must be > 0');
});

test('orientation < 0 or > 360 produces error', () => {
  const req1 = structuredClone(VALID_REQUEST);
  req1.geometry.orientation_deg = -5;
  const errs1 = validateRequest(req1, KNOWN_MATERIALS);
  assert.equal(fieldError(errs1, 'geometry.orientation_deg'), 'Orientation must be 0 – 360°');

  const req2 = structuredClone(VALID_REQUEST);
  req2.geometry.orientation_deg = 365;
  const errs2 = validateRequest(req2, KNOWN_MATERIALS);
  assert.equal(fieldError(errs2, 'geometry.orientation_deg'), 'Orientation must be 0 – 360°');
});

test('location boundaries', () => {
  const req = structuredClone(VALID_REQUEST);
  req.location.lat = 95;
  req.location.lon = -190;
  req.location.altitude_m = 9000;
  const errors = validateRequest(req, KNOWN_MATERIALS);
  assert.equal(fieldError(errors, 'location.lat'), 'Latitude must be between −90 and 90');
  assert.equal(fieldError(errors, 'location.lon'), 'Longitude must be between −180 and 180');
  assert.equal(fieldError(errors, 'location.altitude_m'), 'Altitude must be 0 – 8849 m');
});

test('openings constraints', () => {
  const req = structuredClone(VALID_REQUEST);
  req.openings[0].area_m2 = -1;
  req.openings[0].facing = 'northwest';
  req.openings[0].glazing = 'quad_pane';
  const errors = validateRequest(req, KNOWN_MATERIALS);
  assert.equal(fieldError(errors, 'openings[0].area_m2'), 'Area must be > 0');
  assert.equal(fieldError(errors, 'openings[0].facing'), 'Facing must be: north, east, south, west, roof');
  assert.equal(fieldError(errors, 'openings[0].glazing'), 'Glazing must be: single_pane, double_pane, triple_pane');
});

test('occupancy constraints', () => {
  const req = structuredClone(VALID_REQUEST);
  req.occupancy.people = 0;
  req.occupancy.watts_per_person = 0;
  const errors = validateRequest(req, KNOWN_MATERIALS);
  assert.equal(fieldError(errors, 'occupancy.people'), 'People must be an integer ≥ 1');
  assert.equal(fieldError(errors, 'occupancy.watts_per_person'), 'Watts per person must be > 0');
});

test('weather mode and user_csv_id constraint', () => {
  const req = structuredClone(VALID_REQUEST);
  req.weather.mode = 'user_csv';
  req.weather.user_csv_id = null;
  const errors = validateRequest(req, KNOWN_MATERIALS);
  assert.equal(fieldError(errors, 'weather.user_csv_id'), 'user_csv_id is required when mode is user_csv');
});
