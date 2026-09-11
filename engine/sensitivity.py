"""Sensitivity analysis using Morris elementary effects screening.

Owner: Vedesh
Ranks envelope and passive design levers by thermal impact on minimum indoor temperature.
Conforms to brain/11_OPTIMIZER_SPEC.md Section 6 and brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

import copy
import math
from typing import Any, Dict, List, Optional, Sequence, Tuple
import numpy as np

from engine.constants import DT_INTERNAL_S, FO_TARGET, SPINUP_DAYS
from engine.solver import run_batch, run_single
from engine.types import Design, Layer, Opening
from engine.vectorise import pack


# Authoritative lever metadata per brain/07_API_CONTRACT.md and brain/11_OPTIMIZER_SPEC.md
LEVER_METADATA = {
    "night_shutter": {
        "label": "Night shutters",
        "cost_inr": 500.0,
        "cost_basis": "estimate",
        "install_note": "local craftsman, 1 day",
        "derived_note": None,
    },
    "south_glazing_m2": {
        "label": "South glazing area",
        "cost_inr": 18000.0,
        "cost_basis": "sourced",
        "install_note": "timber framed double glazing unit",
        "derived_note": None,
    },
    "insulation_mm": {
        "label": "EPS wall insulation +50mm",
        "cost_inr": 22500.0,
        "cost_basis": "sourced",
        "install_note": "friction fit between studs and taped",
        "derived_note": None,
    },
    "roof_emissivity": {
        "label": "Low-e roof coating",
        "cost_inr": 4500.0,
        "cost_basis": "estimate",
        "install_note": "aluminum / radiant barrier paint over CGI roof",
        "derived_note": None,
    },
    "wall_thickness": {
        "label": "Stone wall +100 mm",
        "cost_inr": 38000.0,
        "cost_basis": "sourced",
        "install_note": "local stone dressed on site",
        "derived_note": "+11.8 t per structure",
    },
    "orientation_deg": {
        "label": "South orientation (180 deg)",
        "cost_inr": 0.0,
        "cost_basis": "sourced",
        "install_note": "zero cost if decided before foundation excavation",
        "derived_note": None,
    },
    "ach": {
        "label": "Sealing and chinking (0.4 ACH)",
        "cost_inr": 2500.0,
        "cost_basis": "estimate",
        "install_note": "mud-skirt banking and frame weatherstripping",
        "derived_note": None,
    },
}


def _apply_parameter_value(base: Design, param: str, val: float) -> Design:
    """Return a modified copy of base design with parameter set to val."""
    orientation_deg = base.orientation_deg
    walls = list(base.walls)
    roof = list(base.roof)
    floor = list(base.floor)
    openings = list(base.openings)
    ach = base.ach
    roof_emissivity = base.roof_emissivity
    night_shutter = base.night_shutter

    if param == "night_shutter":
        shutter_val = bool(val >= 0.5)
        night_shutter = shutter_val
        new_openings = []
        for op in openings:
            new_openings.append(Opening(
                facing=op.facing,
                area_m2=op.area_m2,
                glazing_id=op.glazing_id,
                night_shutter=shutter_val,
            ))
        openings = new_openings

    elif param == "south_glazing_m2":
        area = float(val)
        new_openings = []
        has_south = False
        for op in openings:
            if op.facing.lower() == "south":
                new_openings.append(Opening(
                    facing="south",
                    area_m2=area,
                    glazing_id=op.glazing_id,
                    night_shutter=op.night_shutter,
                ))
                has_south = True
            else:
                new_openings.append(op)
        if not has_south:
            new_openings.append(Opening(
                facing="south",
                area_m2=area,
                glazing_id="double_glass",
                night_shutter=night_shutter,
            ))
        openings = new_openings

    elif param == "insulation_mm":
        thick_m = float(val) / 1000.0
        # If walls already have an insulation layer, update thickness; else append
        new_walls = []
        has_insul = False
        for lyr in walls:
            if "eps" in lyr.material_id or "wool" in lyr.material_id:
                if thick_m > 0.0:
                    new_walls.append(Layer(material_id=lyr.material_id, thickness_m=thick_m))
                has_insul = True
            else:
                new_walls.append(lyr)
        if not has_insul and thick_m > 0.0:
            new_walls.append(Layer(material_id="eps_board", thickness_m=thick_m))
        walls = new_walls

    elif param == "wall_thickness":
        thick_m = float(val)
        new_walls = []
        for lyr in walls:
            if lyr.material_id in ("mud_brick", "stone_masonry", "rammed_earth", "concrete"):
                new_walls.append(Layer(material_id=lyr.material_id, thickness_m=thick_m))
            else:
                new_walls.append(lyr)
        walls = new_walls

    elif param == "roof_emissivity":
        roof_emissivity = float(val)

    elif param == "orientation_deg":
        orientation_deg = float(val)

    elif param == "ach":
        ach = float(val)

    return Design(
        orientation_deg=orientation_deg,
        walls=tuple(walls),
        roof=tuple(roof),
        floor=tuple(floor),
        openings=tuple(openings),
        ach=ach,
        roof_emissivity=roof_emissivity,
        night_shutter=night_shutter,
        length_m=base.length_m,
        width_m=base.width_m,
        height_m=base.height_m,
    )


def morris_screening(
    baseline_design: Design,
    weather: Any,
    parameters: Optional[Sequence[str]] = None,
    n_trajectories: int = 20,
    search_space: Optional[Dict[str, Any]] = None,
    opts: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Perform Morris method screening to compute elementary effects for design levers.

    Args:
        baseline_design: Starting shelter design configuration
        weather: Weather dataset for simulation
        parameters: List of parameter names to perturb (default: all supported levers)
        n_trajectories: Number of Morris trajectories (default: 20)
        search_space: Optional bounds per parameter
        opts: Simulation options

    Returns:
        Dict conforming to brain/07_API_CONTRACT.md POST /sensitivity response.
    """
    if parameters is None:
        param_names = [
            "night_shutter",
            "south_glazing_m2",
            "insulation_mm",
            "roof_emissivity",
            "wall_thickness",
            "orientation_deg",
            "ach",
        ]
    else:
        param_names = list(parameters)

    k = len(param_names)
    if k == 0:
        return {"method": "morris", "runs": 0, "levers": []}

    # Parameter ranges: (min_val, max_val)
    default_ranges = {
        "night_shutter": (0.0, 1.0),
        "south_glazing_m2": (1.0, 6.0),
        "insulation_mm": (0.0, 100.0),
        "roof_emissivity": (0.25, 0.90),
        "wall_thickness": (0.20, 0.45),
        "orientation_deg": (90.0, 180.0),
        "ach": (0.35, 1.5),
    }

    ranges: Dict[str, Tuple[float, float]] = {}
    for p in param_names:
        if search_space and p in search_space and isinstance(search_space[p], dict):
            p_min = float(search_space[p].get("min", default_ranges.get(p, (0.0, 1.0))[0]))
            p_max = float(search_space[p].get("max", default_ranges.get(p, (0.0, 1.0))[1]))
            ranges[p] = (p_min, p_max)
        else:
            ranges[p] = default_ranges.get(p, (0.0, 1.0))

    # Grid levels for Morris (p_levels = 4, delta = p / (2*(p-1)) = 4/6 = 2/3)
    p_levels = 4
    delta = p_levels / (2.0 * (p_levels - 1.0))

    rng = np.random.default_rng(seed=42)

    # Generate trajectories
    trajectory_designs: List[Design] = []
    # trajectory_steps: list of tuples: (traj_idx, step_idx, param_idx, sign)
    step_meta: List[Tuple[int, int, int, float]] = []

    for r in range(n_trajectories):
        # Base point x0 in {0, 1/(p-1), 2/(p-1), ...}
        x = np.zeros(k, dtype=np.float64)
        for i in range(k):
            # allowed starting points so that x[i] + s*delta remains in [0, 1]
            x[i] = rng.choice([0.0, 1.0 / 3.0])

        perm = rng.permutation(k)
        signs = rng.choice([-1.0, 1.0], size=k)

        # Record base design
        def to_design(curr_x: np.ndarray) -> Design:
            d = baseline_design
            for idx, p_name in enumerate(param_names):
                lo, hi = ranges[p_name]
                val = lo + curr_x[idx] * (hi - lo)
                d = _apply_parameter_value(d, p_name, val)
            return d

        curr_x = x.copy()
        trajectory_designs.append(to_design(curr_x))
        base_ptr = len(trajectory_designs) - 1

        prev_ptr = base_ptr
        for step in range(k):
            p_idx = perm[step]
            s = signs[p_idx]
            # Take step along dimension p_idx
            new_val = curr_x[p_idx] + s * delta
            new_val = max(0.0, min(1.0, new_val))
            curr_x[p_idx] = new_val
            trajectory_designs.append(to_design(curr_x))
            curr_ptr = len(trajectory_designs) - 1
            step_meta.append((prev_ptr, curr_ptr, p_idx, s * delta))
            prev_ptr = curr_ptr

    # Vectorized simulation of all trajectory designs
    packed = pack(trajectory_designs)
    batch_results = run_batch(packed, weather, opts=opts)  # shape (24, N_total)
    t_min_per_design = np.min(batch_results, axis=0)  # shape (N_total,)

    # Compute Elementary Effects for each parameter
    signed_elementary_effects: Dict[int, List[float]] = {i: [] for i in range(k)}
    abs_elementary_effects: Dict[int, List[float]] = {i: [] for i in range(k)}

    for prev_ptr, curr_ptr, p_idx, d_norm in step_meta:
        delta_t_min = float(t_min_per_design[curr_ptr] - t_min_per_design[prev_ptr])
        # Signed effect for parameter increase: if d_norm < 0, reverse sign
        signed_ee = delta_t_min if d_norm > 0 else -delta_t_min
        signed_elementary_effects[p_idx].append(signed_ee)
        abs_elementary_effects[p_idx].append(abs(delta_t_min))

    # Summarize mu* (mean absolute effect), mu (direction), sigma (uncertainty) and rank
    lever_scores = []
    for i, p_name in enumerate(param_names):
        abs_effects = abs_elementary_effects[i]
        signed_effects = signed_elementary_effects[i]
        mu_star = float(np.mean(abs_effects)) if abs_effects else 0.0
        mu_signed = float(np.mean(signed_effects)) if signed_effects else 0.0
        sigma = float(np.std(signed_effects)) if len(signed_effects) > 1 else 0.0

        if mu_signed > 0.05:
            direction = "warming"
        elif mu_signed < -0.05:
            direction = "cooling"
        else:
            direction = "neutral"

        meta = LEVER_METADATA.get(p_name, {
            "label": p_name.replace("_", " ").title(),
            "cost_inr": 1000.0,
            "cost_basis": "estimate",
            "install_note": None,
            "derived_note": None,
        })
        lever_scores.append({
            "parameter": p_name,
            "label": meta["label"],
            "effect_c": round(mu_star, 2),
            "mu_star": round(mu_star, 2),
            "mu": round(mu_signed, 2),
            "sigma": round(sigma, 2),
            "uncertainty": round(sigma, 2),
            "direction": direction,
            "cost_inr": meta["cost_inr"],
            "cost_basis": meta["cost_basis"],
            "install_note": meta["install_note"],
            "derived_note": meta["derived_note"],
        })

    # Sort descending by effect_c (mu*)
    lever_scores.sort(key=lambda item: item["effect_c"], reverse=True)

    # Assign 1-indexed ranks
    for rank_idx, item in enumerate(lever_scores, start=1):
        item["rank"] = rank_idx

    return {
        "method": "morris",
        "runs": len(trajectory_designs),
        "levers": lever_scores,
        "notice": (
            "Morris elementary effects screening measures total sensitivity and non-linear interactions across the parameter space. "
            "It identifies primary thermal drivers without claiming direct proportional causation beyond tested envelope bounds."
        ),
    }
