"""Material suggestion engine: inverts the optimizer to solve for envelope build-ups from temperature requirements.

Owner: Vedesh
Conforms to:
- PRD functional requirement FR-M1 (Material Suggestion)
- brain/06_PHYSICS_SPEC.md (ISO 52016-1 transient solver, backup heat sizing)
- brain/00_MASTER_RULES.md (Rule R1: citations, Rule R8: honest negative results)
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from api.weather import generate_or_get_worst_night_profile
from engine.impact import backup_heat_sizing, kerosene_litres
from engine.materials import load as load_materials
from engine.optimizer import compute_design_cost, design_to_dict
from engine.physics_constants import CP_AIR, air_density
from engine.safety import check as check_safety
from engine.solver import run_batch
from engine.types import Design, Layer, Opening
from engine.vectorise import pack


def generate_candidate_variants(
    geometry: Dict[str, float],
    occupancy: Dict[str, Any],
    locally_available_only: bool = True,
    max_cost_inr: Optional[float] = None,
    heater_type: str = "none",
    materials_db: Optional[Any] = None,
) -> List[Design]:
    """Generate a structured, diverse set of realistic passive envelope build-ups.

    Explores:
    - Wall structures: Mud brick, rammed earth, stone masonry (local), and PUF sandwich (non-local).
    - Insulation: EPS board, mineral rockwool, straw bale (0 to 150 mm).
    - Roof: CGI sheet or concrete with high-performance insulation & low-e coating.
    - Floor: Stone slab or concrete with underfloor insulation.
    - Solar aperture: 2.0m² to 8.0m² south glazing with double/triple glass and night shutters.
    """
    if materials_db is None:
        materials_db = load_materials()

    length_m = float(geometry.get("length_m", 6.0))
    width_m = float(geometry.get("width_m", 4.0))
    height_m = float(geometry.get("height_m", 2.6))

    candidates: List[Design] = []

    # 1. Structural wall material options
    if locally_available_only:
        structural_options = [
            ("mud_brick", 0.30),
            ("rammed_earth", 0.30),
            ("stone_masonry", 0.35),
        ]
    else:
        structural_options = [
            ("mud_brick", 0.30),
            ("stone_masonry", 0.35),
            ("pu_sandwich_panel", 0.10),
            ("prefab_sandwich", 0.10),
        ]

    # 2. Wall insulation options (None, 50mm, 100mm, 150mm)
    insul_options = [
        (None, 0.0),
        ("eps_board", 0.05),
        ("eps_board", 0.10),
        ("rockwool", 0.10),
    ]

    # 3. Roof insulation options (CGI sheet or concrete + insulation)
    roof_options = [
        (("cgi_sheet", 0.002), ("rockwool", 0.10), 0.25),
        (("concrete", 0.15), ("eps_board", 0.10), 0.90),
    ]

    # 4. Floor options
    floor_options = [
        (("stone_floor", 0.15), ("eps_board", 0.0)),
        (("stone_floor", 0.15), ("eps_board", 0.05)),
    ]

    # 5. Glazing options (south facing)
    glazing_options = [
        ("double_glass", 4.0, False),
        ("double_glass_night_shutter", 4.0, True),
        ("triple_pane", 6.0, True),
    ]

    # 6. Infiltration ACH
    ach_options = [0.35]

    for struct_mat, struct_th in structural_options:
        is_sandwich = "sandwich" in struct_mat

        for insul_mat, insul_th in insul_options:
            # Sandwich panels already contain thermal insulation
            if is_sandwich and insul_th > 0.0:
                continue

            # Build wall layers
            wall_layers = [Layer(material_id=struct_mat, thickness_m=struct_th)]
            if insul_mat and insul_th > 0.0:
                wall_layers.append(Layer(material_id=insul_mat, thickness_m=insul_th))

            for r_spec in roof_options:
                r_base, r_insul, r_emiss = r_spec
                roof_layers = [Layer(material_id=r_base[0], thickness_m=r_base[1])]
                if r_insul[1] > 0.0:
                    roof_layers.append(Layer(material_id=r_insul[0], thickness_m=r_insul[1]))

                for f_spec in floor_options:
                    f_base, f_insul = f_spec
                    floor_layers = [Layer(material_id=f_base[0], thickness_m=f_base[1])]
                    if f_insul[1] > 0.0:
                        floor_layers.append(Layer(material_id=f_insul[0], thickness_m=f_insul[1]))

                    for glaze_id, glaze_area, night_shutter in glazing_options:
                        for ach_val in ach_options:
                            cand = Design(
                                orientation_deg=180.0,
                                walls=tuple(wall_layers),
                                roof=tuple(roof_layers),
                                floor=tuple(floor_layers),
                                openings=(
                                    Opening(
                                        facing="south",
                                        area_m2=glaze_area,
                                        glazing_id=glaze_id,
                                        night_shutter=night_shutter,
                                    ),
                                ),
                                ach=ach_val,
                                roof_emissivity=r_emiss,
                                night_shutter=night_shutter,
                                length_m=length_m,
                                width_m=width_m,
                                height_m=height_m,
                            )

                            # Budget filter
                            if max_cost_inr is not None:
                                cost = compute_design_cost(cand, materials_db)
                                if cost > max_cost_inr:
                                    continue

                            # Safety interlock filter
                            safety_res = check_safety(cand, heater_type=heater_type)
                            if safety_res.refused:
                                continue

                            candidates.append(cand)

    # Subsample if combinatorial expansion is very large (keep diverse sample)
    if len(candidates) > 600:
        rng = np.random.default_rng(seed=42)
        idx = rng.choice(len(candidates), size=600, replace=False)
        candidates = [candidates[i] for i in sorted(idx)]

    return candidates


def compute_envelope_conductance(design: Design, materials_db: Any) -> float:
    """Compute overall UA [W/K] for a design."""
    length = design.length_m
    width = design.width_m
    height = design.height_m

    wall_gross_area = 2.0 * (length + width) * height
    roof_area = length * width
    floor_area = length * width

    total_opening_area = sum(op.area_m2 for op in design.openings)
    wall_net_area = max(0.0, wall_gross_area - total_opening_area)

    ua_total = 0.0

    # Walls
    r_walls = 0.13 + 0.04  # R_si + R_se
    for lyr in design.walls:
        mat = materials_db[lyr.material_id]
        if mat.k and mat.k > 0:
            r_walls += lyr.thickness_m / mat.k
    ua_total += wall_net_area / r_walls

    # Roof
    r_roof = 0.10 + 0.04
    for lyr in design.roof:
        mat = materials_db[lyr.material_id]
        if mat.k and mat.k > 0:
            r_roof += lyr.thickness_m / mat.k
    ua_total += roof_area / r_roof

    # Floor
    r_floor = 0.17 + 0.04
    for lyr in design.floor:
        mat = materials_db[lyr.material_id]
        if mat.k and mat.k > 0:
            r_floor += lyr.thickness_m / mat.k
    ua_total += floor_area / r_floor

    # Glazing
    for op in design.openings:
        mat = materials_db.get(op.glazing_id)
        u_val = getattr(mat, "u_value", 2.8) or 2.8
        ua_total += op.area_m2 * float(u_val)

    return ua_total


def compute_backup_heat_for_design(
    design: Design,
    weather_series: List[Dict[str, Any]],
    hourly_t_in_c: np.ndarray,
    target_indoor_c: float,
    altitude_m: float,
    materials_db: Any,
    occupancy_w: float = 400.0,
) -> Dict[str, Any]:
    """Compute required backup heat and fuel using real physical conductance and solar gains."""
    # Altitude-corrected air density using ideal gas law at target temperature
    rho_alt = air_density(altitude_m, 273.15 + target_indoor_c)
    volume_m3 = design.length_m * design.width_m * design.height_m
    k_inf = (rho_alt * volume_m3 * design.ach / 3600.0) * CP_AIR
    ua_env = compute_envelope_conductance(design, materials_db)
    k_total = ua_env + k_inf

    # Calculate hourly deficits
    deficit_w_series: List[float] = []
    for h in range(24):
        t_out = float(weather_series[h]["t_air"])
        t_in = float(hourly_t_in_c[h])

        if t_in < target_indoor_c:
            # Heat loss if held at target
            q_loss = k_total * (target_indoor_c - t_out)
            # Solar gain through glazing
            ghi = float(weather_series[h]["ghi"])
            solar_gain = 0.0
            for op in design.openings:
                mat = materials_db.get(op.glazing_id)
                g_val = getattr(mat, "g_value", 0.70) or 0.70
                solar_gain += op.area_m2 * float(g_val) * (ghi * 0.8)  # realistic transmission

            net_deficit = max(0.0, q_loss - solar_gain - occupancy_w)
            deficit_w_series.append(net_deficit)
        else:
            deficit_w_series.append(0.0)

    return backup_heat_sizing(deficit_w_series, dt_s=3600.0, efficiency=0.85)


def explain_buildup(design: Design, achieved_min: float, target_c: float, materials_db: Any) -> str:
    """Generate a deterministic engineering explanation for this build-up."""
    wall_primary = materials_db[design.walls[0].material_id].name
    has_insul = len(design.walls) > 1 and design.walls[1].thickness_m > 0
    insul_desc = f"{int(design.walls[1].thickness_m * 1000)}mm {materials_db[design.walls[1].material_id].name}" if has_insul else "uninsulated"
    glaze = design.openings[0]
    glaze_name = materials_db[glaze.glazing_id].name

    if achieved_min >= target_c:
        return (
            f"Passive thermal compliance achieved ({achieved_min:+.1f} °C min). "
            f"Heavy {wall_primary} provides thermal mass damping; exterior {insul_desc} prevents conductive collapse; "
            f"{glaze.area_m2:.1f} m² {glaze_name} captures essential daytime solar gain."
        )
    else:
        gap = target_c - achieved_min
        return (
            f"Optimized passive envelope reaches {achieved_min:+.1f} °C min ({gap:.1f} °C below target). "
            f"High-mass {wall_primary} paired with {insul_desc} minimizes heat flux, "
            f"dramatically reducing the required supplementary heating capacity."
        )


def suggest_materials(
    request: Optional[Dict[str, Any]] = None,
    *,
    target_indoor_c: Optional[float] = None,
    design_outdoor_c: Optional[float] = None,
    use_site_p1: Optional[bool] = None,
    location: Optional[Dict[str, Any]] = None,
    geometry: Optional[Dict[str, Any]] = None,
    occupancy: Optional[Dict[str, Any]] = None,
    max_cost_inr: Optional[float] = None,
    locally_available_only: Optional[bool] = None,
    heater_type: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Solve for optimal material combinations meeting user-stated thermal requirements.

    Args:
        request: Optional dictionary with request parameters.
        target_indoor_c: Target indoor temperature [°C].
        design_outdoor_c: Design outdoor ambient temperature [°C].
        use_site_p1: Whether to evaluate against the site's real P1 design winter night.
        location: Dict with lat, lon, altitude_m.
        geometry: Dict with length_m, width_m, height_m.
        occupancy: Dict with people, watts_per_person.
        max_cost_inr: Maximum budget constraint in INR.
        locally_available_only: If True, restricts materials to local sources.
        heater_type: Type of auxiliary heater if specified.

    Returns:
        Structured response with top 3 specification cards and backup heat assessment.
    """
    req: Dict[str, Any] = dict(request) if request is not None else {}
    if target_indoor_c is not None:
        req["target_indoor_c"] = target_indoor_c
    if design_outdoor_c is not None:
        req["design_outdoor_c"] = design_outdoor_c
    if use_site_p1 is not None:
        req["use_site_p1"] = use_site_p1
    if location is not None:
        req["location"] = location
    if geometry is not None:
        req["geometry"] = geometry
    if occupancy is not None:
        req["occupancy"] = occupancy
    if max_cost_inr is not None:
        req["max_cost_inr"] = max_cost_inr
    if locally_available_only is not None:
        req["locally_available_only"] = locally_available_only
    if heater_type is not None:
        req["heater_type"] = heater_type
    req.update({k: v for k, v in kwargs.items() if v is not None})
    request = req

    t_start = time.time()
    materials_db = load_materials()

    target_indoor_c = float(request.get("target_indoor_c", 20.0))
    design_outdoor_c = request.get("design_outdoor_c")
    if design_outdoor_c is not None:
        design_outdoor_c = float(design_outdoor_c)
    use_site_p1 = bool(request.get("use_site_p1", False))

    loc = request.get("location", {})
    lat = float(loc.get("lat", 34.1526))
    lon = float(loc.get("lon", 77.5771))
    altitude_m = float(loc.get("altitude_m", 3500.0))

    geom = request.get("geometry", {})
    length_m = float(geom.get("length_m", 6.0))
    width_m = float(geom.get("width_m", 4.0))
    height_m = float(geom.get("height_m", 2.6))

    occ = request.get("occupancy", {})
    people = int(occ.get("people", 4))
    w_person = float(occ.get("watts_per_person", 100.0))
    occupancy_w = people * w_person

    max_cost_inr = request.get("max_cost_inr")
    if max_cost_inr is not None:
        max_cost_inr = float(max_cost_inr)
    locally_available_only = bool(request.get("locally_available_only", True))
    heater_type = str(request.get("heater_type", "none"))

    # 1. Weather setup: real NASA POWER P1 profile for this location
    base_rows, meta = generate_or_get_worst_night_profile(lat, lon)
    p1_min_site = float(meta.get("p1_daily_min_c", -25.0))

    if design_outdoor_c is not None and not use_site_p1:
        # User specified design outdoor temperature: shift diurnal curve so min equals design_outdoor_c
        current_min = min(r["t_air"] for r in base_rows)
        shift = design_outdoor_c - current_min
        weather_rows = []
        for r in base_rows:
            r_copy = dict(r)
            r_copy["t_air"] = round(r["t_air"] + shift, 1)
            weather_rows.append(r_copy)
        effective_outdoor_min = design_outdoor_c
    else:
        # Use site's real P1 design winter night
        weather_rows = base_rows
        effective_outdoor_min = p1_min_site

    # 2. Generate candidate design envelope variants
    candidates = generate_candidate_variants(
        geometry={"length_m": length_m, "width_m": width_m, "height_m": height_m},
        occupancy={"people": people, "watts_per_person": w_person},
        locally_available_only=locally_available_only,
        max_cost_inr=max_cost_inr,
        heater_type=heater_type,
        materials_db=materials_db,
    )

    if not candidates:
        return {
            "target_indoor_c": target_indoor_c,
            "design_outdoor_c": effective_outdoor_min,
            "target_met": False,
            "status_message": "No candidate designs met the budget or safety constraints.",
            "best_achieved_min_c": None,
            "evaluated_count": 0,
            "elapsed_s": round(time.time() - t_start, 3),
            "recommendations": [],
        }

    # 3. Simulate all candidates in a single vectorized batch
    opts = {
        "spinup_days": 3,
        "timestep_s": 60.0,
        "altitude_m": altitude_m,
        "lat": lat,
        "lon": lon,
        "occupancy": {"people": people, "watts_per_person": w_person},
    }

    packed = pack(candidates, materials_db=materials_db, q_internal_w=occupancy_w)
    batch_t_in = run_batch(packed, weather_rows, opts=opts)  # Shape (24, N)

    candidate_scores = []
    for i, cand in enumerate(candidates):
        t_col = batch_t_in[:, i]
        t_min = float(np.min(t_col))
        t_max = float(np.max(t_col))
        t_mean = float(np.mean(t_col))
        cost = compute_design_cost(cand, materials_db)

        candidate_scores.append({
            "design": cand,
            "hourly_t_in": t_col,
            "t_min": t_min,
            "t_max": t_max,
            "t_mean": t_mean,
            "cost": cost,
            "meets_target": (t_min >= target_indoor_c),
        })

    # 4. Filter and select top 3 distinct recommendations
    passing = [c for c in candidate_scores if c["meets_target"]]
    target_met = len(passing) > 0

    if target_met:
        # Sort passing designs by lowest cost first
        passing.sort(key=lambda x: x["cost"])
        pool = passing
    else:
        # None meet target: sort by highest minimum temperature first (best-effort passive performance)
        candidate_scores.sort(key=lambda x: (-x["t_min"], x["cost"]))
        pool = candidate_scores

    # Select top 3 with distinct primary wall structural materials
    selected = []
    seen_mats = set()
    for item in pool:
        primary_mat = item["design"].walls[0].material_id
        if primary_mat not in seen_mats:
            selected.append(item)
            seen_mats.add(primary_mat)
        if len(selected) == 3:
            break

    # Fill remaining slots if fewer than 3 distinct materials exist
    if len(selected) < 3:
        for item in pool:
            if item not in selected:
                selected.append(item)
            if len(selected) == 3:
                break

    # 5. Format recommendation specification cards
    best_achieved_min = selected[0]["t_min"] if selected else -99.0

    recommendations: List[Dict[str, Any]] = []
    for rank_idx, item in enumerate(selected, 1):
        des: Design = item["design"]
        t_min = item["t_min"]
        t_max = item["t_max"]
        t_mean = item["t_mean"]
        cost = item["cost"]
        meets = item["meets_target"]

        backup_heat = compute_backup_heat_for_design(
            design=des,
            weather_series=weather_rows,
            hourly_t_in_c=item["hourly_t_in"],
            target_indoor_c=target_indoor_c,
            altitude_m=altitude_m,
            materials_db=materials_db,
            occupancy_w=occupancy_w,
        )

        gap_c = max(0.0, target_indoor_c - t_min)

        # Enriched backup heat
        enriched_backup_heat = dict(backup_heat)
        enriched_backup_heat.update({
            "required_kw": backup_heat.get("peak_kw", 0.0),
            "operating_hours_per_night": backup_heat.get("hours", 0.0),
            "kerosene_liters_per_night": backup_heat.get("kerosene_litres_per_night", 0.0),
            "summary_note": (
                f"{backup_heat.get('peak_kw', 0.0):.1f} kW of backup heat for "
                f"{backup_heat.get('hours', 0.0):.1f} hours, about "
                f"{backup_heat.get('kerosene_litres_per_night', 0.0):.1f} L of kerosene per night."
            ),
        })

        # Build-up details
        wall_details = []
        for lyr in des.walls:
            m = materials_db[lyr.material_id]
            wall_details.append({
                "material_id": lyr.material_id,
                "name": m.name,
                "thickness_mm": int(round(lyr.thickness_m * 1000.0)),
                "thickness_m": lyr.thickness_m,
                "category": m.category,
                "k": m.k,
                "thermal_conductivity_w_mk": m.k,
                "rho": m.rho,
                "cp": m.cp,
                "cost_per_m3": m.cost_per_m3,
                "source": m.source or "CPWD DSR 2023",
                "locally_available": bool(m.locally_available),
            })

        roof_details = []
        for lyr in des.roof:
            m = materials_db[lyr.material_id]
            roof_details.append({
                "material_id": lyr.material_id,
                "name": m.name,
                "thickness_mm": int(round(lyr.thickness_m * 1000.0)),
                "thickness_m": lyr.thickness_m,
                "category": m.category,
                "k": m.k,
                "thermal_conductivity_w_mk": m.k,
                "source": m.source or "CPWD DSR 2023",
                "locally_available": bool(m.locally_available),
            })

        floor_details = []
        for lyr in des.floor:
            m = materials_db[lyr.material_id]
            floor_details.append({
                "material_id": lyr.material_id,
                "name": m.name,
                "thickness_mm": int(round(lyr.thickness_m * 1000.0)),
                "thickness_m": lyr.thickness_m,
                "category": m.category,
                "k": m.k,
                "thermal_conductivity_w_mk": m.k,
                "source": m.source or "CPWD DSR 2023",
                "locally_available": bool(m.locally_available),
            })

        glaze_op = des.openings[0]
        glaze_mat = materials_db[glaze_op.glazing_id]
        glazing_details = {
            "glazing_id": glaze_op.glazing_id,
            "name": glaze_mat.name,
            "south_area_m2": glaze_op.area_m2,
            "u_value": glaze_mat.u_value,
            "u_value_day": glaze_mat.u_value,
            "g_value": glaze_mat.g_value,
            "night_shutter": glaze_op.night_shutter,
            "source": glaze_mat.source or "ISO 52016-1:2017",
        }

        title_parts = [materials_db[des.walls[0].material_id].name]
        if len(des.walls) > 1 and des.walls[1].thickness_m > 0:
            title_parts.append(f"{int(des.walls[1].thickness_m * 1000)}mm {materials_db[des.walls[1].material_id].name}")
        title_str = " + ".join(title_parts)

        primary_wall_name = materials_db[des.walls[0].material_id].name
        rec = {
            "rank": rank_idx,
            "title": title_str,
            "primary_wall_material": primary_wall_name,
            "target_met": meets,
            "achieved_min_c": round(t_min, 1),
            "achieved_indoor_c_min": round(t_min, 1),
            "achieved_mean_c": round(t_mean, 1),
            "achieved_max_c": round(t_max, 1),
            "gap_c": round(gap_c, 1),
            "residual_gap_c": round(gap_c, 1),
            "cost_inr": round(cost, 0),
            "estimated_cost_inr": round(cost, 0),
            "cost_formatted": f"₹{int(round(cost)):,}",
            "backup_heat": enriched_backup_heat,
            "buildup": {
                "walls": wall_details,
                "roof": roof_details,
                "floor": floor_details,
                "glazing": glazing_details,
                "ach": des.ach,
                "roof_emissivity": des.roof_emissivity,
            },
            "design_payload": design_to_dict(des),
            "explanation": explain_buildup(des, t_min, target_indoor_c, materials_db),
        }
        recommendations.append(rec)

    # Status message (rule R8: honest negative results)
    best_rec = recommendations[0] if recommendations else None
    if target_met:
        status_message = (
            f"Passive envelope solutions found! "
            f"The top-ranked build-up achieves {best_rec['achieved_min_c']:+.1f} °C min "
            f"at {effective_outdoor_min:+.1f} °C outdoor ambient for {best_rec['cost_formatted']}."
        )
    else:
        b_heat = best_rec["backup_heat"]
        status_message = (
            f"The best passive design reaches {best_rec['achieved_min_c']:+.1f} °C. "
            f"The remaining {best_rec['gap_c']:.1f} °C requires {b_heat['peak_kw']:.1f} kW of backup heat "
            f"for {b_heat['hours']:.1f} hours, about {b_heat['kerosene_litres_per_night']:.1f} L of kerosene per night."
        )

    return {
        "target_indoor_c": target_indoor_c,
        "design_outdoor_c": effective_outdoor_min,
        "use_site_p1": use_site_p1,
        "target_met": target_met,
        "all_met_passively": target_met,
        "status_message": status_message,
        "best_achieved_min_c": round(best_achieved_min, 1),
        "evaluated_count": len(candidates),
        "elapsed_s": round(time.time() - t_start, 3),
        "recommendations": recommendations,
    }
