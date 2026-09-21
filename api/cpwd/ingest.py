"""
Production Ingestion Pipeline for CPWD DSR, DAR & Specifications.
Extracts grounded structured data from:
  1. HorticultureDSRDAR2016.pdf (Year 2016)
  2. DSR_Horticulture_2018.pdf (Year 2018)
  3. DSR_Horticulture_2020.pdf (Year 2020)
  4. DSR_Horticulture_Landscaping_2025_STRUCTURED.csv (Year 2025)
Stores normalized records in SQLite tables with source page and document citation.
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from api.db import DB_PATH, get_connection
from api.cpwd.db import init_cpwd_db

logger = logging.getLogger("cpwd.ingest")

DATASET_DIR = Path("/Users/cooldude69/Desktop/dataset")

EDITION_PAGE_RANGES = {
    2020: {
        "dsr_pages": (11, 212),
        "dar_pages": (213, 446),
        "spec_pages": (447, 466),
        "file": "DSR_Horticulture_2020.pdf",
    },
    2018: {
        "dsr_pages": (11, 200),
        "dar_pages": (201, 415),
        "spec_pages": (416, 435),
        "file": "DSR_Horticulture_2018.pdf",
    },
    2016: {
        "dsr_pages": (11, 204),
        "dar_pages": (205, 408),
        "spec_pages": (409, 428),
        "file": "HorticultureDSRDAR2016.pdf",
    },
}

CPWD_UNITS = [
    "per day", "1000 nos", "100 nos", "10 nos", "each tree", "each",
    "cum", "sqm", "metre", "meter", "m", "tonne", "quintal", "qtl",
    "litre", "lit", "kl", "nos", "l.s.", "l.s", "ls", "hour", "hr",
    "tanker", "job", "day", "month", "kg", "gram", "set", "point", "km"
]
UNIT_REGEX = r"(?i)\b(" + "|".join(re.escape(u) for u in sorted(CPWD_UNITS, key=len, reverse=True)) + r")$"


def calculate_file_hash(filepath: Path) -> str:
    """Compute SHA256 file checksum for data provenance."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()[:16]


def parse_pdf_edition(pdf_path: Path, year: int) -> Dict[str, Any]:
    """Parse complete CPWD DSR, DAR, and Specifications for a given year."""
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    from pypdf import PdfReader  # lazy: only needed for offline ingestion

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    ranges = EDITION_PAGE_RANGES[year]

    dsr_start, dsr_end = ranges["dsr_pages"]
    dar_start, dar_end = ranges["dar_pages"]
    spec_start, spec_end = ranges["spec_pages"]

    items: List[Dict[str, Any]] = []
    labour_rates: List[Dict[str, Any]] = []
    materials: List[Dict[str, Any]] = []
    plant_items: List[Dict[str, Any]] = []
    specifications: List[Dict[str, Any]] = []
    analysis_records: List[Dict[str, Any]] = []
    chunks: List[Dict[str, Any]] = []

    code_start_re = re.compile(r"^(\d{3,5}|\d+\.\d+(?:\.\d+)?|New\s+Mali)\s+(.*)$", re.IGNORECASE)
    rate_end_re = re.compile(r"([\d,]+\.\d{2})\s*$")
    clause_re = re.compile(r"^(\d+\.\d+(?:\.\d+)?)\s+([A-Z\s]{4,})$")

    current_section = "General"
    current_subhead = ""

    for page_idx in range(total_pages):
        page_no = page_idx + 1
        try:
            raw_text = reader.pages[page_idx].extract_text() or ""
        except Exception as e:
            logger.warning(f"Error reading page {page_no} of {pdf_path.name}: {e}")
            continue

        if not raw_text.strip():
            continue

        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        first_lines = " ".join(lines[:6]).upper()

        # Update Section Metadata
        if "BASIC RATES : 0.1" in first_lines or "0.1 HIRE CHARGES" in first_lines:
            current_section = "Hire Charges of Plants and Machinery"
            current_subhead = "Basic Rates 0.1"
        elif "BASIC RATES : 0.2" in first_lines or "0.2 LABOUR" in first_lines:
            current_section = "Labour"
            current_subhead = "Basic Rates 0.2"
        elif "BASIC RATES : 0.3" in first_lines or "0.3 MATERIALS" in first_lines:
            current_section = "Materials"
            current_subhead = "Basic Rates 0.3"
        elif "SUB HEAD : 1.0" in first_lines or "1.0 CARRIAGE" in first_lines:
            current_section = "Carriage of Materials"
            current_subhead = "Sub Head 1.0"
        elif "SUB HEAD : 2.0" in first_lines or "2.0 HORTICULTURE" in first_lines or "HORTICULTURE AND LAND" in first_lines:
            current_section = "Horticulture and Landscaping"
            current_subhead = "Sub Head 2.0"
        elif "SEASONAL PLANTS" in first_lines:
            current_section = "Seasonal Plants"
            current_subhead = "Sub Head 4.0"
        elif "FOLIAGE AND SHADE" in first_lines or "FOLIAGE/SHADE" in first_lines:
            current_section = "Foliage and Shade Loving Plants"
            current_subhead = "Sub Head 3.0"
        elif "ORNAMENTAL PLANTS" in first_lines:
            current_section = "Ornamental Plants"
            current_subhead = "Sub Head 5.0"
        elif "GROUND COVERS" in first_lines:
            current_section = "Ground Covers Plants"
            current_subhead = "Sub Head 6.0"
        elif "TREE PLANTS" in first_lines:
            current_section = "Tree Plants"
            current_subhead = "Sub Head 7.0"

        # -------------------------------------------------------------
        # 1. SCHEDULE OF RATES PAGES (Basic Rates + Sub-Heads)
        # -------------------------------------------------------------
        if dsr_start <= page_no <= dsr_end:
            current_code = None
            desc_buffer: List[str] = []

            for line in lines:
                if any(h in line.upper() for h in ["DELHI SCHEDULE", "PAGE NO.", "CODE NO.", "CONTENTS"]):
                    continue

                m_code = code_start_re.match(line)
                if m_code:
                    code_raw = m_code.group(1).strip()
                    if "Mali" in code_raw:
                        code = "0140"
                    elif code_raw.isdigit() and len(code_raw) == 3:
                        code = code_raw.zfill(4)
                    else:
                        code = code_raw
                    rest = m_code.group(2).strip()

                    m_rate = rate_end_re.search(rest)
                    if m_rate:
                        rate = float(m_rate.group(1).replace(",", ""))
                        before = rest[:m_rate.start()].strip()
                        unit = "each"
                        desc = before

                        m_u = re.search(UNIT_REGEX, before)
                        if m_u:
                            unit = m_u.group(1).lower()
                            desc = before[:m_u.start()].strip()

                        if len(desc) > 1:
                            if code == "0140" and not desc.lower().startswith("mali"):
                                desc = f"Mali {desc}".strip()
                            item_id = f"{year}_{code}"
                            item_dict = {
                                "id": item_id,
                                "item_code": code,
                                "description": desc,
                                "unit": unit,
                                "rate": rate,
                                "rate_year": year,
                                "category": current_section,
                                "subhead": current_subhead,
                                "source_document": pdf_path.name,
                                "page": page_no,
                                "source_text": line,
                                "is_ocr": 0,
                            }
                            items.append(item_dict)

                            if "Labour" in current_section:
                                labour_rates.append({
                                    "id": item_id,
                                    "code": code,
                                    "trade_name": desc,
                                    "unit": unit,
                                    "rate": rate,
                                    "year": year,
                                    "source_document": pdf_path.name,
                                    "page": page_no,
                                })
                            elif "Hire Charges" in current_section or "Materials" in current_section:
                                materials.append({
                                    "id": item_id,
                                    "code": code,
                                    "description": desc,
                                    "unit": unit,
                                    "rate": rate,
                                    "year": year,
                                    "category": current_section,
                                    "source_document": pdf_path.name,
                                    "page": page_no,
                                })
                            elif any(w in desc.lower() for w in ["plant", "tree", "grass", "shrub", "creeper", "flower", "foliage"]):
                                plant_items.append({
                                    "id": item_id,
                                    "item_code": code,
                                    "common_name": desc.split()[0] if desc else "",
                                    "botanical_name": "",
                                    "category": current_section,
                                    "size_spec": "",
                                    "unit": unit,
                                    "rate": rate,
                                    "year": year,
                                    "source_document": pdf_path.name,
                                    "page": page_no,
                                })

                        current_code = None
                        desc_buffer = []
                    else:
                        current_code = code
                        desc_buffer = [rest]
                elif current_code:
                    m_rate = rate_end_re.search(line)
                    if m_rate:
                        rate = float(m_rate.group(1).replace(",", ""))
                        before = line[:m_rate.start()].strip()
                        unit = "each"
                        desc_line = before

                        m_u = re.search(UNIT_REGEX, before)
                        if m_u:
                            unit = m_u.group(1).lower()
                            desc_line = before[:m_u.start()].strip()

                        if desc_line:
                            desc_buffer.append(desc_line)
                        full_desc = " ".join(desc_buffer).strip()

                        if len(full_desc) > 1:
                            item_id = f"{year}_{current_code}"
                            item_dict = {
                                "id": item_id,
                                "item_code": current_code,
                                "description": full_desc,
                                "unit": unit,
                                "rate": rate,
                                "rate_year": year,
                                "category": current_section,
                                "subhead": current_subhead,
                                "source_document": pdf_path.name,
                                "page": page_no,
                                "source_text": f"{current_code} {full_desc} {unit} {rate}",
                                "is_ocr": 0,
                            }
                            items.append(item_dict)

                            if "Labour" in current_section:
                                labour_rates.append({
                                    "id": item_id,
                                    "code": current_code,
                                    "trade_name": full_desc,
                                    "unit": unit,
                                    "rate": rate,
                                    "year": year,
                                    "source_document": pdf_path.name,
                                    "page": page_no,
                                })
                            elif "Hire Charges" in current_section or "Materials" in current_section:
                                materials.append({
                                    "id": item_id,
                                    "code": current_code,
                                    "description": full_desc,
                                    "unit": unit,
                                    "rate": rate,
                                    "year": year,
                                    "category": current_section,
                                    "source_document": pdf_path.name,
                                    "page": page_no,
                                })
                            elif any(w in full_desc.lower() for w in ["plant", "tree", "grass", "shrub", "creeper", "flower", "foliage"]):
                                plant_items.append({
                                    "id": item_id,
                                    "item_code": current_code,
                                    "common_name": full_desc.split()[0] if full_desc else "",
                                    "botanical_name": "",
                                    "category": current_section,
                                    "size_spec": "",
                                    "unit": unit,
                                    "rate": rate,
                                    "year": year,
                                    "source_document": pdf_path.name,
                                    "page": page_no,
                                })

                        current_code = None
                        desc_buffer = []
                    else:
                        desc_buffer.append(line)

        # -------------------------------------------------------------
        # 2. ANALYSIS OF RATES (DAR) PAGES
        # -------------------------------------------------------------
        elif dar_start <= page_no <= dar_end:
            for line in lines:
                m_rate = rate_end_re.search(line)
                if m_rate and any(k in line for k in ["Beldar", "Coolie", "Truck", "Mali", "@", "Rs.", "Hire"]):
                    rate_val = float(m_rate.group(1).replace(",", ""))
                    analysis_records.append({
                        "id": str(uuid.uuid4()),
                        "item_code": current_subhead or "DAR",
                        "description": line[:m_rate.start()].strip(),
                        "component_type": "breakdown",
                        "component_desc": line.strip(),
                        "quantity": None,
                        "unit": "unit",
                        "rate": rate_val,
                        "amount": rate_val,
                        "year": year,
                        "page": page_no,
                        "source_document": pdf_path.name,
                    })

        # -------------------------------------------------------------
        # 3. SPECIFICATIONS PAGES
        # -------------------------------------------------------------
        elif spec_start <= page_no <= spec_end:
            curr_clause_no = ""
            curr_clause_title = ""
            clause_buffer = []

            for line in lines:
                m_clause = clause_re.match(line)
                if m_clause:
                    if curr_clause_title and clause_buffer:
                        specifications.append({
                            "id": str(uuid.uuid4()),
                            "clause_no": curr_clause_no,
                            "title": curr_clause_title,
                            "section": "Specifications",
                            "full_text": " ".join(clause_buffer),
                            "year": year,
                            "page": page_no,
                            "source_document": pdf_path.name,
                        })
                    curr_clause_no = m_clause.group(1)
                    curr_clause_title = m_clause.group(2).strip()
                    clause_buffer = []
                else:
                    clause_buffer.append(line)

            if curr_clause_title and clause_buffer:
                specifications.append({
                    "id": str(uuid.uuid4()),
                    "clause_no": curr_clause_no,
                    "title": curr_clause_title,
                    "section": "Specifications",
                    "full_text": " ".join(clause_buffer),
                    "year": year,
                    "page": page_no,
                    "source_document": pdf_path.name,
                })

        # -------------------------------------------------------------
        # 4. Searchable Chunks for RAG
        # -------------------------------------------------------------
        data_type = "specification" if spec_start <= page_no <= spec_end else (
            "analysis" if dar_start <= page_no <= dar_end else "rate"
        )
        chunks.append({
            "id": f"chunk_{year}_{page_no}",
            "document_year": year,
            "page": page_no,
            "section": current_section,
            "subhead": current_subhead,
            "item_code": None,
            "data_type": data_type,
            "title": f"CPWD {year} (Page {page_no}) - {current_section}",
            "content": raw_text.strip()[:3500],
        })

    return {
        "year": year,
        "filename": pdf_path.name,
        "total_pages": total_pages,
        "items": items,
        "labour_rates": labour_rates,
        "materials": materials,
        "plant_items": plant_items,
        "specifications": specifications,
        "analysis_records": analysis_records,
        "chunks": chunks,
    }


def parse_2025_csv(csv_path: Path) -> Dict[str, Any]:
    """Parse DSR_Horticulture_Landscaping_2025_STRUCTURED.csv."""
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    items: List[Dict[str, Any]] = []
    labour_rates: List[Dict[str, Any]] = []
    materials: List[Dict[str, Any]] = []
    plant_items: List[Dict[str, Any]] = []
    chunks: List[Dict[str, Any]] = []

    pages_seen = set()

    with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = int(row.get("year") or row.get("\ufeffyear") or 2025)
            page = int(row.get("page") or 1)
            pages_seen.add(page)
            code = (row.get("item_code") or "").strip()
            desc = (row.get("description") or "").strip()
            unit = (row.get("unit") or "each").strip()
            try:
                rate = float(row.get("rate") or 0.0)
            except ValueError:
                rate = 0.0
            section = (row.get("section") or "Horticulture and Landscaping").strip()
            source_file = row.get("source_file") or csv_path.name

            if not code or not desc:
                continue

            item_id = f"{year}_{code}"
            item_dict = {
                "id": item_id,
                "item_code": code,
                "description": desc,
                "unit": unit,
                "rate": rate,
                "rate_year": year,
                "category": section,
                "subhead": "",
                "source_document": source_file,
                "page": page,
                "source_text": f"{code} {desc} {unit} {rate}",
                "is_ocr": 0,
            }
            items.append(item_dict)

            if "Labour" in section:
                labour_rates.append({
                    "id": item_id,
                    "code": code,
                    "trade_name": desc,
                    "unit": unit,
                    "rate": rate,
                    "year": year,
                    "source_document": source_file,
                    "page": page,
                })
            elif "Hire Charges" in section or "Material" in section:
                materials.append({
                    "id": item_id,
                    "code": code,
                    "description": desc,
                    "unit": unit,
                    "rate": rate,
                    "year": year,
                    "category": section,
                    "source_document": source_file,
                    "page": page,
                })
            elif any(w in desc.lower() for w in ["plant", "tree", "grass", "shrub", "creeper", "flower"]):
                plant_items.append({
                    "id": item_id,
                    "item_code": code,
                    "common_name": desc.split()[0],
                    "botanical_name": "",
                    "category": section,
                    "size_spec": "",
                    "unit": unit,
                    "rate": rate,
                    "year": year,
                    "source_document": source_file,
                    "page": page,
                })

            chunks.append({
                "id": f"chunk_item_{year}_{code}",
                "document_year": year,
                "page": page,
                "section": section,
                "subhead": "",
                "item_code": code,
                "data_type": "rate",
                "title": f"CPWD {year} Item {code} - {desc[:60]}",
                "content": f"Item Code: {code}\nDescription: {desc}\nUnit: {unit}\nRate: ₹{rate}\nSection: {section}\nSource Page: {page}",
            })

    return {
        "year": 2025,
        "filename": csv_path.name,
        "total_pages": max(pages_seen) if pages_seen else 50,
        "items": items,
        "labour_rates": labour_rates,
        "materials": materials,
        "plant_items": plant_items,
        "specifications": [],
        "analysis_records": [],
        "chunks": chunks,
    }


def run_ingestion(dataset_dir: Optional[Path] = None, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Execute complete ingestion pipeline for all CPWD editions."""
    base_dir = dataset_dir or DATASET_DIR
    init_cpwd_db(db_path)

    start_time = time.time()
    sources = [
        {"type": "pdf", "file": "HorticultureDSRDAR2016.pdf", "year": 2016},
        {"type": "pdf", "file": "DSR_Horticulture_2018.pdf", "year": 2018},
        {"type": "pdf", "file": "DSR_Horticulture_2020.pdf", "year": 2020},
        {"type": "csv", "file": "DSR_Horticulture_Landscaping_2025_STRUCTURED.csv", "year": 2025},
    ]

    report: Dict[str, Any] = {
        "started_at": datetime.utcnow().isoformat(),
        "documents_processed": 0,
        "total_pages_processed": 0,
        "items_extracted": 0,
        "rates_extracted": 0,
        "labour_records": 0,
        "material_records": 0,
        "plant_records": 0,
        "specification_records": 0,
        "analysis_records": 0,
        "chunks_indexed": 0,
        "by_year": {},
        "warnings": [],
        "errors": [],
    }

    with get_connection(db_path) as conn:
        cur = conn.cursor()

        # Clear existing CPWD tables for a clean rebuild
        cur.execute("DELETE FROM cpwd_documents")
        cur.execute("DELETE FROM cpwd_items")
        cur.execute("DELETE FROM cpwd_rates")
        cur.execute("DELETE FROM cpwd_labour_rates")
        cur.execute("DELETE FROM cpwd_materials")
        cur.execute("DELETE FROM cpwd_plant_items")
        cur.execute("DELETE FROM cpwd_specifications")
        cur.execute("DELETE FROM cpwd_analysis_of_rates")
        cur.execute("DELETE FROM cpwd_chunks")
        cur.execute("DELETE FROM cpwd_chunks_fts")
        conn.commit()

        for s in sources:
            file_path = base_dir / s["file"]
            if not file_path.exists():
                report["warnings"].append(f"Source file not found: {file_path}")
                continue

            year = s["year"]
            try:
                if s["type"] == "pdf":
                    parsed = parse_pdf_edition(file_path, year)
                else:
                    parsed = parse_2025_csv(file_path)

                checksum = calculate_file_hash(file_path)

                # 1. Document record
                cur.execute("""
                    INSERT OR REPLACE INTO cpwd_documents
                    (id, filename, year, total_pages, title, checksum, ingested_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"doc_{year}",
                    parsed["filename"],
                    year,
                    parsed["total_pages"],
                    f"CPWD DSR/DAR ({year}) - Horticulture & Landscaping",
                    checksum,
                    datetime.utcnow().isoformat(),
                ))

                # 2. Items & Rates (deduplicate within year)
                item_rows = []
                rate_rows = []
                seen_codes = set()

                for item in parsed["items"]:
                    code = item["item_code"]
                    if code in seen_codes:
                        continue
                    seen_codes.add(code)

                    item_rows.append((
                        item["id"],
                        item["item_code"],
                        item["description"],
                        item["unit"],
                        item["rate"],
                        item["rate_year"],
                        item["category"],
                        item["subhead"],
                        item["source_document"],
                        item["page"],
                        item["source_text"],
                        item["is_ocr"],
                    ))

                    rate_rows.append((
                        f"rate_{year}_{code}",
                        code,
                        year,
                        item["unit"],
                        item["rate"],
                        item["source_document"],
                        item["page"],
                    ))

                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_items
                    (id, item_code, description, unit, rate, rate_year, category,
                     subhead, source_document, page, source_text, is_ocr)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, item_rows)

                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_rates
                    (id, item_code, rate_year, unit, rate, source_document, page)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, rate_rows)

                # 3. Labour Rates (deduplicate within year)
                labour_rows = []
                seen_labour = set()
                for l in parsed["labour_rates"]:
                    if l["code"] in seen_labour:
                        continue
                    seen_labour.add(l["code"])
                    labour_rows.append((
                        l["id"], l["code"], l["trade_name"], l["unit"],
                        l["rate"], l["year"], l["source_document"], l["page"]
                    ))

                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_labour_rates
                    (id, code, trade_name, unit, rate, year, source_document, page)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, labour_rows)

                # 4. Materials (deduplicate within year)
                mat_rows = []
                seen_mat = set()
                for m in parsed["materials"]:
                    if m["code"] in seen_mat:
                        continue
                    seen_mat.add(m["code"])
                    mat_rows.append((
                        m["id"], m["code"], m["description"], m["unit"],
                        m["rate"], m["year"], m["category"], m["source_document"], m["page"]
                    ))

                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_materials
                    (id, code, description, unit, rate, year, category, source_document, page)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, mat_rows)

                # 5. Plant items
                plant_rows = [
                    (p["id"], p["item_code"], p["common_name"], p["botanical_name"], p["category"], p["size_spec"], p["unit"], p["rate"], p["year"], p["source_document"], p["page"])
                    for p in parsed["plant_items"]
                ]
                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_plant_items
                    (id, item_code, common_name, botanical_name, category, size_spec, unit, rate, year, source_document, page)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, plant_rows)

                # 6. Specifications
                spec_rows = [
                    (sp["id"], sp["clause_no"], sp["title"], sp["section"], sp["full_text"], sp["year"], sp["page"], sp["source_document"])
                    for sp in parsed["specifications"]
                ]
                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_specifications
                    (id, clause_no, title, section, full_text, year, page, source_document)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, spec_rows)

                # 7. Analysis of Rates
                dar_rows = [
                    (d["id"], d["item_code"], d["description"], d["component_type"], d["component_desc"], d["quantity"], d["unit"], d["rate"], d["amount"], d["year"], d["page"], d["source_document"])
                    for d in parsed["analysis_records"]
                ]
                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_analysis_of_rates
                    (id, item_code, description, component_type, component_desc, quantity, unit, rate, amount, year, page, source_document)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, dar_rows)

                # 8. Chunks and FTS Indexing
                chunk_rows = []
                fts_rows = []
                for ch in parsed["chunks"]:
                    chunk_rows.append((
                        ch["id"],
                        ch["document_year"],
                        ch["page"],
                        ch["section"],
                        ch["subhead"],
                        ch["item_code"],
                        ch["data_type"],
                        ch["title"],
                        ch["content"],
                        None,
                    ))
                    fts_rows.append((
                        ch["id"],
                        ch["item_code"] or "",
                        ch["document_year"],
                        ch["title"] or "",
                        ch["content"] or "",
                    ))

                cur.executemany("""
                    INSERT OR REPLACE INTO cpwd_chunks
                    (id, document_year, page, section, subhead, item_code, data_type, title, content, embedding_blob)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, chunk_rows)

                cur.executemany("""
                    INSERT INTO cpwd_chunks_fts
                    (chunk_id, item_code, year, title, content)
                    VALUES (?, ?, ?, ?, ?)
                """, fts_rows)

                conn.commit()

                # Tally counts
                report["documents_processed"] += 1
                report["total_pages_processed"] += parsed["total_pages"]
                report["items_extracted"] += len(item_rows)
                report["rates_extracted"] += len(rate_rows)
                report["labour_records"] += len(labour_rows)
                report["material_records"] += len(mat_rows)
                report["plant_records"] += len(plant_rows)
                report["specification_records"] += len(spec_rows)
                report["analysis_records"] += len(dar_rows)
                report["chunks_indexed"] += len(chunk_rows)

                report["by_year"][year] = {
                    "pages": parsed["total_pages"],
                    "items": len(item_rows),
                    "labour": len(labour_rows),
                    "materials": len(mat_rows),
                    "specs": len(spec_rows),
                    "analysis": len(dar_rows),
                }

            except Exception as e:
                logger.error(f"Failed to ingest {file_path.name}: {e}", exc_info=True)
                report["errors"].append(f"Failed to process {file_path.name}: {str(e)}")

    report["duration_seconds"] = round(time.time() - start_time, 2)
    return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Executing CPWD Ingestion Pipeline...")
    rep = run_ingestion()
    print(json.dumps(rep, indent=2))
