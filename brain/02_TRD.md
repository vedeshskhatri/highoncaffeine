# 02 — TECHNICAL REQUIREMENTS

## 1. Stack — closed list

| Layer | Choice | Version |
|---|---|---|
| Engine | Python + NumPy | 3.11+, numpy 1.26+ |
| Fallback integrator | SciPy | 1.11+ |
| API | FastAPI + Pydantic v2 | fastapi 0.110+ |
| Server | uvicorn | — |
| DB | SQLite via stdlib `sqlite3` | — |
| HTTP client | httpx | — |
| Frontend | React + Vite | react 18, vite 5 |
| Styling | Tailwind | 3.4 |
| Charts | Recharts | 2.x |
| Tests | pytest | — |
| Reference model | ANSYS Transient Thermal (Mechanical) | 2023 R2+ Student (offline reference, not a runtime dependency) |

**Nothing else.** No ORM, no Docker, no Redis, no Celery, no state library, no component library, no PDF library, no 3D library. The application has strictly **no ANSYS dependency at run time** — ANSYS is used exclusively offline as a high-fidelity reference benchmark for validation. Adding anything requires a `17_DECISIONS.md` entry and Vedesh's sign-off.

### Explicitly rejected / reclassified, with reasons — do not reopen

| Technology | Status / Reason |
|---|---|
| ANSYS as runtime engine | **Used as reference, not as the product engine.** Finding the most efficient combination of materials, shape, and size requires evaluating thousands of designs; ANSYS structurally cannot search a design space in seconds. ANSYS is used offline as the high-fidelity benchmark to validate our fast Python surrogate against. |
| PostgreSQL | Three tables. Setup friction across four machines exceeds any benefit. SQLite is a file, committed to the repo, identical for everyone. |
| Prisma | Node/TS ORM; engine must be Python for NumPy vectorisation. Forces a second service or an unmaintained Python client. |
| Any ORM | Three tables. Raw `sqlite3` + thin `db.py` is ~40 lines. Typed models live in Pydantic. |
| Docker | Existed only to host Postgres. No Postgres, no need. Containerising app processes costs hot-reload. |
| Streamlit | Cannot deliver consistent colour scheme, real navigation, or responsive layout — three scored must-haves. |
| PDF export | Build risk. Clipboard copy does the same job in ten lines. |
| ngrok for demo | Free URLs rotate on restart and free tunnels show an interstitial page. Dev-only, for phone testing. Demo on localhost. |

## 2. Repository layout

```
/brain              specs (this folder) — read-only during implementation
/engine
  solver.py         transient RC network solver          [Vedesh]
  discretise.py     layer → node splitting, Fourier       [Vedesh]
  vectorise.py      multi-design array packing            [Vedesh]
  optimizer.py      search, Pareto, ranking               [Vedesh]
  sensitivity.py    Morris screening                      [Vedesh]
  physics_constants.py  sky temp, air density, solar geom [Aman]
  materials.py      loader + lookup                       [Aman]
  impact.py         kerosene / rupees / CO2               [Aman]
  safety.py         ventilation interlock                 [Aman]
/api
  main.py           FastAPI app                           [Aryan]
  schemas.py        Pydantic models                       [Aryan]
  db.py             sqlite helpers                        [Aryan]
  weather.py        Open-Meteo + NASA POWER + cache       [Aryan]
  csv_ingest.py     user-pasted data                      [Aryan]
/web
  src/tokens.css    design tokens                         [Swapnil]
  tailwind.config.js                                      [Swapnil]
  src/components/**                                       [Swapnil]
  src/components/results/**                        [Swapnil + Aryan from R4]
/data
  therma.db         committed SQLite file
  materials.csv     source of truth for seeding
  fixtures/         labelled test fixtures
  weather/          cached + fallback CSV
/validation         scenario configs + committed results  [Aman]
/tests                                                    [Aman]
```

## 3. Engine technical requirements

### T-1 Node structure
Surfaces are discretised into multiple capacitance nodes. Node count per layer is set by the Fourier stability criterion:
```
alpha = k / (rho * Cp)            [m^2/s]
Fo    = alpha * dt / dx^2
require Fo <= 0.5, target ~0.25   ->  dx = sqrt(alpha * dt / 0.25)
```

### T-2 Glazing
Modelled as **pure resistance, zero capacitance.** Glass has negligible thermal mass and its time constant would force an impractically small timestep. This is standard practice and must be stated in Q&A.

### T-3 Timestep
Internal 60 s, output aggregated hourly. Explicit forward Euler. If instability appears, fall back to `scipy.integrate.solve_ivp` with `method='Radau'`.

### T-4 Radiation linearisation
`T^4` is linearised per timestep using the previous step's surface temperature:
```
h_r = eps * sigma * (T_s^2 + T_sky^2) * (T_s + T_sky)     [W/m^2K, T in Kelvin]
Q   = h_r * A * (T_s - T_sky)
```
Recomputed each step. No inner iteration to convergence.

### T-5 Spin-up
**3 days of repeated driving weather, discarded.** Only the final 24 h is reported. Without this, output is dominated by discharge from an arbitrary initial state and validation will fail for reasons that are not bugs.

### T-6 Vectorisation
All designs are evaluated simultaneously as columns of arrays shaped `(n_nodes, n_designs)`.

**Critical constraint:** this requires a *fixed* node count across designs. Designs with fewer layers are padded with zero-conductance placeholder nodes. `MAX_NODES` is a module constant.

A per-design loop is a specification violation — it makes NFR-2 unachievable.

### T-7 Vectorisation equivalence test
Before the optimizer is trusted, a single design run through the vectorised path must match the single-design path to within floating-point tolerance. This is a hard gate.

### T-8 Units
- Internal computation: **Kelvin** everywhere
- API and UI: **Celsius**
- Conversion at boundaries only, in one place
- Every function docstring states units on all inputs and outputs

## 4. Performance budget

| Operation | Budget |
|---|---|
| One design, 24 h, 60 s steps, incl. 3-day spin-up | < 300 ms |
| 3,000 designs vectorised | < 8 s |
| Morris screening, ~200 runs | < 2 s |
| Weather fetch, cached | < 50 ms |

## 5. Offline requirement

After first successful weather fetch everything works with no network. Cache in SQLite. Ship `/data/weather/leh_january_fallback.csv` as a last resort. The demo runs on localhost with the network disconnected as a rehearsal check.

## 6. Setup contract

```bash
# terminal 1
pip install -r requirements.txt && uvicorn api.main:app --reload
# terminal 2
cd web && npm install && npm run dev
```
Two commands. If setup grows beyond this, that is a bug.
