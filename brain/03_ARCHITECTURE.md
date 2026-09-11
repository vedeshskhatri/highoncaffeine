# 03 — ARCHITECTURE

## 1. Layer diagram

```
  Site + weather        Shelter design        Material library
  Open-Meteo live       size/shape/angle      cited properties
  NASA POWER archive    envelope layers       locally_available
         |                     |                     |
         +---------------------+---------------------+
                               v
  +-----------------------------------------------------------+
  |  THERMAL ENGINE  -  EN ISO 52016-1 / 5R1C network          |
  |  multi-node walls, glazing as pure resistance              |
  |  + sky radiation  + altitude air density  + snow albedo    |
  |  NumPy-vectorised: N designs solved as N columns           |
  +----------------+--------------------------+---------------+
                   v                          v
      DESIGN SEARCH                  SENSITIVITY SCREEN
      3,000+ variants                Morris elementary effects
      Pareto front                   ranked levers + cost
                   \                        /
                    v                      v
  +-----------------------------------------------------------+
  |  SPEC SHEET  -  build-up, comfort hours, kerosene, payback |
  +-----------------------------------------------------------+
```

**Risk shape:** the engine is the project. Inputs are plumbing. Search and sensitivity are loops over the engine. The spec sheet is formatting. If the engine is right, everything else is a weekend. If it is wrong, all of it is theatre.

## 2. Request flow — `/simulate`

```
POST /simulate
  -> schemas.SimulateRequest        (Pydantic validation, reject early)
  -> weather.get(lat, lon, date, mode)
       cache hit?  -> SQLite
       miss?       -> Open-Meteo -> write cache
       offline?    -> fallback CSV
  -> materials.resolve(envelope)     (raises if unsourced material)
  -> discretise.build_nodes(envelope, dt)
  -> safety.check(design)            (may short-circuit with a refusal)
  -> solver.run(nodes, weather, opts)
       3-day spin-up, discarded
       final 24 h retained
  -> impact.translate(result)        (kerosene, rupees, CO2)
  -> schemas.SimulateResponse
```

## 3. Request flow — `/optimize`

```
POST /optimize
  -> schemas.OptimizeRequest
  -> optimizer.sample(search_space, n)      -> list[design]
  -> filter by constraints (locally_available, max_cost)
  -> vectorise.pack(designs)                -> (MAX_NODES, N) arrays
  -> solver.run_batch(packed, weather)      -> (24, N) temperatures
  -> score(comfort_hours_ratio, cost)
  -> pareto_front(scores)
  -> top_3 + generated `why` string
```

`why` is **generated from the delta against the baseline design**, not written by a language model. Example construction: compare each varied parameter against baseline, report the two largest contributors by sensitivity rank.

## 4. Module dependency rules

```
physics_constants  <- no internal deps (pure functions)
materials          <- no internal deps
discretise         <- materials
solver             <- discretise, physics_constants
vectorise          <- discretise
optimizer          <- solver, vectorise
sensitivity        <- solver, vectorise
impact             <- no internal deps
safety             <- no internal deps
api.*              <- everything in engine, one direction only
```

**The engine never imports from `/api`.** The engine must be runnable as a plain Python library with no web server. This is what makes it testable and what lets Aman validate independently.

## 5. State

There is none. Every request is self-contained. SQLite holds only cached weather, the materials table, and optionally saved runs for convenience. No sessions, no auth, no users.

## 6. Error propagation

| Layer | On failure |
|---|---|
| Pydantic | 422 with field-level detail |
| materials lookup | raises `UnsourcedMaterialError` -> 400 |
| weather fetch | falls back: cache -> CSV -> 503 with clear message |
| solver numerical instability | raises `SolverDivergedError` -> 500, logs node index and timestep |
| safety interlock | returns 200 with `refused: true` and reason — **not** an error |

The safety interlock is a *result*, not an exception. The user asked a valid question and got a valid answer that happens to be "don't do this."

## 7. Frontend architecture

```
App
 +- StepRail            (Design | Simulate | Optimize)
 +- InputRail           persistent left column, never remounts
 |    +- SiteFields
 |    +- GeometryFields
 |    +- EnvelopeBuilder
 |    +- CrossSectionSVG      live, redraws on every change
 |    +- WeatherModeToggle    typical day / design winter night
 +- Canvas              swaps by step
      +- DesignCanvas
      +- SimulateCanvas
      |    +- TempChart            indoor vs outdoor, comfort band
      |    +- DeltaAmbientChart    dT(indoor - ambient)   [PS req 3]
      |    +- MetricCards
      |    +- HeatLossBreakdown
      |    +- ValidationPanel      pre-run, committed results
      +- OptimizeCanvas
           +- ParetoPlot
           +- TopThreeCards
           +- LeversPanel          Morris + cost/effort callouts
           +- DeltaDesignChart     dT(B - A)
           +- RetrofitList
           +- SpecSheetCopy
```

State is React `useState` lifted to `App`. No state library. The input object is one shape, mirroring `SimulateRequest`.

## 8. Why not CFD — the standing answer

> "EN ISO 52016-1 exists specifically for this class of problem, and it is a published international standard, not something we invented. More importantly, a decision tool has to run the model thousands of times — ANSYS structurally cannot. We use the standard's simplified method and validate it against measured data."

Supporting precedent: ShelTherm, a shelter thermal model, achieved mean error +0.94 °C against real shelters versus +4.95 °C for the CIBSE Admittance method, and was rated ISO 13792 Class 1.
