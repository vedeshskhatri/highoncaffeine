# 15 — MICROTASKS

Flat checklist across all phases. Tick as done. Owner in brackets.

## Foundation
- [ ] [V] Repo skeleton, folder structure per `02_TRD.md` §2
- [ ] [V] `07_API_CONTRACT.md` reviewed and frozen
- [ ] [V] `MAX_NODES` constant fixed and documented
- [ ] [S] Fonts loaded, `tokens.css`, `tailwind.config.js`
- [ ] [R] `requirements.txt`, `package.json`, two-command setup verified

## Data
- [ ] [A] `materials.csv` with `source` on every row
- [ ] [A] Loader raises `UnsourcedMaterialError` on missing source
- [ ] [R] SQLite schema, four tables
- [ ] [R] `seed.py` rebuilds `therma.db` from CSV
- [ ] [R] Open-Meteo fetch + cache
- [ ] [R] NASA POWER archive fetch
- [ ] [R] Fallback CSV committed
- [ ] [R] P1 worst-night profile, daily API, 10 years, `grid_note` populated
- [ ] [R] CSV ingest with column-level errors

## Physics
- [ ] [A] Solar position, published algorithm, cited
- [ ] [A] `cos_theta` clamped at zero
- [ ] [A] Ground albedo, snow vs bare
- [ ] [A] Sky temperature, Swinbank, Kelvin
- [ ] [A] Linearised `h_r`, recomputed per step
- [ ] [A] Altitude pressure and air density
- [ ] [A] Convective coefficient density scaling
- [ ] [A] IMAC band coefficients — **sourced, not invented**
- [ ] [A] Health threshold 18 °C
- [ ] [A] `ACH_MIN_COMBUSTION` — **sourced**
- [ ] [A] Kerosene energy content, CO₂ factor

## Engine
- [ ] [V] Single node conduction
- [ ] [V] Fourier-based discretisation
- [ ] [V] Glazing as pure resistance, zero capacitance
- [ ] [V] Interface conductance in series
- [ ] [V] Surface film resistances, ISO 6946
- [ ] [V] Solar gains through glazing and onto opaque surfaces
- [ ] [V] Infiltration, altitude-corrected
- [ ] [V] Sky radiation per surface, correct `F_sky`
- [ ] [V] Internal gains
- [ ] [V] 3-day spin-up, discarded
- [ ] [V] Operative temperature from mean radiant
- [ ] [V] Heat loss breakdown by path
- [ ] [V] Freeze risk detection
- [ ] [V] Backup heat sizing

## Vectorisation — gates the optimizer
- [ ] [V] Fixed `MAX_NODES` padding
- [ ] [V] `run_batch` over `(MAX_NODES, N)`
- [ ] [A] Test 6: equivalence single vs batch
- [ ] [A] Test 7: padded nodes contribute exactly zero

## Optimizer
- [ ] [V] Sampler over search space
- [ ] [V] Constraint filter, locally available + budget
- [ ] [V] Safety filter, count refusals
- [ ] [V] Scoring
- [ ] [V] Pareto front
- [ ] [V] Top-3 with generated `why`
- [ ] [V] Morris sensitivity
- [ ] [A] Retrofit ranking, degrees per rupee

## API
- [ ] [R] Pydantic models for every request and response
- [ ] [R] `/simulate` `/optimize` `/sensitivity` `/retrofit`
- [ ] [R] `/materials` `/validation` `/weather/csv` `/health`
- [ ] [R] Weather provenance in every response
- [ ] [R] Refusal returns 200, not an error
- [ ] [A] Contract shape tests

## Validation
- [ ] [A] Four scenario configs
- [ ] [A] `validation.run` + `--check`
- [ ] [A] Results committed
- [ ] [A] All 10 sanity tests pass
- [ ] [A] **Ordering check: Trombe above direct-gain**

## UI
- [ ] [S] Step rail
- [ ] [S] Input rail, persistent, never remounts
- [ ] [S] Weather mode toggle at top, `grid_note` shown
- [ ] [S] Live cross-section SVG
- [ ] [S] Inline input validation
- [ ] [S] Temp chart, comfort band, health threshold shading
- [ ] [S] ΔT(indoor − ambient) chart, labelled as PS req 3
- [ ] [S] ΔT(B − A) chart
- [ ] [R] Metric cards
- [ ] [R] Copy-as-text spec sheet
- [ ] [S] Levers panel with cost/effort and `[estimate]` tags
- [ ] [S] Validation panel
- [ ] [S] Pareto plot, top-3 cards
- [ ] [S] Retrofit list
- [ ] [S] Refusal card
- [ ] [S] Responsive to 390 px, verified on a real phone

## Freeze
- [ ] [all] CI green
- [ ] [all] `git shortlog -sn` shows balanced contribution
- [ ] [all] README complete
- [ ] [all] Offline run verified
- [ ] [all] Demo rehearsed three times on a stopwatch
