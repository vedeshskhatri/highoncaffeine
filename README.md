# THERMA — Area-Specific Shelter Design for Thermal Comfort Maintenance
### Smart India Hackathon 2026 · Problem Statement PS 26051 · Ministry of Defence / DRDO
#### Grand Finale Submission · High-Altitude Passive Solar Shelter Engineering & Tactical C2 Decision-Support Platform

[![SIH 2026](https://img.shields.io/badge/SIH-2026%20Grand%20Finale-orange.svg?style=flat-square)](https://sih.gov.in)
[![DRDO PS 26051](https://img.shields.io/badge/DRDO-PS%2026051-blue.svg?style=flat-square)](https://drdo.gov.in)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue.svg?style=flat-square)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?style=flat-square)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF.svg?style=flat-square)](https://vitejs.dev)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-black.svg?style=flat-square)](https://threejs.org)
[![Scientific ML](https://img.shields.io/badge/Scientific%20ML-5%20Surrogates%20(R%C2%B2%3D0.968)-purple.svg?style=flat-square)](#5-scientific-ml-surrogate-engine--benchmarks)
[![Pytest Tests](https://img.shields.io/badge/Pytest-195%2F195%20Passing-brightgreen.svg?style=flat-square)](#20-automated-test-suite--system-verification)
[![Frontend Tests](https://img.shields.io/badge/Frontend-84%2F84%20Passing-brightgreen.svg?style=flat-square)](#20-automated-test-suite--system-verification)
[![100% Offline](https://img.shields.io/badge/Offline-100%25%20Air--Gapped%20Ready-success.svg?style=flat-square)](#17-security-privacy--air-gapped-defense-isolation)
[![Strict Physics Balance](https://img.shields.io/badge/%CE%A3Qin-%E2%89%A1%20%CE%94E%20%2B%20%CE%A3Qout-brightgreen.svg?style=flat-square)](#1-executive-summary--operational-context)

> *"Other software grades a design you already picked. THERMA searches thousands of options across 39 defense outposts in seconds, selects the optimal passive envelope, provides instant sub-10ms scientific ML predictions, and demonstrates its mathematical working with zero hallucination."*

---

![THERMA High Altitude Passive Solar Engineering Platform](./docs/assets/therma_hero_banner.jpg)

---

# 🏛️ System Architecture

![THERMA System Architecture](./docs/assets/system_architecture.svg)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TACTICAL CLIENT PRESENTATION LAYER                               │
│                         React 18.3 · Vite 6.1 · TailwindCSS 3.4 · Three.js WebGL                 │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ 17 OPERATIONAL PLATFORM VIEWS  │ INTERACTIVE 3D WEBGL STUDIO    │ VOICE DIAGNOSTIC ORB           │
│ • Tactical C2 Dashboard        │ • Procedural Himalayan terrain │ • Web Speech API recognition   │
│ • 39 Defense Outpost Network   │ • Dynamic shelter peel cutaway │ • Hands-free field inquiry     │
│ • Architectural Design Studio  │ • Solar shadow projection      │ • Grounded physics synthesis   │
│ • Scientific ML Predictor      │ • Dynamic wall cross-section   │ • Zero cloud API dependency    │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
                                                 │
                                 HTTP REST / JSON (:8000 / :5173)
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               FASTAPI REST ORCHESTRATION GATEWAY                                 │
│                   FastAPI 0.110 · Uvicorn ASGI · Pydantic v2 · Frozen API Contracts             │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ CORE SIMULATION & PREDICTION   │ MULTI-CRITERIA DECISION (MCDA) │ LOGISTICS & KNOWLEDGE          │
│ • POST /simulate               │ • POST /optimize (Pareto N≥3.2k)│ • GET  /sites (39 Outposts)    │
│ • POST /ml/predict (Sub-10ms)  │ • POST /retrofit (Design Doctor)│ • POST /cpwd/chat (Ollama RAG) │
│ • POST /what-if (24-hr Delta)  │ • POST /compare (Utopia Knee)  │ • POST /reports/dossier (BOQ)  │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
                                                 │
                                   In-Process Direct Python Calls
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             AUTHORITATIVE COMPUTATIONAL CORE ENGINES                             │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ 1. DETERMINISTIC 1D RC SOLVER  │ 2. SCIENTIFIC ML SURROGATES    │ 3. MULTI-OBJECTIVE MCDA        │
│ • EN ISO 52016-1 discretization│ • 5 Model Ensemble (R²=0.968)  │ • Vectorized Pareto frontier   │
│ • Fourier stability Fo ≤ 0.25  │ • 120,000 timestep dataset     │ • Normalized Utopia distance Di│
│ • Barometric density scaling   │ • 40,000x faster than E+       │ • Morris sensitivity (r=20)    │
│ • Swinbank nocturnal sky sink  │ • Multi-target heat flux watts │ • Asphyxiation safety lock     │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
                                                 │
                                     ACID Relational Persistence
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                LOCAL DATA & PROVENANCE STORAGE                                   │
│  SQLite 3 (therma.db) · materials.csv (CPWD DSR 2023) · NASA POWER Cache · FTS5 Index            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

<details open>
<summary><b>🔍 View Full Component Flowchart (Mermaid)</b></summary>

```mermaid
flowchart TD
    subgraph Client ["Tactical Client Presentation Layer (React 18 + Vite :5173)"]
        UI[Interactive UI Studio & Design Editor]
        ORB[Voice Diagnostic Orb & AI Assistant]
        CS[Dynamic Cross-Section SVG & Heat Flux Vectors]
        CH[Recharts 24-hr Diurnal Temperature Engine]
        TH[Three.js 3D WebGL Himalayan Shelter Canvas]
        MAP[Tactical Geospatial World & 3D Globe Map]
        EXP[Engineering Spec Sheet & BOQ Dossier Export]
    end

    subgraph API ["REST Routing & Orchestration Gateway (FastAPI :8000)"]
        RT_SIM["POST /simulate"]
        RT_ML["POST /ml/predict"]
        RT_OPT["POST /optimize"]
        RT_SENS["POST /sensitivity"]
        RT_WIF["POST /what-if"]
        RT_CMP["POST /compare"]
        RT_RET["POST /retrofit"]
        RT_CPWD["POST /cpwd/chat & /dossier"]
        RT_SITES["GET/POST /sites"]
        VAL_GATE["Pydantic Validation & Safety Interlocks"]
    end

    subgraph CoreEngine ["Authoritative Physics Core (Python)"]
        RC[1D Multi-Node RC Heat Diffusion Solver]
        SOLAR[Perez High-Altitude Solar Radiation Engine]
        SKY[Swinbank Linearized Long-Wave Sky Radiation]
        INF[Altitude-Corrected Barometric Infiltration]
        LHS[Vectorized Latin Hypercube Batch Evaluator]
        PARETO[Non-Dominated Sorting Pareto Extractor]
        MORRIS[Morris Elementary Effects Screener]
        DIAG[Thermal Diagnosis & Bottleneck Attribution]
        SAFE[Safety Interlock & Asphyxiation Prevention]
    end

    subgraph MLCore ["Scientific Machine Learning Surrogate Core"]
        SURR_T[HistGBDT Indoor Temperature Predictor R²=0.968]
        SURR_FLUX[MultiOutputRegressor Heat Loss Flux Watts]
        SURR_COMF[Operative Comfort Hours Predictor]
        SURR_SAFE[Deterministic Safety Classifier]
        SURR_DIAG[Argmax Heat Flux Bottleneck Classifier]
    end

    subgraph ValidationBench ["Empirical Validation & Numerical Grounding"]
        EMP[DRDO-DIHAR Leh Empirical Field Datasets V1-V4]
        ANSYS[ANSYS Mechanical Reference Cases 1-3 Harness]
        SANITY[10/10 Inviolable Physical Conservation Tests]
    end

    subgraph Storage ["Local Storage & Provenance Layer"]
        DB[(SQLite therma.db Relational Store)]
        MAT[(materials.csv with CPWD DSR 2023 Citations)]
        WEATH[(NASA POWER & Synthetic Winter Night Cache)]
        CPWD_FTS[(CPWD DSR/DAR FTS5 & Vector Store)]
    end

    UI -->|JSON Config| API
    ORB -->|Voice Query| API
    API --> VAL_GATE
    VAL_GATE --> CoreEngine
    VAL_GATE --> MLCore
    CoreEngine --> RC
    RC --> SOLAR
    RC --> SKY
    RC --> INF
    CoreEngine --> LHS
    LHS --> PARETO
    CoreEngine --> MORRIS
    CoreEngine --> DIAG
    CoreEngine --> SAFE
    CoreEngine <--> Storage
    CoreEngine <--> ValidationBench
    MLCore <--> Storage
    CoreEngine -->|Authoritative Results| API
    MLCore -->|Sub-10ms Inference| API
    API -->|Strict JSON Contract| Client
    Client --> CS
    Client --> CH
    Client --> TH
    Client --> MAP
    Client --> EXP
```
</details>

---

## 📑 Table of Contents

1. [Executive Summary & Operational Context](#1-executive-summary--operational-context)
2. [Problem Statement (PS 26051 · DRDO)](#2-problem-statement-ps-26051--drdo)
3. [The Complete Solution: THERMA Platform](#3-the-complete-solution-therma-platform)
4. [Complete 17-View Tactical Platform Tour](#4-complete-17-view-tactical-platform-tour)
5. [Scientific ML Surrogate Engine & Benchmarks](#5-scientific-ml-surrogate-engine--benchmarks)
6. [3D WebGL Studio & Dynamic Spatial Graphics](#6-3d-webgl-studio--dynamic-spatial-graphics)
7. [Voice Diagnostic Orb & Tactical AI Assistant](#7-voice-diagnostic-orb--tactical-ai-assistant)
8. [Local CPWD AI Knowledge & Procurement Engine](#8-local-cpwd-ai-knowledge--procurement-engine)
9. [Governing Mathematical Formulations & Calculations](#9-governing-mathematical-formulations--calculations)
10. [1D Multi-Node RC Transient Heat Transfer Solver](#10-1d-multi-node-rc-transient-heat-transfer-solver)
11. [Solar Geometry & Perez High-Altitude Radiation](#11-solar-geometry--perez-high-altitude-radiation)
12. [Rarefied Atmosphere, Sky Sink & Infiltration](#12-rarefied-atmosphere-sky-sink--infiltration)
13. [Thermal Diagnosis & 100% Conservation Attribution](#13-thermal-diagnosis--100-conservation-attribution)
14. [Vectorized Multi-Objective Pareto Optimization Engine](#14-vectorized-multi-objective-pareto-optimization-engine)
15. [7-Stage Design Doctor & Retrofit Ranking](#15-7-stage-design-doctor--retrofit-ranking)
16. [Combustion Safety Interlock & CO Asphyxiation Prevention](#16-combustion-safety-interlock--co-asphyxiation-prevention)
17. [Security, Privacy & Air-Gapped Defense Isolation](#17-security-privacy--air-gapped-defense-isolation)
18. [Siachen Helicopter Logistics & Kerosene Economics](#18-siachen-helicopter-logistics--kerosene-economics)
19. [Field Trial Empirical Validation Suite & ANSYS Reference](#19-field-trial-empirical-validation-suite--ansys-reference)
20. [Automated Test Suite & System Verification](#20-automated-test-suite--system-verification)
21. [RESTful API Architecture & Frozen Contracts](#21-restful-api-architecture--frozen-contracts)
22. [Project Directory Topology](#22-project-directory-topology)
23. [Installation, Setup & Verification Guide](#23-installation-setup--verification-guide)
24. [Live Hackathon Judging Walkthrough (90s Speedrun & 5m Deep Dive)](#24-live-hackathon-judging-walkthrough-90s-speedrun--5m-deep-dive)
25. [Official Presentation Slides & Downloadable Artifacts](#25-official-presentation-slides--downloadable-artifacts)

---

# 1. Executive Summary & Operational Context

**THERMA** is an area-specific shelter thermal design and tactical decision-support software platform engineered specifically for the extreme high-altitude microclimates of the Indian Himalayas (Ladakh, Siachen, Galwan, Dras, Kargil, and Arunachal Pradesh).

High-altitude military outposts face an extraordinary physical paradox:
- **Solar Abundance During Daylight:** Ladakh receives **1,900 to 2,100 kWh/m²/year** of horizontal solar irradiance with **~7.9 hours of daily sunshine** across **300+ cloud-free days**. During the day, raw solar radiation is plentiful.
- **Catastrophic Nighttime Thermal Collapse:** After sunset, ambient temperatures plunge to **−20 °C to −40 °C**. The ultra-thin, low-humidity atmosphere acts as a blackbody radiative sink, draining thermal energy through roofs and uninsulated corrugated-iron walls. By 04:00 AM, indoor temperatures in standard shelters collapse to **−18 °C**.

### The Logistics Crisis
This is not an energy generation failure; it is a **building physics and thermal storage failure**. To prevent soldiers from freezing to death, the Indian Armed Forces rely on unvented kerosene *bukharis* (stoves). Kerosene must be transported to forward posts by rotary-wing aircraft (HAL Dhruv, Cheetah, Mi-17) or arduous mountain convoys crossing avalanche-prone passes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SIACHEN FUEL LOGISTICS IN NUMBERS                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Airlift Cost per Litre of Kerosene  :  ₹2,400 / L                          │
│  Monthly Consumption (15-Man Post)   :  112 L / month                       │
│  Monthly Fuel Expense per Post       :  ₹3,20,000 / month                   │
│  Annual Fuel Expense per Post        :  ₹32,40,000 / year                   │
│  Across ~150 Active Forward Posts    :  > 2,02,500 L/yr (> ₹48.6 Crore/yr)  │
│  Daily Thermal Energy per Soldier    :  4 to 5 kWh / day (heating alone)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **The Inviolable Core Thermodynamic Principle:**  
> $$\sum Q_{\text{in}} \equiv \Delta E_{\text{stored}} + \sum Q_{\text{out}}$$  
> Every thermal event in THERMA obeys first-principles thermodynamics. Heat cannot appear or disappear. Conduction, convection, radiation, and infiltration are evaluated through an exact thermal capacitance network down to the watt-hour. No numbers are invented; no outputs are faked.

---

# 2. Problem Statement (PS 26051 · DRDO)

**Problem Code:** PS 26051  
**Organization:** Defence Research and Development Organisation (DRDO)  
**Title:** Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance

| PS Requirement | Technical Challenge | THERMA Engineering Implementation |
|:---|:---|:---|
| **Req 1: Predict Indoor Temperature Profile** | High thermal mass phase lag, sub-zero ambient swings, dynamic diurnal solar variations. | Multi-node 1D transient RC diffusion solver calculating hourly indoor air ($T_{\text{in}}$), mean radiant ($T_{\text{mrt}}$), and operative ($T_{\text{op}}$) temperatures over 24-hour horizons. |
| **Req 2: Maximize Passive Solar Gain & Retention** | Low winter solar elevation, extreme night heat loss through glazing, frost and snow cover. | High-accuracy Perez anisotropic sky diffuse model, direct beam incidence angle clamping, ground snow albedo reflections ($\rho=0.75$), and automated insulating night shutters. |
| **Req 3: Heat Flow Across $\Delta T$ (Indoor − Ambient)** | Multi-path conductive, convective, and radiative heat exchange across extreme temperature gradients ($>40\text{ K}$). | Dedicated real-time computation of directional heat flux vectors ($\text{W/m}^2$) across walls, roof, glazing, infiltration, and sky radiation driven by $(T_{\text{in}} - T_{\text{out}})$. |
| **Req 4: Most Efficient Material & Geometry Combination** | Combinatorial explosion of wall layers, insulation thickness, glazing apertures, and orientations. | Vectorized Latin Hypercube multi-objective Pareto optimizer searching $\ge 3,200$ permutations in $<8$ seconds to pinpoint the optimal thermal comfort vs. capital cost knee point. |

---

# 3. The Complete Solution: THERMA Platform

THERMA converts complex building physics into automated, explainable military logistics decisions:

![THERMA 14-Step Physics & Decision-Support Pipeline](./docs/assets/pipeline_flowchart.svg)

1. **Precision First-Principles Physics:** Solves Fourier transient diffusion across layered walls, ground heat transfer, Perez solar gains, and sky radiation without heuristic shortcuts.
2. **Scientific Machine Learning Surrogates:** 5 trained models ($R^2=0.968$) providing sub-10ms thermal inference, $40,000\times$ faster than legacy building tools.
3. **Multi-Objective Pareto Decision-Support:** Vectorized Latin Hypercube exploration isolating non-dominated trade-offs between capital investment and troop comfort.
4. **Clinical 7-Stage Design Doctor:** Evaluates existing substandard shelters and prescribes ranked interventions sorted by $^\circ\text{C}$ gained per ₹1,000.
5. **Zero-Hallucination Life Safety Guard:** Deterministic interlocks preventing carbon monoxide asphyxiation by refusing over-sealed combustion heater configurations.
6. **Tactical Military C2 Suite:** 17 integrated platform views, 3D WebGL Himalayan shelter inspection, voice diagnostic orb, and CPWD DSR/DAR procurement dossiers.

---

# 4. Complete 17-View Tactical Platform Tour

THERMA provides an exhaustive, specialized military and civilian decision platform:

| Screen View | Route URL | Purpose & Primary Capabilities | Key Technologies Used |
|:---|:---|:---|:---|
| **1. Landing Hub** | `/` | Immersive public hero, system metrics, live counter animations, architecture preview. | Three.js Solar Sky, CSS Tokens, React Router |
| **2. Tactical C2 Dashboard** | `/dashboard` | Operational readiness overview, 39 forward posts monitoring, cold-alert sorting. | Recharts, Lucide Icons, Status Badges |
| **3. Defense Estate Platform** | `/sites` | Portfolio view of 39 military outposts (Siachen, DBO, Galwan, Dras, Chushul, etc.). | Filter Grid, Dynamic Search, Altitude Scaling |
| **4. Outpost Command Hub** | `/sites/:id` | Deep dive into single post: microclimate, active envelope, past runs, retrofit logs. | Time-series charts, Outpost Geo Intel |
| **5. Architectural Studio** | `/design` | 4-step CAD-style envelope authoring: walls, roofs, solar glazing, air exchange, heating. | Dynamic SVG Cross-Section, Three.js 3D |
| **6. Simulation Canvas** | `/design?step=simulate` | Authoritative 24-hr diurnal simulation, WHO $18^\circ\text{C}$ comfort band, heat flux breakdown. | Multi-Node RC Core, Recharts Diurnal Plot |
| **7. Multi-Objective Optimizer**| `/design?step=optimize` | 3,200 Latin Hypercube sample scatter, non-dominated Pareto frontier, top 3 designs. | Vectorized NumPy Core, Pareto Scatter |
| **8. Forecast Watch** | `/design?step=watch` | 7-day microclimate risk tracking, dawn freezing threshold breach predictions. | NASA POWER Cache, Extreme Night Model |
| **9. Design Doctor (Retrofit)** | `/design` (Panel) | 7-stage clinical intervention ranking upgrades by $^\circ\text{C}$ gained per ₹1,000 spent. | Cost-Efficiency Formula, Budget Bounds |
| **10. Scientific ML Predictor** | `/ml-predictor` | Real-time multi-slider parameter exploration with sub-10ms neural/tree surrogate inference.| 5 Model Ensemble, HistGBDT, MultiOutput |
| **11. Local CPWD AI Assistant** | `/cpwd` | Grounded DSR/DAR cost assistant, vector + FTS5 retrieval, exact page citations. | Ollama Llama-3.2, Nomic Embeddings |
| **12. Procurement Dossier** | `/reports` | MES specification sheet, Bill of Quantities (BOQ), CPWD DSR code export. | Markdown Exporter, PDF Generator |
| **13. Defence Programme Rollout**| `/programme` | Multi-phase construction schedule, budget allocation, logistics prioritization. | Gantt Timeline, Sortie Allocator |
| **14. Severe Cold & Safety Alerts**| `/alerts` | Real-time hypothermia and CO asphyxiation warnings with escalation protocols. | Threat Matrix, Acknowledgment Engine |
| **15. Shelter Archetype Library**| `/library` | Pre-engineered military shelter archetypes (FRP, CGI Bunkhouse, Rammed Earth). | Comparative Spec Cards, Baseline Tags |
| **16. Diurnal Weather Forecast** | `/forecast` | High-altitude diurnal temperatures, solar irradiation, barometric density curves. | Perez Decomposition, Diurnal Curves |
| **17. Materials Master Catalog** | `/materials` | 102 envelope materials with verified $k, \rho, c_p$, solar $\alpha$, and CPWD cost basis. | CPWD DSR 2023 DB, Filter Taxonomy |
| **18. Physics Methodology** | `/method` | Mathematical formulations, RC discretization proof, Swinbank clear-sky formulas. | LaTeX Mathtext, Governing Equations |
| **19. Empirical Validation Bench**| `/validation` | DRDO-DIHAR Leh field trial comparison (V1–V4), ANSYS Mechanical reference track. | Gate 3 Harness, Pass/Fail Indicators |
| **20. System Verification Suite** | `/verify` | Automated test runner displaying live pass/fail counts for 195 backend & 84 frontend tests.| Pytest Telemetry, Jest Output |
| **21. Voice Diagnostic Orb** | Universal Modal | Hands-free voice recognition and speech synthesis for field engineers. | Web Speech API, Local AI Integration |
| **22. Tactical Command Palette** | `Ctrl/Cmd + K` | Fast keyboard shortcut navigation across all 17 platform views and site presets. | Fuzzy Match Index, Keyboard Handler |

---

# 5. Scientific ML Surrogate Engine & Benchmarks

To eliminate the 30-minute simulation lag associated with legacy building energy tools (e.g. EnergyPlus), THERMA features a **Scientific Machine Learning Surrogate Core** trained on a 120,000-timestep physics-grounded master dataset:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCIENTIFIC ML SURROGATE BENCHMARKS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Dataset Dimension         : 120,000 Timesteps across 39 Defense Outposts   │
│  Physics Sampling Space    : Latin Hypercube (Orientation, Mass, Glazing)   │
│  Inference Latency         : 8.2 milliseconds per design (Sub-10ms)        │
│  Speedup vs EnergyPlus     : > 40,000x Speedup                              │
│  Temperature R² Score      : 0.968 (Mean Absolute Error < 0.8 °C)           │
│  Multi-Target Flux R²      : 0.962 (Walls, Roof, Glazing, Infiltration, Sky)│
│  Operative Comfort R²      : 0.974 (Hours within 18 °C - 27 °C band)        │
│  Safety Classification     : 100.0% Precision / Recall on Combustion Locks │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5 Surrogate Model Ensemble (`ml/training/`)
1. `model_temperature.pkl` — **HistGradientBoostingRegressor:** Predicts 24-hour minimum, maximum, and mean indoor air temperatures ($T_{in,min}, T_{in,max}, T_{in,mean}$).
2. `model_heat_loss.pkl` — **MultiOutputRegressor:** Simultaneously outputs continuous directional heat loss flux watts for walls, roof, glazing, infiltration, and sky radiation.
3. `model_comfort.pkl` — **RandomForestRegressor:** Predicts operative comfort hours meeting ASHRAE/WHO standards ($18^\circ\text{C} \le T_{op} \le 27^\circ\text{C}$).
4. `model_safety.pkl` — **Deterministic Safety Classifier:** Flags dangerous combustion and ventilation pairings ($ACH < 0.35$).
5. `model_diagnosis.pkl` — **Argmax Flux Classifier:** Instantly pinpoints the dominant heat loss bottleneck ($k^* = \operatorname{argmax}_k P_k$).

---

# 6. 3D WebGL Studio & Dynamic Spatial Graphics

THERMA integrates cutting-edge WebGL visualization built on **Three.js 0.185**:

- **Procedural Himalayan Terrain:** Custom WebGL vertex shader generating snow-covered Himalayan ridgelines and realistic atmospheric haze matching the outpost altitude.
- **Interactive Envelope Peel Cutaway:** Multi-stage inspection allowing military engineers to "peel" outer protective cladding, reveal expanded polystyrene (EPS) insulation cores, and inspect interior structural masonry layers.
- **Dynamic Solar Shadow Projection:** Simulates real-time sun angles based on Julian date and solar hour, casting accurate geometric shadows across surrounding terrain.
- **Dynamic SVG Cross-Section:** Live vector rendering of wall layers with proportional millimeter thicknesses, temperature gradient isotherms, and animated directional heat flux arrows.

---

# 7. Voice Diagnostic Orb & Tactical AI Assistant

Field engineers operating in freezing conditions often wear heavy arctic mittens that make keyboard typing difficult. THERMA incorporates a **Voice-Powered AI Diagnostic Orb**:

- **Hands-Free Field Inquiry:** Uses native Web Speech API recognition to transcribe spoken engineering queries (e.g. *"What is the dawn temperature at Daulat Beg Oldie with 150mm EPS?"*).
- **Grounded Physics Synthesis:** Synthesizes clear verbal and textual responses powered by local Ollama (Llama-3.2) or fast heuristic fallbacks, strictly grounded in simulation results.
- **Speech Synthesis (TTS):** Speaks answers back to the operator with clear audio articulation.
- **Zero Cloud Leakage:** Audio processing and text inference operate 100% locally on the device.

---

# 8. Local CPWD AI Knowledge & Procurement Engine

THERMA incorporates a complete offline **CPWD Delhi Schedule of Rates (DSR), Analysis of Rates (DAR), and Specifications Knowledge System**:

- **Multi-Year Document Corpus:** Indexes CPWD DSR 2016, 2018, 2020, and 2025 schedules.
- **Hybrid Retrieval Architecture:** Combines SQLite FTS5 BM25 full-text search with local Nomic vector embeddings for semantic query matching.
- **Exact Page Citations:** Every retrieved rate displays official CPWD item numbers, sub-heads, specifications, and volume/page citations.
- **Deterministic Rate Arithmetic:** Material quantities, unit rates, and carriage surcharges are computed in pure Python code with zero LLM math hallucination.
- **Automated Military Procurement Dossier:** Generates complete MES-compliant Bill of Quantities (BOQ) with official item descriptions ready for tendering.

---

# 9. Governing Mathematical Formulations & Calculations

All calculations in THERMA strictly follow authoritative physics and engineering literature (ASHRAE, EN ISO 52016-1, Duffie & Beckman, Swinbank, and DRDO standards):

![Complete Technical Approach & Mathematics Board](./docs/presentation_assets/technical_approach_slide_3.png)

---

# 10. 1D Multi-Node RC Transient Heat Transfer Solver

The thermal core models dynamic heat diffusion through multi-layered building envelopes using a multi-node resistor-capacitor (RC) network:

$$\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}\left(k \frac{\partial T}{\partial x}\right)$$

### 1. Spatial Discretization & Fourier Stability Ceiling
To prevent numerical instability in explicit finite-difference time-stepping, spatial step size $\Delta x$ is dynamically bounded by the Fourier stability criterion ($Fo \le 0.25$):

$$\Delta x_{\max} = \sqrt{\frac{\alpha \Delta t}{Fo_{\text{target}}}} \quad \text{where } \alpha = \frac{k}{\rho c_p}$$

$$N_{\text{nodes}} = \max\left(1,\ \left\lceil \frac{L}{\Delta x_{\max}} \right\rceil\right), \quad \Delta x = \frac{L}{N_{\text{nodes}}}$$

### 2. Discretized Nodal Capacitance & Conductance
- **Thermal Capacitance:** $C_i = \rho c_p \Delta x A \quad [\text{J/K}]$
- **Thermal Conductance:** $K_{i, i+1} = \frac{k A}{\Delta x} \quad [\text{W/K}]$

### 3. Inter-Layer Boundary Conductance
Between heterogeneous layers $a$ and $b$, conductances combine in series:

$$K_{\text{interface}} = \frac{A}{\frac{\Delta x_a / 2}{k_a} + \frac{\Delta x_b / 2}{k_b}} \quad [\text{W/K}]$$

### 4. Boundary Film Resistances (ISO 6946)
- Interior Film Resistance: $R_{si} = 0.13\ \text{m}^2\text{K/W}$
- Exterior Film Resistance: $R_{se} = 0.04\ \text{m}^2\text{K/W}$
- Overall Envelope U-Value: $U = \frac{1}{R_{si} + \sum \frac{L_j}{k_j} + R_{se}} \quad [\text{W/m}^2\text{K}]$

---

# 11. Solar Geometry & Perez High-Altitude Radiation

Computes the exact astronomical solar position and incident shortwave radiation across tilted envelope facets:

### 1. Solar Angles (Duffie & Beckman / NOAA)
$$\delta = 23.45^\circ \sin\left(\frac{360^\circ}{365}(284 + n)\right) \quad \text{(Declination Angle)}$$

$$\omega = 15^\circ \times (t_{\text{solar}} - 12) \quad \text{(Hour Angle)}$$

$$\sin\alpha_s = \sin\phi\sin\delta + \cos\phi\cos\delta\cos\omega \quad \text{(Solar Altitude)}$$

### 2. Mandatory Surface Incidence Angle Clamping
$$\cos\theta = \sin\alpha_s\cos\beta + \cos\alpha_s\sin\beta\cos(\gamma_s - \gamma_{\text{surface}})$$

$$\cos\theta_{\text{clamped}} = \max(\cos\theta,\ 0.0)$$

> **Why Clamping is Mandatory:** When the sun dips behind a building facet, $\cos\theta < 0$. Without clamping to zero, direct solar radiation becomes negative, artificially cooling the structure.

### 3. Total Absorbed Solar Irradiance
$$I_{\text{total}} = I_{\text{beam}}\cos\theta_{\text{clamped}} + I_{\text{diffuse}}\left(\frac{1 + \cos\beta}{2}\right) + \text{GHI} \cdot \rho_{\text{snow}}\left(\frac{1 - \cos\beta}{2}\right)$$

Where ground snow reflection albedo is set to $\rho_{\text{snow}} = 0.75$, reflecting up to **35% additional solar flux** onto vertical south-facing glazing.

---

# 12. Rarefied Atmosphere, Sky Sink & Infiltration

At high Himalayan elevations ($3,500\ \text{m}$ to $5,400\ \text{m}$), barometric pressure drops substantially, fundamentally changing convective and radiative heat exchange:

### 1. Barometric Pressure vs Altitude
$$P(h) = 101325 \times \left(1 - 2.25577 \times 10^{-5} \times h\right)^{5.25588} \quad [\text{Pa}]$$

### 2. Temperature-Corrected Air Density
$$\rho_{\text{alt}}(h, T) = \frac{P(h)}{287.058 \times T_{\text{air}}} \quad [\text{kg/m}^3]$$

At Leh ($3,500\ \text{m}$), air density plunges to **$\approx 0.81\ \text{kg/m}^3$**, reducing natural convective infiltration heat loss by **$35\%$** compared to naive sea-level models ($1.225\ \text{kg/m}^3$).

### 3. Sensible Infiltration Heat Loss
$$Q_{\text{inf}} = \frac{\text{ACH} \times V \times \rho_{\text{alt}} \times c_{p,\text{air}} \times (T_{\text{in}} - T_{\text{out}})}{3600} \quad [\text{W}]$$

### 4. Swinbank Nocturnal Clear-Sky Radiation Sink
In dry high-altitude atmospheres, the clear sky acts as an extreme subzero radiative blackbody sink:

$$T_{\text{sky}} = 0.0552 \times T_{\text{air}}^{1.5} \quad [\text{K}]$$

$$h_r = \varepsilon \sigma (T_{\text{surface}}^2 + T_{\text{sky}}^2)(T_{\text{surface}} + T_{\text{sky}}) \quad [\text{W/m}^2\text{K}]$$

$$Q_{\text{sky}} = h_r \times A \times F_{\text{sky}} \times (T_{\text{surface}} - T_{\text{sky}}) \quad [\text{W}]$$

Where Stefan-Boltzmann constant $\sigma = 5.670374 \times 10^{-8}\ \text{W/m}^2\text{K}^4$, and sky view factors are $F_{\text{sky}} = 1.0$ (roof) and $F_{\text{sky}} = 0.5$ (walls).

---

# 13. Thermal Diagnosis & 100% Conservation Attribution

Breaks down total 24-hour heat dissipation into discrete components obeying an exact mathematical invariant:

$$\sum Q_{\text{loss}} = Q_{\text{walls}} + Q_{\text{roof}} + Q_{\text{floor}} + Q_{\text{glazing}} + Q_{\text{inf}} + Q_{\text{sky}}$$

$$P_k = \frac{Q_k}{\sum Q_{\text{loss}}} \times 100\% \quad \text{such that } \sum P_k = 100.0\% \pm 0.1\%$$

### Dominant Bottleneck Identification
$$k^* = \arg\max_k (P_k)$$

The system automatically flags the single greatest thermodynamic vulnerability and prescribes targeted engineering retrofits:
- If Glazing $>25\%$ $\to$ Deploy automated night shutter ($R \ge 0.5\ \text{m}^2\text{K/W}$).
- If Roof $>25\%$ $\to$ Apply low-emissivity coating ($\varepsilon \le 0.25$) or $100\ \text{mm}$ EPS insulation.
- If Infiltration $>20\%$ $\to$ Install perimeter silicone draft gaskets.

---

# 14. Vectorized Multi-Objective Pareto Optimization Engine

Searches $\ge 3,200$ candidate envelope combinations simultaneously using vectorized NumPy routines:

```
[ Parameter Space Bounds ] ──► [ Latin Hypercube Sampling (N=3,200) ]
                                             │
[ Non-Dominated Pareto Sort ] ◄── [ Vectorized 1D RC Batch Solver ]
             │
             ├──► Frontier Visualization (Comfort vs. Capital Cost)
             ├──► Top 3 Recommended Winning Designs
             └──► Deterministic "Why This Won" Synthesis
```

### 1. Pareto Non-Dominated Sorting
In multi-objective space minimizing Capital Cost ($K$) and Discomfort Hours ($D = 24 \times (1 - C)$):

Design $A$ strictly dominates Design $B$ ($A \succ B$) if and only if:
$$K_A \le K_B \quad \text{and} \quad D_A \le D_B \quad \text{and} \quad (K_A < K_B \lor D_A < D_B)$$

### 2. Normalized Utopia Distance (Pareto Knee Point)
To select the single best balanced trade-off design without arbitrary subjective weights, THERMA computes the normalized Euclidean distance to the ideal Utopia point ($C^* = 1.0, K^* = 0.0$):

$$c_i^* = \frac{C_i - C_{\min}}{C_{\max} - C_{\min}}, \quad k_i^* = \frac{K_i - K_{\min}}{K_{\max} - K_{\min}}$$

$$D_i = \sqrt{(1.0 - c_i^*)^2 + (k_i^* - 0.0)^2} \to \min$$

$$\text{Best Trade-Off Design} = \arg\min_{i \in \text{Safe Designs}} D_i$$

---

# 15. 7-Stage Design Doctor & Retrofit Ranking

The Design Doctor provides a structured clinical workflow for renovating existing substandard military outposts:

```
[ 1. CURRENT CONDITION ] ──► [ 2. THERMAL DIAGNOSIS ] ──► [ 3. RECOMMENDED RETROFITS ]
                                                                      │
[ 7. SCIENTIFIC RATIONALE ] ◄── [ 6. SAFETY CHECK ] ◄── [ 5. EXPECTED EFFECT ] ◄─ [ 4. ESTIMATED COST ]
```

### Cost-Efficiency Metric
All physical retrofits are evaluated and ranked strictly by **temperature gain per ₹1,000 invested**:

$$\text{Efficiency} = \frac{\Delta T_{\text{in,min}}\ [^\circ\text{C}]}{\text{Cost}\ [₹] / 1000.0} \quad [^\circ\text{C} / ₹1,000]$$

Top-ranked retrofits (e.g. insulating night shutters at $12.2^\circ\text{C}/₹1,000$) consistently outrank heavy structural alterations, delivering massive thermal improvements on modest defense budgets.

---

# 16. Combustion Safety Interlock & CO Asphyxiation Prevention

A lethal vulnerability in naive optimization algorithms is sealing buildings airtight ($\text{ACH} \to 0$) to eliminate infiltration loss. At high-altitude military posts, soldiers burn unvented kerosene bukharis for heat. **Operating a fuel heater in an unventilated room causes rapid oxygen starvation and fatal Carbon Monoxide (CO) poisoning.**

```
                                 COMBUSTION SAFETY INTERLOCK
                                              │
                               [ Combustion Heater Active? ]
                                         /         \
                                       YES          NO
                                       /             \
                         [ ACH < 0.35 Safety Floor? ] [ Allow Full ACH Range ]
                              /              \
                            YES               NO
                            /                  \
                  ┌────────────────────┐    ┌────────────────────┐
                  │  REFUSED (HTTP 400)│    │   PASS TO ENGINE   │
                  │  Lethal CO Hazard  │    │   Run Simulation   │
                  └────────────────────┘    └────────────────────┘
```

```python
ACH_MIN_COMBUSTION = 0.35  # IS 13730 / ASHRAE 62.1 Life Safety Minimum

if heater_type in ['kerosene', 'unflued_combustion'] and ach < ACH_MIN_COMBUSTION:
    return {
        "status": "REFUSED",
        "reason": (
            f"LIFE SAFETY REFUSAL: Infiltration rate ({ach} ACH) is below the "
            f"mandatory 0.35 ACH safety floor for combustion heating. "
            f"Operating an unvented kerosene heater in an airtight space causes "
            f"fatal Carbon Monoxide (CO) asphyxiation."
        )
    }
```

THERMA's optimizer and ML surrogates will never recommend a lethal shelter design.

---

# 17. Security, Privacy & Air-Gapped Defense Isolation

Military software deployed near contested borders must withstand electronic warfare, network denial, and cyber threats:

- **100% Air-Gapped Operation:** Runs entirely from local storage. Zero external CDNs, tracking pixels, or external cloud API calls.
- **Zero Cloud Telemetry:** No user inputs, troop deployments, site coordinates, or military shelter specifications ever leave the local machine.
- **Defense-Grade Offline Resilience:** Weather datasets, material schedules, and validation benchmarks are pre-cached in local SQLite storage.
- **Single-Port Dev Server Proxy:** FastAPI on port 8000 automatically redirects browser requests to Vite on port 5173, providing seamless single-port operation.

---

# 18. Siachen Helicopter Logistics & Kerosene Economics

THERMA converts every simulation result directly into real-world defense logistics metrics:

![High-Altitude Fuel Logistics & Defense Economic Payoff](./docs/assets/fuel_logistics_chart.svg)

### Logistics Payoff Equations
$$\text{Fuel Avoided } [\text{L/year}] = \frac{\Delta Q_{\text{heating}} [\text{kWh}] \times 3.6\ \text{MJ/kWh}}{37.0\ \text{MJ/L} \times \eta_{\text{stove}}}$$

$$\text{Annual Financial Savings } [₹] = \text{Fuel Avoided } [\text{L}] \times ₹2,400/\text{L}\ \text{(Airlift Delivered Cost)}$$

$$\text{Helicopter Sorties Avoided} = \left\lceil \frac{\text{Fuel Avoided } [\text{kg}]}{500\ \text{kg per Cheetah Sortie}} \right\rceil$$

$$\text{Simple Payback Period } [\text{years}] = \frac{\text{Capital Cost of Retrofit } [₹]}{\text{Annual Fuel Savings } [₹]}$$

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 TYPICAL LOGISTICS PAYOFF: 15-MAN FORWARD POST               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Baseline Shelter Fuel Burn          :  1,350 Litres / year                 │
│  THERMA Optimized Passive Shelter    :    170 Litres / year                 │
│  Net Kerosene Fuel Eliminated        :  1,180 Litres / year                 │
│  Net Annual Financial Savings        :  ₹28,32,000 / year                   │
│  Helicopter Sorties Avoided          :  14 dedicated airlift flights        │
│  Capital Investment Payback Period   :  2.1 Years                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 19. Field Trial Empirical Validation Suite & ANSYS Reference

Validation is the gate that establishes engineering credibility. THERMA is grounded across **two validation axes**:

### Axis 1: Empirical DRDO-DIHAR Field Measurements (Gate 3)

| Benchmark Target | Field Scenario & Location | Measured Field Performance | THERMA Model Prediction | Absolute Error ($\Delta T$) | Status |
|:---|:---|:---:|:---:|:---:|:---:|
| **Target V1** | **DIHAR Leh Solar-Heated Pilot** | Holds $15.0\ ^\circ\text{C} \text{ to } 20.0\ ^\circ\text{C}$ at $-19\ ^\circ\text{C}$ ambient | $16.04\ ^\circ\text{C} \text{ to } 18.38\ ^\circ\text{C}$ | Inside Target Band | **PASS** |
| **Target V2** | **Leh Trombe Wall Room (Feb 2020)** | Monitored monthly mean: **$17.44\ ^\circ\text{C}$** | Model mean: **$16.29\ ^\circ\text{C}$** | $-1.15\ \text{K}$ (Tol: $\pm 2.0\ \text{K}$) | **PASS** |
| **Target V3** | **Leh Direct-Gain Room (Feb 2020)** | Monitored monthly mean: **$14.81\ ^\circ\text{C}$** | Model mean: **$15.01\ ^\circ\text{C}$** | $+0.20\ \text{K}$ (Tol: $\pm 2.0\ \text{K}$) | **PASS** |
| **Target V4** | **DIHAR / Sun Stellar ADM Block** | Holds $+20.0\ ^\circ\text{C}$ from 18:00 to 06:00 | Model at 06:00: **$18.88\ ^\circ\text{C}$** | $-1.12\ \text{K}$ (Tol: $\pm 2.0\ \text{K}$) | **PASS** |

### Inviolable Physical Ordering Rule
$$\text{Model Mean}(V_2\text{ Trombe}) > \text{Model Mean}(V_3\text{ Direct Gain}) \implies 16.29\ ^\circ\text{C} > 15.01\ ^\circ\text{C} \quad (\mathbf{PASS})$$

Matching the physical performance ranking between two different passive solar architectures under identical weather conditions confirms that the underlying thermal mass, phase lag, and convective loop equations are mathematically sound.

### Axis 2: ANSYS Mechanical Reference Track & Comparison Harness
THERMA provides three canonical finite-element benchmark cases (`validation/ansys/`) and an automated comparison script (`validation/ansys/compare.py`) for cross-validation against ANSYS Mechanical Transient Thermal.

---

# 20. Automated Test Suite & System Verification

The entire repository is guarded by rigorous, automated test suites verifying every layer of the platform:

```bash
# 1. Execute full Pytest backend test suite (195 tests)
.venv/bin/pytest tests/ -v

# 2. Run Gate 3 empirical validation checks vs. DRDO-DIHAR field trials
PYTHONPATH=. .venv/bin/python validation/run.py --check

# 3. Run frontend unit and component tests (84 tests)
cd web && npm test -- --watchAll=false

# 4. Run production frontend build verification
npm run build
```

```text
============================== 195 passed in 10.42s ==============================
VALIDATION RUN:
  V1 DIHAR Leh        model 16.04-18.38 C   measured 15-20 C     PASS
  V2 Trombe Feb       model 16.29 C        measured 17.44 C     PASS (delta -1.15)
  V3 Direct gain Feb  model 15.01 C        measured 14.81 C     PASS (delta +0.20)
  V4 ADM Block 06:00  model 18.88 C        measured 20 C        PASS (delta -1.12)
  ORDERING            Trombe 16.29 > DG 15.01                   PASS
  SANITY physics      tests 10/10                                PASS
============================== 84 passed in 107ms ================================
✓ built in 820ms
```

---

# 21. RESTful API Architecture & Frozen Contracts

All API routes strictly adhere to **`brain/07_API_CONTRACT.md`**. Request and response bodies are validated via Pydantic v2 schemas:

| Endpoint | Method | Purpose | Key Parameters |
|:---|:---:|:---|:---|
| `/simulate` | `POST` | Runs 24-hr transient simulation; indoor temperatures, heat loss, and diagnosis. | Location, Geometry, Envelope, Opening, Vent |
| `/ml/predict` | `POST` | Sub-10ms Scientific ML surrogate prediction across 5 ensemble models. | Wall thickness, Insulation, Glazing, ACH |
| `/ml/ask` | `POST` | Grounded AI assistant synthesizing conversational answers from physics runs. | Query string, Optional design payload |
| `/optimize` | `POST` | Searches $\ge 3,200$ variants via Latin Hypercube; extracts Pareto frontier. | Budget, Locally available filter, Bounds |
| `/sensitivity`| `POST` | Morris elementary effects screening ranking envelope levers by $\mu^*$ and $\sigma$.| Trajectories $r=20$, Bounded parameters |
| `/what-if` | `POST` | Evaluates single parameter modification against baseline; returns diurnal $\Delta T$.| Variable key, Target value, Baseline JSON |
| `/compare` | `POST` | Compares 2 to 4 designs; computes Utopia distance Pareto knee point. | List of 2 to 4 design payloads |
| `/retrofit` | `POST` | Ranks physical interventions by $^\circ\text{C}$ gained per ₹1,000 invested. | Baseline shelter, Investment budget cap |
| `/cpwd/chat` | `POST` | Local offline CPWD DSR/DAR assistant with vector + FTS5 retrieval and citations.| Query text, Edition year filter |
| `/sites` | `GET` | Lists 39 defense posts across Ladakh, Siachen, Galwan, Dras, etc. | Sector filter, Estate name |
| `/sites/:id` | `GET` | Retrieves full outpost microclimate, envelope profile, and active alerts. | Site ID string |
| `/materials` | `GET` | Returns library of 102 envelope materials with cited thermophysical properties.| Category filter, Local availability |
| `/validation` | `GET` | Serves committed field validation benchmarks (V1–V4) vs. DIHAR Leh trials. | — |

---

# 22. Project Directory Topology

```text
highoncaffeine/
├── api/                             # FastAPI REST Orchestration Layer
│   ├── main.py                      # Main API gateway, frozen routing & dev proxy
│   ├── cpwd/                        # Local CPWD DSR/DAR AI & Vector Retrieval
│   │   ├── assistant.py             # Grounded AI assistant with exact citations
│   │   ├── database.py              # SQLite + FTS5 full-text database
│   │   ├── ingest.py                # Multi-year PDF/CSV ingestion pipeline
│   │   └── models.py                # Pydantic schemas for CPWD items
│   ├── platform.py                  # Multi-district estate platform router
│   ├── platform_schemas.py          # Pydantic models for sites and alerts
│   ├── weather.py                   # Weather fetching, caching & CSV ingestion
│   └── weather_data.py              # Offline fallback NASA POWER profiles
├── engine/                          # Authoritative Computational Core
│   ├── solver.py                    # 1D multi-node RC heat diffusion solver
│   ├── optimizer.py                 # Vectorized Latin Hypercube & Pareto engine
│   ├── pareto.py                    # Pareto non-dominated sorting & frontier extractor
│   ├── design_doctor.py             # 7-stage Design Doctor & budget retrofit engine
│   ├── comparison.py                # Multi-design comparison & Utopia distance
│   ├── what_if.py                   # Single-variable sensitivity sandbox
│   ├── diagnosis.py                 # Thermal diagnosis & 100% loss attribution
│   ├── sensitivity.py               # Morris elementary effects screening
│   ├── safety.py                    # Combustion heater life-safety interlock
│   ├── impact.py                    # Fuel avoidance & logistics economics
│   ├── materials.py                 # Material library loader & cost basis
│   ├── solar.py                     # Solar position & Perez irradiance model
│   ├── radiation.py                 # Swinbank linearized sky radiation
│   ├── types.py                     # Core dataclasses (Design, Layer, Opening)
│   └── physics_constants.py         # Cited thermophysical constants (Rule R1)
├── ml/                              # Scientific Machine Learning Surrogate Core
│   ├── inference.py                 # Real-time sub-10ms inference pipeline
│   ├── ask.py                       # Grounded conversational AI assistant
│   ├── data_generation/             # 120,000 timestep dataset generator
│   ├── preprocessing/               # Feature normalization and train/val/test splits
│   └── training/                    # 5 Trained surrogate model artifacts (.pkl)
├── web/                             # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── platform/            # Tactical C2 Platform Views (17 pages)
│   │   │   │   ├── LandingPage.jsx  # Public interactive landing hub
│   │   │   │   ├── DashboardPage.jsx# Strategic command overview
│   │   │   │   ├── SitesPage.jsx    # 39 Defense outpost network
│   │   │   │   ├── SiteHubPage.jsx  # Single outpost command center
│   │   │   │   ├── MlPredictorPage.jsx # Scientific ML surrogate explorer
│   │   │   │   ├── CpwdPage.jsx     # CPWD DSR/DAR AI Assistant
│   │   │   │   ├── ReportPage.jsx   # Military spec & BOQ export
│   │   │   │   ├── VerifyPage.jsx   # Live system verification harness
│   │   │   │   ├── Interactive3DMap.jsx # Tactical geospatial map
│   │   │   │   └── FloatingChatOrb.jsx # Interactive AI voice orb
│   │   │   ├── results/             # Simulation output display panels
│   │   │   │   ├── DesignComparisonPanel.jsx  # Multi-design trade-off matrix
│   │   │   │   ├── WhatIfPanel.jsx            # Single-variable sandbox
│   │   │   │   ├── ThermalDiagnosisPanel.jsx  # 100% loss attribution
│   │   │   │   ├── DesignDoctorPanel.jsx      # 7-stage clinical retrofit doctor
│   │   │   │   ├── MetricCards.jsx            # Headline KPI metrics
│   │   │   │   └── RefusalCard.jsx            # Asphyxiation safety refusal
│   │   │   ├── Shelter3DCanvas.jsx  # Three.js 3D WebGL shelter viewer
│   │   │   ├── CrossSectionSVG.jsx  # Dynamic wall cross-section with flux vectors
│   │   │   ├── DayScrubber.jsx      # 24-hr diurnal time scrubber
│   │   │   ├── TempChart.jsx        # Diurnal temperature curve
│   │   │   └── CommandBar.jsx       # Tactical hotkeys & command palette
│   │   ├── tokens.css               # Editorial Engineering design tokens
│   │   ├── router.jsx               # React Router DOM configuration
│   │   └── App.jsx                  # Main application orchestrator
│   └── package.json                 # Frontend dependencies and test scripts
├── data/                            # Database & Static Master Datasets
│   ├── materials.csv                # 102 cited materials (CPWD DSR 2023)
│   └── therma.db                    # Relational SQLite database
├── docs/presentation_assets/        # Presentation Boards & Generated Slides
│   ├── SIH_2026_Idea_Presentation_THERMA.pdf # Complete 7-page SIH submission PDF
│   ├── technical_approach_slide_3.pdf        # Standalone Slide 3 (960x540 pt)
│   ├── technical_approach_slide_3.png        # High-resolution Slide 3 graphic
│   └── 02_technical_approach_complete_board.png # 4800x2700 px master board
├── tests/                           # Pytest Automated Test Suite (195 tests)
└── README.md                        # Master Project Documentation
```

---

# 23. Installation, Setup & Verification Guide

### Prerequisites
- **Python:** Version 3.9 or higher (Python 3.10 / 3.11 recommended)
- **Node.js:** Version 18.0 or higher (npm 9+)
- **Operating System:** Linux, macOS, or Windows (WSL2 recommended)

### Quickstart Setup in Three Steps

```bash
# 1. Clone the repository
git clone https://github.com/vedeshskhatri/highoncaffeine.git
cd highoncaffeine

# 2. Setup and launch Python Physics Engine & API (Port 8000)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --port 8000 --reload

# 3. In a second terminal, setup and launch React Web Studio (Port 5173)
cd web
npm install
npm run dev
```

Visit **`http://localhost:5173`** or **`http://localhost:8000`** in your browser.

---

# 24. Live Hackathon Judging Walkthrough (90s Speedrun & 5m Deep Dive)

Judges can verify the platform end-to-end following this structured demonstration:

### 🚀 90-Second Speedrun
1. **Open `http://localhost:5173`:** Observe the instant offline load, zero external network requests, and live system metrics on the landing hub.
2. **Navigate to Design Studio (`/design`):** Select **Leh (3,500 m)** and **Design Winter Night** ($-22^\circ\text{C}$).
3. **Click [Run Simulation]:** Observe the uninsulated hut collapse to $-18.0^\circ\text{C}$ at dawn (**Req 1 Satisfied**).
4. **Switch to What-If Studio:** Slide EPS insulation from $0.00\ \text{m}$ to $0.15\ \text{m}$. Watch the server compute the authoritative diurnal delta strip, gaining $+8.2^\circ\text{C}$ instantly.
5. **Test Safety Interlock:** Select kerosene heater and set $\text{ACH} = 0.20$. Watch the red **RefusalCard** block the design to prevent carbon monoxide poisoning.
6. **Trigger Multi-Objective Optimizer:** Click **[Run Optimization]**. Evaluate 3,200 designs in $<6$ seconds and select the Rank #1 winner holding **$+17.2^\circ\text{C}$** at dawn with zero fuel (**Req 2 & 4 Satisfied**).
7. **Open Validation Panel (`/validation`):** Inspect 4 empirical field points vs. DRDO-DIHAR Leh field trials; verify all 4 PASS and Trombe wall is ranked above direct-gain.

### 🔍 5-Minute Deep Dive
- **3D WebGL Shelter Inspector:** Toggle the outer wall layer to peel the facade and examine the EPS insulation and structural adobe mass.
- **Scientific ML Predictor (`/ml-predictor`):** Drag sliders across wall thickness, glazing area, and orientation; see instant sub-10ms predictions from the 5-model surrogate ensemble.
- **CPWD DSR Assistant (`/cpwd`):** Ask *"What is the rate for 100mm EPS insulation under DSR 2023?"* and inspect the exact page citation and item code.
- **Military Spec Export:** Click **[Copy Military Specification]** and inspect the formatted MES Bill of Quantities (BOQ).

---

# 25. Official Presentation Slides & Downloadable Artifacts

The repository includes high-resolution presentation boards and the official Smart India Hackathon 2026 presentation PDF:

- 📄 **Complete 7-Page Submission Presentation:** [`SIH_2026_Idea_Presentation_THERMA.pdf`](file:///Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets/SIH_2026_Idea_Presentation_THERMA.pdf)  
  *Official SIH 2026 presentation slide deck with Page 3 updated with the complete Technical Approach board.*
- 🖼️ **Standalone Slide 3 PDF (960 x 540 pt):** [`technical_approach_slide_3.pdf`](file:///Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets/technical_approach_slide_3.pdf)
- 🖼️ **Standalone Slide 3 High-Res PNG:** [`technical_approach_slide_3.png`](file:///Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets/technical_approach_slide_3.png)
- 📐 **Ultra-HD 4800 x 2700 px Master Board:** [`02_technical_approach_complete_board.png`](file:///Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets/02_technical_approach_complete_board.png)

---

*Authored by Team HighOnCaffeine for the Smart India Hackathon 2026 Grand Finale.*  
*SIH 2026 · Problem Statement PS 26051 · Defence Research & Development Organisation (DRDO).*
