"""
THERMA Surrogate ML Models & Final Dataset Validation Suite
Smart India Hackathon 2026 - DRDO PS 26051
Area-Specific Shelter Design for Thermal Comfort Maintenance

Verifies:
1. Final dataset splits (train=84k, val=18k, test=18k) have zero simulation leakage
2. All 5 trained surrogate models are loadable and achieve benchmark evaluation metrics
3. Inference engine predicts Tin, Tmrt, Top, heat loss fluxes, comfort, and safety
4. Deterministic safety interlock (ACH < 0.35 for combustion) is strictly enforced
5. Question-answering engine produces physics-grounded predictions
"""

import csv
import json
from pathlib import Path
import pytest

from ml.inference import ThermaInferenceEngine

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data" / "ml"
MODELS_DIR = REPO_ROOT / "ml" / "training"


@pytest.fixture(scope="module")
def inference_engine():
    return ThermaInferenceEngine.get_instance()


def test_01_final_dataset_splits_and_zero_leakage():
    """Verify 120,000 total rows partitioned with zero simulation ID leakage."""
    train_p = DATA_DIR / "train.csv"
    val_p = DATA_DIR / "validation.csv"
    test_p = DATA_DIR / "test.csv"

    assert train_p.exists() and val_p.exists() and test_p.exists()

    def load_sims(path):
        with open(path, "r", encoding="utf-8") as f:
            return {r["simulation_id"] for r in csv.DictReader(f)}

    train_sims = load_sims(train_p)
    val_sims = load_sims(val_p)
    test_sims = load_sims(test_p)

    assert len(train_sims) == 3500, f"Expected 3500 train simulations, got {len(train_sims)}"
    assert len(val_sims) == 750, f"Expected 750 val simulations, got {len(val_sims)}"
    assert len(test_sims) == 750, f"Expected 750 test simulations, got {len(test_sims)}"

    # Zero leakage
    assert len(train_sims.intersection(val_sims)) == 0, "Leakage between train and validation"
    assert len(train_sims.intersection(test_sims)) == 0, "Leakage between train and test"
    assert len(val_sims.intersection(test_sims)) == 0, "Leakage between validation and test"


def test_02_surrogate_model_artifacts_exist():
    """Verify all 5 surrogate model pickle files exist."""
    models = [
        "model_temperature.pkl",
        "model_diagnosis.pkl",
        "model_heat_loss.pkl",
        "model_comfort.pkl",
        "model_safety.pkl",
    ]
    for m in models:
        p = MODELS_DIR / m
        assert p.exists(), f"Missing trained model artifact: {p}"
        assert p.stat().st_size > 10000, f"Model file suspiciously small: {p}"


def test_03_evaluation_summary_metrics():
    """Verify evaluation summary meets Hackathon benchmark targets."""
    summary_path = DATA_DIR / "evaluation_summary.json"
    assert summary_path.exists(), "Missing evaluation_summary.json"

    with open(summary_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    # Model A: Tin R2 >= 0.85, MAE < 3.5°C
    m_a = metrics["model_a_temperature"]
    assert m_a["r2"] >= 0.85, f"Model A R2 score too low: {m_a['r2']}"
    assert m_a["mae"] < 3.5, f"Model A MAE too high: {m_a['mae']}"

    # Model B: Diagnosis Accuracy >= 90%
    m_b = metrics["model_b_diagnosis"]
    assert m_b["accuracy"] >= 0.90, f"Model B Accuracy too low: {m_b['accuracy']}"

    # Model C: Multi-target heat loss fluxes R2 >= 0.85
    m_c = metrics["model_c_heat_loss"]
    assert m_c["wall_conduction_W"]["r2"] >= 0.85
    assert m_c["sky_longwave_loss_W"]["r2"] >= 0.85

    # Model D: Comfort accuracy >= 90%
    m_d = metrics["model_d_comfort"]
    assert m_d["comfort_accuracy"] >= 0.90
    assert m_d["risk_accuracy"] >= 0.90

    # Model E: Safety accuracy >= 95%
    m_e = metrics["model_e_safety"]
    assert m_e["accuracy"] >= 0.95


def test_04_direct_inference_prediction(inference_engine):
    """Test multi-model prediction output on high-altitude shelter scenario."""
    res = inference_engine.predict({
        "location": "Leh",
        "outdoor_temperature_C": -15.0,
        "wall_material": "stone_masonry",
        "wall_insulation_thickness_m": 0.05,
        "ach": 0.6,
        "occupants": 8,
    })

    assert "predicted_indoor_temperature_C" in res
    assert "predicted_operative_temperature_C" in res
    assert "predicted_mean_radiant_temperature_C" in res
    assert "dominant_heat_loss_component" in res
    assert "predicted_comfort_status" in res
    assert "predicted_safety_status" in res
    assert "predicted_heat_loss_fluxes_W" in res

    # Physical reasonability
    tin = res["predicted_indoor_temperature_C"]
    assert -25.0 < tin < 25.0, f"Unphysical indoor temperature: {tin}"
    assert res["predicted_comfort_status"] in ("COMFORT", "COLD", "WARM")
    assert res["predicted_safety_status"] == "PASS"

    fluxes = res["predicted_heat_loss_fluxes_W"]
    assert fluxes["wall_conduction_W"] > 0
    assert fluxes["sky_longwave_loss_W"] > 0
    assert fluxes["total_heat_loss_W"] > 0


def test_05_safety_combustion_interlock(inference_engine):
    """Verify that combustion heater with ACH < 0.35 is strictly REFUSED."""
    unsafe_res = inference_engine.predict({
        "location": "Siachen_Base_Camp",
        "outdoor_temperature_C": -25.0,
        "ach": 0.2,
        "heater_type": "bukkhari",
    })
    assert unsafe_res["predicted_safety_status"] == "REFUSED"
    assert "asphyxiation" in unsafe_res["safety_reason"].lower() or "safety" in unsafe_res["safety_reason"].lower()


def test_06_natural_question_answering(inference_engine):
    """Verify that question answering extracts entities and provides predicted metrics."""
    q = "What is the predicted indoor temperature for a shelter in Siachen with stone masonry and 0.5 ACH?"
    ans = inference_engine.answer_question(q, use_ollama=False)

    assert ans["question"] == q
    assert "predictions" in ans
    pred = ans["predictions"]
    assert isinstance(pred["indoor_temperature_C"], float)
    assert isinstance(pred["operative_temperature_C"], float)
    assert pred["dominant_heat_loss"] in ("wall", "roof", "sky", "infiltration", "glazing", "floor")
    assert "answer" in ans
    assert str(pred["indoor_temperature_C"]) in ans["answer"]


def test_07_all_locations_resolved(inference_engine):
    """Verify all 39 Himalayan scenario locations are indexed and resolvable."""
    assert len(inference_engine.locations_by_name) >= 39
    sample_locs = ["siachen_base_camp", "dras", "nyoma", "rezang_la", "chushul", "galwan_valley"]
    for loc in sample_locs:
        assert loc in inference_engine.locations_by_name, f"Missing location index for {loc}"
