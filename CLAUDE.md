# Learning Log — AI 协作学习记录系统

从 AI 对话到结构化知识图谱的完整闭环。

## 架构

```
FastAPI :8002  →  SQLite (data/learning-log.db)
Next.js :3000  →  时间线 / ECharts图谱 / Feed筛选
MCP Server     →  5 个工具: capture_learning, batch_capture, learning_log_status,
                   deep_record, quick_capture
```

## 多 AI 代理接入

MCP Server 支持 **两种传输模式**，覆盖所有主流 AI 编程代理：

| 模式 | 协议 | 适用客户端 | 配置方式 |
|------|------|-----------|---------|
| STDIO | 标准输入输出 | Claude Code, Cursor | `.mcp.json` 或 IDE 设置 |
| SSE | HTTP 服务 | **任意** MCP 客户端 | `{ "type": "sse", "url": "..." }` |

### 方式 1：STDIO（Claude Code 默认）

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
llmcp install

# 查看状态
llmcp status
```

安装后，在其他 AI 代理中配置：

**Cline (VS Code)** — 在 `~/.config/cline/mcp_settings.json` 或 VS Code 设置中添加：
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
> 管理命令: `llmcp install|status|uninstall|start`

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
| `quick_capture` | `/灵感` | 快速捕获顿悟（energy=5, aha=true） |
| `batch_capture` | — | 批量处理多条内容 |
| `learning_log_status` | `/状态` | 查看系统状态 |

## 关键命令

| 命令 | 作用 |
|------|------|
| `learnlog status` | 查看系统状态 |
| `learnlog record "主题" "洞察"` | 记录学习洞察 |
| `echo "..." \| learnlog pipe -t "主题"` | 管道记录 |
| `deploy/start.sh` | 手动启动前后端（临时） |
| `learnlog service install` | 安装持久化服务（推荐） |
| `learnlog service status` | 查看后台服务状态 |
| `learnlog service restart` | 重启后台服务 |
| `learnlog service logs` | 查看服务日志 |
| `learnlog update <id> --energy 5` | 更新记录字段 |
| `echo "..." \| learnlog update <id> --pipe` | 管道更新长文 |
| `learnlog delete <id>` | 删除记录 |

## 目录结构

```
backend/        FastAPI 服务 (app/main.py → app/{core,api,db,models,services,utils})
frontend/       Next.js 14 时间线 UI (pages: / /feed /graph)
scripts/tools/  可复用工具 (auto_record, context_manager...)
scripts/seeds/  种子数据脚本
deploy/         部署脚本
docs/           设计文档
~/.config/opencode/skills/ Skills (/记录 /状态 /灵感 /命令)
```

## Skills

自定义 Skill 在全局目录 `~/.config/opencode/skills/`:
- `/记录` — 深度知识沉淀（协议对齐格式：结论→Mermaid+ASCII→Why→架构→决策→STAR，STAR 字段自动 null）
- `/状态` — Learning Log 系统状态
- `/灵感` — 快速顿悟捕获 (energy=5, aha=true)
- `/命令` — 列出所有命令

## 约束

- 后端由 `app/main.py` 提供 FastAPI app，`python3 -m app.main` 启动
- MCP Server 通过 `mcp_server.py` 独占提供（已移除旧 FastApiMCP 自动挂载）
- 数据库在 `data/learning-log.db`，不要手动修改
- 标签遵循反向域名: `cn.dolphinmind.learning.log.tag.{category}.{name}`
- API 文档: http://localhost:8002/docs

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
