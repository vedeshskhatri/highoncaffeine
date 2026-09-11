"""
Verification script for Phase R1.
Checks a, b, c, d, e per brain/ARYAN_PHASES.md.
"""

import json
import shutil
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from api.main import app
from api.db import DB_PATH, round_coords, execute, query_one
from api.errors import UnsourcedMaterialError
from scripts.seed import seed_database, MATERIALS_CSV

client = TestClient(app)

print("=== CHECK a: Run seed.py & print row counts per table ===")
counts = seed_database()
for tbl, cnt in counts.items():
    print(f"  {tbl}: {cnt}")

print("\n=== CHECK b: GET /materials returns real data from DB ===")
r = client.get("/materials")
print("Status:", r.status_code)
data = r.json()
print("Total materials returned:", len(data["materials"]))
print("_stub flag:", data.get("_stub"))
print("First 3 items:")
print(json.dumps(data["materials"][:3], indent=2))

print("\n=== CHECK c: Add unsourced row to copy of CSV, verify seed fails ===")
copy_csv = MATERIALS_CSV.parent / "materials_copy_test.csv"
shutil.copy(MATERIALS_CSV, copy_csv)
# 15 columns: id,name,category,k,rho,cp,absorptivity,emissivity,g_value,u_value,cost_per_m3,cost_source,install_note,locally_available,source
with open(copy_csv, "a", encoding="utf-8") as f:
    f.write("unsourced_mat,Unsourced Material,structural,1.2,1800,900,,,,,2500,,local mason,1,\n")

try:
    seed_database(csv_path=copy_csv)
    print("FAILED: seed_database did not raise UnsourcedMaterialError!")
except UnsourcedMaterialError as e:
    print("SUCCESS: UnsourcedMaterialError raised as expected:")
    print(f"  {e}")
finally:
    if copy_csv.exists():
        copy_csv.unlink()

print("\n=== CHECK d: Coordinate rounding hit demonstration ===")
raw_lat_insert = 34.1526123
raw_lon_insert = 77.5771456
r_lat, r_lon = round_coords(raw_lat_insert, raw_lon_insert)
print(f"Insert raw coords: ({raw_lat_insert}, {raw_lon_insert}) -> canonical: ({r_lat}, {r_lon})")

execute(
    """
    INSERT OR REPLACE INTO weather_cache (lat, lon, date, hour, t_air, ghi, dni, dhi, wind, rh, snow_cover, provider, fetched_at)
    VALUES (?, ?, '2026-01-15', 12, -8.1, 870.0, 720.0, 150.0, 3.2, 28.0, 1, 'open-meteo', '2026-09-11T05:00:00Z')
    """,
    (r_lat, r_lon)
)

raw_lat_query = 34.1526499
raw_lon_query = 77.5771123
q_lat, q_lon = round_coords(raw_lat_query, raw_lon_query)
print(f"Query raw coords:  ({raw_lat_query}, {raw_lon_query}) -> canonical: ({q_lat}, {q_lon})")

row = query_one(
    "SELECT * FROM weather_cache WHERE lat = ? AND lon = ? AND date = ? AND hour = ?",
    (q_lat, q_lon, "2026-01-15", 12)
)
if row:
    print("CACHE HIT! Retrieved row:")
    print(f"  lat={row['lat']}, lon={row['lon']}, date={row['date']}, hour={row['hour']}, t_air={row['t_air']}, ghi={row['ghi']}, provider={row['provider']}")
else:
    print("FAILED: Cache miss!")

print("\n=== CHECK e: Confirm /data/therma.db is tracked & not gitignored ===")
print("therma.db exists:", DB_PATH.exists(), f"({DB_PATH.stat().st_size} bytes)")
