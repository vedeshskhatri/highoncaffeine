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
[2026-09-11 13:00] VEDESH — ANSYS reference model track established (D16); setup guide, canonical case configs, comparison script, and phases V7-V9 created
```

---

## Contract changes

Any change to `07_API_CONTRACT.md` gets its own entry here with the reason and who approved it. Contract changes are the highest-risk edits in the project because three people build against it.

## Validation history

Every `validation.run` result gets logged here, pass or fail. Failures are as informative as passes and must not be deleted.

```
[2026-09-11 11:41] VALIDATION PASS — V1 DIHAR (16.04–18.38 °C), V2 Trombe (16.29 °C), V3 DG (15.01 °C), V4 ADM (18.88 °C). Ordering: Trombe > DG PASS.
```
