# THERMA — Area-Specific Shelter Design for Thermal Comfort Maintenance
## Presentation Deck (SIH 2026 · PS 26051 · DRDO)

---

### SLIDE 1: THE PROBLEM — A Logistics Crisis Disguised as a Heating Problem

> *"Other software grades a design you already picked. THERMA searches thousands and picks for you, then shows its working."*

#### The Three Numbers That Matter
- **₹2,400** to deliver one single litre of kerosene by helicopter to Siachen forward posts.
- **~112 litres** burned per month by a standard 15-man high-altitude post.
- **₹3.2 lakh per month, per post**, simply to keep soldiers from freezing.

#### The Physical Mechanism
- The solar resource in Ladakh is world-class: **>5.5 kWh/m²/day** of incident radiation even in mid-winter.
- The crisis is not lack of heat—it is that current military shelters fail to retain it: heat gained during peak daylight is radiated away into sub-zero skies within three hours of sunset.
- **Logistics payoff**: Every 1 °C of passive thermal retention directly saves fuel sorties, helicopter rotor-hours, and soldier casualties on treacherous mountain supply passes.

*Speaker Notes:*
Lead with cost, not physics equations. When an evaluator hears "₹3.2 lakh a month per post to not freeze", they immediately understand why DRDO posted this problem statement. The payoff of passive thermal engineering in Siachen and eastern Ladakh is military logistics, airlift risk, and lives saved—comfort is just the baseline necessity.

---

### SLIDE 2: WHAT DRDO ALREADY HAS — AND THE REAL DECISION GAP

#### DRDO’s Proven Field Pilots (We Stand on Real Engineering)
- **DIHAR Leh Pilot Project**: Demonstrated +15 °C to +20 °C indoor warmth at −19 °C ambient with zero active combustion; capital cost ~₹60 lakh, payback under 3 years.
- **DIHAR + Sun Stellar Solar Space Heating (ADM Block, Dec 2024)**: Maintained +20 °C continuously from 18:00 to 06:00 across Himalayan sub-zero nights.
- **Measured Field Studies (Leh, Feb 2020)**: Measured Trombe wall room achieved 17.44 °C average indoor temp vs 14.81 °C for direct-gain passive room.
- **LEDeG High-Altitude Retrofits (Since 1984)**: Documented 66% fuel reduction in Ladakh vernacular solar retrofits.

#### The Crucial Gap
- Every single successful installation above was a **bespoke, expert-designed, months-long engineering one-off**.
- Forward commanders, military engineers, and disaster relief logistics teams do not have three months and a team of building scientists for every new post or forward staging area.
- **The gap is NOT the physics. It is the decision process.**
- THERMA automates that expert decision process into a 5-second computation.

*Speaker Notes:*
This slide establishes credibility. Most teams present as if DRDO has never studied passive solar shelter design. We cite DIHAR’s actual publications and field trials, and define our exact value proposition: replacing months of bespoke engineering trial-and-error with algorithmic multi-objective search.

---

### SLIDE 3: THE FAILURE — The Standard Prefab Hut on Design Winter Night

#### Baseline Condition: 15 January, Leh (34.15° N, 3,500 m)
- **The Standard Military Prefab Hut**: Uninsulated corrugated iron / thin sandwich construction.
- **Design Winter Night (1-percentile worst case)**: Ambient temperature sinks to **−22.0 °C** at dawn (06:00).
- **Thermal Collapse**:
  - Indoor temperature drops below freezing by midnight.
  - By 04:00–06:00, indoor temperature collapses to **−18.0 °C**.
  - 18 out of 24 hours spent dangerously below the 18.0 °C health threshold.
- **The Consequence**: Heavy dependency on unflued bukharis (kerosene heaters), creating fatal carbon monoxide asphyxiation risks or crippling fuel consumption.

*Speaker Notes:*
Demonstrate the failure clearly. Switch the live tool to "Design Winter Night" mode. Explain that engineering must design for the 1-percentile worst night, not the mild average day, because freezing to death is not an average event.

---

### SLIDE 4: THE SEARCH & THE FIX — 3,200 Permutations in 5 Seconds

#### The Theatrical Moment (Narrated Live)
- User selects envelope parameter ranges and constraints (locally available materials only).
- Hits **Optimize**.
- Multi-objective batch vector solver evaluates **3,200 candidate permutations in 5.6 seconds** across 24 hours of dynamic conduction, solar irradiation, and sky radiation.

#### The Optimal Architecture: +17.2 °C Dawn Minimum, Zero Fuel
- **Rank #1 Design (Leh Solar Passive Shield)**:
  - 300 mm mud brick thermal mass + 50 mm external EPS insulation.
  - 150 mm concrete roof with low-emissivity coating ($\varepsilon = 0.25$).
  - 5.5 m² south-facing double glazing.
  - Insulated nocturnal night shutters ($R = 0.5 \text{ m}^2\text{K/W}$).
- **Performance**: Holds **+17.2 °C at dawn** during −22.0 °C outdoor extremes—without burning a single drop of fuel.

*Speaker Notes:*
Hit the Optimize button. Narrate: "Three thousand two hundred designs. Twenty-four hours of weather simulated for each in lockstep. Five seconds." Highlight the dawn hold: soldiers wake up in comfort without waking up to frozen water jerrycans or extinguished bukharis.

---

### SLIDE 5: THE REASONING & THE PROOF — Physics Validation & Levers

#### 1. The Design Levers (Why Rank Matters)
- **Night Shutters**: Yields **+6.1 °C** overnight rise for ₹500 per window [local craftsman, 1 day, honestly tagged as estimate].
- **South Glazing**: Yields **+4.3 °C** rise for ₹6,400 [sourced].
- **Weather-stripping (-0.3 ACH)**: Yields **+2.8 °C** for ₹800 [estimate].
- **Adding 100 mm Stone Wall**: Yields only **+0.4 °C** for ₹38,000 and adds 11.8 tonnes of dead airlift weight!
- *Evaluator takeaway*: High thermal mass without insulation and night shutters wastes money and military airlift capacity.

#### 2. Heat Flow Across $\Delta T$ (Indoor − Ambient) — PS Requirement 3 Direct
- Direct hour-by-hour tracking of heat exchange across the envelope driven by indoor-to-outdoor temperature difference, satisfying PS Requirement 3 out loud.

#### 3. Grounded Field Validation (Gate 3 Passed)
- Our dynamic model curve is calibrated and validated against **DIHAR Leh published measurements**:
  - Measured Leh Pilot: 16.0 °C vs Model 16.04 °C ($\Delta = 0.04 \text{ °C}$).
  - Measured Trombe Wall: 13.0 °C vs Model 14.31 °C ($\Delta = 1.31 \text{ °C}$).
  - Measured Direct Gain: 10.0 °C vs Model 12.29 °C ($\Delta = 2.29 \text{ °C}$).
  - **Ordering Check Verified**: Trombe wall ranks strictly above Direct Gain ($\Delta = 2.02 \text{ °C}$).

*Speaker Notes:*
Call out Requirement 3 by name: "Heat flow across ΔT". Point out the honestly marked [estimate] tag on local labor costs. Show that our model was validated against published empirical ground-truth measurements, not another computer simulation.

---

### SLIDE 6: IMPACT, ROADMAP, HONEST LIMITATIONS & RELIEF MODE

#### Operational Military Impact
- **1,180 litres** of kerosene avoided annually per shelter.
- **₹28.3 lakh** saved annually per forward shelter in helicopter logistics costs.
- **2.95 tonnes** of CO₂ emissions prevented per shelter per year.
- **Payback period**: 2.4 years against capital retrofit expenditure.

#### Honest Engineering Limitations (PRD Section 9)
- **1D Conduction**: 1D multi-node network; thermal bridging at structural metal junctions requires ISO 10211 2D corner factors.
- **Lumped Air Node**: Assumes uniform indoor air temperature; does not model vertical thermal stratification.
- **Infiltration**: Approximated via altitude-corrected effective ACH rather than pressure-network CFD.
- *Roadmap*: 3D BIM import, ML neural surrogate for sub-second mobile apps, and instrumented field trials in Dras/Siachen.

#### Humanitarian Generalization: Nepal Earthquake Relief Application
- **Flat, factual context**: The recent Western Nepal earthquakes impacted over 84,000 people facing a brutal Himalayan winter with roads and bridges destroyed.
- **Same engine, different crisis**: When supply lines are cut, the material library adapts to emergency relief items (HDPE tarpaulins, straw bales, relief blankets, mud skirts).
- The tool identifies the optimal thermal assembly possible using strictly what relief agencies can airlift or salvage on site.

*Speaker Notes:*
State limitations with confidence. A team that clearly articulates what their software does not do is immediately recognized as composed of rigorous engineers. Close with the Nepal application flatly and factually: proving the software generalises to any cold-climate humanitarian crisis without exploiting tragedy.
