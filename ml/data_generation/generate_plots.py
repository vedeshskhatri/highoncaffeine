"""
THERMA Scientific Visual Validation Suite
Smart India Hackathon 2026 - DRDO PS 26051

Generates 10 high-resolution engineering validation figures:
1. temperature_profiles.png
2. solar_profiles.png
3. heat_loss_distribution.png
4. altitude_vs_air_density.png
5. insulation_vs_heat_loss.png
6. glazing_vs_solar_gain.png
7. ach_vs_infiltration_loss.png
8. roof_emissivity_vs_sky_loss.png
9. thermal_mass_vs_temperature_variation.png
10. pareto_cost_vs_comfort.png
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from engine.physics_constants import atmospheric_pressure_pa, air_density


def generate_all_plots(data_dir: str | Path = "data/ml", plots_dir: str | Path = "data/ml/plots") -> None:
    """Generate all 10 engineering sanity figures."""
    data_dir = Path(data_dir)
    plots_dir = Path(plots_dir)
    plots_dir.mkdir(parents=True, exist_ok=True)

    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    plt.rcParams.update({"font.sans-serif": "Arial", "font.size": 10, "figure.autolayout": True})

    # Read timeseries sample
    ts_file = data_dir / "therma_simulation_timeseries.csv"
    ts_rows = []
    if ts_file.exists():
        with open(ts_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, r in enumerate(reader):
                ts_rows.append(r)
                if i >= 480:  # Sample first 20 simulations for time series plots
                    break

    # Read design parameters
    param_file = data_dir / "therma_design_parameters.csv"
    param_rows = []
    if param_file.exists():
        with open(param_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            param_rows = list(reader)

    # Read diagnosis
    diag_file = data_dir / "therma_diagnosis.csv"
    diag_rows = []
    if diag_file.exists():
        with open(diag_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            diag_rows = list(reader)

    # Read optimization candidates
    opt_file = data_dir / "therma_optimization_candidates.csv"
    opt_rows = []
    if opt_file.exists():
        with open(opt_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            opt_rows = list(reader)

    # -------------------------------------------------------------
    # 1. Temperature Profiles
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if ts_rows:
        sim0 = [r for r in ts_rows if r["simulation_id"] == ts_rows[0]["simulation_id"]]
        hours = [int(r["hour"]) for r in sim0]
        tout = [float(r["outdoor_temperature_C"]) for r in sim0]
        tin = [float(r["indoor_temperature_C"]) for r in sim0]
        tmrt = [float(r["mean_radiant_temperature_C"]) for r in sim0]
        top = [float(r["operative_temperature_C"]) for r in sim0]

        ax.plot(hours, tout, "b--", label="Outdoor Ambient (Tout)", linewidth=1.8)
        ax.plot(hours, tin, "r-", label="Indoor Air (Tin)", linewidth=2.2)
        ax.plot(hours, tmrt, "g-.", label="Mean Radiant (Tmrt)", linewidth=1.6)
        ax.plot(hours, top, "m:", label="Operative (Top)", linewidth=2.0)
        ax.axhline(18.0, color="gray", linestyle="--", alpha=0.7, label="WHO Comfort Baseline (18°C)")

        loc = sim0[0]["location"]
        alt = sim0[0]["altitude_m"]
        ax.set_title(f"Diurnal Thermal Profiles: 24-Hour Winter Simulation ({loc}, {alt}m)", fontweight="bold")
    ax.set_xlabel("Hour of Day [0–23]")
    ax.set_ylabel("Temperature [°C]")
    ax.legend(loc="lower right", frameon=True)
    fig.savefig(plots_dir / "temperature_profiles.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 2. Solar Profiles
    # -------------------------------------------------------------
    fig, ax1 = plt.subplots(figsize=(8, 4.5), dpi=150)
    if ts_rows:
        sim0 = [r for r in ts_rows if r["simulation_id"] == ts_rows[0]["simulation_id"]]
        hours = [int(r["hour"]) for r in sim0]
        dni = [float(r["dni_W_m2"]) for r in sim0]
        ghi = [float(r["ghi_W_m2"]) for r in sim0]
        dhi = [float(r["dhi_W_m2"]) for r in sim0]
        sol_w = [float(r["glazing_solar_gain_W"]) for r in sim0]

        ax1.plot(hours, dni, color="gold", label="Direct Normal (DNI)", linewidth=1.8)
        ax1.plot(hours, ghi, color="orange", label="Global Horizontal (GHI)", linewidth=2.0)
        ax1.plot(hours, dhi, color="skyblue", label="Diffuse Horizontal (DHI)", linewidth=1.5)
        ax1.set_ylabel("Solar Irradiance [W/m²]")
        ax1.set_xlabel("Hour of Day")

        ax2 = ax1.twinx()
        ax2.plot(hours, sol_w, color="crimson", linestyle="--", label="Passive Solar Heat Gain (W)", linewidth=2.0)
        ax2.set_ylabel("Glazing Solar Gain [W]", color="crimson")
        ax2.tick_params(axis="y", labelcolor="crimson")

        ax1.set_title("Solar Irradiance and Glazing Passive Heat Gain Diurnal Cycle", fontweight="bold")
        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
    fig.savefig(plots_dir / "solar_profiles.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 3. Heat Loss Distribution
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if diag_rows:
        categories = ["WALL", "ROOF", "FLOOR", "GLAZING", "INFILTRATION", "SKY_RADIATION"]
        loss_pcts = {c: [] for c in categories}
        for r in diag_rows[:300]:
            loss_pcts["WALL"].append(float(r["wall_loss_pct"]))
            loss_pcts["ROOF"].append(float(r["roof_loss_pct"]))
            loss_pcts["FLOOR"].append(float(r["floor_loss_pct"]))
            loss_pcts["GLAZING"].append(float(r["glazing_loss_pct"]))
            loss_pcts["INFILTRATION"].append(float(r["infiltration_loss_pct"]))
            loss_pcts["SKY_RADIATION"].append(float(r["sky_loss_pct"]))

        data = [loss_pcts[c] for c in categories]
        bp = ax.boxplot(data, patch_artist=True, tick_labels=categories)
        colors = ["#4A90E2", "#50E3C2", "#F5A623", "#E94E77", "#9013FE", "#7ED321"]
        for patch, color in zip(bp["boxes"], colors):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)

        ax.set_ylabel("Heat Loss Contribution [%]")
        ax.set_title("Heat Loss Distribution by Building Envelope Component", fontweight="bold")
    fig.savefig(plots_dir / "heat_loss_distribution.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 4. Altitude vs Air Density & Pressure
    # -------------------------------------------------------------
    fig, ax1 = plt.subplots(figsize=(8, 4.5), dpi=150)
    alts = np.linspace(0.0, 6000.0, 100)
    pressures = [atmospheric_pressure_pa(h) / 1000.0 for h in alts]
    densities = [air_density(h, -10.0 + 273.15) for h in alts]

    color1 = "#1f77b4"
    ax1.plot(alts, densities, color=color1, linewidth=2.5)
    ax1.set_xlabel("Altitude Above Sea Level [m]")
    ax1.set_ylabel("Air Density at -10°C [kg/m³]", color=color1)
    ax1.tick_params(axis="y", labelcolor=color1)

    ax2 = ax1.twinx()
    color2 = "#2ca02c"
    ax2.plot(alts, pressures, color=color2, linestyle="--", linewidth=2.0)
    ax2.set_ylabel("Barometric Pressure [kPa]", color=color2)
    ax2.tick_params(axis="y", labelcolor=color2)

    # Key altitude annotations
    key_points = [("Leh (3,500m)", 3500), ("Siachen Base (5,400m)", 5400)]
    for name, h in key_points:
        rho = air_density(h, 263.15)
        ax1.scatter([h], [rho], color="red", zorder=5)
        ax1.annotate(f"{name}\nρ={rho:.3f} kg/m³", (h, rho), textcoords="offset points", xytext=(-40, 15), fontsize=8, arrowprops=dict(arrowstyle="->", color="red"))

    ax1.set_title("High-Altitude Atmospheric Pressure and Air Density Reduction", fontweight="bold")
    fig.savefig(plots_dir / "altitude_vs_air_density.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 5. Insulation vs Heat Loss
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if param_rows and diag_rows:
        ins_vals = []
        losses = []
        d_map = {r["simulation_id"]: float(r["total_loss_kwh"]) for r in diag_rows}
        for r in param_rows[:500]:
            s_id = r["simulation_id"]
            if s_id in d_map:
                w_ins = float(r["wall_insulation_thickness_m"])
                r_ins = float(r["roof_insulation_thickness_m"])
                mean_ins = (w_ins + r_ins) / 2.0 * 1000.0  # mm
                ins_vals.append(mean_ins)
                losses.append(d_map[s_id])

        ax.scatter(ins_vals, losses, alpha=0.5, color="#2b5c8f", s=30, edgecolors="none")
        ax.set_xlabel("Mean Envelope Insulation Thickness [mm]")
        ax.set_ylabel("Total 24-Hour Heat Loss [kWh]")
        ax.set_title("Insulation Thickness vs Diurnal Thermal Envelope Loss", fontweight="bold")
    fig.savefig(plots_dir / "insulation_vs_heat_loss.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 6. Glazing Area vs Solar Gain
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if param_rows and diag_rows:
        glaz_areas = []
        t_lifts = []
        d_map = {r["simulation_id"]: (float(r["avg_indoor_temperature_C"]), float(r.get("min_indoor_temperature_C", -10.0))) for r in diag_rows}
        for r in param_rows[:500]:
            s_id = r["simulation_id"]
            if s_id in d_map:
                g_area = float(r["glazing_area_m2"])
                t_avg, _ = d_map[s_id]
                glaz_areas.append(g_area)
                t_lifts.append(t_avg)

        ax.scatter(glaz_areas, t_lifts, alpha=0.5, color="#d95f02", s=35, edgecolors="none")
        ax.set_xlabel("South Glazing Opening Area [m²]")
        ax.set_ylabel("Average Diurnal Indoor Air Temperature [°C]")
        ax.set_title("South Glazing Aperture vs Solar Heat Retention & Temperature Lift", fontweight="bold")
    fig.savefig(plots_dir / "glazing_vs_solar_gain.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 7. ACH vs Infiltration Loss
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if param_rows and diag_rows:
        aches = []
        inf_losses = []
        d_map = {r["simulation_id"]: float(r["infiltration_loss_kwh"]) for r in diag_rows}
        for r in param_rows[:500]:
            s_id = r["simulation_id"]
            if s_id in d_map:
                aches.append(float(r["ach"]))
                inf_losses.append(d_map[s_id])

        ax.scatter(aches, inf_losses, alpha=0.5, color="#7570b3", s=30, edgecolors="none")
        ax.set_xlabel("Air Changes per Hour (ACH) [1/h]")
        ax.set_ylabel("24-Hour Infiltration Heat Loss [kWh]")
        ax.set_title("Ventilation Rate (ACH) vs Convective Infiltration Heat Loss", fontweight="bold")
    fig.savefig(plots_dir / "ach_vs_infiltration_loss.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 8. Roof Emissivity vs Sky Longwave Loss
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if param_rows and diag_rows:
        emiss = []
        sky_losses = []
        d_map = {r["simulation_id"]: float(r["sky_loss_kwh"]) for r in diag_rows}
        for r in param_rows[:500]:
            s_id = r["simulation_id"]
            if s_id in d_map:
                emiss.append(float(r["roof_emissivity"]))
                sky_losses.append(d_map[s_id])

        ax.scatter(emiss, sky_losses, alpha=0.5, color="#1b9e77", s=30, edgecolors="none")
        ax.set_xlabel("Exterior Roof Thermal Emissivity [-]")
        ax.set_ylabel("24-Hour Sky Longwave Loss [kWh]")
        ax.set_title("Roof Emissivity vs Nocturnal Clear-Sky Radiative Subcooling", fontweight="bold")
    fig.savefig(plots_dir / "roof_emissivity_vs_sky_loss.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 9. Thermal Mass vs Diurnal Temperature Variation
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if param_rows and diag_rows:
        t_masses = []
        t_swings = []
        d_map = {r["simulation_id"]: (float(r["max_indoor_temperature_C"]) - float(r["min_indoor_temperature_C"])) for r in diag_rows}
        for r in param_rows[:500]:
            s_id = r["simulation_id"]
            if s_id in d_map:
                c_val = float(r["thermal_mass_J_K"]) / 1e6  # MJ/K
                t_masses.append(c_val)
                t_swings.append(d_map[s_id])

        ax.scatter(t_masses, t_swings, alpha=0.5, color="#e7298a", s=30, edgecolors="none")
        ax.set_xlabel("Envelope Thermal Capacitance [MJ/K]")
        ax.set_ylabel("Diurnal Indoor Temperature Swing (ΔTin = Tmax - Tmin) [°C]")
        ax.set_title("Thermal Mass Inertia vs Diurnal Temperature Oscillation Damping", fontweight="bold")
    fig.savefig(plots_dir / "thermal_mass_vs_temperature_variation.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 10. Pareto Frontier: Cost vs Discomfort
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    if opt_rows:
        costs_safe = []
        disc_safe = []
        costs_refused = []
        disc_refused = []
        pareto_cost = []
        pareto_disc = []

        for r in opt_rows:
            c_inr = float(r["capital_cost_inr"])
            disc = float(r["discomfort_hours"])
            is_pareto = r["is_pareto_optimal"].lower() in ("true", "1")
            status = r["safety_status"]

            if is_pareto:
                pareto_cost.append(c_inr)
                pareto_disc.append(disc)
            elif status == "REFUSED":
                costs_refused.append(c_inr)
                disc_refused.append(disc)
            else:
                costs_safe.append(c_inr)
                disc_safe.append(disc)

        ax.scatter(costs_safe, disc_safe, color="gray", alpha=0.3, s=15, label="Feasible Candidate Designs")
        ax.scatter(costs_refused, disc_refused, color="red", marker="x", alpha=0.5, s=25, label="REFUSED (Combustion Safety Violation)")

        # Sort pareto points by cost for clean line plot
        if pareto_cost:
            p_sorted = sorted(zip(pareto_cost, pareto_disc), key=lambda x: x[0])
            px = [p[0] for p in p_sorted]
            py = [p[1] for p in p_sorted]
            ax.plot(px, py, color="#2ca02c", linewidth=2.5, zorder=4)
            ax.scatter(px, py, color="#2ca02c", s=60, zorder=5, label="Non-Dominated Pareto Optimal Frontier")

        ax.set_xlabel("Capital Cost [INR]")
        ax.set_ylabel("Discomfort Duration Below 18°C [Hours]")
        ax.set_title("Multi-Objective Pareto Optimization: Capital Cost vs Thermal Discomfort", fontweight="bold")
        ax.legend(loc="upper right", frameon=True)
    fig.savefig(plots_dir / "pareto_cost_vs_comfort.png")
    plt.close(fig)

    print(f"Generated all 10 engineering sanity figures in {plots_dir}")


if __name__ == "__main__":
    generate_all_plots()
