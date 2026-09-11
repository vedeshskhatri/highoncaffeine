"""In-memory data structures and types for THERMA simulation engine.

All structures are immutable (frozen=True) so they can be hashed and cached.
Units are documented on all attributes.
"""

from dataclasses import dataclass
from typing import Optional, Tuple
import numpy as np


@dataclass(frozen=True)
class Layer:
    """A homogeneous material layer within an envelope surface buildup.

    Attributes:
        material_id: Identifier matching an entry in the materials library
        thickness_m: Layer thickness [m]
    """
    material_id: str
    thickness_m: float


@dataclass(frozen=True)
class Opening:
    """A glazed opening (window) in the shelter envelope.

    Attributes:
        facing: Surface orientation ('north', 'east', 'south', 'west', 'roof')
        area_m2: Glazing opening area [m^2]
        glazing_id: Material identifier referencing glazing in materials library
        night_shutter: Whether an insulated night shutter is fitted and operated
    """
    facing: str
    area_m2: float
    glazing_id: str
    night_shutter: bool = False


@dataclass(frozen=True)
class Design:
    """Complete specification of a shelter envelope and operational parameters.

    Attributes:
        orientation_deg: Azimuth orientation (0=North, 90=East, 180=South, 270=West) [degrees]
        walls: Buildup layers ordered outside -> inside
        roof: Buildup layers ordered outside -> inside
        floor: Buildup layers ordered outside -> inside
        openings: Openings / windows in the shelter envelope
        ach: Air changes per hour [1/h]
        roof_emissivity: Long-wave radiative emissivity of exterior roof surface [0.0 - 1.0]
        night_shutter: Global shutter toggle or availability
        length_m: Shelter exterior length [m]
        width_m: Shelter exterior width [m]
        height_m: Shelter exterior height [m]
    """
    orientation_deg: float
    walls: Tuple[Layer, ...]
    roof: Tuple[Layer, ...]
    floor: Tuple[Layer, ...]
    openings: Tuple[Opening, ...]
    ach: float
    roof_emissivity: float
    night_shutter: bool
    length_m: float = 6.0
    width_m: float = 4.0
    height_m: float = 2.6


@dataclass
class NodeArray:
    """Packed vectorized representation for batch simulation of N designs.

    Padded nodes have active=False, C=inf, K=0 to ensure zero thermal leakage.

    Attributes:
        T: Node temperatures [K], float64 array of shape (MAX_NODES, N)
        C: Node capacitance [J/K], float64 array of shape (MAX_NODES, N)
        K: Conductance to adjacent node [W/K], float64 array of shape (MAX_NODES, N)
        active: Boolean mask of active physical nodes, shape (MAX_NODES, N)
        surf_idx: Indices of outermost node per surface, int array of shape (n_surfaces, N)
    """
    T: np.ndarray
    C: np.ndarray
    K: np.ndarray
    active: np.ndarray
    surf_idx: np.ndarray
