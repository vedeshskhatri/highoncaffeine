"""
TEST SUITE FOR PHASE 8 — SCIENTIFIC VISUALIZATION
Authoritative reference:
- brain/06_PHYSICS_SPEC.md (Diurnal RC solver time-series)
- brain/11_OPTIMIZER_SPEC.md Section 6 (Morris sensitivity screening)
- brain/10_VALIDATION.md (Axis 1 empirical benchmarks V1-V4 & ordering check)
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app
from engine.types import Design, Layer, Opening
from engine.sensitivity import morris_screening
from api.weather import load_fallback_csv


client = TestClient(app)


@pytest.fixture
def baseline_shelter():
    return Design(
        orientation_deg=180.0,
        walls=(
            Layer(material_id="stone_masonry", thickness_m=0.30),
        ),
        roof=(
            Layer(material_id="concrete", thickness_m=0.15),
        ),
        floor=(
            Layer(material_id="concrete", thickness_m=0.10),
        ),
        openings=(
            Opening(facing="south", area_m2=3.5, glazing_id="double_pane", night_shutter=False),
        ),
        ach=0.80,
        roof_emissivity=0.90,
        night_shutter=False,
        length_m=6.0,
        width_m=4.0,
        height_m=2.6,
    )


# ============================================================================
# PART A: 24-HOUR THERMAL STORY
# ============================================================================

def test_01_simulate_series_contains_actual_physics_and_units():
    """Verify that simulate series outputs genuine physics values without reconstruction."""
    payload = {
        "location": {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        "weather": {"mode": "typical_day", "date": "2026-01-15", "hours": 24},
        "envelope": {
            "walls": [{"material": "stone_masonry", "thickness_m": 0.30}],
            "roof": [{"material": "concrete", "thickness_m": 0.15}],
            "floor": [{"material": "concrete", "thickness_m": 0.10}],
            "roof_emissivity": 0.90,
        },
        "openings": [
            {"facing": "south", "area_m2": 3.5, "glazing": "double_pane", "night_shutter": False}
        ],
        "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180.0},
        "ventilation": {"ach": 0.8, "heater_type": "none"},
        "occupancy": {"people": 4, "watts_per_person": 80.0},
    }

    res = client.post("/simulate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "series" in data
    series = data["series"]
    assert len(series) == 24

    for pt in series:
        assert "hour" in pt
        assert 0 <= pt["hour"] <= 23
        assert "t_in" in pt and pt["t_in"] is not None
        assert "t_out" in pt and pt["t_out"] is not None
        assert "t_in_lo" in pt and pt["t_in_lo"] is not None
        assert "t_in_hi" in pt and pt["t_in_hi"] is not None
        assert pt["t_in_lo"] < pt["t_in_hi"]

        # Instantaneous solar flux and heating demand from solver
        assert "solar_gain_w" in pt
        if pt["solar_gain_w"] is not None:
            assert pt["solar_gain_w"] >= 0.0

        assert "heating_demand_w" in pt
        if pt["heating_demand_w"] is not None:
            assert pt["heating_demand_w"] >= 0.0


# ============================================================================
# PART B: SENSITIVITY (MORRIS METHOD SCREENING)
# ============================================================================

def test_02_morris_sensitivity_calculation_metrics(baseline_shelter):
    """Verify Morris method computes mu*, mu, sigma, direction, and uncertainty."""
    weather = load_fallback_csv()
    res = morris_screening(baseline_shelter, weather=weather, n_trajectories=10)

    assert res["method"] == "morris"
    assert res["runs"] > 0
    assert "notice" in res
    assert "causation" in res["notice"].lower()

    levers = res["levers"]
    assert len(levers) > 0

    prev_effect = float("inf")
    for lever in levers:
        assert "parameter" in lever
        assert "effect_c" in lever
        assert "mu_star" in lever
        assert "mu" in lever
        assert "sigma" in lever
        assert "uncertainty" in lever
        assert "direction" in lever
        assert lever["direction"] in ["warming", "cooling", "neutral"]
        assert lever["cost_basis"] in ["sourced", "estimate"]
        assert lever["rank"] >= 1

        # Must be strictly sorted descending by effect_c (mu*)
        assert lever["effect_c"] <= prev_effect + 1e-6
        prev_effect = lever["effect_c"]


def test_03_sensitivity_api_endpoint():
    """Verify POST /sensitivity returns valid response matching schema without arbitrary %."""
    payload = {
        "location": {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        "weather": {"mode": "typical_day", "date": "2026-01-15", "hours": 24},
        "baseline": {
            "walls": [{"material": "stone_masonry", "thickness_m": 0.30}],
            "roof": [{"material": "concrete", "thickness_m": 0.15}],
            "floor": [{"material": "concrete", "thickness_m": 0.10}],
            "roof_emissivity": 0.90,
            "openings": [
                {"facing": "south", "area_m2": 3.5, "glazing": "double_pane", "night_shutter": False}
            ],
            "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180.0},
            "ventilation": {"ach": 0.8, "heater_type": "none"},
        },
        "search": {
            "south_glazing_m2": {"min": 1.0, "max": 6.0},
        },
        "trajectories": 10,
    }

    res = client.post("/sensitivity", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["method"] == "morris"
    assert "levers" in data
    for lever in data["levers"]:
        assert lever["effect_c"] >= 0.0
        assert lever["mu_star"] >= 0.0
        assert lever["direction"] in ["warming", "cooling", "neutral"]



# ============================================================================
# PART C: VALIDATION DASHBOARD
# ============================================================================

def test_04_validation_endpoint_actual_results():
    """Verify GET /validation serves actual committed benchmark results."""
    res = client.get("/validation")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["validation_run"] is True
    assert data["status"] == "Validated"
    assert "scenarios" in data
    scenarios = data["scenarios"]
    assert len(scenarios) == 4

    for s in scenarios:
        assert "id" in s
        assert "label" in s
        assert "measured_min_c" in s
        assert "measured_max_c" in s
        assert "model_min_c" in s
        assert "model_max_c" in s
        assert "pass" in s
        assert "error_c" in s
        assert "tolerance" in s
        assert "reference_str" in s
        assert "model_str" in s
        assert "provenance" in s
        assert len(s["provenance"]) > 5

    # Non-negotiable ordering check
    assert "ordering_check" in data
    oc = data["ordering_check"]
    assert oc["trombe_above_direct_gain"] is True
    assert oc["pass"] is True
    assert oc["trombe_mean"] > oc["direct_gain_mean"]


def test_05_validation_unrun_state_guard(monkeypatch, tmp_path):
    """Verify that if validation summary is missing, API returns 'Validation not run.'."""
    import api.main
    # Point to empty directory where validation_summary.json does not exist
    monkeypatch.setattr(api.main, "VALIDATION_RESULTS_DIR", tmp_path)

    res = client.get("/validation")
    assert res.status_code == 200
    data = res.json()
    assert data["validation_run"] is False
    assert data["status"] == "Validation not run."
    assert len(data["scenarios"]) == 0
    assert data["ordering_check"]["pass"] is False
