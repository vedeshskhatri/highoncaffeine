# Slide 5 (Impact & Benefits) — Verified Numbers

Produced 2026-09-12 by running the actual THERMA engine (`engine/solver.py`, `engine/material_suggestion.py`,
`engine/optimizer.py`, `api/platform.py`) in-process against the repo's own seeded/cached data. No code was
modified to produce these numbers. Governing rule applied throughout: **if a number could not be produced by
running the code or reading a cited source in this repo, it is marked UNVERIFIED — nothing was estimated or
interpolated to fill a gap.**

---

## 1. Constants table

| Constant | Value | Units | Source | File:line |
|---|---|---|---|---|
| Kerosene energy content (NCV) | 37.0 | MJ/L | IPCC 2006 GL for National GHG Inventories, Vol. 2, Table 1.2 | `engine/impact.py:27` |
| Kerosene CO2 factor (impact engine) | 2.5 | kg CO2/L | IPCC 2006 GL, Vol. 2, Table 1.4 (derived ~71,900 kg CO2/TJ, density ~0.80 kg/L) | `engine/impact.py:32` |
| Kerosene CO2 factor (military logistics engine) | **2.52** | kg CO2/L | No citation given — comment only says "density ~0.80 kg/L" | `engine/military_logistics.py:22` |
| Delivered kerosene cost, Siachen | 2,400 | INR/L | "Indian Defence Logistics public reporting" (no document named) + `brain/05_DATA_SOURCES.md` §6 | `engine/impact.py:36`, `brain/05_DATA_SOURCES.md:85` |
| Commercial base kerosene cost | 80 | INR/L | Uncited | `engine/military_logistics.py:19` |
| Heater efficiency | 0.85 | — | Uncited default ("bukhari/room heater") | `engine/impact.py:43,53` |
| Annualisation nights (platform site evaluation) | **120** | winter nights/yr | Uncited, hardcoded | `api/platform.py:421` |
| Winter isolation period (military logistics module) | **180** | days/yr | Uncited, hardcoded, contradicts the 120 used above | `engine/military_logistics.py:28,44` |
| Helicopter payload — SORTIE_CONFIG (used by `/forecast`) | 450 | L/sortie | Tagged `"basis": "estimate"` explicitly in code | `api/platform_config.py:14-20` |
| Helicopter payload — military_logistics module | **1,200** | L/sortie | Comment only: "Standard ALH/Mi-17 helicopter kerosene payload" — no document, no basis tag | `engine/military_logistics.py:9,20` |
| Convoy truck payload | 2,000 | L/vehicle | Uncited | `engine/military_logistics.py:10,21` |
| Baseline uninsulated post consumption | 22 | L/night | Uncited, hardcoded | `engine/military_logistics.py:61` |
| Health threshold (WHO) | 18.0 | °C | WHO Housing and Health Guidelines (2018) | `api/platform_config.py:51-53` |
| Critical/warning thresholds | 5.0 / 12.0 | °C | Tagged `"basis": "estimate"` — operational engineering judgement, not WHO-sourced | `api/platform_config.py:38-49` |

**Two internal contradictions found, not reconciled by the code:**
1. Two different CO2 factors (2.5 vs 2.52 kg/L) are used in different modules for the same fuel.
2. Two different helicopter payload figures (450 L "estimate" vs 1,200 L uncited) exist in two different modules, and two different annual "winter" durations (120 nights vs 180 days) are used to annualise fuel consumption. Neither contradiction is flagged anywhere in the UI.

---

## 2. Raw output of RUNS A–E (verbatim)

### RUN A — baseline uninsulated forward post (Leh 34.1526 N, 77.5771 E, 3,500 m canonical elevation, 15 occupants, `design_winter_night` P1 profile)

Weather provenance (from `get_weather(..., mode="design_winter_night")`):
```
{'provider': 'nasa-power', 'is_live': False, 'grid_note': 'NASA POWER ~0.5x0.625 deg grid – regional estimate, not a site measurement', 'fetched_at': '2026-09-12T04:03:12Z'}
```
Ambient temperature for the 24-hour P1 night ranges from a max of about -26.2 °C (midday, mild solar gain) to a min of -35.2 °C (night). This is Leh's cached worst-night profile, already in `worst_night_profile` table — not live-fetched.

Envelope simulated: stone masonry wall (0.35 m), concrete roof (0.15 m), stone floor (0.15 m), single-pane south glazing (1.5 m²), ACH 1.5, no heater — representative of an uninsulated forward-post shelter.

```
t_in_min_c: -30.94
t_in_max_c: -27.89
hours_below_health_threshold: 24
backup_heat_sizing: {'peak_kw': 2.45, 'hours': 24.0, 'kerosene_litres_per_night': 6.54}
annual_fuel_litres (x120 nights, per api/platform.py's own convention): 784.8
annual_cost_inr: 1,883,520.0
annual_co2_kg: 1,962.0
elapsed_solver_seconds: 2.616
heat_loss_kwh: {'walls': 13.881, 'roof': 9.216, 'glazing': 0.742, 'infiltration': 2.18, 'sky_radiation': 3.945}
```

### RUN B — same post, optimised via `engine.material_suggestion.suggest_materials(use_site_p1=True, weather_mode="design_winter_night")`

```
design_outdoor_c: -35.2
target_met: False           (target_indoor_c=18.0 was NOT achieved passively)
best_achieved_min_c: -2.5
evaluated_count: 144
elapsed_s: 0.815
```

Best-ranked design (rank 1 of 3 returned):
```
title: "Mud brick (adobe) + 100mm Expanded polystyrene (EPS)"
achieved_min_c: -2.5, achieved_mean_c: 1.5, achieved_max_c: 8.8
cost_inr: 115,820  (materials-only estimate; source: ASHRAE HoF 2021 Ch.26 Tbl 1 unit costs)
backup_heat: {peak_kw: 0.94, hours: 20.0, kerosene_litres_per_night: 1.79}
```

Derived (using the same ×120-nights/yr convention as `_evaluate_site_internal`):
```
annual_fuel_litres: 1.79 * 120 = 214.8 L
annual_cost_inr: 214.8 * 2400 = 515,520 INR
annual_co2_kg: 214.8 * 2.5 = 537.0 kg
```

**Savings, RUN A → RUN B, per post per year:**
```
litres avoided:  784.8 - 214.8   = 570.0 L
INR avoided:     1,883,520 - 515,520 = 1,368,000 INR  (₹13.68 lakh)
CO2 avoided:     1,962 - 537      = 1,425 kg (1.425 t)
percentage reduction: 570.0 / 784.8 = 72.65%
```

**STATE THE DISCREPANCY PLAINLY:** our engine's modelled reduction is **72.65%**, materially *higher* than LEDeG's published ~two-thirds (≈66%) reduction for Trombe retrofits in Ladakh. This is not reconciled here — it is flagged as a discrepancy to be understood before quoting either number. Note also that the design achieving this is NOT a Trombe wall specifically (it's a mud-brick+EPS insulation retrofit), so the two figures are not even measuring the same intervention — a further reason not to present them as validating each other.

Also note: even the best of 144 evaluated passive designs did **not** meet the 18 °C health threshold at the P1 design night (achieved -2.5 °C min, still 20.5 °C short) — a working backup heater is still required at this ambient extreme. The 72.65% figure is a reduction in backup fuel demand, not an elimination of it.

### RUN C — network scale (150 posts), explicit linear extrapolation from RUN B's single modelled post — **not 150 separate simulations**

```
litres avoided:  570.0 * 150   = 85,500 L/yr
INR avoided:     1,368,000 * 150 = ₹20,52,00,000/yr = ₹20.52 crore/yr
CO2 avoided:     1,425 * 150 kg = 213,750 kg = 213.75 tonnes/yr
```

### RUN D — `/programme` planner, real call against the seeded database (`api.platform.get_programme`, estate="Ladakh", budget=₹2,00,00,000)

```
coverage_str: "11 of 19 sites evaluated"
headline: "Retrofitting the 22 highest-return interventions costs ₹1.32 Cr and avoids an estimated 3,655 L of kerosene per year."
total_spend_inr: 13,200,000.0
total_litres_saved_per_year: 3,655.3
posts_funded_count: 22
```
Top rows (rank, site, intervention, cost, litres saved/yr, payback_years):
```
1  Pangong Tso North Post           Rockwool cavity infill  350,000   184.3   0.79
2  Tangtse Sector Station           Rockwool cavity infill  350,000   170.9   0.85
3  Chushul High Post                Rockwool cavity infill  350,000   147.8   0.99
...
10 Pangong Tso North Post           Trombe glazing upgrade  850,000   299.5   1.18
...
21 Dras Cold Point Post             Rockwool cavity infill  350,000    13.0  11.22
22 Dras Cold Point Post             Trombe glazing upgrade  850,000    21.1  16.79
```

**Is this real, or fixture data?** Partially real, partially assumed — be precise:
- The `estate/summary` seed of 51 sites in `data/therma.db` spans "Ladakh" (19 rows, only 11 of which have a cached `site_results` row from an actual solver run) plus several other unevaluated regional groupings (Jammu_Kashmir, Himachal_Pradesh, Uttarakhand, Sikkim, Arunachal_Pradesh — 0 evaluated).
- For each of the 11 *evaluated* Ladakh sites, `cur_fuel` (the `annual_fuel_litres` baseline) is a real number from an actual `run_single` solve, cached in `site_results`.
- The retrofit itself is **not** independently re-solved. `api/platform.py:711-743` applies a hardcoded 40% (Rockwool) or 65% (Trombe) fuel-avoidance multiplier to that real baseline, and a hardcoded package cost (₹3.5 lakh / ₹8.5 lakh). Those two percentages are **not documented anywhere in `brain/05_DATA_SOURCES.md`, `brain/11_OPTIMIZER_SPEC.md`, or the code comments** — they carry `cost_basis: "sourced"` for the cost figure, but nothing sources the 40%/65% savings ratio itself. This is a real gap: cost is sourced, the effect it buys is not.
- The cumulative cost/litres columns are computed correctly from the above (i.e., no further fabrication in the arithmetic), but they inherit the un-sourced 40%/65% assumption.

### RUN E — timing `engine.optimizer.optimize()` at `n_samples=3000` (full ISO 52016-1 solver, not the surrogate — confirmed by reading `engine/optimizer.py`, which calls `run_single`/`run_batch`; `engine/surrogate.py` is explicitly reserved for "interactive screening" only and is not invoked by `optimize()`)

Two consecutive real runs, same machine, same request:
```
Run 1: wall_clock_elapsed_s: 24.978   result['elapsed_s']: 24.96   evaluated: 600
Run 2: wall_clock_elapsed_s: 28.527   result['elapsed_s']: 28.53   evaluated: 600
n_samples requested: 3000 (both runs)
```

`engine/optimizer.py:563-564` hardcodes a cap:
```python
n_requested = int(request.get("n_samples", 3000))
# NFR-2 performance budget (< 8s): 600 samples evaluates thoroughly and completes in ~3-4s
n_to_sample = min(n_requested, 600)
```
The comment claims "~3-4s" for 600 samples; the actual measured time on this machine was **~25-28 seconds**, roughly 6-7x the commented estimate. Whether that gap is machine-specific (slower CPU than whoever wrote that comment used) was not something this run could determine — only that the code's own comment does not match what it produced here.

---

## 3. Claim-by-claim verdict table

| # | Claim | Verdict | Real value / reason |
|---|---|---|---|
| 1 | "1,77,000 litres of kerosene eliminated per year across 150 Siachen posts" | **CORRECTED** | 85,500 L/yr (RUN C), linear extrapolation from one modelled post. Draft is ~2.07x the modelled figure. |
| 2 | "saving Rs 42.48 crore per year in helicopter delivery costs" | **CORRECTED** | ₹20.52 crore/yr (RUN C). Draft is ~2.07x the modelled figure (same ratio as #1, as expected since cost is litres × constant). |
| 3 | "Rs 28.32 lakh saved per post per year" | **CORRECTED** | ₹13.68 lakh/post/yr (RUN B saving). Draft is ~2.07x the modelled figure. |
| 4 | "payback period of just 2.4 years" | **UNVERIFIED** | No single run produced this figure. The real `/programme` run (RUN D) shows a payback range of **0.79 to 16.79 years** across 22 real site×package combinations, median roughly 1.0-1.6 years for well-performing sites. 2.4 years falls inside the plausible band but is not the output of any specific computation found in this repo — a human must pick and cite a specific site/package if this number is to be used. |
| 5 | "442 tonnes of CO2 avoided annually" | **CORRECTED** | 213.75 tonnes/yr (RUN C). Draft is ~2.07x the modelled figure. |
| 6 | "Reduces ~168 helicopter fuel-delivery sorties per year" | **UNVERIFIED / FLAGGED** | Two conflicting litres-per-sortie constants exist (450 L "estimate" vs 1,200 L uncited — see Constants table). Applying RUN C's 85,500 L/yr gives either ~190 sorties (450 L config) or ~71 sorties (1,200 L config) — neither is 168, and which constant is "correct" is itself unresolved in the repo. **Also: the ₹2,400/L delivered cost already includes helicopter delivery overhead (per its own source comment), so presenting a separate sortie-count saving alongside the INR saving risks double-counting the same benefit twice on one slide.** |
| 7 | "3,000 designs in 8 seconds" | **CORRECTED / CONTRADICTED BY CODE** | `optimize()` hardcodes `n_to_sample = min(n_requested, 600)` (`engine/optimizer.py:564`) — it never evaluates 3,000 designs regardless of what is requested. Measured: 600 designs evaluated in 24.98s and 28.53s across two runs, using the full physics solver (not a surrogate). |
| 8 | "holding +17 C till dawn at -20 C ambient" | **APPROXIMATELY VERIFIED** | Running `suggest_materials(design_outdoor_c=-20.0, target_indoor_c=20.0)` on the same shelter/occupancy gives a best achieved indoor minimum of **16.5 °C** (`target_met: False`, since the stated target was 20 °C) — 0.5 °C short of "+17 °C" but directionally consistent with the claim under this specific geometry/occupancy/material combination. This is the one draft number close to what the engine actually produces. |
| 9 | "Ladakhi Civilian Households (5.5 lakh population)" | **UNVERIFIED** | No population figure for Ladakh appears anywhere in `brain/05_DATA_SOURCES.md`, `brain/18_CITATIONS.md` (this file does not exist in the repo), or any other `brain/*.md`. A human must source this externally and add it to `05_DATA_SOURCES.md` before it can be used. |
| 10 | "Nepal 2025: 1,300+ killed, 84,270 affected" | **UNVERIFIED (as sourced within this repo)** | The exact figures "Over 1,300 killed, ~5,500 missing, 84,270 affected" do appear in `brain/14_DEMO_CHECKLIST.md:67` and `brain/SURBHI_PHASES.md:78`, matching the slide's numbers — but neither location cites an external source (news agency, government report, UN OCHA, etc.), and no `brain/18_CITATIONS.md` exists. Per Rule R1 ("cite a paper we have not actually read the abstract of"), a number repeated in our own docs without an external citation does not satisfy the bar — a human must locate and attach the actual source before this goes on a slide. |

---

## 4. USE THESE NUMBERS

All below were produced directly by the engine calls in Section 2, on 2026-09-12, for a 15-occupant, 6m x 4m x 2.6m uninsulated-to-retrofitted forward post at Leh (34.1526 N, 77.5771 E, 3,500 m), evaluated against the cached NASA-POWER-derived P1 design winter night (ambient min -35.2 °C).

- **Per-post baseline fuel demand:** 784.8 L/yr kerosene, ₹18.84 lakh/yr, 1,962 kg CO2/yr *(RUN A)*
- **Per-post optimised fuel demand (best of 144 evaluated passive designs, still needs backup heat):** 214.8 L/yr, ₹5.16 lakh/yr, 537 kg CO2/yr *(RUN B)*
- **Per-post saving:** 570.0 L/yr, ₹13.68 lakh/yr, 1,425 kg (1.425 t) CO2/yr — a **72.65%** reduction in backup kerosene demand *(RUN B, derived)*
- **150-post network saving (explicitly a linear extrapolation from one modelled post, not 150 discrete simulations):** 85,500 L/yr, ₹20.52 crore/yr, 213.75 tonnes CO2/yr *(RUN C)*
- **Real programme-planner output for the 11 currently-evaluated Ladakh sites, ₹2 crore budget:** 22 interventions funded, ₹1.32 crore spent, 3,655 L/yr saved, payback range 0.79-16.79 years *(RUN D — real per-site baselines, hardcoded 40%/65% avoidance assumption)*
- **Best passive design at -20 °C ambient, 20 °C target:** 16.5 °C achieved indoor minimum (target not fully met) *(claim-8 test run)*
- **Optimizer capability, honestly stated:** the full physics solver evaluates up to 600 designs per call (hard-coded cap), taking ~25-30 seconds on this machine, not 3,000 designs in 8 seconds.

## 5. DO NOT USE

- "1,77,000 litres eliminated / 150 posts" — overstates the modelled figure by ~2.07x. Use 85,500 L/yr instead, and label it a linear extrapolation.
- "Rs 42.48 crore/yr" — overstates by ~2.07x. Use ₹20.52 crore/yr instead.
- "Rs 28.32 lakh saved per post per year" — overstates by ~2.07x. Use ₹13.68 lakh/post/yr instead.
- "442 tonnes CO2 avoided" — overstates by ~2.07x. Use 213.75 tonnes/yr instead.
- "payback period of just 2.4 years" as a single confident number — no run produces exactly this; the real spread is 0.79-16.79 years depending on site and intervention. Either cite a specific site/package or drop the false precision.
- "~168 helicopter sorties saved per year" — unsupported by either sortie-payload constant in the repo, and double-counts a saving already inside the ₹2,400/L delivered cost. Drop this line entirely, or replace it with a clearly-labeled estimate range (71-190 sorties) with the double-counting caveat attached.
- "3,000 designs in 8 seconds" — the code caps at 600 designs and took 25-30 s in two measured runs. Replace with "up to 600 designs, full physics solver, ~25-30 s" or investigate/fix the performance gap before re-measuring.
- "Ladakhi Civilian Households (5.5 lakh population)" and "Nepal 2025: 1,300+ killed, 84,270 affected" — neither has a citable external source in this repo. Do not present either as sourced; a human must add the citation to `brain/05_DATA_SOURCES.md` (or a new `18_CITATIONS.md`) first.

## 6. Screenshot readiness assessment

| Item | Verdict | Reason |
|---|---|---|
| a. `/programme` cumulative curve | **SAFE TO SCREENSHOT, with a caveat** | Cumulative cost/litres are computed arithmetic on real per-site baselines (RUN D confirms this). Safe to show, but the underlying 40%/65% avoidance assumption behind each package should be disclosed if the screenshot states or implies a precise litres-saved figure — it is not itself independently solved. |
| b. `/dashboard` aggregate strip | **NOT SAFE, as currently seeded** | Confirmed: only 11 of 19 "Ladakh"-tagged sites (and 0 of the ~32 other regional sites in the DB) have been evaluated. If the dashboard aggregates across an estate without showing "N of M evaluated," a screenshot risks implying full coverage that doesn't exist. Filter the estate/site selection to the 11 confirmed-evaluated Ladakh sites (or the demo's usual "Ladakh" 11+1 seed) before screenshotting, and keep the coverage string visible. |
| c. Spec sheet export | **Could not fully verify — likely SAFE with caveats** | No literal fabricated numbers were found in the export path checked (`engine/materials.py`, `api/platform.py` do carry explicit `cost_basis`/estimate tags rather than hiding assumptions). Did not render an actual export in this session (screenshots were out of scope per the task's constraints) to confirm no `[estimate]` tag is silently dropped in the UI layer — a human should do one dry-run export and visually check the cost_basis tags survive into the rendered document before presenting it. |
| d. Retrofit ranking (`/programme` items) | **NOT SAFE without a caveat** | Costs are tagged `cost_basis: "sourced"`, but as noted in RUN D, the fuel-avoidance percentage (40%/65%) that this cost is supposedly buying is not sourced anywhere in the repo. Screenshotting this ranking without disclosing that gap overstates the certainty of the litres-saved column. |

## 7. What I could not verify

- **The 40% (Rockwool) and 65% (Trombe) fuel-avoidance percentages** used by `/programme` — no citation, no derivation from the optimizer/solver for the specific retrofit, anywhere in the repo.
- **The 450 L/sortie vs 1,200 L/sortie discrepancy** — which, if either, is authoritative was not resolvable from the repo; both exist in active code paths.
- **The 120-nights vs 180-days winter-duration discrepancy** between `api/platform.py` (120 nights) and `engine/military_logistics.py` (180 days) — not reconciled anywhere; changes the annualised litres/cost/CO2 by up to 1.5x depending on which module is used.
- **"Rs 2,400/L" itself** — sourced only to "Indian Defence Logistics public reporting," with no specific document, report, or URL named in the repo. This may be defensible as an order-of-magnitude field figure, but it is not a citable, checkable source as it stands.
- **A payback figure of exactly 2.4 years** — the real range from an actual `/programme` run is 0.79-16.79 years; nothing in the repo isolates a scenario producing 2.4 specifically.
- **Ladakh civilian population (5.5 lakh)** — absent from the repo entirely. Requires an external census/government source.
- **Nepal 2025 casualty/affected figures** — present in internal planning docs (`brain/14_DEMO_CHECKLIST.md`, `brain/SURBHI_PHASES.md`) but without any external citation attached to them. A human needs to locate and attach the actual primary source (e.g., Nepal government/NDRRMA situation report, UN OCHA) before these numbers can be called sourced.
- **Whether the ~25-30 s measured optimizer time is representative of the actual demo/judging machine** — only measured on the machine this session ran on; the code's own comment claims ~3-4 s for 600 samples, a 6-7x discrepancy from what was actually measured here, unexplained.
- **Full spec-sheet export rendering** — read the export code paths but did not execute an end-to-end export in this session to visually confirm no `[estimate]` tag is dropped by the UI layer.
