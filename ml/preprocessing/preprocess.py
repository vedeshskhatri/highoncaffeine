"""
THERMA ML Preprocessing Pipeline
Smart India Hackathon 2026 - DRDO PS 26051

Transforms raw tabular features into encoded, scaled numpy feature matrices
while strictly preserving human-readable categorical fields in the CSV files.
"""

from __future__ import annotations

import csv
from pathlib import Path
import sys
from typing import Any, Dict, List, Tuple
import numpy as np

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))


NUMERICAL_FEATURES = [
    "hour",
    "latitude_deg",
    "longitude_deg",
    "altitude_m",
    "outdoor_temperature_C",
    "relative_humidity_pct",
    "wind_speed_mps",
    "cloud_fraction",
    "snow_depth_m",
    "ghi_W_m2",
    "dni_W_m2",
    "dhi_W_m2",
    "solar_altitude_deg",
    "solar_azimuth_deg",
    "surface_incidence_deg",
    "surface_irradiance_W_m2",
    "sky_temperature_C",
    "air_pressure_Pa",
    "air_density_kg_m3",
    "thermal_mass_J_K",
    "wall_U_W_m2K",
    "roof_U_W_m2K",
    "ach",
    "glazing_area_m2",
    "orientation_deg",
    "wall_thickness_m",
    "wall_insulation_thickness_m",
    "roof_thickness_m",
    "roof_insulation_thickness_m",
    "night_shutter",
    "roof_emissivity",
    "snow_albedo",
    "occupants",
]

CATEGORICAL_FEATURES = [
    "wall_material",
    "region",
]


class ThermaPreprocessor:
    """Preprocesses raw dataset rows into numerical numpy arrays for ML models."""

    def __init__(self):
        self.cat_categories: Dict[str, List[str]] = {}
        self.feature_names: List[str] = []
        self.mean_: np.ndarray = None
        self.scale_: np.ndarray = None

    def fit(self, rows: List[Dict[str, Any]]) -> "ThermaPreprocessor":
        """Learn categories and feature scaling statistics from training rows."""
        # Find unique categories
        for cat_col in CATEGORICAL_FEATURES:
            unique_vals = sorted(list({r.get(cat_col, "none") for r in rows}))
            self.cat_categories[cat_col] = unique_vals

        # Build feature names
        fnames = list(NUMERICAL_FEATURES)
        for cat_col, vals in self.cat_categories.items():
            for v in vals:
                fnames.append(f"{cat_col}_{v}")
        self.feature_names = fnames

        # Compute mean and standard deviation for scaling
        raw_X = self._transform_matrix(rows)
        self.mean_ = np.nanmean(raw_X, axis=0)
        self.scale_ = np.nanstd(raw_X, axis=0)
        # Avoid division by zero
        self.scale_[self.scale_ < 1e-6] = 1.0

        return self

    def _transform_matrix(self, rows: List[Dict[str, Any]]) -> np.ndarray:
        """Internal matrix assembly."""
        num_rows = len(rows)
        # Numerical cols
        num_data = np.zeros((num_rows, len(NUMERICAL_FEATURES)), dtype=np.float64)
        for i, r in enumerate(rows):
            for j, f in enumerate(NUMERICAL_FEATURES):
                try:
                    num_data[i, j] = float(r.get(f, 0.0))
                except (ValueError, TypeError):
                    num_data[i, j] = 0.0

        # One-hot encoded categorical cols
        cat_arrays = []
        for cat_col, vals in self.cat_categories.items():
            cat_mat = np.zeros((num_rows, len(vals)), dtype=np.float64)
            for i, r in enumerate(rows):
                val = r.get(cat_col, "none")
                if val in vals:
                    cat_mat[i, vals.index(val)] = 1.0
            cat_arrays.append(cat_mat)

        if cat_arrays:
            return np.hstack([num_data] + cat_arrays)
        return num_data

    def transform(self, rows: List[Dict[str, Any]], scale: bool = True) -> np.ndarray:
        """Transform rows into encoded feature matrix."""
        X = self._transform_matrix(rows)
        if scale and self.mean_ is not None and self.scale_ is not None:
            X = (X - self.mean_) / self.scale_
        return X


def load_dataset_split(csv_path: str | Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Read CSV into list of dictionaries."""
    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for r in reader:
            rows.append(r)
    return rows, fieldnames
