# 12 — GIT AND CI

## 1. Single branch

- There is ONE branch: `main`. No other branch is ever created.
- Nobody creates a branch. Nobody opens a pull request. Nobody forks.
- Every agent commits and pushes DIRECTLY to `main`.
- Push at the END OF EVERY PHASE, without exception. A phase is not complete until its work is pushed to `main`.
- Before every push, in this order:
    1. `git pull --rebase origin main`
    2. resolve any conflict — never force-push, never `git push -f`
    3. run the tests that exist for your area
    4. `git push origin main`
- Because there is no PR review, a broken `main` blocks the whole team. Do not push code that does not run. If your work is incomplete at the end of a phase, push it in a state that IMPORTS and RUNS, with unfinished functions raising NotImplementedError — never a broken import and never a syntax error.
- Commit message format is unchanged: `<AGENT><PHASE>: <what>` (e.g. `V2: multi-layer wall discretisation with Fourier sizing`).
- Commit small and often within a phase. Push at least once per phase.
- Pair work still uses `Co-authored-by:` trailers.
- Every team member must have their own commits. The contribution graph is scored. Nobody commits on behalf of anyone else.
- Ownership boundaries from 00_MASTER_RULES.md section 3 STILL APPLY. A single branch does not mean shared ownership. Editing someone else's files is still a rule violation — it is now just easier to do by accident, so be more careful, not less.

## 2. Commit messages

```
<AGENT><PHASE>: <what>

V2: multi-layer wall discretisation with Fourier sizing
A1: sky temperature + altitude air density in physics_constants
R2: Open-Meteo fetch with SQLite cache and offline fallback
S0: design tokens, Montserrat/DM Sans/JetBrains Mono wired
```

Small and often within a phase. Push at least once per phase. A single 2,000-line commit at hour 20 is a scoring deduction.

Pair work uses `Co-authored-by: Name <email>` trailers.

## 3. Contribution requirement — this is scored

The evaluation criteria explicitly penalise one person managing the repo. **Every member must have substantive commits across multiple phases.** The graph is visible.

Check before freeze:
```bash
git shortlog -sn --all
```
If the distribution is wildly lopsided, that is a problem to fix before submission, not after.

## 4. CI — deliberately minimal

`.github/workflows/ci.yml`, runs on push to main:

```yaml
- python -m pytest tests/ -v
- python -m validation.run --check      # must pass all targets + ordering
- cd web && npm run build               # must compile
```

Nothing else. No linting gates, no coverage thresholds, no deployment. CI exists to stop a broken engine reaching main, not to be impressive.

Because CI runs after the push rather than before the merge, a red CI means someone must fix `main` immediately — it is now everyone's problem, not one PR author's. If `validation.run --check` fails, `main` is broken and must be fixed immediately.

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
