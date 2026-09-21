# THERMA — Official SIH Engineering Presentation Script
## Smart India Hackathon 2026 · Problem Statement PS 26051 (DRDO)
### Area-Specific Climate-Adaptive Shelter Design for High-Altitude Defense

**Presentation Format:** Live Platform Walkthrough & Technical Defense Showcase  
**Duration:** ~4.5 to 5 Minutes  
**Tone:** Authoritative, technically rigorous, polished engineering presentation  

---

## ⏱️ Technical Presentation Timeline

```
0:00 ─────── 0:45 ─────── 2:00 ─────── 3:05 ─────── 3:55 ─────── 4:35 ─── 5:00
[Phase 1]    [Phase 2]    [Phase 3]    [Phase 4]    [Phase 5]    [Phase 6]
The Problem  3D Studio    Physics      Pareto       Tactical     Empirical
& Logistics  & Typologies Solver       Optimization & CPWD       Validation
```

| Time | Phase | Target Route | Engineering Objective |
|:---|:---|:---|:---|
| **0:00 – 0:45** | **1. The Problem & Logistics Hook** | `/` (Landing) | Ground the challenge in Siachen logistics: ₹2,400/L airlift, tin shed collapse, solar paradox. |
| **0:45 – 2:00** | **2. Generative 3D Architecture** | `/sites/site_siachen/design` | Area-specific typologies (Siachen, Manali, Jaisalmer), 60 FPS exploded envelope, 2D CAD. |
| **2:00 – 3:05** | **3. Thermal Physics Engine** | `Step 2: Simulation` | 5R1C finite-difference solver, diurnal curve (PS Req 1), and heat flux across $\Delta T$ (PS Req 3). |
| **3:05 – 3:55** | **4. Multi-Objective Optimization** | `Step 3: Optimization` | 3,200 permutations in seconds (PS Req 2), Utopia Knee Point, and Life-Safety Interlocks. |
| **3:55 – 4:35** | **5. Tactical Command & Procurement** | `/dashboard` & `/alerts` | 7-day blizzard mountain pass triage (Zoji La / Khardung La), CPWD DSR 2023 audit dossiers. |
| **4:35 – 5:00** | **6. Validation & Strategic Impact** | `/validation` or Camera | Ground truth against DRDO-DIHAR Leh trials, ₹32.4 Cr savings across 150 posts, and closing. |

---

## 🎙️ Complete Spoken Script (Word-for-Word with Visual Actions)

### Phase 1: The Problem & The Logistics Reality (0:00 – 0:45)

**[SCREEN: Start on `http://localhost:5173/`. Scroll down smoothly past the incident solar radiation header and problem overview.]**

> **[SPEAKER]:**  
> "Good morning, respected judges. We are Team HighOnCaffeine, presenting **THERMA** for DRDO Problem Statement 26051.
>
> To understand the engineering challenge we set out to solve over the past month, we have to look at how our defense forces operate on the world’s highest battlefields—from Siachen and Daulat Beg Oldie to the wind-swept plateau of eastern Ladakh.
>
> In the winter, temperatures regularly drop below **minus thirty-five degrees Celsius**. Right now, thousands of forward troops are housed in standard corrugated iron prefab sheds. These tin structures have virtually zero thermal resistance. The moment night falls, they lose heat almost immediately.
>
> To survive, soldiers burn kerosene in unvented metal stoves called *bukharis*. This creates an unsustainable double crisis:
>
> 1. **Life Safety**: The indoor air fills with toxic soot and lethal carbon monoxide. If a blizzard blocks fuel resupply, soldiers face acute hypothermia within hours.
> 2. **Logistics Cost**: There are no motorable roads to forward posts. Every drop of fuel must be airlifted by Cheetah and Dhruv helicopters. Delivering just **one single litre of kerosene** to a Siachen forward post costs over **₹2,400**.
>
> Yet here is the physical paradox: high-altitude Ladakh receives world-class solar irradiance—over **950 Watts per square meter**, exceeding 5.5 kilowatt-hours per square meter per day through thin mountain air.
>
> DRDO’s Defence Institute of High Altitude Research (DIHAR) has proven that passive solar space heating works. But historically, every prototype was a bespoke, months-long consulting project. Forward military engineers do not have six months to design every new outpost.
>
> That is the engineering gap we solved. **THERMA** is an automated computational building physics and generative design platform that takes an outpost location and instantly generates an optimized passive solar shelter holding **plus eighteen degrees Celsius** indoors with **zero active fuel**."

---

### Phase 2: Generative 3D Architecture & Climate-Adaptive Typologies (0:45 – 2:00)

**[SCREEN: Navigate directly into the Design Studio: `http://localhost:5173/sites/site_siachen/design` (Step 1).]**

> **[SPEAKER]:**  
> "Let’s walk through what our software actually does.
>
> We begin in the **3D Open Shelter Studio**.
>
> One of our core engineering principles is that **high-altitude defense infrastructure cannot be one-size-fits-all**. An outpost on glacial moraine at 4,800 meters faces radically different boundary conditions than an alpine valley post in Himachal or a desert garrison in Rajasthan.
>
> Here at **Siachen Base Camp**, the generative engine automatically creates a cold-cryosphere archetype:
> - The entire shelter is elevated on **reinforced steel stilts with concrete footing pads**. This thermally isolates the floor from the permafrost, preventing ground-thaw and catastrophic structural sinking.
> - The roof is an **11-degree aerodynamic monoslope**, engineered to deflect high-velocity Himalayan blizzards while carrying solar photovoltaic panels.
> - On the east entrance, we have an **integrated airlock mudroom** to prevent cold infiltration when soldiers enter.
> - And on the south facade, we have a **heavy thermal Trombe mass wall** behind double glazing, absorbing solar radiation all day and radiating warmth into the living quarters for ten hours through the night."

**[ACTION: Click the Site Selector dropdown and switch to `Manali / Alpine Valley`]**

> **[SPEAKER]:**  
> "Now, look at how the generative engine dynamically adapts when we switch to **Manali in Himachal Pradesh**.
>
> The building morphs in real time:
> - The monoslope transforms into a **30-degree timber gable roof** designed to shed heavy snowfall per Indian Standard 875 Part 2.
> - The walls transition to authentic **Kath-Kuni construction**—alternating courses of deodar cedar timber and dressed stone with interlocking corner quoins, specifically engineered per IS 13828 to survive Zone Five Himalayan earthquakes.
> - And the direct-gain south windows automatically gain insulated night shutters."

**[ACTION: Switch to `Jaisalmer / Arid Desert`]**

> **[SPEAKER]:**  
> "Switching to the extreme heat of **Jaisalmer in the Thar Desert**, the architecture adapts again:
> - The roof becomes a flat terrace with parapets for nocturnal radiant cooling.
> - The walls shift to dense golden sandstone masonry.
> - And south-facing windows are fitted with traditional **carved stone jali screens** that block intense direct solar heat while accelerating cooling desert breezes per ECBC standards."

**[ACTION: Switch back to Siachen, then click the 'Exploded View' icon on the left vertical toolbar.]**

> **[SPEAKER]:**  
> "Back at Siachen, let’s inspect the construction assembly. Clicking **Exploded View** smoothly separates the building at 60 FPS.
>
> We can clearly inspect every layer: the exterior weather cladding, the ten-centimeter expanded polystyrene (EPS) insulation core, and the dense interior thermal storage mass.
>
> Clicking any 3D hotspot opens our engineering HUD, displaying thermal conductivity ($k$), density ($\rho$), thermal resistance ($R$), and official CPWD cost rates."

**[ACTION: Click the '2D View' toggle at the top of the canvas.]**

> **[SPEAKER]:**  
> "And for military engineers on-site who need instant fabrication drawings, clicking **2D View** generates exact orthogonal CAD elevation blueprints with millimetric dimensions and pitch angles."

---

### Phase 3: The Thermal Physics Solver & Heat Balance (2:00 – 3:05)

**[ACTION: Click 'Step 2: Simulation' in the top step ribbon.]**

> **[SPEAKER]:**  
> "Now, let’s examine the mathematical core of THERMA.
>
> In **Step 2: Simulation**, our engine runs a dynamic **5R1C finite-difference thermal network**. We model solar position angles, hourly beam and diffuse solar irradiance, conduction through every multi-layer wall, wind-driven surface convection, nocturnal longwave sky cooling, and internal sensible heat gains from soldiers.
>
> Look at this 24-hour diurnal thermal curve:
> - **The Red Line represents the standard military tin shelter**. At 04:00 AM, the inside temperature crashes straight down to **minus eighteen degrees Celsius**—spending 18 out of 24 hours in the acute hypothermia zone. This directly satisfies **Requirement 1 of the Problem Statement: predicting indoor temperature profiles**.
> - **The Green Line is the THERMA passive solar shelter**. Even as outside ambient temperature plunges below minus twenty-five, our shelter holds a continuous indoor temperature of **plus seventeen to nineteen degrees Celsius** till sunrise.
>
> That is a 36-degree thermal lift—achieved with **zero active fuel** and **zero moving parts**."

**[ACTION: Scroll down slightly to point out the heat flow breakdown across $\Delta T$.]**

> **[SPEAKER]:**  
> "Furthermore, our physics solver continuously tracks **heat flow across the envelope driven by the indoor-to-ambient temperature difference ($\Delta T$)**, fulfilling **Requirement 3 of the Problem Statement**."

---

### Phase 4: Multi-Objective Pareto Optimization & Safety Interlocks (3:05 – 3:55)

**[ACTION: Click 'Step 3: Optimization' in the top navigation ribbon.]**

> **[SPEAKER]:**  
> "In defense procurement, engineering is always constrained by budget and airlift logistics. That brings us to **Step 3: Optimization**, fulfilling **Requirement 2 of the Problem Statement**.
>
> Instead of manually testing design tweaks, our vectorized solver evaluates **3,200 candidate design permutations in 5.6 seconds**.
>
> On this interactive scatter plot:
> - We plot **Thermal Comfort Hours** against **Total Construction Cost in Indian Rupees**.
> - The blue boundary represents the **Pareto Frontier** of non-dominated solutions.
> - The algorithm automatically identifies the **Utopia Knee Point**—the single design that maximizes temperature rise per rupee invested.
>
> Below, our **Design Doctor** provides an engineering post-mortem on why specific interventions won or lost:
> - Adding insulated night shutters yielded **plus 6.1 degrees** for just ₹500 per window.
> - In contrast, adding another 100 millimeters of heavy stone wall yielded only **plus 0.4 degrees**, but cost ₹38,000 and added **12 tonnes of dead airlift weight**.
>
> And crucially, we engineered hard **Life-Safety Interlocks**: if a user selects a combustion heater with low ventilation ($ACH < 0.35$), the system immediately throws a red **RefusalCard**—mathematically preventing carbon monoxide asphyxiation before a design ever reaches the field."

---

### Phase 5: Tactical Command, Weather Alerts & Defense Dossiers (3:55 – 4:35)

**[ACTION: Click 'Dashboard' in the navigation bar (`/dashboard`), then click into 'Alerts' (`/alerts`).]**

> **[SPEAKER]:**  
> "Beyond individual shelters, THERMA serves as an operational theater command system.
>
> In the **Sector Mission Dashboard**, commanders maintain live situational awareness across all forward outposts in Northern Command.
>
> In the **Alerts Console**, THERMA ingests seven-day forward numerical weather predictions.
>
> Crucially, it links weather predictions to mountain logistics corridors. If a heavy blizzard is forecasted to close critical passes like Khardung La or Zoji La in four days, THERMA flags the corridor cutoff in advance and calculates the exact emergency buffer fuel and battery capacity required, empowering commanders to dispatch convoys before passes freeze shut."

**[ACTION: Click 'Reports' (`/reports`) to show the procurement dossier.]**

> **[SPEAKER]:**  
> "When a design is finalized, clicking **Procurement Dossier** compiles an audit-ready **18-Section Military Procurement Report**.
>
> It includes structural bills of quantities mapped directly to official **CPWD DSR 2023 item codes**, alongside a **SHA-256 cryptographic hash** ensuring tamper-proof data provenance for Military Engineer Services (MES) tenders."

---

### Phase 6: Empirical Validation & Strategic Impact (4:35 – 5:00)

**[ACTION: Click 'Validation' (`/validation`) or look directly at the camera with the dashboard behind you.]**

> **[SPEAKER]:**  
> "Finally, engineering claims must be grounded in empirical truth.
>
> We validated our solver against published field trials from **DRDO's Defence Institute of High Altitude Research (DIHAR) in Leh**. Across their monitored solar pilot hut, Trombe wall, and direct-gain rooms, our model predictions match measured field temperatures within an average delta of 1.2 degrees, and rigorously preserve the physical performance ranking of Trombe walls over direct gain.
>
> Here is the strategic defense impact:
> - Each passive shelter saves **900 litres of airlifted kerosene every year**, translating to **₹21.6 Lakhs in direct annual savings per post**.
> - The capital retrofit pays for itself in just **2.1 years**.
> - Across approximately 150 active forward posts, THERMA eliminates **1,35,000 litres of fuel per year**, saving the defense budget **₹32.4 Crore annually**.
>
> Most importantly, THERMA ensures that our soldiers defending our nation’s harshest frontiers sleep warm, breathe clean air, and remain combat-ready every single morning.
>
> Thank you, and we welcome your questions."

---

## 📋 Presenter Rehearsal Cheat-Sheet (Print or Keep on Phone)

### Beat-by-Beat Talking Points

1. **The Hook (0:00 - 0:45):**
   - ₹2,400/L to airlift kerosene to Siachen; ₹3.2L/month/post just to not freeze.
   - Tin prefab collapse to -18°C; bukharis cause CO poisoning and soot.
   - Solar paradox: >950 W/m² irradiance in Ladakh. DIHAR proved solar works, but bespoke designs took months. THERMA automates this in seconds.

2. **3D Studio & Climate Adaptation (0:45 - 2:00):**
   - Area-specific, not one-size-fits-all.
   - Siachen: Stilts on permafrost, monoslope blizzard roof, east airlock mudroom, south Trombe wall.
   - Switch to Manali: 30° snow-shedding timber gable (IS 875), Kath-Kuni seismic frame (IS 13828).
   - Switch to Jaisalmer: Sandstone masonry, carved jali screens (ECBC passive cooling).
   - Exploded View (60 FPS layer breakdown) + 2D CAD blueprint toggle.

3. **Physics Engine (2:00 - 3:05):**
   - 5R1C finite-difference solver (conduction, convection, solar, sky radiation).
   - PS Req 1: Red curve (tin hut crashes to -18°C) vs Green curve (+18°C held with zero fuel).
   - PS Req 3: Real-time heat flow across $\Delta T$ (indoor − ambient).

4. **Optimization & Safety (3:05 - 3:55):**
   - PS Req 2: 3,200 design permutations evaluated in 5.6 seconds.
   - Pareto frontier: Comfort vs Cost (₹), Utopia Knee Point.
   - Design Doctor: Night shutters give +6.1°C for ₹500; extra stone gives only +0.4°C for ₹38,000 and 12t airlift weight.
   - Safety Interlock: Hard refusal on combustion heater + low ventilation ($ACH < 0.35$).

5. **Tactical Operations & Dossiers (3:55 - 4:35):**
   - Mission Dashboard: Northern Command theater situational awareness.
   - 7-Day Blizzard Pass Triage: Flags closures on Zoji La / Khardung La before convoys get stranded.
   - 1-Click MES Dossier: 18 sections, CPWD DSR 2023 rates, SHA-256 cryptographic verification.

6. **Validation & Impact (4:35 - 5:00):**
   - Validated against DRDO-DIHAR Leh field measurements (1.2°C avg error, Trombe > Direct Gain).
   - 900 L/yr saved per shelter = ₹21.6 Lakhs/year saved per post; 2.1-year payback.
   - 1,35,000 L fuel and ₹32.4 Crore saved across 150 posts.
   - Troop health, warmth, and combat readiness.

---

## 🎯 Evaluator Defense & Q&A Playbook

| Evaluator Question | Recommended Response |
|:---|:---|
| *"Why didn't you just use EnergyPlus or ANSYS?"* | "EnergyPlus and ANSYS are heavy desktop CFD tools requiring hours per run and manual CAD prep. They cannot run multi-objective optimization over 3,200 designs on the fly in the browser, and they have zero awareness of high-altitude logistics, permafrost, or Indian CPWD DSR cost schedules. THERMA couples a validated 5R1C solver with instant generative CAD." |
| *"How do you prove your simulation is accurate?"* | "We validated against published empirical field data from DRDO-DIHAR in Leh across three benchmark test rooms (pilot shelter, Trombe wall, direct gain). Our solver reproduces the monitored temperatures within 1.2°C and strictly preserves the physical ordering where Trombe walls outperform direct gain." |
| *"What prevents an unfeasible design from being generated?"* | "Two interlocks: First, our local material constraint restricts choices to regionally available supplies (mud brick, stone, timber, EPS). Second, our Life-Safety Interlock mathematically blocks hazardous combinations—such as combustion heating in airtight spaces ($ACH < 0.35$)—preventing carbon monoxide buildup by design." |
| *"Where does the ₹2,400/L fuel cost come from?"* | "That represents the fully burdened cost of fuel airlift to Siachen forward posts above 5,000 meters, incorporating Cheetah and Mi-17 rotor-hour operating costs, aircrew staging, and extreme mountain weather flight attrition, cited directly from defense logistics analysis." |
