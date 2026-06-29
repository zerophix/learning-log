# Learning Log — AI 协作学习记录系统

> 从 AI 对话到结构化知识图谱的完整闭环。让每一次深度对话都成为可追溯的知识资产。

## 核心理念

**文档即协议（Document as Protocol）**：当设计文档精确到逐像素可复现时，任何 AI 读取后都能 1:1 重建系统。

## 快速开始

```bash
# 安装持久化服务（推荐，开机自启）
learnlog service install

# 或临时启动
deploy/start.sh
```

服务启动后：
- 后端 API: http://localhost:8002
- 前端 UI: http://localhost:3000

## 使用方式

在 **Claude Code** 或 **Cline** 中，用自然语言触发知识记录：

| 你说 | AI 执行 |
|------|--------|
| `记录一下` / `帮我记录` | 协议对齐格式（结论→Mermaid+ASCII→Why→架构→决策→STAR） |
| `记个灵感` / `这个想法不错` | 快速捕获顿悟（energy=5, aha=true） |
| `学习状态` / `最近记录了什么` | 系统状态速查 |
| `重启服务` / `服务状态` | 后台服务管理 |

> **Claude Code** 也支持 `/记录`、`/灵感`、`/状态` 等斜杠命令。

## 跨项目全局可用

Learning Log 的 MCP 服务配置在**全局级别**，打开任意项目均可使用：

| AI 工具 | 全局配置位置 | 触发方式 |
|---------|------------|---------|
| Claude Code | `~/.claude.json` (user scope MCP) | `/记录` 或 "记录一下" |
| Cline | VS Code `cline_mcp_settings.json` + `customInstructions` | "记录一下" 等自然语言 |
| 任意 AI | HTTP API `POST localhost:8002/api/entries` | 直接调用 REST API |

## 架构

```
┌─────────────────────────────────────────────────────┐
│  AI 代理层                                          │
│  Claude Code · Cline · learnlog CLI · 任意 HTTP 客户端 │
└──────────────────────┬──────────────────────────────┘
                       │ MCP / HTTP / CLI
┌──────────────────────▼──────────────────────────────┐
│  服务层                                             │
│  MCP Server (stdio/SSE, 5 tools)                    │
│  FastAPI Backend (:8002, launchd 持久化)             │
│  Next.js Frontend (:3000, launchd 持久化)            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  数据层                                             │
│  SQLite · 四层标签体系 (discipline→subject→topic→entry) │
└─────────────────────────────────────────────────────┘
```

## MCP 工具

| 工具 | 功能 |
|------|------|
| `deep_record` | 深度知识沉淀（协议对齐格式全文 → insight 字段） |
| `quick_capture` | 快速顿悟捕获（energy=5, aha=true） |
| `capture_learning` | 自动分析并保存学习内容 |
| `batch_capture` | 批量处理多条内容 |
| `learning_log_status` | 查看系统状态 |

## 目录结构

| 目录 | 说明 |
|------|------|
| `backend/` | FastAPI + SQLite + MCP Server |
| `frontend/` | Next.js 14 时间线 / ECharts 图谱 / Feed 筛选 |
| `~/.config/opencode/skills/` | 全局 Skill（记录 / 灵感 / 状态 / 命令） |
| `scripts/tools/` | 可复用工具（auto_record, context_manager...） |
| `scripts/seeds/` | 种子数据（四层标签体系） |
| `deploy/` | launchd plist + 部署脚本 |
| `install/` | Shell 集成（learnlog CLI 源文件） |
| `docs/` | 设计文档（分类存放：architecture/ backend/ frontend/ graph/ web-ai-bridge/ guide/ assets/） |

## 文档

> 📖 **入口**：[设计文档目录](docs/README.md) — 按分类浏览所有文档。

| 文档 | 说明 |
|------|------|
| [系统架构全景](docs/architecture/ARCHITECTURE.md) | 30 秒理解全貌，定位所需文档 |
| [完整复现指南](docs/guide/REPRODUCE.md) | 从零重建前后端系统 |
| [后端设计系统](docs/backend/BACKEND.md) | API + 数据库 + MCP 完整规格 (1259 行) |
| [前端设计系统](docs/frontend/FRONTEND.md) | 组件 + 样式 + 路由完整规范 (1110 行) |
| [图谱架构](docs/graph/GRAPH.md) | 三视图视觉编码 + 重构历史 (710 行) |
| [AI 协作能力](docs/graph/AI-CAPABILITIES.md) | MCP 工具 + Skill + CIDED 决策框架 |
| [接入指南](docs/guide/SETUP.md) | Shell 集成 + MCP 配置 |
