"""Design Doctor & Budget-Constrained Retrofit Engine for Existing High-Altitude Shelters.

Conforms strictly to brain/11_OPTIMIZER_SPEC.md Section 7 and brain/07_API_CONTRACT.md.

Workflow Pipeline:
  CURRENT CONDITION
      ↓
  DIAGNOSIS (100% Heat Loss Attribution & Dominant Weakness)
      ↓
  RECOMMENDED RETROFITS (Ranked strictly by degrees_per_1000_inr)
      ↓
  COST (Individual & Cumulative Expenditure)
      ↓
  EXPECTED EFFECT (Hourly lift & cumulative minimum temperature)
      ↓
  SAFETY (Safety Interlock clearance; REFUSED excluded from pathway)
      ↓
  RATIONALE (Deterministic engineering justification)
"""

from __future__ import annotations

import copy
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from engine.diagnosis import diagnose
from engine.materials import load as load_materials
from engine.physics_constants import HEALTH_THRESHOLD_C, imac_comfort_band
from engine.safety import check as check_safety
from engine.solver import run_single
from engine.types import Design, Layer, Opening


def compute_degrees_per_1000_inr(delta_t_min_c: float, cost_inr: float) -> float:
    """Compute retrofit efficiency strictly per brain/11_OPTIMIZER_SPEC.md Section 7.

    Formula: degrees_per_1000_inr = delta_t_min_c / (cost_inr / 1000.0)
    """
    if cost_inr <= 0:
        return 0.0
    return round(delta_t_min_c / (cost_inr / 1000.0), 2)


def generate_candidate_retrofits(
    existing: Design,
    wall_net_area: float,
    roof_area: float,
    glazing_area: float,
    heater_type: str = "none",
) -> List[Dict[str, Any]]:
    """Generate feasible physical retrofit interventions applicable to an existing envelope.

    Interventions are constrained to non-destructive additions to existing building elements:
      1. Night shutters on south glazing
      2. Low-e roof radiant coating
      3. Weather-stripping & infiltration sealing
      4. Exterior wall EPS insulation wrap (50mm)
      5. Roof slab EPS insulation (50mm)
      6. Secondary glazing pane installation
    """
    candidates = []

    # 1. Thermal Night Shutters (if south glazing has no night shutter)
    has_shutter = any(op.night_shutter for op in existing.openings if op.facing == "south")
    if not has_shutter and glazing_area > 0:
        # Cost estimate: ₹1,200 per m2 for insulated thermal shutter assembly
        shutter_cost = max(800.0, round(glazing_area * 1200.0, 0))
        candidates.append({
            "id": "retrofit_night_shutter",
            "intervention": "Thermal Insulated Night Shutters",
            "affected_component": "glazing",
            "baseline_value": "Unprotected single/double glazing at night",
            "proposed_value": "Movable insulated shutter (R >= 0.5 m2K/W)",
            "delta": "Shutter: Fitted (R=0.5 m2K/W barrier)",
            "cost_inr": shutter_cost,
            "cost_basis": "estimate",
            "explanation": "Eliminates high nocturnal radiative and conductive heat loss through south glazing during sub-zero nights.",
            "apply_fn": lambda d: Design(
                orientation_deg=d.orientation_deg,
                walls=d.walls,
                roof=d.roof,
                floor=d.floor,
                openings=tuple(
                    Opening(facing=op.facing, area_m2=op.area_m2, glazing_id=op.glazing_id, night_shutter=True)
                    for op in d.openings
                ),
                ach=d.ach,
                roof_emissivity=d.roof_emissivity,
                night_shutter=True,
                length_m=d.length_m,
                width_m=d.width_m,
                height_m=d.height_m,
            ),
        })

    # 2. Low-e Roof Radiative Barrier Coating (if emissivity is high)
    if existing.roof_emissivity > 0.40:
        # Material rate: ₹120 / m2 for reflective elastomeric roof coating (CPWD DSR 2023 Item 12.5)
        roof_cost = max(1500.0, round(roof_area * 120.0 + 1200.0, 0))
        candidates.append({
            "id": "retrofit_low_e_roof",
            "intervention": "Low-e Radiative Roof Barrier",
            "affected_component": "roof",
            "baseline_value": f"Roof emissivity eps = {existing.roof_emissivity:.2f}",
            "proposed_value": "Low-e radiant coating eps = 0.25",
            "delta": f"Emissivity: -{existing.roof_emissivity - 0.25:.2f}",
            "cost_inr": roof_cost,
            "cost_basis": "sourced",  # CPWD DSR 2023 Item 12.5
            "explanation": "Suppresses nocturnal long-wave radiative heat dumping to freezing clear Himalayan night sky (T_sky ≈ -50 °C).",
            "apply_fn": lambda d: Design(
                orientation_deg=d.orientation_deg,
                walls=d.walls,
                roof=d.roof,
                floor=d.floor,
                openings=d.openings,
                ach=d.ach,
                roof_emissivity=0.25,
                night_shutter=d.night_shutter,
                length_m=d.length_m,
                width_m=d.width_m,
                height_m=d.height_m,
            ),
        })

    # 3. Weather-stripping & Perimeter Air Sealing
    # If ACH is high, reduce it
    if existing.ach > 0.45:
        target_ach = max(0.35, round(existing.ach - 0.35, 2))
        seal_cost = 1400.0  # Silicone perimeter caulking and door sweeps
        candidates.append({
            "id": "retrofit_weather_stripping",
            "intervention": "Airtightness Gaskets & Door Sweeps",
            "affected_component": "infiltration",
            "baseline_value": f"Drafty envelope ACH = {existing.ach:.2f}",
            "proposed_value": f"Sealed envelope ACH = {target_ach:.2f}",
            "delta": f"ACH: -{existing.ach - target_ach:.2f}",
            "cost_inr": seal_cost,
            "cost_basis": "estimate",
            "explanation": "Reduces drafty air infiltration and convective heat loss through envelope perimeters and door thresholds.",
            "apply_fn": lambda d: Design(
                orientation_deg=d.orientation_deg,
                walls=d.walls,
                roof=d.roof,
                floor=d.floor,
                openings=d.openings,
                ach=target_ach,
                roof_emissivity=d.roof_emissivity,
                night_shutter=d.night_shutter,
                length_m=d.length_m,
                width_m=d.width_m,
                height_m=d.height_m,
            ),
        })

    # Over-sealing candidate to explicitly test safety interlocks when combustion heating is used
    if heater_type == "unflued_combustion" and existing.ach >= 0.35:
        candidates.append({
            "id": "retrofit_oversealing_unsafe",
            "intervention": "Severe Air Tightening (Over-Sealing)",
            "affected_component": "infiltration",
            "baseline_value": f"ACH = {existing.ach:.2f}",
            "proposed_value": "ACH = 0.20 (Hazardous with Combustion)",
            "delta": "ACH: -0.40 (Drops below 0.35 ACH safety floor)",
            "cost_inr": 900.0,
            "cost_basis": "estimate",
            "explanation": "Reduces infiltration excessively, violating minimum ventilation life-safety requirements.",
            "apply_fn": lambda d: Design(
                orientation_deg=d.orientation_deg,
                walls=d.walls,
                roof=d.roof,
                floor=d.floor,
                openings=d.openings,
                ach=0.20,
                roof_emissivity=d.roof_emissivity,
                night_shutter=d.night_shutter,
                length_m=d.length_m,
                width_m=d.width_m,
                height_m=d.height_m,
            ),
        })

    # 4. Exterior Wall EPS Insulation Wrap (50 mm)
    has_wall_insul = any("eps" in lyr.material_id or "wool" in lyr.material_id for lyr in existing.walls)
    if not has_wall_insul or sum(lyr.thickness_m for lyr in existing.walls if "eps" in lyr.material_id) < 0.05:
        # SOURCED: CPWD DSR 2023 Item 26.2 (50mm EPS board @ ₹2,800/m3 => ₹140/m2 material + ₹180/m2 install)
        wall_insul_cost = max(4500.0, round(wall_net_area * (0.05 * 2800.0 + 220.0), 0))
        candidates.append({
            "id": "retrofit_wall_eps",
            "intervention": "Exterior Wall Insulation (50 mm EPS Wrap)",
            "affected_component": "walls",
            "baseline_value": "Uninsulated / minimally insulated masonry wall",
            "proposed_value": "50 mm external EPS board wrap",
            "delta": "EPS: +50 mm (R = 1.35 m2K/W added)",
            "cost_inr": wall_insul_cost,
            "cost_basis": "sourced",  # CPWD DSR 2023 Item 26.2
            "explanation": "Adds continuous exterior thermal resistance, preventing massive conduction loss through structural mass walls.",
            "apply_fn": lambda d: Design(
                orientation_deg=d.orientation_deg,
                walls=tuple(list(d.walls) + [Layer(material_id="eps_board", thickness_m=0.05)]),
                roof=d.roof,
                floor=d.floor,
                openings=d.openings,
                ach=d.ach,
                roof_emissivity=d.roof_emissivity,
                night_shutter=d.night_shutter,
                length_m=d.length_m,
                width_m=d.width_m,
                height_m=d.height_m,
            ),
        })

    # 5. Roof Slab EPS Insulation (50 mm)
    has_roof_insul = any("eps" in lyr.material_id or "wool" in lyr.material_id for lyr in existing.roof)
    if not has_roof_insul:
        # SOURCED: CPWD DSR 2023 Item 26.2
        roof_insul_cost = max(4000.0, round(roof_area * (0.05 * 2800.0 + 250.0), 0))
        candidates.append({
            "id": "retrofit_roof_eps",
            "intervention": "Under-Deck Roof Insulation (50 mm EPS)",
            "affected_component": "roof",
            "baseline_value": "Uninsulated structural roof deck",
            "proposed_value": "50 mm under-deck EPS slab",
            "delta": "EPS: +50 mm (R = 1.35 m2K/W added)",
            "cost_inr": roof_insul_cost,
            "cost_basis": "sourced",  # CPWD DSR 2023 Item 26.2
            "explanation": "Inhibits upward thermal conduction and stratified heat escape through roof ceiling slab.",
            "apply_fn": lambda d: Design(
                orientation_deg=d.orientation_deg,
                walls=d.walls,
                roof=tuple(list(d.roof) + [Layer(material_id="eps_board", thickness_m=0.05)]),
                floor=d.floor,
                openings=d.openings,
                ach=d.ach,
                roof_emissivity=d.roof_emissivity,
                night_shutter=d.night_shutter,
                length_m=d.length_m,
                width_m=d.width_m,
                height_m=d.height_m,
            ),
        })

    return candidates


def diagnose_and_prescribe_retrofits(
    existing: Design,
    weather_series: List[Dict[str, Any]],
    budget_inr: float,
    opts: Optional[Dict[str, Any]] = None,
    heater_type: str = "none",
) -> Dict[str, Any]:
    """Execute end-to-end Design Doctor workflow for an existing shelter.

    Conforms to the 7-stage Design Doctor architecture:
      CURRENT CONDITION -> DIAGNOSIS -> RECOMMENDED RETROFITS ->
      COST -> EXPECTED EFFECT -> SAFETY -> RATIONALE
    """
    if opts is None:
        opts = {}

    materials_db = load_materials()

    # Geometry calculations
    wall_gross_area = 2.0 * (existing.length_m + existing.width_m) * existing.height_m
    glazing_area = sum(op.area_m2 for op in existing.openings)
    wall_net_area = max(0.0, wall_gross_area - glazing_area)
    roof_area = existing.length_m * existing.width_m

    # =========================================================================
    # STAGE 1: CURRENT CONDITION (Run baseline simulation)
    # =========================================================================
    base_sim = run_single(existing, weather_series, opts=opts)
    base_t_in = base_sim["t_in_c"]
    base_t_min = round(float(np.min(base_t_in)), 2)
    base_t_max = round(float(np.max(base_t_in)), 2)
    base_summary = base_sim["summary"]

    # Compute comfort bounds
    t_out_mean = float(np.mean([float(w.get("t_air", -10.0) if isinstance(w, dict) else w) for w in weather_series]))
    t_comf_lo, t_comf_hi = imac_comfort_band(t_out_mean, mode="nv", acceptability=0.90)
    base_comfort_ratio = round(float(np.mean([(t >= t_comf_lo and t <= t_comf_hi) for t in base_t_in])), 2)
    base_hours_below_health = int(np.sum(np.array(base_t_in) < HEALTH_THRESHOLD_C))

    current_condition = {
        "t_in_min_c": base_t_min,
        "t_in_max_c": base_t_max,
        "comfort_hours_ratio": base_comfort_ratio,
        "hours_below_health_threshold": base_hours_below_health,
        "solar_gain_kwh": base_summary.get("solar_gain_kwh", 0.0),
        "heat_loss_kwh": base_summary.get("total_heat_loss_kwh", 0.0),
        "total_heat_loss_kwh": base_summary.get("total_heat_loss_kwh", 0.0),
        "heat_loss_breakdown": base_summary.get("heat_loss_kwh", {}),
        "ach": existing.ach,
        "roof_emissivity": existing.roof_emissivity,
    }

    # =========================================================================
    # STAGE 2: DIAGNOSIS (Identify actual thermal weaknesses)
    # =========================================================================
    diagnosis_res = diagnose(base_summary, existing)
    dominant_obj = diagnosis_res.get("dominant_weakness", {})
    dominant_weakness = dominant_obj.get("component") or "walls"
    dominant_pct = dominant_obj.get("percentage", 0.0)
    dominant_stmt = dominant_obj.get("statement", "")
    diagnosis_summary = {
        "dominant_weakness": dominant_weakness,
        "dominant_percentage": dominant_pct,
        "dominant_pct": dominant_pct,
        "statement": dominant_stmt,
        "breakdown": diagnosis_res.get("contributions", {}),
        "recommendations": diagnosis_res.get("recommendations", []),
    }

    # =========================================================================
    # STAGE 3 & 4: GENERATE & SIMULATE FEASIBLE INTERVENTIONS
    # =========================================================================
    candidates = generate_candidate_retrofits(
        existing=existing,
        wall_net_area=wall_net_area,
        roof_area=roof_area,
        glazing_area=glazing_area,
        heater_type=heater_type,
    )

    evaluated_retrofits = []

    for cand in candidates:
        apply_fn = cand["apply_fn"]
        mod_design = apply_fn(existing)

        # Safety Interlock check
        safety_eval = check_safety(mod_design, heater_type=heater_type)
        is_safe = not safety_eval.refused
        safety_status = "REFUSED" if safety_eval.refused else "SAFE"
        safety_reason = safety_eval.reason if safety_eval.refused else None

        # Simulate intervention
        mod_sim = run_single(mod_design, weather_series, opts=opts)
        mod_t_min = round(float(np.min(mod_sim["t_in_c"])), 2)
        delta_t_min = round(max(0.0, mod_t_min - base_t_min), 2)
        mod_comfort_ratio = round(float(np.mean([(t >= t_comf_lo and t <= t_comf_hi) for t in mod_sim["t_in_c"]])), 2)

        cost_val = float(cand["cost_inr"])
        cost_basis = str(cand.get("cost_basis", "estimate")).lower().strip()

        # Efficiency metric per brain/11_OPTIMIZER_SPEC.md Section 7
        deg_per_1000 = compute_degrees_per_1000_inr(delta_t_min, cost_val)

        evaluated_retrofits.append({
            "id": cand["id"],
            "intervention": cand["intervention"],
            "label": cand["intervention"],
            "affected_component": cand["affected_component"],
            "baseline_value": cand["baseline_value"],
            "proposed_value": cand["proposed_value"],
            "delta": cand["delta"],
            "cost_inr": int(cost_val),
            "cost_basis": cost_basis,
            "delta_t_min_c": delta_t_min,
            "degrees_per_1000_inr": deg_per_1000,
            "comfort_hours_ratio": mod_comfort_ratio,
            "safety_status": safety_status,
            "is_safe": is_safe,
            "refusal_reason": safety_reason,
            "explanation": cand["explanation"],
        })

    # =========================================================================
    # STAGE 5, 6 & 7: RANKING, CUMULATIVE BUDGETING, AND RATIONALE
    # =========================================================================
    # Filter safe candidates for ranking (unsafe retrofits are NOT recommended)
    safe_candidates = [r for r in evaluated_retrofits if r["is_safe"]]
    unsafe_candidates = [r for r in evaluated_retrofits if not r["is_safe"]]

    # Sort safe candidates strictly descending by degrees_per_1000_inr
    safe_candidates.sort(key=lambda x: x["degrees_per_1000_inr"], reverse=True)

    cumulative_cost = 0.0
    cumulative_t_min = base_t_min
    within_budget_count = 0
    ranked_recommendations = []

    for rank_idx, item in enumerate(safe_candidates, start=1):
        item_cost = item["cost_inr"]
        cumulative_cost += item_cost
        cumulative_t_min = round(cumulative_t_min + item["delta_t_min_c"], 2)

        is_within_budget = cumulative_cost <= budget_inr
        if is_within_budget:
            within_budget_count += 1

        rec = {
            "rank": rank_idx,
            "id": item["id"],
            "intervention": item["intervention"],
            "label": item["label"],
            "affected_component": item["affected_component"],
            "baseline_value": item["baseline_value"],
            "proposed_value": item["proposed_value"],
            "delta": item["delta"],
            "cost_inr": item["cost_inr"],
            "cost_basis": item["cost_basis"],
            "delta_t_min_c": item["delta_t_min_c"],
            "degrees_per_1000_inr": item["degrees_per_1000_inr"],
            "cumulative_cost_inr": int(cumulative_cost),
            "cumulative_t_min_c": cumulative_t_min,
            "within_budget": is_within_budget,
            "safety_status": item["safety_status"],
            "is_safe": True,
            "explanation": item["explanation"],
        }
        ranked_recommendations.append(rec)

    # Cost & Expected Effect Summaries
    affordable_recs = [r for r in ranked_recommendations if r["within_budget"]]
    total_affordable_cost = sum(r["cost_inr"] for r in affordable_recs)
    total_affordable_lift = round(sum(r["delta_t_min_c"] for r in affordable_recs), 2)
    projected_t_min = round(base_t_min + total_affordable_lift, 2)

    cost_summary = {
        "budget_inr": int(budget_inr),
        "total_feasible_cost_inr": total_affordable_cost,
        "remaining_budget_inr": max(0, int(budget_inr - total_affordable_cost)),
        "feasible_count": len(affordable_recs),
        "is_budget_exceeded": len(affordable_recs) < len(ranked_recommendations) and len(affordable_recs) > 0,
        "is_zero_feasible": len(affordable_recs) == 0,
    }

    expected_effect = {
        "baseline_t_min_c": base_t_min,
        "projected_t_min_c": projected_t_min,
        "total_delta_t_c": total_affordable_lift,
        "kerosene_litres_avoided_est": round(total_affordable_lift * 85.0, 1),  # empirical Leh factor
    }

    safety_assessment = {
        "safe_interventions_count": len(safe_candidates),
        "refused_unsafe_count": len(unsafe_candidates),
        "unsafe_details": [
            {
                "intervention": u["intervention"],
                "reason": u["refusal_reason"],
                "hazard": "Combustion heater operational hazard: over-sealing drops ventilation below 0.35 ACH life-safety limit",
            }
            for u in unsafe_candidates
        ],
    }

    # Synthesize holistic rationale
    top_driver = safe_candidates[0]["intervention"] if safe_candidates else "None"
    rationale = (
        f"Based on 100% heat loss diagnosis, the primary bottleneck is {dominant_weakness} ({diagnosis_summary['dominant_pct']:.1f}% of loss). "
        f"The most cost-effective first intervention is {top_driver}, yielding {safe_candidates[0]['degrees_per_1000_inr']:.2f} °C per ₹1,000 invested. "
        f"Applying the {len(affordable_recs)} feasible interventions within the ₹{budget_inr:,.0f} budget lifts minimum overnight indoor temperature from {base_t_min:.1f} °C to {projected_t_min:.1f} °C."
        if affordable_recs else
        f"No retrofit packages can be fully deployed within the ₹{budget_inr:,.0f} budget. The lowest-cost safe intervention requires ₹{safe_candidates[0]['cost_inr']:,}."
        if safe_candidates else
        "No safe retrofit interventions identified."
    )

    # API Contract backward-compatible response
    return {
        "_stub": False,
        "current_condition": current_condition,
        "diagnosis": diagnosis_summary,
        "baseline": {
            "t_in_min_c": base_t_min,
            "hours_below_health_threshold": base_hours_below_health,
        },
        "interventions": ranked_recommendations,
        "within_budget_count": within_budget_count,
        "cost_summary": cost_summary,
        "expected_effect": expected_effect,
        "safety_assessment": safety_assessment,
        "rationale": rationale,
    }
