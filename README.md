# THERMA

**Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance**  
SIH 2026 · PS 26051 · DRDO

> Other software grades a design you already picked. THERMA searches thousands and picks for you, then shows its working.

All project specifications, architectural documentation, physics formulations, and team phase prompts are stored in [`brain/`](./brain).

## Specifications Index

| Document | Purpose |
|---|---|
| [`00_MASTER_RULES.md`](./brain/00_MASTER_RULES.md) | Eight hard rules, anti-hallucination protocol, ownership map |
| [`01_PRD.md`](./brain/01_PRD.md) | Problem statement, functional requirements, limitations |
| [`02_TRD.md`](./brain/02_TRD.md) | Stack specification, repo structure, engine requirements |
| [`03_ARCHITECTURE.md`](./brain/03_ARCHITECTURE.md) | Layer diagram, request flows, dependency boundaries |
| [`04_DATA_MODEL.md`](./brain/04_DATA_MODEL.md) | SQLite schema, in-memory structures |
| [`05_DATA_SOURCES.md`](./brain/05_DATA_SOURCES.md) | Permitted source citations (Rule R1) |
| [`06_PHYSICS_SPEC.md`](./brain/06_PHYSICS_SPEC.md) | Authoritative equations and thermal build order |
| [`07_API_CONTRACT.md`](./brain/07_API_CONTRACT.md) | Frozen REST API contract |
| [`08_UI_SPEC.md`](./brain/08_UI_SPEC.md) | Design direction, typography, design tokens, layout |
| [`09_ERROR_HANDLING.md`](./brain/09_ERROR_HANDLING.md) | Error handling, exception taxonomy, fallback chain |
| [`10_VALIDATION.md`](./brain/10_VALIDATION.md) | Gate 3 targets, sanity tests, calibration checkpoints |
| [`11_OPTIMIZER_SPEC.md`](./brain/11_OPTIMIZER_SPEC.md) | Search, Pareto frontier, Morris screening |
| [`12_GITHUB_ACTIONS.md`](./brain/12_GITHUB_ACTIONS.md) | Branching strategy, commits, CI configuration |
| [`13_TESTING.md`](./brain/13_TESTING.md) | Test suite specifications and manual verification checklist |
| [`14_DEMO_CHECKLIST.md`](./brain/14_DEMO_CHECKLIST.md) | Pre-flight rehearsal and demo beats |
| [`15_MICROTASKS.md`](./brain/15_MICROTASKS.md) | Development microtask tracker |
| [`16_CHANGELOG.md`](./brain/16_CHANGELOG.md) | Project changelog |
| [`17_DECISIONS.md`](./brain/17_DECISIONS.md) | Architectural Decision Records (ADR) |

## Team Phase Prompts

- [`VEDESH_PHASES.md`](./brain/VEDESH_PHASES.md) — Engine & Optimizer (V0–V6)
- [`AMAN_PHASES.md`](./brain/AMAN_PHASES.md) — Physics & Validation (A0–A4)
- [`ARYAN_PHASES.md`](./brain/ARYAN_PHASES.md) — Backend & Data (R0–R4)
- [`SWAPNIL_PHASES.md`](./brain/SWAPNIL_PHASES.md) — UI & Frontend (S0–S4)
