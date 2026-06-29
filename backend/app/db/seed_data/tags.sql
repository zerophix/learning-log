-- Seed tags — INSERT OR IGNORE so safe to re-run
-- Tag prefix: cn.dolphinmind.learning.log.tag

-- base
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.base.data-structure', '数据结构', 'base', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.base.design-patterns', '设计模式', 'base', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.base.network', '计算机网络', 'base', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.base.os', '操作系统', 'base', 4);

-- language
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.language.java', 'Java', 'language', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.language.javascript', 'JavaScript', 'language', 4);

-- architecture
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.architecture.mvc', 'MVC', 'architecture', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.architecture.ddd', 'DDD', 'architecture', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.architecture.microservices', '微服务', 'architecture', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.architecture.monolith', '单体应用', 'architecture', 3);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.architecture.soa', 'SOA', 'architecture', 3);

-- framework
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.framework.spring', 'Spring', 'framework', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.framework.springboot', 'SpringBoot', 'framework', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.framework.mybatis', 'MyBatis', 'framework', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.framework.netty', 'Netty', 'framework', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.framework.dubbo', 'Dubbo', 'framework', 4);

-- database
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.database.mysql', 'MySQL', 'database', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.database.es', 'ElasticSearch', 'database', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.database.mongodb', 'MongoDB', 'database', 3);

-- cache
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.cache.redis', 'Redis', 'cache', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.cache.redisson', 'Redisson', 'cache', 4);

-- mq
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.mq.kafka', 'Kafka', 'mq', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.mq.rocketmq', 'RocketMQ', 'mq', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.mq.rabbitmq', 'RabbitMQ', 'mq', 3);

-- registry
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.registry.zookeeper', 'ZooKeeper', 'registry', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.registry.nacos', 'Nacos', 'registry', 4);

-- tool
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.tool.git', 'Git', 'tool', 5);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.tool.github', 'GitHub', 'tool', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.tool.maven', 'Maven', 'tool', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.tool.docker', 'Docker', 'tool', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.tool.k8s', 'K8S', 'tool', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.tool.jenkins', 'Jenkins', 'tool', 3);

-- monitor
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.monitor.skywalking', 'SkyWalking', 'monitor', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.monitor.prometheus', 'Prometheus', 'monitor', 4);

-- test
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.test.junit', 'JUnit', 'test', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.test.mockito', 'Mockito', 'test', 3);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.test.jmeter', 'JMeter', 'test', 3);

-- gateway
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.gateway.nginx', 'Nginx', 'gateway', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.gateway.scg', 'Spring Cloud Gateway', 'gateway', 4);

-- security
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.security.jwt', 'JWT', 'security', 4);
INSERT OR IGNORE INTO tags (tag_id, tag_name, tag_category, energy_level) VALUES ('cn.dolphinmind.learning.log.tag.security.sentinel', 'Sentinel', 'security', 4);
