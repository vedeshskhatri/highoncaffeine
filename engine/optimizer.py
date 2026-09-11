"""Multi-variant design space sampling, scoring, Pareto optimization, and explainability.

Owner: Vedesh
Evaluates candidate design variants over envelope parameters, insulation, thermal mass, and glazing.
Enforces safety interlocks (Aman's engine.safety) and locally-available material constraints.
Generates deterministic explainability ('why' string) ranked by Morris sensitivity effects.
Conforms to brain/11_OPTIMIZER_SPEC.md and brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

import copy
import math
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple
import numpy as np

from engine.constants import DT_INTERNAL_S, FO_TARGET, SPINUP_DAYS
from engine.impact import backup_heat_sizing, kerosene_litres
from engine.materials import get as get_material, load as load_materials
from engine.physics_constants import HEALTH_THRESHOLD_C, imac_comfort_band
from engine.safety import check as check_safety
from engine.sensitivity import morris_screening
from engine.solver import run_batch, run_single
from engine.types import Design, Layer, Opening
from engine.vectorise import pack


def compute_design_cost(design: Design, materials_db: Optional[Any] = None) -> float:
    """Compute total capital and material cost for a shelter design in INR.

    Calculates volume of each structural and insulation layer across walls, roof,
    and floor, multiplied by material cost_per_m3, plus openings and night shutters.
    """
    if materials_db is None:
        materials_db = load_materials()

    length = design.length_m
    width = design.width_m
    height = design.height_m

    wall_gross_area = 2.0 * (length + width) * height
    roof_area = length * width
    floor_area = length * width

    total_opening_area = sum(op.area_m2 for op in design.openings)
    wall_net_area = max(0.0, wall_gross_area - total_opening_area)

    cost_inr = 0.0

    # 1. Wall layers
    for lyr in design.walls:
        mat = materials_db[lyr.material_id]
        unit_cost = mat.cost_per_m3 if mat.cost_per_m3 is not None else 3000.0
        cost_inr += lyr.thickness_m * wall_net_area * unit_cost

    # 2. Roof layers
    for lyr in design.roof:
        mat = materials_db[lyr.material_id]
        unit_cost = mat.cost_per_m3 if mat.cost_per_m3 is not None else 5000.0
        cost_inr += lyr.thickness_m * roof_area * unit_cost

    # 3. Floor layers
    for lyr in design.floor:
        mat = materials_db[lyr.material_id]
        unit_cost = mat.cost_per_m3 if mat.cost_per_m3 is not None else 4000.0
        cost_inr += lyr.thickness_m * floor_area * unit_cost

    # 4. Openings / Glazing
    for op in design.openings:
        mat = materials_db.get(op.glazing_id, None)
        if mat and mat.cost_per_m3:
            # Assuming standard glazing unit thickness ~ 20mm
            cost_inr += op.area_m2 * 0.02 * mat.cost_per_m3
        else:
            cost_inr += op.area_m2 * 2500.0  # standard timber framed glazing unit

        if op.night_shutter:
            cost_inr += 500.0  # 500 INR per window with insulated night shutter

    # 5. Roof radiative coating (low-e)
    if design.roof_emissivity < 0.5:
        cost_inr += 4500.0  # Low-e radiant barrier roof coating

    return float(cost_inr)


def dict_to_design(d_dict: Dict[str, Any], default_base: Optional[Design] = None) -> Design:
    """Convert a dictionary (from API request or fixture) to a frozen Design object."""
    length_m = float(d_dict.get("length_m", getattr(default_base, "length_m", 6.0)))
    width_m = float(d_dict.get("width_m", getattr(default_base, "width_m", 4.0)))
    height_m = float(d_dict.get("height_m", getattr(default_base, "height_m", 2.6)))

    # Walls
    walls_raw = d_dict.get("walls", [])
    walls_list = []
    for w in walls_raw:
        m_id = w.get("material", w.get("material_id", "mud_brick"))
        th = float(w.get("thickness_m", 0.30))
        walls_list.append(Layer(material_id=m_id, thickness_m=th))
    if not walls_list and default_base:
        walls_list = list(default_base.walls)

    # Roof
    roof_raw = d_dict.get("roof", [])
    roof_list = []
    for r in roof_raw:
        m_id = r.get("material", r.get("material_id", "dense_concrete"))
        th = float(r.get("thickness_m", 0.15))
        roof_list.append(Layer(material_id=m_id, thickness_m=th))
    if not roof_list and default_base:
        roof_list = list(default_base.roof)

    # Floor
    floor_raw = d_dict.get("floor", [])
    floor_list = []
    for f in floor_raw:
        m_id = f.get("material", f.get("material_id", "stone_floor"))
        th = float(f.get("thickness_m", 0.10))
        floor_list.append(Layer(material_id=m_id, thickness_m=th))
    if not floor_list and default_base:
        floor_list = list(default_base.floor)

    # Openings
    openings_raw = d_dict.get("openings", [])
    openings_list = []
    for op in openings_raw:
        facing = op.get("facing", "south")
        area = float(op.get("area_m2", 3.0))
        glazing = op.get("glazing", op.get("glazing_id", "double_glass"))
        shutter = bool(op.get("night_shutter", False))
        openings_list.append(Opening(
            facing=facing,
            area_m2=area,
            glazing_id=glazing,
            night_shutter=shutter,
        ))
    if not openings_list and default_base:
        openings_list = list(default_base.openings)

    # Ventilation & ACH
    vent = d_dict.get("ventilation", {})
    ach = float(d_dict.get("ach", vent.get("ach", getattr(default_base, "ach", 0.6))))

    roof_emissivity = float(d_dict.get("roof_emissivity", getattr(default_base, "roof_emissivity", 0.90)))
    night_shutter = bool(d_dict.get("night_shutter", any(op.night_shutter for op in openings_list)))
    orientation_deg = float(d_dict.get("orientation_deg", getattr(default_base, "orientation_deg", 180.0)))

    return Design(
        orientation_deg=orientation_deg,
        walls=tuple(walls_list),
        roof=tuple(roof_list),
        floor=tuple(floor_list),
        openings=tuple(openings_list),
        ach=ach,
        roof_emissivity=roof_emissivity,
        night_shutter=night_shutter,
        length_m=length_m,
        width_m=width_m,
        height_m=height_m,
    )


def design_to_dict(design: Design, heater_type: str = "none") -> Dict[str, Any]:
    """Serialize a Design object to JSON-compatible dictionary conforming to API contract."""
    return {
        "walls": [{"material": lyr.material_id, "thickness_m": lyr.thickness_m} for lyr in design.walls],
        "roof": [{"material": lyr.material_id, "thickness_m": lyr.thickness_m} for lyr in design.roof],
        "floor": [{"material": lyr.material_id, "thickness_m": lyr.thickness_m} for lyr in design.floor],
        "roof_emissivity": design.roof_emissivity,
        "orientation_deg": design.orientation_deg,
        "openings": [
            {
                "facing": op.facing,
                "area_m2": op.area_m2,
                "glazing": op.glazing_id,
                "night_shutter": op.night_shutter,
            }
            for op in design.openings
        ],
        "ventilation": {
            "ach": design.ach,
            "heater_type": heater_type,
        },
        "length_m": design.length_m,
        "width_m": design.width_m,
        "height_m": design.height_m,
    }


def sample_designs(
    search_space: Dict[str, Any],
    baseline: Design,
    n: int = 3000,
    materials_db: Optional[Any] = None,
    locally_available_only: bool = True,
    max_cost_inr: Optional[float] = None,
    heater_type: str = "none",
    seed: int = 42,
) -> Tuple[List[Design], int]:
    """Sample candidate designs over parameter search space using Latin Hypercube / stratified sampling.

    Applies constraints (locally_available_only, max_cost_inr) and safety interlocks (engine.safety).

    Returns:
        Tuple of (valid_candidate_designs, refused_unsafe_count)
    """
    if materials_db is None:
        materials_db = load_materials()

    rng = np.random.default_rng(seed=seed)

    # Extract search bounds with sensible physical defaults
    orient_cfg = search_space.get("orientation_deg") or {}
    orient_min = float(orient_cfg.get("min", 90.0))
    orient_max = float(orient_cfg.get("max", 270.0))

    glaze_cfg = search_space.get("south_glazing_m2") or {}
    glaze_min = float(glaze_cfg.get("min", 1.0))
    glaze_max = float(glaze_cfg.get("max", 6.0))

    insul_cfg = search_space.get("insulation_mm") or {}
    insul_min = float(insul_cfg.get("min", 0.0))
    insul_max = float(insul_cfg.get("max", 100.0))

    emiss_choices = search_space.get("roof_emissivity") or [0.25, 0.90]
    shutter_choices = search_space.get("night_shutter") or [True, False]

    ach_cfg = search_space.get("ach") or {}
    ach_min = float(ach_cfg.get("min", 0.20))
    ach_max = float(ach_cfg.get("max", 1.50))

    # Available structural wall materials
    wall_mat_options = search_space.get("wall_material")
    if not wall_mat_options:
        wall_mat_options = ["mud_brick", "rammed_earth", "stone_masonry"]
        if not locally_available_only:
            wall_mat_options.append("pu_sandwich_panel")

    valid_wall_materials = []
    for w_id in wall_mat_options:
        m = materials_db.get(w_id)
        if m:
            if locally_available_only and not m.locally_available:
                continue
            valid_wall_materials.append(w_id)
    if not valid_wall_materials:
        valid_wall_materials = ["mud_brick"]

    # Latin Hypercube stratification for continuous parameters
    lhs_orient = (np.arange(n) + rng.uniform(0.0, 1.0, size=n)) / n
    lhs_glaze = (np.arange(n) + rng.uniform(0.0, 1.0, size=n)) / n
    lhs_insul = (np.arange(n) + rng.uniform(0.0, 1.0, size=n)) / n
    lhs_ach = (np.arange(n) + rng.uniform(0.0, 1.0, size=n)) / n

    rng.shuffle(lhs_orient)
    rng.shuffle(lhs_glaze)
    rng.shuffle(lhs_insul)
    rng.shuffle(lhs_ach)

    valid_designs: List[Design] = []
    refused_unsafe_count = 0

    for i in range(n):
        orient = orient_min + lhs_orient[i] * (orient_max - orient_min)
        glaze_area = glaze_min + lhs_glaze[i] * (glaze_max - glaze_min)
        insul_raw = insul_min + lhs_insul[i] * (insul_max - insul_min)
        if insul_raw < 15.0:
            insul_thick_m = 0.0
        else:
            insul_thick_m = max(0.025, round(insul_raw / 1000.0, 3))
        ach_val = ach_min + lhs_ach[i] * (ach_max - ach_min)

        w_mat = str(rng.choice(valid_wall_materials))
        roof_emiss = float(rng.choice(emiss_choices))
        shutter_toggle = bool(rng.choice(shutter_choices))

        # Build wall buildup
        wall_layers = [Layer(material_id=w_mat, thickness_m=0.30)]
        if insul_thick_m >= 0.025:
            wall_layers.append(Layer(material_id="eps_board", thickness_m=insul_thick_m))

        # Build south opening
        openings = (
            Opening(
                facing="south",
                area_m2=round(glaze_area, 2),
                glazing_id="double_glass",
                night_shutter=shutter_toggle,
            ),
        )

        cand = Design(
            orientation_deg=round(orient, 1),
            walls=tuple(wall_layers),
            roof=baseline.roof,
            floor=baseline.floor,
            openings=openings,
            ach=round(ach_val, 2),
            roof_emissivity=roof_emiss,
            night_shutter=shutter_toggle,
            length_m=baseline.length_m,
            width_m=baseline.width_m,
            height_m=baseline.height_m,
        )

        # Budget constraint check
        if max_cost_inr is not None:
            c_est = compute_design_cost(cand, materials_db)
            if c_est > max_cost_inr:
                continue

        # Safety interlock check via Aman's engine.safety module
        safety_res = check_safety(cand, heater_type=heater_type)
        if safety_res.refused:
            refused_unsafe_count += 1
            continue

        valid_designs.append(cand)

    return valid_designs, refused_unsafe_count


def compute_pareto_front(candidates: List[Dict[str, Any]], objectives: Sequence[str]) -> List[Dict[str, Any]]:
    """Compute non-dominated Pareto front over two specified objectives.

    Default objectives: 'maximise_comfort_hours' and 'minimise_cost'.
    """
    obj_a, obj_b = objectives[0], objectives[1]

    pareto_set: List[Dict[str, Any]] = []

    for i, p_a in enumerate(candidates):
        dominated = False
        val_a1 = p_a["comfort_hours_ratio"] if "comfort" in obj_a else p_a["cost_inr"]
        val_a2 = p_a["cost_inr"] if "cost" in obj_b else p_a["comfort_hours_ratio"]

        for j, p_b in enumerate(candidates):
            if i == j:
                continue

            val_b1 = p_b["comfort_hours_ratio"] if "comfort" in obj_a else p_b["cost_inr"]
            val_b2 = p_b["cost_inr"] if "cost" in obj_b else p_b["comfort_hours_ratio"]

            # Maximise comfort, Minimise cost
            if "comfort" in obj_a and "cost" in obj_b:
                b_better_or_equal = (val_b1 >= val_a1) and (val_b2 <= val_a2)
                b_strictly_better = (val_b1 > val_a1) or (val_b2 < val_a2)
            elif "cost" in obj_a and "comfort" in obj_b:
                b_better_or_equal = (val_b1 <= val_a1) and (val_b2 >= val_a2)
                b_strictly_better = (val_b1 < val_a1) or (val_b2 > val_a2)
            else:
                b_better_or_equal = (val_b1 >= val_a1) and (val_b2 >= val_a2)
                b_strictly_better = (val_b1 > val_a1) or (val_b2 > val_a2)

            if b_better_or_equal and b_strictly_better:
                dominated = True
                break

        if not dominated:
            pareto_set.append(p_a)

    # Sort Pareto front by comfort_hours_ratio descending
    pareto_set.sort(key=lambda x: x["comfort_hours_ratio"], reverse=True)
    return pareto_set


def build_mechanical_why(
    candidate: Design,
    baseline: Design,
    cand_t_min: float,
    base_t_min: float,
    sensitivity_levers: List[Dict[str, Any]],
) -> str:
    """Generate explainability 'why' string mechanically from parameter deltas ranked by Morris effects.

    Strict Rule R1 & 11_OPTIMIZER_SPEC.md Section 5:
      - NEVER written by an LLM.
      - Every statement directly grounded in physics numbers.
    """
    # Sensitivity rank lookup: param_name -> rank (1 is highest impact)
    sens_ranks = {l["parameter"]: (l["rank"], l["effect_c"], l["label"]) for l in sensitivity_levers}

    deltas: List[Tuple[int, float, str, str]] = []

    # 1. Glazing delta
    cand_glaze = sum(op.area_m2 for op in candidate.openings if op.facing == "south")
    base_glaze = sum(op.area_m2 for op in baseline.openings if op.facing == "south")
    if abs(cand_glaze - base_glaze) > 0.3:
        rank, eff, label = sens_ranks.get("south_glazing_m2", (99, 1.0, "South glazing"))
        text = f"South glazing area adjusted to {cand_glaze:.1f} m2"
        deltas.append((rank, eff, label, text))

    # 2. Night shutter
    cand_shutter = any(op.night_shutter for op in candidate.openings)
    base_shutter = any(op.night_shutter for op in baseline.openings)
    if cand_shutter and not base_shutter:
        rank, eff, label = sens_ranks.get("night_shutter", (99, 2.0, "Night shutters"))
        deltas.append((rank, eff, label, "insulated night shutters fitted"))

    # 3. Insulation
    cand_insul = sum(lyr.thickness_m for lyr in candidate.walls if "eps" in lyr.material_id or "wool" in lyr.material_id) * 1000.0
    base_insul = sum(lyr.thickness_m for lyr in baseline.walls if "eps" in lyr.material_id or "wool" in lyr.material_id) * 1000.0
    if abs(cand_insul - base_insul) > 10.0:
        rank, eff, label = sens_ranks.get("insulation_mm", (99, 1.5, "Wall insulation"))
        deltas.append((rank, eff, label, f"wall insulation increased to {int(cand_insul)} mm"))

    # 4. Roof emissivity
    if abs(candidate.roof_emissivity - baseline.roof_emissivity) > 0.2:
        rank, eff, label = sens_ranks.get("roof_emissivity", (99, 1.0, "Low-e roof coating"))
        deltas.append((rank, eff, label, f"roof emissivity lowered to {candidate.roof_emissivity:.2f}"))

    # 5. Orientation
    if abs(candidate.orientation_deg - baseline.orientation_deg) > 15.0:
        rank, eff, label = sens_ranks.get("orientation_deg", (99, 0.5, "Solar orientation"))
        deltas.append((rank, eff, label, f"orientation rotated to {int(candidate.orientation_deg)} deg"))

    # 6. ACH / Sealing
    if abs(candidate.ach - baseline.ach) > 0.15:
        rank, eff, label = sens_ranks.get("ach", (99, 0.8, "Infiltration reduction"))
        deltas.append((rank, eff, label, f"infiltration tightened to {candidate.ach:.2f} ACH"))

    # Sort deltas by Morris importance rank
    deltas.sort(key=lambda x: x[0])

    delta_t_min = cand_t_min - base_t_min

    if len(deltas) >= 2:
        top1 = deltas[0]
        top2 = deltas[1]
        desc = f"{top1[3].capitalize()} and {top2[3]}"
        top_contrib = min(delta_t_min, top1[1]) if delta_t_min > 0 else top1[1]
        return (
            f"{desc}. Overnight minimum rises {delta_t_min:.1f} C versus baseline; "
            f"{top1[2]} contributes {top_contrib:.1f} C of that."
        )
    elif len(deltas) == 1:
        top1 = deltas[0]
        return (
            f"{top1[3].capitalize()}. Overnight minimum rises {delta_t_min:.1f} C versus baseline; "
            f"{top1[2]} is the primary driver ({top1[1]:.1f} C effect)."
        )
    else:
        return (
            f"Balanced passive envelope enhancements. Overnight minimum rises {delta_t_min:.1f} C versus baseline."
        )


def optimize(request: Dict[str, Any]) -> Dict[str, Any]:
    """Execute end-to-end multi-variant search and return top ranked Pareto designs.

    Args:
        request: Optimization request dictionary conforming to brain/07_API_CONTRACT.md

    Returns:
        Dictionary conforming to OptimizeResponse schema
    """
    t_start = time.time()

    materials_db = load_materials()

    # Parse inputs
    weather_in = request.get("weather", {})
    weather_series = weather_in.get("hourly") or weather_in.get("t_air")
    if not weather_series:
        # Load default Leh January fallback weather
        from api.weather import load_fallback_csv
        weather_series = load_fallback_csv()

    baseline_dict = request.get("baseline", {})
    base_design = dict_to_design(baseline_dict)

    search_space = request.get("search", {})
    constraints = request.get("constraints", {})
    locally_available_only = bool(constraints.get("locally_available_only", True))
    max_cost_inr = constraints.get("max_cost_inr")
    if max_cost_inr is not None:
        max_cost_inr = float(max_cost_inr)
    heater_type = str(constraints.get("heater_type", "none"))

    objectives = request.get("objectives", ["maximise_comfort_hours", "minimise_cost"])
    n_requested = int(request.get("n_samples", 3000))

    # Evaluate baseline design first
    base_sim = run_single(base_design, weather_series)
    base_t_in = base_sim["t_in_c"]
    base_t_min = float(np.min(base_t_in))
    base_cost = compute_design_cost(base_design, materials_db)

    # Compute IMAC comfort band
    t_outdoor_mean = float(np.mean([float(w.get("t_air", -10.0) if isinstance(w, dict) else w) for w in weather_series]))
    t_comf_lo, t_comf_hi = imac_comfort_band(t_outdoor_mean, mode="nv", acceptability=0.90)

    base_comfort_ratio = float(np.mean([(t >= t_comf_lo and t <= t_comf_hi) for t in base_t_in]))

    # Run Morris Sensitivity Analysis to guide explainability
    sens_result = morris_screening(
        baseline_design=base_design,
        weather=weather_series,
        n_trajectories=20,
        search_space=search_space,
    )
    sensitivity_levers = sens_result["levers"]

    # Sample candidates (enforcing constraints and safety interlocks)
    candidates, refused_unsafe = sample_designs(
        search_space=search_space,
        baseline=base_design,
        n=n_requested,
        materials_db=materials_db,
        locally_available_only=locally_available_only,
        max_cost_inr=max_cost_inr,
        heater_type=heater_type,
    )

    evaluated_count = len(candidates)

    if evaluated_count == 0:
        # Edge case: all candidates refused by constraints/safety
        elapsed_s = round(time.time() - t_start, 2)
        return {
            "_stub": False,
            "evaluated": 0,
            "refused_unsafe": refused_unsafe,
            "elapsed_s": elapsed_s,
            "baseline": {
                "comfort_hours_ratio": round(base_comfort_ratio, 2),
                "t_in_min_c": round(base_t_min, 1),
                "cost_inr": round(base_cost, 0),
            },
            "pareto": [],
            "top": [],
        }

    # Vectorized simulation across all candidates (NO Python loop)
    packed = pack(candidates)
    batch_temperatures = run_batch(packed, weather_series)  # shape (24, N)

    scored_candidates = []
    for d_idx, des in enumerate(candidates):
        t_col = batch_temperatures[:, d_idx]
        t_min = float(np.min(t_col))
        t_max = float(np.max(t_col))
        comf_ratio = float(np.mean((t_col >= t_comf_lo) & (t_col <= t_comf_hi)))
        cost = compute_design_cost(des, materials_db)

        scored_candidates.append({
            "design_id": f"d_{d_idx + 1:04d}",
            "design": des,
            "comfort_hours_ratio": round(comf_ratio, 2),
            "cost_inr": round(cost, 0),
            "t_in_min_c": round(t_min, 1),
            "t_in_max_c": round(t_max, 1),
            "t_in_series": t_col,
        })

    # Compute Pareto non-dominated front
    pareto_full = compute_pareto_front(scored_candidates, objectives)

    # Convert Pareto items to contract schema
    pareto_points = [
        {
            "design_id": p["design_id"],
            "comfort_hours_ratio": p["comfort_hours_ratio"],
            "cost_inr": p["cost_inr"],
            "t_in_min_c": p["t_in_min_c"],
        }
        for p in pareto_full
    ]

    # Select Top 3 from Pareto front
    # 1. Best comfort
    # 2. Balanced knee-point
    # 3. Cost-effective
    top_candidates = []
    if len(pareto_full) >= 3:
        top_candidates = [pareto_full[0], pareto_full[len(pareto_full) // 2], pareto_full[-1]]
    elif len(pareto_full) > 0:
        top_candidates = pareto_full[:3]
    else:
        top_candidates = scored_candidates[:3]

    top_designs_out = []
    for rank_idx, cand_info in enumerate(top_candidates, start=1):
        des_obj = cand_info["design"]
        cand_t_min = cand_info["t_in_min_c"]
        cand_comf = cand_info["comfort_hours_ratio"]
        cand_cost = cand_info["cost_inr"]
        cand_t_series = cand_info["t_in_series"]

        # Run single to obtain exact physical heat loss breakdown
        single_res = run_single(des_obj, weather_series)
        s_summary = single_res["summary"]

        hours_below_health = int(np.sum(cand_t_series < HEALTH_THRESHOLD_C))
        t_in_min_hour = int(np.argmin(cand_t_series))

        # Size backup heating
        deficit_w = [max(0.0, (HEALTH_THRESHOLD_C - t) * 50.0) for t in cand_t_series]
        backup = backup_heat_sizing(deficit_w)

        annual_kerosene_l = backup["kerosene_litres_per_night"] * 120.0
        annual_fuel_cost_inr = annual_kerosene_l * 2400.0  # Siachen delivered cost
        annual_co2_kg = annual_kerosene_l * 2.5

        delta_cost_capex = cand_cost - base_cost
        base_annual_kerosene = 1310.0
        kerosene_savings = annual_kerosene_l - base_annual_kerosene

        summary_dict = {
            "t_in_min_c": cand_t_min,
            "t_in_min_hour": t_in_min_hour,
            "t_in_max_c": cand_info["t_in_max_c"],
            "comfort_hours_ratio": cand_comf,
            "hours_below_health_threshold": hours_below_health,
            "solar_gain_kwh": s_summary["solar_gain_kwh"],
            "heat_loss_kwh": s_summary["heat_loss_kwh"],
            "backup_heat": backup,
            "impact": {
                "kerosene_litres_per_year": round(annual_kerosene_l, 1),
                "cost_inr_per_year": round(annual_fuel_cost_inr, 0),
                "co2_kg_per_year": round(annual_co2_kg, 1),
                "payback_years": round(delta_cost_capex / (abs(kerosene_savings) * 2400.0), 1) if kerosene_savings < -1.0 and delta_cost_capex > 0 else None,
            },
            "freeze_risk": [],
        }

        why_text = build_mechanical_why(
            candidate=des_obj,
            baseline=base_design,
            cand_t_min=cand_t_min,
            base_t_min=base_t_min,
            sensitivity_levers=sensitivity_levers,
        )

        top_designs_out.append({
            "rank": rank_idx,
            "design_id": cand_info["design_id"],
            "design": design_to_dict(des_obj, heater_type=heater_type),
            "summary": summary_dict,
            "why": why_text,
            "delta_vs_baseline": {
                "t_in_min_c": round(cand_t_min - base_t_min, 1),
                "comfort_hours_ratio": round(cand_comf - base_comfort_ratio, 2),
                "cost_inr": round(cand_cost - base_cost, 0),
                "kerosene_litres_per_year": round(kerosene_savings, 1),
            },
        })

    elapsed_s = round(time.time() - t_start, 2)

    return {
        "_stub": False,
        "evaluated": evaluated_count,
        "refused_unsafe": refused_unsafe,
        "elapsed_s": elapsed_s,
        "baseline": {
            "comfort_hours_ratio": round(base_comfort_ratio, 2),
            "t_in_min_c": round(base_t_min, 1),
            "cost_inr": round(base_cost, 0),
        },
        "pareto": pareto_points,
        "top": top_designs_out,
    }
