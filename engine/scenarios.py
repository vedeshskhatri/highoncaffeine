"""
THERMA SCENARIO LIBRARY
Standardized, physically grounded shelter design scenarios built ONLY from valid repository data.

Four required scenario concepts:
1. Cold high-altitude shelter (Ladakh alpine desert, passive solar envelope)
2. Hot-dry shelter (Thar desert, high thermal mass lag & solar attenuation)
3. Warm-humid shelter (Eastern Command, high natural air exchange & convective cooling)
4. Existing shelter retrofit (Tangtse/Pangong outpost, uninsulated stone envelope, retrofit ranking)

Each scenario defines:
- description: Detailed engineering context and environmental constraints
- purpose: Architectural and mission-specific evaluation objective
- input_configuration: Valid SimulateRequest dictionary referencing valid materials in data/materials.csv
- weather_source: Meteorological provider, driving mode, date, and grid cell note
- expected_demonstration_capability: Qualitative demonstration capability strictly avoiding invented numbers
"""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

# Path to materials database
MATERIALS_CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "materials.csv"


def load_valid_material_ids() -> set[str]:
    """Load all valid material IDs from data/materials.csv."""
    material_ids = set()
    if MATERIALS_CSV_PATH.exists():
        with open(MATERIALS_CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                mid = row.get("id", "").strip()
                if mid:
                    material_ids.add(mid)
    return material_ids


# ─────────────────────────────────────────────────────────────────────────────
# 1. Cold High-Altitude Shelter
# ─────────────────────────────────────────────────────────────────────────────
COLD_HIGH_ALTITUDE_SCENARIO: Dict[str, Any] = {
    "id": "cold_high_altitude",
    "concept": "cold_high_altitude",
    "title": "Cold High-Altitude Alpine Shelter",
    "description": (
        "High-altitude military forward post in the Ladakh Himalayas subjected to severe "
        "sub-zero ambient temperatures (-20°C nocturnal dips), extreme diurnal swings, "
        "and intense daytime solar irradiance."
    ),
    "purpose": (
        "Demonstrate passive solar envelope design, solar heat gain capture through "
        "south-facing double glazing, envelope thermal resistance using stone masonry with EPS, "
        "and baseline heating demand reduction."
    ),
    "input_configuration": {
        "location": {
            "lat": 34.1526,
            "lon": 77.5771,
            "altitude_m": 3500.0,
        },
        "weather": {
            "mode": "design_winter_night",
            "date": "2026-01-15",
            "hours": 24,
            "user_csv_id": None,
        },
        "geometry": {
            "length_m": 6.0,
            "width_m": 4.0,
            "height_m": 2.6,
            "orientation_deg": 180.0,
        },
        "envelope": {
            "walls": [
                {"material": "stone_masonry", "thickness_m": 0.30},
                {"material": "eps", "thickness_m": 0.05},
            ],
            "roof": [
                {"material": "concrete", "thickness_m": 0.15},
                {"material": "eps", "thickness_m": 0.05},
            ],
            "floor": [
                {"material": "stone_floor", "thickness_m": 0.10},
            ],
            "roof_emissivity": 0.90,
        },
        "openings": [
            {
                "facing": "south",
                "area_m2": 4.0,
                "glazing": "double_pane",
                "night_shutter": False,
            }
        ],
        "ventilation": {
            "ach": 0.6,
            "heater_type": "none",
        },
        "occupancy": {
            "people": 8,
            "watts_per_person": 100.0,
        },
    },
    "weather_source": {
        "provider": "Open-Meteo Historical & Climate Reanalysis / ECMWF ERA5",
        "mode": "design_winter_night",
        "date": "2026-01-15",
        "grid_note": "Grid cell 34.15N, 77.58E (Nyoma/Chushul sector) at 3,500m elevation; clear-sky sub-zero winter diurnal regime.",
    },
    "expected_demonstration_capability": (
        "Demonstrates passive solar heat retention, nighttime envelope conductive heat loss, "
        "and baseline heating demand under extreme Himalayan winter conditions."
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Hot-Dry Shelter
# ─────────────────────────────────────────────────────────────────────────────
HOT_DRY_SCENARIO: Dict[str, Any] = {
    "id": "hot_dry",
    "concept": "hot_dry",
    "title": "Hot-Dry Desert Outpost",
    "description": (
        "Arid border post in the Thar Desert subjected to extreme daytime solar irradiation, "
        "elevated peak ambient temperatures, and significant diurnal temperature swings."
    ),
    "purpose": (
        "Demonstrate high-mass envelope thermal lag damping using rammed earth, solar heat "
        "attenuation via high-reflectance roof surfaces, and prevention of daytime interior overheating."
    ),
    "input_configuration": {
        "location": {
            "lat": 26.9157,
            "lon": 70.9083,
            "altitude_m": 225.0,
        },
        "weather": {
            "mode": "typical_day",
            "date": "2026-05-15",
            "hours": 24,
            "user_csv_id": None,
        },
        "geometry": {
            "length_m": 6.0,
            "width_m": 4.0,
            "height_m": 3.0,
            "orientation_deg": 180.0,
        },
        "envelope": {
            "walls": [
                {"material": "rammed_earth", "thickness_m": 0.40},
            ],
            "roof": [
                {"material": "concrete", "thickness_m": 0.20},
            ],
            "floor": [
                {"material": "stone_floor", "thickness_m": 0.15},
            ],
            "roof_emissivity": 0.85,
        },
        "openings": [
            {
                "facing": "north",
                "area_m2": 1.5,
                "glazing": "double_pane",
                "night_shutter": False,
            }
        ],
        "ventilation": {
            "ach": 1.5,
            "heater_type": "none",
        },
        "occupancy": {
            "people": 4,
            "watts_per_person": 100.0,
        },
    },
    "weather_source": {
        "provider": "Open-Meteo Surface Reanalysis / IMD Climatological Normals",
        "mode": "typical_day",
        "date": "2026-05-15",
        "grid_note": "Grid cell 26.92N, 70.91E (Jaisalmer sector) at 225m elevation; arid desert high-insolation regime.",
    },
    "expected_demonstration_capability": (
        "Demonstrates thermal inertia phase delay through earthen masonry walls, diurnal "
        "temperature fluctuation damping, and passive cooling performance."
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Warm-Humid Shelter
# ─────────────────────────────────────────────────────────────────────────────
WARM_HUMID_SCENARIO: Dict[str, Any] = {
    "id": "warm_humid",
    "concept": "warm_humid",
    "title": "Warm-Humid Monsoon Outpost",
    "description": (
        "Tropical forward outpost in the Eastern Command valley subjected to elevated humidity, "
        "high nocturnal temperatures, and diffused overcast solar radiation."
    ),
    "purpose": (
        "Demonstrate convective cooling through elevated natural ventilation rates, lightweight "
        "modular envelope thermal response, and operative comfort maintenance under humid monsoon conditions."
    ),
    "input_configuration": {
        "location": {
            "lat": 26.7271,
            "lon": 88.3953,
            "altitude_m": 120.0,
        },
        "weather": {
            "mode": "typical_day",
            "date": "2026-07-20",
            "hours": 24,
            "user_csv_id": None,
        },
        "geometry": {
            "length_m": 5.0,
            "width_m": 4.0,
            "height_m": 2.8,
            "orientation_deg": 180.0,
        },
        "envelope": {
            "walls": [
                {"material": "prefab_sandwich", "thickness_m": 0.08},
            ],
            "roof": [
                {"material": "cgi_sheet", "thickness_m": 0.005},
                {"material": "rockwool", "thickness_m": 0.05},
            ],
            "floor": [
                {"material": "dense_concrete", "thickness_m": 0.10},
            ],
            "roof_emissivity": 0.85,
        },
        "openings": [
            {
                "facing": "south",
                "area_m2": 3.0,
                "glazing": "single_pane",
                "night_shutter": False,
            }
        ],
        "ventilation": {
            "ach": 4.0,
            "heater_type": "none",
        },
        "occupancy": {
            "people": 6,
            "watts_per_person": 100.0,
        },
    },
    "weather_source": {
        "provider": "Open-Meteo Surface Reanalysis / IMD Tropical Monsoon Data",
        "mode": "typical_day",
        "date": "2026-07-20",
        "grid_note": "Grid cell 26.73N, 88.40E (Siliguri/Teesta corridor) at 120m elevation; tropical monsoon high-humidity regime.",
    },
    "expected_demonstration_capability": (
        "Demonstrates natural ventilation convective heat dissipation, lightweight envelope "
        "thermal tracking, and indoor operative comfort bounds."
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. Existing Shelter Retrofit
# ─────────────────────────────────────────────────────────────────────────────
EXISTING_RETROFIT_SCENARIO: Dict[str, Any] = {
    "id": "existing_retrofit",
    "concept": "existing_retrofit",
    "title": "Existing Shelter Retrofit",
    "description": (
        "Legacy uninsulated granite stone masonry barrack at an alpine outpost exhibiting "
        "severe envelope conduction losses and infiltration drafts, requiring targeted "
        "cost-ranked retrofit interventions."
    ),
    "purpose": (
        "Demonstrate Design Doctor thermal bottleneck diagnosis, generation of feasible "
        "envelope interventions, cost-effectiveness ranking (degrees per 1000 INR), and safety interlocks."
    ),
    "input_configuration": {
        "location": {
            "lat": 34.0167,
            "lon": 78.1667,
            "altitude_m": 3900.0,
        },
        "weather": {
            "mode": "design_winter_night",
            "date": "2026-01-15",
            "hours": 24,
            "user_csv_id": None,
        },
        "geometry": {
            "length_m": 7.0,
            "width_m": 4.5,
            "height_m": 2.6,
            "orientation_deg": 180.0,
        },
        "envelope": {
            "walls": [
                {"material": "stone_masonry", "thickness_m": 0.35},
            ],
            "roof": [
                {"material": "concrete", "thickness_m": 0.12},
            ],
            "floor": [
                {"material": "stone_floor", "thickness_m": 0.10},
            ],
            "roof_emissivity": 0.90,
        },
        "openings": [
            {
                "facing": "south",
                "area_m2": 2.0,
                "glazing": "single_pane",
                "night_shutter": False,
            }
        ],
        "ventilation": {
            "ach": 1.2,
            "heater_type": "none",
        },
        "occupancy": {
            "people": 8,
            "watts_per_person": 100.0,
        },
    },
    "weather_source": {
        "provider": "Open-Meteo Surface Reanalysis / ERA5 Alpine Grid",
        "mode": "design_winter_night",
        "date": "2026-01-15",
        "grid_note": "Grid cell 34.02N, 78.17E (Tangtse/Pangong sector) at 3,900m elevation; severe sub-zero winter conditions.",
    },
    "expected_demonstration_capability": (
        "Demonstrates diagnostic identification of envelope heat loss weaknesses, "
        "Pareto-ranked retrofit intervention generation, cost-benefit evaluation, "
        "and heating fuel reduction."
    ),
}

# The definitive list of all predefined scenarios
SCENARIOS: List[Dict[str, Any]] = [
    COLD_HIGH_ALTITUDE_SCENARIO,
    HOT_DRY_SCENARIO,
    WARM_HUMID_SCENARIO,
    EXISTING_RETROFIT_SCENARIO,
]


def validate_scenario(scenario: Dict[str, Any]) -> List[str]:
    """
    Validate that a scenario satisfies all Phase 11 constraints:
    - Contains description, purpose, input_configuration, weather_source, expected_demonstration_capability.
    - All materials cited exist in data/materials.csv.
    - expected_demonstration_capability contains no invented numerical claims (e.g. '4.2 kW', '12 °C').
    """
    errors: List[str] = []
    required_keys = [
        "id",
        "concept",
        "title",
        "description",
        "purpose",
        "input_configuration",
        "weather_source",
        "expected_demonstration_capability",
    ]
    for k in required_keys:
        if k not in scenario or not scenario[k]:
            errors.append(f"Missing required field: {k}")

    # Check for invented numerical claims in capability string
    capability = scenario.get("expected_demonstration_capability", "")
    # Check for patterns like '4.2 kW', '12 °C', '25 %', '100 W', numbers with units
    num_with_unit = re.search(r"\b\d+(\.\d+)?\s*(kw|kwh|°c|c|deg|%|w|inr|rs|litres|l)\b", capability, re.IGNORECASE)
    if num_with_unit:
        errors.append(f"Found invented numerical claim in capability: '{num_with_unit.group(0)}'")

    # Check materials
    valid_materials = load_valid_material_ids()
    cfg = scenario.get("input_configuration", {})
    envelope = cfg.get("envelope", {})
    for surface in ("walls", "roof", "floor"):
        for layer in envelope.get(surface, []):
            mat = layer.get("material")
            if mat and mat not in valid_materials:
                errors.append(f"Unknown material '{mat}' in {surface} layer")

    for opening in cfg.get("openings", []):
        glz = opening.get("glazing")
        if glz and glz not in valid_materials:
            errors.append(f"Unknown glazing material '{glz}'")

    return errors


def get_all_scenarios() -> List[Dict[str, Any]]:
    """Return all predefined scenarios after validation."""
    for s in SCENARIOS:
        errs = validate_scenario(s)
        if errs:
            raise ValueError(f"Scenario {s.get('id')} failed validation: {'; '.join(errs)}")
    return SCENARIOS


def get_scenario_by_id(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Look up a predefined scenario by its ID."""
    for s in SCENARIOS:
        if s["id"] == scenario_id:
            return s
    return None
