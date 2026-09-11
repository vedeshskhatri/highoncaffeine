"""
Seed script for THERMA Platform Asset Management.
Populates 12 genuine sites:
  - 11 Ladakh sites (Siachen, DBO, Chushul, Nyoma, Dras, Kargil, Diskit, Hanle (dwelling), Tangtse, Pangong, Leh Garrison)
  - 1 Nepal Relief site (Rasuwa Relief Camp)
Evaluates each site against the real engine and populates site_results.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from api.db import execute, init_db, query_all, query_one
from api.platform import _evaluate_site_internal

LADAKH_SITES = [
    {
        "id": "site_siachen_base",
        "name": "Siachen Base Camp",
        "estate": "Ladakh",
        "lat": 35.2000,
        "lon": 77.2100,
        "altitude_m": 3600.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 16,
        "notes": "Main logistics staging post for glacier transit",
        "current_design": {
            "name": "Siachen Standard Post v2",
            "geometry": {"length_m": 8.0, "width_m": 4.5, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [
                    {"material": "stone_masonry", "thickness_m": 0.35},
                    {"material": "eps", "thickness_m": 0.08},
                ],
                "roof": [{"material": "concrete", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.05}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.5, "glazing": "double_pane", "night_shutter": True}],
            "ventilation": {"ach": 0.45, "heater_type": "none"},
            "occupancy": {"people": 16, "watts_per_person": 100},
        },
    },
    {
        "id": "site_dbo_sector",
        "name": "Daulat Beg Oldie (DBO) Sector",
        "estate": "Ladakh",
        "lat": 35.4000,
        "lon": 77.9300,
        "altitude_m": 5065.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 12,
        "notes": "World's highest airstrip perimeter; severe katabatic winds",
        "current_design": {
            "name": "DBO High-Altitude Prefab v1",
            "geometry": {"length_m": 6.0, "width_m": 3.8, "height_m": 2.4, "orientation_deg": 180},
            "envelope": {
                "walls": [
                    {"material": "prefab_sandwich", "thickness_m": 0.08},
                    {"material": "rockwool", "thickness_m": 0.05},
                ],
                "roof": [{"material": "pu_sandwich_panel", "thickness_m": 0.10}],
                "floor": [{"material": "concrete", "thickness_m": 0.10}, {"material": "eps", "thickness_m": 0.05}],
                "roof_emissivity": 0.85,
            },
            "openings": [{"facing": "south", "area_m2": 2.5, "glazing": "double_pane_shutter", "night_shutter": True}],
            "ventilation": {"ach": 0.40, "heater_type": "none"},
            "occupancy": {"people": 12, "watts_per_person": 100},
        },
    },
    {
        "id": "site_chushul_post",
        "name": "Chushul High Post",
        "estate": "Ladakh",
        "lat": 33.5900,
        "lon": 78.6500,
        "altitude_m": 4350.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 10,
        "notes": "Spanggur Gap visual surveillance post",
        "current_design": {
            "name": "Chushul Stone Post v1",
            "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.5, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "stone_masonry", "thickness_m": 0.40}, {"material": "eps", "thickness_m": 0.05}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.0, "glazing": "double_pane", "night_shutter": False}],
            "ventilation": {"ach": 0.50, "heater_type": "none"},
            "occupancy": {"people": 10, "watts_per_person": 100},
        },
    },
    {
        "id": "site_nyoma_alg",
        "name": "Nyoma ALG Base",
        "estate": "Ladakh",
        "lat": 33.2000,
        "lon": 78.7100,
        "altitude_m": 4180.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 14,
        "notes": "Advanced landing ground logistics and operations crew",
        "current_design": {
            "name": "Nyoma Modular Unit v1",
            "geometry": {"length_m": 7.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "mud_brick", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.05}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}],
                "floor": [{"material": "concrete", "thickness_m": 0.12}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.5, "glazing": "double_pane", "night_shutter": True}],
            "ventilation": {"ach": 0.45, "heater_type": "none"},
            "occupancy": {"people": 14, "watts_per_person": 100},
        },
    },
    {
        "id": "site_dras_sector",
        "name": "Dras Cold Point Post",
        "estate": "Ladakh",
        "lat": 34.4300,
        "lon": 75.7500,
        "altitude_m": 3280.0,
        "district": "Kargil",
        "site_type": "forward_post",
        "occupants": 12,
        "notes": "Second coldest inhabited place on earth; sub-zero winter persistence",
        "current_design": {
            "name": "Dras Heavy Insulated Post v1",
            "geometry": {"length_m": 6.5, "width_m": 4.0, "height_m": 2.5, "orientation_deg": 180},
            "envelope": {
                "walls": [
                    {"material": "stone_masonry", "thickness_m": 0.35},
                    {"material": "rockwool", "thickness_m": 0.08},
                ],
                "roof": [{"material": "concrete", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.08}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.05}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.0, "glazing": "double_pane_shutter", "night_shutter": True}],
            "ventilation": {"ach": 0.38, "heater_type": "none"},
            "occupancy": {"people": 12, "watts_per_person": 100},
        },
    },
    {
        "id": "site_kargil_heights",
        "name": "Kargil Ridge Post",
        "estate": "Ladakh",
        "lat": 34.5600,
        "lon": 76.1300,
        "altitude_m": 3850.0,
        "district": "Kargil",
        "site_type": "forward_post",
        "occupants": 8,
        "notes": "Ridge line observation point overlooking valley highway",
        "current_design": {
            "name": "Kargil Standard Post v1",
            "geometry": {"length_m": 5.5, "width_m": 3.5, "height_m": 2.4, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "stone_masonry", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.05}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.12}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 2.5, "glazing": "double_pane", "night_shutter": False}],
            "ventilation": {"ach": 0.50, "heater_type": "none"},
            "occupancy": {"people": 8, "watts_per_person": 100},
        },
    },
    {
        "id": "site_diskit_nubra",
        "name": "Diskit Nubra Depot",
        "estate": "Ladakh",
        "lat": 34.5700,
        "lon": 77.5600,
        "altitude_m": 3140.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 12,
        "notes": "Nubra valley transit depot and staging point",
        "current_design": {
            "name": "Nubra Adobe Post v1",
            "geometry": {"length_m": 6.5, "width_m": 4.2, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "mud_brick", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.05}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.5, "glazing": "double_pane", "night_shutter": False}],
            "ventilation": {"ach": 0.45, "heater_type": "none"},
            "occupancy": {"people": 12, "watts_per_person": 100},
        },
    },
    {
        "id": "site_hanle_observatory",
        "name": "Hanle Indian Astronomical Observatory Quarters",
        "estate": "Ladakh",
        "lat": 32.7800,
        "lon": 78.9600,
        "altitude_m": 4500.0,
        "district": "Leh",
        "site_type": "dwelling",  # Explicitly marked as dwelling per Correction 3!
        "occupants": 6,
        "notes": "Civilian research staff quarters for Indian Institute of Astrophysics (IIA)",
        "current_design": {
            "name": "Hanle Passive Solar Dwelling v2",
            "geometry": {"length_m": 6.0, "width_m": 4.5, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "mud_brick", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.08}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.05}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 4.0, "glazing": "double_pane_shutter", "night_shutter": True}],
            "ventilation": {"ach": 0.40, "heater_type": "none"},
            "occupancy": {"people": 6, "watts_per_person": 100},
        },
    },
    {
        "id": "site_tangtse_camp",
        "name": "Tangtse Sector Station",
        "estate": "Ladakh",
        "lat": 34.0200,
        "lon": 78.1800,
        "altitude_m": 3950.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 14,
        "notes": "Changthang high plateau staging depot",
        "current_design": {
            "name": "Tangtse Standard Post v1",
            "geometry": {"length_m": 7.0, "width_m": 4.0, "height_m": 2.5, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "stone_masonry", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.05}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}],
                "floor": [{"material": "concrete", "thickness_m": 0.12}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.0, "glazing": "double_pane", "night_shutter": False}],
            "ventilation": {"ach": 0.50, "heater_type": "none"},
            "occupancy": {"people": 14, "watts_per_person": 100},
        },
    },
    {
        "id": "site_pangong_north",
        "name": "Pangong Tso North Post",
        "estate": "Ladakh",
        "lat": 33.7500,
        "lon": 78.4500,
        "altitude_m": 4250.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 10,
        "notes": "Lake perimeter security and patrol post",
        "current_design": {
            "name": "Pangong Coastal Post v1",
            "geometry": {"length_m": 6.0, "width_m": 3.8, "height_m": 2.4, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "stone_masonry", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.05}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.12}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 2.8, "glazing": "double_pane", "night_shutter": False}],
            "ventilation": {"ach": 0.48, "heater_type": "none"},
            "occupancy": {"people": 10, "watts_per_person": 100},
        },
    },
    {
        "id": "site_leh_garrison",
        "name": "Leh Garrison Barracks",
        "estate": "Ladakh",
        "lat": 34.1526,
        "lon": 77.5771,
        "altitude_m": 3500.0,
        "district": "Leh",
        "site_type": "forward_post",
        "occupants": 18,
        "notes": "14 Corps headquarters garrison quarters and testing reference",
        "current_design": {
            "name": "DIHAR Pilot Reference v1",
            "geometry": {"length_m": 8.0, "width_m": 5.0, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "mud_brick", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.08}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.05}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 4.5, "glazing": "double_pane_shutter", "night_shutter": True}],
            "ventilation": {"ach": 0.40, "heater_type": "none"},
            "occupancy": {"people": 18, "watts_per_person": 100},
        },
    },
]

NEPAL_SITES = [
    {
        "id": "site_rasuwa_camp",
        "name": "Rasuwa Earthquake Relief Camp 4",
        "estate": "Nepal Relief",  # Separate Estate per Correction 2!
        "lat": 28.1200,
        "lon": 85.3100,
        "altitude_m": 2400.0,
        "district": "Rasuwa",
        "site_type": "relief_camp",
        "occupants": 6,
        "notes": "Winter emergency relief tent; road severed by landslides; UNHCR tarpaulin shelter",
        "current_design": {
            "name": "UNHCR Relief Shelter v1",
            "geometry": {"length_m": 4.5, "width_m": 3.2, "height_m": 2.2, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "tarpaulin", "thickness_m": 0.002}],
                "roof": [{"material": "tarpaulin", "thickness_m": 0.002}],
                "floor": [{"material": "mud_skirt", "thickness_m": 0.10}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 1.2, "glazing": "pe_plastic_sheeting", "night_shutter": False}],
            "ventilation": {"ach": 1.2, "heater_type": "none"},
            "occupancy": {"people": 6, "watts_per_person": 100},
        },
    },
]

STANDARD_DESIGNS = [
    {
        "id": "des_std_fwd_post",
        "name": "Standard Forward Post Type-A",
        "revision": 3,
        "status": "approved",
        "author": "MES Leh Directorate",
        "design_json": {
            "name": "Standard Forward Post Type-A Rev 3",
            "geometry": {"length_m": 6.0, "width_m": 4.0, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "stone_masonry", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.08}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.05}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 3.5, "glazing": "double_pane_shutter", "night_shutter": True}],
            "ventilation": {"ach": 0.40, "heater_type": "none"},
            "occupancy": {"people": 10, "watts_per_person": 100},
        },
    },
    {
        "id": "des_std_trombe_dwelling",
        "name": "Ladakh Passive Trombe Dwelling",
        "revision": 2,
        "status": "approved",
        "author": "LEDeG / DIHAR Collaboration",
        "design_json": {
            "name": "Ladakh Passive Trombe Dwelling Rev 2",
            "geometry": {"length_m": 7.0, "width_m": 5.0, "height_m": 2.6, "orientation_deg": 180},
            "envelope": {
                "walls": [{"material": "mud_brick", "thickness_m": 0.35}, {"material": "eps", "thickness_m": 0.08}],
                "roof": [{"material": "concrete", "thickness_m": 0.15}, {"material": "eps", "thickness_m": 0.05}],
                "floor": [{"material": "stone_floor", "thickness_m": 0.15}],
                "roof_emissivity": 0.90,
            },
            "openings": [{"facing": "south", "area_m2": 5.0, "glazing": "double_pane_shutter", "night_shutter": True}],
            "ventilation": {"ach": 0.40, "heater_type": "none"},
            "occupancy": {"people": 6, "watts_per_person": 100},
        },
    },
]


def seed_platform():
    print("Initializing THERMA DB schema...")
    init_db()

    now = datetime.now(timezone.utc).isoformat()

    # 1. Seed standard library designs
    print("Seeding standard library designs...")
    for d in STANDARD_DESIGNS:
        execute(
            """
            INSERT INTO designs (id, name, revision, status, design_json, author, created_at, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              revision = excluded.revision,
              design_json = excluded.design_json
            """,
            (d["id"], d["name"], d["revision"], d["status"], json.dumps(d["design_json"]), d["author"], now),
        )

    # 2. Seed sites
    all_sites = LADAKH_SITES + NEPAL_SITES
    print(f"Seeding {len(all_sites)} sites across 2 estates (Ladakh: 11, Nepal Relief: 1)...")

    for s in all_sites:
        execute(
            """
            INSERT INTO sites (id, name, estate, lat, lon, altitude_m, district, site_type, occupants, current_design_json, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              estate = excluded.estate,
              lat = excluded.lat,
              lon = excluded.lon,
              altitude_m = excluded.altitude_m,
              district = excluded.district,
              site_type = excluded.site_type,
              occupants = excluded.occupants,
              current_design_json = excluded.current_design_json,
              notes = excluded.notes,
              updated_at = excluded.updated_at
            """,
            (
                s["id"],
                s["name"],
                s["estate"],
                s["lat"],
                s["lon"],
                s["altitude_m"],
                s["district"],
                s["site_type"],
                s["occupants"],
                json.dumps(s["current_design"]),
                s["notes"],
                now,
                now,
            ),
        )

    # 3. Evaluate each site with real engine and store in site_results
    print("Evaluating each site against the REAL engine (no fake numbers)...")
    for s in all_sites:
        site_row = query_one("SELECT * FROM sites WHERE id = ?", (s["id"],))
        summary = _evaluate_site_internal(site_row, "typical_day")
        execute(
            """
            INSERT INTO site_results (site_id, computed_at, weather_mode, summary_json)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(site_id) DO UPDATE SET
              computed_at = excluded.computed_at,
              weather_mode = excluded.weather_mode,
              summary_json = excluded.summary_json
            """,
            (s["id"], now, "typical_day", json.dumps(summary)),
        )
        print(f"  [OK] {s['name']} ({s['estate']}): T_min = {summary['t_in_min_c']} °C, Fuel = {summary['annual_fuel_litres']} L/yr")

    print("\nDatabase seeding & real engine evaluation complete.")


if __name__ == "__main__":
    seed_platform()
