# ANTIGRAVITY PHASE PROMPTS — ARYAN (Backend, Database, Weather, then Results UI)

**Phase R0 is the most time-critical work in the project after Vedesh's contract.**
Swapnil is blocked until your stubs exist. Get them done fast and ugly.

From R4 you switch to frontend and own the results canvas.

---

## PHASE R0 — FastAPI stubs (UNBLOCKS SWAPNIL — do this first and fast)

```
You are working on THERMA, a shelter thermal design tool for SIH 2026 PS 26051 (DRDO).

FIRST read completely:
  brain/00_MASTER_RULES.md
  brain/07_API_CONTRACT.md          <- this is frozen, you implement it exactly
  brain/09_ERROR_HANDLING.md

Restate in your own words:
  - what "the contract is frozen" means for you specifically
  - why a safety refusal is a 200 and not an error
  - the weather fallback chain, in order
  - which paths you own

TASK — Phase R0
Speed matters here. Swapnil cannot start until these endpoints respond.

1. api/schemas.py: Pydantic v2 models for EVERY request and response in
   brain/07_API_CONTRACT.md. Exact field names. Exact nesting. No extras, no
   omissions, no renames.
   Validation constraints on every numeric field:
     - dimensions positive, sensible upper bounds
     - thickness_m > 0
     - ach >= 0
     - orientation_deg 0-360
     - enums for facing, heater_type, weather mode
   Field-level error messages a non-engineer can read.

2. api/main.py: FastAPI app with every endpoint in the contract.
   Each returns a LABELLED FIXTURE from /data/fixtures/, loaded from a file whose
   name begins with "fixture_".
   Every stub response includes a top-level field:  "_stub": true
   Swapnil must be able to see at a glance that data is fake.
   Rule R2: do not compute anything. Do not return plausible made-up numbers
   inline. Load a file that is explicitly named as a fixture.

3. CORS enabled for the Vite dev server origin.

4. GET /health returning the shape in the contract.

VERIFICATION — paste actual output:
  a. uvicorn starts clean. Paste the startup log.
  b. curl every endpoint. Paste each response.
  c. POST /simulate with a NEGATIVE thickness_m. Paste the 422 body and confirm
     it names the field.
  d. POST /simulate with an invalid enum for facing. Paste the 422 body.
  e. Open /docs and confirm every endpoint appears. State that you checked.

CONSTRAINTS
- Do not implement real logic in this phase.
- Do not modify brain/07_API_CONTRACT.md. If something in it is unclear or
  contradictory, report it as a blocker — do not resolve it yourself.
- Do not touch /engine or /web.

OUTPUT: PHASE REPORT per brain/00_MASTER_RULES.md section 4, all ten sections.
Section 8 must state explicitly: "Swapnil is unblocked" or what is still missing.
```

---

## PHASE R1 — SQLite schema and seeding

```
Read first: brain/04_DATA_MODEL.md, brain/02_TRD.md (no ORM, and why).

Before coding, state:
  - why we are not using an ORM
  - why therma.db is committed to the repo
  - why coordinates must be rounded before cache insert or lookup

TASK — Phase R1
1. api/db.py: thin sqlite3 helper. Connection management, parameterised queries,
   row-to-dict. Target roughly 40 lines. NO ORM, no query builder, no abstraction
   layer over the abstraction layer.
2. scripts/schema.sql: the four tables exactly as brain/04_DATA_MODEL.md.
3. scripts/seed.py: rebuilds /data/therma.db from /data/materials.csv.
   Must FAIL LOUDLY if any material row has an empty source — reuse Aman's
   loader rather than reimplementing the check.
4. Wire GET /materials to read from the database.
5. Round lat/lon to 4 decimal places in ONE place, used by both insert and
   lookup. If these diverge the cache never hits and you will lose an hour
   finding out why.

VERIFICATION — paste actual output:
  a. Run seed.py. Print row counts per table.
  b. GET /materials returns real data from the DB, not the fixture. Paste it.
  c. Add an unsourced row to a copy of the CSV, run seed, show it failing.
  d. Insert a weather row and read it back with slightly different precision on
     the coordinates. Demonstrate the rounding makes it hit.
  e. Confirm /data/therma.db is committed and not gitignored.

CONSTRAINTS
- No ORM. Not SQLAlchemy, not Prisma, not anything.
- Do not hand-edit the .db file — it is always rebuilt from the CSV.

OUTPUT: PHASE REPORT, all ten sections.
```

---

## PHASE R2 — Weather: live, archive, cache, offline

```
Read first: brain/05_DATA_SOURCES.md section 1, brain/09_ERROR_HANDLING.md
section 4, brain/07_API_CONTRACT.md (weather_provenance).

Before coding, state:
  - why Open-Meteo is our "real-time" source and NASA POWER is not
  - the exact latency figures for NASA POWER, and what we must never claim
  - the fallback chain, in order
  - what weather_provenance is for

TASK — Phase R2
1. api/weather.py
   - fetch_open_meteo(lat, lon, date, hours) -> normalised hourly rows
     Fields per brain/05_DATA_SOURCES.md section 1.
   - fetch_nasa_power(lat, lon, date_range) -> normalised rows
   - get(lat, lon, date, mode) implementing the fallback chain EXACTLY:
       1. SQLite cache
       2. Open-Meteo live -> cache it, is_live true
       3. NASA POWER -> cache it, is_live FALSE
       4. /data/weather/leh_january_fallback.csv, provider "fallback"
       5. raise WeatherUnavailableError -> 503
   - NEVER silently substitute. Every response carries weather_provenance
     stating provider, is_live, grid_note, fetched_at.

2. Create /data/weather/leh_january_fallback.csv — one realistic Ladakh winter
   day. Source it from a real dataset and cite it in a header comment. Do not
   hand-write plausible numbers.

3. Wire real weather into /simulate, replacing that part of the stub.

VERIFICATION — paste actual output:
  a. Fetch Leh for a date. Print provider and is_live. Confirm cache row count
     increased.
  b. Fetch the SAME request again. Confirm it hits cache — print elapsed time
     for both calls to show the difference.
  c. DISCONNECT THE NETWORK. Fetch a cached date — must succeed from cache.
     Fetch an uncached date — must fall through to the fallback CSV, with
     provider "fallback". Paste both responses' weather_provenance.
  d. Paste the fallback CSV header showing its source citation.

CONSTRAINTS
- Never label NASA POWER data as live.
- Never return weather without provenance.
- Do not invent a fallback dataset.

OUTPUT: PHASE REPORT. Section 4 must include the actual offline test from (c) —
this is a scored requirement and it must be genuinely verified, not assumed.
```

---

## PHASE R3 — Worst-night profile and CSV ingest

```
Read first: brain/04_DATA_MODEL.md (worst_night_profile), brain/05_DATA_SOURCES.md
section 1, brain/07_API_CONTRACT.md (/weather/csv), brain/09_ERROR_HANDLING.md
section 6.

Before coding, state:
  - why we use the NASA POWER DAILY API here and not hourly
  - what the grid resolution caveat is and where it must be surfaced
  - why CSV errors must be column-level and collected, not fail-fast

TASK — Phase R3
1. Worst-night profile (design winter night mode):
   - Pull ~10 years of DAILY minimum temperature and daily irradiance from NASA
     POWER for the site. Daily, not hourly — the hourly fetch is far heavier and
     we do not need it.
   - Compute the 1st percentile daily minimum and the 5th percentile daily
     irradiance.
   - Synthesise a 24-hour profile from those two figures using a standard
     diurnal shape. Document the shape you used and cite it.
   - Store in worst_night_profile, INCLUDING grid_note:
     "NASA POWER ~0.5x0.625 deg grid — regional estimate, not a site measurement"
   - Wire weather.mode = "design_winter_night" to use it.

   CRITICAL HONESTY REQUIREMENT: this is a REGIONAL estimate. In Ladakh's terrain
   a 50 km grid cell spans enormous elevation variation. grid_note must reach the
   UI, not just the database. Never present it as "the coldest night at your site."

2. api/csv_ingest.py:
   - Parse pasted CSV: datetime, t_air_c, ghi_wm2 required;
     dni_wm2, dhi_wm2, wind_ms, rh_pct optional.
   - Collect ALL errors, do not stop at the first. Return row + column + problem
     per brain/09_ERROR_HANDLING.md section 6.
   - Missing optional columns produce warnings, not failures.
   - Store under a user_csv_id, provider "user-csv".
   - Ship /data/fixtures/fixture_example_user_weather.csv for the demo.

VERIFICATION — paste actual output:
  a. Generate the P1 profile for Leh. Print p1_daily_min_c, p5_daily_ghi,
     years_used, grid_note.
  b. Run the SAME design in typical_day and design_winter_night mode.
     EXPECTED: the P1 run is substantially colder. Print both minima.
  c. Paste a valid CSV. Confirm it runs and provenance says "user-csv".
  d. Paste a CSV with a bad number in row 14 AND a bad date in row 22.
     EXPECTED: BOTH errors returned together, with row and column.
     Paste the response.
  e. Paste a CSV missing dni_wm2. EXPECTED: succeeds with a warning.

CONSTRAINTS
- Daily API, not hourly.
- grid_note must be in the API response, not only in the DB.
- Never fail-fast on CSV errors.

OUTPUT: PHASE REPORT. Section 5 must state exactly what diurnal shape you used
to synthesise the profile and why. That is a modelling assumption a judge could
reasonably ask about.
```

---

## PHASE R4 — Results components (switch to frontend)

```
You are now working in /web. Read first:
  brain/08_UI_SPEC.md (all of it — especially the colour semantics)
  brain/07_API_CONTRACT.md (response shapes you are rendering)

Swapnil owns /web/src/tokens.css and tailwind.config.js. YOU MAY NOT EDIT THEM.
You may only USE the tokens they define.

Before coding, state:
  - the four semantic colours and their single permitted meanings
  - why every number renders in mono
  - what [estimate] means and why it must never be hidden

TASK — Phase R4
Build these in /web/src/components/results/. Use ONLY token variables for colour,
spacing and type. NO hardcoded hex values anywhere — the palette is provisional
and will be swapped in one file.

1. MetricCards — four cards: min at dawn, comfort hours, hours below health
   threshold, kerosene avoided. Values in --text-metric (JetBrains Mono),
   labels in --text-caption.
2. HeatLossBreakdown — horizontal stacked bar from summary.heat_loss_kwh.
   Label the sky_radiation segment clearly; it is a differentiator and people
   should see it.
3. SpecSheetCopy — one button, clipboard only. Exact format in
   brain/08_UI_SPEC.md section 5. NO PDF LIBRARY.
4. WeatherProvenanceBanner — shows provider, live/archive, and grid_note when
   present. When provider is "fallback", make it visible that offline data is
   in use. This is honesty surfaced in the UI and it is deliberate.
5. RefusalCard — rendered when refused is true. --danger border, the reason
   text, and a "what to change" line. STYLE IT AS A RESULT, NOT A CRASH. The
   user asked a valid question and got a valid answer.

VERIFICATION — paste or describe with screenshots:
  a. Every component rendered against real API data.
  b. Search the codebase for hardcoded hex colours in your files.
     Paste the search result. EXPECTED: zero matches.
  c. Trigger a refusal (0.3 ACH + unflued heater). Confirm RefusalCard renders
     and does not look like an error state.
  d. Trigger the fallback weather path. Confirm the banner appears.
  e. Copy the spec sheet and paste it somewhere. Show the actual pasted text.
  f. Resize to 390 px. Confirm cards reflow and nothing overflows.

CONSTRAINTS
- Do not edit tokens.css or tailwind.config.js.
- Do not edit files outside /web/src/components/results/.
- No hardcoded colours, ever.
- Never render undefined or NaN — show an em dash.

OUTPUT: PHASE REPORT. Section 4 must include the hex-search result from (b).
```
