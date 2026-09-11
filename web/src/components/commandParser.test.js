import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../lib/commandParser.js';
import { SITE_PRESETS, FALLBACK_MATERIALS } from '../lib/presets.js';

/* ── 1. Step Navigation ("open <step>" / "go to <step>") ─────────────────── */
test('commandParser: step navigation matches all valid steps and aliases', () => {
  const cases = [
    { input: 'open design', expected: 'design' },
    { input: 'go to design', expected: 'design' },
    { input: 'open design studio', expected: 'design' },
    { input: 'go to simulate', expected: 'simulate' },
    { input: 'open simulate', expected: 'simulate' },
    { input: 'open simulation', expected: 'simulate' },
    { input: 'go to simulation', expected: 'simulate' },
    { input: 'open optimize', expected: 'optimize' },
    { input: 'go to optimize', expected: 'optimize' },
    { input: 'open optimization', expected: 'optimize' },
    { input: 'go to watch', expected: 'watch' },
    { input: 'open forecast watch', expected: 'watch' },
    { input: 'go to forecast', expected: 'watch' },
  ];

  for (const { input, expected } of cases) {
    const action = parseCommand(input);
    assert.ok(action, `Failed to parse valid navigation input: "${input}"`);
    assert.equal(action.type, 'NAVIGATE_STEP');
    assert.equal(action.step, expected);
  }
});

/* ── 2. Validation Panel Toggle ─────────────────────────────────────────── */
test('commandParser: validation panel toggle matches expected patterns', () => {
  const inputs = [
    'show validation',
    'open validation',
    'toggle validation',
    'show validation panel',
    'open validation panel',
    'go to validation',
    'go to validation panel',
  ];

  for (const input of inputs) {
    const action = parseCommand(input);
    assert.ok(action, `Failed to parse validation toggle: "${input}"`);
    assert.equal(action.type, 'NAVIGATE_STEP');
    assert.equal(action.step, 'validation panel toggle');
  }
});

/* ── 3. Site Simulation ("simulate <site>") ─────────────────────────────── */
test('commandParser: simulate site matches existing presets', () => {
  const cases = [
    { input: 'simulate Leh', expectedLabel: 'Leh', lat: 34.1526 },
    { input: 'simulate leh', expectedLabel: 'Leh', lat: 34.1526 },
    { input: 'simulate Kargil', expectedLabel: 'Kargil', lat: 34.5539 },
    { input: 'simulate Manali', expectedLabel: 'Manali', lat: 32.2396 },
    { input: 'simulate Keylong', expectedLabel: 'Keylong', lat: 32.5726 },
  ];

  for (const { input, expectedLabel, lat } of cases) {
    const action = parseCommand(input);
    assert.ok(action, `Failed to parse simulate site: "${input}"`);
    assert.equal(action.type, 'SET_SITE_AND_NAVIGATE');
    assert.equal(action.step, 'simulate');
    assert.equal(action.site.label, expectedLabel);
    assert.equal(action.site.lat, lat);
  }
});

/* ── 4. Site + Material Simulation ("simulate <site> with <mat> walls") ──── */
test('commandParser: simulate site with material walls matches combinations', () => {
  const cases = [
    {
      input: 'simulate Leh with rammed earth walls',
      site: 'Leh',
      materialId: 'rammed_earth',
    },
    {
      input: 'simulate Kargil with stone walls',
      site: 'Kargil',
      materialId: 'stone',
    },
    {
      input: 'simulate Manali with mud brick walls',
      site: 'Manali',
      materialId: 'mud_brick',
    },
    {
      input: 'simulate Keylong with concrete walls',
      site: 'Keylong',
      materialId: 'concrete',
    },
    {
      input: 'simulate Leh with eps',
      site: 'Leh',
      materialId: 'eps',
    },
    {
      input: 'simulate Kargil with stone wall',
      site: 'Kargil',
      materialId: 'stone',
    },
    {
      input: 'simulate Manali with rammed earth wall',
      site: 'Manali',
      materialId: 'rammed_earth',
    },
    {
      input: 'simulate Manali with timber (softwood) walls',
      site: 'Manali',
      materialId: 'timber',
    },
  ];

  for (const { input, site, materialId } of cases) {
    const action = parseCommand(input);
    assert.ok(action, `Failed to parse site + material: "${input}"`);
    assert.equal(action.type, 'SET_SITE_AND_MATERIAL_AND_NAVIGATE');
    assert.equal(action.step, 'simulate');
    assert.equal(action.site.label, site);
    assert.equal(action.material.id, materialId);
  }
});

/* ── 5. Material Comparison ("compare <mat A> vs <mat B>") ──────────────── */
test('commandParser: compare materials matches supported separators', () => {
  const cases = [
    {
      input: 'compare mud brick vs eps',
      matA: 'mud_brick',
      matB: 'eps',
    },
    {
      input: 'compare rammed earth versus timber',
      matA: 'rammed_earth',
      matB: 'timber',
    },
    {
      input: 'compare stone and concrete',
      matA: 'stone',
      matB: 'concrete',
    },
    {
      input: 'compare xps vs. plywood',
      matA: 'xps',
      matB: 'plywood',
    },
  ];

  for (const { input, matA, matB } of cases) {
    const action = parseCommand(input);
    assert.ok(action, `Failed to parse compare: "${input}"`);
    assert.equal(action.type, 'COMPARE_MATERIALS');
    assert.equal(action.materialA.id, matA);
    assert.equal(action.materialB.id, matB);
  }
});

/* ── 6. Custom Context ─────────────────────────────────────────────────── */
test('commandParser: honors custom sitePresets and materialIds passed via context', () => {
  const customContext = {
    sitePresets: [
      { label: 'Siachen', lat: 35.2000, lon: 77.2100, altitude_m: 3600 },
      { label: 'Hanle', lat: 32.7758, lon: 78.9642, altitude_m: 4500 },
    ],
    materialIds: ['aerogel_blanket', 'fiberglass', 'rammed_earth'],
  };

  // Custom site works
  const act1 = parseCommand('simulate Siachen', customContext);
  assert.ok(act1);
  assert.equal(act1.site.label, 'Siachen');

  // Custom material works
  const act2 = parseCommand('simulate Hanle with aerogel blanket walls', customContext);
  assert.ok(act2);
  assert.equal(act2.material.id, 'aerogel_blanket');

  // Default site is not recognized when custom presets override
  const act3 = parseCommand('simulate Leh', customContext);
  assert.equal(act3, null);
});

/* ── 7. Deterministic Rejection (No Guessing / Low Confidence) ───────────── */
test('commandParser: returns null for invalid, ambiguous, or garbage inputs', () => {
  const garbageInputs = [
    '',
    '    ',
    null,
    undefined,
    12345,
    'hello',
    'how is the weather in leh',
    'simulate',
    'simulate Paris', // unknown site
    'simulate Tokyo with wood walls', // unknown site
    'simulate Leh with vibranium walls', // unknown material
    'simulate Leh with unobtanium', // unknown material
    'open kitchen', // unknown step
    'go to bathroom', // unknown step
    'compare mud brick vs unobtanium', // unknown material B
    'compare kryptonite vs eps', // unknown material A
    'compare only one material',
    'delete everything',
  ];

  for (const input of garbageInputs) {
    const action = parseCommand(input);
    assert.equal(
      action,
      null,
      `Input "${input}" should return null but returned ${JSON.stringify(action)}`
    );
  }
});
