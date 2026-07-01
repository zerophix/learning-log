# Learning Log — AI 协作学习记录系统

从 AI 对话到结构化知识图谱的完整闭环。

> 设计文档入口: `docs/README.md`（按分类浏览所有设计文档）

## 架构

```
用户层:  Claude Code / Cline / OpenCode / 浏览器 :3000
              │ MCP / HTTP
服务层:  MCP SSE Server :8010  ← 任何 AI 代理均可接入
         FastAPI Backend :8002
         Next.js Frontend :3000
              │ Ollama API
AI 层:   Ollama (qwen3-coder:30b / 本地模型)
              │
数据层:  SQLite → data/learning-log.db
```

## 多 AI 代理接入

MCP Server 支持 **两种传输模式**，覆盖所有主流 AI 编程代理：

| 模式 | 协议 | 适用客户端 | 配置方式 |
|------|------|-----------|---------|
| STDIO | 标准输入输出 | Claude Code, Cursor | `.mcp.json` 或 IDE 设置 |
| SSE | HTTP 服务 | **任意** MCP 客户端 | `{ "type": "sse", "url": "..." }` |

### 方式 1：STDIO（Claude Code / Cursor 默认）

项目根目录 `.mcp.json` 已配置，Claude Code 自动加载：
```json
{
  "mcpServers": {
    "learning-log": {
      "type": "stdio",
      "command": "python3",
      "args": ["/absolute/path/to/backend/mcp_server.py"]
    }
  }
}
```

### 方式 2：SSE 持久化服务（推荐 — 通用接入）

安装 MCP SSE Server 为后台服务后，**任何** AI 代理都能通过 HTTP 连接：

```bash
# 安装 MCP 持久化服务（开机自启）
python3 scripts/tools/mcp_manager.py install

# 查看状态
python3 scripts/tools/mcp_manager.py status

# 卸载
python3 scripts/tools/mcp_manager.py uninstall
```

安装后，服务运行在 `http://localhost:8010/sse`。在其他 AI 代理中配置：

**Cline (VS Code)** — 在 `~/.config/cline/mcp_settings.json` 中添加：
```json
{
  "mcpServers": {
    "learning-log": {
      "type": "sse",
      "url": "http://localhost:8010/sse"
    }
  }
}
```

**Cursor** — 在 Cursor Settings > Features > MCP 中添加：
```json
{
  "type": "sse",
  "url": "http://localhost:8010/sse"
}
```

**Continue.dev** — 在 `~/.continue/config.json` 中添加：
```json
{
  "mcpServers": [
    {
      "name": "learning-log",
      "type": "sse",
      "url": "http://localhost:8010/sse"
    }
  ]
}
```

> 💡 MCP SSE 服务随系统启动自动运行，关闭 IDE/终端不影响。

### 方式 3：HTTP API（通用 — 任何 AI 均可）

无需 MCP 协议，任何能发 HTTP 请求的 AI 都可以直接调用后端 API：
```
POST http://localhost:8002/api/entries
Content-Type: application/json
{
  "topic": "...",
  "insight": "...",
  "energy_level": 5,
  "aha_moment": true
}
```

## MCP 工具

| 工具 | 对应 Skill | 功能 |
|------|-----------|------|
| `capture_learning` | — | 自动分析并保存学习内容（调用 AI 分析） |
| `deep_record` | `/记录` | 直接保存已有分析内容（不二次分析） |
| `quick_capture` | `/记录 (L1 Quick)` | 快速捕获顿悟（energy=5, aha=true） |
| `batch_capture` | — | 批量处理多条内容 |
| `learning_log_status` | `/状态` | 查看系统状态 |

## 关键命令

| 命令 | 作用 |
|------|------|
| `learnlog status` | 查看系统状态 |
| `learnlog record "主题" --pipe` | 管道记录（推荐方式） |
| `deploy/install-hooks.sh` | 安装 git hooks（所有 AI 代理提交后自动记录） |
| `deploy/start.sh` | 手动启动前后端（临时） |
| `learnlog service install` | 安装持久化服务（推荐） |
| `learnlog service status` | 查看后台服务状态 |
| `learnlog service restart` | 重启后台服务 |
| `learnlog service logs` | 查看服务日志 |
| `learnlog update <id> --energy 5` | 更新记录字段 |
| `echo "..." \| learnlog update <id> --pipe` | 管道更新长文 |
| `learnlog delete <id>` | 删除记录 |
| `python3 -m app.main` | 手动启动后端（从 backend/ 目录） |

## 目录结构

```
backend/        FastAPI + MCP 服务
  app/           核心: main.py / core/ / api/ / services/ / db/ / models/ / utils/
  protocols/     MCP 协议层 (mcp.py)
  scripts/       CLI 工具 (auto_capture, quick_record...)
  .env           AI 模型配置 (Ollama URL + 模型名)
frontend/       Next.js 14 时间线 UI (pages: / /feed /graph)
                public/logo.svg  SVG Logo
deploy/         launchd plist + 启动脚本
docs/           设计文档（分类）
  architecture/  architecture/ backend/ frontend/ graph/ guide/ assets/
scripts/        迁移脚本、种子数据、adhoc 工具、MCP 管理
install/        Shell 集成（learnlog CLI 源文件）
.claude/skills/ Claude Code Skill（中文短命令）
```

## AI 模型配置

AI 分析服务使用本地 Ollama，配置在 `backend/.env`：

```env
AI_API_URL=http://localhost:11434/api/generate
AI_MODEL=qwen3-coder:30b          # 本地 Ollama 模型
```

可用模型查看：`curl http://localhost:11434/api/tags`

## Skills

### OpenCode Skills（全局目录）

`~/.config/opencode/skills/` 下有 5 个 Skill:
- `learnlog-record` — 深度知识沉淀
- `learnlog-status` — 系统状态查询
- `learnlog-commands` — 命令列表
- `web-ai` — Web AI 桥接查询

### Claude Code Skills（项目内）

`.claude/skills/` 下有 5 个 Skill（中文短命令）:
- `/记录` — 统一记录（三级深度：L1 灵感 / L2 阶段 / L3 沉淀）
- `/状态` — 系统状态
- `/灵感` — 快速顿悟捕获
- `/命令` — 列出所有命令
- `/服务` — 后台服务管理

### 自动阶段记录规则

**每次完成一个可识别的任务阶段后，AI 必须自动调用 `learnlog record` 记录阶段。** 这是强制规则，不需要用户提醒。

触发事件：代码提交后 · 构建通过后 · 新建组件/文件完成 · Bug 修复定位根因后 · 文档变更完成 · 用户说"好/继续/测试一下"表示阶段认可。

使用 L2（Phase）格式：`learnlog record "领域: 具体变化" --pipe --energy 3 --type topic-exploration`，结构为 结论 + 图景 + 文件变更 + 关键决策 + 遗留。

> ⚠️ 上一个阶段记录命令执行完毕后，请勿重复记录。一次任务阶段只记一次。

## 约束

- 后端由 `app/main.py` 提供 FastAPI app，`cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002` 启动
- 启动环境变量需要 `PYTHONUNBUFFERED=1` 否则后台进程会卡住
- AI 服务配置在 `backend/.env`，模型需与本地 Ollama 已安装模型一致
- MCP Server 通过 `mcp_server.py` 独占提供（已移除旧 FastApiMCP 自动挂载）
- MCP SSE 服务由 `deploy/run-mcp.sh` 启动，管理命令: `python3 scripts/tools/mcp_manager.py install|status|uninstall`
- 数据库在 `data/learning-log.db`，不要手动修改
- 标签遵循反向域名: `cn.dolphinmind.learning.log.tag.{category}.{name}`
- API 文档: http://localhost:8002/docs

## 性能基准

| 端点 | 耗时 | 备注 |
|------|------|------|
| 13 个标准端点 | < 0.5s | ✅ 正常 |
| `/api/graph/attention` | **~150ms** | ⚡ 优化后（原是 120s 超时）。Louvain 社区检测使用 `comm_sum_tot` 缓存 + `max_iterations=50` |
| 前端 ECharts 图谱 | 静态导入 | 800KB 库仅在页面首次加载时获取 |
| Feed 页聚类 | 懒加载 | 需要时点击"加载聚类"按钮触发 |

## 侧边栏交互规则（关键）

所有 3 页 (`/` `/feed` `/graph`) 共享 `EntryDetail` 组件：

**关闭方式**（仅有）:
- × 按钮 / Escape 键
- 保存/删除后自动 `onClose()`
- 时间线页：同一条目再次点击 toggle 关闭
- Feed 页：backdrop 遮罩点击关闭

**禁止关闭**:
- ❌ 点击侧边栏内部任何位置（stopPropagation 在根 div）
- ❌ 切换 tab / 编辑框内点击
- ❌ 点击关联索引条目

**布局差异**:
- `/` `/graph`：`.content-area` flex 布局，sidebar 与 main 并列
- `/feed`：`position: fixed` 覆盖模式 + backdrop

**相关文件**: `frontend/components/entry/EntryDetail.tsx:104` (stopPropagation), `frontend/app/page.tsx:63` (handleSelect toggle), `frontend/styles/index.css:413-451` (sidebar-detail CSS, 含移动端响应式)

## 诡秘之主 阅读流水线

> 规则：任何新 CLI 会话打开后，按 **Chapter 6 - 任何 CLI 自动接手流程** 执行，无需人工参与。

### 关键文件

```text
scripts/tools/scrape_guimi_playwright.py   # 爬取（Playwright，反爬绕过）
scripts/tools/guimi_pipeline.py            # 流水线调度
scripts/tools/guimi_batch_reader.py        # API 批次阅读处理器
scripts/tools/guimi_agent.md               # Agent 接手手册（完整操作指南）
/tmp/guimi_chapters/                        # 已落盘章节文件（*.md，CID 排序）
/tmp/guimi_pipeline_state.json             # 抓取 + 处理状态
/tmp/guimi_completed.json                  # 已处理 CID 集合
```

### 单人接手流程（新 CLI 复制粘贴）

```bash
# Step 1: 确认后端运行
curl -s http://localhost:8002/api/stats || {
  cd /Users/mingxilv/PycharmProjects/learning-log/backend
  nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 > /tmp/ll_backend.log 2>&1 &
  sleep 3
}

# Step 2: 查看队列
python3 scripts/tools/guimi_batch_reader.py queue

# Step 3: 续跑抓取（后台）
nohup python3 scripts/tools/scrape_guimi_playwright.py \
  "$(python3 -c "import json; s=json.load(open('/tmp/guimi_pipeline_state.json')); print(s['scrape'].get('next_url','https://www.sobqg.com/read/guimizhizhu/17859645.html'))")" \
  2000 > /tmp/guimi_scrape.log 2>&1 &

# Step 4: 处理 5 章
python3 scripts/tools/guimi_batch_reader.py process 5

# Step 5: 重复 Step 4 直到 queue 显示 0 待处理
```

### 完整文档（专栏）

- **`docs/guimi/README.md`** — 流水线总览，包含接手流程、Pipeline 架构、数据格式、进度跟踪、自测命令
- **`docs/guimi/AGENT_HANDOFF.md`** — 新 CLI 会话完整接手手册（Step 1-5 复制粘贴）
- **`docs/guimi/SKILL_SPEC.md`** — `/读` `/精读` `/读研` 三件套规格 + 校验清单
- **`scripts/tools/guimi_agent.md`** — Agent 简短流程速查（→ 已迁移至上述文档）
