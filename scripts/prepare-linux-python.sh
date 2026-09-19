#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="$ROOT/build/linux/python-runtime"
PYTHON_VERSION="3.11.15"
STANDALONE_TAG="20260310"
ARCHIVE_NAME="cpython-${PYTHON_VERSION}+${STANDALONE_TAG}-x86_64-unknown-linux-gnu-install_only.tar.gz"
ARCHIVE="$ROOT/build/linux/$ARCHIVE_NAME"
PYTHON_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${STANDALONE_TAG}/${ARCHIVE_NAME}"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.aliyun.com/pypi/simple}"

mkdir -p "$ROOT/build/linux"

if [[ ! -x "$RUNTIME/bin/python3" && ! -x "$RUNTIME/bin/python3.11" ]]; then
  if [[ ! -f "$ARCHIVE" ]]; then
    curl -fsSL "$PYTHON_URL" -o "$ARCHIVE"
  fi
  rm -rf "$RUNTIME"
  mkdir -p "$ROOT/build/linux/python-extract"
  tar -xzf "$ARCHIVE" -C "$ROOT/build/linux/python-extract"
  mv "$ROOT/build/linux/python-extract/python" "$RUNTIME"
  rm -rf "$ROOT/build/linux/python-extract"
fi

python3 -m pip install \
  --index-url "$PIP_INDEX_URL" \
  --target "$RUNTIME/lib/python3.11/site-packages" \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  --upgrade \
  -r "$ROOT/python/requirements.txt"

echo "Linux Python runtime ready: $RUNTIME"
