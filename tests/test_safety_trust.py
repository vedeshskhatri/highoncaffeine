"""
Unit and integration tests for Phase 9 — Trust and Safety UI.
Verifies:
  1. Safe design (adequate ventilation with combustion or any safe heater)
  2. Unsafe design (unflued combustion heater below 0.35 ACH)
  3. Electric heater (safe at low ACH)
  4. Combustion heater (boundary behavior at 0.35 ACH and flued vs unflued)
  5. Missing safety data handling (graceful safe defaults)
  6. Backend error handling
  7. Data Provenance registry and GET /provenance contract invariants
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app
from engine.safety import check as safety_check, ACH_MIN_COMBUSTION, SafetyResult
from engine.provenance import (
    get_full_provenance_registry,
    VALID_STATUSES,
    ESTIMATE_BASIS,
    DERIVED_BASIS,
)

client = TestClient(app)


@pytest.fixture
def standard_design_payload():
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



# ============================================================================
# 1. Safe Design Tests
# ============================================================================

def test_safe_design_adequate_ventilation():
    """Adequate ventilation (>= 0.35 ACH) permits unflued combustion heater."""
    res = safety_check({"ach": 0.40}, heater_type="unflued_combustion")
    assert res.refused is False
    assert res.reason is None
    assert res.actionable_constraint is None


def test_safe_design_simulate_endpoint(standard_design_payload):
    """Full /simulate pipeline returns refused=False for a safe configuration."""
    payload = dict(standard_design_payload)
    payload["ventilation"] = {"ach": 0.50, "heater_type": "electric"}

    resp = client.post("/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["refused"] is False
    assert data["refusal_reason"] is None


# ============================================================================
# 2. Unsafe Design Tests
# ============================================================================

def test_unsafe_design_low_ach_combustion():
    """Unflued combustion with ACH < 0.35 is strictly refused with exact reason and actionable constraint."""
    res = safety_check({"ach": 0.20}, heater_type="unflued_combustion")
    assert res.refused is True
    assert "Ventilation 0.20 ACH is below the safe minimum (0.35 ACH)" in res.reason
    assert "Carbon monoxide asphyxiation risk" in res.reason
    assert res.actionable_constraint is not None
    assert "Increase ventilation to at least 0.35 ACH or specify a flued stove or electric heater" in res.actionable_constraint


def test_unsafe_design_simulate_endpoint(standard_design_payload):
    """Full /simulate pipeline refuses unsafe design with status 200 refusal response."""
    payload = dict(standard_design_payload)
    payload["ventilation"] = {"ach": 0.20, "heater_type": "unflued_combustion"}

    resp = client.post("/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["refused"] is True
    assert "0.20 ACH is below the safe minimum" in data["refusal_reason"]
    assert data["actionable_constraint"] is not None
    assert "Ventilation requirement not satisfied" in data["actionable_constraint"]
    assert data["safety_status"] == "REFUSED"


# ============================================================================
# 3. Electric Heater Tests
# ============================================================================

def test_electric_heater_safe_at_low_ach():
    """Electric heaters do not consume oxygen or emit combustion gases, safe at any ACH."""
    res = safety_check({"ach": 0.05}, heater_type="electric")
    assert res.refused is False
    assert res.reason is None


def test_electric_heater_various_formats():
    """Case-insensitive and whitespace handling for electric heater."""
    assert safety_check({"ach": 0.10}, heater_type=" ELECTRIC ").refused is False
    assert safety_check({"ach": 0.10}, heater_type="Electric").refused is False


# ============================================================================
# 4. Combustion Heater Boundary & Types Tests
# ============================================================================

def test_combustion_heater_boundary_threshold():
    """Strict boundary checking at ACH_MIN_COMBUSTION = 0.35."""
    # Just below floor -> refused
    res_below = safety_check({"ach": 0.34}, heater_type="unflued_combustion")
    assert res_below.refused is True

    # Exactly at floor -> safe
    res_exact = safety_check({"ach": 0.35}, heater_type="unflued_combustion")
    assert res_exact.refused is False

    # Above floor -> safe
    res_above = safety_check({"ach": 0.36}, heater_type="unflued_combustion")
    assert res_above.refused is False


def test_flued_stove_combustion_safe():
    """Flued stoves vent flue gases through a chimney, safe even at low whole-building ACH."""
    res = safety_check({"ach": 0.20}, heater_type="flued_stove")
    assert res.refused is False
    assert res.reason is None


# ============================================================================
# 5. Missing Safety Data Tests
# ============================================================================

def test_missing_safety_data_handling():
    """Handles None, missing keys, and empty dictionaries safely without crashing."""
    # Missing design dict
    res1 = safety_check(None, heater_type="none")
    assert res1.refused is False

    # Empty design dict with electric heater
    res2 = safety_check({}, heater_type="electric")
    assert res2.refused is False

    # Empty design dict with unflued combustion heater fails safe
    res3 = safety_check({}, heater_type="unflued_combustion")
    assert res3.refused is True
    assert "0.00 ACH is below the safe minimum" in res3.reason

    # None heater_type defaults to "none"
    res4 = safety_check({"ach": 0.20}, heater_type=None)
    assert res4.refused is False


# ============================================================================
# 6. Backend Error Handling Tests
# ============================================================================

def test_backend_error_handling_invalid_weather(standard_design_payload):
    """Invalid user_csv mode without ID returns clean HTTP 422 or 400 error."""
    payload = dict(standard_design_payload)
    payload["weather"] = {"mode": "user_csv", "user_csv_id": None}

    resp = client.post("/simulate", json=payload)
    assert resp.status_code == 422


# ============================================================================
# 7. Data Provenance Registry Tests
# ============================================================================

def test_full_provenance_registry_structure():
    """Verify complete provenance registry has all 5 categories and respects invariants."""
    reg = get_full_provenance_registry()
    required_cats = {
        "physical_constants",
        "material_properties",
        "weather",
        "costs",
        "validation_measurements",
    }
    assert set(reg.keys()) == required_cats

    for cat_name, items in reg.items():
        assert len(items) > 0, f"Category {cat_name} must not be empty"
        for item in items:
            assert "item" in item and item["item"]
            assert "source" in item and item["source"]
            assert "status" in item and item["status"] in VALID_STATUSES
            assert "basis" in item and item["basis"]

            # Strict basis invariants
            if item["status"] == "ESTIMATE":
                assert item["basis"] == ESTIMATE_BASIS, f"Estimate basis violation in {item['item']}"
            elif item["status"] == "DERIVED":
                assert item["basis"] == DERIVED_BASIS, f"Derived basis violation in {item['item']}"


def test_get_provenance_api_endpoint():
    """Verify GET /provenance API endpoint returns valid response matching schema."""
    resp = client.get("/provenance")
    assert resp.status_code == 200
    data = resp.json()

    assert "physical_constants" in data
    assert "material_properties" in data
    assert "weather" in data
    assert "costs" in data
    assert "validation_measurements" in data

    # Check physical constants
    stefan = next((x for x in data["physical_constants"] if "Stefan-Boltzmann" in x["item"]), None)
    assert stefan is not None
    assert stefan["status"] == "SOURCED"
    assert "CODATA" in stefan["source"]

    # Check that estimates in costs have the invariant basis
    siachen = next((x for x in data["costs"] if "Siachen" in x["item"]), None)
    assert siachen is not None
    assert siachen["status"] == "ESTIMATE"
    assert siachen["basis"] == "Estimate — source unavailable."
