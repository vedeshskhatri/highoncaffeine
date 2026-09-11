"""
THERMA Surrogate ML Inference & Q&A API Router
Smart India Hackathon 2026 - DRDO PS 26051
Area-Specific Shelter Design for Thermal Comfort Maintenance

Endpoints:
- POST /api/ml/predict : Multi-surrogate prediction for shelter design
- POST /api/ml/ask     : Grounded natural-language question answering
- GET  /api/ml/models  : Evaluation metrics and metadata for all 5 surrogate models
- GET  /api/ml/locations : Supported Himalayan scenario locations
- GET  /api/ml/materials : Thermal materials library
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ml.inference import inference_engine

router = APIRouter(prefix="/api/ml", tags=["ML Surrogate Models"])


class ShelterPredictionRequest(BaseModel):
    location: Optional[str] = Field("Leh", description="Himalayan scenario location name")
    altitude_m: Optional[float] = Field(None, description="Altitude in meters")
    outdoor_temperature_C: Optional[float] = Field(-15.0, description="Ambient outdoor temperature in °C")
    wall_material: Optional[str] = Field("stone_masonry", description="Wall construction material")
    wall_insulation_thickness_m: Optional[float] = Field(0.05, description="Wall insulation thickness in meters")
    roof_insulation_thickness_m: Optional[float] = Field(0.08, description="Roof insulation thickness in meters")
    ach: Optional[float] = Field(0.6, description="Air changes per hour")
    glazing_area_m2: Optional[float] = Field(4.0, description="Total south-facing glazing area in m²")
    occupants: Optional[int] = Field(8, description="Number of shelter occupants")
    night_shutter: Optional[bool] = Field(True, description="Nocturnal insulated shutter active")
    heater_type: Optional[str] = Field("none", description="Heater type (none, bukkhari, kerosene, electric)")


class QuestionRequest(BaseModel):
    question: str = Field(..., description="Natural language question about shelter thermal performance")
    shelter_override: Optional[Dict[str, Any]] = Field(None, description="Optional parameter overrides")
    use_ollama: Optional[bool] = Field(True, description="Whether to synthesize response via local Ollama")


@router.post("/predict", summary="Predict shelter thermal performance using surrogate models")
def predict_shelter(req: ShelterPredictionRequest) -> Dict[str, Any]:
    """
    Executes all 5 surrogate ML models trained on the final 120,000-row dataset:
    Returns predicted indoor/operative/radiant temperatures, dominant bottleneck,
    heat loss fluxes in Watts, comfort status, and life-safety validation.
    """
    params = req.model_dump(exclude_none=True)
    return inference_engine.predict(params)


@router.post("/ask", summary="Answer thermal design question grounded in surrogate model predictions")
def ask_question(req: QuestionRequest) -> Dict[str, Any]:
    """
    Answers any user query about shelter performance, temperatures, heat loss, or safety
    using the exact predictions of the models trained on the final dataset.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return inference_engine.answer_question(
        question=req.question,
        shelter_override=req.shelter_override,
        use_ollama=req.use_ollama,
    )


@router.get("/models", summary="Retrieve surrogate models evaluation summary and metrics")
def get_models_metadata() -> Dict[str, Any]:
    """Returns evaluation metrics (R², MAE, Accuracy) on test split (18,000 rows)."""
    eval_path = Path("data/ml/evaluation_summary.json")
    if eval_path.exists():
        with open(eval_path, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    else:
        metrics = {}
    return {
        "dataset_rows": 120000,
        "train_rows": 84000,
        "test_rows": 18000,
        "validation_rows": 18000,
        "models": {
            "model_a_temperature": "HistGradientBoostingRegressor (Tin, Tmrt, Top)",
            "model_b_diagnosis": "HistGradientBoostingClassifier (Dominant Heat Loss)",
            "model_c_heat_loss": "MultiOutputRegressor (Conduction, Infiltration, Sky)",
            "model_d_comfort": "HistGradientBoostingClassifier (Comfort Status & Risk)",
            "model_e_safety": "RandomForestClassifier (PASS / REFUSED)",
        },
        "evaluation_metrics": metrics,
    }


@router.get("/locations", summary="List supported Himalayan scenario locations")
def list_locations() -> List[Dict[str, Any]]:
    """Returns all 39 high-altitude locations from final dataset."""
    locs = []
    seen = set()
    for loc_key, meta in inference_engine.locations_by_name.items():
        name = meta["location"]
        if name not in seen:
            seen.add(name)
            locs.append({
                "location": name,
                "region": meta.get("region"),
                "latitude_deg": float(meta.get("latitude_deg", 0)),
                "longitude_deg": float(meta.get("longitude_deg", 0)),
                "altitude_m": float(meta.get("altitude_m", 0)),
            })
    return sorted(locs, key=lambda x: x["location"])


@router.get("/materials", summary="List materials library and thermophysical properties")
def list_materials() -> List[Dict[str, Any]]:
    """Returns materials library from final dataset."""
    mats = []
    for k, v in inference_engine.materials_by_name.items():
        mats.append({
            "material": v.get("material", k),
            "k_W_mK": float(v.get("k_W_mK", 0)),
            "rho_kg_m3": float(v.get("rho_kg_m3", 0)),
            "cp_J_kgK": float(v.get("cp_J_kgK", 0)),
            "solar_absorptance": float(v.get("solar_absorptance", 0)),
        })
    return mats
