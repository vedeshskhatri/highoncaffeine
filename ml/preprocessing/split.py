"""
THERMA Dataset Splitting Engine (Zero Data Leakage)
Smart India Hackathon 2026 - DRDO PS 26051

Splits therma_ml_master.csv into train.csv (70%), validation.csv (15%), and test.csv (15%).
CRITICAL RULE: The split is strictly grouped by simulation_id.
All 24 hourly records of any simulation reside entirely in one partition.
Guarantees zero data leakage between training and testing.
"""

from __future__ import annotations

import csv
from pathlib import Path
import random
import sys
from typing import Any, Dict, List, Set

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))


def split_dataset_by_simulation_id(
    input_csv: str | Path = "data/ml/therma_ml_master.csv",
    output_dir: str | Path = "data/ml",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 26051,
) -> Dict[str, int]:
    """
    Split the dataset into train.csv, validation.csv, test.csv grouped by simulation_id.
    """
    input_csv = Path(input_csv)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_csv.exists():
        raise FileNotFoundError(f"Input file not found: {input_csv}")

    print(f"Reading {input_csv} for leakage-free grouped splitting...")

    # 1. Read all rows and group by simulation_id
    rows_by_sim: Dict[str, List[Dict[str, Any]]] = {}
    fieldnames: List[str] = []

    with open(input_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for row in reader:
            s_id = row["simulation_id"]
            if s_id not in rows_by_sim:
                rows_by_sim[s_id] = []
            rows_by_sim[s_id].append(row)

    unique_sim_ids = sorted(list(rows_by_sim.keys()))
    total_sims = len(unique_sim_ids)
    print(f"Loaded {total_sims} unique simulations ({sum(len(v) for v in rows_by_sim.values())} total rows).")

    # 2. Shuffle simulation IDs deterministically
    rng = random.Random(seed)
    shuffled_sim_ids = list(unique_sim_ids)
    rng.shuffle(shuffled_sim_ids)

    # 3. Calculate partition cutoffs
    n_train_sims = int(round(total_sims * train_ratio))
    n_val_sims = int(round(total_sims * val_ratio))
    # Remainder goes to test
    n_test_sims = total_sims - n_train_sims - n_val_sims

    train_ids: Set[str] = set(shuffled_sim_ids[:n_train_sims])
    val_ids: Set[str] = set(shuffled_sim_ids[n_train_sims : n_train_sims + n_val_sims])
    test_ids: Set[str] = set(shuffled_sim_ids[n_train_sims + n_val_sims :])

    # 4. Rigorous Data Leakage Verification
    overlap_train_val = train_ids.intersection(val_ids)
    overlap_train_test = train_ids.intersection(test_ids)
    overlap_val_test = val_ids.intersection(test_ids)

    assert len(overlap_train_val) == 0, f"DATA LEAKAGE: {len(overlap_train_val)} overlapping sims in train and val!"
    assert len(overlap_train_test) == 0, f"DATA LEAKAGE: {len(overlap_train_test)} overlapping sims in train and test!"
    assert len(overlap_val_test) == 0, f"DATA LEAKAGE: {len(overlap_val_test)} overlapping sims in val and test!"

    # 5. Assemble row sets
    train_rows: List[Dict[str, Any]] = []
    val_rows: List[Dict[str, Any]] = []
    test_rows: List[Dict[str, Any]] = []

    for s_id in train_ids:
        train_rows.extend(rows_by_sim[s_id])
    for s_id in val_ids:
        val_rows.extend(rows_by_sim[s_id])
    for s_id in test_ids:
        test_rows.extend(rows_by_sim[s_id])

    # Sort each split by simulation_id and hour for reproducible ordering
    train_rows.sort(key=lambda r: (r["simulation_id"], int(r["hour"])))
    val_rows.sort(key=lambda r: (r["simulation_id"], int(r["hour"])))
    test_rows.sort(key=lambda r: (r["simulation_id"], int(r["hour"])))

    # 6. Write train.csv, validation.csv, test.csv
    train_path = output_dir / "train.csv"
    val_path = output_dir / "validation.csv"
    test_path = output_dir / "test.csv"

    for path, rows in [(train_path, train_rows), (val_path, val_rows), (test_path, test_rows)]:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    print(f"Zero-leakage split complete:")
    print(f"  Train:      {len(train_ids)} simulations, {len(train_rows)} rows -> {train_path}")
    print(f"  Validation: {len(val_ids)} simulations, {len(val_rows)} rows -> {val_path}")
    print(f"  Test:       {len(test_ids)} simulations, {len(test_rows)} rows -> {test_path}")

    return {
        "train_simulations": len(train_ids),
        "train_rows": len(train_rows),
        "val_simulations": len(val_ids),
        "val_rows": len(val_rows),
        "test_simulations": len(test_ids),
        "test_rows": len(test_rows),
    }


if __name__ == "__main__":
    split_dataset_by_simulation_id()
