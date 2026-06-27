"""
Learning Log API Server
FastAPI backend with tag management system
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import re
import sqlite3
import json
import hashlib
from datetime import datetime, date, timedelta
from db import DB_PATH, init_db

init_db()

app = FastAPI(title="Learning Log API", version="2.0.0")

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
    """Create a new learning entry with multi-dimensional tag references"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Validate tags exist
    if entry.topic_tag_id:
        cursor.execute("SELECT tag_id FROM tags WHERE tag_id = ?", (entry.topic_tag_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail=f"Topic tag not found: {entry.topic_tag_id}")
    
    if entry.project_tag_id:
        cursor.execute("SELECT tag_id FROM tags WHERE tag_id = ?", (entry.project_tag_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail=f"Project tag not found: {entry.project_tag_id}")
    
    session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    content_hash = hashlib.sha256(entry.insight.encode('utf-8')).hexdigest()
    
    try:
        # 幂等性校验：检查 topic + tag 是否已存在
        cursor.execute('SELECT id FROM learning_entries WHERE topic = ? AND topic_tag_id = ? LIMIT 1', (entry.topic, entry.topic_tag_id))
        if cursor.fetchone():
            return {"message": "Entry already exists (deduplicated)", "status": "skipped"}

        # 显式获取当前系统时间，确保时间线由后端统一控制
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
            json.dumps(entry.related_tag_ids),
            json.dumps(entry.custom_tags),
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
        return {"id": cursor.lastrowid, "message": "Entry created", "session_id": session_id}
    
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


@app.get("/api/graph")
def get_graph_data():
    """Get graph data for ECharts (nodes + links) with new hierarchy level
    
    新的层级结构：
    - 第一层：学科领域（discipline，如计算机科学、数学、物理等）
    - 第二层：科目/技术栈（subject，如Java生态、Python生态等）
    - 第三层：学习主题（topic，如Spring Boot、JVM等）
    - 第四层：学习记录（学习记录表）
    
    研究类型（小题深研/专题探索/领域映射）是学习记录的标签维度，不是图谱节点
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get nodes (tags) with new level calculation
    cursor.execute("""
        SELECT 
            tag_id as id, 
            tag_name as name, 
            tag_category as category, 
            energy_level as value,
            parent_tag_id,
            CASE 
                WHEN tag_category = 'discipline' AND parent_tag_id IS NULL THEN 1
                WHEN tag_category = 'subject' THEN 2
                WHEN tag_category = 'topic' THEN 3
                WHEN tag_category = 'research-type' THEN 0  -- 研究类型不显示在图谱中
                ELSE 2
            END as level
        FROM tags 
        WHERE is_active = 1 AND tag_category != 'research-type'
    """)
    nodes = [row_to_dict(row) for row in cursor.fetchall()]
    
    # Get links
    cursor.execute("SELECT source_tag_id as source, target_tag_id as target, link_type as label FROM tag_links")
    links = [row_to_dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {"nodes": nodes, "links": links}

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
    """Update a learning entry (partial update — only provided fields are changed)"""
    conn = get_db()
    cursor = conn.cursor()

    # Check exists
    cursor.execute("SELECT id FROM learning_entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    # Build SET clause from non-None fields
    updates = entry.model_dump(exclude_none=True)
    if not updates:
        conn.close()
        return {"message": "Nothing to update", "id": entry_id}

    # JSON-serialize list fields
    if 'related_tag_ids' in updates and updates['related_tag_ids'] is not None:
        updates['related_tag_ids'] = json.dumps(updates['related_tag_ids'])
    if 'custom_tags' in updates and updates['custom_tags'] is not None:
        updates['custom_tags'] = json.dumps(updates['custom_tags'])

    # Update content_hash if insight changed
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
