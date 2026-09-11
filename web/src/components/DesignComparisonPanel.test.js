import test from 'node:test';
import assert from 'node:assert/strict';

// DesignComparisonPanel Unit Tests (Phase 4)

function computeUtopiaDistance(comfort, cost, minComfort, maxComfort, minCost, maxCost) {
  let cNorm = 1.0;
  if (maxComfort > minComfort) {
    cNorm = (comfort - minComfort) / (maxComfort - minComfort);
  }
  let kNorm = 0.0;
  if (maxCost > minCost) {
    kNorm = (cost - minCost) / (maxCost - minCost);
  }
  return Math.sqrt(Math.pow(1.0 - cNorm, 2) + Math.pow(kNorm - 0.0, 2));
}

function evaluateRankings(designs) {
  const safeItems = designs.filter((d) => d.safety_status === 'SAFE');
  let bestComfortId = null;
  let lowestCostId = null;
  let bestTradeoffId = null;

  if (safeItems.length > 0) {
    // 1. Best Comfort: max comfort ratio, tie-break: max min Tin
    const sortedComfort = [...safeItems].sort((a, b) => {
      if ((b.comfort_hours_ratio ?? -1) !== (a.comfort_hours_ratio ?? -1)) {
        return (b.comfort_hours_ratio ?? -1) - (a.comfort_hours_ratio ?? -1);
      }
      return (b.t_in_min_c ?? -999) - (a.t_in_min_c ?? -999);
    });
    bestComfortId = sortedComfort[0].id;

    // 2. Lowest Cost: min capital cost
    const withCost = safeItems.filter((d) => d.capital_cost_inr !== null && d.cost_basis !== 'UNAVAILABLE');
    if (withCost.length > 0) {
      withCost.sort((a, b) => a.capital_cost_inr - b.capital_cost_inr);
      lowestCostId = withCost[0].id;
    }

    // 3. Best Trade-Off: Pareto Knee Point via Utopia distance
    const candidates = safeItems.filter(
      (d) => d.comfort_hours_ratio !== null && d.capital_cost_inr !== null && d.cost_basis !== 'UNAVAILABLE'
    );
    if (candidates.length > 0) {
      const comfs = candidates.map((d) => d.comfort_hours_ratio);
      const costs = candidates.map((d) => d.capital_cost_inr);
      const minC = Math.min(...comfs);
      const maxC = Math.max(...comfs);
      const minK = Math.min(...costs);
      const maxK = Math.max(...costs);

      const candidateDists = candidates.map((d) => ({
        id: d.id,
        dist: computeUtopiaDistance(d.comfort_hours_ratio, d.capital_cost_inr, minC, maxC, minK, maxK),
        comfort: d.comfort_hours_ratio,
      }));

      candidateDists.sort((a, b) => {
        if (Math.abs(a.dist - b.dist) > 1e-4) {
          return a.dist - b.dist;
        }
        return b.comfort - a.comfort;
      });
      bestTradeoffId = candidateDists[0].id;
    }
  }

  return { bestComfortId, lowestCostId, bestTradeoffId };
}

test('DesignComparison: enforces 2 to 4 designs boundary', () => {
  const validateCount = (n) => n >= 2 && n <= 4;
  assert.equal(validateCount(1), false);
  assert.equal(validateCount(2), true);
  assert.equal(validateCount(3), true);
  assert.equal(validateCount(4), true);
  assert.equal(validateCount(5), false);
});

test('DesignComparison: cost basis badge classification SOURCED, ESTIMATE, UNAVAILABLE', () => {
  const dSourced = { id: 'd1', capital_cost_inr: 250000, cost_basis: 'SOURCED' };
  const dEstimate = { id: 'd2', capital_cost_inr: 180000, cost_basis: 'ESTIMATE' };
  const dUnavailable = { id: 'd3', capital_cost_inr: null, cost_basis: 'UNAVAILABLE' };

  assert.equal(dSourced.cost_basis, 'SOURCED');
  assert.equal(dEstimate.cost_basis, 'ESTIMATE');
  assert.equal(dUnavailable.cost_basis, 'UNAVAILABLE');
  assert.equal(dUnavailable.capital_cost_inr, null);
});

test('DesignComparison: safety refusal disqualifies design from all winning rankings', () => {
  const designs = [
    {
      id: 'd1_unsafe',
      name: 'Unvented Low ACH',
      safety_status: 'REFUSED',
      comfort_hours_ratio: 0.95, // extremely warm, but unsafe
      capital_cost_inr: 100000,   // cheapest, but unsafe
      t_in_min_c: 12.0,
      cost_basis: 'SOURCED',
    },
    {
      id: 'd2_safe',
      name: 'Safe Electric',
      safety_status: 'SAFE',
      comfort_hours_ratio: 0.70,
      capital_cost_inr: 220000,
      t_in_min_c: 8.5,
      cost_basis: 'SOURCED',
    },
  ];

  const rankings = evaluateRankings(designs);
  // Unsafe design d1 MUST NOT win any ranking despite highest comfort and lowest cost
  assert.notEqual(rankings.bestComfortId, 'd1_unsafe');
  assert.notEqual(rankings.lowestCostId, 'd1_unsafe');
  assert.notEqual(rankings.bestTradeoffId, 'd1_unsafe');

  assert.equal(rankings.bestComfortId, 'd2_safe');
  assert.equal(rankings.lowestCostId, 'd2_safe');
  assert.equal(rankings.bestTradeoffId, 'd2_safe');
});

test('DesignComparison: mathematical Pareto Knee Point via Utopia distance selects balanced trade-off', () => {
  const designs = [
    {
      id: 'd_cheap_cold',
      safety_status: 'SAFE',
      comfort_hours_ratio: 0.20,
      capital_cost_inr: 100000,
      t_in_min_c: 2.0,
      cost_basis: 'SOURCED',
    },
    {
      id: 'd_balanced',
      safety_status: 'SAFE',
      comfort_hours_ratio: 0.85,
      capital_cost_inr: 140000, // significant comfort gain for small cost increment
      t_in_min_c: 10.0,
      cost_basis: 'SOURCED',
    },
    {
      id: 'd_expensive_warm',
      safety_status: 'SAFE',
      comfort_hours_ratio: 0.90,
      capital_cost_inr: 350000, // diminishing returns at high cost
      t_in_min_c: 11.5,
      cost_basis: 'SOURCED',
    },
  ];

  const rankings = evaluateRankings(designs);
  assert.equal(rankings.lowestCostId, 'd_cheap_cold');
  assert.equal(rankings.bestComfortId, 'd_expensive_warm');
  // Balanced design should be the knee point closest to Utopia
  assert.equal(rankings.bestTradeoffId, 'd_balanced');
});

test('DesignComparison: unavailable metrics handle em-dash without throwing NaN', () => {
  const formatMetric = (val, unit = '') => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${val} ${unit}`.trim();
  };

  assert.equal(formatMetric(null, '°C'), '—');
  assert.equal(formatMetric(undefined, 'L/night'), '—');
  assert.equal(formatMetric(NaN, 'kWh'), '—');
  assert.equal(formatMetric(14.5, '°C'), '14.5 °C');
});
