"""
Verification script for Phase R3 per brain/ARYAN_PHASES.md.
Checks a, b, c, d, e.
"""

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from api.main import app
from api.weather import generate_or_get_worst_night_profile

client = TestClient(app)

LEH_LAT = 34.1526
LEH_LON = 77.5771

print("=== CHECK a: Generate P1 profile for Leh ===")
rows, meta = generate_or_get_worst_night_profile(LEH_LAT, LEH_LON)
print(f"p1_daily_min_c: {meta['p1_daily_min_c']} C")
print(f"p5_daily_ghi:   {meta['p5_daily_ghi']} kWh/m2/day")
print(f"years_used:     {meta['years_used']} years")
print(f"grid_note:      '{meta['grid_note']}'")
print(f"24-hour synthesized profile (hours 0..5, 12, 14):")
for h in [0, 1, 6, 12, 14, 20]:
    print(f"  Hour {h:02d}: T_air={rows[h]['t_air']} C, GHI={rows[h]['ghi']} W/m2")

print("\n=== CHECK b: Compare typical_day vs design_winter_night ===")
base_sim_payload = {
    "location": {"lat": LEH_LAT, "lon": LEH_LON, "altitude_m": 3500},
    "weather": {"mode": "typical_day", "date": "2024-01-15", "hours": 24, "user_csv_id": None},
    "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180},
    "envelope": {
        "walls": [{"material": "mud_brick", "thickness_m": 0.30}],
        "roof": [{"material": "concrete", "thickness_m": 0.15}],
        "floor": [{"material": "concrete", "thickness_m": 0.10}],
    },
}

# 1. Typical day run
r_typical = client.post("/simulate", json=base_sim_payload)
data_typical = r_typical.json()
min_typical_out = min(item["t_out"] for item in data_typical["series"])
print(f"Typical day outdoor minimum:        {min_typical_out:.1f} C")
print(f"Typical day weather provenance:     {data_typical['weather_provenance']}")

# 2. Design winter night run
winter_night_payload = json.loads(json.dumps(base_sim_payload))
winter_night_payload["weather"]["mode"] = "design_winter_night"
r_winter = client.post("/simulate", json=winter_night_payload)
data_winter = r_winter.json()
min_winter_out = min(item["t_out"] for item in data_winter["series"])
print(f"Design winter night outdoor minimum: {min_winter_out:.1f} C")
print(f"Winter night weather provenance:    {data_winter['weather_provenance']}")
print(f"Difference (P1 is colder by):       {min_typical_out - min_winter_out:.1f} C")
assert min_winter_out < min_typical_out, "Expected design_winter_night to be colder!"

print("\n=== CHECK c: Paste a valid CSV and confirm user-csv provenance ===")
valid_csv_path = ROOT_DIR / "data" / "fixtures" / "fixture_example_user_weather.csv"
with open(valid_csv_path, "r", encoding="utf-8") as f:
    valid_csv_content = f.read()

r_upload = client.post("/weather/csv", content=valid_csv_content)
print("Upload status:", r_upload.status_code)
upload_data = r_upload.json()
print("Upload response:", upload_data)
user_csv_id = upload_data["user_csv_id"]

# Run simulate using user_csv mode
user_csv_sim_payload = json.loads(json.dumps(base_sim_payload))
user_csv_sim_payload["weather"]["mode"] = "user_csv"
user_csv_sim_payload["weather"]["user_csv_id"] = user_csv_id

r_user_sim = client.post("/simulate", json=user_csv_sim_payload)
print("Simulate with user_csv status:", r_user_sim.status_code)
sim_user_data = r_user_sim.json()
print(f"Provenance provider: '{sim_user_data['weather_provenance']['provider']}'")
print(f"First hour t_out:    {sim_user_data['series'][0]['t_out']} C")
assert sim_user_data["weather_provenance"]["provider"] == "user-csv"

print("\n=== CHECK d: Multi-error validation (bad number in row 14, bad date in row 22) ===")
csv_lines = valid_csv_content.strip().split("\n")
# Line index 14 is row 15 (1-based), header is line 0.
# Modify line 13 (row 14) to have non-numeric temperature '--'
parts14 = csv_lines[13].split(",")
parts14[1] = "--"
csv_lines[13] = ",".join(parts14)

# Modify line 21 (row 22) to have bad date '15/01 5pm'
parts22 = csv_lines[21].split(",")
parts22[0] = "15/01 5pm"
csv_lines[21] = ",".join(parts22)

bad_csv_content = "\n".join(csv_lines)

r_bad_csv = client.post("/weather/csv", content=bad_csv_content)
print("Bad CSV status:", r_bad_csv.status_code)
print("Response JSON (both errors collected):")
print(json.dumps(r_bad_csv.json(), indent=2))
assert r_bad_csv.status_code == 422
err_details = r_bad_csv.json()["detail"]
assert len(err_details) >= 2, "Expected at least 2 errors collected!"

print("\n=== CHECK e: Missing optional column (dni_wm2) produces warnings, succeeds ===")
# Remove dni_wm2 column from CSV
lines_no_dni = []
for line in valid_csv_content.strip().split("\n"):
    parts = line.split(",")
    # Column 3 is dni_wm2
    del parts[3]
    lines_no_dni.append(",".join(parts))

csv_no_dni = "\n".join(lines_no_dni)
r_no_dni = client.post("/weather/csv", content=csv_no_dni)
print("Missing dni status:", r_no_dni.status_code)
no_dni_data = r_no_dni.json()
print("Response JSON:")
print(json.dumps(no_dni_data, indent=2))
assert r_no_dni.status_code == 200
assert any("dni_wm2 absent" in w for w in no_dni_data["warnings"])
print("ALL CHECKS PASSED!")
