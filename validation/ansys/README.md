# ANSYS Reference Model Validation Track

This directory contains the canonical simulation cases and automated comparison tooling for validating the THERMA Python 5R1C solver against **ANSYS Mechanical Transient Thermal** (per Decision D16).

---

## Directory Structure

```
validation/ansys/
  cases/
    case1.json         # Case 1: Bare box, pure conduction & capacitance
    case2.json         # Case 2: Multi-layer envelope, diurnal temperature cycle
    case3.json         # Case 3: South solar heat flux + roof sky radiation
  results/
    ansys_case1_export.csv  # Real/exported CSV from ANSYS probe (when solved)
    ...
  plots/
    case1_overlay.png  # High-contrast time-series comparison plots
    case2_overlay.png
    case3_overlay.png
  compare.py           # Automated time-alignment and metrics calculator
  README.md            # This guide
```

---

## Quick Start

### 1. Test the Comparison Pipeline (Synthetic Mode)
To test the pipeline and generate overlay plots without waiting for an ANSYS solve:
```bash
python -m validation.ansys.compare --synthetic
```

### 2. Compare Real ANSYS Exported Results
After running ANSYS Workbench per [brain/ANSYS_REFERENCE.md](../../brain/ANSYS_REFERENCE.md) and exporting the probe CSV:
```bash
# Compare a single case against an exported CSV
python -m validation.ansys.compare --case case1 --ansys-csv validation/ansys/results/my_ansys_case1.csv

# Run all cases (looks for ansys_case1_export.csv, ansys_case2_export.csv, etc.)
python -m validation.ansys.compare
```

---

## Agreement Targets & Tolerances

| Case | Primary Physical Mechanism | Max Allowed $\Delta T$ | Target RMSE |
|---|---|---|---|
| **Case 1** | 1D RC vs 3D continuum FEM conduction & storage | $\le 0.50\ ^\circ\text{C}$ | $\le 0.30\ ^\circ\text{C}$ |
| **Case 2** | Dynamic Fourier multi-layer node splitting & lag | $\le 1.00\ ^\circ\text{C}$ | $\le 0.60\ ^\circ\text{C}$ |
| **Case 3** | Radiative sub-cooling & surface flux coupling | $\le 1.50\ ^\circ\text{C}$ | $\le 0.90\ ^\circ\text{C}$ |

`compare.py` exits with code `0` if all cases are within tolerance, or code `1` if any case exceeds the maximum deviation.

---

## Troubleshooting: What to Do When a Case Fails

If `compare.py` reports `FAIL` (deviation exceeds tolerance), follow this diagnosis tree from [brain/ANSYS_REFERENCE.md](../../brain/ANSYS_REFERENCE.md) Section 7:

1. **Case 1 Fails ($> 0.50\ ^\circ\text{C}$):**
   - Check film coefficients: Verify $h_e = 25.0\text{ W/m}^2\text{K}$ and $h_i = 7.692\text{ W/m}^2\text{K}$ in both ANSYS and Python.
   - Check material properties: Ensure `mud_brick` uses $k=0.75\text{ W/m}\cdot\text{K}$, $\rho=1700\text{ kg/m}^3$, $C_p=880\text{ J/kg}\cdot\text{K}$ (Rule R1: sourced from `data/materials.csv`).
   - Check initial temperature: Confirm both models start at uniform $+20.0\ ^\circ\text{C}$.

2. **Case 2 Fails but Case 1 Passes:**
   - Discretization error: In Python, verify Fourier number target $Fo = \alpha \Delta t / \Delta x^2 \le 0.25$ in `engine/discretise.py`. Too few nodes in thin layers (EPS) creates artificial numerical damping.
   - Contact resistance: In ANSYS, confirm the interface between mud brick and EPS is **Bonded** with zero contact thermal resistance.
   - Boundary condition timing: Verify the 24-hour sinusoidal weather table has identical phase (minimum at 03:00, maximum at 15:00).

3. **Case 3 Fails but Cases 1 and 2 Pass:**
   - Sky radiation: In Python, $h_r$ is linearised at each timestep. Ensure ANSYS Radiation is scoped strictly to the roof exterior face with emissivity $\epsilon = 0.90$.
   - Solar flux: Verify that the heat flux applied to the South wall in ANSYS was multiplied by the surface absorptivity ($\alpha = 0.70$), matching Python's absorbed flux.
   - Temperature units: Confirm Kelvin was used in all radiation expressions.
