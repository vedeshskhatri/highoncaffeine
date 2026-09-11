# 07A — PLATFORM CONTRACT PROPOSAL

**Author: Aryan / Vedesh**  
**Status: Proposed (Drafted against frozen 07_API_CONTRACT.md)**  
**Target Integration: Vedesh review -> fold into 07_API_CONTRACT.md with 16_CHANGELOG entry**  

This document defines the REST API contract for the THERMA Thermal Asset Management Platform surrounding the shelter simulation engine. All existing endpoints in `07_API_CONTRACT.md` remain strictly unchanged.

Base URL: `http://localhost:8000` (or relative `/api`)  
Format: JSON  
All temperatures at this boundary: **Celsius**  

---

## 1. Sites Management (`/sites`)

### `GET /sites`
Query parameters:
- `estate`: Optional string (`Ladakh` | `Nepal Relief`).
- `district`: Optional string (`Leh`, `Kargil`, `Rasuwa`, etc.).
- `site_type`: Optional string (`forward_post` | `relief_camp` | `dwelling`).
- `status`: Optional string (`evaluated` | `unevaluated` | `cold_alert`).

Response `200 OK`:
```json
[
  {
    "id": "siachen_base",
    "name": "Siachen Base Camp",
    "estate": "Ladakh",
    "district": "Leh",
    "lat": 35.2000,
    "lon": 77.2100,
    "altitude_m": 3600,
    "site_type": "forward_post",
    "occupants": 16,
    "current_design_id": "std_forward_post_v1",
    "has_evaluation": true,
    "evaluation": {
      "computed_at": "2026-09-11T12:00:00Z",
      "weather_mode": "typical_day",
      "t_in_min_c": 16.1,
      "t_in_max_c": 19.4,
      "hours_below_health_threshold": 4,
      "annual_fuel_litres": 1340.0,
      "annual_cost_inr": 3216000.0,
      "status": "warning"
    },
    "notes": "Main logistics staging post",
    "created_at": "2026-09-11T10:00:00Z",
    "updated_at": "2026-09-11T10:00:00Z"
  }
]
```

### `POST /sites`
Create a single site.
Request:
```json
{
  "name": "Chushul Sector Post 4",
  "estate": "Ladakh",
  "district": "Leh",
  "lat": 33.5900,
  "lon": 78.6500,
  "altitude_m": 4350,
  "site_type": "forward_post",
  "occupants": 10,
  "current_design": null,
  "notes": "Pin-dropped new post"
}
```
Response `201 Created`: Site object.

### `GET /sites/{id}`
Returns full site details including geometry, current envelope build-up, evaluation summary, and benchmark against DIHAR.

### `PATCH /sites/{id}`
Update fields (e.g. occupants, notes, current_design).

### `DELETE /sites/{id}`
Response `200 OK` or `204 No Content`.

---

## 2. Site Evaluation & Batch (`/sites/{id}/evaluate`, `/sites/evaluate-all`)

### `POST /sites/{id}/evaluate`
Runs the real simulation engine (`engine.solver.run_single`) for this site's location and current design, saves the result to `site_results`, and records an entry in `site_history`.

Request:
```json
{
  "weather_mode": "typical_day"
}
```
Response `200 OK`:
```json
{
  "site_id": "siachen_base",
  "computed_at": "2026-09-11T15:00:00Z",
  "weather_mode": "typical_day",
  "summary": {
    "t_in_min_c": 16.12,
    "t_in_max_c": 19.38,
    "hours_below_health_threshold": 4,
    "comfort_hours": 20,
    "annual_fuel_litres": 1340.2,
    "annual_cost_inr": 3216480.0,
    "annual_co2_kg": 3350.5,
    "heat_loss_breakdown_pct": {
      "walls": 32.5,
      "roof": 24.1,
      "glazing": 18.2,
      "infiltration": 8.5,
      "sky_radiation": 16.7
    },
    "benchmark_vs_dihar": {
      "reference_name": "DIHAR Leh Validated Pilot",
      "delta_min_c": -1.3,
      "note": "1.3 °C below the DIHAR measured reference (17.4 °C)"
    }
  }
}
```

### `POST /sites/evaluate-all`
Evaluates all unevaluated or all sites in an estate.
Query parameter: `estate` (optional), `force` (boolean).
Response `200 OK`:
```json
{
  "evaluated_count": 11,
  "failed_count": 0,
  "elapsed_seconds": 1.45
}
```

---

## 3. CSV Import (`/sites/import`)

### `POST /sites/import`
Accepts CSV text or multipart file with columns: `name,estate,district,lat,lon,altitude_m,site_type,occupants`.
Collects column-level errors per `brain/09_ERROR_HANDLING.md` §6.
Response `200 OK` on success, or `422 Unprocessable Entity` with `detail`:
```json
{
  "detail": [
    { "row": 3, "column": "lat", "problem": "latitude out of range [-90, 90]: '95.4'" },
    { "row": 5, "column": "altitude_m", "problem": "not a number: 'four-thousand'" }
  ]
}
```

---

## 4. Estate Aggregates & Dashboard (`/estate/summary`)

### `GET /estate/summary`
Query parameters:
- `estate`: Optional string (defaults to `Ladakh`).

Response `200 OK`:
Every aggregate is computed from real cached engine results in `site_results`. Un-evaluated sites are never assigned fake numbers.
```json
{
  "estate": "Ladakh",
  "total_sites": 11,
  "evaluated_sites": 11,
  "unevaluated_sites": 0,
  "coverage_str": "11 of 11 sites",
  "is_stale": false,
  "last_evaluated_at": "2026-09-11T12:00:00Z",
  "aggregates": {
    "total_occupants": 142,
    "annual_fuel_litres": 16240.0,
    "annual_cost_inr": 38976000.0,
    "annual_co2_tonnes": 40.6,
    "avg_t_min_c": 12.4
  },
  "worst_performing_sites": [
    {
      "id": "dbo_post",
      "name": "Daulat Beg Oldie (DBO) Sector",
      "t_in_min_c": 2.4,
      "hours_below_health_threshold": 24,
      "annual_fuel_litres": 2840.0
    }
  ],
  "district_exposure": [
    { "district": "Leh", "sites_count": 8, "annual_fuel_litres": 11200.0, "annual_cost_inr": 26880000.0 },
    { "district": "Kargil", "sites_count": 3, "annual_fuel_litres": 5040.0, "annual_cost_inr": 12096000.0 }
  ],
  "temperature_bands": [
    { "band": "< 0 °C", "count": 2 },
    { "band": "0 to 10 °C", "count": 4 },
    { "band": "10 to 18 °C", "count": 3 },
    { "band": ">= 18 °C", "count": 2 }
  ],
  "active_alerts_count": 2
}
```

---

## 5. Programme Planner (`/programme`)

### `POST /programme`
Budget-constrained greedy ranking of retrofit packages across sites in an estate, sorted descending by litres saved per rupee (`litres_saved_per_rupee`).

Request:
```json
{
  "estate": "Ladakh",
  "budget_inr": 14000000.0,
  "district": null,
  "site_type": null
}
```

Response `200 OK`:
```json
{
  "estate": "Ladakh",
  "budget_inr": 14000000.0,
  "coverage_str": "11 of 11 sites evaluated",
  "headline": "Retrofitting the 8 highest-return posts costs ₹1.38 Cr and avoids an estimated 9,450 L of kerosene a year.",
  "total_spend_inr": 13800000.0,
  "total_litres_saved_per_year": 9450.0,
  "posts_funded_count": 8,
  "items": [
    {
      "rank": 1,
      "site_id": "dbo_post",
      "site_name": "Daulat Beg Oldie (DBO) Sector",
      "district": "Leh",
      "intervention": "50mm Exterior Rockwool + Trombe Glazing Layer",
      "cost_inr": 1750000.0,
      "cost_basis": "sourced",
      "litres_saved_per_year": 1620.0,
      "litres_per_1000_inr": 0.93,
      "degrees_gained_c": 11.2,
      "payback_years": 0.45,
      "cumulative_cost_inr": 1750000.0,
      "cumulative_litres_saved": 1620.0,
      "funded": true
    }
  ]
}
```

---

## 6. Cold Snap Alerts (`/alerts`, `/alerts/scan`)

### `GET /alerts`
Query parameters:
- `estate`: Optional string (`Ladakh`).
- `include_acknowledged`: boolean (default false).

Response `200 OK`:
```json
[
  {
    "id": "alert_dbo_20260918",
    "site_id": "dbo_post",
    "site_name": "Daulat Beg Oldie (DBO) Sector",
    "estate": "Ladakh",
    "severity": "critical",
    "kind": "cold_snap",
    "window_start": "2026-09-18T00:00:00Z",
    "window_end": "2026-09-21T23:59:59Z",
    "predicted_min_c": 1.2,
    "health_threshold_c": 18.0,
    "occupants_affected": 12,
    "recommended_action": "Pre-position 400 L emergency kerosene buffer by 17 Sep before weather closes road access.",
    "forecast_summary": {
      "ambient_min_c": -24.5,
      "wind_max_ms": 14.2
    },
    "created_at": "2026-09-11T14:30:00Z",
    "acknowledged": false
  }
]
```

### `POST /alerts/scan`
Pulls live Open-Meteo 7-day forecast for every site in the estate, evaluates predicted indoor minimum using the site's current envelope, and creates alerts for any breach below health thresholds.
Query parameters: `estate` (optional).

### `POST /alerts/{id}/ack`
Acknowledges an alert.

---

## 7. Helicopter Sortie & Monthly Fuel Forecast (`/forecast`)

### `GET /forecast`
Calculates monthly seasonal fuel demand across all posts in an estate and converts it into helicopter sorties.

Query parameters:
- `estate`: Optional string (`Ladakh`).

Response `200 OK`:
```json
{
  "estate": "Ladakh",
  "coverage_str": "11 of 11 sites",
  "sortie_config": {
    "litres_per_sortie": 450.0,
    "basis": "estimate",
    "note": "Assumes 450 litres useful load per high-altitude Cheetah/ALH sortie (~360 kg fuel + drums at 3,500–4,500 m). Actual payload varies with density altitude, temperature, and airframe."
  },
  "total_annual_litres": 16240.0,
  "total_annual_sorties": 36.1,
  "monthly": [
    { "month": "Jan", "litres": 2840.0, "sorties": 6.3 },
    { "month": "Feb", "litres": 2420.0, "sorties": 5.4 },
    { "month": "Dec", "litres": 2680.0, "sorties": 6.0 }
  ],
  "site_monthly_breakdown": [
    {
      "site_id": "siachen_base",
      "site_name": "Siachen Base Camp",
      "annual_litres": 1340.0,
      "annual_sorties": 3.0
    }
  ]
}
```

---

## 8. Design Library (`/designs`)

### `GET /designs`
List standard versioned drawings (`Post Type-A Rev 3 · Approved`).

### `POST /designs`
Create design from scratch or save a site's envelope as a library design.

### `GET /designs/{id}`
Fetch full design specifications.

### `POST /designs/{id}/apply-to/{site_id}`
Applies this library design to the specified site, updating its current design and recording a `site_history` entry.

---

## 9. Materials Availability Catalog (`/materials/availability`)

### `GET /materials/availability`
Query parameters:
- `district`: string (`Leh` | `Chushul` | `DBO` | `Kargil` | `Rasuwa`).

Returns material catalog annotated with availability, transit lead time, cost per m³, and `cost_basis` (`sourced` | `estimate`).
