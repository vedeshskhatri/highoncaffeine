"""
Vercel Serverless Function entrypoint for THERMA FastAPI application.
Smart India Hackathon 2026 - DRDO PS 26051
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add project root directory to sys.path so all internal imports resolve
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.main import app

# Vercel Python runtime detects `app`
__all__ = ["app"]
