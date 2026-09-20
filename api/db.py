"""
Thin SQLite database helper for THERMA per brain/02_TRD.md & brain/04_DATA_MODEL.md.
Raw sqlite3, parameterized queries, row-to-dict conversion. Target ~40 lines.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SOURCE_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "therma.db"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "scripts" / "schema.sql"

# On serverless platforms like Vercel (AWS Lambda), root is read-only.
# We copy seeded therma.db to /tmp if running in a serverless environment (VERCEL or AWS_LAMBDA).
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    TMP_DB = Path("/tmp/therma.db")
    if not TMP_DB.exists() and SOURCE_DB_PATH.exists():
        try:
            shutil.copy2(SOURCE_DB_PATH, TMP_DB)
        except Exception:
            pass
    DB_PATH = TMP_DB if TMP_DB.exists() else SOURCE_DB_PATH
else:
    DB_PATH = SOURCE_DB_PATH


def round_coords(lat: float, lon: float) -> Tuple[float, float]:
    """Round coordinates to 4 decimal places in ONE canonical place."""
    return round(float(lat), 4), round(float(lon), 4)


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Return a SQLite connection with Row factory enabled."""
    target = db_path or DB_PATH
    # If the target path's directory is read-only and write fails, fallback to /tmp
    try:
        conn = sqlite3.connect(str(target))
    except sqlite3.OperationalError:
        tmp_target = Path("/tmp/therma.db")
        if not tmp_target.exists() and SOURCE_DB_PATH.exists():
            shutil.copy2(SOURCE_DB_PATH, tmp_target)
        conn = sqlite3.connect(str(tmp_target))
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


def execute_many(sql: str, seq_of_params: Any, db_path: Optional[Path] = None) -> int:
    """Execute batch write queries with executemany in a single transaction."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.executemany(sql, seq_of_params)
        conn.commit()
        return cursor.rowcount

