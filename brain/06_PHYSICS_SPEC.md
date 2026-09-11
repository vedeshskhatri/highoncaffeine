# 06 — PHYSICS SPEC

**Authoritative.** If code and this file disagree, this file is right. Read fully before implementing any solver code.

Internal computation in **Kelvin**. Conversion to Celsius happens only at the API boundary.

## 1. Governing equation

Indoor air node:
```
C_air * dT_in/dt = Q_solar + Q_internal - Q_cond - Q_inf - Q_vent_extra
```
Each surface node `i`:
```
C_i * dT_i/dt = K_{i-1,i}*(T_{i-1} - T_i) + K_{i,i+1}*(T_{i+1} - T_i)
                + Q_solar_abs_i (outer nodes only)
                - Q_sky_i        (outer nodes only)
```

## 2. Discretisation — T-1

```
alpha = k / (rho * Cp)                  [m2/s]
dx_max = sqrt(alpha * dt / Fo_target)   Fo_target = 0.25
n_nodes_layer = max(1, ceil(thickness / dx_max))
dx_actual = thickness / n_nodes_layer
```
Per node:
```
C_node = rho * Cp * dx_actual * A       [J/K]
K_node = k * A / dx_actual              [W/K]
```
Between layers, conductances add in series:
```
K_interface = 1 / (1/K_a + 1/K_b)
```

Surface film resistances (ISO 6946 standard values — cite in code):
```
R_si = 0.13 m2K/W   (internal, horizontal heat flow)
R_se = 0.04 m2K/W   (external)
```

## 3. Glazing — T-2

Pure resistance, **zero capacitance**:
```
Q_glazing = U_glass * A_glass * (T_in - T_out)
```
Night shutter, when closed (sunset to sunrise):
```
U_effective = 1 / (1/U_glass + R_shutter)     R_shutter from materials table
```
**Do not create capacitance nodes for glass.** Its time constant would force an impractically small timestep and it will destabilise the solver before anything else does.

## 4. Solar

### 4.1 Solar position
Use a **published algorithm** (NOAA solar position or equivalent). Do not derive from memory.
Inputs: lat, lon, date, hour, timezone. Outputs: solar altitude `alpha_s`, azimuth `gamma_s`, both degrees.

### 4.2 Incidence angle on a surface
```
cos_theta = sin(alpha_s)*cos(beta) + cos(alpha_s)*sin(beta)*cos(gamma_s - gamma_surface)
cos_theta = max(cos_theta, 0.0)      # CLAMP — mandatory
```
**The clamp is not optional.** A surface facing away from the sun yields negative cosine, which without clamping produces negative solar gain — the wall appears to actively refrigerate.

### 4.3 Total incident irradiance on a surface
```
I_beam   = DNI * cos_theta
I_diff   = DHI * (1 + cos(beta)) / 2
I_ground = GHI * rho_ground * (1 - cos(beta)) / 2
I_total  = I_beam + I_diff + I_ground
```
For a vertical surface beta = 90°, so both view factors are 0.5.

### 4.4 Ground albedo — the snow term
```
rho_ground = 0.75   if snow_cover else 0.20
```
In cold climates with long-lying snow, ground-reflected radiation is a **substantial fraction** of total incident irradiance on vertical and steeply tilted surfaces. Snow reflects roughly 75–90% of incoming shortwave; bare ground ranges ~0.07–0.60.

Ladakh has snow on the ground, south-facing glazing, and thin clear air. This term is real and almost no competing team will include it.

### 4.5 Gains
```
Q_solar_glazing = I_total * A_glazing * g_value * SF
Q_solar_abs_i   = I_total * A_surface * absorptivity     # onto outer node
```
`SF` is a shading factor, default 1.0.

## 5. Sky long-wave radiation — the term that explains the problem

### 5.1 Sky temperature (Swinbank, clear sky)
```
T_sky = 0.0552 * T_air^1.5          # BOTH in KELVIN
```
Cloud correction, if cloud fraction available:
```
T_sky_cloudy = T_sky * (1 - 0.84*c) + 0.84*c*T_air     # c = cloud fraction 0-1
```
Ladakh default: clear (c ≈ 0), 300+ cloud-free days.

### 5.2 Linearised coefficient — T-4
```
h_r = eps * sigma * (T_s^2 + T_sky^2) * (T_s + T_sky)      [W/m2K]
Q_sky = h_r * A * F_sky * (T_s - T_sky)                     [W]
```
Recompute `h_r` each timestep from the previous step's `T_s`.

### 5.3 Sky view factor
```
F_sky = 1.0    roof / horizontal
F_sky = 0.5    vertical wall
```

### 5.4 Why this matters
At 3,500 m with 300+ cloud-free days the sky is a radiative sink far colder than the air. **A roof loses heat even at zero conduction.** This is the mechanism behind the "approaches ambient after sunset" behaviour the problem statement describes, and it is missing from naive models.

Expected finding to present: a low-emissivity roof coating can outperform an additional 50 mm of insulation.

## 6. Infiltration — altitude-corrected

```
P_alt  = 101325 * (1 - 2.25577e-5 * h)^5.25588        [Pa]   h in metres
rho_air = P_alt / (R * T_air)                          [kg/m3]  T in Kelvin
Q_inf   = ACH * V * rho_air * Cp_air * (T_in - T_out) / 3600   [W]
```

At Leh, h ≈ 3,500 m gives P ≈ 65,800 Pa ≈ 0.65 atm. At −20 °C (253 K):
```
rho_alt  = 65800 / (287.05 * 253) = 0.906 kg/m3
rho_sea  = 101325 / (287.05 * 253) = 1.395 kg/m3
ratio    = 0.65
```

**A sea-level model overstates infiltration losses by roughly 35%.** Every competing team will make this error.

Convective film coefficients also scale with density; apply the same ratio to `h_c` as a first-order correction and state it as such.

## 7. Internal gains

```
Q_internal = n_people * W_per_person + Q_equipment
```
Default 100 W sensible per person at rest. Source in the materials/constants table.

## 8. Spin-up — T-5

3 days of repeated driving weather, **discarded**. Only the final 24 h is reported.

Without this, output is dominated by thermal mass discharging from an arbitrary initial state. The curve will look plausible and be wrong, and Gate 3 validation will fail for a reason that is not a bug. Implement before validation begins, not after it fails.

Initialisation: all nodes at ambient of hour 0.

## 9. Comfort and health

### 9.1 Health threshold — headline metric
```
hours_below_health = count(T_operative < 18.0 degC)
```
WHO housing guidance: 18 °C minimum safe indoor temperature in cold seasons.

"312 hours a year below the safe indoor minimum" lands very differently from "comfort ratio 0.86", and it sidesteps the PMV-at-altitude problem for the headline number.

### 9.2 IMAC adaptive band — detailed view
```
T_neutral = a * T_running_mean_outdoor + b        # IMAC-R coefficients
band = T_neutral +/- width
```
Coefficients from NBC 2016 / IMAC-R publication. **Do not invent them** — if not sourced yet, raise `NotImplementedError` and report.

### 9.3 Operative temperature
```
T_op = (T_air + T_mean_radiant) / 2
```
Mean radiant from area-weighted internal surface temperatures. Using air temperature alone understates discomfort in a high-mass cold-surface building.

## 10. Backup heat sizing — FR-10

```
deficit_W   = max(0, C_air*(T_target - T_in)/dt + losses_at_T_target)
hours_needed = count of hours where deficit > 0
energy_kWh   = sum(deficit_W * dt) / 3.6e6
litres       = energy_kWh * 3.6 / (37.0 * eta)     # 37 MJ/L, eta = heater efficiency
```

## 11. Safety interlock — FR-9

```
if ach < ACH_MIN_COMBUSTION and heater_type == 'unflued_combustion':
    refuse(reason="ventilation below safe minimum with unflued combustion heater")
```

**Rationale, and it matters:** the optimizer will drive infiltration down, because sealing reduces heat loss. But people burn kerosene bukharis inside these shelters. Sealing a shelter containing a combustion heater kills people — carbon monoxide poisoning in tightly closed high-altitude shelters is a real and recurring cause of death.

This is a guardrail against our own optimizer. `ACH_MIN_COMBUSTION` must be sourced, not guessed.

## 12. Implementation order — build in this sequence

Each step leaves something that runs.

| Step | Add | Observable result |
|---|---|---|
| 1 | Single node, conduction only, constant weather | T asymptotes to outdoor |
| 2 | Multi-layer discretisation, thermal mass | lag and damping appear |
| 3 | Solar with real weather | daytime peak appears |
| 4 | Infiltration | losses rise |
| 5 | **Sky radiation** | overnight collapse gets steeper — **GATE 2** |
| 6 | Spin-up | curve stabilises, initial transient gone |
| 7 | Vectorisation | N designs at once — **equivalence test required** |

Step 7 is where silently wrong numbers ship. A single design through the vectorised path must match the single-design path to floating-point tolerance before the optimizer is trusted.

## 13. Known failure modes — read before debugging

| Symptom | Likely cause |
|---|---|
| Temperature oscillates or explodes | timestep too large for fastest node; check Fourier number; confirm glass has no capacitance |
| Indoor tracks outdoor with no lag | thermal mass not connected; single node per layer |
| Wall appears to cool in sunlight | `cos_theta` not clamped at zero |
| Overnight drop too shallow | sky radiation missing or `F_sky` wrong |
| Everything ~35% too lossy | sea-level air density used instead of altitude-corrected |
| Validation fails by a consistent offset | spin-up missing |
| Radiation term wildly wrong | Celsius used in a `T^4` or `h_r` expression — must be Kelvin |
| Optimizer results differ from single runs | padding nodes leaking flow; assert padded contribution is exactly zero |
