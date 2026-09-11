# 12 — GIT AND CI

## 1. Branching

```
main                    protected, PR-only
feat/vedesh-p0 ... p6
feat/aman-p0   ... p4
feat/aryan-p0  ... p4
feat/swapnil-p0 ... p4
```

One branch per phase. One PR per phase. Reviewed by one other person. **Rotate reviewers** — Vedesh should not be the only approver.

## 2. Commit messages

```
<AGENT><PHASE>: <what>

V2: multi-layer wall discretisation with Fourier sizing
A1: sky temperature + altitude air density in physics_constants
R2: Open-Meteo fetch with SQLite cache and offline fallback
S0: design tokens, Montserrat/DM Sans/JetBrains Mono wired
```

Small and often. A single 2,000-line commit at hour 20 is a review impossibility and a scoring deduction.

Pair work uses `Co-authored-by: Name <email>` trailers.

## 3. Contribution requirement — this is scored

The evaluation criteria explicitly penalise one person managing the repo. **Every member must have substantive commits across multiple phases.** The graph is visible.

Check before freeze:
```bash
git shortlog -sn --all
```
If the distribution is wildly lopsided, that is a problem to fix before submission, not after.

## 4. CI — deliberately minimal

`.github/workflows/ci.yml`, runs on PR to main:

```yaml
- python -m pytest tests/ -v
- python -m validation.run --check      # must pass all targets + ordering
- cd web && npm run build               # must compile
```

Nothing else. No linting gates, no coverage thresholds, no deployment. CI exists to stop a broken engine reaching main, not to be impressive.

**If `validation.run --check` fails, the PR does not merge.** That is the whole point of having CI on this project.

## 5. What is committed

| Committed | Not committed |
|---|---|
| `/data/therma.db` | `node_modules/`, `__pycache__/` |
| `/data/materials.csv` | `.env` |
| `/data/weather/*fallback*.csv` | live weather cache beyond the fallback |
| `/validation/results/*.json` | build output |
| `/brain/**` | |

`therma.db` is committed deliberately so everyone has identical data with zero setup.

## 6. README — required before freeze

Setup in two commands, architecture diagram, brain folder index, team contribution section, and the honest limitations from `01_PRD.md` §9.
