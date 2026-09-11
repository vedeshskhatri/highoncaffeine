"""
OCCUPANT THERMOREGULATION MODEL (GAGGE TWO-NODE MODEL)
Authoritative References:
  1. Gagge, A. P., Fobelets, A. P., & Berglund, L. G. (1986).
     "A standard predictive index of human response to the thermal environment."
     ASHRAE Transactions, 92(2B), 709–731.
  2. ASHRAE Handbook of Fundamentals 2021, Chapter 9 (Thermal Comfort),
     Section on Two-Node Model and Table 5 (Clothing ensemble insulation values).
  3. ISO 7730:2005 / ISO 9886:2004 (Ergonomics of the thermal environment —
     Evaluation of thermal strain by physiological measurements).

PHYSICAL SCOPE & METHODOLOGY:
  Simulates core body compartment (viscera, brain, active muscle) and skin compartment
  heat balances under dynamic cold exposure. Consumes the hourly indoor air temperature
  series T_air produced by engine.solver.run_single().

CLINICAL SAFETY ANCHORS (Rule R1):
  - Normal core temperature setpoint: 36.8 °C (ASHRAE HoF 2021 Ch.9).
  - Normal skin temperature setpoint: 33.7 °C (ASHRAE HoF 2021 Ch.9).
  - Mild Hypothermia onset threshold: T_core <= 35.0 °C (DRDO INMAS / CDC /
    Wilderness Medical Society Clinical Practice Guidelines).
  - Moderate Hypothermia onset threshold: T_core <= 32.0 °C.

CONFIDENCE TAGGING:
  Flagged explicitly as model_confidence = "estimate" (second-order physiological
  estimate, not a diagnostic medical device).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union


# ============================================================================
# Sourced Physiological & Physical Constants (Rule R1)
# ============================================================================

# Reference human body mass [kg] (ASHRAE HoF 2021 Ch.9 standard subject)
BODY_MASS_KG: float = 70.0

# Reference human height [m]
BODY_HEIGHT_M: float = 1.73

# Specific heat capacity of human body tissue [J/(kg*K)]
# Source: ASHRAE HoF 2021 Ch.9 Eq. 37
CP_BODY_J_KG_K: float = 3490.0

# DuBois body surface area coefficient [m^2]
# DuBois & DuBois (1916): A_D = 0.202 * (mass^0.425) * (height^0.725)
DUBOIS_AREA_M2: float = 0.202 * (BODY_MASS_KG ** 0.425) * (BODY_HEIGHT_M ** 0.725)  # ≈ 1.83 m²

# Fraction of body mass in core compartment vs skin
CORE_MASS_FRACTION: float = 0.90
SKIN_MASS_FRACTION: float = 0.10

# Thermal capacities [J/K]
C_CORE_J_K: float = CORE_MASS_FRACTION * BODY_MASS_KG * CP_BODY_J_KG_K  # ≈ 219,870 J/K
C_SKIN_J_K: float = SKIN_MASS_FRACTION * BODY_MASS_KG * CP_BODY_J_KG_K  # ≈ 24,430 J/K

# Core and skin neutral setpoints [°C] (Gagge et al. 1986)
T_CORE_SETPOINT_C: float = 36.8
T_SKIN_SETPOINT_C: float = 33.7

# Mild hypothermia clinical threshold [°C]
MILD_HYPOTHERMIA_C: float = 35.0

# 1 Met in W/m² (ISO 7730 / ASHRAE HoF 2021 Ch.9 Tbl 4)
MET_W_M2: float = 58.15

# 1 Clo in m²*K/W (ISO 7730 / ASHRAE HoF 2021 Ch.9 Tbl 5)
CLO_M2_K_W: float = 0.155

# Minimum core-to-skin vascular conductance under intense cold vasoconstriction [W/(m²*K)]
# Source: Gagge et al. (1986), Table 1
K_SKIN_MIN_W_M2_K: float = 5.28

# Maximum shivering multiplier relative to basal metabolic rate (Gagge et al. 1986)
MAX_SHIVERING_MET_RATIO: float = 3.0


@dataclass(frozen=True)
class OccupantHourlyState:
    """Hourly physiological state of the occupant."""
    hour: int
    t_air_c: float
    t_core_c: float
    t_skin_c: float
    shivering_w: float
    is_hypothermic: bool


@dataclass(frozen=True)
class ThermoregulationResult:
    """Complete outcome of the Gagge two-node simulation over the thermal window."""
    model_confidence: str  # Always "estimate"
    clothing_clo: float
    metabolic_met: float
    t_core_min_c: float
    t_core_min_hour: int
    t_skin_min_c: float
    hours_to_mild_hypothermia: Optional[float]
    series: List[Dict[str, Any]]


def simulate_occupant_thermoregulation(
    t_air_series: List[float],
    clothing_clo: float = 1.5,
    metabolic_met: float = 1.0,
    timestep_sub_s: float = 60.0,
    initial_t_core_c: float = T_CORE_SETPOINT_C,
    initial_t_skin_c: float = T_SKIN_SETPOINT_C,
) -> Dict[str, Any]:
    """
    Simulate core and skin compartment temperatures using the Gagge two-node model.

    Args:
        t_air_series: Hourly indoor air temperature series in Celsius [°C] (length 24).
        clothing_clo: Clothing insulation in clo (default 1.5 clo for heavy winter military uniform).
                      Source: ASHRAE HoF 2021 Ch.9 Tbl 5 (Cold weather military dress).
        metabolic_met: Metabolic activity in met (default 1.0 met = 58.15 W/m² = resting).
        timestep_sub_s: Numerical integration step in seconds (default 60s for explicit stability).
        initial_t_core_c: Initial core temperature [°C] (default 36.8 °C normothermia).
        initial_t_skin_c: Initial skin temperature [°C] (default 33.7 °C).

    Returns:
        Dict conforming to THERMA API contract:
          - model_confidence: "estimate"
          - clothing_clo: float
          - metabolic_met: float
          - t_core_min_c: float
          - t_core_min_hour: int
          - t_skin_min_c: float
          - hours_to_mild_hypothermia: Optional[float] (elapsed hours to core <= 35.0 °C, or None)
          - series: List of hourly dicts {hour, t_core_c, t_skin_c, shivering_w, t_air_c}
    """
    a_d = DUBOIS_AREA_M2
    m_basal_w = metabolic_met * MET_W_M2 * a_d  # Basal metabolic heat production [W]
    max_shivering_w = (MAX_SHIVERING_MET_RATIO - 1.0) * m_basal_w

    # Clothing parameters (ASHRAE HoF 2021 Ch.9)
    # Total dry thermal resistance of clothing [m²*K/W]
    r_cl = clothing_clo * CLO_M2_K_W
    # Clothing area enlargement factor f_cl
    f_cl = 1.0 + 0.28 * clothing_clo
    # Combined surface heat transfer coefficient (convection + radiation) in still indoor air [W/(m²*K)]
    h_comb = 7.7
    # Overall resistance from skin surface through clothing layer to air [m²*K/W]
    r_total = r_cl + (1.0 / (f_cl * h_comb))

    # Conductance core to skin under cold exposure [W/K]
    k_sk_w_k = K_SKIN_MIN_W_M2_K * a_d

    # State variables
    t_cr = float(initial_t_core_c)
    t_sk = float(initial_t_skin_c)

    hourly_records: List[Dict[str, Any]] = []
    hours_to_hypothermia: Optional[float] = None
    elapsed_seconds = 0.0

    sub_steps_per_hour = int(round(3600.0 / timestep_sub_s))
    dt = 3600.0 / sub_steps_per_hour

    for h_idx, t_air in enumerate(t_air_series):
        # Respiratory heat loss (sensible + latent) per Gagge et al. (1986)
        # q_res = 0.0014 * M * (34 - t_air) + 0.0173 * M * (5.87 - p_a)
        # Approximating indoor winter air vapor pressure p_a ≈ 0.5 kPa in dry Himalayan winter
        p_a_kpa = 0.5
        q_res_w = 0.0014 * m_basal_w * (34.0 - t_air) + 0.0173 * m_basal_w * max(0.0, 5.87 - p_a_kpa)

        shivering_w_accum = 0.0

        for _ in range(sub_steps_per_hour):
            elapsed_seconds += dt

            # Cold-induced shivering thermogenesis (Gagge 1986)
            # Stimulated by both core error and skin error below setpoint
            error_cr = max(0.0, T_CORE_SETPOINT_C - t_cr)
            error_sk = max(0.0, T_SKIN_SETPOINT_C - t_sk)
            # Shivering proportional feedback coefficient (19.4 W/K² per Gagge 1986)
            q_shiv_w = min(max_shivering_w, 19.4 * error_cr * error_sk * a_d)
            shivering_w_accum += q_shiv_w

            # Heat transfer from core to skin
            q_cr_to_sk = k_sk_w_k * (t_cr - t_sk)

            # Core compartment energy balance
            # C_cr * d(T_cr)/dt = (M_basal + Q_shiv) - Q_res - Q_cr_to_sk
            q_net_cr = (m_basal_w + q_shiv_w) - q_res_w - q_cr_to_sk
            dt_cr = (q_net_cr / C_CORE_J_K) * dt
            t_cr += dt_cr

            # Skin compartment energy balance
            # Dry sensible loss through clothing to indoor air:
            q_sens_sk = (a_d / r_total) * (t_sk - t_air)
            # Minimal insensible vapor diffusion through cold skin (resting ~1.5 W):
            q_evap_sk = 1.5 * a_d
            # C_sk * d(T_sk)/dt = Q_cr_to_sk - Q_sens_sk - Q_evap_sk
            q_net_sk = q_cr_to_sk - q_sens_sk - q_evap_sk
            dt_sk = (q_net_sk / C_SKIN_J_K) * dt
            t_sk += dt_sk

            # Check hypothermia boundary crossing
            if t_cr <= MILD_HYPOTHERMIA_C and hours_to_hypothermia is None:
                hours_to_hypothermia = round(elapsed_seconds / 3600.0, 1)

        avg_shivering = round(shivering_w_accum / sub_steps_per_hour, 1)
        hourly_records.append({
            "hour": h_idx,
            "t_air_c": round(t_air, 1),
            "t_core_c": round(t_cr, 2),
            "t_skin_c": round(t_sk, 2),
            "shivering_w": avg_shivering,
            "is_hypothermic": t_cr <= MILD_HYPOTHERMIA_C,
        })

    all_t_core = [r["t_core_c"] for r in hourly_records]
    all_t_skin = [r["t_skin_c"] for r in hourly_records]
    t_core_min = min(all_t_core)
    t_core_min_hour = int(all_t_core.index(t_core_min))
    t_skin_min = min(all_t_skin)

    return {
        "model_confidence": "estimate",
        "clothing_clo": float(clothing_clo),
        "metabolic_met": float(metabolic_met),
        "t_core_min_c": round(t_core_min, 2),
        "t_core_min_hour": t_core_min_hour,
        "t_skin_min_c": round(t_skin_min, 2),
        "hours_to_mild_hypothermia": hours_to_hypothermia,
        "series": hourly_records,
    }
