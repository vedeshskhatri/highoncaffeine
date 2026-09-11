"""
PLATFORM CONFIGURATION & SOURCED LOGISTICS PARAMETERS
Authoritative definitions for platform logistics, operational constraints,
and alert thresholds per SIH 2026 PS 26051 DRDO requirements.
"""

from __future__ import annotations
from typing import Dict, Any

# ============================================================================
# 1. Aviation & Logistics Sortie Payload Parameters
# ============================================================================

# Helicopter payload for high-altitude transport (Siachen / eastern Ladakh)
# Cheetah / HAL Light Utility Helicopter (LUH) / ALH operating between 3,500m and 5,000m.
# High density altitude severely degrades lift capacity:
# At sea level useful load is ~1,000 kg, but at 4,000m–5,000m payload drops to 300–450 kg.
# Kerosene density is ~0.80 kg/L. 450 L of kerosene equals ~360 kg plus drum packaging (~40 kg).
SORTIE_CONFIG: Dict[str, Any] = {
    "litres_per_sortie": 450.0,
    "basis": "estimate",
    "note": (
        "Assumes 450 litres useful kerosene load per high-altitude helicopter sortie (~360 kg fuel + packaging "
        "at 3,500–4,800 m operating altitude for Cheetah/ALH). Actual payload varies with density altitude, "
        "ambient temperature, wind conditions, and airframe variant."
    ),
    "aircraft_candidates": ["Cheetah (HAL/Aérospatiale SA 315B)", "ALH Dhruv / LUH"],
}

# ============================================================================
# 2. Cold Snap Alert Severity Tiers
# ============================================================================

# Thresholds in Celsius.
# Primary reference: WHO Housing and Health Guidelines (2018) -> 18.0 °C minimum indoor temp.
# Severe hypothermia risk tiers are operational engineering guidelines for high-altitude posts.
ALERT_SEVERITY_CONFIG: Dict[str, Any] = {
    "critical": {
        "indoor_min_max_c": 5.0,  # Below 5 °C indoor overnight: acute cold stress / freeze hazard
        "basis": "estimate",
        "label": "Critical Freeze Risk",
        "description": "Predicted indoor minimum drops below 5 °C. Immediate fuel pre-positioning required.",
    },
    "warning": {
        "indoor_min_max_c": 12.0,  # 5 °C to 12 °C: severe discomfort, respiratory risk
        "basis": "estimate",
        "label": "Cold Stress Warning",
        "description": "Predicted indoor minimum falls between 5 °C and 12 °C.",
    },
    "advisory": {
        "indoor_min_max_c": 18.0,  # Below WHO 18 °C threshold
        "basis": "sourced",
        "source": "WHO Housing and Health Guidelines (2018)",
        "label": "Sub-Standard Thermal Advisory",
        "description": "Predicted indoor minimum falls below the WHO 18 °C threshold.",
    },
}
