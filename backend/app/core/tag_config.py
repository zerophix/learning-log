TAG_PREFIX = "cn.dolphinmind.learning.log.tag"

RESEARCH_TYPES = {
    "deep-research": "深度研究",
    "topic-exploration": "主题探索",
    "domain-mapping": "领域映射",
}

DEFAULT_RESEARCH_TYPE = "deep-research"
FALLBACK_RESEARCH_TYPE = "unclassified"

LINK_TYPES = ["prerequisite", "related", "contains", "alternative"]

PROJECT_TYPES = ["business", "source-code", "component"]

TAG_CATEGORIES = [
    "base", "language", "architecture", "framework", "database",
    "cache", "mq", "registry", "tool", "monitor", "test",
    "gateway", "security", "project", "auto", "other",
]

AUTO_TAG_PREFIX = "auto"
AUTO_TAG_CATEGORY = "auto"

CUSTOM_TAGS_AHA = ["aha-moment", "quick-capture"]
CUSTOM_TAGS_AUTO_CAPTURED = ["auto-captured"]

RESEARCH_TYPE_INFERENCE_RULES = {
    "diagram_or_code": "domain-mapping",
    "analogy_or_transfer": "topic-exploration",
    "long_insight_with_confidence": "deep-research",
}
