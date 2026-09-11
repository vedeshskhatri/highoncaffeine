"""
Unit and integration tests for Scenario Library and Demo Mode (Phase 11).
Strict compliance with brain/00_MASTER_RULES.md, brain/07_API_CONTRACT.md, and Phase 11 requirements.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app
from engine.scenarios import (
    SCENARIOS,
    get_all_scenarios,
    get_scenario_by_id,
    validate_scenario,
    load_valid_material_ids,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_all_four_scenario_concepts_present():
    """Verify that all 4 required scenario concepts exist in the library."""
    scenarios = get_all_scenarios()
    assert len(scenarios) >= 4

    concepts = {s["concept"] for s in scenarios}
    required = {"cold_high_altitude", "hot_dry", "warm_humid", "existing_retrofit"}
    assert required.issubset(concepts), f"Missing scenario concepts: {required - concepts}"


def test_scenario_fields_completeness():
    """Verify that every scenario defines all required fields with non-empty content."""
    scenarios = get_all_scenarios()
    required_keys = [
        "id",
        "concept",
        "title",
        "description",
        "purpose",
        "input_configuration",
        "weather_source",
        "expected_demonstration_capability",
    ]

    for s in scenarios:
        for k in required_keys:
            assert k in s, f"Scenario '{s.get('id')}' missing key '{k}'"
            assert s[k], f"Scenario '{s.get('id')}' has empty key '{k}'"

        # Check weather source sub-fields
        ws = s["weather_source"]
        assert "provider" in ws and ws["provider"]
        assert "mode" in ws and ws["mode"]
        assert "date" in ws and ws["date"]

        # Check input configuration sub-fields
        cfg = s["input_configuration"]
        assert "location" in cfg
        assert "weather" in cfg
        assert "geometry" in cfg
        assert "envelope" in cfg


def test_no_invented_numerical_results():
    """
    CRITICAL CONSTRAINT: Scenarios must not invent expected numerical results.
    e.g. 'demonstrates heating demand' without saying 'heating demand will be 4.2 kW'.
    """
    scenarios = get_all_scenarios()
    for s in scenarios:
        capability = s["expected_demonstration_capability"]
        assert "demonstrate" in capability.lower()
        # Verify validation function succeeds
        errs = validate_scenario(s)
        assert not errs, f"Scenario {s['id']} had validation errors: {errs}"


def test_validation_rejects_invented_numbers():
    """Ensure validation function catches and rejects invented numbers in expected capabilities."""
    bad_scenario = dict(SCENARIOS[0])
    bad_scenario = {
        **bad_scenario,
        "expected_demonstration_capability": "Demonstrates heating demand of 4.2 kW and 18.5 kWh solar gain",
    }
    errs = validate_scenario(bad_scenario)
    assert any("invented numerical claim" in e for e in errs)


def test_all_materials_exist_in_materials_csv():
    """Verify that all envelope layers and glazing materials exist in data/materials.csv."""
    valid_materials = load_valid_material_ids()
    assert len(valid_materials) > 0

    scenarios = get_all_scenarios()
    for s in scenarios:
        cfg = s["input_configuration"]
        envelope = cfg.get("envelope", {})
        for surface in ("walls", "roof", "floor"):
            for layer in envelope.get(surface, []):
                mat = layer.get("material")
                assert mat in valid_materials, (
                    f"Scenario '{s['id']}' uses unknown material '{mat}' in {surface}"
                )
        for opening in cfg.get("openings", []):
            glz = opening.get("glazing")
            assert glz in valid_materials, (
                f"Scenario '{s['id']}' uses unknown glazing material '{glz}'"
            )


def test_get_scenarios_api_endpoint(client):
    """Test the GET /scenarios API endpoint."""
    resp = client.get("/scenarios")
    assert resp.status_code == 200
    data = resp.json()

    assert "scenarios" in data
    assert data["total"] >= 4
    assert data["_stub"] is False

    concepts = [s["concept"] for s in data["scenarios"]]
    assert "cold_high_altitude" in concepts
    assert "hot_dry" in concepts
    assert "warm_humid" in concepts
    assert "existing_retrofit" in concepts


def test_get_scenario_by_id():
    """Test lookup helper."""
    s = get_scenario_by_id("cold_high_altitude")
    assert s is not None
    assert s["id"] == "cold_high_altitude"

    missing = get_scenario_by_id("non_existent_id")
    assert missing is None
