#!/usr/bin/env python3
"""
Weekly Learning Report Generator
Aggregates learning entries from the last 7 days and generates a structured summary.
"""
import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')
REPORT_DIR = os.path.join(os.path.dirname(__file__), '..', 'reports', 'weekly')

def get_weekly_entries(days=7):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute("SELECT * FROM learning_entries WHERE timestamp >= ? ORDER BY timestamp DESC", (since,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def generate_report(entries):
    if not entries:
        return "📭 本周暂无新的灵感记录。"
    
    # Simple aggregation logic (AI will refine this later)
    topics = set(e['topic'] for e in entries)
    types = {}
    for e in entries:
        t = e.get('research_type', 'unknown')
        types[t] = types.get(t, 0) + 1
    
    report = f"# 📅 每周学习总结 ({datetime.now().strftime('%Y-%m-%d')})\n\n"
    report += f"## 📊 概览\n- **记录总数**: {len(entries)}\n"
    report += f"- **涉及主题**: {', '.join(topics)}\n"
    report += f"- **研究分布**: {json.dumps(types, ensure_ascii=False)}\n\n"
    
    report += "## 🧠 核心洞察 (STAR 聚合)\n"
    for e in entries[:5]: # Top 5 recent
        report += f"### {e['topic']}\n"
        report += f"- **情境**: {e.get('star_situation', 'N/A')}\n"
        report += f"- **结果**: {e.get('star_result', 'N/A')}\n\n"
        
    return report

if __name__ == '__main__':
    os.makedirs(REPORT_DIR, exist_ok=True)
    entries = get_weekly_entries()
    content = generate_report(entries)
    
    filename = f"report-{datetime.now().strftime('%Y-W%U')}.md"
    filepath = os.path.join(REPORT_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"✅ 周报已生成: {filepath}")
    print(content)
