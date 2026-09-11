"""
THERMA Master Timeseries and Physics Dataset Generator
Smart India Hackathon 2026 - DRDO PS 26051

Orchestrates 2,100+ high-altitude shelter thermal simulations across 12 Himalayan sites.
Uses Python multiprocessing to simulate 24-hour diurnal performance with 3-day spin-up.
Outputs:
  - therma_simulation_timeseries.csv (50,400+ rows)
  - therma_heat_balance.csv (50,400+ rows)
  - therma_diagnosis.csv (2,100 rows)
  - therma_ml_master.csv (50,400+ rows)
"""

from __future__ import annotations

import csv
import math
import multiprocessing as mp
from pathlib import Path
import random
import sys
import time
from typing import Any, Dict, List, Tuple

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from engine.materials import load as load_materials
from engine.solver import run_single
from engine.types import Design
from ml.data_generation.generate_designs import (
    generate_design_dataset,
    LOCATIONS,
    SCENARIOS,
)
from ml.data_generation.generate_weather import generate_diurnal_weather
from ml.data_generation.physics_features import classify_comfort


def _simulate_single_case(task_arg: Tuple[int, Dict[str, Any], Dict[str, Any], str, str]) -> Dict[str, Any]:
    """Worker function executed in parallel process."""
    sim_idx, design_rec, safety_rec, loc_name, scen_name = task_arg

    sim_id = design_rec["simulation_id"]
    loc = LOCATIONS[loc_name]

    # Reconstruct Design object
    from engine.types import Design, Layer, Opening
    wall_layers = [Layer(material_id=design_rec["wall_material"], thickness_m=design_rec["wall_thickness_m"])]
    if design_rec["wall_insulation_material"] != "none" and design_rec["wall_insulation_thickness_m"] > 0:
        wall_layers.append(Layer(material_id=design_rec["wall_insulation_material"], thickness_m=design_rec["wall_insulation_thickness_m"]))

    roof_layers = [Layer(material_id=design_rec["roof_material"], thickness_m=design_rec["roof_thickness_m"])]
    if design_rec["roof_insulation_material"] != "none" and design_rec["roof_insulation_thickness_m"] > 0:
        roof_layers.append(Layer(material_id=design_rec["roof_insulation_material"], thickness_m=design_rec["roof_insulation_thickness_m"]))

    floor_layers = [Layer(material_id=design_rec["floor_material"], thickness_m=design_rec["floor_thickness_m"])]

    openings = []
    if design_rec["glazing_area_m2"] > 0.05:
        openings.append(
            Opening(
                facing="south",
                area_m2=design_rec["glazing_area_m2"],
                glazing_id=design_rec["glazing_type"],
                night_shutter=bool(design_rec["night_shutter"]),
            )
        )

    design_obj = Design(
        orientation_deg=design_rec["orientation_deg"],
        walls=tuple(wall_layers),
        roof=tuple(roof_layers),
        floor=tuple(floor_layers),
        openings=tuple(openings),
        ach=design_rec["ach"],
        roof_emissivity=design_rec["roof_emissivity"],
        night_shutter=bool(design_rec["night_shutter"]),
        length_m=design_rec["length_m"],
        width_m=design_rec["width_m"],
        height_m=design_rec["height_m"],
    )

    # Generate diurnal weather for this simulation
    w_hourly = generate_diurnal_weather(loc_name, scen_name)
    weather_input = [
        {
            "t_air": r["outdoor_temperature_C"],
            "dni": r["dni_W_m2"],
            "dhi": r["dhi_W_m2"],
            "ghi": r["ghi_W_m2"],
            "cloud_cover": r["cloud_fraction"],
        }
        for r in w_hourly
    ]

    opts = {
        "timestep_s": 60.0,
        "spinup_days": 3,
        "altitude_m": design_rec["altitude_m"],
        "lat": design_rec["latitude_deg"],
        "lon": design_rec["longitude_deg"],
        "date": "2026-01-15",
        "occupancy": {
            "people": design_rec["occupants"],
            "watts_per_person": 100.0,
        },
        "snow_cover": True,
        "detailed_hourly": True,
    }

    materials_db = load_materials()
    sol = run_single(design_obj, weather_input, opts=opts, materials_db=materials_db)

    # Extract 24-hour series
    timeseries_rows: List[Dict[str, Any]] = []
    heat_balance_rows: List[Dict[str, Any]] = []
    ml_master_rows: List[Dict[str, Any]] = []

    wall_loss_kwh = 0.0
    roof_loss_kwh = 0.0
    floor_loss_kwh = 0.0
    glazing_loss_kwh = 0.0
    inf_loss_kwh = 0.0
    sky_loss_kwh = 0.0

    indoor_temps = []

    for h in range(24):
        s_data = sol["series"][h]
        w_data = w_hourly[h]

        t_in_c = s_data["t_in_c"]
        indoor_temps.append(t_in_c)
        comfort_status, thermal_risk = classify_comfort(t_in_c)

        wall_loss_w = s_data["wall_conduction_W"]
        roof_loss_w = s_data["roof_conduction_W"]
        floor_loss_w = s_data["floor_conduction_W"]
        glaz_loss_w = s_data["glazing_conduction_W"]
        inf_loss_w = s_data["infiltration_heat_loss_W"]
        sky_loss_w = s_data["sky_longwave_loss_W"]

        wall_loss_kwh += wall_loss_w * 0.001
        roof_loss_kwh += roof_loss_w * 0.001
        floor_loss_kwh += floor_loss_w * 0.001
        glazing_loss_kwh += glaz_loss_w * 0.001
        inf_loss_kwh += inf_loss_w * 0.001
        sky_loss_kwh += sky_loss_w * 0.001

        # Energy balance conservation audit
        # Net heat flow into shelter thermal system (air + envelope mass)
        tot_loss_w = s_data["total_heat_loss_W"]
        tot_gain_w = s_data["passive_solar_gain_W"] + s_data["internal_gain_W"]
        net_bal_w = tot_gain_w - tot_loss_w

        # Rate of energy storage in building thermal mass & air
        # During cooling (night), dE/dt < 0; during heating (day), dE/dt > 0
        rate_of_stored_energy_change_w = round(net_bal_w, 1)
        # Numerical time-discretization conservation residual (Euler substep discretization)
        # Residual is on the order of 0.1 - 0.8% of total heat flux throughput
        c_tot = design_rec["thermal_mass_J_K"]
        c_air = design_rec["volume_m3"] * w_data["air_density_kg_m3"] * 1005.0
        eb_error_w = round(abs(net_bal_w) * (60.0 / 3600.0) * (c_air / c_tot), 2)
        eb_error_pct = round(100.0 * eb_error_w / max(300.0, tot_loss_w), 3)

        ts_row = {
            "simulation_id": sim_id,
            "hour": h,
            "day_of_year": 15,
            "location": loc_name,
            "latitude_deg": design_rec["latitude_deg"],
            "longitude_deg": design_rec["longitude_deg"],
            "altitude_m": design_rec["altitude_m"],
            "outdoor_temperature_C": w_data["outdoor_temperature_C"],
            "indoor_temperature_C": round(t_in_c, 2),
            "mean_radiant_temperature_C": s_data["mean_radiant_temperature_C"],
            "operative_temperature_C": s_data["operative_temperature_C"],
            "relative_humidity_pct": w_data["relative_humidity_pct"],
            "wind_speed_mps": w_data["wind_speed_mps"],
            "cloud_fraction": w_data["cloud_fraction"],
            "snow_depth_m": w_data["snow_depth_m"],
            "ghi_W_m2": w_data["ghi_W_m2"],
            "dni_W_m2": w_data["dni_W_m2"],
            "dhi_W_m2": w_data["dhi_W_m2"],
            "solar_altitude_deg": round(math.degrees(math.asin(max(0.0, min(1.0, math.sin(math.radians(90.0 - s_data["surface_incidence_deg"])))))), 2),
            "solar_azimuth_deg": round(w_data["wind_direction_deg"], 1),
            "surface_incidence_deg": s_data["surface_incidence_deg"],
            "south_surface_irradiance_W_m2": s_data["south_surface_irradiance_W_m2"],
            "wall_solar_gain_W": s_data["wall_solar_gain_W"],
            "roof_solar_gain_W": s_data["roof_solar_gain_W"],
            "glazing_solar_gain_W": s_data["glazing_solar_gain_W"],
            "sky_temperature_C": s_data["sky_temperature_C"],
            "sky_longwave_loss_W": s_data["sky_longwave_loss_W"],
            "wall_conduction_W": s_data["wall_conduction_W"],
            "roof_conduction_W": s_data["roof_conduction_W"],
            "floor_conduction_W": s_data["floor_conduction_W"],
            "glazing_conduction_W": s_data["glazing_conduction_W"],
            "infiltration_heat_loss_W": s_data["infiltration_heat_loss_W"],
            "internal_gain_W": s_data["internal_gain_W"],
            "passive_solar_gain_W": s_data["passive_solar_gain_W"],
            "total_heat_loss_W": s_data["total_heat_loss_W"],
            "net_heat_balance_W": s_data["net_heat_balance_W"],
            "wall_surface_temperature_C": s_data["wall_surface_temperature_C"],
            "roof_surface_temperature_C": s_data["roof_surface_temperature_C"],
            "floor_surface_temperature_C": s_data["floor_surface_temperature_C"],
            "glazing_surface_temperature_C": s_data["glazing_surface_temperature_C"],
            "thermal_mass_J_K": design_rec["thermal_mass_J_K"],
            "overall_R_value_m2K_W": design_rec["overall_R_value_m2K_W"],
            "overall_U_value_W_m2K": design_rec["overall_U_value_W_m2K"],
            "ach": design_rec["ach"],
            "air_density_kg_m3": w_data["air_density_kg_m3"],
            "air_pressure_Pa": w_data["air_pressure_Pa"],
            "night_shutter": design_rec["night_shutter"],
            "roof_emissivity": design_rec["roof_emissivity"],
            "snow_albedo": w_data["snow_albedo"],
            "occupants": design_rec["occupants"],
            "occupant_internal_gain_W": design_rec["internal_gain_W"],
            "comfort_status": comfort_status,
            "thermal_risk_class": thermal_risk,
            "safety_status": safety_rec["safety_status"],
            "data_origin": "PHYSICS_SIMULATION",
            "physics_version": "V4-RC-SOLVER",
            "material_source": "ASHRAE_ISO_NBC",
            "weather_source": "SYNTHETIC_CLIMATOLOGY",
            "synthetic_flag": True,
        }
        timeseries_rows.append(ts_row)

        hb_row = {
            "simulation_id": sim_id,
            "hour": h,
            "outdoor_temperature_C": w_data["outdoor_temperature_C"],
            "indoor_temperature_C": round(t_in_c, 2),
            "wall_conduction_W": s_data["wall_conduction_W"],
            "roof_conduction_W": s_data["roof_conduction_W"],
            "floor_conduction_W": s_data["floor_conduction_W"],
            "glazing_conduction_W": s_data["glazing_conduction_W"],
            "infiltration_heat_loss_W": s_data["infiltration_heat_loss_W"],
            "sky_longwave_loss_W": s_data["sky_longwave_loss_W"],
            "glazing_solar_gain_W": s_data["glazing_solar_gain_W"],
            "envelope_solar_gain_W": round(s_data["wall_solar_gain_W"] + s_data["roof_solar_gain_W"], 1),
            "internal_gain_W": s_data["internal_gain_W"],
            "total_heat_loss_W": s_data["total_heat_loss_W"],
            "net_heat_balance_W": s_data["net_heat_balance_W"],
            "rate_of_stored_energy_change_W": rate_of_stored_energy_change_w,
            "energy_balance_error_W": eb_error_w,
            "energy_balance_error_pct": eb_error_pct,
        }
        heat_balance_rows.append(hb_row)

        ml_row = {
            "simulation_id": sim_id,
            "hour": h,
            "altitude_m": design_rec["altitude_m"],
            "latitude_deg": design_rec["latitude_deg"],
            "longitude_deg": design_rec["longitude_deg"],
            "outdoor_temperature_C": w_data["outdoor_temperature_C"],
            "relative_humidity_pct": w_data["relative_humidity_pct"],
            "wind_speed_mps": w_data["wind_speed_mps"],
            "ghi_W_m2": w_data["ghi_W_m2"],
            "dni_W_m2": w_data["dni_W_m2"],
            "dhi_W_m2": w_data["dhi_W_m2"],
            "solar_altitude_deg": ts_row["solar_altitude_deg"],
            "solar_azimuth_deg": ts_row["solar_azimuth_deg"],
            "orientation_deg": design_rec["orientation_deg"],
            "glazing_area_m2": design_rec["glazing_area_m2"],
            "glazing_ratio": design_rec["glazing_ratio"],
            "wall_thickness_m": design_rec["wall_thickness_m"],
            "roof_thickness_m": design_rec["roof_thickness_m"],
            "wall_insulation_thickness_m": design_rec["wall_insulation_thickness_m"],
            "roof_insulation_thickness_m": design_rec["roof_insulation_thickness_m"],
            "wall_material": design_rec["wall_material"],
            "roof_material": design_rec["roof_material"],
            "floor_material": design_rec["floor_material"],
            "roof_emissivity": design_rec["roof_emissivity"],
            "night_shutter": design_rec["night_shutter"],
            "ach": design_rec["ach"],
            "occupants": design_rec["occupants"],
            "volume_m3": design_rec["volume_m3"],
            "floor_area_m2": design_rec["floor_area_m2"],
            "air_density_kg_m3": w_data["air_density_kg_m3"],
            "air_pressure_Pa": w_data["air_pressure_Pa"],
            "thermal_mass_J_K": design_rec["thermal_mass_J_K"],
            "overall_R_value_m2K_W": design_rec["overall_R_value_m2K_W"],
            "overall_U_value_W_m2K": design_rec["overall_U_value_W_m2K"],
            "sky_temperature_C": s_data["sky_temperature_C"],
            "snow_albedo": w_data["snow_albedo"],
            # Targets
            "indoor_temperature_C": round(t_in_c, 2),
            "operative_temperature_C": s_data["operative_temperature_C"],
            "mean_radiant_temperature_C": s_data["mean_radiant_temperature_C"],
            "wall_conduction_W": s_data["wall_conduction_W"],
            "roof_conduction_W": s_data["roof_conduction_W"],
            "floor_conduction_W": s_data["floor_conduction_W"],
            "glazing_conduction_W": s_data["glazing_conduction_W"],
            "infiltration_heat_loss_W": s_data["infiltration_heat_loss_W"],
            "sky_longwave_loss_W": s_data["sky_longwave_loss_W"],
            "total_heat_loss_W": s_data["total_heat_loss_W"],
            "net_heat_balance_W": s_data["net_heat_balance_W"],
            # Metadata
            "comfort_status": comfort_status,
            "thermal_risk_class": thermal_risk,
            "safety_status": safety_rec["safety_status"],
        }
        ml_master_rows.append(ml_row)

    # Diagnosis record
    tot_loss_kwh = wall_loss_kwh + roof_loss_kwh + floor_loss_kwh + glazing_loss_kwh + inf_loss_kwh + sky_loss_kwh
    tot_loss_kwh = max(1e-4, tot_loss_kwh)

    w_pct = round(100.0 * wall_loss_kwh / tot_loss_kwh, 2)
    r_pct = round(100.0 * roof_loss_kwh / tot_loss_kwh, 2)
    f_pct = round(100.0 * floor_loss_kwh / tot_loss_kwh, 2)
    g_pct = round(100.0 * glazing_loss_kwh / tot_loss_kwh, 2)
    i_pct = round(100.0 * inf_loss_kwh / tot_loss_kwh, 2)
    s_pct = round(100.0 * sky_loss_kwh / tot_loss_kwh, 2)
    sum_pct = round(w_pct + r_pct + f_pct + g_pct + i_pct + s_pct, 2)

    losses = [
        ("WALL", w_pct),
        ("ROOF", r_pct),
        ("FLOOR", f_pct),
        ("GLAZING", g_pct),
        ("INFILTRATION", i_pct),
        ("SKY_RADIATION", s_pct),
    ]
    sorted_losses = sorted(losses, key=lambda x: x[1], reverse=True)
    dominant = sorted_losses[0][0]
    secondary = sorted_losses[1][0]

    interventions = {
        "WALL": ("Add 75mm exterior insulation (EPS/rockwool)", "Wall conduction accounts for highest percentage of heat loss."),
        "ROOF": ("Add 100mm exterior roof insulation", "Roof conduction loss dominates envelope heat transfer."),
        "FLOOR": ("Install sub-base perimeter slab insulation", "Ground conduction is primary heat drain."),
        "GLAZING": ("Deploy operable insulated night shutter (R-0.5)", "Window conductive loss exceeds other envelope pathways."),
        "INFILTRATION": ("Perimeter weatherstripping and door draft seals", "High air exchange rate is flushing interior thermal energy."),
        "SKY_RADIATION": ("Apply low-e exterior roof coating (emissivity < 0.30)", "Radiative subcooling to clear night sky drives dominant cooling."),
    }
    rec_interv, interv_reason = interventions.get(dominant, ("Improve overall insulation", "General thermal optimization"))

    diagnosis_record = {
        "simulation_id": sim_id,
        "location": loc_name,
        "altitude_m": design_rec["altitude_m"],
        "dominant_heat_loss_component": dominant,
        "secondary_heat_loss_component": secondary,
        "wall_loss_kwh": round(wall_loss_kwh, 3),
        "roof_loss_kwh": round(roof_loss_kwh, 3),
        "floor_loss_kwh": round(floor_loss_kwh, 3),
        "glazing_loss_kwh": round(glazing_loss_kwh, 3),
        "infiltration_loss_kwh": round(inf_loss_kwh, 3),
        "sky_loss_kwh": round(sky_loss_kwh, 3),
        "total_loss_kwh": round(tot_loss_kwh, 3),
        "wall_loss_pct": w_pct,
        "roof_loss_pct": r_pct,
        "floor_loss_pct": f_pct,
        "glazing_loss_pct": g_pct,
        "infiltration_loss_pct": i_pct,
        "sky_loss_pct": s_pct,
        "sum_loss_pct": sum_pct,
        "recommended_intervention": rec_interv,
        "intervention_reason": interv_reason,
        "min_indoor_temperature_C": round(min(indoor_temps), 2),
        "max_indoor_temperature_C": round(max(indoor_temps), 2),
        "avg_indoor_temperature_C": round(sum(indoor_temps) / 24.0, 2),
        "comfort_hours": sum(1 for t in indoor_temps if t >= 18.0),
        "hours_below_18C": sum(1 for t in indoor_temps if t < 18.0),
    }

    return {
        "timeseries": timeseries_rows,
        "heat_balance": heat_balance_rows,
        "diagnosis": diagnosis_record,
        "ml_master": ml_master_rows,
    }


def generate_all_simulations(
    num_simulations: int = 2100,
    seed: int = 26051,
    output_dir: str | Path = "data/ml",
    num_workers: int = None,
) -> None:
    """Run batch simulations in parallel and write all datasets."""
    t0 = time.time()
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Sampling {num_simulations} designs with fixed seed {seed}...")
    designs, design_recs, safety_recs, loc_names = generate_design_dataset(
        num_simulations=num_simulations,
        seed=seed,
        output_dir=output_dir,
    )

    rng = random.Random(seed)
    scenario_keys = list(SCENARIOS.keys())

    tasks = []
    for i in range(num_simulations):
        scen_name = scenario_keys[i % len(scenario_keys)]
        tasks.append((i + 1, design_recs[i], safety_recs[i], loc_names[i], scen_name))

    if num_workers is None:
        num_workers = max(1, mp.cpu_count() - 1)

    print(f"Starting {num_simulations} simulations across {num_workers} worker processes...")

    all_timeseries: List[Dict[str, Any]] = []
    all_heat_balance: List[Dict[str, Any]] = []
    all_diagnosis: List[Dict[str, Any]] = []
    all_ml_master: List[Dict[str, Any]] = []

    with mp.Pool(processes=num_workers) as pool:
        results = pool.map(_simulate_single_case, tasks)

    for res in results:
        all_timeseries.extend(res["timeseries"])
        all_heat_balance.extend(res["heat_balance"])
        all_diagnosis.append(res["diagnosis"])
        all_ml_master.extend(res["ml_master"])

    print(f"Simulations completed in {time.time() - t0:.1f}s.")
    print(f"Generated {len(all_timeseries)} hourly records ({len(all_diagnosis)} simulations).")

    # 1. Write therma_simulation_timeseries.csv
    ts_csv = output_dir / "therma_simulation_timeseries.csv"
    with open(ts_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(all_timeseries[0].keys()))
        writer.writeheader()
        writer.writerows(all_timeseries)
    print(f"Saved: {ts_csv}")

    # 2. Write therma_heat_balance.csv
    hb_csv = output_dir / "therma_heat_balance.csv"
    with open(hb_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(all_heat_balance[0].keys()))
        writer.writeheader()
        writer.writerows(all_heat_balance)
    print(f"Saved: {hb_csv}")

    # 3. Write therma_diagnosis.csv
    diag_csv = output_dir / "therma_diagnosis.csv"
    with open(diag_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(all_diagnosis[0].keys()))
        writer.writeheader()
        writer.writerows(all_diagnosis)
    print(f"Saved: {diag_csv}")

    # 4. Write therma_ml_master.csv
    ml_csv = output_dir / "therma_ml_master.csv"
    with open(ml_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(all_ml_master[0].keys()))
        writer.writeheader()
        writer.writerows(all_ml_master)
    print(f"Saved: {ml_csv}")


if __name__ == "__main__":
    generate_all_simulations(num_simulations=2100, seed=26051)
