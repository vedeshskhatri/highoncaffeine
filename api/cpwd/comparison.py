"""
Deterministic CPWD Rate Comparison Engine.
Calculates absolute and percentage rate changes, new/discontinued item detections,
and edition diffs between CPWD years. All math is strictly computed in Python backend.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from api.db import DB_PATH, get_connection
from api.cpwd.db import get_item_by_code


def compare_item_rates(
    item_code: str,
    year_old: int,
    year_new: int,
    db_path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """Compare a single CPWD item between two editions."""
    old_records = get_item_by_code(item_code, year=year_old, db_path=db_path)
    new_records = get_item_by_code(item_code, year=year_new, db_path=db_path)

    if not old_records and not new_records:
        return None

    old_item = old_records[0] if old_records else None
    new_item = new_records[0] if new_records else None

    old_rate = old_item["rate"] if old_item else None
    new_rate = new_item["rate"] if new_item else None

    absolute_change = None
    percentage_change = None
    status = "unchanged"

    if old_rate is not None and new_rate is not None:
        absolute_change = round(new_rate - old_rate, 2)
        if old_rate > 0:
            percentage_change = round(((new_rate - old_rate) / old_rate) * 100, 2)
        else:
            percentage_change = 0.0

        if absolute_change > 0:
            status = "increased"
        elif absolute_change < 0:
            status = "decreased"
        else:
            status = "unchanged"
    elif old_item is None and new_item is not None:
        status = "new_item"
    elif old_item is not None and new_item is None:
        status = "discontinued"

    return {
        "item_code": item_code,
        "description": new_item["description"] if new_item else (old_item["description"] if old_item else ""),
        "unit_old": old_item["unit"] if old_item else None,
        "unit_new": new_item["unit"] if new_item else None,
        "year_old": year_old,
        "year_new": year_new,
        "rate_old": old_rate,
        "rate_new": new_rate,
        "absolute_change": absolute_change,
        "percentage_change": percentage_change,
        "status": status,
        "unit_changed": (old_item["unit"] != new_item["unit"]) if (old_item and new_item) else False,
        "source_old": {
            "document": old_item["source_document"] if old_item else None,
            "page": old_item["page"] if old_item else None,
        } if old_item else None,
        "source_new": {
            "document": new_item["source_document"] if new_item else None,
            "page": new_item["page"] if new_item else None,
        } if new_item else None,
    }


def compare_editions(
    year_old: int,
    year_new: int,
    category: Optional[str] = None,
    limit: int = 100,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Perform comprehensive multi-item comparison between two editions."""
    with get_connection(db_path) as conn:
        cur = conn.cursor()

        cat_sql = "AND category LIKE ?" if category else ""
        params_old: List[Any] = [year_old]
        params_new: List[Any] = [year_new]
        if category:
            params_old.append(f"%{category}%")
            params_new.append(f"%{category}%")

        cur.execute(f"SELECT item_code, description, unit, rate, page, source_document, category FROM cpwd_items WHERE rate_year = ? {cat_sql}", tuple(params_old))
        items_old = {row["item_code"]: dict(row) for row in cur.fetchall()}

        cur.execute(f"SELECT item_code, description, unit, rate, page, source_document, category FROM cpwd_items WHERE rate_year = ? {cat_sql}", tuple(params_new))
        items_new = {row["item_code"]: dict(row) for row in cur.fetchall()}

    all_codes = sorted(set(items_old.keys()).union(set(items_new.keys())))

    comparisons = []
    new_items_list = []
    removed_items_list = []
    increased_items = []
    decreased_items = []

    for code in all_codes:
        old = items_old.get(code)
        new = items_new.get(code)

        if old and new:
            r_old = old["rate"]
            r_new = new["rate"]
            abs_chg = round(r_new - r_old, 2)
            pct_chg = round(((r_new - r_old) / r_old * 100), 2) if r_old > 0 else 0.0

            rec = {
                "item_code": code,
                "description": new["description"],
                "category": new["category"],
                "unit_old": old["unit"],
                "unit_new": new["unit"],
                "rate_old": r_old,
                "rate_new": r_new,
                "absolute_change": abs_chg,
                "percentage_change": pct_chg,
                "status": "increased" if abs_chg > 0 else ("decreased" if abs_chg < 0 else "unchanged"),
                "page_old": old["page"],
                "page_new": new["page"],
            }
            comparisons.append(rec)
            if abs_chg > 0:
                increased_items.append(rec)
            elif abs_chg < 0:
                decreased_items.append(rec)
        elif new and not old:
            new_items_list.append({
                "item_code": code,
                "description": new["description"],
                "category": new["category"],
                "unit": new["unit"],
                "rate": new["rate"],
                "page": new["page"],
            })
        elif old and not new:
            removed_items_list.append({
                "item_code": code,
                "description": old["description"],
                "category": old["category"],
                "unit": old["unit"],
                "rate": old["rate"],
                "page": old["page"],
            })

    # Sort largest increases
    increased_items.sort(key=lambda x: x["percentage_change"], reverse=True)

    return {
        "year_old": year_old,
        "year_new": year_new,
        "total_compared": len(comparisons),
        "items_increased": len(increased_items),
        "items_decreased": len(decreased_items),
        "new_items_count": len(new_items_list),
        "removed_items_count": len(removed_items_list),
        "top_rate_increases": increased_items[:15],
        "new_items_sample": new_items_list[:15],
        "items": comparisons[:limit],
    }
