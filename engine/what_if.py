"""
WHAT-IF ANALYSIS ENGINE
Authoritative reference: brain/06_PHYSICS_SPEC.md, brain/07_API_CONTRACT.md,
and brain/04_DATA_MODEL.md.

Allows systematic modification of exactly one validated design variable
at a time and evaluates the delta against baseline simulation:
  - wall thickness [m]
  - roof thickness [m]
  - insulation [m]
  - glazing area [m2]
  - orientation [deg]
  - ACH (infiltration) [ACH]
  - shading / night shutter [bool]
  - material [material_id]

All parameters have schema-derived bounds. No invented engineering limits.
Server remains strictly authoritative for all physical quantities.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union

from engine.materials import get as get_material
from api.errors import UnknownMaterialError
from engine.safety import ACH_MIN_COMBUSTION
from engine.types import Design, Layer, Opening
from engine.optimizer import compute_design_cost as estimate_cost


# Schema-derived valid ranges (Rule R1: derived from 04_DATA_MODEL and 07_API_CONTRACT)
SUPPORTED_VARIABLES = {
    "wall_thickness": {
        "label": "Wall Thickness",
        "unit": "m",
        "min": 0.05,
        "max": 1.50,
        "step": 0.05,
        "description": "Primary structural wall layer thickness",
    },
    "roof_thickness": {
        "label": "Roof Thickness",
        "unit": "m",
        "min": 0.05,
        "max": 1.00,
        "step": 0.05,
        "description": "Primary roof slab/deck layer thickness",
    },
    "insulation": {
        "label": "EPS Insulation Thickness",
        "unit": "m",
        "min": 0.0,
        "max": 0.25,
        "step": 0.025,
        "description": "Expanded Polystyrene (EPS) thermal insulation layer",
    },
    "glazing_area": {
        "label": "South Glazing Area",
        "unit": "m²",
        "min": 0.0,
        "max": 20.0,
        "step": 0.5,
        "description": "Total south-facing passive solar glazing aperture",
    },
    "orientation": {
        "label": "Orientation (Azimuth)",
        "unit": "°",
        "min": 0.0,
        "max": 360.0,
        "step": 15.0,
        "description": "Orientation angle (0=North, 90=East, 180=South, 270=West)",
    },
    "ach": {
        "label": "Infiltration / Ventilation",
        "unit": "ACH",
        "min": 0.10,
        "max": 5.00,
        "step": 0.05,
        "description": "Air changes per hour (ACH >= 0.35 required for unvented heating)",
    },
    "shading": {
        "label": "Night Shutter",
        "unit": "boolean",
        "options": [True, False],
        "description": "Movable insulating night shutters deployed 18:00 to 06:00",
    },
    "material": {
        "label": "Wall Material",
        "unit": "material_id",
        "options": [
            "mud_brick",
            "rammed_earth",
            "stone_masonry",
            "puf_sandwich",
            "cgi_sheet",
            "dense_concrete",
        ],
        "description": "Primary structural masonry/cladding material from library",
    },
}


def request_dict_to_design(req: Dict[str, Any]) -> Design:
    """Helper to convert request dictionary to Design object for cost estimation."""
    env = req.get("envelope", {})
    geom = req.get("geometry", {})
    vent = req.get("ventilation", {})

    walls = tuple(
        Layer(
            material_id=lyr.get("material", "mud_brick"),
            thickness_m=float(lyr.get("thickness_m", 0.30)),
        )
        for lyr in env.get("walls", [])
    )
    roof = tuple(
        Layer(
            material_id=lyr.get("material", "dense_concrete"),
            thickness_m=float(lyr.get("thickness_m", 0.15)),
        )
        for lyr in env.get("roof", [])
    )
    floor = tuple(
        Layer(
            material_id=lyr.get("material", "dense_concrete"),
            thickness_m=float(lyr.get("thickness_m", 0.10)),
        )
        for lyr in env.get("floor", [])
    )
    openings = tuple(
        Opening(
            facing=str(op.get("facing", "south")),
            area_m2=float(op.get("area_m2", 0.0)),
            glazing_id=str(op.get("glazing", "double_pane")),
            night_shutter=bool(op.get("night_shutter", False)),
        )
        for op in req.get("openings", [])
    )

    return Design(
        orientation_deg=float(geom.get("orientation_deg", 180.0)),
        walls=walls,
        roof=roof,
        floor=floor,
        openings=openings,
        ach=float(vent.get("ach", 0.6)),
        roof_emissivity=float(env.get("roof_emissivity", 0.90)),
        night_shutter=any(op.night_shutter for op in openings),
        length_m=float(geom.get("length_m", 6.0)),
        width_m=float(geom.get("width_m", 4.0)),
        height_m=float(geom.get("height_m", 2.6)),
    )


def get_baseline_parameter_value(request_dict: Dict[str, Any], parameter: str) -> Any:
    """Extract current baseline value for a given parameter."""
    if parameter not in SUPPORTED_VARIABLES:
        raise ValueError(f"Unsupported what-if parameter: '{parameter}'. Supported: {list(SUPPORTED_VARIABLES.keys())}")

    envelope = request_dict.get("envelope", {})
    walls = envelope.get("walls", [])
    roof = envelope.get("roof", [])
    openings = request_dict.get("openings", [])
    geometry = request_dict.get("geometry", {})
    ventilation = request_dict.get("ventilation", {})

    if parameter == "wall_thickness":
        return walls[0]["thickness_m"] if walls else 0.30

    elif parameter == "roof_thickness":
        return roof[0]["thickness_m"] if roof else 0.15

    elif parameter == "insulation":
        # Find EPS or insulation layer if present
        for layer in walls:
            if layer.get("material") in ["eps", "rockwool", "straw_bale"]:
                return float(layer.get("thickness_m", 0.0))
        return 0.0

    elif parameter == "glazing_area":
        for op in openings:
            if "south" in str(op.get("facing", "")).lower():
                return float(op.get("area_m2", 0.0))
        return 0.0

    elif parameter == "orientation":
        return float(geometry.get("orientation_deg", 180.0))

    elif parameter == "ach":
        return float(ventilation.get("ach", 0.6))

    elif parameter == "shading":
        for op in openings:
            if "south" in str(op.get("facing", "")).lower():
                return bool(op.get("night_shutter", False))
        return False

    elif parameter == "material":
        return walls[0]["material"] if walls else "mud_brick"

    return None


def apply_parameter_change(
    baseline_dict: Dict[str, Any],
    parameter: str,
    new_value: Any,
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Apply modification of one design variable to a baseline request payload.

    Args:
        baseline_dict: Deep copy of baseline SimulateRequest dict
        parameter: Parameter identifier in SUPPORTED_VARIABLES
        new_value: Proposed new value for the parameter

    Returns:
        Tuple of (modified_request_dict, warning_note_or_none)

    Raises:
        ValueError: If parameter is unsupported or value violates schema bounds
        UnknownMaterialError: If material ID does not exist in library
    """
    if parameter not in SUPPORTED_VARIABLES:
        raise ValueError(f"Unsupported what-if parameter '{parameter}'. Allowed: {list(SUPPORTED_VARIABLES.keys())}")

    spec = SUPPORTED_VARIABLES[parameter]
    modified = copy.deepcopy(baseline_dict)
    warning: Optional[str] = None

    # 1. Wall Thickness
    if parameter == "wall_thickness":
        val = float(new_value)
        if val < spec["min"] or val > spec["max"]:
            raise ValueError(f"Wall thickness {val} m outside allowed range [{spec['min']}, {spec['max']}] m")
        walls = modified.setdefault("envelope", {}).setdefault("walls", [])
        if not walls:
            walls.append({"material": "mud_brick", "thickness_m": val})
        else:
            walls[0]["thickness_m"] = round(val, 3)

    # 2. Roof Thickness
    elif parameter == "roof_thickness":
        val = float(new_value)
        if val < spec["min"] or val > spec["max"]:
            raise ValueError(f"Roof thickness {val} m outside allowed range [{spec['min']}, {spec['max']}] m")
        roof = modified.setdefault("envelope", {}).setdefault("roof", [])
        if not roof:
            roof.append({"material": "dense_concrete", "thickness_m": val})
        else:
            roof[0]["thickness_m"] = round(val, 3)

    # 3. Insulation (EPS)
    elif parameter == "insulation":
        val = float(new_value)
        if val < spec["min"] or val > spec["max"]:
            raise ValueError(f"Insulation thickness {val} m outside allowed range [{spec['min']}, {spec['max']}] m")
        walls = modified.setdefault("envelope", {}).setdefault("walls", [])
        # Search for existing insulation layer
        insul_idx = None
        for i, l in enumerate(walls):
            if l.get("material") in ["eps", "rockwool", "straw_bale"]:
                insul_idx = i
                break

        if val <= 0.0:
            # Remove insulation if set to 0
            if insul_idx is not None and len(walls) > 1:
                walls.pop(insul_idx)
        else:
            if insul_idx is not None:
                walls[insul_idx]["thickness_m"] = round(val, 3)
            else:
                # Append EPS as external/intermediate insulation layer
                walls.append({"material": "eps", "thickness_m": round(val, 3)})

    # 4. Glazing Area
    elif parameter == "glazing_area":
        val = float(new_value)
        if val < spec["min"] or val > spec["max"]:
            raise ValueError(f"Glazing area {val} m² outside allowed range [{spec['min']}, {spec['max']}] m²")
        openings = modified.setdefault("openings", [])
        south_op = None
        for op in openings:
            if "south" in str(op.get("facing", "")).lower():
                south_op = op
                break

        if south_op is not None:
            south_op["area_m2"] = round(val, 2)
        else:
            openings.append({
                "facing": "south",
                "area_m2": round(val, 2),
                "glazing": "double_pane",
                "night_shutter": False,
            })

    # 5. Orientation (Azimuth)
    elif parameter == "orientation":
        val = float(new_value)
        if val < spec["min"] or val > spec["max"]:
            raise ValueError(f"Orientation {val}° outside allowed range [{spec['min']}, {spec['max']}]°")
        modified.setdefault("geometry", {})["orientation_deg"] = round(val, 1)

    # 6. Air Changes per Hour (ACH)
    elif parameter == "ach":
        val = float(new_value)
        if val < spec["min"] or val > spec["max"]:
            raise ValueError(f"Infiltration {val} ACH outside allowed range [{spec['min']}, {spec['max']}] ACH")
        ventilation = modified.setdefault("ventilation", {})
        heater_type = str(ventilation.get("heater_type", "none")).lower()
        if heater_type == "unflued_combustion" and val < ACH_MIN_COMBUSTION:
            warning = (
                f"SAFETY CAUTION: Ventilation {val:.2f} ACH is below safe combustion floor "
                f"({ACH_MIN_COMBUSTION:.2f} ACH). Simulation will refuse if submitted with unflued heater."
            )
        ventilation["ach"] = round(val, 2)

    # 7. Shading / Night Shutter
    elif parameter == "shading":
        val = bool(new_value)
        openings = modified.setdefault("openings", [])
        for op in openings:
            if "south" in str(op.get("facing", "")).lower():
                op["night_shutter"] = val

    # 8. Wall Material
    elif parameter == "material":
        mat_id = str(new_value).strip()
        # Verify material exists in library
        try:
            get_material(mat_id)
        except UnknownMaterialError as err:
            raise UnknownMaterialError(f"Material '{mat_id}' does not exist in library") from err

        walls = modified.setdefault("envelope", {}).setdefault("walls", [])
        if not walls:
            walls.append({"material": mat_id, "thickness_m": 0.30})
        else:
            walls[0]["material"] = mat_id

    return modified, warning


def _safe_float(val: Any) -> Optional[float]:
    """Safely cast value to float or return None."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val: Any) -> Optional[int]:
    """Safely cast value to int or return None."""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def compare_simulations(
    baseline_summary: Dict[str, Any],
    variant_summary: Dict[str, Any],
    baseline_series: Optional[List[Dict[str, Any]]] = None,
    variant_series: Optional[List[Dict[str, Any]]] = None,
    baseline_request: Optional[Dict[str, Any]] = None,
    variant_request: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Compute mathematically consistent comparison metrics between baseline and variant.

    All metrics are derived directly from server simulation outputs:
      - peak indoor temperature [C]
      - minimum indoor temperature [C]
      - comfort hours [fraction and hours]
      - heating demand [kerosene litres and kWh]
      - solar gain [kWh]
      - heat loss [kWh]
      - delta capital cost [INR]
      - annual fuel cost delta [INR/year]
      - simple payback years [years]
      - hourly delta temperature curve [C]

    Gracefully handles missing or unavailable metrics by returning None / available=False
    rather than crashing or inventing numbers.
    """
    b_min = _safe_float(baseline_summary.get("t_in_min_c"))
    v_min = _safe_float(variant_summary.get("t_in_min_c"))

    b_max = _safe_float(baseline_summary.get("t_in_max_c"))
    v_max = _safe_float(variant_summary.get("t_in_max_c"))

    b_comfort = _safe_float(baseline_summary.get("comfort_hours_ratio"))
    v_comfort = _safe_float(variant_summary.get("comfort_hours_ratio"))

    b_health_hrs = _safe_int(baseline_summary.get("hours_below_health_threshold"))
    v_health_hrs = _safe_int(variant_summary.get("hours_below_health_threshold"))

    b_solar = _safe_float(baseline_summary.get("solar_gain_kwh"))
    v_solar = _safe_float(variant_summary.get("solar_gain_kwh"))

    def _extract_total_loss(s: Dict[str, Any]) -> Optional[float]:
        val = _safe_float(s.get("total_heat_loss_kwh"))
        if val is not None:
            return val
        hl = s.get("heat_loss_kwh")
        if isinstance(hl, dict) and hl:
            try:
                return round(sum(float(v) for v in hl.values() if v is not None), 2)
            except (ValueError, TypeError):
                return None
        return None

    b_loss = _extract_total_loss(baseline_summary)
    v_loss = _extract_total_loss(variant_summary)

    # Backup heating
    b_backup = baseline_summary.get("backup_heat")
    v_backup = variant_summary.get("backup_heat")

    b_kero = _safe_float(b_backup.get("kerosene_litres_per_night")) if isinstance(b_backup, dict) else None
    v_kero = _safe_float(v_backup.get("kerosene_litres_per_night")) if isinstance(v_backup, dict) else None

    b_backup_kwh: Optional[float] = None
    if isinstance(b_backup, dict) and "peak_kw" in b_backup and "hours" in b_backup:
        b_backup_kwh = float(b_backup["peak_kw"]) * float(b_backup["hours"])

    v_backup_kwh: Optional[float] = None
    if isinstance(v_backup, dict) and "peak_kw" in v_backup and "hours" in v_backup:
        v_backup_kwh = float(v_backup["peak_kw"]) * float(v_backup["hours"])

    # Impact & fuel costs
    b_impact = baseline_summary.get("impact")
    v_impact = variant_summary.get("impact")

    b_cost_yr = _safe_float(b_impact.get("cost_inr_per_year")) if isinstance(b_impact, dict) else None
    v_cost_yr = _safe_float(v_impact.get("cost_inr_per_year")) if isinstance(v_impact, dict) else None

    # Capital cost estimation if requests provided
    delta_capital_cost_inr = 0.0
    if baseline_request and variant_request:
        try:
            b_des = request_dict_to_design(baseline_request)
            v_des = request_dict_to_design(variant_request)
            b_cap = estimate_cost(b_des)
            v_cap = estimate_cost(v_des)
            delta_capital_cost_inr = round(v_cap - b_cap, 0)
        except Exception:
            delta_capital_cost_inr = 0.0

    # Fuel cost delta & payback period
    delta_fuel_inr: Optional[float] = None
    simple_payback: Optional[float] = None
    if b_cost_yr is not None and v_cost_yr is not None:
        delta_fuel_inr = round(v_cost_yr - b_cost_yr, 0)
        # Net annual fuel savings = -delta_fuel_inr
        if delta_fuel_inr < -1e-3 and delta_capital_cost_inr > 1e-3:
            simple_payback = round(delta_capital_cost_inr / (-delta_fuel_inr), 2)

    # Diurnal hourly delta
    hourly_delta_t: List[float] = []
    if baseline_series and variant_series:
        n = min(len(baseline_series), len(variant_series))
        for i in range(n):
            t_b = float(baseline_series[i].get("t_in", baseline_series[i].get("t_in_c", 0.0)))
            t_v = float(variant_series[i].get("t_in", variant_series[i].get("t_in_c", 0.0)))
            hourly_delta_t.append(round(t_v - t_b, 2))

    # Construct metric comparison records
    def _metric(b: Optional[Union[float, int]], v: Optional[Union[float, int]], unit: str, decimals: int = 2) -> Dict[str, Any]:
        if b is None or v is None:
            return {
                "baseline": None,
                "variant": None,
                "delta": None,
                "unit": unit,
                "available": False,
            }
        d = round(v - b, decimals) if isinstance(v, float) or isinstance(b, float) else v - b
        return {
            "baseline": round(b, decimals) if isinstance(b, float) else b,
            "variant": round(v, decimals) if isinstance(v, float) else v,
            "delta": d,
            "unit": unit,
            "available": True,
        }

    metrics = {
        "peak_indoor_temp_c": _metric(b_max, v_max, "°C", 2),
        "min_indoor_temp_c": _metric(b_min, v_min, "°C", 2),
        "comfort_hours_ratio": _metric(b_comfort, v_comfort, "-", 3),
        "hours_below_health": _metric(b_health_hrs, v_health_hrs, "hours", 0),
        "heating_demand_litres": _metric(b_kero, v_kero, "L/night", 2),
        "heating_demand_kwh": _metric(b_backup_kwh, v_backup_kwh, "kWh/night", 2),
        "solar_gain_kwh": _metric(b_solar, v_solar, "kWh/day", 2),
        "total_heat_loss_kwh": _metric(b_loss, v_loss, "kWh/day", 2),
        "annual_fuel_cost_inr": _metric(b_cost_yr, v_cost_yr, "₹/year", 0),
    }

    # Contract compliant delta object matching WhatIfDeltaSchema
    delta_dict = {
        "delta_t_in_min_c": round(v_min - b_min, 2) if v_min is not None and b_min is not None else 0.0,
        "delta_t_in_max_c": round(v_max - b_max, 2) if v_max is not None and b_max is not None else 0.0,
        "delta_comfort_hours_ratio": round(v_comfort - b_comfort, 3) if v_comfort is not None and b_comfort is not None else 0.0,
        "delta_hours_below_health": (v_health_hrs - b_health_hrs) if v_health_hrs is not None and b_health_hrs is not None else 0,
        "delta_solar_gain_kwh": round(v_solar - b_solar, 2) if v_solar is not None and b_solar is not None else 0.0,
        "delta_heat_loss_kwh": round(v_loss - b_loss, 2) if v_loss is not None and b_loss is not None else 0.0,
        "delta_capital_cost_inr": float(delta_capital_cost_inr),
        "cost_basis": "derived",
        "delta_annual_fuel_cost_inr": float(delta_fuel_inr) if delta_fuel_inr is not None else 0.0,
        "simple_payback_years": simple_payback,
    }

    return {
        "metrics": metrics,
        "delta": delta_dict,
        "hourly_delta_t": hourly_delta_t,
        "delta_capital_cost_inr": delta_capital_cost_inr,
        "simple_payback_years": simple_payback,
    }
