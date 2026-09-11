"""
Unit and integration tests for Phase 10 — Engineering Report & Reproducibility.
Verifies:
  1. All 18 standardized report sections are present and ordered.
  2. Every number is classified strictly as SOURCED, DERIVED, ESTIMATE, MODEL OUTPUT, or MEASURED.
  3. Strict invariant: Model outputs are NEVER labeled as 'measured'.
  4. Audit trail captures all required fields (simulation ID, timestamp, material versions,
     weather dataset ID, engine version, optimizer version, validation status, SHA-256 checksum).
  5. Deterministic reproducibility: identical configurations produce identical checksums.
  6. POST /report endpoint integration.
"""

import re
import pytest
from fastapi.testclient import TestClient
from api.main import app
from engine.report import (
    generate_engineering_report,
    get_materials_hash,
    compute_simulation_checksum,
    VALID_ORIGINS,
)

client = TestClient(app)

EXPECTED_SECTIONS = [
    (1, "Shelter Configuration"),
    (2, "Location & Atmospheric Context"),
    (3, "Weather Source & Meteorological Provider"),
    (4, "Materials & Assembly Schedule"),
    (5, "Material Sources & Thermophysical Citations"),
    (6, "Physics Configuration & Solver Formulation"),
    (7, "Simulation Results & Heat Flux Accounting"),
    (8, "Thermal Comfort & Physiological Risk Analysis"),
    (9, "Thermal Weakness Diagnosis"),
    (10, "Pareto Envelope Optimization"),
    (11, "Retrofit Recommendations & Cost-Effectiveness"),
    (12, "Cost Valuation & Fuel Avoidance Economics"),
    (13, "Safety & Asphyxiation Interlock Evaluation"),
    (14, "Dual-Axis Scientific Validation"),
    (15, "Morris Sensitivity Screening"),
    (16, "Engineering Limitations & Boundary Disclosures"),
    (17, "Data Provenance Summary"),
    (18, "Reproducibility Metadata & Audit Trail"),
]


@pytest.fixture
def sample_report_payload():
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


def test_report_has_all_18_sections(sample_report_payload):
    """Verify that all 18 required sections exist in the report output with sequential numbering."""
    report = generate_engineering_report(sample_report_payload, {})
    sections = report["sections"]

    assert len(sections) == 18, f"Expected 18 sections, got {len(sections)}"

    for idx, (expected_id, expected_title) in enumerate(EXPECTED_SECTIONS):
        sec = sections[idx]
        assert sec["section_id"] == expected_id
        assert sec["title"] == expected_title
        assert "metrics" in sec and len(sec["metrics"]) > 0


def test_number_classification_integrity(sample_report_payload):
    """
    Verify:
      - Every metric has an origin in {SOURCED, DERIVED, ESTIMATE, MODEL OUTPUT, MEASURED}.
      - Model outputs are NEVER called 'measured'.
      - Measured origin is reserved exclusively for physical empirical field datasets.
    """
    report = generate_engineering_report(sample_report_payload, {
        "summary": {
            "t_in_min_c": -6.2,
            "t_in_max_c": 14.8,
            "comfort_hours_ratio": 0.72,
            "hours_below_health_threshold": 8,
            "solar_gain_kwh": 22.4,
            "heat_loss_kwh": {"walls": 12.0, "roof": 8.0, "glazing": 4.0, "infiltration": 6.0},
        }
    })

    for sec in report["sections"]:
        sec_id = sec["section_id"]
        for metric_name, metric in sec["metrics"].items():
            origin = metric.get("origin")
            assert origin in VALID_ORIGINS, f"Invalid origin '{origin}' in section {sec_id} metric '{metric_name}'"

            # Strict Invariant: Section 7 simulation predictions must be MODEL OUTPUT, never MEASURED
            if sec_id == 7:
                assert origin == "MODEL OUTPUT", f"Simulation output '{metric_name}' was improperly labeled '{origin}' instead of 'MODEL OUTPUT'"

            # Invariant: If origin is MEASURED, it must be in validation or empirical field data
            if origin == "MEASURED":
                assert sec_id == 14, f"Metric '{metric_name}' in section {sec_id} was labeled MEASURED outside Section 14 Validation"


def test_audit_trail_fields(sample_report_payload):
    """Verify that the cryptographic audit trail captures all necessary provenance fields."""
    report = generate_engineering_report(sample_report_payload, {})
    audit = report["audit_trail"]

    assert "simulation_id" in audit and len(audit["simulation_id"]) > 0
    assert "timestamp_utc" in audit
    assert "engine_version" in audit and "EN ISO 52016-1" in audit["engine_version"]
    assert "optimizer_version" in audit
    assert "materials_database_hash" in audit and len(audit["materials_database_hash"]) == 64
    assert "weather_dataset_identifier" in audit
    assert "validation_status" in audit and audit["validation_status"] in {"PASS", "UNRUN"}
    assert "result_checksum_sha256" in audit and len(audit["result_checksum_sha256"]) == 64
    assert "reproducibility_statement" in audit
    assert "user_privacy_note" in audit

    # Verify SHA-256 regex pattern
    assert re.match(r"^[0-9a-f]{64}$", audit["result_checksum_sha256"])
    assert re.match(r"^[0-9a-f]{64}$", audit["materials_database_hash"])


def test_deterministic_reproducibility(sample_report_payload):
    """Running report generation with fixed simulation ID produces identical checksums."""
    ctx = {"simulation_id": "sim_deterministic_test_001"}
    r1 = generate_engineering_report(sample_report_payload, {"summary": {"t_in_min_c": 12.0}}, ctx)
    r2 = generate_engineering_report(sample_report_payload, {"summary": {"t_in_min_c": 12.0}}, ctx)

    assert r1["audit_trail"]["result_checksum_sha256"] == r2["audit_trail"]["result_checksum_sha256"]
    assert r1["audit_trail"]["materials_database_hash"] == r2["audit_trail"]["materials_database_hash"]


def test_post_report_api_endpoint(sample_report_payload):
    """Verify POST /report endpoint returns HTTP 200 with complete 18-section report and markdown."""
    resp = client.post("/report", json={"request": sample_report_payload})
    assert resp.status_code == 200
    data = resp.json()

    assert data["report_id"]
    assert len(data["sections"]) == 18
    assert "audit_trail" in data
    assert "markdown" in data and len(data["markdown"]) > 500

    # Confirm all 18 section headers exist in markdown text
    for expected_id, expected_title in EXPECTED_SECTIONS:
        header_needle = f"## {expected_id}. {expected_title}"
        assert header_needle in data["markdown"], f"Markdown missing header: '{header_needle}'"
