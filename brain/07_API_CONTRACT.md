# 07 — API CONTRACT

**FROZEN. Owner: Vedesh.** Nobody else edits this file. If your work needs a change, stop and report it as a blocker (Rule R3).

Base: `http://localhost:8000`. All bodies JSON. All temperatures **Celsius** at this boundary.

---

## POST /simulate

### Request
```json
{
  "location": { "lat": 34.1526, "lon": 77.5771, "altitude_m": 3500 },
  "weather": {
    "mode": "typical_day",
    "date": "2026-01-15",
    "hours": 24,
    "user_csv_id": null
  },
  "geometry": {
    "length_m": 6.0, "width_m": 4.0, "height_m": 2.6,
    "orientation_deg": 180
  },
  "envelope": {
    "walls": [
      { "material": "mud_brick", "thickness_m": 0.30 },
      { "material": "eps",       "thickness_m": 0.05 }
    ],
    "roof":  [{ "material": "concrete", "thickness_m": 0.15 }],
    "floor": [{ "material": "concrete", "thickness_m": 0.10 }],
    "roof_emissivity": 0.90
  },
  "openings": [
    { "facing": "south", "area_m2": 4.0, "glazing": "double_pane",
      "night_shutter": false }
  ],
  "ventilation": { "ach": 0.6, "heater_type": "none" },
  "occupancy":   { "people": 8, "watts_per_person": 100 },
  "ground":      { "snow_cover": true, "albedo": null },
  "comfort":     { "model": "imac", "health_threshold_c": 18.0 },
  "simulation":  { "timestep_s": 60, "spinup_days": 3 }
}
```

**Field rules**
- `weather.mode` ∈ `typical_day` | `design_winter_night` | `user_csv`
- `weather.user_csv_id` required iff mode is `user_csv`
- `orientation_deg` 0=N, 90=E, 180=S, 270=W
- `openings[].facing` ∈ `north` | `east` | `south` | `west` | `roof`
- `ventilation.heater_type` ∈ `none` | `unflued_combustion` | `flued_stove` | `electric`
- `ground.albedo` null → derived from `snow_cover`
- Envelope layers ordered **outside → inside**

### Response 200
```json
{
  "refused": false,
  "refusal_reason": null,
  "weather_provenance": {
    "provider": "open-meteo",
    "is_live": true,
    "grid_note": null,
    "fetched_at": "2026-09-11T04:12:00Z"
  },
  "series": [
    { "hour": 0, "t_out": -21.3, "t_in": 4.8, "t_operative": 3.9,
      "ghi": 0, "delta_ambient": 26.1, "t_in_lo": 3.6, "t_in_hi": 6.0 }
  ],
  "summary": {
    "t_in_min_c": 3.1,
    "t_in_min_hour": 6,
    "t_in_max_c": 19.4,
    "comfort_hours_ratio": 0.21,
    "hours_below_health_threshold": 17,
    "solar_gain_kwh": 18.7,
    "heat_loss_kwh": {
      "walls": 12.1, "roof": 9.4, "glazing": 7.8,
      "infiltration": 4.2, "sky_radiation": 6.9
    },
    "backup_heat": {
      "peak_kw": 1.1, "hours": 6.5,
      "kerosene_litres_per_night": 0.9
    },
    "impact": {
      "kerosene_litres_per_year": 1310,
      "cost_inr_per_year": 3144000,
      "co2_kg_per_year": 3275,
      "payback_years": null
    },
    "freeze_risk": [
      { "location": "north wall interior surface",
        "below_zero_from_hour": 2, "min_c": -1.8 }
    ]
  },
  "surfaces": [
    { "name": "south_wall", "t_surface_c": -4.2, "flux_w": 310,
      "solar_absorbed_w": 640 }
  ]
}
```

`surfaces[]` drives the heat-flow visualisation. `delta_ambient` is `t_in - t_out`, which satisfies **PS requirement 3** directly.

### Response 200, refused
```json
{
  "refused": true,
  "refusal_reason": "Ventilation 0.30 ACH is below the safe minimum for an unflued combustion heater. Carbon monoxide risk. Increase ventilation or specify a flued stove.",
  "series": [], "summary": null, "surfaces": []
}
```
A refusal is **200, not an error.** The user asked a valid question and got a valid answer.

### Errors
| Code | When |
|---|---|
| 422 | Pydantic validation, field-level detail |
| 400 | unknown or unsourced material id |
| 503 | no weather available (network down, no cache, no fallback) |
| 500 | solver diverged — body includes node index and timestep |

---

## POST /optimize

### Request
```json
{
  "location": { "...": "as /simulate" },
  "weather":  { "...": "as /simulate" },
  "fixed": { "length_m": 6.0, "width_m": 4.0, "height_m": 2.6 },
  "baseline": { "...": "a full /simulate envelope, for comparison" },
  "search": {
    "orientation_deg":  { "min": 120, "max": 240, "step": 10 },
    "south_glazing_m2": { "min": 1.0, "max": 8.0, "step": 0.5 },
    "wall_material":    ["mud_brick", "rammed_earth", "stone"],
    "insulation_mm":    { "min": 0, "max": 150, "step": 25 },
    "night_shutter":    [true, false],
    "roof_emissivity":  [0.90, 0.25]
  },
  "constraints": {
    "locally_available_only": true,
    "max_cost_inr": 400000,
    "heater_type": "unflued_combustion"
  },
  "objectives": ["maximise_comfort_hours", "minimise_cost"],
  "n_samples": 3000
}
```

### Response 200
```json
{
  "evaluated": 3000,
  "refused_unsafe": 412,
  "elapsed_s": 4.1,
  "baseline": { "comfort_hours_ratio": 0.21, "t_in_min_c": 3.1, "cost_inr": 180000 },
  "pareto": [
    { "design_id": "d_0412", "comfort_hours_ratio": 0.86, "cost_inr": 318000,
      "t_in_min_c": 17.2 }
  ],
  "top": [
    {
      "rank": 1,
      "design_id": "d_0412",
      "design": { "...": "full envelope, ready to POST to /simulate" },
      "summary": { "...": "same shape as /simulate summary" },
      "why": "South glazing raised to 5.5 m2 and night shutters added. Overnight minimum rises 14.1 C versus baseline; shutters contribute 6.1 C of that.",
      "delta_vs_baseline": {
        "t_in_min_c": 14.1, "comfort_hours_ratio": 0.65,
        "cost_inr": 138000, "kerosene_litres_per_year": -1180
      }
    }
  ]
}
```

**`why` is generated mechanically** from the parameter deltas ranked by sensitivity. It is not written by a language model and must not be.

---

## POST /sensitivity

Request: same `location`, `weather`, `baseline`, `search` as `/optimize`, plus `"trajectories": 20`.

```json
{
  "method": "morris",
  "runs": 240,
  "levers": [
    {
      "parameter": "night_shutter",
      "label": "Night shutters",
      "effect_c": 6.1,
      "rank": 1,
      "cost_inr": 500,
      "cost_basis": "estimate",
      "install_note": "local craftsman, 1 day",
      "derived_note": null
    },
    {
      "parameter": "wall_thickness",
      "label": "Stone wall +100 mm",
      "effect_c": 0.4,
      "rank": 4,
      "cost_inr": 38000,
      "cost_basis": "sourced",
      "install_note": null,
      "derived_note": "+11.8 t per structure"
    }
  ]
}
```

`cost_basis` ∈ `sourced` | `estimate` | `derived`. **The UI renders an `[estimate]` tag whenever basis is `estimate`.** Never hidden.

---

## POST /retrofit

Request: `location`, `weather`, `existing` (a full envelope), `budget_inr`.

```json
{
  "baseline": { "t_in_min_c": 3.1, "hours_below_health_threshold": 17 },
  "interventions": [
    { "rank": 1, "label": "Night shutters, south windows",
      "delta_t_min_c": 6.1, "cost_inr": 500,
      "degrees_per_1000_inr": 12.2,
      "cost_basis": "estimate",
      "cumulative_cost_inr": 500, "cumulative_t_min_c": 9.2 }
  ],
  "within_budget_count": 3
}
```

Ranked by **degrees gained per rupee**. Cumulative columns assume interventions applied in rank order.

---

## POST /weather/csv

Multipart or raw text. Columns `datetime, t_air_c, ghi_wm2`; optional `dni_wm2, dhi_wm2, wind_ms, rh_pct`.

```json
{ "user_csv_id": "csv_9f2a", "hours": 24,
  "warnings": ["dni_wm2 absent — estimated from ghi"] }
```
Errors are **column-level**, never a stack trace:
```json
{ "detail": [{ "row": 14, "column": "t_air_c", "problem": "not a number: '--'" }] }
```

---

## GET /materials
```json
{ "materials": [
  { "id": "mud_brick", "name": "Mud brick (adobe)", "category": "structural",
    "k": 0.75, "rho": 1700, "cp": 880,
    "cost_per_m3": 2400, "cost_basis": "sourced",
    "locally_available": true, "source": "ASHRAE HoF 2021 Ch.26 Tbl 1" }
] }
```

## GET /validation
Returns the three pre-run committed scenarios. **Never computed live.**
```json
{ "scenarios": [
  { "id": "dihar_leh", "label": "DIHAR Leh shelter",
    "measured_min_c": 15.0, "measured_max_c": 20.0, "ambient_c": -19.0,
    "model_min_c": 15.8, "model_max_c": 19.1, "pass": true,
    "source": "DRDO DIHAR pilot reporting" }
], "ordering_check": { "trombe_above_direct_gain": true, "pass": true } }
```

## GET /health
```json
{ "ok": true, "db": true, "weather_cache_rows": 8760, "offline_capable": true }
```
