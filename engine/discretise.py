"""Surface layer discretization into thermal resistance-capacitance (RC) nodes.

Owner: Vedesh
Sizing rule: Fourier stability criterion Fo = alpha * dt / dx^2 <= FO_TARGET (0.25).
Glazing is pure resistance with zero capacitance (Rule T-2).
Film resistances: R_si = 0.13 m^2*K/W, R_se = 0.04 m^2*K/W (ISO 6946).
"""

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

from engine.constants import DT_INTERNAL_S, FO_TARGET
from engine.types import Design, Layer


# Surface film resistances per ISO 6946 Table 1 [m^2*K/W]
R_SI: float = 0.13  # Internal film resistance (horizontal heat flow)
R_SE: float = 0.04  # External film resistance


@dataclass
class DiscretisedNode:
    """Individual thermal capacitance node within a surface buildup.

    Attributes:
        C: Heat capacitance [J/K]
        material_id: Material identifier
        dx_m: Actual node thickness [m]
        layer_idx: Index of layer in the buildup
    """
    C: float
    material_id: str
    dx_m: float
    layer_idx: int


@dataclass
class DiscretisedSurface:
    """Complete 1D discretized RC representation of a composite building surface.

    Attributes:
        name: Surface identifier (e.g. 'south_wall', 'roof')
        net_area_m2: Net surface area excluding openings [m^2]
        nodes: Sequence of capacitance nodes ordered from outside (0) to inside (N-1)
        K_ext: Conductance from outdoor air to center of outermost node [W/K]
        K_int: Conductance from center of innermost node to indoor air [W/K]
        K_inter: Conductances between adjacent nodes j and j+1 [W/K], length len(nodes)-1
    """
    name: str
    net_area_m2: float
    nodes: List[DiscretisedNode]
    K_ext: float
    K_int: float
    K_inter: List[float]


def calculate_fourier_sizing(
    k: float,
    rho: float,
    cp: float,
    thickness_m: float,
    dt_s: float = DT_INTERNAL_S,
    fo_target: float = FO_TARGET,
) -> Tuple[int, float]:
    """Calculate node count and spatial step dx for a material layer per Fourier criterion.

    alpha = k / (rho * cp)                  [m^2/s]
    dx_max = sqrt(alpha * dt / fo_target)   [m]
    n_nodes_layer = max(1, ceil(thickness / dx_max))
    dx_actual = thickness / n_nodes_layer   [m]

    Args:
        k: Thermal conductivity [W/(m*K)]
        rho: Density [kg/m^3]
        cp: Specific heat capacity [J/(kg*K)]
        thickness_m: Layer thickness [m]
        dt_s: Internal simulation time step [s]
        fo_target: Target Fourier stability number [-] (default 0.25)

    Returns:
        Tuple of (number of nodes in layer, actual node thickness dx [m])
    """
    if thickness_m <= 0.0:
        raise ValueError("Layer thickness must be strictly positive")
    if k <= 0.0 or rho <= 0.0 or cp <= 0.0:
        raise ValueError("Physical properties (k, rho, cp) must be strictly positive")

    alpha = k / (rho * cp)  # Thermal diffusivity [m^2/s]
    dx_max = math.sqrt(alpha * dt_s / fo_target)
    n_nodes = max(1, int(thickness_m / dx_max))
    dx_actual = thickness_m / n_nodes

    return n_nodes, dx_actual


_DISCRETISE_CACHE: Dict[Tuple[Any, ...], DiscretisedSurface] = {}


def discretise_surface(
    name: str,
    layers: Sequence[Layer],
    net_area_m2: float,
    materials_db: Any,
    dt_s: float = DT_INTERNAL_S,
    fo_target: float = FO_TARGET,
) -> DiscretisedSurface:
    """Discretise a multi-layer composite surface into a 1D RC network.

    Layers are ordered OUTSIDE -> INSIDE per 04_DATA_MODEL.md.
    Nodes are indexed 0 (outermost, facing outdoor air) to N-1 (innermost, facing indoor air).
    """
    cache_key = (name, tuple(layers), round(float(net_area_m2), 4), float(dt_s), float(fo_target))
    if cache_key in _DISCRETISE_CACHE:
        cached = _DISCRETISE_CACHE[cache_key]
        return DiscretisedSurface(
            name=cached.name,
            net_area_m2=cached.net_area_m2,
            nodes=list(cached.nodes),
            K_ext=cached.K_ext,
            K_int=cached.K_int,
            K_inter=list(cached.K_inter),
        )
    if net_area_m2 <= 0.0 or len(layers) == 0:
        return DiscretisedSurface(
            name=name,
            net_area_m2=net_area_m2,
            nodes=[],
            K_ext=0.0,
            K_int=0.0,
            K_inter=[],
        )

    all_nodes: List[DiscretisedNode] = []
    layer_node_counts: List[int] = []
    layer_k: List[float] = []
    layer_dx: List[float] = []

    for l_idx, lay in enumerate(layers):
        if hasattr(materials_db, "get"):
            mat = materials_db.get(lay.material_id)
            k = getattr(mat, "k")
            rho = getattr(mat, "rho")
            cp = getattr(mat, "cp")
        elif isinstance(materials_db, dict):
            mat = materials_db[lay.material_id]
            k = mat.k if hasattr(mat, "k") else mat["k"]
            rho = mat.rho if hasattr(mat, "rho") else mat["rho"]
            cp = mat.cp if hasattr(mat, "cp") else mat["cp"]
        else:
            raise TypeError("Unsupported materials_db type")

        n_nodes, dx = calculate_fourier_sizing(k, rho, cp, lay.thickness_m, dt_s, fo_target)
        layer_node_counts.append(n_nodes)
        layer_k.append(k)
        layer_dx.append(dx)

        c_node = rho * cp * dx * net_area_m2
        for _ in range(n_nodes):
            all_nodes.append(DiscretisedNode(
                C=c_node,
                material_id=lay.material_id,
                dx_m=dx,
                layer_idx=l_idx,
            ))

    total_nodes = len(all_nodes)

    # 1. External boundary conductance: Outdoor air -> center of node 0
    # R_ext = R_se / A + (dx_outer / 2) / (k_outer * A)
    dx_outer = layer_dx[0]
    k_outer = layer_k[0]
    r_ext = (R_SE / net_area_m2) + ((dx_outer / 2.0) / (k_outer * net_area_m2))
    K_ext = 1.0 / r_ext

    # 2. Internal boundary conductance: Center of node N-1 -> Indoor air
    # R_int = (dx_inner / 2) / (k_inner * A) + R_si / A
    dx_inner = layer_dx[-1]
    k_inner = layer_k[-1]
    r_int = ((dx_inner / 2.0) / (k_inner * net_area_m2)) + (R_SI / net_area_m2)
    K_int = 1.0 / r_int

    # 3. Inter-node conductances between node i and node i+1
    K_inter: List[float] = []
    current_node = 0
    for l_idx, n_nodes in enumerate(layer_node_counts):
        k_l = layer_k[l_idx]
        dx_l = layer_dx[l_idx]

        # Internal conductances within layer l
        k_internal_node = (k_l * net_area_m2) / dx_l
        for _ in range(n_nodes - 1):
            K_inter.append(k_internal_node)
            current_node += 1

        # Interface conductance between layer l and layer l+1
        if l_idx < len(layer_node_counts) - 1:
            k_next = layer_k[l_idx + 1]
            dx_next = layer_dx[l_idx + 1]
            # Series connection between half-node of layer l and half-node of layer l+1:
            # R_interface = (dx_l / 2) / (k_l * A) + (dx_next / 2) / (k_next * A)
            r_interface = ((dx_l / 2.0) / (k_l * net_area_m2)) + ((dx_next / 2.0) / (k_next * net_area_m2))
            K_inter.append(1.0 / r_interface)
            current_node += 1

    res = DiscretisedSurface(
        name=name,
        net_area_m2=net_area_m2,
        nodes=all_nodes,
        K_ext=K_ext,
        K_int=K_int,
        K_inter=K_inter,
    )
    _DISCRETISE_CACHE[cache_key] = res
    return res


def build_nodes(
    design: Design,
    materials_db: Optional[Any] = None,
    dt_s: float = DT_INTERNAL_S,
    fo_target: float = FO_TARGET,
) -> Dict[str, Any]:
    """Discretise all envelope surfaces of a shelter design into 1D RC networks.

    Args:
        design: Shelter design specification
        materials_db: Materials lookup provider (or None to use engine.materials)
        dt_s: Internal simulation time step [s]
        fo_target: Fourier number target [-]

    Returns:
        Dictionary mapping surface name to DiscretisedSurface
    """
    if materials_db is None:
        from engine import materials as mats
        materials_db = mats

    length_m = design.length_m
    width_m = design.width_m
    height_m = design.height_m

    surface_specs = [
        ("north_wall", design.walls, length_m * height_m),
        ("south_wall", design.walls, length_m * height_m),
        ("east_wall", design.walls, width_m * height_m),
        ("west_wall", design.walls, width_m * height_m),
        ("roof", design.roof, length_m * width_m),
        ("floor", design.floor, length_m * width_m),
    ]

    # Deduct opening areas from corresponding surfaces
    net_areas: Dict[str, float] = {name: gross for name, _, gross in surface_specs}
    for op in design.openings:
        facing_wall = f"{op.facing}_wall" if not op.facing.endswith("wall") and op.facing != "roof" else op.facing
        if facing_wall in net_areas:
            net_areas[facing_wall] = max(0.0, net_areas[facing_wall] - op.area_m2)

    result: Dict[str, DiscretisedSurface] = {}
    for name, layers, _ in surface_specs:
        result[name] = discretise_surface(
            name=name,
            layers=layers,
            net_area_m2=net_areas[name],
            materials_db=materials_db,
            dt_s=dt_s,
            fo_target=fo_target,
        )

    return result
