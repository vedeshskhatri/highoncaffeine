"""
Database seed script for THERMA.
Rebuilds /data/therma.db from schema.sql and /data/materials.csv.
Enforces Rule R1: fails loudly with UnsourcedMaterialError on any unsourced row.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from api.db import DB_PATH, get_connection, init_db
from api.errors import UnsourcedMaterialError

MATERIALS_CSV = ROOT_DIR / "data" / "materials.csv"


def load_materials_csv(csv_path: Path) -> List[Dict[str, Any]]:
    """
    Read materials CSV and validate sourcing per Rule R1.
    Raises UnsourcedMaterialError on any row with missing or empty source.
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"Materials CSV missing: {csv_path}")

    materials = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            source = (row.get("source") or "").strip()
            mat_id = (row.get("id") or "").strip()
            if not source:
                raise UnsourcedMaterialError(
                    f"Row {row_num} (id='{mat_id}') lacks an authoritative citation in 'source' column. "
                    "Rule R1 violation: Every physical constant and material property must be cited."
                )

            # Convert types
            def parse_float(val: str | None) -> float | None:
                if val is None or val.strip() == "":
                    return None
                return float(val.strip())

            def parse_int(val: str | None, default: int = 0) -> int:
                if val is None or val.strip() == "":
                    return default
                return int(val.strip())

            record = {
                "id": mat_id,
                "name": row["name"].strip(),
                "category": row["category"].strip(),
                "k": float(row["k"]),
                "rho": float(row["rho"]),
                "cp": float(row["cp"]),
                "absorptivity": parse_float(row.get("absorptivity")),
                "emissivity": parse_float(row.get("emissivity")),
                "g_value": parse_float(row.get("g_value")),
                "u_value": parse_float(row.get("u_value")),
                "cost_per_m3": parse_float(row.get("cost_per_m3")),
                "cost_source": row.get("cost_source", "").strip() or None,
                "install_note": row.get("install_note", "").strip() or None,
                "locally_available": parse_int(row.get("locally_available"), 0),
                "source": source,
            }
            materials.append(record)

    return materials


def seed_database(db_path: Path = DB_PATH, csv_path: Path = MATERIALS_CSV) -> Dict[str, int]:
    """Rebuild the SQLite database from schema.sql and materials.csv."""
    # Try importing Aman's loader if available
    try:
        from engine.materials import load_csv_raw as aman_loader
        materials = aman_loader(csv_path)
    except (ImportError, AttributeError):
        materials = load_materials_csv(csv_path)

    # Initialize tables
    init_db(db_path)

    # Insert materials
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM materials;")
        for m in materials:
            cursor.execute(
                """
                INSERT INTO materials (
                    id, name, category, k, rho, cp,
                    absorptivity, emissivity, g_value, u_value,
                    cost_per_m3, cost_source, install_note,
                    locally_available, source
                ) VALUES (
                    :id, :name, :category, :k, :rho, :cp,
                    :absorptivity, :emissivity, :g_value, :u_value,
                    :cost_per_m3, :cost_source, :install_note,
                    :locally_available, :source
                )
                """,
                m,
            )
        conn.commit()

        # Gather table counts
        counts = {}
        for table in ["materials", "weather_cache", "worst_night_profile", "runs"]:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cursor.fetchone()[0]

    return counts


if __name__ == "__main__":
    try:
        counts = seed_database()
        print("Database seeded successfully at:", DB_PATH)
        print("Row counts per table:")
        for table, count in counts.items():
            print(f"  {table}: {count}")
    except UnsourcedMaterialError as e:
        print(f"ERROR: Seeding aborted due to unsourced material: {e}", file=sys.stderr)
        sys.exit(1)
