#!/bin/bash
# ── Learning Log Backend Runner ──
# 由 launchd 调用，确保使用正确的 venv Python

set -e

PROJECT_DIR="$HOME/PycharmProjects/learning-log"
VENV_PYTHON="$PROJECT_DIR/venv/bin/python3"
# 如果 venv python 不存在，回退到系统 python3
if [ ! -f "$VENV_PYTHON" ]; then
    VENV_PYTHON="$(which python3)"
fi

cd "$PROJECT_DIR/backend"
export PYTHONUNBUFFERED=1
exec "$VENV_PYTHON" -m uvicorn app.main:app --host 0.0.0.0 --port "${LEARNLOG_PORT:-8002}"
