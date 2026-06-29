"""
Database initialization and configuration.
Re-exports DB_PATH and init_db for backward-compatible imports.
"""
import os
import sqlite3

from app.core.config import DB_PATH
from app.db.schema import create_tables
from app.db.migrations import run_migrations


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    create_tables(cursor)
    run_migrations(cursor)
    conn.commit()
    conn.close()
    print(f"✅ Learning Log database initialized at: {DB_PATH}")
    return DB_PATH
