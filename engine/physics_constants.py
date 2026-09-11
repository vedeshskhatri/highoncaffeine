"""
PHYSICS CONSTANTS AND FUNDAMENTAL THERMAL RELATIONS
Authoritative reference: brain/06_PHYSICS_SPEC.md, brain/05_DATA_SOURCES.md,
and Manu et al. (2016) IMAC publication.

All internal thermal computations use SI units:
  Temperature: KELVIN [K] (conversion to Celsius at API boundaries only)
  Heat flux: Watts per square metre [W/m²]
  Heat transfer: Watts [W]
  Specific heat: Joules per kilogram Kelvin [J/(kg·K)]
  Conductivity: Watts per metre Kelvin [W/(m·K)]
  Pressure: Pascals [Pa]
  Density: kilograms per cubic metre [kg/m³]
"""

from __future__ import annotations

import math
from typing import Tuple

# ============================================================================
# 1. Fundamental Physical Constants (Rule R1: All Cited)
# ============================================================================

# Stefan-Boltzmann constant [W/(m²·K⁴)]
# Source: CODATA internationally recommended 2018 value / Incropera & DeWitt (7th ed.) Table A.1
SIGMA: float = 5.670374419e-8

# Specific gas constant for dry air [J/(kg·K)]
# Source: Standard thermodynamics reference / Moran & Shapiro Fundamentals of Eng. Thermo.
R_DRY_AIR: float = 287.05

# Specific heat capacity of dry air at constant pressure [J/(kg·K)]
# Source: Standard thermodynamics reference / ASHRAE HoF 2021 Ch.1
CP_AIR: float = 1005.0

# Sea-level standard atmospheric pressure [Pa]
# Source: International Standard Atmosphere (ISA) / US Standard Atmosphere 1976
P0_SEA_LEVEL: float = 101325.0

# Minimum safe indoor temperature in cold seasons [°C]
# Source: WHO Housing and Health Guidelines (2018), Chapter 3: Low indoor temperatures
HEALTH_THRESHOLD_C: float = 18.0

# Ground reflectance (albedo) [-]
# Source: Duffie & Beckman, Solar Engineering of Thermal Processes (4th ed.), Section 2.15
ALBEDO_SNOW: float = 0.75
ALBEDO_BARE: float = 0.20


# ============================================================================
# 2. Sky Long-Wave Radiation Relations
# ============================================================================

def sky_temperature_k(t_air_k: float, cloud_fraction: float = 0.0) -> float:
    """
    Compute effective sky temperature in Kelvin.

    Clear-sky model: Swinbank (1963), 'Long-wave radiation from clear skies',
    Quarterly Journal of the Royal Meteorological Society, 89(381):339-348.
    T_sky_clear = 0.0552 * (T_air_k ** 1.5)

    Cloud cover correction: brain/06_PHYSICS_SPEC.md Section 5.1
    T_sky = T_sky_clear * (1 - 0.84 * c) + 0.84 * c * T_air_k

    Args:
        t_air_k: Ambient dry-bulb air temperature in KELVIN [K].
                 MUST BE KELVIN. Passing Celsius raises ValueError.
        cloud_fraction: Fractional cloud cover from 0.0 (clear sky) to 1.0 (overcast).

    Returns:
        float: Effective sky radiative temperature in KELVIN [K].

    Raises:
        ValueError: If t_air_k <= 0.0 (Celsius mistakenly passed or non-physical).
    """
    if t_air_k <= 100.0:
        raise ValueError(
            f"t_air_k={t_air_k} is non-physical or passed in Celsius. "
            f"Internal physics functions require temperature in KELVIN [K]."
        )

    t_sky_clear = 0.0552 * (t_air_k ** 1.5)
    c = max(0.0, min(1.0, cloud_fraction))
    t_sky = t_sky_clear * (1.0 - 0.84 * c) + 0.84 * c * t_air_k
    return t_sky


def radiative_coefficient(eps: float, t_surf_k: float, t_sky_k: float) -> float:
    """
    Compute linearised radiative heat transfer coefficient h_r [W/(m²·K)].

    Governing relation:
      h_r = eps * sigma * (T_surf² + T_sky²) * (T_surf + T_sky)
      Q_sky = h_r * Area * F_sky * (T_surf - T_sky)
    Source: brain/06_PHYSICS_SPEC.md Section 5.2 & Incropera & DeWitt Section 1.3.

    Args:
        eps: Surface long-wave thermal emissivity [-] (0.0 to 1.0).
        t_surf_k: Exterior surface temperature in KELVIN [K].
        t_sky_k: Effective sky temperature in KELVIN [K].

    Returns:
        float: Linearised radiation exchange coefficient h_r in W/(m²·K).
    """
    if t_surf_k <= 100.0 or t_sky_k <= 100.0:
        raise ValueError("Temperatures must be in KELVIN [K].")

    return eps * SIGMA * (t_surf_k ** 2 + t_sky_k ** 2) * (t_surf_k + t_sky_k)


# ============================================================================
# 3. Barometric Pressure and High-Altitude Air Density
# ============================================================================

def atmospheric_pressure_pa(altitude_m: float) -> float:
    """
    Compute local atmospheric pressure at altitude using the International
    Standard Atmosphere (ISA) barometric formula.

    Formula:
      P(h) = P0 * (1 - 2.25577e-5 * h) ** 5.25588
    Source: US Standard Atmosphere (1976) / ISO 2533:1975.

    Args:
        altitude_m: Elevation above sea level in metres [m].

    Returns:
        float: Atmospheric pressure in Pascals [Pa].
    """
    h = max(0.0, altitude_m)
    return P0_SEA_LEVEL * ((1.0 - 2.25577e-5 * h) ** 5.25588)


def air_density(altitude_m: float, t_air_k: float) -> float:
    """
    Compute dry air density using the ideal gas law with altitude-corrected pressure.

    Formula:
      rho = P_alt / (R_dry_air * T_air_k)
    Source: brain/06_PHYSICS_SPEC.md Section 6.

    Args:
        altitude_m: Elevation above sea level in metres [m].
        t_air_k: Air temperature in KELVIN [K].

    Returns:
        float: Air density in kg/m³.
    """
    if t_air_k <= 100.0:
        raise ValueError("t_air_k must be in KELVIN [K].")
    p_alt = atmospheric_pressure_pa(altitude_m)
    return p_alt / (R_DRY_AIR * t_air_k)


def convective_coefficient(h_c_sea_level: float, altitude_m: float, t_air_k: float) -> float:
    """
    Compute convective surface heat transfer coefficient scaled by high-altitude air density.

    At 3,500 m (Leh), air density is ~65% of sea-level value, reducing convective
    coupling by approximately 35%. This first-order correction scales h_c proportionally:
      h_c(alt) = h_c_0 * (rho(alt, T) / rho(0, T))
    Source: brain/06_PHYSICS_SPEC.md Section 6.

    Args:
        h_c_sea_level: Standard convective heat transfer coefficient at sea level [W/(m²·K)].
        altitude_m: Elevation in metres [m].
        t_air_k: Air temperature in KELVIN [K].

    Returns:
        float: Density-corrected convective coefficient [W/(m²·K)].
    """
    rho_alt = air_density(altitude_m, t_air_k)
    rho_sea = air_density(0.0, t_air_k)
    density_ratio = rho_alt / rho_sea
    return h_c_sea_level * density_ratio


# ============================================================================
# 4. Solar Geometry and Radiation
# ============================================================================

def solar_position(
    lat_deg: float,
    lon_deg: float,
    day_of_year: int,
    hour_local: float,
    tz_offset_hours: float = 5.5,
) -> Tuple[float, float]:
    """
    Compute solar altitude and azimuth angles using the published Michalsky algorithm.

    Citation:
      Michalsky, J.J. (1988), 'The Astronomical Almanac's algorithm for approximate
      solar position (1950–2050)', Solar Energy, 40(3):227–235.
      DOI: 10.1016/0038-092X(88)90045-X.

    Args:
        lat_deg: Latitude of location in degrees North [-90.0 to +90.0].
        lon_deg: Longitude of location in degrees East [-180.0 to +180.0].
        day_of_year: Day of the year [1 to 366] (e.g. 15 for 15 January).
        hour_local: Local standard solar time [0.0 to 24.0] hours.
        tz_offset_hours: Timezone offset from UTC in hours (default 5.5 for IST).

    Returns:
        Tuple[float, float]:
          - altitude_deg: Solar altitude above the horizon in degrees [°].
          - azimuth_deg: Solar azimuth angle in degrees clockwise from North [0°=N, 90°=E, 180°=S, 270°=W].
    """
    # Universal Time (UT) in hours
    ut_hours = hour_local - tz_offset_hours

    # Fractional Julian Day relative to J2000.0 (1 Jan 2000 12:00 UT = JD 2451545.0)
    # Using baseline reference year 2026:
    year = 2026
    delta_years = year - 2000
    leap_days = (delta_years + 3) // 4
    n_days = delta_years * 365 + leap_days + (day_of_year - 1) - 1.5 + (ut_hours / 24.0)

    # Mean longitude of the sun [degrees]
    l_deg = (280.460 + 0.9856474 * n_days) % 360.0

    # Mean anomaly of the sun [radians]
    g_deg = (357.528 + 0.9856003 * n_days) % 360.0
    g_rad = math.radians(g_deg)

    # Ecliptic longitude of the sun [radians]
    lambda_deg = l_deg + 1.915 * math.sin(g_rad) + 0.020 * math.sin(2.0 * g_rad)
    lambda_rad = math.radians(lambda_deg)

    # Obliquity of the ecliptic [radians]
    epsilon_deg = 23.439 - 0.0000004 * n_days
    epsilon_rad = math.radians(epsilon_deg)

    # Right ascension (alpha) and declination (delta)
    sin_delta = math.sin(epsilon_rad) * math.sin(lambda_rad)
    delta_rad = math.asin(sin_delta)

    cos_delta = math.cos(delta_rad)
    y = math.cos(epsilon_rad) * math.sin(lambda_rad)
    x = math.cos(lambda_rad)
    alpha_rad = math.atan2(y, x)

    # Greenwich Mean Sidereal Time (GMST) in hours
    gmst_hours = (6.697375 + 0.0657098242 * n_days + ut_hours) % 24.0

    # Local Sidereal Time (LST) in radians
    lmst_hours = (gmst_hours + lon_deg / 15.0) % 24.0
    lmst_rad = math.radians(lmst_hours * 15.0)

    # Hour angle (H) [radians]
    hour_angle_rad = lmst_rad - alpha_rad

    # Geographic coordinates in radians
    lat_rad = math.radians(lat_deg)

    # Solar altitude (alpha_s)
    sin_alt = math.sin(lat_rad) * math.sin(delta_rad) + math.cos(lat_rad) * cos_delta * math.cos(hour_angle_rad)
    sin_alt = max(-1.0, min(1.0, sin_alt))
    altitude_rad = math.asin(sin_alt)
    altitude_deg = math.degrees(altitude_rad)

    # Solar azimuth (gamma_s) measured clockwise from North (0° = N, 180° = S)
    cos_alt = math.cos(altitude_rad)
    if cos_alt < 1e-6:
        azimuth_deg = 180.0
    else:
        cos_az = (math.sin(altitude_rad) * math.sin(lat_rad) - math.sin(delta_rad)) / (cos_alt * math.cos(lat_rad))
        cos_az = max(-1.0, min(1.0, cos_az))
        az_from_south = math.acos(cos_az)

        if math.sin(hour_angle_rad) > 0.0:
            # Afternoon: West of South
            azimuth_deg = 180.0 + math.degrees(az_from_south)
        else:
            # Morning: East of South
            azimuth_deg = 180.0 - math.degrees(az_from_south)

    return altitude_deg, (azimuth_deg % 360.0)


def incidence_cosine(
    solar_alt_deg: float,
    solar_az_deg: float,
    surface_tilt_deg: float,
    surface_az_deg: float,
) -> float:
    """
    Compute the cosine of the angle of incidence theta of direct beam radiation on a surface.

    Formula:
      cos_theta = sin(alpha_s) * cos(beta) + cos(alpha_s) * sin(beta) * cos(gamma_s - gamma_surface)
      cos_theta = max(cos_theta, 0.0)  # MANDATORY CLAMP AT ZERO

    Source: Duffie & Beckman Section 1.6 & brain/06_PHYSICS_SPEC.md Section 4.2.
    Critical requirement: If cos_theta < 0, the surface faces away from the sun.
    Clamping at zero prevents non-physical negative solar irradiance (artificial cooling).

    Args:
        solar_alt_deg: Solar altitude angle in degrees [0 to 90].
        solar_az_deg: Solar azimuth angle in degrees clockwise from North [0 to 360].
        surface_tilt_deg: Surface tilt angle from horizontal in degrees (0 = roof, 90 = vertical wall).
        surface_az_deg: Surface azimuth angle in degrees facing direction (0 = North, 90 = East, 180 = South, 270 = West).

    Returns:
        float: Clamped cosine of incidence angle [-], range [0.0, 1.0].
    """
    if solar_alt_deg <= 0.0:
        return 0.0

    alpha = math.radians(solar_alt_deg)
    beta = math.radians(surface_tilt_deg)
    gamma_diff = math.radians(solar_az_deg - surface_az_deg)

    cos_theta = math.sin(alpha) * math.cos(beta) + math.cos(alpha) * math.sin(beta) * math.cos(gamma_diff)
    return max(0.0, cos_theta)


def ground_albedo(snow_cover: bool) -> float:
    """
    Return ground shortwave reflectance (albedo) based on presence of snow cover.

    Values:
      0.75 for snow cover (typical settled snow in Himalayan winter, range 0.70–0.85)
      0.20 for bare ground (arid mountain scree/soil)
    Source: Duffie & Beckman Section 2.15 & brain/06_PHYSICS_SPEC.md Section 4.4.

    Args:
        snow_cover: Boolean flag indicating presence of ground snow.

    Returns:
        float: Ground albedo [-], either 0.75 or 0.20.
    """
    return ALBEDO_SNOW if snow_cover else ALBEDO_BARE


# ============================================================================
# 5. Adaptive Thermal Comfort Model (IMAC)
# ============================================================================

def imac_comfort_band(
    t_running_mean_outdoor_c: float,
    mode: str = "nv",
    acceptability: float = 0.90,
) -> Tuple[float, float]:
    """
    India Model for Adaptive Comfort (IMAC) regression band.

    Citation:
      Manu, S., Shukla, Y., Rawal, R., Thomas, L.E., de Dear, R. (2016),
      'Field studies of thermal comfort across multiple climate zones for the subcontinent:
      India Model for Adaptive Comfort (IMAC)', Building and Environment, 98:55–70.
      DOI: 10.1016/j.buildenv.2015.12.019. (Open Access).

    Formulations:
      Naturally Ventilated (NV):
        T_neutral_C = 0.54 * T_rm30 + 12.83  (valid for T_rm30 in 12.5–31.0 °C)
        90% acceptability: ± 2.4 °C
        85% acceptability: ± 3.3 °C
        80% acceptability: ± 4.1 °C
      Mixed Mode (MM):
        T_neutral_C = 0.28 * T_rm30 + 17.87  (valid for T_rm30 in 13.0–38.5 °C)
        90% acceptability: ± 3.5 °C
        85% acceptability: ± 4.8 °C
        80% acceptability: ± 5.9 °C

    Caveat & Honest Gap (Rule R1):
      1. No adaptive comfort model has been validated for Ladakh's extreme cold high-altitude
         climate (Shimla was the coldest station in IMAC, with outdoor running mean far above
         Leh's -20 °C winter). In extreme cold below 12.5 °C, the regression is clamped at 12.5 °C
         to prevent non-physical neutral temperature collapse.
      2. Residential IMAC-R (2022) coefficients were not independently verified from primary literature;
         hence requests for 'imac_r' raise NotImplementedError per Rule R1, with 'nv' serving as the
         documented proxy for non-conditioned shelters.

    Args:
        t_running_mean_outdoor_c: 30-day outdoor running mean air temperature [°C].
        mode: 'nv' (naturally ventilated) or 'mm' (mixed mode).
        acceptability: Fractional acceptability limit: 0.90, 0.85, or 0.80.

    Returns:
        Tuple[float, float]: (low_c, high_c) operative temperature comfort band [°C].

    Raises:
        NotImplementedError: If mode is 'imac_r' (residential variant unverified in primary literature).
        ValueError: If unknown mode or unsupported acceptability level.
    """
    mode_lower = mode.lower().strip()

    if mode_lower in ("imac_r", "residential"):
        raise NotImplementedError(
            "IMAC-R (2022 residential variant) primary regression coefficients were not "
            "independently verified from primary literature for this build. "
            "Per Rule R1, use mode='nv' (IMAC naturally ventilated model) as the documented proxy."
        )

    band_widths = {
        "nv": {0.90: 2.4, 0.85: 3.3, 0.80: 4.1},
        "mm": {0.90: 3.5, 0.85: 4.8, 0.80: 5.9},
    }

    if mode_lower not in band_widths:
        raise ValueError(f"Unsupported IMAC mode: '{mode}'. Supported: 'nv', 'mm'.")

    if acceptability not in band_widths[mode_lower]:
        raise ValueError(f"Unsupported acceptability: {acceptability}. Supported: 0.90, 0.85, 0.80.")

    half_band = band_widths[mode_lower][acceptability]

    # Bound running mean temperature to valid empirical ranges with documented clamping
    if mode_lower == "nv":
        t_clamped = max(12.5, min(31.0, t_running_mean_outdoor_c))
        neutral_c = 0.54 * t_clamped + 12.83
    else:  # "mm"
        t_clamped = max(13.0, min(38.5, t_running_mean_outdoor_c))
        neutral_c = 0.28 * t_clamped + 17.87

    return (neutral_c - half_band, neutral_c + half_band)
