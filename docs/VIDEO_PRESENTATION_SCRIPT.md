# THERMA — Official SIH Video & PPT Walkthrough Script

> **Goal:** High-level project presentation explaining what we built, how it works, and its real defense impact.  
> **Pacing:** ~3 to 3.5 minutes (Clean, direct, saves time, no unnecessary architectural trivia).  
> **Target:** Smart India Hackathon 2026 · DRDO Problem Statement 26051  

---

## 🧭 High-Level Presentation Overview

| Slide / Segment | Visual / Screen | What You Explain |
|:---|:---|:---|
| **1. The Problem** | Problem Slide or Landing Page | -35°C reality, failing tin sheds, ₹2,400/L fuel airlift cost, and the 950 W/m² solar paradox. |
| **2. The Engineering Gap** | Gap Slide or Dashboard | DRDO proved solar works, but past projects took months of manual design. The bottleneck is the decision tool. |
| **3. Our Solution (THERMA)** | 3D Studio (`/sites/:id/design`) | Automated platform that takes any outpost location and generates a climate-adaptive shelter in seconds. |
| **4. Simulation & Optimization** | Simulation & Optimizer Tabs | 24-hr physics solver (+18°C passive vs -18°C tin shed) and genetic algorithm finding the best ROI for budget. |
| **5. Tactical Triage & Procurement** | Alerts & Reports Pages | 7-day weather alerts for mountain pass closures (Zoji La / Khardung La) and 1-click CPWD defense dossiers. |
| **6. Impact & Validation** | Summary Slide / Camera | Validated with DRDO-DIHAR Leh data; saves ₹32.4 Crore/yr and protects soldier lives. |

---

## 🎙️ Spoken Video Script (Natural & High-Level)

### 1. The Problem: A Logistics Crisis Disguised as a Heating Problem
**[VISUAL: Show Problem Slide or Landing Page at `http://localhost:5173/`]**

> "At high-altitude forward posts like Siachen and Ladakh, winter temperatures plunge to **minus thirty-five degrees Celsius**.
>
> Today, thousands of soldiers live in basic corrugated tin shelters. These shelters have almost no thermal retention. The moment night falls, they freeze, forcing troops to burn kerosene in unvented *bukharis* around the clock.
>
> That creates a massive defense liability:
> 1. **Soldier Safety**: Toxic soot and carbon monoxide build-up indoors, with severe hypothermia risk whenever fuel lines freeze.
> 2. **Crippling Logistics**: There are no roads to these posts. Airlifting just **one single litre of kerosene** by helicopter costs over **₹2,400**.
>
> The paradox is that high-altitude cold deserts receive world-class sunlight—over **950 Watts per square meter**. The energy is already there, but current shelters lose it within hours of sunset."

---

### 2. The Decision Gap: Why DRDO Needs an Automated Platform
**[VISUAL: Show the Gap Slide or Sector Dashboard at `http://localhost:5173/dashboard`]**

> "Now, DRDO and organizations like DIHAR have already proven that passive solar heating works in the Himalayas. 
>
> But here is the real bottleneck: every successful solar prototype in the past was a **bespoke, months-long engineering project** requiring teams of specialized building scientists.
>
> Forward commanders and military engineers in the field don't have three months to design every new outpost or transit camp.
>
> **The gap isn't the physics—it’s the decision process.**
>
> That’s why we engineered **THERMA**—an automated computational platform that condenses that entire multi-month engineering workflow into a **five-second automated design platform**."

---

### 3. Module 1: The Climate-Adaptive 3D Studio
**[VISUAL: Open the 3D Studio at `http://localhost:5173/sites/site_siachen/design`]**

> "Let me walk you through the core modules we built.
>
> First is our **3D Design Studio**.
>
> Instead of a static one-size-fits-all shelter, THERMA is **area-specific and climate-adaptive**. You simply select an outpost—like Siachen Base Camp—and the engine automatically configures a shelter optimized for that exact altitude, solar angle, and climate.
>
> When you switch to an alpine valley like Manali, or a desert post like Jaisalmer, the building geometry and local vernacular materials adapt in real time.
>
> With one click on **Exploded View**, engineers can inspect the multi-layered insulation envelope, check thermophysical R-values, or toggle directly into **2D CAD Blueprints** with millimetric dimensions ready for construction."

---

### 4. Module 2: First-Principles Simulation & Multi-Objective Optimization
**[VISUAL: Click 'Step 2: Simulation', then 'Step 3: Optimization']**

> "Next, how do we know the shelter will actually keep soldiers warm?
>
> In **Step 2: Simulation**, THERMA executes a true **24-hour finite-difference thermal solver**, calculating conduction, solar heat gain, and night sky radiation.
>
> On the diurnal graph, the difference is dramatic:
> - The standard army tin shelter crashes to **minus eighteen degrees** before dawn.
> - Our passive design maintains a stable **plus seventeen to nineteen degrees Celsius** all night—with **zero active fuel burned**.
>
> In **Step 3: Optimization**, we solve the budget problem.
>
> Military procurement is always constrained by cost. Our genetic algorithm evaluates thousands of envelope permutations, plotting Thermal Comfort against Construction Cost to find the **Utopia Knee Point**—the single design that delivers the maximum warmth per rupee spent.
>
> It also features built-in **life-safety interlocks** that automatically reject dangerous designs, such as unvented heaters in airtight shelters, preventing carbon monoxide hazards by design."

---

### 5. Module 3: Tactical Weather Triage & Procurement Automation
**[VISUAL: Show the Alerts Page at `/alerts`, then Reports at `/reports`]**

> "Zooming out, THERMA acts as a theater-wide command tool.
>
> In our **Alerts Console**, the engine connects to 7-day weather forecasts. It cross-references incoming blizzards with mountain logistics corridors, warning commanders in advance if passes like Khardung La or Zoji La will freeze shut, and calculating emergency buffer fuel so supply runs happen before roads close.
>
> And when an engineering design is approved, THERMA generates an audit-ready **18-Section Defense Procurement Dossier**—complete with itemized **CPWD DSR 2023 rates** and a tamper-proof **SHA-256 cryptographic hash** for MES tenders."

---

### 6. Grounded Validation & Defense Impact
**[VISUAL: Show Validation metrics or summary slide]**

> "To guarantee our engineering is trustworthy, we validated our physics engine directly against published field trial data from **DRDO-DIHAR Leh**, achieving a close match with real measured temperatures.
>
> To summarize the bottom line:
> - Each shelter eliminates **900 litres of airlifted kerosene annually**, saving **₹21.6 Lakhs per post** with a **2.1-year capital payback**.
> - Across 150 forward outposts, that’s **1,35,000 litres of fuel eliminated** and **₹32.4 Crore saved every single year**.
>
> THERMA replaces months of manual consulting with an instant, validated engineering tool—keeping our soldiers warm, safe, and mission-ready.
>
> Thank you!"

---

## 🎯 Presenter Key Takeaways (The 30-Second Elevator Pitch)
- **What is the problem?** Soldiers freezing in tin sheds at -35°C; airlifting kerosene costs ₹2,400/L; high solar energy is wasted.
- **What is the gap?** DRDO proved solar works, but past projects took months of manual design.
- **What did we build?** An automated platform that designs, simulates, and optimizes zero-fuel passive shelters in 5 seconds.
- **What are the key modules?** Climate-adaptive 3D/2D CAD studio, 24-hr thermal physics simulation, multi-objective cost optimizer with safety interlocks, 7-day blizzard triage, and 1-click CPWD procurement.
- **What is the impact?** Validated against DRDO-DIHAR Leh data, ₹32.4 Crore saved annually across 150 posts, 2.1-year payback.
