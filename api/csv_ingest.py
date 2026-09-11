"""
User weather CSV ingest module for THERMA per brain/05_DATA_SOURCES.md & brain/09_ERROR_HANDLING.md.
Collects ALL column-level errors across rows; never fails fast.
"""

from __future__ import annotations

import csv
import io
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from api.db import execute, round_coords
from api.errors import ThermaError


class CsvValidationError(ThermaError):
    def __init__(self, errors: List[Dict[str, Any]]):
        super().__init__("CSV validation failed with multiple errors.")
        self.errors = errors


def parse_and_validate_csv(csv_text: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse pasted CSV string.
    Required columns: datetime, t_air_c, ghi_wm2
    Optional columns: dni_wm2, dhi_wm2, wind_ms, rh_pct

    Collects ALL errors across rows and columns.
    """
    f = io.StringIO(csv_text.strip())
    reader = csv.reader(f)

    # Read header
    try:
        header_row = next(reader)
    except StopIteration:
        raise CsvValidationError([{"row": 1, "column": "header", "problem": "CSV content is empty"}])

    headers = [h.strip().lower() for h in header_row]

    # Check required columns
    required_cols = ["datetime", "t_air_c", "ghi_wm2"]
    missing_required = [col for col in required_cols if col not in headers]
    if missing_required:
        raise CsvValidationError([
            {"row": 1, "column": col, "problem": f"Missing required column '{col}'"}
            for col in missing_required
        ])

    idx_dt = headers.index("datetime")
    idx_t_air = headers.index("t_air_c")
    idx_ghi = headers.index("ghi_wm2")
    idx_dni = headers.index("dni_wm2") if "dni_wm2" in headers else -1
    idx_dhi = headers.index("dhi_wm2") if "dhi_wm2" in headers else -1
    idx_wind = headers.index("wind_ms") if "wind_ms" in headers else -1
    idx_rh = headers.index("rh_pct") if "rh_pct" in headers else -1

    warnings: List[str] = []
    if idx_dni == -1:
        warnings.append("dni_wm2 absent — estimated from ghi")
    if idx_dhi == -1:
        warnings.append("dhi_wm2 absent — estimated from ghi")
    if idx_wind == -1:
        warnings.append("wind_ms absent — default 2.0 m/s used")
    if idx_rh == -1:
        warnings.append("rh_pct absent — default 30% used")

    errors: List[Dict[str, Any]] = []
    parsed_rows: List[Dict[str, Any]] = []

    for row_num, row in enumerate(reader, start=2):
        if not row or all(c.strip() == "" for c in row):
            continue

        # Check column length
        if len(row) < len(headers):
            errors.append({
                "row": row_num,
                "column": "row",
                "problem": f"Row has {len(row)} columns, expected {len(headers)}"
            })
            continue

        # 1. Validate datetime
        raw_dt = row[idx_dt].strip()
        dt_val = None
        # Try several standard date formats
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
            try:
                dt_val = datetime.strptime(raw_dt, fmt)
                break
            except ValueError:
                pass
        if dt_val is None:
            errors.append({
                "row": row_num,
                "column": "datetime",
                "problem": f"unparseable datetime: '{raw_dt}'"
            })

        # 2. Validate t_air_c
        raw_t = row[idx_t_air].strip()
        t_val = None
        try:
            t_val = float(raw_t)
            if t_val < -70.0 or t_val > 60.0:
                errors.append({
                    "row": row_num,
                    "column": "t_air_c",
                    "problem": f"temperature {t_val} out of realistic physical range [-70, 60] C"
                })
        except ValueError:
            errors.append({
                "row": row_num,
                "column": "t_air_c",
                "problem": f"not a number: '{raw_t}'"
            })

        # 3. Validate ghi_wm2
        raw_ghi = row[idx_ghi].strip()
        ghi_val = None
        try:
            ghi_val = float(raw_ghi)
            if ghi_val < 0.0 or ghi_val > 1500.0:
                errors.append({
                    "row": row_num,
                    "column": "ghi_wm2",
                    "problem": f"irradiance {ghi_val} out of physical range [0, 1500] W/m2"
                })
        except ValueError:
            errors.append({
                "row": row_num,
                "column": "ghi_wm2",
                "problem": f"not a number: '{raw_ghi}'"
            })

        # 4. Optional columns validation if present
        dni_val = None
        if idx_dni != -1:
            try:
                dni_val = float(row[idx_dni].strip())
            except ValueError:
                errors.append({"row": row_num, "column": "dni_wm2", "problem": f"not a number: '{row[idx_dni]}'"})

        dhi_val = None
        if idx_dhi != -1:
            try:
                dhi_val = float(row[idx_dhi].strip())
            except ValueError:
                errors.append({"row": row_num, "column": "dhi_wm2", "problem": f"not a number: '{row[idx_dhi]}'"})

        wind_val = 2.0
        if idx_wind != -1:
            try:
                wind_val = float(row[idx_wind].strip())
            except ValueError:
                errors.append({"row": row_num, "column": "wind_ms", "problem": f"not a number: '{row[idx_wind]}'"})

        rh_val = 30.0
        if idx_rh != -1:
            try:
                rh_val = float(row[idx_rh].strip())
            except ValueError:
                errors.append({"row": row_num, "column": "rh_pct", "problem": f"not a number: '{row[idx_rh]}'"})

        if t_val is not None and ghi_val is not None and dt_val is not None:
            # Estimate dni / dhi if not provided
            if dni_val is None:
                dni_val = max(0.0, ghi_val * 0.85) if ghi_val > 40.0 else 0.0
            if dhi_val is None:
                dhi_val = max(0.0, ghi_val * 0.15) if ghi_val > 0.0 else 0.0

            parsed_rows.append({
                "hour": dt_val.hour if hasattr(dt_val, "hour") else len(parsed_rows),
                "date": dt_val.strftime("%Y-%m-%d"),
                "t_air": t_val,
                "ghi": ghi_val,
                "dni": dni_val,
                "dhi": dhi_val,
                "wind": wind_val,
                "rh": rh_val,
                "snow_cover": 1 if t_val < 0.0 else 0,
            })

    if errors:
        raise CsvValidationError(errors)

    if not parsed_rows:
        raise CsvValidationError([{"row": 2, "column": "data", "problem": "No valid data rows found in CSV"}])

    return parsed_rows, warnings


def store_user_csv(
    parsed_rows: List[Dict[str, Any]],
    lat: float = 34.1526,
    lon: float = 77.5771,
) -> str:
    """Store parsed rows into SQLite weather_cache tagged with unique user_csv_id."""
    user_csv_id = f"csv_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    c_lat, c_lon = round_coords(lat, lon)

    for r in parsed_rows:
        execute(
            """
            INSERT OR REPLACE INTO weather_cache (
                lat, lon, date, hour, t_air, ghi, dni, dhi, wind, rh, snow_cover, provider, fetched_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            (
                c_lat,
                c_lon,
                user_csv_id,  # store user_csv_id in date column for unique retrieval
                r["hour"],
                r["t_air"],
                r["ghi"],
                r["dni"],
                r["dhi"],
                r["wind"],
                r["rh"],
                r["snow_cover"],
                "user-csv",
                now_iso,
            ),
        )

    return user_csv_id
