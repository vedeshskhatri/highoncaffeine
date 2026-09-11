# 09 — ERROR HANDLING

## 1. Principle

**Fail loudly in code, fail gracefully in UI.** A stub that returns plausible fake data is worse than a crash, because it ships wrong numbers silently (Rule R2).

## 2. Custom exceptions

```python
class ThermaError(Exception): ...
class UnsourcedMaterialError(ThermaError):  # material row without a source
class UnknownMaterialError(ThermaError):
class SolverDivergedError(ThermaError):     # carries node index + timestep
class WeatherUnavailableError(ThermaError):
class ContractViolationError(ThermaError):  # response doesn't match 07
```

## 3. Mapping

| Exception | HTTP | UI |
|---|---|---|
| Pydantic ValidationError | 422 | inline field errors |
| UnknownMaterialError | 400 | "Material not in library" + link to list |
| UnsourcedMaterialError | 400 | "Material has no cited source and cannot be used" |
| WeatherUnavailableError | 503 | banner + offer fallback CSV |
| SolverDivergedError | 500 | "Simulation did not converge" + the input that broke it |
| Safety refusal | **200** | RefusalCard — not an error |

## 4. Weather fallback chain

```
1. SQLite cache            -> use, provider as stored
2. Open-Meteo live         -> use + write cache, is_live: true
3. NASA POWER archive      -> use + write cache, is_live: FALSE
4. /data/weather/leh_january_fallback.csv -> use, provider 'fallback', banner in UI
5. 503
```
**Never silently substitute.** `weather_provenance` in every response tells the UI exactly what was used, and the UI shows it.

## 5. Solver divergence

On any `NaN`, `inf`, or `|T| > 500 K`:
```python
raise SolverDivergedError(
    f"Node {i} diverged at step {t} (T={T[i]:.1f}K). "
    f"Fo={fo:.3f}, dx={dx:.4f}m, material={mat}. "
    f"Check timestep vs fastest time constant."
)
```
Diagnostic, not generic. Per `06_PHYSICS_SPEC.md` §13 the usual cause is a capacitance node on glazing or a layer discretised too coarsely.

## 6. CSV ingest

Validate per column, collect **all** errors, return them together. Never stop at the first.
```json
{ "detail": [
  { "row": 14, "column": "t_air_c", "problem": "not a number: '--'" },
  { "row": 22, "column": "datetime", "problem": "unparseable: '15/01 5pm'" }
] }
```
Warnings (missing optional columns) do not block — they appear in `warnings[]`.

## 7. Frontend

- Every fetch wrapped; no unhandled promise rejection
- Network failure shows "Backend not reachable" with the command to start it
- Never render `undefined` or `NaN` — show `—`
- React error boundary around the canvas so one broken chart doesn't blank the app

## 8. What not to do

- No bare `except:`
- No `except Exception: pass`
- No default values substituted for missing physical inputs
- No `console.log` debugging left in
- No stack traces shown to the user
