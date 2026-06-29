import re
import hashlib
import uuid
from collections import Counter
from app.db import DB_PATH

try:
    import jieba
    import jieba.posseg as pseg
except ImportError:
    jieba = None
    pseg = None


STOP_WORDS = {
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
    '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '里',
    '对', '与', '及', '但', '而', '或', '因为', '所以', '如果', '虽然',
    '可以', '这个', '那个', '哪些', '什么', '怎么', '如何', '为', '从',
    '被', '把', '让', '给', '向', '用', '通过', '进行', '使用', '实现',
    '需要', '能够', '应该', '可能', '已经', '正在', '还是', '就是', '不是',
    '方式', '方法', '过程', '情况', '部分', '相关', '主要', '基本',
    '一个', '这个', '那个', '这些', '那些', '非常', '比较', '一些', '很多', '这样',
}

ENGLISH_STOP = {
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
    'we', 'you', 'he', 'she', 'not', 'no', 'can', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'some', 'any', 'such', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'while',
    'about', 'between', 'under', 'over', 'back', 'then', 'there', 'here',
    'where', 'which', 'who', 'whom', 'what', 'when', 'why', 'how',
    'get', 'got', 'make', 'made', 'take', 'took', 'use', 'used', 'using',
    'like', 'based', 'also', 'well', 'first', 'new', 'one', 'two',
}


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
    return f'auto.{s}' if s else f'auto.{uuid.uuid4().hex[:8]}'


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
                VALUES (?, ?, 'auto', 1, 1, 1)
            ''', (tag_id, name))
        tag_ids.append(tag_id)
    return tag_ids
