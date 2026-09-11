/**
 * designDoctorUtils.js — Mathematical utilities for Phase 6 Design Doctor
 *
 * Implements the authoritative ranking formula per brain/11_OPTIMIZER_SPEC.md:
 *   degrees_per_1000_inr = delta_t_min_c / (cost_inr / 1000.0)
 *
 * And budget filtering without inventing fictional designs.
 */

export function computeDegreesPer1000Inr(deltaTMinC, costInr) {
  if (costInr == null || costInr <= 0 || deltaTMinC == null) {
    return 0.0;
  }
  const efficiency = deltaTMinC / (costInr / 1000.0);
  return Math.round(efficiency * 100) / 100;
}

export function filterAndRankRetrofits(interventions, budgetInr, baselineTMinC = 0.0) {
  if (!interventions || !Array.isArray(interventions)) {
    return {
      ranked: [],
      affordable: [],
      cumulativeCost: 0,
      cumulativeTMin: baselineTMinC,
      isZeroFeasible: true,
      remainingBudget: budgetInr,
    };
  }

  // Safe candidates only
  const safe = interventions.filter((i) => i.safety_status !== 'REFUSED' && i.is_safe !== false);

  // Sort descending by degrees_per_1000_inr
  const sorted = [...safe].sort((a, b) => {
    const effA = a.degrees_per_1000_inr ?? computeDegreesPer1000Inr(a.delta_t_min_c, a.cost_inr);
    const effB = b.degrees_per_1000_inr ?? computeDegreesPer1000Inr(b.delta_t_min_c, b.cost_inr);
    return effB - effA;
  });

  let cumCost = 0;
  let cumTMin = baselineTMinC;
  const ranked = [];
  const affordable = [];

  for (let idx = 0; idx < sorted.length; idx++) {
    const item = sorted[idx];
    cumCost += item.cost_inr;
    cumTMin = Math.round((cumTMin + (item.delta_t_min_c ?? 0)) * 100) / 100;
    const withinBudget = cumCost <= budgetInr;

    const enriched = {
      ...item,
      rank: idx + 1,
      cumulative_cost_inr: cumCost,
      cumulative_t_min_c: cumTMin,
      within_budget: withinBudget,
    };

    ranked.push(enriched);
    if (withinBudget) {
      affordable.push(enriched);
    }
  }

  const totalAffordableCost = affordable.reduce((acc, i) => acc + i.cost_inr, 0);

  return {
    ranked,
    affordable,
    totalAffordableCost,
    feasibleCount: affordable.length,
    remainingBudget: Math.max(0, budgetInr - totalAffordableCost),
    isZeroFeasible: affordable.length === 0,
    projectedTMin: Math.round((baselineTMinC + affordable.reduce((acc, i) => acc + (i.delta_t_min_c ?? 0), 0)) * 100) / 100,
  };
}

export function formatInr(val) {
  if (val == null || isNaN(val)) return '—';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}
