"""
THERMA Surrogate Model C: Multi-Target Heat Loss Regressor
Smart India Hackathon 2026 - DRDO PS 26051

Trains and evaluates an ML multi-target regressor predicting separate heat loss flux components:
(Q_wall, Q_roof, Q_floor, Q_glazing, Q_infiltration, Q_sky) in Watts.
"""

from __future__ import annotations

from pathlib import Path
import pickle
import sys
from typing import Any, Dict, List
import numpy as np
from sklearn.multioutput import MultiOutputRegressor
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.preprocessing.preprocess import ThermaPreprocessor, load_dataset_split


TARGET_COLS = [
    "wall_conduction_W",
    "roof_conduction_W",
    "floor_conduction_W",
    "glazing_conduction_W",
    "infiltration_heat_loss_W",
    "sky_longwave_loss_W",
]


def train_heat_loss_surrogate(
    data_dir: str | Path = "data/ml",
    model_save_path: str | Path = "ml/training/model_heat_loss.pkl",
) -> Dict[str, Any]:
    """Train Model C multi-target heat loss regressor."""
    data_dir = Path(data_dir)
    train_rows, _ = load_dataset_split(data_dir / "train.csv")
    test_rows, _ = load_dataset_split(data_dir / "test.csv")

    print(f"Training Multi-Target Heat Loss Regressor on {len(train_rows)} train records...")

    preprocessor = ThermaPreprocessor()
    preprocessor.fit(train_rows)

    X_train = preprocessor.transform(train_rows, scale=True)
    Y_train = np.array([[float(r[col]) for col in TARGET_COLS] for r in train_rows])

    X_test = preprocessor.transform(test_rows, scale=True)
    Y_test = np.array([[float(r[col]) for col in TARGET_COLS] for r in test_rows])

    base_reg = HistGradientBoostingRegressor(max_iter=100, random_state=26051)
    multi_model = MultiOutputRegressor(base_reg)
    multi_model.fit(X_train, Y_train)

    Y_pred = multi_model.predict(X_test)

    metrics: Dict[str, Dict[str, float]] = {}
    print("Model C (Heat Loss Component Fluxes) Test Results:")
    for idx, col in enumerate(TARGET_COLS):
        r2 = float(r2_score(Y_test[:, idx], Y_pred[:, idx]))
        mae = float(mean_absolute_error(Y_test[:, idx], Y_pred[:, idx]))
        metrics[col] = {"r2": r2, "mae_W": mae}
        print(f"  {col:<26}: R² = {r2:.4f}, MAE = {mae:.1f} W")

    model_save_path = Path(model_save_path)
    model_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(model_save_path, "wb") as f:
        pickle.dump({"model": multi_model, "preprocessor": preprocessor, "targets": TARGET_COLS}, f)

    return metrics


if __name__ == "__main__":
    train_heat_loss_surrogate()
