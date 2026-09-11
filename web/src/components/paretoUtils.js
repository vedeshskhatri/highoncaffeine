/**
 * paretoUtils.js — Pure mathematical and formatting utilities for Pareto optimization.
 *
 * Implements strict multi-objective minimization (X = cost, Y = discomfort),
 * non-dominated frontier extraction, budget filtering, and formatting.
 */

export function formatCost(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export function formatComfort(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `${Math.round(val * 100)}%`;
}

export function formatDiscomfort(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `${val.toFixed(1)} h`;
}

/**
 * Mathematical Pareto dominance check for minimization of X (cost) and Y (discomfort).
 * A dominates B (A ≻ B) iff:
 *   cost_A <= cost_B && discomf_A <= discomf_B && (cost_A < cost_B || discomf_A < discomf_B)
 */
export function paretoDominates(a, b) {
  // Safety rule: unsafe designs cannot dominate anything
  if (a.safety_status === 'REFUSED' || a.is_safe === false) return false;
  if (b.safety_status === 'REFUSED' || b.is_safe === false) return true;

  // Missing cost validation
  if (a.cost_inr == null || a.cost_inr <= 0 || b.cost_inr == null || b.cost_inr <= 0) return false;
  if (a.discomfort_hours == null || b.discomfort_hours == null) return false;

  const betterOrEqual = a.cost_inr <= b.cost_inr && a.discomfort_hours <= b.discomfort_hours;
  const strictlyBetter = a.cost_inr < b.cost_inr || a.discomfort_hours < b.discomfort_hours;

  return betterOrEqual && strictlyBetter;
}

/**
 * Extract strictly non-dominated Pareto frontier candidates under budget cap.
 */
export function extractFrontier(candidates, budget = null) {
  const safeValid = candidates.filter(
    c => (c.safety_status !== 'REFUSED' && c.is_safe !== false) &&
         c.cost_inr != null && c.cost_inr > 0 &&
         c.discomfort_hours != null
  );

  const affordable = budget != null && budget > 0
    ? safeValid.filter(c => c.cost_inr <= budget)
    : safeValid;

  if (affordable.length === 0) return [];

  const frontier = affordable.filter(candA => {
    return !affordable.some(candB => candB !== candA && paretoDominates(candB, candA));
  });

  return frontier.sort((a, b) => a.cost_inr - b.cost_inr);
}
