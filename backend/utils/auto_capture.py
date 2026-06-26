#!/usr/bin/env python3
"""
Auto Learning Recorder - Scans conversation files and extracts learning entries
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / 'data' / 'learning-log.db'

# Conversation directory to scan
# LEGACY: 此脚本为旧版对话扫描器，已被 MCP watch 目录取代

def init_database():
    """Initialize database and table"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS learning_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_id TEXT,
            topic TEXT NOT NULL,
            question TEXT NOT NULL,
            insight TEXT NOT NULL,
            code_example TEXT,
            category TEXT DEFAULT 'general',
            tags TEXT DEFAULT '[]',
            project_module TEXT DEFAULT '',
            difficulty TEXT DEFAULT 'medium',
            source TEXT DEFAULT 'ai-chat',
            confidence_rating INTEGER,
            action_items TEXT DEFAULT '[]',
            related_skills TEXT DEFAULT '[]',
            reviewed BOOLEAN DEFAULT 0,
            converted_to_skill BOOLEAN DEFAULT 0,
            skill_reference TEXT
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized: {DB_PATH}")

def scan_conversation_files():
    """Scan conversation files for learning entries"""
    entries = []
    
    if not CONVERSATION_DIR.exists():
        print(f"⚠️  Conversation directory not found: {CONVERSATION_DIR}")
        return entries
    
    # Scan for recent conversation files
    for file_path in CONVERSATION_DIR.rglob('*.md'):
        if file_path.stat().st_mtime > (datetime.now().timestamp() - 86400):  # Last 24 hours
            entries.extend(extract_from_file(file_path))
    
    return entries

def extract_from_file(file_path: Path):
    """Extract learning entries from a conversation file"""
    # MVP: Simple keyword-based extraction
    # TODO: Use LLM to intelligently extract learning points
    keywords = ['技术', 'React', 'Vue', 'TypeScript', 'CSS', 'API', '数据库']
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple extraction logic (will be improved)
    entries = []
    for keyword in keywords:
        if keyword in content:
            entries.append({
                'topic': f'学习: {keyword}',
                'question': f'如何使用 {keyword}?',
                'insight': f'从对话中学习到 {keyword} 的使用方法',
                'category': 'technical',
                'tags': [keyword.lower()],
                'source': 'conversation-scan'
            })
    
    return entries

def insert_entry(entry: dict):
    """Insert a single learning entry"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if exists (based on topic + question)
        cursor.execute(
            "SELECT id FROM learning_entries WHERE topic = ? AND question = ?",
            (entry['topic'], entry['question'])
        )
        
        if cursor.fetchone():
            print(f"⏭️  Skipped (exists): {entry['topic']}")
            return False
        
        # Insert new entry
        cursor.execute('''
            INSERT INTO learning_entries 
            (timestamp, topic, question, insight, code_example, 
             category, tags, project_module, difficulty, source, reviewed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            entry['topic'],
            entry['question'],
            entry['insight'],
            entry.get('code_example'),
            entry.get('category', 'general'),
            json.dumps(entry.get('tags', [])),
            entry.get('project_module', ''),
            entry.get('difficulty', 'medium'),
            entry.get('source', 'ai-chat'),
            1  # Auto mark as reviewed
        ))
        
        conn.commit()
        print(f"✅ Recorded: {entry['topic']}")
        return True
        
    except Exception as e:
        print(f"❌ Insert failed: {e}")
        return False
    finally:
        conn.close()

def batch_insert():
    """Batch insert all extracted entries"""
    print("\n🔍 Scanning conversations for learning entries...\n")
    
    entries = scan_conversation_files()
    
    if not entries:
        print("ℹ️  No new entries found")
        return
    
    success_count = 0
    for entry in entries:
        if insert_entry(entry):
            success_count += 1
    
    print(f"\n✅ Done! Inserted {success_count}/{len(entries)} entries")

if __name__ == "__main__":
    init_database()
    batch_insert()
