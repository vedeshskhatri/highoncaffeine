"""
Feature Data Contracts for THERMA.
Defines the minimum data structures for:
1. Thermal Diagnosis
2. What-If Analysis
3. Scenario Comparison
4. Pareto Results
5. Budget Optimization
6. Retrofit Ranking / Design Doctor
7. Recommendation Explanation
8. Material Substitution
9. Climate Comparison
10. Sensitivity
11. Validation Dashboard
12. Engineering Report
13. Audit Trail

Adheres strictly to brain/00_MASTER_RULES.md, brain/04_DATA_MODEL.md,
brain/06_PHYSICS_SPEC.md, and brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from api.schemas import (
    SimulateRequest,
    SimulateResponse,
    SimulateSummarySchema,
    SeriesItemSchema,
    HeatLossBreakdownSchema,
    FreezeRiskSchema,
    SurfaceSummarySchema,
    LocationSchema,
    GeometrySchema,
    EnvelopeSchema,
    OpeningSchema,
    VentilationSchema,
    OccupancySchema,
    GroundSchema,
    ComfortSchema,
    SimulationConfigSchema,
    WeatherProvenanceSchema,
    ParetoPointSchema,
    TopDesignSchema,
    OptimizeResponse,
    SensitivityLeverSchema,
    SensitivityResponse,
    RetrofitInterventionSchema,
    RetrofitResponse,
    ValidationScenarioSchema,
    ValidationOrderingCheckSchema,
    ValidationResponse,
    CostBasisEnum,
)


# ===========================================================================
# 1. Thermal Diagnosis Contract
# ===========================================================================

class ThermalMassMetricsSchema(BaseModel):
    """Dynamic thermal mass response metrics."""
    model_config = ConfigDict(extra="forbid")
    decrement_factor: float = Field(
        ...,
        ge=0.0,
        le=2.0,
        description="Diurnal damping ratio f = (Tin,max - Tin,min) / (Tout,max - Tout,min) [-]",
    )
    phase_lag_hours: float = Field(
        ...,
        ge=0.0,
        le=24.0,
        description="Thermal inertia time delay between Tout peak and Tin peak [hours]",
    )


class HeatLossRankingItemSchema(BaseModel):
    """Component heat loss share and rank."""
    model_config = ConfigDict(extra="forbid")
    component: str = Field(..., description="Envelope component (walls, roof, glazing, infiltration, sky_radiation)")
    loss_kwh: float = Field(..., ge=0.0, description="Total conductive/convective heat loss [kWh]")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Component percentage share of total envelope heat loss [%]")
    rank: int = Field(..., ge=1, le=5, description="Loss rank, 1 = dominant thermal bottleneck")


class ThermalDiagnosisSchema(BaseModel):
    """Complete diagnostic assessment of shelter thermal performance."""
    model_config = ConfigDict(extra="forbid")
    thermal_mass: ThermalMassMetricsSchema
    bottleneck_component: str = Field(..., description="Primary thermal loss bottleneck name")
    bottleneck_loss_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of total heat lost through bottleneck [%]")
    loss_ranking: List[HeatLossRankingItemSchema]
    freeze_risks: List[FreezeRiskSchema] = Field(default_factory=list, description="Surfaces with Tin_surface < 0.0 C per ISO 6946")
    surfaces: List[SurfaceSummarySchema] = Field(default_factory=list, description="Per-surface temperatures, fluxes, and solar absorption")


# ===========================================================================
# 2. What-If Analysis Contract
# ===========================================================================

class WhatIfDeltaSchema(BaseModel):
    """Differential comparison between a variant design and baseline."""
    model_config = ConfigDict(extra="forbid")
    delta_t_in_min_c: float = Field(..., description="Change in minimum overnight indoor air temperature [C]")
    delta_t_in_max_c: float = Field(..., description="Change in maximum peak daytime indoor air temperature [C]")
    delta_comfort_hours_ratio: float = Field(..., description="Change in fraction of hours meeting comfort band [-]")
    delta_hours_below_health: int = Field(..., description="Change in hours below safe 18 C threshold [hours]")
    delta_solar_gain_kwh: float = Field(..., description="Change in daily solar radiation admitted [kWh]")
    delta_heat_loss_kwh: float = Field(..., description="Change in daily envelope heat loss [kWh]")
    delta_capital_cost_inr: float = Field(..., description="Incremental capital expenditure [INR]")
    cost_basis: CostBasisEnum = Field(..., description="Basis of cost assessment: sourced, estimate, or derived")
    delta_annual_fuel_cost_inr: float = Field(..., description="Annual heating fuel cost savings (negative is savings) [INR/year]")
    simple_payback_years: Optional[float] = Field(
        default=None,
        description="Simple payback period in years (null if no net fuel savings or zero capital cost)",
    )


class WhatIfRequestSchema(BaseModel):
    """Request payload for comparing two design configurations under identical weather."""
    model_config = ConfigDict(extra="forbid")
    baseline: SimulateRequest
    variant: SimulateRequest


class WhatIfResponseSchema(BaseModel):
    """Response payload containing side-by-side summaries and delta."""
    model_config = ConfigDict(extra="forbid")
    baseline_summary: SimulateSummarySchema
    variant_summary: SimulateSummarySchema
    delta: WhatIfDeltaSchema
    hourly_delta_t: List[float] = Field(..., description="24-hour array of (Tin_variant - Tin_baseline) [C]")


# ===========================================================================
# 3. Scenario Comparison Contract
# ===========================================================================

class ScenarioComparisonItemSchema(BaseModel):
    """Condensed multi-dimensional metrics for a single design scenario."""
    model_config = ConfigDict(extra="forbid")
    scenario_id: str = Field(..., description="Unique scenario identifier")
    name: str = Field(..., description="Human-readable scenario title")
    t_in_min_c: float = Field(..., description="Minimum indoor temperature [C]")
    t_in_max_c: float = Field(..., description="Maximum indoor temperature [C]")
    t_in_mean_c: float = Field(..., description="Diurnal mean indoor temperature [C]")
    comfort_hours_ratio: float = Field(..., ge=0.0, le=1.0, description="Comfort hours fraction [-]")
    hours_below_health_threshold: int = Field(..., ge=0, le=24, description="Hours below 18 C [hours]")
    total_heat_loss_kwh: float = Field(..., ge=0.0, description="Total daily heat loss [kWh]")
    capital_cost_inr: float = Field(..., ge=0.0, description="Estimated construction cost [INR]")
    annual_heating_cost_inr: float = Field(..., ge=0.0, description="Annual kerosene heating logistics cost [INR/year]")
    annual_co2_kg: float = Field(..., ge=0.0, description="Annual carbon emissions from backup heating [kg CO2/year]")


class ScenarioComparisonRequestSchema(BaseModel):
    """Request to compare multiple arbitrary design configurations."""
    model_config = ConfigDict(extra="forbid")
    scenarios: List[SimulateRequest] = Field(..., min_length=2, max_length=10)
    scenario_names: List[str] = Field(..., min_length=2, max_length=10)


class ScenarioComparisonResponseSchema(BaseModel):
    """Response matrix comparing scenarios with hourly temperature series."""
    model_config = ConfigDict(extra="forbid")
    scenarios: List[ScenarioComparisonItemSchema]
    hourly_series: Dict[str, List[float]] = Field(..., description="Keyed by scenario_id: 24 hourly indoor temperatures [C]")


# ===========================================================================
# 4. Pareto Results Contract (Extended)
# ===========================================================================

class ExtendedParetoPointSchema(BaseModel):
    """Extended non-dominated design point accommodating secondary objectives."""
    model_config = ConfigDict(extra="forbid")
    design_id: str
    comfort_hours_ratio: float = Field(..., ge=0.0, le=1.0, description="Objective 1: Comfort ratio [-]")
    cost_inr: float = Field(..., ge=0.0, description="Objective 2: Capital cost [INR]")
    t_in_min_c: float = Field(..., description="Overnight minimum temperature [C]")
    hours_below_health: Optional[int] = Field(default=None, ge=0, le=24, description="Secondary objective: Hours < 18 C [h]")
    kerosene_litres_per_year: Optional[float] = Field(default=None, ge=0.0, description="Secondary objective: Fuel consumption [L/yr]")


# ===========================================================================
# 5. Budget Optimization Contract (Extended)
# ===========================================================================

class BudgetOptimizationSummarySchema(BaseModel):
    """Audit metadata for budget constraint enforcement."""
    model_config = ConfigDict(extra="forbid")
    budget_cap_inr: float = Field(..., gt=0.0, description="Enforced budget threshold [INR]")
    total_evaluated: int = Field(..., ge=0, description="Number of sampled designs evaluated")
    designs_within_budget: int = Field(..., ge=0, description="Number of designs meeting cost threshold")
    refused_over_budget: int = Field(..., ge=0, description="Number of sampled designs rejected for cost > budget")
    refused_unsafe: int = Field(..., ge=0, description="Number of sampled designs rejected by safety interlock")


# ===========================================================================
# 6. Retrofit Ranking / Design Doctor Contract
# ===========================================================================

class RetrofitCategoryEnum(str, Enum):
    glazing = "glazing"
    insulation = "insulation"
    airtightness = "airtightness"
    thermal_mass = "thermal_mass"
    solar_gain = "solar_gain"


class DesignDoctorInterventionSchema(BaseModel):
    """Diagnostic retrofit intervention with causal explanation and payback."""
    model_config = ConfigDict(extra="forbid")
    rank: int = Field(..., ge=1, description="Priority rank sorted descending by degrees_per_1000_inr")
    label: str = Field(..., description="Actionable intervention description")
    category: RetrofitCategoryEnum = Field(..., description="Thermal intervention classification")
    diagnosis: str = Field(..., description="Causal physical deficiency triggering this recommendation")
    delta_t_min_c: float = Field(..., description="Expected rise in minimum indoor temperature [C]")
    cost_inr: float = Field(..., ge=0.0, description="Estimated implementation cost [INR]")
    degrees_per_1000_inr: float = Field(..., description="Cost-effectiveness ratio [C per 1,000 INR]")
    cost_basis: CostBasisEnum = Field(..., description="Cost certainty: sourced, estimate, or derived")
    cumulative_cost_inr: float = Field(..., ge=0.0, description="Cumulative cost if applied in rank order [INR]")
    cumulative_t_min_c: float = Field(..., description="Cumulative indoor minimum temperature [C]")
    annual_fuel_savings_inr: Optional[float] = Field(default=None, ge=0.0, description="Annual heating cost reduction [INR/year]")
    payback_years: Optional[float] = Field(default=None, ge=0.0, description="Simple payback period [years]")


# ===========================================================================
# 7. Recommendation Explainability Contract
# ===========================================================================

class ExplainabilityDriverSchema(BaseModel):
    """Attribution driver for recommended design decision."""
    model_config = ConfigDict(extra="forbid")
    parameter: str = Field(..., description="Design parameter altered (e.g. night_shutter, insulation_mm)")
    label: str = Field(..., description="Human-readable parameter description")
    effect_c: float = Field(..., description="Marginal contribution to indoor minimum temperature rise [C]")
    percentage_of_gain: float = Field(..., ge=0.0, le=100.0, description="Fraction of total temperature rise driven by this lever [%]")


class RecommendationExplanationSchema(BaseModel):
    """Traceable, deterministic decision explanation without LLM hallucination."""
    model_config = ConfigDict(extra="forbid")
    headline: str = Field(..., description="Deterministic summary statement of performance improvement")
    primary_driver: ExplainabilityDriverSchema
    secondary_driver: Optional[ExplainabilityDriverSchema] = None
    safety_clearance: str = Field(..., description="Confirmation of safety interlock clearance (ACH >= 0.35)")
    economic_justification: str = Field(..., description="Financial trade-off summary (cost vs fuel savings)")


# ===========================================================================
# 8. Material Substitution Contract
# ===========================================================================

class MaterialSubstitutionRequestSchema(BaseModel):
    """Request evaluating the direct substitution of one material for another."""
    model_config = ConfigDict(extra="forbid")
    original_material_id: str = Field(..., description="Existing material ID from materials library")
    replacement_material_id: str = Field(..., description="Proposed replacement material ID")
    thickness_m: float = Field(..., gt=0.0, le=2.0, description="Layer thickness in meters [m]")
    surface_area_m2: float = Field(..., gt=0.0, le=1000.0, description="Envelope surface area affected [m2]")


class MaterialSubstitutionResponseSchema(BaseModel):
    """Physical, economic, and logistical impact of material substitution."""
    model_config = ConfigDict(extra="forbid")
    original_r_value: float = Field(..., gt=0.0, description="Thermal resistance of original layer [m2K/W]")
    replacement_r_value: float = Field(..., gt=0.0, description="Thermal resistance of replacement layer [m2K/W]")
    delta_r_value: float = Field(..., description="Net change in thermal resistance [m2K/W]")
    delta_u_value: float = Field(..., description="Net change in thermal transmittance [W/m2K]")
    delta_heat_capacity_kj_k: float = Field(..., description="Net change in thermal capacitance [kJ/K]")
    delta_mass_kg: float = Field(..., description="Net change in total envelope mass [kg]")
    delta_cost_inr: float = Field(..., description="Net change in material capital cost [INR]")
    cost_basis: CostBasisEnum = Field(..., description="Cost basis of replacement material")
    replacement_locally_available: bool = Field(..., description="Whether replacement material is procurable in Leh/Ladakh")
    thermal_verdict: str = Field(..., description="Deterministic physical impact statement")


# ===========================================================================
# 9. Climate Comparison Contract
# ===========================================================================

class ClimateLocationMetricSchema(BaseModel):
    """Performance metrics of a fixed design in a specific climatic location."""
    model_config = ConfigDict(extra="forbid")
    location_name: str = Field(..., description="Site name (e.g. Leh, Kargil, Siachen Base Camp)")
    altitude_m: float = Field(..., ge=0.0, description="Site altitude [m]")
    ambient_min_c: float = Field(..., description="Diurnal minimum ambient temperature [C]")
    ambient_max_c: float = Field(..., description="Diurnal maximum ambient temperature [C]")
    solar_ghi_total_kwh_m2: float = Field(..., ge=0.0, description="Daily total global horizontal solar irradiance [kWh/m2]")
    indoor_min_c: float = Field(..., description="Diurnal minimum indoor air temperature [C]")
    indoor_max_c: float = Field(..., description="Diurnal maximum indoor air temperature [C]")
    delta_ambient_mean: float = Field(..., description="Mean temperature lift over outdoor ambient (Tin - Tout) [C]")
    comfort_hours_ratio: float = Field(..., ge=0.0, le=1.0, description="Fraction of day meeting comfort band [-]")
    hours_below_health: int = Field(..., ge=0, le=24, description="Hours below WHO 18 C threshold [h]")
    backup_heat_litres_per_night: float = Field(..., ge=0.0, description="Nightly kerosene consumption for 18 C maintenance [L/night]")


class ClimateComparisonRequestSchema(BaseModel):
    """Evaluate a single shelter design across multiple geographic locations."""
    model_config = ConfigDict(extra="forbid")
    design: SimulateRequest
    locations: List[LocationSchema] = Field(..., min_length=2, max_length=10)
    location_names: List[str] = Field(..., min_length=2, max_length=10)


class ClimateComparisonResponseSchema(BaseModel):
    """Comparative climate sensitivity results."""
    model_config = ConfigDict(extra="forbid")
    locations: List[ClimateLocationMetricSchema]
    coldest_site: str = Field(..., description="Site with lowest minimum indoor temperature")
    safest_site: str = Field(..., description="Site with highest minimum indoor temperature")


# ===========================================================================
# 10. Sensitivity Contract (Extended)
# ===========================================================================

class ExtendedSensitivityLeverSchema(BaseModel):
    """Sensitivity lever with Morris standard deviation measuring non-linearity."""
    model_config = ConfigDict(extra="forbid")
    parameter: str
    label: str
    effect_c: float = Field(..., description="Morris elementary effect mean absolute mu* [C]")
    rank: int = Field(..., ge=1)
    cost_inr: float = Field(..., ge=0.0, description="Cost [INR]")
    cost_basis: CostBasisEnum
    sigma_c: Optional[float] = Field(default=None, ge=0.0, description="Morris elementary effect standard deviation sigma [C]")
    install_note: Optional[str] = None
    derived_note: Optional[str] = None


# ===========================================================================
# 11. Validation Dashboard Contract (Extended)
# ===========================================================================

class ExtendedValidationScenarioSchema(BaseModel):
    """Scenario validation record with explicit error and tolerance bounds."""
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    id: str
    label: str
    measured_min_c: float = Field(..., description="Published measured minimum temperature [C]")
    measured_max_c: float = Field(..., description="Published measured maximum temperature [C]")
    ambient_c: float = Field(..., description="Ambient reference temperature [C]")
    model_min_c: float = Field(..., description="Simulated model minimum temperature [C]")
    model_max_c: float = Field(..., description="Simulated model maximum temperature [C]")
    error_c: float = Field(..., description="Mean model error vs measured target [C]")
    tolerance_c: float = Field(..., gt=0.0, description="Permissible error bound (+/- C)")
    pass_: bool = Field(..., alias="pass")
    source: str = Field(..., description="Primary literature citation (Rule R1)")


# ===========================================================================
# 12. Engineering Report Contract
# ===========================================================================

class EngineeringReportProjectSchema(BaseModel):
    """Project header and compliance standards."""
    model_config = ConfigDict(extra="forbid")
    project_title: str = "THERMA Area-Specific High-Altitude Shelter Design"
    problem_statement: str = "PS 26051 / DRDO SIH 2026"
    client: str = "Defence Research and Development Organisation (DRDO)"
    standards: List[str] = [
        "EN ISO 52016-1:2017 (Building energy calculation)",
        "ISO 6946:2017 (Thermal resistance & surface film)",
        "NBC India 2016 Part 8 Section 3 (Comfort & Indian materials)",
        "WHO Housing and Health Guidelines (18 C threshold)",
        "ASHRAE Standard 62.2 (Combustion IAQ minimum ventilation)",
    ]


class EngineeringReportSchema(BaseModel):
    """Formal engineering specification document for export and sign-off."""
    model_config = ConfigDict(extra="forbid")
    report_id: str = Field(..., description="Unique report identifier UUID4")
    generated_at: str = Field(..., description="Generation timestamp ISO 8601 UTC")
    project: EngineeringReportProjectSchema = Field(default_factory=EngineeringReportProjectSchema)
    location: LocationSchema
    weather_provenance: WeatherProvenanceSchema
    geometry: GeometrySchema
    envelope: EnvelopeSchema
    thermal_performance: SimulateSummarySchema
    thermal_diagnosis: Optional[ThermalDiagnosisSchema] = None
    backup_heating_summary: str
    iaq_safety_verdict: str
    sha256_hash: str = Field(..., description="Cryptographic SHA-256 fingerprint of inputs and results")


# ===========================================================================
# 13. Audit Trail Contract
# ===========================================================================

class AuditRecordSchema(BaseModel):
    """Immutable log entry recorded in SQLite runs table."""
    model_config = ConfigDict(extra="forbid")
    id: str = Field(..., description="UUID4 execution identifier")
    created_at: str = Field(..., description="Execution timestamp in ISO 8601 UTC")
    kind: str = Field(..., description="Run category: simulate, optimize, sensitivity, retrofit, validation")
    git_commit: Optional[str] = Field(default=None, description="Active git HEAD commit hash at runtime")
    request_hash: str = Field(..., description="SHA-256 hash of canonical request payload")
    result_hash: str = Field(..., description="SHA-256 hash of canonical response payload")
    duration_ms: float = Field(..., ge=0.0, description="Execution run duration in milliseconds [ms]")
    status: str = Field(..., description="Run outcome: SUCCESS, REFUSED, or ERROR")
    request_json: str = Field(..., description="Serialized request JSON body")
    result_json: str = Field(..., description="Serialized result JSON body")


class AuditTrailResponseSchema(BaseModel):
    """Paginated or complete list of recorded audit records."""
    model_config = ConfigDict(extra="forbid")
    total_runs: int = Field(..., ge=0, description="Total logged runs in database")
    runs: List[AuditRecordSchema]
