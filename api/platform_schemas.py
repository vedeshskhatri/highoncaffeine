"""
Pydantic models for the THERMA Platform Asset Management endpoints
per brain/07A_PLATFORM_CONTRACT_PROPOSAL.md.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SiteBase(BaseModel):
    name: str
    estate: str = Field(default="Ladakh", description="'Ladakh' | 'Nepal Relief'")
    lat: float
    lon: float
    altitude_m: float
    district: str
    site_type: str = Field(description="'forward_post' | 'relief_camp' | 'dwelling'")
    occupants: int = Field(default=8)
    notes: Optional[str] = None


class SiteCreate(SiteBase):
    current_design: Optional[Dict[str, Any]] = None


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    estate: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    altitude_m: Optional[float] = None
    district: Optional[str] = None
    site_type: Optional[str] = None
    occupants: Optional[int] = None
    notes: Optional[str] = None
    current_design: Optional[Dict[str, Any]] = None


class SiteEvaluationSummary(BaseModel):
    computed_at: str
    weather_mode: str
    t_in_min_c: float
    t_in_max_c: float
    hours_below_health_threshold: int
    comfort_hours: int
    annual_fuel_litres: float
    annual_cost_inr: float
    annual_co2_kg: float
    heat_loss_breakdown_pct: Dict[str, float]
    benchmark_vs_dihar: Dict[str, Any]
    status: str = Field(description="'optimal' | 'warning' | 'critical' | 'unevaluated'")


class SiteResponse(SiteBase):
    id: str
    current_design: Optional[Dict[str, Any]] = None
    has_evaluation: bool
    evaluation: Optional[SiteEvaluationSummary] = None
    created_at: str
    updated_at: str


class EvaluateRequest(BaseModel):
    weather_mode: str = Field(default="typical_day", description="'typical_day' | 'design_winter_night'")


class EvaluateAllResponse(BaseModel):
    evaluated_count: int
    failed_count: int
    elapsed_seconds: float


class ProgrammeRequest(BaseModel):
    estate: str = Field(default="Ladakh")
    budget_inr: float = Field(default=14000000.0)
    district: Optional[str] = None
    site_type: Optional[str] = None


class ProgrammeItem(BaseModel):
    rank: int
    site_id: str
    site_name: str
    district: str
    intervention: str
    cost_inr: float
    cost_basis: str
    litres_saved_per_year: float
    litres_per_1000_inr: float
    degrees_gained_c: float
    payback_years: Optional[float] = None
    cumulative_cost_inr: float
    cumulative_litres_saved: float
    funded: bool


class ProgrammeResponse(BaseModel):
    estate: str
    budget_inr: float
    coverage_str: str
    headline: str
    total_spend_inr: float
    total_litres_saved_per_year: float
    posts_funded_count: int
    items: List[ProgrammeItem]


class ForecastResponse(BaseModel):
    estate: str
    coverage_str: str
    sortie_config: Dict[str, Any]
    total_annual_litres: float
    total_annual_sorties: float
    monthly: List[Dict[str, Any]]
    site_monthly_breakdown: List[Dict[str, Any]]


class AlertResponse(BaseModel):
    id: str
    site_id: str
    site_name: str
    estate: str
    severity: str
    kind: str
    window_start: str
    window_end: str
    predicted_min_c: float
    health_threshold_c: float
    occupants_affected: int
    recommended_action: str
    forecast_summary: Dict[str, Any]
    created_at: str
    acknowledged: bool


class DesignModel(BaseModel):
    id: str
    name: str
    revision: int = 1
    status: str = "draft"
    design_json: Dict[str, Any]
    author: str
    created_at: str
    parent_id: Optional[str] = None
    active_sites_count: Optional[int] = 0


class DesignCreate(BaseModel):
    name: str
    design_json: Dict[str, Any]
    author: str = "MES Engineer"
    parent_id: Optional[str] = None


class MaterialAvailabilityItem(BaseModel):
    id: str
    name: str
    category: str
    k: float
    cost_per_m3: Optional[float] = None
    cost_source: Optional[str] = None
    cost_basis: str
    locally_available: bool
    lead_time_days: int
    transport_constraint: str
    install_note: Optional[str] = None
    source: str
