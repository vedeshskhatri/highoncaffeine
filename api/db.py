"""
Thin SQLite database helper for THERMA per brain/02_TRD.md & brain/04_DATA_MODEL.md.
Raw sqlite3, parameterized queries, row-to-dict conversion. Target ~40 lines.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "therma.db"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "scripts" / "schema.sql"


def round_coords(lat: float, lon: float) -> Tuple[float, float]:
    """Round coordinates to 4 decimal places in ONE canonical place."""
    return round(float(lat), 4), round(float(lon), 4)


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Return a SQLite connection with Row factory enabled."""
    conn = sqlite3.connect(str(db_path or DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize SQLite database tables from schema.sql."""
    target_db = db_path or DB_PATH
    target_db.parent.mkdir(parents=True, exist_ok=True)
    with get_connection(target_db) as conn:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()


def query_all(sql: str, params: Tuple[Any, ...] = (), db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Execute a query and return all rows as dicts."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]


def query_one(sql: str, params: Tuple[Any, ...] = (), db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Execute a query and return a single row as a dict, or None."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None


def execute(sql: str, params: Tuple[Any, ...] = (), db_path: Optional[Path] = None) -> int:
    """Execute a single write query and commit."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount
