"""
THERMA Surrogate Model D: Thermal Comfort and Risk Classifier
Smart India Hackathon 2026 - DRDO PS 26051

Predicts comfort status (WARM, COMFORT, COLD) and thermal risk class (LOW, ELEVATED)
from weather and building envelope configuration.
"""

from __future__ import annotations

from pathlib import Path
import pickle
import sys
from typing import Any, Dict
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.preprocessing.preprocess import ThermaPreprocessor, load_dataset_split


def train_comfort_surrogate(
    data_dir: str | Path = "data/ml",
    model_save_path: str | Path = "ml/training/model_comfort.pkl",
) -> Dict[str, Any]:
    """Train Model D comfort classification surrogate."""
    data_dir = Path(data_dir)

    train_rows, _ = load_dataset_split(data_dir / "train.csv")
    test_rows, _ = load_dataset_split(data_dir / "test.csv")

    print(f"Training Comfort Classifier on {len(train_rows)} train records...")

    preprocessor = ThermaPreprocessor()
    preprocessor.fit(train_rows)

    X_train = preprocessor.transform(train_rows, scale=True)
    X_test = preprocessor.transform(test_rows, scale=True)

    comfort_labels = sorted(list({r["comfort_status"] for r in train_rows if r.get("comfort_status")}))
    c_label_map = {l: i for i, l in enumerate(comfort_labels)}
    y_train_c = np.array([c_label_map[r["comfort_status"]] for r in train_rows])
    y_test_c = np.array([c_label_map[r["comfort_status"]] for r in test_rows])

    risk_labels = sorted(list({r["thermal_risk_class"] for r in train_rows if r.get("thermal_risk_class")}))
    r_label_map = {l: i for i, l in enumerate(risk_labels)}
    y_train_r = np.array([r_label_map[r["thermal_risk_class"]] for r in train_rows])
    y_test_r = np.array([r_label_map[r["thermal_risk_class"]] for r in test_rows])

    clf_comfort = HistGradientBoostingClassifier(max_iter=100, random_state=26051)
    clf_comfort.fit(X_train, y_train_c)
    y_pred_c = clf_comfort.predict(X_test)
    acc_c = float(accuracy_score(y_test_c, y_pred_c))
    f1_c = float(f1_score(y_test_c, y_pred_c, average="macro", zero_division=0))

    clf_risk = HistGradientBoostingClassifier(max_iter=100, random_state=26051)
    clf_risk.fit(X_train, y_train_r)
    y_pred_r = clf_risk.predict(X_test)
    acc_r = float(accuracy_score(y_test_r, y_pred_r))
    f1_r = float(f1_score(y_test_r, y_pred_r, average="macro", zero_division=0))

    print(f"Model D (Comfort & Risk Classification) Test Results:")
    print(f"  Comfort Status Accuracy: {acc_c * 100:.2f}%, F1: {f1_c:.4f}")
    print(f"  Thermal Risk Accuracy:   {acc_r * 100:.2f}%, F1: {f1_r:.4f}")

    model_save_path = Path(model_save_path)
    model_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(model_save_path, "wb") as f:
        pickle.dump({
            "model_comfort": clf_comfort,
            "model_risk": clf_risk,
            "preprocessor": preprocessor,
            "comfort_labels": comfort_labels,
            "risk_labels": risk_labels,
        }, f)

    return {
        "comfort_accuracy": acc_c,
        "comfort_f1": f1_c,
        "risk_accuracy": acc_r,
        "risk_f1": f1_r,
    }


if __name__ == "__main__":
    train_comfort_surrogate()
