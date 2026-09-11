"""Generate training data for the THERMA ML surrogate model.

Uses Latin Hypercube Sampling across the multi-dimensional design and
climate space, executing the vectorised ISO 52016-1 5R1C solver (run_batch)
to produce high-fidelity training data.

Outputs:
  data/surrogate/features.npy
  data/surrogate/targets.npy
  data/surrogate/metadata.json

Author: Vedesh
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np
from scipy.stats import qmc

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from engine.materials import load as load_materials
from engine.physics_constants import imac_comfort_band, HEALTH_THRESHOLD_C
from engine.solver import run_batch
from engine.types import Design, Layer, Opening
from engine.vectorise import pack

OUTPUT_DIR = PROJECT_ROOT / "data" / "surrogate"

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


def generate_synthetic_weather(
    t_out_mean: float,
    t_out_swing: float,
    peak_dni: float,
) -> List[Dict[str, float]]:
    """Synthesize an aligned 24-hour winter diurnal weather profile."""
    weather = []
    for h in range(24):
        # Diurnal temperature cycle: min at 05:00, peak at 15:00
        t_air = t_out_mean - (t_out_swing / 2.0) * np.cos(2.0 * np.pi * (h - 5) / 24.0)
        
        # Solar radiation: daylight 07:00 to 17:00
        if 7 <= h <= 17:
            solar_phase = np.sin(np.pi * (h - 7) / 10.0)
            dni = peak_dni * max(0.0, solar_phase)
            dhi = 0.22 * dni + 25.0
            ghi = dni * max(0.0, np.cos(np.pi * abs(h - 12) / 12.0)) + dhi
        else:
            dni = 0.0
            dhi = 0.0
            ghi = 0.0

        weather.append({
            "t_air": float(t_air),
            "dni": float(dni),
            "dhi": float(dhi),
            "ghi": float(ghi),
            "cloud_cover": 0.05,
        })
    return weather


def run_data_generation(
    n_climates: int = 25,
    designs_per_climate: int = 400,
    seed: int = 42,
) -> Dict[str, Any]:
    """Execute Latin Hypercube sampling and batch ISO 52016-1 simulations."""
    total_samples = n_climates * designs_per_climate
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    t_start = time.perf_counter()

    materials_db = load_materials()

    # Structural materials pool
    wall_mat_options = ["mud_brick", "rammed_earth", "stone_masonry"]
    # Glazing options: (glazing_id, u_value, g_value)
    glazing_options = [
        ("single_pane", 5.7, 0.85),
        ("double_pane", 2.8, 0.76),
        ("triple_pane", 1.4, 0.68),
    ]

    # Sample climate scenarios using LHS
    climate_sampler = qmc.LatinHypercube(d=4, seed=seed)
    climate_lhs = climate_sampler.random(n=n_climates)

    # Sample building design variants using LHS
    design_sampler = qmc.LatinHypercube(d=14, seed=seed + 1)
    design_lhs = design_sampler.random(n=total_samples)

    all_features = np.zeros((total_samples, len(FEATURE_NAMES)), dtype=np.float64)
    all_targets = np.zeros((total_samples, len(TARGET_NAMES)), dtype=np.float64)

    sample_counter = 0

    print(f"[Surrogate Data] Starting generation of {total_samples} solver runs...")
    print(f"  {n_climates} climate regimes x {designs_per_climate} designs/climate")

    for c_idx in range(n_climates):
        c_row = climate_lhs[c_idx]
        t_out_mean = float(-24.0 + c_row[0] * 20.0)      # -24 to -4 deg C
        t_out_swing = float(8.0 + c_row[1] * 12.0)       # 8 to 20 deg C
        peak_dni = float(350.0 + c_row[2] * 550.0)       # 350 to 900 W/m2
        altitude_m = float(1800.0 + c_row[3] * 3000.0)   # 1800 to 4800 m

        weather = generate_synthetic_weather(t_out_mean, t_out_swing, peak_dni)
        t_comf_lo, t_comf_hi = imac_comfort_band(t_out_mean, mode="nv", acceptability=0.90)

        climate_opts = {
            "altitude_m": altitude_m,
            "lat": 34.1526,
            "lon": 77.5771,
            "spinup_days": 2,  # 2 spinup days for rapid convergence
        }

        # Build designs for this climate
        designs: List[Design] = []
        batch_feat_rows: List[List[float]] = []

        for d_idx in range(designs_per_climate):
            global_idx = c_idx * designs_per_climate + d_idx
            d_row = design_lhs[global_idx]

            orient = float(0.0 + d_row[0] * 360.0)
            length_m = float(3.5 + d_row[1] * 4.5)       # 3.5 to 8.0 m
            width_m = float(2.5 + d_row[2] * 3.5)        # 2.5 to 6.0 m
            height_m = float(2.2 + d_row[3] * 0.8)       # 2.2 to 3.0 m

            wall_th = float(0.15 + d_row[4] * 0.30)      # 0.15 to 0.45 m
            insul_th = float(d_row[5] * 0.12)            # 0.0 to 0.12 m
            if insul_th < 0.02:
                insul_th = 0.0

            w_idx = int(d_row[6] * len(wall_mat_options)) % len(wall_mat_options)
            w_mat_id = wall_mat_options[w_idx]
            w_mat = materials_db[w_mat_id]
            wall_k = float(w_mat.k)
            wall_rhocp = float(w_mat.rho * w_mat.cp)

            insul_mat = materials_db["eps_board"]
            insul_k = float(insul_mat.k) if insul_th > 0 else 0.036

            roof_th = float(0.10 + d_row[7] * 0.10)      # 0.10 to 0.20 m
            floor_th = float(0.08 + d_row[8] * 0.10)     # 0.08 to 0.18 m

            south_glazing_m2 = float(0.5 + d_row[9] * 6.0)  # 0.5 to 6.5 m2
            g_idx = int(d_row[10] * len(glazing_options)) % len(glazing_options)
            glaze_id, glaze_u, glaze_g = glazing_options[g_idx]

            night_shutter = bool(d_row[11] > 0.5)
            roof_emiss = float(0.25 + d_row[12] * 0.65)  # 0.25 to 0.90
            ach = float(0.25 + d_row[13] * 1.35)         # 0.25 to 1.60

            wall_layers = [Layer(material_id=w_mat_id, thickness_m=round(wall_th, 3))]
            if insul_th >= 0.02:
                wall_layers.append(Layer(material_id="eps_board", thickness_m=round(insul_th, 3)))

            roof_layers = (Layer(material_id="concrete", thickness_m=round(roof_th, 3)),)
            floor_layers = (Layer(material_id="concrete", thickness_m=round(floor_th, 3)),)
            openings = (
                Opening(
                    facing="south",
                    area_m2=round(south_glazing_m2, 2),
                    glazing_id=glaze_id,
                    night_shutter=night_shutter,
                ),
            )

            design = Design(
                orientation_deg=round(orient, 1),
                walls=tuple(wall_layers),
                roof=roof_layers,
                floor=floor_layers,
                openings=openings,
                ach=round(ach, 2),
                roof_emissivity=round(roof_emiss, 2),
                night_shutter=night_shutter,
                length_m=round(length_m, 2),
                width_m=round(width_m, 2),
                height_m=round(height_m, 2),
            )
            designs.append(design)

            feat = [
                orient, length_m, width_m, height_m,
                wall_th, wall_k, wall_rhocp,
                insul_th, insul_k,
                roof_th, floor_th,
                south_glazing_m2, glaze_u, glaze_g,
                1.0 if night_shutter else 0.0,
                roof_emiss, ach,
                t_out_mean, t_out_swing, peak_dni, altitude_m,
            ]
            batch_feat_rows.append(feat)

        # Pack and run batch simulation for all designs in this climate regime
        packed = pack(designs, materials_db=materials_db)
        batch_t_in = run_batch(packed, weather, opts=climate_opts)  # (24, designs_per_climate)

        # Extract targets for each design
        for d_idx in range(designs_per_climate):
            t_col = batch_t_in[:, d_idx]
            t_min = float(np.min(t_col))
            t_max = float(np.max(t_col))
            t_mean = float(np.mean(t_col))
            comf_ratio = float(np.mean((t_col >= t_comf_lo) & (t_col <= t_comf_hi)))
            hours_below_h = float(np.sum(t_col < HEALTH_THRESHOLD_C))

            g_idx = c_idx * designs_per_climate + d_idx
            all_features[g_idx] = batch_feat_rows[d_idx]
            all_targets[g_idx] = [t_min, t_max, t_mean, comf_ratio, hours_below_h]

        sample_counter += designs_per_climate
        print(f"  Completed climate {c_idx + 1}/{n_climates} ({sample_counter}/{total_samples} designs solved)")

    elapsed_s = round(time.perf_counter() - t_start, 2)
    print(f"[Surrogate Data] Completed {total_samples} runs in {elapsed_s} s ({total_samples / elapsed_s:.1f} runs/s)")

    # Save to disk
    feat_path = OUTPUT_DIR / "features.npy"
    targ_path = OUTPUT_DIR / "targets.npy"
    meta_path = OUTPUT_DIR / "metadata.json"

    np.save(feat_path, all_features)
    np.save(targ_path, all_targets)

    meta = {
        "n_samples": total_samples,
        "n_climates": n_climates,
        "designs_per_climate": designs_per_climate,
        "generation_wall_clock_s": elapsed_s,
        "rate_runs_per_s": round(total_samples / elapsed_s, 2),
        "feature_names": FEATURE_NAMES,
        "target_names": TARGET_NAMES,
        "solver": "EN ISO 52016-1 5R1C multi-node dynamic RC network (engine.solver.run_batch)",
        "source": "synthetic_iso52016_vectorised_batch",
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved features: {feat_path} (shape: {all_features.shape})")
    print(f"Saved targets:  {targ_path} (shape: {all_targets.shape})")
    print(f"Saved metadata: {meta_path}")

    return meta


if __name__ == "__main__":
    n_climates = 25
    designs_per_climate = 400
    if len(sys.argv) > 1:
        n_climates = int(sys.argv[1])
    if len(sys.argv) > 2:
        designs_per_climate = int(sys.argv[2])
    run_data_generation(n_climates=n_climates, designs_per_climate=designs_per_climate)
