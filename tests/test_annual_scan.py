"""
Annual Comfort Calendar Test Suite
Authoritative References:
  1. Manu et al. (2016) India Model for Adaptive Comfort (IMAC).
  2. WHO Housing and Health Guidelines (2018): 18 °C thermal health threshold.
  3. ASHRAE Standard 55-2020: Diurnal occupancy and habitability.
"""

import calendar
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.weather import fetch_nasa_power_year
from engine.annual_scan import run_annual_scan
from engine.solver import Design
from engine.types import Layer, Opening

client = TestClient(app)


def _canonical_design() -> Design:
    return Design(
        orientation_deg=180.0,
        walls=(Layer("mud_brick", 0.30), Layer("eps", 0.05)),
        roof=(Layer("concrete", 0.15),),
        floor=(Layer("concrete", 0.10),),
        openings=(Opening("south", 4.0, "double_pane", False),),
        ach=0.6,
        roof_emissivity=0.90,
        night_shutter=False,
        length_m=6.0,
        width_m=4.0,
        height_m=2.6,
    )


def test_01_annual_scan_output_shape_and_metrics():
    """
    Verify run_annual_scan returns 365 days for standard year,
    with 24 diurnal hours per day matching the required output structure,
    comfort_days_ratio in [0.0, 1.0], and valid worst_week.
    """
    design = _canonical_design()
    result_2026 = run_annual_scan(
        design=design,
        lat=34.1526,
        lon=77.5771,
        altitude_m=3500.0,
        year=2026,
    )
    assert result_2026["year"] == 2026
    assert len(result_2026["days"]) == 365
    first_day = result_2026["days"][0]
    assert first_day["date"] == "2026-01-01"
    assert len(first_day["hours"]) == 24
    assert first_day["provider"] in ("nasa-power", "fallback")
    for h in first_day["hours"]:
        assert 0 <= h["hour"] <= 23
        assert isinstance(h["t_in_c"], float)
        assert isinstance(h["t_out_c"], float)
        assert isinstance(h["comfort"], bool)

    ratio = result_2026["comfort_days_ratio"]
    assert isinstance(ratio, float)
    assert 0.0 <= ratio <= 1.0

    worst_week = result_2026["worst_week"]
    assert "start_date" in worst_week
    assert "avg_t_in_min_c" in worst_week
    assert isinstance(worst_week["avg_t_in_min_c"], float)
    assert worst_week["start_date"].startswith("2026-")


def test_02_leap_year_returns_366_days():
    """
    Verify leap year (e.g. 2024) correctly yields 366 days including Feb 29.
    """
    weather_2024 = fetch_nasa_power_year(lat=34.1526, lon=77.5771, year=2024)
    assert len(weather_2024) == 366
    assert "2024-02-29" in weather_2024


def test_03_cache_hit_avoids_refetching():
    """
    Verify that repeated calls for the same year/location retrieve data
    from SQLite weather_cache and do not invoke external HTTP endpoints.
    """
    lat = 34.20
    lon = 77.60
    year = 2026

    # Call once to ensure data is synthesized/cached in SQLite
    weather_1 = fetch_nasa_power_year(lat=lat, lon=lon, year=year)
    assert len(weather_1) == 365

    # Second call: patch httpx.Client.get to ensure no external HTTP requests are made
    with patch("httpx.Client.get") as mock_get:
        weather_2 = fetch_nasa_power_year(lat=lat, lon=lon, year=year)
        mock_get.assert_not_called()
        assert len(weather_2) == 365
        assert set(weather_1.keys()) == set(weather_2.keys())


def test_04_api_annual_scan_endpoint():
    """
    Verify POST /annual_scan HTTP endpoint returns 200 with schema-validated response.
    """
    payload = {
        "location": {
            "lat": 34.1526,
            "lon": 77.5771,
            "altitude_m": 3500.0,
        },
        "year": 2026,
    }
    response = client.post("/annual_scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["year"] == 2026
    assert len(data["days"]) == 365
    assert 0.0 <= data["comfort_days_ratio"] <= 1.0
    assert "start_date" in data["worst_week"]
    assert "avg_t_in_min_c" in data["worst_week"]

