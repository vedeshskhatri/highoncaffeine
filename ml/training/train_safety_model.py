"""
THERMA Surrogate Model E: Safety Classifier
Smart India Hackathon 2026 - DRDO PS 26051

Trains and evaluates an ML surrogate classifier predicting safety status (PASS vs REFUSED)
based on shelter ACH, volume, occupancy, and envelope features.
NOTE: Per Section 34, this ML model acts as a fast surrogate; the deterministic
engine.safety rule remains the final life-safety authority.
"""

from __future__ import annotations

from pathlib import Path
import pickle
import sys
from typing import Any, Dict
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.preprocessing.preprocess import ThermaPreprocessor, load_dataset_split


def train_safety_surrogate(
    data_dir: str | Path = "data/ml",
    model_save_path: str | Path = "ml/training/model_safety.pkl",
) -> Dict[str, float]:
    """Train Model E safety classifier."""
    data_dir = Path(data_dir)

    train_rows, _ = load_dataset_split(data_dir / "train.csv")
    test_rows, _ = load_dataset_split(data_dir / "test.csv")

    print(f"Training Safety Classifier on {len(train_rows)} train rows...")

    preprocessor = ThermaPreprocessor()
    preprocessor.fit(train_rows)

    X_train = preprocessor.transform(train_rows, scale=True)
    y_train = np.array([1 if r.get("safety_status") == "PASS" else 0 for r in train_rows])

    X_test = preprocessor.transform(test_rows, scale=True)
    y_test = np.array([1 if r.get("safety_status") == "PASS" else 0 for r in test_rows])

    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=26051, n_jobs=-1)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred, average="binary", zero_division=0))

    print(f"Model E (Safety Classifier) Test Results:")
    print(f"  Accuracy:  {acc * 100:.2f}%")
    print(f"  F1 Score:  {f1:.4f}")

    model_save_path = Path(model_save_path)
    model_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(model_save_path, "wb") as f:
        pickle.dump({"model": clf, "preprocessor": preprocessor}, f)

    return {"accuracy": acc, "f1": f1}


if __name__ == "__main__":
    train_safety_surrogate()
