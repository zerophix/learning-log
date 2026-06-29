#!/bin/bash
# ── Learning Log Backend Runner ──
# 由 launchd 调用，确保使用正确的 venv Python

set -e

PROJECT_DIR="$HOME/PycharmProjects/learning-log"
VENV_PYTHON="$PROJECT_DIR/venv/bin/python3"
BACKEND_SCRIPT="$PROJECT_DIR/backend/app/main.py"

# 如果 venv python 不存在，回退到系统 python3
if [ ! -f "$VENV_PYTHON" ]; then
    VENV_PYTHON="$(which python3)"
fi

cd "$PROJECT_DIR/backend"
exec "$VENV_PYTHON" "$BACKEND_SCRIPT"
