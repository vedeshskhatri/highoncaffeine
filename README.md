# THERMA — Area-Specific Shelter Design for Thermal Comfort Maintenance
### Smart India Hackathon 2026 · PS 26051 (DRDO) · High-Altitude Passive Solar Shelter Engineering

> *"Other software grades a design you already picked. THERMA searches thousands and picks for you, then shows its working."*

---

## 1. Quickstart — Setup in Two Commands

THERMA runs 100% locally and completely offline with zero cloud or API key dependencies:

```bash
# 1. Start the FastAPI Physics Engine & Vectorized Optimizer (Port 8000)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --port 8000 --host 0.0.0.0

# 2. In a second terminal, launch the React Frontend (Port 5173)
cd web && npm install && npm run dev
```

Visit `http://localhost:5173` to explore the interactive design studio, live dynamic cross-section SVG, and multi-objective Pareto optimizer.

---

## 2. System Architecture

```mermaid
graph TD
    A[User / Forward Engineer] -->|Location, Envelope, Glazing, Infiltration| B(React + Vite Web App)
    B -->|Interactive SVG| C[Live Cross-Section Renderer]
    B -->|Simulate & Optimize Requests| D[FastAPI Backend :8000]
    D --> E[Physics Engine / RC Network Solver]
    D --> F[Multi-Objective Pareto Optimizer]
    D --> G[Morris Elementary Effects Screener]
    D --> H[Local SQLite Weather & Materials DB]
    E -->|Hourly Indoor T, Heat Flow across ΔT| B
    F -->|Pareto Frontier, Top 3 Designs, Mechanical 'Why'| B
    G -->|Ranked Levers with [estimate] Tags| B
    H -->|EPW Solar / T_amb Cached Data| E
```

---

## 3. Team Responsibilities

| Team Member | Domain | Key Contributions |
|---|---|---|
| **Swapnil Ghosh** | UI/UX & Thermal Architecture | Authored original thermal blueprint; built design system (`tokens.css`), live dynamic cross-section SVG, input controls, and Recharts suite; physics speaker in Q&A. |
| **Vedesh S. Khatri** | Core Engine & Optimization | Implemented vectorized 1D multi-node RC heat diffusion solver, Latin Hypercube batch evaluator, non-dominated Pareto front extractor, and Morris screening. |
| **Aman Jain** | Physics Validation & Safety | Calibrated dynamic thermal model against published DRDO-DIHAR Leh field trials; built safety interlock module (CO asphyxiation protection). |
| **Aryan Bhojgaria** | Backend & Data Layer | Engineered FastAPI REST endpoints, SQLite data schemas (`therma.db`), EPW weather ingestion, and offline fallback pipelines. |
| **Surbhi** | Product Operations & Narrative | Authored 6-slide presentation deck, 90-second stopwatch rehearsal demo script, and evaluator Q&A drill bank; team pitch lead. |
| **Vritika** | Logistics & Cost Analysis | Compiled Siachen helicopter logistics costs (₹2,400/L kerosene, ₹3.2L/mo per post), schedule of rates, and Nepal earthquake relief catalog. |

---

## 4. Problem Statement Alignment

| PS 26051 Requirement | How THERMA Addresses It | Where in Tool |
|---|---|---|
| **Requirement 1: Predict Indoor Temperature** | Solves dynamic conduction, solar irradiation, and linearized sky radiation hour-by-hour across extreme winter days. | `TempChart` & Simulation Summary |
| **Requirement 2: Solar Thermal Gain & Retention** | Computes direct/diffuse solar gains via Perez tilt model; pairs high-mass mud/stone with exterior insulation and night shutters. | `OptimizeCanvas` (holds +17.2 °C dawn minimum) |
| **Requirement 3: Heat Flow across $\Delta T$** | Real-time computation and display of envelope conductive & convective heat flux driven by $(T_{\text{in}} - T_{\text{outdoor}})$. | `DeltaAmbientChart` ("Heat flow across ΔT") |

---

## 5. Honest Engineering Limitations (PRD Section 9)

As rigorous engineers, we document our model boundaries explicitly:
1. **1D Conduction**: Solves 1D heat diffusion per envelope facet; linear thermal bridging at steel cold junctions is incorporated via ISO 10211/14683 $\Psi$-factor corrections rather than full 3D solid meshes.
2. **Lumped Air Node**: Indoor air is modeled as a single well-mixed thermal capacitance; vertical temperature stratification is approximated rather than computed via full 3D Navier-Stokes CFD.
3. **Infiltration Model**: Natural air leakage is scaled using barometric altitude air density ($\rho = 0.804 \text{ kg/m}^3$ at Leh) and user-specified ACH, rather than continuous wind-tunnel pressure network simulations.
4. **Validation Grounding**: Calibrated against published DRDO-DIHAR Leh empirical field data (average deviation $\Delta = 1.2 \text{ °C}$); physical full-scale field prototype instrumentation at Dras/Siachen remains our deployment roadmap milestone.

---

## 6. Specifications Index

All architectural contracts, physics derivations, and audit records are documented in [`brain/`](./brain):

- [`00_MASTER_RULES.md`](./brain/00_MASTER_RULES.md) — Eight hard rules, anti-hallucination protocol, ownership map
- [`01_PRD.md`](./brain/01_PRD.md) — Problem statement, requirements, limitations
- [`02_TRD.md`](./brain/02_TRD.md) — Technical requirements, stack specification
- [`03_ARCHITECTURE.md`](./brain/03_ARCHITECTURE.md) — Component architecture and data flow
- [`05_DATA_SOURCES.md`](./brain/05_DATA_SOURCES.md) — Ground-truth empirical citations (Rule R1)
- [`06_PHYSICS_SPEC.md`](./brain/06_PHYSICS_SPEC.md) — Mathematical formulations and boundary equations
- [`07_API_CONTRACT.md`](./brain/07_API_CONTRACT.md) — Frozen REST API schemas
- [`08_UI_SPEC.md`](./brain/08_UI_SPEC.md) — Design tokens and interaction specifications
- [`10_VALIDATION.md`](./brain/10_VALIDATION.md) — Gate 3 validation criteria vs DIHAR Leh data
- [`11_OPTIMIZER_SPEC.md`](./brain/11_OPTIMIZER_SPEC.md) — Optimization algorithms and Morris screening
- [`14_DEMO_CHECKLIST.md`](./brain/14_DEMO_CHECKLIST.md) — 90-second rehearsal checklist
- [`deck/SLIDES.md`](./deck/SLIDES.md) — Presentation deck
- [`deck/DEMO_SCRIPT.md`](./deck/DEMO_SCRIPT.md) — 90-second demo script
- [`docs/qa-bank.md`](./docs/qa-bank.md) — Evaluator Q&A drill bank
