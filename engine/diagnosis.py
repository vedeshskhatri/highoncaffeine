"""
THERMAL DIAGNOSIS ENGINE
Authoritative reference: brain/06_PHYSICS_SPEC.md, brain/07_API_CONTRACT.md,
brain/09_ERROR_HANDLING.md, and brain/00_MASTER_RULES.md.

Transforms diurnal simulation outputs into an explainable, rule-based thermal diagnosis:
  - Exact component heat loss contributions and percentages (walls, roof, glazing, infiltration, sky)
  - Mathematical consistency verification: absolute / total = percentage; sum(percentages) ~= 100%
  - Non-fabrication rule: If a component cannot be separated (e.g. floor), return "component unavailable"
  - Deterministic identification of dominant thermal bottleneck ("Main Weakness")
  - Sourced, rule-based design recommendations with safety interlocks (ASHRAE 62.2 combustion floor)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

from engine.safety import ACH_MIN_COMBUSTION


# Documented rounding tolerance for sum of component percentages
PERCENTAGE_ROUNDING_TOLERANCE: float = 0.15  # +/- 0.15% due to round(..., 1)


@dataclass(frozen=True)
class ComponentContribution:
    """
    Energy contribution of an envelope loss or gain component.

    Attributes:
        component: Standard identifier ('walls', 'roof', 'glazing', 'infiltration', 'sky_radiation')
        absolute_kwh: Total energy loss over simulated period [kWh]
        total_kwh: Denominator total envelope heat loss [kWh]
        percentage: Mathematically consistent percentage of total [%]
        status: 'available' if computed by solver, or 'component unavailable' if unseparated
    """
    component: str
    absolute_kwh: Optional[float]
    total_kwh: float
    percentage: Optional[float]
    status: str = "available"


@dataclass(frozen=True)
class DominantWeakness:
    """
    Identified primary thermal loss bottleneck.

    Attributes:
        component: Name of dominant component or None if total loss is 0
        percentage: Fraction of total heat loss driven by this component [%]
        absolute_kwh: Total loss driven by this component [kWh]
        statement: Plain-language diagnosis statement
    """
    component: Optional[str]
    percentage: float
    absolute_kwh: float
    statement: str


@dataclass(frozen=True)
class DiagnosisRecommendation:
    """
    Rule-based, explainable engineering recommendation.

    Attributes:
        trigger: The measurable physical condition that activated this rule
        affected_parameter: Specific envelope or ventilation parameter to modify
        direction_of_change: 'increase' | 'decrease' | 'enable' | 'replace'
        reason: Physical mechanism explaining why this change reduces heat loss or increases gain
        expected_metric: Quantified expected improvement
        safety_constraints: Life-safety boundary that must be preserved
        source: Authoritative literature or standard citation for threshold (Rule R1)
    """
    trigger: str
    affected_parameter: str
    direction_of_change: str
    reason: str
    expected_metric: str
    safety_constraints: str
    source: str


def calculate_component_contributions(
    heat_loss_kwh: Dict[str, Any],
    total_loss_kwh: Optional[float] = None,
) -> Dict[str, ComponentContribution]:
    """
    Calculate mathematically consistent component contributions from solver output.

    CRITICAL REQUIREMENTS:
      1. Only report contributors that the existing solver actually calculates.
      2. Do NOT invent percentages. Percentages must equal (component_kwh / total_kwh) * 100.
      3. Sum of available percentages must equal ~100% within documented rounding tolerance.
      4. If a component is missing/unseparated (e.g. floor), return status='component unavailable'.
      5. Zero-total edge case must be handled without division by zero.

    Args:
        heat_loss_kwh: Dictionary of component heat losses from solver summary
        total_loss_kwh: Optional pre-calculated total. If None, computed as sum of available.

    Returns:
        Dict mapping component name to ComponentContribution
    """
    known_components = ["walls", "roof", "glazing", "infiltration", "sky_radiation"]
    contributions: Dict[str, ComponentContribution] = {}

    # Extract valid numeric components
    valid_components: Dict[str, float] = {}
    for comp in known_components:
        val = heat_loss_kwh.get(comp)
        if val is not None and isinstance(val, (int, float)) and not math.isnan(val):
            valid_components[comp] = max(0.0, float(val))

    # Compute actual total from valid components if not provided
    if total_loss_kwh is None or total_loss_kwh <= 0.0:
        actual_total = sum(valid_components.values())
    else:
        actual_total = float(total_loss_kwh)

    actual_total = round(actual_total, 3)

    # Calculate consistent percentages
    for comp in known_components:
        if comp in valid_components:
            abs_val = valid_components[comp]
            if actual_total > 0.0:
                pct = round((abs_val / actual_total) * 100.0, 1)
            else:
                pct = 0.0
            contributions[comp] = ComponentContribution(
                component=comp,
                absolute_kwh=abs_val,
                total_kwh=actual_total,
                percentage=pct,
                status="available",
            )
        else:
            contributions[comp] = ComponentContribution(
                component=comp,
                absolute_kwh=None,
                total_kwh=actual_total,
                percentage=None,
                status="component unavailable",
            )

    # Explicit handling for unseparated floor component per spec
    contributions["floor"] = ComponentContribution(
        component="floor",
        absolute_kwh=None,
        total_kwh=actual_total,
        percentage=None,
        status="component unavailable (floor conduction coupled into slab and not separated in heat_loss_kwh)",
    )

    return contributions


def find_dominant_contributor(
    contributions: Dict[str, ComponentContribution],
) -> DominantWeakness:
    """
    Determine the primary thermal bottleneck using actual calculated values.

    Rules:
      - Never claim a component is the main problem unless supported by calculated data.
      - If roof is missing from contributions, report that roof attribution requires solver data.
      - Zero-total edge case returns a neutral statement without false bottleneck.

    Args:
        contributions: Dictionary of ComponentContribution objects

    Returns:
        DominantWeakness: Identified bottleneck with evidence statement
    """
    # Filter available components with valid numeric values
    available = {
        k: v for k, v in contributions.items()
        if v.status == "available" and v.absolute_kwh is not None
    }

    if not available:
        return DominantWeakness(
            component=None,
            percentage=0.0,
            absolute_kwh=0.0,
            statement="No component loss data available from simulation.",
        )

    # Check zero total edge case
    first_item = next(iter(available.values()))
    total_kwh = first_item.total_kwh

    if total_kwh <= 0.0:
        return DominantWeakness(
            component=None,
            percentage=0.0,
            absolute_kwh=0.0,
            statement="Zero envelope heat loss detected. Shelter is in neutral or positive thermal equilibrium.",
        )

    # Sort available components descending by absolute contribution
    sorted_comps = sorted(
        available.values(),
        key=lambda c: c.absolute_kwh if c.absolute_kwh is not None else -1.0,
        reverse=True,
    )
    dominant = sorted_comps[0]

    comp_name = dominant.component
    pct = dominant.percentage or 0.0
    abs_kwh = dominant.absolute_kwh or 0.0

    # Specific check for roof attribution requirement
    if comp_name == "roof":
        statement = (
            f"Roof conduction is the dominant thermal bottleneck, accounting for {pct:.1f}% "
            f"({abs_kwh:.2f} kWh) of total envelope heat loss."
        )
    elif "roof" not in available:
        statement = (
            f"{comp_name.replace('_', ' ').capitalize()} is the dominant contributor ({pct:.1f}%, {abs_kwh:.2f} kWh). "
            f"Note: roof-specific attribution requires additional solver data."
        )
    else:
        statement = (
            f"{comp_name.replace('_', ' ').capitalize()} is the dominant thermal bottleneck, "
            f"accounting for {pct:.1f}% ({abs_kwh:.2f} kWh) of total envelope heat loss."
        )

    return DominantWeakness(
        component=comp_name,
        percentage=pct,
        absolute_kwh=abs_kwh,
        statement=statement,
    )


def generate_recommendations(
    summary: Dict[str, Any],
    design: Any,
) -> List[DiagnosisRecommendation]:
    """
    Generate rule-based, explainable retrofit recommendations.

    Each recommendation strictly includes:
      - trigger: Measured physical condition
      - affected_parameter: Exact parameter path
      - direction_of_change: increase | decrease | enable | replace
      - reason: Physical mechanism
      - expected_metric: Quantified expected improvement
      - safety_constraints: Mandatory safety interlock (combustion floor)
      - source: Primary citation for physical threshold

    Args:
        summary: Simulation summary dict containing heat_loss_kwh, solar_gain_kwh, etc.
        design: Shelter design dictionary or object

    Returns:
        List of DiagnosisRecommendation objects
    """
    recommendations: List[DiagnosisRecommendation] = []

    # Extract design parameters
    if isinstance(design, dict):
        openings = design.get("openings", [])
        ventilation = design.get("ventilation", {})
        ach = float(ventilation.get("ach", design.get("ach", 0.6)))
        heater_type = str(ventilation.get("heater_type", design.get("heater_type", "none"))).lower()
        envelope = design.get("envelope", {})
        roof_emissivity = float(envelope.get("roof_emissivity", design.get("roof_emissivity", 0.90)))
        walls = envelope.get("walls", design.get("walls", []))
    else:
        openings = getattr(design, "openings", [])
        ventilation = getattr(design, "ventilation", None)
        ach = float(getattr(ventilation, "ach", getattr(design, "ach", 0.6)))
        heater_type = str(getattr(ventilation, "heater_type", getattr(design, "heater_type", "none"))).lower()
        envelope = getattr(design, "envelope", None)
        roof_emissivity = float(getattr(envelope, "roof_emissivity", getattr(design, "roof_emissivity", 0.90)))
        walls = getattr(envelope, "walls", getattr(design, "walls", []))

    # Calculate component contributions
    heat_loss = summary.get("heat_loss_kwh", {})
    contributions = calculate_component_contributions(heat_loss)

    glazing_contrib = contributions.get("glazing")
    glazing_pct = glazing_contrib.percentage if glazing_contrib and glazing_contrib.percentage else 0.0
    glazing_kwh = glazing_contrib.absolute_kwh if glazing_contrib and glazing_contrib.absolute_kwh else 0.0

    inf_contrib = contributions.get("infiltration")
    inf_pct = inf_contrib.percentage if inf_contrib and inf_contrib.percentage else 0.0

    sky_contrib = contributions.get("sky_radiation")
    sky_pct = sky_contrib.percentage if sky_contrib and sky_contrib.percentage else 0.0

    walls_contrib = contributions.get("walls")
    walls_pct = walls_contrib.percentage if walls_contrib and walls_contrib.percentage else 0.0

    solar_gain_kwh = float(summary.get("solar_gain_kwh", 0.0))

    # Check night shutter status on south openings
    has_unshuttered_glazing = False
    south_glazing_m2 = 0.0
    for op in openings:
        if isinstance(op, dict):
            facing = str(op.get("facing", "")).lower()
            area = float(op.get("area_m2", 0.0))
            shutter = bool(op.get("night_shutter", False))
        else:
            facing = str(getattr(op, "facing", "")).lower()
            area = float(getattr(op, "area_m2", 0.0))
            shutter = bool(getattr(op, "night_shutter", False))

        if "south" in facing:
            south_glazing_m2 += area
            if not shutter:
                has_unshuttered_glazing = True

    # Rule 1: Glazing nocturnal heat loss -> Add Night Shutters
    # Trigger: Glazing loss >= 25% of total or > 5.0 kWh with uninsulated windows
    if (glazing_pct >= 25.0 or glazing_kwh >= 5.0) and has_unshuttered_glazing:
        recommendations.append(DiagnosisRecommendation(
            trigger=f"Glazing accounts for {glazing_pct:.1f}% ({glazing_kwh:.2f} kWh) of total heat loss with uninsulated night apertures",
            affected_parameter="openings[facing=south].night_shutter",
            direction_of_change="enable",
            reason=(
                "Glazing has high thermal transmittance (U >= 2.8 W/m²K). Deploying insulating movable "
                "night shutters during unlit hours (18:00–06:00) introduces R_shutter = 0.50 m²K/W in series, "
                "reducing effective nighttime glazing U-value to ~1.17 W/m²K."
            ),
            expected_metric="Reduces nocturnal window conduction loss by ~50% and raises minimum indoor temperature by ~3.0–6.0 °C.",
            safety_constraints="None. Window shutters do not impede mechanical or dedicated natural ventilation paths.",
            source="ISO 6946:2017 Section 5.4 & brain/06_PHYSICS_SPEC.md Section 3",
        ))

    # Rule 2: Infiltration Loss & Safety Interlock Interaction
    if inf_pct >= 14.0 or (inf_contrib and inf_contrib.absolute_kwh and inf_contrib.absolute_kwh >= 5.0):
        if heater_type == "unflued_combustion":
            if ach > ACH_MIN_COMBUSTION + 0.05:
                recommendations.append(DiagnosisRecommendation(
                    trigger=f"Infiltration causes {inf_pct:.1f}% of heat loss with air exchange rate of {ach:.2f} ACH",
                    affected_parameter="ventilation.ach",
                    direction_of_change="decrease",
                    reason="Excessive uncontrolled air leakage purges heated indoor air into sub-zero ambient.",
                    expected_metric="Improves minimum temperature by ~1.5–3.0 °C.",
                    safety_constraints=(
                        f"SAFETY INTERLOCK MANDATORY: Unvented combustion heating is present. "
                        f"Airtightness must NEVER be reduced below the safe threshold of {ACH_MIN_COMBUSTION:.2f} ACH "
                        f"to prevent lethal Carbon Monoxide (CO) poisoning and hypoxia."
                    ),
                    source="ASHRAE Standard 62.2 / UL 647 (0.35 ACH combustion floor) & brain/00_MASTER_RULES.md R1",
                ))
            else:
                recommendations.append(DiagnosisRecommendation(
                    trigger=f"Infiltration is {inf_pct:.1f}% of loss, but ventilation ({ach:.2f} ACH) is at or near combustion floor",
                    affected_parameter="ventilation.heater_type",
                    direction_of_change="replace",
                    reason=(
                        f"Ventilation cannot be safely reduced below {ACH_MIN_COMBUSTION:.2f} ACH while using "
                        f"an unvented combustion heater. To allow envelope tightening, the heating source must be replaced."
                    ),
                    expected_metric="Allows envelope tightening to 0.20 ACH once flued stove is installed, saving ~40% infiltration loss.",
                    safety_constraints="Do not tighten envelope below 0.35 ACH until an exterior flued stove is installed.",
                    source="ASHRAE Standard 62.2 Section 4.1 & WHO Indoor Air Quality Guidelines for Carbon Monoxide",
                ))
        elif ach > 0.30:
            recommendations.append(DiagnosisRecommendation(
                trigger=f"Infiltration accounts for {inf_pct:.1f}% of total heat loss at {ach:.2f} ACH",
                affected_parameter="ventilation.ach",
                direction_of_change="decrease",
                reason="Envelope air leakage purges buoyant heated air. Weatherstripping doors and sealing frame joints cuts convective exchange.",
                expected_metric="Reduces infiltration heat loss by ~35–50% and raises minimum overnight temperature by ~2.0 °C.",
                safety_constraints="Electric or flued heating detected: safe to reduce infiltration down to 0.20–0.30 ACH baseline.",
                source="EN ISO 52016-1:2017 Section 6.5.6 & NBC India 2016 Part 8",
            ))

    # Rule 3: Radiative Sub-cooling to Cold Night Sky
    # Trigger: Sky radiation loss >= 15% of total with high roof emissivity (> 0.50)
    if sky_pct >= 15.0 and roof_emissivity > 0.50:
        recommendations.append(DiagnosisRecommendation(
            trigger=f"Net long-wave radiation to cold sky represents {sky_pct:.1f}% of heat loss with roof emissivity {roof_emissivity:.2f}",
            affected_parameter="envelope.roof_emissivity",
            direction_of_change="decrease",
            reason=(
                "In clear high-altitude skies (Ladakh 3,500m), Swinbank sky temperature drops to -45 °C or below. "
                "A standard high-emissivity roof (eps = 0.90) radiates aggressively to space. Applying a low-emissivity "
                "surface (eps <= 0.25, e.g. bright bare metal or reflective aluminium coating) dramatically cuts radiative flux."
            ),
            expected_metric="Reduces nocturnal sky radiation loss by ~65% and reduces peak overnight temperature drop.",
            safety_constraints="Roof coating must maintain snow-shedding slope and resist Himalayan ultraviolet weathering.",
            source="Swinbank (1963) Sky Radiation & brain/06_PHYSICS_SPEC.md Section 5",
        ))

    # Rule 4: Opaque Wall Conduction Loss
    # Trigger: Walls loss >= 25% of total
    if walls_pct >= 25.0:
        recommendations.append(DiagnosisRecommendation(
            trigger=f"Opaque wall conduction accounts for {walls_pct:.1f}% of total envelope heat loss",
            affected_parameter="envelope.walls",
            direction_of_change="increase",
            reason=(
                "Structural masonry walls without exterior thermal break exhibit high thermal transmittances. "
                "Adding 50–100 mm of expanded polystyrene (EPS, k=0.038 W/m·K) or rockwool reduces wall U-value below 0.35 W/m²K."
            ),
            expected_metric="Cuts wall conductive heat loss by ~55–70% and dampens indoor diurnal temperature amplitude.",
            safety_constraints="External insulation placement preserves interior thermal mass capacitance for daytime solar storage.",
            source="ECBC 2017 Table 4.1 & ASHRAE Handbook of Fundamentals 2021 Ch. 26",
        ))

    # Rule 5: Passive Solar Aperture Deficit
    # Trigger: Daily solar gain < 12.0 kWh and south glazing area < 3.0 m2
    if solar_gain_kwh < 12.0 and south_glazing_m2 < 3.0:
        recommendations.append(DiagnosisRecommendation(
            trigger=f"Solar heat gain is only {solar_gain_kwh:.1f} kWh/day with {south_glazing_m2:.1f} m² of south-facing glazing",
            affected_parameter="openings[facing=south].area_m2",
            direction_of_change="increase",
            reason=(
                "Ladakh receives over 1,900 kWh/m²/year of solar radiation with ~300 clear sunny days. "
                "Expanding south-facing aperture captures direct daytime solar radiation, utilizing the building's thermal mass as an internal heat sink."
            ),
            expected_metric="Increases diurnal solar harvest by +6.0 to +12.0 kWh/day.",
            safety_constraints="Must be paired with movable night shutters and internal thermal mass to avoid daytime overheating and nocturnal freeze.",
            source="DRDO DIHAR Solar Passive Shelter Design Manual & brain/05_DATA_SOURCES.md Section 6",
        ))

    return recommendations


def diagnose(
    summary: Dict[str, Any],
    design: Any,
) -> Dict[str, Any]:
    """
    Main entry point for thermal diagnosis engine.

    Returns:
        Structured diagnosis dictionary conforming to Phase 2 spec:
        - component_contributions (absolute, total, percentage, status)
        - percentage_sum (verified ~100%)
        - dominant_weakness (dominant component, percentage, evidence statement)
        - recommendations (list of rule-based explainable recommendations)
    """
    heat_loss = summary.get("heat_loss_kwh", {})
    total_loss = summary.get("total_heat_loss_kwh", None)

    contributions = calculate_component_contributions(heat_loss, total_loss)
    dominant = find_dominant_contributor(contributions)
    recs = generate_recommendations(summary, design)

    # Compute percentage sum of available components
    avail_pcts = [
        c.percentage for c in contributions.values()
        if c.status == "available" and c.percentage is not None
    ]
    pct_sum = round(sum(avail_pcts), 1)

    return {
        "contributions": {k: asdict(v) for k, v in contributions.items()},
        "percentage_sum": pct_sum,
        "percentage_sum_consistent": abs(pct_sum - 100.0) <= (PERCENTAGE_ROUNDING_TOLERANCE * len(avail_pcts)) if pct_sum > 0 else True,
        "dominant_weakness": asdict(dominant),
        "recommendations": [asdict(r) for r in recs],
    }
