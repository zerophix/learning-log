#!/bin/bash
# ── Learning Log Frontend Runner ──
# 由 launchd 调用，确保 Node.js 在 PATH 中

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="$HOME/PycharmProjects/learning-log"
FRONTEND_DIR="$PROJECT_DIR/frontend"

cd "$FRONTEND_DIR"

# 确保依赖已安装 + 构建已完成
if [ ! -d "node_modules" ]; then
    npm install && npm run build
fi

exec npm start
