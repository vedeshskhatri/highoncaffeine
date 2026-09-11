"""
Pydantic v2 schemas for THERMA API requests and responses.
Single source of truth: brain/07_API_CONTRACT.md.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Enums ---

class WeatherMode(str, Enum):
    typical_day = "typical_day"
    design_winter_night = "design_winter_night"
    user_csv = "user_csv"


class FacingEnum(str, Enum):
    north = "north"
    east = "east"
    south = "south"
    west = "west"
    roof = "roof"


class HeaterTypeEnum(str, Enum):
    none = "none"
    unflued_combustion = "unflued_combustion"
    flued_stove = "flued_stove"
    electric = "electric"


class CostBasisEnum(str, Enum):
    sourced = "sourced"
    estimate = "estimate"
    derived = "derived"


# --- Request Sub-schemas ---

class LocationSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees (-90 to +90)")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees (-180 to +180)")
    altitude_m: float = Field(..., ge=0.0, le=9000.0, description="Site altitude in meters above sea level (0 to 9000 m)")


class WeatherRequestSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: WeatherMode = Field(..., description="Weather driving mode: typical_day, design_winter_night, or user_csv")
    date: str = Field(..., description="Target date in ISO format (YYYY-MM-DD)")
    hours: int = Field(default=24, gt=0, le=8760, description="Duration in hours to simulate (default 24)")
    user_csv_id: Optional[str] = Field(default=None, description="Identifier of uploaded CSV weather, required if mode is user_csv")


class GeometrySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    length_m: float = Field(..., gt=0.0, le=100.0, description="Shelter length in meters (>0 to 100 m)")
    width_m: float = Field(..., gt=0.0, le=100.0, description="Shelter width in meters (>0 to 100 m)")
    height_m: float = Field(..., gt=0.0, le=20.0, description="Shelter height in meters (>0 to 20 m)")
    orientation_deg: float = Field(..., ge=0.0, le=360.0, description="Orientation angle in degrees (0=N, 90=E, 180=S, 270=W)")


class LayerSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    material: str = Field(..., min_length=1, description="Material identifier from material library")
    thickness_m: float = Field(..., gt=0.0, le=5.0, description="Layer thickness in meters (>0 to 5 m)")


class EnvelopeSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    walls: List[LayerSchema] = Field(..., min_length=1, description="Wall layers ordered outside to inside")
    roof: List[LayerSchema] = Field(..., min_length=1, description="Roof layers ordered outside to inside")
    floor: List[LayerSchema] = Field(..., min_length=1, description="Floor layers ordered outside to inside")
    roof_emissivity: float = Field(default=0.90, ge=0.0, le=1.0, description="Long-wave surface emissivity of roof exterior (0 to 1)")


class OpeningSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    facing: FacingEnum = Field(..., description="Facing orientation: north, east, south, west, or roof")
    area_m2: float = Field(..., ge=0.0, le=200.0, description="Total opening area on this face in square meters")
    glazing: str = Field(..., min_length=1, description="Glazing material identifier (e.g. double_pane)")
    night_shutter: bool = Field(default=False, description="Whether movable insulating night shutters are installed and closed sunset-sunrise")


class VentilationSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ach: float = Field(default=0.6, ge=0.0, le=50.0, description="Air changes per hour (ACH, >=0)")
    heater_type: HeaterTypeEnum = Field(default=HeaterTypeEnum.none, description="Internal heating type: none, unflued_combustion, flued_stove, or electric")


class OccupancySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    people: int = Field(default=0, ge=0, le=500, description="Number of human occupants")
    watts_per_person: float = Field(default=100.0, ge=0.0, le=1000.0, description="Sensible heat gain per person in Watts")


class GroundSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    snow_cover: bool = Field(default=True, description="Whether snow covers surrounding ground")
    albedo: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Ground shortwave reflectance (derived from snow_cover if null)")


class ComfortSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str = Field(default="imac", description="Thermal comfort standard/model (default 'imac')")
    health_threshold_c: float = Field(default=18.0, description="Minimum safe seasonal indoor temperature threshold in Celsius")


class SimulationConfigSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timestep_s: int = Field(default=60, gt=0, le=3600, description="Internal solver timestep in seconds")
    spinup_days: int = Field(default=3, ge=0, le=14, description="Spin-up stabilization period in days (discarded before reporting)")


# --- Main Requests ---

class SimulateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location: LocationSchema
    weather: WeatherRequestSchema
    geometry: GeometrySchema
    envelope: EnvelopeSchema
    openings: List[OpeningSchema] = Field(default_factory=list)
    ventilation: VentilationSchema = Field(default_factory=VentilationSchema)
    occupancy: OccupancySchema = Field(default_factory=OccupancySchema)
    ground: GroundSchema = Field(default_factory=GroundSchema)
    comfort: ComfortSchema = Field(default_factory=ComfortSchema)
    simulation: SimulationConfigSchema = Field(default_factory=SimulationConfigSchema)
    occupant_model: Optional[bool] = Field(default=False, description="Whether to simulate Gagge two-node occupant thermoregulation")
    occupant_clothing_clo: Optional[float] = Field(default=1.5, ge=0.0, le=10.0, description="Clothing insulation in clo (ASHRAE HoF 2021 Ch.9 Tbl 5)")
    occupant_metabolic_met: Optional[float] = Field(default=1.0, ge=0.5, le=10.0, description="Occupant metabolic rate in met (ISO 7730 / ASHRAE HoF Ch.9)")


class FixedGeometrySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    length_m: float = Field(..., gt=0.0, le=100.0)
    width_m: float = Field(..., gt=0.0, le=100.0)
    height_m: float = Field(..., gt=0.0, le=20.0)


class SearchRangeSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    min: float
    max: float
    # NOTE: step was removed — the optimizer uses Latin Hypercube Sampling and
    # does not honour a discrete step. Accepting and discarding it was a contract
    # lie (audit finding A3-2). Callers should omit step.


class SearchSpaceSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    orientation_deg: Optional[SearchRangeSchema] = None
    south_glazing_m2: Optional[SearchRangeSchema] = None
    wall_material: Optional[List[str]] = None
    insulation_mm: Optional[SearchRangeSchema] = None
    night_shutter: Optional[List[bool]] = None
    roof_emissivity: Optional[List[float]] = None


class ConstraintsSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    locally_available_only: bool = True
    max_cost_inr: Optional[float] = None
    heater_type: Optional[HeaterTypeEnum] = HeaterTypeEnum.none


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location: LocationSchema
    weather: WeatherRequestSchema
    fixed: FixedGeometrySchema
    baseline: Dict[str, Any] = Field(..., description="Baseline design / envelope definition")
    search: SearchSpaceSchema
    constraints: ConstraintsSchema
    objectives: List[str] = Field(default=["maximise_comfort_hours", "minimise_cost"])
    n_samples: int = Field(default=3000, gt=0, le=50000)


class SensitivityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location: LocationSchema
    weather: WeatherRequestSchema
    baseline: Dict[str, Any]
    search: SearchSpaceSchema
    trajectories: int = Field(default=20, gt=0, le=100)


class RetrofitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location: LocationSchema
    weather: WeatherRequestSchema
    existing: Dict[str, Any] = Field(..., description="Existing shelter envelope definition")
    budget_inr: float = Field(..., gt=0.0, description="Available retrofit budget in INR")


# --- Response Sub-schemas ---

class WeatherProvenanceSchema(BaseModel):
    provider: str
    is_live: bool
    grid_note: Optional[str] = None
    fetched_at: str


class SeriesItemSchema(BaseModel):
    hour: int
    t_out: float
    t_in: float
    t_operative: float
    ghi: float
    delta_ambient: float
    t_in_lo: float
    t_in_hi: float


class HeatLossBreakdownSchema(BaseModel):
    walls: float
    roof: float
    glazing: float
    infiltration: float
    sky_radiation: float


class BackupHeatSchema(BaseModel):
    peak_kw: float
    hours: float
    kerosene_litres_per_night: float


class ImpactSchema(BaseModel):
    kerosene_litres_per_year: float
    cost_inr_per_year: float
    co2_kg_per_year: float
    payback_years: Optional[float] = None


class FreezeRiskSchema(BaseModel):
    location: str
    below_zero_from_hour: int
    min_c: float


class SurfaceSummarySchema(BaseModel):
    name: str
    t_surface_c: float
    flux_w: float
    solar_absorbed_w: float


class OccupantHourlyRecordSchema(BaseModel):
    hour: int
    t_air_c: float
    t_core_c: float
    t_skin_c: float
    shivering_w: float
    is_hypothermic: bool


class OccupantThermoregulationSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    model_confidence: str = Field(default="estimate")
    clothing_clo: float
    metabolic_met: float
    t_core_min_c: float
    t_core_min_hour: int
    t_skin_min_c: float
    hours_to_mild_hypothermia: Optional[float] = None
    series: List[OccupantHourlyRecordSchema] = Field(default_factory=list)


class SimulateSummarySchema(BaseModel):
    t_in_min_c: float
    t_in_min_hour: int
    t_in_max_c: float
    comfort_hours_ratio: float
    hours_below_health_threshold: int
    solar_gain_kwh: float
    heat_loss_kwh: HeatLossBreakdownSchema
    backup_heat: BackupHeatSchema
    impact: ImpactSchema
    freeze_risk: List[FreezeRiskSchema] = Field(default_factory=list)
    hours_to_mild_hypothermia: Optional[float] = None


class SimulateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    refused: bool = False
    refusal_reason: Optional[str] = None
    weather_provenance: Optional[WeatherProvenanceSchema] = None
    series: List[SeriesItemSchema] = Field(default_factory=list)
    summary: Optional[SimulateSummarySchema] = None
    surfaces: List[SurfaceSummarySchema] = Field(default_factory=list)
    diagnosis: Optional[Dict[str, Any]] = None
    occupant_thermoregulation: Optional[OccupantThermoregulationSchema] = None


class BaselineScoreSchema(BaseModel):
    comfort_hours_ratio: float
    t_in_min_c: float
    cost_inr: float


class ParetoPointSchema(BaseModel):
    design_id: str
    comfort_hours_ratio: float
    cost_inr: float
    t_in_min_c: float


class DeltaVsBaselineSchema(BaseModel):
    t_in_min_c: float
    comfort_hours_ratio: float
    cost_inr: float
    kerosene_litres_per_year: float


class TopDesignSchema(BaseModel):
    rank: int
    design_id: str
    design: Dict[str, Any]
    summary: SimulateSummarySchema
    why: str
    delta_vs_baseline: DeltaVsBaselineSchema


class OptimizeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    evaluated: int
    refused_unsafe: int
    elapsed_s: float
    baseline: BaselineScoreSchema
    pareto: List[ParetoPointSchema]
    top: List[TopDesignSchema]


class SensitivityLeverSchema(BaseModel):
    parameter: str
    label: str
    effect_c: float
    rank: int
    cost_inr: float
    cost_basis: str
    install_note: Optional[str] = None
    derived_note: Optional[str] = None


class SensitivityResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    method: str
    runs: int
    levers: List[SensitivityLeverSchema]


class RetrofitInterventionSchema(BaseModel):
    rank: int
    label: str
    delta_t_min_c: float
    cost_inr: float
    degrees_per_1000_inr: float
    cost_basis: str
    cumulative_cost_inr: float
    cumulative_t_min_c: float


class RetrofitBaselineSchema(BaseModel):
    t_in_min_c: float
    hours_below_health_threshold: int


class RetrofitResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    baseline: RetrofitBaselineSchema
    interventions: List[RetrofitInterventionSchema]
    within_budget_count: int


class WeatherCsvResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    user_csv_id: str
    hours: int
    warnings: List[str] = Field(default_factory=list)


class MaterialItemSchema(BaseModel):
    id: str
    name: str
    category: str
    k: float
    rho: float
    cp: float
    cost_per_m3: Optional[float] = None
    cost_basis: str
    locally_available: bool
    source: str


class MaterialsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    materials: List[MaterialItemSchema]


class ValidationScenarioSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    label: str
    measured_min_c: float
    measured_max_c: float
    ambient_c: float
    model_min_c: float
    model_max_c: float
    pass_: bool = Field(..., alias="pass", serialization_alias="pass")
    source: str


class ValidationOrderingCheckSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    trombe_above_direct_gain: bool
    pass_: bool = Field(..., alias="pass", serialization_alias="pass")


class ValidationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    scenarios: List[ValidationScenarioSchema]
    ordering_check: ValidationOrderingCheckSchema


class HealthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    stub: Optional[bool] = Field(default=False, alias="_stub", serialization_alias="_stub")
    ok: bool
    db: bool
    weather_cache_rows: int
    offline_capable: bool


# --- Forecast Watch Schemas (Feature 2) ---

class WatchPostSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    post_id: str = Field(..., description="Unique post identifier")
    name: Optional[str] = Field(default=None, description="Display name of post")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    altitude_m: float = Field(default=3500.0, ge=0.0, le=9000.0, description="Altitude in meters")


class ForecastWatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    posts: List[WatchPostSchema] = Field(..., min_length=1, description="List of border/observation posts")
    design: Optional[Dict[str, Any]] = Field(default=None, description="Shared shelter design (defaults to standard envelope if null)")
    forecast_days: int = Field(default=4, ge=1, le=7, description="Number of forecast days (3-5 recommended)")
    comfort_threshold_c: float = Field(default=18.0, description="Minimum acceptable indoor temperature threshold in Celsius")


class ForecastWatchItemSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    post_id: str
    date: str
    predicted_t_in_min_c: float
    breach: bool
    breach_hour: Optional[int] = None
    post_name: Optional[str] = None
    status: Optional[str] = None
    t_out_min_c: Optional[float] = None


# --- Annual Comfort Calendar Schemas ---

class AnnualScanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    location: LocationSchema = Field(..., description="Geographical site coordinates and altitude")
    year: int = Field(default=2026, ge=1980, le=2100, description="Target calendar year (e.g. 2026)")
    geometry: Optional[GeometrySchema] = Field(default=None, description="Shelter geometry dimensions")
    envelope: Optional[EnvelopeSchema] = Field(default=None, description="Multi-layer envelope layers")
    openings: Optional[List[OpeningSchema]] = Field(default=None, description="Fenestration openings")
    ventilation: Optional[VentilationSchema] = Field(default=None, description="Ventilation rate and heater type")
    occupancy: Optional[OccupancySchema] = Field(default=None, description="Human occupancy count and sensible heat gain")
    ground: Optional[GroundSchema] = Field(default=None, description="Ground snow cover and albedo")
    comfort: Optional[ComfortSchema] = Field(default=None, description="Thermal comfort evaluation model")
    simulation: Optional[SimulationConfigSchema] = Field(default=None, description="Internal solver controls")



class AnnualScanHourSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    t_in_c: float = Field(..., description="Indoor air temperature in Celsius")
    t_out_c: float = Field(..., description="Outdoor ambient air temperature in Celsius")
    comfort: bool = Field(..., description="True if indoor temperature is within IMAC 90% comfort band")


class AnnualScanDaySchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str = Field(..., description="ISO date string (YYYY-MM-DD)")
    provider: Optional[str] = Field(default="nasa-power", description="Weather provider: nasa-power or fallback")
    hours: List[AnnualScanHourSchema] = Field(..., description="24 hourly diurnal points")


class WorstWeekSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    start_date: str = Field(..., description="Start date of the 7-day coldest consecutive window")
    avg_t_in_min_c: float = Field(..., description="Average daily minimum indoor temperature across the 7 days")


class AnnualScanResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    year: int = Field(..., description="Calendar year scanned")
    days: List[AnnualScanDaySchema] = Field(..., description="Array of 365 (or 366) calendar days")
    comfort_days_ratio: float = Field(..., ge=0.0, le=1.0, description="Fraction of calendar days where >= 50% of hours met comfort")
    worst_week: WorstWeekSchema = Field(..., description="7-day coldest consecutive window summary")


AnnualScanRequest.model_rebuild()
AnnualScanResponse.model_rebuild()


