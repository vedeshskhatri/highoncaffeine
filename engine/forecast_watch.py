"""
FORECAST-BASED EARLY WARNING SYSTEM FOR HIGH-ALTITUDE POSTS
Authoritative References:
  1. Open-Meteo Weather Forecast API documentation (https://open-meteo.com/en/docs).
  2. Indian Model for Adaptive Comfort (IMAC) / National Building Code of India (NBC 2016, Part 8).
  3. Manu, S., Shukla, Y., Rawal, R., Thomas, L. E., & de Dear, R. (2016).
     "Assessment of adaptive thermal comfort in naturally ventilated and mixed-mode buildings in India."
     Building and Environment, 102, 107–120.
  4. WHO Housing and Health Guidelines (2018): 18 °C indoor threshold for cold climates.
  5. IS 875 (Part 3) / IS 3792: Design of prefabricated structures in high-altitude cold environments.

OPERATIONAL SCOPE:
  Evaluates a shared shelter design against 3-5 day forward weather forecasts across
  distributed remote high-altitude posts (e.g. Siachen, Daulat Beg Oldie, Dras, Nyoma).
  Identifies impending comfort floor breaches, combustion/ventilation safety hazards,
  and sub-zero interior freeze risks before severe weather systems arrive.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

from engine.physics_constants import HEALTH_THRESHOLD_C, imac_comfort_band
from engine.safety import check as check_safety
from engine.solver import run_single, Design
from engine.types import Layer, Opening


# Severe cold threshold below which extreme operational danger is declared [°C]
# Source: WHO Cold Exposure Guidelines / DRDO INMAS High Altitude Field Manual
EXTREME_COLD_FLOOR_C: float = 12.0


def run_forecast_watch(
    posts: List[Dict[str, Any]],
    design: Union[Design, Dict[str, Any]],
    forecast_days: int = 4,
    comfort_threshold_c: float = HEALTH_THRESHOLD_C,
    opts: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Run forward simulation of a shelter design against Open-Meteo forecasts for multiple posts.

    Args:
        posts: List of dicts representing observation posts.
               Each dict must contain:
                 - post_id: Unique string identifier (e.g. "siachen_base")
                 - lat: Latitude in decimal degrees
                 - lon: Longitude in decimal degrees
                 - altitude_m: Altitude above sea level in meters
                 - name: Optional display name
        design: Shelter Design object or dictionary description.
        forecast_days: Number of forecast days ahead to simulate (3-5 days recommended).
        comfort_threshold_c: Minimum acceptable indoor air temperature [°C] (default 18.0 °C).
        opts: Optional simulation options (spinup_days, timestep_s, etc.).

    Returns:
        List of forecast watch items sorted by nearest breach first:
          - post_id: str
          - post_name: str
          - date: str (YYYY-MM-DD)
          - predicted_t_in_min_c: float
          - breach: bool
          - breach_hour: Optional[int]
          - status: str ("red" | "amber" | "green")
          - t_out_min_c: float
    """
    from api.weather import fetch_open_meteo_forecast

    # Convert design dict to Design dataclass if needed
    if not isinstance(design, Design):
        from api.main import _request_to_design
        from api.schemas import SimulateRequest
        if isinstance(design, SimulateRequest):
            d_obj = _request_to_design(design)
        elif isinstance(design, dict) and "walls" in design.get("envelope", {}):
            from api.schemas import SimulateRequest
            dummy_req = SimulateRequest.model_validate(design)
            d_obj = _request_to_design(dummy_req)
        else:
            raise ValueError(f"Unsupported design specification: {type(design)}")
    else:
        d_obj = design

    base_opts = opts.copy() if opts else {}
    heater_t = base_opts.get("heater_type", "none")

    # Safety check on design ventilation / heater
    safety_outcome = check_safety({"ach": d_obj.ach}, heater_type=heater_t)
    safety_refused = safety_outcome.refused

    post_results: List[Tuple[Dict[str, Any], List[Dict[str, Any]]]] = []

    for post in posts:
        post_id = str(post["post_id"])
        post_name = str(post.get("name", post_id))
        lat = float(post["lat"])
        lon = float(post["lon"])
        altitude_m = float(post.get("altitude_m", 3500.0))

        # Fetch multi-day forecast
        forecast_by_date = fetch_open_meteo_forecast(
            lat=lat,
            lon=lon,
            days=forecast_days,
        )

        daily_items: List[Dict[str, Any]] = []

        # Sort dates chronologically
        sorted_dates = sorted(forecast_by_date.keys())
        for date_str in sorted_dates:
            weather_rows = forecast_by_date[date_str]
            if len(weather_rows) != 24:
                continue

            sim_opts = dict(base_opts)
            sim_opts.update({
                "lat": lat,
                "lon": lon,
                "altitude_m": altitude_m,
                "date": date_str,
                "timestep_s": sim_opts.get("timestep_s", 60),
                "spinup_days": sim_opts.get("spinup_days", 1),
            })

            # Run solver for this 24-hour forecast day
            sol = run_single(d_obj, weather_rows, opts=sim_opts)
            series_raw = sol["series"]
            t_in_vals = [float(r["t_in_c"]) for r in series_raw]
            t_out_vals = [float(r["t_out_c"]) for r in series_raw]

            t_in_min = min(t_in_vals)
            t_out_min = min(t_out_vals)

            # Determine breach condition
            # 1. Safety interlock check (e.g. CO hazard or extreme ACH restriction)
            # 2. Indoor min temperature falling below comfort floor threshold
            comfort_breach = t_in_min < comfort_threshold_c
            is_breached = bool(safety_refused or comfort_breach)

            breach_hour: Optional[int] = None
            if is_breached:
                # Find first hour breaching comfort threshold, or min hour
                for r in series_raw:
                    if float(r["t_in_c"]) < comfort_threshold_c:
                        breach_hour = int(r["hour"])
                        break
                if breach_hour is None:
                    breach_hour = int(t_in_vals.index(t_in_min))

            # Status classification per tokens.css semantic mapping
            # Red: severe hazard (safety refusal or T_in < EXTREME_COLD_FLOOR_C)
            # Amber: warning / moderate breach (EXTREME_COLD_FLOOR_C <= T_in < comfort_threshold_c)
            # Green: compliant / within comfort band (no breach)
            if not is_breached:
                status = "green"
            elif safety_refused or t_in_min < EXTREME_COLD_FLOOR_C:
                status = "red"
            else:
                status = "amber"

            daily_items.append({
                "post_id": post_id,
                "post_name": post_name,
                "date": date_str,
                "predicted_t_in_min_c": round(t_in_min, 2),
                "breach": is_breached,
                "breach_hour": breach_hour,
                "status": status,
                "t_out_min_c": round(t_out_min, 2),
            })

        # Calculate earliest breach metric for post-level sorting
        # Key: (has_breach_flag, earliest_breach_date, earliest_breach_hour, min_overall_t_in)
        earliest_breach_date = "9999-99-99"
        earliest_breach_hour = 99
        min_overall_t_in = 999.0
        post_has_breach = False

        for item in daily_items:
            min_overall_t_in = min(min_overall_t_in, item["predicted_t_in_min_c"])
            if item["breach"] and not post_has_breach:
                post_has_breach = True
                earliest_breach_date = item["date"]
                earliest_breach_hour = item["breach_hour"] if item["breach_hour"] is not None else 99

        sort_meta = {
            "has_breach": 0 if post_has_breach else 1,
            "earliest_date": earliest_breach_date,
            "earliest_hour": earliest_breach_hour,
            "min_t_in": min_overall_t_in,
            "post_id": post_id,
        }
        post_results.append((sort_meta, daily_items))

    # Sort posts by nearest breach:
    # 1. Posts with breaches first (has_breach == 0)
    # 2. Earliest breach date
    # 3. Earliest breach hour
    # 4. Lowest minimum predicted temperature
    post_results.sort(
        key=lambda x: (
            x[0]["has_breach"],
            x[0]["earliest_date"],
            x[0]["earliest_hour"],
            x[0]["min_t_in"],
            x[0]["post_id"],
        )
    )

    # Flatten into final chronological item list per sorted post
    flat_results: List[Dict[str, Any]] = []
    for _, items in post_results:
        flat_results.extend(items)

    return flat_results
