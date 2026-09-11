"""
Tests for THERMA Feature Data Contracts (Phase 1).
Validates schema integrity, physical unit constraints, economic basis rules,
and non-breaking compatibility across all 13 feature domains:

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
"""

import pytest
from pydantic import ValidationError

from api.contracts import (
    ThermalMassMetricsSchema,
    HeatLossRankingItemSchema,
    ThermalDiagnosisSchema,
    WhatIfDeltaSchema,
    WhatIfRequestSchema,
    WhatIfResponseSchema,
    ScenarioComparisonItemSchema,
    ScenarioComparisonRequestSchema,
    ScenarioComparisonResponseSchema,
    ExtendedParetoPointSchema,
    BudgetOptimizationSummarySchema,
    RetrofitCategoryEnum,
    DesignDoctorInterventionSchema,
    ExplainabilityDriverSchema,
    RecommendationExplanationSchema,
    MaterialSubstitutionRequestSchema,
    MaterialSubstitutionResponseSchema,
    ClimateLocationMetricSchema,
    ClimateComparisonRequestSchema,
    ClimateComparisonResponseSchema,
    ExtendedSensitivityLeverSchema,
    ExtendedValidationScenarioSchema,
    EngineeringReportSchema,
    EngineeringReportProjectSchema,
    AuditRecordSchema,
    AuditTrailResponseSchema,
)

from api.schemas import (
    SimulateRequest,
    SimulateResponse,
    SimulateSummarySchema,
    LocationSchema,
    WeatherRequestSchema,
    GeometrySchema,
    EnvelopeSchema,
    LayerSchema,
    OpeningSchema,
    VentilationSchema,
    OccupancySchema,
    GroundSchema,
    ComfortSchema,
    SimulationConfigSchema,
    WeatherProvenanceSchema,
    HeatLossBreakdownSchema,
    BackupHeatSchema,
    ImpactSchema,
    FreezeRiskSchema,
    SurfaceSummarySchema,
    CostBasisEnum,
    WeatherMode,
    FacingEnum,
    HeaterTypeEnum,
)


@pytest.fixture
def sample_simulate_request() -> SimulateRequest:
    return SimulateRequest(
        location=LocationSchema(lat=34.1526, lon=77.5771, altitude_m=3500.0),
        weather=WeatherRequestSchema(mode=WeatherMode.typical_day, date="2026-01-15", hours=24),
        geometry=GeometrySchema(length_m=6.0, width_m=4.0, height_m=2.6, orientation_deg=180.0),
        envelope=EnvelopeSchema(
            walls=[LayerSchema(material="mud_brick", thickness_m=0.30)],
            roof=[LayerSchema(material="dense_concrete", thickness_m=0.15)],
            floor=[LayerSchema(material="stone_flooring", thickness_m=0.10)],
            roof_emissivity=0.90,
        ),
        openings=[OpeningSchema(facing=FacingEnum.south, area_m2=4.0, glazing="double_pane", night_shutter=False)],
        ventilation=VentilationSchema(ach=0.6, heater_type=HeaterTypeEnum.none),
        occupancy=OccupancySchema(people=8, watts_per_person=100.0),
        ground=GroundSchema(snow_cover=True, albedo=0.75),
        comfort=ComfortSchema(model="imac", health_threshold_c=18.0),
        simulation=SimulationConfigSchema(timestep_s=60, spinup_days=3),
    )


@pytest.fixture
def sample_summary() -> SimulateSummarySchema:
    return SimulateSummarySchema(
        t_in_min_c=3.1,
        t_in_min_hour=6,
        t_in_max_c=19.4,
        comfort_hours_ratio=0.21,
        hours_below_health_threshold=17,
        solar_gain_kwh=18.7,
        heat_loss_kwh=HeatLossBreakdownSchema(
            walls=12.1,
            roof=9.4,
            glazing=7.8,
            infiltration=4.2,
            sky_radiation=6.9,
        ),
        backup_heat=BackupHeatSchema(peak_kw=1.1, hours=6.5, kerosene_litres_per_night=0.9),
        impact=ImpactSchema(
            kerosene_litres_per_year=1310.0,
            cost_inr_per_year=3144000.0,
            co2_kg_per_year=3275.0,
            payback_years=None,
        ),
        freeze_risk=[FreezeRiskSchema(location="north_wall interior surface", below_zero_from_hour=2, min_c=-1.8)],
    )


# ---------------------------------------------------------------------------
# 1. Thermal Diagnosis Contract Tests
# ---------------------------------------------------------------------------

def test_thermal_diagnosis_schema_valid():
    diagnosis = ThermalDiagnosisSchema(
        thermal_mass=ThermalMassMetricsSchema(decrement_factor=0.24, phase_lag_hours=6.5),
        bottleneck_component="glazing",
        bottleneck_loss_percentage=42.5,
        loss_ranking=[
            HeatLossRankingItemSchema(component="glazing", loss_kwh=15.3, percentage=42.5, rank=1),
            HeatLossRankingItemSchema(component="walls", loss_kwh=10.2, percentage=28.3, rank=2),
            HeatLossRankingItemSchema(component="roof", loss_kwh=6.5, percentage=18.1, rank=3),
            HeatLossRankingItemSchema(component="infiltration", loss_kwh=4.0, percentage=11.1, rank=4),
        ],
        freeze_risks=[FreezeRiskSchema(location="north_wall interior", below_zero_from_hour=3, min_c=-2.1)],
        surfaces=[SurfaceSummarySchema(name="south_wall", t_surface_c=4.5, flux_w=120.0, solar_absorbed_w=340.0)],
    )
    assert diagnosis.thermal_mass.decrement_factor == 0.24
    assert diagnosis.thermal_mass.phase_lag_hours == 6.5
    assert diagnosis.bottleneck_component == "glazing"


def test_thermal_diagnosis_schema_bounds_validation():
    # Decrement factor cannot be negative
    with pytest.raises(ValidationError):
        ThermalMassMetricsSchema(decrement_factor=-0.1, phase_lag_hours=5.0)

    # Phase lag cannot exceed 24 hours
    with pytest.raises(ValidationError):
        ThermalMassMetricsSchema(decrement_factor=0.5, phase_lag_hours=25.0)

    # Percentage cannot exceed 100
    with pytest.raises(ValidationError):
        HeatLossRankingItemSchema(component="walls", loss_kwh=10.0, percentage=110.0, rank=1)


# ---------------------------------------------------------------------------
# 2. What-If Analysis Contract Tests
# ---------------------------------------------------------------------------

def test_what_if_contract_valid(sample_simulate_request, sample_summary):
    delta = WhatIfDeltaSchema(
        delta_t_in_min_c=4.5,
        delta_t_in_max_c=2.1,
        delta_comfort_hours_ratio=0.35,
        delta_hours_below_health=-8,
        delta_solar_gain_kwh=5.2,
        delta_heat_loss_kwh=-6.4,
        delta_capital_cost_inr=25000.0,
        cost_basis=CostBasisEnum.sourced,
        delta_annual_fuel_cost_inr=-72000.0,
        simple_payback_years=0.35,
    )
    response = WhatIfResponseSchema(
        baseline_summary=sample_summary,
        variant_summary=sample_summary,
        delta=delta,
        hourly_delta_t=[2.0] * 24,
    )
    assert response.delta.delta_t_in_min_c == 4.5
    assert response.delta.simple_payback_years == 0.35
    assert len(response.hourly_delta_t) == 24


# ---------------------------------------------------------------------------
# 3. Scenario Comparison Contract Tests
# ---------------------------------------------------------------------------

def test_scenario_comparison_contract():
    item_a = ScenarioComparisonItemSchema(
        scenario_id="s1_baseline",
        name="Baseline CGI Tent",
        t_in_min_c=-8.4,
        t_in_max_c=6.2,
        t_in_mean_c=-1.1,
        comfort_hours_ratio=0.0,
        hours_below_health_threshold=24,
        total_heat_loss_kwh=54.2,
        capital_cost_inr=85000.0,
        annual_heating_cost_inr=4200000.0,
        annual_co2_kg=4375.0,
    )
    item_b = ScenarioComparisonItemSchema(
        scenario_id="s2_trombe",
        name="Trombe Solar Shelter",
        t_in_min_c=16.3,
        t_in_max_c=21.5,
        t_in_mean_c=18.9,
        comfort_hours_ratio=0.88,
        hours_below_health_threshold=2,
        total_heat_loss_kwh=14.1,
        capital_cost_inr=280000.0,
        annual_heating_cost_inr=310000.0,
        annual_co2_kg=322.0,
    )
    response = ScenarioComparisonResponseSchema(
        scenarios=[item_a, item_b],
        hourly_series={"s1_baseline": [-8.0] * 24, "s2_trombe": [17.0] * 24},
    )
    assert len(response.scenarios) == 2
    assert response.scenarios[1].comfort_hours_ratio == 0.88


# ---------------------------------------------------------------------------
# 4. Pareto Results Extended Contract Tests
# ---------------------------------------------------------------------------

def test_pareto_extended_contract():
    point = ExtendedParetoPointSchema(
        design_id="d_0142",
        comfort_hours_ratio=0.79,
        cost_inr=245000.0,
        t_in_min_c=15.8,
        hours_below_health=3,
        kerosene_litres_per_year=120.0,
    )
    assert point.comfort_hours_ratio == 0.79
    assert point.hours_below_health == 3


# ---------------------------------------------------------------------------
# 5. Budget Optimization Contract Tests
# ---------------------------------------------------------------------------

def test_budget_optimization_contract():
    summary = BudgetOptimizationSummarySchema(
        budget_cap_inr=300000.0,
        total_evaluated=3000,
        designs_within_budget=1840,
        refused_over_budget=1160,
        refused_unsafe=412,
    )
    assert summary.budget_cap_inr == 300000.0
    assert summary.refused_over_budget == 1160


# ---------------------------------------------------------------------------
# 6. Retrofit Ranking / Design Doctor Contract Tests
# ---------------------------------------------------------------------------

def test_design_doctor_contract():
    intervention = DesignDoctorInterventionSchema(
        rank=1,
        label="Install double-pane glazing with movable night shutter",
        category=RetrofitCategoryEnum.glazing,
        diagnosis="High conductive heat loss through single clear glazing",
        delta_t_min_c=6.1,
        cost_inr=18000.0,
        degrees_per_1000_inr=0.339,
        cost_basis=CostBasisEnum.sourced,
        cumulative_cost_inr=18000.0,
        cumulative_t_min_c=9.2,
        annual_fuel_savings_inr=144000.0,
        payback_years=0.125,
    )
    assert intervention.rank == 1
    assert intervention.category == RetrofitCategoryEnum.glazing
    assert intervention.degrees_per_1000_inr == 0.339


# ---------------------------------------------------------------------------
# 7. Recommendation Explainability Contract Tests
# ---------------------------------------------------------------------------

def test_recommendation_explainability_contract():
    explanation = RecommendationExplanationSchema(
        headline="South glazing increased to 5.5 m2 with night shutters, raising overnight minimum by +14.1 C",
        primary_driver=ExplainabilityDriverSchema(
            parameter="night_shutter",
            label="Movable night shutter",
            effect_c=6.1,
            percentage_of_gain=43.3,
        ),
        secondary_driver=ExplainabilityDriverSchema(
            parameter="south_glazing_m2",
            label="South window expansion to 5.5 m2",
            effect_c=4.8,
            percentage_of_gain=34.0,
        ),
        safety_clearance="Airtightness 0.6 ACH verified safe for flued heating",
        economic_justification="Additional capital cost of ₹48,000 pays back in 2.2 months via kerosene savings",
    )
    assert explanation.primary_driver.parameter == "night_shutter"
    assert explanation.primary_driver.percentage_of_gain == 43.3


# ---------------------------------------------------------------------------
# 8. Material Substitution Contract Tests
# ---------------------------------------------------------------------------

def test_material_substitution_contract():
    req = MaterialSubstitutionRequestSchema(
        original_material_id="stone_masonry",
        replacement_material_id="rammed_earth",
        thickness_m=0.30,
        surface_area_m2=48.0,
    )
    res = MaterialSubstitutionResponseSchema(
        original_r_value=0.167,
        replacement_r_value=0.429,
        delta_r_value=0.262,
        delta_u_value=-1.66,
        delta_heat_capacity_kj_k=480.0,
        delta_mass_kg=-4320.0,
        delta_cost_inr=-28800.0,
        cost_basis=CostBasisEnum.sourced,
        replacement_locally_available=True,
        thermal_verdict="Rammed earth increases thermal resistance by +0.26 m2K/W while saving ₹28,800 and 4.3 tons of transport weight.",
    )
    assert req.thickness_m == 0.30
    assert res.delta_r_value == 0.262
    assert res.replacement_locally_available is True


# ---------------------------------------------------------------------------
# 9. Climate Comparison Contract Tests
# ---------------------------------------------------------------------------

def test_climate_comparison_contract(sample_simulate_request):
    leh_metric = ClimateLocationMetricSchema(
        location_name="Leh",
        altitude_m=3500.0,
        ambient_min_c=-19.4,
        ambient_max_c=-2.1,
        solar_ghi_total_kwh_m2=4.8,
        indoor_min_c=15.8,
        indoor_max_c=21.2,
        delta_ambient_mean=26.5,
        comfort_hours_ratio=0.82,
        hours_below_health=3,
        backup_heat_litres_per_night=0.8,
    )
    siachen_metric = ClimateLocationMetricSchema(
        location_name="Siachen Base Camp",
        altitude_m=3600.0,
        ambient_min_c=-28.5,
        ambient_max_c=-11.0,
        solar_ghi_total_kwh_m2=4.1,
        indoor_min_c=8.4,
        indoor_max_c=16.0,
        delta_ambient_mean=28.1,
        comfort_hours_ratio=0.15,
        hours_below_health=19,
        backup_heat_litres_per_night=2.4,
    )
    res = ClimateComparisonResponseSchema(
        locations=[leh_metric, siachen_metric],
        coldest_site="Siachen Base Camp",
        safest_site="Leh",
    )
    assert len(res.locations) == 2
    assert res.coldest_site == "Siachen Base Camp"


# ---------------------------------------------------------------------------
# 10. Sensitivity Extended Contract Tests
# ---------------------------------------------------------------------------

def test_sensitivity_extended_contract():
    lever = ExtendedSensitivityLeverSchema(
        parameter="night_shutter",
        label="Night shutters",
        effect_c=6.1,
        rank=1,
        cost_inr=500.0,
        cost_basis=CostBasisEnum.estimate,
        sigma_c=1.2,
        install_note="Local craftsman, 1 day",
    )
    assert lever.effect_c == 6.1
    assert lever.sigma_c == 1.2


# ---------------------------------------------------------------------------
# 11. Validation Dashboard Extended Contract Tests
# ---------------------------------------------------------------------------

def test_validation_extended_contract():
    scenario = ExtendedValidationScenarioSchema(
        id="dihar_leh",
        label="DIHAR Leh solar-heated shelter",
        measured_min_c=15.0,
        measured_max_c=20.0,
        ambient_c=-19.0,
        model_min_c=16.04,
        model_max_c=18.38,
        error_c=-0.29,
        tolerance_c=2.0,
        pass_=True,
        source="DRDO DIHAR pilot reporting",
    )
    assert scenario.pass_ is True
    assert scenario.tolerance_c == 2.0


# ---------------------------------------------------------------------------
# 12. Engineering Report Contract Tests
# ---------------------------------------------------------------------------

def test_engineering_report_contract(sample_simulate_request, sample_summary):
    report = EngineeringReportSchema(
        report_id="rep_9f81a2bc-78d1",
        generated_at="2026-09-11T14:30:00Z",
        project=EngineeringReportProjectSchema(),
        location=sample_simulate_request.location,
        weather_provenance=WeatherProvenanceSchema(
            provider="open-meteo",
            is_live=True,
            grid_note=None,
            fetched_at="2026-09-11T14:00:00Z",
        ),
        geometry=sample_simulate_request.geometry,
        envelope=sample_simulate_request.envelope,
        thermal_performance=sample_summary,
        backup_heating_summary="Kerosene requirement 0.9 L/night, annual logistics expenditure ₹31.4 lakh",
        iaq_safety_verdict="PASSED — ACH 0.6 >= 0.35 combustion floor",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
    assert report.report_id == "rep_9f81a2bc-78d1"
    assert report.iaq_safety_verdict.startswith("PASSED")


# ---------------------------------------------------------------------------
# 13. Audit Trail Contract Tests
# ---------------------------------------------------------------------------

def test_audit_trail_contract():
    record = AuditRecordSchema(
        id="run_a1b2c3d4-e5f6",
        created_at="2026-09-11T14:30:00Z",
        kind="simulate",
        git_commit="d083219",
        request_hash="a1b2c3d4e5f67890",
        result_hash="0987654321fedcba",
        duration_ms=48.2,
        status="SUCCESS",
        request_json="{}",
        result_json="{}",
    )
    trail = AuditTrailResponseSchema(total_runs=1, runs=[record])
    assert trail.total_runs == 1
    assert trail.runs[0].duration_ms == 48.2


# ---------------------------------------------------------------------------
# 14. Non-Breaking Backward Compatibility Test
# ---------------------------------------------------------------------------

def test_frozen_schemas_backward_compatibility(sample_simulate_request, sample_summary):
    # Verify SimulateResponse conforms exactly to frozen contract with extra/optional elements
    res = SimulateResponse(
        refused=False,
        refusal_reason=None,
        weather_provenance=WeatherProvenanceSchema(
            provider="open-meteo",
            is_live=True,
            grid_note=None,
            fetched_at="2026-09-11T14:00:00Z",
        ),
        series=[],
        summary=sample_summary,
        surfaces=[],
    )
    data = res.model_dump(by_alias=True)
    assert data["refused"] is False
    assert data["summary"]["t_in_min_c"] == 3.1
    assert data["summary"]["freeze_risk"][0]["min_c"] == -1.8
