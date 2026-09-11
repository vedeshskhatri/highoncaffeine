# 00 — MASTER RULES

**Every agent reads this file first, every session, before any other file.**
If a rule here conflicts with anything else, this file wins.

---

## 0. Project identity

| | |
|---|---|
| Project | **THERMA** — area-specific shelter design tool |
| Event | SIH 2026 internal round, PS **26051**, DRDO |
| Team | Vedesh (engine/optimizer), Aman (physics/validation), Aryan (backend/data), Swapnil (UI/UX) |
| Repo layout | `/engine` `/api` `/web` `/brain` `/data` `/tests` |

**One-line product definition — memorise it:**
> Other software grades a design you already picked. THERMA searches thousands and picks for you, then shows its working.

---

## 1. The eight hard rules

### R1 — Never invent a number
Every physical constant, material property, cost figure, or empirical coefficient must come from a cited source recorded in `05_DATA_SOURCES.md` or the `materials.source` column.

If you need a value you do not have, write:
```python
raise NotImplementedError("TODO(aman): k for rammed earth — need ASHRAE HoF cite")
```
**Do not guess. Do not use a "typical" value. Do not silently pick something plausible.**
A wrong number that looks right is the most expensive failure mode in this project.

### R2 — Never fake a return value
A stub returns `NotImplementedError` or an explicitly labelled fixture from `/data/fixtures/`. A stub must never return plausible-looking computed output. If a function cannot do its job yet it must fail loudly.

Banned: `return 0.0  # placeholder`, `return {}  # TODO`, made-up example arrays.

### R3 — The API contract is frozen
`07_API_CONTRACT.md` is the single source of truth. If your work requires a contract change, **stop, do not edit it, report the need in your phase report.** Only Vedesh amends the contract, and only with a CHANGELOG entry.

### R4 — Stay in your lane
Each agent owns specific paths (§3). Do not edit files outside your ownership. If you need a change in someone else's file, note it in your phase report as a blocker.

### R5 — No new dependencies without approval
The dependency list in `02_TRD.md` is closed. Adding a library requires a `17_DECISIONS.md` entry and Vedesh's approval. This is not bureaucracy — every new package is a new way for the build to break at hour 20.

### R6 — Read before you write
Before implementing anything, read the brain files listed at the top of your phase prompt. If your implementation contradicts a brain file, the brain file is right and you stop and report.

### R7 — Every phase ends with a report
No exceptions. Format in §4. A phase without a report is not complete, regardless of whether the code works.

### R8 — Uncertainty is stated, never hidden
If you are unsure whether something is correct, say so in the report under DEVIATIONS. A flagged uncertainty costs ten minutes. A hidden one costs the project.

---

## 2. Anti-hallucination protocol

These exist because AI agents fail in specific, predictable ways on this project.

**Before writing any physics code**, restate in your own words in the report:
- Which equation you are implementing
- Which brain file section defines it
- What the units are on every term

**When you cannot find something**, the correct action is to report it missing. It is never to construct something reasonable. Examples of banned behaviour:
- Inventing a material's thermal conductivity because it "should be around 0.8"
- Writing a solar position algorithm from memory instead of the named one
- Adding an API field the contract doesn't define
- Assuming a file exists that you have not read
- Filling a validation target with a number you did not read from `10_VALIDATION.md`

**When output looks right but you did not verify it**, say so. "Plausible" is not "verified."

**Sign check discipline.** Every heat flow term has a direction. After implementing any `Q_` term, state in the report: positive means heat entering the indoor air node, or leaving. Then confirm the sign in code matches.

**Unit check discipline.** State units on every quantity in the report. W, W/m²K, J/kg·K, kg/m³, m, s, K vs °C. Kelvin/Celsius confusion in the radiation term is the single most likely bug in this build.

---

## 3. Ownership map

| Path | Owner | Others may |
|---|---|---|
| `/engine/**` | **Vedesh** | read only |
| `/engine/physics_constants.py` | **Aman** | Vedesh reads |
| `/engine/materials.py`, `/data/materials.csv` | **Aman** | all read |
| `/tests/**` | **Aman** | all read |
| `/validation/**` | **Aman** | all read |
| `/api/**` | **Aryan** | Vedesh reviews contract compliance |
| `/data/weather/**` | **Aryan** | all read |
| `/web/**` | **Swapnil** | Aryan may add components in `/web/src/components/results/` from phase R4 |
| `/web/src/tokens.css`, `tailwind.config.js` | **Swapnil** | nobody else, ever |
| `/brain/07_API_CONTRACT.md` | **Vedesh** | all read |
| `/brain/16_CHANGELOG.md` | all append | never edit others' entries |

---

## 4. Phase report format — mandatory

Every phase ends by emitting exactly this block. Fill every section. Do not omit sections that are empty — write "None."

```markdown
## PHASE REPORT — <AGENT> / Phase <N>: <name>

### 1. PLANNED (restated from the prompt, in my own words)
- …
- …

### 2. FILES TOUCHED
| File | Created/Modified | Lines | Purpose |
|---|---|---|---|

### 3. DONE
- [x] <item> → `path/file.py:L42-L88`
- [ ] <item> — NOT DONE, reason:

### 4. VERIFICATION — did we get it right?
| # | Check | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | | | | ✅/❌ |

Commands run to verify:
```
$ pytest tests/test_x.py -v
<paste actual output, not a summary>
```

### 5. ASSUMPTIONS I MADE
Anything I decided that was not specified. If none, write "None."

### 6. NUMBERS I USED AND WHERE THEY CAME FROM
| Value | Used for | Source |
|---|---|---|
(Any row with source "assumed" or "typical" is a RULE VIOLATION — flag it.)

### 7. DEVIATIONS FROM THE PLAN
What I did differently and why.

### 8. BLOCKERS / NEEDED FROM OTHERS
Who, what, why blocking.

### 9. WHAT I DID *NOT* VERIFY
Be honest. This section is more valuable than section 4.

### 10. NEXT PHASE READY? YES / NO
If NO: what must happen first.
```

---

## 5. Definition of done, per phase

A phase is done when **all** of these hold:

1. Code runs without exception on the happy path
2. Every new function has a docstring stating units on inputs and outputs
3. No `TODO` left that blocks the next phase (non-blocking TODOs are fine and must be listed)
4. Phase report emitted, all ten sections filled
5. Committed on your own branch with a message referencing the phase (`V2: multi-layer wall discretisation`)
6. Verification commands were actually run and actual output pasted — not described

---

## 6. Git rules

- `main` is protected. Nobody pushes directly.
- Branch naming: `feat/<name>-p<phase>` e.g. `feat/vedesh-p2`
- One PR per phase. Reviewed by one other person. Rotate reviewers.
- Commit small and often. A single 2,000-line commit at hour 20 is a scoring deduction and a review impossibility.
- Pair work uses `Co-authored-by:` trailers.
- **Everyone must have real commits.** The contribution graph is visible and is scored.

---

## 7. Escalation

Stop and report immediately, do not work around, if:
- The API contract doesn't cover what you need
- A physical value is missing and you cannot source it
- A validation target is missed by more than the tolerance in `10_VALIDATION.md`
- You need a dependency that isn't in `02_TRD.md`
- Something in the brain folder is wrong or contradicts itself

**Working around a blocker silently is worse than being blocked.**
