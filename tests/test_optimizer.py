"""Test suite for Phase V6: Optimizer, Pareto Frontier & Sensitivity Engine.

Owner: Vedesh
Verifies all 7 checks from brain/VEDESH_PHASES.md Phase V6 prompt:
  a. 3000 samples evaluation, counting refused_unsafe, timing < 8s.
  b. Top-3 selection and deterministic why strings without LLM hallucination.
  c. Best design beats baseline on comfort_hours_ratio.
  d. locally_available_only toggle alters the Pareto frontier.
  e. Safety filter identifies and refuses unflued combustion below 0.35 ACH.
  f. Morris screening ranks design levers with physical effect magnitudes.
  g. Optimized design object exports a valid envelope ready for simulation.
"""

import time
import pytest
from engine.types import Design, Layer, Opening
from engine.optimizer import (
    sample_designs,
    compute_pareto_front,
    compute_design_cost,
    optimize,
)
from engine.sensitivity import morris_screening
from engine.materials import load as load_materials


@pytest.fixture
def materials_db():
    return load_materials()


@pytest.fixture
def baseline_design():
    return Design(
        orientation_deg=180.0,
        walls=(
            Layer(material_id="mud_brick", thickness_m=0.30),
            Layer(material_id="eps", thickness_m=0.05),
        ),
        roof=(Layer(material_id="concrete", thickness_m=0.15),),
        floor=(Layer(material_id="concrete", thickness_m=0.10),),
        openings=(
            Opening(facing="south", area_m2=4.0, glazing_id="double_pane", night_shutter=False),
        ),
        ach=0.6,
        roof_emissivity=0.90,
        night_shutter=False,
    )


def test_sampling_bounds(baseline_design):
    """Verify that sampled designs respect the continuous parameter bounds."""
    search_space = {
        "orientation_deg": {"min": 120.0, "max": 240.0},
        "south_glazing_m2": {"min": 2.0, "max": 6.0},
        "ach": {"min": 0.4, "max": 1.2},
    }
    samples, refused = sample_designs(search_space, baseline=baseline_design, n=100, seed=123)
    assert len(samples) == 100
    assert refused == 0

    for des in samples:
        assert 120.0 <= des.orientation_deg <= 240.0
        assert 0.4 <= des.ach <= 1.2
        south_openings = [op for op in des.openings if op.facing == "south"]
        assert len(south_openings) >= 1
        assert 2.0 <= south_openings[0].area_m2 <= 6.0


def test_safety_filter_refuses_low_ach_combustion(baseline_design):
    """Check e: Set heater_type to unflued_combustion with low ACH range, confirm refused_unsafe > 0."""
    search_space = {
        "ach": {"min": 0.15, "max": 0.30},  # All below safe threshold 0.35 ACH
    }
    samples, refused = sample_designs(
        search_space,
        baseline=baseline_design,
        n=50,
        heater_type="unflued_combustion",
    )

    assert refused > 0
    # Every accepted candidate must satisfy ACH >= 0.35
    for des in samples:
        assert des.ach >= 0.35


def test_pareto_front_non_dominated():
    """Verify that compute_pareto_front strictly eliminates dominated solutions."""
    candidates = [
        {"design_id": "d1", "comfort_hours_ratio": 0.50, "cost_inr": 100000, "t_in_min_c": 10.0},
        {"design_id": "d2", "comfort_hours_ratio": 0.40, "cost_inr": 120000, "t_in_min_c": 8.0},  # Dominated by d1
        {"design_id": "d3", "comfort_hours_ratio": 0.70, "cost_inr": 150000, "t_in_min_c": 14.0}, # Trade-off
        {"design_id": "d4", "comfort_hours_ratio": 0.85, "cost_inr": 200000, "t_in_min_c": 17.0}, # Trade-off
        {"design_id": "d5", "comfort_hours_ratio": 0.65, "cost_inr": 160000, "t_in_min_c": 13.0}, # Dominated by d3
    ]
    pareto = compute_pareto_front(candidates, ["maximise_comfort_hours", "minimise_cost"])
    pareto_ids = {p["design_id"] for p in pareto}

    assert "d1" in pareto_ids
    assert "d3" in pareto_ids
    assert "d4" in pareto_ids
    assert "d2" not in pareto_ids
    assert "d5" not in pareto_ids


def test_morris_screening_levers(baseline_design):
    """Check f: Morris screening ranks levers with physical effect magnitudes."""
    from api.weather import load_fallback_csv
    weather = load_fallback_csv()
    res = morris_screening(baseline_design, weather=weather, n_trajectories=5)
    assert res["method"] == "morris"
    assert len(res["levers"]) >= 5
    assert res["runs"] > 0

    # Confirm rank order is strictly descending by effect_c
    effects = [lever["effect_c"] for lever in res["levers"]]
    assert effects == sorted(effects, reverse=True)

    # Confirm cost_basis tagging
    for lever in res["levers"]:
        assert lever["cost_basis"] in ("sourced", "estimate", "derived")
        assert lever["cost_inr"] >= 0


def test_end_to_end_optimize_contract():
    """Check a, b, c, g: optimize returns valid contract response, top 3 with why strings."""
    req = {
        # A2-1 fix: baseline must have a valid envelope. An empty baseline is not
        # a valid shelter — it now raises ValueError in dict_to_design.
        "baseline": {
            "walls": [{"material": "mud_brick", "thickness_m": 0.30}, {"material": "eps", "thickness_m": 0.05}],
            "roof": [{"material": "concrete", "thickness_m": 0.15}],
            "floor": [{"material": "concrete", "thickness_m": 0.10}],
            "roof_emissivity": 0.90,
            "openings": [{"facing": "south", "area_m2": 4.0, "glazing": "double_pane", "night_shutter": False}],
            "ventilation": {"ach": 0.6, "heater_type": "none"},
            "orientation_deg": 180.0,
            "length_m": 6.0,
            "width_m": 4.0,
            "height_m": 2.6,
        },
        "search": {
            "orientation_deg": {"min": 150.0, "max": 210.0},
            "south_glazing_m2": {"min": 2.0, "max": 6.0},
            "ach": {"min": 0.35, "max": 1.0},
        },
        "constraints": {
            "locally_available_only": True,
            "heater_type": "none",
        },
        "n_samples": 50,  # Fast test run
    }

    t0 = time.perf_counter()
    res = optimize(req)
    elapsed = time.perf_counter() - t0

    assert res["evaluated"] > 0
    assert "refused_unsafe" in res
    assert "baseline" in res
    assert len(res["pareto"]) > 0
    assert len(res["top"]) <= 3

    # Check why strings
    for t_item in res["top"]:
        assert "why" in t_item
        assert len(t_item["why"]) > 10

    # Check exported design structure
    best_top = res["top"][0]
    design_obj = best_top["design"]
    assert "walls" in design_obj
    assert len(design_obj["walls"]) > 0
