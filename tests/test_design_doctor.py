"""Comprehensive test suite for Phase 6: Budget-Constrained Optimization & Design Doctor.

Verifies the 8 mandatory Phase 6 test scenarios:
  1. baseline evaluation & diagnosis
  2. one retrofit
  3. multiple retrofits
  4. budget exceeded
  5. no feasible retrofit
  6. unsafe retrofit
  7. estimated cost
  8. sourced cost
"""

import pytest
from engine.design_doctor import (
    compute_degrees_per_1000_inr,
    generate_candidate_retrofits,
    diagnose_and_prescribe_retrofits,
)
from engine.types import Design, Layer, Opening
from api.weather import load_fallback_csv


@pytest.fixture
def weather_series():
    return load_fallback_csv()


@pytest.fixture
def baseline_shelter():
    """Typical uninsulated stone masonry shelter in Leh (3,500m)."""
    return Design(
        orientation_deg=180.0,
        walls=(Layer(material_id="stone_masonry", thickness_m=0.30),),
        roof=(Layer(material_id="dense_concrete", thickness_m=0.15),),
        floor=(Layer(material_id="stone_masonry", thickness_m=0.10),),
        openings=(
            Opening(facing="south", area_m2=3.0, glazing_id="single_glass", night_shutter=False),
        ),
        ach=0.80,
        roof_emissivity=0.90,
        night_shutter=False,
        length_m=6.0,
        width_m=4.0,
        height_m=2.6,
    )


def test_01_baseline_evaluation(baseline_shelter, weather_series):
    """Test 1: Baseline existing shelter simulation and weakness diagnosis."""
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=50000.0,
        opts={"altitude_m": 3500.0},
    )

    assert "current_condition" in res
    assert "diagnosis" in res
    cond = res["current_condition"]
    assert cond["t_in_min_c"] is not None
    assert cond["hours_below_health_threshold"] >= 0
    assert cond["heat_loss_kwh"] > 0

    diag = res["diagnosis"]
    assert "dominant_weakness" in diag
    assert diag["dominant_weakness"] in ("walls", "glazing", "roof", "infiltration")
    assert diag["dominant_pct"] > 0


def test_02_one_retrofit():
    """Test 2: Single retrofit calculation and efficiency metric."""
    delta_t = 3.5  # °C lift
    cost = 2500.0  # ₹2,500
    # degrees_per_1000_inr = delta_t / (cost / 1000.0) = 3.5 / 2.5 = 1.40
    eff = compute_degrees_per_1000_inr(delta_t, cost)
    assert eff == 1.40


def test_03_multiple_retrofits_ranking(baseline_shelter, weather_series):
    """Test 3: Multiple retrofits sorted strictly descending by degrees_per_1000_inr

    with mathematically exact cumulative cost and cumulative minimum temperature.
    """
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=100000.0,
        opts={"altitude_m": 3500.0},
    )

    interventions = res["interventions"]
    assert len(interventions) >= 3

    # Verify descending sort on degrees_per_1000_inr
    ratios = [item["degrees_per_1000_inr"] for item in interventions]
    assert ratios == sorted(ratios, reverse=True)

    # Verify cumulative cost monotonicity
    cum_costs = [item["cumulative_cost_inr"] for item in interventions]
    assert cum_costs == sorted(cum_costs)
    assert cum_costs[0] == interventions[0]["cost_inr"]

    # Verify cumulative t_min rises monotonically
    base_t_min = res["baseline"]["t_in_min_c"]
    cum_tmins = [item["cumulative_t_min_c"] for item in interventions]
    for idx, item in enumerate(interventions):
        expected_cum_t = round(base_t_min + sum(i["delta_t_min_c"] for i in interventions[:idx + 1]), 2)
        assert abs(cum_tmins[idx] - expected_cum_t) < 0.05


def test_04_budget_exceeded(baseline_shelter, weather_series):
    """Test 4: Budget cutoff correctly segregates feasible vs budget-exceeded interventions."""
    # Set a tight budget of ₹5,000
    tight_budget = 5000.0
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=tight_budget,
        opts={"altitude_m": 3500.0},
    )

    within_budget_count = res["within_budget_count"]
    interventions = res["interventions"]

    assert within_budget_count < len(interventions)
    assert within_budget_count > 0

    for idx, item in enumerate(interventions):
        if idx < within_budget_count:
            assert item["within_budget"] is True
            assert item["cumulative_cost_inr"] <= tight_budget
        else:
            assert item["within_budget"] is False
            assert item["cumulative_cost_inr"] > tight_budget

    cost_summary = res["cost_summary"]
    assert cost_summary["is_budget_exceeded"] is True
    assert cost_summary["total_feasible_cost_inr"] <= tight_budget


def test_05_no_feasible_retrofit(baseline_shelter, weather_series):
    """Test 5: When budget is lower than all candidate costs, returns 0 feasible retrofits

    without creating fictional designs or silently shifting budget.
    """
    # Impossibly low budget: ₹100
    zero_budget = 100.0
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=zero_budget,
        opts={"altitude_m": 3500.0},
    )

    assert res["within_budget_count"] == 0
    cost_summary = res["cost_summary"]
    assert cost_summary["feasible_count"] == 0
    assert cost_summary["is_zero_feasible"] is True
    assert cost_summary["total_feasible_cost_inr"] == 0

    # Confirm no fictional design was returned as affordable
    for item in res["interventions"]:
        assert item["within_budget"] is False


def test_06_unsafe_retrofit_disqualification(baseline_shelter, weather_series):
    """Test 6: Over-sealing below 0.35 ACH with combustion heater is flagged REFUSED

    and is strictly barred from the recommended pathway.
    """
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=50000.0,
        opts={"altitude_m": 3500.0},
        heater_type="unflued_combustion",  # Kerosene / bukhari combustion heater
    )

    safety = res["safety_assessment"]
    assert safety["refused_unsafe_count"] > 0

    # Ensure none of the recommended interventions are unsafe
    for item in res["interventions"]:
        assert item["is_safe"] is True
        assert item["safety_status"] == "SAFE"

    # Verify the unsafe detail explains CO hazard
    unsafe_items = safety["unsafe_details"]
    assert any("0.35 ACH" in u["hazard"] for u in unsafe_items)


def test_07_estimated_cost_basis(baseline_shelter, weather_series):
    """Test 7: Empirical assemblies (e.g. weather-stripping, night shutters) are tagged 'estimate'

    and never falsely marked as 'sourced'.
    """
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=50000.0,
        opts={"altitude_m": 3500.0},
    )

    interventions = res["interventions"]
    estimate_items = [i for i in interventions if i["affected_component"] in ("glazing", "infiltration")]

    assert len(estimate_items) > 0
    for item in estimate_items:
        if "weather_stripping" in item["id"] or "night_shutter" in item["id"]:
            assert item["cost_basis"] == "estimate"
            assert item["cost_basis"] != "sourced"


def test_08_sourced_cost_basis(baseline_shelter, weather_series):
    """Test 8: Materials with official CPWD DSR 2023 rates (e.g. EPS insulation, roof coating)

    are tagged 'sourced'.
    """
    res = diagnose_and_prescribe_retrofits(
        existing=baseline_shelter,
        weather_series=weather_series,
        budget_inr=50000.0,
        opts={"altitude_m": 3500.0},
    )

    interventions = res["interventions"]
    sourced_items = [i for i in interventions if "wall_eps" in i["id"] or "roof_eps" in i["id"] or "low_e" in i["id"]]

    assert len(sourced_items) > 0
    for item in sourced_items:
        assert item["cost_basis"] == "sourced"
