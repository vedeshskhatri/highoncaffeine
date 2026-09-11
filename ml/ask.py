#!/usr/bin/env python3
"""
THERMA Interactive CLI Assistant & Q&A
Smart India Hackathon 2026 - DRDO PS 26051

Query the surrogate ML models trained on the final 120,000-row dataset:
Usage:
    python ml/ask.py "What is the predicted indoor temperature for a shelter in Siachen with stone masonry?"
    python ml/ask.py --interactive
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure repo root is on sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ml.inference import inference_engine


def main():
    if len(sys.argv) > 1 and sys.argv[1] != "--interactive":
        query = " ".join(sys.argv[1:])
        print(f"\nQuestion: {query}\n" + "=" * 60)
        res = inference_engine.answer_question(query)
        print(res["answer"])
        print("=" * 60 + "\n")
        return

    print("=" * 70)
    print("THERMA Machine Learning Q&A Console (DRDO PS 26051)")
    print("Trained on final 120,000-row physics-grounded dataset")
    print("Type 'exit' or 'quit' to stop.")
    print("=" * 70 + "\n")

    while True:
        try:
            query = input("Ask a shelter thermal/design question: ").strip()
            if not query:
                continue
            if query.lower() in ("exit", "quit", "q"):
                print("Exiting THERMA ML Console. Jai Hind.")
                break

            print("\nComputing ML prediction...")
            res = inference_engine.answer_question(query)
            print("-" * 60)
            print(res["answer"])
            print("-" * 60 + "\n")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break


if __name__ == "__main__":
    main()
