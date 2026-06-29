#!/usr/bin/env python3
"""
Seed initial tech stack tags and links into the database
"""
import sys
sys.path.insert(0, '/Users/mingxilv/PycharmProjects/learning-log/backend')
import requests
from app.core.tag_config import TAG_PREFIX, LINK_TYPES

BACKEND_URL = "http://localhost:8002"
T = TAG_PREFIX  # shorthand

def _tid(category, name):
    return f"{T}.{category}.{name}"

def seed_tags():
    """Seed all tech stack tags"""
    tags = [
        {"tag_id": _tid("base", "data-structure"), "tag_name": "数据结构", "tag_category": "base", "energy_level": 5},
        {"tag_id": _tid("base", "design-patterns"), "tag_name": "设计模式", "tag_category": "base", "energy_level": 5},
        {"tag_id": _tid("base", "network"), "tag_name": "计算机网络", "tag_category": "base", "energy_level": 4},
        {"tag_id": _tid("base", "os"), "tag_name": "操作系统", "tag_category": "base", "energy_level": 4},
        {"tag_id": _tid("language", "java"), "tag_name": "Java", "tag_category": "language", "energy_level": 5},
        {"tag_id": _tid("language", "javascript"), "tag_name": "JavaScript", "tag_category": "language", "energy_level": 4},
        {"tag_id": _tid("architecture", "mvc"), "tag_name": "MVC", "tag_category": "architecture", "energy_level": 4},
        {"tag_id": _tid("architecture", "ddd"), "tag_name": "DDD", "tag_category": "architecture", "energy_level": 5},
        {"tag_id": _tid("architecture", "microservices"), "tag_name": "微服务", "tag_category": "architecture", "energy_level": 5},
        {"tag_id": _tid("architecture", "monolith"), "tag_name": "单体应用", "tag_category": "architecture", "energy_level": 3},
        {"tag_id": _tid("architecture", "soa"), "tag_name": "SOA", "tag_category": "architecture", "energy_level": 3},
        {"tag_id": _tid("framework", "spring"), "tag_name": "Spring", "tag_category": "framework", "energy_level": 5},
        {"tag_id": _tid("framework", "springboot"), "tag_name": "SpringBoot", "tag_category": "framework", "energy_level": 5},
        {"tag_id": _tid("framework", "mybatis"), "tag_name": "MyBatis", "tag_category": "framework", "energy_level": 4},
        {"tag_id": _tid("framework", "netty"), "tag_name": "Netty", "tag_category": "framework", "energy_level": 4},
        {"tag_id": _tid("framework", "dubbo"), "tag_name": "Dubbo", "tag_category": "framework", "energy_level": 4},
        {"tag_id": _tid("database", "mysql"), "tag_name": "MySQL", "tag_category": "database", "energy_level": 5},
        {"tag_id": _tid("cache", "redis"), "tag_name": "Redis", "tag_category": "cache", "energy_level": 5},
        {"tag_id": _tid("database", "es"), "tag_name": "ElasticSearch", "tag_category": "database", "energy_level": 4},
        {"tag_id": _tid("database", "mongodb"), "tag_name": "MongoDB", "tag_category": "database", "energy_level": 3},
        {"tag_id": _tid("cache", "redisson"), "tag_name": "Redisson", "tag_category": "cache", "energy_level": 4},
        {"tag_id": _tid("mq", "kafka"), "tag_name": "Kafka", "tag_category": "mq", "energy_level": 4},
        {"tag_id": _tid("mq", "rocketmq"), "tag_name": "RocketMQ", "tag_category": "mq", "energy_level": 4},
        {"tag_id": _tid("mq", "rabbitmq"), "tag_name": "RabbitMQ", "tag_category": "mq", "energy_level": 3},
        {"tag_id": _tid("registry", "zookeeper"), "tag_name": "ZooKeeper", "tag_category": "registry", "energy_level": 4},
        {"tag_id": _tid("registry", "nacos"), "tag_name": "Nacos", "tag_category": "registry", "energy_level": 4},
        {"tag_id": _tid("tool", "git"), "tag_name": "Git", "tag_category": "tool", "energy_level": 5},
        {"tag_id": _tid("tool", "github"), "tag_name": "GitHub", "tag_category": "tool", "energy_level": 4},
        {"tag_id": _tid("tool", "maven"), "tag_name": "Maven", "tag_category": "tool", "energy_level": 4},
        {"tag_id": _tid("tool", "docker"), "tag_name": "Docker", "tag_category": "tool", "energy_level": 4},
        {"tag_id": _tid("tool", "k8s"), "tag_name": "K8S", "tag_category": "tool", "energy_level": 4},
        {"tag_id": _tid("tool", "jenkins"), "tag_name": "Jenkins", "tag_category": "tool", "energy_level": 3},
        {"tag_id": _tid("monitor", "skywalking"), "tag_name": "SkyWalking", "tag_category": "monitor", "energy_level": 4},
        {"tag_id": _tid("monitor", "prometheus"), "tag_name": "Prometheus", "tag_category": "monitor", "energy_level": 4},
        {"tag_id": _tid("test", "junit"), "tag_name": "JUnit", "tag_category": "test", "energy_level": 4},
        {"tag_id": _tid("test", "mockito"), "tag_name": "Mockito", "tag_category": "test", "energy_level": 3},
        {"tag_id": _tid("test", "jmeter"), "tag_name": "JMeter", "tag_category": "test", "energy_level": 3},
        {"tag_id": _tid("gateway", "nginx"), "tag_name": "Nginx", "tag_category": "gateway", "energy_level": 4},
        {"tag_id": _tid("gateway", "scg"), "tag_name": "Spring Cloud Gateway", "tag_category": "gateway", "energy_level": 4},
        {"tag_id": _tid("security", "jwt"), "tag_name": "JWT", "tag_category": "security", "energy_level": 4},
        {"tag_id": _tid("security", "sentinel"), "tag_name": "Sentinel", "tag_category": "security", "energy_level": 4},
    ]
    
    created = 0
    skipped = 0
    for tag in tags:
        try:
            response = requests.post(f"{BACKEND_URL}/api/tags", json=tag, timeout=3)
            if response.status_code == 200:
                created += 1
            elif response.status_code == 409:
                skipped += 1
        except Exception as e:
            print(f"  ❌ {tag['tag_name']}: {e}")
    
    print(f"✅ 标签种子完成: 新建 {created} 个, 跳过 {skipped} 个")
    return created > 0

def seed_links():
    """Seed all tag links"""
    _l = _tid  # tag_id shorthand for links
    links = [
        {"source": _l("base", "data-structure"), "target": _l("language", "java"), "type": "prerequisite", "desc": "基础支撑"},
        {"source": _l("base", "design-patterns"), "target": _l("language", "java"), "type": "prerequisite", "desc": "核心应用"},
        {"source": _l("base", "data-structure"), "target": _l("base", "design-patterns"), "type": "prerequisite", "desc": "进阶依赖"},
        {"source": _l("architecture", "mvc"), "target": _l("architecture", "monolith"), "type": "related", "desc": "早期形态"},
        {"source": _l("architecture", "monolith"), "target": _l("architecture", "soa"), "type": "related", "desc": "演进方向"},
        {"source": _l("architecture", "soa"), "target": _l("architecture", "microservices"), "type": "related", "desc": "现代架构"},
        {"source": _l("architecture", "ddd"), "target": _l("architecture", "microservices"), "type": "prerequisite", "desc": "设计指导"},
        {"source": _l("language", "java"), "target": _l("framework", "spring"), "type": "prerequisite", "desc": "主要语言"},
        {"source": _l("framework", "spring"), "target": _l("framework", "springboot"), "type": "contains", "desc": "简化升级"},
        {"source": _l("framework", "springboot"), "target": _l("framework", "mybatis"), "type": "related", "desc": "ORM 框架"},
        {"source": _l("framework", "springboot"), "target": _l("framework", "dubbo"), "type": "related", "desc": "RPC 集成"},
        {"source": _l("framework", "spring"), "target": _l("gateway", "scg"), "type": "contains", "desc": "微服务网关"},
        {"source": _l("framework", "netty"), "target": _l("framework", "springboot"), "type": "prerequisite", "desc": "底层网络"},
        {"source": _l("framework", "mybatis"), "target": _l("database", "mysql"), "type": "related", "desc": "数据持久化"},
        {"source": _l("database", "mysql"), "target": _l("cache", "redis"), "type": "related", "desc": "缓存加速"},
        {"source": _l("cache", "redis"), "target": _l("cache", "redisson"), "type": "contains", "desc": "Java 客户端"},
        {"source": _l("database", "mysql"), "target": _l("database", "es"), "type": "related", "desc": "搜索增强"},
        {"source": _l("mq", "kafka"), "target": _l("architecture", "microservices"), "type": "related", "desc": "异步解耦"},
        {"source": _l("mq", "rocketmq"), "target": _l("architecture", "microservices"), "type": "related", "desc": "分布式事务"},
        {"source": _l("mq", "rabbitmq"), "target": _l("mq", "kafka"), "type": "alternative", "desc": "替代方案"},
        {"source": _l("registry", "zookeeper"), "target": _l("framework", "dubbo"), "type": "related", "desc": "服务发现"},
        {"source": _l("registry", "nacos"), "target": _l("architecture", "microservices"), "type": "related", "desc": "配置中心"},
        {"source": _l("registry", "nacos"), "target": _l("registry", "zookeeper"), "type": "alternative", "desc": "替代方案"},
        {"source": _l("tool", "git"), "target": _l("tool", "github"), "type": "related", "desc": "代码托管"},
        {"source": _l("tool", "maven"), "target": _l("framework", "springboot"), "type": "related", "desc": "依赖管理"},
        {"source": _l("tool", "docker"), "target": _l("framework", "springboot"), "type": "related", "desc": "容器部署"},
        {"source": _l("tool", "docker"), "target": _l("tool", "k8s"), "type": "prerequisite", "desc": "编排升级"},
        {"source": _l("tool", "jenkins"), "target": _l("tool", "docker"), "type": "related", "desc": "CI/CD 集成"},
        {"source": _l("monitor", "skywalking"), "target": _l("architecture", "microservices"), "type": "related", "desc": "链路追踪"},
        {"source": _l("monitor", "prometheus"), "target": _l("monitor", "skywalking"), "type": "related", "desc": "指标采集"},
        {"source": _l("test", "junit"), "target": _l("framework", "springboot"), "type": "related", "desc": "单元测试"},
        {"source": _l("test", "mockito"), "target": _l("test", "junit"), "type": "related", "desc": "Mock 支持"},
        {"source": _l("test", "jmeter"), "target": _l("gateway", "scg"), "type": "related", "desc": "压测网关"},
        {"source": _l("gateway", "nginx"), "target": _l("gateway", "scg"), "type": "related", "desc": "传统网关"},
        {"source": _l("gateway", "scg"), "target": _l("architecture", "microservices"), "type": "related", "desc": "微服务入口"},
        {"source": _l("security", "jwt"), "target": _l("framework", "springboot"), "type": "related", "desc": "认证方案"},
        {"source": _l("security", "sentinel"), "target": _l("architecture", "microservices"), "type": "related", "desc": "限流熔断"},
    ]
    
    created = 0
    skipped = 0
    for link in links:
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/tag-links",
                json={
                    "source_tag_id": link["source"],
                    "target_tag_id": link["target"],
                    "link_type": link["type"],
                    "link_description": link["desc"]
                },
                timeout=3
            )
            if response.status_code == 200:
                created += 1
            elif response.status_code == 409:
                skipped += 1
        except Exception as e:
            print(f"  ❌ {link['source']} → {link['target']}: {e}")
    
    print(f"✅ 关联种子完成: 新建 {created} 条, 跳过 {skipped} 条")

def check_backend():
    """检查后端服务"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except:
        return False

if __name__ == "__main__":
    print("\n🌱 开始种子数据初始化...")
    print("=" * 60)
    
    if not check_backend():
        print("❌ 后端服务未运行")
        print("请先启动: cd backend && python3 -m app.main")
        exit(1)
    
    print("\n1️⃣  正在创建标签...")
    seed_tags()
    
    print("\n2️⃣  正在创建关联...")
    seed_links()
    
    print("\n" + "=" * 60)
    print("✅ 种子数据初始化完成!")
    print("📊 访问 http://localhost:3000 查看知识图谱")
    print("=" * 60)
