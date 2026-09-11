"""
THERMA Weather Profile Generator
Smart India Hackathon 2026 - DRDO PS 26051

Generates physically grounded 24-hour winter diurnal meteorological profiles for
12 high-altitude Himalayan locations across 8 extreme climate scenarios.
Consistently enforces Michalsky solar geometry, barometric pressure, altitude scaling,
Swinbank clear-sky longwave radiation, and snow albedo.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
import sys
from typing import Any, Dict, List, Tuple

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from engine.physics_constants import (
    solar_position,
    sky_temperature_k,
    atmospheric_pressure_pa,
    air_density,
    SIGMA,
)


LOCATIONS: Dict[str, Dict[str, Any]] = {
    "Leh": {
        "latitude": 34.1526,
        "longitude": 77.5771,
        "altitude_m": 3500.0,
        "climate_class": "Cold Arid Alpine Desert",
        "t_base_mean": -12.0,
        "t_diurnal_range": 14.0,
        "wind_base_mps": 3.2,
    },
    "Dras": {
        "latitude": 34.4293,
        "longitude": 75.7533,
        "altitude_m": 3280.0,
        "climate_class": "Extreme Sub-Arctic Cold Valley",
        "t_base_mean": -22.0,
        "t_diurnal_range": 16.0,
        "wind_base_mps": 4.5,
    },
    "Siachen": {
        "latitude": 35.4212,
        "longitude": 77.1095,
        "altitude_m": 5400.0,
        "climate_class": "Polar Glacial High Altitude",
        "t_base_mean": -32.0,
        "t_diurnal_range": 12.0,
        "wind_base_mps": 8.0,
    },
    "Daulat Beg Oldie": {
        "latitude": 35.4057,
        "longitude": 77.9297,
        "altitude_m": 5065.0,
        "climate_class": "Extreme High-Altitude Cold Desert",
        "t_base_mean": -30.0,
        "t_diurnal_range": 15.0,
        "wind_base_mps": 7.5,
    },
    "Galwan": {
        "latitude": 34.7500,
        "longitude": 78.2500,
        "altitude_m": 4300.0,
        "climate_class": "High-Altitude Cold River Valley",
        "t_base_mean": -24.0,
        "t_diurnal_range": 14.0,
        "wind_base_mps": 5.0,
    },
    "Hanle": {
        "latitude": 32.7784,
        "longitude": 78.9642,
        "altitude_m": 4500.0,
        "climate_class": "Ultra-Clear High-Altitude Cold Desert",
        "t_base_mean": -20.0,
        "t_diurnal_range": 18.0,
        "wind_base_mps": 4.0,
    },
    "Nyoma": {
        "latitude": 33.1958,
        "longitude": 78.6508,
        "altitude_m": 4180.0,
        "climate_class": "High-Altitude Cold Desert",
        "t_base_mean": -18.0,
        "t_diurnal_range": 16.0,
        "wind_base_mps": 4.2,
    },
    "Chushul": {
        "latitude": 33.5936,
        "longitude": 78.6543,
        "altitude_m": 4350.0,
        "climate_class": "High-Altitude Alpine Valley",
        "t_base_mean": -22.0,
        "t_diurnal_range": 15.0,
        "wind_base_mps": 5.5,
    },
    "Rezang La": {
        "latitude": 33.4250,
        "longitude": 78.8472,
        "altitude_m": 5000.0,
        "climate_class": "Mountain Ridge Extreme Cold",
        "t_base_mean": -28.0,
        "t_diurnal_range": 13.0,
        "wind_base_mps": 8.5,
    },
    "Pangong": {
        "latitude": 33.7595,
        "longitude": 78.6674,
        "altitude_m": 4250.0,
        "climate_class": "Alpine Lake Shore High Wind",
        "t_base_mean": -19.0,
        "t_diurnal_range": 14.0,
        "wind_base_mps": 6.8,
    },
    "Depsang": {
        "latitude": 35.3167,
        "longitude": 78.0167,
        "altitude_m": 5330.0,
        "climate_class": "Arctic High-Altitude Plains",
        "t_base_mean": -33.0,
        "t_diurnal_range": 14.0,
        "wind_base_mps": 8.0,
    },
    "Kargil": {
        "latitude": 34.5539,
        "longitude": 76.1349,
        "altitude_m": 2676.0,
        "climate_class": "Cold Semi-Arid Mountain Valley",
        "t_base_mean": -10.0,
        "t_diurnal_range": 12.0,
        "wind_base_mps": 2.8,
    },
}

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "normal_winter": {
        "t_offset": 0.0,
        "cloud_cover": 0.15,
        "snow_depth_m": 0.25,
        "wind_mult": 1.0,
    },
    "cold_winter": {
        "t_offset": -6.0,
        "cloud_cover": 0.10,
        "snow_depth_m": 0.40,
        "wind_mult": 1.2,
    },
    "extreme_winter": {
        "t_offset": -12.0,
        "cloud_cover": 0.05,
        "snow_depth_m": 0.60,
        "wind_mult": 1.5,
    },
    "clear_sky_night": {
        "t_offset": -4.0,
        "cloud_cover": 0.0,
        "snow_depth_m": 0.30,
        "wind_mult": 0.8,
    },
    "snow_cover": {
        "t_offset": -2.0,
        "cloud_cover": 0.20,
        "snow_depth_m": 0.80,
        "wind_mult": 1.1,
    },
    "high_solar_day": {
        "t_offset": 2.0,
        "cloud_cover": 0.0,
        "snow_depth_m": 0.20,
        "wind_mult": 0.9,
    },
    "cloudy_day": {
        "t_offset": -1.0,
        "cloud_cover": 0.85,
        "snow_depth_m": 0.35,
        "wind_mult": 1.3,
    },
    "cold_snap": {
        "t_offset": -15.0,
        "cloud_cover": 0.05,
        "snow_depth_m": 0.50,
        "wind_mult": 1.8,
    },
}


def compute_solar_irradiance(
    solar_alt_deg: float,
    altitude_m: float,
    cloud_fraction: float,
    day_of_year: int = 15,
) -> Tuple[float, float, float]:
    """
    Compute GHI, DNI, DHI using high-altitude clear-sky radiation physics
    with cloud attenuation.
    """
    if solar_alt_deg <= 0.0:
        return 0.0, 0.0, 0.0

    sin_alt = math.sin(math.radians(solar_alt_deg))
    # Extraterrestrial normal solar constant
    # Duffie & Beckman Eq. 1.4.1
    i0 = 1367.0 * (1.0 + 0.033 * math.cos(math.radians(360.0 * day_of_year / 365.0)))

    # Atmospheric optical air mass (Kasten-Young formula)
    # Higher altitude reduces optical depth
    p_ratio = atmospheric_pressure_pa(altitude_m) / 101325.0
    air_mass = (1.0 / (sin_alt + 0.50572 * ((solar_alt_deg + 6.07995) ** -1.6364))) * p_ratio
    air_mass = max(0.5, air_mass)

    # Clear-sky beam transmittance (Meinel & Meinel)
    tau_beam = (0.7 ** (air_mass ** 0.678))

    dni_clear = max(0.0, i0 * tau_beam)
    # Diffuse fraction
    dhi_clear = max(0.0, 0.12 * i0 * sin_alt * (1.0 - tau_beam))
    ghi_clear = dni_clear * sin_alt + dhi_clear

    # Cloud attenuation
    c = max(0.0, min(1.0, cloud_fraction))
    # Kasten & Czeplak model for cloud transmission
    trans_cloud = 1.0 - 0.75 * (c ** 3.4)
    dni = max(0.0, dni_clear * (1.0 - c) ** 1.5)
    dhi = max(0.0, dhi_clear * (1.0 - 0.5 * c) + 0.3 * dni_clear * sin_alt * c * trans_cloud)
    ghi = max(0.0, dni * sin_alt + dhi)

    return round(ghi, 1), round(dni, 1), round(dhi, 1)


def generate_diurnal_weather(
    loc_name: str,
    scenario_name: str,
    day_of_year: int = 15,
    date_str: str = "2026-01-15",
) -> List[Dict[str, Any]]:
    """Generate 24 hourly timesteps for a specific location and winter scenario."""
    loc = LOCATIONS[loc_name]
    scen = SCENARIOS[scenario_name]

    lat = loc["latitude"]
    lon = loc["longitude"]
    alt = loc["altitude_m"]

    t_mean = loc["t_base_mean"] + scen["t_offset"]
    t_amp = loc["t_diurnal_range"] / 2.0
    c_frac = scen["cloud_cover"]
    snow_depth = scen["snow_depth_m"]
    snow_albedo = 0.75 if snow_depth > 0.01 else 0.20

    weather_id = f"WX_{loc_name.upper().replace(' ', '_')}_{scenario_name.upper()}"

    hourly_records = []

    for h in range(24):
        # Diurnal temperature profile: min at h=6 (sunrise), max at h=14
        # Standard cosine curve shifted to minimum at h=6
        t_diurnal = t_mean - t_amp * math.cos(math.radians((h - 6.0) * 15.0))
        t_k = t_diurnal + 273.15

        # Solar angles via Michalsky algorithm
        sol_alt, sol_az = solar_position(lat, lon, day_of_year, float(h) + 0.5, tz_offset_hours=5.5)

        ghi, dni, dhi = compute_solar_irradiance(sol_alt, alt, c_frac, day_of_year)

        # Wind speed diurnal variation
        wind_mps = max(0.5, loc["wind_base_mps"] * scen["wind_mult"] * (0.8 + 0.4 * math.sin(math.radians((h - 8.0) * 15.0))))
        wind_dir = 220.0  # Prevailing South-Westerly mountain wind

        # Relative humidity typically inverse of temperature
        rh = min(95.0, max(20.0, 60.0 - 15.0 * (t_diurnal - t_mean) / (t_amp + 1e-3)))

        # Swinbank clear-sky longwave with cloud cover
        t_sky = sky_temperature_k(t_k, c_frac)
        lw_down = SIGMA * (t_sky ** 4)

        p_pa = atmospheric_pressure_pa(alt)
        rho_val = air_density(alt, t_k)

        hourly_records.append({
            "weather_id": weather_id,
            "location": loc_name,
            "date": date_str,
            "day_of_year": day_of_year,
            "hour": h,
            "outdoor_temperature_C": round(t_diurnal, 2),
            "relative_humidity_pct": round(rh, 1),
            "wind_speed_mps": round(wind_mps, 2),
            "wind_direction_deg": round(wind_dir, 1),
            "ghi_W_m2": ghi,
            "dni_W_m2": dni,
            "dhi_W_m2": dhi,
            "cloud_fraction": round(c_frac, 2),
            "snow_depth_m": round(snow_depth, 2),
            "snow_albedo": round(snow_albedo, 2),
            "longwave_down_W_m2": round(lw_down, 1),
            "air_pressure_Pa": round(p_pa, 1),
            "air_density_kg_m3": round(rho_val, 4),
            "weather_source": "SYNTHETIC_CLIMATOLOGY",
            "synthetic_flag": True,
        })

    return hourly_records


def generate_all_weather_profiles(output_path: str | Path = "data/ml/therma_weather.csv") -> List[Dict[str, Any]]:
    """Generate and write comprehensive weather database for all 12 locations x 8 scenarios."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    all_rows: List[Dict[str, Any]] = []

    for loc in LOCATIONS:
        for scen in SCENARIOS:
            rows = generate_diurnal_weather(loc, scen)
            all_rows.extend(rows)

    fieldnames = [
        "weather_id",
        "location",
        "date",
        "day_of_year",
        "hour",
        "outdoor_temperature_C",
        "relative_humidity_pct",
        "wind_speed_mps",
        "wind_direction_deg",
        "ghi_W_m2",
        "dni_W_m2",
        "dhi_W_m2",
        "cloud_fraction",
        "snow_depth_m",
        "snow_albedo",
        "longwave_down_W_m2",
        "air_pressure_Pa",
        "air_density_kg_m3",
        "weather_source",
        "synthetic_flag",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    n_profiles = len(LOCATIONS) * len(SCENARIOS)
    print(f"Generated therma_weather.csv with {n_profiles} weather profiles ({len(all_rows)} hourly records) across 12 Himalayan locations.")
    return all_rows


if __name__ == "__main__":
    generate_all_weather_profiles()
