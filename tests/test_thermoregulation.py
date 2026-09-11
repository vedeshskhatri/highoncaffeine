"""
Occupant Thermoregulation Unit & Physical Sanity Tests
Authoritative References:
  1. Gagge, A. P., Fobelets, A. P., & Berglund, L. G. (1986).
     "A standard predictive index of human response to the thermal environment."
     ASHRAE Transactions, 92(2B), 709–731.
  2. ASHRAE Handbook of Fundamentals 2021, Chapter 9 (Thermal Comfort).
  3. ISO 7730:2005 / ISO 9886:2004.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app
from engine.thermoregulation import (
    simulate_occupant_thermoregulation,
    MILD_HYPOTHERMIA_C,
    T_CORE_SETPOINT_C,
    T_SKIN_SETPOINT_C,
)


client = TestClient(app)


def test_01_comfortable_environment_preserves_normothermia():
    """
    In a comfortable indoor environment (20 °C) with standard indoor clothing (1.0 clo)
    and resting metabolic rate (1.0 met), core temperature must remain stable near 36.8 °C,
    and no hypothermia breach should occur.
    """
    t_air_series = [20.0] * 24
    res = simulate_occupant_thermoregulation(t_air_series, clothing_clo=1.0, metabolic_met=1.0)

    assert res["model_confidence"] == "estimate"
    assert res["hours_to_mild_hypothermia"] is None
    assert res["t_core_min_c"] >= 36.5
    assert res["t_core_min_c"] <= 37.5
    assert len(res["series"]) == 24
    assert not any(r["is_hypothermic"] for r in res["series"])


def test_02_severe_cold_exposure_triggers_hypothermia():
    """
    Under prolonged severe cold exposure (-25 °C) with inadequate clothing (0.3 clo),
    the core temperature must drop below the clinical mild hypothermia threshold (35.0 °C),
    and hours_to_mild_hypothermia must be recorded within the 24-hour simulation window.
    """
    t_air_series = [-25.0] * 24
    res = simulate_occupant_thermoregulation(t_air_series, clothing_clo=0.3, metabolic_met=1.0)

    assert res["hours_to_mild_hypothermia"] is not None
    assert 0.0 < res["hours_to_mild_hypothermia"] <= 24.0
    assert res["t_core_min_c"] < MILD_HYPOTHERMIA_C
    assert any(r["is_hypothermic"] for r in res["series"])


def test_03_clothing_insulation_monotonicity():
    """
    Physical direction check: Increasing clothing insulation from 0.5 clo to 2.5 clo
    under identical cold indoor conditions (-10 °C) must monotonically increase
    (or maintain higher) core temperature and skin temperature.
    """
    t_air_series = [-10.0] * 24
    res_light = simulate_occupant_thermoregulation(t_air_series, clothing_clo=0.5, metabolic_met=1.0)
    res_heavy = simulate_occupant_thermoregulation(t_air_series, clothing_clo=2.5, metabolic_met=1.0)

    assert res_heavy["t_core_min_c"] > res_light["t_core_min_c"], (
        f"Heavy clothing ({res_heavy['t_core_min_c']} °C) should maintain higher core "
        f"temperature than light clothing ({res_light['t_core_min_c']} °C)"
    )
    assert res_heavy["t_skin_min_c"] > res_light["t_skin_min_c"]


def test_04_metabolic_rate_benefit():
    """
    Physical direction check: Higher metabolic activity (2.0 met walking vs 1.0 met resting)
    generates internal metabolic heat and slows core temperature decline.
    """
    t_air_series = [-15.0] * 24
    res_rest = simulate_occupant_thermoregulation(t_air_series, clothing_clo=1.0, metabolic_met=1.0)
    res_active = simulate_occupant_thermoregulation(t_air_series, clothing_clo=1.0, metabolic_met=2.0)

    assert res_active["t_core_min_c"] > res_rest["t_core_min_c"]


def test_05_model_confidence_explicit_estimate_tag():
    """
    Codebase convention: Second-order physiological models must be explicitly tagged
    with model_confidence: 'estimate' to prevent clinical diagnostic misinterpretation.
    """
    res = simulate_occupant_thermoregulation([5.0] * 24)
    assert res["model_confidence"] == "estimate"


def test_06_simulate_api_backward_compatibility_and_occupant_flag():
    """
    POST /simulate contract check:
    1. When occupant_model flag is False / absent: behavior is unchanged, occupant_thermoregulation is None.
    2. When occupant_model is True: occupant_thermoregulation is populated with 'estimate' confidence.
    """
    base_payload = {
        "location": {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        "weather": {
            "mode": "typical_day",
            "date": "2026-01-15",
            "hours": 24,
            "user_csv_id": None,
        },
        "geometry": {
            "length_m": 6.0,
            "width_m": 4.0,
            "height_m": 2.6,
            "orientation_deg": 180.0,
        },
        "envelope": {
            "walls": [
                {"material": "mud_brick", "thickness_m": 0.30},
                {"material": "eps", "thickness_m": 0.05},
            ],
            "roof": [{"material": "concrete", "thickness_m": 0.15}],
            "floor": [{"material": "concrete", "thickness_m": 0.10}],
            "roof_emissivity": 0.90,
        },
        "openings": [
            {
                "facing": "south",
                "area_m2": 4.0,
                "glazing": "double_pane",
                "night_shutter": False,
            }
        ],
        "ventilation": {"ach": 0.6, "heater_type": "none"},
        "occupancy": {"people": 8, "watts_per_person": 100.0},
        "ground": {"snow_cover": True, "albedo": None},
        "comfort": {"model": "imac", "health_threshold_c": 18.0},
        "simulation": {"timestep_s": 60, "spinup_days": 1},
    }

    # Case 1: Flag absent -> backward compatible, occupant_thermoregulation is null
    resp_default = client.post("/simulate", json=base_payload)
    assert resp_default.status_code == 200
    data_default = resp_default.json()
    assert data_default["refused"] is False
    assert data_default.get("occupant_thermoregulation") is None

    # Case 2: Flag enabled -> occupant_thermoregulation populated
    payload_with_occupant = dict(base_payload)
    payload_with_occupant["occupant_model"] = True
    payload_with_occupant["occupant_clothing_clo"] = 1.5
    payload_with_occupant["occupant_metabolic_met"] = 1.0

    resp_occ = client.post("/simulate", json=payload_with_occupant)
    assert resp_occ.status_code == 200
    data_occ = resp_occ.json()
    assert data_occ["refused"] is False
    assert data_occ["occupant_thermoregulation"] is not None
    assert data_occ["occupant_thermoregulation"]["model_confidence"] == "estimate"
    assert "t_core_min_c" in data_occ["occupant_thermoregulation"]
    assert len(data_occ["occupant_thermoregulation"]["series"]) == 24
