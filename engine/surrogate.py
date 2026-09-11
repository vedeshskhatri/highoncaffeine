"""ML Surrogate Model for THERMA Shelter Thermal Engine.

Approximates the EN ISO 52016-1 5R1C multi-node dynamic RC thermal solver.
Trained exclusively on synthetic batch runs from our own physics solver to enable
sub-millisecond evaluation during combinatorial design space optimization.

CRITICAL ARCHITECTURAL CONSTRAINTS (per brain/17_DECISIONS.md D20):
1. The surrogate DOES NOT REPLACE the physics solver. It approximates it for
   fast interactive screening.
2. The empirical validation suite (validation/) and final compliance spec sheets
   strictly execute the ISO 52016-1 ODE solver, NEVER the surrogate.
3. Any UI metric generated via this surrogate displays a "surrogate estimate" badge.

Author: Vedesh
"""

from __future__ import annotations

import json
import math
import os
import pickle
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from engine.types import Design, Layer, Opening
from engine.materials import load as load_materials

MODEL_DIR = Path(__file__).resolve().parent.parent / "data" / "surrogate"
DEFAULT_MODEL_PATH = MODEL_DIR / "surrogate_model.pkl"
DEFAULT_METRICS_PATH = MODEL_DIR / "metrics.json"

FEATURE_NAMES = [
    "orientation_deg",      # 0: Solar orientation [deg, 0-360]
    "length_m",             # 1: Shelter length [m]
    "width_m",              # 2: Shelter width [m]
    "height_m",             # 3: Shelter height [m]
    "wall_thick_m",         # 4: Structural wall thickness [m]
    "wall_k",               # 5: Thermal conductivity of structural wall [W/(m*K)]
    "wall_rhocp",           # 6: Volumetric heat capacity of wall [J/(m3*K)]
    "insul_thick_m",        # 7: External insulation thickness [m]
    "insul_k",              # 8: Insulation conductivity [W/(m*K)]
    "roof_thick_m",         # 9: Concrete roof thickness [m]
    "floor_thick_m",        # 10: Concrete floor thickness [m]
    "south_glazing_m2",     # 11: South window area [m2]
    "glazing_u_value",      # 12: Window U-value [W/(m2*K)]
    "glazing_g_value",      # 13: Solar heat gain coefficient g
    "night_shutter",        # 14: Insulated night shutter fitted [0 or 1]
    "roof_emissivity",      # 15: Roof longwave emissivity [0.2 - 0.95]
    "ach",                  # 16: Air changes per hour [1/h]
    "t_out_mean_c",         # 17: Mean outdoor air temperature [deg C]
    "t_out_swing_c",        # 18: Diurnal temperature swing [deg C]
    "peak_dni",             # 19: Peak direct normal irradiance [W/m2]
    "altitude_m",           # 20: Site altitude above sea level [m]
]

TARGET_NAMES = [
    "t_in_min_c",           # 0: Overnight minimum temperature [deg C] (CRITICAL)
    "t_in_max_c",           # 1: Daytime maximum temperature [deg C]
    "t_in_mean_c",          # 2: 24-hour diurnal mean temperature [deg C]
    "comfort_hours_ratio",  # 3: Fraction of 24h in IMAC adaptive comfort band [0-1]
    "hours_below_health",   # 4: Hours below health threshold (< 10 deg C) [0-24]
]

IS_SURROGATE: bool = True
MODEL_SOURCE: str = "ISO52016-1_solver_surrogate"


def design_to_feature_vector(
    design: Design,
    climate: Optional[Dict[str, float]] = None,
    materials_db: Optional[Any] = None,
) -> np.ndarray:
    """Convert a Design dataclass and climate context into the 21-element feature vector.

    Args:
        design: Shelter Design object
        climate: Climate parameters (t_out_mean_c, t_out_swing_c, peak_dni, altitude_m)
        materials_db: Loaded materials dictionary

    Returns:
        1D float64 array of length 21
    """
    if materials_db is None:
        materials_db = load_materials()

    climate = climate or {}
    t_out_mean = float(climate.get("t_out_mean_c", climate.get("t_air_mean", -15.0)))
    t_out_swing = float(climate.get("t_out_swing_c", climate.get("swing", 12.0)))
    peak_dni = float(climate.get("peak_dni", climate.get("dni_max", 650.0)))
    altitude_m = float(climate.get("altitude_m", 3500.0))

    # Wall analysis: dominant structural layer and insulation layer
    wall_th = 0.30
    wall_k = 0.75
    wall_rhocp = 1700.0 * 880.0
    insul_th = 0.0
    insul_k = 0.036

    for lyr in design.walls:
        mat = materials_db.get(lyr.material_id)
        if not mat:
            continue
        if mat.category == "structural":
            wall_th = lyr.thickness_m
            wall_k = float(mat.k)
            wall_rhocp = float(mat.rho * mat.cp)
        elif mat.category == "insulation" or "eps" in lyr.material_id or "wool" in lyr.material_id:
            insul_th += lyr.thickness_m
            insul_k = float(mat.k)

    # Roof & Floor
    roof_th = sum(l.thickness_m for l in design.roof) if design.roof else 0.15
    floor_th = sum(l.thickness_m for l in design.floor) if design.floor else 0.10

    # Glazing & Openings
    south_glazing_m2 = 0.0
    glaze_u = 2.8
    glaze_g = 0.76
    night_shutter = bool(design.night_shutter)

    for op in design.openings:
        if op.facing == "south":
            south_glazing_m2 += op.area_m2
            g_mat = materials_db.get(op.glazing_id)
            if g_mat:
                if g_mat.u_value:
                    glaze_u = float(g_mat.u_value)
                if g_mat.g_value:
                    glaze_g = float(g_mat.g_value)
            if op.night_shutter:
                night_shutter = True

    # Default fallback if no south openings
    if south_glazing_m2 == 0.0 and len(design.openings) > 0:
        south_glazing_m2 = sum(op.area_m2 for op in design.openings)

    features = [
        float(design.orientation_deg),
        float(design.length_m),
        float(design.width_m),
        float(design.height_m),
        float(wall_th),
        float(wall_k),
        float(wall_rhocp),
        float(insul_th),
        float(insul_k),
        float(roof_th),
        float(floor_th),
        float(south_glazing_m2),
        float(glaze_u),
        float(glaze_g),
        1.0 if night_shutter else 0.0,
        float(design.roof_emissivity),
        float(design.ach),
        float(t_out_mean),
        float(t_out_swing),
        float(peak_dni),
        float(altitude_m),
    ]

    return np.array(features, dtype=np.float64)


class SurrogateModel:
    """Fast neural network meta-model approximating the ISO 52016-1 solver."""

    def __init__(self, model_path: Optional[Union[str, Path]] = None) -> None:
        self.scaler = StandardScaler()
        self.regressor = MLPRegressor(
            hidden_layer_sizes=(128, 64, 32),
            activation="relu",
            solver="adam",
            alpha=0.0001,
            batch_size=64,
            learning_rate_init=0.001,
            max_iter=600,
            early_stopping=True,
            n_iter_no_change=25,
            validation_fraction=0.15,
            random_state=42,
            verbose=False,
        )
        self.is_fitted: bool = False
        self.training_metadata: Dict[str, Any] = {}
        self.test_metrics: Dict[str, Any] = {}

        if model_path is not None:
            self.load(model_path)
        elif DEFAULT_MODEL_PATH.exists():
            self.load(DEFAULT_MODEL_PATH)

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "SurrogateModel":
        """Fit scaler and MLPRegressor on training data."""
        X_scaled = self.scaler.fit_transform(X_train)
        self.regressor.fit(X_scaled, y_train)
        self.is_fitted = True
        if metadata:
            self.training_metadata = metadata
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict targets for 2D feature matrix (N, 21)."""
        if not self.is_fitted:
            raise RuntimeError("SurrogateModel is not fitted or loaded yet.")
        if X.ndim == 1:
            X = X.reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        preds = self.regressor.predict(X_scaled)
        if preds.ndim == 1 and len(TARGET_NAMES) > 1:
            preds = preds.reshape(1, -1)
        return preds

    def predict_design(
        self,
        design: Design,
        climate: Optional[Dict[str, float]] = None,
        materials_db: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Predict thermal targets for a single design candidate."""
        feat = design_to_feature_vector(design, climate, materials_db)
        preds = self.predict(feat)[0]

        return {
            "source": "surrogate_estimate",
            "is_surrogate": True,
            "badge": "surrogate estimate",
            "t_in_min_c": round(float(preds[0]), 2),
            "t_in_max_c": round(float(preds[1]), 2),
            "t_in_mean_c": round(float(preds[2]), 2),
            "comfort_hours_ratio": round(float(np.clip(preds[3], 0.0, 1.0)), 3),
            "hours_below_health": round(float(np.clip(preds[4], 0.0, 24.0)), 1),
        }

    def predict_designs_batch(
        self,
        designs: List[Design],
        climate: Optional[Dict[str, float]] = None,
        materials_db: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """Predict thermal targets for a batch of candidate designs instantly."""
        if not designs:
            return []
        feats = np.array([design_to_feature_vector(d, climate, materials_db) for d in designs])
        preds = self.predict(feats)

        results = []
        for i in range(len(designs)):
            p = preds[i]
            results.append({
                "source": "surrogate_estimate",
                "is_surrogate": True,
                "badge": "surrogate estimate",
                "t_in_min_c": round(float(p[0]), 2),
                "t_in_max_c": round(float(p[1]), 2),
                "t_in_mean_c": round(float(p[2]), 2),
                "comfort_hours_ratio": round(float(np.clip(p[3], 0.0, 1.0)), 3),
                "hours_below_health": round(float(np.clip(p[4], 0.0, 24.0)), 1),
            })
        return results

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
        """Evaluate model performance on held-out test dataset."""
        y_pred = self.predict(X_test)
        metrics: Dict[str, Any] = {}

        for t_idx, name in enumerate(TARGET_NAMES):
            yt = y_test[:, t_idx]
            yp = y_pred[:, t_idx]

            rmse = float(np.sqrt(mean_squared_error(yt, yp)))
            mae = float(mean_absolute_error(yt, yp))
            max_err = float(np.max(np.abs(yt - yp)))
            r2 = float(r2_score(yt, yp))

            metrics[name] = {
                "rmse": round(rmse, 3),
                "mae": round(mae, 3),
                "max_error": round(max_err, 3),
                "r2": round(r2, 4),
            }

        # Check critical acceptance criteria
        t_in_min_max_err = metrics["t_in_min_c"]["max_error"]
        acceptance_passed = t_in_min_max_err <= 1.0

        summary = {
            "targets": metrics,
            "t_in_min_c_max_error": t_in_min_max_err,
            "acceptance_passed": acceptance_passed,
            "n_test_samples": len(X_test),
        }
        self.test_metrics = summary
        return summary

    def save(self, model_path: Union[str, Path] = DEFAULT_MODEL_PATH) -> None:
        """Serialize scaler, regressor, and metadata to disk."""
        model_path = Path(model_path)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "scaler": self.scaler,
            "regressor": self.regressor,
            "training_metadata": self.training_metadata,
            "test_metrics": self.test_metrics,
            "feature_names": FEATURE_NAMES,
            "target_names": TARGET_NAMES,
            "timestamp": time.time(),
        }
        with open(model_path, "wb") as f:
            pickle.dump(payload, f)

    def load(self, model_path: Union[str, Path] = DEFAULT_MODEL_PATH) -> None:
        """Load model state from disk."""
        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(f"Surrogate model file not found: {model_path}")
        with open(model_path, "rb") as f:
            payload = pickle.load(f)
        self.scaler = payload["scaler"]
        self.regressor = payload["regressor"]
        self.training_metadata = payload.get("training_metadata", {})
        self.test_metrics = payload.get("test_metrics", {})
        self.is_fitted = True


# Global singleton instance for high-efficiency reuse
_GLOBAL_SURROGATE: Optional[SurrogateModel] = None


def get_surrogate_model() -> SurrogateModel:
    """Retrieve global cached surrogate model instance."""
    global _GLOBAL_SURROGATE
    if _GLOBAL_SURROGATE is None:
        _GLOBAL_SURROGATE = SurrogateModel()
    return _GLOBAL_SURROGATE
