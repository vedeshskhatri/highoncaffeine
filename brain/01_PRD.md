# 01 — PRODUCT REQUIREMENTS

## 1. The problem

Ladakh receives 1,900–2,100 kWh/m²/year of solar irradiance with ~7.9 h average daily sunshine and 300+ clear days. Shelters are tolerable during daylight. After sunset indoor temperature falls toward ambient, which reaches −20 °C to −40 °C.

This is not an energy problem — the energy is free and arrives daily. It is a **design** problem: the building captures heat all day and loses it all night.

The current mitigation is kerosene, delivered by helicopter.

| Fact | Figure |
|---|---|
| Cost to deliver 1 L kerosene to Siachen | ≈ ₹2,400 |
| Consumption, single 15-man post | ≈ 112 L/month, ≈ 1,350 L/year |
| Across ~150 Siachen posts | > 202,500 L/year, heating alone |
| Energy per soldier, high-altitude cold camp | 4–5 kWh/day, mostly heating |

**The payoff is logistics, not comfort.** Fewer sorties, fewer convoys on avalanche-prone roads, less exposure.

## 2. What already exists — and the actual gap

DRDO has solved the physics repeatedly:

- **DIHAR Leh pilot** — 15–20 °C indoor at −19 °C ambient, ₹60 lakh, payback < 3 years
- **DIHAR + Sun Stellar ADM Block (Dec 2024)** — 3,000 sq ft, +20 °C held 18:00–06:00, replaced diesel boiler
- **Measured Leh rooms, Feb 2020** — Trombe-wall 17.44 °C vs direct-gain 14.81 °C
- **LEDeG** — Trombe retrofits since 1984, ~two-thirds heating fuel reduction

Every one is a bespoke, expert-designed one-off. **The gap is not the physics. It is the decision process.** There is no tool letting an engineer at a *new* site say "here is my location and my available material — give me the build-up that holds 18 °C till dawn."

## 3. Product definition

> THERMA takes a site and a shelter, simulates indoor temperature with high-altitude-corrected physics, searches thousands of design variants, and returns the best build-up with the fuel bill and the reasoning attached.

## 4. Users

| User | Need | Primary output for them |
|---|---|---|
| MES / military engineer at a new post | What do I build here? | Spec sheet |
| Officer with a retrofit budget | What do I change on existing huts, and where first? | Retrofit ranking, portfolio view |
| Relief/NGO logistician | Will people survive winter in this tent? | Relief shelter mode |
| Ladakhi householder / local builder | Cheapest change that keeps my house warm | Retrofit ranking |

## 5. Functional requirements

### FR-1 — Predict indoor temperature *(PS requirement 1)*
Given site, geometry, envelope, openings, ventilation and occupancy, produce hourly indoor air and per-surface temperatures over a defined period.

### FR-2 — Predict solar thermal gain *(PS requirement 2)*
Report solar energy captured through glazing and absorbed by opaque surfaces, in kWh, per period.

### FR-3 — Report heat flow vs temperature difference *(PS requirement 3)*
Report heat flow broken down by path (walls, roof, glazing, infiltration, sky radiation) and a **ΔT(indoor − ambient)** series over the period.

### FR-4 — Comparative material analysis *(PS "most efficient combination")*
Evaluate alternative material/shape/size/orientation combinations under identical ambient conditions and rank them.

### FR-5 — Design search
Search ≥ 3,000 variants over orientation, glazing area, wall build-up, insulation, thermal mass, shutters and roof emissivity. Return a Pareto front and top-3 with a stated reason.

### FR-6 — Sensitivity
Rank design parameters by influence. Present each with cost and effort context.

### FR-7 — Retrofit mode
Given an existing shelter, return ranked interventions by **°C gained per rupee**.

### FR-8 — Design winter night
Toggle between typical-day and 1st-percentile cold night driving weather.

### FR-9 — Safety interlock
Refuse any design where ventilation falls below the safe floor while a combustion heater is present, and state why.

### FR-10 — Backup heat sizing
Where passive alone misses the target, report residual heating demand in kW, hours, and litres of fuel.

### FR-11 — User-supplied data *(PS "user defined values, real time data")*
Accept pasted hourly CSV of temperature and irradiance and run against it.

### FR-12 — Impact translation
Every result carries kerosene litres avoided, ₹ saved, payback years, CO₂ avoided.

### FR-13 — Validation display
On-screen panel comparing model output against the three published measured configurations.

### FR-14 — Material Suggestion (Phase M1)
Requirement-first thermal design inverter. Given user-stated minimum indoor temperature target and design outdoor condition (or site P1 winter night), evaluates candidate passive envelope variants using the ISO 52016-1 transient solver. Returns the top three compliant build-ups sorted by cost, with complete layer specifications, cited thermophysical properties, and cost estimates. If the target is physically unachievable passively, reports the exact thermal gap and calculates required backup heating capacity (kW), operating hours, and kerosene consumption (L/night).

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Single simulation returns in < 2 s |
| NFR-2 | 3,000-variant search returns in < 10 s |
| NFR-3 | Application functions fully offline after first weather fetch |
| NFR-4 | All user input validated server-side; no unhandled exception reaches the UI |
| NFR-5 | Responsive down to 390 px width |
| NFR-6 | Every displayed number is sourced, derived, or tagged `[estimate]` |
| NFR-7 | Runs from `git clone` + two commands, no cloud services |

## 7. Out of scope for this build

Multi-zone models · humidity and moisture transport · structural analysis · snow load · CFD · 3D view · ML surrogate · authentication · multi-user · deployment

3D and ML surrogate are **roadmap**, stated as such in the deck. They were cut for headcount, not because they were wrong.

## 8. Success criteria

| # | Criterion |
|---|---|
| S1 | Model lands inside published measured bands for all three validation targets |
| S2 | Model ranks Trombe above direct-gain (ordering matters more than absolute values) |
| S3 | Optimizer returns a design a human would not have guessed, in < 10 s |
| S4 | 90-second demo runs clean three times consecutively |
| S5 | Every number on screen traceable to a source |
| S6 | All four team members have substantive commits |

## 9. Honest limitations — stated, not hidden

- DRDO already knows how to build well in Leh. Our value is at **new** sites, with **local** material, for **non-expert** users.
- No instrumented shelter. Validation is against published measurements, not our own sensors. Field validation is phase two.
- IMAC adaptive comfort was developed for hot Indian climate zones. **No adaptive comfort model has been validated for India's cold high-altitude zone.** We use IMAC as baseline and flag the gap.
- EN ISO 52016-1 has known deviations from detailed simulation in load profiles and multi-pane windows.
- Literature explicitly flags cold-climate Trombe performance with snow and ice as unresolved. We implement current best estimate; we have not solved it.
