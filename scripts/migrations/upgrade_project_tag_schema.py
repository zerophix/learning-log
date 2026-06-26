"""
Database Schema Upgrade Script for Project Tags

Adds project_tag_id column to learning_entries table.
Since SQLite doesn't support ALTER TABLE ADD COLUMN with constraints easily,
we'll use the migration approach:
1. Create new table with updated schema
2. Copy data from old table
3. Drop old table
4. Rename new table
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def upgrade_schema():
    """Upgrade database schema to add project_tag_id"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("开始升级数据库结构（添加项目标签支持）")
        print("=" * 60)
        
        # Check if project_tag_id already exists
        cursor.execute("PRAGMA table_info(learning_entries)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'project_tag_id' in columns:
            print("\n✓ project_tag_id 字段已存在，跳过升级")
            return
        
        print("\n[步骤 1] 创建新表 learning_entries_new...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_entries_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT,
                
                -- Content
                topic TEXT NOT NULL,
                insight TEXT NOT NULL,
                code_example TEXT,
                diagram TEXT,
                
                -- Research Type
                research_type TEXT DEFAULT 'deep-research',
                
                -- Tag References (Multi-dimensional)
                topic_tag_id TEXT,
                project_tag_id TEXT,
                related_tag_ids TEXT DEFAULT '[]',
                custom_tags TEXT DEFAULT '[]',
                
                -- Deep Learning Fields
                analogy TEXT,
                transfer_pattern TEXT,
                energy_level INTEGER DEFAULT 3,
                aha_moment BOOLEAN DEFAULT 0,
                
                -- Metadata
                source TEXT DEFAULT 'ai-chat',
                confidence_rating INTEGER,
                reviewed BOOLEAN DEFAULT 0,
                
                FOREIGN KEY (topic_tag_id) REFERENCES tags(tag_id),
                FOREIGN KEY (project_tag_id) REFERENCES tags(tag_id)
            )
        ''')
        print("  ✓ 新表创建成功")
        
        print("\n[步骤 2] 迁移数据...")
        cursor.execute('''
            INSERT INTO learning_entries_new 
            (id, timestamp, session_id, topic, insight, code_example, diagram,
             research_type, topic_tag_id, related_tag_ids, custom_tags,
             analogy, transfer_pattern, energy_level, aha_moment,
             source, confidence_rating, reviewed)
            SELECT 
            id, timestamp, session_id, topic, insight, code_example, diagram,
             research_type, topic_tag_id, related_tag_ids, custom_tags,
             analogy, transfer_pattern, energy_level, aha_moment,
             source, confidence_rating, reviewed
            FROM learning_entries
        ''')
        rows_migrated = cursor.rowcount
        print(f"  ✓ 迁移了 {rows_migrated} 条记录")
        
        print("\n[步骤 3] 删除旧表...")
        cursor.execute('DROP TABLE learning_entries')
        print("  ✓ 旧表已删除")
        
        print("\n[步骤 4] 重命名新表...")
        cursor.execute('ALTER TABLE learning_entries_new RENAME TO learning_entries')
        print("  ✓ 表名已更新")
        
        print("\n[步骤 5] 重建索引...")
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_topic_tag ON learning_entries(topic_tag_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_project_tag ON learning_entries(project_tag_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_research_type ON learning_entries(research_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON learning_entries(timestamp)')
        print("  ✓ 索引重建完成")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ 数据库结构升级完成！")
        print("=" * 60)
        print("\n新增字段：")
        print("  - project_tag_id: 关联到项目标签（业务/源码/组件）")
        print("\n下一步：")
        print("  1. 运行 create_project_tags.py 初始化项目标签")
        print("  2. 重启后端服务")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 升级失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade_schema()
