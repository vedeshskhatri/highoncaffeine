"""
scratch/verify_m1.py — Execute and format the 4 Phase M1 verification items.
"""
import sys
import json
sys.stdout.reconfigure(encoding='utf-8')
from engine.material_suggestion import suggest_materials

def run_verifications():
    print("=" * 70)
    print("PHASE M1 VERIFICATION A: -20 C outdoor, +20 C target at Leh")
    print("=" * 70)
    res_a = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location={"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        geometry={"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        occupancy={"people": 8, "watts_per_person": 100.0},
        locally_available_only=False,
    )
    print(f"Status Message: {res_a['status_message']}")
    print(f"Target Met Passively: {res_a['target_met']}")
    print(f"Evaluated variants: {res_a['evaluated_count']} in {res_a['elapsed_s']}s")
    for rec in res_a["recommendations"]:
        print(f"\n--- Rank #{rec['rank']}: {rec['title']} ---")
        print(f"Achieved Min: {rec['achieved_min_c']} °C | Mean: {rec['achieved_mean_c']} °C | Max: {rec['achieved_max_c']} °C")
        print(f"Cost: {rec['cost_formatted']} | Residual Gap: {rec['gap_c']} °C")
        print(f"Backup Heat: Peak {rec['backup_heat']['peak_kw']} kW, Hours: {rec['backup_heat']['hours']} h/night, Kerosene: {rec['backup_heat']['kerosene_litres_per_night']} L/night")
        print("Build-up:")
        print("  Walls:")
        for w in rec["buildup"]["walls"]:
            print(f"    - {w['name']} ({w['thickness_mm']} mm, k={w['k']} W/mK) [Source: {w['source']}]")
        print("  Roof:")
        for r in rec["buildup"]["roof"]:
            print(f"    - {r['name']} ({r['thickness_mm']} mm, k={r['k']} W/mK) [Source: {r['source']}]")
        print("  Floor:")
        for f in rec["buildup"]["floor"]:
            print(f"    - {f['name']} ({f['thickness_mm']} mm, k={f['k']} W/mK) [Source: {f['source']}]")
        g = rec["buildup"]["glazing"]
        print(f"  Glazing: {g['name']} (Area: {g['south_area_m2']} m², U={g['u_value']} W/m²K, g={g['g_value']}, shutter={g['night_shutter']}) [Source: {g['source']}]")

    print("\n" + "=" * 70)
    print("PHASE M1 VERIFICATION B: IMPOSSIBLE target (+25 C at -40 C outdoor)")
    print("=" * 70)
    res_b = suggest_materials(
        target_indoor_c=25.0,
        design_outdoor_c=-40.0,
        location={"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        geometry={"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        occupancy={"people": 8, "watts_per_person": 100.0},
        locally_available_only=False,
    )
    print(f"Status Message: {res_b['status_message']}")
    print(f"Target Met Passively: {res_b['target_met']}")
    best_b = res_b["recommendations"][0]
    print(f"Best Passive Achieved Min: {best_b['achieved_min_c']} °C")
    print(f"Reported Gap: {best_b['gap_c']} °C")
    print(f"Required Backup Heat: {best_b['backup_heat']['peak_kw']} kW")
    print(f"Operating Hours: {best_b['backup_heat']['hours']} h")
    print(f"Kerosene Required: {best_b['backup_heat']['kerosene_litres_per_night']} L/night")

    print("\n" + "=" * 70)
    print("PHASE M1 VERIFICATION C: Location Change Only (Leh vs Siachen)")
    print("=" * 70)
    res_c_leh = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location={"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        geometry={"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        occupancy={"people": 8, "watts_per_person": 100.0},
    )
    res_c_siachen = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location={"lat": 35.5000, "lon": 77.0000, "altitude_m": 5400.0},
        geometry={"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        occupancy={"people": 8, "watts_per_person": 100.0},
    )
    print(f"Leh (3,500m): Top Rank Achieved Min = {res_c_leh['recommendations'][0]['achieved_min_c']} °C, Cost = {res_c_leh['recommendations'][0]['cost_formatted']}")
    print(f"Siachen (5,400m): Top Rank Achieved Min = {res_c_siachen['recommendations'][0]['achieved_min_c']} °C, Cost = {res_c_siachen['recommendations'][0]['cost_formatted']}")
    print(f"Temperature difference due to elevation physics: {abs(res_c_leh['recommendations'][0]['achieved_min_c'] - res_c_siachen['recommendations'][0]['achieved_min_c']):.2f} °C")

    print("\n" + "=" * 70)
    print("PHASE M1 VERIFICATION D: locally_available_only Toggle")
    print("=" * 70)
    res_d_all = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location={"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        geometry={"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        occupancy={"people": 8, "watts_per_person": 100.0},
        locally_available_only=False,
    )
    res_d_local = suggest_materials(
        target_indoor_c=20.0,
        design_outdoor_c=-20.0,
        location={"lat": 34.1526, "lon": 77.5771, "altitude_m": 3500.0},
        geometry={"length_m": 6.0, "width_m": 4.0, "height_m": 2.6},
        occupancy={"people": 8, "watts_per_person": 100.0},
        locally_available_only=True,
    )
    print("All Materials Pool (locally_available_only=False):")
    for r in res_d_all["recommendations"]:
        print(f"  - {r['title']} | Cost: {r['cost_formatted']} | Min T: {r['achieved_min_c']} °C")
    print("Local Materials Only (locally_available_only=True):")
    for r in res_d_local["recommendations"]:
        print(f"  - {r['title']} | Cost: {r['cost_formatted']} | Min T: {r['achieved_min_c']} °C")

if __name__ == "__main__":
    run_verifications()
