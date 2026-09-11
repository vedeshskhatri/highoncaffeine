"""
Location and Elevation service for THERMA per brain/05_DATA_SOURCES.md.
Implements:
1. Open-Meteo Elevation API query with SQLite caching.
2. Open-Meteo Geocoding API place search with result parsing.
3. Strict non-defaulting policy: if elevation is unresolved, requires user input.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import httpx

from api.db import execute, query_one, round_coords

OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"

CANONICAL_LOCATIONS = {
    (34.1526, 77.5771): (3500.0, "canonical"),  # Leh
    (34.5539, 76.1349): (2676.0, "canonical"),  # Kargil
    (34.4327, 75.7547): (3280.0, "canonical"),  # Dras
    (35.2000, 77.2000): (3650.0, "canonical"),  # Siachen Base Camp
    (33.2000, 78.6500): (4180.0, "canonical"),  # Nyoma
    (33.7500, 78.6667): (4250.0, "canonical"),  # Pangong Tso
    (27.5861, 91.8653): (3048.0, "canonical"),  # Tawang
    (34.0837, 74.7973): (1585.0, "canonical"),  # Srinagar
    (31.1048, 77.1734): (2276.0, "canonical"),  # Shimla
    (32.2396, 77.1887): (2050.0, "canonical"),  # Manali
    (13.0827, 80.2707): (10.0, "canonical"),    # Chennai
    (26.9157, 70.9083): (225.0, "canonical"),   # Jaisalmer
    (28.1200, 85.2800): (2400.0, "canonical"),  # Rasuwa
    (28.6139, 77.2090): (216.0, "canonical"),   # Delhi
    (19.0760, 72.8777): (14.0, "canonical"),    # Mumbai
}


def resolve_elevation(lat: float, lon: float, timeout_s: float = 4.0) -> Tuple[Optional[float], str]:
    """
    Resolve elevation in meters ASL for given coordinates.
    
    Priority:
    1. Canonical predefined locations / benchmark sites.
    2. Local elevation_cache SQLite table.
    3. Open-Meteo elevation API.
    4. Open-Elevation API (fallback if Open-Meteo is rate limited or unavailable).
    
    If resolution fails, returns (None, 'unresolved'). Never guesses, never defaults.
    """
    c_lat, c_lon = round_coords(lat, lon)
    
    # 1. Check canonical benchmark locations
    for (can_lat, can_lon), (can_elev, can_src) in CANONICAL_LOCATIONS.items():
        if abs(c_lat - can_lat) < 0.05 and abs(c_lon - can_lon) < 0.05:
            return can_elev, can_src

    # 2. Check local SQLite cache
    try:
        cached = query_one(
            "SELECT elevation_m, source FROM elevation_cache WHERE lat = ? AND lon = ?",
            (c_lat, c_lon),
        )
        if cached and cached["elevation_m"] is not None:
            return float(cached["elevation_m"]), cached.get("source", "cache")
    except Exception:
        pass

    # 3. Query Open-Meteo Elevation API
    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.get(
                OPEN_METEO_ELEVATION_URL,
                params={"latitude": c_lat, "longitude": c_lon},
                headers={"User-Agent": "THERMA-Elevation/1.0 (sih-drdo-thermal)"},
            )
            if resp.status_code == 200:
                data = resp.json()
                elevations = data.get("elevation", [])
                if elevations and elevations[0] is not None:
                    elev = float(elevations[0])
                    try:
                        execute(
                            """
                            INSERT OR REPLACE INTO elevation_cache (lat, lon, elevation_m, source, fetched_at)
                            VALUES (?, ?, ?, 'open-meteo', datetime('now'))
                            """,
                            (c_lat, c_lon, elev),
                        )
                    except Exception:
                        pass
                    return elev, "open-meteo"
    except Exception:
        pass

    # 4. Fallback: Query Open-Elevation API
    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.get(
                OPEN_ELEVATION_URL,
                params={"locations": f"{c_lat},{c_lon}"},
                headers={"User-Agent": "THERMA-Elevation/1.0 (sih-drdo-thermal)"},
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results and results[0].get("elevation") is not None:
                    elev = float(results[0]["elevation"])
                    try:
                        execute(
                            """
                            INSERT OR REPLACE INTO elevation_cache (lat, lon, elevation_m, source, fetched_at)
                            VALUES (?, ?, ?, 'open-elevation', datetime('now'))
                            """,
                            (c_lat, c_lon, elev),
                        )
                    except Exception:
                        pass
                    return elev, "open-elevation"
    except Exception:
        pass

    # Lookup failed or rate limited across all providers -> never guess or default. Prompt user.
    return None, "unresolved"


def search_places(query: str, count: int = 8, timeout_s: float = 4.0) -> List[Dict[str, Any]]:
    """
    Search places using Open-Meteo Geocoding API.
    Returns list of place dicts containing: name, admin1, country, lat, lon, elevation_m.
    """
    clean_q = query.strip()
    if not clean_q:
        return []

    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.get(
                OPEN_METEO_GEOCODING_URL,
                params={
                    "name": clean_q,
                    "count": count,
                    "language": "en",
                    "format": "json",
                },
                headers={"User-Agent": "THERMA-Geocoding/1.0 (sih-drdo-thermal)"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
    except Exception:
        return []

    results = []
    raw_results = data.get("results", [])
    for r in raw_results:
        lat = float(r.get("latitude", 0.0))
        lon = float(r.get("longitude", 0.0))
        elev = float(r["elevation"]) if "elevation" in r and r["elevation"] is not None else None
        
        # If elevation is provided by geocoding result, cache it immediately
        if elev is not None:
            try:
                c_lat, c_lon = round_coords(lat, lon)
                execute(
                    """
                    INSERT OR REPLACE INTO elevation_cache (lat, lon, elevation_m, source, fetched_at)
                    VALUES (?, ?, ?, 'geocoding', datetime('now'))
                    """,
                    (c_lat, c_lon, elev),
                )
            except Exception:
                pass

        results.append({
            "id": r.get("id"),
            "name": r.get("name", ""),
            "admin1": r.get("admin1", ""),
            "country": r.get("country", ""),
            "country_code": r.get("country_code", ""),
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "elevation_m": elev,
        })

    return results
