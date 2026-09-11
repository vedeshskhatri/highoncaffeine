"""Transient RC thermal network solver.

Owner: Vedesh
Governing equation: EN ISO 52016-1 / multi-node dynamic RC network.
All internal temperatures in KELVIN. Converted to Celsius only at the API boundary.
"""

from typing import Any, Dict, List, Optional
from engine.types import Design, NodeArray


def run_single(design: Design, weather: Any, opts: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Simulate thermal response for a single shelter design over weather time series.

    Args:
        design: Shelter design specification
        weather: Hourly weather dataset (temperature [K], solar flux [W/m^2], wind [m/s])
        opts: Optional simulation controls (timestep_s, spinup_days)

    Returns:
        Dictionary containing hourly temperature series [K] and heat flux breakdowns [W]

    Raises:
        NotImplementedError: Until implemented in Phase V1
        SolverDivergedError: If numerical stability criterion is violated
    """
    raise NotImplementedError("PHASE V1 — not yet implemented")


def run_batch(packed: NodeArray, weather: Any, opts: Optional[Dict[str, Any]] = None) -> Any:
    """Simulate batch of N designs simultaneously as vectorized matrix columns.

    Args:
        packed: NodeArray with shape (MAX_NODES, N)
        weather: Weather dataset
        opts: Optional simulation controls

    Returns:
        Matrix of node temperatures over time, shape (hours, MAX_NODES, N)

    Raises:
        NotImplementedError: Until implemented in Phase V5
    """
    raise NotImplementedError("PHASE V5 — not yet implemented")
