# ANTIGRAVITY PHASE PROMPTS — VRITIKA (Sources & Evidence)

**You own the credibility of every number in this project.**

Rule R1 in `brain/00_MASTER_RULES.md` says no value enters the product without a
citation. You are the person who makes that possible. If you do your job, a judge
can point at any figure on screen and we can name where it came from. If a
fabricated number gets through, the whole "we validated against DRDO's own data"
position collapses on one follow-up question.

**Your output is not code. It is sourced data and traceable references.**

**The most important thing you can say is "I could not source this."** That is a
correct, valuable answer, and it is always better than a plausible guess. A
smaller sourced library beats a larger invented one.

Paste one phase at a time. Emit the phase report at the end of each.

---

## PHASE VR0 — Material property research

```
You are working on THERMA, a shelter thermal design tool for SIH 2026 PS 26051 (DRDO).
Your role is sources and evidence.

FIRST read completely:
  brain/00_MASTER_RULES.md        (especially Rule R1 and section 2)
  brain/04_DATA_MODEL.md          (the materials schema)
  brain/05_DATA_SOURCES.md        (which sources are permitted)

Restate in your own words, in 4 bullets:
  - Rule R1, and what you must do when you cannot find a value
  - what counts as an acceptable source string and what does not
  - the difference between `source` being empty and `cost_source` being empty
  - why a smaller sourced library is better than a larger invented one

TASK — Phase VR0
Research real thermal property values for the material library.

For each material, find and record:
  k    thermal conductivity        W/m.K
  rho  density                     kg/m3
  cp   specific heat capacity      J/kg.K
  absorptivity   (solar, 0-1)      opaque materials
  emissivity     (long-wave, 0-1)  opaque materials
  g_value, u_value                 glazing only

PRIORITY ORDER — do them in this order, do not skip ahead:
  1. mud brick (adobe), rammed earth, stone masonry
  2. EPS, rockwool, straw
  3. concrete, water wall
  4. single pane glazing, double pane glazing
  5. CGI sheet, prefab sandwich panel
  6. relief materials: tarpaulin, plastic sheeting, blanket layer, mud skirt

PERMITTED SOURCES (from brain/05_DATA_SOURCES.md):
  - ASHRAE Handbook of Fundamentals, Ch. 26
  - National Building Code of India 2016
  - ECBC
  - peer-reviewed papers on Ladakh / Himalayan construction

SOURCE STRING FORMAT — this is a hard requirement:
  GOOD: "ASHRAE HoF 2021 Ch.26 Tbl 1"
  GOOD: "NBC India 2016 Part 11 Tbl 3"
  GOOD: "Author et al. 2020, Energy & Buildings 214, Tbl 2"
  BAD:  "ASHRAE"
  BAD:  "standard value"
  BAD:  "engineering handbook"

IF YOU CANNOT SOURCE A MATERIAL:
  Do NOT invent values. Do NOT use a "typical" figure. Do NOT average numbers you
  found on unsourced websites.
  Leave the material OUT of the CSV and list it in section 8 of your report as
  needed-from-others.

WHERE VALUES DIFFER BETWEEN SOURCES:
  This is normal and expected — mud brick in particular varies widely with
  composition and moisture. Record the value you chose, the range you found,
  and WHY you chose that one. Put the range in section 5 of your report.

OUTPUT FILE
  /data/materials.csv  — columns exactly as brain/04_DATA_MODEL.md
  Also set `locally_available` (0/1): is this obtainable in Leh?
  State your basis for each flag in the report. A guess here is also a guess.

VERIFICATION — in your report:
  a. Table of every material with every property and its full source string.
  b. Count: how many materials sourced, how many attempted and abandoned.
  c. For any value where sources disagreed, the range and your reasoning.
  d. Confirm no row has an empty `source`. State that you checked row by row.

CONSTRAINTS
- Do not write any code.
- Do not touch /engine, /api, /web.
- Do not fill in a value you could not source, under any circumstances.

OUTPUT: PHASE REPORT per brain/00_MASTER_RULES.md section 4, all ten sections.
Section 6 is the core of this report — it IS the deliverable.
Section 8 lists every material you could not source.
```

---

## PHASE VR1 — Validation source hunt

```
Read first: brain/10_VALIDATION.md (all of it), brain/05_DATA_SOURCES.md section 4.

Before starting, state:
  - the four validation targets and their measured values
  - why the ordering requirement matters more than absolute values
  - why a secondhand summary is not good enough here

TASK — Phase VR1
Find the PRIMARY sources behind the four validation targets. These numbers are the
single most load-bearing claim in our entire pitch. A judge may ask where 17.44 C
came from, and "a summary we read" is not an answer.

For each target, find:
  - the original report, paper, or official publication
  - the exact measured figures as stated there
  - the measurement conditions: dates, ambient temperature, room dimensions,
    construction details, instrumentation if stated
  - a full citation

TARGETS
  V1  DIHAR Leh solar-heated shelter — 15-20 C indoor at -19 C ambient
  V2  Leh Trombe-wall room, Feb 2020 — monthly mean 17.44 C
  V3  Leh direct-gain room, Feb 2020 — monthly mean 14.81 C
  V4  DIHAR + Sun Stellar ADM Block, Dec 2024 — +20 C held 18:00-06:00

WHY THE CONDITIONS MATTER:
  Aman has to reproduce these in /validation/scenarios/*.json as full simulation
  request bodies. Every detail you find — wall build-up, glazing area, room size,
  orientation, occupancy — makes his scenario configs more faithful and the
  validation more meaningful. Details you cannot find become assumptions he has
  to declare, which weakens the result. So dig.

IF A PRIMARY SOURCE IS NOT FINDABLE:
  Say so plainly. Record the best available secondary source and mark it clearly
  as secondary. Do NOT present a secondary source as primary.
  Do NOT adjust a measured value to something that seems more likely.

ALSO COLLECT — for the deck's references slide:
  - EN ISO 52016-1 full title and year
  - the ShelTherm paper: authors, journal, year, the +0.94 C and ISO 13792 Class 1
    figures with page references if you can get them
  - IMAC: the Manu et al. paper and the IMAC-R residential study
  - the PMV-at-altitude / PMVp paper behind the RMSE figures
  - the cold-climate Trombe review that flags snow and ice as unresolved
  - WHO housing guidance for the 18 C threshold
  - the kerosene logistics figures: 2,400/L delivery, 112 L/month per post,
    202,500 L/year across Siachen posts — find where these originate

OUTPUT FILES
  /brain/18_CITATIONS.md — full references, grouped: standards, validation
  sources, methods literature, impact figures. Each entry: full citation, what we
  use it for, and whether it is primary or secondary.
  Update brain/05_DATA_SOURCES.md section 4 with what you found.

VERIFICATION — in your report:
  a. For each of V1-V4: source found (primary/secondary/not found), the exact
     figures as published, and the conditions.
  b. Every deck reference with a full citation.
  c. Explicitly list anything you could NOT find a source for.

CONSTRAINTS
- Do not write code.
- Never present secondary as primary.
- Never adjust a published figure.

OUTPUT: PHASE REPORT. Section 9 must state honestly which citations you verified
by reading the actual source versus which you took from a secondhand reference.
That distinction is the entire point of this phase.
```

---

## PHASE VR2 — Cost data and the estimate discipline

```
Read first: brain/08_UI_SPEC.md section 5 (LeversPanel), brain/07_API_CONTRACT.md
(/sensitivity, cost_basis field), brain/17_DECISIONS.md entry on sourcing.

Before starting, state:
  - the three values cost_basis can take and what each means
  - why an [estimate] tag visible on screen is BETTER than a confident unsourced
    number
  - what happens to our credibility if a fabricated cost is labelled "sourced"

TASK — Phase VR2
Research real costs for the levers panel and retrofit ranking. This is the highest
credibility-risk data in the product, because costs appear in the panel a judge
looks at longest.

COSTS NEEDED
  - EPS insulation, per m2 or per m3, Indian market
  - rockwool, same
  - mud brick, per m3 or per 1000 bricks, Ladakh if possible
  - rammed earth construction, per m3
  - stone masonry, per m3
  - timber night shutters, per window
  - single and double glazing, per m2
  - low-emissivity roof coating, per m2
  - labour rates, Leh, per day
  - kerosene: local market price AND delivered-to-post cost

FOR EACH, RECORD cost_basis:
  "sourced"  — you have a real citation: a price list, government schedule of
               rates, published paper, vendor listing. Record the citation.
  "derived"  — computed from something sourced. Example: mass of a wall from
               density x volume. Deriving is legitimate; record the derivation.
  "estimate" — no source found. Record it anyway with basis "estimate".
               The UI will render an [estimate] tag.

THE RULE THAT MATTERS MOST:
  NEVER label an estimate as sourced. Not once. Not for the one number that would
  look better sourced. A panel showing two sourced figures and one honestly
  tagged estimate reads as MORE trustworthy than three confident unsourced
  figures, and it survives the follow-up question. The tag is not weakness — it
  is the thing that makes the other numbers believable.

ALSO NEEDED — unblocks a feature:
  ACH_MIN_COMBUSTION — the minimum safe air change rate for a space with an
  unflued combustion heater. Aman's safety interlock (phase A4) raises
  NotImplementedError without a sourced value, so this directly unblocks it.
  Look at: ventilation standards, LPG/kerosene appliance guidance, national
  building codes, WHO indoor air quality guidelines.
  If you cannot source it, say so — do NOT pick a number that seems safe.
  A guessed safety threshold is worse than no safety threshold, because it
  looks authoritative.

ALSO: install effort notes for the levers panel.
  Short, factual, e.g. "local craftsman, 1 day", "requires scaffold", "cannot be
  done in winter". Source them or mark them as estimates like everything else.

OUTPUT
  Update /data/materials.csv: cost_per_m3, cost_source, install_note
  Update /brain/18_CITATIONS.md with cost sources
  Report ACH_MIN_COMBUSTION finding to Aman

VERIFICATION — in your report:
  a. Table: every cost, its value, its cost_basis, its citation if sourced.
  b. Count of sourced vs derived vs estimate. State the counts plainly.
  c. ACH_MIN_COMBUSTION: value and source, or an explicit "not found".
  d. Confirm no estimate is labelled sourced. State that you checked each row.

CONSTRAINTS
- Do not write code.
- Do not fabricate a citation.
- Do not guess a safety threshold.

OUTPUT: PHASE REPORT. Section 7 must state how many values ended up as
"estimate" and why. A high estimate count is not a failure — hiding it is.
```

---

## PHASE VR3 — Source audit before freeze

```
PRECONDITION: the UI renders real data. If it does not yet, wait.

Read first: brain/00_MASTER_RULES.md Rule R1, brain/15_MICROTASKS.md.

TASK — Phase VR3
Audit every number the product displays. You are the last line of defence before
a judge sees it.

METHOD
1. Walk the entire UI: Design, Simulate, Optimize, retrofit, levers, validation
   panel, spec sheet, refusal card.
2. For EVERY number on screen, trace it to one of:
   - a material property with a source
   - a physical constant with a source
   - a computed result from sourced inputs
   - a cost with cost_basis and a visible [estimate] tag where applicable
3. ANY number you cannot trace is a finding. Log it with the exact screen
   location and raise it as a blocker.

SPECIFIC CHECKS
  a. Every [estimate] tag actually renders and is visible. Screenshot each.
  b. weather_provenance is displayed, and the grid_note appears when design
     winter night mode is active.
  c. The validation panel figures match what is in /brain/18_CITATIONS.md exactly,
     digit for digit.
  d. The spec sheet contains no untraceable number.
  e. Nothing on screen says "typical", "standard", "approximately" where a real
     source exists.
  f. The kerosene and rupee figures in the demo opener match the citations.

ALSO PREPARE — the source defence sheet
  /docs/source-defence.md: a one-page table mapping every number a judge is
  likely to point at to its source, so anyone on the team can answer without
  hunting. Include at minimum: 17.44, 14.81, the DIHAR range, 2400/L,
  112 L/month, 18 C health threshold, 0.65 density ratio, snow albedo range.

VERIFICATION — in your report:
  a. Full trace table: number, screen location, source, traceable yes/no.
  b. Count of untraceable numbers found. If zero, say how many you checked —
     "zero untraceable" is only meaningful alongside "out of 47 checked".
  c. Screenshots of every [estimate] tag rendering.
  d. The source defence sheet.

CONSTRAINTS
- Do not fix findings yourself. Log them and assign them to the owner.
- Do not accept "it's computed" without knowing what it was computed FROM.

OUTPUT: PHASE REPORT. Section 4 is the trace table. Section 8 lists every
untraceable number as a blocker with an owner. Section 10 is NO while any
untraceable number remains on screen.
```
