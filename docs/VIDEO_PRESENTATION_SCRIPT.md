# THERMA — SIH Demo Video Script (Natural & Pitch-Focused)

> **Format:** Casual, confident, high-energy developer walkthrough  
> **Duration:** ~4 minutes  
> **Goal:** Sell the judges on what THERMA is, how it actually works, and why it's a game-changer for high-altitude defense.

---

## 📋 Presenter Teleprompter / Quick Bullet Cheat-Sheet
*(If you prefer to talk extempore while clicking around, just follow these bullets)*

1. **Problem (0:00 - 0:45):**
   - Siachen/Ladakh at -35°C. Troops living in tin sheds.
   - Burning kerosene in bukharis = carbon monoxide poisoning + ₹2,400/L helicopter airlift cost.
   - Paradox: Huge solar irradiance (>950 W/m²), but no automated tool to design passive shelters for extreme cold.
2. **3D Design Studio & Typologies (0:45 - 1:45):**
   - Area-specific, not one-size-fits-all.
   - Siachen: Stilts for permafrost, monoslope roof for blizzard winds, south Trombe wall, airlock mudroom.
   - Switch to Manali: 30° snow-shedding timber gable, Kath-Kuni earthquake construction.
   - Switch to Jaisalmer: Sandstone masonry, carved jali screens for passive cooling.
   - Click Exploded View (60 FPS layer separation) + 2D CAD blueprint toggle.
3. **Physics Engine & Optimization (1:45 - 2:45):**
   - Step 2 Simulation: 5R1C finite-difference thermal solver (conduction, convection, solar, sky cooling).
   - The Diurnal Graph: Tin shed collapses to -18°C at dawn; THERMA holds +18°C with ZERO fuel.
   - Step 3 Optimization: Genetic algorithm balancing Comfort vs ₹ Cost on a Pareto frontier. Finds the "Utopia Knee Point".
   - Safety Interlock: Refuses dangerous designs (unvented stove + airtight room = blocked).
4. **Defense Operations & Procurement (2:45 - 3:30):**
   - Mission Dashboard: Real-time status of outposts across Northern Command.
   - Alerts & Weather: 7-day forecast cross-referenced with mountain passes (warns if Zoji La or Khardung La will close).
   - 1-Click MES Dossier: 18-section audit report with exact CPWD DSR 2023 item codes and SHA-256 hash.
5. **The Numbers & Impact (3:30 - 4:00):**
   - 900 L kerosene saved per shelter/year = ₹21.6 Lakhs saved per post.
   - 2.1-year payback period.
   - Across 150 posts: 1,35,000 litres saved and ₹32.4 Crore saved every single year.
   - Keeps soldiers safe, warm, and combat-ready.

---

## 🎙️ Full Word-for-Word Spoken Script

### Part 1: The Hook & The Problem (0:00 – 0:45)
**[SCREEN: Start on `http://localhost:5173/` (Landing Page). Scroll down casually past the solar radiation graphic.]**

> "Hey everyone! This is **THERMA**, our submission for Smart India Hackathon for DRDO Problem Statement 26051.
>
> To understand why we built this, look at how the army operates at 15,000 to 18,000 feet in places like Siachen and Ladakh.
>
> In the winter, temperatures drop below **minus thirty-five degrees Celsius**. Right now, thousands of soldiers live in basic corrugated tin sheds. These sheds have virtually zero insulation, so the moment night falls, the temperature inside crashes.
>
> To survive, troops burn kerosene in metal stoves called *bukharis*. That creates two huge problems:
>
> First, **soldier health**: the air fills with toxic soot and lethal carbon monoxide. And if a blizzard blocks supply lines, fuel runs out and troops face severe hypothermia.
>
> Second, **logistics cost**: there are no roads. Fuel has to be airlifted by helicopter, costing over **₹2,400 per litre** to get to Siachen.
>
> The irony is that high-altitude cold deserts get incredible sunlight—over **950 Watts per square meter**. But traditional architecture tools like EnergyPlus or Revit take months of expert consulting to model a single building.
>
> That’s why we built **THERMA**—an end-to-end generative design platform that automates the engineering of passive solar shelters, keeping troops warm at **plus eighteen degrees** with **zero fuel consumption**."

---

### Part 2: The 3D Design Studio & Climate Typologies (0:45 – 1:50)
**[SCREEN: Click into the Design Studio at `http://localhost:5173/sites/site_siachen/design` (Step 1).]**

> "Let’s jump straight into the software.
>
> Right now, you're looking at our **3D Open Shelter Studio**.
>
> What makes THERMA different from any generic CAD tool is that it's **area-specific and climate-adaptive**. You cannot build the same shelter on glacial permafrost as you would in a valley or desert.
>
> Right here for **Siachen Base Camp**, the architecture automatically adapts:
> - The entire shelter sits on **elevated steel stilts** with concrete footings. This isolates the floor from the permafrost so ground thaw doesn’t collapse the foundation.
> - The roof is an **aerodynamic monoslope** angled to deflect high-altitude blizzards while capturing maximum solar radiation.
> - On the east side, we have an **airlock mudroom** that stops freezing drafts whenever soldiers enter.
> - And on the south face, we have a **heavy thermal Trombe mass wall** behind double glazing. It absorbs heat during the day and radiates it inward for ten hours through the night.
>
> Now, look at what happens when I switch locations:"

**[ACTION: Open the Site Selector dropdown and pick `Manali / Alpine Valley`]**

> "Switching to **Manali**, the building morphs automatically:
> It changes to a **30-degree timber gable roof** designed to shed heavy alpine snow, and the envelope switches to **Kath-Kuni construction**—alternating timber and stone lacing engineered to survive Zone Five Himalayan earthquakes."

**[ACTION: Switch to `Jaisalmer / Arid Desert`]**

> "Switch again to the extreme heat of **Jaisalmer in the Thar Desert**:
> It transforms into thick **sandstone masonry with carved stone jali screens**—blocking direct solar heat while accelerating cool desert breezes."

**[ACTION: Switch back to Siachen. Click 'Exploded View' on the left vertical toolbar.]**

> "Back in Siachen, let’s inspect the construction. Clicking **Exploded View** smoothly pulls the building apart at 60 FPS.
>
> You can clearly see the multi-layered envelope: exterior weather cladding, the 100mm expanded polystyrene insulation core, and the dense interior thermal mass.
>
> Clicking any hotspot shows the exact thermal properties—conductivity, R-values, and official CPWD rates."

**[ACTION: Click the '2D View' toggle at the top of the canvas.]**

> "And if an engineer on the ground needs construction blueprints, clicking **2D View** instantly generates exact CAD elevation drawings with millimetric dimensions and pitch angles."

---

### Part 3: Real Physics & Pareto Optimization (1:50 – 2:50)
**[ACTION: Click 'Step 2: Simulation' in the top ribbon.]**

> "Now, does this actually work under harsh Himalayan physics?
>
> In **Step 2: Simulation**, THERMA runs a true **5R1C finite-difference thermal solver**. It calculates solar radiation, wind convection, nocturnal sky cooling, and conduction through every single wall layer.
>
> Look at this 24-hour diurnal graph:
> - **The Red Line** is the current military standard—an uninsulated tin shed. At 4:00 AM, the inside temperature crashes straight down to **minus eighteen degrees Celsius**.
> - **The Green Line** is our THERMA passive shelter. Even when the outside air hits minus twenty-eight, the inside stays steady between **plus seventeen and nineteen degrees Celsius**—all night long, with zero kerosene burned."

**[ACTION: Click 'Step 3: Optimization' in the top navigation.]**

> "In defense procurement, budget is always a constraint. That brings us to **Step 3: Optimization**.
>
> Here, our genetic algorithm evaluates hundreds of design combinations, plotting **Thermal Comfort Hours** against **Construction Cost in Rupees**.
>
> The system automatically highlights the **Utopia Knee Point**—the single design that gives you the highest temperature lift per rupee invested.
>
> Below it, our **Design Doctor** ranks every retrofit intervention by cost-efficiency.
>
> And notice this: THERMA has built-in **life-safety interlocks**. If an engineer accidentally selects a combustion heater with low ventilation, the system throws a hard refusal card. It mathematically prevents carbon monoxide poisoning before construction ever starts."

---

### Part 4: Tactical Command, Weather Alerts & Defense Dossiers (2:50 – 3:35)
**[ACTION: Click 'Dashboard' (`/dashboard`), then navigate to 'Alerts' (`/alerts`).]**

> "Beyond designing individual shelters, THERMA is a sector-wide defense command platform.
>
> Here on the **Mission Dashboard**, commanders can monitor forward posts across the entire Northern Command in real time.
>
> Under **Alerts**, THERMA ingests 7-day weather forecast models.
>
> But here’s the key difference: it correlates weather forecasts with mountain logistics. If a major blizzard is predicted to close critical passes like Khardung La or Zoji La, it flags which outposts will be cut off and calculates the exact emergency buffer fuel needed so convoys can move before the pass freezes."

**[ACTION: Click 'Reports' (`/reports`) to show the procurement dossier.]**

> "Finally, when a project is approved, THERMA generates an audit-ready **18-Section Defense Procurement Dossier**.
>
> It includes structural specs, U-values, and itemized bills of quantities linked directly to official **CPWD DSR 2023 rates**, complete with a **SHA-256 cryptographic hash** guaranteeing tamper-proof verification for MES tenders."

---

### Part 5: The Numbers & Closing (3:35 – 4:05)
**[SCREEN: Face the camera or show the summary metrics on the Dashboard.]**

> "To wrap up with the bottom-line numbers:
>
> - Every THERMA shelter saves **900 litres of airlifted kerosene per year**, which is **₹21.6 Lakhs saved per post annually**.
> - The capital retrofit pays for itself in just **2.1 years**.
> - Across approximately 150 forward outposts, that’s **1,35,000 litres of fuel eliminated** and **₹32.4 Crore saved every single year**.
> - And our physics engine is verified—validated against published empirical field trials from **DRDO-DIHAR Leh**.
>
> At the end of the day, THERMA does something vital: it gets our soldiers out of freezing, smoky tin sheds and ensures they wake up warm, healthy, and combat-ready.
>
> That’s THERMA. Thank you, and we’re ready for your questions!"

---

## 💡 Quick Tips for Your Recording
1. **Have 4 browser tabs open in advance:**
   - Tab 1: `http://localhost:5173/`
   - Tab 2: `http://localhost:5173/sites/site_siachen/design`
   - Tab 3: `http://localhost:5173/alerts`
   - Tab 4: `http://localhost:5173/reports`
2. **Use Keyboard Shortcuts in 3D:** Press `1` for Isometric, `2` for South view, `3` for North view, and `4` for Top-down plan view.
3. **Be Yourself:** Talk like an engineer showing off a product you built with your team. Keep the energy high and confident!
