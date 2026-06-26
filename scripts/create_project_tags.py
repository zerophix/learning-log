"""
项目标签体系迁移脚本

创建多维标签体系中的「项目维度」：
- 第一层：项目类型（业务项目、源码项目、组件项目）
- 第二层：具体项目（如 s-pay-mall-ddd、Spring 源码等）

项目标签 ID 格式：
cn.dolphinmind.learning.log.tag.project.{类型}.{项目名}

示例：
- cn.dolphinmind.learning.log.tag.project.business.s-pay-mall-ddd
- cn.dolphinmind.learning.log.tag.project.source-code.spring-framework
- cn.dolphinmind.learning.log.tag.project.component.redis-client
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def create_project_tags():
    """创建项目标签体系"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("创建项目标签体系")
        print("=" * 60)
        
        # ==================== 第一层：项目类型 ====================
        print("\n[第一层] 项目类型 (Project Types)")
        
        project_types = [
            ('business', '业务项目', '实际的业务系统'),
            ('source-code', '源码项目', '开源框架源码阅读'),
            ('component', '组件项目', '自研工具/组件'),
        ]
        
        for type_code, type_name, description in project_types:
            tag_id = f"cn.dolphinmind.learning.log.tag.project.{type_code}"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, tag_description, parent_tag_id, is_active)
                VALUES (?, ?, 'project-type', 1, ?, NULL, 1)
            """, (tag_id, type_name, description))
            print(f"  ✓ {type_name} ({type_code})")
        
        # ==================== 第二层：业务项目 ====================
        print("\n[第二层] 业务项目 (Business Projects)")
        
        business_projects = [
            ('s-pay-mall-ddd', '支付商城 DDD', '基于 DDD 架构的支付商城系统'),
            ('big-market', '大市场', '抽奖大市场系统'),
            ('lottery', '抽奖系统', '独立抽奖系统'),
            ('api-gateway', 'API 网关', '统一 API 网关服务'),
        ]
        
        for project_code, project_name, description in business_projects:
            tag_id = f"cn.dolphinmind.learning.log.tag.project.business.{project_code}"
            parent_id = "cn.dolphinmind.learning.log.tag.project.business"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, tag_description, parent_tag_id, is_active)
                VALUES (?, ?, 'project', 2, ?, ?, 1)
            """, (tag_id, project_name, description, parent_id))
            print(f"  ✓ {project_name}")
        
        # ==================== 第二层：源码项目 ====================
        print("\n[第二层] 源码项目 (Source Code Projects)")
        
        source_projects = [
            ('spring-framework', 'Spring Framework', 'Spring 框架源码（5.3.x）'),
            ('spring-boot', 'Spring Boot', 'Spring Boot 源码（2.7.x）'),
            ('mybatis', 'MyBatis', 'MyBatis ORM 框架源码'),
            ('netty', 'Netty', 'Netty 网络编程框架源码'),
            ('redisson', 'Redisson', 'Redis Java 客户端源码'),
            ('dubbo', 'Dubbo', 'Dubbo RPC 框架源码'),
            ('rocketmq', 'RocketMQ', 'RocketMQ 消息队列源码'),
            ('hikaricp', 'HikariCP', '高性能连接池源码'),
            ('tomcat', 'Tomcat', 'Tomcat Web 容器源码'),
        ]
        
        for project_code, project_name, description in source_projects:
            tag_id = f"cn.dolphinmind.learning.log.tag.project.source-code.{project_code}"
            parent_id = "cn.dolphinmind.learning.log.tag.project.source-code"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, tag_description, parent_tag_id, is_active)
                VALUES (?, ?, 'project', 2, ?, ?, 1)
            """, (tag_id, project_name, description, parent_id))
            print(f"  ✓ {project_name}")
        
        # ==================== 第二层：组件项目 ====================
        print("\n[第二层] 组件项目 (Component Projects)")
        
        component_projects = [
            ('ratelimiter-starter', '限流器 Starter', '基于 Redis 的分布式限流器'),
            ('redis-client', 'Redis 客户端', '封装的 Redis 通用客户端'),
            ('distributed-lock', '分布式锁', '基于 Redis 的分布式锁组件'),
            ('id-generator', 'ID 生成器', '分布式 ID 生成器'),
        ]
        
        for project_code, project_name, description in component_projects:
            tag_id = f"cn.dolphinmind.learning.log.tag.project.component.{project_code}"
            parent_id = "cn.dolphinmind.learning.log.tag.project.component"
            cursor.execute("""
                INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, tag_description, parent_tag_id, is_active)
                VALUES (?, ?, 'project', 2, ?, ?, 1)
            """, (tag_id, project_name, description, parent_id))
            print(f"  ✓ {project_name}")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ 项目标签体系创建完成！")
        print("=" * 60)
        print("\n项目标签结构：")
        print("  第一层：业务项目 / 源码项目 / 组件项目")
        print("  第二层：具体项目（如 s-pay-mall-ddd、Spring Framework 等）")
        print("\n使用示例：")
        print("  记录：在 s-pay-mall-ddd 中实践 Spring Boot 自动装配")
        print("  - topic_tag_id: discipline.cs.backend.java-eco.spring-boot (知识点)")
        print("  - project_tag_id: project.business.s-pay-mall-ddd (项目)")
        print("  - research_type: topic-exploration (研究类型)")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 创建失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    create_project_tags()
