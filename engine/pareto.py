"""Mathematical Pareto dominance, frontier extraction, and budget-filtering module.

Conforms strictly to brain/11_OPTIMIZER_SPEC.md and SIH 2026 Phase 5 specifications:
  - Multi-objective minimization: X = cost (INR), Y = thermal discomfort (hours / ratio).
  - Deterministic mathematical dominance:
      A dominates B (A ≻ B) iff:
        cost_A <= cost_B and discomfort_A <= discomfort_B and
        (cost_A < cost_B or discomfort_A < discomfort_B)
  - Missing cost: designs with missing/non-positive cost cannot dominate and are excluded from the frontier.
  - Unsafe designs: designs flagged REFUSED (safety interlock violation) cannot dominate safe designs and are excluded.
  - Budget filtering: strictly filters candidates by cost <= budget; reports 0 feasible designs if none affordable.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


def get_cost(candidate: Dict[str, Any], cost_key: str = "cost_inr") -> Optional[float]:
    """Safely extract valid numerical cost from candidate dictionary."""
    val = candidate.get(cost_key)
    if val is None:
        val = candidate.get("cost")
    if val is None or not isinstance(val, (int, float)):
        return None
    try:
        c = float(val)
        return c if c > 0 else None
    except (ValueError, TypeError):
        return None


def get_discomfort(candidate: Dict[str, Any], discomfort_key: str = "discomfort") -> Optional[float]:
    """Safely extract or derive numerical thermal discomfort from candidate dictionary.

    If discomfort is explicitly provided, uses it.
    Otherwise derives from:
      - discomfort_hours = 24.0 * (1.0 - comfort_hours_ratio)
      - or hours_below_health / hours_below_health_threshold
      - or 1.0 - comfort_hours_ratio
    """
    if discomfort_key in candidate and candidate[discomfort_key] is not None:
        try:
            return float(candidate[discomfort_key])
        except (ValueError, TypeError):
            pass

    if "discomfort_hours" in candidate and candidate["discomfort_hours"] is not None:
        try:
            return float(candidate["discomfort_hours"])
        except (ValueError, TypeError):
            pass

    if "hours_below_health" in candidate and candidate["hours_below_health"] is not None:
        try:
            return float(candidate["hours_below_health"])
        except (ValueError, TypeError):
            pass

    if "comfort_hours_ratio" in candidate and candidate["comfort_hours_ratio"] is not None:
        try:
            comf = float(candidate["comfort_hours_ratio"])
            return round(max(0.0, 24.0 * (1.0 - comf)), 2)
        except (ValueError, TypeError):
            pass

    return None


def is_safe_design(candidate: Dict[str, Any]) -> bool:
    """Check if design passed safety interlocks."""
    if candidate.get("refused") is True:
        return False
    if candidate.get("is_safe") is False:
        return False
    if candidate.get("safety_status") == "REFUSED":
        return False
    summary = candidate.get("summary")
    if isinstance(summary, dict):
        if summary.get("refused") is True or summary.get("safety_status") == "REFUSED":
            return False
    return True


def pareto_dominates(
    a: Dict[str, Any],
    b: Dict[str, Any],
    cost_key: str = "cost_inr",
    discomfort_key: str = "discomfort",
) -> bool:
    """Determine whether Design A strictly Pareto-dominates Design B (A ≻ B).

    Minimization on both objectives:
      Objective 1: Cost (INR)
      Objective 2: Thermal Discomfort (Hours / Ratio)

    Rules:
      1. Safety check: An unsafe design CANNOT dominate any design.
         A safe design ALWAYS dominates an unsafe design.
      2. Missing cost check: A design with missing cost cannot dominate.
      3. Minimization: cost_a <= cost_b and discomf_a <= discomf_b and
                       (cost_a < cost_b or discomf_a < discomf_b).
      4. Identical designs: Neither dominates the other.
      5. Trade-off designs: Neither dominates the other.
    """
    safe_a = is_safe_design(a)
    safe_b = is_safe_design(b)

    # Rule 1: An unsafe design cannot dominate anything
    if not safe_a:
        return False

    # A safe design strictly dominates an unsafe design (safety interlock priority)
    if safe_a and not safe_b:
        return True

    # Rule 2: Missing cost validation
    cost_a = get_cost(a, cost_key)
    cost_b = get_cost(b, cost_key)
    if cost_a is None or cost_b is None:
        return False

    # Extract discomfort
    discomf_a = get_discomfort(a, discomfort_key)
    discomf_b = get_discomfort(b, discomfort_key)
    if discomf_a is None or discomf_b is None:
        return False

    # Rule 3 & 4: Strict Pareto dominance under minimization
    better_or_equal = (cost_a <= cost_b) and (discomf_a <= discomf_b)
    strictly_better = (cost_a < cost_b) or (discomf_a < discomf_b)

    return better_or_equal and strictly_better


def filter_by_budget(
    candidates: List[Dict[str, Any]],
    max_budget_inr: Optional[float] = None,
    cost_key: str = "cost_inr",
) -> List[Dict[str, Any]]:
    """Filter candidate designs strictly within budget (cost <= budget).

    If max_budget_inr is None or <= 0, returns all candidates.
    If no candidates are within budget, returns empty list (0 feasible designs).
    Does NOT invent fictional designs or silently alter the budget.
    """
    if max_budget_inr is None or max_budget_inr <= 0:
        return list(candidates)

    budget = float(max_budget_inr)
    affordable = []
    for c in candidates:
        cost = get_cost(c, cost_key)
        if cost is not None and cost <= budget:
            affordable.append(c)

    return affordable


def extract_pareto_frontier(
    candidates: List[Dict[str, Any]],
    max_budget_inr: Optional[float] = None,
    cost_key: str = "cost_inr",
    discomfort_key: str = "discomfort",
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Extract non-dominated Pareto frontier points from candidate designs.

    Args:
        candidates: List of candidate design dictionaries.
        max_budget_inr: Optional budget cap in INR.
        cost_key: Dict key for cost.
        discomfort_key: Dict key for discomfort.

    Returns:
        Tuple of:
          - pareto_frontier: List of non-dominated, safe designs within budget, sorted by cost ascending.
          - feasible_candidates: List of all safe candidates within budget.
    """
    # 1. Filter out unsafe designs and missing costs
    valid_candidates = []
    for c in candidates:
        if not is_safe_design(c):
            continue
        if get_cost(c, cost_key) is None:
            continue
        if get_discomfort(c, discomfort_key) is None:
            continue
        valid_candidates.append(c)

    # 2. Filter by budget
    feasible = filter_by_budget(valid_candidates, max_budget_inr=max_budget_inr, cost_key=cost_key)

    if not feasible:
        return [], []

    # 3. Determine non-dominated subset
    pareto_frontier = []
    for i, cand_a in enumerate(feasible):
        is_dominated = False
        for j, cand_b in enumerate(feasible):
            if i == j:
                continue
            if pareto_dominates(cand_b, cand_a, cost_key=cost_key, discomfort_key=discomfort_key):
                is_dominated = True
                break

        if not is_dominated:
            pareto_frontier.append(cand_a)

    # 4. Sort Pareto frontier by cost ascending (lower cost to higher cost)
    pareto_frontier.sort(key=lambda x: get_cost(x, cost_key) or 0.0)

    return pareto_frontier, feasible
