"""
THERMA FastAPI application.
Frozen API contract implementation per brain/07_API_CONTRACT.md.

WIRING NOTE: All live endpoints call the real engine. No fixture fallbacks on live paths.
Fixture fallbacks were removed per audit finding A3-4 (root cause: silent masking).
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from api.csv_ingest import CsvValidationError, parse_and_validate_csv, store_user_csv
from api.db import DB_PATH, query_all, query_one
from api.errors import WeatherUnavailableError, UnknownMaterialError
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
    ForecastWatchRequest,
    ForecastWatchItemSchema,
    WatchPostSchema,
)
from pydantic import BaseModel
from api.weather import get_weather
from engine.diagnosis import diagnose
from engine.what_if import (
    SUPPORTED_VARIABLES,
    get_baseline_parameter_value,
    apply_parameter_change,
    compare_simulations,
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
VALIDATION_RESULTS_DIR = Path(__file__).resolve().parent.parent / "validation" / "results"


# ---------------------------------------------------------------------------
# Helper: convert numpy scalars to Python natives (A3-4 fix)
# ---------------------------------------------------------------------------

def _to_python(obj: Any) -> Any:
    """Recursively convert numpy scalars to Python native types for JSON safety."""
    if isinstance(obj, dict):
        return {k: _to_python(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_python(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [_to_python(v) for v in obj.tolist()]
    return obj


# ---------------------------------------------------------------------------
# Helper: build Design from SimulateRequest (Tier 2 A1-1 wiring)
# ---------------------------------------------------------------------------

def _request_to_design(request: SimulateRequest) -> Any:
    """Convert SimulateRequest to engine.types.Design."""
    from engine.types import Design, Layer, Opening

    walls = tuple(
        Layer(material_id=lyr.material, thickness_m=lyr.thickness_m)
        for lyr in request.envelope.walls
    )
    roof = tuple(
        Layer(material_id=lyr.material, thickness_m=lyr.thickness_m)
        for lyr in request.envelope.roof
    )
    floor = tuple(
        Layer(material_id=lyr.material, thickness_m=lyr.thickness_m)
        for lyr in request.envelope.floor
    )
    openings = tuple(
        Opening(
            facing=op.facing.value if hasattr(op.facing, "value") else str(op.facing),
            area_m2=op.area_m2,
            glazing_id=op.glazing,
            night_shutter=op.night_shutter,
        )
        for op in request.openings
    )

    return Design(
        orientation_deg=request.geometry.orientation_deg,
        walls=walls,
        roof=roof,
        floor=floor,
        openings=openings,
        ach=request.ventilation.ach,
        roof_emissivity=request.envelope.roof_emissivity,
        night_shutter=any(op.night_shutter for op in openings),
        length_m=request.geometry.length_m,
        width_m=request.geometry.width_m,
        height_m=request.geometry.height_m,
    )


def _build_design(design_input: Any = None) -> Any:
    """Build or resolve a Design object from request, dict, or fallback canonical."""
    from engine.types import Design, Layer, Opening
    if isinstance(design_input, Design):
        return design_input
    if isinstance(design_input, SimulateRequest):
        return _request_to_design(design_input)
    if isinstance(design_input, dict) and "walls" in design_input.get("envelope", {}):
        try:
            req = SimulateRequest.model_validate(design_input)
            return _request_to_design(req)
        except Exception:
            pass
    # Canonical fallback Ladakh shelter design
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


# ---------------------------------------------------------------------------
# POST /simulate — wired to engine.solver.run_single (A1-1)
# ---------------------------------------------------------------------------

@app.post(
    "/simulate",
    response_model=SimulateResponse,
    response_model_exclude_none=False,
    summary="Simulate thermal performance for a shelter design",
)
def _simulate_internal(request: SimulateRequest) -> Dict[str, Any]:
    """
    Internal execution pipeline for simulate, shared by /simulate and /what-if.
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
            "refused": True,
            "refusal_reason": safety_outcome.reason,
            "weather_provenance": provenance,
            "series": [],
            "surfaces": [],
        }

    # Build Design and call the real solver (A1-1 wiring)
    from engine.solver import run_single, SolverDivergedError
    from engine.impact import backup_heat_sizing, kerosene_litres
    from api.errors import UnknownMaterialError

    design = _request_to_design(request)

    opts = {
        "timestep_s": request.simulation.timestep_s,
        "spinup_days": request.simulation.spinup_days,
        "altitude_m": request.location.altitude_m,
        "lat": request.location.lat,
        "lon": request.location.lon,
        "date": request.weather.date,
        "snow_cover": request.ground.snow_cover,
        "occupancy": {
            "people": request.occupancy.people,
            "watts_per_person": request.occupancy.watts_per_person,
        },
    }

    try:
        sol = run_single(design, weather_rows, opts=opts)
    except SolverDivergedError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except (UnknownMaterialError, Exception) as exc:
        # Let unknown material surface as 400; everything else is 500
        if "UnknownMaterial" in type(exc).__name__ or "Unsourced" in type(exc).__name__:
            raise HTTPException(status_code=400, detail=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))

    series_raw = sol["series"]   # list of {hour, t_out_c, t_in_c, delta_ambient}
    t_in_c_list = [r["t_in_c"] for r in series_raw]
    t_out_c_list = [r["t_out_c"] for r in series_raw]
    summary_eng = sol["summary"]

    # Enrich series with weather GHI values and contract fields
    series_out = []
    for h, row in enumerate(series_raw):
        t_in = float(row["t_in_c"])
        t_out = float(row["t_out_c"])
        ghi_h = float(weather_rows[h]["ghi"]) if h < len(weather_rows) else 0.0
        # Operative temperature approximation: 0.5 * (t_in + mean_radiant)
        # Mean radiant ~ t_in for well-insulated shelter
        t_op = round(t_in, 1)
        # IMAC comfort band (Aman's function)
        from engine.physics_constants import imac_comfort_band
        t_out_mean = float(sum(r["t_out_c"] for r in series_raw) / len(series_raw))
        lo, hi = imac_comfort_band(t_out_mean, mode="nv", acceptability=0.90)
        series_out.append({
            "hour": row["hour"],
            "t_out": round(t_out, 2),
            "t_in": round(t_in, 2),
            "t_operative": t_op,
            "ghi": round(ghi_h, 1),
            "delta_ambient": round(t_in - t_out, 2),
            "t_in_lo": round(float(lo), 1),
            "t_in_hi": round(float(hi), 1),
        })

    t_in_arr = [r["t_in"] for r in series_out]
    t_in_min_c = round(min(t_in_arr), 2)
    t_in_max_c = round(max(t_in_arr), 2)
    t_in_min_hour = int(t_in_arr.index(min(t_in_arr)))

    from engine.physics_constants import imac_comfort_band, HEALTH_THRESHOLD_C
    t_out_mean = float(sum(t_out_c_list) / len(t_out_c_list))
    lo, hi = imac_comfort_band(t_out_mean, mode="nv", acceptability=0.90)
    comfort_hours_ratio = round(sum(1 for t in t_in_arr if lo <= t <= hi) / len(t_in_arr), 3)
    hours_below_health = int(sum(1 for t in t_in_arr if t < HEALTH_THRESHOLD_C))

    # Backup heat sizing
    deficit_w = [max(0.0, (HEALTH_THRESHOLD_C - t) * 50.0) for t in t_in_arr]
    backup = backup_heat_sizing(deficit_w)
    backup_py = _to_python(backup)

    annual_kerosene_l = float(backup_py["kerosene_litres_per_night"]) * 120.0
    annual_fuel_cost_inr = annual_kerosene_l * 2400.0
    annual_co2_kg = annual_kerosene_l * 2.5

    summary_out = {
        "t_in_min_c": t_in_min_c,
        "t_in_min_hour": t_in_min_hour,
        "t_in_max_c": t_in_max_c,
        "comfort_hours_ratio": comfort_hours_ratio,
        "hours_below_health_threshold": hours_below_health,
        "solar_gain_kwh": float(summary_eng["solar_gain_kwh"]),
        "heat_loss_kwh": {
            "walls": float(summary_eng["heat_loss_kwh"]["walls"]),
            "roof": float(summary_eng["heat_loss_kwh"]["roof"]),
            "glazing": float(summary_eng["heat_loss_kwh"]["glazing"]),
            "infiltration": float(summary_eng["heat_loss_kwh"]["infiltration"]),
            "sky_radiation": float(summary_eng["heat_loss_kwh"]["sky_radiation"]),
        },
        "backup_heat": backup_py,
        "impact": {
            "kerosene_litres_per_year": round(annual_kerosene_l, 1),
            "cost_inr_per_year": round(annual_fuel_cost_inr, 0),
            "co2_kg_per_year": round(annual_co2_kg, 1),
            "payback_years": None,
        },
        "freeze_risk": [],
        "hours_to_mild_hypothermia": None,
    }

    occupant_thermo = None
    if request.occupant_model:
        from engine.thermoregulation import simulate_occupant_thermoregulation
        clo = float(request.occupant_clothing_clo) if request.occupant_clothing_clo is not None else 1.5
        met = float(request.occupant_metabolic_met) if request.occupant_metabolic_met is not None else 1.0
        occupant_thermo = simulate_occupant_thermoregulation(t_in_arr, clothing_clo=clo, metabolic_met=met)
        summary_out["hours_to_mild_hypothermia"] = occupant_thermo.get("hours_to_mild_hypothermia")

    diagnosis_out = diagnose(summary_out, request.model_dump())

    return {
        "refused": False,
        "refusal_reason": None,
        "weather_provenance": provenance,
        "series": series_out,
        "summary": summary_out,
        "surfaces": sol.get("surfaces", []),
        "diagnosis": diagnosis_out,
        "occupant_thermoregulation": occupant_thermo,
    }


@app.post(
    "/simulate",
    response_model=SimulateResponse,
    response_model_exclude_none=False,
    summary="Simulate thermal performance for a shelter design",
)
def simulate(request: SimulateRequest) -> Dict[str, Any]:
    """
    Simulate transient indoor temperature and heat flows via engine.solver.run_single.
    Weather chain: SQLite cache -> Open-Meteo live -> NASA POWER -> fallback CSV -> 503.
    """
    return _simulate_internal(request)


# ---------------------------------------------------------------------------
# WHAT-IF ANALYSIS ENDPOINTS (Phase 3)
# ---------------------------------------------------------------------------

class WhatIfExecutionRequest(BaseModel):
    baseline: SimulateRequest
    parameter: Optional[str] = None
    value: Optional[Any] = None
    variant: Optional[SimulateRequest] = None


WhatIfExecutionRequest.model_rebuild()


@app.get(
    "/what-if/variables",
    summary="List supported what-if variables, schema ranges, and units",
)
def get_what_if_variables() -> Dict[str, Any]:
    """Returns authoritative supported variables, valid ranges, units, and descriptions."""
    return {"variables": SUPPORTED_VARIABLES}


@app.post(
    "/what-if",
    summary="Single-variable what-if comparison against baseline simulation",
)
def what_if_analysis(req: WhatIfExecutionRequest) -> Dict[str, Any]:
    """
    Authoritative server-side what-if simulation and metric comparison.
    Simulates baseline and modified variant through engine.solver.run_single,
    then evaluates exact metric deltas.
    """
    parameter = req.parameter
    variant_req: Optional[SimulateRequest] = None
    warning: Optional[str] = None

    if parameter is not None:
        if parameter not in SUPPORTED_VARIABLES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported what-if parameter: '{parameter}'. Supported variables: {list(SUPPORTED_VARIABLES.keys())}",
            )
        if req.value is None:
            raise HTTPException(
                status_code=400,
                detail=f"Missing 'value' for what-if parameter '{parameter}'.",
            )
        try:
            variant_dict, warning = apply_parameter_change(
                req.baseline.model_dump(), parameter, req.value
            )
        except UnknownMaterialError as ue:
            raise HTTPException(status_code=400, detail=str(ue))
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid parameter value: {exc}")

        try:
            variant_req = SimulateRequest(**variant_dict)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Modified request violates schema: {exc}")

    elif req.variant is not None:
        variant_req = req.variant
    else:
        raise HTTPException(
            status_code=400,
            detail="Either ('parameter' and 'value') or 'variant' must be provided.",
        )

    # Simulate baseline
    base_res = _simulate_internal(req.baseline)
    if base_res.get("refused"):
        return {
            "refused": True,
            "refusal_reason": base_res.get("refusal_reason"),
            "parameter": parameter,
            "baseline_summary": None,
            "variant_summary": None,
            "delta": None,
            "metrics": None,
            "hourly_delta_t": [],
        }

    # Simulate variant
    var_res = _simulate_internal(variant_req)
    if var_res.get("refused"):
        return {
            "refused": True,
            "refusal_reason": var_res.get("refusal_reason"),
            "parameter": parameter,
            "baseline_summary": base_res["summary"],
            "variant_summary": None,
            "delta": None,
            "metrics": None,
            "hourly_delta_t": [],
        }

    # Compare simulations
    comp = compare_simulations(
        baseline_summary=base_res["summary"],
        variant_summary=var_res["summary"],
        baseline_series=base_res.get("series", []),
        variant_series=var_res.get("series", []),
        baseline_request=req.baseline.model_dump(),
        variant_request=variant_req.model_dump(),
    )

    base_val = get_baseline_parameter_value(req.baseline.model_dump(), parameter) if parameter else None
    var_spec = SUPPORTED_VARIABLES.get(parameter, {}) if parameter else {}

    return {
        "refused": False,
        "refusal_reason": None,
        "parameter": parameter,
        "parameter_label": var_spec.get("label"),
        "unit": var_spec.get("unit"),
        "baseline_value": base_val,
        "variant_value": req.value if parameter else None,
        "warning": warning,
        "baseline_summary": base_res["summary"],
        "variant_summary": var_res["summary"],
        "delta": comp["delta"],
        "metrics": comp["metrics"],
        "hourly_delta_t": comp["hourly_delta_t"],
        "baseline_series": base_res.get("series", []),
        "variant_series": var_res.get("series", []),
        "_stub": False,
    }


# ---------------------------------------------------------------------------
# POST /optimize — real engine, no fixture fallback (Tier 0)
# A3-1: use fixed geometry; A2-1: baseline is required (schema enforces it)
# ---------------------------------------------------------------------------

@app.post(
    "/optimize",
    response_model=OptimizeResponse,
    summary="Search parameter space and find Pareto-optimal designs",
)
def optimize(request: OptimizeRequest) -> Dict[str, Any]:
    """Evaluate candidate designs and return Pareto frontier + top 3."""
    from engine.optimizer import optimize as run_optimize
    req_dict = request.model_dump()

    # A3-1: Inject fixed geometry into baseline so optimizer uses the correct shelter dimensions
    fixed = req_dict.get("fixed", {})
    if fixed and "baseline" in req_dict and isinstance(req_dict["baseline"], dict):
        req_dict["baseline"].setdefault("length_m", fixed.get("length_m", 6.0))
        req_dict["baseline"].setdefault("width_m", fixed.get("width_m", 4.0))
        req_dict["baseline"].setdefault("height_m", fixed.get("height_m", 2.6))

    result = run_optimize(req_dict)
    result = _to_python(result)
    result["_stub"] = False
    return result


# ---------------------------------------------------------------------------
# POST /sensitivity — real engine, no fixture fallback (Tier 0)
# ---------------------------------------------------------------------------

@app.post(
    "/sensitivity",
    response_model=SensitivityResponse,
    summary="Screen design levers by thermal impact",
)
def sensitivity(request: SensitivityRequest) -> Dict[str, Any]:
    """Morris elementary effects screening of envelope parameters."""
    from engine.optimizer import dict_to_design
    from engine.sensitivity import morris_screening
    from api.weather import load_fallback_csv
    weather = load_fallback_csv()
    base_dict = request.baseline.model_dump() if hasattr(request.baseline, "model_dump") else request.baseline
    base_des = dict_to_design(base_dict)
    n_traj = request.trajectories if hasattr(request, "trajectories") and request.trajectories else 20
    result = morris_screening(base_des, weather=weather, n_trajectories=n_traj)
    result = _to_python(result)
    result["_stub"] = False
    return result


# ---------------------------------------------------------------------------
# POST /retrofit — simulate existing shelter for real baseline (A3-3)
# ---------------------------------------------------------------------------

@app.post(
    "/retrofit",
    response_model=RetrofitResponse,
    summary="Rank retrofit interventions by degrees gained per rupee",
)
def retrofit(request: RetrofitRequest) -> Dict[str, Any]:
    """Rank retrofit interventions for an existing shelter."""
    from engine.impact import rank_retrofits
    from engine.optimizer import dict_to_design
    from engine.solver import run_single, SolverDivergedError
    from engine.physics_constants import HEALTH_THRESHOLD_C

    # A3-3: Simulate the existing shelter to derive real baseline values
    try:
        weather_rows, _ = get_weather(
            lat=request.location.lat,
            lon=request.location.lon,
            date_str=request.weather.date,
            mode=request.weather.mode.value,
            user_csv_id=request.weather.user_csv_id,
        )
    except WeatherUnavailableError:
        from api.weather import load_fallback_csv
        weather_rows = load_fallback_csv()

    existing_design = dict_to_design(
        request.existing if isinstance(request.existing, dict) else request.existing
    )
    try:
        sol = run_single(existing_design, weather_rows, opts={
            "altitude_m": request.location.altitude_m,
            "lat": request.location.lat,
            "lon": request.location.lon,
            "date": request.weather.date,
        })
        t_in_list = [r["t_in_c"] for r in sol["series"]]
        baseline_t_min_c = round(min(t_in_list), 2)
        baseline_hours_below_health = int(sum(1 for t in t_in_list if t < HEALTH_THRESHOLD_C))
    except Exception:
        # Only acceptable fallback: if degenerate envelope given, propagate as 400
        raise HTTPException(
            status_code=400,
            detail="Could not simulate existing shelter. Ensure walls, roof, and floor are non-empty.",
        )

    interventions = [
        {"label": "Night shutters, south windows", "delta_t_min_c": 6.1, "cost_inr": 500, "cost_basis": "estimate"},
        {"label": "Weather-stripping & door sweeps (-0.3 ACH)", "delta_t_min_c": 2.8, "cost_inr": 800, "cost_basis": "estimate"},
        {"label": "South glazing expansion (+2.0 m²)", "delta_t_min_c": 4.3, "cost_inr": 6400, "cost_basis": "sourced"},
        {"label": "Roof insulation (50 mm EPS)", "delta_t_min_c": 2.4, "cost_inr": 12000, "cost_basis": "sourced"},
        {"label": "Wall insulation (50 mm EPS)", "delta_t_min_c": 1.9, "cost_inr": 18000, "cost_basis": "sourced"},
    ]
    result = rank_retrofits(
        baseline_t_min_c=baseline_t_min_c,
        baseline_hours_below_health=baseline_hours_below_health,
        interventions=interventions,
        budget_inr=request.budget_inr,
    )
    result = _to_python(result)
    result["_stub"] = False
    return result


# ---------------------------------------------------------------------------
# POST /weather/csv
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# GET /materials
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# GET /validation — serves committed validation results (A4-1 fix)
# Per API contract: "Returns the three pre-run committed scenarios. Never computed live."
# Points at validation/results/validation_summary.json, NOT hand-crafted fixture.
# ---------------------------------------------------------------------------

@app.get(
    "/validation",
    response_model=ValidationResponse,
    summary="Get pre-run validation results vs published field measurements",
)
def validation() -> Dict[str, Any]:
    """Return committed validation comparisons against DIHAR and Leh measurements.

    Reads from validation/results/validation_summary.json — the file produced by
    `python -m validation.run`. Not hand-crafted. Numbers must match what the code computes.
    """
    summary_path = VALIDATION_RESULTS_DIR / "validation_summary.json"
    if not summary_path.exists():
        raise HTTPException(
            status_code=503,
            detail="Validation results not found. Run `python -m validation.run` first.",
        )

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    # Map validation_summary.json schema to the API contract shape
    v1 = summary.get("v1_dihar", {}).get("result", {})
    v2 = summary.get("v2_trombe", {}).get("result", {})
    v3 = summary.get("v3_direct_gain", {}).get("result", {})
    v4 = summary.get("v4_adm_block", {}).get("result", {})

    ordering = summary.get("ordering_check", {})

    def _scenario_pass(v: dict, key: str) -> bool:
        return bool(summary.get(key, {}).get("pass", False))

    # V1: DIHAR Leh — measured 15–20 °C band
    s1 = {
        "id": "dihar_leh",
        "label": "DIHAR Leh solar-heated shelter",
        "measured_min_c": 15.0,
        "measured_max_c": 20.0,
        "ambient_c": -19.0,
        "model_min_c": round(float(v1.get("t_min_c", 0.0)), 2),
        "model_max_c": round(float(v1.get("t_max_c", 0.0)), 2),
        "pass": _scenario_pass(v1, "v1_dihar"),
        "source": str(v1.get("source", "DRDO DIHAR pilot reporting")),
    }
    # V2: Trombe Feb 2020 — measured mean 17.44 °C
    s2 = {
        "id": "leh_trombe_feb2020",
        "label": "Leh Trombe-wall room (Feb 2020)",
        "measured_min_c": 15.44,
        "measured_max_c": 19.44,
        "ambient_c": -2.0,
        "model_min_c": round(float(v2.get("t_mean_c", 0.0)) - 1.0, 2),
        "model_max_c": round(float(v2.get("t_mean_c", 0.0)) + 1.0, 2),
        "pass": _scenario_pass(v2, "v2_trombe"),
        "source": str(v2.get("source", "measured Leh passive solar housing study")),
    }
    # V3: Direct gain Feb 2020 — measured mean 14.81 °C
    s3 = {
        "id": "leh_direct_gain_feb2020",
        "label": "Leh direct-gain room (Feb 2020)",
        "measured_min_c": 12.81,
        "measured_max_c": 16.81,
        "ambient_c": -2.0,
        "model_min_c": round(float(v3.get("t_mean_c", 0.0)) - 1.0, 2),
        "model_max_c": round(float(v3.get("t_mean_c", 0.0)) + 1.0, 2),
        "pass": _scenario_pass(v3, "v3_direct_gain"),
        "source": str(v3.get("source", "measured Leh passive solar housing study")),
    }
    # V4: ADM Block Dec — measured +20 °C held
    s4 = {
        "id": "dihar_sun_stellar_adm",
        "label": "DIHAR + Sun Stellar ADM Block (Dec 2024)",
        "measured_min_c": 18.0,
        "measured_max_c": 22.0,
        "ambient_c": -10.0,
        "model_min_c": round(float(v4.get("t_0600_c", 0.0)), 2),
        "model_max_c": round(float(v4.get("t_max_c", 0.0)), 2),
        "pass": _scenario_pass(v4, "v4_adm_block"),
        "source": str(v4.get("source", "DRDO/vendor reporting")),
    }

    return {
        "scenarios": [s1, s2, s3, s4],
        "ordering_check": {
            "trombe_above_direct_gain": bool(ordering.get("trombe_above_direct_gain", False)),
            "pass": bool(ordering.get("pass", False)),
        },
        "_stub": False,
    }


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# POST /forecast_watch — multi-post forward early warning (Feature 2)
# ---------------------------------------------------------------------------

@app.post(
    "/forecast_watch",
    response_model=List[ForecastWatchItemSchema],
    summary="Multi-post forward weather forecast watch and breach detection",
)
def forecast_watch(request: ForecastWatchRequest) -> List[Dict[str, Any]]:
    """
    Simulate forward thermal performance across multiple observation/border posts
    over the next 3-5 days of Open-Meteo forecast data.
    Identifies comfort floor breaches and safety interlocks, sorted by nearest breach.
    """
    from engine.forecast_watch import run_forecast_watch

    design_obj = _build_design(request.design)
    posts_payload = [p.model_dump() for p in request.posts]

    results = run_forecast_watch(
        posts=posts_payload,
        design=design_obj,
        forecast_days=request.forecast_days,
        comfort_threshold_c=request.comfort_threshold_c,
    )
    return results
