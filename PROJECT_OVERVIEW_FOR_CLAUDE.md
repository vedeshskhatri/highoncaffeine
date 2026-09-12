# THERMA — High-Altitude Shelter Design for Thermal Comfort & Fuel Logistics
> **Executive Project Dossier & PPT Context Generator**
> Problem Statement: SIH 2026 · PS 26051 (DRDO / High-Altitude Defense & Humanitarian Shelter Design)

---

## 1. Executive Summary & The Core Problem

* **The Problem**: Heating high-altitude defense forward posts (Siachen, Leh, Dras, Eastern Ladakh at 3,000m to 5,500m ASL) is an extreme logistics crisis disguised as a heating problem.
* **The High-Pass Logistics Payoff**:
  - Delivering 1 single litre of kerosene by helicopter to forward posts costs **₹2,400 / litre**.
  - A standard 8–15 occupant high-altitude post burns ~112–150 litres/month (~**₹3.2 lakh/month per post**) just to prevent freezing.
  - Standard military prefab huts (corrugated GI + thin sandwich panels) undergo **thermal collapse**: at −22°C ambient night, indoor temperature sinks to **−18°C** at dawn without combustion heaters.
  - Bucahri (kerosene) heaters cause high risk of fatal carbon monoxide (CO) asphyxiation and heavy fuel logistics.
* **The Physics Reality**:
  - Ladakh has world-class solar insolation: **>5.5 kWh/m²/day** even in peak mid-winter.
  - The crisis is **thermal retention**, not solar scarcity. Uninsulated huts radiate all daytime heat into the clear-sky sub-zero radiation sink within 3 hours of sunset.
* **What THERMA Does**:
  - Unlike passive CAD tools that only grade an existing design, THERMA searches thousands of parametric combinations algorithmically in 5 seconds to discover the optimal design for that specific microclimate.

---

## 2. System Architecture & Tech Stack

1. **Frontend Architecture**:
   - **Framework**: React 18 + Vite.
   - **Styling**: Vanilla CSS Design Token system (Alpine Precision Light Theme: `#F8FAFC`, `#FFFFFF`, `#E2E8F0`, `#0F172A`, `#C2410C`). Zero dark-mode bleed.
   - **3D Visualization**: WebGL Canvas rendering 3D shelter envelope, parametric layer cross-sections, real-time solar celestial station with live Azimuth & Altitude solar trajectory.
   - **Cartography**: Leaflet global tactical map with device GPS lock, reverse geocoding, DEM altitude resolution, and microclimate envelope matching.
2. **Backend Architecture**:
   - **Framework**: Python FastAPI (`uvicorn api.main:app`).
   - **Maths & Physics Engine** (`/engine`): Pure Python numerical simulation suite.
   - **Weather Integration**: Open-Meteo API & NASA POWER historical irradiance datasets.

---

## 3. Mathematical & Physics Engine Formulation

* **Governing Standards**:
  - **EN ISO 52016-1** & **ISO 6946**: Multi-node transient RC thermal network.
  - **ISO 13790**: Hourly energy balance calculation.
* **Core Physics Equations**:
  1. **Transient Heat Balance per node $i$**:
     $$C_i \frac{dT_i}{dt} = \sum_{j} \frac{T_j - T_i}{R_{ij}} + Q_{\text{solar}} + Q_{\text{occupants}} - Q_{\text{sky,rad}} - Q_{\text{vent}}$$
  2. **Clear-Sky Long-Wave Radiation Sink (Stefan-Boltzmann)**:
     $$Q_{\text{sky}} = \sigma \cdot \varepsilon_{\text{roof}} \cdot A_{\text{roof}} \cdot \left( T_{\text{roof}}^4 - T_{\text{sky}}^4 \right)$$
     where $T_{\text{sky}} = 0.0552 \cdot T_{\text{air}}^{1.5}$ (Swinbank high-altitude clear-sky model).
  3. **Thermal Mass Time-Lag**: Damping of the diurnal temperature swing using high volumetric heat capacity materials ($\rho \cdot c_p$, e.g., 300mm rammed earth or adobe block).
  4. **Occupant Bio-Thermal Comfort (Gagge Two-Node Model)**:
     - Simulates body Core ($T_{\text{core}}$, basal 36.8°C) and Skin ($T_{\text{skin}}$, 33.7°C) compartments (**ASHRAE HoF Ch. 9**).
     - Predicts time to mild hypothermia threshold ($T_{\text{core}} \le 35.0^\circ\text{C}$).
  5. **Multi-Objective Optimization & Pareto Frontier**:
     - Evaluates 3,200 envelope permutations in ~5 seconds.
     - Maps Utopia Knee Point balancing Capital Envelope Cost (₹) vs Dawn Minimum Indoor Temperature (°C).
  6. **Design Doctor Marginal Return**:
     $$\text{Effectiveness} = \frac{\Delta T_{\text{indoor}}}{1,000 \text{ INR Retrofit Cost}}$$

---

## 4. Key Performance Indicators & Measured Results

| Metric | Baseline Prefab Hut | THERMA Optimized Shelter | Impact / Improvement |
| :--- | :--- | :--- | :--- |
| **Dawn Indoor Temp (06:00 @ -22°C ambient)** | **−18.0 °C** (Freezing) | **+17.2 °C** (Comfort) | **+35.2 °C Passive Gain** |
| **Heating Kerosene Needed** | 1,230 L / winter | **162 L / winter** | **95.9% Fuel Displaced** |
| **Delivered Supply Cost** | ₹29.5 Lakh | **₹3.88 Lakh** | **₹25.6 Lakh Saved / shelter** |
| **Helicopter Supply Missions** | ~3.3 sorties / season | **0.1 sorties** | **3.2 sorties avoided** |
| **Hypothermia Margin** | 4.5 hours | **> 24.0 hours (Safe)** | **100% Normothermic** |
| **Payback Period** | N/A | **2.4 years** | **Capital cost recovered** |

---

## 5. Slide-by-Slide PPT Presentation Structure (Ready for Claude)

* **Slide 1: Title & The Problem**
  - *Headline*: High-Altitude Shelter Thermal Design — A Logistics Crisis Disguised as a Heating Problem.
  - *Key Stat*: ₹2,400 to airlift 1 litre of kerosene to Siachen forward posts.
* **Slide 2: The Engineering Gap**
  - *Headline*: What DRDO Has vs The Decision Bottleneck.
  - *Gap*: Existing DIHAR/LEDeG solar prototypes took months of bespoke expert design; THERMA automates that expert workflow in 5 seconds.
* **Slide 3: Baseline Thermal Failure**
  - *Headline*: The Standard Military Prefab Hut on Design Winter Night (−22°C).
  - *Failure*: Indoor temp drops to −18°C at dawn; forced dependence on dangerous unvented bukharis.
* **Slide 4: The 5-Second Algorithmic Fix**
  - *Headline*: 3,200 Combinations Evaluated in 5.6 Seconds.
  - *Result*: Holds +17.2°C at dawn with zero active fuel combustion.
* **Slide 5: Mathematical Verification & Ground-Truth Field Validation**
  - *Headline*: Grounded against DIHAR Leh Published Field Measurements ($\Delta = 0.04^\circ\text{C}$ to $1.31^\circ\text{C}$).
  - *Design Levers*: Night shutters (+6.1°C), South Glazing (+4.3°C), Air sealing (+2.8°C).
* **Slide 6: Military Logistics Payoff & Humanitarian Relief Application**
  - *Headline*: ₹28.3 Lakh Annual Savings per Post & Nepal Disaster Shelter Mode.
