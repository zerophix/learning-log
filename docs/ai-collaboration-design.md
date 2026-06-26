# Learning Log 与 AI 协作机制 · 完整参考文档

> **目标读者**：AI / 开发者。本文档完整描述 Learning Log 系统与 AI（Claude Code）的协作架构、触发机制、数据流和协议设计，足以让 AI 据此理解并复原完整的"人机协作学习"工作流。

---

## 一、协作总览

```
┌─────────────────────────────────────────────────────────────┐
│                     用户 (Human)                            │
│  "帮我深入分析 Spring Boot 的自动配置原理"                    │
│  "记录一下"  "/记录"  "/服务"  "回到刚才的话题"               │
└────────┬────────────────────────────────────────────────────┘
         │ 自然语言交互
         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Claude Code (AI 主引擎)                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ 对话理解  │  │ 深度分析  │  │ Skill 系统│  │ MCP 客户端  │ │
│  │          │  │ STAR/     │  │ 记录      │  │ 连接 MCP   │ │
│  │          │  │ 第一原理  │  │ 状态      │  │ Server     │ │
│  │          │  │ CIDED     │  │ 灵感/服务  │  │            │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────┬─────┘ │
└────────────────────────────────────────────────────┼────────┘
                                                     │
                    ┌────────────────────────────────┘
                    │  MCP Protocol (stdio/JSON-RPC)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Server (learning-log-mcp)                   │
│                                                             │
│  capture_learning(raw_content) → AI分析 → 入库               │
│  batch_capture(entries[])      → 批量处理 → 入库              │
│  scheduled_capture()           → 定时扫描 watch/*.md         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (localhost:8002)                │
│                                                             │
│  POST   /api/entries       ← 学习记录入库                     │
│  GET    /api/entries       → 前端可视化                       │
│  GET    /api/entries/{id}  → 单条详情                         │
│  PUT    /api/entries/{id}  → 部分更新（字段级）               │
│  DELETE /api/entries/{id}  → 删除记录                         │
│  GET    /api/graph         → ECharts 知识图谱                 │
└─────────────────────────────────────────────────────────────┘
                         ▲
┌────────────────────────┴────────────────────────────────────┐
│              launchd (macOS 进程管理 — 开机自启)              │
│                                                             │
│  com.learning-log.backend   →  保活 FastAPI :8002            │
│  com.learning-log.frontend  →  保活 Next.js :3000            │
│  关闭 IDE / 终端不受影响，崩溃自动重启                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、三条 AI 协作通道

系统设计了 **三条互补通道** 让 AI 参与学习记录：

### 通道对比

| 通道 | 触发方式 | 延迟 | 适用场景 |
|------|---------|------|----------|
| **① MCP 工具调用** | AI 对话中自动调用 `capture_learning` | 实时 | 对话中产生洞察，AI 主动捕获 |
| **② Skill 脚本执行** | 用户 `/记录` 命令 → AI 构造 JSON → CLI 调用 | 近实时 | 用户明确要求记录当前讨论 |
| **③ 文件系统监听** | 将 `.md` 丢入 `watch/` 目录 | 最长 30 分钟 | 离线笔记、外部内容导入 |

### 通道 ①：MCP 工具调用（深度集成）

```
用户对话 → AI 识别到值得记录的内容
              │
              ▼
         AI 调用 MCP Tool: capture_learning
         {
           "raw_content": "完整的对话片段或分析文本...",
           "source": "ai-chat"
         }
              │
              ▼
         MCP Server 接收
              │
              ├─ call_ai_for_analysis(raw_content)
              │    ├─ 构造中文分析 Prompt
              │    ├─ POST → Ollama/OpenAI
              │    └─ 解析 JSON 响应（提取 topic/insight/category/tags...）
              │
              ├─ save_to_backend(analyzed_data)
              │    └─ POST → http://localhost:8002/api/entries
              │
              └─ 返回结果给 AI → AI 告知用户 "✅ 学习记录已保存"
```

**MCP 工具注册（给 AI 客户端看的）**：

```python
# mcp_server.py 中注册的工具
Tool(
    name="capture_learning",
    description="Capture and analyze a learning session, automatically extract key information and save to database",
    inputSchema={
        "type": "object",
        "properties": {
            "raw_content": {
                "type": "string",
                "description": "Raw learning content or conversation transcript"
            },
            "source": {
                "type": "string",
                "default": "ai-chat"
            }
        },
        "required": ["raw_content"]
    }
)
```

### 通道 ②：Skill 脚本执行（结构化记录）

这是项目实际使用最多的通道。AI 通过 Claude Code 的 Skill 系统，在被用户 `/记录` 命令触发后，构造完整的结构化 JSON payload，通过 `learnlog` CLI 入库。

**执行流程图**：

```
用户: /记录
        │
        ▼
Claude Code Skill 系统 → 加载 记录.md Skill 指令
        │
        ▼
AI 执行深度分析（按 Skill 指令的要求）:
  ├─ 1. Clarify:  锁定用户意图
  ├─ 2. Investigate: 检查后端存活（launchd 持久化保证在线）、标签是否存在
  ├─ 3. Generate: 生成 ≥2000 字的六步深度分析
  │    ├─ 核心结论
  │    ├─ 领域场景案例
  │    ├─ 第一性原理分析
  │    ├─ 图示分析 (ASCII Art)
  │    ├─ 完整代码实现
  │    ├─ STAR 法则复盘
  │    └─ 反问与领域映射拓展
  ├─ 4. Evaluate: 质量自检 & 能量评级
  └─ 5. Deliver: 构造 JSON payload → 入库
        │
        ▼
构造 payload → learnlog CLI:
  {
    "topic": "...",
    "insight": "...(2000+ 字)",
    "diagram": "graph TD\n  ...",
    "code_snippet": "...",
    "star_situation": "...",
    "star_task": "...",
    "star_action": "...",
    "star_result": "...",
    "topic_tag_id": "cn.dolphinmind.learning.log.tag.discipline.cs.ai",
    "research_type": "deep-research",
    "energy_level": 5,
    "aha_moment": true,
    "source": "record-skill-execution"
  }
        │
        ▼
learnlog record "主题" "insight全文" --tag 标签 --energy 5 --aha true --type deep-research
        │
        ▼
learnlog CLI → POST → http://localhost:8002/api/entries
        │
        ▼
返回给用户: "✅ 已记录 #ID | http://localhost:3000"
```

**实际的 learnlog record 调用示例**（来自项目）：

```python
payload = {
    "topic": "AI执行约束与显式授权机制的深度思考",
    "insight": "**结论：** AI的被动性是出于安全架构的最小权限原则...",
    "diagram": "sequenceDiagram\n  participant U as User\n  participant A as AI Agent\n  participant L as learnlog CLI\n  U->>A: 触发 /记录\n  A->>A: 激活 CIDED 分析\n  A->>L: learnlog record ...\n  L-->>A: 返回成功\n  A->>U: ✅ 已记录 #42",
    "energy_level": 5,
    "aha_moment": True,
    "research_type": "deep-research",
    "source": "learnlog-cli",
    "topic_tag_id": "cn.dolphinmind.learning.log.tag.discipline.cs.ai",
    # ... STAR fields
}
```

### 通道 ③：文件系统监听（离线导入）

```
用户 / 外部工具
      │
      ▼
将 .md 笔记放入 backend/watch/
      │
      ▼
MCP Server 定时任务 (每 30 分钟):
  scheduled_capture()
    ├─ 扫描 watch/*.md
    ├─ 逐文件 call_ai_for_analysis(content)
    ├─ save_to_backend(analyzed_data)
    └─ 移动到 watch/processed/ (归档)
```

---

## 三、AI 的 "逻辑立法" 协议：CIDED 决策框架

系统设计了一套 AI 在执行记录任务时必须遵循的决策框架，确保每次记录的深度和一致性。

### CIDED 五步决策流

```
┌──────────────────────────────────────────────────────┐
│                 CIDED Decision Flow                  │
│                                                      │
│  C ─ Clarify     → 锁定用户意图，明确记录目标         │
│       │                                              │
│       ▼                                              │
│  I ─ Investigate → 环境保活 (launchd 持久化 + MCP 双重保障) │
│       │           标签预检 (目标标签是否已存在)       │
│       │           上下文收集 (对话历史摘要)           │
│       ▼                                              │
│  D ─ Develop     → 生成 ≥2000 字深度分析              │
│       │           (六步结构 — 见下文)                 │
│       ▼                                              │
│  E ─ Evaluate    → 质量自检                           │
│       │           - 字数是否达标？                    │
│       │           - 洞察是否有穿透力？                │
│       │           - Mermaid 语法是否正确？            │
│       │           - 能量评级是否合理？                │
│       ▼                                              │
│  D ─ Deliver     → 构造 JSON payload                 │
│                    learnlog CLI 调用入库             │
│                    返回确认消息给用户                  │
└──────────────────────────────────────────────────────┘
```

### 六步深度分析结构（Generate 阶段强制输出）

每条学习记录的 `insight` 字段必须包含：

| # | 段落 | 内容要求 |
|---|------|---------|
| 1 | **核心结论** | 一句话总结，结论先行 |
| 2 | **领域场景案例** | 用一个真实/模拟的业务场景类比说明 |
| 3 | **第一性原理分析** | 回归底层原理，拆解本质因果 |
| 4 | **图示分析** | ASCII Art 或 Mermaid 可视化逻辑流 |
| 5 | **完整代码实现** | 可运行的代码片段 |
| 6 | **STAR 复盘 + 反问与映射** | S/T/A/R 四维复盘 + 深度反问 + 跨领域映射 |

**字数红线**：≥ 2000 字。这不是为了凑数，而是 "迫使 AI 挖掘表象之下的逻辑链条，当链条足够长时，洞察才具有穿透力"。

---

## 四、上下文断点管理（不丢失对话状态）

当用户在研究过程中需要 `/记录` 记录灵感，但又不想丢失当前对话的上下文时，系统提供了断点管理机制：

```
用户正在深入讨论 Spring Boot 自动配置
       │
       ├─ 突然产生需要记录的洞察
       │
       ▼
用户: /记录
       │
AI:  1. 保存断点 (context_manager.save_checkpoint)
      │   保存内容: last_topic, conversation_summary, pending_questions
      │   存储位置: ~/.learning-log/checkpoints/latest.json
      │
      ├─ 2. 执行记录 (六步深度分析 → 入库)
      │
      └─ 3. 提示用户可恢复
           "💡 灵感已归档。#42 输入继续回到刚才的话题。"
       
稍后...
       │
       ▼
用户: "继续讨论"
       │
AI:  1. 读取断点 (context_manager.load_latest_checkpoint)
      │   获取: last_topic, conversation_summary, pending_questions
      │
      └─ 2. 恢复上下文
           "🔄 已回归主线：Spring Boot 自动配置原理
            📝 上次进度：正在讨论 @EnableAutoConfiguration 的 SPI 机制
            💡 待回答问题：
              1. spring.factories 的加载顺序是怎样的？
              2. 如何自定义一个 AutoConfiguration？"
```

**断点数据结构**：

```python
checkpoint = {
    "id": "1712567890_12345",
    "timestamp": "2026-04-08T14:30:22",
    "last_topic": "Spring Boot 自动配置原理",
    "conversation_summary": "讨论 @EnableAutoConfiguration 通过 SPI 加载 spring.factories...",
    "pending_questions": [
        "spring.factories 的加载顺序是怎样的？",
        "如何自定义 AutoConfiguration？"
    ],
    "semantic_anchors": ["Spring Boot", "AutoConfiguration", "SPI", "Conditional"],
    "metadata": {
        "source": "flash-insight-interruption",
        "version": "1.0"
    }
}
```

---

## 五、AI 协作配置

### 5.1 Claude Code 配置

Claude Code 通过 `~/.claude/CLAUDE.md`（全局）和项目 `CLAUDE.md` 自动加载上下文，无需额外启动脚本。

### 5.2 项目 Skills（5 个）

Skill 文件位于 `.claude/skills/`，由 Claude Code 自动加载：

| Skill | 文件 | 触发方式 |
|-------|------|---------|
| `/记录` | `记录.md` | 深度知识沉淀（六步分析 ≥2000字 → 入库） |
| `/状态` | `状态.md` | 系统状态速查 + 最近 Feed |
| `/灵感` | `灵感.md` | 快速顿悟捕获 (energy=5, aha=true) |
| `/服务` | `服务.md` | 后台服务管理（launchd install/status/restart/logs） |
| `/命令` | `命令.md` | 列出所有可用命令 |

### 5.3 全局 CLI

`learnlog` 命令全局可用（位于 `~/.local/bin/learnlog`），提供：
- `learnlog record` / `learnlog pipe` — 学习记录入库
- `learnlog status` / `learnlog feed` — 系统状态查询
- `learnlog service *` — launchd 持久化服务管理

---

## 六、完整协作场景示例

### 场景：用户研究 "数据库幂等性设计"

```
时间线：

T+0min  用户: "帮我深入分析数据库幂等性设计的最佳实践"
        AI: 展开深度分析，讨论唯一索引、分布式锁、Token 机制...
            (对话过程中心流涌动)

T+8min  用户: "/记录"
        AI: 
          ┌─ 保存断点 (当前讨论状态归档)
          ├─ 激活 CIDED 决策流
          ├─ 检查后端存活（launchd 保证在线）→ ✅
          ├─ 检查标签 "cn...discipline.cs.backend.python" → 已存在
          ├─ 生成 2000+ 字六步分析:
          │   ├─ 核心结论：确立以唯一索引为基石的幂等性设计
          │   ├─ 场景类比：电商大促防重下单
          │   ├─ 第一原理：数据一致性原则 + 熵减原理
          │   ├─ 图示：ASCII 时序图 (客户端→应用层→数据库层)
          │   ├─ 代码：ALTER TABLE + UNIQUE INDEX + 应用层预检
          │   └─ STAR + 反问：亿级数据下 Hash 索引的瓶颈？
          ├─ 构造 22 字段 payload
          ├─ learnlog record → POST /api/entries
          └─ "✅ 已记录 #42。http://localhost:3000"

T+10min  用户: "继续讨论分布式场景下的幂等性"
         AI: 从断点恢复上下文，无缝继续讨论
         
         同时，前端 localhost:3000 上：
           ├─ 时间线出现新卡片 "数据库幂等性设计与脏数据清洗机制"
           ├─ ECharts 图谱中新增节点连接
           └─ 可点击查看完整的六步分析内容
```

---

## 七、AI 产出的数据示例

以下是实际由 AI 生成并入库的记录（节选自 `batch_records.json`）：

```json
{
  "topic": "AI Skills 协作协议与视觉化思考体系构建",
  "insight": "**1. 核心结论**\n通过将孤立的 Markdown 文档升级为具备 YAML Frontmatter 元数据的 AI Skills，我们建立了一套标准化的"智能体协作协议"...",
  "diagram": "graph LR\n    A[用户意图] --> B(init.md 路由)\n    B --> C{选择 Skill}\n    C -->|分析 | D[coach]\n    C -->|记录 | E[record]\n    D & E --> F[标准化输出]",
  "star_situation": "Skills 文件命名冗长且各自为战，缺乏统一的协作标准。",
  "star_task": "重构 Skills 体系，建立协作地图与视觉化规范。",
  "star_action": "精简文件名，定义 YAML 协作元数据，植入深度分析模板。",
  "star_result": "构建了可扩展的 AI 协作生态，提升了知识沉淀的效率。",
  "topic_tag_id": "cn.dolphinmind.learning.log.tag.skill.ai-collaboration",
  "research_type": "deep-research",
  "energy_level": 5,
  "aha_moment": true,
  "source": "ai-chat"
}
```

可以看到：
- **insight** 是完整的六步分析长文（通常 2000+ 字）
- **diagram** 是严格语法的 Mermaid 代码
- **STAR 字段** 将思考过程结构化
- **标签 ID** 遵循反向域名命名规范
- **energy_level=5 + aha_moment=true** 标记这是高价值的 "顿悟" 记录

---

## 八、AI 协作的技术架构总结

```
┌────────────────────────────────────────────────────────────┐
│                    协作架构全景                              │
│                                                            │
│  用户界面层                                                │
│  ├─ Claude Code 终端 (主交互界面)                           │
│  ├─ Next.js 前端 (学习记录可视化 / localhost:3000)           │
│  └─ 命令行工具 (quick_record.py / 手动 curl)                │
│                                                            │
│  AI 引擎层                                                 │
│  ├─ Claude (通过 ANTHROPIC_BASE_URL 连接)                   │
│  ├─ Ollama / OpenAI (MCP 分析用)                           │
│  └─ Skill 系统 (记录 / 状态 / 灵感 / 服务 / 命令)           │
│                                                            │
│  协议层                                                    │
│  ├─ MCP (Model Context Protocol) — AI ↔ 工具               │
│  │   ├─ capture_learning: 非结构化内容 → 结构化记录          │
│  │   └─ batch_capture: 批量导入                             │
│  ├─ REST API (FastAPI) — 工具 ↔ 数据库                      │
│  └─ learnlog CLI — Skill 通过命令行入库                     │
│                                                            │
│  持久化层                                                   │
│  ├─ SQLite (learning-log.db)                               │
│  │   ├─ tags: 四级层级知识标签树                             │
│  │   ├─ tag_links: 知识节点关联                             │
│  │   ├─ learning_entries: 结构化学习记录                     │
│  │   └─ nl_commands: 自然语言命令历史                       │
│  ├─ 文件系统                                                │
│  │   ├─ ~/.learning-log/checkpoints/ (对话断点)              │
│  │   └─ backend/watch/ (离线导入监听)                        │
│  └─ launchd (进程持久化)                                     │
│       ├─ com.learning-log.backend  → FastAPI :8002           │
│       └─ com.learning-log.frontend → Next.js :3000           │
└────────────────────────────────────────────────────────────┘
```

---

## 九、设计哲学

| 原则 | 实现 |
|------|------|
| **AI 不是工具，是协作者** | AI 深度参与知识的提炼和结构化，不只是执行 CRUD |
| **对话即数据源** | AI 对话是知识输入的主要来源，每次深入讨论都应产生可追溯的记录 |
| **强制深度** | CIDED 框架 + 2000 字红线 + 六步结构，防止肤浅记录 |
| **零拉扯** | 用户一句 `/记录`，AI 自动完成分析→构造→入库全流程 |
| **上下文不丢失** | 断点管理让记录灵感不打断研究心流 |
| **多通道互补** | MCP 自动捕获 + Skill 结构化记录 + 文件系统离线导入 |
| **知识可追溯** | STAR 法则 + content_hash 去重 + timestamp 时间线，确保每个洞察有来源 |
| **持久化运行** | launchd 管理前后端进程，开机自启、崩溃自动恢复，关闭 IDE/终端不受影响 |

## 十、CLI 使用规范（避免数据质量问题）

### 长文必须用管道

shell 的 `argv` 对超长参数有隐形截断风险。**insight > 500 字必须用 `--pipe`**：

```bash
# ❌ 错误：2000 字塞进命令行参数，会被截断
learnlog record "主题" "很长很长的 insight..."

# ✅ 正确：用管道传入 stdin
echo "很长很长的 insight..." | learnlog record "主题" --pipe
echo "修正内容..." | learnlog update 42 --pipe
```

### Diagram 换行符

shell 双引号中 `\n` 是字面量反斜杠-n，Mermaid 需要真正的换行符：

```bash
# ❌ 错误：\n 被存为字面量，Mermaid 收到一行字符串
learnlog record "主题" "insight" --diagram "graph TD\n A-->B"

# ✅ 正确：用 $'...' 让 bash 解析转义
learnlog record "主题" "insight" --diagram $'graph TD\n  A-->B'

# ✅ 或者用变量（已含真正换行）
DIAGRAM="graph TD
  A-->B"
learnlog record "主题" "insight" --diagram "$DIAGRAM"
```

> CLI 内置防护：如果检测到 diagram 包含字面量 `\n` 而无真正换行，会自动转换并提示。

### 更新 vs 覆盖

`learnlog update` 是**部分更新**（PATCH 语义），只改传入的字段，其他字段保持不变。

---

## 十一、复现 AI 协作环境的步骤

1. **安装持久化服务**（推荐，一次配置永久生效）:
   ```bash
   learnlog service install
   ```
   前后端由 launchd 管理，开机自启，崩溃自动恢复。

   手动启动（临时）:
   ```bash
   bash deploy/start.sh
   ```

2. **验证服务**:
   ```bash
   learnlog service status   # 确认前后端运行中
   curl localhost:8002/api/stats  # 后端健康检查
   ```

3. **MCP Server**（可选，AI 对话中自动触发）:
   - `backend/mcp_server.py` 在首次 MCP 调用时自动拉起后端
   - 提供 `capture_learning`、`batch_capture`、`learning_log_status` 三个工具

4. **Skill 文件**（已内置，无需手动配置）:
   - `.claude/skills/` 下 5 个 Skill（记录/状态/灵感/服务/命令）
   - Claude Code 自动加载，用户输入 `/记录`、`/状态` 等即可触发

5. **测试协作环**:
   - 在 Claude Code 中说 `/记录`
   - 验证 AI 是否执行了 CIDED 流程并成功入库
   - 检查 `http://localhost:3000` 是否出现新记录
