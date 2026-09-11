"""
IMPACT TRANSLATION, BACKUP HEATER SIZING & RETROFIT RANKING
Authoritative reference: brain/06_PHYSICS_SPEC.md Sections 10-11,
brain/05_DATA_SOURCES.md Section 6, brain/11_OPTIMIZER_SPEC.md Section 7,
and brain/07_API_CONTRACT.md.

Translates thermal performance deficits into physical logistics and carbon impact:
  - Kerosene fuel consumption (litres)
  - Military supply chain cost (INR delivered to Siachen forward posts)
  - Avoided carbon emissions (kg CO2)
  - Cost-effectiveness retrofit ranking (degrees gained per 1,000 INR)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


# ============================================================================
# Authoritative Sourced Constants (Rule R1)
# ============================================================================

# Energy content (Net Calorific Value) of kerosene [MJ/L]
# Source: IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 2 (Energy), Table 1.2
KEROSENE_ENERGY_MJ_L: float = 37.0

# CO2 emission factor per litre of kerosene [kg CO2/L]
# Source: IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 2 (Energy), Table 1.4
# (Derived from ~71,900 kg CO2/TJ and density ~0.80 kg/L)
KEROSENE_CO2_KG_L: float = 2.5

# High-altitude military helicopter delivered cost of kerosene to Siachen Glacier [INR/L]
# Source: Indian Defence Logistics public reporting & brain/05_DATA_SOURCES.md Section 6
KEROSENE_COST_SIACHEN_INR: float = 2400.0


# ============================================================================
# 1. Kerosene Fuel, Cost, and Carbon Conversions
# ============================================================================

def kerosene_litres(energy_kwh: float, efficiency: float = 0.85) -> float:
    """
    Calculate kerosene fuel volume required to deliver thermal energy.

    Formula:
      litres = (energy_kwh * 3.6 MJ/kWh) / (KEROSENE_ENERGY_MJ_L * efficiency)
    Source: brain/06_PHYSICS_SPEC.md Section 10.

    Args:
        energy_kwh: Thermal energy deficit in kilowatt-hours [kWh].
        efficiency: Heater thermal efficiency [-] (default 0.85 for bukhari/room heater).

    Returns:
        float: Volume of kerosene in litres [L].
    """
    if energy_kwh <= 0.0 or efficiency <= 0.0:
        return 0.0
    energy_mj = energy_kwh * 3.6
    return energy_mj / (KEROSENE_ENERGY_MJ_L * efficiency)


def kerosene_cost_inr(litres: float, cost_per_litre: float = KEROSENE_COST_SIACHEN_INR) -> float:
    """
    Compute total fuel expenditure in Indian Rupees.

    Args:
        litres: Fuel volume in litres [L].
        cost_per_litre: Logistics cost per litre in INR [INR/L] (default 2400.0 INR/L).

    Returns:
        float: Total fuel cost in INR [₹].
    """
    return max(0.0, litres * cost_per_litre)


def co2_emissions_kg(litres: float, emission_factor_kg_l: float = KEROSENE_CO2_KG_L) -> float:
    """
    Compute total carbon dioxide emissions from fuel combustion.

    Args:
        litres: Fuel volume combusted in litres [L].
        emission_factor_kg_l: Emission intensity [kg CO2/L] (default 2.5 kg CO2/L).

    Returns:
        float: Mass of CO2 emitted in kilograms [kg].
    """
    return max(0.0, litres * emission_factor_kg_l)


def payback_period_years(delta_capex_inr: float, annual_saving_inr: float) -> Optional[float]:
    """
    Calculate simple financial payback period in years.

    Args:
        delta_capex_inr: Additional capital expenditure for thermal improvements [INR].
        annual_saving_inr: Annual operating savings in fuel cost [INR/year].

    Returns:
        Optional[float]: Payback period in years, or None if no savings.
    """
    if annual_saving_inr <= 0.0:
        return None
    return round(delta_capex_inr / annual_saving_inr, 2)


# ============================================================================
# 2. Backup Heater Sizing
# ============================================================================

def backup_heat_sizing(
    deficit_w_series: List[float],
    dt_s: float = 3600.0,
    efficiency: float = 0.85,
) -> Dict[str, Any]:
    """
    Size emergency backup heater capacity and fuel consumption per night.

    Formula per brain/06_PHYSICS_SPEC.md Section 10:
      deficit_W = max(0, thermal_shortfall)
      energy_kWh = sum(deficit_W * dt_s) / 3.6e6
      litres = energy_kWh * 3.6 / (37.0 * efficiency)

    Args:
        deficit_w_series: Hourly heating deficits in Watts [W].
        dt_s: Timestep duration in seconds (default 3600 s = 1 hour).
        efficiency: Heater efficiency (default 0.85).

    Returns:
        Dict[str, Any]:
          - peak_kw: Maximum required heater output [kW].
          - hours: Number of hours where supplementary heating is required.
          - kerosene_litres_per_night: Litres of kerosene consumed per night [L].
    """
    positive_deficits = [max(0.0, d) for d in deficit_w_series]
    peak_w = max(positive_deficits) if positive_deficits else 0.0
    hours_needed = sum(1 for d in positive_deficits if d > 1.0)

    total_energy_j = sum(d * dt_s for d in positive_deficits)
    energy_kwh = total_energy_j / 3.6e6
    litres_night = kerosene_litres(energy_kwh, efficiency)

    return {
        "peak_kw": round(peak_w / 1000.0, 2),
        "hours": round(float(hours_needed), 1),
        "kerosene_litres_per_night": round(litres_night, 2),
    }


# ============================================================================
# 3. Retrofit Ranking Engine
# ============================================================================

def rank_retrofits(
    baseline_t_min_c: float,
    baseline_hours_below_health: int,
    interventions: List[Dict[str, Any]],
    budget_inr: float,
) -> Dict[str, Any]:
    """
    Rank passive thermal retrofit interventions by cost-effectiveness.

    Formula per brain/11_OPTIMIZER_SPEC.md Section 7 & brain/07_API_CONTRACT.md:
      degrees_per_1000_inr = delta_t_min_c / (cost_inr / 1000.0)
    Interventions are sorted in descending order of degrees_per_1000_inr.
    Cumulative cost and cumulative temperature gain are computed iteratively.

    Args:
        baseline_t_min_c: Baseline shelter minimum overnight temperature [°C].
        baseline_hours_below_health: Hours below 18.0 °C health threshold.
        interventions: List of intervention candidate dicts:
                       [{"label": str, "delta_t_min_c": float, "cost_inr": float,
                         "cost_basis": str ("sourced"|"estimate"|"derived")}, ...]
        budget_inr: Total available retrofit budget in INR [₹].

    Returns:
        Dict[str, Any]: Formatted response matching POST /retrofit API contract.
    """
    evaluated = []

    for item in interventions:
        cost = float(item["cost_inr"])
        delta_t = float(item["delta_t_min_c"])
        cost_basis = str(item.get("cost_basis", "estimate")).lower().strip()

        # Enforce cost basis tagging per Rule R1
        if cost_basis not in ("sourced", "estimate", "derived"):
            cost_basis = "estimate"

        ratio = (delta_t / (cost / 1000.0)) if cost > 0 else 0.0

        evaluated.append({
            "label": item["label"],
            "delta_t_min_c": round(delta_t, 2),
            "cost_inr": int(cost),
            "degrees_per_1000_inr": round(ratio, 2),
            "cost_basis": cost_basis,
        })

    # Sort strictly descending by degrees_per_1000_inr
    evaluated.sort(key=lambda x: x["degrees_per_1000_inr"], reverse=True)

    cumulative_cost = 0.0
    cumulative_t_min = baseline_t_min_c
    within_budget_count = 0
    ranked_interventions = []

    for idx, item in enumerate(evaluated, start=1):
        item_cost = item["cost_inr"]
        cumulative_cost += item_cost
        cumulative_t_min += item["delta_t_min_c"]

        if cumulative_cost <= budget_inr:
            within_budget_count += 1

        ranked_interventions.append({
            "rank": idx,
            "label": item["label"],
            "delta_t_min_c": item["delta_t_min_c"],
            "cost_inr": item["cost_inr"],
            "degrees_per_1000_inr": item["degrees_per_1000_inr"],
            "cost_basis": item["cost_basis"],
            "cumulative_cost_inr": int(cumulative_cost),
            "cumulative_t_min_c": round(cumulative_t_min, 2),
        })

    return {
        "baseline": {
            "t_in_min_c": round(baseline_t_min_c, 2),
            "hours_below_health_threshold": baseline_hours_below_health,
        },
        "interventions": ranked_interventions,
        "within_budget_count": within_budget_count,
    }
