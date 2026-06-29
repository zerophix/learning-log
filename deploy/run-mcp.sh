#!/bin/bash
# Learning Log MCP SSE Server 启动脚本
set -e

if [[ "$(uname -m)" == "arm64" ]]; then
  export FASTAPI_WORKERS=2
else
  export FASTAPI_WORKERS=4
fi

PROJECT_DIR="${LEARNLOG_PROJECT_DIR:-/Users/mingxilv/PycharmProjects/learning-log}"
VENV_BIN="${PROJECT_DIR}/venv/bin"
PYTHON="${VENV_BIN}/python3"
SERVER_SCRIPT="${PROJECT_DIR}/backend/mcp_server.py"
MCP_PORT="${LEARNLOG_MCP_PORT:-8010}"

exec "$PYTHON" "$SERVER_SCRIPT" --sse --port "$MCP_PORT"
