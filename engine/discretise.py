"""Surface layer discretization into thermal resistance-capacitance nodes.

Owner: Vedesh
Sizing rule: Fourier stability Fo = alpha * dt / dx^2 <= FO_TARGET (0.25).
Glazing is pure resistance with zero capacitance (Rule T-2).
"""

from typing import Any, Dict, List, Tuple
from engine.types import Design, Layer


def calculate_fourier_sizing(
    k: float,
    rho: float,
    cp: float,
    thickness_m: float,
    dt_s: float = 60.0,
    fo_target: float = 0.25,
) -> Tuple[int, float]:
    """Calculate node count and spatial step dx for a material layer.

    Args:
        k: Thermal conductivity [W/(m*K)]
        rho: Material density [kg/m^3]
        cp: Specific heat capacity [J/(kg*K)]
        thickness_m: Layer thickness [m]
        dt_s: Internal simulation time step [s]
        fo_target: Target Fourier stability number [-]

    Returns:
        Tuple of (number of nodes in layer, actual node thickness dx [m])

    Raises:
        NotImplementedError: Until implemented in Phase V2
    """
    raise NotImplementedError("PHASE V2 — not yet implemented")


def build_nodes(design: Design, dt_s: float = 60.0) -> Any:
    """Discretise all envelope surfaces of a design into a 1D RC network.

    Args:
        design: Shelter design specification
        dt_s: Internal integration timestep [s]

    Returns:
        Structured RC network node array and connectivity metadata

    Raises:
        NotImplementedError: Until implemented in Phase V2
    """
    raise NotImplementedError("PHASE V2 — not yet implemented")
