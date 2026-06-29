import json
from app.core.tag_config import DEFAULT_RESEARCH_TYPE, RESEARCH_TYPE_INFERENCE_RULES as _IR
from app.utils.db_utils import row_to_dict


def _parse_entry(entry):
    e = row_to_dict(entry)
    e['related_tag_ids'] = json.loads(e['related_tag_ids']) if e['related_tag_ids'] else []
    e['custom_tags'] = json.loads(e['custom_tags']) if e['custom_tags'] else []
    return e


def entries_for_attention(conn, research_type: str | None = None) -> list[dict]:
    cursor = conn.cursor()
    if research_type:
        cursor.execute("""
            SELECT id, topic, insight, summary, energy_level, aha_moment,
                   research_type, related_tag_ids, custom_tags, timestamp
            FROM learning_entries WHERE research_type = ? ORDER BY id
        """, (research_type,))
    else:
        cursor.execute("""
            SELECT id, topic, insight, summary, energy_level, aha_moment,
                   research_type, related_tag_ids, custom_tags, timestamp
            FROM learning_entries ORDER BY id
        """)
    return [_parse_entry(row) for row in cursor.fetchall()]


def infer_research_type(entry: dict) -> str:
    if entry.get('diagram') or entry.get('code_snippet'):
        return _IR['diagram_or_code']
    if entry.get('analogy') or entry.get('transfer_pattern'):
        return _IR['analogy_or_transfer']
    insight = entry.get('insight') or ''
    if len(insight) > 500 and entry.get('confidence_rating') is not None:
        return _IR['long_insight_with_confidence']
    return entry.get('research_type', DEFAULT_RESEARCH_TYPE)
