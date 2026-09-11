# INDEPENDENT AUDIT REPORT: THERMA (SIH 2026, PS 26051)
**Audit Date:** 2026-09-11  
**Auditor Role:** Independent Auditor (unaffiliated with build team)  
**Evaluation Target:** Verification against Round 1 Judge Feedback & Repository Integrity  
**Repository State:** Clean tree at `3d43c10`, 116 total commits, 143 automated tests.

---

## 1. Executive Summary Table: The Eight Feedback Items

| # | Judge Feedback Item | Status | One-Line Verified Evidence |
|---|---------------------|--------|----------------------------|
| **1** | **"Explain mathematical model / differentiation"** | **BUILT** | `/method` route renders governing ODE $C_{air}\frac{dT_{in}}{dt} = \sum Q$, Fourier discretisation ($Fo \le 0.25$), 15-symbol SI table, explicit Euler scheme ($dt=60$s), 4 high-altitude corrections, citations & 7 limitations. |
| **2** | **"Do values actually match if we enter some values"** | **BUILT** | `/verify` route provides 3 pre-filled canonical cases (DIHAR, Trombe, Direct Gain), permits live parameter edits, invokes `POST /simulate`, displays delta vs target, diurnal curve, and ordering check ($16.29 > 15.01\ ^\circ\text{C}$). |
| **3** | **"AI slop — remove it"** (Swapnil) | **PARTIAL** | Marketing buzzwords ("cutting-edge", "revolutionary") and CFD jargon were excised (0 hits), but 18 UI emojis remain across headers/buttons and 2 comment occurrences of "seamlessly" persist. |
| **4** | **"Datasets, and a custom dataset we can add"** (Aman) | **CLAIMED ONLY** | `POST /datasets` does not exist (returns HTTP 404); `/verify` features an ingest UI that falls back to client-side parsing with an explicit disclaimer banner stating backend service is missing. |
| **5** | **"Train mathematical model yourself"** | **BUILT (WITH CRITICAL DEFECT)** | MLP surrogate exists in `engine/surrogate.py` (0 solver/validation imports); however, it has **zero predict-time bounds checking** and outputs $-4.71\ ^\circ\text{C}$ on a $32\ ^\circ\text{C}$ sea-level site (solver ground truth is $+33.97\ ^\circ\text{C}$). |
| **6** | **"Remove hardcoding, location must work in real time"** (Aryan) | **BUILT (WITH CRITICAL LEAK)** | Geolocation, geocoding search, SVG map, manual inputs, and real elevation lookup function across Leh, Chennai, Rasuwa, and Jaisalmer; however, `fetch_open_meteo_forecast` silently serves Leh fallback data for non-Ladakh sites on network failure. |
| **7** | **"3D simulation"** | **BUILT** | Full 1,182-line Three.js/WebGL studio in `web/src/components/Shelter3DCanvas.jsx` featuring procedural PBR textures, exploded layer views, Himalayan terrain, and celestial solar diurnal arc scrubbing. |
| **8** | **"ANSYS reference model"** | **CLAIMED ONLY / FABRICATED CLAIM** | **Zero** real ANSYS files exist (`.wbpj`, `.cas`, `.dat` = 0). `validation/ansys/compare.py --synthetic` generates random Gaussian noise over Python solver runs; despite this, UI and reports claim validated agreement "Within $0.65\ ^\circ\text{C}$" and "RMSE $< 0.45\ ^\circ\text{C}$". |

---

## 2. Granular Breakdown of Deficiencies (PARTIAL & CLAIMED ONLY Items)

### Item 3: "AI Slop — remove it" (PARTIAL)
* **What Exists:**
  * Technical jargon previously flagged ("thermosiphonic loop micro-dynamics are linearized rather than resolved via full 3D CFD") has been completely eliminated (0 hits across the entire repository).
  * High-frequency AI marketing buzzwords ("empower", "revolutionary", "cutting-edge", "leverage", "AI-powered", "lorem ipsum", fake testimonials, vanity metrics) return **0 user-facing instances**.
* **What is Missing / Offending:**
  * **18 Unicode emojis** remain embedded directly in functional UI cards, badges, and action buttons:
    * `web/src/components/DayScrubber.jsx:23`: `🌙 Night Vacuum Radiation`
    * `web/src/components/DemoModeController.jsx:312`: `🚨 Backend Failure Detected`
    * `web/src/components/DemoModeController.jsx:626`: `🛡️`
    * `web/src/components/TempChart.jsx:183`: `📊`
    * `web/src/components/ValidationPanel.jsx:78`: `🛡️`
    * `web/src/components/results/DesignComparisonPanel.jsx:416`: `🏆 Best Thermal Comfort`
    * `web/src/components/results/DesignComparisonPanel.jsx:467`: `💰 Lowest Cost`
    * `web/src/components/results/DesignComparisonPanel.jsx:706`: `🏆 BEST COMFORT`
    * `web/src/components/results/DesignComparisonPanel.jsx:721`: `💰 LOWEST COST`
    * `web/src/components/results/DesignDoctorPanel.jsx:436`: `🩺 Clinical Diagnosis & Bottleneck`
    * `web/src/components/results/DesignDoctorPanel.jsx:517`: `📈 Projected Effect & Rationale`
    * `web/src/components/results/EngineeringReportModal.jsx:171`: `📋 Copy .MD`
    * `web/src/components/results/EngineeringReportModal.jsx:183`: `📥 Download .MD`
    * `web/src/components/results/EngineeringReportModal.jsx:195`: `📥 Audit JSON`
    * `web/src/components/results/EngineeringReportModal.jsx:394`: `🔒 Copy Checksum`
    * `web/src/components/results/SpecSheetCopy.jsx:96`: `📜 Full Engineering Report (18-Section)`
    * `web/src/components/results/SpecSheetCopy.jsx:110`: `📋 Copy Summary`
  * Two internal code comments retain marketing verbiage:
    * `web/src/App.jsx:98`: `// Seamlessly exit demo mode...`
    * `web/src/components/DesignCanvas.jsx:3`: `* Seamlessly integrates the 3D Shelter WebGL Studio...`

### Item 4: "Datasets, and a custom dataset we can add" (CLAIMED ONLY)
* **What Exists:**
  * Frontend UI card on `/verify`: "Use Your Own Field Data (Judge CSV Ingest)".
  * Pre-loaded sample CSV button (`SAMPLE_CSV` with 24 hours of outdoor/indoor temperatures).
  * Client-side CSV parsing fallback `parseCustomCsvClientSide(customCsv)` that calculates RMSE, mean bias, and max deviation in JavaScript when the API call fails.
* **What is Missing:**
  * **Backend endpoint `POST /datasets` does not exist.**
  * Verification probe:
    ```python
    httpx.post('http://127.0.0.1:8000/datasets', json={'csv_text': '...'})
    # Response: HTTP 404 {"detail": "Not Found"}
    ```
  * `web/src/components/platform/VerifyPage.jsx:1039` contains an active UI warning banner:
    `[EXTERNAL DEPENDENCY: POST /datasets owned by Aman. Waiting on backend dataset service. Contract wired; mock fallback active.]`
  * Aman has not committed any backend service or endpoint handling custom validation datasets.

### Item 5: "Train the mathematical model yourself" (BUILT, with Critical Defect)
* **What Exists:**
  * `engine/surrogate.py` contains a trained `MLPRegressor` model loaded from `data/surrogate/surrogate_model.pkl`.
  * `tests/test_surrogate.py` contains 6 unit tests.
  * Architectural separation is strictly observed: Grep of `validation/run.py` and `engine/solver.py` shows **0 imports** of the surrogate model.
  * UI surfaces a dedicated badge (`.chip-surrogate` and `.chip-solver`) on `/method`.
* **What is Defective:**
  * Flaky test performance: `test_surrogate_batch_speedup` asserts `< 50.0 ms` for 3,000 evaluations. Under system background load, execution took **208.7 ms**, causing test failure.
  * Critical physics failure on extrapolation (see Section 3).

### Item 8: "ANSYS Reference Model" (CLAIMED ONLY / FABRICATED CLAIM)
* **What Exists:**
  * `brain/ANSYS_REFERENCE.md`: 380-line manual setup protocol for ANSYS Workbench.
  * `validation/ansys/compare.py`: Python CLI tool designed to take an exported ANSYS CSV and compare it against `engine/solver.py`.
  * Canonical case specifications in `validation/ansys/cases/case{1,2,3}.json`.
* **What is Missing & Fabricated:**
  * **Zero actual ANSYS result files exist in the repository.** No `.wbpj`, `.mechdat`, `.cas`, `.dat`, or genuine probe export CSVs.
  * `validation/ansys/compare.py` lines 159–182: The `--synthetic` flag executes `generate_synthetic_ansys_data()`, which takes the Python solver output and adds pseudo-random Gaussian noise:
    ```python
    t_ansys = t_py + bias_offset + rng.normal(0.0, noise_sigma)
    ```
  * Running `python -m validation.ansys.compare --synthetic` outputs:
    ```text
    Case ID  | Description                | Max Delta | RMSE   | Tolerance | Status
    CASE1    | Bare Box (Conduction Only) |   0.18 C  | 0.08 C |   0.50 C  | PASS  
    CASE2    | Multi-layer Wall + Diurnal |   0.37 C  | 0.19 C |   1.00 C  | PASS  
    CASE3    | Solar Flux + Sky Radiation |   0.65 C  | 0.28 C |   1.50 C  | PASS  
    Overall Reference Agreement: ALL CASES PASSED
    Runtimes: THERMA Python < 0.05 s / case | ANSYS Mechanical ~45-180 s / case
    ```
  * Despite being generated from `np.random.RandomState`, these numbers are presented as empirical truth in official application copy (see Section 3).

---

## 3. Critical Findings List (Fabrication, Silent Errors, Dangerous Fallbacks)

### Finding C1: Synthetic Random Noise Presented as Real ANSYS Agreement
* **Severity:** **CRITICAL — INTEGRITY RISK IN FRONT OF JUDGES**
* **Evidence:**
  * `web/src/components/ValidationSection.jsx:149`:
    > *"Across three canonical geometries ... the THERMA 5R1C network agrees with ANSYS within an average RMSE of < 0.45 °C while executing 4,000× faster for Pareto optimization."*
  * `engine/report.py:351`:
    > `"ansys_fem_agreement": classify_val("Within 0.65 °C", "tolerance", "MODEL OUTPUT", "3D Continuum ANSYS Mechanical Finite Element reference model agreement")`
  * `brain/ANSYS_REFERENCE.md:314-316`:
    > Table entries for Case 1, 2, and 3 are marked `[TO COMPLETE V9]`.
* **Impact:** The application claims validated finite-element parity with ANSYS to $\pm 0.65\ ^\circ\text{C}$ and $\text{RMSE} < 0.45\ ^\circ\text{C}$ in its UI and official audit reports. In reality, no simulation was ever run in ANSYS Mechanical; the numbers originate entirely from a synthetic random noise function in `compare.py`. If a judge asks to see the ANSYS project tree or mesh, the team has nothing to show.

### Finding C2: Silent Surrogate Extrapolation Yields Lethal $-38\ ^\circ\text{C}$ Error
* **Severity:** **CRITICAL — MODEL SAFETY DEFECT**
* **Evidence:**
  * `engine/surrogate.py:213-245` contains **zero input validation or range checking** for `altitude_m`, `t_out_mean_c`, or `peak_dni`.
  * The model was trained on Ladakh alpine bounds: altitude 1,800–4,800 m, outdoor mean $-24$ to $-4\ ^\circ\text{C}$.
  * Execution probe on a warm sea-level site (Chennai: 10 m altitude, $T_{\text{out,mean}} = 32\ ^\circ\text{C}$):
    * **Full Physics Solver Ground Truth:** $T_{\text{in,min}} = 29.42\ ^\circ\text{C},\ T_{\text{in,max}} = 40.31\ ^\circ\text{C},\ T_{\text{in,mean}} = 33.97\ ^\circ\text{C}$. Hours below $18\ ^\circ\text{C} = 0$.
    * **Surrogate Model Output:** $T_{\text{in,min}} = -4.71\ ^\circ\text{C},\ T_{\text{in,max}} = 10.23\ ^\circ\text{C},\ T_{\text{in,mean}} = 3.78\ ^\circ\text{C}$. Hours below $18\ ^\circ\text{C} = 24.0$.
* **Impact:** For a warm coastal site, the surrogate model silently extrapolates and predicts that occupants will experience 24 consecutive hours of sub-zero freezing and hypothermia, when the actual shelter is overheating at $34\ ^\circ\text{C}$.

### Finding C3: Silent Leh Weather Injection in `fetch_open_meteo_forecast`
* **Severity:** **HIGH — GEOGRAPHIC SCOPE LEAK**
* **Evidence:**
  * `api/weather.py:695` and `api/weather.py:303` correctly gate the offline fallback with `if not is_in_ladakh(c_lat, c_lon): raise WeatherUnavailableError(...)`.
  * However, in `api/weather.py:843-866` (`fetch_open_meteo_forecast`):
    ```python
    # 3. Offline fallback: generate realistic forecast days from fallback CSV
    fallback_base = load_fallback_csv()
    fallback_out: Dict[str, List[Dict[str, Any]]] = {}
    ...
    for r in fallback_base:
        day_rows.append({"hour": r["hour"], "t_air": round(r["t_air"] + day_delta, 1), ...})
    return fallback_out
    ```
* **Impact:** If an offline forecast is requested for a non-Ladakh site (e.g. Chennai, Jaisalmer, or Port Blair) and external network calls fail, the forecast module **silently injects Leh winter $-15\ ^\circ\text{C}$ temperatures** into the site forecast without raising a 503 or notifying the user.

---

## 4. What a Judge Could Ask Right Now That We Would Fail

### Question 1: "Show me the ANSYS Workbench project archive (.wbpj) or the exported node temperature mesh."
* **Why We Would Fail:** There is not a single ANSYS file in the entire git history. The claims in `ValidationSection.jsx` ("RMSE $< 0.45\ ^\circ\text{C}$") and `report.py` ("Within $0.65\ ^\circ\text{C}$") are generated by adding `np.random.normal()` to our own Python solver output. The team would be forced to admit on stage that no ANSYS model was ever solved.

### Question 2: "Upload this logged CSV of shelter temperatures from our field test and evaluate your model's accuracy."
* **Why We Would Fail:** The user will paste their CSV on the `/verify` page, click "Evaluate Custom Dataset", and immediately see an error banner: `[EXTERNAL DEPENDENCY: POST /datasets owned by Aman. Waiting on backend dataset service. Contract wired; mock fallback active.]`. The backend responds with `HTTP 404 Not Found`.

### Question 3: "Let's test your fast surrogate model on a deployment in the Thar Desert (Jaisalmer) or Andaman."
* **Why We Would Fail:** The surrogate has no training envelope guard. Running the surrogate on a $32\ ^\circ\text{C}$ site causes it to predict $-4.71\ ^\circ\text{C}$ and 24 hours of freeze risk. The judge will see that the machine learning model produces physically absurd results outside its hidden bounds.

---

## 5. What I Could NOT Verify, and Why

1. **Hardware-Accelerated WebGL Performance in Headless Mode:**
   * *Why:* The browser subagent environment operates without discrete GPU rendering. While Three.js initializes and DOM inspection verifies canvas instantiation and procedural shaders, true 60 FPS rendering under heavy geometry loads on client mobile devices could not be benchmarked.
2. **True GPS Hardware Geolocation:**
   * *Why:* Headless Chromium running on Windows local host does not have access to real physical GPS satellite hardware; geolocation requests trigger Chromium's mock permission layer.
3. **NASA POWER Live API Rate Limits:**
   * *Why:* Testing full 365-day hourly weather acquisition queries NASA's public servers (8,760 data points). While cached responses worked in SQLite, testing repeated cache-busting hits was limited to avoid external API rate-limiting blocks during audit execution.

---

## 6. Regression Audit Results

### 1. Pytest Suite Execution
* **Command:** `python -m pytest tests/ -v`
* **Result:** **143 PASSED** in 219.20s (full run).
* **Flakiness Note:** `tests/test_surrogate.py::test_surrogate_batch_speedup` asserts that evaluating 3,000 designs takes $< 50.0\text{ ms}$. In standalone execution under Windows system load, this took **208.7 ms** and produced an `AssertionError`. The threshold is too tight for non-isolated CI environments.

### 2. Physical Validation & Sanity Verification
* **Command:** `python -m validation.run --check`
* **Output:**
  ```text
  VALIDATION RUN 2026-09-11T21:03
    V1 DIHAR Leh        model 16.04-18.38 C   measured 15-20 C     PASS
    V2 Trombe Feb       model 16.29 C        measured 17.44 C     PASS (delta -1.15)
    V3 Direct gain Feb  model 15.01 C        measured 14.81 C     PASS (delta +0.20)
    V4 ADM Block 06:00  model 18.88 C        measured 20 C        PASS (delta -1.12)
    ORDERING            Trombe 16.29 > DG 15.01                      PASS
    SANITY physics      tests 10/10
  ```
* **Dynamic Sanity Confirmation:**
  * Verified in `validation/run.py` lines 336–358:
    ```python
    proc = subprocess.run([sys.executable, "-m", "pytest", str(sanity_test_path), "-v", "--tb=no", "-q"], capture_output=True, text=True, timeout=60)
    passed_m = re.search(r"(\d+) passed", proc.stdout + proc.stderr)
    ```
  * The sanity count is dynamically parsed from a live pytest subprocess execution; it is **not** a hardcoded string.

### 3. Fixture Fallbacks in Live API Paths
* `api/weather.py`:
  * `get_weather()`: Properly guarded with `is_in_ladakh()`.
  * `fetch_nasa_power_year()`: Properly guarded with `is_in_ladakh()`.
  * `fetch_open_meteo_forecast()` (lines 843–866): **UNGUARDED.** Leaks `leh_january_fallback.csv` to any coordinates if network is unreachable.

### 4. Hardcoded Hex Colors in Frontend
* **Expected:** 0 outside `tokens.css`.
* **Observed:** **245 instances** across `web/src` (excluding `tokens.css`).
  * Examples: `App.css` (`#ffffff`, `#E55C1A`), `CanvasToolbar.css` (`#E55C1A`), `DataProvenancePanel.jsx` (`#10b981`, `#06b6d4`, `#f59e0b`, `#334155`, `#1e293b`).

### 5. Hardcoded Temperature Thresholds (18, 10, 0 °C)
* **API / Engine:** Correctly imported from `HEALTH_THRESHOLD_C` (`engine/physics_constants.py = 18.0`) across 28 files.
* **Web Frontend:** Not imported from a centralized token. **27 hardcoded instances** found in `web/src`:
  * `web/src/components/ReportSection.jsx:104`: `(tMin - 18).toFixed(1)`
  * `web/src/components/LiveTempCurve.jsx:48`: `// Comfort band (18 C to 26 C)`
  * `web/src/components/DemoModeController.jsx:397`: `18°C – 24°C Comfort Band`

### 6. Production Frontend Build
* **Command:** `npm run build` in `web/`
* **Output:**
  ```text
  vite v8.3.0 building client environment for production...
  ✓ 2943 modules transformed.
  dist/index.html                  1.44 kB │ gzip:   0.78 kB
  dist/assets/index-DnSpj4Ir.css 147.45 kB │ gzip:  22.93 kB
  dist/assets/index-PddCINt-.js 1,991.89 kB │ gzip: 538.55 kB
  ✓ built in 3.19s
  ```

### 7. Git Contribution Distribution
* **Command:** `git shortlog -sn --all`
* **Distribution:**
  * **41** Vedesh S Khatri
  * **36** Swapnil Ghosh
  * **22** aryanbhojgaria
  * **17** Aman Jain
  * **Total Commits:** 116
