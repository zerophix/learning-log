#!/bin/bash

# 学习日志系统 - 快速启动脚本

echo "🚀 启动学习日志系统..."
echo ""

# 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 未安装 Python3"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

# 创建虚拟环境
echo "📦 检查依赖..."
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "安装 FastAPI..."
    pip install fastapi uvicorn
fi

echo "✅ 后端依赖就绪"

# 安装前端依赖
echo "📦 安装前端依赖..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "✅ 前端依赖就绪"

# 启动前端
echo "🌐 启动前端 (端口 3000)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# 启动后端
echo "🔧 启动后端 (端口 8002)..."
cd "$SCRIPT_DIR/backend"
source "$SCRIPT_DIR/venv/bin/activate"
python3 app/main.py &
BACKEND_PID=$!

sleep 3

echo ""
echo "✅ 学习日志系统已启动！"
echo ""
echo "前端界面: http://localhost:3000"
echo "后端 API: http://localhost:8002"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

open http://localhost:3000

cleanup() {
    echo ""
    echo "🛑 停止服务..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup INT TERM
wait $FRONTEND_PID $BACKEND_PID
