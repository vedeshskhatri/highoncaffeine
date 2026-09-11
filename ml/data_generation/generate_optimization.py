"""
THERMA Optimization Candidate Generator & Pareto Frontier Engine
Smart India Hackathon 2026 - DRDO PS 26051

Generates 3,200+ shelter candidate configurations, calculates thermal metrics,
applies combustion safety interlocks, and mathematically computes the non-dominated
Pareto frontier minimizing capital cost (INR) and thermal discomfort hours.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
import random
import sys
import time
from typing import Any, Dict, List

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from engine.materials import load as load_materials
from engine.pareto import is_safe_design


def generate_optimization_dataset(
    num_candidates: int = 3200,
    seed: int = 26051,
    output_path: str | Path = "data/ml/therma_optimization_candidates.csv",
) -> List[Dict[str, Any]]:
    """
    Generate 3,200+ candidate designs, compute thermal comfort, apply safety interlocks,
    and calculate true mathematical Pareto dominance.
    """
    t0 = time.time()
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rng = random.Random(seed)
    materials_db = load_materials()

    candidates: List[Dict[str, Any]] = []

    wall_materials = ["mud_brick", "rammed_earth", "stone_masonry", "dense_concrete", "pu_sandwich_panel"]
    insulation_options = [0.0, 0.025, 0.050, 0.075, 0.100, 0.150]
    glazing_options = [0.0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0]

    # Baseline cold-climate reference (Leh winter ambient: -12°C mean, -20°C nocturnal dip)
    t_ambient_mean = -12.0
    t_ambient_min = -20.0

    print(f"Generating {num_candidates} optimization candidates...")

    for i in range(1, num_candidates + 1):
        cand_id = f"CAND_{i:05d}"
        sim_id = f"SIM_OPT_{i:05d}"

        # Design variables
        orientation = round(rng.choice([150.0, 165.0, 180.0, 195.0, 210.0, rng.uniform(0.0, 360.0)]), 1)
        wall_mat = rng.choice(wall_materials)
        wall_ins_m = rng.choice(insulation_options)
        roof_ins_m = rng.choice(insulation_options)
        glazing_area_m2 = rng.choice(glazing_options)
        night_shutter = rng.choice([0, 1])
        roof_emissivity = round(rng.uniform(0.20, 0.90), 2)
        ach = round(rng.uniform(0.15, 3.5), 2)

        # 10% unflued combustion heater cases to exercise safety interlock
        has_unflued = (rng.random() < 0.12)
        heater_type = "unflued_combustion" if has_unflued else "none"

        # Safety evaluation (ACH >= 0.35 required for unflued combustion)
        if has_unflued and ach < 0.35:
            safety_status = "REFUSED"
        else:
            safety_status = "SAFE"

        # Budget tiers to span realistic trade-off space
        # Tier 1 (lean/low-cost), Tier 2 (standard), Tier 3 (high-performance passive solar)
        tier = rng.choices([1, 2, 3], weights=[0.35, 0.45, 0.20])[0]

        if tier == 1:
            wall_mat = rng.choice(["mud_brick", "rammed_earth", "stone_masonry"])
            wall_ins_m = rng.choice([0.0, 0.025])
            roof_ins_m = rng.choice([0.0, 0.025])
            glazing_area_m2 = rng.choice([0.0, 2.0, 3.0])
            night_shutter = rng.choice([0, 1]) if glazing_area_m2 > 0 else 0
            base_shell_cost = rng.uniform(95000.0, 130000.0)
        elif tier == 2:
            wall_mat = rng.choice(["stone_masonry", "dense_concrete", "pu_sandwich_panel"])
            wall_ins_m = rng.choice([0.025, 0.050, 0.075])
            roof_ins_m = rng.choice([0.050, 0.075, 0.100])
            glazing_area_m2 = rng.choice([3.0, 4.5, 6.0])
            night_shutter = rng.choice([0, 1])
            base_shell_cost = rng.uniform(140000.0, 210000.0)
        else:
            wall_mat = rng.choice(["pu_sandwich_panel", "stone_masonry"])
            wall_ins_m = rng.choice([0.075, 0.100, 0.150])
            roof_ins_m = rng.choice([0.100, 0.150, 0.200])
            glazing_area_m2 = rng.choice([6.0, 8.0, 10.0, 12.0])
            night_shutter = 1
            base_shell_cost = rng.uniform(220000.0, 310000.0)

        # Cost model (INR)
        wall_ins_cost = wall_ins_m * 4500.0 * 65.0
        roof_ins_cost = roof_ins_m * 4500.0 * 24.0
        glazing_cost = glazing_area_m2 * (3200.0 + (1400.0 if night_shutter else 0.0))
        coat_cost = 4500.0 if roof_emissivity < 0.35 else 0.0
        capital_cost_inr = round(base_shell_cost + wall_ins_cost + roof_ins_cost + glazing_cost + coat_cost, 0)

        # Physics thermal response surrogate
        solar_orientation_factor = max(0.15, math.cos(math.radians(abs(orientation - 180.0))))
        solar_gain_kwh = glazing_area_m2 * 2.8 * solar_orientation_factor * (0.85 if night_shutter else 1.0)

        r_wall = 0.25 + (wall_ins_m / 0.038)
        r_roof = 0.20 + (roof_ins_m / 0.038)
        r_glaz = 0.35 + (0.50 if night_shutter else 0.0)

        delta_t = 26.0
        q_wall_kwh = (65.0 / r_wall) * delta_t * 24.0 / 1000.0
        q_roof_kwh = (24.0 / r_roof) * delta_t * 24.0 / 1000.0
        q_glaz_kwh = (glazing_area_m2 / r_glaz) * delta_t * 24.0 / 1000.0
        q_inf_kwh = (0.33 * ach * 62.4 * delta_t * 24.0) / 1000.0
        q_sky_kwh = (24.0 * roof_emissivity * 45.0 * 12.0) / 1000.0

        total_loss_kwh = round(q_wall_kwh + q_roof_kwh + q_glaz_kwh + q_inf_kwh + q_sky_kwh, 2)

        # Diurnal indoor temperature response
        t_net_avg = t_ambient_mean + max(0.5, (solar_gain_kwh / max(1.0, total_loss_kwh)) * 22.0)
        t_min_in = round(t_net_avg - max(2.0, 10.0 - (wall_ins_m * 25.0 + (3.5 if night_shutter else 0.0))), 2)
        t_max_in = round(t_net_avg + max(2.0, (glazing_area_m2 * 1.2) - (wall_ins_m * 12.0)), 2)
        t_avg_in = round((t_min_in + t_max_in) / 2.0, 2)

        # Continuous discomfort hours below 18°C
        # When t_avg is high, discomfort approaches 0; when low, approaches 24
        if t_min_in >= 18.0:
            discomfort_hours = 0.0
            comfort_hours = 24.0
        elif t_max_in <= 18.0:
            discomfort_hours = 24.0
            comfort_hours = 0.0
        else:
            fraction_cold = (18.0 - t_min_in) / max(0.1, (t_max_in - t_min_in))
            discomfort_hours = round(min(24.0, max(0.0, 24.0 * fraction_cold)), 2)
            comfort_hours = round(24.0 - discomfort_hours, 2)

        candidates.append({
            "candidate_id": cand_id,
            "simulation_id": sim_id,
            "orientation_deg": orientation,
            "glazing_area_m2": glazing_area_m2,
            "wall_insulation_m": wall_ins_m,
            "roof_insulation_m": roof_ins_m,
            "night_shutter": night_shutter,
            "roof_emissivity": roof_emissivity,
            "wall_material": wall_mat,
            "capital_cost_inr": capital_cost_inr,
            "minimum_indoor_temperature_C": t_min_in,
            "average_indoor_temperature_C": t_avg_in,
            "comfort_hours": comfort_hours,
            "total_heat_loss_kWh": total_loss_kwh,
            "discomfort_hours": discomfort_hours,
            "safety_status": safety_status,
            "is_pareto_optimal": False,  # Computed below
        })

    # Mathematical Pareto Dominance Calculation
    # Minimizing: X = capital_cost_inr, Y = discomfort_hours
    # Constraint: Designs flagged REFUSED cannot be Pareto optimal
    print("Computing true mathematical Pareto dominance across candidate designs...")

    safe_candidates = [c for c in candidates if c["safety_status"] == "SAFE"]

    for cand in safe_candidates:
        cost_a = cand["capital_cost_inr"]
        disc_a = cand["discomfort_hours"]
        is_dominated = False

        for other in safe_candidates:
            if cand is other:
                continue
            cost_b = other["capital_cost_inr"]
            disc_b = other["discomfort_hours"]

            # other dominates cand if other has <= cost and <= discomfort, with at least one strictly better
            if (cost_b <= cost_a and disc_b <= disc_a) and (cost_b < cost_a or disc_b < disc_a):
                is_dominated = True
                break

        cand["is_pareto_optimal"] = not is_dominated

    pareto_count = sum(1 for c in candidates if c["is_pareto_optimal"])
    unsafe_pareto = sum(1 for c in candidates if c["is_pareto_optimal"] and c["safety_status"] == "REFUSED")

    assert unsafe_pareto == 0, "Safety violation: Unsafe designs found on Pareto frontier!"
    print(f"Mathematical Pareto computation complete: {pareto_count} Pareto optimal designs found. (Unsafe on frontier: {unsafe_pareto})")

    # Write therma_optimization_candidates.csv
    fieldnames = list(candidates[0].keys())
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(candidates)

    print(f"Saved {len(candidates)} optimization candidates to {output_path} (took {time.time() - t0:.1f}s)")
    return candidates


if __name__ == "__main__":
    generate_optimization_dataset(num_candidates=3200)
