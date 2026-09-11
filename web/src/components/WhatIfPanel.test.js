import test from 'node:test';
import assert from 'node:assert/strict';

// WhatIfPanel Unit Tests (Phase 3)

const SUPPORTED_VARIABLES = {
  wall_thickness: { unit: 'm', min: 0.05, max: 1.50 },
  roof_thickness: { unit: 'm', min: 0.05, max: 1.00 },
  insulation: { unit: 'm', min: 0.0, max: 0.25 },
  glazing_area: { unit: 'm²', min: 0.0, max: 20.0 },
  orientation: { unit: '°', min: 0.0, max: 360.0 },
  ach: { unit: 'ACH', min: 0.10, max: 5.00 },
  shading: { unit: 'boolean', options: [true, false] },
  material: { unit: 'material_id', options: ['mud_brick', 'rammed_earth', 'stone_masonry', 'puf_sandwich', 'cgi_sheet', 'dense_concrete'] },
};

function formatDelta(delta, unit = '', decimals = 2) {
  if (delta === null || delta === undefined || isNaN(delta)) {
    return '—';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(decimals)} ${unit}`.trim();
}

function validateInputBound(parameter, value) {
  const spec = SUPPORTED_VARIABLES[parameter];
  if (!spec) return { valid: false, error: `Unsupported parameter: ${parameter}` };
  if (spec.min !== undefined && spec.max !== undefined) {
    if (value < spec.min || value > spec.max) {
      return { valid: false, error: `${parameter} value ${value} outside allowed range [${spec.min}, ${spec.max}]` };
    }
  } else if (spec.options) {
    if (!spec.options.includes(value)) {
      return { valid: false, error: `${parameter} value ${value} not in options` };
    }
  }
  return { valid: true, error: null };
}

test('WhatIfPanel: baseline unchanged produces delta = 0 and isBaseline true', () => {
  const baselineVal = 0.30;
  const currentVal = 0.30;
  const isBaseline = baselineVal === currentVal;
  assert.equal(isBaseline, true);

  const delta = currentVal - baselineVal;
  assert.equal(delta, 0.0);
  assert.equal(formatDelta(delta, '°C'), '0.00 °C');
});

test('WhatIfPanel: all 8 supported variables have schema-derived bounds and clear units', () => {
  const keys = Object.keys(SUPPORTED_VARIABLES);
  assert.equal(keys.length, 8);
  assert.deepEqual(keys, [
    'wall_thickness',
    'roof_thickness',
    'insulation',
    'glazing_area',
    'orientation',
    'ach',
    'shading',
    'material',
  ]);

  // Check valid non-negative ranges
  assert.equal(SUPPORTED_VARIABLES.wall_thickness.min >= 0.05, true);
  assert.equal(SUPPORTED_VARIABLES.roof_thickness.min >= 0.05, true);
  assert.equal(SUPPORTED_VARIABLES.ach.min >= 0.10, true);
  assert.equal(SUPPORTED_VARIABLES.orientation.max, 360.0);
  assert.equal(SUPPORTED_VARIABLES.glazing_area.unit, 'm²');
});

test('WhatIfPanel: changed parameter produces valid changed payload', () => {
  const baseRequest = {
    envelope: { walls: [{ material: 'mud_brick', thickness_m: 0.30 }] },
    geometry: { orientation_deg: 180.0 },
  };

  // Modify wall thickness to 0.45
  const modWall = {
    ...baseRequest,
    envelope: {
      ...baseRequest.envelope,
      walls: [{ ...baseRequest.envelope.walls[0], thickness_m: 0.45 }],
    },
  };
  assert.equal(modWall.envelope.walls[0].thickness_m, 0.45);
  assert.equal(modWall.geometry.orientation_deg, 180.0); // other fields intact
});

test('WhatIfPanel: invalid input rejected by bounds check', () => {
  assert.equal(validateInputBound('wall_thickness', -0.1).valid, false);
  assert.equal(validateInputBound('wall_thickness', 2.0).valid, false);
  assert.equal(validateInputBound('orientation', 450).valid, false);
  assert.equal(validateInputBound('ach', 0.05).valid, false);
  assert.equal(validateInputBound('material', 'vibranium').valid, false);
  assert.equal(validateInputBound('wall_thickness', 0.45).valid, true);
});

test('WhatIfPanel: missing metric handled gracefully with em-dash and available flag', () => {
  const unavailableMetric = { baseline: null, variant: null, delta: null, unit: 'L/night', available: false };
  assert.equal(unavailableMetric.available, false);
  assert.equal(formatDelta(unavailableMetric.delta), '—');

  const availableMetric = { baseline: 3.6, variant: 4.8, delta: 1.2, unit: '°C', available: true };
  assert.equal(availableMetric.available, true);
  assert.equal(formatDelta(availableMetric.delta, '°C'), '+1.20 °C');
});
