"""
Tests for Thermal Diagnosis Engine (Phase 2).

Verifies:
1. Mathematical consistency of component contributions and ~100% sum rule
2. Dominant contributor identification using real calculated data
3. Missing component behavior ('component unavailable', no invented numbers)
4. Missing roof attribution behavior
5. Rule-based recommendation generation with required metadata
6. Zero-total heat loss edge case (no ZeroDivisionError)
7. Safety interlock interaction (unflued combustion and 0.35 ACH floor)
"""

import pytest

from engine.diagnosis import (
    calculate_component_contributions,
    find_dominant_contributor,
    generate_recommendations,
    diagnose,
    PERCENTAGE_ROUNDING_TOLERANCE,
)
from engine.safety import ACH_MIN_COMBUSTION


# ---------------------------------------------------------------------------
# 1. Contribution Percentages & Sum Rule
# ---------------------------------------------------------------------------

def test_component_contributions_mathematical_consistency():
    heat_loss = {
        "walls": 12.1,
        "roof": 9.4,
        "glazing": 7.8,
        "infiltration": 4.2,
        "sky_radiation": 6.9,
    }
    total_loss = sum(heat_loss.values())  # 40.4 kWh
    contributions = calculate_component_contributions(heat_loss, total_loss)

    # 1. Verify all known components exist
    for comp in ["walls", "roof", "glazing", "infiltration", "sky_radiation"]:
        c = contributions[comp]
        assert c.status == "available"
        assert c.absolute_kwh == heat_loss[comp]
        assert c.total_kwh == round(total_loss, 3)
        # Mathematical consistency: percentage = round((abs / total) * 100, 1)
        expected_pct = round((heat_loss[comp] / total_loss) * 100.0, 1)
        assert c.percentage == expected_pct

    # 2. Verify sum of percentages is approximately 100% within tolerance
    available_pcts = [c.percentage for c in contributions.values() if c.status == "available"]
    pct_sum = sum(available_pcts)
    # Sum of 5 rounded numbers has max rounding variance of 5 * 0.05 = 0.25
    assert abs(pct_sum - 100.0) <= (PERCENTAGE_ROUNDING_TOLERANCE * len(available_pcts))


# ---------------------------------------------------------------------------
# 2. Dominant Contributor ("Main Weakness")
# ---------------------------------------------------------------------------

def test_dominant_contributor_glazing():
    # Setup where glazing is highest
    heat_loss = {
        "walls": 5.0,
        "roof": 3.0,
        "glazing": 18.0,
        "infiltration": 2.0,
        "sky_radiation": 4.0,
    }
    contributions = calculate_component_contributions(heat_loss)
    weakness = find_dominant_contributor(contributions)

    assert weakness.component == "glazing"
    assert weakness.absolute_kwh == 18.0
    assert weakness.percentage == pytest.approx(56.25, abs=0.5)
    assert "Glazing is the dominant thermal bottleneck" in weakness.statement


def test_dominant_contributor_roof():
    # Setup where roof is highest
    heat_loss = {
        "walls": 4.0,
        "roof": 22.0,
        "glazing": 6.0,
        "infiltration": 3.0,
        "sky_radiation": 5.0,
    }
    contributions = calculate_component_contributions(heat_loss)
    weakness = find_dominant_contributor(contributions)

    assert weakness.component == "roof"
    assert weakness.absolute_kwh == 22.0
    assert "Roof conduction is the dominant thermal bottleneck" in weakness.statement


def test_dominant_contributor_does_not_falsely_blame_roof():
    # Setup where walls dominate and roof is small
    heat_loss = {
        "walls": 30.0,
        "roof": 2.0,
        "glazing": 4.0,
        "infiltration": 3.0,
        "sky_radiation": 1.0,
    }
    contributions = calculate_component_contributions(heat_loss)
    weakness = find_dominant_contributor(contributions)

    assert weakness.component == "walls"
    assert "roof is the dominant" not in weakness.statement.lower()
    assert "Walls is the dominant thermal bottleneck" in weakness.statement


# ---------------------------------------------------------------------------
# 3. Missing Component Behavior
# ---------------------------------------------------------------------------

def test_missing_component_floor_unavailable():
    heat_loss = {
        "walls": 10.0,
        "roof": 10.0,
        "glazing": 10.0,
        "infiltration": 5.0,
        "sky_radiation": 5.0,
    }
    contributions = calculate_component_contributions(heat_loss)

    # Floor is not separated by solver — must report unavailable
    floor = contributions["floor"]
    assert floor.status.startswith("component unavailable")
    assert floor.absolute_kwh is None
    assert floor.percentage is None


def test_missing_roof_attribution_behavior():
    # Omit roof from solver heat loss dictionary
    heat_loss_no_roof = {
        "walls": 15.0,
        "glazing": 25.0,
        "infiltration": 5.0,
        "sky_radiation": 5.0,
    }
    contributions = calculate_component_contributions(heat_loss_no_roof)
    assert contributions["roof"].status == "component unavailable"
    assert contributions["roof"].percentage is None

    weakness = find_dominant_contributor(contributions)
    assert weakness.component == "glazing"
    assert "roof-specific attribution requires additional solver data" in weakness.statement


# ---------------------------------------------------------------------------
# 4. Zero-Total Edge Case
# ---------------------------------------------------------------------------

def test_zero_total_heat_loss_edge_case():
    heat_loss_zero = {
        "walls": 0.0,
        "roof": 0.0,
        "glazing": 0.0,
        "infiltration": 0.0,
        "sky_radiation": 0.0,
    }
    # Must not raise ZeroDivisionError
    contributions = calculate_component_contributions(heat_loss_zero, total_loss_kwh=0.0)

    for comp in ["walls", "roof", "glazing", "infiltration", "sky_radiation"]:
        c = contributions[comp]
        assert c.percentage == 0.0
        assert c.absolute_kwh == 0.0
        assert c.total_kwh == 0.0

    weakness = find_dominant_contributor(contributions)
    assert weakness.component is None
    assert weakness.percentage == 0.0
    assert "Zero envelope heat loss detected" in weakness.statement


# ---------------------------------------------------------------------------
# 5. Recommendation Generation & Sourced Triggers
# ---------------------------------------------------------------------------

def test_recommendations_structure_and_triggers():
    summary = {
        "solar_gain_kwh": 5.0,  # Low solar gain
        "heat_loss_kwh": {
            "walls": 15.0,       # High wall loss
            "roof": 5.0,
            "glazing": 18.0,     # High glazing loss
            "infiltration": 8.0, # High infiltration
            "sky_radiation": 9.0,# High sky loss
        },
        "total_heat_loss_kwh": 55.0,
    }
    design = {
        "openings": [{"facing": "south", "area_m2": 2.0, "night_shutter": False}],
        "ventilation": {"ach": 0.8, "heater_type": "none"},
        "envelope": {"roof_emissivity": 0.90},
    }

    recs = generate_recommendations(summary, design)
    assert len(recs) >= 3

    # Check all required fields are present on every recommendation
    for r in recs:
        assert r.trigger != ""
        assert r.affected_parameter != ""
        assert r.direction_of_change in ["increase", "decrease", "enable", "replace"]
        assert r.reason != ""
        assert r.expected_metric != ""
        assert r.safety_constraints != ""
        assert r.source != ""

    # Check specific rule activations
    param_names = [r.affected_parameter for r in recs]
    assert "openings[facing=south].night_shutter" in param_names
    assert "ventilation.ach" in param_names
    assert "envelope.roof_emissivity" in param_names


# ---------------------------------------------------------------------------
# 6. Safety Interaction with Unflued Combustion Heater
# ---------------------------------------------------------------------------

def test_safety_interaction_combustion_heater_above_floor():
    summary = {
        "heat_loss_kwh": {"walls": 5.0, "roof": 5.0, "glazing": 5.0, "infiltration": 15.0, "sky_radiation": 2.0},
        "solar_gain_kwh": 15.0,
        "total_heat_loss_kwh": 32.0,
    }
    design = {
        "openings": [{"facing": "south", "area_m2": 4.0, "night_shutter": True}],
        "ventilation": {"ach": 0.8, "heater_type": "unflued_combustion"},
        "envelope": {"roof_emissivity": 0.25},
    }

    recs = generate_recommendations(summary, design)
    inf_rec = next(r for r in recs if r.affected_parameter == "ventilation.ach")
    assert inf_rec.direction_of_change == "decrease"
    # Must enforce safety floor
    assert f"{ACH_MIN_COMBUSTION:.2f} ACH" in inf_rec.safety_constraints
    assert "SAFETY INTERLOCK MANDATORY" in inf_rec.safety_constraints
    assert "Carbon Monoxide" in inf_rec.safety_constraints


def test_safety_interaction_combustion_heater_at_floor():
    summary = {
        "heat_loss_kwh": {"walls": 5.0, "roof": 5.0, "glazing": 5.0, "infiltration": 15.0, "sky_radiation": 2.0},
        "solar_gain_kwh": 15.0,
        "total_heat_loss_kwh": 32.0,
    }
    # ACH is already at the safe floor (0.35)
    design = {
        "openings": [{"facing": "south", "area_m2": 4.0, "night_shutter": True}],
        "ventilation": {"ach": 0.35, "heater_type": "unflued_combustion"},
        "envelope": {"roof_emissivity": 0.25},
    }

    recs = generate_recommendations(summary, design)
    # Must NOT recommend reducing ACH further!
    ach_recs = [r for r in recs if r.affected_parameter == "ventilation.ach" and r.direction_of_change == "decrease"]
    assert len(ach_recs) == 0

    # Must recommend replacing the heater
    heater_rec = next(r for r in recs if r.affected_parameter == "ventilation.heater_type")
    assert heater_rec.direction_of_change == "replace"
    assert "cannot be safely reduced below 0.35 ACH" in heater_rec.reason


# ---------------------------------------------------------------------------
# 7. High-Level diagnose() Function Output
# ---------------------------------------------------------------------------

def test_high_level_diagnose_payload():
    summary = {
        "solar_gain_kwh": 18.7,
        "heat_loss_kwh": {
            "walls": 12.1,
            "roof": 9.4,
            "glazing": 7.8,
            "infiltration": 4.2,
            "sky_radiation": 6.9,
        },
        "total_heat_loss_kwh": 40.4,
    }
    design = {
        "openings": [{"facing": "south", "area_m2": 4.0, "night_shutter": False}],
        "ventilation": {"ach": 0.6, "heater_type": "none"},
        "envelope": {"roof_emissivity": 0.90},
    }

    result = diagnose(summary, design)
    assert "contributions" in result
    assert "dominant_weakness" in result
    assert "recommendations" in result
    assert result["percentage_sum_consistent"] is True
    assert result["dominant_weakness"]["component"] == "walls"


# ---------------------------------------------------------------------------
# 8. API Integration Test (/simulate includes diagnosis)
# ---------------------------------------------------------------------------

def test_simulate_endpoint_includes_diagnosis():
    import json
    from pathlib import Path
    from fastapi.testclient import TestClient
    from api.main import app

    client = TestClient(app)
    case_path = Path("validation/scenarios/v1_dihar.json")
    assert case_path.exists()

    data = json.loads(case_path.read_text())
    data.pop("_metadata", None)

    response = client.post("/simulate", json=data)
    assert response.status_code == 200

    body = response.json()
    assert "diagnosis" in body
    diag = body["diagnosis"]
    assert "contributions" in diag
    assert "dominant_weakness" in diag
    assert "recommendations" in diag

    # Verify floor is marked unavailable per spec
    assert diag["contributions"]["floor"]["status"].startswith("component unavailable")
    # Verify dominant weakness is present
    assert diag["dominant_weakness"]["component"] is not None
    assert diag["percentage_sum_consistent"] is True
