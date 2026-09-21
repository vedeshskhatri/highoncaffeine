# THERMA — Official SIH Video Presentation Script
### High-Impact, Informative & Engaging Technical Walkthrough (~3.5 to 4 Minutes)

> **Tone:** Energetic, confident, engineering-focused, engaging (like an exciting tech product launch)  
> **Duration:** ~3.5 to 4 minutes (620 words)  
> **Target:** Smart India Hackathon 2026 Jury · DRDO Problem Statement 26051  

---

## ⏱️ Video Roadmap & Visual Highlights

| Time | Scene | On-Screen Action | Key Engineering Story |
|:---|:---|:---|:---|
| **0:00 – 0:40** | **The Hook** | Landing Page (`/`) | -35°C Siachen reality, tin shed failure, ₹2,400/L fuel airlift, 950 W/m² solar paradox. |
| **0:40 – 1:40** | **3D Generative Studio** | `/sites/site_siachen/design` | Siachen permafrost stilts & Trombe wall → morph to Manali & Jaisalmer → 60 FPS exploded view → 2D CAD. |
| **1:40 – 2:40** | **First-Principles Physics** | `Step 2: Simulation` & `Step 3` | 5R1C thermal solver, -18°C tin shed crash vs +18°C passive comfort, Pareto Utopia Knee Point, CO safety refusal. |
| **2:40 – 3:25** | **Tactical Defense Ops** | `/dashboard`, `/alerts`, `/reports` | 7-day blizzard triage on mountain passes (Zoji La / Khardung La), 18-section CPWD dossier with SHA-256. |
| **3:25 – 3:55** | **Impact & Close** | Summary Metrics / Camera | ₹32.4 Cr/yr across 150 posts, 2.1-yr payback, validated against DRDO-DIHAR Leh field trials. |

---

## 🎙️ Spoken Script (Word-for-Word with Visual Action Cues)

### 1. The Hook & Problem (0:00 – 0:40)
**[SCREEN: Start on `http://localhost:5173/`. Scroll down smoothly past the live solar telemetry header.]**

> "If you stand at an Indian Army outpost in Siachen at two in the morning, the temperature outside drops to **minus thirty-five degrees Celsius**.
>
> But inside an army tin shelter, it’s not much better—temperatures crash below minus eighteen. To keep from freezing, soldiers burn kerosene in metal stoves called *bukharis* all night. That fills the shelter with toxic soot and lethal carbon monoxide—while airlifting that fuel by helicopter costs over **₹2,400 per litre**.
>
> Here’s the paradox: right outside that freezing shelter, the sun is blazing down with over **950 Watts per square meter** of clean solar energy. The energy is already there—we just haven't had the building physics tools to capture it.
>
> For DRDO Problem Statement 26051, our team engineered **THERMA**—an automated generative platform that designs climate-adaptive, passive solar shelters that maintain **plus eighteen degrees** indoors with **zero active fuel**."

---

### 2. The 3D Climate-Adaptive Studio (0:40 – 1:40)
**[SCREEN: Click into the Design Studio: `http://localhost:5173/sites/site_siachen/design` (Step 1).]**

> "Let’s jump straight into the software.
>
> In our **3D Open Shelter Studio**, design isn't one-size-fits-all. A shelter at 18,000 feet on glacial permafrost requires completely different engineering than one in a valley or desert.
>
> Here at **Siachen Base Camp**, THERMA automatically configures an archetype for glacial conditions:
> - The entire shelter is mounted on **elevated steel stilts** to isolate the floor and prevent permafrost thaw from collapsing the structure.
> - The roof has an **aerodynamic monoslope** angled to deflect katabatic blizzard winds.
> - An **airlock mudroom** traps heat when soldiers enter.
> - And on the south face, we have a **dense thermal Trombe wall** behind double glazing, storing daytime solar heat and radiating it inward across a ten-hour nighttime phase lag.
>
> Now watch what happens when we switch regions:"

**[ACTION: Open the Site Selector dropdown and pick `Manali / Alpine Valley`]**

> "Switching to **Manali**, the building automatically morphs: the roof transforms into a **30-degree timber gable** to shed heavy alpine snow, built with earthquake-resistant **Kath-Kuni timber-stone lacing**."

**[ACTION: Switch to `Jaisalmer / Arid Desert`]**

> "Switching to **Jaisalmer in the Thar Desert**, it adapts into thick **sandstone masonry with carved stone jali screens** that block intense solar heat while accelerating cooling desert breezes."

**[ACTION: Switch back to Siachen. Click 'Exploded View' on the left toolbar, then click '2D View'.]**

> "Back in Siachen, clicking **Exploded View** smoothly pulls the envelope apart at 60 FPS. We can inspect the weather cladding, the 100mm insulation core, and the interior thermal mass.
>
> And clicking **2D View** instantly renders millimetric CAD elevation blueprints ready for on-site military fabrication."

---

### 3. First-Principles Physics & Multi-Objective Optimization (1:40 – 2:40)
**[ACTION: Click 'Step 2: Simulation' in top navigation.]**

> "Now, does this actually work under harsh Himalayan physics?
>
> In **Step 2: Simulation**, THERMA executes a true **5R1C finite-difference thermal network**. It calculates multi-layer Fourier conduction, solar geometry, wind convection, and nocturnal longwave sky cooling.
>
> Look at this 24-hour diurnal graph:
> - **The Red Line** is the standard uninsulated tin shed—collapsing to **minus eighteen degrees** at 4:00 AM.
> - **The Green Line** is THERMA—holding a comfortable **plus seventeen to nineteen degrees Celsius** all night long with zero fuel.
> - And our solver is validated against published empirical field data from **DRDO-DIHAR Leh** test huts.
>
> In defense procurement, budget is always constrained. That brings us to **Step 3: Optimization**:"

**[ACTION: Click 'Step 3: Optimization' in top navigation.]**

> "Our genetic algorithm evaluates hundreds of envelope permutations, plotting Thermal Comfort against Construction Cost along a Pareto frontier.
>
> It automatically identifies the **Utopia Knee Point**—the exact sweet spot that maximizes warmth gained per rupee invested.
>
> And we built in **hard life-safety interlocks**: if an engineer selects an unvented kerosene stove with inadequate airflow, the platform throws a hard refusal card, mathematically preventing carbon monoxide poisoning by design."

---

### 4. Tactical Operations, Early Warning & Procurement (2:40 – 3:25)
**[ACTION: Click 'Dashboard' (`/dashboard`), then navigate to 'Alerts' (`/alerts`).]**

> "Zooming out, THERMA is also a sector-wide tactical command platform.
>
> On the **Mission Dashboard**, commanders track outposts across Northern Command in real time.
>
> Under **Alerts**, THERMA ingests 7-day weather forecasts and cross-references them with mountain logistics corridors.
>
> If a severe blizzard is predicted to block critical passes like Khardung La or Zoji La, THERMA flags the vulnerable posts in advance and calculates the exact emergency buffer fuel needed before mountain roads shut down."

**[ACTION: Click 'Reports' (`/reports`) to show the procurement dossier.]**

> "And when a design is finalized, clicking **Reports** compiles an audit-ready **18-Section Defense Procurement Dossier**—with itemized CPWD DSR 2023 rates and a **SHA-256 cryptographic hash** guaranteeing tamper-proof verification for military tenders."

---

### 5. Impact & Conclusion (3:25 – 3:55)
**[SCREEN: Show summary metrics on Dashboard or address camera directly.]**

> "To summarize our bottom-line impact:
>
> - Each shelter eliminates **900 litres of airlifted kerosene**, saving **₹21.6 Lakhs per post every year** with a **2.1-year payback**.
> - Scaled across 150 forward outposts, that eliminates **1,35,000 litres of fuel** and saves the defense budget **₹32.4 Crore annually**.
>
> THERMA bridges computational architecture, thermal physics, and military logistics to ensure our soldiers on the frozen frontier sleep warm, breathe clean air, and wake up combat-ready.
>
> Thank you, and we welcome your questions!"

---

## 🎬 Pro Presenter Tips for Maximum Energy
1. **Show the Morphing:** When switching from Siachen to Manali and Jaisalmer, pause for 1 second so the judges clearly see the 3D model rebuild itself in real time.
2. **Emphasize the Numbers:** Speak clearly when delivering the key numbers: **-35°C**, **₹2,400/L**, **+18°C**, and **₹32.4 Crore**.
3. **Keep the Energy High:** Deliver with pride and enthusiasm—you are presenting a real, working engineering solution built from scratch!
