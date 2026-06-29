import json
import sqlite3
from contextlib import contextmanager
from fastapi import HTTPException
from app.db import DB_PATH


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_session():
    conn = get_db()
    try:
        yield conn
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def parse_entry_rows(rows: list) -> list:
    entries = []
    for row in rows:
        entry = row_to_dict(row)
        entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
        entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
        entries.append(entry)
    return entries
