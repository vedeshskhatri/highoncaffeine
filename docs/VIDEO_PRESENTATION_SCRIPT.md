# THERMA — Official Technical Presentation Script
### Smart India Hackathon 2026 · DRDO Problem Statement 26051
**Project Title:** Area-Specific Climate-Adaptive Passive Solar Shelter Engineering Platform  
**Target Duration:** ~4.5 to 5 Minutes  
**Style:** Professional Engineering Walkthrough & Technical Demonstration  

---

## 🧭 Presentation Structure & Time Allocation

| Section | Duration | Screen Route | Engineering Focus & Demonstration |
|:---|:---|:---|:---|
| **1. The Problem & Engineering Hook** | 0:00 – 0:45 | `/` (Landing Page) | High-altitude thermal crisis (-35°C), tin shed failure, ₹2,400/L fuel logistics, 950 W/m² solar paradox. |
| **2. Procedural 3D CAD & Climate Adaptation** | 0:45 – 1:50 | `/sites/site_siachen/design` | Area-specific procedural typologies (Siachen permafrost vs Manali alpine vs Jaisalmer desert), 60 FPS exploded view, 2D CAD blueprints. |
| **3. Numerical Physics Engine & Simulation** | 1:50 – 2:50 | `Step 2: Simulation` | 5R1C finite-difference thermal solver, Fourier stability, 24-hr diurnal curve (+18°C passive vs -18°C tin shed), DRDO-DIHAR validation. |
| **4. Multi-Objective Optimization & Safety** | 2:50 – 3:45 | `Step 3: Optimization` | NSGA-II genetic algorithm, Pareto frontier, Utopia Knee Point, deterministic life-safety interlock (CO prevention). |
| **5. Tactical Operations & MES Procurement** | 3:45 – 4:30 | `/dashboard`, `/alerts`, `/reports` | Sector mission triage, 7-day blizzard pass closure warnings (Zoji La / Khardung La), 18-section CPWD DSR dossier with SHA-256 hash. |
| **6. Defense Impact & Conclusion** | 4:30 – 5:00 | Camera / Dashboard | Reconciled impact (₹32.4 Cr/yr across 150 posts, 2.1-yr payback), summary of full-stack engineering effort. |

---

## 🎙️ Master Spoken Script (Word-for-Word with Visual Actions)

### 1. The Problem & Engineering Hook (0:00 – 0:45)

**[SCREEN: Start on `http://localhost:5173/` (Landing Page). Display the solar irradiance header and problem overview.]**

> "Imagine defending an outpost at 18,000 feet on the Siachen Glacier, where winter night temperatures collapse below **minus thirty-five degrees Celsius**.
>
> Today, thousands of forward troops are housed in standard corrugated tin shelters. These structures have virtually zero thermal resistance. The moment the sun sets, indoor temperatures plummet instantly.
>
> To survive, soldiers burn kerosene continuously in unvented metal stoves called *bukharis*. This creates two critical defense liabilities:
>
> First, **troop health and safety**: toxic soot and deadly carbon monoxide accumulate inside enclosed shelters, and any fuel line freeze risks catastrophic hypothermia.
>
> Second, **logistics cost**: forward posts have no road connectivity. Every litre of fuel must be airlifted by helicopter, costing the military over **₹2,400 per litre** at Siachen.
>
> Yet, these high-altitude Himalayan plateaus receive over **950 Watts per square meter** of solar insolation through thin, cloudless mountain air.
>
> The core bottleneck has never been a lack of clean solar energy—it has been the absence of an automated building physics tool capable of designing passive, zero-fuel thermal shelters for extreme high-altitude defense.
>
> To solve this for **DRDO Problem Statement 26051**, our team built **THERMA**. Over the past month, we developed an integrated computational platform combining procedural 3D architectural modeling, first-principles thermal simulation, multi-objective Pareto optimization, and automated military procurement.
>
> Let’s walk through the software and engineering pipeline we developed."

---

### 2. Procedural 3D CAD & Climate Adaptation (0:45 – 1:50)

**[ACTION: Click into the Design Studio at `http://localhost:5173/sites/site_siachen/design` (Step 1).]**

> "We begin in the **3D Open Shelter Studio**.
>
> One of our core engineering decisions was making THERMA **area-specific and climate-adaptive**, rather than relying on one-size-fits-all blueprints. A shelter on glacial permafrost requires completely different building physics than one in an alpine valley or a desert border outpost.
>
> Here for **Siachen Base Camp at 4,800 meters**, our procedural engine automatically generates an archetype optimized for glacial cryosphere conditions:
> - The entire shelter is elevated on **heavy structural steel stilts** with concrete pads. This isolates the floor from the permafrost, preventing ground-thaw and structural subsidence.
> - The roof features an **11-degree aerodynamic monoslope** oriented to deflect high-velocity katabatic blizzards while integrating photovoltaic surfaces.
> - An **airlock vestibule** on the east entrance eliminates direct infiltration of freezing air when personnel enter.
> - And on the south facade, we engineer a **dense thermal Trombe wall** behind double-pane glazing, storing daytime solar heat and radiating it inward across a 10-hour nighttime phase lag.
>
> Now, observe how the generative engine adapts when we switch climate zones:"

**[ACTION: Open the Site Selector dropdown at the top, select `Manali / Alpine Valley`]**

> "Switching to **Manali in Himachal Pradesh**, the architectural typology transforms instantly:
> - The roof morphs into a **30-degree timber gable** engineered to shed heavy alpine snowdrifts per Indian Standard 875.
> - The structural envelope transitions to traditional **Kath-Kuni construction**—alternating courses of deodar cedar timber and stone lacing, specifically designed to withstand Zone Five Himalayan seismic forces per IS 13828.
> - The entrance becomes an alpine timber veranda, and direct-gain windows receive insulated night shutters."

**[ACTION: Open the Site Selector dropdown, select `Jaisalmer / Arid Desert`]**

> "Switching to the extreme heat of **Jaisalmer in the Thar Desert**:
> - The structure adapts into a flat terrace with parapets for nocturnal radiant cooling.
> - The envelope transitions to golden sandstone ashlar masonry for high diurnal thermal mass.
> - And south-facing fenestrations are shaded by **carved stone jali screens**, blocking harsh direct solar gain per ECBC guidelines while inducing Venturi convective cooling."

**[ACTION: Switch back to Siachen. Click the 'Exploded View' icon on the left vertical toolbar.]**

> "Returning to Siachen, let’s inspect the structural composition. Clicking **Assembly Exploded View** smoothly separates the building layers in real-time WebGL at 60 frames per second.
>
> We can inspect every constituent layer: the exterior weather barrier, the 100mm expanded polystyrene (EPS) insulation core, and the dense interior thermal mass.
>
> Clicking on any 3D hotspot opens our physical inspection panel, displaying thermal conductivity ($k$), density, R-values, and official CPWD cost citations."

**[ACTION: Click the '2D View' toggle button on the top canvas toolbar.]**

> "And for field engineers, clicking **2D CAD View** instantly renders millimetric orthogonal elevation blueprints with dimension lines and pitch angles ready for on-site military fabrication."

---

### 3. Numerical Physics Engine & Simulation (1:50 – 2:50)

**[ACTION: Click 'Step 2: Simulation' on the top step navigation bar.]**

> "A major strength of our platform is the underlying building physics.
>
> Under **Step 2: Simulation**, THERMA does not use static lookups—it executes a true **5R1C lumped-parameter finite-difference thermal solver** over a 24-hour diurnal cycle.
>
> Our solver computes:
> - Transient 1D multi-layer conduction via Fourier’s law, enforcing the Fourier stability criterion ($Fo \le 0.25$).
> - Solar geometry calculations determining Direct Normal Irradiance (DNI) and diffuse components across inclined surfaces.
> - Longwave nocturnal radiative exchange with the sub-zero sky.
> - And infiltration plus internal metabolic sensible gains from sheltered troops.
>
> Examine the resulting 24-hour diurnal performance curve:
> - **The Red Curve** represents the conventional uninsulated tin shelter. By 04:00 AM, indoor temperatures collapse to **minus eighteen degrees Celsius**—a life-threatening environment.
> - **The Green Curve** represents our THERMA passive design. Even as outdoor ambient temperatures plunge past minus twenty-eight, the indoor temperature is held securely between **plus seventeen and nineteen degrees Celsius**—a 36-degree thermal lift sustained with **zero active fuel consumption**.
>
> To establish rigorous scientific credibility, we validated our solver against published empirical field data from **DRDO-DIHAR Leh** test huts. Our model reproduces observed thermal performance within real-world measurement bands while strictly preserving physical rank-order invariants."

---

### 4. Multi-Objective Optimization & Life-Safety Interlocks (2:50 – 3:45)

**[ACTION: Click 'Step 3: Optimization' on the top step navigation bar.]**

> "In defense procurement, engineering solutions must balance thermal performance against strict capital budgets. That led us to build **Step 3: Multi-Objective Optimization**.
>
> We implemented an NSGA-II genetic algorithm that explores hundreds of envelope permutations—varying insulation thickness, glazing specifications, and thermal mass options.
>
> The engine plots **Thermal Comfort Hours** against **Total Construction Cost in Indian Rupees (₹)** along an interactive Pareto frontier.
>
> The system automatically computes the **Utopia Knee Point**—identifying the exact mathematical configuration that maximizes thermal degree-hours gained per rupee invested.
>
> Below, our **Design Doctor** ranks every prospective retrofit intervention by cost-efficiency.
>
> Crucially, we implemented deterministic **life-safety interlocks**: if a user evaluates an unvented kerosene heater in an envelope with low air changes per hour ($ACH < 0.35$), the platform triggers a hard refusal card. It mathematically disallows hazardous designs, preventing carbon monoxide asphyxiation before a tender is ever drafted."

---

### 5. Tactical Operations & MES Procurement (3:45 – 4:30)

**[ACTION: Click 'Dashboard' in the top navigation (`/dashboard`), then navigate to 'Alerts' (`/alerts`).]**

> "Beyond designing individual structures, THERMA functions as an operational defense management platform.
>
> On the **Sector Mission Dashboard**, commanders maintain real-time situational awareness across forward operating bases throughout Northern Command.
>
> In the **Alerts Console**, THERMA ingests 7-day forward numerical weather predictions.
>
> We built logic that correlates temperature drops directly with mountain logistics corridors. If an incoming blizzard threatens to block critical passes like Khardung La or Zoji La, the platform flags the cut-off risk in advance and calculates the exact emergency buffer fuel and thermal reserves required before the road closes."

**[ACTION: Click 'Reports' (`/reports`) to display the defense procurement dossier.]**

> "When an engineering design is approved, THERMA generates an audit-ready **18-Section Defense Procurement Dossier**.
>
> It includes layer-by-layer U-values, structural assemblies, and an itemized Bill of Quantities tied directly to official **CPWD Delhi Schedule of Rates (DSR 2023)** codes, accompanied by a **SHA-256 cryptographic hash** ensuring data provenance for Military Engineer Services tenders."

---

### 6. Defense Impact & Conclusion (4:30 – 5:00)

**[SCREEN: Show the Dashboard Executive Metrics or address the camera directly.]**

> "To summarize our project's quantitative impact:
>
> - Each passive shelter eliminates **900 litres of airlifted kerosene annually**, delivering **₹21.6 Lakhs in direct logistics savings per post**.
> - The capital retrofit pays for itself in just **2.1 years**.
> - Scaled across approximately 150 forward outposts, THERMA eliminates **1,35,000 litres of fuel** and saves the defense budget **₹32.4 Crore every single year**.
>
> Throughout this project, our team integrated building science, procedural 3D modeling, numerical physics, and defense procurement workflows into a practical, deployment-ready software platform.
>
> Most importantly, THERMA provides a viable engineering path to transition our armed forces away from hazardous tin shelters, ensuring soldiers on our northern frontiers stay warm, safe, and mission-ready.
>
> Thank you, and we look forward to your questions."

---

## 🎯 Speaker Key Takeaways & Delivery Guidelines

1. **Tone:** Confident, technical, and objective. Avoid sales hyperbole; present THERMA as a well-engineered computational tool solving a real physical problem.
2. **Smooth Transitions:** Use the step navigation bar at the top of the canvas (`Step 1: Design`, `Step 2: Simulation`, `Step 3: Optimization`) to clearly signpost the workflow for the judges.
3. **Pacing:** Allow 2-3 seconds for visual animations (like the site morphing or 3D exploded view) to register on screen before explaining the underlying physics.
4. **Pre-Loaded Browser Tabs:**
   - **Tab 1:** `http://localhost:5173/` (Landing)
   - **Tab 2:** `http://localhost:5173/sites/site_siachen/design` (Design Studio & 3D Model)
   - **Tab 3:** `http://localhost:5173/dashboard` (Mission Command Dashboard)
   - **Tab 4:** `http://localhost:5173/alerts` (Weather & Pass Logistics Alerts)
   - **Tab 5:** `http://localhost:5173/reports` (MES Procurement Dossier)
