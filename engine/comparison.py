"""
DESIGN COMPARISON ENGINE (Phase 4)
Authoritative reference: brain/06_PHYSICS_SPEC.md, brain/07_API_CONTRACT.md,
brain/11_OPTIMIZER_SPEC.md.

Allows comparison of 2-4 independently simulated shelter designs with:
  - Authoritative physical metrics (Peak Tin, Min Tin, Comfort Hours, Heating Demand, Heat Loss)
  - Explicit cost disclosure with documented basis (SOURCED, ESTIMATE, UNAVAILABLE)
  - Safety interlock verification (SAFE vs REFUSED)
  - Deterministic mathematical ranking:
      * Best Thermal Comfort
      * Lowest Cost
      * Best Trade-Off (Normalized Utopia Distance / Pareto Knee Point)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple, Union

from engine.materials import load as load_materials
from engine.optimizer import compute_design_cost
from engine.types import Design, Layer, Opening


def request_dict_to_design(req: Dict[str, Any]) -> Design:
    """Helper to convert SimulateRequest dictionary to engine.types.Design."""
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


def determine_cost_and_basis(
    design: Optional[Design],
    request_dict: Optional[Dict[str, Any]] = None,
    materials_db: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[float], str]:
    """
    Calculate capital cost and classify basis as SOURCED, ESTIMATE, or UNAVAILABLE.

    - SOURCED: Every building material in envelope has a documented, non-empty cost_source.
    - ESTIMATE: At least one material has cost from empirical or default fallback rates.
    - UNAVAILABLE: Cost cannot be calculated or is missing.
    """
    if design is None and (not request_dict or "envelope" not in request_dict):
        return None, "UNAVAILABLE"

    try:
        if materials_db is None:
            materials_db = load_materials()

        if design is None and request_dict is not None:
            design = request_dict_to_design(request_dict)

        if not design or (not design.walls and not design.roof and not design.floor):
            return None, "UNAVAILABLE"

        # Check if all constituent materials have a verified cost_source
        all_materials = (
            [lyr.material_id for lyr in design.walls]
            + [lyr.material_id for lyr in design.roof]
            + [lyr.material_id for lyr in design.floor]
            + [op.glazing_id for op in design.openings]
        )

        if not all_materials:
            return None, "UNAVAILABLE"

        total_cost = compute_design_cost(design, materials_db)
        if total_cost <= 0.0:
            return None, "UNAVAILABLE"

        all_sourced = True
        for m_id in all_materials:
            mat = materials_db.get(m_id)
            if mat is None:
                all_sourced = False
                break
            if not mat.cost_source or not str(mat.cost_source).strip():
                all_sourced = False
                break

        basis = "SOURCED" if all_sourced else "ESTIMATE"
        return round(total_cost, 0), basis

    except Exception:
        return None, "UNAVAILABLE"


def compute_utopia_distance(
    comfort: float,
    cost: float,
    min_comfort: float,
    max_comfort: float,
    min_cost: float,
    max_cost: float,
) -> float:
    """
    Mathematically compute the Normalized Euclidean Distance to the Ideal (Utopia) Point.

    Ideal Point in normalized space:
      C* = 1.0 (Maximum Comfort)
      K* = 0.0 (Minimum Cost)

    Normalisation:
      c* = (comfort - min_comfort) / (max_comfort - min_comfort)
      k* = (cost - min_cost) / (max_cost - min_cost)

    Distance:
      D = sqrt((1.0 - c*)^2 + (k* - 0.0)^2)
    """
    # Normalize comfort (higher is better -> ideal 1.0)
    if max_comfort > min_comfort:
        c_star = (comfort - min_comfort) / (max_comfort - min_comfort)
    else:
        c_star = 1.0

    # Normalize cost (lower is better -> ideal 0.0)
    if max_cost > min_cost:
        k_star = (cost - min_cost) / (max_cost - min_cost)
    else:
        k_star = 0.0

    return math.sqrt((1.0 - c_star) ** 2 + (k_star - 0.0) ** 2)


def evaluate_design_comparison(
    design_entries: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Evaluate and compare 2-4 simulated shelter designs.

    Args:
        design_entries: List of dicts, each containing:
          - id: str
          - name: str
          - request: Dict[str, Any]
          - result: Dict[str, Any] (output from simulation)

    Returns:
        Dictionary with:
          - designs: List of normalized comparison records
          - rankings: { best_comfort_id, lowest_cost_id, best_tradeoff_id, explanation }
          - hourly_series: Dict of 24h temp series keyed by design_id
    """
    materials_db = load_materials()
    compared_items = []
    hourly_series = {}

    for idx, entry in enumerate(design_entries):
        d_id = entry.get("id", f"design_{idx + 1}")
        d_name = entry.get("name", f"Design {chr(65 + idx)}")
        req = entry.get("request", {})
        res = entry.get("result", {})

        is_refused = bool(res.get("refused", False))
        refusal_reason = res.get("refusal_reason")

        summary = res.get("summary") or {}
        series = res.get("series") or []

        # Extract series
        t_in_curve = [float(pt.get("t_in", pt.get("t_in_c", 0.0))) for pt in series]
        if len(t_in_curve) == 24:
            hourly_series[d_id] = t_in_curve
        if "t_out" not in hourly_series and series:
            t_out_curve = [float(pt.get("t_out", 0.0)) for pt in series]
            if len(t_out_curve) == 24:
                hourly_series["t_out"] = t_out_curve

        # Basic thermal metrics
        t_min = summary.get("t_in_min_c")
        t_max = summary.get("t_in_max_c")
        comfort_ratio = summary.get("comfort_hours_ratio")
        health_hrs = summary.get("hours_below_health_threshold")

        # Total heat loss
        total_loss = summary.get("total_heat_loss_kwh")
        if total_loss is None and isinstance(summary.get("heat_loss_kwh"), dict):
            try:
                total_loss = round(sum(float(v) for v in summary["heat_loss_kwh"].values() if v is not None), 2)
            except Exception:
                total_loss = None

        # Solar gain
        solar_gain = summary.get("solar_gain_kwh")

        # Heating demand
        backup = summary.get("backup_heat")
        kero_night = None
        kwh_night = None
        if isinstance(backup, dict):
            kero_night = backup.get("kerosene_litres_per_night")
            if "peak_kw" in backup and "hours" in backup:
                try:
                    kwh_night = round(float(backup["peak_kw"]) * float(backup["hours"]), 2)
                except Exception:
                    kwh_night = None

        # Annual fuel costs
        impact = summary.get("impact")
        fuel_cost_yr = impact.get("cost_inr_per_year") if isinstance(impact, dict) else None

        # Cost and cost basis
        cost_val, cost_basis = determine_cost_and_basis(
            design=None,
            request_dict=req,
            materials_db=materials_db,
        )

        item = {
            "id": d_id,
            "name": d_name,
            "safety_status": "REFUSED" if is_refused else "SAFE",
            "refusal_reason": refusal_reason,
            "t_in_min_c": round(float(t_min), 2) if t_min is not None else None,
            "t_in_max_c": round(float(t_max), 2) if t_max is not None else None,
            "comfort_hours_ratio": round(float(comfort_ratio), 3) if comfort_ratio is not None else None,
            "comfort_hours": round(float(comfort_ratio) * 24.0, 1) if comfort_ratio is not None else None,
            "hours_below_health": health_hrs,
            "total_heat_loss_kwh": round(float(total_loss), 2) if total_loss is not None else None,
            "solar_gain_kwh": round(float(solar_gain), 2) if solar_gain is not None else None,
            "heating_demand_litres": round(float(kero_night), 2) if kero_night is not None else None,
            "heating_demand_kwh": kwh_night,
            "annual_fuel_cost_inr": round(float(fuel_cost_yr), 0) if fuel_cost_yr is not None else None,
            "capital_cost_inr": cost_val,
            "cost_basis": cost_basis,
        }
        compared_items.append(item)

    # -----------------------------------------------------------------------
    # Multi-Criteria Comparison Ranking
    # -----------------------------------------------------------------------
    safe_items = [it for it in compared_items if it["safety_status"] == "SAFE"]

    best_comfort_id: Optional[str] = None
    lowest_cost_id: Optional[str] = None
    best_tradeoff_id: Optional[str] = None
    tradeoff_distances: Dict[str, float] = {}

    if safe_items:
        # 1. Best Thermal Comfort
        # Maximise comfort_hours_ratio; tie-break: max t_in_min_c
        sorted_by_comfort = sorted(
            safe_items,
            key=lambda it: (
                it["comfort_hours_ratio"] if it["comfort_hours_ratio"] is not None else -1.0,
                it["t_in_min_c"] if it["t_in_min_c"] is not None else -999.0,
            ),
            reverse=True,
        )
        best_comfort_id = sorted_by_comfort[0]["id"]

        # 2. Lowest Cost
        # Filter safe items with valid cost
        items_with_cost = [
            it for it in safe_items
            if it["capital_cost_inr"] is not None and it["cost_basis"] != "UNAVAILABLE"
        ]
        if items_with_cost:
            sorted_by_cost = sorted(
                items_with_cost,
                key=lambda it: (
                    it["capital_cost_inr"],
                    it["annual_fuel_cost_inr"] if it["annual_fuel_cost_inr"] is not None else 99999999.0,
                ),
            )
            lowest_cost_id = sorted_by_cost[0]["id"]

        # 3. Best Trade-Off
        # Defined as Normalized Euclidean Distance to Utopia Point (C*=1, K*=0)
        tradeoff_candidates = [
            it for it in safe_items
            if it["comfort_hours_ratio"] is not None
            and it["capital_cost_inr"] is not None
            and it["cost_basis"] != "UNAVAILABLE"
        ]

        if len(tradeoff_candidates) >= 1:
            comfs = [it["comfort_hours_ratio"] for it in tradeoff_candidates]
            costs = [it["capital_cost_inr"] for it in tradeoff_candidates]
            c_min, c_max = min(comfs), max(comfs)
            k_min, k_max = min(costs), max(costs)

            candidate_dists = []
            for it in tradeoff_candidates:
                dist = compute_utopia_distance(
                    comfort=it["comfort_hours_ratio"],
                    cost=it["capital_cost_inr"],
                    min_comfort=c_min,
                    max_comfort=c_max,
                    min_cost=k_min,
                    max_cost=k_max,
                )
                dist_rounded = round(dist, 4)
                tradeoff_distances[it["id"]] = dist_rounded
                candidate_dists.append((it["id"], dist_rounded, it["comfort_hours_ratio"]))

            # Smallest distance to Utopia; tie-break: higher comfort
            candidate_dists.sort(key=lambda t: (t[1], -t[2]))
            best_tradeoff_id = candidate_dists[0][0]
        else:
            best_tradeoff_id = best_comfort_id or (safe_items[0]["id"] if safe_items else None)

    # Attach badges and distance to item records
    for it in compared_items:
        it["is_best_comfort"] = (it["id"] == best_comfort_id)
        it["is_lowest_cost"] = (it["id"] == lowest_cost_id)
        it["is_best_tradeoff"] = (it["id"] == best_tradeoff_id)
        it["utopia_distance"] = tradeoff_distances.get(it["id"])

    explanation = (
        "Best comfort is the design with the highest comfort hours ratio. "
        "Lowest cost is the design with the minimum capital expenditure. "
        "Best trade-off is mathematically computed as the Pareto Knee Point minimizing "
        "Normalized Euclidean Distance to the Ideal Point (100% comfort, 0 cost)."
    )

    return {
        "designs": compared_items,
        "rankings": {
            "best_comfort_id": best_comfort_id,
            "lowest_cost_id": lowest_cost_id,
            "best_tradeoff_id": best_tradeoff_id,
            "tradeoff_distances": tradeoff_distances,
            "explanation": explanation,
        },
        "hourly_series": hourly_series,
    }
