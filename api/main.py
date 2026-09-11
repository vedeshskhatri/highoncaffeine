"""
THERMA FastAPI application.
Frozen API contract implementation per brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, Body, Request
from fastapi.middleware.cors import CORSMiddleware

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
    """Simulate transient indoor temperature and heat flows."""
    return _load_fixture("fixture_simulate_response.json")


@app.post(
    "/optimize",
    response_model=OptimizeResponse,
    summary="Search parameter space and find Pareto-optimal designs",
)
def optimize(request: OptimizeRequest) -> Dict[str, Any]:
    """Evaluate candidate designs and return Pareto frontier + top 3."""
    return _load_fixture("fixture_optimize_response.json")


@app.post(
    "/sensitivity",
    response_model=SensitivityResponse,
    summary="Screen design levers by thermal impact",
)
def sensitivity(request: SensitivityRequest) -> Dict[str, Any]:
    """Morris elementary effects screening of envelope parameters."""
    return _load_fixture("fixture_sensitivity_response.json")


@app.post(
    "/retrofit",
    response_model=RetrofitResponse,
    summary="Rank retrofit interventions by degrees gained per rupee",
)
def retrofit(request: RetrofitRequest) -> Dict[str, Any]:
    """Rank retrofit interventions for an existing shelter."""
    return _load_fixture("fixture_retrofit_response.json")


@app.post(
    "/weather/csv",
    response_model=WeatherCsvResponse,
    summary="Ingest user-pasted weather CSV data",
)
async def weather_csv(request: Request) -> Dict[str, Any]:
    """Ingest user-supplied weather CSV and return a user_csv_id."""
    return _load_fixture("fixture_weather_csv_response.json")


@app.get(
    "/materials",
    response_model=MaterialsResponse,
    summary="Get library of materials with cited thermal properties",
)
def materials() -> Dict[str, Any]:
    """Fetch all materials with physical properties and citations."""
    return _load_fixture("fixture_materials_response.json")


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
    return _load_fixture("fixture_health_response.json")
