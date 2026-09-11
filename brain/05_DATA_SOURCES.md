# 05 — DATA SOURCES

**Rule R1 lives here.** If a number is not in this file or in `materials.source`, it may not appear in the product.

## 1. Weather

### Open-Meteo — primary, live
- Free, no API key, local models updated hourly
- Endpoints: forecast and historical archive
- Fields: `temperature_2m`, `shortwave_radiation` (GHI), `direct_normal_irradiance`, `diffuse_radiation`, `wind_speed_10m`, `relative_humidity_2m`, `snow_depth`
- **This is our "real-time data" requirement, satisfied properly.**

### NASA POWER — secondary, archive
- Free, no key. Satellite-derived solar and meteorology.
- **Not real-time.** Meteorological parameters lag ~2–3 days; solar ~5–7 days. Climate-quality products replace near-real-time values ~2–3 months later.
- Used for: the ~10-year daily record behind the P1 worst-night profile.
- **Grid resolution caveat, must be surfaced in UI:** meteorology is gridded at roughly 0.5° × 0.625°, about a 50 km cell. In Ladakh's terrain this is a regional estimate, not a site measurement.

**Never claim POWER is live. Never claim the P1 night is site-specific.**

### Open-Meteo Geocoding API — location search
- Endpoint: `https://geocoding-api.open-meteo.com/v1/search`
- Parameters: `name={query}&count=10&language=en&format=json`
- Fields: `name`, `admin1`, `country`, `latitude`, `longitude`, `elevation`
- Free, no key required. Used for place search autocomplete across all coordinates on Earth.

### Open-Meteo Elevation API — altitude resolution
- Endpoint: `https://api.open-meteo.com/v1/elevation`
- Parameters: `latitude={lat}&longitude={lon}`
- Fields: `elevation` (meters above sea level from 90m Copernicus DEM / GTOPO30)
- Free, no key required. Used to accurately determine site altitude for barometric pressure and air density calculations. If elevation lookup fails, the user is prompted; the system never guesses or defaults.

### Fallback — Geographically Scoped
`/data/weather/leh_january_fallback.csv` — one hardcoded Ladakh winter day, strictly scoped to the Ladakh alpine region (lat 32.0°–36.0° N, lon 75.0°–80.0° E). If a non-Ladakh coordinate is requested without network connectivity, the system fails loudly with HTTP 503 `WeatherUnavailableError` rather than silently serving Leh winter data for tropical or temperate sites. Provider tagged `fallback` only for valid within-bounds requests.

### User CSV
Columns: `datetime, t_air_c, ghi_wm2`. Optional: `dni_wm2, dhi_wm2, wind_ms, rh_pct`. Provider tagged `user-csv`.

## 2. Material properties

| Source | Use |
|---|---|
| ASHRAE Handbook of Fundamentals, Ch. 26 | k, rho, Cp for conventional materials |
| National Building Code of India 2016 | Indian material values, comfort |
| ECBC (Energy Conservation Building Code) | envelope U-values, Indian practice |
| Peer-reviewed papers on Ladakh construction | mud brick, rammed earth, local practice |

Every row carries the specific table or page in `source`. "ASHRAE" alone is insufficient — "ASHRAE HoF 2021 Ch.26 Tbl 1" is the standard.

## 3. Standards and methods

| Standard | Used for |
|---|---|
| **EN ISO 52016-1:2017** | simplified hourly method, 5R1C thermal network — our core method |
| EN ISO 13790 | predecessor simple hourly method |
| ISO 13792 | shelter thermal model classification (ShelTherm precedent) |
| ISO 7730 | PMV/PPD — referenced, **not used directly**, see §5 |
| NBC India 2016 | adaptive comfort (IMAC) |
| ISO 15927-4 | TMY construction reference |

## 4. Validation targets — the numbers that decide the project

| # | Configuration | Published result | Source |
|---|---|---|---|
| V1 | DIHAR Leh solar-heated shelter | 15–20 °C indoor at −19 °C ambient | DRDO DIHAR pilot reporting |
| V2 | Leh Trombe-wall room, Feb 2020 | monthly mean **17.44 °C** | measured Leh passive solar housing study |
| V3 | Leh direct-gain room, Feb 2020 | monthly mean **14.81 °C** | same study |
| V4 | DIHAR + Sun Stellar ADM Block, Dec 2024 | +20 °C held 18:00–06:00 | DRDO/vendor reporting |

**V2 vs V3 ordering is a hard requirement.** The model must rank Trombe above direct-gain. Ordering proves physics; absolute values can reflect calibration.

## 5. Comfort — why not plain PMV

Two independent reasons, both citable:

1. **Fanger's PMV is only valid near 1 atm.** Reduced air density alters the convective heat transfer coefficient at the body surface and raises sweat evaporation efficiency. Leh at ~3,500 m is ~0.65 atm. A pressure-corrected model (PMVp) achieved RMSE of 0.311 / 0.408 / 0.123 / 0.375 across four altitude-temperature conditions, where standard PMV scored 1.251 / 1.367 / 1.106 — an error exceeding a full sensation unit.
2. **PMV under-predicts Indian occupants' adaptivity.** IMAC (India Model for Adaptive Comfort) was built from 6,330 responses across 16 buildings and five climate zones and has been in the NBC since 2016. IMAC-R found >80% of occupants comfortable across 16.3–35 °C operative depending on 30-day outdoor running mean.

**What we do:** IMAC as the adjustable comfort band, plus a **health threshold** headline (18 °C minimum safe indoor temperature in cold seasons per WHO housing guidance). State openly that IMAC was developed for hot Indian zones and **no adaptive comfort model has been validated for India's cold high-altitude zone.**

## 6. Impact figures

| Figure | Value | Use |
|---|---|---|
| Kerosene delivery cost, Siachen | ≈ ₹2,400/L (helicopter) | headline impact |
| Consumption, 15-man post | ≈ 112 L/month, ≈1,350 L/yr | baseline |
| Siachen network, ~150 posts | > 202,500 L/yr heating | scale |
| Energy per soldier, cold camp | 4–5 kWh/day, mostly heating | context |
| Kerosene energy content | ~37 MJ/L | backup heater sizing |
| Kerosene CO2 | ~2.5 kg CO2/L | carbon avoided |
| Ladakh solar irradiance | 1,900–2,100 kWh/m2/yr | context |
| Ladakh sunshine | ~7.9 h/day, 300+ clear days | context |

## 7. Physical constants

| Constant | Value | Units |
|---|---|---|
| Stefan–Boltzmann sigma | 5.670374419e-8 | W/m2K4 |
| Specific gas constant, dry air R | 287.05 | J/kg.K |
| Cp air | 1005 | J/kg.K |
| Sea-level pressure P0 | 101325 | Pa |
| Fresh snow albedo | 0.75–0.90 | — |
| Bare ground albedo | 0.07–0.60 (use 0.20 default) | — |

## 8. Things we must never do

- Use a material value not in the table
- Present a NASA POWER figure as live
- Present the P1 night as site-specific
- Show a cost without either a source or an `[estimate]` tag
- Cite a paper we have not actually read the abstract of
- Report a validation pass we did not run
