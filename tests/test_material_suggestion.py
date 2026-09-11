"""
test_material_suggestion.py — Verification test suite for Phase M1 Material Suggestion.
Evaluator requirement:
"if I want -20 C outside and +20 C inside, what material should I use?"

Tests:
a. -20 C outdoor, +20 C target at Leh -> returns 3 diverse build-ups with layer specifications.
b. Impossible target (+25 C at -40 C outdoor) -> reports gap and backup heat sizing rather than false pass.
c. Location change only -> results change (proves computed physics, not a lookup table).
d. locally_available_only toggle -> results differ (locally available restricts to mud brick / rammed earth / stone).
"""
import pytest
from engine.material_suggestion import suggest_materials


def test_suggest_materials_leh_target():
    """Verify (a): -20 C outdoor, +20 C target at Leh returns top 3 build-ups with full layer stack."""
    location = {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500}
    geometry = {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180}
    occupancy = {"people": 8, "watts_per_person": 100}

    result = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location=location,
        geometry=geometry,
        occupancy=occupancy,
        max_cost_inr=None,
        locally_available_only=False,
    )

    assert result is not None
    assert "recommendations" in result
    recs = result["recommendations"]
    assert len(recs) == 3, f"Expected 3 recommendations, got {len(recs)}"

    # Ensure each recommendation has full buildup details
    wall_materials = set()
    for rec in recs:
        assert rec["rank"] in [1, 2, 3]
        assert "achieved_indoor_c_min" in rec
        assert "estimated_cost_inr" in rec
        assert rec["estimated_cost_inr"] > 0
        assert "buildup" in rec
        buildup = rec["buildup"]
        assert len(buildup["walls"]) > 0
        assert len(buildup["roof"]) > 0
        assert len(buildup["floor"]) > 0
        assert "glazing" in buildup
        assert buildup["glazing"]["u_value_day"] > 0
        wall_materials.add(rec["primary_wall_material"])

        # Every layer must have thickness, k-value, and source
        for layer in buildup["walls"]:
            assert layer["thickness_m"] > 0
            assert layer["thermal_conductivity_w_mk"] > 0
            assert layer["source"] != ""

    # Ensure diversity among recommended primary wall types
    assert len(wall_materials) >= 2


def test_impossible_target_honest_negative_result():
    """Verify (b): An impossible target (+25 C at -40 C outdoor) reports gap and backup heat."""
    location = {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500}
    geometry = {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180}
    occupancy = {"people": 8, "watts_per_person": 100}

    result = suggest_materials(
        target_indoor_c=25.0,
        design_outdoor_c=-40.0,
        location=location,
        geometry=geometry,
        occupancy=occupancy,
        max_cost_inr=None,
        locally_available_only=False,
    )

    assert result["all_met_passively"] is False
    recs = result["recommendations"]
    assert len(recs) > 0

    best = recs[0]
    assert best["target_met"] is False
    assert best["residual_gap_c"] > 0.0
    assert best["achieved_indoor_c_min"] < 25.0

    # Must provide backup heat sizing
    assert best["backup_heat"] is not None
    assert best["backup_heat"]["required_kw"] > 0.0
    assert best["backup_heat"]["operating_hours_per_night"] > 0.0
    assert best["backup_heat"]["kerosene_liters_per_night"] > 0.0
    assert "backup heat" in best["backup_heat"]["summary_note"]


def test_location_sensitivity():
    """Verify (c): Changing location only changes recommendations/temperatures (computed, not a lookup)."""
    # Location 1: Leh (altitude 3500m, lat 34.15)
    loc_leh = {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500}
    # Location 2: Siachen Base Camp (altitude 5400m, lat 35.5)
    loc_siachen = {"lat": 35.5000, "lon": 77.0000, "altitude_m": 5400}

    geom = {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180}
    occ = {"people": 8, "watts_per_person": 100}

    res_leh = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location=loc_leh,
        geometry=geom,
        occupancy=occ,
    )

    res_siachen = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location=loc_siachen,
        geometry=geom,
        occupancy=occ,
    )

    # The achieved temperatures must differ due to elevation air density & solar irradiance
    t_min_leh = res_leh["recommendations"][0]["achieved_indoor_c_min"]
    t_min_siachen = res_siachen["recommendations"][0]["achieved_indoor_c_min"]

    assert abs(t_min_leh - t_min_siachen) > 0.05, (
        f"Expected thermal difference between Leh ({t_min_leh:.2f}) and Siachen ({t_min_siachen:.2f})"
    )


def test_locally_available_toggle():
    """Verify (d): locally_available_only on vs off returns different material candidate pools."""
    loc = {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500}
    geom = {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180}
    occ = {"people": 8, "watts_per_person": 100}

    res_all = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location=loc,
        geometry=geom,
        occupancy=occ,
        locally_available_only=False,
    )

    res_local = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location=loc,
        geometry=geom,
        occupancy=occ,
        locally_available_only=True,
    )

    # Non-local allows PU sandwich panel; local only allows mud brick, rammed earth, stone
    local_allowed = {
        "Mud brick (adobe)", "Rammed earth", "Granite field stone masonry",
        "Mud Brick", "Rammed Earth", "Stone Masonry", "Stone masonry",
    }
    for rec in res_local["recommendations"]:
        assert rec["primary_wall_material"] in local_allowed, (
            f"Expected local material, got {rec['primary_wall_material']}"
        )

    # Confirm the sets of recommendations differ
    walls_all = [r["primary_wall_material"] for r in res_all["recommendations"]]
    walls_local = [r["primary_wall_material"] for r in res_local["recommendations"]]
    assert walls_all != walls_local or res_all["recommendations"][0]["estimated_cost_inr"] != res_local["recommendations"][0]["estimated_cost_inr"]


def test_suggest_materials_api_endpoint():
    """Verify POST /suggest-materials contract adherence via FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from api.main import app

    client = TestClient(app)
    payload = {
        "target_indoor_c": 20.0,
        "design_outdoor_c": -20.0,
        "location": {"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        "occupancy": {"people": 4, "watts_per_person": 100.0},
        "locally_available_only": True,
    }
    resp = client.post("/suggest-materials", json=payload)
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert data["target_indoor_c"] == 20.0
    assert data["design_outdoor_c"] == -20.0
    assert "recommendations" in data
    assert len(data["recommendations"]) == 3
    for rec in data["recommendations"]:
        assert rec["rank"] in [1, 2, 3]
        assert "buildup" in rec
        assert len(rec["buildup"]["walls"]) > 0
        assert "backup_heat" in rec
        assert rec["cost_inr"] > 0

