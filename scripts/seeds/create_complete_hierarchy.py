"""
完整的四级知识层级体系设计

层级逻辑：
- 第一层：学科领域 (Discipline) - 15个核心学科
- 第二层：专业方向/技术栈 (Specialization) - 每个学科下的细分领域
- 第三层：核心概念/知识点 (Core Concepts) - 具体的技术/理论
- 第四层：学习记录 (Learning Records) - 三种研究视角

设计原则：
1. 学科领域互斥（一条记录只属于一个学科）
2. 专业方向有明确边界（不重叠）
3. 核心概念可独立学习
4. 每种研究视角都有明确的学习目标和产出
"""

import sqlite3

DB_PATH = 'data/learning-log.db'

def create_complete_knowledge_hierarchy():
    """创建完整的知识层级体系"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("创建完整的四级知识层级体系")
        print("=" * 60)
        
        # ==================== 第一层：学科领域 ====================
        print("\n[第一层] 学科领域 (Discipline)")
        disciplines = [
            ('cs', '计科', '计算机科学'),
            ('math', '数学', '数学'),
            ('physics', '物理', '物理学'),
            ('chemistry', '化学', '化学'),
            ('biology', '生物', '生物学'),
            ('geography', '地理', '地理学'),
            ('politics', '政治', '政治学'),
            ('finance', '金融', '金融学'),
            ('law', '法学', '法学'),
            ('psychology', '心理', '心理学'),
            ('economics', '经济', '经济学'),
            ('medicine', '医学', '医学'),
            ('history', '历史', '历史学'),
            ('philosophy', '哲学', '哲学'),
            ('art', '艺术', '艺术'),
        ]
        
        for code, short_name, full_name in disciplines:
            tag_id = f"cn.dolphinmind.learning.log.tag.discipline.{code}"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id, is_active)
                VALUES (?, ?, 'discipline', 1, NULL, 1)
            """, (tag_id, full_name))
            print(f"  ✓ {short_name} ({full_name})")
        
        # ==================== 第二层：计算机科学的专业方向 ====================
        print("\n[第二层] 计算机科学 - 专业方向")
        cs_specializations = [
            ('backend', '后端开发', '后端技术栈'),
            ('frontend', '前端开发', '前端技术栈'),
            ('data', '数据科学', '数据处理与分析'),
            ('devops', '运维部署', '系统运维与部署'),
            ('ai-ml', '人工智能', 'AI 与机器学习'),
            ('architecture', '系统架构', '架构设计'),
            ('security', '信息安全', '系统安全'),
            ('mobile', '移动开发', '移动端开发'),
        ]
        
        for code, short_name, full_name in cs_specializations:
            tag_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.{code}"
            parent_id = "cn.dolphinmind.learning.log.tag.discipline.cs"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id, is_active)
                VALUES (?, ?, 'specialization', 2, ?, 1)
            """, (tag_id, full_name, parent_id))
            print(f"  ✓ {short_name}")
        
        # ==================== 第三层：后端开发的核心知识点 ====================
        print("\n[第三层] 后端开发 - 核心知识点")
        backend_concepts = [
            ('java-eco', 'Java 生态', 'Java 技术栈'),
            ('python-eco', 'Python 生态', 'Python 技术栈'),
            ('database', '数据库', '数据存储与管理'),
            ('cache', '缓存系统', '高性能缓存'),
            ('mq', '消息队列', '异步消息处理'),
            ('microservices', '微服务', '分布式架构'),
            ('container', '容器化', 'Docker & K8s'),
            ('middleware', '中间件', '分布式中间件'),
        ]
        
        for code, short_name, full_name in backend_concepts:
            tag_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.backend.{code}"
            parent_id = "cn.dolphinmind.learning.log.tag.discipline.cs.backend"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id, is_active)
                VALUES (?, ?, 'knowledge', 3, ?, 1)
            """, (tag_id, full_name, parent_id))
            print(f"  ✓ {short_name}")
        
        # ==================== 第四层：Java 生态的具体技术 ====================
        print("\n[第四层] Java 生态 - 具体技术（用于学习记录关联）")
        java_technologies = [
            ('spring-boot', 'Spring Boot'),
            ('spring-cloud', 'Spring Cloud'),
            ('jvm', 'JVM 虚拟机'),
            ('concurrency', '并发编程'),
            ('mybatis', 'MyBatis'),
            ('netty', 'Netty'),
            ('dubbo', 'Dubbo'),
        ]
        
        for code, name in java_technologies:
            tag_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.backend.java-eco.{code}"
            parent_id = "cn.dolphinmind.learning.log.tag.discipline.cs.backend.java-eco"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id, is_active)
                VALUES (?, ?, 'topic', 4, ?, 1)
            """, (tag_id, name, parent_id))
            print(f"  ✓ {name}")
        
        # ==================== 数据库技术的核心知识点 ====================
        print("\n[第四层] 数据库技术 - 具体技术")
        db_technologies = [
            ('mysql', 'MySQL'),
            ('postgresql', 'PostgreSQL'),
            ('redis', 'Redis'),
            ('mongodb', 'MongoDB'),
            ('elasticsearch', 'Elasticsearch'),
        ]
        
        for code, name in db_technologies:
            tag_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.backend.database.{code}"
            parent_id = "cn.dolphinmind.learning.log.tag.discipline.cs.backend.database"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id, is_active)
                VALUES (?, ?, 'topic', 4, ?, 1)
            """, (tag_id, name, parent_id))
            print(f"  ✓ {name}")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ 完整知识层级体系创建完成！")
        print("=" * 60)
        print("\n层级结构示例：")
        print("  第一层：计科 (计算机科学)")
        print("  第二层：后端开发")
        print("  第三层：Java 生态")
        print("  第四层：Spring Boot → [小题深研/专题探索/领域映射]")
        print("\n请刷新浏览器查看效果！")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 创建失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    create_complete_knowledge_hierarchy()
