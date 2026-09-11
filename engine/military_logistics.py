"""
Military Fuel Logistics & Tactical Convoy Calculation Engine.
Calculates transport sorties, convoy truck payloads, hazardous high-pass logistics reduction,
and 180-day winter isolation stocking requirements for remote forward high-altitude posts.

Defense Cost Reference:
- Commercial base kerosene cost: ~₹80/L.
- Forward post delivered kerosene cost (Ladakh/Siachen high-pass logistics multiplier): ₹2,400/L.
- Standard ALH / Mi-17 helicopter kerosene payload: 1,200 L per sortie.
- 4x4 High-Mobility Military Truck (ALS 2.5T) payload: 2,000 L per convoy vehicle.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


FORWARD_DELIVERED_COST_PER_LITRE_INR = 2400.0
COMMERCIAL_BASE_COST_PER_LITRE_INR = 80.0
HELI_SORTIE_CAPACITY_LITRES = 1200.0
CONVOY_TRUCK_CAPACITY_LITRES = 2000.0
CO2_KG_PER_LITRE_KEROSENE = 2.52


def calculate_military_logistics(
    kerosene_litres_per_night: float,
    winter_days: int = 180,
    occupants: int = 8,
    post_altitude_m: float = 3500.0,
) -> Dict[str, Any]:
    """
    Calculate tactical fuel logistics savings and winter stocking requirements.
    
    Args:
        kerosene_litres_per_night: Daily backup fuel demand in liters/night.
        winter_days: Snowbound isolation period in days (standard Ladakh winter = 180 days).
        occupants: Number of personnel stationed at the post.
        post_altitude_m: Altitude ASL in meters.
        
    Returns:
        Dict containing total fuel mass, delivered defense cost, helicopter sorties,
        convoy truck loads, CO2 emissions, and pre-winter stocking requirements.
    """
    total_winter_litres = round(max(0.0, float(kerosene_litres_per_night)) * int(winter_days), 1)
    
    # Delivered defense logistics cost vs commercial cost
    delivered_cost_inr = round(total_winter_litres * FORWARD_DELIVERED_COST_PER_LITRE_INR, 0)
    commercial_cost_inr = round(total_winter_litres * COMMERCIAL_BASE_COST_PER_LITRE_INR, 0)
    logistics_overhead_inr = round(delivered_cost_inr - commercial_cost_inr, 0)
    
    # Transport logistics units
    heli_sorties_needed = round(total_winter_litres / HELI_SORTIE_CAPACITY_LITRES, 1) if total_winter_litres > 0 else 0.0
    convoy_trucks_needed = round(total_winter_litres / CONVOY_TRUCK_CAPACITY_LITRES, 1) if total_winter_litres > 0 else 0.0
    
    # Fuel mass (density ~0.80 kg/L)
    total_fuel_mass_kg = round(total_winter_litres * 0.80, 1)
    
    # Carbon footprint
    total_co2_kg = round(total_winter_litres * CO2_KG_PER_LITRE_KEROSENE, 1)
    
    # Baseline comparison (Uninsulated conventional tin/canvas military shelter ~22 L/night)
    baseline_uninsulated_litres = round(22.0 * winter_days, 1)
    baseline_delivered_cost_inr = round(baseline_uninsulated_litres * FORWARD_DELIVERED_COST_PER_LITRE_INR, 0)
    
    fuel_saved_litres = round(max(0.0, baseline_uninsulated_litres - total_winter_litres), 1)
    defense_budget_saved_inr = round(max(0.0, baseline_delivered_cost_inr - delivered_cost_inr), 0)
    heli_sorties_saved = round(max(0.0, (baseline_uninsulated_litres - total_winter_litres) / HELI_SORTIE_CAPACITY_LITRES), 1)
    convoy_trucks_saved = round(max(0.0, (baseline_uninsulated_litres - total_winter_litres) / CONVOY_TRUCK_CAPACITY_LITRES), 1)
    
    # High-altitude risk factor index (scales with altitude above 3000m)
    altitude_factor = max(1.0, 1.0 + (post_altitude_m - 3000.0) / 2000.0)
    tactical_risk_reduction_score = min(98.0, round((fuel_saved_litres / baseline_uninsulated_litres) * 100.0 * altitude_factor, 1)) if baseline_uninsulated_litres > 0 else 0.0

    return {
        "winter_days": winter_days,
        "occupants": occupants,
        "total_winter_fuel_litres": total_winter_litres,
        "total_fuel_mass_kg": total_fuel_mass_kg,
        "delivered_defense_cost_inr": delivered_cost_inr,
        "commercial_base_cost_inr": commercial_cost_inr,
        "logistics_overhead_inr": logistics_overhead_inr,
        "heli_sorties_needed": heli_sorties_needed,
        "convoy_trucks_needed": convoy_trucks_needed,
        "total_co2_kg": total_co2_kg,
        "baseline_uninsulated_litres": baseline_uninsulated_litres,
        "fuel_saved_litres": fuel_saved_litres,
        "defense_budget_saved_inr": defense_budget_saved_inr,
        "heli_sorties_saved": heli_sorties_saved,
        "convoy_trucks_saved": convoy_trucks_saved,
        "tactical_risk_reduction_score": tactical_risk_reduction_score,
        "unit_delivered_cost_inr": FORWARD_DELIVERED_COST_PER_LITRE_INR,
    }
