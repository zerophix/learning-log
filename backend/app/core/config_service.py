import json
import sqlite3
from app.db import DB_PATH
from app.core.tag_config import (
    TAG_PREFIX, RESEARCH_TYPES, DEFAULT_RESEARCH_TYPE,
    FALLBACK_RESEARCH_TYPE, LINK_TYPES, PROJECT_TYPES,
    TAG_CATEGORIES, AUTO_TAG_PREFIX, AUTO_TAG_CATEGORY,
    CUSTOM_TAGS_AHA, CUSTOM_TAGS_AUTO_CAPTURED,
    RESEARCH_TYPE_INFERENCE_RULES,
)

_CONFIG_DEFAULTS = {
    "tag.prefix": (TAG_PREFIX, "标签域名前缀"),
    "tag.auto_prefix": (AUTO_TAG_PREFIX, "自动标签前缀"),
    "tag.auto_category": (AUTO_TAG_CATEGORY, "自动标签默认分类"),
    "tag.categories": (json.dumps(TAG_CATEGORIES, ensure_ascii=False), "有效标签分类列表"),
    "tag.project_types": (json.dumps(PROJECT_TYPES), "有效项目类型列表"),
    "tag.link_types": (json.dumps(LINK_TYPES), "有效关联类型列表"),
    "tag.custom_tags.aha": (json.dumps(CUSTOM_TAGS_AHA), "顿悟记录默认标签"),
    "tag.custom_tags.auto_captured": (json.dumps(CUSTOM_TAGS_AUTO_CAPTURED), "自动捕获默认标签"),
    "research.types": (json.dumps(RESEARCH_TYPES, ensure_ascii=False), "研究类型 (value: label)"),
    "research.default": (DEFAULT_RESEARCH_TYPE, "默认研究类型"),
    "research.fallback": (FALLBACK_RESEARCH_TYPE, "未知研究类型回退值"),
    "research.inference_rules": (json.dumps(RESEARCH_TYPE_INFERENCE_RULES), "研究类型推断规则"),
}


def ensure_config():
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        for key, (value, desc) in _CONFIG_DEFAULTS.items():
            cursor.execute(
                "INSERT OR IGNORE INTO system_config (key, value, description) VALUES (?, ?, ?)",
                (key, value, desc)
            )
        conn.commit()
    finally:
        conn.close()


def get_config(key: str, default: str = "") -> str:
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row[0] if row else default
    finally:
        conn.close()


def get_config_json(key: str, default=None):
    val = get_config(key)
    if not val:
        return default
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return default


def get_research_types() -> dict[str, str]:
    return get_config_json("research.types", RESEARCH_TYPES)


def get_link_types() -> list[str]:
    return get_config_json("tag.link_types", LINK_TYPES)


def get_project_types() -> list[str]:
    return get_config_json("tag.project_types", PROJECT_TYPES)


def get_tag_categories() -> list[str]:
    return get_config_json("tag.categories", TAG_CATEGORIES)


def set_config(key: str, value: str, description: str = ""):
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO system_config (key, value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
            (key, value, description)
        )
        conn.commit()
    finally:
        conn.close()
