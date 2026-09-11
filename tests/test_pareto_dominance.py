"""Deterministic unit tests for Pareto dominance, safety interlocks, missing cost, and budget filtering.

Phase 5 Specification Tests:
  1. A dominates B
  2. B dominates A
  3. neither dominates (trade-off)
  4. identical designs (neither dominates)
  5. missing cost (cannot dominate, excluded)
  6. unsafe designs (cannot dominate safe designs, excluded)
  7. budget interaction & zero feasible designs handling
"""

import pytest
from engine.pareto import (
    pareto_dominates,
    filter_by_budget,
    extract_pareto_frontier,
)


def test_a_dominates_b():
    """Test 1: Design A strictly dominates Design B when A has strictly lower or equal cost

    and strictly lower discomfort (cost_A <= cost_B and discomf_A <= discomf_B with at least one strict).
    """
    # A is cheaper (₹2,00,000 vs ₹3,00,000) and has lower discomfort (4.0 hrs vs 8.0 hrs)
    design_a = {"design_id": "d_A", "cost_inr": 200000.0, "discomfort": 4.0, "is_safe": True}
    design_b = {"design_id": "d_B", "cost_inr": 300000.0, "discomfort": 8.0, "is_safe": True}

    assert pareto_dominates(design_a, design_b) is True
    assert pareto_dominates(design_b, design_a) is False


def test_b_dominates_a():
    """Test 2: Design B strictly dominates Design A when B has lower cost and lower discomfort."""
    design_a = {"design_id": "d_A", "cost_inr": 350000.0, "discomfort": 10.0, "is_safe": True}
    design_b = {"design_id": "d_B", "cost_inr": 280000.0, "discomfort": 5.0, "is_safe": True}

    assert pareto_dominates(design_b, design_a) is True
    assert pareto_dominates(design_a, design_b) is False


def test_neither_dominates_tradeoff():
    """Test 3: Mutual non-dominance (trade-off surface).

    When A is cheaper but more uncomfortable, and B is more expensive but more comfortable,
    neither design dominates the other.
    """
    # Design A: Cheap (₹1,50,000) but high discomfort (12.0 hrs)
    # Design B: Expensive (₹4,00,000) but low discomfort (2.0 hrs)
    design_a = {"design_id": "d_cheap", "cost_inr": 150000.0, "discomfort": 12.0, "is_safe": True}
    design_b = {"design_id": "d_comfort", "cost_inr": 400000.0, "discomfort": 2.0, "is_safe": True}

    assert pareto_dominates(design_a, design_b) is False
    assert pareto_dominates(design_b, design_a) is False


def test_identical_designs_neither_dominates():
    """Test 4: Identical designs have identical cost and discomfort, so neither dominates."""
    design_1 = {"design_id": "d_1", "cost_inr": 250000.0, "discomfort": 6.0, "is_safe": True}
    design_2 = {"design_id": "d_2", "cost_inr": 250000.0, "discomfort": 6.0, "is_safe": True}

    assert pareto_dominates(design_1, design_2) is False
    assert pareto_dominates(design_2, design_1) is False


def test_missing_cost_cannot_dominate_and_excluded():
    """Test 5: Designs with missing or non-positive cost cannot dominate and are excluded from the frontier."""
    # Design with None cost
    design_missing = {"design_id": "d_none", "cost_inr": None, "discomfort": 3.0, "is_safe": True}
    # Design with 0 cost
    design_zero = {"design_id": "d_zero", "cost_inr": 0.0, "discomfort": 3.0, "is_safe": True}
    # Normal design
    design_normal = {"design_id": "d_normal", "cost_inr": 300000.0, "discomfort": 5.0, "is_safe": True}

    # Cannot dominate normal designs
    assert pareto_dominates(design_missing, design_normal) is False
    assert pareto_dominates(design_zero, design_normal) is False

    # Excluded from Pareto frontier extraction
    candidates = [design_missing, design_zero, design_normal]
    frontier, feasible = extract_pareto_frontier(candidates)
    frontier_ids = [d["design_id"] for d in frontier]

    assert "d_none" not in frontier_ids
    assert "d_zero" not in frontier_ids
    assert "d_normal" in frontier_ids


def test_unsafe_designs_cannot_dominate_and_excluded():
    """Test 6: Designs failing safety interlocks (REFUSED) cannot dominate safe designs

    and are strictly excluded from the Pareto frontier.
    """
    safe_expensive = {"design_id": "d_safe", "cost_inr": 450000.0, "discomfort": 5.0, "safety_status": "SAFE", "is_safe": True}
    unsafe_cheap = {"design_id": "d_unsafe", "cost_inr": 100000.0, "discomfort": 1.0, "safety_status": "REFUSED", "is_safe": False}

    # Unsafe design cannot dominate safe design even if cheaper and lower discomfort
    assert pareto_dominates(unsafe_cheap, safe_expensive) is False
    # Safe design dominates unsafe design due to safety priority
    assert pareto_dominates(safe_expensive, unsafe_cheap) is True

    # When extracting Pareto frontier, unsafe designs are strictly excluded
    candidates = [safe_expensive, unsafe_cheap]
    frontier, feasible = extract_pareto_frontier(candidates)
    frontier_ids = [d["design_id"] for d in frontier]

    assert "d_unsafe" not in frontier_ids
    assert "d_safe" in frontier_ids


def test_budget_filter_zero_feasible():
    """Test 7: Budget interaction filtering.

    When user enters a budget below all candidates:
      - Returns exactly 0 feasible designs.
      - Does NOT invent fictional designs.
      - Does NOT silently increase the budget.
    """
    candidates = [
        {"design_id": "d1", "cost_inr": 200000.0, "discomfort": 8.0, "is_safe": True},
        {"design_id": "d2", "cost_inr": 300000.0, "discomfort": 4.0, "is_safe": True},
        {"design_id": "d3", "cost_inr": 400000.0, "discomfort": 2.0, "is_safe": True},
    ]

    # Impossibly low budget: ₹1,50,000
    affordable = filter_by_budget(candidates, max_budget_inr=150000.0)
    assert len(affordable) == 0

    frontier, feasible = extract_pareto_frontier(candidates, max_budget_inr=150000.0)
    assert len(frontier) == 0
    assert len(feasible) == 0

    # Feasible budget: ₹2,50,000 (only d1 is affordable)
    frontier_250, feasible_250 = extract_pareto_frontier(candidates, max_budget_inr=250000.0)
    assert len(frontier_250) == 1
    assert frontier_250[0]["design_id"] == "d1"


def test_comfort_hours_ratio_derivation():
    """Test 8: Automatically derives discomfort from comfort_hours_ratio when explicit discomfort is omitted."""
    # comfort_hours_ratio = 0.80 => discomfort_hours = 24 * (1 - 0.8) = 4.8
    cand_1 = {"design_id": "c1", "cost_inr": 200000.0, "comfort_hours_ratio": 0.80, "is_safe": True}
    # comfort_hours_ratio = 0.50 => discomfort_hours = 24 * (1 - 0.5) = 12.0
    cand_2 = {"design_id": "c2", "cost_inr": 300000.0, "comfort_hours_ratio": 0.50, "is_safe": True}

    assert pareto_dominates(cand_1, cand_2) is True
    assert pareto_dominates(cand_2, cand_1) is False
