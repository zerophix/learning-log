#!/usr/bin/env python3
"""
Seed initial tech stack tags and links into the database
"""
import requests

BACKEND_URL = "http://localhost:8002"

def seed_tags():
    """Seed all tech stack tags"""
    tags = [
        {"tag_id": "cn.dolphinmind.learning.log.tag.base.data-structure", "tag_name": "数据结构", "tag_category": "base", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.base.design-patterns", "tag_name": "设计模式", "tag_category": "base", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.base.network", "tag_name": "计算机网络", "tag_category": "base", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.base.os", "tag_name": "操作系统", "tag_category": "base", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.language.java", "tag_name": "Java", "tag_category": "language", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.language.javascript", "tag_name": "JavaScript", "tag_category": "language", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.architecture.mvc", "tag_name": "MVC", "tag_category": "architecture", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.architecture.ddd", "tag_name": "DDD", "tag_category": "architecture", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.architecture.microservices", "tag_name": "微服务", "tag_category": "architecture", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.architecture.monolith", "tag_name": "单体应用", "tag_category": "architecture", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.architecture.soa", "tag_name": "SOA", "tag_category": "architecture", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.framework.spring", "tag_name": "Spring", "tag_category": "framework", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.framework.springboot", "tag_name": "SpringBoot", "tag_category": "framework", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.framework.mybatis", "tag_name": "MyBatis", "tag_category": "framework", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.framework.netty", "tag_name": "Netty", "tag_category": "framework", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.framework.dubbo", "tag_name": "Dubbo", "tag_category": "framework", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.database.mysql", "tag_name": "MySQL", "tag_category": "database", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.cache.redis", "tag_name": "Redis", "tag_category": "cache", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.database.es", "tag_name": "ElasticSearch", "tag_category": "database", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.database.mongodb", "tag_name": "MongoDB", "tag_category": "database", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.cache.redisson", "tag_name": "Redisson", "tag_category": "cache", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.mq.kafka", "tag_name": "Kafka", "tag_category": "mq", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.mq.rocketmq", "tag_name": "RocketMQ", "tag_category": "mq", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.mq.rabbitmq", "tag_name": "RabbitMQ", "tag_category": "mq", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.registry.zookeeper", "tag_name": "ZooKeeper", "tag_category": "registry", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.registry.nacos", "tag_name": "Nacos", "tag_category": "registry", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.tool.git", "tag_name": "Git", "tag_category": "tool", "energy_level": 5},
        {"tag_id": "cn.dolphinmind.learning.log.tag.tool.github", "tag_name": "GitHub", "tag_category": "tool", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.tool.maven", "tag_name": "Maven", "tag_category": "tool", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.tool.docker", "tag_name": "Docker", "tag_category": "tool", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.tool.k8s", "tag_name": "K8S", "tag_category": "tool", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.tool.jenkins", "tag_name": "Jenkins", "tag_category": "tool", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.monitor.skywalking", "tag_name": "SkyWalking", "tag_category": "monitor", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.monitor.prometheus", "tag_name": "Prometheus", "tag_category": "monitor", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.test.junit", "tag_name": "JUnit", "tag_category": "test", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.test.mockito", "tag_name": "Mockito", "tag_category": "test", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.test.jmeter", "tag_name": "JMeter", "tag_category": "test", "energy_level": 3},
        {"tag_id": "cn.dolphinmind.learning.log.tag.gateway.nginx", "tag_name": "Nginx", "tag_category": "gateway", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.gateway.scg", "tag_name": "Spring Cloud Gateway", "tag_category": "gateway", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.security.jwt", "tag_name": "JWT", "tag_category": "security", "energy_level": 4},
        {"tag_id": "cn.dolphinmind.learning.log.tag.security.sentinel", "tag_name": "Sentinel", "tag_category": "security", "energy_level": 4},
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
    links = [
        {"source": "cn.dolphinmind.learning.log.tag.base.data-structure", "target": "cn.dolphinmind.learning.log.tag.language.java", "type": "prerequisite", "desc": "基础支撑"},
        {"source": "cn.dolphinmind.learning.log.tag.base.design-patterns", "target": "cn.dolphinmind.learning.log.tag.language.java", "type": "prerequisite", "desc": "核心应用"},
        {"source": "cn.dolphinmind.learning.log.tag.base.data-structure", "target": "cn.dolphinmind.learning.log.tag.base.design-patterns", "type": "prerequisite", "desc": "进阶依赖"},
        {"source": "cn.dolphinmind.learning.log.tag.architecture.mvc", "target": "cn.dolphinmind.learning.log.tag.architecture.monolith", "type": "related", "desc": "早期形态"},
        {"source": "cn.dolphinmind.learning.log.tag.architecture.monolith", "target": "cn.dolphinmind.learning.log.tag.architecture.soa", "type": "related", "desc": "演进方向"},
        {"source": "cn.dolphinmind.learning.log.tag.architecture.soa", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "现代架构"},
        {"source": "cn.dolphinmind.learning.log.tag.architecture.ddd", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "prerequisite", "desc": "设计指导"},
        {"source": "cn.dolphinmind.learning.log.tag.language.java", "target": "cn.dolphinmind.learning.log.tag.framework.spring", "type": "prerequisite", "desc": "主要语言"},
        {"source": "cn.dolphinmind.learning.log.tag.framework.spring", "target": "cn.dolphinmind.learning.log.tag.framework.springboot", "type": "contains", "desc": "简化升级"},
        {"source": "cn.dolphinmind.learning.log.tag.framework.springboot", "target": "cn.dolphinmind.learning.log.tag.framework.mybatis", "type": "related", "desc": "ORM 框架"},
        {"source": "cn.dolphinmind.learning.log.tag.framework.springboot", "target": "cn.dolphinmind.learning.log.tag.framework.dubbo", "type": "related", "desc": "RPC 集成"},
        {"source": "cn.dolphinmind.learning.log.tag.framework.spring", "target": "cn.dolphinmind.learning.log.tag.gateway.scg", "type": "contains", "desc": "微服务网关"},
        {"source": "cn.dolphinmind.learning.log.tag.framework.netty", "target": "cn.dolphinmind.learning.log.tag.framework.springboot", "type": "prerequisite", "desc": "底层网络"},
        {"source": "cn.dolphinmind.learning.log.tag.framework.mybatis", "target": "cn.dolphinmind.learning.log.tag.database.mysql", "type": "related", "desc": "数据持久化"},
        {"source": "cn.dolphinmind.learning.log.tag.database.mysql", "target": "cn.dolphinmind.learning.log.tag.cache.redis", "type": "related", "desc": "缓存加速"},
        {"source": "cn.dolphinmind.learning.log.tag.cache.redis", "target": "cn.dolphinmind.learning.log.tag.cache.redisson", "type": "contains", "desc": "Java 客户端"},
        {"source": "cn.dolphinmind.learning.log.tag.database.mysql", "target": "cn.dolphinmind.learning.log.tag.database.es", "type": "related", "desc": "搜索增强"},
        {"source": "cn.dolphinmind.learning.log.tag.mq.kafka", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "异步解耦"},
        {"source": "cn.dolphinmind.learning.log.tag.mq.rocketmq", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "分布式事务"},
        {"source": "cn.dolphinmind.learning.log.tag.mq.rabbitmq", "target": "cn.dolphinmind.learning.log.tag.mq.kafka", "type": "alternative", "desc": "替代方案"},
        {"source": "cn.dolphinmind.learning.log.tag.registry.zookeeper", "target": "cn.dolphinmind.learning.log.tag.framework.dubbo", "type": "related", "desc": "服务发现"},
        {"source": "cn.dolphinmind.learning.log.tag.registry.nacos", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "配置中心"},
        {"source": "cn.dolphinmind.learning.log.tag.registry.nacos", "target": "cn.dolphinmind.learning.log.tag.registry.zookeeper", "type": "alternative", "desc": "替代方案"},
        {"source": "cn.dolphinmind.learning.log.tag.tool.git", "target": "cn.dolphinmind.learning.log.tag.tool.github", "type": "related", "desc": "代码托管"},
        {"source": "cn.dolphinmind.learning.log.tag.tool.maven", "target": "cn.dolphinmind.learning.log.tag.framework.springboot", "type": "related", "desc": "依赖管理"},
        {"source": "cn.dolphinmind.learning.log.tag.tool.docker", "target": "cn.dolphinmind.learning.log.tag.framework.springboot", "type": "related", "desc": "容器部署"},
        {"source": "cn.dolphinmind.learning.log.tag.tool.docker", "target": "cn.dolphinmind.learning.log.tag.tool.k8s", "type": "prerequisite", "desc": "编排升级"},
        {"source": "cn.dolphinmind.learning.log.tag.tool.jenkins", "target": "cn.dolphinmind.learning.log.tag.tool.docker", "type": "related", "desc": "CI/CD 集成"},
        {"source": "cn.dolphinmind.learning.log.tag.monitor.skywalking", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "链路追踪"},
        {"source": "cn.dolphinmind.learning.log.tag.monitor.prometheus", "target": "cn.dolphinmind.learning.log.tag.monitor.skywalking", "type": "related", "desc": "指标采集"},
        {"source": "cn.dolphinmind.learning.log.tag.test.junit", "target": "cn.dolphinmind.learning.log.tag.framework.springboot", "type": "related", "desc": "单元测试"},
        {"source": "cn.dolphinmind.learning.log.tag.test.mockito", "target": "cn.dolphinmind.learning.log.tag.test.junit", "type": "related", "desc": "Mock 支持"},
        {"source": "cn.dolphinmind.learning.log.tag.test.jmeter", "target": "cn.dolphinmind.learning.log.tag.gateway.scg", "type": "related", "desc": "压测网关"},
        {"source": "cn.dolphinmind.learning.log.tag.gateway.nginx", "target": "cn.dolphinmind.learning.log.tag.gateway.scg", "type": "related", "desc": "传统网关"},
        {"source": "cn.dolphinmind.learning.log.tag.gateway.scg", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "微服务入口"},
        {"source": "cn.dolphinmind.learning.log.tag.security.jwt", "target": "cn.dolphinmind.learning.log.tag.framework.springboot", "type": "related", "desc": "认证方案"},
        {"source": "cn.dolphinmind.learning.log.tag.security.sentinel", "target": "cn.dolphinmind.learning.log.tag.architecture.microservices", "type": "related", "desc": "限流熔断"},
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
        print("请先启动: cd backend && python3 main.py")
        exit(1)
    
    print("\n1️⃣  正在创建标签...")
    seed_tags()
    
    print("\n2️⃣  正在创建关联...")
    seed_links()
    
    print("\n" + "=" * 60)
    print("✅ 种子数据初始化完成!")
    print("📊 访问 http://localhost:3000 查看知识图谱")
    print("=" * 60)
