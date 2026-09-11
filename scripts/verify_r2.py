"""
Verification script for Phase R2 per brain/ARYAN_PHASES.md.
Checks a, b, c, d.
"""

import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from api.db import DB_PATH, execute, query_one
from api.weather import FALLBACK_CSV_PATH, get_weather

LEH_LAT = 34.1526
LEH_LON = 77.5771
TEST_DATE = "2024-01-15"
UNCACHED_DATE = "2024-02-20"

print("=== CHECK a: Fetch Leh for a date, print provider & is_live, confirm cache increased ===")
# Clear test entries from cache first to guarantee fresh fetch
execute("DELETE FROM weather_cache WHERE date IN (?, ?)", (TEST_DATE, UNCACHED_DATE))
cnt_before = query_one("SELECT COUNT(*) as cnt FROM weather_cache")["cnt"]
print(f"Cache row count before fetch: {cnt_before}")

t0 = time.perf_counter()
rows, prov = get_weather(LEH_LAT, LEH_LON, TEST_DATE)
t1 = time.perf_counter()
call1_ms = (t1 - t0) * 1000

print(f"Fetch completed in {call1_ms:.1f} ms")
print(f"Provider: {prov['provider']}")
print(f"is_live:  {prov['is_live']}")
print(f"Fetched at: {prov['fetched_at']}")
print(f"Hours returned: {len(rows)}")

cnt_after = query_one("SELECT COUNT(*) as cnt FROM weather_cache")["cnt"]
print(f"Cache row count after fetch:  {cnt_after} (+{cnt_after - cnt_before} rows)")

print("\n=== CHECK b: Fetch SAME request again (Cache Hit & Timing Comparison) ===")
t2 = time.perf_counter()
rows_cached, prov_cached = get_weather(LEH_LAT, LEH_LON, TEST_DATE)
t3 = time.perf_counter()
call2_ms = (t3 - t2) * 1000

print(f"Call 1 (Network fetch + cache write): {call1_ms:.2f} ms")
print(f"Call 2 (SQLite cache hit):            {call2_ms:.2f} ms")
print(f"Speedup: {call1_ms / max(call2_ms, 0.001):.1f}x faster")
print(f"Cached provenance: provider='{prov_cached['provider']}', is_live={prov_cached['is_live']}")

print("\n=== CHECK c: Offline operation (Network Disconnected) ===")
print("Simulating disconnected network (disable_network=True)...")

# 1. Fetch cached date
cached_rows, cached_prov = get_weather(LEH_LAT, LEH_LON, TEST_DATE, disable_network=True)
print("1. Cached date offline result:")
print(f"   Provider:   {cached_prov['provider']}")
print(f"   is_live:    {cached_prov['is_live']}")
print(f"   Fetched at: {cached_prov['fetched_at']}")

# 2. Fetch uncached date -> must fall through to fallback CSV
fallback_rows, fallback_prov = get_weather(LEH_LAT, LEH_LON, UNCACHED_DATE, disable_network=True)
print("2. Uncached date offline result:")
print(f"   Provider:   {fallback_prov['provider']}")
print(f"   is_live:    {fallback_prov['is_live']}")
print(f"   Grid note:  {fallback_prov['grid_note']}")
print(f"   Fetched at: {fallback_prov['fetched_at']}")
print(f"   Hours:      {len(fallback_rows)}")

print("\n=== CHECK d: Fallback CSV Header & Source Citation ===")
with open(FALLBACK_CSV_PATH, "r", encoding="utf-8") as f:
    header_lines = [line.strip() for line in f if line.startswith("#")]
for line in header_lines:
    print(line)
