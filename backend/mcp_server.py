"""
Learning Log MCP Server
Model Context Protocol server for automated learning entry capture
"""
import asyncio
import json
import os
from datetime import datetime
from typing import Optional, List
from mcp.server import Server
from mcp.types import Tool, TextContent
import requests
from dotenv import load_dotenv

load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8002")
AI_API_URL = os.getenv("AI_API_URL", "http://localhost:11434/api/generate")  # Ollama example
AI_MODEL = os.getenv("AI_MODEL", "qwen2.5")

server = Server("learning-log-mcp")


def call_ai_for_analysis(raw_content: str) -> dict:
    """
    Call AI to analyze raw learning content and extract structured fields
    
    Args:
        raw_content: Raw conversation or learning material
        
    Returns:
        Structured learning entry data
    """
    prompt = f"""
你是一个学习记录分析助手。请从以下原始学习内容中提取结构化信息，返回 JSON 格式：

原始内容：
{raw_content}

请提取以下字段（用中文回答）：
- topic: 学习主题（简短标题，10字以内）
- question: 核心问题或需求
- insight: 关键洞察或解决方案要点
- category: 分类（technical/design/debug/architecture/interview/general）
- tags: 标签列表（3-5个关键词）
- project_module: 相关项目模块（如 s-pay-mall-ddd-market）
- difficulty: 难度（easy/medium/hard）
- action_items: 后续行动项列表
- related_skills: 相关技能名称列表

只返回 JSON，不要其他文字。格式示例：
{{
  "topic": "React组件优化",
  "question": "如何优化大型组件的性能？",
  "insight": "使用 useMemo 和 useCallback 避免不必要的重渲染",
  "category": "technical",
  "tags": ["React", "性能优化", "hooks"],
  "project_module": "frontend",
  "difficulty": "medium",
  "action_items": ["重构 StatsPanel 组件", "添加性能监控"],
  "related_skills": ["react-best-practices"]
}}
"""
    
    try:
        # Example with Ollama (local LLM)
        response = requests.post(
            AI_API_URL,
            json={
                "model": AI_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('response', '')
            
            # Try to parse JSON from response
            try:
                # Find JSON in response (in case there's extra text)
                start = content.find('{')
                end = content.rfind('}') + 1
                if start >= 0 and end > start:
                    json_str = content[start:end]
                    return json.loads(json_str)
            except:
                pass
            
            print(f"⚠️  AI 响应解析失败，使用默认值")
        
        return get_default_entry(raw_content)
    
    except Exception as e:
        print(f"❌ AI 调用失败: {e}")
        return get_default_entry(raw_content)


def get_default_entry(raw_content: str) -> dict:
    """Fallback: create basic entry from raw content"""
    return {
        "topic": f"学习记录_{datetime.now().strftime('%m%d_%H%M')}",
        "question": raw_content[:200],
        "insight": "待补充",
        "category": "general",
        "tags": ["auto-captured"],
        "project_module": "",
        "difficulty": "medium",
        "action_items": [],
        "related_skills": []
    }


def save_to_backend(entry_data: dict) -> int:
    """
    Save analyzed entry to backend API
    
    Returns:
        Entry ID if successful
    """
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/entries",
            json=entry_data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            entry_id = result.get('id')
            print(f"✅ 学习记录已保存 (ID: {entry_id})")
            return entry_id
        else:
            print(f"❌ 保存失败: {response.text}")
            return -1
    
    except Exception as e:
        print(f"❌ API 调用失败: {e}")
        return -1


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Register available tools"""
    return [
        Tool(
            name="capture_learning",
            description="Capture and analyze a learning session, automatically extract key information and save to database",
            inputSchema={
                "type": "object",
                "properties": {
                    "raw_content": {
                        "type": "string",
                        "description": "Raw learning content or conversation transcript"
                    },
                    "source": {
                        "type": "string",
                        "description": "Source of the learning (ai-chat, meeting, reading, etc.)",
                        "default": "ai-chat"
                    }
                },
                "required": ["raw_content"]
            }
        ),
        Tool(
            name="batch_capture",
            description="Batch process multiple learning entries from a file or list",
            inputSchema={
                "type": "object",
                "properties": {
                    "entries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of raw content strings to process"
                    }
                },
                "required": ["entries"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls"""
    
    if name == "capture_learning":
        raw_content = arguments.get("raw_content", "")
        source = arguments.get("source", "ai-chat")
        
        if not raw_content:
            return [TextContent(type="text", text="❌ Error: raw_content is required")]
        
        print(f"\n🔍 开始分析学习内容...")
        print(f"   来源: {source}")
        print(f"   长度: {len(raw_content)} 字符")
        
        # Step 1: AI Analysis
        entry_data = call_ai_for_analysis(raw_content)
        entry_data['source'] = source
        
        print(f"\n📊 分析结果:")
        print(f"   主题: {entry_data.get('topic')}")
        print(f"   分类: {entry_data.get('category')}")
        print(f"   难度: {entry_data.get('difficulty')}")
        
        # Step 2: Save to Backend
        entry_id = save_to_backend(entry_data)
        
        if entry_id > 0:
            result_text = f"""✅ 学习记录已成功保存！

📝 详情:
- ID: {entry_id}
- 主题: {entry_data.get('topic')}
- 分类: {entry_data.get('category')}
- 标签: {', '.join(entry_data.get('tags', []))}
- 难度: {entry_data.get('difficulty')}

💡 提示: 访问 http://localhost:3000 查看完整记录
"""
            return [TextContent(type="text", text=result_text)]
        else:
            return [TextContent(type="text", text="❌ 保存失败，请检查后端服务是否运行")]
    
    elif name == "batch_capture":
        entries = arguments.get("entries", [])
        
        if not entries:
            return [TextContent(type="text", text="❌ Error: entries list is required")]
        
        results = []
        success_count = 0
        
        for i, raw_content in enumerate(entries):
            print(f"\n处理第 {i+1}/{len(entries)} 条记录...")
            
            entry_data = call_ai_for_analysis(raw_content)
            entry_id = save_to_backend(entry_data)
            
            if entry_id > 0:
                success_count += 1
                results.append(f"✅ [{i+1}] ID: {entry_id} - {entry_data.get('topic')}")
            else:
                results.append(f"❌ [{i+1}] 失败")
        
        summary = f"""批量处理完成

成功: {success_count}/{len(entries)}

详细结果:
{chr(10).join(results)}
"""
        return [TextContent(type="text", text=summary)]
    
    else:
        raise ValueError(f"Unknown tool: {name}")


# Scheduled task: Auto-capture from clipboard or file
async def scheduled_capture():
    """
    Periodically check for new learning materials to capture
    This can be triggered by:
    - File changes in a watch directory
    - Clipboard content
    - RSS feeds
    - Calendar events
    """
    print("\n⏰ 定时任务启动 (每30分钟检查一次)")
    
    while True:
        try:
            # Example: Check a directory for new markdown files
            watch_dir = os.path.join(os.path.dirname(__file__), 'watch')
            
            if os.path.exists(watch_dir):
                for filename in os.listdir(watch_dir):
                    if filename.endswith('.md'):
                        filepath = os.path.join(watch_dir, filename)
                        
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        print(f"\n📄 发现新文件: {filename}")
                        entry_data = call_ai_for_analysis(content)
                        entry_data['source'] = 'markdown-file'
                        save_to_backend(entry_data)
                        
                        # Move to processed
                        processed_dir = os.path.join(watch_dir, 'processed')
                        os.makedirs(processed_dir, exist_ok=True)
                        os.rename(filepath, os.path.join(processed_dir, filename))
            
            await asyncio.sleep(1800)  # 30 minutes
        
        except Exception as e:
            print(f"❌ 定时任务错误: {e}")
            await asyncio.sleep(60)


async def main():
    """Start MCP server"""
    print("=" * 60)
    print("🚀 Learning Log MCP Server")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"AI Model: {AI_MODEL}")
    print("=" * 60)
    
    # Start scheduled task in background
    asyncio.create_task(scheduled_capture())
    
    # Run MCP server
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
