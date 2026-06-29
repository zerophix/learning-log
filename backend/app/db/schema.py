import sqlite3

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tags (
    tag_id TEXT PRIMARY KEY,
    tag_name TEXT NOT NULL,
    tag_category TEXT NOT NULL,
    tag_level INTEGER DEFAULT 1,
    tag_description TEXT,
    parent_tag_id TEXT,
    energy_level INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(tag_id)
);

CREATE TABLE IF NOT EXISTS tag_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_tag_id TEXT NOT NULL,
    target_tag_id TEXT NOT NULL,
    link_type TEXT NOT NULL,
    link_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_tag_id) REFERENCES tags(tag_id),
    FOREIGN KEY (target_tag_id) REFERENCES tags(tag_id),
    UNIQUE(source_tag_id, target_tag_id, link_type)
);

CREATE TABLE IF NOT EXISTS learning_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    topic TEXT NOT NULL,
    insight TEXT NOT NULL,
    summary TEXT,
    diagram TEXT,
    code_snippet TEXT,
    star_situation TEXT,
    star_task TEXT,
    star_action TEXT,
    star_result TEXT,
    topic_tag_id TEXT,
    project_tag_id TEXT,
    research_type TEXT DEFAULT 'deep-research',
    related_tag_ids TEXT DEFAULT '[]',
    custom_tags TEXT DEFAULT '[]',
    analogy TEXT,
    transfer_pattern TEXT,
    energy_level INTEGER DEFAULT 3,
    aha_moment BOOLEAN DEFAULT 0,
    source TEXT DEFAULT 'ai-chat',
    confidence_rating INTEGER,
    reviewed BOOLEAN DEFAULT 0,
    content_hash TEXT,
    FOREIGN KEY (topic_tag_id) REFERENCES tags(tag_id),
    FOREIGN KEY (project_tag_id) REFERENCES tags(tag_id)
);

CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nl_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_text TEXT NOT NULL,
    intent_category TEXT,
    skill_triggered TEXT,
    execution_status TEXT DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_effective BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(tag_category);
CREATE INDEX IF NOT EXISTS idx_tags_level ON tags(tag_level);
CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_source ON tag_links(source_tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_target ON tag_links(target_tag_id);
CREATE INDEX IF NOT EXISTS idx_entries_topic_tag ON learning_entries(topic_tag_id);
CREATE INDEX IF NOT EXISTS idx_entries_project_tag ON learning_entries(project_tag_id);
CREATE INDEX IF NOT EXISTS idx_entries_research_type ON learning_entries(research_type);
CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON learning_entries(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_content ON learning_entries(topic_tag_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_nl_commands_intent ON nl_commands(intent_category);
"""  # nosec


def create_tables(cursor):
    cursor.executescript(SCHEMA_SQL)
