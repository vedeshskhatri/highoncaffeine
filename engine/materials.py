"""
Materials database loader and lookup engine.
Enforces Rule R1: Never invent a number.
Any material with a missing or empty source string raises UnsourcedMaterialError.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any


class UnsourcedMaterialError(ValueError):
    """Raised when a material row lacks a valid, verified source string (Rule R1 violation)."""
    pass


class UnknownMaterialError(KeyError):
    """Raised when looking up a material ID that does not exist in the materials library."""
    pass


@dataclass(frozen=True)
class Material:
    """
    Physical and economic properties of a building material.

    Units:
        k: Thermal conductivity [W/(m·K)]
        rho: Density [kg/m³]
        cp: Specific heat capacity [J/(kg·K)]
        absorptivity: Solar absorptance [-] (0.0 to 1.0)
        emissivity: Long-wave thermal emittance [-] (0.0 to 1.0)
        g_value: Solar heat gain coefficient [-] (0.0 to 1.0, glazing only)
        u_value: Overall heat transfer coefficient [W/(m²·K), glazing only]
        cost_per_m3: Cost per cubic metre [INR/m³] (optional)
        cost_source: Citation for cost figure; if None/empty, rendered as [estimate]
        install_note: Construction/installation guidance note
        locally_available: 1 if obtainable in high-altitude Ladakh region, else 0
        source: Authoritative literature citation (MANDATORY, e.g. 'ASHRAE HoF 2021 Ch.26 Tbl 1')
    """
    id: str
    name: str
    category: str
    k: float
    rho: float
    cp: float
    absorptivity: Optional[float]
    emissivity: Optional[float]
    g_value: Optional[float]
    u_value: Optional[float]
    cost_per_m3: Optional[float]
    cost_source: Optional[str]
    install_note: Optional[str]
    locally_available: int
    source: str


def _parse_optional_float(val: Optional[str]) -> Optional[float]:
    """Parse string to float or return None if empty."""
    if val is None:
        return None
    s = val.strip()
    return float(s) if s else None


_CACHED_MATERIALS: Optional[Dict[str, Material]] = None


def load(csv_path: Optional[str | Path] = None) -> Dict[str, Material]:
    """
    Load materials from CSV file into a dictionary keyed by material ID.

    Args:
        csv_path: Path to materials CSV. Defaults to /data/materials.csv relative to project root.

    Returns:
        Dict[str, Material]: Loaded materials dictionary.

    Raises:
        UnsourcedMaterialError: If any row has an empty, whitespace, or missing 'source' column.
        FileNotFoundError: If the CSV file does not exist.
    """
    global _CACHED_MATERIALS
    if csv_path is None and _CACHED_MATERIALS is not None:
        return _CACHED_MATERIALS

    if csv_path is None:
        # Resolve path relative to this file: engine/../data/materials.csv
        csv_path = Path(__file__).resolve().parent.parent / "data" / "materials.csv"
    else:
        csv_path = Path(csv_path)

    if not csv_path.exists():
        raise FileNotFoundError(f"Materials database file not found: {csv_path}")

    materials: Dict[str, Material] = {}

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            mat_id = (row.get("id") or "").strip()
            if not mat_id:
                continue

            source = (row.get("source") or "").strip()
            if not source:
                raise UnsourcedMaterialError(
                    f"Row {row_num} (material '{mat_id}') lacks an authoritative source. "
                    f"Rule R1 violation: unsourced materials are forbidden."
                )

            name = (row.get("name") or "").strip()
            category = (row.get("category") or "").strip()

            k = float(row["k"])
            rho = float(row["rho"])
            cp = float(row["cp"])

            absorptivity = _parse_optional_float(row.get("absorptivity"))
            emissivity = _parse_optional_float(row.get("emissivity"))
            g_value = _parse_optional_float(row.get("g_value"))
            u_value = _parse_optional_float(row.get("u_value"))
            cost_per_m3 = _parse_optional_float(row.get("cost_per_m3"))

            cost_source = (row.get("cost_source") or "").strip() or None
            install_note = (row.get("install_note") or "").strip() or None

            loc_avail_str = (row.get("locally_available") or "0").strip()
            locally_available = int(loc_avail_str) if loc_avail_str else 0

            mat = Material(
                id=mat_id,
                name=name,
                category=category,
                k=k,
                rho=rho,
                cp=cp,
                absorptivity=absorptivity,
                emissivity=emissivity,
                g_value=g_value,
                u_value=u_value,
                cost_per_m3=cost_per_m3,
                cost_source=cost_source,
                install_note=install_note,
                locally_available=locally_available,
                source=source,
            )
            materials[mat_id] = mat

    if csv_path == Path(__file__).resolve().parent.parent / "data" / "materials.csv":
        _CACHED_MATERIALS = materials

    return materials


def get(material_id: str, materials: Optional[Dict[str, Material]] = None) -> Material:
    """
    Look up a material by its unique identifier.

    Args:
        material_id: String ID of the material (e.g. 'mud_brick').
        materials: Optional pre-loaded dict. If None, loads default library.

    Returns:
        Material: The requested material object.

    Raises:
        UnknownMaterialError: If material_id is not in the library.
    """
    if materials is None:
        materials = load()

    if material_id not in materials:
        raise UnknownMaterialError(f"Unknown material ID: '{material_id}'. Available: {list(materials.keys())}")

    return materials[material_id]


def resolve(envelope: Any, materials: Optional[Dict[str, Material]] = None) -> Dict[str, Any]:
    """
    Resolve thermal properties for an envelope's layers.

    Args:
        envelope: Object with surfaces (walls, roof, floor, etc.) containing layers.
        materials: Pre-loaded materials dict (optional).

    Returns:
        Dict[str, Any]: Resolved properties with total resistance [m²·K/W],
                        conductance [W/(m²·K)], and areal capacitance [J/(m²·K)].
    """
    if materials is None:
        materials = load()

    resolved = {}
    for surface_name in ["walls", "roof", "floor"]:
        layers = getattr(envelope, surface_name, ())
        total_r = 0.0  # m2·K/W
        total_c = 0.0  # J/(m2·K)

        for layer in layers:
            mat = get(layer.material_id, materials)
            dx = layer.thickness_m  # metres
            r_layer = dx / mat.k
            c_layer = mat.rho * mat.cp * dx
            total_r += r_layer
            total_c += c_layer

        u_val = 1.0 / total_r if total_r > 0 else 0.0
        resolved[surface_name] = {
            "r_value": total_r,  # m2·K/W
            "u_value": u_val,    # W/(m2·K)
            "capacitance": total_c,  # J/(m2·K)
        }

    return resolved
