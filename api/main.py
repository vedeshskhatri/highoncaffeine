"""
THERMA FastAPI application.
Frozen API contract implementation per brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from api.db import DB_PATH, query_all, query_one
from api.errors import WeatherUnavailableError
from api.schemas import (
    SimulateRequest,
    SimulateResponse,
    OptimizeRequest,
    OptimizeResponse,
    SensitivityRequest,
    SensitivityResponse,
    RetrofitRequest,
    RetrofitResponse,
    WeatherCsvResponse,
    MaterialsResponse,
    ValidationResponse,
    HealthResponse,
)
from api.weather import get_weather

app = FastAPI(
    title="THERMA API",
    description="Area Specific Shelter Thermal Comfort Maintenance System (SIH 2026 PS 26051 · DRDO)",
    version="0.1.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "data" / "fixtures"


def _load_fixture(filename: str) -> Dict[str, Any]:
    """Load a fixture JSON file and ensure _stub: true is present."""
    file_path = FIXTURES_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Fixture file missing: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["_stub"] = True
    return data


@app.post(
    "/simulate",
    response_model=SimulateResponse,
    response_model_exclude_none=False,
    summary="Simulate thermal performance for a shelter design",
)
def simulate(request: SimulateRequest) -> Dict[str, Any]:
    """
    Simulate transient indoor temperature and heat flows.
    Wires real weather engine per Phase R2.
    """
    try:
        weather_rows, provenance = get_weather(
            lat=request.location.lat,
            lon=request.location.lon,
            date_str=request.weather.date,
            mode=request.weather.mode.value,
        )
    except WeatherUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))

    result = _load_fixture("fixture_simulate_response.json")
    result["weather_provenance"] = provenance

    # Update series with real weather outdoor values and delta_ambient
    series = result.get("series", [])
    for h, item in enumerate(series):
        if h < len(weather_rows):
            w = weather_rows[h]
            item["t_out"] = w["t_air"]
            item["ghi"] = w["ghi"]
            item["delta_ambient"] = round(item["t_in"] - item["t_out"], 1)

    return result


@app.post(
    "/optimize",
    response_model=OptimizeResponse,
    summary="Search parameter space and find Pareto-optimal designs",
)
def optimize(request: OptimizeRequest) -> Dict[str, Any]:
    """Evaluate candidate designs and return Pareto frontier + top 3 (stub fixture)."""
    return _load_fixture("fixture_optimize_response.json")


@app.post(
    "/sensitivity",
    response_model=SensitivityResponse,
    summary="Screen design levers by thermal impact",
)
def sensitivity(request: SensitivityRequest) -> Dict[str, Any]:
    """Morris elementary effects screening of envelope parameters (stub fixture)."""
    return _load_fixture("fixture_sensitivity_response.json")


@app.post(
    "/retrofit",
    response_model=RetrofitResponse,
    summary="Rank retrofit interventions by degrees gained per rupee",
)
def retrofit(request: RetrofitRequest) -> Dict[str, Any]:
    """Rank retrofit interventions for an existing shelter (stub fixture)."""
    return _load_fixture("fixture_retrofit_response.json")


@app.post(
    "/weather/csv",
    response_model=WeatherCsvResponse,
    summary="Ingest user-pasted weather CSV data",
)
async def weather_csv(request: Request) -> Dict[str, Any]:
    """Ingest user-supplied weather CSV and return a user_csv_id (stub fixture)."""
    return _load_fixture("fixture_weather_csv_response.json")


@app.get(
    "/materials",
    response_model=MaterialsResponse,
    summary="Get library of materials with cited thermal properties from database",
)
def materials() -> Dict[str, Any]:
    """Fetch all materials with physical properties and citations from SQLite."""
    rows = query_all("SELECT * FROM materials ORDER BY category, name")
    items = []
    for r in rows:
        cost_basis = "sourced" if r.get("cost_source") else "estimate"
        items.append({
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "k": float(r["k"]),
            "rho": float(r["rho"]),
            "cp": float(r["cp"]),
            "cost_per_m3": float(r["cost_per_m3"]) if r["cost_per_m3"] is not None else None,
            "cost_basis": cost_basis,
            "locally_available": bool(r["locally_available"]),
            "source": r["source"],
        })
    return {"materials": items, "_stub": False}


@app.get(
    "/validation",
    response_model=ValidationResponse,
    summary="Get pre-run validation results vs published field measurements",
)
def validation() -> Dict[str, Any]:
    """Return committed validation comparisons against DIHAR and Leh measurements."""
    return _load_fixture("fixture_validation_response.json")


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
)
def health() -> Dict[str, Any]:
    """Health check for service, db connectivity, and offline capability."""
    db_ok = DB_PATH.exists()
    cache_count = 0
    if db_ok:
        try:
            row = query_one("SELECT COUNT(*) as cnt FROM weather_cache")
            cache_count = row["cnt"] if row else 0
        except Exception:
            db_ok = False

    return {
        "ok": True,
        "db": db_ok,
        "weather_cache_rows": cache_count,
        "offline_capable": True,
        "_stub": False,
    }
