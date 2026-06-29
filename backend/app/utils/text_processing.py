import os
import re
import hashlib
import uuid
from collections import Counter
from app.core.tag_config import AUTO_TAG_PREFIX, AUTO_TAG_CATEGORY
from app.core.config import PROJECT_DIR

try:
    import jieba
    import jieba.posseg as pseg
except ImportError:
    jieba = None
    pseg = None


def _load_stop_words(filename: str) -> set[str]:
    path = os.path.join(PROJECT_DIR, "backend", "data", filename)
    if not os.path.exists(path):
        return set()
    with open(path, "r", encoding="utf-8") as f:
        return {line.strip() for line in f if line.strip()}


STOP_WORDS = _load_stop_words("stop_words_zh.txt")
ENGLISH_STOP = _load_stop_words("stop_words_en.txt")


def extract_summary(insight: str, max_chars: int = 200) -> str:
    lines = insight.strip().split('\n')
    parts = []
    total = 0
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('```'):
            continue
        text = re.sub(r'^#{1,6}\s+', '', stripped)
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        text = re.sub(r'`(.+?)`', r'\1', text)
        text = re.sub(r'[*_]{1,3}', '', text)
        if total + len(text) > max_chars:
            text = text[:max_chars - total]
        if text.strip():
            parts.append(text.strip())
            total += len(text.strip())
        if total >= max_chars:
            break
    return ' '.join(parts)[:max_chars].rstrip(' ,;.')


def clean_for_extraction(text: str) -> str:
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'```', '', text)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'#{1,6}\s+', '', text)
    text = re.sub(r'[*_~`]', '', text)
    text = re.sub(r'[\u2014\u2013\u00b7\u2022\u2192\u21d2,.;:!?\u3002\uff0c\uff1b\uff1a\uff01\uff1f\u3001\u201c\u201d\u2018\u2019\uff08\uff09()\u3010\u3011{}\u300a\u300b<>/|\[\]]', ' ', text)
    text = re.sub(r'\d+\.\s*', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def auto_extract_tags(text: str, max_tags: int = 10) -> list[str]:
    if jieba is None:
        return []

    cleaned = clean_for_extraction(text)

    chinese_tags = []
    for word, flag in pseg.cut(cleaned):
        if flag[0] in ('n', 'v', 'a', 'x') and len(word) >= 2:
            if word.lower() not in STOP_WORDS:
                chinese_tags.append(word)

    eng_words = re.findall(r'\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b', cleaned)
    eng_upper = re.findall(r'\b[A-Z]{2,}\b', cleaned)
    eng_lower = [w for w in re.findall(r'\b[a-z]{3,}\b', cleaned.lower()) if w not in ENGLISH_STOP]

    c_freq = Counter(chinese_tags)
    e_freq = Counter(eng_words) + Counter(eng_upper) + Counter(eng_lower)

    top_c = [w for w, _ in c_freq.most_common(8)]
    top_e = [w for w, _ in e_freq.most_common(4)]

    seen = set()
    result = []
    for w in top_c + top_e:
        key = w.lower().strip()
        if key and key not in seen:
            seen.add(key)
            result.append(w.strip())
    return result[:max_tags]


def slugify_tag(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9\u4e00-\u9fff]+', '-', s)
    s = s.strip('-')
    return f'{AUTO_TAG_PREFIX}.{s}' if s else f'{AUTO_TAG_PREFIX}.{uuid.uuid4().hex[:8]}'


def ensure_tags(conn, tag_names: list[str]) -> list[str]:
    cursor = conn.cursor()
    seen_names = set()
    tag_ids = []
    for name in tag_names:
        name = name.strip()
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())
        cursor.execute("SELECT tag_id, usage_count FROM tags WHERE tag_name = ?", (name,))
        row = cursor.fetchone()
        if row:
            tag_id = row['tag_id']
            cursor.execute("UPDATE tags SET usage_count = usage_count + 1 WHERE tag_id = ?", (tag_id,))
        else:
            tag_id = slugify_tag(name)
            cursor.execute("SELECT 1 FROM tags WHERE tag_id = ?", (tag_id,))
            if cursor.fetchone():
                for i in range(1, 100):
                    candidate = f'{tag_id}-{i}'
                    cursor.execute("SELECT 1 FROM tags WHERE tag_id = ?", (candidate,))
                    if not cursor.fetchone():
                        tag_id = candidate
                        break
            cursor.execute('''
                INSERT INTO tags (tag_id, tag_name, tag_category, is_active, is_auto, usage_count)
                VALUES (?, ?, ?, 1, 1, 1)
            ''', (tag_id, name, AUTO_TAG_CATEGORY))
        tag_ids.append(tag_id)
    return tag_ids
