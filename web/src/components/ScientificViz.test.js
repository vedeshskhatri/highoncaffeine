import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAvailableSeries,
  parseMorrisLever,
  verifyValidationStatus
} from './scientificVizUtils.js';

// ============================================================================
// PART A: 24-Hour Thermal Story Tests
// ============================================================================

test('ScientificViz Part A: detects available series strictly from payload', () => {
  const completeHourlyData = [
    {
      hour: 0,
      t_in_c: -2.5,
      t_out_c: -18.2,
      t_op_c: -3.1,
      t_lo_c: 18.0,
      t_hi_c: 24.0,
      solar_gain_w: 0.0,
      heating_demand_w: 1250.0
    },
    {
      hour: 12,
      t_in_c: 14.8,
      t_out_c: -4.0,
      t_op_c: 16.2,
      t_lo_c: 18.0,
      t_hi_c: 24.0,
      solar_gain_w: 2450.0,
      heating_demand_w: 0.0
    }
  ];

  const series = detectAvailableSeries(completeHourlyData);
  assert.equal(series.length, 6);
  
  const seriesIds = series.map(s => s.id);
  assert.ok(seriesIds.includes('t_in_c'));
  assert.ok(seriesIds.includes('t_out_c'));
  assert.ok(seriesIds.includes('t_op_c'));
  assert.ok(seriesIds.includes('comfort_band'));
  assert.ok(seriesIds.includes('solar_gain_w'));
  assert.ok(seriesIds.includes('heating_demand_w'));

  // Verify explicit unit labeling
  const tIn = series.find(s => s.id === 't_in_c');
  assert.equal(tIn.unit, '°C');
  assert.equal(tIn.axis, 'temp');

  const solar = series.find(s => s.id === 'solar_gain_w');
  assert.equal(solar.unit, 'W');
  assert.equal(solar.axis, 'power');

  const heat = series.find(s => s.id === 'heating_demand_w');
  assert.equal(heat.unit, 'W');
  assert.equal(heat.axis, 'power');
});

test('ScientificViz Part A: omits series not in API payload and never reconstructs them', () => {
  // Payload without solar_gain_w and without heating_demand_w
  const partialHourlyData = [
    {
      hour: 0,
      t_in_c: 5.2,
      t_out_c: -10.5
    },
    {
      hour: 1,
      t_in_c: 4.8,
      t_out_c: -11.0
    }
  ];

  const series = detectAvailableSeries(partialHourlyData);
  assert.equal(series.length, 2);
  const ids = series.map(s => s.id);
  assert.ok(ids.includes('t_in_c'));
  assert.ok(ids.includes('t_out_c'));
  assert.ok(!ids.includes('solar_gain_w'), 'solar_gain_w must NOT be present if not in payload');
  assert.ok(!ids.includes('heating_demand_w'), 'heating_demand_w must NOT be present if not in payload');
  assert.ok(!ids.includes('t_op_c'), 't_op_c must NOT be present if not in payload');
});

test('ScientificViz Part A: handles empty or invalid hourly data gracefully', () => {
  assert.deepEqual(detectAvailableSeries([]), []);
  assert.deepEqual(detectAvailableSeries(null), []);
  assert.deepEqual(detectAvailableSeries(undefined), []);
});

// ============================================================================
// PART B: Sensitivity Analysis Tests (Morris Elementary Effects Screening)
// ============================================================================

test('ScientificViz Part B: parses Morris elementary effects with physical units', () => {
  const rawLever = {
    parameter: 'wall_insulation_thickness',
    mu_star: 4.28,
    mu: 4.28,
    sigma: 1.12,
    direction: 'warming',
    cost_inr: 25000,
    cost_basis: 'sourced'
  };

  const parsed = parseMorrisLever(rawLever);
  assert.equal(parsed.parameter, 'wall_insulation_thickness');
  assert.equal(parsed.mu_star, 4.28);
  assert.equal(parsed.sigma, 1.12);
  assert.equal(parsed.direction, 'warming');
  assert.equal(parsed.directionLabel, '▲ Warming');
  assert.equal(parsed.unit, '°C');
  assert.equal(parsed.cost_inr, 25000);
  assert.equal(parsed.cost_basis, 'sourced');
});

test('ScientificViz Part B: correctly identifies cooling direction from negative mu', () => {
  const coolingLever = {
    parameter: 'infiltration_ach',
    mu_star: 3.15,
    mu: -3.15,
    sigma: 0.85,
    cost_inr: 0,
    cost_basis: 'derived'
  };

  const parsed = parseMorrisLever(coolingLever);
  assert.equal(parsed.mu_star, 3.15);
  assert.equal(parsed.mu, -3.15);
  assert.equal(parsed.direction, 'cooling');
  assert.equal(parsed.directionLabel, '▼ Cooling');
});

test('ScientificViz Part B: handles legacy or minimal lever objects without fabricating percentages', () => {
  const minimalLever = {
    parameter: 'glazing_shgc',
    influence: 1.75
  };

  const parsed = parseMorrisLever(minimalLever);
  assert.equal(parsed.parameter, 'glazing_shgc');
  assert.equal(parsed.mu_star, 1.75);
  assert.equal(parsed.unit, '°C');
  assert.equal(parsed.directionLabel, '— Neutral');
  assert.equal(parsed.cost_basis, 'estimate');
});

// ============================================================================
// PART C: Validation Dashboard Tests (Empirical Benchmark & Ordering)
// ============================================================================

test('ScientificViz Part C: strictly guards against claiming "Validated" when unrun', () => {
  const unrunPayload = {
    validation_run: false,
    status: 'Validation not run.'
  };

  const status = verifyValidationStatus(unrunPayload);
  assert.equal(status.validationRun, false);
  assert.equal(status.isValidated, false);
  assert.equal(status.statusMessage, 'Validation not run.');
  assert.equal(status.badgeText, 'UNRUN');
  assert.equal(status.scenarios.length, 0);
  assert.equal(status.orderingCheck.passed, false);
});

test('ScientificViz Part C: processes Axis 1 empirical scenarios and ordering rule', () => {
  const executedPayload = {
    validation_run: true,
    status: 'All validation criteria met per brain/10_VALIDATION.md',
    ordering_check: { pass: true, trombe_mean_c: 12.8, direct_gain_mean_c: 10.4 },
    scenarios: [
      {
        scenario: 'V1: Uninsulated direct gain (field)',
        reference_str: 'T_min: -8.5 °C',
        model_str: 'T_min: -7.9 °C',
        error_c: 0.6,
        tolerance: 2.5,
        passed: true,
        provenance: 'Leh Field Test Station (2024)'
      },
      {
        scenario: 'V2: Trombe wall benchmark (BESTEST 600)',
        reference_str: 'Peak: 18.2 °C',
        model_str: 'Peak: 17.5 °C',
        error_c: 0.7,
        tolerance: 2.0,
        passed: true,
        provenance: 'ASHRAE Standard 140 BESTEST'
      },
      {
        scenario: 'V3: Phase change thermal buffer',
        reference_str: 'Diurnal swing: 6.4 °C',
        model_str: 'Diurnal swing: 5.9 °C',
        error_c: 0.5,
        tolerance: 1.5,
        passed: true,
        provenance: 'DRDO Experimental Shelter'
      },
      {
        scenario: 'V4: High-altitude extreme cold night',
        reference_str: 'T_min: -14.2 °C',
        model_str: 'T_min: -13.8 °C',
        error_c: 0.4,
        tolerance: 2.0,
        passed: true,
        provenance: 'Nyoma Cold Bench 2025'
      }
    ]
  };

  const status = verifyValidationStatus(executedPayload);
  assert.equal(status.validationRun, true);
  assert.equal(status.isValidated, true);
  assert.equal(status.badgeText, 'PASS');
  assert.equal(status.scenarios.length, 4);
  assert.ok(status.scenarios.every(s => s.passed));
  assert.equal(status.orderingCheck.passed, true);
  assert.ok(status.orderingCheck.text.includes('PASS'));
});

test('ScientificViz Part C: fails validation if physical ordering is inverted', () => {
  const invertedPayload = {
    validation_run: true,
    status: 'Ordering check failed',
    ordering_check: { pass: false, trombe_mean_c: 9.1, direct_gain_mean_c: 11.2 },
    scenarios: [
      {
        scenario: 'V1: Direct gain',
        error_c: 0.5,
        tolerance: 2.0,
        passed: true
      }
    ]
  };

  const status = verifyValidationStatus(invertedPayload);
  assert.equal(status.validationRun, true);
  assert.equal(status.isValidated, false, 'Should fail validation if ordering check fails');
  assert.equal(status.orderingCheck.passed, false);
});
