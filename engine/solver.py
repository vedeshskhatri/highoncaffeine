"""Transient RC thermal network solver.

Owner: Vedesh
Governing equation: EN ISO 52016-1 / multi-node dynamic RC network.
All internal computations in KELVIN. Conversion to Celsius occurs only at the API boundary.

Surface film resistances cited from ISO 6946:
- R_si = 0.13 m^2*K/W (internal surface film resistance, horizontal heat flow)
- R_se = 0.04 m^2*K/W (external surface film resistance)
"""

from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
import numpy as np

from engine.constants import DT_INTERNAL_S, FO_TARGET
from engine.discretise import build_nodes, DiscretisedSurface
from engine.types import Design, Layer, NodeArray, Opening


# --- Custom Domain Exceptions (brain/09_ERROR_HANDLING.md) ---

class ThermaError(Exception):
    """Base exception for all THERMA errors."""
    pass


class SolverDivergedError(ThermaError):
    """Raised when numerical solver diverges or becomes unstable."""
    pass


# Standard air volumetric heat capacity [J/(m^3*K)] at sea level: rho=1.204 kg/m^3, Cp=1005 J/(kg*K)
C_AIR_VOLUMETRIC: float = 1210.0


def _extract_hourly_temperatures_k(weather: Any) -> np.ndarray:
    """Extract hourly outdoor temperature series in KELVIN from weather input."""
    if isinstance(weather, (list, tuple, np.ndarray)):
        if len(weather) > 0 and isinstance(weather[0], dict):
            temps_c = [item.get("t_air", item.get("t_out", 0.0)) for item in weather]
        else:
            temps_c = list(weather)
    elif isinstance(weather, dict):
        if "t_air" in weather:
            temps_c = weather["t_air"]
        elif "hourly" in weather:
            temps_c = weather["hourly"]
        else:
            raise ValueError("Weather dict must contain 't_air' or 'hourly'")
    elif hasattr(weather, "t_air"):
        temps_c = weather.t_air
    else:
        raise TypeError(f"Unsupported weather format: {type(weather)}")

    return np.array(temps_c, dtype=np.float64) + 273.15


def run_single(
    design: Design,
    weather: Any,
    opts: Optional[Dict[str, Any]] = None,
    materials_db: Optional[Any] = None,
) -> Dict[str, Any]:
    """Simulate thermal response for a single shelter design over weather time series.

    Phase V2: Multi-layer discretisation with Fourier sizing.
    Conduction only (no solar, no infiltration, no sky radiation, no multi-day spinup).

    Args:
        design: Shelter design specification
        weather: Hourly weather dataset or temperature list [Celsius]
        opts: Optional simulation controls (timestep_s, initial_temp_c)
        materials_db: Materials lookup provider or dict. If None, imports
            engine.materials and surfaces ImportError if missing (Rule R1).

    Returns:
        Dictionary containing hourly simulation series:
            - 'hour': int
            - 't_out_c': float
            - 't_in_c': float
            - 'delta_ambient': float

    Raises:
        ImportError: If materials_db is not provided and engine.materials is missing
        SolverDivergedError: If numerical divergence or non-physical temperature occurs
    """
    if materials_db is None:
        try:
            from engine import materials as mats
            materials_db = mats
        except ImportError as err:
            raise ImportError(
                "engine.materials (Aman's module) is not available. "
                "Per Rule R1, material values cannot be inlined."
            ) from err

    opts = opts or {}
    dt: float = float(opts.get("timestep_s", DT_INTERNAL_S))
    fo_target: float = float(opts.get("fo_target", FO_TARGET))

    # Parse hourly outdoor temperatures in Kelvin
    t_out_hourly_k = _extract_hourly_temperatures_k(weather)
    n_hours = len(t_out_hourly_k)
    if n_hours == 0:
        raise ValueError("Weather time series cannot be empty")

    # Geometry & Air Capacitance
    volume_m3 = design.length_m * design.width_m * design.height_m
    c_air = C_AIR_VOLUMETRIC * volume_m3

    # Discretise envelope surfaces into multi-node RC networks
    surfaces_dict = build_nodes(
        design=design,
        materials_db=materials_db,
        dt_s=dt,
        fo_target=fo_target,
    )
    active_surfaces: List[DiscretisedSurface] = [s for s in surfaces_dict.values() if len(s.nodes) > 0]

    # Process glazed openings (pure resistance, zero capacitance - Rule T-2)
    # Night shutter: U_effective = 1 / (1/U_glass + R_shutter)
    glazing_list: List[Tuple[float, float, bool, float]] = []  # (u_val, area_m2, has_shutter, r_shutter)
    for op in design.openings:
        if hasattr(materials_db, "get"):
            mat_prop = materials_db.get(op.glazing_id)
            u_val = getattr(mat_prop, "u_value", 2.8)
            r_shutter = getattr(mat_prop, "r_shutter", 0.5)
        elif isinstance(materials_db, dict):
            mat_prop = materials_db[op.glazing_id]
            u_val = mat_prop.u_value if hasattr(mat_prop, "u_value") else mat_prop.get("u_value", 2.8)
            r_shutter = getattr(mat_prop, "r_shutter", 0.5) if hasattr(mat_prop, "r_shutter") else mat_prop.get("r_shutter", 0.5)
        else:
            raise TypeError("Unsupported materials_db type")

        glazing_list.append((u_val, op.area_m2, op.night_shutter, r_shutter))

    # Initial temperatures in Kelvin
    if "initial_temp_c" in opts:
        t_in = float(opts["initial_temp_c"]) + 273.15
    else:
        t_in = t_out_hourly_k[0]

    # Initialize node temperatures for each surface
    # surface_node_temps[s_idx] is a numpy array of node temperatures for surface s
    surface_node_temps: List[np.ndarray] = [
        np.full(len(s.nodes), t_in, dtype=np.float64) for s in active_surfaces
    ]

    hourly_results = []
    substeps_per_hour = int(round(3600.0 / dt))

    # Time integration loop (Explicit Forward Euler)
    global_step = 0
    for hour_idx in range(n_hours):
        t_out = t_out_hourly_k[hour_idx]

        # Night shutter status: closed during nighttime (approx. 18:00 to 06:00, or night flag)
        is_night = (hour_idx < 6 or hour_idx >= 18)
        k_glazing_hour = 0.0
        for u_val, area, has_shutter, r_shutter in glazing_list:
            if has_shutter and is_night and r_shutter > 0.0:
                u_eff = 1.0 / ((1.0 / u_val) + r_shutter)
            else:
                u_eff = u_val
            k_glazing_hour += u_eff * area

        for _ in range(substeps_per_hour):
            global_step += 1

            if np.isnan(t_in) or np.isinf(t_in) or t_in < 50.0 or t_in > 500.0:
                raise SolverDivergedError(
                    f"Indoor air node diverged at step {global_step} (T={t_in:.1f}K). "
                    f"Check timestep vs fastest time constant."
                )

            total_q_surfaces_to_air = 0.0

            # Update each multi-node surface
            for s_idx, surf in enumerate(active_surfaces):
                t_nodes = surface_node_temps[s_idx]
                n_nodes = len(t_nodes)
                c_nodes = [node.C for node in surf.nodes]
                dt_nodes = np.zeros(n_nodes, dtype=np.float64)

                # Node 0 (outermost): connected to outdoor air via K_ext
                # and to Node 1 via K_inter[0] (if n_nodes > 1)
                q_from_ext = surf.K_ext * (t_out - t_nodes[0])
                if n_nodes == 1:
                    # Single-node surface: connected to outside and inside
                    q_from_int = surf.K_int * (t_in - t_nodes[0])
                    dt_nodes[0] = (q_from_ext + q_from_int) / c_nodes[0]
                    total_q_surfaces_to_air += surf.K_int * (t_nodes[0] - t_in)
                else:
                    q_to_next = surf.K_inter[0] * (t_nodes[1] - t_nodes[0])
                    dt_nodes[0] = (q_from_ext + q_to_next) / c_nodes[0]

                    # Internal nodes: 1 to n_nodes - 2
                    for j in range(1, n_nodes - 1):
                        q_from_prev = surf.K_inter[j - 1] * (t_nodes[j - 1] - t_nodes[j])
                        q_to_next = surf.K_inter[j] * (t_nodes[j + 1] - t_nodes[j])
                        dt_nodes[j] = (q_from_prev + q_to_next) / c_nodes[j]

                    # Innermost node (n_nodes - 1): connected to previous and indoor air via K_int
                    last_idx = n_nodes - 1
                    q_from_prev = surf.K_inter[last_idx - 1] * (t_nodes[last_idx - 1] - t_nodes[last_idx])
                    q_from_in = surf.K_int * (t_in - t_nodes[last_idx])
                    dt_nodes[last_idx] = (q_from_prev + q_from_in) / c_nodes[last_idx]

                    # Heat flow entering indoor air from surface innermost node
                    total_q_surfaces_to_air += surf.K_int * (t_nodes[last_idx] - t_in)

                # Advance surface nodes
                t_nodes += dt * dt_nodes

                # Check divergence on surface nodes
                if np.isnan(t_nodes[0]) or np.isinf(t_nodes[0]) or t_nodes[0] < 50.0 or t_nodes[0] > 500.0:
                    node_obj = surf.nodes[0]
                    raise SolverDivergedError(
                        f"Surface '{surf.name}' node 0 diverged at step {global_step} (T={t_nodes[0]:.1f}K). "
                        f"dx={node_obj.dx_m:.4f}m, material={node_obj.material_id}."
                    )

            # Glazing heat flow entering air (pure resistance, zero capacitance)
            q_glazing_to_air = k_glazing_hour * (t_out - t_in)

            # Air node update
            dt_in = (total_q_surfaces_to_air + q_glazing_to_air) / c_air
            t_in += dt * dt_in

        # Hourly output recording
        t_out_c = float(t_out - 273.15)
        t_in_c = float(t_in - 273.15)
        hourly_results.append({
            "hour": hour_idx,
            "t_out_c": round(t_out_c, 3),
            "t_in_c": round(t_in_c, 3),
            "delta_ambient": round(t_in_c - t_out_c, 3),
        })

    return {
        "series": hourly_results,
        "t_in_c": [r["t_in_c"] for r in hourly_results],
        "t_out_c": [r["t_out_c"] for r in hourly_results],
        "node_counts": {s.name: len(s.nodes) for s in active_surfaces},
    }


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
