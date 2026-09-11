"""
THERMA Dataset Restore Script
Smart India Hackathon 2026 - DRDO PS 26051

Decompresses master_timeseries.csv.gz into master_timeseries.csv
and symlinks therma_simulation_timeseries.csv if needed.
"""

import gzip
import shutil
from pathlib import Path


def restore_dataset():
    ml_dir = Path(__file__).resolve().parent.parent / "data" / "ml"
    master_csv = ml_dir / "master_timeseries.csv"
    master_gz = ml_dir / "master_timeseries.csv.gz"
    sim_csv = ml_dir / "therma_simulation_timeseries.csv"

    if not master_csv.exists() and master_gz.exists():
        print(f"Decompressing {master_gz} -> {master_csv}...")
        with gzip.open(master_gz, "rb") as f_in, open(master_csv, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        print("Restoration complete.")

    if not sim_csv.exists() and master_csv.exists():
        print(f"Creating link {sim_csv} -> {master_csv}...")
        try:
            sim_csv.symlink_to(master_csv.name)
        except OSError:
            shutil.copy(master_csv, sim_csv)


if __name__ == "__main__":
    restore_dataset()
