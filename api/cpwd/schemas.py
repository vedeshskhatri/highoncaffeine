"""
Pydantic schemas for CPWD AI Knowledge System API endpoints.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CpwdCitationSchema(BaseModel):
    document: Optional[str] = None
    page: Optional[int] = None
    section: Optional[str] = None
    item_code: Optional[str] = None
    year: Optional[Any] = None


class CpwdQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question, rate inquiry, or estimation request")
    year: Optional[int] = Field(None, description="Explicit edition year (2016, 2018, 2020, 2025)")


class CpwdQueryResponse(BaseModel):
    query: str
    answer: str
    citations: List[CpwdCitationSchema]
    exact_match: bool
    retrieval_method: str
    confidence_score: float
    records_retrieved: int
    calculation_result: Optional[Dict[str, Any]] = None
    evidence: List[Dict[str, Any]]
    engine: Optional[str] = None
    ollama_available: bool


class CpwdItemSchema(BaseModel):
    id: str
    item_code: str
    description: str
    unit: Optional[str] = None
    rate: Optional[float] = None
    rate_year: int
    category: str
    subhead: Optional[str] = None
    source_document: str
    page: int
    is_ocr: Optional[int] = 0


class CpwdSearchRequest(BaseModel):
    query: str
    year: Optional[int] = None
    category: Optional[str] = None
    limit: int = 50
    offset: int = 0


class CpwdCompareRequest(BaseModel):
    item_code: Optional[str] = None
    year_old: int = 2016
    year_new: int = 2020
    category: Optional[str] = None
    limit: int = 50


class CpwdEstimateItemInput(BaseModel):
    item_code: str
    quantity: float
    unit: Optional[str] = None


class CpwdEstimateRequest(BaseModel):
    item_code: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    year: int = 2020
    items: Optional[List[CpwdEstimateItemInput]] = None


class CpwdHealthResponse(BaseModel):
    status: str
    ollama_running: bool
    configured_chat_model: str
    configured_embed_model: str
    chat_model_available: bool
    embed_model_available: bool
    models_installed: List[str]
    instructions: Optional[str] = None
    db_summary: Dict[str, Any]
