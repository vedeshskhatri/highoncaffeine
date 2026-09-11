"""
THERMA Surrogate Models Evaluation Suite
Smart India Hackathon 2026 - DRDO PS 26051

Executes and reports comprehensive evaluation metrics across all 5 surrogate models:
- Model A: Indoor Temperature Predictor (R², MAE, RMSE)
- Model B: Thermal Diagnosis Model (Accuracy, Macro-F1)
- Model C: Heat Loss Regression (Per-component R², MAE)
- Model D: Comfort Prediction (R², MAE)
- Model E: Safety Classifier (Accuracy, Precision, Recall, F1)
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any, Dict

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.training.train_temperature_model import train_temperature_surrogate
from ml.training.train_diagnosis_model import train_diagnosis_surrogate
from ml.training.train_heat_loss_model import train_heat_loss_surrogate
from ml.training.train_comfort_model import train_comfort_surrogate
from ml.training.train_safety_model import train_safety_surrogate


def run_full_evaluation(data_dir: str | Path = "data/ml") -> Dict[str, Any]:
    """Execute training and evaluation for all surrogate models."""
    print("=" * 70)
    print("THERMA SURROGATE MODELS TRAINING & EVALUATION SUITE")
    print("=" * 70)

    print("\n--- Training Model A: Indoor Temperature Regressor ---")
    m_a = train_temperature_surrogate(data_dir=data_dir)

    print("\n--- Training Model B: Thermal Diagnosis Classifier ---")
    m_b = train_diagnosis_surrogate(data_dir=data_dir)

    print("\n--- Training Model C: Multi-Target Heat Loss Regressor ---")
    m_c = train_heat_loss_surrogate(data_dir=data_dir)

    print("\n--- Training Model D: Comfort Summary Regressor ---")
    m_d = train_comfort_surrogate(data_dir=data_dir)

    print("\n--- Training Model E: Safety Classifier ---")
    m_e = train_safety_surrogate(data_dir=data_dir)

    summary = {
        "model_a_temperature": m_a,
        "model_b_diagnosis": m_b,
        "model_c_heat_loss": m_c,
        "model_d_comfort": m_d,
        "model_e_safety": m_e,
    }

    out_json = Path(data_dir) / "evaluation_summary.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 70)
    print(f"Evaluation summary saved to: {out_json}")
    print("=" * 70)

    return summary


if __name__ == "__main__":
    run_full_evaluation()
