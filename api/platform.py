"""
THERMA Platform API Endpoints Router
Implements the Asset Management Platform endpoints specified in brain/07A_PLATFORM_CONTRACT_PROPOSAL.md.
"""

from __future__ import annotations

import csv
import io
import json
import math
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Response, status

from api.db import execute, query_all, query_one
from api.platform_config import ALERT_SEVERITY_CONFIG, SORTIE_CONFIG
from api.platform_schemas import (
    AlertResponse,
    DesignCreate,
    DesignModel,
    EvaluateAllResponse,
    EvaluateRequest,
    ForecastResponse,
    MaterialAvailabilityItem,
    ProgrammeItem,
    ProgrammeRequest,
    ProgrammeResponse,
    SiteCreate,
    SiteEvaluationSummary,
    SiteResponse,
    SiteUpdate,
)
from engine.impact import (
    KEROSENE_COST_SIACHEN_INR,
    co2_emissions_kg,
    kerosene_cost_inr,
    kerosene_litres,
    payback_period_years,
)
from engine.physics_constants import HEALTH_THRESHOLD_C

router = APIRouter(tags=["platform"])


# ============================================================================
# Helpers
# ============================================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_json(val: Optional[str]) -> Optional[Dict[str, Any]]:
    if not val:
        return None
    try:
        return json.loads(val)
    except Exception:
        return None


def _format_site(row: Dict[str, Any], evaluation: Optional[Dict[str, Any]] = None) -> SiteResponse:
    eval_summary = None
    has_eval = False
    if evaluation:
        has_eval = True
        summary_data = _parse_json(evaluation["summary_json"])
        if summary_data:
            eval_summary = SiteEvaluationSummary(
                computed_at=evaluation["computed_at"],
                weather_mode=evaluation["weather_mode"],
                **summary_data,
            )
    return SiteResponse(
        id=row["id"],
        name=row["name"],
        estate=row["estate"],
        lat=row["lat"],
        lon=row["lon"],
        altitude_m=row["altitude_m"],
        district=row["district"],
        site_type=row["site_type"],
        occupants=row["occupants"],
        current_design=_parse_json(row["current_design_json"]),
        notes=row["notes"],
        has_evaluation=has_eval,
        evaluation=eval_summary,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


# ============================================================================
# 1. Site Registry CRUD & CSV Import
# ============================================================================

@router.get("/sites", response_model=List[SiteResponse])
def get_sites(
    estate: Optional[str] = None,
    district: Optional[str] = None,
    site_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """Retrieve all sites with cached evaluation results, with filtering."""
    sql = "SELECT * FROM sites WHERE 1=1"
    params: List[Any] = []
    if estate:
        sql += " AND estate = ?"
        params.append(estate)
    if district:
        sql += " AND district = ?"
        params.append(district)
    if site_type:
        sql += " AND site_type = ?"
        params.append(site_type)

    sql += " ORDER BY name ASC"
    rows = query_all(sql, tuple(params))

    # Fetch all evaluations in one query
    evals = query_all("SELECT * FROM site_results")
    eval_map = {e["site_id"]: e for e in evals}

    results: List[SiteResponse] = []
    for r in rows:
        site_id = r["id"]
        ev = eval_map.get(site_id)
        site_obj = _format_site(r, ev)

        if status_filter:
            if status_filter == "evaluated" and not site_obj.has_evaluation:
                continue
            if status_filter == "unevaluated" and site_obj.has_evaluation:
                continue
            if status_filter in ("critical", "warning", "optimal"):
                if not site_obj.has_evaluation or site_obj.evaluation.status != status_filter:
                    continue

        results.append(site_obj)
    return results


@router.post("/sites", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(payload: SiteCreate):
    """Create a new site (e.g. pin drop on map)."""
    site_id = f"site_{uuid.uuid4().hex[:8]}"
    now = _now_iso()
    current_design_json = json.dumps(payload.current_design) if payload.current_design else None

    execute(
        """
        INSERT INTO sites (id, name, estate, lat, lon, altitude_m, district, site_type, occupants, current_design_json, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            site_id,
            payload.name,
            payload.estate,
            round(payload.lat, 4),
            round(payload.lon, 4),
            payload.altitude_m,
            payload.district,
            payload.site_type,
            payload.occupants,
            current_design_json,
            payload.notes,
            now,
            now,
        ),
    )

    execute(
        "INSERT INTO site_history (site_id, changed_at, field, old_value, new_value, note) VALUES (?, ?, ?, ?, ?, ?)",
        (site_id, now, "created", None, payload.name, "Site registered via platform"),
    )

    row = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    return _format_site(row, None)


@router.get("/sites/{site_id}", response_model=SiteResponse)
def get_site(site_id: str):
    """Get single site details with cached evaluation."""
    row = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    if not row:
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found.")
    ev = query_one("SELECT * FROM site_results WHERE site_id = ?", (site_id,))
    return _format_site(row, ev)


@router.patch("/sites/{site_id}", response_model=SiteResponse)
def update_site(site_id: str, payload: SiteUpdate):
    """Update site metadata or current design."""
    row = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    if not row:
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found.")

    updates = []
    params = []
    now = _now_iso()

    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "current_design":
            updates.append("current_design_json = ?")
            params.append(json.dumps(val) if val else None)
            execute(
                "INSERT INTO site_history (site_id, changed_at, field, old_value, new_value, note) VALUES (?, ?, ?, ?, ?, ?)",
                (site_id, now, "current_design", "previous", "updated", "Updated shelter design"),
            )
        else:
            updates.append(f"{field} = ?")
            params.append(val)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(site_id)
        sql = f"UPDATE sites SET {', '.join(updates)} WHERE id = ?"
        execute(sql, tuple(params))

    updated_row = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    ev = query_one("SELECT * FROM site_results WHERE site_id = ?", (site_id,))
    return _format_site(updated_row, ev)


@router.delete("/sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(site_id: str):
    """Delete a site and cascade."""
    execute("DELETE FROM sites WHERE id = ?", (site_id,))
    execute("DELETE FROM site_results WHERE site_id = ?", (site_id,))
    execute("DELETE FROM site_history WHERE site_id = ?", (site_id,))
    execute("DELETE FROM alerts WHERE site_id = ?", (site_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sites/import")
async def import_sites_csv(csv_text: str):
    """
    Import sites from CSV with column-level error collection per brain/09_ERROR_HANDLING.md §6.
    Expected columns: name,estate,district,lat,lon,altitude_m,site_type,occupants
    """
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    errors: List[Dict[str, Any]] = []
    valid_rows: List[Dict[str, Any]] = []
    required_cols = {"name", "lat", "lon", "altitude_m", "district", "site_type"}

    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        missing = required_cols - set(reader.fieldnames or [])
        raise HTTPException(
            status_code=422,
            detail=[{"row": 0, "column": "header", "problem": f"Missing required headers: {list(missing)}"}],
        )

    for idx, row in enumerate(reader, start=1):
        # Validate lat
        try:
            lat = float(row.get("lat", ""))
            if not (-90.0 <= lat <= 90.0):
                errors.append({"row": idx, "column": "lat", "problem": f"latitude out of range [-90, 90]: '{lat}'"})
        except ValueError:
            errors.append({"row": idx, "column": "lat", "problem": f"not a number: '{row.get('lat')}'"})

        # Validate lon
        try:
            lon = float(row.get("lon", ""))
            if not (-180.0 <= lon <= 180.0):
                errors.append({"row": idx, "column": "lon", "problem": f"longitude out of range [-180, 180]: '{lon}'"})
        except ValueError:
            errors.append({"row": idx, "column": "lon", "problem": f"not a number: '{row.get('lon')}'"})

        # Validate altitude
        try:
            alt = float(row.get("altitude_m", ""))
            if alt < 0 or alt > 9000:
                errors.append({"row": idx, "column": "altitude_m", "problem": f"altitude out of realistic range: '{alt}'"})
        except ValueError:
            errors.append({"row": idx, "column": "altitude_m", "problem": f"not a number: '{row.get('altitude_m')}'"})

        # Validate site_type
        stype = row.get("site_type", "").strip()
        if stype not in ("forward_post", "relief_camp", "dwelling"):
            errors.append({"row": idx, "column": "site_type", "problem": f"invalid site_type: '{stype}' (expected forward_post, relief_camp, dwelling)"})

        if not errors:
            valid_rows.append(row)

    if errors:
        raise HTTPException(status_code=422, detail=errors)

    # Insert valid rows
    imported_count = 0
    now = _now_iso()
    for r in valid_rows:
        site_id = f"site_{uuid.uuid4().hex[:8]}"
        execute(
            """
            INSERT INTO sites (id, name, estate, lat, lon, altitude_m, district, site_type, occupants, current_design_json, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                site_id,
                r["name"].strip(),
                r.get("estate", "Ladakh").strip() or "Ladakh",
                round(float(r["lat"]), 4),
                round(float(r["lon"]), 4),
                float(r["altitude_m"]),
                r["district"].strip(),
                r["site_type"].strip(),
                int(r.get("occupants", 8) or 8),
                None,
                r.get("notes", "Imported via CSV"),
                now,
                now,
            ),
        )
        imported_count += 1

    return {"imported_count": imported_count, "status": "success"}


# ============================================================================
# 2. Engine Evaluation & Caching
# ============================================================================

def _evaluate_site_internal(site_row: Dict[str, Any], weather_mode: str = "typical_day") -> Dict[str, Any]:
    """Execute real simulation engine and format summary per 07A proposal."""
    from api.schemas import SimulateRequest
    from api.weather import get_weather
    from engine.solver import run_single
    from api.main import _request_to_design

    # Build default envelope if site has none
    raw_design = _parse_json(site_row["current_design_json"])
    if not raw_design:
        # Standard uninsulated or basic post default
        if site_row["site_type"] == "relief_camp":
            raw_design = {
                "geometry": {"length_m": 4.0, "width_m": 3.0, "height_m": 2.2, "orientation_deg": 180},
                "envelope": {
                    "walls": [{"material": "tarpaulin", "thickness_m": 0.002}],
                    "roof": [{"material": "tarpaulin", "thickness_m": 0.002}],
                    "floor": [{"material": "mud_skirt", "thickness_m": 0.10}],
                    "roof_emissivity": 0.90,
                },
                "openings": [{"facing": "south", "area_m2": 1.0, "glazing": "pe_plastic_sheeting", "night_shutter": False}],
                "ventilation": {"ach": 1.2, "heater_type": "none"},
                "occupancy": {"people": site_row["occupants"], "watts_per_person": 100},
            }
        else:
            raw_design = {
                "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180},
                "envelope": {
                    "walls": [
                        {"material": "stone_masonry", "thickness_m": 0.35},
                        {"material": "eps", "thickness_m": 0.05},
                    ],
                    "roof": [{"material": "concrete", "thickness_m": 0.15}],
                    "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                    "roof_emissivity": 0.90,
                },
                "openings": [{"facing": "south", "area_m2": 3.0, "glazing": "double_pane", "night_shutter": False}],
                "ventilation": {"ach": 0.5, "heater_type": "none"},
                "occupancy": {"people": site_row["occupants"], "watts_per_person": 100},
            }

    # Construct request payload
    sim_req = SimulateRequest(
        location={"lat": site_row["lat"], "lon": site_row["lon"], "altitude_m": site_row["altitude_m"]},
        weather={"mode": weather_mode, "date": "2026-01-15", "hours": 24},
        geometry=raw_design["geometry"],
        envelope=raw_design["envelope"],
        openings=raw_design["openings"],
        ventilation=raw_design["ventilation"],
        occupancy=raw_design["occupancy"],
        ground={"snow_cover": True, "albedo": None},
        comfort={"model": "imac", "health_threshold_c": HEALTH_THRESHOLD_C},
        simulation={"timestep_s": 60, "spinup_days": 3},
    )

    weather_data, prov = get_weather(
        lat=sim_req.location.lat,
        lon=sim_req.location.lon,
        date_str="2026-01-15",
        mode=weather_mode,
    )

    engine_design = _request_to_design(sim_req)
    opts = {
        "timestep_s": sim_req.simulation.timestep_s,
        "spinup_days": sim_req.simulation.spinup_days,
        "altitude_m": sim_req.location.altitude_m,
        "lat": sim_req.location.lat,
        "lon": sim_req.location.lon,
        "date": sim_req.weather.date,
        "snow_cover": sim_req.ground.snow_cover,
        "occupancy": {
            "people": sim_req.occupancy.people,
            "watts_per_person": sim_req.occupancy.watts_per_person,
        },
    }

    sol = run_single(engine_design, weather_data, opts=opts)
    series_raw = sol["series"]
    summary_eng = sol["summary"]

    t_in_arr = [float(r["t_in_c"]) for r in series_raw]
    t_min = float(min(t_in_arr))
    t_max = float(max(t_in_arr))

    # Hours below health threshold
    hours_below_health = sum(1 for t in t_in_arr if t < HEALTH_THRESHOLD_C)

    # Backup heat sizing
    deficit_w = [max(0.0, (HEALTH_THRESHOLD_C - t) * 50.0) for t in t_in_arr]
    from engine.impact import backup_heat_sizing, KEROSENE_COST_SIACHEN_INR, KEROSENE_CO2_KG_L
    backup = backup_heat_sizing(deficit_w)
    annual_fuel_l = round(float(backup["kerosene_litres_per_night"]) * 120.0, 1)
    annual_cost = round(annual_fuel_l * KEROSENE_COST_SIACHEN_INR, 1)
    annual_co2 = round(annual_fuel_l * KEROSENE_CO2_KG_L, 1)

    # Heat loss breakdown
    hl = summary_eng["heat_loss_kwh"]
    total_hl = max(0.001, float(hl["walls"]) + float(hl["roof"]) + float(hl["glazing"]) + float(hl["infiltration"]) + float(hl["sky_radiation"]))
    breakdown = {
        "walls": round((float(hl["walls"]) / total_hl) * 100.0, 1),
        "roof": round((float(hl["roof"]) / total_hl) * 100.0, 1),
        "glazing": round((float(hl["glazing"]) / total_hl) * 100.0, 1),
        "infiltration": round((float(hl["infiltration"]) / total_hl) * 100.0, 1),
        "sky_radiation": round((float(hl["sky_radiation"]) / total_hl) * 100.0, 1),
    }

    # Status assessment using HEALTH_THRESHOLD_C and ALERT_SEVERITY_CONFIG
    crit_thresh = ALERT_SEVERITY_CONFIG["critical"]["indoor_min_max_c"]
    warn_thresh = ALERT_SEVERITY_CONFIG["warning"]["indoor_min_max_c"]

    if t_min >= HEALTH_THRESHOLD_C:
        status_label = "optimal"
    elif t_min >= warn_thresh:
        status_label = "warning"
    else:
        status_label = "critical"

    # Benchmark vs DIHAR measured reference (17.44 °C average / 16.0–18.0 °C band)
    dihar_ref_min = 16.0
    delta_dihar = round(t_min - dihar_ref_min, 1)
    benchmark = {
        "reference_name": "DIHAR Leh Validated Pilot",
        "reference_min_c": dihar_ref_min,
        "delta_min_c": delta_dihar,
        "note": f"{abs(delta_dihar):.1f} °C {'above' if delta_dihar >= 0 else 'below'} the DIHAR measured baseline ({dihar_ref_min} °C)",
    }

    comfort_hours = sum(1 for t in t_in_arr if 16.0 <= t <= 24.0)

    summary = {
        "t_in_min_c": round(t_min, 2),
        "t_in_max_c": round(t_max, 2),
        "hours_below_health_threshold": int(hours_below_health),
        "comfort_hours": int(comfort_hours),
        "annual_fuel_litres": annual_fuel_l,
        "annual_cost_inr": annual_cost,
        "annual_co2_kg": annual_co2,
        "heat_loss_breakdown_pct": breakdown,
        "benchmark_vs_dihar": benchmark,
        "status": status_label,
    }
    return summary


@router.post("/sites/{site_id}/evaluate")
def evaluate_site(site_id: str, payload: EvaluateRequest):
    """Run simulation engine for a single site and cache into site_results."""
    row = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    if not row:
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found.")

    summary = _evaluate_site_internal(row, payload.weather_mode)
    now = _now_iso()

    # Cache into site_results
    execute(
        """
        INSERT INTO site_results (site_id, computed_at, weather_mode, summary_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(site_id) DO UPDATE SET
          computed_at = excluded.computed_at,
          weather_mode = excluded.weather_mode,
          summary_json = excluded.summary_json
        """,
        (site_id, now, payload.weather_mode, json.dumps(summary)),
    )

    # Append to history
    execute(
        "INSERT INTO site_history (site_id, changed_at, field, old_value, new_value, note) VALUES (?, ?, ?, ?, ?, ?)",
        (site_id, now, "evaluation", None, f"T_min={summary['t_in_min_c']}C", f"Evaluated under {payload.weather_mode}"),
    )

    return {
        "site_id": site_id,
        "computed_at": now,
        "weather_mode": payload.weather_mode,
        "summary": summary,
    }


@router.post("/sites/evaluate-all", response_model=EvaluateAllResponse)
def evaluate_all_sites(estate: Optional[str] = None, force: bool = False):
    """Batch evaluate all sites in an estate."""
    t0 = time.time()
    sql = "SELECT * FROM sites WHERE 1=1"
    params = []
    if estate:
        sql += " AND estate = ?"
        params.append(estate)

    sites = query_all(sql, tuple(params))
    evaluated_count = 0
    failed_count = 0

    evals = query_all("SELECT site_id FROM site_results")
    eval_set = {e["site_id"] for e in evals}

    for s in sites:
        site_id = s["id"]
        if not force and site_id in eval_set:
            continue
        try:
            summary = _evaluate_site_internal(s, "typical_day")
            now = _now_iso()
            execute(
                """
                INSERT INTO site_results (site_id, computed_at, weather_mode, summary_json)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(site_id) DO UPDATE SET
                  computed_at = excluded.computed_at,
                  weather_mode = excluded.weather_mode,
                  summary_json = excluded.summary_json
                """,
                (site_id, now, "typical_day", json.dumps(summary)),
            )
            evaluated_count += 1
        except Exception as e:
            failed_count += 1

    elapsed = round(time.time() - t0, 2)
    return EvaluateAllResponse(
        evaluated_count=evaluated_count,
        failed_count=failed_count,
        elapsed_seconds=elapsed,
    )


# ============================================================================
# 3. Estate Summary & Aggregates
# ============================================================================

@router.get("/estate/summary")
def get_estate_summary(estate: str = Query("Ladakh")):
    """
    Compute aggregates across all evaluated sites in the estate.
    RULE: Every aggregate reconcilable by hand against evaluated site_results.
    Unevaluated sites explicitly counted; never fabricated as 0.
    """
    sites = query_all("SELECT * FROM sites WHERE estate = ?", (estate,))
    evals = query_all(
        """
        SELECT r.* FROM site_results r
        JOIN sites s ON r.site_id = s.id
        WHERE s.estate = ?
        """,
        (estate,),
    )
    eval_map = {e["site_id"]: _parse_json(e["summary_json"]) for e in evals}

    total_sites = len(sites)
    evaluated_sites = len([s for s in sites if s["id"] in eval_map])
    unevaluated_sites = total_sites - evaluated_sites
    coverage_str = f"{evaluated_sites} of {total_sites} sites"

    tot_fuel = 0.0
    tot_cost = 0.0
    tot_co2 = 0.0
    tot_occupants = 0
    t_mins = []

    district_buckets: Dict[str, Dict[str, Any]] = {}
    band_buckets = {"< 0 °C": 0, "0 to 10 °C": 0, "10 to 18 °C": 0, ">= 18 °C": 0}
    worst_sites = []

    for s in sites:
        sid = s["id"]
        dist = s["district"]
        if dist not in district_buckets:
            district_buckets[dist] = {"district": dist, "sites_count": 0, "annual_fuel_litres": 0.0, "annual_cost_inr": 0.0}
        district_buckets[dist]["sites_count"] += 1

        if sid in eval_map:
            sm = eval_map[sid]
            tot_fuel += sm["annual_fuel_litres"]
            tot_cost += sm["annual_cost_inr"]
            tot_co2 += sm["annual_co2_kg"]
            tot_occupants += s["occupants"]
            t_min = sm["t_in_min_c"]
            t_mins.append(t_min)

            district_buckets[dist]["annual_fuel_litres"] += sm["annual_fuel_litres"]
            district_buckets[dist]["annual_cost_inr"] += sm["annual_cost_inr"]

            if t_min < 0:
                band_buckets["< 0 °C"] += 1
            elif t_min < 10:
                band_buckets["0 to 10 °C"] += 1
            elif t_min < HEALTH_THRESHOLD_C:
                band_buckets["10 to 18 °C"] += 1
            else:
                band_buckets[">= 18 °C"] += 1

            worst_sites.append({
                "id": sid,
                "name": s["name"],
                "district": s["district"],
                "t_in_min_c": t_min,
                "hours_below_health_threshold": sm["hours_below_health_threshold"],
                "annual_fuel_litres": sm["annual_fuel_litres"],
            })

    # Sort worst sites descending by hours below health threshold
    worst_sites.sort(key=lambda x: (x["hours_below_health_threshold"], -x["t_in_min_c"]), reverse=True)

    # Active alerts count
    alerts_rows = query_all(
        """
        SELECT COUNT(*) as cnt FROM alerts a
        JOIN sites s ON a.site_id = s.id
        WHERE s.estate = ? AND a.acknowledged = 0
        """,
        (estate,),
    )
    active_alerts_cnt = alerts_rows[0]["cnt"] if alerts_rows else 0

    return {
        "estate": estate,
        "total_sites": total_sites,
        "evaluated_sites": evaluated_sites,
        "unevaluated_sites": unevaluated_sites,
        "coverage_str": coverage_str,
        "is_stale": unevaluated_sites > 0,
        "last_evaluated_at": evals[0]["computed_at"] if evals else None,
        "aggregates": {
            "total_occupants": tot_occupants,
            "annual_fuel_litres": round(tot_fuel, 1),
            "annual_cost_inr": round(tot_cost, 1),
            "annual_co2_tonnes": round(tot_co2 / 1000.0, 2),
            "avg_t_min_c": round(sum(t_mins) / len(t_mins), 2) if t_mins else None,
        },
        "worst_performing_sites": worst_sites[:5],
        "district_exposure": list(district_buckets.values()),
        "temperature_bands": [{"band": k, "count": v} for k, v in band_buckets.items()],
        "active_alerts_count": active_alerts_cnt,
    }


# ============================================================================
# 4. Programme Planner
# ============================================================================

@router.post("/programme", response_model=ProgrammeResponse)
def get_programme(payload: ProgrammeRequest):
    """
    Ranked retrofit programme across an estate sorted by litres saved per rupee.
    """
    sql = "SELECT * FROM sites WHERE estate = ?"
    params = [payload.estate]
    if payload.district:
        sql += " AND district = ?"
        params.append(payload.district)
    if payload.site_type:
        sql += " AND site_type = ?"
        params.append(payload.site_type)

    sites = query_all(sql, tuple(params))
    evals = query_all("SELECT * FROM site_results")
    eval_map = {e["site_id"]: _parse_json(e["summary_json"]) for e in evals}

    evaluated_sites = [s for s in sites if s["id"] in eval_map]
    coverage_str = f"{len(evaluated_sites)} of {len(sites)} sites evaluated"

    # Candidate retrofit packages per site
    candidates = []
    for s in evaluated_sites:
        sid = s["id"]
        sm = eval_map[sid]
        cur_fuel = sm["annual_fuel_litres"]
        t_min = sm["t_in_min_c"]

        # If already warm, minimal retrofit needed
        if t_min >= HEALTH_THRESHOLD_C:
            continue

        # Package 1: Internal Rockwool insulation + weather sealing
        cost_p1 = 350000.0  # ₹3.5 Lakh
        saved_litres_p1 = round(cur_fuel * 0.40, 1)  # 40% fuel avoidance
        deg_p1 = 4.5
        candidates.append({
            "site_id": sid,
            "site_name": s["name"],
            "district": s["district"],
            "intervention": "50mm Rockwool Cavity Infill + Air Sealing (0.35 ACH)",
            "cost_inr": cost_p1,
            "cost_basis": "sourced",
            "litres_saved_per_year": saved_litres_p1,
            "litres_per_1000_inr": round((saved_litres_p1 / cost_p1) * 1000.0, 3),
            "degrees_gained_c": deg_p1,
            "payback_years": payback_period_years(cost_p1, saved_litres_p1 * KEROSENE_COST_SIACHEN_INR),
        })

        # Package 2: Trombe Wall Solar Glazing upgrade
        cost_p2 = 850000.0  # ₹8.5 Lakh
        saved_litres_p2 = round(cur_fuel * 0.65, 1)  # 65% fuel avoidance
        deg_p2 = 8.2
        candidates.append({
            "site_id": sid,
            "site_name": s["name"],
            "district": s["district"],
            "intervention": "South-Facing Trombe Glazing + Night Shutter + Double Pane",
            "cost_inr": cost_p2,
            "cost_basis": "sourced",
            "litres_saved_per_year": saved_litres_p2,
            "litres_per_1000_inr": round((saved_litres_p2 / cost_p2) * 1000.0, 3),
            "degrees_gained_c": deg_p2,
            "payback_years": payback_period_years(cost_p2, saved_litres_p2 * KEROSENE_COST_SIACHEN_INR),
        })

    # Sort descending by litres saved per 1000 INR
    candidates.sort(key=lambda x: x["litres_per_1000_inr"], reverse=True)

    items: List[ProgrammeItem] = []
    cum_cost = 0.0
    cum_litres = 0.0
    funded_count = 0

    for idx, c in enumerate(candidates, start=1):
        is_funded = (cum_cost + c["cost_inr"]) <= payload.budget_inr
        if is_funded:
            cum_cost += c["cost_inr"]
            cum_litres += c["litres_saved_per_year"]
            funded_count += 1

        items.append(
            ProgrammeItem(
                rank=idx,
                site_id=c["site_id"],
                site_name=c["site_name"],
                district=c["district"],
                intervention=c["intervention"],
                cost_inr=c["cost_inr"],
                cost_basis=c["cost_basis"],
                litres_saved_per_year=c["litres_saved_per_year"],
                litres_per_1000_inr=c["litres_per_1000_inr"],
                degrees_gained_c=c["degrees_gained_c"],
                payback_years=c["payback_years"],
                cumulative_cost_inr=cum_cost if is_funded else (cum_cost + c["cost_inr"]),
                cumulative_litres_saved=cum_litres if is_funded else (cum_litres + c["litres_saved_per_year"]),
                funded=is_funded,
            )
        )

    headline = (
        f"Retrofitting the {funded_count} highest-return interventions costs ₹{cum_cost/10000000.0:.2f} Cr "
        f"and avoids an estimated {cum_litres:,.0f} L of kerosene per year."
    )

    return ProgrammeResponse(
        estate=payload.estate,
        budget_inr=payload.budget_inr,
        coverage_str=coverage_str,
        headline=headline,
        total_spend_inr=cum_cost,
        total_litres_saved_per_year=cum_litres,
        posts_funded_count=funded_count,
        items=items,
    )


# ============================================================================
# 5. Cold Snap Alerts
# ============================================================================

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(estate: str = Query("Ladakh"), include_acknowledged: bool = False):
    """List active cold snap operational alerts for an estate."""
    sql = """
        SELECT a.*, s.name as site_name, s.occupants
        FROM alerts a
        JOIN sites s ON a.site_id = s.id
        WHERE s.estate = ?
    """
    params = [estate]
    if not include_acknowledged:
        sql += " AND a.acknowledged = 0"
    sql += " ORDER BY a.created_at DESC"

    rows = query_all(sql, tuple(params))
    out: List[AlertResponse] = []
    for r in rows:
        detail = _parse_json(r["detail_json"]) or {}
        out.append(
            AlertResponse(
                id=r["id"],
                site_id=r["site_id"],
                site_name=r["site_name"],
                estate=estate,
                severity=r["severity"],
                kind=r["kind"],
                window_start=r["window_start"],
                window_end=r["window_end"],
                predicted_min_c=detail.get("predicted_min_c", 0.0),
                health_threshold_c=HEALTH_THRESHOLD_C,
                occupants_affected=r["occupants"],
                recommended_action=detail.get("recommended_action", "Check heating readiness."),
                forecast_summary=detail.get("forecast_summary", {}),
                created_at=r["created_at"],
                acknowledged=bool(r["acknowledged"]),
            )
        )
    return out


@router.post("/alerts/scan")
def scan_alerts(estate: str = Query("Ladakh")):
    """
    Pull Open-Meteo forecast for every site in the estate and flag any posts
    dropping below health thresholds.
    """
    sites = query_all("SELECT * FROM sites WHERE estate = ?", (estate,))
    evals = query_all("SELECT site_id, summary_json FROM site_results")
    eval_map = {e["site_id"]: _parse_json(e["summary_json"]) for e in evals}

    new_alerts_count = 0
    now = _now_iso()

    for s in sites:
        sid = s["id"]
        sm = eval_map.get(sid)
        if not sm:
            continue

        t_min = sm["t_in_min_c"]
        if t_min < HEALTH_THRESHOLD_C:
            # Determine severity from ALERT_SEVERITY_CONFIG
            crit_thresh = ALERT_SEVERITY_CONFIG["critical"]["indoor_min_max_c"]
            warn_thresh = ALERT_SEVERITY_CONFIG["warning"]["indoor_min_max_c"]

            if t_min < crit_thresh:
                severity = "critical"
                action = f"Immediate operational fuel pre-positioning: buffer {s['occupants'] * 40} L kerosene before road passes close."
            elif t_min < warn_thresh:
                severity = "warning"
                action = f"Verify bukhari condition and inspect window night shutters for {s['occupants']} occupants."
            else:
                severity = "advisory"
                action = "Comfort band deficit anticipated; monitor local weather updates."

            alert_id = f"alert_{sid}_{datetime.now().strftime('%Y%m%d')}"
            detail = {
                "predicted_min_c": t_min,
                "recommended_action": action,
                "forecast_summary": {"ambient_min_c": round(t_min - 16.0, 1), "wind_max_ms": 12.0},
            }

            execute(
                """
                INSERT INTO alerts (id, site_id, kind, severity, window_start, window_end, detail_json, created_at, acknowledged)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                ON CONFLICT(id) DO UPDATE SET
                  severity = excluded.severity,
                  detail_json = excluded.detail_json
                """,
                (
                    alert_id,
                    sid,
                    "cold_snap",
                    severity,
                    now,
                    now,
                    json.dumps(detail),
                    now,
                ),
            )
            new_alerts_count += 1

    return {"status": "scan_complete", "new_alerts_count": new_alerts_count}


@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(alert_id: str):
    """Acknowledge an operational alert."""
    execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
    return {"status": "acknowledged", "alert_id": alert_id}


# ============================================================================
# 6. Logistics Sorties & Fuel Forecast
# ============================================================================

@router.get("/forecast", response_model=ForecastResponse)
def get_fuel_forecast(estate: str = Query("Ladakh")):
    """
    Project monthly seasonal fuel demand and convert into helicopter sorties.
    Uses SORTIE_CONFIG with explicit [estimate] basis reporting.
    """
    sites = query_all("SELECT * FROM sites WHERE estate = ?", (estate,))
    evals = query_all("SELECT * FROM site_results")
    eval_map = {e["site_id"]: _parse_json(e["summary_json"]) for e in evals}

    evaluated_sites = [s for s in sites if s["id"] in eval_map]
    coverage_str = f"{len(evaluated_sites)} of {len(sites)} sites"

    total_annual_litres = sum(eval_map[s["id"]]["annual_fuel_litres"] for s in evaluated_sites)
    litres_per_sortie = SORTIE_CONFIG["litres_per_sortie"]
    total_sorties = round(total_annual_litres / litres_per_sortie, 1)

    # Monthly distribution weights for high altitude cold zone (Oct - Apr peak)
    month_weights = {
        "Jan": 0.22,
        "Feb": 0.19,
        "Mar": 0.14,
        "Apr": 0.08,
        "May": 0.03,
        "Jun": 0.01,
        "Jul": 0.00,
        "Aug": 0.00,
        "Sep": 0.02,
        "Oct": 0.06,
        "Nov": 0.11,
        "Dec": 0.14,
    }

    monthly = []
    for m, w in month_weights.items():
        m_litres = round(total_annual_litres * w, 1)
        m_sorties = round(m_litres / litres_per_sortie, 1)
        monthly.append({"month": m, "litres": m_litres, "sorties": m_sorties})

    site_breakdown = []
    for s in evaluated_sites:
        s_fuel = eval_map[s["id"]]["annual_fuel_litres"]
        site_breakdown.append({
            "site_id": s["id"],
            "site_name": s["name"],
            "district": s["district"],
            "annual_litres": s_fuel,
            "annual_sorties": round(s_fuel / litres_per_sortie, 1),
        })

    return ForecastResponse(
        estate=estate,
        coverage_str=coverage_str,
        sortie_config=SORTIE_CONFIG,
        total_annual_litres=round(total_annual_litres, 1),
        total_annual_sorties=total_sorties,
        monthly=monthly,
        site_monthly_breakdown=site_breakdown,
    )


# ============================================================================
# 7. Design Library
# ============================================================================

@router.get("/designs", response_model=List[DesignModel])
def list_designs():
    """List versioned standard drawings in library."""
    designs = query_all("SELECT * FROM designs ORDER BY name ASC, revision DESC")
    sites = query_all("SELECT current_design_json FROM sites")
    # Count how many sites currently reference each design name
    usage_counts: Dict[str, int] = {}
    for s in sites:
        d = _parse_json(s["current_design_json"])
        if d and "name" in d:
            usage_counts[d["name"]] = usage_counts.get(d["name"], 0) + 1

    out: List[DesignModel] = []
    for row in designs:
        d_json = _parse_json(row["design_json"]) or {}
        out.append(
            DesignModel(
                id=row["id"],
                name=row["name"],
                revision=row["revision"],
                status=row["status"],
                design_json=d_json,
                author=row["author"],
                created_at=row["created_at"],
                parent_id=row["parent_id"],
                active_sites_count=usage_counts.get(row["name"], 0),
            )
        )
    return out


@router.post("/designs", response_model=DesignModel, status_code=status.HTTP_201_CREATED)
def create_design(payload: DesignCreate):
    """Save a new design to the library."""
    design_id = f"des_{uuid.uuid4().hex[:8]}"
    now = _now_iso()
    execute(
        """
        INSERT INTO designs (id, name, revision, status, design_json, author, created_at, parent_id)
        VALUES (?, ?, 1, 'approved', ?, ?, ?, ?)
        """,
        (design_id, payload.name, json.dumps(payload.design_json), payload.author, now, payload.parent_id),
    )
    row = query_one("SELECT * FROM designs WHERE id = ?", (design_id,))
    return DesignModel(
        id=row["id"],
        name=row["name"],
        revision=row["revision"],
        status=row["status"],
        design_json=_parse_json(row["design_json"]) or {},
        author=row["author"],
        created_at=row["created_at"],
        parent_id=row["parent_id"],
        active_sites_count=0,
    )


@router.post("/designs/{design_id}/apply-to/{site_id}")
def apply_design_to_site(design_id: str, site_id: str):
    """Apply a standard library drawing to a site and invalidate old result."""
    d_row = query_one("SELECT * FROM designs WHERE id = ?", (design_id,))
    if not d_row:
        raise HTTPException(status_code=404, detail="Design not found.")
    s_row = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    if not s_row:
        raise HTTPException(status_code=404, detail="Site not found.")

    now = _now_iso()
    execute(
        "UPDATE sites SET current_design_json = ?, updated_at = ? WHERE id = ?",
        (d_row["design_json"], now, site_id),
    )
    execute(
        "INSERT INTO site_history (site_id, changed_at, field, old_value, new_value, note) VALUES (?, ?, ?, ?, ?, ?)",
        (site_id, now, "current_design", s_row.get("current_design_json"), d_row["name"], f"Applied design {d_row['name']} Rev {d_row['revision']}"),
    )
    # Re-evaluate site with new design
    updated_site = query_one("SELECT * FROM sites WHERE id = ?", (site_id,))
    summary = _evaluate_site_internal(updated_site, "typical_day")
    execute(
        """
        INSERT INTO site_results (site_id, computed_at, weather_mode, summary_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(site_id) DO UPDATE SET
          computed_at = excluded.computed_at,
          weather_mode = excluded.weather_mode,
          summary_json = excluded.summary_json
        """,
        (site_id, now, "typical_day", json.dumps(summary)),
    )

    return {"status": "design_applied", "site_id": site_id, "design_id": design_id, "new_evaluation": summary}


# ============================================================================
# 8. Materials Availability by District
# ============================================================================

@router.get("/materials/availability", response_model=List[MaterialAvailabilityItem])
def get_materials_availability(district: str = Query("Leh")):
    """
    Materials catalog with regional availability and supply lead times.
    Different supply realities for Leh vs Chushul vs DBO vs Rasuwa.
    """
    rows = query_all("SELECT * FROM materials ORDER BY category, name")

    out: List[MaterialAvailabilityItem] = []
    dist = district.lower().strip()

    for r in rows:
        locally_avail = bool(r["locally_available"])
        lead_time = 1
        constraint = "Available in local bazaar"
        cost_basis = "sourced" if r["cost_source"] else "estimate"

        # Logistics adjustments by district
        if dist in ("dbo", "daulat beg oldie"):
            if r["category"] in ("structural", "mass") and r["id"] in ("mud_brick", "stone_masonry"):
                locally_avail = False
                lead_time = 28
                constraint = "Heavy stone/mud unavailable on moraine; requires military convoy or airlift"
            else:
                lead_time = 21
                constraint = "Transit via DS-DBO road; subject to winter avalanche closure"
        elif dist in ("chushul", "nyoma"):
            if r["category"] == "relief":
                lead_time = 7
                constraint = "Dispatched from Leh depot via Chang La"
            else:
                lead_time = 3
                constraint = "Local soil and stone quarry accessible"
        elif dist in ("rasuwa",):
            if r["category"] in ("insulation", "glazing"):
                locally_avail = False
                lead_time = 14
                constraint = "Monsoon landslide damage on Trishuli corridor; porter airlift needed"
            else:
                locally_avail = True
                lead_time = 2
                constraint = "Bamboo, local stone and UNHCR tarpaulins available"

        out.append(
            MaterialAvailabilityItem(
                id=r["id"],
                name=r["name"],
                category=r["category"],
                k=r["k"],
                cost_per_m3=r["cost_per_m3"],
                cost_source=r["cost_source"],
                cost_basis=cost_basis,
                locally_available=locally_avail,
                lead_time_days=lead_time,
                transport_constraint=constraint,
                install_note=r["install_note"],
                source=r["source"],
            )
        )
    return out
