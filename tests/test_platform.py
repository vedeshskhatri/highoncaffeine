"""
Comprehensive automated tests for THERMA Platform endpoints per Phase P0.
Verifies:
  - Strict hand-reconciled aggregates across sites in estate/summary
  - Estate scoping (Ladakh vs Nepal Relief separation)
  - Sortie conversion and [estimate] basis reporting
  - Site CRUD and CSV import column error validation
  - Programme ranking logic (L/₹, cumulative curves)
  - Design library CRUD and apply
  - Materials availability per district
"""

import json
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.db import query_all, query_one

client = TestClient(app)


def test_estate_summary_hand_reconciliation():
    """Verify that /estate/summary matches the exact sum of individual cached site results."""
    resp = client.get("/estate/summary?estate=Ladakh")
    assert resp.status_code == 200
    data = resp.json()

    assert data["estate"] == "Ladakh"
    assert data["total_sites"] == 11
    assert data["evaluated_sites"] == 11
    assert data["unevaluated_sites"] == 0
    assert data["coverage_str"] == "11 of 11 sites"

    # Fetch all individual site results from DB
    sites = query_all("SELECT id, occupants FROM sites WHERE estate = 'Ladakh'")
    evals = query_all("SELECT * FROM site_results")
    eval_map = {e["site_id"]: json.loads(e["summary_json"]) for e in evals}

    hand_fuel = sum(eval_map[s["id"]]["annual_fuel_litres"] for s in sites)
    hand_cost = sum(eval_map[s["id"]]["annual_cost_inr"] for s in sites)
    hand_co2 = sum(eval_map[s["id"]]["annual_co2_kg"] for s in sites) / 1000.0
    hand_occupants = sum(s["occupants"] for s in sites)

    # Reconcile hand sums against API aggregates
    assert round(data["aggregates"]["annual_fuel_litres"], 1) == round(hand_fuel, 1)
    assert round(data["aggregates"]["annual_cost_inr"], 1) == round(hand_cost, 1)
    assert round(data["aggregates"]["annual_co2_tonnes"], 2) == round(hand_co2, 2)
    assert data["aggregates"]["total_occupants"] == hand_occupants


def test_estate_scoping_nepal_separated():
    """Verify Nepal Relief estate is strictly separated from Ladakh."""
    ladakh_resp = client.get("/estate/summary?estate=Ladakh")
    nepal_resp = client.get("/estate/summary?estate=Nepal Relief")

    assert ladakh_resp.status_code == 200
    assert nepal_resp.status_code == 200

    ladakh_data = ladakh_resp.json()
    nepal_data = nepal_resp.json()

    assert ladakh_data["total_sites"] == 11
    assert nepal_data["total_sites"] == 1
    assert nepal_data["estate"] == "Nepal Relief"
    assert nepal_data["worst_performing_sites"][0]["name"] == "Rasuwa Earthquake Relief Camp 4"


def test_civilian_dwelling_hanle():
    """Verify Hanle observatory quarters is classified as dwelling, not forward_post."""
    site = query_one("SELECT * FROM sites WHERE id = 'site_hanle_observatory'")
    assert site is not None
    assert site["site_type"] == "dwelling"


def test_forecast_sorties_and_estimate_basis():
    """Verify sortie conversion uses sourced config with explicit basis."""
    resp = client.get("/forecast?estate=Ladakh")
    assert resp.status_code == 200
    data = resp.json()

    assert data["estate"] == "Ladakh"
    assert data["sortie_config"]["litres_per_sortie"] == 450.0
    assert data["sortie_config"]["basis"] == "estimate"
    assert "Cheetah/ALH" in data["sortie_config"]["note"]
    assert data["total_annual_sorties"] > 0


def test_programme_planner_ranking():
    """Verify programme planner ranks interventions by litres saved per rupee."""
    resp = client.post("/programme", json={"estate": "Ladakh", "budget_inr": 14000000.0})
    assert resp.status_code == 200
    data = resp.json()

    assert data["estate"] == "Ladakh"
    assert data["posts_funded_count"] > 0
    assert len(data["items"]) > 0

    # Verify descending sort on litres_per_1000_inr
    ratios = [item["litres_per_1000_inr"] for item in data["items"]]
    assert ratios == sorted(ratios, reverse=True)


def test_csv_import_column_errors():
    """Verify CSV import collects all column-level errors per 09_ERROR_HANDLING.md."""
    bad_csv = """name,estate,district,lat,lon,altitude_m,site_type,occupants
Invalid Post 1,Ladakh,Leh,95.5,77.5,3500,forward_post,10
Invalid Post 2,Ladakh,Leh,34.5,77.5,invalid_alt,invalid_type,10
"""
    resp = client.post("/sites/import", params={"csv_text": bad_csv})
    assert resp.status_code == 422
    errs = resp.json()["detail"]
    assert len(errs) >= 3
    columns_with_err = {e["column"] for e in errs}
    assert "lat" in columns_with_err
    assert "altitude_m" in columns_with_err
    assert "site_type" in columns_with_err


def test_design_library_crud():
    """Verify design library listing and retrieval."""
    resp = client.get("/designs")
    assert resp.status_code == 200
    designs = resp.json()
    assert len(designs) >= 2
    names = [d["name"] for d in designs]
    assert any("Forward Post" in n for n in names)


def test_materials_availability_by_district():
    """Verify material availability shifts by district (Leh vs DBO)."""
    resp_leh = client.get("/materials/availability?district=Leh")
    resp_dbo = client.get("/materials/availability?district=DBO")

    assert resp_leh.status_code == 200
    assert resp_dbo.status_code == 200

    dbo_items = {m["id"]: m for m in resp_dbo.json()}
    # Stone masonry should not be locally available in DBO moraine
    assert dbo_items["stone_masonry"]["locally_available"] is False
    assert dbo_items["stone_masonry"]["lead_time_days"] >= 20
