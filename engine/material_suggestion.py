"""Material suggestion engine: inverts the optimizer to solve for envelope build-ups from temperature requirements.

Owner: Vedesh
Conforms to:
- PRD functional requirement FR-M1 (Material Suggestion)
- brain/06_PHYSICS_SPEC.md (ISO 52016-1 transient solver, backup heat sizing)
- brain/05_DATA_SOURCES.md (Section 1 Open-Meteo & NASA POWER, Section 6 Kerosene 37.0 MJ/L)
- brain/00_MASTER_RULES.md (Rule R1: citations, Rule R8: honest negative results)
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from api.weather import generate_or_get_worst_night_profile, get_weather
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
    regime: str = "heating",
) -> List[Design]:
    """Generate a structured, diverse set of realistic passive envelope build-ups.

    Args:
        geometry: Shelter length, width, height [m].
        occupancy: Occupancy count and metabolic rate.
        locally_available_only: If True, restrict to regional Ladakh materials.
        max_cost_inr: Optional budget constraint.
        heater_type: Heater type for safety verification.
        materials_db: Material properties database.
        regime: 'heating' (cold climate) or 'cooling' (hot/overheating climate).
    """
    if materials_db is None:
        materials_db = load_materials()

    length_m = float(geometry.get("length_m", 6.0))
    width_m = float(geometry.get("width_m", 4.0))
    height_m = float(geometry.get("height_m", 2.6))

    candidates: List[Design] = []

    if regime == "cooling":
        # HOT / OVERHEATING REGIME (e.g. Chennai in May, Jaisalmer in May)
        # Physics: High thermal mass for diurnal damping, no external insulation blanket (avoids heat trapping),
        # minimal shaded glazing (eliminates greenhouse solar cooking), high cross-ventilation, cool reflective roof.
        structural_options = [
            ("rammed_earth", 0.30),
            ("mud_brick", 0.30),
            ("stone_masonry", 0.35),
        ]
        insul_options = [
            (None, 0.0),
        ]
        roof_options = [
            (("concrete", 0.15), (None, 0.0), 0.90),
            (("dense_concrete", 0.15), (None, 0.0), 0.90),
        ]
        floor_options = [
            (("stone_floor", 0.15), (None, 0.0)),
        ]
        glazing_options = [
            ("double_glass", 1.5, False),
            ("double_glass", 2.0, False),
            ("single_glass", 1.5, False),
        ]
        ach_options = [1.5, 2.0]

    else:
        # COLD / HEATING REGIME (e.g. Leh, Siachen, high alpine winter)
        # Physics: Heavy thermal mass + external insulation (50mm–150mm EPS/Rockwool) + south solar aperture + night shutters.
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

        insul_options = [
            (None, 0.0),
            ("eps_board", 0.05),
            ("eps_board", 0.10),
            ("rockwool", 0.10),
        ]

        roof_options = [
            (("cgi_sheet", 0.002), ("rockwool", 0.10), 0.25),
            (("concrete", 0.15), ("eps_board", 0.10), 0.90),
        ]

        floor_options = [
            (("stone_floor", 0.15), (None, 0.0)),
            (("stone_floor", 0.15), ("eps_board", 0.05)),
        ]

        glazing_options = [
            ("double_glass", 4.0, False),
            ("double_glass_night_shutter", 4.0, True),
            ("triple_pane", 6.0, True),
        ]

        ach_options = [0.35]

    for struct_mat, struct_th in structural_options:
        is_sandwich = "sandwich" in struct_mat

        for insul_mat, insul_th in insul_options:
            if is_sandwich and insul_th > 0.0:
                continue

            wall_layers = [Layer(material_id=struct_mat, thickness_m=struct_th)]
            if insul_mat and insul_th > 0.0:
                wall_layers.append(Layer(material_id=insul_mat, thickness_m=insul_th))

            for r_spec in roof_options:
                r_base, r_insul, r_emiss = r_spec
                roof_layers = [Layer(material_id=r_base[0], thickness_m=r_base[1])]
                if r_insul and r_insul[0] and r_insul[1] > 0.0:
                    roof_layers.append(Layer(material_id=r_insul[0], thickness_m=r_insul[1]))

                for f_spec in floor_options:
                    f_base, f_insul = f_spec
                    floor_layers = [Layer(material_id=f_base[0], thickness_m=f_base[1])]
                    if f_insul and f_insul[0] and f_insul[1] > 0.0:
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

                            if max_cost_inr is not None:
                                cost = compute_design_cost(cand, materials_db)
                                if cost > max_cost_inr:
                                    continue

                            safety_res = check_safety(cand, heater_type=heater_type)
                            if safety_res.refused:
                                continue

                            candidates.append(cand)

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
    r_walls = 0.13 + 0.04
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


def compute_backup_conditioning_for_design(
    design: Design,
    weather_series: List[Dict[str, Any]],
    hourly_t_in_c: np.ndarray,
    target_indoor_c: float,
    altitude_m: float,
    materials_db: Any,
    occupancy_w: float = 400.0,
    regime: str = "heating",
) -> Dict[str, Any]:
    """Compute required backup thermal conditioning (heating or cooling) using real physical conductance."""
    rho_alt = air_density(altitude_m, 273.15 + target_indoor_c)
    volume_m3 = design.length_m * design.width_m * design.height_m
    k_inf = (rho_alt * volume_m3 * design.ach / 3600.0) * CP_AIR
    ua_env = compute_envelope_conductance(design, materials_db)
    k_total = ua_env + k_inf

    if regime == "heating":
        deficit_w_series: List[float] = []
        for h in range(24):
            t_out = float(weather_series[h]["t_air"])
            t_in = float(hourly_t_in_c[h])

            if t_in < target_indoor_c:
                q_loss = k_total * (target_indoor_c - t_out)
                ghi = float(weather_series[h]["ghi"])
                solar_gain = 0.0
                for op in design.openings:
                    mat = materials_db.get(op.glazing_id)
                    g_val = getattr(mat, "g_value", 0.70) or 0.70
                    solar_gain += op.area_m2 * float(g_val) * (ghi * 0.8)

                net_deficit = max(0.0, q_loss - solar_gain - occupancy_w)
                deficit_w_series.append(net_deficit)
            else:
                deficit_w_series.append(0.0)

        # 37.0 MJ/L kerosene standard per brain/05_DATA_SOURCES.md Section 6 & engine/impact.py
        return backup_heat_sizing(deficit_w_series, dt_s=3600.0, efficiency=0.85)

    else:
        # COOLING REGIME
        cooling_w_series: List[float] = []
        for h in range(24):
            t_out = float(weather_series[h]["t_air"])
            t_in = float(hourly_t_in_c[h])

            if t_in > target_indoor_c:
                q_conductive = k_total * max(0.0, t_out - target_indoor_c)
                ghi = float(weather_series[h]["ghi"])
                solar_gain = 0.0
                for op in design.openings:
                    mat = materials_db.get(op.glazing_id)
                    g_val = getattr(mat, "g_value", 0.76) or 0.76
                    solar_gain += op.area_m2 * float(g_val) * (ghi * 0.5)

                q_cool_net = q_conductive + solar_gain + occupancy_w
                cooling_w_series.append(q_cool_net)
            else:
                cooling_w_series.append(0.0)

        peak_kw = float(np.max(cooling_w_series)) / 1000.0 if cooling_w_series else 0.0
        hours = float(np.count_nonzero(np.array(cooling_w_series) > 10.0))
        total_kwh_th = float(np.sum(cooling_w_series)) / 1000.0
        # AC electrical consumption at seasonal COP = 3.0
        ac_kwh_elec = round(total_kwh_th / 3.0, 2)

        return {
            "peak_kw": round(peak_kw, 2),
            "hours": hours,
            "kerosene_litres_per_night": 0.0,
            "cooling_kwh_electrical": ac_kwh_elec,
            "conditioning_type": "active_cooling",
        }


def explain_buildup(
    design: Design,
    achieved_min: float,
    achieved_max: float,
    target_c: float,
    materials_db: Any,
    regime: str = "heating",
) -> str:
    """Generate a deterministic engineering explanation for this build-up."""
    wall_primary = materials_db[design.walls[0].material_id].name
    has_insul = len(design.walls) > 1 and design.walls[1].thickness_m > 0
    insul_desc = f"{int(design.walls[1].thickness_m * 1000)}mm {materials_db[design.walls[1].material_id].name}" if has_insul else "uninsulated"
    glaze = design.openings[0]
    glaze_name = materials_db[glaze.glazing_id].name

    if regime == "cooling":
        if achieved_max <= target_c:
            return (
                f"Passive cooling compliance achieved ({achieved_max:.1f} °C max). "
                f"High-mass {wall_primary} absorbs daytime heat wave; shaded glazing eliminates solar gain; "
                f"cross-ventilation ({design.ach} ACH) and high-emissivity concrete roof dump heat during cool night hours."
            )
        else:
            gap = achieved_max - target_c
            return (
                f"Optimized passive envelope holds indoor temperature to {achieved_max:.1f} °C max ({gap:.1f} °C above target). "
                f"Heavy {wall_primary} without insulation traps dampens outdoor peak, avoiding heat entrapment "
                f"and substantially reducing active cooling / air conditioning tonnage."
            )
    else:
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
    date: Optional[str] = None,
    month: Optional[int] = None,
    weather_mode: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Solve for optimal material combinations meeting user-stated thermal requirements.

    Args:
        request: Optional dictionary with request parameters.
        target_indoor_c: Target indoor temperature [°C].
        design_outdoor_c: Design outdoor ambient temperature [°C]. If omitted, uses real site weather.
        use_site_p1: Whether to evaluate against the site's NASA POWER P1 winter night.
        location: Dict with lat, lon, altitude_m.
        geometry: Dict with length_m, width_m, height_m.
        occupancy: Dict with people, watts_per_person.
        max_cost_inr: Maximum budget constraint in INR.
        locally_available_only: If True, restricts materials to local sources.
        heater_type: Type of auxiliary heater if specified.
        date: ISO weather date YYYY-MM-DD (e.g. '2024-05-15' for May, '2024-01-15' for January).
        month: Optional integer month (1 to 12).
        weather_mode: 'typical_day' or 'design_winter_night'.

    Returns:
        Structured response with top 3 specification cards and backup conditioning assessment.
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
    if date is not None:
        req["date"] = date
    if month is not None:
        req["month"] = month
    if weather_mode is not None:
        req["weather_mode"] = weather_mode
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

    # Date resolution
    date_str = request.get("date") or request.get("date_str")
    req_month = request.get("month")
    if date_str is None:
        if req_month is not None:
            date_str = f"2024-{int(req_month):02d}-15"
        else:
            date_str = "2024-01-15"

    weather_mode_req = str(request.get("weather_mode", "typical_day"))

    # 1. Weather Setup: Real physics and meteorology
    if use_site_p1 or weather_mode_req == "design_winter_night":
        base_rows, meta = generate_or_get_worst_night_profile(lat, lon)
        site_outdoor_min = float(meta.get("p1_daily_min_c", -25.0))
    else:
        base_rows, _ = get_weather(lat, lon, date_str, mode="typical_day")
        site_outdoor_min = float(min(r["t_air"] for r in base_rows))

    if design_outdoor_c is not None and not use_site_p1:
        # Explicit user outdoor design temperature: shift diurnal curve so min equals design_outdoor_c
        current_min = min(r["t_air"] for r in base_rows)
        shift = design_outdoor_c - current_min
        weather_rows = []
        for r in base_rows:
            r_copy = dict(r)
            r_copy["t_air"] = round(r["t_air"] + shift, 1)
            weather_rows.append(r_copy)
        effective_outdoor_min = design_outdoor_c
    else:
        # True site weather reached directly from live satellite/reanalysis
        weather_rows = base_rows
        effective_outdoor_min = site_outdoor_min

    # Climate regime determination: Heating vs Cooling
    t_out_arr = np.array([r["t_air"] for r in weather_rows])
    mean_t_out = float(np.mean(t_out_arr))
    min_t_out = float(np.min(t_out_arr))
    max_t_out = float(np.max(t_out_arr))

    is_cooling_regime = (mean_t_out >= target_indoor_c) or (min_t_out >= target_indoor_c)
    regime = "cooling" if is_cooling_regime else "heating"

    # 2. Generate candidate design envelope variants for this regime
    candidates = generate_candidate_variants(
        geometry={"length_m": length_m, "width_m": width_m, "height_m": height_m},
        occupancy={"people": people, "watts_per_person": w_person},
        locally_available_only=locally_available_only,
        max_cost_inr=max_cost_inr,
        heater_type=heater_type,
        materials_db=materials_db,
        regime=regime,
    )

    if not candidates:
        return {
            "target_indoor_c": target_indoor_c,
            "design_outdoor_c": effective_outdoor_min,
            "target_met": False,
            "all_met_passively": False,
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

        if regime == "heating":
            meets = (t_min >= target_indoor_c)
        else:
            meets = (t_max <= target_indoor_c)

        candidate_scores.append({
            "design": cand,
            "hourly_t_in": t_col,
            "t_min": t_min,
            "t_max": t_max,
            "t_mean": t_mean,
            "cost": cost,
            "meets_target": meets,
        })

    # 4. Filter and select top 3 distinct recommendations
    passing = [c for c in candidate_scores if c["meets_target"]]
    target_met = len(passing) > 0

    if target_met:
        passing.sort(key=lambda x: x["cost"])
        pool = passing
    else:
        if regime == "heating":
            candidate_scores.sort(key=lambda x: (-x["t_min"], x["cost"]))
        else:
            candidate_scores.sort(key=lambda x: (x["t_max"], x["cost"]))
        pool = candidate_scores

    selected = []
    seen_mats = set()
    for item in pool:
        primary_mat = item["design"].walls[0].material_id
        if primary_mat not in seen_mats:
            selected.append(item)
            seen_mats.add(primary_mat)
        if len(selected) == 3:
            break

    if len(selected) < 3:
        for item in pool:
            if item not in selected:
                selected.append(item)
            if len(selected) == 3:
                break

    best_achieved_min = selected[0]["t_min"] if selected else -99.0

    # 5. Format recommendation specification cards
    recommendations: List[Dict[str, Any]] = []
    for rank_idx, item in enumerate(selected, 1):
        des: Design = item["design"]
        t_min = item["t_min"]
        t_max = item["t_max"]
        t_mean = item["t_mean"]
        cost = item["cost"]
        meets = item["meets_target"]

        conditioning = compute_backup_conditioning_for_design(
            design=des,
            weather_series=weather_rows,
            hourly_t_in_c=item["hourly_t_in"],
            target_indoor_c=target_indoor_c,
            altitude_m=altitude_m,
            materials_db=materials_db,
            occupancy_w=occupancy_w,
            regime=regime,
        )

        if regime == "heating":
            gap_c = max(0.0, target_indoor_c - t_min)
            summary_note = (
                f"{conditioning.get('peak_kw', 0.0):.1f} kW of backup heat for "
                f"{conditioning.get('hours', 0.0):.1f} hours, about "
                f"{conditioning.get('kerosene_litres_per_night', 0.0):.1f} L of kerosene per night."
            )
        else:
            gap_c = max(0.0, t_max - target_indoor_c)
            summary_note = (
                f"{conditioning.get('peak_kw', 0.0):.1f} kW of active cooling (air conditioning) for "
                f"{conditioning.get('hours', 0.0):.1f} hours ({conditioning.get('cooling_kwh_electrical', 0.0):.1f} kWh elec/day)."
            )

        enriched_conditioning = dict(conditioning)
        enriched_conditioning.update({
            "required_kw": conditioning.get("peak_kw", 0.0),
            "operating_hours_per_night": conditioning.get("hours", 0.0),
            "kerosene_liters_per_night": conditioning.get("kerosene_litres_per_night", 0.0),
            "summary_note": summary_note,
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
        # Precise ISO 52016 / ISO 6946 effective U-values
        u_day = float(glaze_mat.u_value or 2.8)
        if glaze_op.night_shutter:
            # Deployable night shutter adds R = 0.55 m2K/W (ISO 6946:2017)
            u_night = round(1.0 / (1.0 / u_day + 0.55), 2)
        else:
            u_night = u_day

        glazing_details = {
            "glazing_id": glaze_op.glazing_id,
            "name": glaze_mat.name,
            "south_area_m2": glaze_op.area_m2,
            "u_value": u_night,
            "u_value_day": u_day,
            "u_value_night": u_night,
            "g_value": glaze_mat.g_value,
            "night_shutter": glaze_op.night_shutter,
            "source": "ISO 52016-1:2017 Table B.14 & ISO 6946:2017",
        }

        title_parts = [materials_db[des.walls[0].material_id].name]
        if len(des.walls) > 1 and des.walls[1].thickness_m > 0:
            title_parts.append(f"{int(des.walls[1].thickness_m * 1000)}mm {materials_db[des.walls[1].material_id].name}")
        elif regime == "cooling":
            title_parts.append("uninsulated (diurnal mass damp)")
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
            "backup_heat": enriched_conditioning,
            "buildup": {
                "walls": wall_details,
                "roof": roof_details,
                "floor": floor_details,
                "glazing": glazing_details,
                "ach": des.ach,
                "roof_emissivity": des.roof_emissivity,
            },
            "design_payload": design_to_dict(des),
            "explanation": explain_buildup(des, t_min, t_max, target_indoor_c, materials_db, regime=regime),
        }
        recommendations.append(rec)

    best_rec = recommendations[0] if recommendations else None
    if regime == "heating":
        if target_met:
            status_message = (
                f"Passive envelope solutions found! "
                f"The top-ranked build-up achieves {best_rec['achieved_min_c']:+.1f} °C min "
                f"at {effective_outdoor_min:+.1f} °C outdoor ambient for {best_rec['cost_formatted']}."
            )
        else:
            b_cond = best_rec["backup_heat"]
            status_message = (
                f"The best passive design reaches {best_rec['achieved_min_c']:+.1f} °C. "
                f"The remaining {best_rec['gap_c']:.1f} °C requires {b_cond['peak_kw']:.1f} kW of backup heat "
                f"for {b_cond['hours']:.1f} hours, about {b_cond['kerosene_litres_per_night']:.1f} L of kerosene per night."
            )
    else:
        if target_met:
            status_message = (
                f"Passive cooling solutions found! "
                f"The top-ranked build-up holds interior to {best_rec['achieved_max_c']:.1f} °C max "
                f"during {max_t_out:.1f} °C ambient for {best_rec['cost_formatted']}."
            )
        else:
            b_cond = best_rec["backup_heat"]
            status_message = (
                f"The best passive cooling design holds {best_rec['achieved_max_c']:.1f} °C max. "
                f"The remaining {best_rec['gap_c']:.1f} °C requires {b_cond['peak_kw']:.1f} kW of active cooling "
                f"(air conditioning) for {b_cond['hours']:.1f} hours."
            )

    return {
        "target_indoor_c": target_indoor_c,
        "design_outdoor_c": effective_outdoor_min,
        "use_site_p1": use_site_p1,
        "site_weather": {
            "t_min_c": round(min_t_out, 1),
            "t_max_c": round(max_t_out, 1),
            "altitude_m": altitude_m,
        },
        "target_met": target_met,
        "all_met_passively": target_met,
        "status_message": status_message,
        "best_achieved_min_c": round(best_achieved_min, 1),
        "evaluated_count": len(candidates),
        "elapsed_s": round(time.time() - t_start, 3),
        "recommendations": recommendations,
        "regime": regime,
    }
