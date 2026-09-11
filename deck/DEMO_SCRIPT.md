# THERMA — 90-Second Demonstration Script
## SIH 2026 · PS 26051 (DRDO) · High-Altitude Passive Shelter Design

---

### Team Roles & Rehearsal Setup
- **Moderator & Lead Presenter (Surbhi)**: Narrates the logistics hook, problem statement callouts, and closure.
- **Physics & Engine Specialist (Swapnil)**: Explains the overnight thermal collapse and heat exchange across $\Delta T$.
- **Software & Optimizer Driver (Vedesh)**: Drives the browser UI live, triggers optimization, explains the Pareto frontier.
- **Validation & Data Lead (Aman)**: Presents the DIHAR field validation points and local weather integration.
- **Logistics & Economics Analyst (Vritika)**: Quantifies the fuel savings, airlift payload reduction, and Nepal relief mode.

> **DEMO ENVIRONMENT CHECKLIST**:
> - Browser open at `http://localhost:5173/` at 100% zoom.
> - Network disconnected or in airplane mode to prove 100% offline capability.
> - DevTools closed, notifications muted.
> - Stopwatch running on phone beside keyboard.

---

## 90-Second Live Demo Timeline

```
  0s ──── 10s ──── 25s ──── 35s ──── 50s ──── 60s ──── 75s ──── 85s ── 90s
[Beat 0] [Beat 1] [Beat 2] [Beat 3] [Beat 4] [Beat 5] [Beat 6] [Beat 7]
Logistics Failure  Constrain Search   The Fix  Reason   Proof   Leave-behind
```

---

### Beat 0: The Cost of Staying Warm (00:00 – 00:10 · 10 seconds)
**Speaker**: **Surbhi**  
**Action on Screen**: Start on Slide 1 / Hero Screen showing the 3 numbers. Do not touch charts yet.

> **Surbhi (Speaking firmly, direct eye contact with judges)**:  
> "Good morning, respected judges.  
> It costs **₹2,400** to deliver one single litre of kerosene to a Siachen forward post.  
> A standard 15-man post burns 112 litres a month.  
> That is **₹3.2 lakh every month, per post, simply to not freeze.**  
> The solar resource in Ladakh is world-class—exceeding 5.5 kWh/m²/day. The crisis is not lack of heat; it is that our shelters cannot hold it.  
> Let us show you what actually happens inside."

---

### Beat 1: The Failure (00:10 – 00:25 · 15 seconds)
**Speaker**: **Swapnil**  
**Action on Screen (Vedesh)**:
1. Switch to the interactive simulator.
2. Ensure location is **Leh (3,500 m)**.
3. Toggle date mode to **"Design Winter Night"** (15 January, ambient drops to $-22 \text{ °C}$).
4. Click **"Run Simulation"**.

> **Swapnil (Pointing at the collapsing blue curve on the chart)**:  
> "This is a standard military prefab corrugated-iron shelter on a design winter night in Leh.  
> Notice that by midnight, indoor temperature drops below zero.  
> By 04:00 AM, the indoor temperature collapses to **−18.0 °C**—spending 18 out of 24 hours in the acute danger zone.  
> This satisfies **Requirement 1 of the Problem Statement: predicting indoor temperature profile.**  
> This extreme collapse is why soldiers must risk kerosene bukharis and silent asphyxiation to survive the night."

---

### Beat 2: The Constraint (00:25 – 00:35 · 10 seconds)
**Speaker**: **Vedesh**  
**Action on Screen (Vedesh)**:
1. Navigate to the **Optimization** tab.
2. Check the toggle: **"Locally Available Materials Only"** (filters out aerogels/imported PIR, locks to mud brick, stone, timber, EPS).

> **Vedesh**:  
> "A design tool is useless if it recommends aerogels or carbon fiber that cannot climb the Zoji La pass.  
> We enforce a hard constraint: **strictly locally available materials in Leh**.  
> The algorithm will explore mud brick, rammed earth, local stone, and standard thermal shutters."

---

### Beat 3: The Search — The Theatrical Moment (00:35 – 00:50 · 15 seconds)
**Speaker**: **Vedesh & Surbhi**  
**Action on Screen (Vedesh)**:
1. Click the glowing **"Run Multi-Objective Optimization"** button.
2. Keep hands off the keyboard while the loading animation runs.

> **Vedesh (Narrating the compute live)**:  
> "Three thousand two hundred design permutations.  
> Twenty-four hours of dynamic conduction, solar angles, and sky radiation evaluated for each in lockstep...  
> *(Results populate on screen)*  
> ...Evaluated in **5.6 seconds** entirely on our local solver."

---

### Beat 4: The Fix (00:50 – 01:00 · 10 seconds)
**Speaker**: **Swapnil**  
**Action on Screen (Vedesh)**: Click **Rank #1 Design** to highlight its overnight temperature curve.

> **Swapnil (Pointing to the steady green curve holding above +17 °C)**:  
> "Look at the new curve.  
> Outside, it is −22 °C at dawn. Inside, this shelter holds **+17.2 °C continuously till sunrise**.  
> Zero kerosene burned. Zero electricity required.  
> This fulfills **Requirement 2: maximizing passive solar thermal gain and retention**."

---

### Beat 5: The Reasoning (01:00 – 01:15 · 15 seconds)
**Speaker**: **Vedesh**  
**Action on Screen (Vedesh)**:
1. Scroll down to the **"Why This Won"** mechanical breakdown card.
2. Hover over the **Heat Flow Across $\Delta T$** breakdown graph.

> **Vedesh**:  
> "Here is why our engine picked this design over 3,199 others.  
> Adding insulated night shutters gave **+6.1 °C** for just ₹500 per window.  
> In contrast, adding another 100 mm of stone wall gave only **+0.4 °C**, cost ₹38,000, and added 12 tonnes of dead airlift weight.  
> And this hourly chart directly shows **heat flow across the temperature difference $\Delta T$**—fulfilling **Requirement 3 of the Problem Statement**."

---

### Beat 6: The Proof (01:15 – 01:25 · 10 seconds)
**Speaker**: **Aman**  
**Action on Screen (Vedesh)**: Click on the **Validation Panel** modal or tab.

> **Aman (Pointing to the 3 empirical data points on the validation chart)**:  
> "We did not validate against another computer model.  
> We calibrated and validated our engine against published empirical field data from **DRDO's Defence Institute of High Altitude Research (DIHAR) in Leh**.  
> Across their published Leh pilot shelter, monitored Trombe wall, and direct-gain test rooms, our model matches real-world measurements within an average delta of 1.2 °C and perfectly reproduces observed thermal rankings."

---

### Beat 7: The Leave-Behind & Generalization (01:25 – 01:30 · 5 seconds)
**Speaker**: **Vritika & Surbhi**  
**Action on Screen (Vedesh)**: Click **"Copy Military Specification"** button and show the copied clipboard toast.

> **Vritika**:  
> "One shelter saves **1,180 litres of kerosene** and ₹28 lakh every year. Full capital payback in 2.4 years."  
> 
> **Surbhi (Clean, strong closing line)**:  
> "And the exact same engine generalizes to other climates—such as temporary straw and tarpaulin shelters for the recent Nepal earthquake relief.  
> THERMA turns thermal physics into instant logistics decisions. Thank you."

---

## Contingency & Cut Rules (In Case Evaluators Interrupt or Time is Cut)

| Situation | Action to Take Immediately |
|---|---|
| **Evaluator interrupts at Beat 1** | Stop narration immediately. Swapnil answers physics question in 2 sentences, then Vedesh immediately hits "Optimize" to regain visual control. |
| **Only 45 seconds allowed** | Skip Beat 2 and Beat 5. Go: Beat 0 (Logistics) $\rightarrow$ Beat 1 (Collapse) $\rightarrow$ Beat 3/4 (Hit Optimize, show +17 °C hold) $\rightarrow$ Beat 6 (DIHAR proof). |
| **Evaluator asks about safety** | Type ACH = 0.2 with unflued heater; point to the instant red **RefusalCard** blocking the simulation due to CO asphyxiation risk. |
| **Evaluator challenges cost numbers** | Vritika cites IDSA Siachen logistics flight logs: ₹2,400/L represents Mi-17/Cheetah rotor-hour operating costs at 5,000+ m altitude. |
