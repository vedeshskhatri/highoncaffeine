# 13 — TESTING

**Owner: Aman.** `/tests/**`.

## 1. Philosophy

We are not chasing coverage. We are testing the handful of things that, if wrong, make every downstream number wrong. Ten physics tests matter more than two hundred unit tests.

## 2. Test files

```
tests/
  test_physics_sanity.py     the 10 checks from 10_VALIDATION.md §6
  test_discretise.py         Fourier sizing, node counts, padding
  test_vectorise.py          equivalence + padding inertness
  test_materials.py          every row has a source; loader raises without one
  test_api_contract.py       responses match 07_API_CONTRACT.md shapes
  test_csv_ingest.py         malformed CSV produces column-level errors
  test_safety.py             interlock fires correctly, refusal is 200
```

## 3. The physics tests — highest value

Full list and expectations in `10_VALIDATION.md` §6. The three that earn their keep:

**Test 3 (window symmetry)** catches sign errors. Increase glazing: daytime gain must rise **and** nighttime loss must rise. If only one moves, a sign is backwards. This is the cheapest sign-error detector available.

**Test 6 (vectorisation equivalence)** gates the optimizer. One design through both paths must match to floating-point tolerance. Without this, the optimizer can ship confidently wrong results that no other test catches.

**Test 7 (padding inertness)** — padded nodes must contribute exactly zero to every flow. Silent leakage through padding is the nastiest bug available in this architecture, because it scales with how many designs you run and only appears in batch mode.

## 4. Fixtures

`/data/fixtures/`, every file **explicitly labelled** as a fixture:
```
fixture_constant_weather_minus20.csv
fixture_leh_clear_january.csv
fixture_shelter_baseline.json
```
Fixtures are never used as fallbacks in production paths (Rule R2). A fixture appearing in a real response is a bug.

## 5. Running

```bash
pytest tests/ -v                     # all
pytest tests/test_physics_sanity.py -v
python -m validation.run             # the four scenarios
python -m validation.run --check     # exit 1 on any fail — CI uses this
```

## 6. Reporting

In every phase report, **paste actual test output**, not a description of it. "All tests pass" is not evidence. The terminal output is.

## 7. Manual checks before freeze

| Check | How |
|---|---|
| Offline operation | disconnect network, reload, run a simulation |
| Responsive | real phone via ngrok, 390 px |
| Rejected input | enter a negative wall thickness, confirm inline error |
| Refusal path | 0.3 ACH + unflued heater, confirm RefusalCard not a crash |
| Demo | full 90-second run, three times, stopwatch |
