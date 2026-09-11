# 08 — UI SPEC

**Owner: Swapnil.** `tokens.css` and `tailwind.config.js` are his alone (Rule R4).

## 1. Design direction

**Not a startup dashboard. A field instrument.**

Reference: engineering software an army engineer opens on a laptop in Leh. Dense, precise, quiet, trustworthy. It should look like it was built by people who care about the numbers being right.

- No hero section, no marketing copy, no illustrations. The app opens directly into work.
- Hairline borders, no shadows. 1 px dividers, 4–6 px radius maximum, flat surfaces.
- Data-dense but breathing — generous padding inside panels, tight spacing between related fields.
- **Colour carries meaning.** If something is coloured it is because it means something.

## 2. Typography

| Role | Family | Weights |
|---|---|---|
| Headings | **Montserrat** | 600, 700 |
| Body / UI | **DM Sans** | 400, 500 |
| All numbers | **JetBrains Mono** | 400, 500 |

**Note on Google Sans.** The requested pairing was Montserrat + Google Sans. Google Sans is Google's proprietary brand typeface and is **not publicly licensed for web use** — it is not on Google Fonts. **DM Sans** is the closest open geometric-humanist substitute and is used here. If a licensed copy of Google Sans is available, swap it in `tokens.css` only — one variable, nothing else changes.

**Every number renders in mono.** Temperatures, litres, rupees, percentages. This single rule does most of the work of making the product read as an instrument rather than marketing.

```css
--font-heading: 'Montserrat', system-ui, sans-serif;
--font-body:    'DM Sans', system-ui, sans-serif;   /* swap target for Google Sans */
--font-mono:    'JetBrains Mono', ui-monospace, monospace;
```

Type scale — five sizes, no more:
```css
--text-display: 28px / 1.2  600  -0.02em   Montserrat
--text-title:   20px / 1.3  600  -0.01em   Montserrat
--text-body:    15px / 1.5  400            DM Sans
--text-label:   13px / 1.4  500            DM Sans
--text-caption: 12px / 1.4  400            DM Sans
--text-metric:  24px / 1.1  500            JetBrains Mono
```

## 3. Colour — PROVISIONAL

⚠ **The team palette had not arrived when this was written.** These values are a working set built for the design direction above. When the real palette lands, replace the values in `tokens.css` — **no component may hardcode a colour**, so the swap is one file.

```css
/* surfaces — dark-first */
--bg-base:      #0E0F11;
--surface-1:    #16181B;
--surface-2:    #1E2125;
--border:       #2A2E33;
--border-strong:#3A3F46;

/* text */
--text-primary:   #ECEDEE;
--text-secondary: #A0A6AD;
--text-muted:     #6B7178;

/* semantic — each colour has exactly one meaning */
--accent:   #4C9EE8;   /* interactive only: buttons, active step, links */
--solar:    #E8A33D;   /* solar gain, daytime, warm surfaces */
--danger:   #E05C5C;   /* ONLY: below health threshold */
--comfort:  #3FA87A;   /* ONLY: inside comfort band */
--estimate: #8B7A55;   /* ONLY: the [estimate] tag */
```

**Semantic discipline is a hard rule.** Red means below the health threshold and nothing else. Green means in the comfort band and nothing else. Amber means an unsourced estimate and nothing else. A judge reading the screen should be able to learn the colour language in five seconds and trust it.

Spacing scale — four values: `4 / 8 / 16 / 24 px`. Nothing else.

## 4. Layout skeleton — identical on all three steps

```
+---------------------------------------------------------------+
|  THERMA                    [1 Design] 2 Simulate  3 Optimize   |
+----------------+----------------------------------------------+
| Weather mode   |                                              |
| [Typical|P1 ]  |          CANVAS — swaps by step              |
|                |                                              |
| Site           |                                              |
|  [ ] [ ] [ ]   |                                              |
|                |                                              |
| Geometry       |                                              |
|  [ ] [ ]       |                                              |
|                |                                              |
| Envelope       |                                              |
|  [ ] [ ]       |                                              |
|                |                                              |
| +------------+ |                                              |
| | live cross-| |                                              |
| | section    | |                                              |
| +------------+ |                                              |
+----------------+----------------------------------------------+
```

**The left rail never moves or remounts.** Only the canvas changes. That consistency is most of what "clean UI" means to an evaluator.

## 5. Component specs

### StepRail
Three steps, current one in `--accent`, others `--text-muted`. Not clickable ahead of valid input.

### Weather mode toggle — top of the rail
`Typical day | Design winter night`. **Placed above everything else**, because it is the most consequential control in the application. When P1 is active, show the `grid_note` as caption text beneath — the regional-estimate caveat must be visible, not buried.

### CrossSectionSVG
Hand-written SVG, no library. Shows wall layers to scale with material fills, window openings, roof, ground line, snow if `snow_cover`. Redraws on **every** input change — no debounce, no animation.

This is the single best UI element in the product. It makes the tool feel like a product rather than a form.

### TempChart
Indoor and outdoor lines, comfort band shaded `--comfort` at low opacity, region below health threshold shaded `--danger` at low opacity. Uncertainty band as a light area between `t_in_lo` and `t_in_hi`. Hour axis 0–23.

### DeltaAmbientChart
`delta_ambient` with a zero baseline. **Label it "Heat flow across ΔT (indoor − ambient)" and name it as PS requirement 3 during the demo.**

### DeltaDesignChart
`t_in(B) − t_in(A)`, zero baseline, shaded above and below. Visually striking when it spikes at 03:00.

### MetricCards
Four: min at dawn, comfort hours, hours below health threshold, kerosene avoided. `--text-metric` for the value, `--text-caption` for the label.

### LeversPanel
Horizontal bars by `effect_c`. Under each bar, one caption line:
```
Night shutters      ████████████  +6.1 °C
                    ~₹500/window · local craftsman, 1 day   [estimate]
```
`[estimate]` renders in `--estimate`. **Never hide it.** A panel showing two sourced numbers and one honestly labelled estimate reads as more trustworthy than three confident unsourced numbers.

### ValidationPanel
Collapsed by default, expands on the Simulate step. Three measured points with error bars, model output as a line through them. Plus an explicit ordering check row: *Trombe ranked above direct-gain ✓*. Data from `GET /validation`, pre-run and committed — **never computed live.**

### RetrofitList
Ranked interventions with `degrees_per_1000_inr`, cumulative cost and cumulative temperature columns, budget line marker.

### SpecSheetCopy
One button, clipboard only, no PDF library.
```
SHELTER SPEC — Leh (34.15 N, 77.58 E, 3500 m) — design winter night
Wall:        300 mm mud brick + 50 mm EPS
Roof:        150 mm concrete, low-e coating (e=0.25)
Orientation: 172 deg  |  South glazing: 5.5 m2  |  Night shutters: yes
Min indoor:  17.2 C at 06:10   |   Comfort hours: 86%
Hours below 18 C: 14/24
Kerosene avoided: 1,180 L/yr   |   Payback: 2.4 yr   |   CO2: 3.0 t/yr
Model: EN ISO 52016-1 5R1C, altitude-corrected. Validated vs DIHAR Leh.
```

### RefusalCard
When `refused: true`, replace the canvas with a full-width card in `--danger` border, the reason text, and a "what to change" line. **This is a result, not an error** — do not style it as a crash.

## 6. Input validation UX

- Every numeric field has min/max enforced client-side and server-side
- Errors render inline under the field, `--danger`, `--text-caption`
- Submit disabled while any field is invalid
- **Deliberately demonstrate a rejected input during the demo**
- CSV paste errors render as a column/row table, never a stack trace

## 7. Responsive

Down to 390 px. Below 900 px the left rail collapses to a drawer behind a toggle; canvas goes full width; charts keep a 16:9 minimum. Verify on a real phone via ngrok before freeze.

## 8. Loading and empty states

- Simulate: skeleton chart, not a spinner
- Optimize: progress text "Evaluating 3,200 designs…" — **this pause is the demo's most theatrical moment, do not hide it behind a generic spinner**
- No data yet: a one-line instruction, never a blank panel
