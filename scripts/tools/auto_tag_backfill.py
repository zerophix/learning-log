"""
Backfill: auto-extract tags from all existing entries and seed the auto tag system.
Run once after deploying the auto-tag feature.
"""
import sys, os, json, re, hashlib, uuid, sqlite3
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
from db import DB_PATH

try:
    import jieba
    import jieba.posseg as pseg
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False
    print("jieba not installed — run: pip3 install jieba")

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

def clean_text(text):
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'```', '', text)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'#{1,6}\s+', '', text)
    text = re.sub(r'[*_~`]', '', text)
    text = re.sub(r'[\—\-\–\·\•\→\⇒,.;:!?\。，；：！？、""\'\'（）()【】\[\]{}《》<>/\\|]', ' ', text)
    text = re.sub(r'\d+\.\s*', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_tags(text, max_tags=10):
    if not JIEBA_AVAILABLE:
        return []
    cleaned = clean_text(text)
    chinese = []
    for word, flag in pseg.cut(cleaned):
        if flag[0] in ('n', 'v', 'a', 'x') and len(word) >= 2:
            if word.lower() not in STOP_WORDS:
                chinese.append(word)
    eng_words = re.findall(r'\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b', cleaned)
    eng_upper = re.findall(r'\b[A-Z]{2,}\b', cleaned)
    eng_lower = [w for w in re.findall(r'\b[a-z]{3,}\b', cleaned.lower()) if w not in ENGLISH_STOP]
    c_freq = Counter(chinese)
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

def make_unique_id(name, cursor):
    base = name.lower().strip()
    base = re.sub(r'[^a-z0-9\u4e00-\u9fff]+', '-', base)
    base = base.strip('-')
    base = f'auto.{base}' if base else f'auto.{uuid.uuid4().hex[:8]}'
    # Check if tag_id exists in DB
    cursor.execute("SELECT 1 FROM tags WHERE tag_id = ?", (base,))
    if not cursor.fetchone():
        return base
    for i in range(1, 100):
        candidate = f'{base}-{i}'
        cursor.execute("SELECT 1 FROM tags WHERE tag_id = ?", (candidate,))
        if not cursor.fetchone():
            return candidate
    return f'{base}-{uuid.uuid4().hex[:4]}'

def ensure_tags(cursor, names):
    seen_names = set()
    tag_ids = []
    for name in names:
        name = name.strip()
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())
        cursor.execute("SELECT tag_id FROM tags WHERE tag_name = ?", (name,))
        row = cursor.fetchone()
        if row:
            tag_id = row[0]
            cursor.execute("UPDATE tags SET usage_count = usage_count + 1 WHERE tag_id = ?", (tag_id,))
        else:
            tag_id = make_unique_id(name, cursor)
            cursor.execute(
                "INSERT INTO tags (tag_id, tag_name, tag_category, is_active, is_auto, usage_count) VALUES (?, ?, 'auto', 1, 1, 1)",
                (tag_id, name)
            )
        tag_ids.append(tag_id)
    return tag_ids

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM learning_entries ORDER BY id")
    rows = cursor.fetchall()
    print(f"Processing {len(rows)} entries...")

    for i, row in enumerate(rows):
        e = dict(row)
        text = f"{e['topic']} {e.get('summary', '') or ''} {e.get('insight', '') or ''}"
        auto_names = extract_tags(text)
        existing_custom = json.loads(e.get('custom_tags', '[]')) if e.get('custom_tags') else []
        all_tags = list(dict.fromkeys(existing_custom + auto_names))
        auto_ids = ensure_tags(cursor, all_tags)
        cursor.execute(
            "UPDATE learning_entries SET related_tag_ids = ?, custom_tags = ? WHERE id = ?",
            (json.dumps(auto_ids), json.dumps(all_tags), e['id'])
        )
        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(rows)} done")

    conn.commit()
    conn.close()
    print(f"Done! Backfilled {len(rows)} entries.")

if __name__ == '__main__':
    main()
