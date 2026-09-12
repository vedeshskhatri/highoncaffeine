"""
SAFETY INTERLOCK ENGINE
Enforces ventilation safety constraints for combustion heating in enclosed shelters.

Rationale:
  The thermal optimizer drives infiltration (ACH) down to minimise convective heat loss.
  However, in high-altitude shelters (Ladakh/Siachen), occupants frequently use unflued
  kerosene heaters (bukharis). In a tightly sealed enclosure, unvented combustion rapidly
  depletes oxygen and generates toxic levels of Carbon Monoxide (CO), leading to fatal asphyxiation.
  This module acts as an absolute safety guardrail against dangerous optimizer designs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Any


# Minimum safe air changes per hour for unvented combustion heating
# DERIVED THRESHOLD (Rule R1):
# Built from two authoritative engineering safety anchors:
#   1. ASHRAE Standard 62.2 historical baseline minimum whole-building ventilation rate of 0.35 ACH
#      (ASHRAE Journal, May 2022, 'Impacts of Unvented Combustion').
#   2. UL 647 (Standard for Unvented Kerosene-Fired Room Heaters) requirement of >= 2,800 cm² (3 sq ft)
#      fresh outside-air opening per 29 kW (100,000 Btu/hr) heater capacity.
# Below 0.35 ACH, indoor air quality is compromised even without combustion; adding an unflued
# combustion source below this threshold creates severe risk of carbon monoxide poisoning.
ACH_MIN_COMBUSTION: float = 0.35


@dataclass(frozen=True)
class SafetyResult:
    """
    Outcome of safety interlock evaluation.

    Attributes:
        refused: True if the design violates safety constraints, False otherwise.
        reason: Plain-language explanation for non-engineers if refused, otherwise None.
        actionable_constraint: Authoritative actionable remediation step if refused.
    """
    refused: bool
    reason: Optional[str] = None
    actionable_constraint: Optional[str] = None


def check(design: Any, heater_type: Optional[str] = "none") -> SafetyResult:
    """
    Evaluate safety of shelter design and proposed heating system.

    Args:
        design: Shelter design object or dict containing 'ach' attribute/key.
        heater_type: Type of heating system:
                     'none' | 'electric' | 'flued_stove' | 'unflued_combustion'.

    Returns:
        SafetyResult: Interlock decision with plain-language explanation and actionable constraint.
    """
    if design is None:
        ach = 0.0
    elif isinstance(design, dict):
        ach = float(design.get("ach", design.get("ventilation", {}).get("ach", 0.0) if isinstance(design.get("ventilation"), dict) else 0.0))
    else:
        ach = float(getattr(design, "ach", 0.0))

    heater_normalized = str(heater_type or "none").lower().strip()

    is_combustion = (
        heater_normalized in ("unflued_combustion", "kerosene", "unflued_kerosene", "bukhari", "diesel")
        or "combustion" in heater_normalized
        or "unflued" in heater_normalized
        or "kerosene" in heater_normalized
    )

    if is_combustion and ach < ACH_MIN_COMBUSTION:
        return SafetyResult(
            refused=True,
            reason=(
                f"Ventilation {ach:.2f} ACH is below the safe minimum ({ACH_MIN_COMBUSTION:.2f} ACH) "
                f"for an unflued combustion heater. Carbon monoxide asphyxiation risk. "
                f"Increase ventilation to at least {ACH_MIN_COMBUSTION:.2f} ACH or specify a flued stove or electric heater."
            ),
            actionable_constraint=(
                f"Ventilation requirement not satisfied for selected heater. "
                f"Increase ventilation to at least {ACH_MIN_COMBUSTION:.2f} ACH or specify a flued stove or electric heater."
            ),
        )

    return SafetyResult(refused=False, reason=None, actionable_constraint=None)

