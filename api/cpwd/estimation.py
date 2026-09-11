"""
Deterministic CPWD Estimation Engine.
Calculates Quantity × Rate deterministically in Python.
Validates item availability, unit compatibility, and provides exact source citations.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from api.cpwd.db import get_item_by_code


def estimate_item(
    item_code: str,
    quantity: float,
    year: int = 2020,
    requested_unit: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Calculate single-item estimate with unit validation and citations."""
    records = get_item_by_code(item_code, year=year, db_path=db_path)

    if not records:
        return {
            "success": False,
            "error": f"Item code '{item_code}' not found in CPWD DSR {year}.",
            "item_code": item_code,
            "year": year,
        }

    item = records[0]
    official_unit = (item["unit"] or "each").lower().strip()
    rate = float(item["rate"] or 0.0)

    # Validate unit compatibility if requested
    unit_warning = None
    if requested_unit:
        req_u = requested_unit.lower().strip()
        # Normalization of common aliases
        alias_map = {
            "sqm": "sqm", "sq m": "sqm", "sq.m": "sqm", "m2": "sqm",
            "cum": "cum", "cu m": "cum", "cu.m": "cum", "m3": "cum",
            "m": "metre", "metre": "metre", "meter": "metre",
            "each": "each", "nos": "nos", "no": "nos", "number": "nos",
            "day": "day", "days": "day", "per day": "day",
        }
        norm_req = alias_map.get(req_u, req_u)
        norm_off = alias_map.get(official_unit, official_unit)
        if norm_req != norm_off and norm_off not in norm_req:
            unit_warning = f"Requested unit '{requested_unit}' may not match official CPWD unit '{official_unit}'."

    total_amount = round(quantity * rate, 2)

    return {
        "success": True,
        "item_code": item["item_code"],
        "description": item["description"],
        "category": item["category"],
        "year": year,
        "unit": official_unit,
        "rate": rate,
        "quantity": quantity,
        "total_amount": total_amount,
        "unit_warning": unit_warning,
        "calculation_formula": f"{quantity} {official_unit} × ₹{rate:.2f} = ₹{total_amount:,.2f}",
        "source": {
            "document": item["source_document"],
            "page": item["page"],
            "edition": f"CPWD DSR {year}",
        },
    }


def estimate_bill_of_quantities(
    items: List[Dict[str, Any]],
    year: int = 2020,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Calculate multi-item Bill of Quantities (BOQ)."""
    line_items = []
    grand_total = 0.0
    errors = []

    for idx, entry in enumerate(items):
        code = str(entry.get("item_code", "")).strip()
        qty = float(entry.get("quantity", 1.0))
        unit = entry.get("unit")

        result = estimate_item(code, qty, year=year, requested_unit=unit, db_path=db_path)
        if result.get("success"):
            grand_total += result["total_amount"]
            line_items.append(result)
        else:
            errors.append(result.get("error", f"Error on item {code}"))

    return {
        "year": year,
        "items_count": len(line_items),
        "grand_total": round(grand_total, 2),
        "line_items": line_items,
        "errors": errors,
    }
