import os
import sqlite3
from pathlib import Path

def cleanup_duplicates(db_path: str):
    """
    清理 learning_entries 表中的重复数据并添加唯一索引。
    保留 id 最小的记录（即最早插入的记录）。
    """
    print(f"🔍 Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Step 1: 查看重复数据统计 (基于 tag 和 内容)
        print("\n📊 Checking for duplicates (by tag & content)...")
        cursor.execute("""
            SELECT topic_tag_id, insight, COUNT(*) as cnt
            FROM learning_entries
            GROUP BY topic_tag_id, insight
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()
        
        if not duplicates:
            print("✅ No duplicates found. Database is clean.")
            return

        print(f"⚠️  Found {len(duplicates)} groups of duplicate records.")

        # Step 2: 删除重复数据 (保留 id 最小的)
        print("\n🧹 Cleaning up duplicates...")
        cursor.execute("""
            DELETE FROM learning_entries
            WHERE id NOT IN (
                SELECT min_id FROM (
                    SELECT MIN(id) as min_id
                    FROM learning_entries
                    GROUP BY topic_tag_id, insight
                ) AS tmp
            )
        """)
        deleted_count = cursor.rowcount
        print(f"✅ Deleted {deleted_count} duplicate records.")

        # Step 3: 创建联合唯一索引
        print("\n🛡️  Adding unique index to prevent future duplicates...")
        try:
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_time 
                ON learning_entries (topic, topic_tag_id, timestamp)
            """)
            print("✅ Unique index 'idx_user_topic_time' created successfully.")
        except sqlite3.OperationalError as e:
            print(f"⚠️  Index creation note: {e}")

        conn.commit()
        print("\n🎉 Cleanup completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    # 自动定位数据库路径
    home_dir = os.environ.get('HOME', '/Users/mingxilv')
    db_path = f"{home_dir}/learn/s-pay-mall-ddd/.lingma/learning-log/data/learning-log.db"
    
    if os.path.exists(db_path):
        cleanup_duplicates(db_path)
    else:
        print(f"❌ Database not found at: {db_path}")
