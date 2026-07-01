#!/usr/bin/env python3
"""quality_gate.py — 通用质量门控模块"""

from __future__ import annotations

SECTION_REQUIREMENTS: dict[str, dict] = {
    "deep-research": {
        "required": ["## 结论", "## 为什么", "## 关键决策", "## STAR + 迁移"],
        "optional": ["## 图景", "## 架构与流程"],
        "forbidden": ["```mermaid"],
        "min_words": 800,
    },
    "topic-exploration": {
        "required": ["## 结论", "## 关键变更"],
        "optional": ["## 图景", "## 影响"],
        "forbidden": ["```mermaid"],
        "min_words": 300,
    },
    "flash-insight": {
        "required": ["## 结论", "## 应用场景"],
        "optional": ["## 类比", "## 可迁移模式"],
        "forbidden": ["```mermaid"],
        "min_words": 200,
    },
}

DEFAULT_TYPE = "deep-research"


def _get_config(research_type: str) -> dict:
    return SECTION_REQUIREMENTS.get(research_type, SECTION_REQUIREMENTS[DEFAULT_TYPE])


def check_sections(insight: str, research_type: str = DEFAULT_TYPE) -> dict:
    config = _get_config(research_type)
    all_sections = config["required"] + config["optional"]
    found = {s: s in insight for s in all_sections}
    missing_required = [s for s in config["required"] if not found[s]]
    missing_optional = [s for s in config["optional"] if not found[s]]
    return {
        "all_present": not missing_required,
        "missing_required": missing_required,
        "missing_optional": missing_optional,
        "found": found,
        "word_count": len(insight),
    }


def validate(insight: str, research_type: str = DEFAULT_TYPE) -> tuple:
    config = _get_config(research_type)
    sec = check_sections(insight, research_type)
    if sec["missing_required"]:
        return False, f"入库拦截：缺少必选章节 {sec['missing_required']}（{research_type} 要求：{config['required']}）"
    if sec["word_count"] < config["min_words"]:
        return False, f"入库拦截：仅 {sec['word_count']} 字，要求 ≥ {config['min_words']} 字"
    for fbdn in config.get("forbidden", []):
        if fbdn in insight:
            return False, f"入库拦截：检测到 {fbdn}，请改用 ASCII + ```text"
    return True, "校验通过"


def enforce_sections(insight: str, title: str = "", research_type: str = DEFAULT_TYPE) -> str:
    config = _get_config(research_type)
    sec = check_sections(insight, research_type)
    if sec["all_present"]:
        return insight
    blocks = []
    for s in sec["missing_optional"]:
        if s == "## 图景":
            blocks.append(f"## 图景\n\n```text\n({title or '本章'}：关键节点关系示意图待补充)\n```\n")
        elif s == "## 架构与流程":
            blocks.append(f"## 架构与流程\n\n```\n({title or '本章'}：信息流与决策流图示待补充)\n```\n")
        elif s == "## 影响":
            blocks.append(f"## 影响\n\n({title or '本阶段'}：系统性影响分析待补充)\n")
        elif s == "## 类比":
            blocks.append(f"## 类比\n\n({title or '本灵感'}：类比说明待补充)\n")
        elif s == "## 可迁移模式":
            blocks.append(f"## 可迁移模式\n\n({title or '本灵感'}：迁移应用模式待补充)\n")
        else:
            blocks.append(f"{s}\n\n（待补充）\n")
    for s in sec["missing_required"]:
        blocks.append(f"{s}\n\n[⚠️ 系统自动补注：本节必选但缺失，请人工补全]\n")
    repair_block = "\n".join(blocks) + "\n[系统自动补注：以上缺失节请在修订时补充完整内容]\n"
    star = "## STAR + 迁移"
    if star in insight:
        return insight.replace(star, repair_block + star)
    return insight + "\n" + repair_block


def can_auto_repair(research_type: str = DEFAULT_TYPE) -> bool:
    safe = {"## 图景","## 架构与流程","## 影响","## 类比","## 可迁移模式"}
    return all(s in safe for s in _get_config(research_type)["required"])


def type_report(insight: str, research_type: str = DEFAULT_TYPE) -> str:
    config = _get_config(research_type)
    sec = check_sections(insight, research_type)
    lines = [f"  type={research_type} | 字数={sec['word_count']} (≥{config['min_words']})"]
    for label, key in [("必选节","missing_required"),("选用节","missing_optional")]:
        if sec[key]:
            lines.append(f"  ❌ {label}缺失: {sec[key]}")
        else:
            lines.append(f"  ✅ {label}齐全")
    for fbdn in config.get("forbidden", []):
        lines.append(f"  ❌ 禁用: {fbdn}" if fbdn in insight else f"  ✅ 无禁用格式")
    return "\n".join(lines)
