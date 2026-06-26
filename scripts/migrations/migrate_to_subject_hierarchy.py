"""
四级知识层级体系迁移脚本

新的层级结构：
- 第一层：学科领域（计算机科学、数学、物理、金融、法律等）
- 第二层：学科下的具体科目/技术栈（Java生态、Python生态、前端技术等）
- 第三层：具体学习主题（Spring Boot、JVM、并发编程等）
- 第四层：学习记录，带有研究类型标签（小题深研、专题探索、领域映射）

核心变化：
1. 小题深研/专题探索/领域映射不再是第一层节点，而是学习记录的标签维度
2. 第一层改为学科领域（物理、化学、计算机、生物、地理、政治、金融、法律、心理等）
3. 每个具体知识点都可以有三种不同深度的学习记录
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = 'data/learning-log.db'

def migrate_to_four_level_hierarchy():
    """执行四级层级体系迁移"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("开始四级知识层级体系迁移")
        print("=" * 60)
        
        # ==================== 第一步：创建学科领域标签（第一层） ====================
        print("\n[步骤1] 创建学科领域标签（第一层）...")
        
        discipline_tags = [
            ('cs', '计算机科学', 'discipline', None),
            ('math', '数学', 'discipline', None),
            ('physics', '物理学', 'discipline', None),
            ('chemistry', '化学', 'discipline', None),
            ('biology', '生物学', 'discipline', None),
            ('geography', '地理学', 'discipline', None),
            ('politics', '政治学', 'discipline', None),
            ('finance', '金融学', 'discipline', None),
            ('law', '法学', 'discipline', None),
            ('psychology', '心理学', 'discipline', None),
            ('economics', '经济学', 'discipline', None),
            ('medicine', '医学', 'discipline', None),
            ('history', '历史学', 'discipline', None),
            ('philosophy', '哲学', 'discipline', None),
            ('art', '艺术', 'discipline', None),
        ]
        
        for tag_id, tag_name, tag_category, parent_id in discipline_tags:
            new_id = f"cn.dolphinmind.learning.log.tag.discipline.{tag_id}"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, parent_tag_id, is_active)
                VALUES (?, ?, ?, ?, 1)
            """, (new_id, tag_name, tag_category, parent_id))
            print(f"  ✓ 创建学科标签: {tag_name} -> {new_id}")
        
        # ==================== 第二步：创建科目/技术栈标签（第二层） ====================
        print("\n[步骤2] 创建科目/技术栈标签（第二层）...")
        
        # 计算机科学下的科目
        cs_subjects = [
            ('java-eco', 'Java 生态', 'subject', 'cs'),
            ('python-eco', 'Python 生态', 'subject', 'cs'),
            ('frontend', '前端技术', 'subject', 'cs'),
            ('database', '数据库技术', 'subject', 'cs'),
            ('devops', '运维与部署', 'subject', 'cs'),
            ('ai-ml', '人工智能与机器学习', 'subject', 'cs'),
            ('architecture', '系统架构', 'subject', 'cs'),
        ]
        
        for tag_id, tag_name, tag_category, parent_discipline in cs_subjects:
            new_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.{tag_id}"
            parent_id = f"cn.dolphinmind.learning.log.tag.discipline.{parent_discipline}"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, parent_tag_id, is_active)
                VALUES (?, ?, ?, ?, 1)
            """, (new_id, tag_name, tag_category, parent_id))
            print(f"  ✓ 创建科目标签: {tag_name} -> {new_id}")
        
        # ==================== 第三步：创建学习主题标签（第三层） ====================
        print("\n[步骤3] 创建学习主题标签（第三层）...")
        
        # Java 生态下的学习主题
        java_topics = [
            ('spring-boot', 'Spring Boot', 'topic', 'java-eco'),
            ('jvm', 'JVM 虚拟机', 'topic', 'java-eco'),
            ('concurrency', '并发编程', 'topic', 'java-eco'),
            ('spring-cloud', 'Spring Cloud', 'topic', 'java-eco'),
            ('mybatis', 'MyBatis', 'topic', 'java-eco'),
            ('netty', 'Netty 网络编程', 'topic', 'java-eco'),
        ]
        
        for tag_id, tag_name, tag_category, parent_subject in java_topics:
            new_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.java-eco.{tag_id}"
            parent_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.{parent_subject}"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, parent_tag_id, is_active)
                VALUES (?, ?, ?, ?, 1)
            """, (new_id, tag_name, tag_category, parent_id))
            print(f"  ✓ 创建主题标签: {tag_name} -> {new_id}")
        
        # ==================== 第四步：迁移现有学习记录 ====================
        print("\n[步骤4] 迁移现有学习记录到新的层级结构...")
        
        # 获取现有的学习记录
        cursor.execute("SELECT id, topic, primary_tag_id FROM learning_entries")
        entries = cursor.fetchall()
        
        print(f"  找到 {len(entries)} 条学习记录")
        
        # 映射关系：旧标签 -> 新标签
        tag_migration_map = {
            # Claude Code 相关的记录 -> Java 生态 -> Spring Boot
            'cn.dolphinmind.learning.log.tag.deep-research.cs.architecture.claude-code': 
                'cn.dolphinmind.learning.log.tag.discipline.cs.java-eco.spring-boot',
            'cn.dolphinmind.learning.log.tag.deep-research': 
                'cn.dolphinmind.learning.log.tag.discipline.cs',
            'cn.dolphinmind.learning.log.tag.practice.engineering':
                'cn.dolphinmind.learning.log.tag.discipline.cs.devops',
        }
        
        for entry_id, topic, old_tag_id in entries:
            new_tag_id = tag_migration_map.get(old_tag_id, old_tag_id)
            if new_tag_id != old_tag_id:
                cursor.execute("""
                    UPDATE learning_entries 
                    SET primary_tag_id = ? 
                    WHERE id = ?
                """, (new_tag_id, entry_id))
                print(f"  ✓ 更新记录 #{entry_id}: {topic}")
                print(f"    {old_tag_id}")
                print(f"    -> {new_tag_id}")
        
        # ==================== 第五步：添加研究类型标签 ====================
        print("\n[步骤5] 添加研究类型标签（用于学习记录分类）...")
        
        research_types = [
            ('deep-research', '小题深研', 'research-type', None),
            ('topic-exploration', '专题探索', 'research-type', None),
            ('domain-mapping', '领域映射', 'research-type', None),
        ]
        
        for tag_id, tag_name, tag_category, parent_id in research_types:
            new_id = f"cn.dolphinmind.learning.log.tag.research-type.{tag_id}"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, parent_tag_id, is_active)
                VALUES (?, ?, ?, ?, 1)
            """, (new_id, tag_name, tag_category, parent_id))
            print(f"  ✓ 创建研究类型标签: {tag_name} -> {new_id}")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ 四级知识层级体系迁移完成！")
        print("=" * 60)
        print("\n新的层级结构：")
        print("  第一层：学科领域（计算机科学、数学、物理...）")
        print("  第二层：科目/技术栈（Java生态、Python生态...）")
        print("  第三层：学习主题（Spring Boot、JVM...）")
        print("  第四层：学习记录（带有小题深研/专题探索/领域映射标签）")
        print("\n请刷新浏览器查看效果！")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_to_four_level_hierarchy()
