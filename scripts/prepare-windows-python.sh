#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="$ROOT/build/windows/python-runtime"
PYTHON_VERSION="3.11.9"
PYTHON_ARCHIVE="$ROOT/build/windows/python-$PYTHON_VERSION-embed-amd64.zip"
PYTHON_URL="https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.aliyun.com/pypi/simple}"

mkdir -p "$ROOT/build/windows" "$RUNTIME/Lib/site-packages"

if [[ ! -x "$RUNTIME/python.exe" ]]; then
  if [[ ! -f "$PYTHON_ARCHIVE" ]]; then
    curl -fsSL "$PYTHON_URL" -o "$PYTHON_ARCHIVE"
  fi
  python3 -m zipfile -e "$PYTHON_ARCHIVE" "$RUNTIME"
fi

python3 -m pip install \
  --index-url "$PIP_INDEX_URL" \
  --target "$RUNTIME/Lib/site-packages" \
  --platform win_amd64 \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  --upgrade \
  -r "$ROOT/python/requirements.txt"

printf 'python311.zip\n.\nLib/site-packages\nimport site\n' > "$RUNTIME/python311._pth"

echo "Windows Python runtime ready: $RUNTIME"
