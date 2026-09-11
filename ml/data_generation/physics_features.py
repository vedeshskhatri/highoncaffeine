"""
THERMA Physics Feature Engineering
Smart India Hackathon 2026 - DRDO PS 26051

Calculates analytical building physics properties for shelter designs:
- Overall U-value [W/(m²·K)] and R-value [m²·K/W] per ISO 6946
- Total thermal capacitance [J/K]
- Capital cost based on CPWD DSR 2023 material rates
- Comfort status and thermal risk classification
"""

from __future__ import annotations

import math
from pathlib import Path
import sys
from typing import Any, Dict, List, Tuple

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from engine.materials import load as load_materials
from engine.types import Design, Layer, Opening
from engine.physics_constants import atmospheric_pressure_pa, air_density, CP_AIR


# Surface film resistances per ISO 6946 / engine.solver
R_SI = 0.13  # Internal film resistance [m²·K/W]
R_SE = 0.04  # External film resistance [m²·K/W]


def calculate_surface_u_value(layers: Tuple[Layer, ...] | List[Layer], materials_db: Dict[str, Any]) -> float:
    """Compute overall U-value [W/(m²·K)] of a multi-layer buildup including film resistances."""
    r_total = R_SI + R_SE
    for lay in layers:
        mat = materials_db.get(lay.material_id)
        if mat is not None and mat.k > 0:
            r_total += lay.thickness_m / mat.k
        else:
            # Fallback for missing/zero k
            r_total += lay.thickness_m / 0.5
    return 1.0 / max(0.01, r_total)


def calculate_surface_thermal_mass(
    layers: Tuple[Layer, ...] | List[Layer],
    area_m2: float,
    materials_db: Dict[str, Any],
) -> float:
    """Compute thermal capacitance [J/K] of a surface buildup."""
    c_total = 0.0
    for lay in layers:
        mat = materials_db.get(lay.material_id)
        if mat is not None:
            c_total += mat.rho * mat.cp * lay.thickness_m * area_m2
    return c_total


def calculate_design_physics_properties(
    design: Design,
    altitude_m: float = 3500.0,
    t_air_c: float = -10.0,
    materials_db: Dict[str, Any] = None,
) -> Dict[str, float]:
    """Compute envelope areas, overall U/R values, thermal mass, and air properties."""
    if materials_db is None:
        materials_db = load_materials()

    l = design.length_m
    w = design.width_m
    h = design.height_m

    floor_area = l * w
    roof_area = l * w
    volume_m3 = l * w * h

    # Gross wall areas
    # North, South face = l * h; East, West face = w * h
    area_north = l * h
    area_south = l * h
    area_east = w * h
    area_west = w * h
    gross_wall_area = 2.0 * (l + w) * h

    # Openings / Glazing
    glazing_area_tot = 0.0
    ua_glazing = 0.0
    south_glazing_area = 0.0

    for op in design.openings:
        area_g = op.area_m2
        glazing_area_tot += area_g
        facing = op.facing.lower()
        if facing == "south":
            south_glazing_area += area_g

        mat = materials_db.get(op.glazing_id)
        u_g = getattr(mat, "u_value", 2.8) if mat is not None else 2.8
        if u_g is None:
            u_g = 2.8
        if op.night_shutter:
            # Insulated shutter R ~ 0.5
            u_eff = 1.0 / ((1.0 / u_g) + 0.5)
        else:
            u_eff = u_g
        ua_glazing += u_eff * area_g

    net_wall_area = max(1.0, gross_wall_area - glazing_area_tot)
    glazing_ratio = round(glazing_area_tot / max(1.0, gross_wall_area), 4)

    # U-values of surfaces
    u_wall = calculate_surface_u_value(design.walls, materials_db)
    u_roof = calculate_surface_u_value(design.roof, materials_db)
    u_floor = calculate_surface_u_value(design.floor, materials_db)

    ua_total = (u_wall * net_wall_area) + (u_roof * roof_area) + (u_floor * floor_area) + ua_glazing
    total_envelope_area = net_wall_area + roof_area + floor_area + glazing_area_tot

    overall_u = round(ua_total / total_envelope_area, 4)
    overall_r = round(1.0 / overall_u, 4)

    # Thermal Mass (J/K)
    c_walls = calculate_surface_thermal_mass(design.walls, net_wall_area, materials_db)
    c_roof = calculate_surface_thermal_mass(design.roof, roof_area, materials_db)
    c_floor = calculate_surface_thermal_mass(design.floor, floor_area, materials_db)

    t_k = t_air_c + 273.15
    rho_a = air_density(altitude_m, t_k)
    c_air = volume_m3 * rho_a * CP_AIR

    thermal_mass_j_k = round(c_walls + c_roof + c_floor + c_air, 1)

    p_pa = atmospheric_pressure_pa(altitude_m)

    return {
        "floor_area_m2": round(floor_area, 2),
        "roof_area_m2": round(roof_area, 2),
        "gross_wall_area_m2": round(gross_wall_area, 2),
        "net_wall_area_m2": round(net_wall_area, 2),
        "glazing_area_m2": round(glazing_area_tot, 2),
        "south_glazing_area_m2": round(south_glazing_area, 2),
        "glazing_ratio": glazing_ratio,
        "volume_m3": round(volume_m3, 2),
        "overall_U_value_W_m2K": overall_u,
        "overall_R_value_m2K_W": overall_r,
        "thermal_mass_J_K": thermal_mass_j_k,
        "air_pressure_Pa": round(p_pa, 1),
        "air_density_kg_m3": round(rho_a, 4),
    }


def calculate_design_capital_cost(
    design: Design,
    materials_db: Dict[str, Any] = None,
) -> Tuple[float, str, str]:
    """
    Calculate estimated capital cost in INR based on CPWD DSR 2023 rates.
    Returns (total_cost_inr, cost_basis, cost_source).
    """
    if materials_db is None:
        materials_db = load_materials()

    l = design.length_m
    w = design.width_m
    h = design.height_m

    floor_area = l * w
    roof_area = l * w
    gross_wall_area = 2.0 * (l + w) * h

    total_cost = 0.0
    has_estimate = False

    # Glazing cost
    for op in design.openings:
        mat = materials_db.get(op.glazing_id)
        cost_m3 = getattr(mat, "cost_per_m3", None) if mat else None
        # Glazing commonly cited per m2 or m3 in materials.csv
        # In materials.csv, glass cost is listed per m3 (e.g. single 18000, double 36000)
        # Assuming typical 0.02m IGU thickness or minimum 2,500 INR/m2
        cost_rate_m2 = (cost_m3 * 0.02) if (cost_m3 and cost_m3 > 10000) else (cost_m3 or 3200.0)
        total_cost += op.area_m2 * cost_rate_m2
        if op.night_shutter:
            total_cost += op.area_m2 * 1200.0  # Deployable insulated shutter hardware

    glazing_area = sum(op.area_m2 for op in design.openings)
    net_wall_area = max(1.0, gross_wall_area - glazing_area)

    # Walls material cost
    for lay in design.walls:
        mat = materials_db.get(lay.material_id)
        cost_m3 = getattr(mat, "cost_per_m3", None) if mat else None
        if cost_m3 is None or cost_m3 <= 0:
            cost_m3 = 3000.0
            has_estimate = True
        vol = net_wall_area * lay.thickness_m
        total_cost += vol * cost_m3

    # Roof material cost
    for lay in design.roof:
        mat = materials_db.get(lay.material_id)
        cost_m3 = getattr(mat, "cost_per_m3", None) if mat else None
        if cost_m3 is None or cost_m3 <= 0:
            cost_m3 = 4500.0
            has_estimate = True
        vol = roof_area * lay.thickness_m
        total_cost += vol * cost_m3

    # Floor material cost
    for lay in design.floor:
        mat = materials_db.get(lay.material_id)
        cost_m3 = getattr(mat, "cost_per_m3", None) if mat else None
        if cost_m3 is None or cost_m3 <= 0:
            cost_m3 = 5000.0
            has_estimate = True
        vol = floor_area * lay.thickness_m
        total_cost += vol * cost_m3

    # Construction labor and high-altitude transport factor (1.35x CPWD Ladakh Schedule)
    total_cost *= 1.35

    cost_basis = "ESTIMATE" if has_estimate else "SOURCED"
    cost_source = "CPWD DSR 2023 / Ladakh Schedule of Rates"

    return round(total_cost, 0), cost_basis, cost_source


def classify_comfort(t_in_c: float) -> Tuple[str, str]:
    """
    Classify thermal comfort status and hypothermia safety risk.
    Returns (comfort_status, thermal_risk_class).
    """
    if t_in_c >= 18.0:
        return "COMFORTABLE", "MINIMAL"
    elif t_in_c >= 15.0:
        return "COOL", "LOW"
    elif t_in_c >= 10.0:
        return "COLD", "MODERATE"
    elif t_in_c >= 5.0:
        return "EXTREME_COLD", "HIGH_HYPOTHERMIA_RISK"
    else:
        return "EXTREME_COLD", "CRITICAL_FREEZE_RISK"
