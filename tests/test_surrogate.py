"""Test suite for Phase V7 / Decision D20: ML Surrogate Model.

Author: Vedesh
Verifies:
  1. SurrogateModel loads successfully and predicts valid physical numbers.
  2. Test-set max error on t_in_min_c <= 1.0 °C (critical acceptance criterion).
  3. Prediction speedup over full solver (> 1000x faster for candidate batches).
  4. Every surrogate response carries the 'surrogate estimate' badge and source tag.
  5. The empirical validation suite (validation/run.py, engine/solver.py) has
     ZERO surrogate imports or dependencies — physics ground truth remains pure.
  6. FastAPI endpoints GET /surrogate/metrics and POST /surrogate/predict.
"""

import json
from pathlib import Path
import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.main import app
from engine.surrogate import (
    DEFAULT_MODEL_PATH,
    DEFAULT_METRICS_PATH,
    SurrogateModel,
    get_surrogate_model,
)
from engine.types import Design, Layer, Opening


@pytest.fixture
def sample_design() -> Design:
    return Design(
        orientation_deg=180.0,
        walls=(
            Layer(material_id="mud_brick", thickness_m=0.30),
            Layer(material_id="eps_board", thickness_m=0.05),
        ),
        roof=(Layer(material_id="concrete", thickness_m=0.15),),
        floor=(Layer(material_id="concrete", thickness_m=0.10),),
        openings=(
            Opening(facing="south", area_m2=4.0, glazing_id="double_pane", night_shutter=False),
        ),
        ach=0.6,
        roof_emissivity=0.90,
        night_shutter=False,
        length_m=6.0,
        width_m=4.0,
        height_m=2.6,
    )


@pytest.fixture
def sample_climate():
    return {
        "t_out_mean_c": -15.0,
        "t_out_swing_c": 12.0,
        "peak_dni": 650.0,
        "altitude_m": 3500.0,
    }


def test_surrogate_model_loads_and_predicts(sample_design, sample_climate):
    """Verify SurrogateModel loads and predicts physically consistent outputs."""
    surrogate = get_surrogate_model()
    assert surrogate.is_fitted

    res = surrogate.predict_design(sample_design, sample_climate)
    assert res["is_surrogate"] is True
    assert res["source"] == "surrogate_estimate"
    assert res["badge"] == "surrogate estimate"
    assert -40.0 <= res["t_in_min_c"] <= 20.0
    assert res["t_in_min_c"] <= res["t_in_max_c"]
    assert 0.0 <= res["comfort_hours_ratio"] <= 1.0
    assert 0.0 <= res["hours_below_health"] <= 24.0


def test_surrogate_accuracy_acceptance_criterion():
    """Verify held-out test set accuracy satisfies max error <= 1.0 °C on t_in_min."""
    assert DEFAULT_METRICS_PATH.exists(), "Metrics file must exist."
    with open(DEFAULT_METRICS_PATH, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    eval_res = metrics["eval_results"]
    t_in_min_max_err = eval_res["t_in_min_c_max_error"]

    # Critical gate: max error on overnight minimum must not exceed 1.0 °C
    assert t_in_min_max_err <= 1.0, f"Max error on t_in_min_c ({t_in_min_max_err:.3f} °C) exceeds 1.0 °C!"
    assert eval_res["acceptance_passed"] is True

    # Check R2 score on primary thermal targets
    targets = eval_res["targets"]
    assert targets["t_in_min_c"]["r2"] >= 0.99, "R² for t_in_min_c must exceed 0.99"
    assert targets["t_in_max_c"]["r2"] >= 0.99, "R² for t_in_max_c must exceed 0.99"
    assert targets["t_in_mean_c"]["r2"] >= 0.99, "R² for t_in_mean_c must exceed 0.99"


def test_surrogate_batch_speedup(sample_design, sample_climate):
    """Verify batch prediction evaluates 3,000 designs in under 500 milliseconds (sub-millisecond per design)."""
    surrogate = get_surrogate_model()
    designs_3k = [sample_design] * 3000

    import time
    t0 = time.perf_counter()
    preds = surrogate.predict_designs_batch(designs_3k, sample_climate)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert len(preds) == 3000
    assert elapsed_ms < 500.0, f"3,000 predictions took {elapsed_ms:.1f} ms, expected < 500 ms"


def test_validation_path_has_zero_surrogate_dependency():
    """Strict architectural audit: validation and core physics solver must NEVER import surrogate."""
    import inspect
    import engine.solver as solver
    import engine.vectorise as vectorise
    import validation.run as val_run

    solver_src = inspect.getsource(solver)
    vectorise_src = inspect.getsource(vectorise)
    val_run_src = inspect.getsource(val_run)

    assert "surrogate" not in solver_src, "engine.solver must not depend on surrogate!"
    assert "surrogate" not in vectorise_src, "engine.vectorise must not depend on surrogate!"
    assert "surrogate" not in val_run_src, "validation.run must strictly use full solver, never surrogate!"


def test_api_surrogate_metrics_endpoint():
    """Verify GET /surrogate/metrics returns full accuracy and benchmark table."""
    client = TestClient(app)
    response = client.get("/surrogate/metrics")
    assert response.status_code == 200
    data = response.json()

    assert data["trained_on_samples"] >= 10000
    assert data["acceptance_passed"] is True
    assert data["t_in_min_c_max_error"] <= 1.0
    assert "targets" in data
    assert "t_in_min_c" in data["targets"]
    assert "benchmarks" in data
    assert data["benchmarks"]["speedup_ratio"] > 1000


def test_api_surrogate_predict_endpoint():
    """Verify POST /surrogate/predict returns instant prediction with badge and disclaimer."""
    client = TestClient(app)
    payload = {
        "orientation_deg": 180.0,
        "length_m": 6.0,
        "width_m": 4.0,
        "height_m": 2.6,
        "wall_material_id": "mud_brick",
        "wall_thickness_m": 0.30,
        "insulation_thickness_m": 0.05,
        "roof_thickness_m": 0.15,
        "floor_thickness_m": 0.10,
        "south_glazing_m2": 4.0,
        "glazing_type": "double_pane",
        "night_shutter": True,
        "roof_emissivity": 0.90,
        "ach": 0.50,
        "t_out_mean_c": -18.0,
        "t_out_swing_c": 14.0,
        "peak_dni": 700.0,
        "altitude_m": 3800.0,
    }
    response = client.post("/surrogate/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["source"] == "surrogate_estimate"
    assert data["is_surrogate"] is True
    assert data["badge"] == "surrogate estimate"
    assert "timing_ms" in data
    assert data["timing_ms"] < 20.0
    assert -35.0 <= data["t_in_min_c"] <= 10.0
    assert "disclaimer" in data
