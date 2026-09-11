import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDegreesPer1000Inr,
  filterAndRankRetrofits,
  formatInr,
} from './designDoctorUtils.js';

test('DesignDoctor: exact ranking formula calculation degrees_per_1000_inr', () => {
  // Delta T = 4.8 C, Cost = 2,500 INR -> 4.8 / 2.5 = 1.92
  const eff1 = computeDegreesPer1000Inr(4.8, 2500);
  assert.equal(eff1, 1.92);

  // Delta T = 2.1 C, Cost = 1,400 INR -> 2.1 / 1.4 = 1.50
  const eff2 = computeDegreesPer1000Inr(2.1, 1400);
  assert.equal(eff2, 1.5);

  // Delta T = 5.2 C, Cost = 14,500 INR -> 5.2 / 14.5 = 0.3586... -> 0.36
  const eff3 = computeDegreesPer1000Inr(5.2, 14500);
  assert.equal(eff3, 0.36);

  // Zero cost / null handles gracefully
  assert.equal(computeDegreesPer1000Inr(2.0, 0), 0.0);
  assert.equal(computeDegreesPer1000Inr(null, 1000), 0.0);
});

test('DesignDoctor: ranks interventions strictly descending by degrees_per_1000_inr', () => {
  const retrofits = [
    { id: 'expensive', cost_inr: 20000, delta_t_min_c: 2.0, degrees_per_1000_inr: 0.1, safety_status: 'SAFE' },
    { id: 'efficient', cost_inr: 2500, delta_t_min_c: 5.0, degrees_per_1000_inr: 2.0, safety_status: 'SAFE' },
    { id: 'medium', cost_inr: 5000, delta_t_min_c: 4.0, degrees_per_1000_inr: 0.8, safety_status: 'SAFE' },
  ];

  const result = filterAndRankRetrofits(retrofits, 50000, 2.0);
  assert.equal(result.ranked.length, 3);
  assert.equal(result.ranked[0].id, 'efficient');
  assert.equal(result.ranked[1].id, 'medium');
  assert.equal(result.ranked[2].id, 'expensive');
  assert.equal(result.ranked[0].rank, 1);
  assert.equal(result.ranked[1].rank, 2);
  assert.equal(result.ranked[2].rank, 3);
});

test('DesignDoctor: budget-constrained filtering and cumulative cost boundary', () => {
  const retrofits = [
    { id: 'r1', cost_inr: 3000, delta_t_min_c: 3.0, degrees_per_1000_inr: 1.0, safety_status: 'SAFE' },
    { id: 'r2', cost_inr: 5000, delta_t_min_c: 2.5, degrees_per_1000_inr: 0.5, safety_status: 'SAFE' },
    { id: 'r3', cost_inr: 10000, delta_t_min_c: 2.0, degrees_per_1000_inr: 0.2, safety_status: 'SAFE' },
  ];

  // Budget of 10,000 INR -> r1 (3k, cum=3k) safe, r2 (5k, cum=8k) safe, r3 (10k, cum=18k > 10k) not within budget
  const res = filterAndRankRetrofits(retrofits, 10000, 3.0);
  assert.equal(res.feasibleCount, 2);
  assert.equal(res.affordable.length, 2);
  assert.equal(res.affordable[0].id, 'r1');
  assert.equal(res.affordable[1].id, 'r2');
  assert.equal(res.ranked[2].within_budget, false);
  assert.equal(res.totalAffordableCost, 8000);
  assert.equal(res.remainingBudget, 2000);
  assert.equal(res.isZeroFeasible, false);
});

test('DesignDoctor: zero feasible retrofits within budget without fictional designs', () => {
  const retrofits = [
    { id: 'r1', cost_inr: 5000, delta_t_min_c: 3.0, degrees_per_1000_inr: 0.6, safety_status: 'SAFE' },
    { id: 'r2', cost_inr: 8000, delta_t_min_c: 2.0, degrees_per_1000_inr: 0.25, safety_status: 'SAFE' },
  ];

  // Budget of 2,000 INR cannot afford either intervention
  const res = filterAndRankRetrofits(retrofits, 2000, 1.5);
  assert.equal(res.feasibleCount, 0);
  assert.equal(res.affordable.length, 0);
  assert.equal(res.isZeroFeasible, true);
  assert.equal(res.remainingBudget, 2000);
  assert.equal(res.projectedTMin, 1.5); // Remains at baseline
});

test('DesignDoctor: unsafe retrofits are disqualified from recommendations', () => {
  const retrofits = [
    { id: 'safe1', cost_inr: 2000, delta_t_min_c: 2.0, degrees_per_1000_inr: 1.0, safety_status: 'SAFE', is_safe: true },
    { id: 'unsafe_sealing', cost_inr: 500, delta_t_min_c: 4.0, degrees_per_1000_inr: 8.0, safety_status: 'REFUSED', is_safe: false },
    { id: 'safe2', cost_inr: 4000, delta_t_min_c: 2.0, degrees_per_1000_inr: 0.5, safety_status: 'SAFE', is_safe: true },
  ];

  const res = filterAndRankRetrofits(retrofits, 20000, 0.0);
  // Unsafe retrofit must NOT be included in ranked recommendations
  assert.equal(res.ranked.length, 2);
  assert.equal(res.ranked[0].id, 'safe1');
  assert.equal(res.ranked[1].id, 'safe2');
  assert.ok(!res.ranked.some(r => r.id === 'unsafe_sealing'));
});

test('DesignDoctor: cost basis must remain faithful (sourced vs estimate)', () => {
  const retrofits = [
    { id: 'r_sourced', cost_basis: 'sourced', cost_inr: 2500, delta_t_min_c: 2.0 },
    { id: 'r_estimate', cost_basis: 'estimate', cost_inr: 3200, delta_t_min_c: 1.5 },
  ];

  const res = filterAndRankRetrofits(retrofits, 10000, 0.0);
  assert.equal(res.ranked.find(r => r.id === 'r_sourced').cost_basis, 'sourced');
  assert.equal(res.ranked.find(r => r.id === 'r_estimate').cost_basis, 'estimate');
});

test('DesignDoctor: currency formatting', () => {
  assert.equal(formatInr(25000), '₹25,000');
  assert.equal(formatInr(1400), '₹1,400');
  assert.equal(formatInr(null), '—');
});
