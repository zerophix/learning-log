"""
Seed All Disciplines Knowledge Hierarchy
预置全学科核心知识层级标签 (v2.0)
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def seed_all_disciplines():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 定义全学科结构: {学科代码: {学科名: {L2: {L3: [L4]}}}}
    all_disciplines = {
        "cs": {
            "name": "计科",
            "structure": {
                "后端开发": {"Java 生态": ["Spring Boot", "MyBatis", "JVM"], "数据库": ["MySQL", "PostgreSQL"]},
                "前端开发": {"框架生态": ["React", "Vue.js"], "工程化": ["Webpack", "Vite"]},
                "系统架构": {"分布式": ["CAP", "Raft"], "容器化": ["Docker", "K8s"]}
            }
        },
        "math": {
            "name": "数学",
            "structure": {
                "基础数学": {"线性代数": ["矩阵论", "特征值"], "微积分": ["极限", "导数"]},
                "概率统计": {"随机过程": ["马尔可夫链"], "数理统计": ["假设检验"]}
            }
        },
        "finance": {
            "name": "金融",
            "structure": {
                "投资银行": {"估值建模": ["DCF", "LBO"], "并购重组": ["尽职调查"]},
                "量化交易": {"策略开发": ["多因子模型"], "高频交易": ["做市策略"]}
            }
        },
        "law": {
            "name": "法学",
            "structure": {
                "民商法": {"合同法": ["违约责任"], "公司法": ["股东权利"]},
                "刑法": {"犯罪构成": ["主观要件"], "刑罚论": ["量刑情节"]}
            }
        },
        "physics": {
            "name": "物理",
            "structure": {
                "理论物理": {"量子力学": ["薛定谔方程"], "相对论": ["时空弯曲"]},
                "凝聚态": {"固体物理": ["能带理论"], "半导体": ["PN 结"]}
            }
        }
    }

    print("🌍 开始预置全学科知识层级...")
    
    for code, info in all_disciplines.items():
        disc_id = f"cn.dolphinmind.learning.log.tag.discipline.{code}"
        # 1. 创建第一层：学科领域
        cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level) VALUES (?, ?, 'discipline', 1)", 
                       (disc_id, info['name']))
        
        for l2_name, l3_map in info['structure'].items():
            # 2. 创建第二层：专业方向
            l2_id = f"{disc_id}.{l2_name}"
            cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'specialization', 2, ?)", 
                           (l2_id, l2_name, disc_id))
            
            for l3_name, l4_list in l3_map.items():
                # 3. 创建第三层：核心知识点
                l3_id = f"{l2_id}.{l3_name}"
                cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'knowledge', 3, ?)", 
                               (l3_id, l3_name, l2_id))
                
                # 4. 创建第四层：具体技术
                for l4_name in l4_list:
                    l4_id = f"{l3_id}.{l4_name}"
                    cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'topic', 4, ?)", 
                                   (l4_id, l4_name, l3_id))

    conn.commit()
    conn.close()
    print("✅ 全学科知识层级预置完成！")

if __name__ == '__main__':
    seed_all_disciplines()
