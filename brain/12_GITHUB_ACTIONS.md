# 12 — GIT AND CI

## 1. Single branch — trunk based

- There is ONE branch: `main`. No other branch exists or is ever created.
- Nobody creates a branch. Nobody opens a pull request. Nobody forks.
- Everyone commits and pushes DIRECTLY to `main`.
- Push at the END OF EVERY PHASE. A phase is not complete until its work is pushed to `main`.
- Before every push, in this order:
    1. `git pull --rebase origin main`
    2. resolve any conflict. NEVER force-push. NEVER `git push -f`.
    3. run the tests that exist for your area
    4. `git push origin main`
- There is no PR review, so a broken `main` blocks everyone. Do not push code that does not run. If a phase ends with work unfinished, push it in a state that IMPORTS and RUNS, with unfinished functions raising NotImplementedError. Never a broken import. Never a syntax error.
- If you push something broken, say so in the team chat IMMEDIATELY. Silence plus a red CI is how an hour disappears.
- Commit message format unchanged: `<AGENT><PHASE>: <what>` (e.g. `V2: multi-layer wall discretisation with Fourier sizing`).
- Commit small and often within a phase; push at least once per phase.
- Pair work still uses `Co-authored-by:` trailers.
- Everyone pushes their OWN commits. Nobody commits on behalf of anyone else. The contribution graph is scored.
- Ownership boundaries from 00_MASTER_RULES.md section 3 STILL APPLY. One branch does not mean shared ownership — editing another agent's files is still a rule violation, and it is now easier to do by accident, so be more careful, not less.

### Branch hygiene & uncommitted work protection

The repository must contain exactly one branch: `main`.
If any agent finds another branch existing at any point, it is a mistake.
Do NOT delete it yourself — report it in section 8 of your phase report so a human can confirm it is merged before removal.

Verification command any agent may run (read-only, safe):
```bash
git branch -a
git branch --no-merged main
```
An agent may RUN these to check. An agent may never run `git branch -d`, `git branch -D`, or `git push origin --delete`.

**CRITICAL: Never discard uncommitted work silently.**
The agent must NEVER run `git restore`, `git checkout --`, `git clean`, or `git reset` without explicit human confirmation. Those commands discard uncommitted work silently (such as uncommitted database updates or scratch assets), and in a single-branch trunk workflow with no PR gate, there is no safety net to recover discarded work afterward.

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
