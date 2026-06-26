"""
Seed Comprehensive Knowledge Hierarchy (v3.0)
预置全学科高密度知识层级标签
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def seed_comprehensive():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 高密度结构定义
    comprehensive_data = {
        "cs": {
            "name": "计科",
            "structure": {
                "后端开发": {
                    "Java 生态": ["Spring Boot", "MyBatis", "JVM 调优", "Netty", "Dubbo", "Guava"],
                    "数据库系统": ["MySQL 索引", "PostgreSQL", "Oracle PL/SQL", "MongoDB", "TiDB"],
                    "缓存与存储": ["Redis 持久化", "Memcached", "LevelDB", "RocksDB"],
                    "消息中间件": ["Kafka 架构", "RocketMQ 事务", "RabbitMQ 路由", "Pulsar"]
                },
                "前端开发": {
                    "现代框架": ["React Hooks", "Vue3 响应式", "Angular DI", "Svelte 编译"],
                    "移动跨平台": ["Flutter Widget", "React Native Bridge", "Uni-app"],
                    "工程化体系": ["Webpack Loader", "Vite Plugin", "TypeScript 泛型", "Babel"]
                },
                "人工智能": {
                    "深度学习": ["CNN 卷积", "RNN 循环", "Transformer 注意力", "GAN 对抗"],
                    "大语言模型": ["LLM 微调", "RAG 检索增强", "Prompt 工程", "LangChain"]
                },
                "系统架构": {
                    "分布式理论": ["CAP 定理", "Raft 共识", "Paxos 算法", "Gossip 协议"],
                    "云原生技术": ["Docker 镜像", "K8s Pod", "Istio 服务网格", "Helm Chart"]
                }
            }
        },
        "math": {
            "name": "数学",
            "structure": {
                "基础数学": {
                    "线性代数": ["矩阵分解", "特征值与特征向量", "SVD 奇异值分解", "张量运算"],
                    "抽象代数": ["群论", "环论", "域论", "伽罗瓦理论"]
                },
                "分析学": {
                    "实变函数": ["测度论", "Lebesgue 积分", "收敛定理"],
                    "复变函数": ["柯西积分", "留数定理", "共形映射"]
                },
                "概率统计": {
                    "随机过程": ["马尔可夫链", "布朗运动", "泊松过程"],
                    "数理统计": ["假设检验", "贝叶斯推断", "极大似然估计"]
                }
            }
        },
        "finance": {
            "name": "金融",
            "structure": {
                "投资银行": {
                    "估值建模": ["DCF 现金流折现", "LBO 杠杆收购", "可比公司分析"],
                    "并购重组": ["尽职调查", "协同效应", "反垄断审查"]
                },
                "量化金融": {
                    "衍生品定价": ["Black-Scholes 模型", "希腊字母对冲", "二叉树模型"],
                    "风险管理": ["VaR 风险价值", "压力测试", "流动性风险"]
                }
            }
        },
        "law": {
            "name": "法学",
            "structure": {
                "民商法": {
                    "合同法": ["违约责任", "缔约过失", "格式条款", "情势变更"],
                    "公司法": ["股东权利", "公司治理", "揭开公司面纱", "股权激励"]
                },
                "知识产权": {
                    "专利法": ["新颖性", "创造性", "实用性", "权利要求书"],
                    "著作权法": ["合理使用", "法定许可", "信息网络传播权"]
                }
            }
        },
        "physics": {
            "name": "物理",
            "structure": {
                "理论物理": {
                    "量子力学": ["薛定谔方程", "海森堡不确定性", "量子纠缠", "自旋"],
                    "相对论": ["狭义相对论", "广义相对论", "时空弯曲", "引力透镜"]
                },
                "凝聚态物理": {
                    "固体物理": ["能带理论", "晶格振动", "半导体 PN 结", "超导现象"]
                }
            }
        }
    }

    print("🚀 开始预置高密度全学科知识层级...")
    count = 0
    
    for code, info in comprehensive_data.items():
        disc_id = f"cn.dolphinmind.learning.log.tag.discipline.{code}"
        cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level) VALUES (?, ?, 'discipline', 1)", 
                       (disc_id, info['name']))
        
        for l2_name, l3_map in info['structure'].items():
            l2_id = f"{disc_id}.{l2_name}"
            cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'specialization', 2, ?)", 
                           (l2_id, l2_name, disc_id))
            
            for l3_name, l4_list in l3_map.items():
                l3_id = f"{l2_id}.{l3_name}"
                cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'knowledge', 3, ?)", 
                               (l3_id, l3_name, l2_id))
                
                for l4_name in l4_list:
                    l4_id = f"{l3_id}.{l4_name}"
                    cursor.execute("INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, tag_level, parent_tag_id) VALUES (?, ?, 'topic', 4, ?)", 
                                   (l4_id, l4_name, l3_id))
                    count += 1

    conn.commit()
    conn.close()
    print(f"✅ 高密度知识层级预置完成！共新增 {count} 个具体技术/理论节点。")

if __name__ == '__main__':
    seed_comprehensive()
