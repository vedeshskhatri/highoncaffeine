"""
Test suite for Materials library and loader (Rule R1 enforcement).
"""

import os
import tempfile
import pytest
from engine.materials import load, get, Material, UnsourcedMaterialError, UnknownMaterialError


def test_shipped_materials_have_valid_sources():
    """Verify that every single row in the shipped materials.csv has a non-empty, authoritative source."""
    materials = load()
    assert len(materials) >= 15, f"Expected at least 15 materials, found {len(materials)}"

    for mat_id, mat in materials.items():
        assert mat.source is not None and mat.source.strip() != "", (
            f"Rule R1 violation: material '{mat_id}' has empty or missing source."
        )
        assert mat.k > 0, f"Thermal conductivity k must be > 0 for {mat_id}"
        assert mat.rho > 0, f"Density rho must be > 0 for {mat_id}"
        assert mat.cp > 0, f"Specific heat cp must be > 0 for {mat_id}"


def test_loader_raises_unsourced_material_error():
    """Verify that loader strictly refuses any material with missing source string."""
    csv_content = (
        "id,name,category,k,rho,cp,absorptivity,emissivity,g_value,u_value,cost_per_m3,cost_source,install_note,locally_available,source\n"
        "invented_foam,Invented Foam,insulation,0.03,30,1200,,,,4000,,quick install,1,\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
        tmp.write(csv_content)
        tmp_path = tmp.name

    try:
        with pytest.raises(UnsourcedMaterialError) as exc_info:
            load(tmp_path)
        assert "Rule R1 violation" in str(exc_info.value)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_lookup_unknown_material_raises():
    """Verify that looking up a nonexistent material ID raises UnknownMaterialError."""
    materials = load()
    with pytest.raises(UnknownMaterialError) as exc_info:
        get("non_existent_unobtanium", materials)
    assert "Unknown material ID" in str(exc_info.value)


def test_required_categories_present():
    """Verify that the materials database covers all five required categories per 04_DATA_MODEL.md."""
    materials = load()
    categories = {m.category for m in materials.values()}
    required = {"structural", "insulation", "glazing", "mass", "relief"}
    assert required.issubset(categories), f"Missing categories: {required - categories}"
