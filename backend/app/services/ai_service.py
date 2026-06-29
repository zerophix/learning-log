"""AI-powered learning content analysis service."""
import json
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import requests
from app.core.tag_config import CUSTOM_TAGS_AUTO_CAPTURED

PROJECT_DIR = os.environ.get(
    "LEARNLOG_PROJECT_DIR",
    os.path.expanduser("~/PycharmProjects/learning-log")
)
load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))

AI_API_URL = os.getenv("AI_API_URL", "http://localhost:11434/api/generate")
AI_MODEL = os.getenv("AI_MODEL", "qwen2.5")


def get_default_entry(raw_content: str) -> dict:
    now = datetime.now().strftime('%m%d_%H%M')
    return {
        "topic": f"学习记录_{now}",
        "question": raw_content[:200],
        "insight": "待补充",
        "summary": "待补充",
        "category": "general",
        "tags": CUSTOM_TAGS_AUTO_CAPTURED,
        "difficulty": "medium",
    }


def analyze(raw_content: str) -> dict:
    prompt = f"""
     你是一个学习记录分析助手。请从以下原始学习内容中提取结构化信息，返回 JSON 格式：

 原始内容：
 {raw_content}

 请提取以下字段（用中文回答）：
  - topic: 学习主题（简短标题，10字以内）
  - question: 核心问题或需求
  - insight: 完整洞察（尽量保留原文的视觉结构：Mermaid/ASCII图/表格，使用标准 markdown 格式）
  - summary: 摘要（1-3句话概括核心结论，用于前端卡片预览，纯文本不含 Markdown 格式）
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
