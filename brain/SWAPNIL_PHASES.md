# ANTIGRAVITY PHASE PROMPTS — SWAPNIL (UI, UX, Design System)

**You own how this reads to a judge.** The physics can be perfect and still lose
the room if the screen looks like a class project.

You also remain the **physics voice in Q&A** — you wrote the original thermal
blueprint. That does not transfer just because the code did. Keep reading
`brain/06_PHYSICS_SPEC.md` between phases.

**Phase report note:** Section 2 (FILES TOUCHED) must include the commit hash that was pushed to `main` (`Pushed commit: <hash>`).

---

## PHASE S0 — Design tokens (DO THIS BEFORE ANY COMPONENT EXISTS)

```
You are working on THERMA, a shelter thermal design tool for SIH 2026 PS 26051 (DRDO).

FIRST read completely:
  brain/00_MASTER_RULES.md
  brain/08_UI_SPEC.md
  brain/17_DECISIONS.md entries D13 and D14

Restate in your own words:
  - the design direction in one sentence
  - the four semantic colours and their single permitted meanings
  - why the palette is provisional and what that requires of every component
  - why Google Sans was substituted and what the swap path is

TASK — Phase S0
This phase must be finished before anyone builds a component. Four people
improvising styles is how a build ends up looking like four builds.

1. Vite + React + Tailwind scaffolded in /web.
2. /web/src/tokens.css with EVERY value from brain/08_UI_SPEC.md sections 2 and 3:
   - font families, with the Google Sans swap comment on --font-body
   - the five-step type scale, no more
   - surfaces, borders, text colours
   - the four semantic colours, each with a comment naming its ONE meaning
   - the four-value spacing scale
3. tailwind.config.js mapping every token. After this, no component ever needs a
   raw value.
4. Load Montserrat (600, 700), DM Sans (400, 500), JetBrains Mono (400, 500).
   Self-host or use the Google Fonts CDN with a preconnect. If CDN, note in the
   report that this is a network dependency at load time and confirm the app
   still renders readably with fonts blocked — we have an offline requirement.
5. Create a single /tokens route rendering every token as a visual swatch and
   specimen sheet. This is how the team checks the palette swap later.

VERIFICATION — paste or screenshot:
  a. The /tokens page showing every colour, every type size, every spacing value.
  b. All three font families rendering correctly — show a specimen of each.
  c. Block fonts in dev tools, reload. Confirm fallbacks are readable.
  d. Confirm tailwind.config.js exposes every token. Paste the config.

CONSTRAINTS
- Do not build any product component in this phase.
- Do not add a component library. Not shadcn, not MUI, not anything.
  brain/02_TRD.md section 1 is a closed list.
- The palette is PROVISIONAL. Structure everything so that replacing the values
  in tokens.css is the ONLY change needed when the real palette arrives.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT per brain/00_MASTER_RULES.md section 4, all ten sections.
Section 8 must state: "Aryan and I are unblocked on components" or what is missing.
```

---

## PHASE S1 — App shell and step rail

```
Read first: brain/03_ARCHITECTURE.md section 7, brain/08_UI_SPEC.md sections 4 and 5.

Before coding, state:
  - why the left rail must never remount
  - why the weather mode toggle sits at the very top of the rail
  - what grid_note is and why it must be visible

TASK — Phase S1
1. App shell exactly as the skeleton in brain/08_UI_SPEC.md section 4.
2. StepRail: Design | Simulate | Optimize. Current step in --accent, others
   --text-muted. Not clickable ahead of valid input.
3. Persistent left InputRail. It must NOT remount when the step changes — only
   the canvas swaps. Verify this, do not assume it.
4. WeatherModeToggle at the TOP of the rail, above everything else. It is the
   most consequential control in the application. When design_winter_night is
   active, render the grid_note as caption text beneath it.
5. Canvas router: three canvases, empty placeholders for now.
6. State lifted to App, shaped to mirror the SimulateRequest in
   brain/07_API_CONTRACT.md. useState only — no state library.

VERIFICATION:
  a. Switch steps repeatedly. Confirm input values PERSIST and the rail does not
     flash or remount. Demonstrate this — for example by typing a value, switching
     steps twice, and showing it is still there.
  b. Toggle weather mode. Confirm grid_note appears.
  c. Search your files for hardcoded hex colours. Paste the result. Expect zero.
  d. Resize to 390 px. Confirm the rail collapses to a drawer.

CONSTRAINTS
- No component library.
- No state management library.
- All colour and spacing through tokens.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT, all ten sections.
```

---

## PHASE S2 — Input rail and validation

```
Read first: brain/07_API_CONTRACT.md (SimulateRequest, every field rule),
brain/08_UI_SPEC.md section 6, brain/09_ERROR_HANDLING.md section 7.

Before coding, list every field in SimulateRequest and its constraint. If a
constraint is unclear from the contract, ASK — do not invent one. The backend
will reject what the contract says, and a mismatch between your client validation
and Aryan's server validation is a confusing bug.

TASK — Phase S2
1. SiteFields: lat, lon, altitude. A small preset list including Leh.
2. GeometryFields: length, width, height, orientation. Orientation as a compass
   control, not a raw number input — the user thinks in directions.
3. EnvelopeBuilder: add/remove/reorder layers for wall, roof, floor. Material
   from GET /materials. Thickness per layer. ORDER IS OUTSIDE TO INSIDE and the
   UI must make that unambiguous — label it.
4. OpeningsEditor: facing, area, glazing type, night shutter.
5. VentilationFields: ACH, heater type.
6. OccupancyFields, GroundFields (snow cover).
7. Inline validation on every field, matching the contract constraints exactly.
   Errors in --danger, --text-caption, under the field. Submit disabled while
   any field is invalid.

VERIFICATION:
  a. Enter a negative thickness. Confirm the inline error, and that submit is
     disabled.
  b. Enter an out-of-range orientation. Confirm the error.
  c. Submit a valid form. Confirm the request body matches the contract EXACTLY —
     paste the actual body from the network tab and compare field by field.
  d. Confirm layer order is visually unambiguous. Screenshot it.
  e. Zero hardcoded colours. Paste the search result.

CONSTRAINTS
- Client validation must MATCH the contract, not be stricter or looser.
- Do not add fields the contract does not define.
- If you need a field that is not in the contract, STOP and report it as a
  blocker for Vedesh. Do not edit the contract.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 4 includes the actual request body from (c).
```

---

## PHASE S3 — Live cross-section SVG

```
Read first: brain/08_UI_SPEC.md section 5 (CrossSectionSVG).

This is the single best UI element in the product. It is what makes the tool feel
like a product rather than a form. Give it real attention.

TASK — Phase S3
Hand-written SVG. NO LIBRARY.

1. Render a cross-section of the current shelter:
   - wall layers TO SCALE, each with a distinct fill derived from its material
     category, using token colours only
   - roof with its layers
   - floor and a ground line
   - window openings on the correct side for their facing
   - night shutter indicated when enabled
   - snow on the ground when snow_cover is true
   - a sun glyph on the south side, positioned by orientation
2. Redraw on EVERY input change. No debounce. No animation. Instant.
3. Layer thickness labels on hover.
4. It must degrade gracefully: no layers yet, one layer, or ten layers all render
   sensibly without overflowing.

VERIFICATION — screenshots for each:
  a. A three-layer wall. Confirm proportions visibly match the entered
     thicknesses — state the ratio you entered and the ratio on screen.
  b. Change a thickness. Confirm instant redraw.
  c. Toggle snow cover. Confirm the ground changes.
  d. Toggle night shutter. Confirm the indicator appears.
  e. Change orientation. Confirm the sun glyph moves.
  f. Ten layers. Confirm no overflow.
  g. Zero layers. Confirm it does not crash.

CONSTRAINTS
- No SVG or charting library for this component.
- No hardcoded colours.
- No animation — this redraws constantly and animation would make it feel laggy.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT with screenshots. Section 4 must state the actual
thickness ratios from (a).
```

---

## PHASE S4 — Charts, levers, validation, Pareto

```
PRECONDITION: Aman's validation (brain/10_VALIDATION.md) has passed. If it has
not, the numbers you are about to render are not trustworthy yet. Check before
starting.

Read first: brain/08_UI_SPEC.md section 5 (all components),
brain/07_API_CONTRACT.md (/simulate, /optimize, /sensitivity, /validation).

Before coding, state:
  - which chart satisfies PS requirement 3 and how you will label it
  - what [estimate] means and why it must never be hidden
  - why the optimizer pause must not be a generic spinner

TASK — Phase S4
All charts in Recharts. All colour through tokens.

1. TempChart — indoor and outdoor lines, comfort band shaded --comfort at low
   opacity, region below the health threshold shaded --danger at low opacity,
   uncertainty band between t_in_lo and t_in_hi. Hours 0-23.
2. DeltaAmbientChart — delta_ambient, zero baseline.
   LABEL IT: "Heat flow across ΔT (indoor − ambient)".
   This satisfies PS requirement 3 and you will name it out loud in the demo.
3. DeltaDesignChart — t_in(B) − t_in(A), zero baseline, shaded above and below.
4. LeversPanel — horizontal bars by effect_c, and under each bar the cost and
   effort caption line per brain/08_UI_SPEC.md section 5.
   WHEN cost_basis IS "estimate", RENDER THE [estimate] TAG in --estimate.
   NEVER HIDE IT. The instinct will be to drop it because it looks like weakness.
   It is the opposite: a panel with two sourced numbers and one honestly labelled
   estimate reads as more trustworthy than three confident unsourced numbers,
   and it survives a follow-up question.
5. ValidationPanel — collapsed by default, expands on Simulate. Three measured
   points with error bars, model output as a line through them, plus an explicit
   ordering row: "Trombe ranked above direct-gain ✓". Data from GET /validation.
   NEVER computed live.
6. ParetoPlot — scatter, comfort vs cost, non-dominated points highlighted,
   top-3 marked.
7. TopThreeCards — each with its `why` string and delta_vs_baseline.
8. RetrofitList — ranked, with degrees_per_1000_inr and cumulative columns.
9. Optimize loading state — progress text "Evaluating 3,200 designs…".
   NOT a generic spinner. This pause is the demo's most theatrical moment and
   the text is part of the performance.

VERIFICATION — screenshots for each:
  a. TempChart with the comfort band and the health-threshold shading visible.
  b. DeltaAmbientChart with its label legible.
  c. LeversPanel showing at least one [estimate] tag.
  d. ValidationPanel with all three points and the ordering row.
  e. ParetoPlot with the front visible.
  f. The optimize loading text during an actual run.
  g. Zero hardcoded colours. Paste the search result.
  h. 390 px. Every chart legible, nothing overflowing.

CONSTRAINTS
- Never hide an [estimate] tag.
- Never compute validation data client-side.
- Never render undefined or NaN — show an em dash.
- Do not add a charting library beyond Recharts.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT with screenshots. Section 9 must state honestly which
components you tested with real backend data versus fixtures.
```
