#!/bin/bash
# ------------------------------------------------------------
# Learning Log MCP SSE Server 启动脚本
# ------------------------------------------------------------
# 该脚本同时支持基于机器型号的环境变量注入，
# 让在 Apple Silicon（M1/M2）上运行时可以使用专属配置。

set -e

# ------------------------------------------------------------
# 机器检测与专属环境变量
# ------------------------------------------------------------
if [[ "$(uname -m)" == "arm64" ]]; then
  # Apple Silicon 专属配置
  export FASTAPI_WORKERS=2
  export PYTHONPATH="/opt/homebrew/lib/python3.11/site-packages:${PYTHONPATH:-}"
  echo "[MCP] Detected Apple Silicon (arm64) – applied custom env vars"
else
  # 默认配置（Intel/AMD）
  export FASTAPI_WORKERS=4
  echo "[MCP] Detected non‑Apple‑Silicon architecture – using default env vars"
fi

# ------------------------------------------------------------
# 项目路径与 Python 解释器
# ------------------------------------------------------------
PROJECT_DIR="${LEARNLOG_PROJECT_DIR:-/Users/mingxilv/PycharmProjects/learning-log}"
VENV_BIN="${PROJECT_DIR}/venv/bin"
PYTHON="${VENV_BIN}/python3"
SERVER_SCRIPT="${PROJECT_DIR}/backend/mcp_server.py"

# ------------------------------------------------------------
# 启动 MCP（使用 .mcp.json 中的 learning-log 服务配置）
# ------------------------------------------------------------
exec "$PYTHON" "$SERVER_SCRIPT" "$@"
