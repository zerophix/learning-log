"""
Web AI Bridge MCP Server
========================
把 bridge 能力包装成 MCP 工具，供 Claude Code / Cline / OpenCode 使用。

工具:
  web_ai_ask      → 向网页 AI 提问 (自动 Extension 快通道 / Playwright 引擎降级)
  web_ai_status   → 查看桥接状态

接入方式:
  STDIO: python3 backend/bridge_mcp.py              ← Claude Code / Cline
  SSE:   python3 backend/bridge_mcp.py --sse --port 9878  ← OpenCode / 任意 MCP 客户端
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

from mcp.server import Server
from mcp.types import Tool, TextContent

# ── 配置 ────────────────────────────────────────────────
BRIDGE_HTTP_PORT = int(os.environ.get("BRIDGE_HTTP_PORT", "9877"))
BRIDGE_URL = f"http://localhost:{BRIDGE_HTTP_PORT}"
BRIDGE_SCRIPT = os.path.expanduser(
    "~/PycharmProjects/learning-log/backend/bridge.sh"
)

server = Server("web-ai-bridge")


# ── Bridge 管理 ─────────────────────────────────────────

def _bridge_health() -> bool:
    try:
        urllib.request.urlopen(f"{BRIDGE_URL}/health", timeout=2)
        return True
    except Exception:
        return False


def _ensure_bridge() -> bool:
    """确保 Bridge Server 在运行（自动启动）"""
    if _bridge_health():
        return True
    print("  ⏳ Bridge Server 未运行，尝试启动...", file=sys.stderr)
    try:
        subprocess.Popen(
            ["bash", BRIDGE_SCRIPT, "start"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(8):
            time.sleep(1)
            if _bridge_health():
                print("  ✅ Bridge Server 已就绪", file=sys.stderr)
                return True
        print("  ❌ Bridge Server 启动超时", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  ❌ 启动失败: {e}", file=sys.stderr)
        return False


def _ask_bridge(platform: str, prompt: str, timeout: int = 120) -> dict:
    """调用 Bridge HTTP API 提问"""
    data = json.dumps({
        "platform": platform,
        "prompt": prompt,
        "timeout": timeout,
    }).encode()
    req = urllib.request.Request(
        f"{BRIDGE_URL}/ask",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout + 10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"error": f"HTTP {e.code}: {body[:300]}"}
    except urllib.error.URLError as e:
        return {"error": f"Bridge 连接失败: {e.reason}"}
    except Exception as e:
        return {"error": str(e)}


# ── MCP 工具定义 ────────────────────────────────────────

AVAILABLE_PLATFORMS = "deepseek, gemini, chatgpt, huggingchat, kimi"


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="web_ai_ask",
            description=(
                f"向网页 AI 平台提问（免费、零成本）。"
                f"支持平台: {AVAILABLE_PLATFORMS}。"
                f"自动选择最快路径：Extension(快) → Playwright引擎(稳)。"
                f"无需手动打开 AI 页面。"
                f"适用于复杂推理、长文理解、创意生成、架构设计。"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "问题内容（支持长文本、代码段）",
                    },
                    "platform": {
                        "type": "string",
                        "description": f"AI 平台 ({AVAILABLE_PLATFORMS})",
                        "default": "deepseek",
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "超时秒数（默认 120，最长 300）",
                        "default": 120,
                        "maximum": 300,
                    },
                },
                "required": ["prompt"],
            },
        ),
        Tool(
            name="web_ai_status",
            description="查看 Bridge Server 状态：Extension 连接、Playwright 引擎就绪、Profile 登录态",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "web_ai_ask":
        prompt = arguments.get("prompt", "")
        platform = arguments.get("platform", "deepseek")
        timeout = min(arguments.get("timeout", 120), 300)

        if not prompt:
            return [TextContent(type="text", text="❌ prompt 不能为空")]

        if not _ensure_bridge():
            return [TextContent(
                type="text",
                text="❌ Bridge Server 无法启动。请手动执行:\n   bridge start"
            )]

        result = _ask_bridge(platform, prompt, timeout)

        if "error" in result and result["error"]:
            # 如果是登录问题，给具体建议
            err = result["error"]
            if "登录" in err:
                return [TextContent(type="text", text=f"{err}\n\n💡 请执行 web-ai --setup 登录后重试")]
            return [TextContent(type="text", text=f"❌ {err}")]

        text = result.get("text", "⚠️ 空回答")
        model = result.get("model", platform)
        latency = result.get("latency_ms", 0)

        return [TextContent(type="text", text=text)]

    elif name == "web_ai_status":
        if not _bridge_health():
            return [TextContent(type="text", text="❌ Bridge Server 未运行\n\n💡 bridge start")]

        try:
            raw = urllib.request.urlopen(f"{BRIDGE_URL}/status", timeout=3).read()
            status = json.loads(raw)
        except Exception as e:
            return [TextContent(type="text", text=f"❌ 状态查询失败: {e}")]

        platforms = status.get("platforms", {})
        engine = status.get("engine", {})
        connected = [p for p, info in platforms.items() if info.get("connected")]

        lines = ["📡 Web AI Bridge 状态", "─" * 30]

        if connected:
            lines.append(f"🔌 Extension: 已连 {', '.join(connected)}")
        else:
            lines.append("🔌 Extension: 无连接")

        eng_ready = engine.get("ready", False)
        if eng_ready:
            uptime = engine.get("uptime_sec", 0)
            profile = engine.get("profile_exists", False)
            lines.append(f"🎯 Playwright 引擎: ✅ 就绪 (运行 {uptime}s)")
            lines.append(f"   Profile: {'✅ 已登录' if profile else '⚠️ 未登录'}")
        else:
            lines.append("🎯 Playwright 引擎: ⏳ 待首次调用")

        lines.append(f"⏱ 服务运行: {status.get('uptime_sec', 0)}s")
        lines.append(f"📋 模式: {status.get('mode', 'Extension + 引擎自动降级')}")

        return [TextContent(type="text", text="\n".join(lines))]

    else:
        raise ValueError(f"未知工具: {name}")


# ── 入口 ────────────────────────────────────────────────

async def main():
    SSE_MODE = "--sse" in sys.argv

    print(f"🚀 Web AI Bridge MCP Server", file=sys.stderr)
    print(f"   Mode: {'SSE (HTTP)' if SSE_MODE else 'STDIO'}", file=sys.stderr)

    if SSE_MODE:
        SSE_PORT = 9878
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                SSE_PORT = int(sys.argv[i + 1])

        from mcp.server.sse import SseServerTransport
        from starlette.applications import Starlette
        from starlette.routing import Route
        from starlette.middleware import Middleware
        from starlette.middleware.cors import CORSMiddleware
        import uvicorn

        sse = SseServerTransport("/messages/")

        async def handle_sse(request):
            async with sse.connect_sse(
                request.scope, request.receive, request._send
            ) as streams:
                await server.run(
                    streams[0], streams[1],
                    server.create_initialization_options(),
                )

        async def handle_messages(request):
            await sse.handle_post_message(
                request.scope, request.receive, request._send
            )

        app = Starlette(
            debug=False,
            routes=[
                Route("/sse", endpoint=handle_sse),
                Route("/messages/", endpoint=handle_messages, methods=["POST"]),
            ],
            middleware=[
                Middleware(
                    CORSMiddleware,
                    allow_origins=["*"],
                    allow_methods=["*"],
                    allow_headers=["*"],
                ),
            ],
        )

        print(f"🌐 SSE: http://0.0.0.0:{SSE_PORT}/sse", file=sys.stderr)
        config = uvicorn.Config(app, host="0.0.0.0", port=SSE_PORT, log_level="info")
        await uvicorn.Server(config).serve()
    else:
        from mcp.server.stdio import stdio_server

        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream, write_stream,
                server.create_initialization_options(),
            )


if __name__ == "__main__":
    asyncio.run(main())
