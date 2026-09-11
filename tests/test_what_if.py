"""
Tests for Phase 3: What-If Analysis Engine & API endpoints.
Verifies all 5 explicit requirements from Phase 3 specification:
  1. baseline unchanged (delta = 0.0)
  2. changed parameter produces changed request
  3. API response displayed correctly
  4. invalid input rejected (400 / validation error)
  5. missing metric handled correctly
"""

import json
from pathlib import Path
from typing import Any, Dict
import pytest
from fastapi.testclient import TestClient

from api.main import app
from engine.what_if import (
    SUPPORTED_VARIABLES,
    get_baseline_parameter_value,
    apply_parameter_change,
    compare_simulations,
)
from api.errors import UnknownMaterialError


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def baseline_request_payload() -> Dict[str, Any]:
    """Load valid standard baseline request fixture."""
    fixture_path = Path(__file__).parent.parent / "tests" / "fixtures" / "valid_request.json"
    if fixture_path.exists():
        with open(fixture_path) as f:
            return json.load(f)
    # Fallback standard request
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
# 1. Baseline Unchanged Test
# ===========================================================================

def test_baseline_unchanged_engine(baseline_request_payload):
    """Engine test: applying baseline's own value yields identical payload and 0 delta."""
    # 1. Wall thickness
    base_val = get_baseline_parameter_value(baseline_request_payload, "wall_thickness")
    assert base_val == 0.30
    mod_dict, warning = apply_parameter_change(baseline_request_payload, "wall_thickness", base_val)
    assert mod_dict["envelope"]["walls"][0]["thickness_m"] == base_val
    assert warning is None

    # Compare dummy summaries with identical numbers
    summary = {
        "t_in_min_c": 4.2,
        "t_in_max_c": 20.5,
        "comfort_hours_ratio": 0.45,
        "hours_below_health_threshold": 12,
        "solar_gain_kwh": 15.0,
        "total_heat_loss_kwh": 22.0,
        "backup_heat": {"peak_kw": 1.2, "hours": 6.0, "kerosene_litres_per_night": 1.5},
        "impact": {"cost_inr_per_year": 24000.0},
    }
    comp = compare_simulations(summary, summary, baseline_series=[], variant_series=[])
    delta = comp["delta"]
    assert delta["delta_t_in_min_c"] == 0.0
    assert delta["delta_t_in_max_c"] == 0.0
    assert delta["delta_comfort_hours_ratio"] == 0.0
    assert delta["delta_hours_below_health"] == 0
    assert delta["delta_solar_gain_kwh"] == 0.0
    assert delta["delta_heat_loss_kwh"] == 0.0
    assert delta["delta_annual_fuel_cost_inr"] == 0.0
    assert delta["simple_payback_years"] is None

    for k, m in comp["metrics"].items():
        if m["available"]:
            assert m["delta"] == 0 or m["delta"] == 0.0


def test_baseline_unchanged_api_endpoint(client, baseline_request_payload):
    """API test: POST /what-if with baseline value produces 0.0 delta across all metrics."""
    base_val = get_baseline_parameter_value(baseline_request_payload, "wall_thickness")
    payload = {
        "baseline": baseline_request_payload,
        "parameter": "wall_thickness",
        "value": base_val,
    }
    res = client.post("/what-if", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert not data["refused"]
    assert data["parameter"] == "wall_thickness"
    assert data["baseline_value"] == base_val
    assert data["variant_value"] == base_val

    # Deltas must be exactly zero
    assert data["delta"]["delta_t_in_min_c"] == 0.0
    assert data["delta"]["delta_t_in_max_c"] == 0.0
    assert data["delta"]["delta_comfort_hours_ratio"] == 0.0
    assert data["delta"]["delta_hours_below_health"] == 0
    assert data["delta"]["delta_solar_gain_kwh"] == 0.0
    assert data["delta"]["delta_heat_loss_kwh"] == 0.0

    # Hourly delta must be 24 zeros
    assert len(data["hourly_delta_t"]) == 24
    assert all(d == 0.0 for d in data["hourly_delta_t"])


# ===========================================================================
# 2. Changed Parameter Produces Changed Request
# ===========================================================================

def test_changed_parameter_produces_changed_request_all_variables(baseline_request_payload):
    """Verify modifying each supported variable changes only that variable in the request payload."""
    # 1. Wall thickness
    mod, _ = apply_parameter_change(baseline_request_payload, "wall_thickness", 0.45)
    assert mod["envelope"]["walls"][0]["thickness_m"] == 0.45
    assert mod["envelope"]["roof"][0]["thickness_m"] == baseline_request_payload["envelope"]["roof"][0]["thickness_m"]

    # 2. Roof thickness
    mod, _ = apply_parameter_change(baseline_request_payload, "roof_thickness", 0.25)
    assert mod["envelope"]["roof"][0]["thickness_m"] == 0.25
    assert mod["envelope"]["walls"][0]["thickness_m"] == baseline_request_payload["envelope"]["walls"][0]["thickness_m"]

    # 3. Insulation (EPS)
    mod, _ = apply_parameter_change(baseline_request_payload, "insulation", 0.10)
    # Second layer is EPS
    eps_layer = [l for l in mod["envelope"]["walls"] if l["material"] == "eps"][0]
    assert eps_layer["thickness_m"] == 0.10

    # 4. Glazing area
    mod, _ = apply_parameter_change(baseline_request_payload, "glazing_area", 6.5)
    south_op = [op for op in mod["openings"] if "south" in op["facing"].lower()][0]
    assert south_op["area_m2"] == 6.5

    # 5. Orientation
    mod, _ = apply_parameter_change(baseline_request_payload, "orientation", 165.0)
    assert mod["geometry"]["orientation_deg"] == 165.0

    # 6. ACH
    mod, _ = apply_parameter_change(baseline_request_payload, "ach", 1.2)
    assert mod["ventilation"]["ach"] == 1.2

    # 7. Shading (night shutter)
    mod, _ = apply_parameter_change(baseline_request_payload, "shading", True)
    south_op = [op for op in mod["openings"] if "south" in op["facing"].lower()][0]
    assert south_op["night_shutter"] is True

    # 8. Material
    mod, _ = apply_parameter_change(baseline_request_payload, "material", "stone_masonry")
    assert mod["envelope"]["walls"][0]["material"] == "stone_masonry"


# ===========================================================================
# 3. API Response Displayed Correctly
# ===========================================================================

def test_api_what_if_variables_endpoint(client):
    """GET /what-if/variables returns all 8 supported variables with units and ranges."""
    res = client.get("/what-if/variables")
    assert res.status_code == 200
    data = res.json()
    assert "variables" in data
    vars_dict = data["variables"]

    expected_vars = [
        "wall_thickness",
        "roof_thickness",
        "insulation",
        "glazing_area",
        "orientation",
        "ach",
        "shading",
        "material",
    ]
    for ev in expected_vars:
        assert ev in vars_dict
        v_spec = vars_dict[ev]
        assert "label" in v_spec
        assert "unit" in v_spec
        assert "description" in v_spec
        assert ("min" in v_spec and "max" in v_spec) or ("options" in v_spec)


def test_api_what_if_calculation_response_content(client, baseline_request_payload):
    """POST /what-if returns required metrics: peak Tin, min Tin, comfort hours, heating demand."""
    payload = {
        "baseline": baseline_request_payload,
        "parameter": "wall_thickness",
        "value": 0.45,
    }
    res = client.post("/what-if", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["parameter"] == "wall_thickness"
    assert data["parameter_label"] == "Wall Thickness"
    assert data["unit"] == "m"
    assert data["baseline_value"] == 0.30
    assert data["variant_value"] == 0.45

    # Check required display metrics
    metrics = data["metrics"]
    required_metrics = [
        "peak_indoor_temp_c",
        "min_indoor_temp_c",
        "comfort_hours_ratio",
        "hours_below_health",
        "heating_demand_litres",
        "heating_demand_kwh",
    ]
    for rm in required_metrics:
        assert rm in metrics
        m = metrics[rm]
        assert "baseline" in m
        assert "variant" in m
        assert "delta" in m
        assert "unit" in m
        assert m["available"] is True

    # 24-hour diurnal delta array
    assert "hourly_delta_t" in data
    assert len(data["hourly_delta_t"]) == 24

    # Summaries
    assert "baseline_summary" in data
    assert "variant_summary" in data
    assert data["variant_summary"]["t_in_min_c"] is not None


# ===========================================================================
# 4. Invalid Input Rejected
# ===========================================================================

def test_invalid_input_unsupported_parameter(client, baseline_request_payload):
    """Unknown parameter name is rejected with 400 Bad Request."""
    payload = {
        "baseline": baseline_request_payload,
        "parameter": "window_tint",
        "value": 0.5,
    }
    res = client.post("/what-if", json=payload)
    assert res.status_code == 400
    assert "Unsupported what-if parameter" in res.json()["detail"]


def test_invalid_input_out_of_range_values(client, baseline_request_payload):
    """Values outside schema-derived bounds are rejected with 400."""
    # Negative wall thickness
    res = client.post("/what-if", json={
        "baseline": baseline_request_payload,
        "parameter": "wall_thickness",
        "value": -0.10,
    })
    assert res.status_code == 400
    assert "outside allowed range" in res.json()["detail"]

    # Wall thickness > 1.50 m
    res = client.post("/what-if", json={
        "baseline": baseline_request_payload,
        "parameter": "wall_thickness",
        "value": 2.50,
    })
    assert res.status_code == 400
    assert "outside allowed range" in res.json()["detail"]

    # Orientation > 360 deg
    res = client.post("/what-if", json={
        "baseline": baseline_request_payload,
        "parameter": "orientation",
        "value": 450.0,
    })
    assert res.status_code == 400
    assert "outside allowed range" in res.json()["detail"]

    # Infiltration ACH < 0.10
    res = client.post("/what-if", json={
        "baseline": baseline_request_payload,
        "parameter": "ach",
        "value": 0.05,
    })
    assert res.status_code == 400
    assert "outside allowed range" in res.json()["detail"]


def test_invalid_input_unknown_material(client, baseline_request_payload):
    """Material ID not in library is rejected with 400."""
    res = client.post("/what-if", json={
        "baseline": baseline_request_payload,
        "parameter": "material",
        "value": "vibranium_sheet",
    })
    assert res.status_code == 400
    assert "does not exist in library" in res.json()["detail"] or "Unknown material" in res.json()["detail"]


def test_safety_interlock_warning_combustion_low_ach(baseline_request_payload):
    """Infiltration below 0.35 ACH with unflued heater produces explicit safety caution."""
    combustion_base = dict(baseline_request_payload)
    combustion_base["ventilation"] = {"ach": 0.6, "heater_type": "unflued_combustion"}
    _, warning = apply_parameter_change(combustion_base, "ach", 0.20)
    assert warning is not None
    assert "SAFETY CAUTION" in warning
    assert "0.35" in warning


# ===========================================================================
# 5. Missing Metric Handled Correctly
# ===========================================================================

def test_missing_metric_handled_correctly():
    """Engine test: missing/null metric in summaries returns available=False without crashing."""
    incomplete_baseline = {
        "t_in_min_c": 5.0,
        "t_in_max_c": 19.0,
        "comfort_hours_ratio": 0.30,
        "hours_below_health_threshold": 14,
        # solar_gain_kwh missing
        # total_heat_loss_kwh missing
        # backup_heat missing
        # impact missing
    }
    incomplete_variant = {
        "t_in_min_c": 6.5,
        "t_in_max_c": 20.0,
        "comfort_hours_ratio": 0.40,
        "hours_below_health_threshold": 10,
    }

    comp = compare_simulations(incomplete_baseline, incomplete_variant)
    metrics = comp["metrics"]

    # Basic thermal metrics available
    assert metrics["min_indoor_temp_c"]["available"] is True
    assert metrics["min_indoor_temp_c"]["delta"] == 1.5
    assert metrics["peak_indoor_temp_c"]["available"] is True
    assert metrics["peak_indoor_temp_c"]["delta"] == 1.0

    # Missing metrics marked unavailable and values are None
    assert metrics["heating_demand_litres"]["available"] is False
    assert metrics["heating_demand_litres"]["baseline"] is None
    assert metrics["heating_demand_litres"]["variant"] is None
    assert metrics["heating_demand_litres"]["delta"] is None

    assert metrics["heating_demand_kwh"]["available"] is False
    assert metrics["solar_gain_kwh"]["available"] is False
    assert metrics["total_heat_loss_kwh"]["available"] is False
    assert metrics["annual_fuel_cost_inr"]["available"] is False

    # Contract delta object should default unavailable numerical values gracefully
    delta = comp["delta"]
    assert delta["delta_t_in_min_c"] == 1.5
    assert delta["delta_t_in_max_c"] == 1.0
    assert delta["delta_solar_gain_kwh"] == 0.0
    assert delta["delta_heat_loss_kwh"] == 0.0
    assert delta["delta_annual_fuel_cost_inr"] == 0.0
    assert delta["simple_payback_years"] is None
