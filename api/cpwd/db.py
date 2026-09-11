"""
Database access and query interface for CPWD DSR/DAR/Specifications.
Backed by SQLite with FTS5 keyword indexing and numpy-based cosine similarity vector search.
"""

from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from api.db import DB_PATH, get_connection

SCHEMA_FILE = Path(__file__).resolve().parent / "schema.sql"


def init_cpwd_db(db_path: Optional[Path] = None) -> None:
    """Initialize CPWD tables in the SQLite database."""
    target_db = db_path or DB_PATH
    target_db.parent.mkdir(parents=True, exist_ok=True)
    with get_connection(target_db) as conn:
        with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()


# ---------------------------------------------------------------------------
# Query Helpers
# ---------------------------------------------------------------------------

def get_cpwd_items(
    year: Optional[int] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve structured CPWD items with optional filtering."""
    clauses = []
    params: List[Any] = []

    if year is not None:
        clauses.append("rate_year = ?")
        params.append(year)
    if category:
        clauses.append("category LIKE ?")
        params.append(f"%{category}%")
    if search:
        clauses.append("(item_code LIKE ? OR description LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, item_code, description, unit, rate, rate_year, category,
               subhead, source_document, page, is_ocr
        FROM cpwd_items
        {where_sql}
        ORDER BY rate_year DESC, item_code ASC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


def count_cpwd_items(
    year: Optional[int] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> int:
    """Count matching CPWD items."""
    clauses = []
    params: List[Any] = []

    if year is not None:
        clauses.append("rate_year = ?")
        params.append(year)
    if category:
        clauses.append("category LIKE ?")
        params.append(f"%{category}%")
    if search:
        clauses.append("(item_code LIKE ? OR description LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"SELECT COUNT(*) as count FROM cpwd_items {where_sql}"

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        row = cur.fetchone()
        return row["count"] if row else 0


def get_item_by_code(
    code: str,
    year: Optional[int] = None,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Get exact item(s) by code, across all years or a specific year."""
    # Normalize code (e.g. '127' -> check '127', '0127')
    clean_code = code.strip().lstrip("0")
    padded_code = clean_code.zfill(4)

    sql = """
        SELECT id, item_code, description, unit, rate, rate_year, category,
               subhead, source_document, page, source_text, is_ocr
        FROM cpwd_items
        WHERE (item_code = ? OR item_code = ? OR item_code = ?)
    """
    params: List[Any] = [code.strip(), clean_code, padded_code]

    if year is not None:
        sql += " AND rate_year = ?"
        params.append(year)

    sql += " ORDER BY rate_year DESC"

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


def get_all_item_codes(db_path: Optional[Path] = None) -> List[str]:
    """Retrieve all unique item codes in the database."""
    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT item_code FROM cpwd_items ORDER BY item_code")
        return [row["item_code"] for row in cur.fetchall()]


def get_labour_rates(
    year: Optional[int] = None,
    query: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve labour trade wage rates."""
    clauses = []
    params: List[Any] = []
    if year is not None:
        clauses.append("year = ?")
        params.append(year)
    if query:
        clauses.append("(trade_name LIKE ? OR code LIKE ?)")
        params.extend([f"%{query}%", f"%{query}%"])

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, code, trade_name, unit, rate, year, source_document, page
        FROM cpwd_labour_rates
        {where_sql}
        ORDER BY year DESC, code ASC
    """
    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


def get_materials(
    year: Optional[int] = None,
    query: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve material and hire charge rates."""
    clauses = []
    params: List[Any] = []
    if year is not None:
        clauses.append("year = ?")
        params.append(year)
    if query:
        clauses.append("(description LIKE ? OR code LIKE ?)")
        params.extend([f"%{query}%", f"%{query}%"])

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, code, description, unit, rate, year, category, source_document, page
        FROM cpwd_materials
        {where_sql}
        ORDER BY year DESC, code ASC
    """
    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


def get_specifications(
    year: Optional[int] = None,
    clause_no: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 20,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve specifications."""
    clauses = []
    params: List[Any] = []
    if year is not None:
        clauses.append("year = ?")
        params.append(year)
    if clause_no:
        clauses.append("clause_no LIKE ?")
        params.append(f"%{clause_no}%")
    if query:
        clauses.append("(title LIKE ? OR full_text LIKE ?)")
        params.extend([f"%{query}%", f"%{query}%"])

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, clause_no, title, section, full_text, year, page, source_document
        FROM cpwd_specifications
        {where_sql}
        ORDER BY year DESC, page ASC
        LIMIT ?
    """
    params.append(limit)

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


def get_analysis_of_rates(
    item_code: Optional[str] = None,
    year: Optional[int] = None,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve DAR breakdown for an item code or subhead."""
    clauses = []
    params: List[Any] = []

    if item_code:
        clauses.append("(item_code = ? OR item_code LIKE ?)")
        params.extend([item_code, f"%{item_code}%"])
    if year is not None:
        clauses.append("year = ?")
        params.append(year)

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, item_code, description, component_type, component_desc,
               quantity, unit, rate, amount, year, page, source_document
        FROM cpwd_analysis_of_rates
        {where_sql}
        ORDER BY year DESC, id ASC
    """

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


# ---------------------------------------------------------------------------
# Full-Text & Vector Search
# ---------------------------------------------------------------------------

def fts_search(
    query_str: str,
    year: Optional[int] = None,
    limit: int = 15,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Perform full-text search on CPWD chunks via SQLite FTS5."""
    # Sanitize query for FTS5 (strip operators that cause syntax errors)
    cleaned = "".join(c if c.isalnum() or c.isspace() else " " for c in query_str).strip()
    if not cleaned:
        return []

    fts_terms = " OR ".join(f'"{t}"' for t in cleaned.split() if len(t) > 1)
    if not fts_terms:
        return []

    sql = """
        SELECT c.id, c.document_year, c.page, c.section, c.subhead,
               c.item_code, c.data_type, c.title, c.content,
               bm25(cpwd_chunks_fts) as rank
        FROM cpwd_chunks_fts f
        JOIN cpwd_chunks c ON f.chunk_id = c.id
        WHERE cpwd_chunks_fts MATCH ?
    """
    params: List[Any] = [fts_terms]

    if year is not None:
        sql += " AND c.document_year = ?"
        params.append(year)

    sql += " ORDER BY rank ASC LIMIT ?"
    params.append(limit)

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        results = []
        for row in cur.fetchall():
            d = dict(row)
            # Invert bm25 score to 0..1 scale for similarity ranking
            raw_bm25 = d.get("rank", 1.0)
            d["score"] = round(float(1.0 / (1.0 + max(0.0, raw_bm25))), 4)
            results.append(d)
        return results


def vector_search(
    query_embedding: List[float],
    year: Optional[int] = None,
    limit: int = 10,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Perform cosine similarity vector search on chunks with embeddings."""
    q_vec = np.array(query_embedding, dtype=np.float32)
    norm_q = np.linalg.norm(q_vec)
    if norm_q == 0:
        return []
    q_vec = q_vec / norm_q

    sql = """
        SELECT id, document_year, page, section, subhead, item_code,
               data_type, title, content, embedding_blob
        FROM cpwd_chunks
        WHERE embedding_blob IS NOT NULL
    """
    params: List[Any] = []
    if year is not None:
        sql += " AND document_year = ?"
        params.append(year)

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()

    if not rows:
        return []

    scored_items = []
    for r in rows:
        blob = r["embedding_blob"]
        if not blob:
            continue
        try:
            doc_vec = np.frombuffer(blob, dtype=np.float32)
            if len(doc_vec) != len(q_vec):
                continue
            norm_d = np.linalg.norm(doc_vec)
            if norm_d > 0:
                sim = float(np.dot(q_vec, doc_vec / norm_d))
                scored_items.append((sim, dict(r)))
        except Exception:
            continue

    scored_items.sort(key=lambda x: x[0], reverse=True)
    top_matches = []
    for sim, item in scored_items[:limit]:
        item["score"] = round(sim, 4)
        item.pop("embedding_blob", None)
        top_matches.append(item)

    return top_matches


def get_dataset_summary(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Return counts and statistics of ingested CPWD records."""
    with get_connection(db_path) as conn:
        cur = conn.cursor()

        def _count(tbl: str) -> int:
            try:
                cur.execute(f"SELECT COUNT(*) as c FROM {tbl}")
                r = cur.fetchone()
                return r["c"] if r else 0
            except Exception:
                return 0

        # Years available
        try:
            cur.execute("SELECT DISTINCT rate_year FROM cpwd_items ORDER BY rate_year")
            years = [r["rate_year"] for r in cur.fetchall()]
        except Exception:
            years = []

        return {
            "documents": _count("cpwd_documents"),
            "items": _count("cpwd_items"),
            "rates": _count("cpwd_rates"),
            "labour_rates": _count("cpwd_labour_rates"),
            "materials": _count("cpwd_materials"),
            "plant_items": _count("cpwd_plant_items"),
            "specifications": _count("cpwd_specifications"),
            "analysis_of_rates": _count("cpwd_analysis_of_rates"),
            "chunks": _count("cpwd_chunks"),
            "years_available": years,
        }
