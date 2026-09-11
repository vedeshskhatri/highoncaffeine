"""
ANNUAL COMFORT SCANNER & 365-DAY DIURNAL PERFORMANCE ENGINE
Authoritative References:
  1. Manu, S., Shukla, Y., Rawal, R., Thomas, L. E., & de Dear, R. (2016).
     "Assessment of adaptive thermal comfort in naturally ventilated and mixed-mode buildings in India:
     India Model for Adaptive Comfort (IMAC)", Building and Environment, 98:55–70.
     DOI: 10.1016/j.buildenv.2015.12.019.
  2. National Building Code of India (NBC 2016, Part 8: Building Services, Section 1: Lighting and Ventilation).
  3. WHO Housing and Health Guidelines (2018): Chapter 3: Low indoor temperatures and insulation.
  4. ANSI/ASHRAE Standard 55-2020: Thermal Environmental Conditions for Human Occupancy.
  5. EN ISO 52016-1: Energy performance of buildings — Calculation of the energy needs for heating and cooling.

Operational Formulation:
  - 365-day (or 366-day leap) diurnal hourly transient simulation using engine.solver.run_single().
  - Adaptive comfort band evaluated per hour under IMAC NV 90% acceptability limits.
  - Comfort Day Rule: A calendar day is evaluated as habitable/comfortable if at least 12 of its 24 diurnal
    hours (>= 50%) fall within the IMAC 90% adaptive comfort acceptability band (Manu et al. 2016).
    Source: ASHRAE 55-2020 diurnal occupancy and residential habitability standard.
  - Worst Week: The 7 consecutive calendar days exhibiting the lowest mean daily minimum indoor temperature.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Union

from engine.physics_constants import HEALTH_THRESHOLD_C, imac_comfort_band
from engine.solver import run_single, Design


def run_annual_scan(
    design: Union[Design, Dict[str, Any]],
    lat: float,
    lon: float,
    altitude_m: float,
    year: int = 2026,
    opts: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run 365-day transient comfort scan for a shelter design across a calendar year.

    Args:
        design: Shelter Design object, SimulateRequest, or dictionary specification.
        lat: Site latitude in decimal degrees (-90 to +90).
        lon: Site longitude in decimal degrees (-180 to +180).
        altitude_m: Site altitude above sea level in meters.
        year: Calendar year to scan (e.g. 2026).
        opts: Optional simulation controls (timestep_s, spinup_days, etc.).

    Returns:
        Dict adhering to frozen API specification:
          - year: int
          - days: List of {date: str, provider: str, hours: List[{hour, t_in_c, t_out_c, comfort}]}
          - comfort_days_ratio: float in [0.0, 1.0]
          - worst_week: {start_date: str, avg_t_in_min_c: float}
    """
    from api.weather import fetch_nasa_power_year

    # Resolve Design dataclass
    if not isinstance(design, Design):
        from api.main import _request_to_design
        from api.schemas import SimulateRequest
        if isinstance(design, SimulateRequest):
            d_obj = _request_to_design(design)
        elif isinstance(design, dict) and "walls" in design.get("envelope", {}):
            dummy_req = SimulateRequest.model_validate(design)
            d_obj = _request_to_design(dummy_req)
        else:
            from api.main import _build_design
            d_obj = _build_design(design)
    else:
        d_obj = design

    base_opts = opts.copy() if opts else {}

    # Fetch full year weather (with SQLite weather_cache hit check)
    weather_by_date = fetch_nasa_power_year(lat=lat, lon=lon, year=year)

    days_out: List[Dict[str, Any]] = []
    daily_min_temps: List[float] = []
    comfortable_days_count = 0

    sorted_dates = sorted(weather_by_date.keys())

    for date_str in sorted_dates:
        weather_rows = weather_by_date[date_str]
        if len(weather_rows) != 24:
            continue

        sim_opts = dict(base_opts)
        sim_opts.update({
            "lat": lat,
            "lon": lon,
            "altitude_m": altitude_m,
            "date": date_str,
            "timestep_s": sim_opts.get("timestep_s", 60),
            "spinup_days": sim_opts.get("spinup_days", 0),
        })

        # Run 5R1C network solver for this day
        sol = run_single(d_obj, weather_rows, opts=sim_opts)
        series_raw = sol["series"]

        t_out_c_list = [float(r["t_out_c"]) for r in series_raw]
        t_out_mean = float(sum(t_out_c_list) / len(t_out_c_list)) if t_out_c_list else -10.0

        # IMAC 90% acceptability band per Manu et al. (2016)
        lo_c, hi_c = imac_comfort_band(t_out_mean, mode="nv", acceptability=0.90)

        hours_out: List[Dict[str, Any]] = []
        comfortable_hours = 0
        day_t_in_mins: List[float] = []
        provider_tag = weather_rows[0].get("provider", "nasa-power")

        for r in series_raw:
            h = int(r["hour"])
            t_in = round(float(r["t_in_c"]), 2)
            t_out = round(float(r["t_out_c"]), 2)
            is_comfort = bool(lo_c <= t_in <= hi_c)
            if is_comfort:
                comfortable_hours += 1
            day_t_in_mins.append(t_in)
            hours_out.append({
                "hour": h,
                "t_in_c": t_in,
                "t_out_c": t_out,
                "comfort": is_comfort,
            })

        # Comfort Day Rule: >= 50% diurnal hours (>= 12 hrs) comfortable
        is_day_comfortable = (comfortable_hours >= 12)
        if is_day_comfortable:
            comfortable_days_count += 1

        day_min = min(day_t_in_mins) if day_t_in_mins else -20.0
        daily_min_temps.append(day_min)

        days_out.append({
            "date": date_str,
            "provider": provider_tag,
            "hours": hours_out,
        })

    # Summary Metrics
    total_days = len(days_out)
    comfort_days_ratio = round(comfortable_days_count / total_days, 3) if total_days > 0 else 0.0

    # Calculate worst consecutive 7-day period (lowest average minimum indoor temperature)
    min_week_avg = float("inf")
    worst_week_start = days_out[0]["date"] if days_out else f"{year}-01-01"

    if total_days >= 7:
        for i in range(total_days - 6):
            rolling_avg = sum(daily_min_temps[i : i + 7]) / 7.0
            if rolling_avg < min_week_avg:
                min_week_avg = rolling_avg
                worst_week_start = days_out[i]["date"]
    elif total_days > 0:
        min_week_avg = sum(daily_min_temps) / total_days

    worst_week = {
        "start_date": worst_week_start,
        "avg_t_in_min_c": round(min_week_avg, 2) if min_week_avg != float("inf") else 0.0,
    }

    return {
        "year": int(year),
        "days": days_out,
        "comfort_days_ratio": comfort_days_ratio,
        "worst_week": worst_week,
    }
