"""
Database initialization and configuration.
Re-exports DB_PATH and init_db for backward-compatible imports.
"""
import os
import sqlite3

from db.schema import create_tables
from db.migrations import run_migrations

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'learning-log.db')


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
