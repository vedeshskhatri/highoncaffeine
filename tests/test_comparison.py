"""
Tests for Phase 4: Design Comparison Engine & API endpoints.
Verifies all 5 explicit requirements from Phase 4 specification:
  1. equal designs
  2. different designs
  3. missing cost (with clear basis: SOURCED, ESTIMATE, UNAVAILABLE)
  4. safety refusal
  5. unavailable metrics
"""

import json
from pathlib import Path
from typing import Any, Dict
import pytest
from fastapi.testclient import TestClient

from api.main import app
from engine.comparison import (
    determine_cost_and_basis,
    compute_utopia_distance,
    evaluate_design_comparison,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def standard_design_payload() -> Dict[str, Any]:
    """Standard valid shelter configuration."""
    return {
        "location": {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        "weather": {"mode": "typical_day", "date": "2026-01-15", "hours": 24, "user_csv_id": None},
        "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180.0},
        "envelope": {
            "walls": [
                {"material": "mud_brick", "thickness_m": 0.30},
                {"material": "eps", "thickness_m": 0.05},
            ],
            "roof": [{"material": "dense_concrete", "thickness_m": 0.15}],
            "floor": [{"material": "dense_concrete", "thickness_m": 0.10}],
            "roof_emissivity": 0.90,
        },
        "openings": [
            {"facing": "south", "area_m2": 4.0, "glazing": "double_pane", "night_shutter": False}
        ],
        "ventilation": {"ach": 0.6, "heater_type": "none"},
        "occupancy": {"people": 8, "watts_per_person": 100},
        "ground": {"snow_cover": True, "albedo": None},
        "comfort": {"model": "imac", "health_threshold_c": 18.0},
        "simulation": {"timestep_s": 60, "spinup_days": 3},
    }


# ===========================================================================
# 1. Equal Designs Test
# ===========================================================================

def test_equal_designs(client, standard_design_payload):
    """Comparing identical designs produces tied metrics without division by zero."""
    payload = {
        "designs": [standard_design_payload, standard_design_payload],
        "design_names": ["Standard Base A", "Standard Base B"],
    }
    res = client.post("/compare", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert len(data["designs"]) == 2
    d1 = data["designs"][0]
    d2 = data["designs"][1]

    # Both designs must have identical metrics
    assert d1["t_in_min_c"] == d2["t_in_min_c"]
    assert d1["t_in_max_c"] == d2["t_in_max_c"]
    assert d1["comfort_hours_ratio"] == d2["comfort_hours_ratio"]
    assert d1["capital_cost_inr"] == d2["capital_cost_inr"]
    assert d1["safety_status"] == "SAFE"
    assert d2["safety_status"] == "SAFE"

    # Utopia distance must be identical and non-negative
    dist1 = d1["utopia_distance"]
    dist2 = d2["utopia_distance"]
    assert dist1 is not None and dist2 is not None
    assert abs(dist1 - dist2) < 1e-4

    # Both designs have 24 hourly values
    assert len(data["hourly_series"]["design_1"]) == 24
    assert len(data["hourly_series"]["design_2"]) == 24


# ===========================================================================
# 2. Different Designs Test (Multi-Criteria Rankings)
# ===========================================================================

def test_different_designs(client, standard_design_payload):
    """
    Compares 3 distinct designs:
      1. Low-cost uninsulated (cheap, cold)
      2. Super-insulated with night shutter (high comfort, high cost)
      3. Balanced intermediate design
    Verifies Best Comfort, Lowest Cost, and Best Trade-off are assigned correctly.
    """
    # Design 1: Uninsulated mud brick (low cost, cold)
    d1 = json.loads(json.dumps(standard_design_payload))
    d1["envelope"]["walls"] = [{"material": "mud_brick", "thickness_m": 0.20}]

    # Design 2: High insulation (0.20m EPS wall + 0.15m EPS roof + night shutter, warmest, high cost)
    d2 = json.loads(json.dumps(standard_design_payload))
    d2["envelope"]["walls"] = [
        {"material": "mud_brick", "thickness_m": 0.30},
        {"material": "eps", "thickness_m": 0.20},
    ]
    d2["envelope"]["roof"] = [
        {"material": "dense_concrete", "thickness_m": 0.15},
        {"material": "eps", "thickness_m": 0.15},
    ]
    d2["openings"][0]["night_shutter"] = True

    # Design 3: Balanced design (0.075m EPS, no shutter)
    d3 = json.loads(json.dumps(standard_design_payload))
    d3["envelope"]["walls"] = [
        {"material": "mud_brick", "thickness_m": 0.30},
        {"material": "eps", "thickness_m": 0.075},
    ]

    payload = {
        "designs": [d1, d2, d3],
        "design_names": ["Bare Mud Brick", "Super Insulated", "Balanced Spec"],
    }
    res = client.post("/compare", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    designs = data["designs"]
    rankings = data["rankings"]

    assert len(designs) == 3

    # Design 1 should be cheapest
    assert rankings["lowest_cost_id"] == "design_1"
    assert designs[0]["is_lowest_cost"] is True

    # Design 2 should have best overnight warmth / comfort
    assert rankings["best_comfort_id"] == "design_2"
    assert designs[1]["is_best_comfort"] is True
    assert designs[1]["t_in_min_c"] > designs[0]["t_in_min_c"]

    # Best Trade-Off exists and has minimum Utopia distance
    tradeoff_id = rankings["best_tradeoff_id"]
    assert tradeoff_id in ["design_1", "design_2", "design_3"]
    assert any(d["is_best_tradeoff"] for d in designs)

    distances = rankings["tradeoff_distances"]
    best_dist = distances[tradeoff_id]
    for other_id, dist in distances.items():
        assert dist >= best_dist


# ===========================================================================
# 3. Missing / Estimated Cost Basis Test
# ===========================================================================

def test_missing_and_estimated_cost_basis(client, standard_design_payload):
    """
    Verifies cost basis is transparently disclosed:
      - SOURCED: When materials have documented CPWD DSR citations.
      - ESTIMATE: When materials lack explicit cost citations.
      - UNAVAILABLE: When cost cannot be derived.
    """
    # 1. Sourced design (mud_brick, eps, dense_concrete all have CPWD DSR 2023 in materials.csv)
    sourced_des = json.loads(json.dumps(standard_design_payload))

    # 2. Design using straw bale (straw_bale has empty cost_source in materials.csv -> ESTIMATE)
    estimate_des = json.loads(json.dumps(standard_design_payload))
    estimate_des["envelope"]["walls"] = [
        {"material": "mud_brick", "thickness_m": 0.30},
        {"material": "straw_bale", "thickness_m": 0.15},
    ]

    res = client.post("/compare", json={
        "designs": [sourced_des, estimate_des],
        "design_names": ["Sourced Materials", "Straw Bale Estimate"],
    })
    assert res.status_code == 200, res.text
    data = res.json()

    d1 = data["designs"][0]
    d2 = data["designs"][1]

    assert d1["cost_basis"] == "SOURCED"
    assert d2["cost_basis"] == "ESTIMATE"
    assert d1["capital_cost_inr"] is not None
    assert d2["capital_cost_inr"] is not None

    # 3. Direct engine test for UNAVAILABLE cost basis
    cost, basis = determine_cost_and_basis(design=None, request_dict={})
    assert cost is None
    assert basis == "UNAVAILABLE"


# ===========================================================================
# 4. Safety Refusal Test
# ===========================================================================

def test_safety_refusal_handling(client, standard_design_payload):
    """
    Design that violates safety rules (ACH < 0.35 with combustion heater)
    must receive safety_status="REFUSED" and be disqualified from rankings.
    """
    safe_des = json.loads(json.dumps(standard_design_payload))
    safe_des["ventilation"] = {"ach": 0.6, "heater_type": "electric"}

    unsafe_des = json.loads(json.dumps(standard_design_payload))
    unsafe_des["ventilation"] = {"ach": 0.20, "heater_type": "unflued_combustion"}

    res = client.post("/compare", json={
        "designs": [safe_des, unsafe_des],
        "design_names": ["Safe Electric", "Dangerous Low-ACH Combustion"],
    })
    assert res.status_code == 200, res.text
    data = res.json()

    d1 = data["designs"][0]
    d2 = data["designs"][1]

    assert d1["safety_status"] == "SAFE"
    assert d2["safety_status"] == "REFUSED"
    assert d2["refusal_reason"] is not None
    assert "asphyxiation" in d2["refusal_reason"].lower() or "combustion" in d2["refusal_reason"].lower()

    # Unsafe design cannot win Best Comfort or Best Trade-Off
    rankings = data["rankings"]
    assert rankings["best_comfort_id"] == "design_1"
    assert rankings["best_tradeoff_id"] == "design_1"
    assert d2["is_best_comfort"] is False
    assert d2["is_best_tradeoff"] is False


# ===========================================================================
# 5. Unavailable Metrics Test
# ===========================================================================

def test_unavailable_metrics_gracefully_handled():
    """Missing or None metrics in raw simulation output do not crash evaluation."""
    raw_entries = [
        {
            "id": "design_1",
            "name": "Design 1",
            "request": {
                "envelope": {"walls": [{"material": "mud_brick", "thickness_m": 0.30}]},
                "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
                "ventilation": {"ach": 0.6},
            },
            "result": {
                "refused": False,
                # summary missing backup_heat and solar_gain
                "summary": {
                    "t_in_min_c": 2.5,
                    "t_in_max_c": 18.0,
                    "comfort_hours_ratio": 0.20,
                },
                "series": [],
            },
        },
        {
            "id": "design_2",
            "name": "Design 2",
            "request": {
                "envelope": {"walls": [{"material": "mud_brick", "thickness_m": 0.40}]},
                "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
                "ventilation": {"ach": 0.6},
            },
            "result": {
                "refused": False,
                "summary": {
                    "t_in_min_c": 3.8,
                    "t_in_max_c": 19.5,
                    "comfort_hours_ratio": 0.35,
                },
                "series": [],
            },
        },
    ]

    evaluated = evaluate_design_comparison(raw_entries)
    designs = evaluated["designs"]
    assert len(designs) == 2

    # Unavailable metrics are None without crashing
    assert designs[0]["heating_demand_litres"] is None
    assert designs[0]["heating_demand_kwh"] is None
    assert designs[0]["solar_gain_kwh"] is None

    # Available metrics are preserved
    assert designs[0]["t_in_min_c"] == 2.5
    assert designs[1]["t_in_min_c"] == 3.8
    assert evaluated["rankings"]["best_comfort_id"] == "design_2"


def test_design_count_boundaries(client, standard_design_payload):
    """Requires strictly 2 to 4 designs."""
    # 1 design -> 400
    res = client.post("/compare", json={"designs": [standard_design_payload]})
    assert res.status_code == 400
    assert "requires 2 to 4 designs" in res.json()["detail"]

    # 5 designs -> 400
    res = client.post("/compare", json={"designs": [standard_design_payload] * 5})
    assert res.status_code == 400
    assert "requires 2 to 4 designs" in res.json()["detail"]
