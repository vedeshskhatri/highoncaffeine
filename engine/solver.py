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

from engine.constants import DT_INTERNAL_S
from engine.types import Design, Layer, NodeArray, Opening


# --- Custom Domain Exceptions (brain/09_ERROR_HANDLING.md) ---

class ThermaError(Exception):
    """Base exception for all THERMA errors."""
    pass


class SolverDivergedError(ThermaError):
    """Raised when numerical solver diverges or becomes unstable."""
    pass


# --- ISO 6946 Surface Film Resistances [m^2*K/W] ---
R_SI: float = 0.13  # ISO 6946 Table 1: Internal surface film resistance
R_SE: float = 0.04  # ISO 6946 Table 1: External surface film resistance

# Standard air volumetric heat capacity [J/(m^3*K)] at sea level: rho=1.204 kg/m^3, Cp=1005 J/(kg*K)
C_AIR_VOLUMETRIC: float = 1210.0


def _extract_hourly_temperatures_k(weather: Any) -> np.ndarray:
    """Extract hourly outdoor temperature series in KELVIN from weather input.

    Accepts:
    - Sequence of floats (assumed Celsius, converted to Kelvin)
    - Dict with 't_air' or 'hourly' list
    - Object with 't_air' attribute
    """
    if isinstance(weather, (list, tuple, np.ndarray)):
        if len(weather) > 0 and isinstance(weather[0], dict):
            # list of dicts [{'t_air': -20.0}, ...]
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

    # Convert Celsius to Kelvin
    temps_k = np.array(temps_c, dtype=np.float64) + 273.15
    return temps_k


def run_single(
    design: Design,
    weather: Any,
    opts: Optional[Dict[str, Any]] = None,
    materials_db: Optional[Any] = None,
) -> Dict[str, Any]:
    """Simulate thermal response for a single shelter design over weather time series.

    Phase V1: Single node per surface. Conduction only.
    No solar radiation, no infiltration, no sky radiation, no multi-day spin-up.

    Args:
        design: Shelter design specification
        weather: Hourly weather dataset or temperature list [Celsius]
        opts: Optional simulation controls (e.g. timestep_s, initial_temp_c)
        materials_db: Optional materials lookup module or dict. If None,
            imports `engine.materials` (Aman's module). If `engine.materials`
            does not exist, lets ImportError surface per Rule R1.

    Returns:
        Dictionary containing hourly series:
            - 'hour': int
            - 't_out_c': float
            - 't_in_c': float
            - 'delta_ambient': float

    Raises:
        ImportError: If materials_db is not provided and engine.materials is missing
        SolverDivergedError: If numerical divergence or non-physical temperature occurs
    """
    # Rule R1 / Phase V1 requirement: Resolve materials from engine.materials
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

    # Parse hourly outdoor temperatures in Kelvin
    t_out_hourly_k = _extract_hourly_temperatures_k(weather)
    n_hours = len(t_out_hourly_k)
    if n_hours == 0:
        raise ValueError("Weather time series cannot be empty")

    # Geometry & Dimensions
    length_m = design.length_m
    width_m = design.width_m
    height_m = design.height_m
    volume_m3 = length_m * width_m * height_m

    # Indoor air capacitance [J/K]
    c_air = C_AIR_VOLUMETRIC * volume_m3

    # Define 6 surfaces: North, East, South, West, Roof, Floor
    # Orientation: length along East-West, width along North-South
    surface_defs = [
        ("north_wall", design.walls, length_m * height_m),
        ("south_wall", design.walls, length_m * height_m),
        ("east_wall", design.walls, width_m * height_m),
        ("west_wall", design.walls, width_m * height_m),
        ("roof", design.roof, length_m * width_m),
        ("floor", design.floor, length_m * width_m),
    ]

    # Deduct glazed openings area from corresponding wall surfaces
    surface_areas: Dict[str, float] = {}
    for name, _, gross_area in surface_defs:
        surface_areas[name] = gross_area

    glazing_conductances: List[Tuple[float, float]] = []  # (U_value, area_m2)
    for op in design.openings:
        facing_wall = f"{op.facing}_wall" if not op.facing.endswith("wall") and op.facing != "roof" else op.facing
        if facing_wall in surface_areas:
            surface_areas[facing_wall] = max(0.0, surface_areas[facing_wall] - op.area_m2)

        # Lookup glazing U-value from materials
        if hasattr(materials_db, "get"):
            mat_prop = materials_db.get(op.glazing_id)
            u_val = getattr(mat_prop, "u_value", 2.8)
        elif isinstance(materials_db, dict):
            mat_prop = materials_db[op.glazing_id]
            u_val = mat_prop.u_value if hasattr(mat_prop, "u_value") else mat_prop["u_value"]
        else:
            raise TypeError("Unsupported materials_db type")
        glazing_conductances.append((u_val, op.area_m2))

    # Precalculate properties for each surface (Single-node representation)
    # Surface node sits in the center of the thermal resistance
    surface_nodes = []
    for name, layers, area_m2 in surface_defs:
        net_area = surface_areas[name]
        if net_area <= 0.0 or len(layers) == 0:
            continue

        # Aggregate layer resistance and capacitance
        # For single-node: sum layer resistances and capacities
        total_r_material = 0.0
        total_c = 0.0
        for lay in layers:
            if hasattr(materials_db, "get"):
                m = materials_db.get(lay.material_id)
                k = getattr(m, "k")
                rho = getattr(m, "rho")
                cp = getattr(m, "cp")
            elif isinstance(materials_db, dict):
                m = materials_db[lay.material_id]
                k = m.k if hasattr(m, "k") else m["k"]
                rho = m.rho if hasattr(m, "rho") else m["rho"]
                cp = m.cp if hasattr(m, "cp") else m["cp"]
            else:
                raise TypeError("Unsupported materials_db type")

            d = lay.thickness_m
            total_r_material += d / (k * net_area)
            total_c += rho * cp * d * net_area

        # Conductance from indoor air to surface center node:
        # R_in = R_si / net_area + (total_r_material / 2)
        r_in = (R_SI / net_area) + (total_r_material / 2.0)
        k_in = 1.0 / r_in  # [W/K]

        # Conductance from surface center node to outdoor air:
        # R_out = R_se / net_area + (total_r_material / 2)
        r_out = (R_SE / net_area) + (total_r_material / 2.0)
        k_out = 1.0 / r_out  # [W/K]

        surface_nodes.append({
            "name": name,
            "C": total_c,
            "K_in": k_in,
            "K_out": k_out,
            "material": layers[0].material_id,
            "thickness_m": sum(l.thickness_m for l in layers),
        })

    # Direct glazing conductance (pure resistance, zero capacitance, Rule T-2)
    k_glazing_total = sum(u_val * a for u_val, a in glazing_conductances)

    # Initial temperatures in Kelvin
    # If initial_temp_c provided, use it; otherwise start at initial outdoor temperature
    if "initial_temp_c" in opts:
        t_in = float(opts["initial_temp_c"]) + 273.15
    else:
        t_in = t_out_hourly_k[0]

    # Initialize all surface nodes to t_in
    t_surfaces = np.full(len(surface_nodes), t_in, dtype=np.float64)

    # Output storage
    hourly_results = []
    substeps_per_hour = int(round(3600.0 / dt))

    # Time integration loop (Explicit Forward Euler)
    global_step = 0
    for hour_idx in range(n_hours):
        t_out = t_out_hourly_k[hour_idx]

        for _ in range(substeps_per_hour):
            global_step += 1

            # Divergence check on indoor temperature
            if np.isnan(t_in) or np.isinf(t_in) or t_in < 50.0 or t_in > 500.0:
                raise SolverDivergedError(
                    f"Indoor air node diverged at step {global_step} (T={t_in:.1f}K). "
                    f"Check timestep vs fastest time constant."
                )

            # 1. Update each surface node
            # Q entering surface node from inside: K_in * (t_in - t_s)
            # Q entering surface node from outside: K_out * (t_out - t_s)
            dt_surfaces = np.zeros_like(t_surfaces)
            q_from_surfaces_to_air = 0.0

            for i, sn in enumerate(surface_nodes):
                t_s = t_surfaces[i]

                # Divergence check on surface node
                if np.isnan(t_s) or np.isinf(t_s) or t_s < 50.0 or t_s > 500.0:
                    dx = sn["thickness_m"]
                    raise SolverDivergedError(
                        f"Node {i} ({sn['name']}) diverged at step {global_step} (T={t_s:.1f}K). "
                        f"dx={dx:.4f}m, material={sn['material']}. "
                        f"Check timestep vs fastest time constant."
                    )

                q_in_to_s = sn["K_in"] * (t_in - t_s)
                q_out_to_s = sn["K_out"] * (t_out - t_s)

                dt_surfaces[i] = (q_in_to_s + q_out_to_s) / sn["C"]
                # Heat entering air from surface s:
                q_from_surfaces_to_air += sn["K_in"] * (t_s - t_in)

            # 2. Glazing heat transfer (zero capacitance): Q entering air from glazing:
            q_from_glazing_to_air = k_glazing_total * (t_out - t_in)

            # 3. Indoor air temperature derivative:
            # C_air * dT_in/dt = sum(K_in * (T_s - T_in)) + K_glazing * (T_out - T_in)
            dt_in = (q_from_surfaces_to_air + q_from_glazing_to_air) / c_air

            # Explicit forward Euler update
            t_surfaces += dt * dt_surfaces
            t_in += dt * dt_in

        # Hourly recording (convert back to Celsius at boundary)
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
