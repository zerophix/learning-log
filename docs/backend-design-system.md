# Learning Log 后端设计系统 · 完整参考文档

> **目标读者**：AI / 开发者。本文档完整描述后端的技术架构、数据库设计、API 规范、MCP 服务和脚本工具生态，足以让 AI 据此 1:1 复现整个后端。

---

## 一、技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| Web 框架 | **FastAPI** | 0.104.1 | REST API 服务 |
| ASGI 服务器 | **Uvicorn** | 0.24.0 | 运行 FastAPI 应用 |
| 数据库 | **SQLite** (sqlite3) | 内置 | 本地数据持久化 |
| 数据校验 | **Pydantic** | 2.5.0 | 请求/响应模型校验 |
| MCP 协议 | **mcp** | 1.0.0 | Model Context Protocol 服务端 |
| HTTP 客户端 | **requests** | 2.31.0 | 内部服务间调用 |
| 环境变量 | **python-dotenv** | 1.0.0 | .env 配置加载 |

### 完整的 `requirements.txt`

```
fastapi==0.104.1
uvicorn==0.24.0
sqlite3
requests==2.31.0
python-dotenv==1.0.0
mcp==1.0.0
pydantic==2.5.0
```

---

## 二、目录与文件结构

```
backend/
├── main.py              # ★ FastAPI 主应用（约 400 行，17 个端点）
├── db.py                # ★ 数据库初始化（4 表 + 12 索引）
├── mcp_server.py        # ★ MCP 协议服务（AI 侧面通道）
├── auto_capture.py      # 对话文件自动扫描器
├── quick_record.py      # 交互式命令行记录工具
├── seed_tags.py         # 技术栈标签种子数据
├── test_mcp.py          # MCP 功能测试脚本
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量模板
├── data/                # 数据库文件目录（运行时）
├── watch/               # MCP 监听目录（放 .md 文件自动捕获）
│   └── processed/       # 已处理的文件归档
└── __pycache__/         # Python 缓存
```

```
项目根目录/
├── backend/             # ← 后端代码
├── frontend/            # 前端代码
├── scripts/             # 18 个辅助脚本（数据迁移/种子/自动记录）
├── data/
│   └── learning-log.db  # SQLite 数据库文件（~225KB）
├── docs/                # 文档
├── reports/weekly/      # 周报输出目录
├── start.sh             # 一键启动脚本
├── deploy.sh / deploy.bat  # 部署脚本
└── venv/                # Python 虚拟环境
```

---

## 三、数据库设计

### 3.1 数据库文件

```
路径: data/learning-log.db
引擎: SQLite3
连接: sqlite3.connect(DB_PATH)
行工厂: sqlite3.Row（支持按字段名访问）
```

### 3.2 表结构

#### 表 1: `tags` — 标签定义表

```sql
CREATE TABLE tags (
    tag_id          TEXT PRIMARY KEY,           -- 反向域名标签 ID
    tag_name        TEXT NOT NULL,              -- 显示名称
    tag_category    TEXT NOT NULL,              -- 分类：discipline/subject/topic/project/research-type
    tag_level       INTEGER DEFAULT 1,          -- 层级 1-4
    tag_description TEXT,                       -- 描述
    parent_tag_id   TEXT,                       -- 父标签（自引用外键）
    energy_level    INTEGER DEFAULT 3,          -- 精力消耗 1-5
    is_active       BOOLEAN DEFAULT 1,          -- 软删除
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(tag_id)
);
```

**标签分类 (tag_category) 枚举**：

| 类别 | 含义 | tag_level | 示例 |
|------|------|-----------|------|
| `discipline` | 学科领域 | 1 | 计算机科学、数学、物理 |
| `subject` | 专业方向/技术栈 | 2 | Java 生态、Python 生态 |
| `topic` | 具体学习主题 | 3 | Spring Boot、JVM |
| `project` | 项目维度 | — | 业务项目、源码项目、组件项目 |
| `research-type` | 研究类型 | 0 (不在图谱中显示) | deep-research 等 |

#### 表 2: `tag_links` — 标签关联表

```sql
CREATE TABLE tag_links (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source_tag_id     TEXT NOT NULL,        -- 源标签
    target_tag_id     TEXT NOT NULL,        -- 目标标签
    link_type         TEXT NOT NULL,        -- 关系类型
    link_description  TEXT,                 -- 关系描述
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_tag_id) REFERENCES tags(tag_id),
    FOREIGN KEY (target_tag_id) REFERENCES tags(tag_id),
    UNIQUE(source_tag_id, target_tag_id, link_type)
);
```

**关系类型 (link_type) 枚举**：

| 类型 | 含义 | 语义 |
|------|------|------|
| `prerequisite` | 前置依赖 | A 是 B 的前置知识 |
| `alternative` | 替代方案 | A 与 B 互为替代 |
| `contains` | 包含关系 | A 包含 B |
| `related` | 相关 | A 与 B 一般相关 |

#### 表 3: `learning_entries` — 学习记录表（核心表）

```sql
CREATE TABLE learning_entries (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp         DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id        TEXT,                     -- 会话标识 (YYYYMMDD_HHMMSS)

    -- 内容核心
    topic             TEXT NOT NULL,            -- 学习主题
    insight           TEXT NOT NULL,            -- 核心洞察/分析文章（结论先行）
    diagram           TEXT,                     -- Mermaid 图示代码
    code_snippet      TEXT,                     -- 完整代码实现片段

    -- STAR 法则字段
    star_situation    TEXT,                     -- 情境：背景/触发点
    star_task         TEXT,                     -- 任务：要解决什么问题
    star_action       TEXT,                     -- 行动：方案/思路
    star_result       TEXT,                     -- 结果：结论/洞察

    -- 标签维度
    topic_tag_id      TEXT,                     -- 关联到主题标签
    project_tag_id    TEXT,                     -- 关联到项目标签
    research_type     TEXT DEFAULT 'deep-research',  -- deep-research / topic-exploration / domain-mapping
    related_tag_ids   TEXT DEFAULT '[]',        -- JSON 数组：关联标签 ID 列表
    custom_tags       TEXT DEFAULT '[]',        -- JSON 数组：自定义标签

    -- 深度学习字段
    analogy           TEXT,                     -- 生活类比
    transfer_pattern  TEXT,                     -- 可复用模式
    energy_level      INTEGER DEFAULT 3,        -- 精力消耗 1-5
    aha_moment        BOOLEAN DEFAULT 0,        -- 是否有顿悟时刻

    -- 元数据
    source            TEXT DEFAULT 'ai-chat',   -- 来源
    confidence_rating INTEGER,                  -- 信心指数
    reviewed          BOOLEAN DEFAULT 0,        -- 是否已审核
    content_hash      TEXT,                     -- SHA-256 内容哈希（去重用）

    FOREIGN KEY (topic_tag_id) REFERENCES tags(tag_id),
    FOREIGN KEY (project_tag_id) REFERENCES tags(tag_id)
);
```

#### 表 4: `nl_commands` — 自然语言命令库

```sql
CREATE TABLE nl_commands (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    command_text      TEXT NOT NULL,            -- 原始自然语言命令
    intent_category   TEXT,                     -- 意图分类 (record/query/analyze)
    skill_triggered   TEXT,                     -- 触发的 Skill 名称
    execution_status  TEXT DEFAULT 'success',   -- 执行状态
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_effective      BOOLEAN DEFAULT 1         -- 是否标记为有效/常用
);
```

### 3.3 索引设计（共 12 个）

```sql
-- 标签表索引
CREATE INDEX idx_tags_category    ON tags(tag_category);
CREATE INDEX idx_tags_level       ON tags(tag_level);
CREATE INDEX idx_tags_parent      ON tags(parent_tag_id);

-- 标签关联表索引
CREATE INDEX idx_tag_links_source ON tag_links(source_tag_id);
CREATE INDEX idx_tag_links_target ON tag_links(target_tag_id);

-- 学习记录表索引
CREATE INDEX idx_entries_topic_tag     ON learning_entries(topic_tag_id);
CREATE INDEX idx_entries_project_tag   ON learning_entries(project_tag_id);
CREATE INDEX idx_entries_research_type ON learning_entries(research_type);
CREATE INDEX idx_entries_timestamp     ON learning_entries(timestamp);

-- 去重唯一索引 ★ 关键
CREATE UNIQUE INDEX idx_unique_content
    ON learning_entries(topic_tag_id, content_hash);

-- 命令表索引
CREATE INDEX idx_nl_commands_intent ON nl_commands(intent_category);
```

### 3.4 数据库初始化函数

```python
# db.py
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning-log.db')

def init_db():
    """幂等初始化：所有 CREATE 使用 IF NOT EXISTS"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # ... 建表 + 建索引 ...
    conn.commit()
    conn.close()
```

---

## 四、标签命名体系

### 4.1 反向域名规范

```
cn.dolphinmind.learning.log.tag.{category}.{path...}.{name}
```

**完整示例**：

```
学科标签:
  cn.dolphinmind.learning.log.tag.discipline.cs
  cn.dolphinmind.learning.log.tag.discipline.math

专业方向标签:
  cn.dolphinmind.learning.log.tag.discipline.cs.backend.java-eco
  cn.dolphinmind.learning.log.tag.discipline.cs.frontend

主题标签:
  cn.dolphinmind.learning.log.tag.discipline.cs.backend.java-eco.spring-boot
  cn.dolphinmind.learning.log.tag.discipline.cs.backend.java-eco.jvm

项目标签:
  cn.dolphinmind.learning.log.tag.project.business.s-pay-mall
  cn.dolphinmind.learning.log.tag.project.source-code.spring-framework
  cn.dolphinmind.learning.log.tag.project.component.redis-client

通用标签:
  cn.dolphinmind.learning.log.tag.framework.spring
  cn.dolphinmind.learning.log.tag.database.mysql
  cn.dolphinmind.learning.log.tag.base.data-structure
```

### 4.2 四级层级体系

```
层级 1 (discipline)  → 学科领域（计算机科学、数学、物理、金融...）
    └─ 层级 2 (subject) → 专业方向（Java生态、Python生态、前端...）
        └─ 层级 3 (topic) → 学习主题（Spring Boot、JVM、React...）
            └─ 层级 4 (entry) → 学习记录（learning_entries 表中的具体记录）
```

**tag_level 计算逻辑**（在 `/api/graph` 端点的 SQL 中）：

```sql
CASE
    WHEN tag_category = 'discipline' AND parent_tag_id IS NULL THEN 1
    WHEN tag_category = 'subject' THEN 2
    WHEN tag_category = 'topic' THEN 3
    WHEN tag_category = 'research-type' THEN 0   -- 不在图谱中显示
    ELSE 2
END as level
```

---

## 五、Pydantic 模型定义

### 5.1 TagCreate — 创建标签

```python
class TagCreate(BaseModel):
    tag_id: str                              # 完整反向域名 ID
    tag_name: str                            # 显示名称
    tag_category: str                        # 分类枚举值
    tag_description: Optional[str] = None
    parent_tag_id: Optional[str] = None
    energy_level: int = 3                    # 1-5
```

### 5.2 TagLinkCreate — 创建标签关联

```python
class TagLinkCreate(BaseModel):
    source_tag_id: str
    target_tag_id: str
    link_type: str                           # prerequisite/alternative/contains/related
    link_description: Optional[str] = None
```

### 5.3 LearningEntryCreate — 创建学习记录（★ 核心）

```python
class LearningEntryCreate(BaseModel):
    # 核心内容
    topic: str                               # 学习主题
    insight: str                             # 核心洞察（结论先行，可长文）
    diagram: Optional[str] = None            # Mermaid 图示
    code_snippet: Optional[str] = None       # 代码实现

    # STAR 法则（全部必填）
    star_situation: str                      # 情境
    star_task: str                           # 任务
    star_action: str                         # 行动
    star_result: str                         # 结果

    # 标签维度
    topic_tag_id: Optional[str] = None       # 主题标签
    project_tag_id: Optional[str] = None      # 项目标签
    research_type: str = "deep-research"     # 研究类型
    related_tag_ids: List[str] = []          # 关联标签
    custom_tags: List[str] = []              # 自定义标签

    # 深度学习
    analogy: Optional[str] = None            # 生活类比
    transfer_pattern: Optional[str] = None   # 可复用模式
    energy_level: int = 3                    # 精力 1-5
    aha_moment: bool = False                 # 顿悟时刻
    source: str = "ai-chat"                  # 来源
    confidence_rating: Optional[int] = None  # 信心指数
```

### 5.4 NLCommandCreate — 自然语言命令

```python
class NLCommandCreate(BaseModel):
    command_text: str
    intent_category: Optional[str] = None
    skill_triggered: Optional[str] = None
    execution_status: str = "success"
    is_effective: bool = True
```

---

## 六、API 端点完整规格

**Base URL**: `http://localhost:8002`

### 6.1 标签管理

#### `POST /api/tags` — 创建标签

```
Request Body:  TagCreate
Response 200: {"message": "Tag created: ...", "tag_id": "..."}
Response 409: {"detail": "Tag already exists: ..."}   # 幂等保护
Response 500: {"detail": "..."}
```

**实现逻辑**：
1. 先 `SELECT` 检查 tag_id 是否已存在 → 409
2. `INSERT INTO tags (...)` → 200
3. 异常回滚 → 500

#### `GET /api/tags` — 列出标签

```
Query Params:  category (可选) — 按 tag_category 过滤
Response 200: [{tag_id, tag_name, tag_category, tag_level, ...}]
            只返回 is_active=1 的标签
            默认按 tag_category, tag_name 排序
```

#### `GET /api/tags/tree` — 标签层级树

```
Response 200: [{tag_id, tag_name, ..., children: [...]}]
```

**构建算法**：
```python
tag_map = {t['tag_id']: {**t, 'children': []} for t in all_tags}
for tag in all_tags:
    if tag['parent_tag_id'] and tag['parent_tag_id'] in tag_map:
        tag_map[tag['parent_tag_id']]['children'].append(tag_map[tag['tag_id']])
    elif not tag['parent_tag_id']:
        tree.append(tag_map[tag['tag_id']])     # 根节点
```

#### `GET /api/tags/{tag_id}/entries` — 按标签查记录

```
Path Params:   tag_id — 主题标签 ID
Query Params:  research_type (可选) — 研究类型过滤
Response 200: [Entry, ...]  按 timestamp DESC 排序
```

### 6.2 标签关联

#### `POST /api/tag-links` — 创建关联

```
Request Body:  TagLinkCreate
Response 200: {"message": "Link created: A → B"}
Response 409: {"detail": "Link already exists"}  # UNIQUE 约束
```

#### `GET /api/tag-links` — 列出关联

```
Query Params:  source_tag_id (可选) — 按源标签过滤
Response 200: [{id, source_tag_id, target_tag_id, link_type, link_description}]
```

### 6.3 学习记录（核心 CRUD）

#### `POST /api/entries` — 创建学习记录

```
Request Body:  LearningEntryCreate
Response 200: {"id": N, "message": "Entry created", "session_id": "20260408_143022"}
Response 400: {"detail": "Topic tag not found: ..."}
Response 409: {"detail": "Duplicate entry detected..."}
```

**实现逻辑（严格校验 + 幂等保护）**：

```python
# 1. 外键校验
if entry.topic_tag_id:
    cursor.execute("SELECT tag_id FROM tags WHERE tag_id = ?", ...)
    if not found → 400

if entry.project_tag_id:
    cursor.execute("SELECT tag_id FROM tags WHERE tag_id = ?", ...)
    if not found → 400

# 2. 生成 session_id 和 content_hash
session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
content_hash = hashlib.sha256(entry.insight.encode('utf-8')).hexdigest()

# 3. 幂等性检查（topic + topic_tag_id）
cursor.execute('SELECT id FROM learning_entries WHERE topic = ? AND topic_tag_id = ? LIMIT 1', ...)
if found → 200 {"status": "skipped"}   # 不报错，静默跳过

# 4. 时间戳由后端统一控制（不使用客户端时间）
current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# 5. INSERT 22 个字段，其中 related_tag_ids 和 custom_tags 用 json.dumps 序列化
# 6. 捕获 IntegrityError → 若涉及 idx_unique_content → 409
```

#### `GET /api/entries` — 列表查询（分页）

```
Query Params:  limit=50, offset=0
Response 200: [{id, topic, insight, diagram, star_*, topic_tag_id, ...}]
            按 timestamp DESC 排序
            自动反序列化 related_tag_ids 和 custom_tags (json.loads)
```

#### `GET /api/entries/{entry_id}` — 单条详情

```
Path Params:   entry_id (int)
Response 200: {id, topic, insight, ...}
Response 404: {"detail": "Entry not found"}
```

#### `GET /api/entries/feed` — Feed 流（多维度筛选）

```
Query Params:
  limit=50, offset=0
  project_type   (可选) — business / source-code / component
  discipline     (可选) — cs / math / physics / finance / law
  research_type  (可选) — deep-research / topic-exploration / domain-mapping

筛选逻辑:
  project_type → project_tag_id LIKE 'cn.dolphinmind.learning.log.tag.project.{type}.%'
  discipline   → topic_tag_id LIKE '%.discipline.{code}.%'
  research_type → research_type = ?

多条件 AND 连接，无条件时 WHERE 1=1
响应: 按 timestamp DESC 排序
```

### 6.4 图谱数据

#### `GET /api/graph` — 图谱节点 + 连线

```
Response 200: {
    "nodes": [
        {id, name, category, value, parent_tag_id, level}
    ],
    "links": [
        {source, target, label}
    ]
}

节点: 所有 is_active=1 且 tag_category != 'research-type' 的标签
     level 通过 CASE WHEN 计算（见 §4.2）
连线: tag_links 表所有记录
     source → source_tag_id, target → target_tag_id, label → link_type
```

### 6.5 统计

#### `GET /api/stats` — 基础统计

```
Response 200: {
    "entries": N,   -- 总学习记录数
    "tags": N,      -- 活跃标签数
    "links": N      -- 标签关联数
}
```

### 6.6 项目维度

#### `GET /api/projects` — 项目列表

```
Query Params:  project_type (可选) — business / source-code / component
Response 200: [{tag_id, tag_name, ...}]

逻辑:
  有 project_type → 查 parent_tag_id = 'cn.dolphinmind.learning.log.tag.project.{type}'
  无 project_type → 查 tag_category = 'project'
```

#### `GET /api/projects/{project_id}/entries` — 按项目查记录

```
Path Params:   project_id — 完整 ID 或类型前缀 (business/source-code/component)
Query Params:  research_type (可选)

逻辑:
  project_id 在 [business, source-code, component] 中 → 前缀 LIKE 匹配
  否则 → 精确 = 匹配
```

### 6.7 自然语言命令

#### `POST /api/nl-commands` — 记录命令

```
Request Body:  NLCommandCreate
Response 200: {"id": N, "message": "NL Command recorded"}
```

#### `GET /api/nl-commands` — 命令列表

```
Query Params:  limit=50, offset=0, intent_category (可选)
Response 200: [{id, command_text, intent_category, ...}]
```

---

## 七、API 端点速查表

| # | 方法 | 路径 | 用途 | 关键参数 |
|---|------|------|------|----------|
| 1 | POST | `/api/tags` | 创建标签 | body: TagCreate |
| 2 | GET | `/api/tags` | 标签列表 | `?category=` |
| 3 | GET | `/api/tags/tree` | 标签树 | — |
| 4 | POST | `/api/tag-links` | 创建关联 | body: TagLinkCreate |
| 5 | GET | `/api/tag-links` | 关联列表 | `?source_tag_id=` |
| 6 | POST | `/api/entries` | 创建记录 ★ | body: LearningEntryCreate (22字段) |
| 7 | GET | `/api/entries` | 记录列表 | `?limit=&offset=` |
| 8 | GET | `/api/entries/{id}` | 记录详情 | path: id |
| 9 | GET | `/api/entries/feed` | Feed 流 | `?project_type=&discipline=&research_type=` |
| 10 | GET | `/api/graph` | 图谱数据 | — |
| 11 | GET | `/api/stats` | 统计 | — |
| 12 | GET | `/api/projects` | 项目列表 | `?project_type=` |
| 13 | GET | `/api/projects/{id}/entries` | 按项目查记录 | `?research_type=` |
| 14 | GET | `/api/tags/{tag_id}/entries` | 按标签查记录 | `?research_type=` |
| 15 | POST | `/api/nl-commands` | 记录命令 | body: NLCommandCreate |
| 16 | GET | `/api/nl-commands` | 命令列表 | `?limit=&offset=&intent_category=` |

---

## 八、通用模式与约定

### 8.1 数据库连接管理

```python
def get_db():
    """每次请求新建连接，使用完毕后关闭"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # 支持 row['field_name'] 访问
    return conn

def row_to_dict(row):
    """sqlite3.Row → dict 转换"""
    if row is None:
        return None
    return dict(row)

# 每个端点中的使用模式：
conn = get_db()
cursor = conn.cursor()
try:
    cursor.execute(...)
    conn.commit()
    return ...
except ...:
    conn.rollback()
    raise HTTPException(...)
finally:
    conn.close()
```

### 8.2 JSON 序列化/反序列化

```python
# 存储时：Python list → JSON string
json.dumps(entry.related_tag_ids)   # → '["id1", "id2"]'
json.dumps(entry.custom_tags)       # → '["tag1", "tag2"]'

# 读取时：JSON string → Python list
entry['related_tag_ids'] = json.loads(entry['related_tag_ids']) if entry['related_tag_ids'] else []
entry['custom_tags'] = json.loads(entry['custom_tags']) if entry['custom_tags'] else []
```

### 8.3 去重策略（双层保护）

```
第一层 — 应用层幂等:
  SELECT ... WHERE topic = ? AND topic_tag_id = ?
  存在 → 返回 {"status": "skipped"}

第二层 — 数据库唯一索引:
  UNIQUE INDEX idx_unique_content ON learning_entries(topic_tag_id, content_hash)
  冲突 → 捕获 IntegrityError → 409
```

### 8.4 CORS 配置

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # 开发阶段全开放
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 8.5 FastAPI 应用配置

```python
app = FastAPI(title="Learning Log API", version="2.0.0")

# 启动方式：
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
```

---

## 九、MCP 服务设计

### 9.1 概述

MCP (Model Context Protocol) 服务是一个独立进程，通过 stdio 与 AI 客户端通信，提供学习内容的自动捕获能力。

```
文件: backend/mcp_server.py
启动: python3 mcp_server.py
协议: MCP stdio
服务名: "learning-log-mcp"
```

### 9.2 配置（.env）

```env
BACKEND_URL=http://localhost:8002
AI_API_URL=http://localhost:11434/api/generate    # Ollama 示例
AI_MODEL=qwen2.5
```

### 9.3 注册的工具

```python
@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="capture_learning",
            description="Capture and analyze a learning session...",
            inputSchema={
                "type": "object",
                "properties": {
                    "raw_content": {"type": "string", "description": "Raw learning content"},
                    "source": {"type": "string", "default": "ai-chat"}
                },
                "required": ["raw_content"]
            }
        ),
        Tool(
            name="batch_capture",
            description="Batch process multiple learning entries...",
            inputSchema={
                "type": "object",
                "properties": {
                    "entries": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["entries"]
            }
        )
    ]
```

### 9.4 工具执行流程

#### `capture_learning` 流程：

```
1. 接收 raw_content + source
      │
      ▼
2. call_ai_for_analysis(raw_content)
   ├─ 构建中文 prompt（提取 topic/insight/category/tags/...）
   ├─ POST → AI_API_URL (Ollama / OpenAI)
   ├─ 解析响应中的 JSON（容错：查找第一个 { 到最后一个 }）
   └─ 失败 → 使用 get_default_entry() 兜底
      │
      ▼
3. save_to_backend(entry_data)
   ├─ POST → BACKEND_URL/api/entries
   └─ 返回 entry_id 或 -1
      │
      ▼
4. 返回格式化的中文结果消息
```

#### AI 分析 Prompt 模板：

```
你是一个学习记录分析助手。请从以下原始学习内容中提取结构化信息，返回 JSON 格式：

原始内容：
{raw_content}

请提取以下字段（用中文回答）：
- topic: 学习主题（简短标题，10字以内）
- question: 核心问题或需求
- insight: 关键洞察或解决方案要点
- category: 分类（technical/design/debug/architecture/interview/general）
- tags: 标签列表（3-5个关键词）
- project_module: 相关项目模块
- difficulty: 难度（easy/medium/hard）
- action_items: 后续行动项列表
- related_skills: 相关技能名称列表

只返回 JSON，不要其他文字。
```

### 9.5 定时任务 — `scheduled_capture()`

```python
async def scheduled_capture():
    """每 30 分钟检查 watch 目录"""
    while True:
        watch_dir = os.path.join(os.path.dirname(__file__), 'watch')
        if os.path.exists(watch_dir):
            for filename in os.listdir(watch_dir):
                if filename.endswith('.md'):
                    # 1. 读取文件内容
                    # 2. call_ai_for_analysis(content)
                    # 3. save_to_backend(entry_data)
                    # 4. 移动到 watch/processed/
        await asyncio.sleep(1800)   # 30 分钟
```

### 9.6 启动入口

```python
async def main():
    asyncio.create_task(scheduled_capture())    # 后台定时任务
    
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream, write_stream,
            server.create_initialization_options()
        )
```

---

## 十、辅助工具服务

### 10.1 `auto_capture.py` — 对话文件自动扫描

```
扫描目录: ~/.lingma/agents/
文件类型: *.md
时间窗口: 最近 24 小时
提取方式: 关键词匹配 (MVP 阶段)
目标表: learning_entries (使用旧版 schema)
```

```python
def scan_conversation_files():
    for file_path in CONVERSATION_DIR.rglob('*.md'):
        if file_path.stat().st_mtime > (now - 86400):
            entries.extend(extract_from_file(file_path))

def extract_from_file(file_path):
    keywords = ['技术', 'React', 'Vue', 'TypeScript', 'CSS', 'API', '数据库']
    for keyword in keywords:
        if keyword in content:
            entries.append({...})   # 简单模板生成
```

### 10.2 `quick_record.py` — 交互式命令行记录

```
功能:
  1. 检查后端状态
  2. 显示已有标签（按分类分组）
  3. 交互式输入：
     - 主题、洞察（支持多行）
     - 生活类比、可迁移模式
     - 精力消耗 (1-5)
     - 顿悟标记 (y/n)
     - 标签分类选择（14 种）
     - 主标签 + 关联标签
  4. 自动 find_or_create_tag()
  5. 确认后 save_entry()

标签分类选项:
  1.framework  2.database  3.middleware  4.base  5.language
  6.architecture  7.tool  8.cache  9.mq  10.gateway
  11.security  12.monitor  13.test  14.other
```

### 10.3 `seed_tags.py` — 标签种子数据

```
标签: 41 个技术栈标签 (base/language/framework/database/cache/mq/registry/tool/monitor/test/gateway/security)
关联: 37 条标签关系
调用: POST /api/tags + POST /api/tag-links
幂等: 自动跳过已存在的 (捕获 409)
```

### 10.4 `test_mcp.py` — MCP 功能测试

```
测试流程:
  1. test_create_entry() → POST /api/entries
  2. test_get_entry(id)  → GET /api/entries/{id}
  3. test_stats()        → GET /api/stats
```

---

## 十一、脚本生态系统 (`scripts/`)

共 **18 个脚本**，按功能分为 4 类：

### 11.1 数据迁移脚本（5 个）

| 脚本 | 作用 |
|------|------|
| `migrate_to_subject_hierarchy.py` | 迁移到四级学科层级体系 |
| `migrate_four_level_hierarchy.py` | 四级层级结构迁移 |
| `upgrade_database_schema.py` | 升级数据库 schema（新增 tag_level 字段） |
| `upgrade_project_tag_schema.py` | 新增 project_tag_id 列 |
| `add_content_hash_migration.py` | 新增 content_hash 列用于去重 |

### 11.2 种子数据脚本（5 个）

| 脚本 | 作用 |
|------|------|
| `seed_all_disciplines.py` | 预置全学科核心知识层级标签 v2.0 |
| `seed_comprehensive_knowledge.py` | 全学科高密度知识层级标签 v3.0 |
| `seed_cs_knowledge.py` | 预置计科领域的核心知识层级 |
| `create_complete_hierarchy.py` | 完整的四级知识层级体系设计 |
| `create_project_tags.py` | 项目维度标签体系迁移 |

### 11.3 自动记录脚本（4 个）

| 脚本 | 作用 |
|------|------|
| `auto_record.py` | STAR 法则版自动记录 v6.0 |
| `run_record.py` | 单条记录提交 |
| `run_record_v9.py` | 基于决策框架的记录 v9 |
| `record_four_level_tags.py` | 记录四级标签体系设计 |

### 11.4 分析/工具脚本（4 个）

| 脚本 | 作用 |
|------|------|
| `generate_weekly_report.py` | 周报生成（聚合最近 7 天记录） |
| `context_manager.py` | 上下文断点管理（保存/恢复对话状态） |
| `cleanup_duplicates.py` | 重复记录清理 |
| `temp_record_analysis.py` | 临时记录分析 |

---

## 十二、启动与部署

### 12.1 本地开发启动

#### 方式 A：一键启动 (`start.sh`)

```bash
#!/bin/bash
# 1. 检查 python3 / node
# 2. 创建/激活 venv
# 3. 安装 pip 依赖 (fastapi, uvicorn)
# 4. cd frontend && npm install
# 5. 启动前端 (npm run dev, port 3000)  — 后台
# 6. 启动后端 (python3 main.py, port 8002) — 后台
# 7. open http://localhost:3000
# 8. trap INT TERM → 清理两个进程
```

#### 方式 B：手动启动

```bash
# 终端 1 — 后端
cd backend
source ../venv/bin/activate
python3 main.py
# → Uvicorn running on http://0.0.0.0:8002

# 终端 2 — 前端
cd frontend
npm run dev
# → Next.js running on http://localhost:3000

# 终端 3 — MCP 服务（可选）
cd backend
source ../venv/bin/activate
python3 mcp_server.py
```

### 12.2 部署脚本

```bash
# deploy.sh / deploy.bat
# 构建前端 (npm run build)
# 使用 production 模式启动
```

### 12.3 环境变量

```env
# .env (backend/)
BACKEND_URL=http://localhost:8002
AI_API_URL=http://localhost:11434/api/generate
AI_MODEL=qwen2.5
```

---

## 十三、数据安全与幂等设计

| 层级 | 机制 | 实现 |
|------|------|------|
| 标签创建 | tag_id 主键冲突 | 409 响应，不覆盖 |
| 关联创建 | UNIQUE(source, target, link_type) | 409 响应，不重复 |
| 记录创建 | 应用层 topic+topic_tag 检查 | 200 + status:"skipped" |
| 记录创建 | 数据库 UNIQUE(topic_tag_id, content_hash) | 409 响应 |
| 内容哈希 | SHA-256 of insight | 用于去重，不可逆 |
| 时间戳 | 后端统一生成 | 防止客户端时钟偏差 |
| 外键校验 | 写入前 SELECT 检查 | 400 + 明确错误信息 |

---

## 十四、关键设计决策

| 决策 | 理由 |
|------|------|
| **SQLite** 而非 PostgreSQL | 单用户本地使用，零配置，数据库文件可直接备份 |
| **反向域名标签 ID** | 全局唯一、自描述、支持层级解析、可做前缀查询 |
| **JSON 字符串存数组** | SQLite 无数组类型，json.dumps/loads 序列化 |
| **STAR 法则强制** | 保证每条记录的结构化质量 |
| **双重去重** | 应用层幂等 + 数据库唯一索引，防止重复录入 |
| **MCP 侧面通道** | AI 可在对话中直接调用工具录入，无需切换上下文 |
| **定时扫描 watch 目录** | 支持离线/文件系统触发的内容捕获 |
| **后端统一时间戳** | 确保时间线顺序一致，消除客户端时钟偏差 |
| **content_hash 去重** | 基于内容而非 ID，防止相同洞察的重复记录 |
| **软删除 (is_active)** | 标签支持停用而非物理删除，保护历史数据引用完整性 |

---

## 十五、复现检查清单

1. **环境准备**: Python 3.10+, `python3 -m venv venv && source venv/bin/activate`
2. **安装依赖**: `pip install fastapi==0.104.1 uvicorn==0.24.0 requests==2.31.0 python-dotenv==1.0.0 mcp==1.0.0 pydantic==2.5.0`
3. **创建文件**:
   - `backend/db.py` — 复制 §3.2 四个建表语句 + §3.3 十二个索引
   - `backend/main.py` — 复制 §五 Pydantic 模型 + §六 全部端点
   - `backend/mcp_server.py` — 复制 §九 MCP 服务
   - `backend/.env` — 复制 §12.3 环境变量
4. **初始化数据库**: `python3 -c "from db import init_db; init_db()"`
5. **种子数据**: `python3 seed_tags.py`（需后端已启动）
6. **启动后端**: `python3 main.py` → 验证 `curl http://localhost:8002/api/stats`
7. **启动 MCP** (可选): `python3 mcp_server.py`
8. **验证**: `python3 test_mcp.py` → 3 个测试全部通过

---

## 十六、数据流全景图

```
┌──────────────────────────────────────────────────────────┐
│                     数据输入通道                          │
│                                                          │
│  [前端表单]     [MCP capture_learning]    [watch/*.md]   │
│  EntryForm.tsx   AI 对话中调用             定时扫描        │
│      │               │                       │           │
│      ▼               ▼                       ▼           │
│  POST /api/entries  call_ai_for_analysis   auto_capture  │
│      │               │                       │           │
│      └───────────────┼───────────────────────┘           │
│                      ▼                                   │
│              POST /api/entries                            │
│                      │                                   │
│      ┌───────────────┼───────────────┐                   │
│      ▼               ▼               ▼                   │
│  外键校验       幂等检查        SHA-256 哈希              │
│      │               │               │                   │
│      └───────────────┼───────────────┘                   │
│                      ▼                                   │
│              INSERT INTO learning_entries                 │
│                      │                                   │
│                      ▼                                   │
│              SQLite (learning-log.db)                     │
│                      │                                   │
│      ┌───────────────┼───────────────┐                   │
│      ▼               ▼               ▼                   │
│  GET /api/      GET /api/       GET /api/                │
│  entries        entries/feed    graph                    │
│      │               │               │                   │
│      ▼               ▼               ▼                   │
│  [时间线视图]   [Feed 筛选]     [ECharts 图谱]            │
└──────────────────────────────────────────────────────────┘
```
