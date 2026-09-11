# 08 — UI SPEC (REVISED: EDITORIAL ENGINEERING)

**Direction Change per D17 & Phase S5–S9.**
Replaces "field instrument, no hero section, opens directly into work" with **EDITORIAL ENGINEERING** — a product website with an interactive shelter builder at its centre.

---

## 1. Design Direction: Editorial Engineering

Warm and light, not dark and clinical. Type-led, not widget-led.
A judge lands on something a real company built, scrolls through a rigorous narrative argument, and reaches the tool already convinced it matters.

- **Warm cream foundation** for readability and authority.
- **Two full-bleed midnight espresso sections** (The Collapse story, and Empirical Validation) that break the scroll rhythm.
- **Type-led clarity:** Hero Montserrat 700 headline, DM Sans for prose, JetBrains Mono for every single numerical value.
- **Zero hardcoded colours.** Everything resolves through `tokens.css`.
- **Zero external drag or component libraries.** Native HTML5 drag-and-drop.
- **Strict semantic colour discipline.**

---

## 2. Palette & Semantic Rules

```css
  --cream:       #FFF9EB   /* page background, majority surface */
  --cream-2:     #FBF2DE   /* raised panels, table stripes */
  --espresso:    #200F07   /* primary text, dark full-bleed sections */
  --espresso-70: #5A4A42   /* secondary text */
  --espresso-40: #9A8C84   /* captions, axis labels, estimate border */
  --rule:        #E8DCC4   /* hairlines, borders */
  --orange:      #F77331   /* buttons, links, active state, SOLAR GAIN */
  --orange-soft: #FDE6D6   /* fills, hover, highlight bands */
  --ice:         #2E6F8E   /* cold, heat loss, below health threshold */
  --ice-soft:    #DCEAF1   /* shading below the threshold */
  --sage:        #4A7C59   /* inside the comfort band */
  --sage-soft:   #E3EDE5   /* comfort band highlight */
```

### Semantic Discipline
- **Orange (`--orange`):** Warmth, solar gain, interactive buttons, active step.
- **Ice Blue (`--ice`):** Cold, heat loss, temperatures below 18 °C health threshold.
- **Sage Green (`--sage`):** Thermal comfort (within 18–26 °C comfort band).
- **Estimate Tag (`[estimate]`):** Small OUTLINED chip in `--espresso-40` with monospace font. Not an alert colour.

---

## 3. Typography Scale

| Role | Token | Family | Size / Weight | Details |
|---|---|---|---|---|
| Hero Headline | `--text-hero` | **Montserrat** | clamp(36px, 5.5vw, 68px) / 700 | Tight tracking -0.025em |
| Display | `--text-display` | **Montserrat** | 32px / 700 | -0.02em tracking |
| Title | `--text-title` | **Montserrat** | 22px / 700 | -0.01em tracking |
| Subhead | `--text-subhead` | **Montserrat** | 18px / 600 | Normal tracking |
| Body UI | `--text-body` | **DM Sans** | 15px / 400 | Line height 1.55 |
| Captions | `--text-caption` | **DM Sans** | 12px / 400 | Captions & metadata |
| All Numbers | `--text-metric` | **JetBrains Mono** | 24px / 500 | Temperatures, fluxes, rupees |

---

## 4. Page Architecture (Long-Scroll Rhythm)

```
[ HEADER ] Sticky: Logo mark, Validation link, Method link, Tokens link, Orange CTA ("Try Shelter Builder")
    │
[ 1. HERO SECTION ] (Cream)
    "Rs 2,400 to deliver one litre of kerosene to Siachen."
    Subhead on free solar resource vs leaky building. Orange CTA button.
    │
[ 2. THE NIGHTTIME COLLAPSE ] (Full-Bleed Midnight Espresso)
    Narrative: "At 04:00, the temperature inside lands at -32.3 °C."
    Self-drawing SVG curve on scroll (IntersectionObserver + stroke-dashoffset).
    Target marker landing at the verified -32.3 °C overnight minimum.
    │
[ 3. THE PHYSICS IS SOLVED, THE DECISION ISN'T ] (Cream)
    Three empirical precedents: DIHAR (16–18 °C), ADM Block (18.9 °C), LEDeG Trombe (16.3 °C).
    The Turn: Consultancy doesn't scale to field ops; THERMA automates it.
    │
[ 4. THREE SCENARIO MODES ] (Cream)
    - Forward Post (Ladakh 3,500 m · Stone, EPS · Fuel avoidance)
    - Relief Shelter (Rasuwa Nepal 2,400 m · Tarpaulin, mud skirt · Survival)
    - Village Home (Leh Valley 3,500 m · Mud brick, Trombe · Low-cost fix)
    │
[ 5. THE SHELTER BUILDER (CENTREPIECE) ] (Cream Workbench)
    Three columns:
      - LEFT: Materials Tray (drag blocks with conductivity bars, k/rho/cp signatures)
      - CENTRE: 2D Scale Cross-Section & 3 Drop Zones (Roof, Walls, Floor with thickness sliders)
      - RIGHT: Live 24-Hour Temperature Curve (debounced ~150 ms, responds to hand drags)
      - SUB: Day Scrubber (0–24h timeline, temperature tinting, sun arc, surface flux arrows)
    │
[ 6. RESULTS AS AN ENGINEERING REPORT ] (Cream Designed Spec Sheet)
    Document header, revision line, structured tables, Cmd+P print stylesheet for clean PDF export.
    │
[ 7. EMPIRICAL VALIDATION ] (Full-Bleed Midnight Espresso)
    Four validation targets (V1–V4), Physical Ordering row (Trombe > DG), Empirical Field Benchmarking.
    │
[ FOOTER & METHOD MODAL ]
    Citations: EN ISO 52016-1:2017, Swinbank nocturnal radiation, altitude lapse scaling.
```

---

## 5. Centerpiece Shelter Builder Spec (Phase S6 & S7)

1. **Materials Tray:**
   - Real sourced values ($k$, $\rho$, $C_p$, cost, availability).
   - Dynamic conductivity bar: lower conductivity = green insulation signature, high conductivity = blue conductive mass.
   - Filter toggle: "Locally available in Leh only".
2. **2D Elevation Cross-Section:**
   - Drop zones: ROOF (outside to inside), WALLS (outside to inside), FLOOR (outside to inside).
   - Reorder layers by dragging within stack.
   - Thickness handle slider on each layer (10 mm to 500 mm).
   - Section redraws to scale with category pattern fills.
3. **Live Temperature Curve:**
   - Debounced at 150 ms so continuous dragging does not flood the solver.
   - Optimistic layer rendering: section updates immediately on drop, curve smoothly transitions.
   - Big mono readout of overnight minimum with before/after $\Delta T$ chip.
   - Subtle "Solving..." pulse badge; chart never blanks on error.
   - Request sequencing ID guard prevents stale responses from overwriting newer ones.
4. **Day Scrubber:**
   - 0–24h slider under the cross-section.
   - Section background tints with temperature from `--orange-soft` at noon peak to `--ice-soft` at 04:00.
   - Sun glyph arcs from 06:00 to 18:00 with direct GHI readout.
   - Surface flux arrows scale with that hour's real conduction/radiation losses.

---

## 6. Constraints & Verification Requirements

- Responsive down to 390 px mobile devices (three columns collapse cleanly).
- Zero hardcoded hex values in `web/src` outside `tokens.css`.
- Verification of before/after $\Delta T$ on EPS drag onto roof.
- Verification of clean validation error on empty envelope zone.
