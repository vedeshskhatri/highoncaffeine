"""Vectorized multi-design array packing for batch simulation.

Owner: Vedesh
Packs N heterogeneous shelter designs into fixed-width 2D arrays of shape (MAX_NODES, N).
Inactive nodes are masked with active=False, C=inf, K=0 to guarantee zero thermal leakage.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple
import numpy as np

from engine.constants import DT_INTERNAL_S, FO_TARGET, MAX_NODES
from engine.discretise import build_nodes, DiscretisedSurface
from engine.types import Design, Layer, Opening


SURFACE_NAMES = ("north_wall", "south_wall", "east_wall", "west_wall", "roof", "floor")
SURFACE_META = {
    # name: (tilt_beta, azimuth_gamma, F_sky)
    "north_wall": (90.0, 0.0, 0.5),
    "east_wall": (90.0, 90.0, 0.5),
    "south_wall": (90.0, 180.0, 0.5),
    "west_wall": (90.0, 270.0, 0.5),
    "roof": (0.0, 0.0, 1.0),
    "floor": (180.0, 0.0, 0.0),
}

OPENING_FACINGS = ("north", "east", "south", "west", "roof")
OPENING_ORIENTATIONS = (
    (90.0, 0.0),    # north
    (90.0, 90.0),   # east
    (90.0, 180.0),  # south
    (90.0, 270.0),  # west
    (0.0, 0.0),     # roof
)


@dataclass
class PackedNodeArray:
    """Packed vectorized representation for simultaneous batch simulation of N designs.

    All 2D matrix arrays have shape (MAX_NODES, N) or (n_surfaces, N).
    Padding rows have active=False, C=inf, K=0.
    """
    N: int
    max_nodes: int

    # (MAX_NODES, N) arrays
    T: np.ndarray
    C: np.ndarray
    active: np.ndarray
    K_left: np.ndarray
    K_right: np.ndarray

    # (n_surfaces, N) surface boundary arrays
    outer_indices: np.ndarray
    inner_indices: np.ndarray
    has_surface: np.ndarray
    K_ext: np.ndarray
    K_int: np.ndarray
    A_surf: np.ndarray
    alpha_abs: np.ndarray
    emissivity: np.ndarray
    f_sky: np.ndarray
    tilt_beta: np.ndarray
    azimuth_gamma: np.ndarray

    # Air node & infiltration (N,) arrays
    T_in: np.ndarray
    C_air: np.ndarray
    ach: np.ndarray
    volume_m3: np.ndarray
    q_internal_w: np.ndarray

    # Glazing arrays
    k_glazing_day: np.ndarray
    k_glazing_night: np.ndarray
    # (5, N) product of area_m2 * g_value for each of the 5 envelope orientations
    glazing_ag: np.ndarray
    # Openings detail for direct solar gain: list of (area_m2, g_value, beta, gamma) per design
    openings_solar: List[List[Tuple[float, float, float, float]]]

    @property
    def K(self) -> np.ndarray:
        return self.K_right

    @property
    def surf_idx(self) -> np.ndarray:
        return self.outer_indices


# Alias per 04_DATA_MODEL.md
NodeArray = PackedNodeArray


def pack(
    designs: Sequence[Design],
    materials_db: Any = None,
    max_nodes: int = MAX_NODES,
    dt_s: float = DT_INTERNAL_S,
    fo_target: float = FO_TARGET,
    initial_temp_k: float = 253.15,
) -> PackedNodeArray:
    """Pack N design specifications into a single vectorized PackedNodeArray structure.

    Args:
        designs: Sequence of N shelter designs
        materials_db: Materials lookup provider or dict
        max_nodes: Fixed row dimension of network matrix (default 256)
        dt_s: Internal simulation time step [s]
        fo_target: Fourier stability target
        initial_temp_k: Initial temperature for all nodes [K]

    Returns:
        PackedNodeArray ready for vectorized matrix time stepping
    """
    if materials_db is None:
        from engine import materials as mats
        materials_db = mats

    N = len(designs)
    if N == 0:
        raise ValueError("Cannot pack empty designs sequence")

    n_surfaces = len(SURFACE_NAMES)

    # Allocate matrices with shape (max_nodes, N)
    T = np.full((max_nodes, N), initial_temp_k, dtype=np.float64)
    C = np.full((max_nodes, N), np.inf, dtype=np.float64)
    active = np.zeros((max_nodes, N), dtype=bool)
    K_left = np.zeros((max_nodes, N), dtype=np.float64)
    K_right = np.zeros((max_nodes, N), dtype=np.float64)

    # Allocate surface arrays with shape (n_surfaces, N)
    outer_indices = np.zeros((n_surfaces, N), dtype=np.int64)
    inner_indices = np.zeros((n_surfaces, N), dtype=np.int64)
    has_surface = np.zeros((n_surfaces, N), dtype=bool)
    K_ext = np.zeros((n_surfaces, N), dtype=np.float64)
    K_int = np.zeros((n_surfaces, N), dtype=np.float64)
    A_surf = np.zeros((n_surfaces, N), dtype=np.float64)
    alpha_abs = np.zeros((n_surfaces, N), dtype=np.float64)
    emissivity = np.zeros((n_surfaces, N), dtype=np.float64)
    f_sky = np.zeros((n_surfaces, N), dtype=np.float64)
    tilt_beta = np.zeros((n_surfaces, N), dtype=np.float64)
    azimuth_gamma = np.zeros((n_surfaces, N), dtype=np.float64)

    # Air node & Infiltration arrays (N,)
    T_in = np.full(N, initial_temp_k, dtype=np.float64)
    C_air = np.zeros(N, dtype=np.float64)
    ach = np.zeros(N, dtype=np.float64)
    volume_m3 = np.zeros(N, dtype=np.float64)
    q_internal_w = np.zeros(N, dtype=np.float64)

    k_glazing_day = np.zeros(N, dtype=np.float64)
    k_glazing_night = np.zeros(N, dtype=np.float64)
    glazing_ag = np.zeros((5, N), dtype=np.float64)
    openings_solar: List[List[Tuple[float, float, float, float]]] = []

    # Pack each design into column d
    for d, des in enumerate(designs):
        vol = des.length_m * des.width_m * des.height_m
        volume_m3[d] = vol
        ach[d] = des.ach

        # Build discretised surfaces
        surf_dict = build_nodes(des, materials_db=materials_db, dt_s=dt_s, fo_target=fo_target)

        row_ptr = 0
        for s_idx, s_name in enumerate(SURFACE_NAMES):
            surf: DiscretisedSurface = surf_dict[s_name]
            n_surf_nodes = len(surf.nodes)
            tilt, azim, fsky = SURFACE_META[s_name]

            tilt_beta[s_idx, d] = tilt
            azimuth_gamma[s_idx, d] = azim
            f_sky[s_idx, d] = fsky

            if n_surf_nodes == 0 or surf.net_area_m2 <= 0.0:
                has_surface[s_idx, d] = False
                continue

            if row_ptr + n_surf_nodes > max_nodes:
                raise ValueError(
                    f"Design {d} requires {row_ptr + n_surf_nodes} nodes, which exceeds MAX_NODES ({max_nodes})."
                )

            has_surface[s_idx, d] = True
            start_row = row_ptr
            end_row = row_ptr + n_surf_nodes - 1

            outer_indices[s_idx, d] = start_row
            inner_indices[s_idx, d] = end_row
            K_ext[s_idx, d] = surf.K_ext
            K_int[s_idx, d] = surf.K_int
            A_surf[s_idx, d] = surf.net_area_m2

            # Surface optical properties
            outer_mat_id = surf.nodes[0].material_id
            if hasattr(materials_db, "get"):
                m = materials_db.get(outer_mat_id)
                a_abs = getattr(m, "absorptivity", 0.70)
                e_val = getattr(m, "emissivity", 0.90)
            elif isinstance(materials_db, dict):
                m = materials_db[outer_mat_id]
                a_abs = m.absorptivity if hasattr(m, "absorptivity") else m.get("absorptivity", 0.70)
                e_val = m.emissivity if hasattr(m, "emissivity") else m.get("emissivity", 0.90)
            else:
                a_abs, e_val = 0.70, 0.90

            if s_name == "roof":
                e_val = des.roof_emissivity

            alpha_abs[s_idx, d] = a_abs
            emissivity[s_idx, d] = e_val

            # Fill node capacitance and active mask
            for j, node in enumerate(surf.nodes):
                r = start_row + j
                C[r, d] = node.C
                active[r, d] = True

            # Fill internal inter-node conductances
            for j, k_val in enumerate(surf.K_inter):
                r = start_row + j
                K_right[r, d] = k_val
                K_left[r + 1, d] = k_val

            row_ptr += n_surf_nodes

        # Glazing setup for design d
        k_day = 0.0
        k_night = 0.0
        solar_list: List[Tuple[float, float, float, float]] = []

        for op in des.openings:
            if hasattr(materials_db, "get"):
                mat_prop = materials_db.get(op.glazing_id)
                u_val = getattr(mat_prop, "u_value", 2.8)
                g_val = getattr(mat_prop, "g_value", 0.65)
                r_shutter = getattr(mat_prop, "r_shutter", 0.5)
            elif isinstance(materials_db, dict):
                mat_prop = materials_db[op.glazing_id]
                u_val = mat_prop.u_value if hasattr(mat_prop, "u_value") else mat_prop.get("u_value", 2.8)
                g_val = mat_prop.g_value if hasattr(mat_prop, "g_value") else mat_prop.get("g_value", 0.65)
                r_shutter = getattr(mat_prop, "r_shutter", 0.5) if hasattr(mat_prop, "r_shutter") else mat_prop.get("r_shutter", 0.5)
            else:
                u_val, g_val, r_shutter = 2.8, 0.65, 0.5

            facing = op.facing.lower()
            if facing == "roof":
                beta_g, gamma_g = 0.0, 0.0
            elif facing == "north":
                beta_g, gamma_g = 90.0, 0.0
            elif facing == "east":
                beta_g, gamma_g = 90.0, 90.0
            elif facing == "south":
                beta_g, gamma_g = 90.0, 180.0
            elif facing == "west":
                beta_g, gamma_g = 90.0, 270.0
            else:
                beta_g, gamma_g = 90.0, 180.0

            k_day += u_val * op.area_m2
            if op.night_shutter and r_shutter > 0.0:
                u_eff_night = 1.0 / ((1.0 / u_val) + r_shutter)
            else:
                u_eff_night = u_val
            k_night += u_eff_night * op.area_m2

            if facing in OPENING_FACINGS:
                f_idx = OPENING_FACINGS.index(facing)
            else:
                f_idx = 2
            glazing_ag[f_idx, d] += op.area_m2 * g_val

            solar_list.append((op.area_m2, g_val, beta_g, gamma_g))

        k_glazing_day[d] = k_day
        k_glazing_night[d] = k_night
        openings_solar.append(solar_list)

    return PackedNodeArray(
        N=N,
        max_nodes=max_nodes,
        T=T,
        C=C,
        active=active,
        K_left=K_left,
        K_right=K_right,
        outer_indices=outer_indices,
        inner_indices=inner_indices,
        has_surface=has_surface,
        K_ext=K_ext,
        K_int=K_int,
        A_surf=A_surf,
        alpha_abs=alpha_abs,
        emissivity=emissivity,
        f_sky=f_sky,
        tilt_beta=tilt_beta,
        azimuth_gamma=azimuth_gamma,
        T_in=T_in,
        C_air=C_air,
        ach=ach,
        volume_m3=volume_m3,
        q_internal_w=q_internal_w,
        k_glazing_day=k_glazing_day,
        k_glazing_night=k_glazing_night,
        glazing_ag=glazing_ag,
        openings_solar=openings_solar,
    )


def unpack(packed_results: np.ndarray) -> List[np.ndarray]:
    """Unpack batch simulation results into individual design performance records.

    Args:
        packed_results: (24, N) array of hourly indoor temperatures [Celsius]

    Returns:
        List of 24-element 1D arrays for each design
    """
    N = packed_results.shape[1]
    return [packed_results[:, d] for d in range(N)]


def run_batch(*args, **kwargs):
    """Batch simulate packed designs across 24h weather driving profile."""
    from engine.solver import run_batch as _run_batch
    return _run_batch(*args, **kwargs)
