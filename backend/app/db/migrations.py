import os
import sqlite3


def run_migrations(cursor):
    for col in ['summary']:
        try:
            cursor.execute(f"ALTER TABLE learning_entries ADD COLUMN {col} TEXT")
        except sqlite3.OperationalError:
            pass

    for col in ['usage_count', 'is_auto']:
        try:
            cursor.execute(f"ALTER TABLE tags ADD COLUMN {col} {'INTEGER DEFAULT 0' if col == 'usage_count' else 'BOOLEAN DEFAULT 0'}")
        except sqlite3.OperationalError:
            pass


def run_seeds(cursor):
    _dir = os.path.join(os.path.dirname(__file__), "seed_data")
    for filename in sorted(os.listdir(_dir)):
        if filename.endswith(".sql"):
            path = os.path.join(_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                sql = f.read()
            cursor.executescript(sql)
