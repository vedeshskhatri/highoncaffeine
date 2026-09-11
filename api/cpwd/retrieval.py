"""
Hybrid Retrieval Engine for CPWD Knowledge System.
Combines exact item code matching, metadata filtering, full-text FTS5 BM25 search,
and vector similarity with confidence scoring and evidence tracing.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from api.cpwd.db import (
    fts_search,
    get_item_by_code,
    get_labour_rates,
    get_materials,
    get_specifications,
    vector_search,
)
from api.cpwd.comparison import compare_editions, compare_item_rates
from api.cpwd.estimation import estimate_item
from api.cpwd.ollama_client import OllamaClient


STOP_WORDS = {
    "what", "is", "the", "cpwd", "rate", "rates", "for", "of", "in", "give",
    "me", "find", "a", "an", "all", "show", "tell", "to", "and", "item", "code",
    "2016", "2018", "2020", "2024", "2025", "please", "with", "per", "details"
}


def extract_item_code(query: str) -> Optional[str]:
    """Identify exact CPWD item code in query."""
    # Matches explicit syntax like 'item 0127', 'code 0002', 'item 2.1'
    m = re.search(r"(?:item|code|no\.?)\s*[:#]?\s*([0-9]+(?:\.[0-9]+)*)", query, re.IGNORECASE)
    if m:
        code = m.group(1).strip()
        if code not in ["2016", "2018", "2020", "2024", "2025"]:
            return code

    # Check standalone code while ignoring quantities/capacities like "5000 litre", "500 sqm"
    tokens = query.split()
    for idx, word in enumerate(tokens):
        clean_word = word.strip("?,.:;\"'")
        if re.match(r"^(\d{4,5}|\d+\.\d+(?:\.\d+)?)$", clean_word):
            if clean_word in ["2016", "2018", "2020", "2024", "2025"]:
                continue
            # Check if next word is a measurement unit (e.g. litre, ltr, sqm, cum, mm, cm)
            if idx + 1 < len(tokens):
                next_word = tokens[idx + 1].strip("?,.:;\"'").lower()
                if next_word in ["litre", "litres", "ltr", "lit", "sqm", "cum", "m", "cm", "mm", "kg", "tonne", "tonnes"]:
                    continue
            return clean_word
    return None


def extract_keywords(query: str) -> List[str]:
    """Extract significant search keywords from query."""
    words = re.findall(r"[A-Za-z0-9]+", query.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def extract_years(query: str) -> List[int]:
    """Identify all years mentioned in query."""
    years = [int(y) for y in re.findall(r"\b(2016|2018|2020|2025)\b", query)]
    return sorted(list(set(years)))


def extract_quantity_and_unit(query: str) -> Tuple[Optional[float], Optional[str]]:
    """Extract numeric quantity and unit from estimation query."""
    # Pattern e.g. "500 sq m", "100 sqm", "50 cum", "10 days", "5 nos"
    m = re.search(r"\b(\d+(?:\.\d+)?)\s*(sqm|sq\s*m|cum|cu\s*m|m2|m3|metre|meter|m|day|days|each|nos|tanker)\b", query, re.IGNORECASE)
    if m:
        qty = float(m.group(1))
        unit = m.group(2).lower()
        return qty, unit
    return None, None


def execute_hybrid_query(
    query: str,
    selected_year: Optional[int] = None,
    ollama_client: Optional[OllamaClient] = None,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Execute complete hybrid query with exact matching, calculations, and grounded LLM explanation."""
    client = ollama_client or OllamaClient()

    extracted_code = extract_item_code(query)
    years_mentioned = extract_years(query)
    qty, requested_unit = extract_quantity_and_unit(query)

    is_comparison_query = any(w in query.lower() for w in ["compare", "difference", "increase", "change", "between"])
    is_estimate_query = any(w in query.lower() for w in ["estimate", "calculate", "cost of", "total for"]) and (qty is not None)

    target_year = selected_year or (years_mentioned[0] if years_mentioned else 2020)

    retrieved_records: List[Dict[str, Any]] = []
    citations: List[Dict[str, Any]] = []
    calculation_result: Optional[Dict[str, Any]] = None
    retrieval_method = "keyword"
    confidence_score = 0.5
    exact_match = False

    # -------------------------------------------------------------
    # 1. Deterministic Estimation Path
    # -------------------------------------------------------------
    if is_estimate_query and extracted_code and qty:
        calculation_result = estimate_item(
            item_code=extracted_code,
            quantity=qty,
            year=target_year,
            requested_unit=requested_unit,
            db_path=db_path,
        )
        if calculation_result.get("success"):
            retrieval_method = "deterministic_estimate"
            confidence_score = 1.0
            exact_match = True
            citations.append({
                "document": calculation_result["source"]["document"],
                "page": calculation_result["source"]["page"],
                "section": calculation_result["category"],
                "item_code": calculation_result["item_code"],
                "year": target_year,
            })
            items = get_item_by_code(extracted_code, year=target_year, db_path=db_path)
            retrieved_records.extend(items)

    # -------------------------------------------------------------
    # 2. Deterministic Rate Comparison Path
    # -------------------------------------------------------------
    elif is_comparison_query:
        if len(years_mentioned) >= 2:
            y1, y2 = years_mentioned[0], years_mentioned[1]
        elif len(years_mentioned) == 1:
            y1, y2 = 2016, years_mentioned[0]
        else:
            y1, y2 = 2016, 2020

        if extracted_code:
            calculation_result = compare_item_rates(extracted_code, y1, y2, db_path=db_path)
            if calculation_result:
                retrieval_method = "deterministic_comparison"
                confidence_score = 1.0
                exact_match = True
                if calculation_result.get("source_old"):
                    citations.append({
                        "document": calculation_result["source_old"]["document"],
                        "page": calculation_result["source_old"]["page"],
                        "item_code": extracted_code,
                        "year": y1,
                    })
                if calculation_result.get("source_new"):
                    citations.append({
                        "document": calculation_result["source_new"]["document"],
                        "page": calculation_result["source_new"]["page"],
                        "item_code": extracted_code,
                        "year": y2,
                    })
                records_old = get_item_by_code(extracted_code, year=y1, db_path=db_path)
                records_new = get_item_by_code(extracted_code, year=y2, db_path=db_path)
                retrieved_records.extend(records_old + records_new)
        else:
            calculation_result = compare_editions(y1, y2, limit=20, db_path=db_path)
            retrieval_method = "edition_comparison"
            confidence_score = 0.95
            citations.append({"document": f"CPWD DSR {y1} & DSR {y2}", "year": f"{y1} vs {y2}"})

    # -------------------------------------------------------------
    # 3. Exact Code Match Path
    # -------------------------------------------------------------
    elif extracted_code:
        # Search for exact item code in requested year or all editions
        items = get_item_by_code(extracted_code, year=target_year if years_mentioned else selected_year, db_path=db_path)
        if not items and years_mentioned:
            # Fallback across all editions
            items = get_item_by_code(extracted_code, db_path=db_path)

        if items:
            retrieval_method = "exact_code"
            confidence_score = 1.0
            exact_match = True
            retrieved_records.extend(items)
            for it in items:
                citations.append({
                    "document": it["source_document"],
                    "page": it["page"],
                    "section": it["category"],
                    "item_code": it["item_code"],
                    "year": it["rate_year"],
                })
        else:
            # Explicit item code asked for, but not found in CPWD documents
            return {
                "query": query,
                "answer": f"The provided CPWD DSR/DAR documents do not contain sufficient information to answer this. Item code '{extracted_code}' is not found in the official schedule of rates.",
                "citations": [],
                "exact_match": False,
                "retrieval_method": "exact_code_miss",
                "confidence_score": 0.0,
                "records_retrieved": 0,
                "calculation_result": None,
                "evidence": [],
                "engine": "cpwd_grounding_interlock",
                "ollama_available": client.check_health().get("running", False),
            }

    # -------------------------------------------------------------
    # 4. Hybrid Search (Specifications + Labour + Materials + FTS5)
    # -------------------------------------------------------------
    if not retrieved_records and not calculation_result:
        keywords = extract_keywords(query)
        kw_str = " ".join(keywords) if keywords else query
        is_spec_query = any(w in query.lower() for w in ["specification", "specifications", "spec", "clause", "standards"])

        # Step 0: Check specifications if explicitly asked
        if is_spec_query:
            for kw in (keywords or [query]):
                specs = get_specifications(year=target_year if years_mentioned else selected_year, query=kw, limit=3, db_path=db_path)
                if specs:
                    retrieved_records.extend(specs)
                    retrieval_method = "specification_lookup"
                    confidence_score = 0.95
                    for s in specs:
                        citations.append({
                            "document": s["source_document"],
                            "page": s["page"],
                            "section": "Specifications",
                            "item_code": s.get("clause_no"),
                            "year": s["year"],
                        })
                    break

        # Step A: Check labour rates
        for kw in (keywords or [query]):
            labour = get_labour_rates(year=target_year if years_mentioned else selected_year, query=kw, db_path=db_path)
            if labour:
                retrieved_records.extend(labour)
                retrieval_method = "labour_lookup"
                confidence_score = 0.95
                exact_match = True
                for l in labour:
                    citations.append({
                        "document": l["source_document"],
                        "page": l["page"],
                        "section": "Labour",
                        "item_code": l["code"],
                        "year": l["year"],
                    })
                break

        # Step B: Check materials / hire charges
        if not retrieved_records:
            for kw in (keywords or [query]):
                mats = get_materials(year=target_year if years_mentioned else selected_year, query=kw, db_path=db_path)
                if mats:
                    retrieved_records.extend(mats[:5])
                    retrieval_method = "materials_lookup"
                    confidence_score = 0.9
                    for m in mats[:3]:
                        citations.append({
                            "document": m["source_document"],
                            "page": m["page"],
                            "section": m["category"],
                            "item_code": m["code"],
                            "year": m["year"],
                        })
                    break

        # Step C: FTS5 Full-text search
        if not retrieved_records:
            fts_matches = fts_search(kw_str, year=target_year if years_mentioned else selected_year, limit=8, db_path=db_path)
            if fts_matches:
                retrieved_records.extend(fts_matches)
                retrieval_method = "fts5_bm25"
                confidence_score = max(confidence_score, 0.75)
                for f in fts_matches[:3]:
                    citations.append({
                        "document": f"CPWD {f['document_year']}",
                        "page": f["page"],
                        "section": f.get("section", "General"),
                        "item_code": f.get("item_code"),
                        "year": f["document_year"],
                    })

        # Step D: Vector Search if embedding available
        if not retrieved_records:
            q_emb = client.generate_embedding(query)
            if q_emb:
                v_matches = vector_search(q_emb, year=target_year if years_mentioned else selected_year, limit=5, db_path=db_path)
                if v_matches:
                    retrieved_records.extend(v_matches)
                    retrieval_method = "hybrid_vector_fts"
                    confidence_score = max(confidence_score, 0.85)

    # -------------------------------------------------------------
    # 5. Build Context & Call Grounded Generator
    # -------------------------------------------------------------
    context_lines = []
    for r in retrieved_records[:10]:
        code = r.get("item_code") or r.get("code") or "N/A"
        desc = r.get("description") or r.get("trade_name") or r.get("title") or r.get("content", "")[:120]
        unit = r.get("unit", "")
        rate = r.get("rate")
        y = r.get("rate_year") or r.get("year") or r.get("document_year") or "N/A"
        p = r.get("page") or "N/A"
        doc = r.get("source_document") or f"CPWD DSR {y}"
        context_lines.append(f"• Item {code} ({y}): {desc} | Unit: {unit} | Rate: ₹{rate} | P.{p} ({doc})")

    context_text = "\n".join(context_lines) if context_lines else "No direct matching CPWD items found."

    generated = client.generate_grounded_response(
        query=query,
        context_text=context_text,
        structured_records=retrieved_records,
        calculations=calculation_result,
    )

    # Deduplicate citations
    seen_cites = set()
    deduped_cites = []
    for c in citations:
        key = (c.get("document"), c.get("page"), c.get("item_code"), c.get("year"))
        if key not in seen_cites:
            seen_cites.add(key)
            deduped_cites.append(c)

    return {
        "query": query,
        "answer": generated["answer"],
        "citations": deduped_cites,
        "exact_match": exact_match,
        "retrieval_method": retrieval_method,
        "confidence_score": confidence_score,
        "records_retrieved": len(retrieved_records),
        "calculation_result": calculation_result,
        "evidence": retrieved_records[:5],
        "engine": generated.get("engine"),
        "ollama_available": generated.get("ollama_available", False),
    }
