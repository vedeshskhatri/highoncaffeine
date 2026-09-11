"""Engine numerical and execution constants.

No physical constants here - physical constants belong to physics_constants.py (Aman).
"""

# Maximum capacitance nodes in thermal network array across all surfaces + air node.
# Sized from Fourier discretization criterion Fo = alpha * dt / dx^2 <= 0.25
# for 6 surfaces (4 walls, roof, floor) with thick low-diffusivity materials
# (e.g. 350-400mm mud brick / rammed earth / straw insulation) + 1 indoor air node.
MAX_NODES: int = 256

# Internal integration time step [s]
DT_INTERNAL_S: float = 60.0

# Number of initial days simulated and discarded to eliminate initial temperature transients
SPINUP_DAYS: int = 3

# Target Fourier stability number for explicit forward Euler integration
FO_TARGET: float = 0.25
