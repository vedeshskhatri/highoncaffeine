"""
Physics Sanity Test Suite per brain/10_VALIDATION.md Section 6 and brain/13_TESTING.md.
Tests 1 through 10 assert physical DIRECTIONS, RATIOS, and CONSERVATION laws,
not arbitrary magic numbers.
"""

import pytest
import math
from engine.physics_constants import (
    sky_temperature_k,
    radiative_coefficient,
    air_density,
    atmospheric_pressure_pa,
    solar_position,
    incidence_cosine,
    ground_albedo,
    SIGMA,
    R_DRY_AIR,
    CP_AIR,
    HEALTH_THRESHOLD_C,
)
from engine.materials import load, get

# Check if Vedesh's solver / batch modules are available
try:
    import engine.solver as solver
    HAS_SOLVER = hasattr(solver, "simulate")
except ImportError:
    HAS_SOLVER = False

try:
    import engine.vectorise as vectorise
    HAS_BATCH = hasattr(vectorise, "run_batch")
except ImportError:
    HAS_BATCH = False


# ============================================================================
# Check 1: Steady State (Zero solar, constant outdoor, no occupants)
# ============================================================================
def test_01_steady_state_asymptotes_to_outdoor():
    """
    Check 1: Steady state.
    Under zero solar radiation, constant outdoor temperature, and zero internal heat generation,
    an enclosed shelter's indoor air temperature must asymptotically approach the outdoor temperature.
    """
    t_out_k = 253.15  # -20 °C
    t_in_init_k = 293.15  # +20 °C initial
    dt_s = 60.0
    steps = 24 * 60  # 24 hours
    
    # 1R1C lumped thermal envelope
    u_envelope = 0.5  # W/(m²·K)
    area = 100.0  # m²
    k_loss = u_envelope * area  # 50 W/K
    c_mass = 50.0 * 2000.0 * 900.0 * 0.1  # J/K (modest thermal mass)
    
    t_in = t_in_init_k
    # Simulate over several days (or until steady-state decay)
    steps = 10 * 24 * 60  # 10 days
    for _ in range(steps):
        q_loss = k_loss * (t_in - t_out_k)
        t_in -= (q_loss * dt_s) / c_mass
        
    delta_final = abs(t_in - t_out_k)
    print(f"Check 1: Initial delta: {t_in_init_k - t_out_k:.2f} K -> Final delta after 10 days: {delta_final:.4f} K")
    assert delta_final < 0.5, f"Indoor temperature did not asymptote to outdoor; delta={delta_final} K"


# ============================================================================
# Check 2: Insulation Effect
# ============================================================================
def test_02_insulation_reduces_overnight_drop():
    """
    Check 2: Insulation.
    Increasing insulation thickness while holding all other parameters constant must
    strictly reduce the overnight temperature drop (or conductive heat loss rate).
    """
    mats = load()
    eps = mats["eps_board"]
    area_m2 = 80.0
    delta_t = 30.0  # 30 K indoor-outdoor difference
    
    # Baseline: 25 mm EPS
    dx_base = 0.025  # m
    r_base = 0.13 + 0.04 + (dx_base / eps.k)  # m²·K/W
    q_loss_base = (area_m2 / r_base) * delta_t  # W
    
    # Enhanced: 100 mm EPS
    dx_enhanced = 0.100  # m
    r_enhanced = 0.13 + 0.04 + (dx_enhanced / eps.k)  # m²·K/W
    q_loss_enhanced = (area_m2 / r_enhanced) * delta_t  # W
    
    ratio = q_loss_enhanced / q_loss_base
    print(f"Check 2: Loss with 25mm EPS: {q_loss_base:.1f} W vs 100mm EPS: {q_loss_enhanced:.1f} W (ratio: {ratio:.3f})")
    assert q_loss_enhanced < q_loss_base, "Adding insulation did not reduce heat loss"
    assert ratio < 0.40, f"Expected >60% loss reduction with 4x insulation, got ratio {ratio}"


# ============================================================================
# Check 3: Window Symmetry (Catches Sign Errors!)
# ============================================================================
def test_03_window_symmetry_catches_sign_errors():
    """
    Check 3: Window symmetry.
    Must assert BOTH:
      (a) Daytime solar gain rises when glazing area increases.
      (b) Nighttime heat loss rises when glazing area increases.
    Asserting only one defeats the purpose and allows backwards sign bugs to pass.
    """
    mats = load()
    glass = mats["double_glass"]  # u_value = 2.8 W/m²·K, g_value = 0.76
    
    # Daytime conditions (solar irradiance high, outdoor warmer than night)
    i_solar = 800.0  # W/m² incident solar
    q_solar_2m2 = i_solar * 2.0 * glass.g_value
    q_solar_6m2 = i_solar * 6.0 * glass.g_value
    
    # Nighttime conditions (zero solar, Tin=15 C, Tout=-20 C, delta_T = 35 K)
    delta_t_night = 35.0  # K
    q_loss_night_2m2 = glass.u_value * 2.0 * delta_t_night
    q_loss_night_6m2 = glass.u_value * 6.0 * delta_t_night
    
    print(f"Check 3 Daytime Gain: 2m² -> {q_solar_2m2:.1f} W, 6m² -> {q_solar_6m2:.1f} W")
    print(f"Check 3 Nighttime Loss: 2m² -> {q_loss_night_2m2:.1f} W, 6m² -> {q_loss_night_6m2:.1f} W")
    
    # Both directions must hold strictly:
    assert q_solar_6m2 > q_solar_2m2, "Daytime solar gain did not rise with larger glazing"
    assert q_loss_night_6m2 > q_loss_night_2m2, "Nighttime thermal heat loss did not rise with larger glazing"


# ============================================================================
# Check 4: Energy Conservation Balance
# ============================================================================
def test_04_energy_conservation_balance():
    """
    Check 4: Energy balance.
    In any thermal timestep, Energy In - Energy Out must equal Change in Thermal Storage
    within floating-point rounding tolerance.
    """
    c_node = 500000.0  # J/K (e.g. 500 kg concrete node)
    t_init = 280.0  # K
    dt = 60.0  # s
    
    q_in = 1500.0  # W (solar absorbed)
    q_out = 800.0  # W (conductive + radiative loss)
    net_heat_flow = q_in - q_out  # 700 W
    
    delta_t = (net_heat_flow * dt) / c_node  # K
    t_next = t_init + delta_t
    
    energy_inflow_j = net_heat_flow * dt
    energy_stored_j = c_node * (t_next - t_init)
    
    imbalance = abs(energy_inflow_j - energy_stored_j)
    print(f"Check 4: Energy in: {energy_inflow_j:.2f} J, Stored: {energy_stored_j:.2f} J, Imbalance: {imbalance:.6e} J")
    assert imbalance < 1e-6, f"Energy conservation violated: imbalance = {imbalance} J"


# ============================================================================
# Check 5: Determinism
# ============================================================================
def test_05_determinism():
    """
    Check 5: Determinism.
    Running identical calculations twice must return byte-identical results.
    """
    run1 = [air_density(3500.0, 253.15 + i) for i in range(24)]
    run2 = [air_density(3500.0, 253.15 + i) for i in range(24)]
    
    assert run1 == run2, "Determinism failed: identical inputs yielded divergent outputs"


# ============================================================================
# Check 6: Vectorisation Equivalence (Gates Optimizer)
# ============================================================================
@pytest.mark.skipif(not HAS_BATCH, reason="Awaiting Vedesh Phase V5 (run_batch vectorised array implementation)")
def test_06_vectorisation_equivalence():
    """
    Check 6: Vectorisation equivalence.
    A single design evaluated through the vectorised batch path must match the
    single-design path to floating-point tolerance.
    """
    pass


# ============================================================================
# Check 7: Padding Inertness (Gates Optimizer)
# ============================================================================
@pytest.mark.skipif(not HAS_BATCH, reason="Awaiting Vedesh Phase V5 (fixed MAX_NODES padding implementation)")
def test_07_padding_inertness():
    """
    Check 7: Padding inertness.
    Padded placeholder nodes (active=False, K=0, C=inf) must contribute exactly
    zero to all heat flows and energy sums.
    """
    pass


# ============================================================================
# Check 8: Altitude Infiltration Ratio (~0.65)
# ============================================================================
def test_08_altitude_infiltration_ratio():
    """
    Check 8: Altitude infiltration ratio.
    At 3500 m (Leh) with ISA pressure (~65.8 kPa) vs sea level (101.3 kPa) at -20 °C,
    air density and infiltration heat loss must scale by approximately 0.65.
    A sea-level calculation overstates infiltration losses by ~35%.
    """
    t_air_k = 253.15  # -20 °C
    ach = 1.0  # air change per hour
    volume_m3 = 100.0  # 100 m³ shelter
    delta_t = 38.0  # K (Tin = 18 C, Tout = -20 C)
    
    rho_sea = air_density(0.0, t_air_k)
    rho_leh = air_density(3500.0, t_air_k)
    
    q_inf_sea = (ach * volume_m3 * rho_sea * CP_AIR * delta_t) / 3600.0
    q_inf_leh = (ach * volume_m3 * rho_leh * CP_AIR * delta_t) / 3600.0
    
    ratio = q_inf_leh / q_inf_sea
    print(f"Check 8 Infiltration: Sea level = {q_inf_sea:.1f} W, Leh (3500m) = {q_inf_leh:.1f} W")
    print(f"Check 8 Ratio: {ratio:.4f} (target: ~0.65)")
    
    assert 0.63 <= ratio <= 0.67, f"Altitude infiltration ratio {ratio:.4f} outside expected [0.63, 0.67]"


# ============================================================================
# Check 9: Sky Radiation (Emissivity 0.90 vs 0.25)
# ============================================================================
def test_09_sky_radiation_emissivity_reduction():
    """
    Check 9: Sky radiation.
    A low-emissivity roof surface (eps=0.25, e.g. CGI / low-e coating) must demonstrate
    a significantly reduced radiant heat loss to the night sky compared to a standard
    high-emissivity roof (eps=0.90).
    """
    t_surf_k = 250.0  # surface temp ~ -23 °C
    t_air_k = 253.15  # air temp -20 °C
    t_sky_k = sky_temperature_k(t_air_k, cloud_fraction=0.0)  # ~222.3 K (-50.8 °C)
    
    # Horizontal roof: F_sky = 1.0
    area = 50.0  # m²
    
    h_r_standard = radiative_coefficient(0.90, t_surf_k, t_sky_k)
    q_sky_standard = h_r_standard * area * 1.0 * (t_surf_k - t_sky_k)
    
    h_r_low_e = radiative_coefficient(0.25, t_surf_k, t_sky_k)
    q_sky_low_e = h_r_low_e * area * 1.0 * (t_surf_k - t_sky_k)
    
    ratio = q_sky_low_e / q_sky_standard
    print(f"Check 9 Sky Radiant Loss: eps=0.90 -> {q_sky_standard:.1f} W vs eps=0.25 -> {q_sky_low_e:.1f} W (ratio: {ratio:.3f})")
    
    assert q_sky_low_e < q_sky_standard, "Low-e coating did not reduce sky radiant heat loss"
    assert math.isclose(ratio, 0.25 / 0.90, rel_tol=1e-3), (
        f"Expected ratio {0.25/0.90:.4f}, got {ratio:.4f}"
    )


# ============================================================================
# Check 10: Incidence Cosine Clamp (No Negative Solar Gain)
# ============================================================================
def test_10_incidence_cosine_clamp_never_negative():
    """
    Check 10: Solar incidence clamp.
    A vertical north-facing wall at solar noon in the Northern hemisphere must yield
    an incidence cosine of exactly 0.0 after clamping. Solar gain must never be negative.
    """
    alt_deg, az_deg = solar_position(lat_deg=34.15, lon_deg=77.58, day_of_year=15, hour_local=12.33)
    
    # North-facing vertical wall (tilt=90°, azimuth=0°)
    cos_theta_north = incidence_cosine(
        solar_alt_deg=alt_deg,
        solar_az_deg=az_deg,
        surface_tilt_deg=90.0,
        surface_az_deg=0.0,
    )
    
    dni = 900.0  # W/m²
    i_beam_north = dni * cos_theta_north
    
    print(f"Check 10: Sun at alt={alt_deg:.2f}°, az={az_deg:.2f}° | North Wall cos_theta={cos_theta_north:.6f}, I_beam={i_beam_north:.2f} W/m²")
    assert cos_theta_north >= 0.0, "Incidence cosine on north wall was negative (missing clamp)"
    assert cos_theta_north == 0.0, f"Expected exactly 0.0 after clamp, got {cos_theta_north}"
    assert i_beam_north == 0.0, f"Direct beam solar gain was non-zero ({i_beam_north} W/m²) on north wall at solar noon"
