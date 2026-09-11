"""
THERMA Surrogate Model A: Indoor Temperature Regressor
Smart India Hackathon 2026 - DRDO PS 26051

Trains and evaluates an ML surrogate regressor predicting hourly indoor air temperature (Tin)
from weather, envelope geometry, materials, insulation, and solar irradiance.
"""

from __future__ import annotations

from pathlib import Path
import pickle
import sys
from typing import Any, Dict, Tuple
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.preprocessing.preprocess import ThermaPreprocessor, load_dataset_split


def train_temperature_surrogate(
    data_dir: str | Path = "data/ml",
    model_save_path: str | Path = "ml/training/model_temperature.pkl",
) -> Dict[str, float]:
    """Train Model A on train.csv and evaluate on test.csv."""
    data_dir = Path(data_dir)
    train_rows, _ = load_dataset_split(data_dir / "train.csv")
    test_rows, _ = load_dataset_split(data_dir / "test.csv")

    print(f"Training Temperature Regressor on {len(train_rows)} train rows...")

    preprocessor = ThermaPreprocessor()
    preprocessor.fit(train_rows)

    X_train = preprocessor.transform(train_rows, scale=True)
    y_train = np.array([float(r["indoor_temperature_C"]) for r in train_rows])

    X_test = preprocessor.transform(test_rows, scale=True)
    y_test = np.array([float(r["indoor_temperature_C"]) for r in test_rows])

    # Train primary Tin model
    model = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_leaf_nodes=31,
        random_state=26051,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    # Train Mean Radiant Temperature (Tmrt) model
    y_train_mrt = np.array([float(r.get("mean_radiant_temperature_C", r["indoor_temperature_C"])) for r in train_rows])
    y_test_mrt = np.array([float(r.get("mean_radiant_temperature_C", r["indoor_temperature_C"])) for r in test_rows])
    model_mrt = HistGradientBoostingRegressor(max_iter=150, learning_rate=0.08, max_leaf_nodes=31, random_state=26051)
    model_mrt.fit(X_train, y_train_mrt)
    r2_mrt = float(r2_score(y_test_mrt, model_mrt.predict(X_test)))

    # Train Operative Temperature (Top) model
    y_train_op = np.array([float(r.get("operative_temperature_C", r["indoor_temperature_C"])) for r in train_rows])
    y_test_op = np.array([float(r.get("operative_temperature_C", r["indoor_temperature_C"])) for r in test_rows])
    model_op = HistGradientBoostingRegressor(max_iter=150, learning_rate=0.08, max_leaf_nodes=31, random_state=26051)
    model_op.fit(X_train, y_train_op)
    r2_op = float(r2_score(y_test_op, model_op.predict(X_test)))

    print(f"Model A (Indoor Temperature) Test Results:")
    print(f"  Tin R² Score:  {r2:.4f} | MAE: {mae:.2f} °C | RMSE: {rmse:.2f} °C")
    print(f"  Tmrt R² Score: {r2_mrt:.4f}")
    print(f"  Top R² Score:  {r2_op:.4f}")

    # Save model package
    model_save_path = Path(model_save_path)
    model_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(model_save_path, "wb") as f:
        pickle.dump({
            "model": model,
            "model_mrt": model_mrt,
            "model_op": model_op,
            "preprocessor": preprocessor,
        }, f)

    return {"r2": r2, "mae": mae, "rmse": rmse, "r2_mrt": r2_mrt, "r2_op": r2_op}



if __name__ == "__main__":
    train_temperature_surrogate()
