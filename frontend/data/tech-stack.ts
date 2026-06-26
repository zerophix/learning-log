import { LearningEntry } from '@/types';

// 技术栈节点数据
export const techStackNodes: LearningEntry[] = [
  // ===== 基础知识 =====
  { id: 1, topic: '数据结构', path: 'base.data-structure', tags: [{ label: '基础', type: 'design' }], energy: 5, ahaMoment: true },
  { id: 2, topic: '设计模式', path: 'base.design-patterns', tags: [{ label: '基础', type: 'design' }], energy: 5, ahaMoment: true },
  { id: 3, topic: '计算机网络', path: 'base.network', tags: [{ label: '基础', type: 'visual' }], energy: 4, ahaMoment: false },
  { id: 4, topic: '操作系统', path: 'base.os', tags: [{ label: '基础', type: 'visual' }], energy: 4, ahaMoment: false },
  { id: 5, topic: '编译原理', path: 'base.compiler', tags: [{ label: '基础', type: 'visual' }], energy: 3, ahaMoment: false },
  { id: 6, topic: 'Java', path: 'lang.java', tags: [{ label: '语言', type: 'tech' }], energy: 5, ahaMoment: true },
  { id: 7, topic: 'JavaScript', path: 'lang.javascript', tags: [{ label: '语言', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 8, topic: 'React', path: 'lang.react', tags: [{ label: '前端', type: 'visual' }], energy: 4, ahaMoment: false },
  { id: 9, topic: 'Vue', path: 'lang.vue', tags: [{ label: '前端', type: 'visual' }], energy: 3, ahaMoment: false },

  // ===== 架构设计 =====
  { id: 10, topic: 'MVC', path: 'arch.mvc', tags: [{ label: '架构', type: 'arch' }], energy: 4, ahaMoment: true },
  { id: 11, topic: 'DDD', path: 'arch.ddd', tags: [{ label: '架构', type: 'arch' }], energy: 5, ahaMoment: true },
  { id: 12, topic: '微服务', path: 'arch.microservices', tags: [{ label: '架构', type: 'arch' }], energy: 5, ahaMoment: true },
  { id: 13, topic: '单体应用', path: 'arch.monolith', tags: [{ label: '架构', type: 'arch' }], energy: 3, ahaMoment: false },
  { id: 14, topic: 'SOA', path: 'arch.soa', tags: [{ label: '架构', type: 'arch' }], energy: 3, ahaMoment: false },

  // ===== 开发框架 =====
  { id: 15, topic: 'Spring', path: 'framework.spring', tags: [{ label: '框架', type: 'tech' }], energy: 5, ahaMoment: true },
  { id: 16, topic: 'SpringBoot', path: 'framework.springboot', tags: [{ label: '框架', type: 'tech' }], energy: 5, ahaMoment: true },
  { id: 17, topic: 'MyBatis', path: 'framework.mybatis', tags: [{ label: '框架', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 18, topic: 'Netty', path: 'framework.netty', tags: [{ label: '框架', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 19, topic: 'Dubbo', path: 'framework.dubbo', tags: [{ label: 'RPC', type: 'tech' }], energy: 4, ahaMoment: false },

  // ===== 数据库 =====
  { id: 20, topic: 'MySQL', path: 'db.mysql', tags: [{ label: '数据库', type: 'visual' }], energy: 5, ahaMoment: true },
  { id: 21, topic: 'Redis', path: 'db.redis', tags: [{ label: '缓存', type: 'visual' }], energy: 5, ahaMoment: true },
  { id: 22, topic: 'ElasticSearch', path: 'db.es', tags: [{ label: '搜索引擎', type: 'visual' }], energy: 4, ahaMoment: false },
  { id: 23, topic: 'MongoDB', path: 'db.mongodb', tags: [{ label: 'NoSQL', type: 'visual' }], energy: 3, ahaMoment: false },
  { id: 24, topic: 'Redisson', path: 'db.redisson', tags: [{ label: '缓存', type: 'tech' }], energy: 4, ahaMoment: false },

  // ===== 中间件 =====
  { id: 25, topic: 'Kafka', path: 'mq.kafka', tags: [{ label: '消息队列', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 26, topic: 'RocketMQ', path: 'mq.rocketmq', tags: [{ label: '消息队列', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 27, topic: 'RabbitMQ', path: 'mq.rabbitmq', tags: [{ label: '消息队列', type: 'tech' }], energy: 3, ahaMoment: false },
  { id: 28, topic: 'ZooKeeper', path: 'middleware.zk', tags: [{ label: '注册中心', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 29, topic: 'Nacos', path: 'middleware.nacos', tags: [{ label: '注册中心', type: 'tech' }], energy: 4, ahaMoment: false },

  // ===== 工程化 =====
  { id: 30, topic: 'Git', path: 'tools.git', tags: [{ label: '版本控制', type: 'design' }], energy: 5, ahaMoment: true },
  { id: 31, topic: 'GitHub', path: 'tools.github', tags: [{ label: '代码托管', type: 'design' }], energy: 4, ahaMoment: false },
  { id: 32, topic: 'Maven', path: 'tools.maven', tags: [{ label: '构建工具', type: 'design' }], energy: 4, ahaMoment: false },
  { id: 33, topic: 'Docker', path: 'tools.docker', tags: [{ label: '容器化', type: 'tech' }], energy: 4, ahaMoment: true },
  { id: 34, topic: 'K8S', path: 'tools.k8s', tags: [{ label: '容器编排', type: 'tech' }], energy: 4, ahaMoment: false },
  { id: 35, topic: 'Jenkins', path: 'tools.jenkins', tags: [{ label: 'CI/CD', type: 'tech' }], energy: 3, ahaMoment: false },

  // ===== 监控测试 =====
  { id: 36, topic: 'SkyWalking', path: 'monitor.skywalking', tags: [{ label: '监控', type: 'arch' }], energy: 4, ahaMoment: false },
  { id: 37, topic: 'Prometheus', path: 'monitor.prometheus', tags: [{ label: '监控', type: 'arch' }], energy: 4, ahaMoment: false },
  { id: 38, topic: 'JUnit', path: 'test.junit', tags: [{ label: '测试', type: 'design' }], energy: 4, ahaMoment: false },
  { id: 39, topic: 'Mockito', path: 'test.mockito', tags: [{ label: '测试', type: 'design' }], energy: 3, ahaMoment: false },
  { id: 40, topic: 'JMeter', path: 'test.jmeter', tags: [{ label: '压测', type: 'design' }], energy: 3, ahaMoment: false },

  // ===== 类库工具 =====
  { id: 41, topic: 'Guava', path: 'lib.guava', tags: [{ label: '工具类库', type: 'tech' }], energy: 3, ahaMoment: false },
  { id: 42, topic: 'Fastjson', path: 'lib.fastjson', tags: [{ label: '序列化', type: 'tech' }], energy: 3, ahaMoment: false },
  { id: 43, topic: 'Jackson', path: 'lib.jackson', tags: [{ label: '序列化', type: 'tech' }], energy: 3, ahaMoment: false },
  { id: 44, topic: 'Lombok', path: 'lib.lombok', tags: [{ label: '工具', type: 'tech' }], energy: 4, ahaMoment: false },

  // ===== 网关安全 =====
  { id: 45, topic: 'Nginx', path: 'gateway.nginx', tags: [{ label: '网关', type: 'arch' }], energy: 4, ahaMoment: false },
  { id: 46, topic: 'Spring Cloud Gateway', path: 'gateway.scg', tags: [{ label: '网关', type: 'arch' }], energy: 4, ahaMoment: false },
  { id: 47, topic: 'JWT', path: 'security.jwt', tags: [{ label: '认证', type: 'arch' }], energy: 4, ahaMoment: false },
  { id: 48, topic: 'Sentinel', path: 'security.sentinel', tags: [{ label: '限流', type: 'arch' }], energy: 4, ahaMoment: false },
];

// 技术栈关联关系
export const techStackLinks = [
  // 基础 → 语言
  { source: '1', target: '6', label: '基础支撑' },
  { source: '2', target: '6', label: '核心应用' },
  { source: '1', target: '2', label: '进阶依赖' },

  // 架构演进
  { source: '10', target: '13', label: '早期形态' },
  { source: '13', target: '14', label: '演进方向' },
  { source: '14', target: '12', label: '现代架构' },
  { source: '11', target: '12', label: '设计指导' },

  // Spring 生态
  { source: '6', target: '15', label: '主要语言' },
  { source: '15', target: '16', label: '简化升级' },
  { source: '16', target: '17', label: 'ORM 框架' },
  { source: '16', target: '19', label: 'RPC 集成' },
  { source: '15', target: '46', label: '微服务网关' },
  { source: '18', target: '16', label: '底层网络' },

  // 数据库链路
  { source: '17', target: '20', label: '数据持久化' },
  { source: '20', target: '21', label: '缓存加速' },
  { source: '21', target: '24', label: 'Java 客户端' },
  { source: '20', target: '22', label: '搜索增强' },

  // 消息队列
  { source: '25', target: '12', label: '异步解耦' },
  { source: '26', target: '12', label: '分布式事务' },
  { source: '27', target: '25', label: '替代方案' },

  // 注册中心
  { source: '28', target: '19', label: '服务发现' },
  { source: '29', target: '12', label: '配置中心' },
  { source: '29', target: '28', label: '替代方案' },

  // 工程化链路
  { source: '30', target: '31', label: '代码托管' },
  { source: '32', target: '16', label: '依赖管理' },
  { source: '33', target: '16', label: '容器部署' },
  { source: '33', target: '34', label: '编排升级' },
  { source: '35', target: '33', label: 'CI/CD 集成' },

  // 监控测试
  { source: '36', target: '12', label: '链路追踪' },
  { source: '37', target: '36', label: '指标采集' },
  { source: '38', target: '16', label: '单元测试' },
  { source: '39', target: '38', label: 'Mock 支持' },
  { source: '40', target: '46', label: '压测网关' },

  // 工具类库
  { source: '41', target: '6', label: 'Google 工具集' },
  { source: '42', target: '16', label: 'JSON 解析' },
  { source: '43', target: '16', label: 'JSON 解析' },
  { source: '42', target: '43', label: '竞品关系' },
  { source: '44', target: '16', label: '代码简化' },

  // 网关安全
  { source: '45', target: '46', label: '传统网关' },
  { source: '46', target: '12', label: '微服务入口' },
  { source: '47', target: '16', label: '认证方案' },
  { source: '48', target: '12', label: '限流熔断' },
];
