#!/usr/bin/env bash
# scripts/package_for_claude.sh
# Packages only essential source code for Claude / LLMs without bloat.
# Drops 100+ MB down to ~1.3 MB (full) or ~580 KB (UI only).

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "📦 Packaging THERMA codebase for Claude / LLMs..."

# 1. Full Codebase Bundle (~1.3 MB)
zip -r -q therma_claude_bundle.zip . \
  -x "web/node_modules/*" \
  -x ".venv/*" \
  -x ".git/*" \
  -x "data/*" \
  -x "ml/training/*" \
  -x "web/dist/*" \
  -x "docs/presentation_assets/*" \
  -x "**/__pycache__/*" \
  -x "*.sqlite" -x "*.db" -x "*.pyc" -x "*.pkl" -x "*.npy" -x "*.png" -x "*.jpg" -x "*.jpeg" -x "*.pdf" -x "*.zip"

# 2. UI-Only Bundle (~580 KB)
zip -r -q therma_ui_bundle.zip web/src/ web/package.json web/vite.config.js web/index.html \
  -x "*.png" -x "*.jpg" -x "*.jpeg"

echo "✅ Created lightweight bundles:"
ls -lh therma_claude_bundle.zip therma_ui_bundle.zip
echo ""
echo "👉 therma_claude_bundle.zip (~1.3 MB) -> Full codebase (React + Python backend + Physics engine + Docs)"
echo "👉 therma_ui_bundle.zip     (~580 KB) -> Frontend UI only (React components + CSS + routing)"
