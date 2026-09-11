# THERMA Machine Learning Pipeline
## Smart India Hackathon 2026 — DRDO PS 26051
### Area-Specific Shelter Design for Thermal Comfort Maintenance

This directory contains the complete scientific machine learning engineering pipeline for THERMA:

```text
ml/
├── data_generation/
│   ├── generate_dataset.py          # Multiprocessing simulation runner calling engine.solver
│   ├── generate_designs.py          # Latin Hypercube & stratified shelter design sampler
│   ├── generate_materials.py        # Sourced envelope materials database exporter
│   ├── generate_weather.py          # 12 Himalayan locations x 8 extreme winter weather scenarios
│   ├── generate_optimization.py     # 3,200+ shelter candidates with mathematical Pareto frontier
│   ├── physics_features.py          # Analytical feature derivation (U-val, R-val, Thermal mass, Air density)
│   ├── validation.py                # Sourced literature benchmark cases (DIHAR-DRDO, HAWS, ISO 52016)
│   ├── generate_plots.py            # 10 scientific validation and sanity figures
│   └── manifest.py                  # SHA-256 manifest and dataset_quality_report.json generator
│
├── preprocessing/
│   ├── preprocess.py                # One-hot/feature scaling pipeline preserving human-readable categories
│   └── split.py                     # Zero data leakage grouped splitting by simulation_id (70/15/15)
│
├── training/
│   ├── train_temperature_model.py   # Model A: Hourly indoor air temperature regressor
│   ├── train_diagnosis_model.py     # Model B: Dominant heat loss component classifier
│   ├── train_heat_loss_model.py     # Model C: Multi-target component heat loss flux regressor
│   ├── train_comfort_model.py       # Model D: 24-hour thermal comfort and extreme temperature regressor
│   ├── train_safety_model.py        # Model E: Ventilation safety classifier
│   └── evaluate.py                  # Comprehensive test evaluation reporting suite
│
└── README.md
```

### Quickstart

```bash
# 1. Generate full 50,000+ row dataset (reproducible with fixed seed 26051)
python generate_therma_dataset.py --num-simulations 2100 --seed 26051 --output-dir data/ml

# 2. Train and evaluate all surrogate ML models
python ml/training/evaluate.py
```
