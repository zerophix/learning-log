"""
Learning Log Database Initialization
SQLite-based storage for AI interaction learning records with tag system
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def init_db():
    """Initialize the learning log database with tag system"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # ========================================
    # Tag Definition Table (标签定义表)
    # ========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            tag_id TEXT PRIMARY KEY,           -- e.g., cn.dolphinmind.learning.log.tag.discipline.cs.backend.java-eco.spring-boot
            tag_name TEXT NOT NULL,            -- Display name: Spring Boot
            tag_category TEXT NOT NULL,        -- Category: discipline, specialization, knowledge, topic
            tag_level INTEGER DEFAULT 1,       -- ★★★ 新增：层级 (1:学科, 2:专业方向, 3:知识点, 4:具体技术)
            tag_description TEXT,              -- Description of this tag
            parent_tag_id TEXT,                -- Parent tag for hierarchy (nullable)
            energy_level INTEGER DEFAULT 3,    -- 1-5: Difficulty/Energy required
            is_active BOOLEAN DEFAULT 1,       -- Soft delete support
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_tag_id) REFERENCES tags(tag_id)
        )
    ''')
    
    # ========================================
    # Tag Links Table (标签关联表)
    # ========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tag_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_tag_id TEXT NOT NULL,       -- Source tag
            target_tag_id TEXT NOT NULL,       -- Target tag
            link_type TEXT NOT NULL,           -- Relationship type: prerequisite, alternative, contains, related
            link_description TEXT,             -- Description of the relationship
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_tag_id) REFERENCES tags(tag_id),
            FOREIGN KEY (target_tag_id) REFERENCES tags(tag_id),
            UNIQUE(source_tag_id, target_tag_id, link_type)
        )
    ''')
    
    # ========================================
    # Learning Entries Table (学习记录表)
    # ========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS learning_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_id TEXT,
            
            -- Content
            topic TEXT NOT NULL,
            insight TEXT NOT NULL,           -- 核心洞察/分析文章（结论先行，可长文）
            summary TEXT,                    -- AI 提取的摘要（预览用途，降级截断 insight）
            diagram TEXT,                    -- Mermaid 图示（可选，适合时配图）
            code_snippet TEXT,               -- 完整代码实现片段
            
            -- ★★★★★ STAR 法则字段 ★★★★★
            star_situation TEXT,             -- 情境：背景是什么？触发点？
            star_task TEXT,                  -- 任务：要解决什么问题？
            star_action TEXT,                -- 行动：采取了什么方案/思路？
            star_result TEXT,                -- 结果：得出什么结论/洞察？
            
            -- 标签维度
            topic_tag_id TEXT,               -- 关联到主题标签
            project_tag_id TEXT,             -- 关联到项目标签
            research_type TEXT DEFAULT 'deep-research',  -- deep-research / topic-exploration / domain-mapping
            related_tag_ids TEXT DEFAULT '[]',
            custom_tags TEXT DEFAULT '[]',
            
            -- 深度学习字段
            analogy TEXT,                    -- 生活类比
            transfer_pattern TEXT,           -- 可复用模式
            energy_level INTEGER DEFAULT 3,  -- 1-5 能量消耗
            aha_moment BOOLEAN DEFAULT 0,
            
            -- 元数据
            source TEXT DEFAULT 'ai-chat',
            confidence_rating INTEGER,
            reviewed BOOLEAN DEFAULT 0,
            content_hash TEXT,             -- SHA-256 hash of insight for deduplication

            FOREIGN KEY (topic_tag_id) REFERENCES tags(tag_id),
            FOREIGN KEY (project_tag_id) REFERENCES tags(tag_id)
        )
    ''')
    
    # ========================================
    # Natural Language Commands Table (自然语言命令库)
    # ========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS nl_commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command_text TEXT NOT NULL,      -- 原始自然语言命令
            intent_category TEXT,            -- 意图分类 (e.g., record, query, analyze)
            skill_triggered TEXT,            -- 触发的 Skill (e.g., record-skill-v9)
            execution_status TEXT DEFAULT 'success', -- success, failed
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_effective BOOLEAN DEFAULT 1   -- 是否被标记为有效/常用
        )
    ''')
    
    # ========================================
    # Indexes
    # ========================================
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(tag_category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_tags_level ON tags(tag_level)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_tag_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_tag_links_source ON tag_links(source_tag_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_tag_links_target ON tag_links(target_tag_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_topic_tag ON learning_entries(topic_tag_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_project_tag ON learning_entries(project_tag_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_research_type ON learning_entries(research_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON learning_entries(timestamp)')
    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_content ON learning_entries(topic_tag_id, content_hash)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_nl_commands_intent ON nl_commands(intent_category)')
    
    # ── Migration: 为已有数据库添加新字段 ──
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

    conn.commit()
    conn.close()
    
    print(f"✅ Learning Log database initialized at: {DB_PATH}")
    return DB_PATH

if __name__ == '__main__':
    init_db()
