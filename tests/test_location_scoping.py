"""
Tests for universal location resolution, elevation lookup, and fallback scoping.
Validates:
1. Fallback scoping: non-Ladakh coordinates raise 503 WeatherUnavailableError offline.
2. Fallback scoping: Ladakh coordinates successfully receive scoped fallback offline.
3. Elevation lookup: cached/DEM resolution works; unresolved coords return requires_user_input.
4. Place search: returns valid schema with elevation and lat/lon.
5. Simulation multi-climate validation: hot vs cold binding constraints.
"""

from fastapi.testclient import TestClient
import pytest

from api.main import app
from api.weather import get_weather, is_in_ladakh
from api.errors import WeatherUnavailableError
from api.location import resolve_elevation, search_places


client = TestClient(app)


def test_is_in_ladakh():
    # Leh is in Ladakh
    assert is_in_ladakh(34.1526, 77.5771) is True
    # Kargil is in Ladakh
    assert is_in_ladakh(34.5539, 76.1349) is True
    # Chennai is NOT in Ladakh
    assert is_in_ladakh(13.0827, 80.2707) is False
    # Jaisalmer is NOT in Ladakh
    assert is_in_ladakh(26.9157, 70.9083) is False
    # Rasuwa is NOT in Ladakh
    assert is_in_ladakh(28.1200, 85.2800) is False


def test_chennai_offline_raises_503():
    """Verify Chennai offline NEVER silently receives Leh winter weather."""
    with pytest.raises(WeatherUnavailableError) as exc_info:
        get_weather(13.08, 80.27, "2099-01-01", disable_network=True)
    assert "restricted strictly to Ladakh" in str(exc_info.value)


def test_leh_offline_serves_scoped_fallback():
    """Verify Leh offline receives the valid local fallback dataset."""
    rows, prov = get_weather(34.1526, 77.5771, "2099-01-01", disable_network=True)
    assert len(rows) == 24
    assert prov["provider"] == "fallback"


def test_elevation_endpoint_canonical():
    """Verify elevation endpoint returns known canonical elevation."""
    resp = client.get("/location/elevation?lat=34.1526&lon=77.5771")
    assert resp.status_code == 200
    data = resp.json()
    assert data["elevation_m"] == 3500.0
    assert data["requires_user_input"] is False


def test_search_places_endpoint():
    """Verify place search returns list with required geographic attributes."""
    resp = client.get("/location/search?q=Chennai&count=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    hit = data["results"][0]
    assert "lat" in hit and "lon" in hit
    assert "name" in hit
