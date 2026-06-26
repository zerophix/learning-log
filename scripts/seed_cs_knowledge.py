"""
Seed Computer Science Knowledge Hierarchy
预置计科领域的核心知识层级标签
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def seed_cs_hierarchy():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 定义层级结构: (Level2_Name, Level3_Name, [Level4_Names])
    cs_structure = {
        "后端开发": {
            "Java 生态": ["Spring Boot", "MyBatis", "JVM 原理", "并发编程"],
            "数据库系统": ["MySQL", "PostgreSQL", "Oracle"],
            "缓存与存储": ["Redis", "MongoDB", "Elasticsearch"],
            "消息队列": ["Kafka", "RocketMQ", "RabbitMQ"],
            "微服务治理": ["Dubbo", "Nacos", "Sentinel", "SkyWalking"]
        },
        "前端开发": {
            "核心基础": ["HTML5", "CSS3", "JavaScript (ES6+)"],
            "框架生态": ["React", "Vue.js", "Angular", "Next.js"],
            "工程化": ["Webpack", "Vite", "TypeScript"]
        },
        "系统架构": {
            "分布式理论": ["CAP 定理", "BASE 理论", "Paxos 算法", "Raft 算法"],
            "容器与编排": ["Docker", "Kubernetes (K8s)"],
            "网关与代理": ["Nginx", "Kong", "API Gateway"]
        },
        "数据科学": {
            "机器学习": ["TensorFlow", "PyTorch", "Scikit-learn"],
            "大数据处理": ["Hadoop", "Spark", "Flink"]
        }
    }

    print("🌱 开始预置计科知识层级...")
    
    for l2_name, l3_map in cs_structure.items():
        # 1. 确保第二层（专业方向）存在
        l2_id = f"cn.dolphinmind.learning.log.tag.discipline.cs.{l2_name}"
        cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'specialization', 2, 'cn.dolphinmind.learning.log.tag.discipline.cs')", 
                       (l2_id, l2_name))
        
        for l3_name, l4_list in l3_map.items():
            # 2. 确保第三层（核心知识点）存在
            l3_id = f"{l2_id}.{l3_name}"
            cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'knowledge', 3, ?)", 
                           (l3_id, l3_name, l2_id))
            
            # 3. 确保第四层（具体技术）存在
            for l4_name in l4_list:
                l4_id = f"{l3_id}.{l4_name}"
                cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'topic', 4, ?)", 
                               (l4_id, l4_name, l3_id))
                print(f"  ✓ {l2_name} -> {l3_name} -> {l4_name}")

    conn.commit()
    conn.close()
    print("✅ 计科知识层级预置完成！")

if __name__ == '__main__':
    seed_cs_hierarchy()
