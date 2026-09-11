# brain/ — THERMA specification set

SIH 2026 · PS 26051 · DRDO · Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance

**Read `00_MASTER_RULES.md` first, every session, before anything else.**

## Index

| File | What it is | Read before |
|---|---|---|
| `00_MASTER_RULES.md` | The eight hard rules, anti-hallucination protocol, ownership map, **phase report format** | everything |
| `01_PRD.md` | Problem, users, functional requirements, success criteria, honest limitations | any feature work |
| `02_TRD.md` | Stack (closed list), repo layout, engine technical requirements, rejected choices | any code |
| `03_ARCHITECTURE.md` | Layer diagram, request flows, module dependency rules | any code |
| `04_DATA_MODEL.md` | SQLite schema, in-memory structures, NodeArray padding | data or engine work |
| `05_DATA_SOURCES.md` | Every permitted source. **Rule R1 lives here** | any number |
| `06_PHYSICS_SPEC.md` | Authoritative equations, build order, known failure modes | any solver code |
| `07_API_CONTRACT.md` | **FROZEN.** Owner Vedesh | any API or UI work |
| `08_UI_SPEC.md` | Design direction, fonts, palette, component specs | any frontend work |
| `09_ERROR_HANDLING.md` | Exceptions, fallback chain, what not to do | any code |
| `10_VALIDATION.md` | **Gate 3.** Targets, ordering requirement, debug order, sanity tests | validation work |
| `11_OPTIMIZER_SPEC.md` | Search, Pareto, Morris, retrofit ranking | optimizer work |
| `12_GITHUB_ACTIONS.md` | Single branch, commits, CI | from day one |
| `13_TESTING.md` | Test files, the three that matter, manual checks | test work |
| `14_DEMO_CHECKLIST.md` | Pre-flight, the eight beats, cut rules, Nepal guidance | before the demo |
| `15_MICROTASKS.md` | Flat checklist across all phases | progress tracking |
| `16_CHANGELOG.md` | Append-only log | after every phase |
| `17_DECISIONS.md` | Architectural decision record | when a decision is questioned |

## prompts/

Phase-by-phase Antigravity prompts, one file per person.

| File | Phases |
|---|---|
| `VEDESH_PHASES.md` | V0 skeleton · V1 single-node · V2 discretisation · V3 solar+infiltration · V4 **sky radiation (Gate 2)** · V5 **vectorisation (gates optimizer)** · V6 optimizer |
| `AMAN_PHASES.md` | A0 materials · A1 physics constants · A2 sanity tests · A3 **validation (Gate 3)** · A4 safety+impact+retrofit |
| `ARYAN_PHASES.md` | R0 **API stubs (unblocks Swapnil)** · R1 database · R2 weather · R3 worst-night+CSV · R4 results components |
| `SWAPNIL_PHASES.md` | S0 **tokens (blocks everyone)** · S1 shell · S2 inputs · S3 cross-section · S4 charts |
| `VRITIKA_PHASES.md` | VR0 material research · VR1 validation sources · VR2 cost data + ACH floor · VR3 **source audit before freeze** |
| `SURBHI_PHASES.md` | SU0 slides 1/2/6 · SU1 Q&A drilling · SU2 demo ops + backup · SU3 slides 3-5 + README + user test |

**Paste one phase at a time.** Wait for the phase report. Read sections 4, 6 and 9 yourself before pasting the next one.

## Reject a phase report if

- any of the ten sections is missing
- section 6 contains a value sourced "assumed", "typical", or "standard"
- section 4 describes verification instead of pasting actual output
- section 9 says "nothing" — there is always something unverified
- the phase claims done while its stated gate has not passed

## Critical path

```
Vedesh V0 (contract)  ->  Aryan R0 (stubs)  ->  Swapnil S0..S4
                      ->  Vedesh V1..V5     ->  Aman A3 (GATE 3)  ->  Vedesh V6
                      ->  Aman A0, A1       ->  (feeds V3, V4)

Vritika VR0/VR1/VR2 run in parallel from hour zero and feed Aman A0/A1/A4.
Surbhi SU0/SU1 run in parallel from hour zero; SU2/SU3 need a running build.
```

All work proceeds directly on `main` (single-branch policy); every phase ends with `git pull --rebase origin main`, tests, and push.
Nothing is built on top of an unvalidated engine. Gate 3 first.

## Provisional items

- **Colour palette** — placeholder values in `08_UI_SPEC.md` §3. No component hardcodes a colour, so the swap is one file.
- **Google Sans** — not publicly licensed for web. DM Sans substituted. One variable in `tokens.css`.
