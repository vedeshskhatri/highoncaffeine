#!/usr/bin/env python3
"""
MASTER GENERATOR: THERMA Physics-Grounded 50,000+ Row ML Dataset
Smart India Hackathon 2026 - Problem Statement PS 26051 - DRDO
Area-Specific Shelter Design for Thermal Comfort Maintenance

Usage:
    python generate_therma_dataset.py --num-simulations 2100 --seed 26051 --output-dir data/ml
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
import time

repo_root = Path(__file__).resolve().parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.data_generation.generate_materials import generate_materials_csv
from ml.data_generation.generate_weather import generate_all_weather_profiles
from ml.data_generation.generate_dataset import generate_all_simulations
from ml.data_generation.generate_optimization import generate_optimization_dataset
from ml.data_generation.validation import generate_validation_csv
from ml.preprocessing.split import split_dataset_by_simulation_id
from ml.data_generation.generate_plots import generate_all_plots
from ml.data_generation.manifest import generate_manifest


def main():
    parser = argparse.ArgumentParser(description="Generate THERMA 50,000+ row physics ML dataset (SIH 2026 DRDO PS 26051).")
    parser.add_argument("--num-simulations", type=int, default=2100, help="Number of 24-hour simulations (default: 2100 -> 50,400 hourly records)")
    parser.add_argument("--seed", type=int, default=26051, help="Deterministic random seed (default: 26051)")
    parser.add_argument("--output-dir", type=str, default="data/ml", help="Output directory for generated CSV files")
    args = parser.parse_args()

    t_start = time.time()
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("THERMA - HIGH-ALTITUDE SHELTER THERMAL SIMULATION DATASET GENERATOR")
    print("Smart India Hackathon 2026 - Problem Statement PS 26051 - DRDO")
    print(f"Target: {args.num_simulations} simulations x 24 hours = {args.num_simulations * 24} timestep records")
    print(f"Seed: {args.seed} | Output directory: {out_dir}")
    print("=" * 80)

    # 1. Materials Database
    print("\n[STEP 1/8] Generating materials database (therma_materials.csv)...")
    generate_materials_csv(out_dir / "therma_materials.csv")

    # 2. Weather Profiles
    print("\n[STEP 2/8] Generating 12-location Himalayan winter weather profiles (therma_weather.csv)...")
    generate_all_weather_profiles(out_dir / "therma_weather.csv")

    # 3. Physics Simulations (Time Series, Design Params, Heat Balance, Diagnosis)
    print("\n[STEP 3/8] Running deterministic multi-node RC physics simulations...")
    generate_all_simulations(
        num_simulations=args.num_simulations,
        seed=args.seed,
        output_dir=out_dir,
    )

    # 4. Optimization Candidates & Pareto Dominance
    print("\n[STEP 4/8] Generating 3,200+ optimization candidates and computing Pareto frontier...")
    generate_optimization_dataset(
        num_candidates=3200,
        seed=args.seed,
        output_path=out_dir / "therma_optimization_candidates.csv",
    )

    # 5. Validation Benchmark Dataset
    print("\n[STEP 5/8] Creating external literature validation benchmarks (therma_validation.csv)...")
    generate_validation_csv(out_dir / "therma_validation.csv")

    # 6. Zero-Leakage Dataset Splitting
    print("\n[STEP 6/8] Executing zero-leakage grouped train/val/test split (70/15/15)...")
    split_dataset_by_simulation_id(
        input_csv=out_dir / "therma_ml_master.csv",
        output_dir=out_dir,
        seed=args.seed,
    )

    # 7. Scientific Validation Plots
    print("\n[STEP 7/8] Generating 10 engineering sanity and validation plots...")
    generate_all_plots(data_dir=out_dir, plots_dir=out_dir / "plots")

    # 8. Manifest & Quality Audit Report
    print("\n[STEP 8/8] Auditing dataset integrity and writing manifest...")
    generate_manifest(data_dir=out_dir)

    total_time = time.time() - t_start
    print("\n" + "=" * 80)
    print(f"ALL STEPS COMPLETED SUCCESSFULLY IN {total_time:.1f} SECONDS")
    print(f"Generated datasets are located in: {out_dir.resolve()}")
    print("=" * 80)


if __name__ == "__main__":
    main()
