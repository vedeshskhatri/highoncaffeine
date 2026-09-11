import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSafetyRefusal,
  isFactualAndProportional,
  verifyDataProvenanceInvariants,
  ESTIMATE_BASIS,
  DERIVED_BASIS,
  PROVENANCE_CATEGORIES,
} from './safetyUtils.js';

// ============================================================================
// 1. Safe Design Tests
// ============================================================================

test('SafetyTrust: safe design produces SAFE status without refusal', () => {
  const safeResponse = {
    refused: false,
    refusal_reason: null,
    summary: { t_in_min_c: 15.2, comfort_hours_ratio: 0.85 },
  };

  const outcome = formatSafetyRefusal(safeResponse);
  assert.equal(outcome.isRefused, false);
  assert.equal(outcome.status, 'SAFE');
  assert.equal(outcome.reason, null);
  assert.equal(outcome.actionableConstraint, null);
});

// ============================================================================
// 2. Unsafe Design Tests (Exact Title, Verbatim Reason, Actionable Constraint)
// ============================================================================

test('SafetyTrust: unsafe design formats DESIGN REJECTED FOR SAFETY with verbatim backend reason', () => {
  const backendReason =
    'Ventilation 0.20 ACH is below the safe minimum (0.35 ACH) for an unflued combustion heater. Carbon monoxide asphyxiation risk.';
  const backendConstraint =
    'Ventilation requirement not satisfied for selected heater. Increase ventilation to at least 0.35 ACH or specify a flued stove or electric heater.';

  const unsafeResponse = {
    refused: true,
    refusal_reason: backendReason,
    actionable_constraint: backendConstraint,
    safety_status: 'REFUSED',
  };

  const outcome = formatSafetyRefusal(unsafeResponse);
  assert.equal(outcome.isRefused, true);
  // Strictly mandated title
  assert.equal(outcome.title, 'DESIGN REJECTED FOR SAFETY');
  // Verbatim reason preservation - never rewrite
  assert.equal(outcome.reason, backendReason);
  // Actionable constraint
  assert.equal(outcome.actionableConstraint, backendConstraint);
  assert.equal(outcome.status, 'REFUSED');
});

// ============================================================================
// 3. Electric Heater Tests
// ============================================================================

test('SafetyTrust: electric heater design is safe at low ventilation rates', () => {
  // Electric heater operates safely without oxygen depletion or CO emission
  const electricDesignResult = {
    refused: false,
    refusal_reason: null,
    ventilation: { ach: 0.10, heater_type: 'electric' },
  };

  const outcome = formatSafetyRefusal(electricDesignResult);
  assert.equal(outcome.isRefused, false);
  assert.equal(outcome.status, 'SAFE');
});

// ============================================================================
// 4. Combustion Heater Tests & Proportional Tone
// ============================================================================

test('SafetyTrust: combustion heater refusal enforces factual, proportional language', () => {
  const factualReason =
    'Ventilation 0.25 ACH is below the safe minimum (0.35 ACH) for an unflued combustion heater. Carbon monoxide asphyxiation risk.';
  assert.equal(isFactualAndProportional(factualReason), true);

  // Rejects sensationalist / hyperbolic claims not justified by engineering facts
  const hyperbolicReason = 'This design will kill people in a fatal disaster death trap.';
  assert.equal(isFactualAndProportional(hyperbolicReason), false);
});

// ============================================================================
// 5. Missing Safety Data Tests
// ============================================================================

test('SafetyTrust: handles missing or null safety data gracefully without crashing', () => {
  // Completely empty or null payload
  const nullOutcome = formatSafetyRefusal(null);
  assert.equal(nullOutcome.isRefused, false);

  const undefinedOutcome = formatSafetyRefusal(undefined);
  assert.equal(undefinedOutcome.isRefused, false);

  // Refused flag true but reason/constraint missing
  const minimalRefusal = formatSafetyRefusal({ refused: true });
  assert.equal(minimalRefusal.isRefused, true);
  assert.equal(minimalRefusal.title, 'DESIGN REJECTED FOR SAFETY');
  assert.ok(minimalRefusal.reason.length > 0);
  assert.ok(minimalRefusal.actionableConstraint.length > 0);
});

// ============================================================================
// 6. Backend Error Handling Tests
// ============================================================================

test('SafetyTrust: backend error responses do not crash safety formatter', () => {
  const serverErrorResponse = {
    detail: 'Internal server error: solver diverged at timestep 45.',
    error_code: 500,
  };

  const outcome = formatSafetyRefusal(serverErrorResponse);
  assert.equal(outcome.isRefused, false);
  assert.equal(outcome.status, 'SAFE');
});

// ============================================================================
// 7. Data Provenance Tests (5 Categories, Exact Invariant Basis Strings)
// ============================================================================

test('SafetyTrust: verifies all 5 data provenance categories and strict basis invariants', () => {
  const sampleRegistry = {
    physical_constants: [
      {
        item: 'Stefan-Boltzmann Constant',
        source: 'CODATA 2018',
        status: 'SOURCED',
        basis: 'CODATA internationally recommended constant',
      },
      {
        item: 'Air Density ρ(z)',
        source: 'Barometric Formula',
        status: 'DERIVED',
        basis: DERIVED_BASIS,
      },
    ],
    material_properties: [
      {
        item: 'Mud Brick',
        source: 'ASHRAE HoF 2021',
        status: 'SOURCED',
        basis: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
      },
    ],
    weather: [
      {
        item: 'Open-Meteo GFS',
        source: 'Open-Meteo',
        status: 'SOURCED',
        basis: 'Hourly meteorological API',
      },
      {
        item: 'Fallback Weather',
        source: 'Bundled CSV',
        status: 'ESTIMATE',
        basis: ESTIMATE_BASIS,
      },
    ],
    costs: [
      {
        item: 'Envelope Capital Cost',
        source: 'THERMA Cost Engine',
        status: 'DERIVED',
        basis: DERIVED_BASIS,
      },
      {
        item: 'Siachen Logistics Surcharge',
        source: 'Logistics baseline',
        status: 'ESTIMATE',
        basis: ESTIMATE_BASIS,
      },
    ],
    validation_measurements: [
      {
        item: 'V1 Leh Solar Shelter',
        source: 'DRDO DIHAR',
        status: 'SOURCED',
        basis: 'Thermocouple field records',
      },
    ],
  };

  const verification = verifyDataProvenanceInvariants(sampleRegistry);
  assert.equal(verification.valid, true);
  assert.equal(verification.errors.length, 0);
});

test('SafetyTrust: rejects provenance violations (missing category, invalid status, or corrupted basis string)', () => {
  // Violation 1: Corrupted ESTIMATE basis (must strictly be "Estimate — source unavailable.")
  const badEstimateRegistry = {
    physical_constants: [{ item: 'Const 1', source: 'Source 1', status: 'SOURCED', basis: 'Basis 1' }],
    material_properties: [{ item: 'Mat 1', source: 'Source 2', status: 'SOURCED', basis: 'Basis 2' }],
    weather: [{ item: 'Weather 1', source: 'Source 3', status: 'ESTIMATE', basis: 'Approximated by engineering team' }],
    costs: [{ item: 'Cost 1', source: 'Source 4', status: 'SOURCED', basis: 'Basis 4' }],
    validation_measurements: [{ item: 'Val 1', source: 'Source 5', status: 'SOURCED', basis: 'Basis 5' }],
  };

  const res1 = verifyDataProvenanceInvariants(badEstimateRegistry);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => e.includes("Estimate basis must be exactly 'Estimate — source unavailable.'")));

  // Violation 2: Corrupted DERIVED basis (must strictly be "Derived from sourced inputs.")
  const badDerivedRegistry = {
    physical_constants: [{ item: 'Const 1', source: 'Source 1', status: 'DERIVED', basis: 'Calculated via script' }],
    material_properties: [{ item: 'Mat 1', source: 'Source 2', status: 'SOURCED', basis: 'Basis 2' }],
    weather: [{ item: 'Weather 1', source: 'Source 3', status: 'SOURCED', basis: 'Basis 3' }],
    costs: [{ item: 'Cost 1', source: 'Source 4', status: 'SOURCED', basis: 'Basis 4' }],
    validation_measurements: [{ item: 'Val 1', source: 'Source 5', status: 'SOURCED', basis: 'Basis 5' }],
  };

  const res2 = verifyDataProvenanceInvariants(badDerivedRegistry);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.includes("Derived basis must be exactly 'Derived from sourced inputs.'")));

  // Violation 3: Missing entire category
  const missingCatRegistry = {
    physical_constants: [{ item: 'Const 1', source: 'Source 1', status: 'SOURCED', basis: 'Basis 1' }],
  };
  const res3 = verifyDataProvenanceInvariants(missingCatRegistry);
  assert.equal(res3.valid, false);
  assert.ok(res3.errors.some(e => e.includes('Missing or empty category')));
});
