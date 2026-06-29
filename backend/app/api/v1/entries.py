from fastapi import APIRouter, HTTPException
from typing import Optional
import json
import hashlib
import sqlite3
from datetime import datetime, timedelta
from collections import Counter
from app.utils.db_utils import get_db, db_session, row_to_dict, parse_entry_rows
from app.utils.text_processing import extract_summary, auto_extract_tags, ensure_tags
from app.services.attention_service import infer_research_type
from app.services.embedding_service import compute_embeddings, to_python
from app.utils.date_utils import get_week_dates
from app.models import LearningEntryCreate, LearningEntryUpdate, BatchEntryRequest

router = APIRouter()


@router.post("/api/entries")
def create_entry(entry: LearningEntryCreate):
    conn = get_db()
    cursor = conn.cursor()
    extract_text = f"{entry.topic} {entry.summary or ''} {entry.insight}"
    auto_names = auto_extract_tags(extract_text)
    all_tags = list(dict.fromkeys(entry.custom_tags + auto_names))
    auto_ids = ensure_tags(conn, all_tags)
    session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    content_hash = hashlib.sha256(entry.insight.encode('utf-8')).hexdigest()
    try:
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            INSERT INTO learning_entries
            (session_id, topic, insight, summary, diagram, code_snippet,
             star_situation, star_task, star_action, star_result,
             topic_tag_id, project_tag_id, research_type, related_tag_ids, custom_tags,
             analogy, transfer_pattern, energy_level, aha_moment, source, confidence_rating, content_hash, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_id,
            entry.topic,
            entry.insight,
            entry.summary or extract_summary(entry.insight),
            entry.diagram,
            entry.code_snippet,
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


@router.get("/api/entries")
def list_entries(limit: int = 50, offset: int = 0):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM learning_entries ORDER BY timestamp DESC LIMIT ? OFFSET ?", (limit, offset))
        return parse_entry_rows(cursor.fetchall())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/entries/feed")
def get_feed_entries(limit: int = 50, offset: int = 0, project_type: Optional[str] = None, discipline: Optional[str] = None, research_type: Optional[str] = None):
    with db_session() as conn:
        cursor = conn.cursor()
        conditions = []
        params = []
        if project_type:
            conditions.append("project_tag_id LIKE ?")
            params.append(f"cn.dolphinmind.learning.log.tag.project.{project_type}.%")
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
        return parse_entry_rows(cursor.fetchall())


@router.get("/api/entries/week-index")
def get_week_index():
    conn = get_db()
    try:
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
            weeks.append({"year": y, "week": w, "start": start_date.isoformat(), "end": end_date.isoformat(), "count": c})
        return weeks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/entries/week")
def get_entries_by_week(year: int, week: int, limit: int = 50):
    with db_session() as conn:
        cursor = conn.cursor()
        start_date, end_date = get_week_dates(year, week)
        end_plus_one = (end_date + timedelta(days=1)).isoformat()
        cursor.execute("""
            SELECT * FROM learning_entries
            WHERE timestamp >= ? AND timestamp < ?
            ORDER BY timestamp DESC LIMIT ?
        """, (start_date.isoformat(), end_plus_one, limit))
        entries = parse_entry_rows(cursor.fetchall())
        return {"data": entries, "week": {"year": year, "week": week, "start": start_date.isoformat(), "end": end_date.isoformat()}, "has_more": len(entries) == limit}


@router.post("/api/entries/batch")
def batch_get_entries(req: BatchEntryRequest):
    with db_session() as conn:
        cursor = conn.cursor()
        placeholders = ",".join("?" for _ in req.ids)
        cursor.execute(f"SELECT * FROM learning_entries WHERE id IN ({placeholders})", req.ids)
        return parse_entry_rows(cursor.fetchall())


@router.post("/api/tags/backfill")
def backfill_tags():
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
        cursor.execute("UPDATE learning_entries SET related_tag_ids = ?, custom_tags = ? WHERE id = ?",
                       (json.dumps(auto_ids), json.dumps(all_tags), e['id']))
        count += 1
    conn.commit()
    conn.close()
    return {"message": f"Backfilled {count} entries"}


@router.post("/api/entries/backfill-research-types")
def backfill_research_types(dry_run: bool = False):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM learning_entries ORDER BY id")
    rows = cursor.fetchall()
    changes = []
    for row in rows:
        e = row_to_dict(row)
        e['research_type'] = e.get('research_type') or 'deep-research'
        for k in ('diagram', 'code_snippet', 'analogy', 'transfer_pattern', 'confidence_rating', 'insight'):
            e[k] = e.get(k)
        inferred = infer_research_type(e)
        original = e.get('research_type', 'deep-research')
        if inferred != original:
            changes.append({"id": e['id'], "topic": e['topic'][:60], "from": original, "to": inferred})
            if not dry_run:
                cursor.execute("UPDATE learning_entries SET research_type = ? WHERE id = ?", (inferred, e['id']))
    if not dry_run:
        conn.commit()
    conn.close()
    return {"dry_run": dry_run, "changed": len(changes), "total": len(rows), "changes": changes}


@router.get("/api/entries/{entry_id}")
def get_entry_detail(entry_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM learning_entries WHERE id = ?", (entry_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Entry not found")
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        return entry


@router.put("/api/entries/{entry_id}")
def update_entry(entry_id: int, entry: LearningEntryUpdate):
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
        cursor.execute(f"UPDATE learning_entries SET {set_clause} WHERE id = ?", values + [entry_id])
        conn.commit()
        return {"message": f"Entry {entry_id} updated", "id": entry_id, "fields_updated": list(updates.keys())}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int):
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


@router.get("/api/entries/{entry_id}/neighbors")
def get_entry_neighbors(entry_id: int, w_content: float = 0.6, w_tags: float = 0.25, w_temporal: float = 0.15):
    from services.attention_service import entries_for_attention
    with db_session() as conn:
        entries = entries_for_attention(conn)
    target = next((e for e in entries if e['id'] == entry_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Entry not found")

    def _parse(ts):
        try:
            return datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S')

    texts = [f"{e['topic']} {e.get('summary', '') or ''} {e.get('insight', '') or ''}"[:2000] for e in entries]
    try:
        emb = compute_embeddings(texts)
        from sklearn.metrics.pairwise import cosine_similarity
        all_sim = cosine_similarity(emb)
    except Exception:
        all_sim = [[0.0] * len(entries) for _ in range(len(entries))]

    target_idx = next(i for i, e in enumerate(entries) if e['id'] == entry_id)
    target_ts = _parse(target['timestamp'])
    target_tags = set(target.get('custom_tags') or [])
    all_ts = [_parse(e['timestamp']) for e in entries]
    min_ts = min(all_ts)
    max_diff = (max(all_ts) - min_ts).days or 1
    content_list, tags_list, temporal_list = [], [], []

    for i, e in enumerate(entries):
        if e['id'] == entry_id:
            continue
        c_score = float(all_sim[target_idx][i])
        other_tags = set(e.get('custom_tags') or [])
        t_score = len(target_tags & other_tags) / len(target_tags | other_tags) if target_tags and other_tags else 0.0
        tmp_score = 1.0 - (abs((target_ts - all_ts[i]).days) / max_diff)
        combined = w_content * c_score + w_tags * t_score + w_temporal * tmp_score
        reasons = []
        if c_score > 0.3:
            reasons.append(f"语义相似 {c_score*100:.0f}%")
        if t_score > 0:
            shared = target_tags & other_tags
            reasons.append(f"共享标签 {'·'.join(list(shared)[:3])}")
        if tmp_score > 0.8:
            reasons.append("邻近时间")
        if not reasons and combined > 0.1:
            reasons.append(f"综合关联 {(combined*100):.0f}%")
        item = {"id": e['id'], "topic": e['topic'], "energy": e['energy_level'], "timestamp": e['timestamp'],
                "score": round(combined, 4), "breakdown": {"content": round(c_score, 4), "tags": round(t_score, 4), "temporal": round(tmp_score, 4)}, "reasons": reasons}
        if c_score > 0.15:
            content_list.append(item)
        if t_score > 0:
            tags_list.append(item)
        temporal_list.append(item)

    content_list.sort(key=lambda x: -x['breakdown']['content'])
    tags_list.sort(key=lambda x: -x['breakdown']['tags'])
    temporal_list.sort(key=lambda x: -x['breakdown']['temporal'])

    energy_list = []
    sorted_by_time = sorted(entries, key=lambda e: _parse(e['timestamp']))
    for i, e in enumerate(sorted_by_time):
        if e['id'] == entry_id:
            if i > 0:
                prev = sorted_by_time[i - 1]
                if abs(prev['energy_level'] - target['energy_level']) >= 2:
                    d = "↑" if target['energy_level'] > prev['energy_level'] else "↓"
                    energy_list.append({"direction": d, "type": f"能量{d}{target['energy_level'] - prev['energy_level']}",
                                        "from_entry": {"id": prev['id'], "topic": prev['topic']},
                                        "to_entry": {"id": target['id'], "topic": target['topic']}})
            if i < len(sorted_by_time) - 1:
                nxt = sorted_by_time[i + 1]
                if abs(nxt['energy_level'] - target['energy_level']) >= 2:
                    d = "↑" if nxt['energy_level'] > target['energy_level'] else "↓"
                    energy_list.append({"direction": d, "type": f"能量{d}{nxt['energy_level'] - target['energy_level']}",
                                        "from_entry": {"id": target['id'], "topic": target['topic']},
                                        "to_entry": {"id": nxt['id'], "topic": nxt['topic']}})
            break

    return to_python({"entry_id": entry_id, "topic": target['topic'],
                       "neighbors": {"content": content_list[:5], "temporal": temporal_list[:5],
                                     "tags": tags_list[:5], "energy_context": energy_list}})
