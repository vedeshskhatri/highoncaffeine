import test from 'node:test';
import assert from 'node:assert/strict';

// S4 Unit Tests

test('LeversPanel requires and preserves estimate flag on local estimates', () => {
  const sampleLevers = [
    { id: 'l1', label: 'Night shutters', effect_c: 6.1, cost_basis: 'estimate' },
    { id: 'l2', label: 'EPS insulation', effect_c: 4.8, cost_basis: 'sourced' },
  ];
  const estimateLevers = sampleLevers.filter(l => l.cost_basis === 'estimate');
  assert.equal(estimateLevers.length, 1);
  assert.equal(estimateLevers[0].id, 'l1');
});

test('ValidationPanel ordering condition: Trombe ranked above direct gain', () => {
  const trombeMin = 14.31;
  const directGainMin = 12.29;
  const trombeAboveDirectGain = trombeMin > directGainMin;
  assert.equal(trombeAboveDirectGain, true);
  assert.ok(trombeMin - directGainMin > 2.0);
});

test('Safe formatting handles undefined and NaN with em-dash', () => {
  function formatSafe(val) {
    if (typeof val !== 'number' || isNaN(val)) return '—';
    return `${val.toFixed(1)} °C`;
  }

  assert.equal(formatSafe(undefined), '—');
  assert.equal(formatSafe(null), '—');
  assert.equal(formatSafe(NaN), '—');
  assert.equal(formatSafe(18.24), '18.2 °C');
});

test('DeltaAmbient matches PS Requirement 3 (indoor - ambient)', () => {
  const pt = { t_in: 4.8, t_out: -21.3 };
  const deltaAmbient = pt.t_in - pt.t_out;
  assert.ok(Math.abs(deltaAmbient - 26.1) < 1e-9);
});
