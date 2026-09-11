# ANTIGRAVITY PHASE PROMPTS — AMAN (Physics, Materials, Validation, Safety)

**Your phases gate the whole project.** Vedesh cannot build the optimizer until your validation passes. Everything downstream is a loop over physics you own.

Paste one phase at a time. Verify the report yourself before moving on.

**The single most important rule for you: Rule R1, never invent a number.** More of your work than anyone else's consists of putting numbers into the system. Every one needs a source.

---

## PHASE A0 — Materials library with enforced sourcing

```
You are working on THERMA, a shelter thermal design tool for SIH 2026 PS 26051 (DRDO).

FIRST read completely:
  brain/00_MASTER_RULES.md
  brain/04_DATA_MODEL.md
  brain/05_DATA_SOURCES.md

Restate in your own words, in 4 bullets:
  - Rule R1 and what you must do when you cannot source a value
  - why materials.source is NOT NULL and what the loader must do
  - the difference between cost_source being NULL and source being NULL
  - which paths you own

TASK — Phase A0
1. Create /data/materials.csv with the category coverage in 04_DATA_MODEL.md:
   structural, insulation, glazing, mass, relief.
   Columns exactly as the schema in 04_DATA_MODEL.md.
2. EVERY ROW needs a real, specific source string. "ASHRAE" alone is NOT
   acceptable — "ASHRAE HoF 2021 Ch.26 Tbl 1" is the standard.
   IF YOU CANNOT SOURCE A MATERIAL, DO NOT INVENT VALUES FOR IT.
   Leave it out and list it in the report under section 8 as needed-from-others.
   A smaller sourced library beats a larger invented one.
3. cost_per_m3 may be NULL, or may have cost_source NULL. That is acceptable —
   the UI renders those with an [estimate] tag. What is NOT acceptable is a cost
   with a fabricated source.
4. engine/materials.py:
   - load() reads the CSV, returns a dict of Material objects
   - RAISES UnsourcedMaterialError on any row with empty/missing source
   - RAISES UnknownMaterialError on lookup of an id not present
   - resolve(envelope) returns the properties needed by the solver
   All functions have docstrings stating units.

VERIFICATION — paste actual output:
  a. Print every row with its source. Count rows.
  b. Add a deliberately unsourced row to a COPY of the CSV, load it, and show
     UnsourcedMaterialError being raised. Then delete the copy.
  c. Look up a nonexistent id, show UnknownMaterialError.
  d. Print which materials have locally_available = 1 and state your basis
     for each of those flags.

CONSTRAINTS
- Do not touch /engine/solver.py, /api, /web.
- Do not put physical constants here — those go in physics_constants.py in A1.

OUTPUT: PHASE REPORT per brain/00_MASTER_RULES.md section 4, all ten sections.
Section 6 is the most important section of this report. Every material property
must appear there with its source. If any row says "assumed" or "typical",
that is a rule violation and you must flag it in section 7.
```

---

## PHASE A1 — Physics constants module

```
Read first: brain/06_PHYSICS_SPEC.md sections 4, 5, 6, 9 and brain/05_DATA_SOURCES.md
sections 5 and 7.

Before coding, state:
  - what T_sky means physically and why it is far below air temperature at 3500 m
  - what happens if Celsius is passed to the Swinbank or h_r expressions
  - the air density at 3500 m and -20 C, with the arithmetic
  - why cos_theta must be clamped

TASK — Phase A1
Create engine/physics_constants.py. Pure functions, no internal dependencies.
Every function docstring states units on inputs and outputs.

1. Physical constants from brain/05_DATA_SOURCES.md section 7. Cite each.
2. sky_temperature_k(t_air_k, cloud_fraction=0.0)
   Swinbank: T_sky = 0.0552 * T_air^1.5, both KELVIN.
   Cloud correction per 06 section 5.1.
3. radiative_coefficient(eps, t_surf_k, t_sky_k) -> W/m2K
   h_r = eps * sigma * (Ts^2 + Tsky^2) * (Ts + Tsky)
4. atmospheric_pressure_pa(altitude_m) and air_density(altitude_m, t_air_k)
5. convective_coefficient(...) scaled by the density ratio versus sea level.
   State clearly in the docstring that this is a first-order correction.
6. solar_position(lat, lon, date, hour, tz) -> (altitude_deg, azimuth_deg)
   USE A PUBLISHED ALGORITHM (NOAA solar position or equivalent) and cite it
   in the docstring. DO NOT write one from memory. If you cannot implement a
   cited algorithm correctly, raise NotImplementedError and report it.
7. incidence_cosine(...) WITH THE CLAMP AT ZERO.
8. ground_albedo(snow_cover) -> 0.75 with snow, 0.20 without. Cite the range.
9. imac_comfort_band(t_running_mean_outdoor_c) -> (low_c, high_c)
   COEFFICIENTS MUST BE SOURCED from NBC 2016 / IMAC-R.
   IF YOU DO NOT HAVE THEM, raise NotImplementedError with a TODO naming what
   you need. DO NOT INVENT THE COEFFICIENTS. This is the single most likely
   place in the project for a fabricated number to enter.
10. HEALTH_THRESHOLD_C = 18.0, cited to WHO housing guidance.

VERIFICATION — paste actual output:
  a. sky_temperature_k for air at -20 C. Print both in C and K.
     EXPECTED: sky temperature substantially BELOW air temperature.
     State the delta and whether it is physically plausible.
  b. air_density at 0 m and 3500 m, both at -20 C. Print both and the ratio.
     EXPECTED ratio: approximately 0.65.
  c. solar_position for Leh (34.15 N, 77.58 E) at solar noon on 15 Jan.
     EXPECTED: solar altitude roughly 32 degrees, azimuth near due south.
     If your answer is wildly different, the algorithm is wrong — report it.
  d. incidence_cosine for a north-facing vertical wall at that time.
     EXPECTED: exactly 0.0 after clamping.
  e. Show a unit test asserting that passing Celsius to sky_temperature_k
     produces an obviously wrong result — demonstrating why Kelvin matters.

CONSTRAINTS
- Pure functions only. No file I/O, no imports from other engine modules.
- No invented coefficients anywhere. NotImplementedError is the correct output
  when you lack a source.

OUTPUT: PHASE REPORT. Section 6 must list EVERY constant and coefficient with
its source. Section 8 must list anything you could not source.
```

---

## PHASE A2 — Sanity test suite

```
Read first: brain/10_VALIDATION.md section 6, brain/13_TESTING.md.

Before coding, state in your own words why test 3 (window symmetry) catches sign
errors, and why tests 6 and 7 gate the optimizer.

TASK — Phase A2
Create tests/test_physics_sanity.py implementing all ten checks from
brain/10_VALIDATION.md section 6 as real pytest assertions.

Each test must:
  - have a docstring stating what physical behaviour it verifies
  - assert a DIRECTION or a RATIO, not a magic number
    (good: "overnight drop is smaller with insulation"
     bad:  "overnight minimum equals 4.2")
  - print the actual values it compared, so failures are diagnosable

Special attention:
- Test 3 must assert BOTH that daytime gain rises AND nighttime loss rises when
  glazing area increases. Asserting only one defeats the purpose.
- Test 6 (vectorisation equivalence) and Test 7 (padding inertness) may fail if
  Vedesh has not completed V5. That is expected. Mark them with
  pytest.mark.skipif on the absence of run_batch, and say so in the report.
- Test 8 must assert the altitude infiltration ratio is approximately 0.65.
- Test 10 must assert solar gain is never negative on a north-facing surface.

Also create tests/test_materials.py:
  - every row in the shipped CSV has a non-empty source
  - loader raises on an unsourced row
  - loader raises on an unknown id

VERIFICATION — paste actual pytest output, verbatim, not summarised:
  pytest tests/ -v
Report which pass, which fail, which skip, and for each failure your diagnosis
using brain/06_PHYSICS_SPEC.md section 13.

CONSTRAINTS
- Do not modify engine code to make a test pass. If a test fails, that is a
  finding for Vedesh, and it goes in section 8 of your report.
- Do not weaken an assertion to get green. A weakened test is worse than a
  failing one because it hides the problem permanently.

OUTPUT: PHASE REPORT. Section 4 is the verbatim pytest output. Section 8 lists
every failure as a blocker assigned to whoever owns that code.
```

---

## PHASE A3 — Validation against published measurements (GATE 3)

```
THIS IS THE GATE THAT DECIDES THE PROJECT. Read brain/10_VALIDATION.md completely
before doing anything.

Before coding, state:
  - the four validation targets and their tolerances
  - why the ORDERING requirement matters more than the absolute values
  - the seven-step debug order in 10_VALIDATION.md section 5
  - what is banned when a target is missed

TASK — Phase A3
1. Create /validation/scenarios/*.json — four full /simulate request bodies
   reproducing V1 through V4 from brain/10_VALIDATION.md section 2.
   Each config carries a comment block naming its source and the measured values.
2. Create validation/run.py:
   - executes all scenarios
   - compares against measured values and tolerances
   - performs the ORDERING check: model_mean(Trombe) > model_mean(direct_gain)
   - writes results to /validation/results/*.json
   - supports --check which exits 1 on any failure (CI uses this)
   - prints the exact report format in 10_VALIDATION.md section 7
3. Commit the results files.

VERIFICATION:
  Run `python -m validation.run` and PASTE THE OUTPUT VERBATIM.

IF ANY TARGET IS MISSED:
  Work the debug order in 10_VALIDATION.md section 5, in order, one step at a
  time. After each step, re-run and report what changed.

  ABSOLUTELY BANNED: fudge factors, calibration constants, tuning coefficients,
  scenario-specific adjustments, or changing a measured target value.
  If you cannot reach a target honestly, REPORT THE GAP. A model that misses by
  3 C and says so is worth more than one that hits exactly and cannot explain why.

  If the fix belongs in Vedesh's solver, do NOT edit it. Report it as a blocker
  with your diagnosis and the evidence.

IF THE ORDERING CHECK FAILS:
  This is a FAIL even if both scenarios are within tolerance. Stop. Report it.
  Ordering can only come from the physics being right; absolute agreement can
  come from calibration. A mechanical engineer on the panel will ask exactly this.

CONSTRAINTS
- Do not edit /engine/solver.py. Diagnose, report, let Vedesh fix.
- Do not adjust a tolerance to make something pass.
- Do not skip a scenario because it is inconvenient.

OUTPUT: PHASE REPORT. Section 4 is the verbatim validation output including the
ordering line. Section 9 must state honestly what you did NOT verify — for
example, you have not validated against any measurement you took yourself.
Section 10 is NO unless all four targets AND the ordering check pass.
```

---

## PHASE A4 — Safety interlock, impact translation, retrofit ranking

```
PRECONDITION: Phase A3 passed. If validation has not passed, stop — nothing
built on an unvalidated engine is worth building.

Read first: brain/06_PHYSICS_SPEC.md sections 10, 11; brain/05_DATA_SOURCES.md
section 6; brain/11_OPTIMIZER_SPEC.md section 7; brain/07_API_CONTRACT.md
(/retrofit and /sensitivity response shapes).

Before coding, state in your own words why the safety interlock exists and what
specific harm it prevents.

TASK — Phase A4
1. engine/safety.py:
   check(design, heater_type) -> SafetyResult(refused: bool, reason: str|None)
   Refuse when ach < ACH_MIN_COMBUSTION and heater is unflued combustion.
   ACH_MIN_COMBUSTION MUST BE SOURCED. If you cannot source it, raise
   NotImplementedError and report — do not pick a number that seems safe.
   The reason string must be plain language a non-engineer can act on.

   Rationale to keep in mind while writing it: the optimizer will drive
   infiltration down because sealing reduces losses. People burn kerosene
   bukharis inside these shelters. Sealing a shelter containing a combustion
   heater kills people. This is a guardrail against our own optimizer.

2. engine/impact.py:
   - kerosene litres from residual heating demand (37 MJ/L, efficiency stated)
   - INR from litres, using the delivered-cost figure in 05 section 6
   - CO2 from litres (2.5 kg/L)
   - payback years from capex delta and annual saving
   Every factor cited in the docstring.

3. Backup heat sizing per 06 section 10: peak kW, hours, litres per night.

4. Retrofit ranking per 11 section 7:
   degrees_per_1000_inr = delta_t_min_c / (cost_inr / 1000)
   Ranked descending, with cumulative cost and cumulative temperature columns.
   Each entry carries cost_basis: sourced | estimate | derived.
   Response shape exactly as brain/07_API_CONTRACT.md /retrofit.

5. Cost and effort data for the levers panel, per 07 /sensitivity response:
   cost_inr, cost_basis, install_note, derived_note.
   - costs come from materials.cost_per_m3 with its cost_source
   - mass figures are DERIVED (density x volume) — deriving is fine
   - anything unsourced gets cost_basis "estimate" so the UI tags it
   NEVER fabricate a cost and label it sourced.

VERIFICATION — paste actual output:
  a. Safety: 0.3 ACH + unflued combustion -> refused with a readable reason.
     0.3 ACH + electric -> not refused. 1.0 ACH + unflued -> not refused.
  b. Impact: for a known deficit, print litres, INR, CO2, and show the arithmetic.
  c. Retrofit: print the ranked list for a baseline shelter with degrees per
     1000 INR. Confirm the ordering is by that ratio, descending.
  d. Print every lever with its cost_basis. Count how many are "estimate".
     State that you confirmed each "sourced" one actually has a source.

CONSTRAINTS
- ACH_MIN_COMBUSTION unsourced = NotImplementedError, not a guess.
- Do not label an estimate as sourced. This is the highest-risk item in the
  whole build for our credibility.

OUTPUT: PHASE REPORT. Section 6 lists every factor with its source.
Section 7 states how many values ended up as "estimate" and why.
```
