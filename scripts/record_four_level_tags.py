#!/usr/bin/env python3
"""记录四级标签体系设计的思考过程"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path

def main():
    db_path = Path(__file__).parent.parent / 'data' / 'learning-log.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 记录四级标签设计思考
    entry_data = {
        'topic': '四级标签体系设计思考',
        'insight': '''知识组织需要从扁平分类升级为层次化体系。

参考 Obsidian 文件夹结构设计四级层级：
1. **第一层：研究类型**（小题深研 / 专题探索 / 领域映射）
   - 决定学习的深度和广度
   - 小题深研：针对具体问题深入挖掘
   - 专题探索：围绕一个主题系统性探索
   - 领域映射：构建知识领域的整体认知地图

2. **第二层：学科领域**（计算机科学 / 数学 / 物理 / 经济等）
   - 知识的宏观分类
   - 每个学科有自己独特的方法论

3. **第三层：技术方法**（架构设计 / 数据库 / 框架等）
   - 学科下的具体技术领域
   - 英文术语为主，如 Spring Boot、MySQL

4. **第四层：学习记录**（record-learning 详细内容）
   - insight、analogy、transfer_pattern
   - code_example、diagram（Mermaid）
   - 这才是 learning-log 的核心价值

**类比思考**：
像图书馆分类系统：
- 第一层：大的学科门类（理学、工学）
- 第二层：具体学科（计算机科学）
- 第三层：技术领域（Web 开发）
- 第四层：具体书籍（Spring Boot 实战）

**可复用模式**：
层次化知识组织模式可应用于任何知识管理系统、文档系统、学习平台。

**数据流**：
```
graph TD
    A[第一层：研究类型] -->|双击| B[第二层：学科领域]
    B -->|双击| C[第三层：技术方法]
    C -->|点击| D[第四层：学习记录]
    
    style A fill:#a78bfa
    style B fill:#fbbf24
    style C fill:#34d399
    style D fill:#38bdf8
```

**技术实现**：
- 数据库已有 `parent_tag_id` 字段支持层级
- 需要迁移现有标签到四级结构
- 前端需要支持四级导航和面包屑
- 侧边栏需要显示层级树而非扁平列表

**ID 命名规范**：
```
cn.dolphinmind.learning.log.tag.研究类型.学科领域.技术分类.具体技术
例：cn.dolphinmind.learning.log.tag.deep-research.cs.architecture.spring-boot
```''',
        'analogy': '图书馆分类系统：学科门类→具体学科→技术领域→具体书籍',
        'transfer_pattern': '层次化知识组织模式可应用于任何知识管理系统、文档系统、学习平台',
        'code_example': '''cn.dolphinmind.learning.log.tag.deep-research.cs.architecture.spring-boot
四级结构：研究类型.学科领域.技术分类.具体技术''',
        'diagram': '''graph TD
    A[第一层：研究类型] -->|小题深研| B1[领域映射]
    A -->|专题探索| B2[专题探索]
    B1 -->|计算机科学| C1[学科领域]
    C1 -->|架构设计| D1[技术分类]
    D1 -->|Spring Boot| E1[具体技术]
    E1 --> F1[学习记录]
    
    style A fill:#a78bfa
    style B1 fill:#fbbf24
    style C1 fill:#34d399
    style D1 fill:#38bdf8''',
        'primary_tag_id': 'cn.dolphinmind.learning.log.tag.deep-research',
        'related_tag_ids': ['cn.dolphinmind.learning.log.tag.architecture.claude-code'],
        'custom_tags': ['知识管理', '层级设计', '标签体系'],
        'energy_level': 5,
        'aha_moment': 1,
        'source': 'ai-chat',
        'confidence_rating': 5,
    }
    
    cursor.execute('''
        INSERT INTO learning_entries 
        (topic, insight, analogy, transfer_pattern, code_example, diagram, 
         primary_tag_id, related_tag_ids, custom_tags, energy_level, aha_moment, 
         source, confidence_rating, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        entry_data['topic'], entry_data['insight'], entry_data['analogy'], 
        entry_data['transfer_pattern'], entry_data['code_example'], entry_data['diagram'],
        entry_data['primary_tag_id'], json.dumps(entry_data['related_tag_ids']), 
        json.dumps(entry_data['custom_tags']), entry_data['energy_level'], 
        entry_data['aha_moment'], entry_data['source'],
        entry_data['confidence_rating'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    ))
    
    entry_id = cursor.lastrowid
    
    # 添加三个顶级标签（研究类型）
    top_level_tags = [
        ('cn.dolphinmind.learning.log.tag.deep-research', '小题深研', 'deep-research', 
         '针对具体问题进行深度研究和学习'),
        ('cn.dolphinmind.learning.log.tag.topic-exploration', '专题探索', 'topic-exploration', 
         '围绕一个主题进行系统性探索'),
        ('cn.dolphinmind.learning.log.tag.domain-mapping', '领域映射', 'domain-mapping', 
         '构建知识领域的整体认知地图')
    ]
    
    for tag_id, tag_name, category, desc in top_level_tags:
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO tags 
                (tag_id, tag_name, tag_category, tag_description, parent_tag_id)
                VALUES (?, ?, ?, ?, NULL)
            ''', (tag_id, tag_name, category, desc))
            print(f'✓ 添加顶级标签: {tag_name}')
        except Exception as e:
            print(f'✗ 添加标签失败 {tag_name}: {e}')
    
    conn.commit()
    conn.close()
    
    print(f'\n✅ 四级标签体系设计思考已记录到 learning-log.db')
    print(f'   记录 ID: {entry_id}')
    print(f'   主题: {entry_data["topic"]}')
    print(f'   标签: {entry_data["primary_tag_id"]}')

if __name__ == '__main__':
    main()
