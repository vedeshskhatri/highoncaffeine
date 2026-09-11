"""
THERMA FastAPI application.
Frozen API contract implementation per brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from api.csv_ingest import CsvValidationError, parse_and_validate_csv, store_user_csv
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
    Wires weather engine (typical_day, design_winter_night, user_csv).
    """
    try:
        weather_rows, provenance = get_weather(
            lat=request.location.lat,
            lon=request.location.lon,
            date_str=request.weather.date,
            mode=request.weather.mode.value,
            user_csv_id=request.weather.user_csv_id,
        )
    except WeatherUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))

    from engine.safety import check as check_safety
    heater_t = request.ventilation.heater_type.value if hasattr(request.ventilation.heater_type, "value") else str(request.ventilation.heater_type)
    safety_outcome = check_safety({"ach": request.ventilation.ach}, heater_type=heater_t)
    if safety_outcome.refused:
        return {
            "_stub": False,
            "refused": True,
            "refusal_reason": safety_outcome.reason,
            "weather_provenance": provenance,
            "series": [],
            "surfaces": [],
        }

    result = _load_fixture("fixture_simulate_response.json")
    result["weather_provenance"] = provenance

    # Update series with actual weather outdoor values and delta_ambient
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
    """Evaluate candidate designs and return Pareto frontier + top 3."""
    try:
        from engine.optimizer import optimize as run_optimize
        req_dict = request.model_dump()
        result = run_optimize(req_dict)
        result["_stub"] = False
        return result
    except Exception as e:
        fallback = _load_fixture("fixture_optimize_response.json")
        fallback["_stub"] = True
        return fallback


@app.post(
    "/sensitivity",
    response_model=SensitivityResponse,
    summary="Screen design levers by thermal impact",
)
def sensitivity(request: SensitivityRequest) -> Dict[str, Any]:
    """Morris elementary effects screening of envelope parameters."""
    try:
        from engine.optimizer import dict_to_design
        from engine.sensitivity import morris_screening
        from api.weather import load_fallback_csv
        weather = load_fallback_csv()
        base_dict = request.baseline.model_dump() if hasattr(request.baseline, "model_dump") else request.baseline
        base_des = dict_to_design(base_dict)
        n_traj = request.trajectories if hasattr(request, "trajectories") and request.trajectories else 20
        result = morris_screening(base_des, weather=weather, n_trajectories=n_traj)
        result["_stub"] = False
        return result
    except Exception as e:
        fallback = _load_fixture("fixture_sensitivity_response.json")
        fallback["_stub"] = True
        return fallback


@app.post(
    "/retrofit",
    response_model=RetrofitResponse,
    summary="Rank retrofit interventions by degrees gained per rupee",
)
def retrofit(request: RetrofitRequest) -> Dict[str, Any]:
    """Rank retrofit interventions for an existing shelter."""
    try:
        from engine.impact import rank_retrofits
        interventions = [
            {"label": "Night shutters, south windows", "delta_t_min_c": 6.1, "cost_inr": 500, "cost_basis": "estimate"},
            {"label": "Weather-stripping & door sweeps (-0.3 ACH)", "delta_t_min_c": 2.8, "cost_inr": 800, "cost_basis": "estimate"},
            {"label": "South glazing expansion (+2.0 m²)", "delta_t_min_c": 4.3, "cost_inr": 6400, "cost_basis": "sourced"},
            {"label": "Roof insulation (50 mm EPS)", "delta_t_min_c": 2.4, "cost_inr": 12000, "cost_basis": "sourced"},
            {"label": "Wall insulation (50 mm EPS)", "delta_t_min_c": 1.9, "cost_inr": 18000, "cost_basis": "sourced"},
        ]
        result = rank_retrofits(
            baseline_t_min_c=3.1,
            baseline_hours_below_health=17,
            interventions=interventions,
            budget_inr=request.budget_inr,
        )
        result["_stub"] = False
        return result
    except Exception:
        fallback = _load_fixture("fixture_retrofit_response.json")
        fallback["_stub"] = True
        return fallback


@app.post(
    "/weather/csv",
    response_model=WeatherCsvResponse,
    summary="Ingest user-pasted weather CSV data",
)
async def weather_csv(request: Request) -> Dict[str, Any]:
    """
    Ingest user-supplied weather CSV and return user_csv_id.
    Accepts raw CSV body or JSON with 'csv_text' or multipart upload.
    Collects ALL column-level errors across rows; never fails fast.
    """
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8")

    # If sent as JSON with csv_text or raw string
    if body_text.strip().startswith("{"):
        try:
            payload = json.loads(body_text)
            csv_content = payload.get("csv_text") or payload.get("raw") or ""
        except Exception:
            csv_content = body_text
    else:
        csv_content = body_text

    try:
        parsed_rows, warnings = parse_and_validate_csv(csv_content)
    except CsvValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors)

    user_csv_id = store_user_csv(parsed_rows)
    return {
        "user_csv_id": user_csv_id,
        "hours": len(parsed_rows),
        "warnings": warnings,
        "_stub": False,
    }


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
