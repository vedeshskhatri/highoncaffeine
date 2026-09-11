"""Transient RC thermal network solver.

Owner: Vedesh
Governing equation: EN ISO 52016-1 / multi-node dynamic RC network.
All internal computations in KELVIN. Conversion to Celsius occurs only at the API boundary.

Surface film resistances cited from ISO 6946:
- R_si = 0.13 m^2*K/W (internal surface film resistance, horizontal heat flow)
- R_se = 0.04 m^2*K/W (external surface film resistance)

Radiation constants cited from 05_DATA_SOURCES.md Section 7:
- Stefan-Boltzmann sigma = 5.670374419e-8 W/(m^2*K^4)
- Swinbank clear-sky temperature: T_sky = 0.0552 * T_air^1.5 (both Kelvin)
"""

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
import numpy as np

from engine.constants import DT_INTERNAL_S, FO_TARGET, SPINUP_DAYS
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

# Stefan-Boltzmann constant [W/(m^2*K^4)] (CODATA 2018 / 05_DATA_SOURCES.md Section 7)
SIGMA_SB: float = 5.670374419e-8


def _parse_weather_input(weather: Any) -> Dict[str, np.ndarray]:
    """Parse weather input into aligned hourly arrays.

    Returns dict with keys:
        't_out_k': float64 array [K]
        'dni': float64 array [W/m^2]
        'dhi': float64 array [W/m^2]
        'ghi': float64 array [W/m^2]
        'cloud_fraction': float64 array [0.0 - 1.0]
    """
    if isinstance(weather, (list, tuple, np.ndarray)):
        if len(weather) > 0 and isinstance(weather[0], dict):
            t_c = [float(item.get("t_air", item.get("t_out", 0.0))) for item in weather]
            dni = [float(item.get("dni", 0.0)) for item in weather]
            dhi = [float(item.get("dhi", 0.0)) for item in weather]
            ghi = [float(item.get("ghi", 0.0)) for item in weather]
            cloud = [float(item.get("cloud_cover", item.get("cloud_fraction", 0.0))) for item in weather]
        else:
            t_c = [float(x) for x in weather]
            dni = [0.0] * len(t_c)
            dhi = [0.0] * len(t_c)
            ghi = [0.0] * len(t_c)
            cloud = [0.0] * len(t_c)
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
        cloud = [float(x) for x in weather.get("cloud_cover", weather.get("cloud_fraction", [0.0] * n))]
    else:
        raise TypeError(f"Unsupported weather format: {type(weather)}")

    # CONVERSION AT BOUNDARY: Celsius to Kelvin
    t_k = np.array(t_c, dtype=np.float64) + 273.15
    return {
        "t_out_k": t_k,
        "dni": np.array(dni, dtype=np.float64),
        "dhi": np.array(dhi, dtype=np.float64),
        "ghi": np.array(ghi, dtype=np.float64),
        "cloud_fraction": np.array(cloud, dtype=np.float64),
    }


def calculate_sky_temperature_k(t_air_k: float, cloud_fraction: float = 0.0) -> float:
    """Calculate effective longwave sky temperature in KELVIN per Swinbank formulation.

    06_PHYSICS_SPEC.md Section 5.1:
        T_sky = 0.0552 * T_air^1.5 (both in KELVIN)
        T_sky_cloudy = T_sky * (1 - 0.84*c) + 0.84*c*T_air

    Args:
        t_air_k: Ambient dry-bulb air temperature [K] (must be strictly in Kelvin)
        cloud_fraction: Fraction of cloud cover [0.0 - 1.0]

    Returns:
        Sky temperature in KELVIN [K]
    """
    if t_air_k <= 0.0:
        raise ValueError("t_air_k must be strictly positive in Kelvin")
    t_sky_clear = 0.0552 * (t_air_k ** 1.5)
    c = max(0.0, min(1.0, float(cloud_fraction)))
    t_sky = t_sky_clear * (1.0 - 0.84 * c) + 0.84 * c * t_air_k
    return t_sky


def calculate_hr_linearised(eps: float, t_surf_k: float, t_sky_k: float) -> float:
    """Calculate linearised longwave radiative heat transfer coefficient h_r [W/(m^2*K)].

    06_PHYSICS_SPEC.md Section 5.2:
        h_r = eps * sigma * (T_s^2 + T_sky^2) * (T_s + T_sky)

    CRITICAL RULE: All temperatures MUST be in KELVIN.
    """
    if t_surf_k <= 0.0 or t_sky_k <= 0.0:
        raise ValueError("Temperatures in h_r must be strictly positive in Kelvin")
    return eps * SIGMA_SB * (t_surf_k ** 2 + t_sky_k ** 2) * (t_surf_k + t_sky_k)


def run_single(
    design: Design,
    weather: Any,
    opts: Optional[Dict[str, Any]] = None,
    materials_db: Optional[Any] = None,
    physics_constants_db: Optional[Any] = None,
) -> Dict[str, Any]:
    """Simulate thermal response for a single shelter design over weather time series.

    Phase V4: Full dynamic RC solver with multi-layer discretisation, solar gains,
    altitude-corrected infiltration, longwave sky radiative cooling, and multi-day spin-up.

    Args:
        design: Shelter design specification
        weather: Hourly weather dataset or temperature list [Celsius]
        opts: Optional simulation controls:
            - timestep_s: float (default 60.0)
            - spinup_days: int (default 3)
            - enable_sky_radiation: bool (default True)
            - altitude_m: float (default 3500.0)
            - lat: float (default 34.1526)
            - lon: float (default 77.5771)
            - date: str (default '2026-01-15')
            - timezone: float (default 5.5 for IST)
            - snow_cover: bool (default True)
            - occupancy: dict with 'people' and 'watts_per_person'
        materials_db: Materials lookup provider or dict.
        physics_constants_db: Physics constants provider.

    Returns:
        Dictionary containing hourly series and energy breakdown summary.
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
    spinup_days: int = int(opts.get("spinup_days", SPINUP_DAYS))
    enable_sky: bool = bool(opts.get("enable_sky_radiation", True))
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
    raw_t_out_k = w_data["t_out_k"]
    raw_dni = w_data["dni"]
    raw_dhi = w_data["dhi"]
    raw_ghi = w_data["ghi"]
    raw_cloud = w_data["cloud_fraction"]
    n_driving_hours = len(raw_t_out_k)

    # Geometry & Air volume
    volume_m3 = design.length_m * design.width_m * design.height_m

    # Discretise envelope surfaces
    surfaces_dict = build_nodes(
        design=design,
        materials_db=materials_db,
        dt_s=dt,
        fo_target=fo_target,
    )
    active_surfaces: List[DiscretisedSurface] = [s for s in surfaces_dict.values() if len(s.nodes) > 0]

    # Surface orientations, tilts, and sky view factors F_sky
    # 06_PHYSICS_SPEC.md Section 5.3: F_sky = 1.0 roof, 0.5 vertical wall
    surface_meta: Dict[str, Tuple[float, float, float]] = {
        # name: (tilt_beta, azimuth_gamma, F_sky)
        "north_wall": (90.0, 0.0, 0.5),
        "east_wall": (90.0, 90.0, 0.5),
        "south_wall": (90.0, 180.0, 0.5),
        "west_wall": (90.0, 270.0, 0.5),
        "roof": (0.0, 0.0, 1.0),
        "floor": (180.0, 0.0, 0.0),
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

    # Surface absorptivities and emissivities (from outer layer / design)
    surface_absorptivities: Dict[str, float] = {}
    surface_emissivities: Dict[str, float] = {}
    for s in active_surfaces:
        outer_mat_id = s.nodes[0].material_id
        if hasattr(materials_db, "get"):
            m = materials_db.get(outer_mat_id)
            alpha_abs = getattr(m, "absorptivity", 0.70)
            eps_val = getattr(m, "emissivity", 0.90)
        elif isinstance(materials_db, dict):
            m = materials_db[outer_mat_id]
            alpha_abs = m.absorptivity if hasattr(m, "absorptivity") else m.get("absorptivity", 0.70)
            eps_val = m.emissivity if hasattr(m, "emissivity") else m.get("emissivity", 0.90)
        else:
            alpha_abs = 0.70
            eps_val = 0.90

        if s.name == "roof":
            eps_val = design.roof_emissivity

        surface_absorptivities[s.name] = alpha_abs
        surface_emissivities[s.name] = eps_val

    # Spin-up setup (06_PHYSICS_SPEC.md Section 8):
    # Repeat driving weather for spinup_days, discard them, retain only final 24h
    total_days = spinup_days + 1
    t_out_sim_k = np.tile(raw_t_out_k, total_days)
    dni_sim = np.tile(raw_dni, total_days)
    dhi_sim = np.tile(raw_dhi, total_days)
    ghi_sim = np.tile(raw_ghi, total_days)
    cloud_sim = np.tile(raw_cloud, total_days)
    total_hours = len(t_out_sim_k)
    retain_start_hour = spinup_days * n_driving_hours

    # Initialisation: all nodes initialized at hour-0 ambient per Section 8
    t_in = float(t_out_sim_k[0])
    surface_node_temps: List[np.ndarray] = [
        np.full(len(s.nodes), t_in, dtype=np.float64) for s in active_surfaces
    ]

    # Cumulative energy tracking for retained evaluation period
    loss_joules_walls = 0.0
    loss_joules_roof = 0.0
    loss_joules_glazing = 0.0
    loss_joules_inf = 0.0
    loss_joules_sky = 0.0
    total_solar_gain_joules = 0.0

    hourly_results = []
    substeps_per_hour = int(round(3600.0 / dt))
    global_step = 0

    # Simulation Execution
    for sim_hour in range(total_hours):
        hour_of_day = sim_hour % n_driving_hours
        t_out = t_out_sim_k[sim_hour]
        dni = dni_sim[sim_hour]
        dhi = dhi_sim[sim_hour]
        ghi = ghi_sim[sim_hour]
        cloud_frac = cloud_sim[sim_hour]

        is_retained_period = (sim_hour >= retain_start_hour)

        # Infiltration conductance at current ambient temperature
        rho_air = physics_constants_db.air_density(altitude_m, t_out)
        c_air = rho_air * CP_AIR * volume_m3
        k_inf = (design.ach * volume_m3 * rho_air * CP_AIR) / 3600.0

        # Sky temperature in KELVIN per Swinbank / Aman function
        if hasattr(physics_constants_db, "sky_temperature_k"):
            t_sky_k = physics_constants_db.sky_temperature_k(t_out, cloud_frac)
        else:
            t_sky_k = calculate_sky_temperature_k(t_out, cloud_frac)

        # Solar position
        alpha_s, gamma_s = physics_constants_db.solar_position(lat, lon, date_str, hour_of_day, tz)

        # Solar incident radiation on opaque surfaces
        surface_i_total: Dict[str, float] = {}
        for s in active_surfaces:
            beta, gamma_surf, _ = surface_meta.get(s.name, (90.0, 180.0, 0.5))
            if s.name == "floor":
                surface_i_total[s.name] = 0.0
                continue
            cos_theta = physics_constants_db.incidence_cosine(alpha_s, beta, gamma_s, gamma_surf)
            i_beam = dni * cos_theta
            i_diff = dhi * (1.0 + math.cos(math.radians(beta))) / 2.0
            i_ground = ghi * rho_ground * (1.0 - math.cos(math.radians(beta))) / 2.0
            surface_i_total[s.name] = max(0.0, i_beam + i_diff + i_ground)

        # Glazing heat flow and direct solar gain
        is_night = (hour_of_day < 6 or hour_of_day >= 18)
        k_glazing_hour = 0.0
        q_solar_glazing_hour = 0.0

        for g in glazing_info:
            cos_th_g = physics_constants_db.incidence_cosine(alpha_s, g["beta"], gamma_s, g["gamma"])
            i_beam_g = dni * cos_th_g
            i_diff_g = dhi * (1.0 + math.cos(math.radians(g["beta"]))) / 2.0
            i_ground_g = ghi * rho_ground * (1.0 - math.cos(math.radians(g["beta"]))) / 2.0
            i_tot_g = max(0.0, i_beam_g + i_diff_g + i_ground_g)

            q_solar_glazing_hour += i_tot_g * g["area_m2"] * g["g_value"]

            if g["has_shutter"] and is_night and g["r_shutter"] > 0.0:
                u_eff = 1.0 / ((1.0 / g["u_value"]) + g["r_shutter"])
            else:
                u_eff = g["u_value"]
            k_glazing_hour += u_eff * g["area_m2"]

        # Substep integration
        for _ in range(substeps_per_hour):
            global_step += 1

            if np.isnan(t_in) or np.isinf(t_in) or t_in < 50.0 or t_in > 500.0:
                raise SolverDivergedError(
                    f"Indoor air node diverged at step {global_step} (T={t_in:.1f}K)."
                )

            total_q_surfaces_to_air = 0.0

            for s_idx, surf in enumerate(active_surfaces):
                t_nodes = surface_node_temps[s_idx]
                n_nodes = len(t_nodes)
                c_nodes = [node.C for node in surf.nodes]
                dt_nodes = np.zeros(n_nodes, dtype=np.float64)

                # Solar absorbed on outer node
                alpha_abs = surface_absorptivities.get(surf.name, 0.70)
                q_solar_abs_outer = surface_i_total[surf.name] * surf.net_area_m2 * alpha_abs

                # Sky radiation on outer node (Node 0)
                # 06_PHYSICS_SPEC.md Section 5.2: Q_sky = h_r * A * F_sky * (T_s - T_sky)
                q_sky_outer = 0.0
                if enable_sky:
                    _, _, f_sky = surface_meta.get(surf.name, (90.0, 180.0, 0.5))
                    if f_sky > 0.0:
                        eps_s = surface_emissivities.get(surf.name, 0.90)
                        t_s_outer = t_nodes[0]  # KELVIN
                        if hasattr(physics_constants_db, "radiative_coefficient"):
                            h_r = physics_constants_db.radiative_coefficient(eps_s, t_s_outer, t_sky_k)
                        else:
                            h_r = calculate_hr_linearised(eps_s, t_s_outer, t_sky_k)
                        q_sky_outer = h_r * surf.net_area_m2 * f_sky * (t_s_outer - t_sky_k)

                        if is_retained_period:
                            loss_joules_sky += max(0.0, q_sky_outer) * dt

                # Conduction from outdoor air to Node 0
                q_from_ext = surf.K_ext * (t_out - t_nodes[0])

                if n_nodes == 1:
                    q_from_int = surf.K_int * (t_in - t_nodes[0])
                    dt_nodes[0] = (q_from_ext + q_solar_abs_outer - q_sky_outer + q_from_int) / c_nodes[0]
                    total_q_surfaces_to_air += surf.K_int * (t_nodes[0] - t_in)
                else:
                    q_to_next = surf.K_inter[0] * (t_nodes[1] - t_nodes[0])
                    dt_nodes[0] = (q_from_ext + q_solar_abs_outer - q_sky_outer + q_to_next) / c_nodes[0]

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

                if is_retained_period:
                    q_loss_surface_w = surf.K_ext * max(0.0, t_nodes[0] - t_out)
                    if "wall" in surf.name:
                        loss_joules_walls += q_loss_surface_w * dt
                    elif surf.name == "roof":
                        loss_joules_roof += q_loss_surface_w * dt

            # Air node heat flow
            q_glazing_to_air = k_glazing_hour * (t_out - t_in)
            q_inf_to_air = k_inf * (t_out - t_in)

            if is_retained_period:
                loss_joules_glazing += max(0.0, k_glazing_hour * (t_in - t_out)) * dt
                loss_joules_inf += max(0.0, k_inf * (t_in - t_out)) * dt
                total_solar_gain_joules += q_solar_glazing_hour * dt

            q_total_air = (
                total_q_surfaces_to_air
                + q_glazing_to_air
                + q_inf_to_air
                + q_solar_glazing_hour
                + q_internal_w
            )
            t_in += dt * (q_total_air / c_air)

        # Record only during retained period (final 24 hours)
        if is_retained_period:
            t_out_c = float(t_out - 273.15)
            t_in_c = float(t_in - 273.15)
            hourly_results.append({
                "hour": hour_of_day,
                "t_out_c": t_out_c,
                "t_in_c": t_in_c,
                "delta_ambient": t_in_c - t_out_c,
            })

    j_to_kwh = 1.0 / 3.6e6
    loss_kwh_walls = round(loss_joules_walls * j_to_kwh, 3)
    loss_kwh_roof = round(loss_joules_roof * j_to_kwh, 3)
    loss_kwh_glazing = round(loss_joules_glazing * j_to_kwh, 3)
    loss_kwh_inf = round(loss_joules_inf * j_to_kwh, 3)
    loss_kwh_sky = round(loss_joules_sky * j_to_kwh, 3)
    solar_kwh = round(total_solar_gain_joules * j_to_kwh, 3)
    total_loss = round(loss_kwh_walls + loss_kwh_roof + loss_kwh_glazing + loss_kwh_inf + loss_kwh_sky, 3)

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
                "sky_radiation": loss_kwh_sky,
            },
            "total_heat_loss_kwh": total_loss,
        },
    }


def run_batch(
    packed: Any,
    weather: Any,
    opts: Optional[Dict[str, Any]] = None,
    physics_constants_db: Optional[Any] = None,
) -> np.ndarray:
    """Simulate batch of N designs simultaneously as vectorized matrix columns.

    Executes 2D matrix time-stepping over all N candidate designs in lockstep.
    NO Python loop over designs in the hot path. Padded nodes contribute strictly zero.

    Args:
        packed: PackedNodeArray instance containing arrays of shape (MAX_NODES, N)
        weather: Hourly weather dataset
        opts: Optional simulation controls (timestep_s, spinup_days, etc.)
        physics_constants_db: Physics constants provider

    Returns:
        (24, N) float64 array of hourly indoor air temperatures in Celsius
    """
    if physics_constants_db is None:
        try:
            from engine import physics_constants as pconst
            physics_constants_db = pconst
        except ImportError as err:
            raise ImportError("engine.physics_constants is not available") from err

    opts = opts or {}
    dt: float = float(opts.get("timestep_s", DT_INTERNAL_S))
    spinup_days: int = int(opts.get("spinup_days", SPINUP_DAYS))
    enable_sky: bool = bool(opts.get("enable_sky_radiation", True))
    altitude_m: float = float(opts.get("altitude_m", 3500.0))
    lat: float = float(opts.get("lat", 34.1526))
    lon: float = float(opts.get("lon", 77.5771))
    date_str: str = str(opts.get("date", "2026-01-15"))
    tz: float = float(opts.get("timezone", 5.5))
    snow_cover: bool = bool(opts.get("snow_cover", True))

    rho_ground = physics_constants_db.ground_albedo(snow_cover)

    # Weather parsing
    w_data = _parse_weather_input(weather)
    raw_t_out_k = w_data["t_out_k"]
    raw_dni = w_data["dni"]
    raw_dhi = w_data["dhi"]
    raw_ghi = w_data["ghi"]
    raw_cloud = w_data["cloud_fraction"]
    n_driving_hours = len(raw_t_out_k)

    # Spin-up setup
    total_days = spinup_days + 1
    t_out_sim_k = np.tile(raw_t_out_k, total_days)
    dni_sim = np.tile(raw_dni, total_days)
    dhi_sim = np.tile(raw_dhi, total_days)
    ghi_sim = np.tile(raw_ghi, total_days)
    cloud_sim = np.tile(raw_cloud, total_days)
    total_hours = len(t_out_sim_k)
    retain_start_hour = spinup_days * n_driving_hours

    N = packed.N
    col_idx = np.arange(N)

    # Initialize state matrices
    # Initialize all nodes at hour-0 ambient per 06_PHYSICS_SPEC.md Section 8
    t_init = float(t_out_sim_k[0])
    T = np.full((packed.max_nodes, N), t_init, dtype=np.float64)
    T_in = np.full(N, t_init, dtype=np.float64)

    # Pre-extract matrix references
    C = packed.C
    K_left = packed.K_left
    K_right = packed.K_right
    has_surface = packed.has_surface
    outer_idx = packed.outer_indices
    inner_idx = packed.inner_indices
    K_ext = packed.K_ext
    K_int = packed.K_int
    A_surf = packed.A_surf
    alpha_abs = packed.alpha_abs
    emissivity = packed.emissivity
    f_sky = packed.f_sky
    tilt_beta = packed.tilt_beta
    azimuth_gamma = packed.azimuth_gamma
    volume_m3 = packed.volume_m3
    ach = packed.ach
    q_internal_w = packed.q_internal_w
    k_glazing_day = packed.k_glazing_day
    k_glazing_night = packed.k_glazing_night
    openings_solar = packed.openings_solar
    glazing_ag = getattr(packed, "glazing_ag", None)
    if glazing_ag is None:
        glazing_ag = np.zeros((5, N), dtype=np.float64)
        for d in range(N):
            for area_g, g_val, b_g, g_g in openings_solar[d]:
                # match (beta, gamma)
                if abs(b_g) < 1e-3:
                    f_idx = 4  # roof
                elif abs(g_g) < 1e-3:
                    f_idx = 0  # north
                elif abs(g_g - 90.0) < 1e-3:
                    f_idx = 1  # east
                elif abs(g_g - 180.0) < 1e-3:
                    f_idx = 2  # south
                else:
                    f_idx = 3  # west
                glazing_ag[f_idx, d] += area_g * g_val
    n_surfaces = packed.has_surface.shape[0]

    # Determine maximum active row index in packed array to avoid stepping inert padded tail
    active_rows = np.where(packed.active)[0]
    max_active_r = int(np.max(active_rows)) + 1 if len(active_rows) > 0 else 0

    T_act = T[:max_active_r, :]
    C_act = C[:max_active_r, :]
    K_l_act = K_left[:max_active_r, :]
    K_r_act = K_right[:max_active_r, :]
    dT_nodes = np.zeros((max_active_r, N), dtype=np.float64)

    # Check which surfaces have uniform row indices across all designs for fast 1D row slicing
    uniform_out = [bool(np.all(outer_idx[s] == outer_idx[s, 0])) for s in range(n_surfaces)]
    uniform_in = [bool(np.all(inner_idx[s] == inner_idx[s, 0])) for s in range(n_surfaces)]

    # Pre-calculate trigonometric constants for surfaces
    cos_tilt = np.cos(np.radians(tilt_beta))
    sin_tilt = np.sin(np.radians(tilt_beta))

    substeps_per_hour = int(round(3600.0 / dt))
    hourly_t_in_c = []

    # Time integration loop
    for sim_hour in range(total_hours):
        hour_of_day = sim_hour % n_driving_hours
        t_out = t_out_sim_k[sim_hour]
        dni = dni_sim[sim_hour]
        dhi = dhi_sim[sim_hour]
        ghi = ghi_sim[sim_hour]
        cloud_frac = cloud_sim[sim_hour]
        is_retained = (sim_hour >= retain_start_hour)

        # Altitude air density and infiltration conductance
        rho_air = physics_constants_db.air_density(altitude_m, t_out)
        C_air = rho_air * CP_AIR * volume_m3
        k_inf = (ach * volume_m3 * rho_air * CP_AIR) / 3600.0

        # Sky temperature
        if hasattr(physics_constants_db, "sky_temperature_k"):
            t_sky_k = physics_constants_db.sky_temperature_k(t_out, cloud_frac)
        else:
            t_sky_k = calculate_sky_temperature_k(t_out, cloud_frac)

        # Solar position
        alpha_s, gamma_s = physics_constants_db.solar_position(lat, lon, date_str, hour_of_day, tz)
        rad_alpha = math.radians(alpha_s)
        sin_alpha = math.sin(rad_alpha)
        cos_alpha = math.cos(rad_alpha)

        # Solar irradiance on surfaces: shape (n_surfaces, N)
        diff_gamma = np.radians(gamma_s - azimuth_gamma)
        if alpha_s <= 0.0:
            cos_theta = np.zeros_like(diff_gamma)
        else:
            cos_theta = np.maximum(0.0, sin_alpha * cos_tilt + cos_alpha * sin_tilt * np.cos(diff_gamma))

        i_beam = dni * cos_theta
        i_diff = dhi * (1.0 + cos_tilt) / 2.0
        i_ground = ghi * rho_ground * (1.0 - cos_tilt) / 2.0
        surface_i_total = np.maximum(0.0, i_beam + i_diff + i_ground) * has_surface
        # Floor (index 5) receives zero incident solar radiation per physics spec
        surface_i_total[5, :] = 0.0
        q_solar_abs = surface_i_total * A_surf * alpha_abs  # (n_surfaces, N)

        # Glazing conduction & direct solar gain
        is_night = (hour_of_day < 6 or hour_of_day >= 18)
        k_glazing = k_glazing_night if is_night else k_glazing_day

        # Vectorized direct solar gain across all N designs (5 envelope orientations)
        from engine.vectorise import OPENING_ORIENTATIONS
        i_tot_openings = np.zeros(5, dtype=np.float64)
        for k, (b_g, g_g) in enumerate(OPENING_ORIENTATIONS):
            c_th = physics_constants_db.incidence_cosine(alpha_s, b_g, gamma_s, g_g)
            ib_g = dni * c_th
            id_g = dhi * (1.0 + math.cos(math.radians(b_g))) / 2.0
            ig_g = ghi * rho_ground * (1.0 - math.cos(math.radians(b_g))) / 2.0
            i_tot_openings[k] = max(0.0, ib_g + id_g + ig_g)
        q_solar_glazing = np.dot(i_tot_openings, glazing_ag)

        # Substep integration (NumPy vectorized over all N columns)
        for _ in range(substeps_per_hour):
            dT_nodes.fill(0.0)

            # Left/Right inter-node conduction
            if max_active_r > 1:
                dT_nodes[1:, :] += K_l_act[1:, :] * (T_act[:-1, :] - T_act[1:, :])
                dT_nodes[:-1, :] += K_r_act[:-1, :] * (T_act[1:, :] - T_act[:-1, :])

            # Surface boundaries: loop over the 6 surface definitions
            q_surfaces_to_air = np.zeros(N, dtype=np.float64)

            for s in range(n_surfaces):
                mask_s = has_surface[s]
                if not np.any(mask_s):
                    continue

                out_r = outer_idx[s]
                in_r = inner_idx[s]

                if uniform_out[s]:
                    T_out_surf = T_act[out_r[0], :]
                else:
                    T_out_surf = T_act[out_r, col_idx]

                if uniform_in[s]:
                    T_in_surf = T_act[in_r[0], :]
                else:
                    T_in_surf = T_act[in_r, col_idx]

                # 1. External boundary at Node 0
                q_ext = K_ext[s] * (t_out - T_out_surf)
                q_sol = q_solar_abs[s]

                # Sky radiation at Node 0
                if enable_sky:
                    f_s = f_sky[s]
                    eps_s = emissivity[s]
                    if hasattr(physics_constants_db, "radiative_coefficient"):
                        h_r = physics_constants_db.radiative_coefficient(eps_s, T_out_surf, t_sky_k)
                    else:
                        h_r = calculate_hr_linearised(eps_s, T_out_surf, t_sky_k)
                    q_sky = h_r * A_surf[s] * f_s * (T_out_surf - t_sky_k)
                else:
                    q_sky = 0.0

                q_outer_net = np.where(mask_s, q_ext + q_sol - q_sky, 0.0)
                if uniform_out[s]:
                    dT_nodes[out_r[0], :] += q_outer_net
                else:
                    dT_nodes[out_r, col_idx] += q_outer_net

                # 2. Internal boundary at Node N-1
                q_air_to_in = np.where(mask_s, K_int[s] * (T_in - T_in_surf), 0.0)
                if uniform_in[s]:
                    dT_nodes[in_r[0], :] += q_air_to_in
                else:
                    dT_nodes[in_r, col_idx] += q_air_to_in
                q_surfaces_to_air += -q_air_to_in

            # Update surface node temperatures: dT = Q / C
            # For padded nodes: C = inf, so dT_nodes / C = 0.0 exactly
            T_act += dt * (dT_nodes / C_act)

            # Update indoor air node (shape N)
            q_glaz = k_glazing * (t_out - T_in)
            q_inf = k_inf * (t_out - T_in)
            q_total_air = q_surfaces_to_air + q_glaz + q_inf + q_solar_glazing + q_internal_w

            T_in += dt * (q_total_air / C_air)

        if is_retained:
            hourly_t_in_c.append(np.copy(T_in) - 273.15)

    # Return (24, N) matrix in Celsius
    return np.array(hourly_t_in_c, dtype=np.float64)

