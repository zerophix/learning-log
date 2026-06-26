#!/usr/bin/env python3
"""
迁移现有标签到四级层级结构

四级结构：
1. 研究类型（deep-research / topic-exploration / domain-mapping）
2. 学科领域（cs / math / physics / economy 等）
3. 技术分类（architecture / database / framework 等）
4. 具体技术（spring-boot / mysql / docker 等）
"""
import sqlite3
from pathlib import Path

# 现有分类到四级结构的映射
CATEGORY_MAPPING = {
    # 技术类 -> 计算机科学学科
    'architecture': ('cs', '计算机科学', '架构设计'),
    'framework': ('cs', '计算机科学', '应用框架'),
    'database': ('cs', '计算机科学', '数据存储'),
    'cache': ('cs', '计算机科学', '缓存体系'),
    'mq': ('cs', '计算机科学', '消息队列'),
    'registry': ('cs', '计算机科学', '注册配置'),
    'gateway': ('cs', '计算机科学', '网关入口'),
    'security': ('cs', '计算机科学', '安全防护'),
    'monitor': ('cs', '计算机科学', '监控运维'),
    'language': ('cs', '计算机科学', '编程语言'),
    'tool': ('cs', '计算机科学', '开发工具'),
    'test': ('cs', '计算机科学', '测试质量'),
    # 基础类
    'base': ('cs', '计算机科学', '基础核心'),
    # 实践类
    'practice': ('cs', '计算机科学', '工程实践'),
}

# 学科领域的中文名称
DISCIPLINE_NAMES = {
    'cs': '计算机科学',
    'math': '数学',
    'physics': '物理',
    'chemistry': '化学',
    'biology': '生物',
    'economy': '经济',
    'law': '法律',
    'history': '历史',
    'politics': '政治',
    'language_study': '语言学',
    'ai': '人工智能',
}

def migrate_tags():
    db_path = Path(__file__).parent.parent / 'data' / 'learning-log.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("🔄 开始迁移标签到四级层级结构...\n")
    
    # 1. 创建学科领域标签（如果不存在）
    disciplines = set()
    for old_cat, (discipline, _, _) in CATEGORY_MAPPING.items():
        disciplines.add(discipline)
    
    for disc_id in disciplines:
        disc_name = DISCIPLINE_NAMES.get(disc_id, disc_id)
        tag_id = f"cn.dolphinmind.learning.log.tag.deep-research.{disc_id}"
        
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO tags 
                (tag_id, tag_name, tag_category, parent_tag_id)
                VALUES (?, ?, ?, ?)
            ''', (tag_id, disc_name, 'discipline', 
                  'cn.dolphinmind.learning.log.tag.deep-research'))
            print(f"✓ 添加学科领域: {disc_name}")
        except Exception as e:
            print(f"✗ 添加学科失败 {disc_name}: {e}")
    
    conn.commit()
    
    # 2. 更新现有标签的层级关系
    print("\n📦 重新组织现有标签...")
    
    cursor.execute("SELECT tag_id, tag_name, tag_category FROM tags WHERE tag_category NOT IN ('deep-research', 'topic-exploration', 'domain-mapping', 'discipline') AND is_active=1")
    old_tags = cursor.fetchall()
    
    migrated_count = 0
    for old_tag_id, old_name, old_category in old_tags:
        if old_category in CATEGORY_MAPPING:
            discipline, disc_name, tech_category = CATEGORY_MAPPING[old_category]
            
            # 构造新的四级 ID
            # 例: cn.dolphinmind.learning.log.tag.deep-research.cs.architecture.spring-boot
            parts = old_tag_id.split('.')
            tech_name = parts[-1] if parts else old_name.lower().replace(' ', '-')
            
            new_tag_id = f"cn.dolphinmind.learning.log.tag.deep-research.{discipline}.{old_category}.{tech_name}"
            parent_tag_id = f"cn.dolphinmind.learning.log.tag.deep-research.{discipline}"
            
            try:
                # 检查新标签是否已存在
                cursor.execute("SELECT COUNT(*) FROM tags WHERE tag_id=?", (new_tag_id,))
                if cursor.fetchone()[0] == 0:
                    # 创建新标签
                    cursor.execute('''
                        INSERT INTO tags (tag_id, tag_name, tag_category, parent_tag_id, energy_level)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (new_tag_id, old_name, old_category, parent_tag_id, 3))
                    
                    # 更新 learning_entries 中的引用
                    cursor.execute('''
                        UPDATE learning_entries 
                        SET primary_tag_id = ?
                        WHERE primary_tag_id = ?
                    ''', (new_tag_id, old_tag_id))
                    
                    print(f"  ✓ {old_name}: {old_category} → {tech_category}")
                    migrated_count += 1
                else:
                    print(f"  ⊙ {old_name}: 已存在，跳过")
            except Exception as e:
                print(f"  ✗ {old_name}: 迁移失败 - {e}")
    
    conn.commit()
    
    print(f"\n✅ 迁移完成！")
    print(f"   迁移标签数: {migrated_count}")
    print(f"   总标签数: {len(old_tags)}")
    
    # 3. 统计各层级标签数量
    print("\n📊 层级统计:")
    cursor.execute('''
        SELECT 
            CASE 
                WHEN tag_id LIKE '%.deep-research' AND tag_id NOT LIKE '%.%' THEN '第一层：研究类型'
                WHEN tag_category = 'discipline' THEN '第二层：学科领域'
                WHEN parent_tag_id IS NOT NULL AND parent_tag_id LIKE '%.deep-research.%' 
                     AND tag_id NOT LIKE '%.%.%.%' THEN '第三层：技术分类'
                WHEN tag_id LIKE '%.%.%.%' THEN '第四层：具体技术'
                ELSE '其他'
            END as level,
            COUNT(*) as count
        FROM tags
        WHERE is_active=1
        GROUP BY level
        ORDER BY level
    ''')
    
    for level, count in cursor.fetchall():
        print(f"   {level}: {count} 个标签")
    
    conn.close()
    
    print("\n💡 下一步:")
    print("   1. 重启后端服务: cd backend && python3 main.py")
    print("   2. 刷新前端页面查看四级层级结构")
    print("   3. 测试双击下钻流程")

if __name__ == '__main__':
    migrate_tags()
