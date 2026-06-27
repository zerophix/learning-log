"""
Learning Log API Server
FastAPI backend with auto-growing tag system + attention graph
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import re
import sqlite3
import json
import hashlib
import uuid
from datetime import datetime, date, timedelta
from collections import Counter
from db import DB_PATH, init_db

try:
    import jieba
    import jieba.posseg as pseg
except ImportError:
    jieba = None
    pseg = None

init_db()

# Soft-delete pre-seeded tags — they were seed data, not user-grown
_conn = sqlite3.connect(DB_PATH)
_conn.execute("UPDATE tags SET is_active = 0 WHERE is_auto = 0 AND is_active = 1")
_conn.commit()
_conn.close()

app = FastAPI(title="Learning Log API", version="2.0.0")

@app.on_event("startup")
def warmup():
    _get_embedding_model()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class TagCreate(BaseModel):
    tag_id: str                                    # e.g., cn.dolphinmind.learning.log.tag.framework.spring
    tag_name: str                                  # Display name
    tag_category: str                              # framework, database, middleware, etc.
    tag_description: Optional[str] = None
    parent_tag_id: Optional[str] = None
    energy_level: int = 3

class TagLinkCreate(BaseModel):
    source_tag_id: str
    target_tag_id: str
    link_type: str                                 # prerequisite, alternative, contains, related
    link_description: Optional[str] = None

class LearningEntryCreate(BaseModel):
    topic: str
    insight: str                       # 核心洞察/分析文章（结论先行，可长文）
    summary: Optional[str] = None      # AI 提取的摘要（预览用途）
    diagram: Optional[str] = None      # Mermaid 图示（可选）
    code_snippet: Optional[str] = None # 完整代码实现片段
    
    # STAR 法则（允许空值，cli 不传时留 null）
    star_situation: Optional[str] = None
    star_task: Optional[str] = None
    star_action: Optional[str] = None
    star_result: Optional[str] = None
    
    # 标签维度
    topic_tag_id: Optional[str] = None
    project_tag_id: Optional[str] = None
    research_type: str = "deep-research"
    related_tag_ids: List[str] = []
    custom_tags: List[str] = []
    
    # 深度学习
    analogy: Optional[str] = None
    transfer_pattern: Optional[str] = None
    energy_level: int = 3
    aha_moment: bool = False
    source: str = "ai-chat"
    confidence_rating: Optional[int] = None

class NLCommandCreate(BaseModel):
    command_text: str
    intent_category: Optional[str] = None
    skill_triggered: Optional[str] = None
    execution_status: str = "success"
    is_effective: bool = True

# --- Helper ---

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def row_to_dict(row):
    if row is None:
        return None
    return dict(row)

def _extract_summary(insight: str, max_chars: int = 200) -> str:
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

# --- Auto Tag Extraction ---

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

def _clean_for_extraction(text: str) -> str:
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'```', '', text)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'#{1,6}\s+', '', text)
    text = re.sub(r'[*_~`]', '', text)
    text = re.sub(r'[—\-–·•→⇒,.;:!?。，；：！？、""''（）()【】\[\]{}《》<>/\\|]', ' ', text)
    text = re.sub(r'\d+\.\s*', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def auto_extract_tags(text: str, max_tags: int = 10) -> list[str]:
    if jieba is None:
        return []
    
    cleaned = _clean_for_extraction(text)
    
    # Chinese words via jieba POS
    chinese_tags = []
    for word, flag in pseg.cut(cleaned):
        # Keep nouns, verb-nouns, proper nouns, adjectives (as topic descriptors)
        if flag[0] in ('n', 'v', 'a', 'x') and len(word) >= 2:
            if word.lower() not in STOP_WORDS:
                chinese_tags.append(word)
    
    # English technical terms: 3+ chars, title-cased or uppercase
    eng_words = re.findall(r'\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b', cleaned)
    eng_upper = re.findall(r'\b[A-Z]{2,}\b', cleaned)
    eng_lower = [w for w in re.findall(r'\b[a-z]{3,}\b', cleaned.lower()) if w not in ENGLISH_STOP]
    
    # Filter: remove single-character terms, count frequencies
    c_freq = Counter(chinese_tags)
    e_freq = Counter(eng_words) + Counter(eng_upper) + Counter(eng_lower)
    
    # Merge: prefer Chinese (keep top 8), then English (keep top 4)
    top_c = [w for w, _ in c_freq.most_common(8)]
    top_e = [w for w, _ in e_freq.most_common(4)]
    
    # Deduplicate (e.g., "Virtual DOM" could also be in jieba output)
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
            # Ensure unique tag_id (handle slug collisions like 'Claude Code' vs 'claude-code')
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

def get_week_dates(year: int, week: int) -> tuple[date, date]:
    """Return (monday, sunday) for %W week number (Monday start)."""
    jan1 = date(year, 1, 1)
    days_to_first_monday = (7 - jan1.weekday()) % 7
    if days_to_first_monday == 7:
        days_to_first_monday = 0
    first_monday = jan1 + timedelta(days=days_to_first_monday)
    if week == 0:
        week_start = jan1
        week_end = first_monday - timedelta(days=1)
    else:
        week_start = first_monday + timedelta(weeks=week - 1)
        week_end = week_start + timedelta(days=6)
    return week_start, week_end

# --- Tag Management Endpoints ---

@app.post("/api/tags")
def create_tag(tag: TagCreate):
    """Create a new tag (AI should check existing tags first)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if tag already exists
    cursor.execute("SELECT * FROM tags WHERE tag_id = ?", (tag.tag_id,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail=f"Tag already exists: {tag.tag_id}")
    
    try:
        cursor.execute('''
            INSERT INTO tags (tag_id, tag_name, tag_category, tag_description, parent_tag_id, energy_level)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (tag.tag_id, tag.tag_name, tag.tag_category, tag.tag_description, tag.parent_tag_id, tag.energy_level))
        
        conn.commit()
        return {"message": f"Tag created: {tag.tag_id}", "tag_id": tag.tag_id}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/tags")
def list_tags(category: Optional[str] = None):
    """List all tags, optionally filtered by category"""
    conn = get_db()
    cursor = conn.cursor()
    
    if category:
        cursor.execute("SELECT * FROM tags WHERE tag_category = ? AND is_active = 1 ORDER BY tag_name", (category,))
    else:
        cursor.execute("SELECT * FROM tags WHERE is_active = 1 ORDER BY tag_category, tag_name")
    
    tags = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return tags

@app.get("/api/tags/tree")
def get_tag_tree():
    """Get tag hierarchy as a tree structure"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all tags
    cursor.execute("SELECT * FROM tags WHERE is_active = 1 ORDER BY tag_category, tag_name")
    all_tags = [row_to_dict(row) for row in cursor.fetchall()]
    
    # Build tree
    tree = []
    tag_map = {t['tag_id']: {**t, 'children': []} for t in all_tags}
    
    for tag in all_tags:
        if tag['parent_tag_id'] and tag['parent_tag_id'] in tag_map:
            tag_map[tag['parent_tag_id']]['children'].append(tag_map[tag['tag_id']])
        elif not tag['parent_tag_id']:
            tree.append(tag_map[tag['tag_id']])
    
    conn.close()
    return tree

@app.post("/api/tag-links")
def create_tag_link(link: TagLinkCreate):
    """Create a relationship between two tags"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO tag_links (source_tag_id, target_tag_id, link_type, link_description)
            VALUES (?, ?, ?, ?)
        ''', (link.source_tag_id, link.target_tag_id, link.link_type, link.link_description))
        
        conn.commit()
        return {"message": f"Link created: {link.source_tag_id} → {link.target_tag_id}"}
    
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Link already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/tag-links")
def list_tag_links(source_tag_id: Optional[str] = None):
    """List all tag links, optionally filtered by source tag"""
    conn = get_db()
    cursor = conn.cursor()
    
    if source_tag_id:
        cursor.execute("SELECT * FROM tag_links WHERE source_tag_id = ?", (source_tag_id,))
    else:
        cursor.execute("SELECT * FROM tag_links")
    
    links = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return links

# --- Learning Entry Endpoints ---

@app.post("/api/entries")
def create_entry(entry: LearningEntryCreate):
    """Create a new learning entry — auto-extracts tags from content"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Auto-extract tags from content
    extract_text = f"{entry.topic} {entry.summary or ''} {entry.insight}"
    auto_names = auto_extract_tags(extract_text)
    
    # Merge with user-supplied custom_tags
    all_tags = list(dict.fromkeys(entry.custom_tags + auto_names))
    auto_ids = ensure_tags(conn, all_tags)
    
    session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    content_hash = hashlib.sha256(entry.insight.encode('utf-8')).hexdigest()
    
    try:
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute('''
            INSERT INTO learning_entries 
            (session_id, topic, insight, summary, diagram, 
             star_situation, star_task, star_action, star_result,
             topic_tag_id, project_tag_id, research_type, related_tag_ids, custom_tags,
             analogy, transfer_pattern, energy_level, aha_moment, source, confidence_rating, content_hash, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_id,
            entry.topic,
            entry.insight,
            entry.summary or _extract_summary(entry.insight),
            entry.diagram,
            entry.star_situation,
            entry.star_task,
            entry.star_action,
            entry.star_result,
            entry.topic_tag_id,
            entry.project_tag_id,
            entry.research_type,
            json.dumps(auto_ids),
            json.dumps(all_tags),
            entry.analogy,
            entry.transfer_pattern,
            entry.energy_level,
            entry.aha_moment,
            entry.source,
            entry.confidence_rating,
            content_hash,
            current_time
        ))
        
        conn.commit()
        return {"id": cursor.lastrowid, "message": "Entry created", "session_id": session_id, "tags_added": len(auto_ids)}
    
    except sqlite3.IntegrityError as e:
        conn.rollback()
        if "idx_unique_content" in str(e):
            raise HTTPException(status_code=409, detail="Duplicate entry detected (same tag and content).")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/entries")
def list_entries(limit: int = 50, offset: int = 0):
    """List all learning entries"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM learning_entries ORDER BY timestamp DESC LIMIT ? OFFSET ?", (limit, offset))
    entries = []
    
    for row in cursor.fetchall():
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        entries.append(entry)
    
    conn.close()
    return entries

@app.get("/api/entries/week-index")
def get_week_index():
    """List all weeks that have entries, with counts and date ranges."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT strftime('%Y', timestamp) as year,
               CAST(strftime('%W', timestamp) AS INTEGER) as week,
               COUNT(*) as count
        FROM learning_entries
        GROUP BY strftime('%Y-%W', timestamp)
        ORDER BY year DESC, week DESC
    """)

    weeks = []
    for row in cursor.fetchall():
        y, w, c = int(row['year']), row['week'], row['count']
        start_date, end_date = get_week_dates(y, w)
        weeks.append({
            "year": y,
            "week": w,
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "count": c
        })

    conn.close()
    return weeks


@app.get("/api/entries/week")
def get_entries_by_week(year: int, week: int, limit: int = 50):
    """Get all entries for a specific week (Monday-Sunday)."""
    conn = get_db()
    cursor = conn.cursor()

    start_date, end_date = get_week_dates(year, week)
    end_plus_one = (end_date + timedelta(days=1)).isoformat()

    cursor.execute("""
        SELECT * FROM learning_entries
        WHERE timestamp >= ? AND timestamp < ?
        ORDER BY timestamp DESC LIMIT ?
    """, (start_date.isoformat(), end_plus_one, limit))

    entries = []
    for row in cursor.fetchall():
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        entries.append(entry)

    conn.close()

    return {
        "data": entries,
        "week": {"year": year, "week": week, "start": start_date.isoformat(), "end": end_date.isoformat()},
        "has_more": len(entries) == limit
    }


@app.post("/api/tags/backfill")
def backfill_tags():
    """Re-extract tags from all existing entries (for migration)"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM learning_entries ORDER BY id")
    rows = cursor.fetchall()
    
    count = 0
    for row in rows:
        e = row_to_dict(row)
        extract_text = f"{e['topic']} {e.get('summary', '') or ''} {e.get('insight', '') or ''}"
        auto_names = auto_extract_tags(extract_text)
        existing_custom = json.loads(e.get('custom_tags', '[]')) if isinstance(e.get('custom_tags'), str) else (e.get('custom_tags') or [])
        all_tags = list(dict.fromkeys(existing_custom + auto_names))
        auto_ids = ensure_tags(conn, all_tags)
        cursor.execute(
            "UPDATE learning_entries SET related_tag_ids = ?, custom_tags = ? WHERE id = ?",
            (json.dumps(auto_ids), json.dumps(all_tags), e['id'])
        )
        count += 1
    conn.commit()
    conn.close()
    return {"message": f"Backfilled {count} entries"}

@app.get("/api/graph")
def get_graph_data():
    """Legacy tag-based graph"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT tag_id as id, tag_name as name, tag_category as category, usage_count as value
        FROM tags WHERE is_active = 1 AND is_auto = 1
        ORDER BY usage_count DESC
    """)
    nodes = [row_to_dict(row) for row in cursor.fetchall()]
    
    cursor.execute("""
        SELECT source_tag_id as source, target_tag_id as target, link_type as label
        FROM tag_links
    """)
    links = [row_to_dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {"nodes": nodes, "links": links}

# --- Attention Graph (自生长图谱) ---

def _entries_for_attention(conn) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, topic, insight, summary, energy_level, aha_moment, 
               related_tag_ids, custom_tags, timestamp
        FROM learning_entries ORDER BY id
    """)
    entries = []
    for row in cursor.fetchall():
        e = row_to_dict(row)
        e['related_tag_ids'] = json.loads(e['related_tag_ids']) if e['related_tag_ids'] else []
        e['custom_tags'] = json.loads(e['custom_tags']) if e['custom_tags'] else []
        entries.append(e)
    return entries

_EMBEDDING_MODEL = None

def _get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            _EMBEDDING_MODEL = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        except Exception:
            _EMBEDDING_MODEL = None
    return _EMBEDDING_MODEL

def _compute_embeddings(texts: list[str]):
    model = _get_embedding_model()
    if model is not None:
        try:
            return model.encode(texts, show_progress_bar=False)
        except Exception:
            pass
    from sklearn.feature_extraction.text import TfidfVectorizer
    vec = TfidfVectorizer(max_features=500, stop_words=list(ENGLISH_STOP | STOP_WORDS))
    return vec.fit_transform(texts).toarray()

def _to_python(obj):
    """Recursively convert numpy types to native Python types."""
    import numpy as np
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, list):
        return [_to_python(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _to_python(v) for k, v in obj.items()}
    return obj

@app.get("/api/graph/attention")
def get_attention_graph(
    w_content: float = 0.6,
    w_tags: float = 0.25,
    w_temporal: float = 0.15,
    top_k: int = 5,
):
    """3-head attention graph — nodes = entries, edges = weighted similarity"""
    conn = get_db()
    entries = _entries_for_attention(conn)
    conn.close()
    
    if len(entries) < 2:
        return {"nodes": [], "edges": [], "clusters": [], "weights": {"content": w_content, "tags": w_tags, "temporal": w_temporal}}
    
    n = len(entries)
    
    # ── Head 1: Content similarity ──
    texts = [f"{e['topic']} {e.get('summary', '') or ''} {e.get('insight', '') or ''}"[:2000] for e in entries]
    try:
        emb = _compute_embeddings(texts)
        content_sim = _cosine_sim_matrix(emb)
    except Exception:
        content_sim = [[0.0]*n for _ in range(n)]
    
    # ── Head 2: Custom tags Jaccard ──
    tag_sets = [set(e.get('custom_tags') or []) for e in entries]
    tag_sim = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            a, b = tag_sets[i], tag_sets[j]
            if not a or not b:
                tag_sim[i][j] = 0.0
            else:
                union = a | b
                tag_sim[i][j] = len(a & b) / len(union) if union else 0.0
    
    # ── Head 3: Temporal proximity ──
    timestamps = []
    for e in entries:
        try:
            ts = datetime.strptime(e['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            ts = datetime.strptime(e['timestamp'], '%Y-%m-%dT%H:%M:%S')
        timestamps.append(ts)
    
    min_ts = min(timestamps)
    max_diff = (max(timestamps) - min_ts).days or 1
    temporal_sim = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            diff_days = abs((timestamps[i] - timestamps[j]).days)
            temporal_sim[i][j] = 1.0 - (diff_days / max_diff)
    
    # ── Combine: Attention matrix ──
    attn = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            attn[i][j] = w_content * content_sim[i][j] + w_tags * tag_sim[i][j] + w_temporal * temporal_sim[i][j]
    
    # ── Cluster (k-means on content embeddings) ──
    from sklearn.cluster import KMeans
    n_clusters = min(5, max(2, n // 6))
    try:
        clusters = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto').fit_predict(emb)
    except Exception:
        clusters = [0] * n
    
    # ── Build edges: top_k per entry ──
    edge_set = set()
    edges = []
    for i in range(n):
        sims = [(j, attn[i][j]) for j in range(n) if j != i]
        sims.sort(key=lambda x: -x[1])
        for j, w in sims[:top_k]:
            if w > 0.05:
                key = (min(i, j), max(i, j))
                if key not in edge_set:
                    edge_set.add(key)
                    edges.append({
                        "source": entries[i]['id'],
                        "target": entries[j]['id'],
                        "weight": round(w, 4),
                        "heads": {
                            "content": round(content_sim[i][j], 4),
                            "tags": round(tag_sim[i][j], 4),
                            "temporal": round(temporal_sim[i][j], 4),
                        }
                    })
    
    # ── Cluster names (nearest entry to centroid) ──
    cluster_names = {}
    for cid in range(n_clusters):
        indices = [idx for idx, c in enumerate(clusters) if c == cid]
        if indices:
            cluster_names[cid] = entries[indices[0]]['topic']
    
    # ── Build nodes ──
    degree = Counter()
    for e in edges:
        degree[e['source']] += 1
        degree[e['target']] += 1
    max_deg = max(degree.values()) if degree else 1
    
    nodes = []
    for i, e in enumerate(entries):
        nodes.append({
            "id": e['id'],
            "topic": e['topic'],
            "summary": (e.get('summary') or '')[:100],
            "energy": e['energy_level'],
            "aha": bool(e['aha_moment']),
            "cluster": int(clusters[i]),
            "cluster_name": cluster_names.get(int(clusters[i]), ''),
            "timestamp": e['timestamp'],
            "degree": degree.get(e['id'], 0),
            "tag_count": len(e.get('custom_tags') or []),
        })
    
    edges.sort(key=lambda x: -x['weight'])
    
    result = {
        "nodes": nodes,
        "edges": edges,
        "clusters": [cluster_names.get(i, f"Cluster {i}") for i in range(n_clusters)],
        "weights": {"content": w_content, "tags": w_tags, "temporal": w_temporal},
        "entry_count": n,
    }
    return _to_python(result)

@app.get("/api/entries/{entry_id}/neighbors")
def get_entry_neighbors(
    entry_id: int,
    w_content: float = 0.6,
    w_tags: float = 0.25,
    w_temporal: float = 0.15,
):
    """Return 3-head neighbors for a given entry — content / tags / temporal"""
    conn = get_db()
    entries = _entries_for_attention(conn)
    conn.close()

    target = None
    for e in entries:
        if e['id'] == entry_id:
            target = e
            break
    if not target:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Parce timestamps
    def _parse(ts):
        try:
            return datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S')

    # ── Content similarity ──
    texts = [f"{e['topic']} {e.get('summary', '') or ''} {e.get('insight', '') or ''}"[:2000] for e in entries]
    try:
        emb = _compute_embeddings(texts)
        from sklearn.metrics.pairwise import cosine_similarity
        all_sim = cosine_similarity(emb)
    except Exception:
        all_sim = [[0.0]*len(entries) for _ in range(len(entries))]

    target_idx = next(i for i, e in enumerate(entries) if e['id'] == entry_id)
    target_ts = _parse(target['timestamp'])
    target_tags = set(target.get('custom_tags') or [])
    all_ts = [_parse(e['timestamp']) for e in entries]
    min_ts = min(all_ts)
    max_diff = (max(all_ts) - min_ts).days or 1

    content_list = []
    tags_list = []
    temporal_list = []

    for i, e in enumerate(entries):
        if e['id'] == entry_id:
            continue

        # Content score
        c_score = float(all_sim[target_idx][i])

        # Tags Jaccard
        other_tags = set(e.get('custom_tags') or [])
        if target_tags and other_tags:
            t_score = len(target_tags & other_tags) / len(target_tags | other_tags)
        else:
            t_score = 0.0

        # Temporal proximity
        diff_days = abs((target_ts - all_ts[i]).days)
        tmp_score = 1.0 - (diff_days / max_diff)

        # Combined
        combined = w_content * c_score + w_tags * t_score + w_temporal * tmp_score

        # Reason labels
        reasons = []
        if c_score > 0.3:
            reasons.append(f"语义相似 {c_score*100:.0f}%")
        if t_score > 0:
            shared = target_tags & other_tags
            reasons.append(f"共享标签 {'·'.join(list(shared)[:3])}")
        if tmp_score > 0.8:
            reasons.append("邻近时间")
        if not reasons:
            if combined > 0.1:
                reasons.append(f"综合关联 {(combined*100):.0f}%")

        item = {
            "id": e['id'],
            "topic": e['topic'],
            "energy": e['energy_level'],
            "timestamp": e['timestamp'],
            "score": round(combined, 4),
            "breakdown": {
                "content": round(c_score, 4),
                "tags": round(t_score, 4),
                "temporal": round(tmp_score, 4),
            },
            "reasons": reasons,
        }

        if c_score > 0.15:
            content_list.append(item)
        if t_score > 0:
            tags_list.append(item)
        temporal_list.append(item)

    content_list.sort(key=lambda x: -x['breakdown']['content'])
    tags_list.sort(key=lambda x: -x['breakdown']['tags'])
    temporal_list.sort(key=lambda x: -x['breakdown']['temporal'])

    # Energy context: entries just before/after with notable energy shifts
    energy_list = []
    sorted_by_time = sorted(entries, key=lambda e: _parse(e['timestamp']))
    for i, e in enumerate(sorted_by_time):
        if e['id'] == entry_id:
            if i > 0:
                prev = sorted_by_time[i-1]
                if abs(prev['energy_level'] - target['energy_level']) >= 2:
                    direction = "↑" if target['energy_level'] > prev['energy_level'] else "↓"
                    energy_list.append({
                        "direction": direction,
                        "type": f"能量{direction}{target['energy_level'] - prev['energy_level']}",
                        "from_entry": {"id": prev['id'], "topic": prev['topic']},
                        "to_entry": {"id": target['id'], "topic": target['topic']},
                    })
            if i < len(sorted_by_time) - 1:
                nxt = sorted_by_time[i+1]
                if abs(nxt['energy_level'] - target['energy_level']) >= 2:
                    direction = "↑" if nxt['energy_level'] > target['energy_level'] else "↓"
                    energy_list.append({
                        "direction": direction,
                        "type": f"能量{direction}{nxt['energy_level'] - target['energy_level']}",
                        "from_entry": {"id": target['id'], "topic": target['topic']},
                        "to_entry": {"id": nxt['id'], "topic": nxt['topic']},
                    })
            break

    return _to_python({
        "entry_id": entry_id,
        "topic": target['topic'],
        "neighbors": {
            "content": content_list[:5],
            "temporal": temporal_list[:5],
            "tags": tags_list[:5],
            "energy_context": energy_list,
        }
    })

@app.get("/api/stats")
def get_stats():
    """Get basic statistics for health check and dashboard"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM learning_entries")
    entry_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tags WHERE is_active = 1")
    tag_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tag_links")
    link_count = cursor.fetchone()[0]
    
    conn.close()
    return {
        "entries": entry_count,
        "tags": tag_count,
        "links": link_count
    }

@app.get("/api/entries/{entry_id}")
def get_entry_detail(entry_id: int):
    """Get a single learning entry by ID"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM learning_entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    entry = row_to_dict(row)
    entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
    entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
    return entry


class LearningEntryUpdate(BaseModel):
    """All fields optional for partial update"""
    topic: Optional[str] = None
    insight: Optional[str] = None
    summary: Optional[str] = None
    diagram: Optional[str] = None
    code_snippet: Optional[str] = None
    star_situation: Optional[str] = None
    star_task: Optional[str] = None
    star_action: Optional[str] = None
    star_result: Optional[str] = None
    topic_tag_id: Optional[str] = None
    project_tag_id: Optional[str] = None
    research_type: Optional[str] = None
    related_tag_ids: Optional[List[str]] = None
    custom_tags: Optional[List[str]] = None
    analogy: Optional[str] = None
    transfer_pattern: Optional[str] = None
    energy_level: Optional[int] = None
    aha_moment: Optional[bool] = None
    source: Optional[str] = None
    confidence_rating: Optional[int] = None


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: int, entry: LearningEntryUpdate):
    """Update a learning entry — re-extracts tags if content changes"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM learning_entries WHERE id = ?", (entry_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    existing = row_to_dict(existing)

    updates = entry.model_dump(exclude_none=True)
    if not updates:
        conn.close()
        return {"message": "Nothing to update", "id": entry_id}

    # If content fields changed, re-extract tags
    if any(k in updates for k in ('topic', 'insight', 'summary')):
        topic = updates.get('topic', existing['topic'])
        summary = updates.get('summary', existing.get('summary', ''))
        insight = updates.get('insight', existing['insight'])
        extract_text = f"{topic} {summary or ''} {insight}"
        auto_names = auto_extract_tags(extract_text)
        
        existing_custom = json.loads(existing.get('custom_tags', '[]')) if isinstance(existing.get('custom_tags'), str) else (existing.get('custom_tags') or [])
        all_tags = list(dict.fromkeys(existing_custom + auto_names))
        auto_ids = ensure_tags(conn, all_tags)
        
        updates['related_tag_ids'] = json.dumps(auto_ids)
        updates['custom_tags'] = json.dumps(all_tags)
        updates['content_hash'] = hashlib.sha256(insight.encode('utf-8')).hexdigest()
    else:
        if 'related_tag_ids' in updates:
            updates['related_tag_ids'] = json.dumps(updates['related_tag_ids'])
        if 'custom_tags' in updates:
            updates['custom_tags'] = json.dumps(updates['custom_tags'])
        if 'insight' in updates:
            updates['content_hash'] = hashlib.sha256(updates['insight'].encode('utf-8')).hexdigest()

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values())

    try:
        cursor.execute(
            f"UPDATE learning_entries SET {set_clause} WHERE id = ?",
            values + [entry_id]
        )
        conn.commit()
        return {"message": f"Entry {entry_id} updated", "id": entry_id, "fields_updated": list(updates.keys())}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int):
    """Delete a learning entry by ID"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM learning_entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    try:
        cursor.execute("DELETE FROM learning_entries WHERE id = ?", (entry_id,))
        conn.commit()
        return {"message": f"Entry {entry_id} deleted", "id": entry_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/api/entries/feed")
def get_feed_entries(
    limit: int = 50,
    offset: int = 0,
    project_type: Optional[str] = None,
    discipline: Optional[str] = None,
    research_type: Optional[str] = None
):
    """Get learning entries as a feed (time-based, with optional filters)
    
    参数：
    - project_type: 项目类型 (business/source-code/component)
    - discipline: 学科领域 (cs/math/physics/finance/law)
    - research_type: 研究类型 (deep-research/topic-exploration/domain-mapping)
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # 构建动态查询
    conditions = []
    params = []
    
    if project_type:
        prefix = f"cn.dolphinmind.learning.log.tag.project.{project_type}."
        conditions.append("project_tag_id LIKE ?")
        params.append(f"{prefix}%")
    
    if discipline:
        conditions.append("topic_tag_id LIKE ?")
        params.append(f"%.discipline.{discipline}.%")
    
    if research_type:
        conditions.append("research_type = ?")
        params.append(research_type)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    cursor.execute(
        f"SELECT * FROM learning_entries WHERE {where_clause} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    )
    
    entries = []
    for row in cursor.fetchall():
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        entries.append(entry)
    
    conn.close()
    return entries

@app.get("/api/projects")
def list_projects(project_type: Optional[str] = None):
    """List all projects, optionally filtered by type (business/source-code/component)"""
    conn = get_db()
    cursor = conn.cursor()
    
    if project_type:
        parent_id = f"cn.dolphinmind.learning.log.tag.project.{project_type}"
        cursor.execute("SELECT * FROM tags WHERE parent_tag_id = ? AND is_active = 1 ORDER BY tag_name", (parent_id,))
    else:
        cursor.execute("SELECT * FROM tags WHERE tag_category = 'project' AND is_active = 1 ORDER BY tag_name")
    
    projects = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return projects

@app.get("/api/projects/{project_id}/entries")
def get_entries_by_project(project_id: str, research_type: Optional[str] = None):
    """Get all learning entries for a specific project or project type
    
    project_id 可以是：
    - 完整项目标签 ID（精确匹配）
    - 项目类型前缀（如 'component'，会匹配所有 cn.dolphinmind.learning.log.tag.project.component.*）
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # 判断是项目类型还是完整项目 ID
    if project_id in ['business', 'source-code', 'component']:
        # 项目类型：使用前缀匹配
        prefix = f"cn.dolphinmind.learning.log.tag.project.{project_id}."
        if research_type:
            cursor.execute(
                "SELECT * FROM learning_entries WHERE project_tag_id LIKE ? AND research_type = ? ORDER BY timestamp DESC",
                (f"{prefix}%", research_type)
            )
        else:
            cursor.execute(
                "SELECT * FROM learning_entries WHERE project_tag_id LIKE ? ORDER BY timestamp DESC",
                (f"{prefix}%",)
            )
    else:
        # 完整项目 ID：精确匹配
        if research_type:
            cursor.execute(
                "SELECT * FROM learning_entries WHERE project_tag_id = ? AND research_type = ? ORDER BY timestamp DESC",
                (project_id, research_type)
            )
        else:
            cursor.execute(
                "SELECT * FROM learning_entries WHERE project_tag_id = ? ORDER BY timestamp DESC",
                (project_id,)
            )
    
    entries = []
    for row in cursor.fetchall():
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        entries.append(entry)
    
    conn.close()
    return entries

@app.get("/api/tags/cloud")
def get_tag_cloud(min_usage: int = 1):
    """Tag cloud: auto-grown tags ordered by usage_count"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT tag_id, tag_name, usage_count, created_at
        FROM tags
        WHERE is_auto = 1 AND is_active = 1 AND usage_count >= ?
        ORDER BY usage_count DESC, tag_name ASC
    ''', (min_usage,))
    tags = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return tags

@app.get("/api/tags/auto")
def list_auto_tags(prefix: str = ''):
    """Auto-complete: search auto-grown tags by prefix"""
    conn = get_db()
    cursor = conn.cursor()
    if prefix:
        cursor.execute('''
            SELECT tag_id, tag_name, usage_count
            FROM tags WHERE is_auto = 1 AND is_active = 1 AND tag_name LIKE ?
            ORDER BY usage_count DESC LIMIT 20
        ''', (f'{prefix}%',))
    else:
        cursor.execute('''
            SELECT tag_id, tag_name, usage_count
            FROM tags WHERE is_auto = 1 AND is_active = 1
            ORDER BY usage_count DESC LIMIT 50
        ''',)
    tags = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return tags

@app.get("/api/tags/{tag_id}/entries")
def get_entries_by_tag(tag_id: str, research_type: str = None):
    """Get all learning entries for a specific topic tag, optionally filtered by research type
    
    参数：
    - tag_id: 主题标签 ID
    - research_type: 研究类型 (可选)，deep-research / topic-exploration / domain-mapping
    """
    conn = get_db()
    cursor = conn.cursor()
    
    if research_type:
        cursor.execute(
            "SELECT * FROM learning_entries WHERE topic_tag_id = ? AND research_type = ? ORDER BY timestamp DESC",
            (tag_id, research_type)
        )
    else:
        cursor.execute(
            "SELECT * FROM learning_entries WHERE topic_tag_id = ? ORDER BY timestamp DESC",
            (tag_id,)
        )
    
    entries = []
    for row in cursor.fetchall():
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        entries.append(entry)
    
    conn.close()
    return entries

@app.post("/api/nl-commands")
def create_nl_command(cmd: NLCommandCreate):
    """Record a natural language command interaction"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO nl_commands (command_text, intent_category, skill_triggered, execution_status, is_effective)
            VALUES (?, ?, ?, ?, ?)
        ''', (cmd.command_text, cmd.intent_category, cmd.skill_triggered, cmd.execution_status, cmd.is_effective))
        conn.commit()
        return {"id": cursor.lastrowid, "message": "NL Command recorded"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/nl-commands")
def list_nl_commands(limit: int = 50, offset: int = 0, intent_category: Optional[str] = None):
    """List natural language commands"""
    conn = get_db()
    cursor = conn.cursor()
    
    if intent_category:
        cursor.execute("SELECT * FROM nl_commands WHERE intent_category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", (intent_category, limit, offset))
    else:
        cursor.execute("SELECT * FROM nl_commands ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset))
    
    commands = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return commands

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
