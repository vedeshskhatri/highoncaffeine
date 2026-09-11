# 11 — OPTIMIZER SPEC

**Owner: Vedesh.** Do not start until `10_VALIDATION.md` tests 6 and 7 pass.

## 1. Why this exists

The problem statement asks the model to *"predict the most efficient combination of materials, shape, and size."* That is a search, not a grade.

Positioning: other software grades a design you already picked; ours searches thousands and picks for you. This module is that difference.

## 2. Approach

**Phase 1 — random / Latin hypercube sampling.** Works immediately, parallelises trivially, good enough for 3,000 samples. Ship this.

**Phase 2 — NSGA-II**, only if time remains. The literature pattern for passive design optimisation is NSGA-II with Pareto front analysis, often with a surrogate to cut cost. We are not building the surrogate (cut for headcount) — say so as roadmap.

## 3. Pipeline

```
sample(search_space, n)            -> list[Design]
filter(constraints)                -> drop locally-unavailable / over-budget
safety_filter(heater_type)         -> drop refused, COUNT them
vectorise.pack(designs)            -> (MAX_NODES, N)
solver.run_batch(...)              -> (24, N) temperatures
score(...)                         -> comfort_hours_ratio, cost, t_min
pareto_front(...)                  -> non-dominated set
top_3(...)                         -> ranked + generated `why`
```

`refused_unsafe` is **reported, not hidden**. "412 of 3,000 designs were rejected for inadequate ventilation with a combustion heater" is a strong thing to say out loud.

## 4. Objectives

| Objective | Definition |
|---|---|
| `maximise_comfort_hours` | `comfort_hours_ratio` against the IMAC band |
| `minimise_hours_below_health` | count below 18 °C — often the better headline |
| `minimise_cost` | sum of material volume × `cost_per_m3` |
| `minimise_kerosene` | residual backup fuel litres/year |

Pareto over the selected pair. Never collapse to a single weighted score — the trade-off is the information, and "warmest" and "cheapest" are different designs the user should see.

## 5. The `why` string — generated, never written by an LLM

```python
def build_why(design, baseline, sensitivity_ranks) -> str:
    deltas = diff_parameters(design, baseline)
    ranked = sorted(deltas, key=lambda d: sensitivity_ranks[d.param])
    top2 = ranked[:2]
    return (f"{describe(top2)}. Overnight minimum rises "
            f"{design.t_min - baseline.t_min:.1f} C versus baseline; "
            f"{top2[0].label} contributes {top2[0].effect:.1f} C of that.")
```
Deterministic, traceable, defensible. If a judge asks where the sentence came from, the answer is a parameter diff ranked by Morris effect.

## 6. Sensitivity — Morris screening

Morris elementary effects, `trajectories = 20`, giving `runs = 20 * (k+1)`.

Chosen because sensitivity studies consistently find a handful of parameters dominate — one study found **5 of 129 factors** drove most uncertainty in heating and cooling needs; another found **12 of 81** explained 94% of output variability. And for reduced-order building models, **Morris ranking usually matches the far more expensive Sobol method**. Cheap screening, near-Sobol ranking, on exactly our class of model.

Output feeds both the levers panel and the `why` generator.

## 7. Retrofit ranking

Not new physics — a sort over sensitivity output constrained to interventions applicable to an *existing* envelope.

```
degrees_per_1000_inr = delta_t_min_c / (cost_inr / 1000)
```
Ranked descending, with cumulative columns assuming rank order.

**This answers the question people actually ask.** Nobody demolishes a shelter; almost every real decision is about an existing building.

## 8. Performance

| Operation | Budget |
|---|---|
| 3,000 designs, 24 h + 3-day spin-up | < 8 s |
| Morris, ~240 runs | < 2 s |

If over budget: reduce `n_samples` and **say so honestly in the UI**. 500 designs in 1 s still beats one design. Never fake the count.

## 9. Hard rules

- **No per-design Python loop.** All designs as array columns. A loop is a spec violation and makes NFR-2 unachievable.
- Do not run the optimizer before validation tests 6 and 7 pass.
- Never return a design the safety interlock refused.
- `n_samples` reported in the response must be the number **actually evaluated**.
