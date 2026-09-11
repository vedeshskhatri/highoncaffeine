"""Sensitivity analysis using Morris elementary effects method.

Owner: Vedesh
Ranks design parameters by influence on thermal comfort and heating load.
Contextualizes each parameter with material cost and installation effort.
"""

from typing import Any, Dict, List, Sequence
from engine.types import Design


def morris_screening(
    baseline_design: Design,
    parameters: Sequence[str],
    weather: Any,
    n_trajectories: int = 10,
) -> List[Dict[str, Any]]:
    """Perform Morris method screening to compute elementary effects for design levers.

    Args:
        baseline_design: Starting shelter design configuration
        parameters: List of parameter names to perturb
        weather: Weather dataset for simulation
        n_trajectories: Number of Morris trajectories across parameter space

    Returns:
        Ranked list of parameters with mu* (influence) and sigma (interaction) values

    Raises:
        NotImplementedError: Until implemented in Phase V6
    """
    raise NotImplementedError("PHASE V6 — not yet implemented")
