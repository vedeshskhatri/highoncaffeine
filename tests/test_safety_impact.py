"""
Unit tests for engine/safety.py and engine/impact.py.
"""

import pytest
from engine.safety import check as safety_check, ACH_MIN_COMBUSTION
from engine.impact import (
    kerosene_litres,
    kerosene_cost_inr,
    co2_emissions_kg,
    backup_heat_sizing,
    rank_retrofits,
    payback_period_years,
    KEROSENE_ENERGY_MJ_L,
    KEROSENE_CO2_KG_L,
    KEROSENE_COST_SIACHEN_INR,
)


def test_safety_interlock_combustion_refusal():
    """Verify that unflued combustion heaters are strictly refused below 0.35 ACH."""
    res_unsafe = safety_check({"ach": 0.30}, heater_type="unflued_combustion")
    assert res_unsafe.refused is True
    assert "below the safe minimum" in res_unsafe.reason
    assert "Carbon monoxide" in res_unsafe.reason

    # Electric heaters are safe at low ACH
    res_electric = safety_check({"ach": 0.30}, heater_type="electric")
    assert res_electric.refused is False
    assert res_electric.reason is None

    # Adequate ventilation permits combustion
    res_adequate = safety_check({"ach": 0.40}, heater_type="unflued_combustion")
    assert res_adequate.refused is False


def test_impact_translation_exact_arithmetic():
    """Verify energy deficit to fuel volume, cost, and CO2 translation."""
    energy_kwh = 100.0
    eta = 0.85
    litres = kerosene_litres(energy_kwh, eta)

    # 100 kWh = 360 MJ. 360 / (37 * 0.85) = 11.4467 L
    assert pytest.approx(litres, rel=1e-4) == 11.4467

    cost = kerosene_cost_inr(litres, cost_per_litre=2400.0)
    assert pytest.approx(cost, rel=1e-4) == 11.4467 * 2400.0

    co2 = co2_emissions_kg(litres, emission_factor_kg_l=2.5)
    assert pytest.approx(co2, rel=1e-4) == 11.4467 * 2.5


def test_retrofit_ranking_cost_effectiveness_descending():
    """Verify that retrofit ranking sorts strictly descending by degrees_per_1000_inr."""
    interventions = [
        {"label": "Intervention A (low cost high gain)", "delta_t_min_c": 5.0, "cost_inr": 1000, "cost_basis": "estimate"},
        {"label": "Intervention B (high cost low gain)", "delta_t_min_c": 1.0, "cost_inr": 10000, "cost_basis": "sourced"},
        {"label": "Intervention C (medium)", "delta_t_min_c": 3.0, "cost_inr": 2000, "cost_basis": "derived"},
    ]
    res = rank_retrofits(
        baseline_t_min_c=2.0,
        baseline_hours_below_health=18,
        interventions=interventions,
        budget_inr=3500,
    )

    ranks = res["interventions"]
    assert len(ranks) == 3
    assert ranks[0]["label"] == "Intervention A (low cost high gain)"
    assert ranks[0]["degrees_per_1000_inr"] == 5.0

    assert ranks[1]["label"] == "Intervention C (medium)"
    assert ranks[1]["degrees_per_1000_inr"] == 1.5

    assert ranks[2]["label"] == "Intervention B (high cost low gain)"
    assert ranks[2]["degrees_per_1000_inr"] == 0.1

    assert res["within_budget_count"] == 2  # A (1000) + C (2000) = 3000 <= 3500
