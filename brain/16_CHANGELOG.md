# 16 — CHANGELOG

Append-only. Never edit another person's entry. One line per phase completion or material decision.

Format:
```
[YYYY-MM-DD HH:MM] <AGENT><PHASE> — <what changed> — <why, if not obvious>
```

---

```
[2026-09-11 00:00] INIT — brain folder created, 17 spec files + 4 phase prompt sets
[2026-09-11 00:00] INIT — stack locked: Python/NumPy/FastAPI/SQLite/React/Vite/Tailwind/Recharts
[2026-09-11 00:00] INIT — rejected Postgres, Prisma, ORM, Docker, Streamlit, PDF export (see 02_TRD §1)
[2026-09-11 00:00] INIT — 3D view and ML surrogate cut for headcount, moved to roadmap
[2026-09-11 00:00] INIT — fonts: Montserrat + DM Sans (Google Sans not web-licensed) + JetBrains Mono
[2026-09-11 00:00] INIT — colour palette PROVISIONAL pending team palette
[2026-09-11 11:35] AMAN A0 — materials library created with 19 sourced rows, strict UnsourcedMaterialError loader
[2026-09-11 11:36] AMAN A1 — physics constants module with Swinbank sky temp, Michalsky solar position, IMAC comfort band
[2026-09-11 11:38] AMAN A2 — 10 physics sanity tests implemented, 15 passed, 2 skipped pending V5
[2026-09-11 11:41] AMAN A3 — Gate 3 validation passed: V1, V2, V3, V4 within tolerance, Ordering check Trombe (16.29) > DG (15.01) PASS
[2026-09-11 11:42] AMAN A4 — safety interlock (0.35 ACH combustion floor), kerosene/CO2 impact translation, and retrofit ranking complete
[2026-09-11 12:18] SPEC — single-branch trunk workflow adopted; all branch and PR references removed from brain files; branch hygiene rule added to 12_GITHUB_ACTIONS (see 17_DECISIONS D15)
[2026-09-11 12:20] SWAPNIL S0 — design tokens created in tokens.css, Tailwind config, /tokens specimen sheet (5d6550f)
[2026-09-11 12:22] SWAPNIL S1 — app shell, StepRail, persistent InputRail, weather toggle with grid_note (c6b5c66)
[2026-09-11 12:28] SWAPNIL S2 — compass control, multi-layer envelope builder, client-side validation per 07_API_CONTRACT.md (63cbca4)
[2026-09-11 12:32] SWAPNIL S3 — live cross-section SVG with scaled wall/roof/floor layers, snow drift, and sun glyph (354fe18)
[2026-09-11 12:37] SWAPNIL S4 — Recharts suite (TempChart, DeltaAmbient, DeltaDesign), LeversPanel, ValidationPanel, ParetoPlot, RetrofitList (d806ecf)
[2026-09-11 15:05] FEATURE 1 — Gagge two-node occupant thermoregulation model in engine/thermoregulation.py, wired into POST /simulate via occupant_model flag, PhysiologicalRiskPanel added to results UI
[2026-09-11 15:06] FEATURE 2 — Multi-post forward forecast early warning in engine/forecast_watch.py, POST /forecast_watch endpoint added with forecast_watch_cache SQLite persistence and WatchView UI component
[2026-09-11 15:15] VEDESH P0 — Platform backend asset management: schema extension (5 tables), 07A contract proposal, seed of 12 real evaluated sites (11 Ladakh + 1 Nepal Relief), estate aggregation with exact hand reconciliation, sortie estimation config, programme planner, alerts, and tests
[2026-09-11 15:20] VEDESH P1 — Platform shell, navigation, CommandPalette (Cmd+K), SidebarNav, TopBar, and tokens integration
[2026-09-11 15:25] VEDESH P2 — Site Registry & Post Hub: sortable sites table, custom SVG Himalayan pin-drop map, CSV import with multi-column error modal, Open-Meteo weather strip, heat loss breakdown, and /sites/:id/design handoff
[2026-09-11 15:28] VEDESH P3 — Estate Dashboard: aggregate strip with explicit coverage declaration ("across N of M sites"), Recharts district fuel exposure, temperature band distribution, worst-performing posts ranking
[2026-09-11 15:29] VEDESH P4 — Programme Planner: capital budget optimization, cumulative return curve with budget cutoff, ranked procurement table, CSV export
[2026-09-11 15:30] VEDESH P5 — Cold Snap Alerts: live Open-Meteo forecast scanning, severity tiers with estimate chips, occupant risk counts, acknowledge workflow
[2026-09-11 15:30] VEDESH P6 — Design Library: versioned standard drawings (Rapid Glamping, DIHAR Trombe), side-by-side comparison, and one-click site rollout with automatic re-evaluation
[2026-09-11 15:38] VEDESH P7 — Static & Ancillary Platform Pages: Editorial Engineering landing page (/), Seasonal Sortie Forecast (/forecast), Materials Availability (/materials), Formal Submission Pack Report (/reports/:id), Physics Formulation & Standards (/method), Empirical Validation Suite (/validation), and React Router wiring
[2026-09-11 15:45] FEATURE 3 — 365-day annual comfort scan in engine/annual_scan.py, fetch_nasa_power_year in api/weather.py with SQLite cache, POST /annual_scan endpoint in api/main.py, and AnnualComfortHeatmap UI component
```

---

## Contract changes

Any change to `07_API_CONTRACT.md` gets its own entry here with the reason and who approved it. Contract changes are the highest-risk edits in the project because three people build against it.

```
[2026-09-11 15:05] CONTRACT ADDITION — POST /simulate occupant_model optional fields and POST /forecast_watch endpoint added — approved for PS 26051 physiological risk & multi-post early warning
[2026-09-11 15:45] CONTRACT ADDITION — POST /annual_scan endpoint added for 365-day diurnal habitability calendar and worst-week evaluation

```

## Validation history

Every `validation.run` result gets logged here, pass or fail. Failures are as informative as passes and must not be deleted.

```
[2026-09-11 11:41] VALIDATION PASS — V1 DIHAR (16.04–18.38 °C), V2 Trombe (16.29 °C), V3 DG (15.01 °C), V4 ADM (18.88 °C). Ordering: Trombe > DG PASS.
```
