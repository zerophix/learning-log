"""
数据库结构升级脚本

升级内容：
1. tags 表：新增 tag_level 字段（1:学科, 2:专业方向, 3:知识点, 4:具体技术）
2. learning_entries 表：
   - 新增 research_type 字段（deep-research/topic-exploration/domain-mapping）
   - 重命名 primary_tag_id → topic_tag_id
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def upgrade_database_schema():
    """升级数据库结构"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("开始升级数据库结构")
        print("=" * 60)
        
        # ==================== 1. 检查 tags 表是否有 tag_level 字段 ====================
        print("\n[步骤1] 检查 tags 表结构...")
        cursor.execute("PRAGMA table_info(tags)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'tag_level' not in columns:
            print("  → 添加 tag_level 字段...")
            cursor.execute("ALTER TABLE tags ADD COLUMN tag_level INTEGER DEFAULT 1")
            
            # 根据 tag_category 和 parent_tag_id 推断层级
            print("  → 根据现有数据推断层级...")
            
            # Level 1: 学科领域 (discipline 且 parent_tag_id IS NULL)
            cursor.execute("""
                UPDATE tags 
                SET tag_level = 1 
                WHERE tag_category = 'discipline' AND parent_tag_id IS NULL
            """)
            print(f"    ✓ 标记 {cursor.rowcount} 个学科领域节点 (Level 1)")
            
            # Level 2: 科目/技术栈 (subject)
            cursor.execute("""
                UPDATE tags 
                SET tag_level = 2 
                WHERE tag_category = 'subject'
            """)
            print(f"    ✓ 标记 {cursor.rowcount} 个科目节点 (Level 2)")
            
            # Level 3: 学习主题 (topic)
            cursor.execute("""
                UPDATE tags 
                SET tag_level = 3 
                WHERE tag_category = 'topic'
            """)
            print(f"    ✓ 标记 {cursor.rowcount} 个主题节点 (Level 3)")
            
            # 其他默认为 Level 2
            cursor.execute("""
                UPDATE tags 
                SET tag_level = 2 
                WHERE tag_level = 1 AND tag_category NOT IN ('discipline', 'research-type')
            """)
            print(f"    ✓ 标记 {cursor.rowcount} 个其他节点 (Level 2)")
        else:
            print("  ✓ tag_level 字段已存在，跳过")
        
        # ==================== 2. 检查 learning_entries 表 ====================
        print("\n[步骤2] 检查 learning_entries 表结构...")
        cursor.execute("PRAGMA table_info(learning_entries)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'research_type' not in columns:
            print("  → 添加 research_type 字段...")
            cursor.execute("""
                ALTER TABLE learning_entries 
                ADD COLUMN research_type TEXT DEFAULT 'deep-research'
            """)
            print(f"    ✓ 添加 research_type 字段，默认值 'deep-research'")
        
        if 'topic_tag_id' not in columns and 'primary_tag_id' in columns:
            print("  → 重命名 primary_tag_id → topic_tag_id...")
            # SQLite 不支持直接重命名列，需要重建表
            print("    ⚠ SQLite 限制：需要手动迁移数据")
            print("    → 创建新表结构...")
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learning_entries_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    session_id TEXT,
                    topic TEXT NOT NULL,
                    insight TEXT NOT NULL,
                    code_example TEXT,
                    diagram TEXT,
                    research_type TEXT DEFAULT 'deep-research',
                    topic_tag_id TEXT,
                    related_tag_ids TEXT DEFAULT '[]',
                    custom_tags TEXT DEFAULT '[]',
                    analogy TEXT,
                    transfer_pattern TEXT,
                    energy_level INTEGER DEFAULT 3,
                    aha_moment BOOLEAN DEFAULT 0,
                    source TEXT DEFAULT 'ai-chat',
                    confidence_rating INTEGER,
                    reviewed BOOLEAN DEFAULT 0,
                    FOREIGN KEY (topic_tag_id) REFERENCES tags(tag_id)
                )
            """)
            
            # 迁移数据
            print("    → 迁移现有数据...")
            cursor.execute("""
                INSERT INTO learning_entries_new 
                SELECT id, timestamp, session_id, topic, insight, code_example, diagram,
                       'deep-research', primary_tag_id, related_tag_ids, custom_tags,
                       analogy, transfer_pattern, energy_level, aha_moment, source,
                       confidence_rating, reviewed
                FROM learning_entries
            """)
            print(f"    ✓ 迁移 {cursor.rowcount} 条学习记录")
            
            # 删除旧表，重命名新表
            cursor.execute("DROP TABLE learning_entries")
            cursor.execute("ALTER TABLE learning_entries_new RENAME TO learning_entries")
            print("    ✓ 表结构升级完成")
        elif 'topic_tag_id' in columns:
            print("  ✓ topic_tag_id 字段已存在，跳过")
        
        # ==================== 3. 添加索引 ====================
        print("\n[步骤3] 创建索引...")
        
        indexes = [
            'CREATE INDEX IF NOT EXISTS idx_tags_level ON tags(tag_level)',
            'CREATE INDEX IF NOT EXISTS idx_entries_topic_tag ON learning_entries(topic_tag_id)',
            'CREATE INDEX IF NOT EXISTS idx_entries_research_type ON learning_entries(research_type)',
        ]
        
        for idx_sql in indexes:
            try:
                cursor.execute(idx_sql)
                print(f"  ✓ 创建索引成功")
            except sqlite3.OperationalError as e:
                print(f"  ⚠ 索引已存在: {e}")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ 数据库结构升级完成！")
        print("=" * 60)
        print("\n新的表结构：")
        print("  tags:")
        print("    - tag_level: 1(学科) / 2(专业方向) / 3(知识点) / 4(具体技术)")
        print("  learning_entries:")
        print("    - research_type: deep-research / topic-exploration / domain-mapping")
        print("    - topic_tag_id: 关联到具体技术节点")
        print("\n下一步：重启后端服务，运行 create_complete_hierarchy.py")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 升级失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade_database_schema()
