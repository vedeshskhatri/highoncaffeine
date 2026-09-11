"""Transient RC thermal network solver.

Owner: Vedesh
Governing equation: EN ISO 52016-1 / multi-node dynamic RC network.
All internal computations in KELVIN. Conversion to Celsius occurs only at the API boundary.

Surface film resistances cited from ISO 6946:
- R_si = 0.13 m^2*K/W (internal surface film resistance, horizontal heat flow)
- R_se = 0.04 m^2*K/W (external surface film resistance)
"""

import math
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


# Specific heat of air [J/(kg*K)]
CP_AIR: float = 1005.0


def _parse_weather_input(weather: Any, n_expected_hours: Optional[int] = None) -> Dict[str, np.ndarray]:
    """Parse weather input into aligned hourly arrays.

    Returns dict with keys:
        't_out_k': float64 array [K]
        'dni': float64 array [W/m^2]
        'dhi': float64 array [W/m^2]
        'ghi': float64 array [W/m^2]
    """
    if isinstance(weather, (list, tuple, np.ndarray)):
        if len(weather) > 0 and isinstance(weather[0], dict):
            t_c = [float(item.get("t_air", item.get("t_out", 0.0))) for item in weather]
            dni = [float(item.get("dni", 0.0)) for item in weather]
            dhi = [float(item.get("dhi", 0.0)) for item in weather]
            ghi = [float(item.get("ghi", 0.0)) for item in weather]
        else:
            t_c = [float(x) for x in weather]
            dni = [0.0] * len(t_c)
            dhi = [0.0] * len(t_c)
            ghi = [0.0] * len(t_c)
    elif isinstance(weather, dict):
        if "t_air" in weather:
            t_c = [float(x) for x in weather["t_air"]]
        elif "hourly" in weather:
            t_c = [float(x) for x in weather["hourly"]]
        else:
            raise ValueError("Weather dict must contain 't_air' or 'hourly'")
        n = len(t_c)
        dni = [float(x) for x in weather.get("dni", [0.0] * n)]
        dhi = [float(x) for x in weather.get("dhi", [0.0] * n)]
        ghi = [float(x) for x in weather.get("ghi", [0.0] * n)]
    else:
        raise TypeError(f"Unsupported weather format: {type(weather)}")

    t_k = np.array(t_c, dtype=np.float64) + 273.15
    return {
        "t_out_k": t_k,
        "dni": np.array(dni, dtype=np.float64),
        "dhi": np.array(dhi, dtype=np.float64),
        "ghi": np.array(ghi, dtype=np.float64),
    }


def run_single(
    design: Design,
    weather: Any,
    opts: Optional[Dict[str, Any]] = None,
    materials_db: Optional[Any] = None,
    physics_constants_db: Optional[Any] = None,
) -> Dict[str, Any]:
    """Simulate thermal response for a single shelter design over weather time series.

    Phase V3: Conduction, Solar Gains, Infiltration (altitude-corrected), Internal Gains,
    and detailed Heat Loss breakdown by path.

    Args:
        design: Shelter design specification
        weather: Hourly weather dataset or temperature list [Celsius]
        opts: Optional simulation controls:
            - timestep_s: float
            - initial_temp_c: float
            - altitude_m: float (default 3500.0)
            - lat: float (default 34.1526)
            - lon: float (default 77.5771)
            - date: str (default '2026-01-15')
            - timezone: float (default 5.5 for IST)
            - snow_cover: bool (default True)
            - occupancy: dict with 'people' and 'watts_per_person'
        materials_db: Materials lookup provider or dict. If None, imports
            engine.materials and surfaces ImportError if missing (Rule R1).
        physics_constants_db: Physics constants provider. If None, imports
            engine.physics_constants and surfaces ImportError if missing (Rule R1).

    Returns:
        Dictionary containing:
            - 'series': list of hourly records
            - 't_in_c': hourly indoor temperatures [C]
            - 't_out_c': hourly outdoor temperatures [C]
            - 'summary': dictionary matching 07_API_CONTRACT.md including heat_loss_kwh
    """
    # Rule R1: Materials resolution
    if materials_db is None:
        try:
            from engine import materials as mats
            materials_db = mats
        except ImportError as err:
            raise ImportError(
                "engine.materials (Aman's module) is not available. "
                "Per Rule R1, material values cannot be inlined."
            ) from err

    # Rule R1: Physics constants resolution
    if physics_constants_db is None:
        try:
            from engine import physics_constants as pconst
            physics_constants_db = pconst
        except ImportError as err:
            raise ImportError(
                "engine.physics_constants (Aman's module) is not available. "
                "Per Rule R1, solar position and air density algorithms cannot be inlined."
            ) from err

    opts = opts or {}
    dt: float = float(opts.get("timestep_s", DT_INTERNAL_S))
    fo_target: float = float(opts.get("fo_target", FO_TARGET))
    altitude_m: float = float(opts.get("altitude_m", 3500.0))
    lat: float = float(opts.get("lat", 34.1526))
    lon: float = float(opts.get("lon", 77.5771))
    date_str: str = str(opts.get("date", "2026-01-15"))
    tz: float = float(opts.get("timezone", 5.5))
    snow_cover: bool = bool(opts.get("snow_cover", True))

    occupancy = opts.get("occupancy", {})
    n_people = float(occupancy.get("people", 0))
    watts_per_person = float(occupancy.get("watts_per_person", 100.0))
    q_internal_w = n_people * watts_per_person

    # Ground albedo via Aman's function
    rho_ground = physics_constants_db.ground_albedo(snow_cover)

    # Weather arrays
    w_data = _parse_weather_input(weather)
    t_out_hourly_k = w_data["t_out_k"]
    dni_hourly = w_data["dni"]
    dhi_hourly = w_data["dhi"]
    ghi_hourly = w_data["ghi"]
    n_hours = len(t_out_hourly_k)

    # Geometry & Air Capacitance
    volume_m3 = design.length_m * design.width_m * design.height_m

    # Discretise envelope surfaces
    surfaces_dict = build_nodes(
        design=design,
        materials_db=materials_db,
        dt_s=dt,
        fo_target=fo_target,
    )
    active_surfaces: List[DiscretisedSurface] = [s for s in surfaces_dict.values() if len(s.nodes) > 0]

    # Surface orientations and tilts:
    # beta: surface tilt (0 = horizontal roof, 90 = vertical wall) [deg]
    # gamma: surface azimuth (0 = North, 90 = East, 180 = South, 270 = West) [deg]
    surface_orientations: Dict[str, Tuple[float, float]] = {
        "north_wall": (90.0, 0.0),
        "east_wall": (90.0, 90.0),
        "south_wall": (90.0, 180.0),
        "west_wall": (90.0, 270.0),
        "roof": (0.0, 0.0),
        "floor": (180.0, 0.0),
    }

    # Openings / Glazing setup
    glazing_info: List[Dict[str, Any]] = []
    for op in design.openings:
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
            raise TypeError("Unsupported materials_db type")

        # Determine tilt and azimuth for opening
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

        glazing_info.append({
            "area_m2": op.area_m2,
            "u_value": u_val,
            "g_value": g_val,
            "has_shutter": op.night_shutter,
            "r_shutter": r_shutter,
            "beta": beta_g,
            "gamma": gamma_g,
        })

    # Surface solar absorptivities (from outer layer material)
    surface_absorptivities: Dict[str, float] = {}
    for s in active_surfaces:
        outer_mat_id = s.nodes[0].material_id
        if hasattr(materials_db, "get"):
            m = materials_db.get(outer_mat_id)
            alpha_abs = getattr(m, "absorptivity", 0.70)
        elif isinstance(materials_db, dict):
            m = materials_db[outer_mat_id]
            alpha_abs = m.absorptivity if hasattr(m, "absorptivity") else m.get("absorptivity", 0.70)
        else:
            alpha_abs = 0.70
        surface_absorptivities[s.name] = alpha_abs

    # Initial indoor and surface temperatures
    if "initial_temp_c" in opts:
        t_in = float(opts["initial_temp_c"]) + 273.15
    else:
        t_in = t_out_hourly_k[0]

    surface_node_temps: List[np.ndarray] = [
        np.full(len(s.nodes), t_in, dtype=np.float64) for s in active_surfaces
    ]

    # Cumulative energy accounting (in Joules, converted to kWh at the end)
    loss_joules_walls = 0.0
    loss_joules_roof = 0.0
    loss_joules_glazing = 0.0
    loss_joules_inf = 0.0
    total_solar_gain_joules = 0.0

    hourly_results = []
    substeps_per_hour = int(round(3600.0 / dt))
    global_step = 0

    # Main Simulation Loop
    for hour_idx in range(n_hours):
        t_out = t_out_hourly_k[hour_idx]
        dni = dni_hourly[hour_idx]
        dhi = dhi_hourly[hour_idx]
        ghi = ghi_hourly[hour_idx]

        # 1. Altitude-corrected air density & indoor air capacitance
        rho_air = physics_constants_db.air_density(altitude_m, t_out)
        c_air = rho_air * CP_AIR * volume_m3

        # Infiltration conductance: ACH * V * rho * Cp / 3600 [W/K]
        ach = design.ach
        k_inf = (ach * volume_m3 * rho_air * CP_AIR) / 3600.0

        # 2. Solar position at current hour
        alpha_s, gamma_s = physics_constants_db.solar_position(lat, lon, date_str, hour_idx, tz)

        # 3. Solar incident radiation on each opaque surface
        surface_i_total: Dict[str, float] = {}
        for s in active_surfaces:
            beta, gamma_surf = surface_orientations.get(s.name, (90.0, 180.0))
            if s.name == "floor":
                surface_i_total[s.name] = 0.0
                continue

            cos_theta = physics_constants_db.incidence_cosine(alpha_s, beta, gamma_s, gamma_surf)
            # Section 4.3 Total incident irradiance
            i_beam = dni * cos_theta
            i_diff = dhi * (1.0 + math.cos(math.radians(beta))) / 2.0
            i_ground = ghi * rho_ground * (1.0 - math.cos(math.radians(beta))) / 2.0
            surface_i_total[s.name] = max(0.0, i_beam + i_diff + i_ground)

        # 4. Solar incident radiation and direct gains on glazed openings
        q_solar_glazing_hour = 0.0
        is_night = (hour_idx < 6 or hour_idx >= 18)
        k_glazing_hour = 0.0

        for g in glazing_info:
            cos_th_g = physics_constants_db.incidence_cosine(alpha_s, g["beta"], gamma_s, g["gamma"])
            i_beam_g = dni * cos_th_g
            i_diff_g = dhi * (1.0 + math.cos(math.radians(g["beta"]))) / 2.0
            i_ground_g = ghi * rho_ground * (1.0 - math.cos(math.radians(g["beta"]))) / 2.0
            i_tot_g = max(0.0, i_beam_g + i_diff_g + i_ground_g)

            # Direct solar heat gain into indoor air node
            q_solar_glazing_hour += i_tot_g * g["area_m2"] * g["g_value"]

            # Glazing conduction (effective U with night shutter)
            if g["has_shutter"] and is_night and g["r_shutter"] > 0.0:
                u_eff = 1.0 / ((1.0 / g["u_value"]) + g["r_shutter"])
            else:
                u_eff = g["u_value"]
            k_glazing_hour += u_eff * g["area_m2"]

        # Substep Euler integration
        for _ in range(substeps_per_hour):
            global_step += 1

            if np.isnan(t_in) or np.isinf(t_in) or t_in < 50.0 or t_in > 500.0:
                raise SolverDivergedError(
                    f"Indoor air node diverged at step {global_step} (T={t_in:.1f}K)."
                )

            total_q_surfaces_to_air = 0.0

            # Update multi-node surfaces
            for s_idx, surf in enumerate(active_surfaces):
                t_nodes = surface_node_temps[s_idx]
                n_nodes = len(t_nodes)
                c_nodes = [node.C for node in surf.nodes]
                dt_nodes = np.zeros(n_nodes, dtype=np.float64)

                # Solar absorbed on outer node (Node 0)
                alpha_abs = surface_absorptivities.get(surf.name, 0.70)
                q_solar_abs_outer = surface_i_total[surf.name] * surf.net_area_m2 * alpha_abs

                # Node 0 (outer node):
                q_from_ext = surf.K_ext * (t_out - t_nodes[0])
                if n_nodes == 1:
                    q_from_int = surf.K_int * (t_in - t_nodes[0])
                    dt_nodes[0] = (q_from_ext + q_solar_abs_outer + q_from_int) / c_nodes[0]
                    total_q_surfaces_to_air += surf.K_int * (t_nodes[0] - t_in)
                else:
                    q_to_next = surf.K_inter[0] * (t_nodes[1] - t_nodes[0])
                    dt_nodes[0] = (q_from_ext + q_solar_abs_outer + q_to_next) / c_nodes[0]

                    for j in range(1, n_nodes - 1):
                        q_from_prev = surf.K_inter[j - 1] * (t_nodes[j - 1] - t_nodes[j])
                        q_to_next = surf.K_inter[j] * (t_nodes[j + 1] - t_nodes[j])
                        dt_nodes[j] = (q_from_prev + q_to_next) / c_nodes[j]

                    last_idx = n_nodes - 1
                    q_from_prev = surf.K_inter[last_idx - 1] * (t_nodes[last_idx - 1] - t_nodes[last_idx])
                    q_from_in = surf.K_int * (t_in - t_nodes[last_idx])
                    dt_nodes[last_idx] = (q_from_prev + q_from_in) / c_nodes[last_idx]
                    total_q_surfaces_to_air += surf.K_int * (t_nodes[last_idx] - t_in)

                t_nodes += dt * dt_nodes

                # Track conduction losses through surfaces to exterior
                q_loss_surface_w = surf.K_ext * max(0.0, t_nodes[0] - t_out)
                if "wall" in surf.name:
                    loss_joules_walls += q_loss_surface_w * dt
                elif surf.name == "roof":
                    loss_joules_roof += q_loss_surface_w * dt

            # Glazing and Infiltration heat flows entering air
            q_glazing_to_air = k_glazing_hour * (t_out - t_in)
            q_inf_to_air = k_inf * (t_out - t_in)

            # Track glazing and infiltration losses (when indoor > outdoor)
            loss_joules_glazing += max(0.0, k_glazing_hour * (t_in - t_out)) * dt
            loss_joules_inf += max(0.0, k_inf * (t_in - t_out)) * dt
            total_solar_gain_joules += q_solar_glazing_hour * dt

            # Update indoor air node:
            # C_air * dT/dt = Q_solar + Q_internal + Q_surfaces + Q_glazing + Q_inf
            q_total_air = (
                total_q_surfaces_to_air
                + q_glazing_to_air
                + q_inf_to_air
                + q_solar_glazing_hour
                + q_internal_w
            )
            t_in += dt * (q_total_air / c_air)

        # Hourly recording
        t_out_c = float(t_out - 273.15)
        t_in_c = float(t_in - 273.15)
        hourly_results.append({
            "hour": hour_idx,
            "t_out_c": round(t_out_c, 3),
            "t_in_c": round(t_in_c, 3),
            "delta_ambient": round(t_in_c - t_out_c, 3),
        })

    # Summary calculations in kWh
    j_to_kwh = 1.0 / 3.6e6
    loss_kwh_walls = round(loss_joules_walls * j_to_kwh, 3)
    loss_kwh_roof = round(loss_joules_roof * j_to_kwh, 3)
    loss_kwh_glazing = round(loss_joules_glazing * j_to_kwh, 3)
    loss_kwh_inf = round(loss_joules_inf * j_to_kwh, 3)
    solar_kwh = round(total_solar_gain_joules * j_to_kwh, 3)

    return {
        "series": hourly_results,
        "t_in_c": [r["t_in_c"] for r in hourly_results],
        "t_out_c": [r["t_out_c"] for r in hourly_results],
        "summary": {
            "solar_gain_kwh": solar_kwh,
            "heat_loss_kwh": {
                "walls": loss_kwh_walls,
                "roof": loss_kwh_roof,
                "glazing": loss_kwh_glazing,
                "infiltration": loss_kwh_inf,
                "sky_radiation": 0.0,
            },
            "total_heat_loss_kwh": round(loss_kwh_walls + loss_kwh_roof + loss_kwh_glazing + loss_kwh_inf, 3),
        },
    }


def run_batch(packed: NodeArray, weather: Any, opts: Optional[Dict[str, Any]] = None) -> Any:
    """Simulate batch of N designs simultaneously as vectorized matrix columns."""
    raise NotImplementedError("PHASE V5 — not yet implemented")
