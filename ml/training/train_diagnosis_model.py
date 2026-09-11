"""
THERMA Surrogate Model B: Thermal Diagnosis Classifier
Smart India Hackathon 2026 - DRDO PS 26051

Trains and evaluates an ML classifier predicting the dominant heat loss bottleneck
(WALL, ROOF, FLOOR, GLAZING, INFILTRATION, SKY_RADIATION) from envelope and climate parameters.
"""

from __future__ import annotations

import csv
from pathlib import Path
import pickle
import sys
from typing import Any, Dict, List, Tuple
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.preprocessing.preprocess import ThermaPreprocessor, load_dataset_split


def train_diagnosis_surrogate(
    data_dir: str | Path = "data/ml",
    model_save_path: str | Path = "ml/training/model_diagnosis.pkl",
) -> Dict[str, float]:
    """Train Model B dominant weakness classifier."""
    data_dir = Path(data_dir)

    # Diagnosis data is at simulation level
    train_csv = data_dir / "train.csv"
    test_csv = data_dir / "test.csv"

    train_rows, _ = load_dataset_split(train_csv)
    test_rows, _ = load_dataset_split(test_csv)

    print(f"Training Diagnosis Classifier on {len(train_rows)} train rows...")

    preprocessor = ThermaPreprocessor()
    preprocessor.fit(train_rows)

    X_train = preprocessor.transform(train_rows, scale=True)
    labels = sorted(list({r["dominant_heat_loss_component"] for r in train_rows if r.get("dominant_heat_loss_component")}))
    label_to_idx = {l: i for i, l in enumerate(labels)}

    y_train = np.array([label_to_idx[r["dominant_heat_loss_component"]] for r in train_rows])

    X_test = preprocessor.transform(test_rows, scale=True)
    y_test = np.array([label_to_idx[r["dominant_heat_loss_component"]] for r in test_rows])

    clf = HistGradientBoostingClassifier(
        max_iter=100,
        learning_rate=0.08,
        random_state=26051,
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

    print(f"Model B (Thermal Diagnosis Classifier) Test Results:")
    print(f"  Accuracy:  {acc * 100:.2f}%")
    print(f"  Macro F1:  {macro_f1:.4f}")

    model_save_path = Path(model_save_path)
    model_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(model_save_path, "wb") as f:
        pickle.dump({"model": clf, "preprocessor": preprocessor, "labels": labels}, f)

    return {"accuracy": acc, "f1_macro": macro_f1}


if __name__ == "__main__":
    train_diagnosis_surrogate()
