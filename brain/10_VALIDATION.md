# 10 — VALIDATION

**Owner: Aman.** This is Gate 3 and it is the gate that decides the project.

## 1. Why this matters more than anything else

Every other feature — optimizer, retrofit, sensitivity, relief mode, the whole UI — is a loop over or a rendering of the engine. If the engine is wrong, all of it is theatre delivered with confidence.

**The difference between "we validated it" and showing the validation chart is the difference between being believed and not.**

### Two Independent Validation Axes
We validate our fast Python solver against **two independent references**:
1. **Axis 1 (Empirical — Active & Verified):** Published measured field data from DRDO DIHAR and LEDeG Ladakh field studies (Aman's Gate 3).
2. **Axis 2 (First-Principles Numerical — Specification & Harness Built):** 3D continuum finite element simulation in **ANSYS Mechanical Transient Thermal** (Vedesh's Reference Track, Decision D16). Physical ANSYS runs are pending workstation execution.

---

## 2. Validation Axis 1: Empirical Targets (Gate 3 — Aman)

| # | Scenario | Measured | Tolerance | Source |
|---|---|---|---|---|
| V1 | DIHAR Leh solar-heated shelter | 15–20 °C indoor at −19 °C ambient | model min/max inside band | DRDO DIHAR pilot |
| V2 | Leh Trombe-wall room, Feb 2020 | monthly mean **17.44 °C** | ±2.0 °C | measured Leh study |
| V3 | Leh direct-gain room, Feb 2020 | monthly mean **14.81 °C** | ±2.0 °C | same study |
| V4 | DIHAR/Sun Stellar ADM Block | +20 °C held 18:00–06:00 | within 2 °C at 06:00 | DRDO/vendor |

---

## 2b. Validation Axis 2: ANSYS Reference Model (Vedesh)

Authoritative reference: [brain/ANSYS_REFERENCE.md](ANSYS_REFERENCE.md). Execution script: `validation/ansys/compare.py`.

Three canonical cases benchmark the 1D RC solver against 3D continuum FEM in ANSYS Mechanical Transient Thermal (cases and comparison harness built; physical ANSYS runs pending real probe CSV exports):

| Case | Scenario | Physical Mechanism Tested | Max Allowed ΔT | Target RMSE | Status |
|---|---|---|---|---|---|
| **Case 1** | Bare Box (Conduction only) | 1D lumped vs 3D FEM conduction & storage | $\le 0.50\ ^\circ\text{C}$ | $\le 0.30\ ^\circ\text{C}$ | Harness built; ANSYS run pending |
| **Case 2** | Multi-layer Wall + Diurnal | Multi-layer Fourier node splitting & phase lag | $\le 1.00\ ^\circ\text{C}$ | $\le 0.60\ ^\circ\text{C}$ | Harness built; ANSYS run pending |
| **Case 3** | Solar Flux + Sky Radiation | Radiative sub-cooling & surface flux coupling | $\le 1.50\ ^\circ\text{C}$ | $\le 0.90\ ^\circ\text{C}$ | Harness built; ANSYS run pending |

## 3. The ordering requirement — non-negotiable

```
model_mean(V2_trombe) > model_mean(V3_direct_gain)
```

**This matters more than the absolute values.** Landing both within ±2 °C but ranking them the wrong way round is a **fail**, not a partial pass.

Reason: absolute agreement can come from calibration. Correct ordering between two configurations under identical weather can only come from the physics being right. A mechanical engineer on the panel will ask precisely this.

## 4. Procedure

1. Scenario configs in `/validation/scenarios/*.json`, full `/simulate` request bodies
2. `python -m validation.run` executes all four
3. Results written to `/validation/results/*.json` and **committed to the repo**
4. `GET /validation` serves the committed results — never computes live
5. A comparison chart renders in the UI ValidationPanel

## 5. If a target is missed

**Fix the model. Do not tune the output.** In order:

1. Check spin-up is running (3 days, discarded). A consistent offset across all scenarios usually means spin-up is missing.
2. Check units — Kelvin in every `T^4` and `h_r` expression.
3. Check sky view factors: 1.0 roof, 0.5 wall.
4. Check air density is altitude-corrected. Everything ~35% too lossy points here.
5. Check `cos_theta` clamped at zero.
6. Check thermal mass is actually connected — indoor tracking outdoor with no lag means one node per layer.
7. Only then question the material values, and if you change one, change the `source` too.

**Banned:** fudge factors, calibration constants, "tuning coefficients", scenario-specific adjustments. If you cannot reach the target honestly, report the gap. A model that misses by 3 °C and says so is worth more than one that hits exactly and cannot explain why.

## 6. Automated sanity tests — run these before the scenarios

These are physics checks, not unit tests. All live in `/tests/test_physics_sanity.py`.

| # | Test | Expectation |
|---|---|---|
| 1 | **Steady state** — zero solar, constant outdoor, no occupants | indoor asymptotes to outdoor |
| 2 | **Insulation** — add insulation, hold all else | overnight drop reduces |
| 3 | **Window** — increase glazing area | daytime gain rises **and** nighttime loss rises |
| 4 | **Energy balance** — every timestep | energy in ≈ stored + out, within tolerance |
| 5 | **Determinism** — same input twice | byte-identical output |
| 6 | **Vectorisation equivalence** — one design, both paths | match to floating-point tolerance |
| 7 | **Padding inertness** — padded nodes | contribute exactly zero to every flow |
| 8 | **Altitude** — same design at 0 m and 3500 m | infiltration loss ratio ≈ 0.65 |
| 9 | **Sky radiation** — emissivity 0.9 vs 0.25 roof | low-e shows shallower overnight drop |
| 10 | **Clamp** — north-facing wall at solar noon | solar gain ≥ 0, never negative |

Test 3 is the one that catches sign errors. If only one direction moves, a sign is backwards.

Tests 6 and 7 gate the optimizer. Do not run `/optimize` until both pass.

## 7. Reporting format

```
VALIDATION RUN 2026-09-11T06:14
  V1 DIHAR Leh        model 15.8–19.1 °C   measured 15–20 °C     PASS
  V2 Trombe Feb       model 16.9 °C        measured 17.44 °C     PASS (Δ -0.54)
  V3 Direct gain Feb  model 15.2 °C        measured 14.81 °C     PASS (Δ +0.39)
  V4 ADM Block 06:00  model 18.7 °C        measured 20 °C        PASS (Δ -1.3)
  ORDERING            Trombe 16.9 > DG 15.2                      PASS
  SANITY 1–10                                                    10/10
```

Paste this verbatim into the phase report. Do not summarise it.

## 8. What we openly admit

- No instrumented shelter of our own. Validation is against published measurements. Field validation is phase two.
- ISO 52016-1 has known deviations from detailed simulation in load profiles and multi-pane windows.
- The Trombe scenario is approximate: the literature explicitly flags cold-climate Trombe performance with snow and ice as unresolved — the effect of surface ice and winter albedo cannot currently be predicted. We implement the current best estimate.
- Single-zone, no moisture, steady material properties.

**A model whose limits you can name is a model a judge trusts.**
