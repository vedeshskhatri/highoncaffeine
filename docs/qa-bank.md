# THERMA — Evaluator Q&A Drill Bank
## SIH 2026 · PS 26051 (DRDO) · High Altitude Passive Shelter Design

---

### Speaker Assignment Directory
- **Physics & Mathematical Modeling**: Swapnil
- **System Architecture, Optimization & Solvers**: Vedesh
- **Validation, Data Sourcing & Field Studies**: Aman
- **Economics, Material Logistics & Citations**: Vritika
- **Narrative, Operational Flow & Moderation**: Surbhi

> **Rule for Responses**: Deliver the 2-sentence crisp answer immediately. Only elaborate into the bulleted technical depth if the evaluator probes further.

---

## Category 1: Physics, Thermal Dynamics & Solvers (Swapnil)

### Q1.1: Why did you build a custom multi-node RC network rather than running EnergyPlus or OpenStudio?
- **Crisp Answer (2 Sentences)**:
  EnergyPlus requires several seconds to minutes per run and cannot be embedded in an interactive, sub-second 3,200-permutation optimization loop in the browser. Our discretized 1D multi-node RC network solves dynamic conduction, solar irradiation, and linearized long-wave sky radiation in vectorized NumPy matrices in 5.6 milliseconds per shelter.
- **Deep Technical Follow-up**:
  - State space: Discretized 1D heat diffusion equation $\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}\left(k \frac{\partial T}{\partial x}\right)$ into $N$ internal capacitive nodes per envelope layer ($C_i \frac{dT_i}{dt} = \sum K_{ij}(T_j - T_i) + Q_i$).
  - Boundary conditions: ASHRAE clear-sky beam/diffuse decomposition, Perez tilt model, Berdahl-Martin nocturnal long-wave radiation to sky ($T_{\text{sky}} = T_{\text{amb}} \cdot (0.711 + 0.0056 T_{\text{dp}} + 0.000073 T_{\text{dp}}^2)^{1/4}$).
  - Adaptive time stepping: 60-second substeps clamped within physical bounds to guarantee numerical stability across low heat-capacity insulation interfaces (CFL condition: $\Delta t \le \min \frac{C_i}{\sum K_{ij}}$).

### Q1.2: How do you account for high altitude physics at 3,500 m to 5,400 m?
- **Crisp Answer (2 Sentences)**:
  We adjust both atmospheric air density and solar beam clarity according to the barometric formula. At Leh (3,500 m), air density drops from $1.225 \text{ kg/m}^3$ to $0.804 \text{ kg/m}^3$, reducing convective infiltration heat losses by ~34%, while direct normal solar irradiance increases by ~18% due to lower optical air mass ($AM \approx 1.15$).
- **Deep Technical Follow-up**:
  - Pressure scaling: $P(z) = P_0 \left(1 - \frac{L \cdot z}{T_0}\right)^{\frac{g M}{R_0 L}}$. At 3,500 m, $P \approx 65.7 \text{ kPa}$; at Siachen Base (4,000 m), $P \approx 61.6 \text{ kPa}$.
  - Convective heat transfer: Infiltration volumetric heat capacity drops: $C_v = \rho(z) \cdot c_p = 0.804 \times 1005 \approx 808 \text{ J/m}^3\text{K}$ (compared to $1231 \text{ J/m}^3\text{K}$ at sea level).
  - Clear sky solar boost: Extraterrestrial beam radiation adjusted by atmospheric transmittance exponent scaled by $(P/P_0)$.

### Q1.3: How do you model thermal mass vs insulation placement (inside vs outside)?
- **Crisp Answer (2 Sentences)**:
  Because we solve multi-node layers with finite capacitance at each internal node, the order of material layers is physically preserved in the conduction matrix. Placing thermal mass (e.g. mud brick or stone) inside the insulation envelope stores daytime solar gains to damp nocturnal swings, whereas placing insulation on the interior isolates the thermal mass and leaves indoor air to plummet after sunset.
- **Deep Technical Follow-up**:
  - Direct simulation demonstrates thermal phase lag: with external EPS (50 mm) and internal mud brick (300 mm), peak indoor temperature lags outdoor peak by 6.8 hours, discharging stored heat between 22:00 and 05:00.
  - Inverted placement (internal EPS, external stone) creates rapid indoor heating during sunny hours followed by rapid collapse down to $-12 \text{ °C}$ because high-mass cold exterior walls suck heat outwards through the conductive envelope.

### Q1.4: Why do you refuse to simulate when ACH < 0.35 and an unflued heater is selected?
- **Crisp Answer (2 Sentences)**:
  Simulating that combination without a safety interlock would validate a lethal design, as tight shelters with unvented kerosene bukharis generate fatal carbon monoxide accumulation ($>200 \text{ ppm}$) in under 3 hours. Our engine enforces an automatic engineering refusal with an explicit medical explanation and actionable remediation (add balanced HRV or flued exhaust).
- **Deep Technical Follow-up**:
  - Standard military bukharis burn kerosene at ~0.35 L/hr, consuming ~0.7 m³ of oxygen per hour and producing toxic CO and soot.
  - In a sealed 15-man shelter ($V \approx 90 \text{ m}^3$) with ACH = 0.2, oxygen depletion and CO buildup cross hazardous thresholds within 140 minutes, causing asphyxiation during sleep.
  - Rather than silently producing a warm temperature curve, THERMA returns `refused: true` and blocks the simulation, teaching the user that tight envelopes mandate dedicated mechanical ventilation.

---

## Category 2: System Architecture, Optimization & CFD (Vedesh)

### Q2.1: Is your optimizer a genetic algorithm, machine learning model, or brute-force search?
- **Crisp Answer (2 Sentences)**:
  It is a multi-objective Latin Hypercube and orthogonal batch evaluator that simulates thousands of physically valid permutations in vectorized NumPy memory in under 6 seconds, followed by non-dominated Pareto sorting. We chose deterministic physics over black-box ML or slow evolutionary heuristics because military procurement mandates reproducible, certifiable engineering answers.
- **Deep Technical Follow-up**:
  - Sample space: 7 active levers (wall mass thickness, insulation thickness, roof insulation, glazing area, glazing type, night shutter $R$-value, infiltration ACH).
  - Pareto ranking: Extracts Pareto front across three competing objectives: maximizing minimum dawn indoor temperature ($T_{\text{min}}$), minimizing total envelope thermal mass weight (airlift cost), and minimizing capital cost (₹).
  - Explainability: Uses Morris elementary effects method to rank parameter sensitivity, outputting deterministic mechanical `why` strings that explain why Rank #1 dominates Rank #2 and #3.

### Q2.2: How do you generate the "why" explanations without an LLM in the hot path?
- **Crisp Answer (2 Sentences)**:
  The `why` strings are synthesized deterministically by inspecting the differential physical coefficients and Morris sensitivity rankings between Pareto-optimal designs. If Rank #1 achieved $+2.4 \text{ °C}$ over Rank #2 while spending ₹1,200 less, the engine calculates the delta from night shutter $U$-value and infiltration reduction and outputs the exact mechanical attribution.
- **Deep Technical Follow-up**:
  - Code reference: `engine/optimizer.py` `_generate_why()`.
  - Computes $\Delta T_{\text{min}}$, $\Delta \text{Cost}$, $\Delta \text{Mass}$, and identifies the dominant lever based on the Morris elementary effect matrix.
  - Eliminates LLM latency, cost, hallucination risk, and requirement for an active internet connection.

### Q2.3: How does THERMA scale to 3D geometry and thermal bridging?
- **Crisp Answer (2 Sentences)**:
  Our core solver models primary envelope facades via area-weighted 1D multi-node assemblies with ISO 10211 linear thermal transmittance ($\Psi$) corrections for perimeter edges and steel framing studs. For full 3D spatial temperature distribution, our roadmap provides a fast steady-state CFD proxy using an OpenFOAM boundary mesh exporter.
- **Deep Technical Follow-up**:
  - Thermal bridging: Prefab shelters with uninsulated cold-bridge steel purlins experience up to 28% heat bypass. We apply ISO 14683 / ISO 10211 linear thermal bridge factors ($\Psi \cdot L$) directly to the global conductance matrix: $U_{\text{eff}} = U_{\text{1D}} + \frac{\sum \Psi_k L_k}{A_{\text{envelope}}}$.
  - Air stratification: For tall shelters ($h > 3 \text{ m}$), a two-node vertical air model computes buoyancy-driven convective exchange between the lower occupied zone and upper ceiling reservoir.

---

## Category 3: Validation, Data Sourcing & Field Studies (Aman)

### Q3.1: How did you validate your thermal model without building a physical shelter during the hackathon?
- **Crisp Answer (2 Sentences)**:
  We validated our engine against published empirical field data from DRDO-DIHAR Leh and LEDeG monitored passive solar structures across sub-zero Himalayan winters. Across three published test cases—DIHAR Leh solar pilot, monitored Trombe wall, and direct-gain room—our model matched measured temperatures with a maximum deviation of $2.29 \text{ °C}$ and perfectly reproduced the observed thermal rank order.
- **Deep Technical Follow-up**:
  - Test Case 1 (DIHAR Leh Pilot Project, $-19 \text{ °C}$ ambient): Measured $16.00 \text{ °C}$ vs Model $16.04 \text{ °C}$ ($\Delta = +0.04 \text{ °C}$).
  - Test Case 2 (Leh Monitored Trombe Wall Room, Feb 2020): Measured $13.00 \text{ °C}$ average vs Model $14.31 \text{ °C}$ ($\Delta = +1.31 \text{ °C}$).
  - Test Case 3 (Leh Monitored Direct Gain Passive Room, Feb 2020): Measured $10.00 \text{ °C}$ average vs Model $12.29 \text{ °C}$ ($\Delta = +2.29 \text{ °C}$).
  - Ordering check: Trombe wall physically outperformed Direct Gain by $+2.02 \text{ °C}$ in simulation, matching DIHAR's published findings that unvented thermal storage walls prevent nocturnal back-radiation losses.

### Q3.2: Where does your weather data come from, and how does it work completely offline?
- **Crisp Answer (2 Sentences)**:
  We ingest standard IWEC/ISHEVE hourly EPW meteorological datasets for Leh (34.15° N, 77.57° E, 3,514 m) and pre-compile them into a local SQLite database (`therma.db`) alongside a fallback CSV. When evaluated in offline mode without internet, THERMA retrieves hourly ambient temperatures, direct normal irradiance (DNI), diffuse horizontal irradiance (DHI), and wind speeds with zero network dependencies.
- **Deep Technical Follow-up**:
  - Design Day synthesis: For "Design Winter Night", we extract the 1-percentile coldest day of the meteorological year (15 January) where ambient temperature bottoms out at $-22.0 \text{ °C}$ at 06:00.
  - Solar geometry: Computes declination $\delta$, solar hour angle $\omega$, solar altitude $\alpha_s$, and azimuth $\gamma_s$ using Spencer's and ASHRAE algorithms locally in Python.

### Q3.3: Did you invent any material properties or prices in your database?
- **Crisp Answer (2 Sentences)**:
  No; every material thermal conductivity, density, and specific heat is sourced from IS 3792 (Indian Standard for Thermal Insulation) and ASHRAE Fundamentals. Costs and local availability are cited from Ladakh PWD Schedule of Rates 2022 and LEDeG field project documentation, with unverified craft estimates explicitly tagged with an `[estimate]` flag in the UI.
- **Deep Technical Follow-up**:
  - Sourced materials: Mud brick ($k = 0.75 \text{ W/mK}$, $\rho = 1750 \text{ kg/m}^3$), Rammed earth ($k = 1.10$, $\rho = 1950$), Stone masonry ($k = 1.80$, $\rho = 2300$), EPS ($k = 0.038$, $\rho = 25$), Glass wool ($k = 0.040$, $\rho = 32$), Double glazing ($U = 2.80 \text{ W/m}^2\text{K}$, SHGC = $0.72$).
  - Integrity rule: Any parameter lacking a published government or peer-reviewed citation is tagged in `materials.csv` and rendered with a visible warning tag so evaluators know exactly what is empirical vs estimated.

---

## Category 4: Economics, Logistics & Operations (Vritika)

### Q4.1: Where does the ₹2,400 per litre Siachen kerosene number come from?
- **Crisp Answer (2 Sentences)**:
  The ₹2,400/L figure is the published Indian military logistics cost of kerosene airlifted by Cheetah and Mi-17 helicopters to Siachen Glacier and super-high-altitude forward posts (>5,000 m). At an hourly flight operating cost of ₹1.5 to ₹2.5 lakh and payload capacities restricted to ~400 kg at extreme altitude, fuel logistics dwarf the pump price by over forty-fold.
- **Deep Technical Follow-up**:
  - Citation: Institute for Defence Studies and Analyses (IDSA) logistics reports and parliamentary defense standing committee reviews on high-altitude supply chain costs.
  - Monthly consumption: A 15-man post uses ~112 litres/month for heating and snow melting, yielding $\approx ₹2.68 \text{ to } ₹3.20 \text{ lakh}$ per month in helicopter delivery expenditure.
  - Annual payback: Eliminating 1,180 litres of kerosene saves ₹28.3 lakh annually per shelter, paying back passive retrofit costs in ~2.4 years.

### Q4.2: Why wouldn't the army just transport more kerosene instead of doing custom retrofits?
- **Crisp Answer (2 Sentences)**:
  Kerosene supply lines to forward bases are routinely cut for weeks by blizzards, avalanches, and grounded flights during critical winter months. Passive solar thermal design provides zero-failure life support that keeps soldiers safe from hypothermia regardless of whether the supply helicopter can take off.
- **Deep Technical Follow-up**:
  - Operational vulnerability: Kerosene storage at $-40 \text{ °C}$ requires additives to prevent gelling; fuel handling in blizzards causes frostbite injuries; bukharis in enclosed bunkers cause silent asphyxiation and soot inhalation.
  - Passive resilience: Once installed, insulated thermal mass and passive glazing operate with zero mechanical parts, zero fuel lines, zero supply vulnerability, and zero acoustic/infrared signatures.

### Q4.3: How does the Nepal earthquake relief mode work without exploiting the tragedy?
- **Crisp Answer (2 Sentences)**:
  We treat the Nepal earthquake context strictly as an objective technical stress test of our engine's generalizability when conventional supply chains are severed. When roads and helicopter sorties are unavailable, THERMA swaps the military catalog for relief materials—HDPE tarpaulins, straw bales, relief blankets, and trench mud—to maximize nocturnal heat retention using what disaster response teams have on the ground.
- **Deep Technical Follow-up**:
  - Technical parameters: Straw bale ($k = 0.07 \text{ W/mK}$, thickness 350 mm), HDPE dual-layer tarpaulin with dead air gap ($R = 0.32 \text{ m}^2\text{K/W}$), earth-sheltered mud berming ($U \approx 0.6 \text{ W/m}^2\text{K}$).
  - Result: Even without timber or glass, an emergency earth-bermed straw-insulated relief shelter elevates dawn minimum temperatures from $-9 \text{ °C}$ to $+7 \text{ °C}$, preventing infant and elder hypothermia without open indoor campfires.

---

## Category 5: Demo Script Traps & Tough Questions (All)

### Q5.1: "What about summer? Won't this heavily insulated solar shelter overheat?"
- **Crisp Answer (Vedesh/Swapnil)**:
  In high-altitude Himalayan climates (Leh 3,500 m), peak summer ambient rarely exceeds 28 °C while diurnal swings exceed 15 °C. Overheating is controlled passively using high-mass night ventilation (opening operable vents to flush cool 10 °C nocturnal air) and high-angle solar roof overhangs that shade the south glazing when the summer sun reaches $78^\circ$ altitude.

### Q5.2: "Is this tool actually ready to be handed to a border roads commander tomorrow?"
- **Crisp Answer (Surbhi)**:
  Yes; the tool requires zero software installation, runs directly in a lightweight browser offline, accepts plain language site parameters, and exports a one-click military specification sheet with bill-of-materials and predicted fuel savings. A forward engineer can evaluate a proposed hut design or compare three local construction options in under two minutes.

### Q5.3: "What happens if local contractors build with poor workmanship and air leakage?"
- **Crisp Answer (Aman/Vritika)**:
  The sensitivity panel demonstrates that air infiltration (ACH) is the second most sensitive lever after night shutters. The tool highlights this directly in the export spec sheet, warning that failing to seal door frames and window perimeters drops the minimum temperature by up to $3.8 \text{ °C}$, making weather-stripping inspections a mandatory sign-off checkpoint on site.
