"""
Migration: Add content_hash to learning_entries for efficient deduplication
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Check if column already exists
        cursor.execute("PRAGMA table_info(learning_entries)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'content_hash' not in columns:
            print("🔧 Adding 'content_hash' column...")
            cursor.execute("ALTER TABLE learning_entries ADD COLUMN content_hash TEXT")
            
            # 2. Populate existing records with hash (SHA-256 of insight)
            import hashlib
            cursor.execute("SELECT id, insight FROM learning_entries WHERE content_hash IS NULL")
            rows = cursor.fetchall()
            
            for row_id, insight in rows:
                content_hash = hashlib.sha256(insight.encode('utf-8')).hexdigest()
                cursor.execute("UPDATE learning_entries SET content_hash = ? WHERE id = ?", (content_hash, row_id))
            
            print(f"✅ Populated {len(rows)} existing records with content hashes.")
        else:
            print("ℹ️  'content_hash' column already exists.")

        # 3. Create unique index on (topic_tag_id, content_hash)
        print("🛡️  Creating unique index 'idx_unique_content'...")
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_content 
            ON learning_entries (topic_tag_id, content_hash)
        """)

        conn.commit()
        print("🎉 Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
