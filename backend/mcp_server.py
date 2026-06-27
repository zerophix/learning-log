"""
Learning Log MCP Server (v2.0 — Auto-Start Edition)
====================================================
Model Context Protocol server for automated learning entry capture.

Features:
  - Auto-starts FastAPI backend if not running
  - Writes PID/port files to ~/.learning-log/ for discovery
  - Works from ANY project directory (uses absolute paths)
  - No manual start.sh needed
"""
import asyncio
import json
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from mcp.server import Server
from mcp.types import Tool, TextContent
import requests
from dotenv import load_dotenv

# ── CLI Argument Parsing (simple, before any imports that might fail) ──
SSE_MODE = "--sse" in sys.argv
SSE_PORT = 8010
for i, arg in enumerate(sys.argv):
    if arg == "--port" and i + 1 < len(sys.argv):
        SSE_PORT = int(sys.argv[i + 1])

# ── Path Resolution (absolute, not relative) ──────
PROJECT_DIR = os.environ.get(
    "LEARNLOG_PROJECT_DIR",
    os.path.expanduser("~/PycharmProjects/learning-log")
)
RUNTIME_DIR = os.path.expanduser("~/.learning-log")
BACKEND_SCRIPT = os.path.join(PROJECT_DIR, "backend", "main.py")
VENV_PYTHON = os.path.join(PROJECT_DIR, "venv", "bin", "python3")
PID_FILE = os.path.join(RUNTIME_DIR, "backend.pid")
PORT_FILE = os.path.join(RUNTIME_DIR, "backend.port")
BACKEND_PORT = int(os.environ.get("LEARNLOG_PORT", "8002"))

load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", f"http://localhost:{BACKEND_PORT}")
AI_API_URL = os.getenv("AI_API_URL", "http://localhost:11434/api/generate")
AI_MODEL = os.getenv("AI_MODEL", "qwen2.5")

server = Server("learning-log-mcp")


# ── Backend Lifecycle ────────────────────────────

def _check_backend_alive() -> bool:
    """Quick check if backend is responding"""
    try:
        r = requests.get(f"{BACKEND_URL}/api/stats", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def _start_backend() -> bool:
    """Start the FastAPI backend if not running. Idempotent."""
    if _check_backend_alive():
        return True

    # Ensure runtime dir exists
    os.makedirs(RUNTIME_DIR, exist_ok=True)

    # Determine python interpreter
    python = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

    if not os.path.exists(BACKEND_SCRIPT):
        print(f"⚠️  Backend script not found at {BACKEND_SCRIPT}", file=sys.stderr)
        return False

    print(f"🔧 正在启动 Learning Log 后端...", file=sys.stderr)
    try:
        proc = subprocess.Popen(
            [python, BACKEND_SCRIPT],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
            cwd=os.path.dirname(BACKEND_SCRIPT)
        )
        # Write PID + port
        with open(PID_FILE, 'w') as f:
            f.write(str(proc.pid))
        with open(PORT_FILE, 'w') as f:
            f.write(str(BACKEND_PORT))

        # Wait for it to be ready (up to 5 seconds)
        for _ in range(25):
            time.sleep(0.2)
            if _check_backend_alive():
                print(f"✅ 后端就绪 (PID: {proc.pid}, port: {BACKEND_PORT})", file=sys.stderr)
                return True

        print(f"⚠️  后端启动超时", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ 后端启动失败: {e}", file=sys.stderr)
        return False


def _ensure_backend() -> bool:
    """Ensure backend is running; start it if not. Call before any API call."""
    if not _check_backend_alive():
        return _start_backend()
    return True


# ── AI Analysis ──────────────────────────────────

def call_ai_for_analysis(raw_content: str) -> dict:
    """Call AI to analyze raw learning content and extract structured fields"""
    prompt = f"""
 你是一个学习记录分析助手。请从以下原始学习内容中提取结构化信息，返回 JSON 格式：
 
 原始内容：
 {raw_content}
 
 请提取以下字段（用中文回答）：
 - topic: 学习主题（简短标题，10字以内）
 - question: 核心问题或需求
 - insight: 关键洞察或解决方案要点
 - summary: 摘要（1-3句话概括核心结论，用于前端卡片预览，不含 Markdown 格式）
 - category: 分类（technical/design/debug/architecture/interview/general）
 - tags: 标签列表（3-5个关键词）
 - project_module: 相关项目模块
 - difficulty: 难度（easy/medium/hard）
 - action_items: 后续行动项列表
 - related_skills: 相关技能名称列表

只返回 JSON，不要其他文字。
"""
    try:
        response = requests.post(
            AI_API_URL,
            json={"model": AI_MODEL, "prompt": prompt, "stream": False},
            timeout=60
        )
        if response.status_code == 200:
            result = response.json()
            content = result.get('response', '')
            try:
                start = content.find('{')
                end = content.rfind('}') + 1
                if start >= 0 and end > start:
                    return json.loads(content[start:end])
            except Exception:
                pass
        return get_default_entry(raw_content)
    except Exception as e:
        print(f"❌ AI 调用失败: {e}", file=sys.stderr)
        return get_default_entry(raw_content)


def get_default_entry(raw_content: str) -> dict:
    """Fallback: create basic entry from raw content"""
    return {
        "topic": f"学习记录_{datetime.now().strftime('%m%d_%H%M')}",
        "question": raw_content[:200],
        "insight": "待补充",
        "summary": "待补充",
        "category": "general",
        "tags": ["auto-captured"],
        "difficulty": "medium",
    }


def save_to_backend(entry_data: dict) -> int:
    """Save analyzed entry to backend API. Returns entry_id or -1."""
    if not _ensure_backend():
        print("❌ 后端不可用", file=sys.stderr)
        return -1

    try:
        response = requests.post(
            f"{BACKEND_URL}/api/entries",
            json=entry_data,
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 学习记录已保存 (ID: {result.get('id')})", file=sys.stderr)
            return result.get('id', -1)
        else:
            print(f"❌ 保存失败: {response.text}", file=sys.stderr)
            return -1
    except Exception as e:
        print(f"❌ API 调用失败: {e}", file=sys.stderr)
        return -1


# ── MCP Tools ────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="capture_learning",
            description="自动捕获并分析学习内容，提取关键信息后保存到 Learning Log 知识库。AI 可在对话中主动调用此工具记录有价值的洞察。",
            inputSchema={
                "type": "object",
                "properties": {
                    "raw_content": {
                        "type": "string",
                        "description": "原始学习内容或对话片段"
                    },
                    "source": {
                        "type": "string",
                        "description": "学习来源",
                        "default": "ai-chat"
                    }
                },
                "required": ["raw_content"]
            }
        ),
        Tool(
            name="batch_capture",
            description="批量处理多条学习内容并保存",
            inputSchema={
                "type": "object",
                "properties": {
                    "entries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "待处理的原始内容列表"
                    }
                },
                "required": ["entries"]
            }
        ),
        Tool(
            name="learning_log_status",
            description="查看 Learning Log 系统状态（记录数、标签数、最近记录）",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="deep_record",
            description="深度知识沉淀。将 AI 已在对话中完成的完整分析内容（六步法全文）直接保存。所有内容包括结论、案例、原理、图示、代码、STAR复盘，全部放入 insight 字段。等同于 /记录 skill。",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "学习主题（简短标题，10字以内）"},
                    "insight": {"type": "string", "description": "完整的六步法分析全文（≥2000字），包含：核心结论、场景案例、第一性原理、Mermaid图示、代码实现、STAR复盘"},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "标签列表（3-5个关键词）"
                    },
                    "energy": {
                        "type": "integer",
                        "description": "精力消耗 1-5",
                        "default": 5
                    },
                    "source": {
                        "type": "string",
                        "description": "来源",
                        "default": "deep-record"
                    }
                },
                "required": ["topic", "insight"]
            }
        ),
        Tool(
            name="quick_capture",
            description="快速捕获顿悟/灵感。自动标记 energy=5 和 aha=true。内容完整展开后全部放入 insight。等同于 /灵感 skill。",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "灵感/洞察主题"},
                    "insight": {"type": "string", "description": "顿悟内容（完整展开，≥500字，含核心洞察+类比+应用场景+可迁移模式）"},
                    "source": {
                        "type": "string",
                        "description": "来源",
                        "default": "aha-capture"
                    }
                },
                "required": ["topic", "insight"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "learning_log_status":
        _ensure_backend()
        try:
            stats = requests.get(f"{BACKEND_URL}/api/stats", timeout=3).json()
            entries = requests.get(f"{BACKEND_URL}/api/entries?limit=3", timeout=3).json()
            lines = [
                f"📊 Learning Log 状态",
                f"   记录: {stats.get('entries', '?')} 条",
                f"   标签: {stats.get('tags', '?')} 个",
                f"   关联: {stats.get('links', '?')} 条",
                f"",
                f"📝 最近记录:"
            ]
            for e in entries[:3]:
                ts = e.get('timestamp', '?')[:16]
                lines.append(f"   #{e['id']} [{ts}] {e['topic']}")
            return [TextContent(type="text", text="\n".join(lines))]
        except Exception as e:
            return [TextContent(type="text", text=f"❌ 查询失败: {e}")]

    if name == "capture_learning":
        raw_content = arguments.get("raw_content", "")
        source = arguments.get("source", "ai-chat")
        if not raw_content:
            return [TextContent(type="text", text="❌ Error: raw_content is required")]

        print(f"\n🔍 分析中 ({len(raw_content)} 字符)...", file=sys.stderr)

        # Step 1: AI Analysis
        entry_data = call_ai_for_analysis(raw_content)
        entry_data['source'] = source

        # Step 2: Save
        entry_id = save_to_backend(entry_data)

        if entry_id > 0:
            return [TextContent(type="text", text=f"""✅ 学习记录已保存！

📝 详情:
- ID: {entry_id}
- 主题: {entry_data.get('topic')}
- 分类: {entry_data.get('category')}
- 标签: {', '.join(entry_data.get('tags', []))}
- 难度: {entry_data.get('difficulty')}

💡 前端查看: http://localhost:3000
""")]
        else:
            return [TextContent(type="text", text="❌ 保存失败，请检查后端服务。执行 learnlog start 手动启动。")]

    elif name == "batch_capture":
        entries = arguments.get("entries", [])
        if not entries:
            return [TextContent(type="text", text="❌ Error: entries list is required")]

        results = []
        success_count = 0
        for i, raw_content in enumerate(entries):
            entry_data = call_ai_for_analysis(raw_content)
            entry_id = save_to_backend(entry_data)
            if entry_id > 0:
                success_count += 1
                results.append(f"✅ [{i+1}] ID: {entry_id} - {entry_data.get('topic')}")
            else:
                results.append(f"❌ [{i+1}] 失败")

        return [TextContent(type="text", text=f"批量处理完成\n\n成功: {success_count}/{len(entries)}\n\n{chr(10).join(results)}")]

    elif name == "deep_record":
        topic = arguments.get("topic", "")
        insight = arguments.get("insight", "")
        if not topic or not insight:
            return [TextContent(type="text", text="❌ Error: topic and insight are required")]

        # Build entry payload — insight 包含完整六步法全文
        energy = arguments.get("energy", 5)
        entry_data = {
            "topic": topic,
            "insight": insight,
            "summary": None,
            "star_situation": None,
            "star_task": None,
            "star_action": None,
            "star_result": None,
            "topic_tag_id": None,
            "research_type": "deep-research",
            "energy_level": energy,
            "aha_moment": True,
            "source": arguments.get("source", "deep-record"),
            "custom_tags": arguments.get("tags", []),
        }

        entry_id = save_to_backend(entry_data)
        if entry_id > 0:
            return [TextContent(type="text", text=f"✅ 深度记录已保存！\n\n📝 详情:\n- ID: {entry_id}\n- 主题: {topic}\n- 精力: {'⚡' * energy}\n\n💡 前端查看: http://localhost:3000")]
        else:
            return [TextContent(type="text", text="❌ 保存失败，请检查后端服务。")]

    elif name == "quick_capture":
        topic = arguments.get("topic", "")
        insight = arguments.get("insight", "")
        if not topic or not insight:
            return [TextContent(type="text", text="❌ Error: topic and insight are required")]

        source = arguments.get("source", "aha-capture")

        entry_data = {
            "topic": topic,
            "insight": insight,
            "summary": None,
            "star_situation": None,
            "star_task": None,
            "star_action": None,
            "star_result": None,
            "topic_tag_id": None,
            "research_type": "deep-research",
            "energy_level": 5,
            "aha_moment": True,
            "source": source,
            "custom_tags": ["aha-moment", "quick-capture"],
        }

        entry_id = save_to_backend(entry_data)
        if entry_id > 0:
            return [TextContent(type="text", text=f"💡 灵感已捕获！\n\n📝 详情:\n- ID: {entry_id}\n- 主题: {topic}\n- 精力: ⚡⚡⚡⚡⚡\n- 类型: 顿悟\n\n💡 前端查看: http://localhost:3000")]
        else:
            return [TextContent(type="text", text="❌ 保存失败，请检查后端服务。")]

    else:
        raise ValueError(f"Unknown tool: {name}")


# ── Scheduled Task ───────────────────────────────

async def scheduled_capture():
    """Periodically scan watch/ directory for .md files"""
    print("\n⏰ 定时扫描已启动 (每30分钟)", file=sys.stderr)
    while True:
        try:
            watch_dir = os.path.join(PROJECT_DIR, "backend", "watch")
            if os.path.exists(watch_dir):
                for filename in os.listdir(watch_dir):
                    if filename.endswith('.md'):
                        filepath = os.path.join(watch_dir, filename)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        print(f"\n📄 发现: {filename}", file=sys.stderr)
                        entry_data = call_ai_for_analysis(content)
                        entry_data['source'] = 'markdown-file'
                        save_to_backend(entry_data)
                        processed_dir = os.path.join(watch_dir, 'processed')
                        os.makedirs(processed_dir, exist_ok=True)
                        os.rename(filepath, os.path.join(processed_dir, filename))
            await asyncio.sleep(1800)
        except Exception as e:
            print(f"❌ 定时任务错误: {e}", file=sys.stderr)
            await asyncio.sleep(60)


# ── Main ─────────────────────────────────────────

# ── SSE Transport ─────────────────────────────

async def run_sse_server(port: int):
    """Run MCP server in SSE (HTTP) mode — accessible by any MCP client"""
    from mcp.server.sse import SseServerTransport
    from starlette.applications import Starlette
    from starlette.routing import Route
    from starlette.middleware import Middleware
    from starlette.middleware.cors import CORSMiddleware
    import uvicorn

    sse = SseServerTransport("/messages/")

    async def handle_sse(request):
        async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
            await server.run(streams[0], streams[1], server.create_initialization_options())

    async def handle_messages(request):
        await sse.handle_post_message(request.scope, request.receive, request._send)

    app = Starlette(
        debug=False,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Route("/messages/", endpoint=handle_messages, methods=["POST"]),
        ],
        middleware=[
            Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]),
        ]
    )

    print(f"🌐 MCP SSE Server 启动于 http://0.0.0.0:{port}/sse", file=sys.stderr)
    print(f"📋 客户端配置: {{ \"type\": \"sse\", \"url\": \"http://localhost:{port}/sse\" }}", file=sys.stderr)
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server_uv = uvicorn.Server(config)
    await server_uv.serve()


# ── Main ─────────────────────────────────────────

async def main():
    print("=" * 60, file=sys.stderr)
    print("🚀 Learning Log MCP Server v3.0 (Multi-Transport)", file=sys.stderr)
    print(f"   Project: {PROJECT_DIR}", file=sys.stderr)
    print(f"   Backend: {BACKEND_URL}", file=sys.stderr)
    print(f"   AI:      {AI_MODEL}", file=sys.stderr)
    print(f"   Mode:    {'SSE (HTTP)' if SSE_MODE else 'STDIO'}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    # Auto-start backend on launch
    _start_backend()

    # Background watch scanner
    asyncio.create_task(scheduled_capture())

    if SSE_MODE:
        await run_sse_server(SSE_PORT)
    else:
        # Default: stdio mode (for Claude Code via .mcp.json)
        from mcp.server.stdio import stdio_server
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
