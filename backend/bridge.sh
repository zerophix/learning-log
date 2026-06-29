#!/bin/bash
# bridge — 启动 Web AI Bridge Server
# 用法: bridge              # 前台运行
#       bridge start        # 后台启动
#       bridge stop         # 停止
#       bridge status       # 查看状态

WS_PORT=${BRIDGE_WS_PORT:-9876}
HTTP_PORT=${BRIDGE_HTTP_PORT:-9877}
PID_FILE="/tmp/web-ai-bridge.pid"
LOG_FILE="/tmp/web-ai-bridge.log"
SCRIPT="/Users/mingxilv/PycharmProjects/learning-log/backend/bridge_server.py"

case "${1:-}" in
  start)
    nohup python3 "$SCRIPT" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "✅ Bridge Server 已启动 (PID $!)"
    echo "   WebSocket: :$WS_PORT (Extension 接入)"
    echo "   HTTP API:  :$HTTP_PORT (CLI 调用)"
    echo "   Playwright 引擎: 自动降级（无需手动开 AI 页面）"
    echo "   日志: $LOG_FILE"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      kill $(cat "$PID_FILE") 2>/dev/null
      rm "$PID_FILE"
      echo "✅ Bridge Server 已停止"
    else
      pkill -f bridge_server.py 2>/dev/null && echo "✅ Bridge Server 已停止" || echo "❌ 未在运行"
    fi
    ;;
  status)
    if ( [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null ) || pgrep -f bridge_server.py >/dev/null; then
      echo "✅ Bridge Server 运行中"
      echo ""
      # 简要状态
      STATUS=$(curl -s http://localhost:$HTTP_PORT/status 2>/dev/null)
      if [ -n "$STATUS" ]; then
        ENGINE=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('engine',{}); print('✅ 就绪' if e.get('ready') else '⏳ 待启动')" 2>/dev/null)
        EXT_COUNT=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('platforms',{})))" 2>/dev/null)
        echo "   🤖 引擎: $ENGINE"
        echo "   🔌 Extension 平台: $EXT_COUNT"
        echo "   ⏱  运行: $(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{d['uptime_sec']}s\")" 2>/dev/null)"
        echo ""
        echo "   💡 直接提问: curl http://localhost:$HTTP_PORT/ask -d '{\"platform\":\"deepseek\",\"prompt\":\"你好\"}'"
      else
        echo "   状态: HTTP API 无响应"
      fi
    else
      echo "❌ Bridge Server 未运行"
    fi
    ;;
  *)
    python3 "$SCRIPT"
    ;;
esac