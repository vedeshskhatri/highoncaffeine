"""
Comprehensive Automated Test Suite for CPWD AI Knowledge System.
Validates all 15 required test scenarios per requirements:
1. Exact CPWD code retrieval
2. Year-specific retrieval (2016 != 2018 != 2020 != 2025)
3. Rate retrieval with unit
4. Labour rate retrieval
5. Material rate retrieval
6. Specification retrieval
7. Analysis-of-rate retrieval
8. 2016 vs 2018 comparison
9. 2018 vs 2020 comparison
10. 2016 vs 2020 comparison
11. Unknown item query
12. Hallucination prevention
13. Quantity × rate deterministic calculation
14. Source/page citation verification
15. Ollama unavailable behavior
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.cpwd.db import (
    get_analysis_of_rates,
    get_dataset_summary,
    get_item_by_code,
    get_labour_rates,
    get_materials,
    get_specifications,
)
from api.cpwd.comparison import compare_editions, compare_item_rates
from api.cpwd.estimation import estimate_bill_of_quantities, estimate_item
from api.cpwd.ollama_client import OllamaClient
from api.cpwd.retrieval import execute_hybrid_query


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Exact CPWD Code Retrieval
# ---------------------------------------------------------------------------
def test_exact_code_retrieval():
    items = get_item_by_code("0002", year=2020)
    assert len(items) >= 1
    item = items[0]
    assert item["item_code"] == "0002"
    assert "Concrete Mixer" in item["description"]
    assert item["rate"] == 800.0
    assert item["page"] == 13


# ---------------------------------------------------------------------------
# 2. Year-Specific Retrieval (2016 != 2018 != 2020 != 2025)
# ---------------------------------------------------------------------------
def test_year_specific_retrieval():
    beldar_2016 = get_item_by_code("0114", year=2016)[0]
    beldar_2018 = get_item_by_code("0114", year=2018)[0]
    beldar_2020 = get_item_by_code("0114", year=2020)[0]
    beldar_2025 = get_item_by_code("0114", year=2025)[0]

    # Rates must be distinct across editions
    assert beldar_2016["rate"] == 368.0
    assert beldar_2018["rate"] == 553.0
    assert beldar_2020["rate"] == 629.0
    assert beldar_2025["rate"] == 805.0

    assert beldar_2016["rate"] != beldar_2018["rate"]
    assert beldar_2018["rate"] != beldar_2020["rate"]
    assert beldar_2020["rate"] != beldar_2025["rate"]


# ---------------------------------------------------------------------------
# 3. Rate Retrieval with Preserved Unit
# ---------------------------------------------------------------------------
def test_rate_retrieval_with_unit():
    items = get_item_by_code("2.1", year=2020)
    assert len(items) >= 1
    item = items[0]
    assert item["unit"].lower() == "cum"
    assert item["rate"] == 78.10
    assert item["rate_year"] == 2020


# ---------------------------------------------------------------------------
# 4. Labour Rate Retrieval
# ---------------------------------------------------------------------------
def test_labour_rate_retrieval():
    labour_2020 = get_labour_rates(year=2020, query="Beldar")
    assert len(labour_2020) >= 1
    assert labour_2020[0]["code"] == "0114"
    assert labour_2020[0]["rate"] == 629.0
    assert labour_2020[0]["page"] == 15


# ---------------------------------------------------------------------------
# 5. Material & Hire Charge Retrieval
# ---------------------------------------------------------------------------
def test_material_rate_retrieval():
    tanker = get_item_by_code("0046", year=2020)
    assert len(tanker) >= 1
    assert "Water tanker 5000 litre" in tanker[0]["description"]
    assert tanker[0]["rate"] == 1200.0


# ---------------------------------------------------------------------------
# 6. Specification Retrieval
# ---------------------------------------------------------------------------
def test_specification_retrieval():
    specs = get_specifications(year=2020, query="trenching")
    assert len(specs) >= 1
    spec = specs[0]
    assert spec["year"] == 2020
    assert "TRENCHING" in spec["title"] or "HORTICULTURE" in spec["title"]
    assert spec["page"] >= 447


# ---------------------------------------------------------------------------
# 7. Analysis-of-Rate Retrieval
# ---------------------------------------------------------------------------
def test_analysis_of_rate_retrieval():
    summary = get_dataset_summary()
    assert summary["analysis_of_rates"] > 1000
    records = get_analysis_of_rates("2.0", year=2020)
    assert len(records) > 0
    assert records[0]["year"] == 2020


# ---------------------------------------------------------------------------
# 8. 2016 vs 2018 Comparison
# ---------------------------------------------------------------------------
def test_comparison_2016_vs_2018():
    comp = compare_item_rates("0114", 2016, 2018)
    assert comp is not None
    assert comp["rate_old"] == 368.0
    assert comp["rate_new"] == 553.0
    assert comp["absolute_change"] == 185.0
    assert comp["percentage_change"] == round(((553.0 - 368.0) / 368.0) * 100, 2)
    assert comp["status"] == "increased"


# ---------------------------------------------------------------------------
# 9. 2018 vs 2020 Comparison
# ---------------------------------------------------------------------------
def test_comparison_2018_vs_2020():
    comp = compare_item_rates("0114", 2018, 2020)
    assert comp is not None
    assert comp["rate_old"] == 553.0
    assert comp["rate_new"] == 629.0
    assert comp["absolute_change"] == 76.0
    assert comp["percentage_change"] == round(((629.0 - 553.0) / 553.0) * 100, 2)
    assert comp["status"] == "increased"


# ---------------------------------------------------------------------------
# 10. 2016 vs 2020 Comparison
# ---------------------------------------------------------------------------
def test_comparison_2016_vs_2020():
    comp = compare_item_rates("0114", 2016, 2020)
    assert comp is not None
    assert comp["rate_old"] == 368.0
    assert comp["rate_new"] == 629.0
    assert comp["absolute_change"] == 261.0
    assert comp["percentage_change"] == 70.92

    ed_comp = compare_editions(2016, 2020)
    assert ed_comp["total_compared"] > 500
    assert ed_comp["items_increased"] > 0


# ---------------------------------------------------------------------------
# 11. Unknown Item Query & 12. Hallucination Prevention
# ---------------------------------------------------------------------------
def test_unknown_item_and_hallucination_prevention():
    res = execute_hybrid_query("Give me rate for item 999999 in 2020")
    assert res["exact_match"] is False
    assert "do not contain sufficient information" in res["answer"]
    assert res["confidence_score"] == 0.0
    assert len(res["citations"]) == 0


# ---------------------------------------------------------------------------
# 13. Quantity × Rate Deterministic Calculation
# ---------------------------------------------------------------------------
def test_quantity_times_rate_calculation():
    est = estimate_item("2.1", quantity=500, year=2020, requested_unit="cum")
    assert est["success"] is True
    assert est["rate"] == 78.10
    assert est["quantity"] == 500
    assert est["total_amount"] == round(500 * 78.10, 2)
    assert est["unit"] == "cum"
    assert est["source"]["document"] == "DSR_Horticulture_2020.pdf"
    assert est["source"]["page"] == 95


# ---------------------------------------------------------------------------
# 14. Source & Page Citation Verification
# ---------------------------------------------------------------------------
def test_source_page_citation():
    res = execute_hybrid_query("Give me rate for item 0002 in 2020")
    assert res["exact_match"] is True
    assert len(res["citations"]) >= 1
    citation = res["citations"][0]
    assert citation["document"] == "DSR_Horticulture_2020.pdf"
    assert citation["page"] == 13
    assert citation["item_code"] == "0002"
    assert citation["year"] == 2020


# ---------------------------------------------------------------------------
# 15. Ollama Unavailable Graceful Fallback
# ---------------------------------------------------------------------------
def test_ollama_unavailable_behavior():
    # Pass a dummy client pointing to an unreachable port
    offline_client = OllamaClient(base_url="http://127.0.0.1:59999")
    health = offline_client.check_health()
    assert health["running"] is False
    assert health["instructions"] is not None

    # Query must NOT crash and must return deterministic facts directly
    res = execute_hybrid_query("Give me rate for item 0002 in 2020", ollama_client=offline_client)
    assert "800.00" in res["answer"]
    assert "Concrete Mixer" in res["answer"]
    assert res["exact_match"] is True
    assert len(res["citations"]) >= 1


# ---------------------------------------------------------------------------
# 16. Fast API Endpoints Contract Verification
# ---------------------------------------------------------------------------
def test_api_endpoints(client):
    # GET /api/cpwd/health
    res = client.get("/api/cpwd/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["db_summary"]["items"] >= 4000

    # GET /api/cpwd/items/0002
    res_it = client.get("/api/cpwd/items/0002")
    assert res_it.status_code == 200
    assert len(res_it.json()["records"]) >= 3

    # POST /api/cpwd/estimate
    res_est = client.post("/api/cpwd/estimate", json={
        "item_code": "0114",
        "quantity": 10,
        "year": 2020
    })
    assert res_est.status_code == 200
    assert res_est.json()["total_amount"] == 6290.0

    # POST /api/ai/query
    res_ai = client.post("/api/ai/query", json={
        "query": "What is the 2020 CPWD rate for Mali?"
    })
    assert res_ai.status_code == 200
    assert "695" in res_ai.json()["answer"]
