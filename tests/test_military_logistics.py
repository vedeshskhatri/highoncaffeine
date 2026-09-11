"""
Unit tests for engine.military_logistics
Verifies tactical logistics calculations for DRDO forward high-altitude post shelter deployments.
"""

import pytest
from engine.military_logistics import (
    calculate_military_logistics,
    FORWARD_DELIVERED_COST_PER_LITRE_INR,
    COMMERCIAL_BASE_COST_PER_LITRE_INR,
    HELI_SORTIE_CAPACITY_LITRES,
    CONVOY_TRUCK_CAPACITY_LITRES,
)


def test_military_logistics_basic_calculation():
    """Verify standard 180-day winter isolation calculations with passive shelter backup heat."""
    res = calculate_military_logistics(
        kerosene_litres_per_night=1.0,
        winter_days=180,
        occupants=8,
        post_altitude_m=3500.0,
    )
    
    assert res["winter_days"] == 180
    assert res["occupants"] == 8
    assert res["total_winter_fuel_litres"] == 180.0
    assert res["total_fuel_mass_kg"] == 144.0
    assert res["delivered_defense_cost_inr"] == 180.0 * FORWARD_DELIVERED_COST_PER_LITRE_INR
    assert res["commercial_base_cost_inr"] == 180.0 * COMMERCIAL_BASE_COST_PER_LITRE_INR
    assert res["logistics_overhead_inr"] == res["delivered_defense_cost_inr"] - res["commercial_base_cost_inr"]
    
    # Baseline comparison (22 L/night uninsulated shelter)
    assert res["baseline_uninsulated_litres"] == 22.0 * 180
    assert res["fuel_saved_litres"] == (22.0 * 180) - 180.0
    assert res["defense_budget_saved_inr"] > 0
    assert res["heli_sorties_saved"] > 0
    assert res["convoy_trucks_saved"] > 0
    assert 0 <= res["tactical_risk_reduction_score"] <= 100


def test_military_logistics_zero_fuel():
    """Verify fully autonomous net-zero thermal shelter with 0 backup kerosene."""
    res = calculate_military_logistics(
        kerosene_litres_per_night=0.0,
        winter_days=180,
        occupants=10,
        post_altitude_m=4200.0,
    )
    
    assert res["total_winter_fuel_litres"] == 0.0
    assert res["delivered_defense_cost_inr"] == 0.0
    assert res["heli_sorties_needed"] == 0.0
    assert res["convoy_trucks_needed"] == 0.0
    assert res["fuel_saved_litres"] == 22.0 * 180
    assert res["defense_budget_saved_inr"] == (22.0 * 180) * 2400.0
