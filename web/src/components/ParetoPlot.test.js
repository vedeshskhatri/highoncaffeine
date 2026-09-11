import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCost,
  formatComfort,
  formatDiscomfort,
  paretoDominates,
  extractFrontier,
} from './paretoUtils.js';

test('ParetoPlot: formatting helpers handle values and nulls gracefully', () => {
  assert.equal(formatCost(250000), '₹2,50,000');
  assert.equal(formatCost(null), '—');
  assert.equal(formatCost(NaN), '—');

  assert.equal(formatComfort(0.85), '85%');
  assert.equal(formatComfort(null), '—');

  assert.equal(formatDiscomfort(4.8), '4.8 h');
  assert.equal(formatDiscomfort(null), '—');
});

test('ParetoPlot: mathematical Pareto dominance A dominates B', () => {
  // A has lower cost and lower discomfort than B
  const designA = { id: 'a', cost_inr: 200000, discomfort_hours: 4.0, safety_status: 'SAFE', is_safe: true };
  const designB = { id: 'b', cost_inr: 300000, discomfort_hours: 8.0, safety_status: 'SAFE', is_safe: true };

  assert.equal(paretoDominates(designA, designB), true);
  assert.equal(paretoDominates(designB, designA), false);
});

test('ParetoPlot: mathematical Pareto dominance B dominates A', () => {
  const designA = { id: 'a', cost_inr: 350000, discomfort_hours: 10.0, safety_status: 'SAFE', is_safe: true };
  const designB = { id: 'b', cost_inr: 250000, discomfort_hours: 5.0, safety_status: 'SAFE', is_safe: true };

  assert.equal(paretoDominates(designB, designA), true);
  assert.equal(paretoDominates(designA, designB), false);
});

test('ParetoPlot: trade-off surface neither dominates', () => {
  // Design A: cheaper but more uncomfortable
  // Design B: more expensive but less uncomfortable
  const designA = { id: 'a', cost_inr: 180000, discomfort_hours: 12.0, safety_status: 'SAFE', is_safe: true };
  const designB = { id: 'b', cost_inr: 400000, discomfort_hours: 2.0, safety_status: 'SAFE', is_safe: true };

  assert.equal(paretoDominates(designA, designB), false);
  assert.equal(paretoDominates(designB, designA), false);
});

test('ParetoPlot: identical designs neither dominates', () => {
  const design1 = { id: 'd1', cost_inr: 250000, discomfort_hours: 6.0, safety_status: 'SAFE', is_safe: true };
  const design2 = { id: 'd2', cost_inr: 250000, discomfort_hours: 6.0, safety_status: 'SAFE', is_safe: true };

  assert.equal(paretoDominates(design1, design2), false);
  assert.equal(paretoDominates(design2, design1), false);
});

test('ParetoPlot: missing cost cannot dominate and is excluded from frontier', () => {
  const designMissing = { id: 'none', cost_inr: null, discomfort_hours: 2.0, safety_status: 'SAFE', is_safe: true };
  const designNormal = { id: 'normal', cost_inr: 300000, discomfort_hours: 5.0, safety_status: 'SAFE', is_safe: true };

  assert.equal(paretoDominates(designMissing, designNormal), false);

  const frontier = extractFrontier([designMissing, designNormal]);
  assert.equal(frontier.length, 1);
  assert.equal(frontier[0].id, 'normal');
});

test('ParetoPlot: unsafe designs cannot dominate and are excluded from frontier', () => {
  const safeExpensive = { id: 'safe', cost_inr: 450000, discomfort_hours: 5.0, safety_status: 'SAFE', is_safe: true };
  const unsafeCheap = { id: 'unsafe', cost_inr: 100000, discomfort_hours: 1.0, safety_status: 'REFUSED', is_safe: false };

  assert.equal(paretoDominates(unsafeCheap, safeExpensive), false);
  assert.equal(paretoDominates(safeExpensive, unsafeCheap), true);

  const frontier = extractFrontier([safeExpensive, unsafeCheap]);
  assert.equal(frontier.length, 1);
  assert.equal(frontier[0].id, 'safe');
});

test('ParetoPlot: budget filter returns 0 feasible designs when budget is too low without inventing fictional designs', () => {
  const candidates = [
    { id: 'd1', cost_inr: 200000, discomfort_hours: 8.0, safety_status: 'SAFE', is_safe: true },
    { id: 'd2', cost_inr: 300000, discomfort_hours: 4.0, safety_status: 'SAFE', is_safe: true },
    { id: 'd3', cost_inr: 400000, discomfort_hours: 2.0, safety_status: 'SAFE', is_safe: true },
  ];

  // Impossibly low budget: ₹1,50,000
  const frontierZero = extractFrontier(candidates, 150000);
  assert.equal(frontierZero.length, 0);

  // Budget ₹2,50,000: only d1 is affordable
  const frontierAffordable = extractFrontier(candidates, 250000);
  assert.equal(frontierAffordable.length, 1);
  assert.equal(frontierAffordable[0].id, 'd1');
});
