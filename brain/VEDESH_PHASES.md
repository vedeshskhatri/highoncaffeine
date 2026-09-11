# ANTIGRAVITY PHASE PROMPTS — VEDESH (Engine, Optimizer, Integration)

**How to use:** paste one phase at a time. Do not paste two. Wait for the phase report, read it, verify section 4 and section 9 yourself, then paste the next.

**If a report is missing sections, or section 6 contains a value with source "assumed" or "typical", send it back before proceeding.** That is a Rule R1 violation and it is exactly the failure this whole structure exists to catch.

**Phase report note:** Section 2 (FILES TOUCHED) must include the commit hash that was pushed to `main` (`Pushed commit: <hash>`).

---

## PHASE V0 — Repository skeleton and frozen contract

```
You are working on THERMA, a shelter thermal design tool for SIH 2026 PS 26051 (DRDO).

FIRST: read these files completely before writing any code.
  brain/00_MASTER_RULES.md
  brain/02_TRD.md
  brain/03_ARCHITECTURE.md
  brain/04_DATA_MODEL.md
  brain/07_API_CONTRACT.md

Confirm you have read them by restating, in your own words, in 5 bullets:
  - the eight hard rules
  - the ownership map and which paths are yours
  - what MAX_NODES is for and why it must be fixed
  - why glazing has zero capacitance
  - what "the contract is frozen" means for the other three agents

TASK — Phase V0
1. Create the folder structure exactly as specified in 02_TRD.md section 2.
   Empty __init__.py files where needed. Do not create files outside that structure.
2. Create engine/constants.py containing ONLY:
   - MAX_NODES (choose a value, justify it in the report from the material set in
     04_DATA_MODEL.md and the Fourier sizing rule in 06_PHYSICS_SPEC.md section 2)
   - DT_INTERNAL_S = 60
   - SPINUP_DAYS = 3
   - FO_TARGET = 0.25
   No physical constants here — those belong to Aman in physics_constants.py.
3. Create engine/types.py with the Design, Layer, Opening dataclasses from
   04_DATA_MODEL.md. Frozen. Type-annotated. Docstrings stating units.
4. Create requirements.txt from the closed dependency list in 02_TRD.md section 1.
   Nothing beyond that list.
5. Create a stub for every engine module named in 02_TRD.md section 2 that you own.
   Every function signature present, every body:
       raise NotImplementedError("PHASE Vn — not yet implemented")
   Do NOT return placeholder values. Do NOT return zeros. Rule R2.
6. Verify: `python -c "import engine.solver, engine.types, engine.constants"` runs
   and raises nothing at import time.

CONSTRAINTS
- Do not implement any physics in this phase.
- Do not touch /api, /web, /tests, /validation, /data — those are not yours.
- Do not add any dependency not in 02_TRD.md.
- Do not modify brain/07_API_CONTRACT.md.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
Emit the PHASE REPORT block exactly as defined in brain/00_MASTER_RULES.md section 4.
All ten sections. In section 5 justify your MAX_NODES choice with the arithmetic.
```

---

## PHASE V1 — Single-node conduction solver

```
Read first: brain/06_PHYSICS_SPEC.md (all of it), brain/00_MASTER_RULES.md section 2.

Before writing code, state in your response:
  - the governing equation you are implementing, in your own words
  - units on every term
  - for each Q term: does positive mean heat ENTERING or LEAVING the indoor air node

TASK — Phase V1
Implement the simplest solver that runs. One node per surface. Conduction only.
No solar, no infiltration, no sky radiation, no spin-up yet.

1. engine/solver.py: run_single(design, weather, opts) -> SolverResult
   - Internal computation in KELVIN. Convert at the boundary only.
   - Explicit forward Euler, DT_INTERNAL_S from constants.
   - Output aggregated hourly.
2. Use surface film resistances R_si = 0.13, R_se = 0.04 m2K/W (ISO 6946).
   Cite that in a comment.
3. Where you need a material property, call engine.materials (Aman's module).
   If it does not exist yet, import it and let the ImportError surface — do NOT
   inline material values. Rule R1.
4. Add divergence detection: raise SolverDivergedError with node index, timestep,
   Fourier number and material, per brain/09_ERROR_HANDLING.md section 5.

VERIFICATION — run these and paste actual terminal output, not a description:
  a. Constant outdoor -20C, no solar, no occupants, 48h.
     EXPECTED: indoor asymptotes toward -20C, monotonically, no oscillation.
  b. Same but outdoor 0C. EXPECTED: asymptotes toward 0C.
  c. Print the first 5 and last 5 hourly values for both.

If (a) oscillates or diverges, STOP. Do not tune the timestep to hide it.
Report it — per brain/06_PHYSICS_SPEC.md section 13 the usual cause is a
capacitance node where there should not be one.

CONSTRAINTS
- Do not implement solar, infiltration, or radiation yet.
- Do not invent any material value.
- Do not edit files outside /engine.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT, all ten sections. Section 9 must honestly list what you did
not verify — for example, you have not verified behaviour with real weather.
```

---

## PHASE V2 — Multi-layer discretisation

```
Read first: brain/06_PHYSICS_SPEC.md sections 2 and 3.

Before coding, state the Fourier criterion and show the arithmetic for one worked
example: 300 mm mud brick at dt=60s. How many nodes does the rule give?

TASK — Phase V2
1. engine/discretise.py:
   - alpha = k / (rho * Cp)
   - dx_max = sqrt(alpha * dt / FO_TARGET)
   - n_nodes_layer = max(1, ceil(thickness / dx_max))
   - C_node = rho * Cp * dx_actual * A
   - K_node = k * A / dx_actual
   - interface conductance in series: 1/(1/K_a + 1/K_b)
2. GLAZING IS PURE RESISTANCE WITH ZERO CAPACITANCE. Do not create capacitance
   nodes for glass under any circumstances. Read 06 section 3 again if unsure.
3. Night shutter: U_effective = 1/(1/U_glass + R_shutter) when closed.
4. Wire multi-node surfaces into solver.run_single.

VERIFICATION — paste actual output:
  a. Sanity test 1 (steady state) STILL passes after this change.
  b. NEW: 300 mm mud brick wall, real diurnal outdoor swing.
     EXPECTED: indoor peak LAGS outdoor peak, and indoor amplitude is SMALLER
     than outdoor amplitude. Print both peak hours and both amplitudes.
  c. Compare 100 mm vs 400 mm of the same material.
     EXPECTED: thicker wall shows MORE lag and LESS amplitude.
  d. Print the node count produced for each layer in a test envelope.

If (b) shows no lag, thermal mass is not connected. That is the single most
common failure here — see 06 section 13.

CONSTRAINTS
- Do not add solar or radiation yet.
- Do not change the timestep to make something work.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. In section 4 include the actual node counts. In section 5
state any assumption about how area is apportioned across nodes.
```

---

## PHASE V3 — Solar and infiltration

```
Read first: brain/06_PHYSICS_SPEC.md sections 4, 6 and 7.

Before coding, state:
  - why cos_theta must be clamped at zero, and what happens if it is not
  - the altitude air density formula and what rho is at 3500 m, -20 C
  - the expected ratio versus sea level

TASK — Phase V3
1. Solar. Call Aman's engine.physics_constants for solar position and ground
   albedo. Do NOT write your own solar position algorithm. If his module is not
   ready, let the ImportError surface and report it as a blocker.
   - I_total = I_beam + I_diff + I_ground per 06 section 4.3
   - CLAMP cos_theta at zero. This is mandatory.
   - Q_solar_glazing = I_total * A * g_value * SF
   - Q_solar_abs onto the OUTER node of opaque surfaces
2. Infiltration, altitude-corrected, per 06 section 6.
   Use Aman's air density function. Do not hardcode 1.225.
3. Internal gains: n_people * watts_per_person.
4. Heat loss breakdown by path, accumulated per timestep, for the response
   summary.heat_loss_kwh in brain/07_API_CONTRACT.md.

VERIFICATION — paste actual output:
  a. Sanity tests 1 and 2 still pass.
  b. Add 4 m2 of south glazing. EXPECTED: daytime indoor peak RISES and
     overnight minimum FALLS. Print both deltas.
     If only one moves, a sign is backwards. Stop and report.
  c. North-facing wall at solar noon. EXPECTED: solar gain >= 0, never negative.
  d. Same design at altitude_m=0 and altitude_m=3500, identical air temperature.
     EXPECTED: infiltration loss ratio approximately 0.65. Print the actual ratio.
  e. Print the heat loss breakdown; confirm the paths sum to total losses.

CONSTRAINTS
- Do not implement sky radiation yet — that is V4.
- Do not inline any constant that belongs in physics_constants.py.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 6 must list every numeric constant you used and
where it came from. Any row sourced "assumed" is a rule violation — flag it.
```

---

## PHASE V4 — Sky radiation and spin-up (GATE 2)

```
Read first: brain/06_PHYSICS_SPEC.md sections 5 and 8. This is the physics that
explains the entire problem statement.

Before coding, state:
  - why a roof loses heat at night even with zero conduction
  - the sky view factor for a roof versus a vertical wall
  - what UNIT T must be in the h_r expression, and what happens if it is Celsius
  - why spin-up is needed and what failure it prevents

TASK — Phase V4
1. Sky radiation per exterior surface, using Aman's sky temperature function:
     h_r = eps * sigma * (T_s^2 + T_sky^2) * (T_s + T_sky)
     Q_sky = h_r * A * F_sky * (T_s - T_sky)
   Recompute h_r EVERY timestep from the previous step's T_s.
   Do not iterate to convergence.
   F_sky = 1.0 roof, 0.5 vertical wall.
   ALL TEMPERATURES IN KELVIN.
2. Spin-up: 3 days of repeated driving weather, DISCARDED. Report only the final
   24 hours. Initialise all nodes at hour-0 ambient.
3. Add sky_radiation as its own line in the heat loss breakdown.

VERIFICATION — paste actual output. THIS IS GATE 2.
  a. Run the same design with and without the sky term.
     EXPECTED: the overnight collapse is visibly STEEPER with it. Print the
     hour-by-hour difference and the delta in overnight minimum.
  b. Roof emissivity 0.90 vs 0.25, all else identical.
     EXPECTED: low-e roof shows a SHALLOWER overnight drop. Print the delta.
     This is the finding we present — a low-e coating competing with insulation.
  c. With and without spin-up, same input.
     EXPECTED: the first hours differ substantially; the spun-up run is stable.
  d. Sanity tests 1, 2 and 3 still pass.
  e. Confirm in code that no Celsius value reaches h_r or any T^4 expression.
     Show the line where conversion happens.

CONSTRAINTS
- Do not proceed to V5 until (a) and (b) both show the expected direction.
- If the overnight drop does not steepen, the term is wrong or F_sky is wrong.
  Do not move on.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 4 must contain actual numbers for (a) and (b),
not descriptions. Section 10 is NO unless both directions are correct.
```

---

## PHASE V5 — Vectorisation across designs

```
Read first: brain/02_TRD.md sections T-6 and T-7, brain/04_DATA_MODEL.md
(NodeArray), brain/10_VALIDATION.md section 6 tests 6 and 7.

Before coding, state:
  - why a per-design Python loop is a specification violation
  - how padding works and what "inert" means
  - what the equivalence test is and why the optimizer cannot be trusted without it

TASK — Phase V5
1. engine/vectorise.py: pack(designs) -> NodeArray with arrays shaped
   (MAX_NODES, N). Designs with fewer nodes are padded: active=False, C=inf, K=0.
2. engine/solver.py: run_batch(node_array, weather, opts) -> (24, N) temperatures.
   Step time ONCE over the whole array. There must be no Python loop over designs.
3. Padded nodes must contribute EXACTLY zero to every flow. Not approximately.

VERIFICATION — paste actual output. THIS GATES THE OPTIMIZER.
  a. EQUIVALENCE: take one design. Run it through run_single and through
     run_batch with N=1. Print max absolute difference across all 24 hours.
     EXPECTED: < 1e-9. If it is not, stop. Do not proceed.
  b. EQUIVALENCE AT SCALE: pack 50 varied designs. For 5 of them chosen at
     random, compare against run_single. Print max difference for each.
  c. PADDING INERTNESS: build two batches — one where all designs have equal node
     counts, one where they vary and are padded. Include an identical design in
     both. EXPECTED: byte-identical result for that design in both batches.
  d. PERFORMANCE: time 3000 designs. Print elapsed seconds.
     BUDGET: under 8 s. If over, report the actual number — do not reduce the
     count to make the budget.
  e. Confirm with a code search that no loop over designs exists in the hot path.
     Paste the search result.

CONSTRAINTS
- If (a) or (c) fail, this phase is NOT done regardless of everything else.
- Do not start the optimizer until both pass.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 4 must contain the actual max-difference figures
and the actual timing. Section 10 is NO unless (a) < 1e-9 and (c) is exact.
```

---

## PHASE V6 — Optimizer, Pareto, sensitivity

```
PRECONDITION: Phase V5 tests (a) and (c) passed, and Aman's validation
(brain/10_VALIDATION.md) has PASSED including the ordering check.
If either is false, STOP and report. Do not build on an unvalidated engine.

Read first: brain/11_OPTIMIZER_SPEC.md (all), brain/07_API_CONTRACT.md
(/optimize, /sensitivity, /retrofit response shapes).

TASK — Phase V6
1. engine/optimizer.py:
   - sample(search_space, n): Latin hypercube or random over the space in the
     contract. Not a grid — a grid explodes combinatorially.
   - filter by constraints (locally_available_only, max_cost_inr)
   - safety filter via Aman's engine.safety; COUNT refusals, report as
     refused_unsafe. Do not hide them.
   - pack -> run_batch -> score
   - pareto_front over the two selected objectives. Do not collapse to a single
     weighted score.
   - top_3 with a `why` string
2. The `why` string is GENERATED MECHANICALLY from parameter deltas ranked by
   Morris effect, per 11_OPTIMIZER_SPEC.md section 5. It must NOT be written by
   a language model and must not contain any claim not derived from the numbers.
3. engine/sensitivity.py: Morris elementary effects, trajectories=20.
   Output feeds both the levers panel and the `why` generator.
4. Response shapes must match brain/07_API_CONTRACT.md exactly. Do not add,
   rename, or omit fields. If the contract is missing something you need, STOP
   and report it as a blocker — do not edit the contract yourself.

VERIFICATION — paste actual output:
  a. 3000 samples. Print evaluated, refused_unsafe, elapsed_s.
  b. Print the top-3 with their `why` strings. Manually confirm each claim in
     each string is traceable to a number in the result. State that you checked.
  c. Confirm the best design beats the baseline on comfort_hours_ratio. Print both.
  d. Toggle locally_available_only true/false. EXPECTED: the Pareto front changes.
     Print the front size and best comfort ratio for both.
  e. Set heater_type to unflued_combustion with a low-ACH search range.
     EXPECTED: refused_unsafe > 0. Print the count.
  f. Morris: print the ranked levers with effect magnitudes.
  g. Validate one returned `design` object by POSTing it to /simulate and
     confirming the summary matches what /optimize reported.

CONSTRAINTS
- No per-design loop.
- Never return a design the safety filter refused.
- n_samples reported must be the number ACTUALLY evaluated.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 4 includes actual figures for every check above.
Section 9 must state explicitly whether you verified (b) by hand or assumed it.
```

---

## PHASE V7 — ANSYS Install, Case 1 Setup and Solve

```
You are setting up the ANSYS reference model track for THERMA (SIH 2026, PS 26051).

FIRST: read brain/ANSYS_REFERENCE.md completely before touching ANSYS.
Also review validation/ansys/cases/case1.json and validation/ansys/README.md.

CONTEXT
ANSYS is our high-fidelity reference model; our Python 5R1C solver is the fast searchable surrogate.
Case 1 tests pure conduction and thermal capacitance on a bare box shelter under constant ambient temperature.

TASK — Phase V7
1. Download and install ANSYS Student 2023 R2+ (Mechanical Transient Thermal).
2. Set up Engineering Data with Mud_Brick:
   - k = 0.75 W/(m*K)
   - rho = 1700 kg/m^3
   - Cp = 880 J/(kg*K)
   All numbers sourced from data/materials.csv.
3. Model geometry in SpaceClaim / DesignModeler per ANSYS_REFERENCE.md Section 4:
   - Internal dimensions: 4.0 m (X) x 3.0 m (Y) x 2.5 m (Z)
   - 0.30 m homogeneous mud brick envelope
   - Air volume interior body
4. Mesh the geometry:
   - Target element size 100 mm (0.10 m)
   - Check Mesh Statistics: verify node count < 512,000 (Student limit)
5. Apply boundary conditions:
   - Initial temperature: 20.0 °C uniform across all bodies
   - External convection: h_e = 25.0 W/(m^2*K) to constant T_out = -10.0 °C on all exterior faces
   - No solar, no radiation
   - End time: 86400 s (24 h), timestep 60 s
6. Insert Temperature Probe at indoor air center (Probe_Indoor_Air).
7. Solve Transient Thermal analysis.
8. Export probe results table to validation/ansys/results/ansys_case1_export.csv.
9. Run compare script:
   python -m validation.ansys.compare --case case1 --ansys-csv validation/ansys/results/ansys_case1_export.csv

VERIFICATION — paste actual numbers into the report:
  a. Mesh statistics: report exact node count and element count.
  b. Solve elapsed clock time in ANSYS Mechanical.
  c. Paste first 5 rows and last 5 rows of validation/ansys/results/ansys_case1_export.csv.
  d. Paste output of compare.py: report exact Max Delta T, RMSE, and Mean Bias.
  e. Confirm Max Delta T <= 0.50 °C tolerance. If failed, follow diagnostic guide in ANSYS_REFERENCE.md Section 7.

CONSTRAINTS
- Material properties must match data/materials.csv exactly.
- Do not modify engine/ or api/.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests (pytest tests/ -v)
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. All ten sections required.
```

---

## PHASE V8 — ANSYS Cases 2 and 3 Setup and Solve

```
You are continuing the ANSYS reference track for THERMA (SIH 2026, PS 26051).

FIRST: review validation/ansys/cases/case2.json, case3.json, and brain/ANSYS_REFERENCE.md Sections 3 and 4.

TASK — Phase V8
1. Case 2 (Multi-layer Wall, Diurnal Swing):
   - Geometry: 4.0 x 3.0 x 2.5 m shelter with multi-layer envelope:
     * Walls: 0.25 m mud brick (outer) + 0.05 m EPS board (inner)
     * Roof: 0.002 m CGI sheet (outer) + 0.10 m EPS board (inner)
     * Floor: 0.05 m EPS board + 0.10 m dense concrete
   - Tabular diurnal outdoor temperature: 24h sinusoid (-15 °C min at 03:00 to +5 °C max at 15:00)
   - External convection h_e = 25.0 W/(m^2*K) to tabular ambient
   - Solve 48h (evaluate final 24h); export probe to validation/ansys/results/ansys_case2_export.csv
2. Case 3 (Solar Flux + Sky Radiation):
   - Same multi-layer envelope as Case 2
   - South face: Tabular Heat Flux q''_sol(t) from case3.json (absorptivity alpha = 0.70)
   - Roof face: Tabular Radiation to Swinbank sky temperature T_sky(t) from case3.json (emissivity eps = 0.90)
   - Solve 48h; export probe to validation/ansys/results/ansys_case3_export.csv
3. Execute compare script for both cases:
   python -m validation.ansys.compare --case case2 --ansys-csv validation/ansys/results/ansys_case2_export.csv
   python -m validation.ansys.compare --case case3 --ansys-csv validation/ansys/results/ansys_case3_export.csv

VERIFICATION — paste actual numbers into the report:
  a. Node counts for Case 2 and Case 3 meshes (< 512,000).
  b. Case 2: Peak indoor temperature and time of peak in ANSYS vs Python (verify thermal lag).
  c. Case 3: Peak daytime indoor temperature and overnight minimum in ANSYS vs Python.
  d. Paste first 5 and last 5 rows of ansys_case2_export.csv and ansys_case3_export.csv.
  e. Paste compare.py output for Case 2 (confirm Max Delta T <= 1.00 °C).
  f. Paste compare.py output for Case 3 (confirm Max Delta T <= 1.50 °C).

CONSTRAINTS
- Solar load applied strictly as imposed heat flux, not native CFD ray tracing (see ANSYS_REFERENCE.md Section 3).
- All numbers sourced from data/materials.csv and case JSONs.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. All ten sections required.
```

---

## PHASE V9 — Comparison Suite, Agreement Table, and Handover

```
You are finalizing the ANSYS reference track for THERMA (SIH 2026, PS 26051).

TASK — Phase V9
1. Run the unified reference comparison suite:
   python -m validation.ansys.compare --all
2. Verify all three overlay plots are generated in validation/ansys/plots/:
   - case1_overlay.png
   - case2_overlay.png
   - case3_overlay.png
3. Update brain/ANSYS_REFERENCE.md Section 7 and brain/10_VALIDATION.md Section 2b:
   - Fill in the agreement table shell with the REAL measured deviation numbers and RMSE.
   - Replace [TO COMPLETE V9] markers with the verified values.
4. Review Section 10 of brain/ANSYS_REFERENCE.md (Handover note for Aman). Confirm Aman has the exact numbers to speak to the panel.

GATE: The agreement table in brain/ANSYS_REFERENCE.md and brain/10_VALIDATION.md is filled in with real deviations from actual runs, and all three cases pass tolerance.

VERIFICATION — paste actual output:
  a. Paste the complete output of `python -m validation.ansys.compare --all`.
  b. Confirm all three cases report PASS in the table.
  c. Confirm git diff shows real numbers populated in brain/ANSYS_REFERENCE.md and brain/10_VALIDATION.md.
  d. Confirm git status is clean and main is the only branch.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. All ten sections required.
```
