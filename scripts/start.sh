#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -x .venv/bin/python ]]; then
  export AREA_CAPTURE_PYTHON="$(pwd)/.venv/bin/python"
fi
if [[ "${1:-}" == "--hidden" ]]; then
  export AREA_CAPTURE_HIDDEN=1
  shift
fi
exec npm run dev
