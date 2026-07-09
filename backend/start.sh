#!/bin/bash
# Convenience script - run this from the backend/ folder: ./start.sh
set -e

if [ ! -f .env ]; then
  echo "No .env found. Copying .env.example -> .env ..."
  cp .env.example .env
  echo "IMPORTANT: open backend/.env now and paste your real ANTHROPIC_API_KEY before continuing."
  exit 1
fi

echo "Starting Plant Brain backend on http://localhost:8000 ..."
echo "Open api_tester.html (in the project root) in your browser to test it."
uvicorn app.main:app --reload --port 8000
