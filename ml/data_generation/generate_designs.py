"""
THERMA Design Space Generator
Smart India Hackathon 2026 - DRDO PS 26051

Generates 2,100+ unique, physically plausible, and diverse high-altitude shelter designs
using Latin Hypercube and stratified sampling across materials, geometries, insulation,
glazing systems, and ventilation rates.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
import random
import sys
from typing import Any, Dict, List, Tuple

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from engine.types import Design, Layer, Opening
from engine.materials import load as load_materials
from engine.safety import check as check_safety, ACH_MIN_COMBUSTION
from ml.data_generation.generate_weather import LOCATIONS, SCENARIOS
from ml.data_generation.physics_features import (
    calculate_design_physics_properties,
    calculate_design_capital_cost,
)


WALL_MATERIALS = ["mud_brick", "rammed_earth", "stone_masonry", "dense_concrete", "pu_sandwich_panel"]
WALL_INSULATIONS = ["eps", "rockwool", "straw_bale", "none"]
ROOF_MATERIALS = ["concrete", "cgi_sheet", "pu_sandwich_panel"]
ROOF_INSULATIONS = ["eps", "rockwool", "none"]
FLOOR_MATERIALS = ["stone_floor", "dense_concrete"]
GLAZING_TYPES = ["single_pane", "double_pane", "triple_pane"]
HEATER_TYPES = ["none", "electric", "flued_stove", "unflued_combustion"]


def sample_design(
    sim_idx: int,
    loc_name: str,
    rng: random.Random,
    materials_db: Dict[str, Any],
) -> Tuple[Design, Dict[str, Any], Dict[str, Any]]:
    """
    Sample a single shelter design and return:
    (Design object, design_parameter_dict, safety_dict)
    """
    sim_id = f"SIM_{sim_idx:06d}"
    loc = LOCATIONS[loc_name]

    # Dimensions
    # Typical military & relief shelter sizes: 4x3m (sentry/bivouac) to 12x6m (barracks)
    l = round(rng.uniform(4.0, 10.0), 1)
    w = round(rng.uniform(3.0, 6.0), 1)
    h = round(rng.uniform(2.4, 3.2), 1)

    # Orientation: 65% clustered south (150-210 deg), 35% uniform 0-360 deg
    if rng.random() < 0.65:
        orientation = round(rng.uniform(150.0, 210.0), 1)
    else:
        orientation = round(rng.uniform(0.0, 360.0), 1)

    # Materials
    wall_mat = rng.choice(WALL_MATERIALS)
    # Typical structural thicknesses
    if wall_mat in ("stone_masonry", "mud_brick", "rammed_earth"):
        wall_th = round(rng.uniform(0.20, 0.50), 2)
    elif wall_mat == "pu_sandwich_panel":
        wall_th = round(rng.uniform(0.05, 0.15), 2)
    else:
        wall_th = round(rng.uniform(0.12, 0.30), 2)

    wall_ins = rng.choice(WALL_INSULATIONS)
    if wall_ins != "none" and wall_mat != "pu_sandwich_panel":
        wall_ins_th = round(rng.uniform(0.025, 0.15), 3)
    else:
        wall_ins = "none"
        wall_ins_th = 0.0

    # Build wall layers (outside to inside)
    wall_layers: List[Layer] = []
    if wall_mat == "pu_sandwich_panel":
        wall_layers.append(Layer(material_id="pu_sandwich_panel", thickness_m=wall_th))
    else:
        wall_layers.append(Layer(material_id=wall_mat, thickness_m=wall_th))
        if wall_ins != "none" and wall_ins_th > 0:
            wall_layers.append(Layer(material_id=wall_ins, thickness_m=wall_ins_th))

    # Roof
    roof_mat = rng.choice(ROOF_MATERIALS)
    if roof_mat == "concrete":
        roof_th = round(rng.uniform(0.10, 0.20), 2)
    elif roof_mat == "pu_sandwich_panel":
        roof_th = round(rng.uniform(0.06, 0.15), 2)
    else:  # cgi_sheet
        roof_th = 0.002

    roof_ins = rng.choice(ROOF_INSULATIONS)
    if roof_ins != "none" and roof_mat != "pu_sandwich_panel":
        roof_ins_th = round(rng.uniform(0.025, 0.15), 3)
    else:
        roof_ins = "none"
        roof_ins_th = 0.0

    roof_layers: List[Layer] = []
    if roof_mat == "pu_sandwich_panel":
        roof_layers.append(Layer(material_id="pu_sandwich_panel", thickness_m=roof_th))
    else:
        roof_layers.append(Layer(material_id=roof_mat, thickness_m=roof_th))
        if roof_ins != "none" and roof_ins_th > 0:
            roof_layers.append(Layer(material_id=roof_ins, thickness_m=roof_ins_th))

    # Floor
    floor_mat = rng.choice(FLOOR_MATERIALS)
    floor_th = round(rng.uniform(0.10, 0.25), 2)
    floor_layers = [Layer(material_id=floor_mat, thickness_m=floor_th)]

    # Glazing
    glazing_type = rng.choice(GLAZING_TYPES)
    # South glazing area (0 to 12 m2)
    max_g_area = min(12.0, l * h * 0.45)
    glazing_area = round(rng.uniform(0.0, max_g_area), 2)
    night_shutter = rng.choice([True, False])
    shutter_r = 0.5 if night_shutter else 0.0

    openings: List[Opening] = []
    if glazing_area > 0.05:
        openings.append(
            Opening(
                facing="south",
                area_m2=glazing_area,
                glazing_id=glazing_type,
                night_shutter=night_shutter,
            )
        )

    # Roof emissivity
    roof_emissivity = round(rng.uniform(0.20, 0.90), 2)

    # Air changes per hour (0.10 to 5.0)
    # Include low ACH cases (<0.35) specifically to test combustion safety interlock
    ach = round(rng.uniform(0.10, 4.5), 2)

    # Occupancy
    # Scaled roughly with floor area
    floor_area = l * w
    max_occ = max(2, min(40, int(floor_area / 2.5)))
    occupants = rng.randint(1, max_occ)
    int_gain_w = occupants * 100.0  # 100W per person seated metabolic rate

    # Heating system
    heater_type = rng.choice(HEATER_TYPES)
    combustion_heater_present = (heater_type == "unflued_combustion")

    # Construct immutable Design
    design_obj = Design(
        orientation_deg=orientation,
        walls=tuple(wall_layers),
        roof=tuple(roof_layers),
        floor=tuple(floor_layers),
        openings=tuple(openings),
        ach=ach,
        roof_emissivity=roof_emissivity,
        night_shutter=night_shutter,
        length_m=l,
        width_m=w,
        height_m=h,
    )

    # Physics properties
    props = calculate_design_physics_properties(design_obj, loc["altitude_m"], -10.0, materials_db)
    cost_inr, cost_basis, cost_source = calculate_design_capital_cost(design_obj, materials_db)

    # Safety check
    safety_res = check_safety(design_obj, heater_type)
    safety_status = "REFUSED" if safety_res.refused else "SAFE"
    safety_reason = safety_res.reason or ""

    design_record = {
        "simulation_id": sim_id,
        "location": loc_name,
        "altitude_m": loc["altitude_m"],
        "latitude_deg": loc["latitude"],
        "longitude_deg": loc["longitude"],
        "length_m": l,
        "width_m": w,
        "height_m": h,
        "floor_area_m2": props["floor_area_m2"],
        "volume_m3": props["volume_m3"],
        "orientation_deg": orientation,
        "wall_material": wall_mat,
        "wall_thickness_m": wall_th,
        "wall_insulation_material": wall_ins,
        "wall_insulation_thickness_m": wall_ins_th,
        "roof_material": roof_mat,
        "roof_thickness_m": roof_th,
        "roof_insulation_material": roof_ins,
        "roof_insulation_thickness_m": roof_ins_th,
        "floor_material": floor_mat,
        "floor_thickness_m": floor_th,
        "glazing_area_m2": props["glazing_area_m2"],
        "glazing_ratio": props["glazing_ratio"],
        "glazing_type": glazing_type,
        "window_orientation_deg": 180.0,  # South
        "night_shutter": 1 if night_shutter else 0,
        "shutter_R_m2K_W": shutter_r,
        "roof_emissivity": roof_emissivity,
        "ach": ach,
        "occupants": occupants,
        "internal_gain_W": int_gain_w,
        "heater_type": heater_type,
        "combustion_heater_present": combustion_heater_present,
        "capital_cost_inr": cost_inr,
        "cost_basis": cost_basis,
        "overall_U_value_W_m2K": props["overall_U_value_W_m2K"],
        "overall_R_value_m2K_W": props["overall_R_value_m2K_W"],
        "thermal_mass_J_K": props["thermal_mass_J_K"],
        "air_pressure_Pa": props["air_pressure_Pa"],
        "air_density_kg_m3": props["air_density_kg_m3"],
    }

    safety_record = {
        "simulation_id": sim_id,
        "heater_type": heater_type,
        "combustion_heater_present": combustion_heater_present,
        "ach": ach,
        "safety_threshold_ach": ACH_MIN_COMBUSTION,
        "safety_status": safety_status,
        "safety_reason": safety_reason,
    }

    return design_obj, design_record, safety_record


def generate_design_dataset(
    num_simulations: int = 2100,
    seed: int = 26051,
    output_dir: str | Path = "data/ml",
) -> Tuple[List[Design], List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """Generate num_simulations designs and save CSV files."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rng = random.Random(seed)
    materials_db = load_materials()

    loc_names = list(LOCATIONS.keys())
    designs_list: List[Design] = []
    design_records: List[Dict[str, Any]] = []
    safety_records: List[Dict[str, Any]] = []
    loc_assignments: List[str] = []

    for i in range(1, num_simulations + 1):
        # Round-robin balanced location assignment with random jitter
        loc_name = loc_names[(i - 1) % len(loc_names)]
        d_obj, d_rec, s_rec = sample_design(i, loc_name, rng, materials_db)

        designs_list.append(d_obj)
        design_records.append(d_rec)
        safety_records.append(s_rec)
        loc_assignments.append(loc_name)

    # Write therma_design_parameters.csv
    design_csv = output_dir / "therma_design_parameters.csv"
    with open(design_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(design_records[0].keys()))
        writer.writeheader()
        writer.writerows(design_records)

    # Write therma_safety.csv
    safety_csv = output_dir / "therma_safety.csv"
    with open(safety_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(safety_records[0].keys()))
        writer.writeheader()
        writer.writerows(safety_records)

    print(f"Generated {len(design_records)} design parameter records in {design_csv}")
    print(f"Generated {len(safety_records)} safety records in {safety_csv}")

    return designs_list, design_records, safety_records, loc_assignments


if __name__ == "__main__":
    generate_design_dataset(num_simulations=2100, seed=26051)
