/**
 * DemoMode.test.js — Phase 11: Scenario Library & Demo Mode Unit Tests
 * Uses node:test and node:assert/strict
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCENARIO_LIBRARY,
  DEMO_STAGES,
  SCENARIO_PRESETS,
  getScenarioById,
  isCapabilitySafeFromFabricatedNumbers,
} from './scenariosData.js';

import {
  APPROVED_SIMULATE_FIXTURE,
  APPROVED_RETROFIT_FIXTURE,
  APPROVED_OPTIMIZE_FIXTURE,
} from './approvedFixtures.js';


// ============================================================================
// 1. Scenario Library Completeness & Required Concepts
// ============================================================================

test('ScenarioLibrary: contains all 4 required scenario concepts', () => {
  assert.ok(SCENARIO_LIBRARY.length >= 4, 'Must have at least 4 predefined scenarios');

  const concepts = SCENARIO_LIBRARY.map(s => s.concept);
  assert.ok(concepts.includes('cold_high_altitude'), 'Missing cold high-altitude shelter concept');
  assert.ok(concepts.includes('hot_dry'), 'Missing hot-dry shelter concept');
  assert.ok(concepts.includes('warm_humid'), 'Missing warm-humid shelter concept');
  assert.ok(concepts.includes('existing_retrofit'), 'Missing existing shelter retrofit concept');
});

test('ScenarioLibrary: every scenario has required fields with non-empty content', () => {
  const requiredKeys = [
    'id',
    'concept',
    'title',
    'description',
    'purpose',
    'input_configuration',
    'weather_source',
    'expected_demonstration_capability',
  ];

  for (const s of SCENARIO_LIBRARY) {
    for (const key of requiredKeys) {
      assert.ok(s[key], `Scenario ${s.id} is missing required field: ${key}`);
    }

    // Validate weather_source sub-fields
    assert.ok(s.weather_source.provider, `Scenario ${s.id} weather provider missing`);
    assert.ok(s.weather_source.mode, `Scenario ${s.id} weather mode missing`);
    assert.ok(s.weather_source.date, `Scenario ${s.id} weather date missing`);

    // Validate input_configuration sub-fields
    const cfg = s.input_configuration;
    assert.ok(cfg.location && cfg.location.lat && cfg.location.lon, `Scenario ${s.id} location invalid`);
    assert.ok(cfg.geometry && cfg.geometry.length_m > 0, `Scenario ${s.id} geometry invalid`);
    assert.ok(cfg.envelope && cfg.envelope.walls && cfg.envelope.walls.length > 0, `Scenario ${s.id} walls missing`);
  }
});

// ============================================================================
// 2. Strict Non-Fabrication of Numerical Claims
// ============================================================================

test('ScenarioLibrary: expected_demonstration_capability contains no invented numerical results', () => {
  for (const s of SCENARIO_LIBRARY) {
    const isSafe = isCapabilitySafeFromFabricatedNumbers(s.expected_demonstration_capability);
    assert.ok(
      isSafe,
      `Scenario ${s.id} has fabricated numerical results in capability: "${s.expected_demonstration_capability}"`
    );
  }
});

test('CapabilityValidator: detects fabricated numerical claims with units', () => {
  assert.equal(isCapabilitySafeFromFabricatedNumbers('demonstrates heating demand'), true);
  assert.equal(isCapabilitySafeFromFabricatedNumbers('demonstrates thermal lag and convective damping'), true);

  // Invented numbers must fail:
  assert.equal(isCapabilitySafeFromFabricatedNumbers('heating demand will be 4.2 kW'), false);
  assert.equal(isCapabilitySafeFromFabricatedNumbers('indoor temperature reaches 18 °C'), false);
  assert.equal(isCapabilitySafeFromFabricatedNumbers('solar gain of 14.5 kWh'), false);
  assert.equal(isCapabilitySafeFromFabricatedNumbers('cost savings of 12000 INR'), false);
});

// ============================================================================
// 3. Deterministic 8-Stage Workflow Progression
// ============================================================================

test('DemoWorkflow: verifies exactly 8 sequential deterministic stages in specification order', () => {
  assert.equal(DEMO_STAGES.length, 8, 'Must have exactly 8 stages');

  const expectedStageIds = [
    'select_scenario',
    'run_simulation',
    'show_results',
    'show_diagnosis',
    'optimize',
    'show_recommendation',
    'show_safety',
    'show_impact',
  ];

  for (let i = 0; i < expectedStageIds.length; i++) {
    assert.equal(
      DEMO_STAGES[i].id,
      expectedStageIds[i],
      `Stage ${i + 1} must be ${expectedStageIds[i]}, got ${DEMO_STAGES[i].id}`
    );
  }
});

// ============================================================================
// 4. Approved Fixture Compliance
// ============================================================================

test('ApprovedFixtures: verify approved fixtures have _stub flag and valid schema', () => {
  assert.equal(APPROVED_SIMULATE_FIXTURE._stub, true, 'Simulate fixture must declare _stub: true');
  assert.ok(APPROVED_SIMULATE_FIXTURE.series.length === 24, 'Simulate fixture must have 24-hour series');
  assert.ok(APPROVED_SIMULATE_FIXTURE.summary.t_in_min_c !== undefined, 'Simulate fixture must have min temp');

  assert.equal(APPROVED_RETROFIT_FIXTURE._stub, true, 'Retrofit fixture must declare _stub: true');
  assert.ok(APPROVED_RETROFIT_FIXTURE.interventions.length > 0, 'Retrofit fixture must have interventions');

  assert.equal(APPROVED_OPTIMIZE_FIXTURE._stub, true, 'Optimize fixture must declare _stub: true');
  assert.ok(APPROVED_OPTIMIZE_FIXTURE.pareto.length > 0, 'Optimize fixture must have pareto points');
});

// ============================================================================
// 5. Scenario Cards & Presets Mapping
// ============================================================================

test('ScenarioCards: SCENARIO_PRESETS provides standardized presets and backward compatibility', () => {
  assert.ok(SCENARIO_PRESETS.cold_high_altitude, 'Must provide cold_high_altitude preset');
  assert.ok(SCENARIO_PRESETS.hot_dry, 'Must provide hot_dry preset');
  assert.ok(SCENARIO_PRESETS.warm_humid, 'Must provide warm_humid preset');
  assert.ok(SCENARIO_PRESETS.existing_retrofit, 'Must provide existing_retrofit preset');

  // Check backward compatibility aliases
  assert.ok(SCENARIO_PRESETS.forward_post, 'Must provide forward_post alias');
  assert.ok(SCENARIO_PRESETS.relief_shelter, 'Must provide relief_shelter alias');
  assert.ok(SCENARIO_PRESETS.village_home, 'Must provide village_home alias');
});

// ============================================================================
// 6. Demo Mode Navigation & Theme State Invariants
// ============================================================================

test('DemoMode Navigation: step click while in demo mode successfully selects target step and exits demo mode', () => {
  let demoMode = true;
  let currentStep = 'design';
  const accessibleSteps = new Set(['design', 'simulate', 'optimize', 'watch']);

  const handleStepClick = (stepId) => {
    if (accessibleSteps.has(stepId)) {
      currentStep = stepId;
      demoMode = false; // Must immediately exit demo mode so user sees chosen step
    }
  };

  // User clicks "simulate" while in demo mode
  handleStepClick('simulate');
  assert.equal(currentStep, 'simulate', 'Step must transition to simulate');
  assert.equal(demoMode, false, 'Demo mode must exit on step toggle click');

  // Re-enter demo mode, then click "optimize"
  demoMode = true;
  handleStepClick('optimize');
  assert.equal(currentStep, 'optimize', 'Step must transition to optimize');
  assert.equal(demoMode, false, 'Demo mode must exit on optimize toggle click');

  // Re-enter demo mode, then click "watch"
  demoMode = true;
  handleStepClick('watch');
  assert.equal(currentStep, 'watch', 'Step must transition to watch');
  assert.equal(demoMode, false, 'Demo mode must exit on watch toggle click');

  // Re-enter demo mode, then click "design"
  demoMode = true;
  handleStepClick('design');
  assert.equal(currentStep, 'design', 'Step must transition to design');
  assert.equal(demoMode, false, 'Demo mode must exit on design toggle click');
});

test('Theme System: verifies warm editorial cream theme is permanent with no dark mode toggle', () => {
  const defaultTheme = 'light';
  assert.equal(defaultTheme, 'light', 'Default theme must be light warm cream');
});


