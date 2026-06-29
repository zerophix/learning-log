"""
Learning Log MCP Protocol Server (v3.1)
=========================================
Model Context Protocol server for automated learning entry capture.
Moved from mcp_server.py to protocols/mcp.py for cleaner root.
"""
import asyncio
import os
import sys
from typing import Optional, List
from mcp.server import Server
from mcp.types import Tool, TextContent
from app.services.lifecycle import ensure, save_entry
from app.services.ai_service import analyze, get_default_entry
from app.core.config import PROJECT_DIR, BACKEND_URL, MCP_SSE_PORT

from dotenv import load_dotenv

SSE_MODE = "--sse" in sys.argv
SSE_PORT = MCP_SSE_PORT
for i, arg in enumerate(sys.argv):
    if arg == "--port" and i + 1 < len(sys.argv):
        SSE_PORT = int(sys.argv[i + 1])

load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))

server = Server("learning-log-mcp")


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
            description="深度知识沉淀。将 AI 已在对话中完成的完整分析内容直接保存。内容格式：一句话结论 + 系统全景(Mermaid) + Why(第一性原理) + 架构与流程 + 关键决策(对比表) + STAR+迁移。全部放入 insight 字段，mermaid 代码块(```mermaid)放置于对应章节。等同于 /记录 skill。",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "学习主题（简短标题，10字以内）"},
                    "insight": {"type": "string", "description": "协议对齐格式全文（≥1200字），包含：一句话结论、系统全景(Mermaid+ASCII)、Why(第一性原理)、架构与流程(ASCII)、关键决策(对比表)、STAR+迁移"},
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
        ensure()
        try:
            import requests
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
        entry_data = analyze(raw_content)
        entry_data['source'] = source
        entry_id = save_entry(entry_data)
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
            entry_data = analyze(raw_content)
            entry_id = save_entry(entry_data)
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
        entry_id = save_entry(entry_data)
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
        entry_id = save_entry(entry_data)
        if entry_id > 0:
            return [TextContent(type="text", text=f"💡 灵感已捕获！\n\n📝 详情:\n- ID: {entry_id}\n- 主题: {topic}\n- 精力: ⚡⚡⚡⚡⚡\n- 类型: 顿悟\n\n💡 前端查看: http://localhost:3000")]
        else:
            return [TextContent(type="text", text="❌ 保存失败，请检查后端服务。")]

    else:
        raise ValueError(f"Unknown tool: {name}")


async def scheduled_capture():
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
                        entry_data = analyze(content)
                        entry_data['source'] = 'markdown-file'
                        save_entry(entry_data)
                        processed_dir = os.path.join(watch_dir, 'processed')
                        os.makedirs(processed_dir, exist_ok=True)
                        os.rename(filepath, os.path.join(processed_dir, filename))
            await asyncio.sleep(1800)
        except Exception as e:
            print(f"❌ 定时任务错误: {e}", file=sys.stderr)
            await asyncio.sleep(60)


async def run_sse_server(port: int):
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


async def main():
    from services.lifecycle import start as start_backend
    print("=" * 60, file=sys.stderr)
    print("🚀 Learning Log MCP Server v3.1 (Multi-Transport)", file=sys.stderr)
    print(f"   Project: {PROJECT_DIR}", file=sys.stderr)
    print(f"   Backend: {BACKEND_URL}", file=sys.stderr)
    print(f"   Mode:    {'SSE (HTTP)' if SSE_MODE else 'STDIO'}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    start_backend()
    asyncio.create_task(scheduled_capture())

    if SSE_MODE:
        await run_sse_server(SSE_PORT)
    else:
        from mcp.server.stdio import stdio_server
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
