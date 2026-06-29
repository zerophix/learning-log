from fastapi import APIRouter, HTTPException
from typing import Optional
import sqlite3
from app.utils.db_utils import get_db, row_to_dict, parse_entry_rows, db_session
from app.models import TagCreate, TagLinkCreate

router = APIRouter()


@router.post("/api/tags")
def create_tag(tag: TagCreate):
    conn = get_db()
    cursor = conn.cursor()
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


@router.get("/api/tags")
def list_tags(category: Optional[str] = None):
    conn = get_db()
    try:
        cursor = conn.cursor()
        if category:
            cursor.execute("SELECT * FROM tags WHERE tag_category = ? AND is_active = 1 ORDER BY tag_name", (category,))
        else:
            cursor.execute("SELECT * FROM tags WHERE is_active = 1 ORDER BY tag_category, tag_name")
        return [row_to_dict(row) for row in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/tags/tree")
def get_tag_tree():
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tags WHERE is_active = 1 ORDER BY tag_category, tag_name")
        all_tags = [row_to_dict(row) for row in cursor.fetchall()]
        tree = []
        tag_map = {t['tag_id']: {**t, 'children': []} for t in all_tags}
        for tag in all_tags:
            if tag['parent_tag_id'] and tag['parent_tag_id'] in tag_map:
                tag_map[tag['parent_tag_id']]['children'].append(tag_map[tag['tag_id']])
            elif not tag['parent_tag_id']:
                tree.append(tag_map[tag['tag_id']])
        return tree
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/api/tag-links")
def create_tag_link(link: TagLinkCreate):
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


@router.get("/api/tag-links")
def list_tag_links(source_tag_id: Optional[str] = None):
    conn = get_db()
    try:
        cursor = conn.cursor()
        if source_tag_id:
            cursor.execute("SELECT * FROM tag_links WHERE source_tag_id = ?", (source_tag_id,))
        else:
            cursor.execute("SELECT * FROM tag_links")
        return [row_to_dict(row) for row in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/tags/cloud")
def get_tag_cloud(min_usage: int = 1):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT tag_id, tag_name, usage_count, created_at
            FROM tags
            WHERE is_auto = 1 AND is_active = 1 AND usage_count >= ?
            ORDER BY usage_count DESC, tag_name ASC
        ''', (min_usage,))
        return [row_to_dict(row) for row in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/tags/auto")
def list_auto_tags(prefix: str = ''):
    conn = get_db()
    try:
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
            ''')
        return [row_to_dict(row) for row in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/tags/{tag_id}/entries")
def get_entries_by_tag(tag_id: str, research_type: str = None):
    with db_session() as conn:
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
        return parse_entry_rows(cursor.fetchall())
