"""
Weather service for THERMA per brain/05_DATA_SOURCES.md & brain/09_ERROR_HANDLING.md.
Implements the exact fallback chain:
1. SQLite cache
2. Open-Meteo live (is_live: true)
3. NASA POWER archive (is_live: false)
4. /data/weather/leh_january_fallback.csv (provider: 'fallback')
5. WeatherUnavailableError -> 503
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

from api.db import execute, query_all, round_coords
from api.errors import WeatherUnavailableError

FALLBACK_CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "weather" / "leh_january_fallback.csv"


def load_fallback_csv(csv_path: Path = FALLBACK_CSV_PATH) -> List[Dict[str, Any]]:
    """Load local offline fallback dataset for Leh winter day."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Fallback weather file missing: {csv_path}")

    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader((line for line in f if not line.startswith("#")))
        for r in reader:
            rows.append({
                "hour": int(r["hour"]),
                "t_air": float(r["t_air"]),
                "ghi": float(r["ghi"]),
                "dni": float(r["dni"]),
                "dhi": float(r["dhi"]),
                "wind": float(r["wind"]),
                "rh": float(r["rh"]),
                "snow_cover": int(r["snow_cover"]),
            })
    return rows


def fetch_open_meteo(lat: float, lon: float, date_str: str, hours: int = 24) -> List[Dict[str, Any]]:
    """
    Fetch live weather from Open-Meteo API.
    Fields per brain/05_DATA_SOURCES.md section 1.
    """
    # Decide whether date is in past or future/current to choose archive vs forecast endpoint
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    endpoint = "https://api.open-meteo.com/v1/forecast"
    if date_str < today_iso:
        endpoint = "https://archive-api.open-meteo.com/v1/archive"

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": (
            "temperature_2m,shortwave_radiation,direct_normal_irradiance,"
            "diffuse_radiation,wind_speed_10m,relative_humidity_2m,snow_depth"
        ),
        "start_date": date_str,
        "end_date": date_str,
        "timezone": "UTC",
    }

    with httpx.Client(timeout=4.0) as client:
        resp = client.get(endpoint, params=params)
        resp.raise_for_status()
        data = resp.json()

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    t_air = hourly.get("temperature_2m", [])
    ghi = hourly.get("shortwave_radiation", [])
    dni = hourly.get("direct_normal_irradiance", [])
    dhi = hourly.get("diffuse_radiation", [])
    wind = hourly.get("wind_speed_10m", [])
    rh = hourly.get("relative_humidity_2m", [])
    snow_depth = hourly.get("snow_depth", [])

    rows = []
    num_hours = min(len(times), hours)
    for h in range(num_hours):
        sd = snow_depth[h] if h < len(snow_depth) and snow_depth[h] is not None else 0.0
        rows.append({
            "hour": h,
            "t_air": float(t_air[h]) if h < len(t_air) and t_air[h] is not None else -15.0,
            "ghi": float(ghi[h]) if h < len(ghi) and ghi[h] is not None else 0.0,
            "dni": float(dni[h]) if h < len(dni) and dni[h] is not None else 0.0,
            "dhi": float(dhi[h]) if h < len(dhi) and dhi[h] is not None else 0.0,
            "wind": float(wind[h]) if h < len(wind) and wind[h] is not None else 2.0,
            "rh": float(rh[h]) if h < len(rh) and rh[h] is not None else 30.0,
            "snow_cover": 1 if sd > 0.01 else 0,
        })

    return rows


def fetch_nasa_power(lat: float, lon: float, date_str: str) -> List[Dict[str, Any]]:
    """
    Fetch satellite-derived solar and meteorology from NASA POWER API.
    Note: Meteorology lags ~2-3 days, solar lags ~5-7 days.
    """
    clean_date = date_str.replace("-", "")
    endpoint = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    params = {
        "parameters": "T2M,ALLSKY_SFC_SW_DWN,WS10M,RH2M",
        "community": "RE",
        "longitude": lon,
        "latitude": lat,
        "start": clean_date,
        "end": clean_date,
        "format": "JSON",
    }

    with httpx.Client(timeout=5.0) as client:
        resp = client.get(endpoint, params=params)
        resp.raise_for_status()
        data = resp.json()

    props = data.get("properties", {}).get("parameter", {})
    t2m = props.get("T2M", {})
    sw_dwn = props.get("ALLSKY_SFC_SW_DWN", {})
    ws10m = props.get("WS10M", {})
    rh2m = props.get("RH2M", {})

    hours_keys = sorted(t2m.keys())[:24]
    rows = []
    for h, k in enumerate(hours_keys):
        ghi_val = float(sw_dwn.get(k, 0.0))
        # Estimate DNI and DHI from GHI for NASA hourly if separate components unavailable
        dni_val = max(0.0, ghi_val * 0.85) if ghi_val > 50.0 else 0.0
        dhi_val = max(0.0, ghi_val * 0.15) if ghi_val > 0.0 else 0.0
        rows.append({
            "hour": h,
            "t_air": float(t2m.get(k, -15.0)),
            "ghi": ghi_val,
            "dni": dni_val,
            "dhi": dhi_val,
            "wind": float(ws10m.get(k, 2.0)),
            "rh": float(rh2m.get(k, 30.0)),
            "snow_cover": 1,
        })
    return rows


def save_to_cache(
    lat: float,
    lon: float,
    date_str: str,
    rows: List[Dict[str, Any]],
    provider: str,
    fetched_at: str,
) -> None:
    """Save 24-hour weather rows into SQLite weather_cache table."""
    c_lat, c_lon = round_coords(lat, lon)
    for r in rows:
        execute(
            """
            INSERT OR REPLACE INTO weather_cache (
                lat, lon, date, hour, t_air, ghi, dni, dhi, wind, rh, snow_cover, provider, fetched_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            (
                c_lat,
                c_lon,
                date_str,
                r["hour"],
                r["t_air"],
                r["ghi"],
                r["dni"],
                r["dhi"],
                r["wind"],
                r["rh"],
                r["snow_cover"],
                provider,
                fetched_at,
            ),
        )


def get_cached_weather(lat: float, lon: float, date_str: str) -> Optional[Tuple[List[Dict[str, Any]], Dict[str, Any]]]:
    """Retrieve 24 hours of weather from cache if present."""
    c_lat, c_lon = round_coords(lat, lon)
    rows = query_all(
        """
        SELECT hour, t_air, ghi, dni, dhi, wind, rh, snow_cover, provider, fetched_at
        FROM weather_cache
        WHERE lat = ? AND lon = ? AND date = ?
        ORDER BY hour ASC
        """,
        (c_lat, c_lon, date_str),
    )
    if len(rows) >= 24:
        provider = rows[0]["provider"]
        fetched_at = rows[0]["fetched_at"]
        is_live = (provider == "open-meteo")
        grid_note = "NASA POWER ~0.5x0.625 deg — regional estimate" if provider == "nasa-power" else None
        provenance = {
            "provider": provider,
            "is_live": is_live,
            "grid_note": grid_note,
            "fetched_at": fetched_at,
        }
        clean_rows = [{k: r[k] for k in ["hour", "t_air", "ghi", "dni", "dhi", "wind", "rh", "snow_cover"]} for r in rows[:24]]
        return clean_rows, provenance
    return None


def get_weather(
    lat: float,
    lon: float,
    date_str: str,
    mode: str = "typical_day",
    disable_network: bool = False,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Get weather implementing the exact 5-step fallback chain.
    Returns (hourly_rows, weather_provenance).
    """
    c_lat, c_lon = round_coords(lat, lon)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. SQLite cache
    cached = get_cached_weather(c_lat, c_lon, date_str)
    if cached is not None:
        return cached

    # If network is explicitly disabled for offline verification, skip to step 4
    if not disable_network:
        # 2. Open-Meteo live
        try:
            rows = fetch_open_meteo(c_lat, c_lon, date_str)
            if len(rows) >= 24:
                save_to_cache(c_lat, c_lon, date_str, rows, "open-meteo", now_iso)
                provenance = {
                    "provider": "open-meteo",
                    "is_live": True,
                    "grid_note": None,
                    "fetched_at": now_iso,
                }
                return rows, provenance
        except Exception:
            pass

        # 3. NASA POWER archive
        try:
            rows = fetch_nasa_power(c_lat, c_lon, date_str)
            if len(rows) >= 24:
                save_to_cache(c_lat, c_lon, date_str, rows, "nasa-power", now_iso)
                provenance = {
                    "provider": "nasa-power",
                    "is_live": False,
                    "grid_note": "NASA POWER ~0.5x0.625 deg — regional estimate",
                    "fetched_at": now_iso,
                }
                return rows, provenance
        except Exception:
            pass

    # 4. Local fallback CSV
    try:
        rows = load_fallback_csv()
        provenance = {
            "provider": "fallback",
            "is_live": False,
            "grid_note": "Offline fallback dataset (Leh typical winter day)",
            "fetched_at": now_iso,
        }
        return rows, provenance
    except Exception:
        pass

    # 5. 503 WeatherUnavailableError
    raise WeatherUnavailableError(
        f"Weather data unavailable for site ({c_lat}, {c_lon}) on {date_str}. "
        "Network unreachable, no cache entry found, and fallback CSV failed."
    )
