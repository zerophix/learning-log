# Learning Log — 系统架构全景

> **目标读者**：AI / 开发者。30 秒理解系统全貌，定位所需文档。
>
> 详细文档：`BACKEND.md` · `FRONTEND.md` · `GRAPH.md` · `AI-CAPABILITIES.md`

---

## 系统总览

```
┌─────────────────────────────────────────────────────────┐
│                   用户交互层                              │
│                                                         │
│  Claude Code / Cline          Next.js 前端 :3000        │
│  (MCP Client + Skill 系统)    (时间线 / Feed / 图谱)     │
│       │                              │                  │
│       │ MCP stdio/JSON-RPC           │ REST API         │
│       ▼                              ▼                  │
│  ┌──────────────────────────────────────────┐           │
│  │          MCP Server (mcp_server.py)       │           │
│  │  capture_learning / batch_capture / ...   │           │
│  └──────────────────┬───────────────────────┘           │
│                     │ HTTP REST :8002                    │
│                     ▼                                    │
│  ┌──────────────────────────────────────────┐           │
│  │        FastAPI Backend (app/)             │           │
│  │  5 routers · 26 endpoints · SQLite DB     │           │
│  │  SentenceTransformer + Louvain 聚类      │           │
│  └──────────────────────────────────────────┘           │
│                     │                                    │
│                     ▼                                    │
│  ┌──────────────────────────────────────────┐           │
│  │  SQLite (data/learning-log.db)           │           │
│  │  4 tables · 12 indexes · ~42 entries     │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

## 后端 (FastAPI :8002)

| 层 | 关键文件 | 职责 |
|----|---------|------|
| 入口 | `backend/app/main.py` | FastAPI app, startup, CORS |
| 路由 (5) | `api/v1/{entries,tags,graph,projects,stats,nl_commands}.py` | REST 端点 |
| 数据库 | `db/{schema,migrations}.py` | SQLite DDL + ALTER TABLE |
| 模型 | `models/__init__.py` | 6 个 Pydantic 模型 |
| 服务 | `services/{embedding,attention,clustering,ai,lifecycle}_service.py` | 业务逻辑 |
| 工具 | `utils/{db_utils,text_processing,date_utils}.py` | 无状态函数 |
| MCP | `protocols/mcp.py` + `mcp_server.py` | MCP 协议层 |
| CLI | `scripts/{auto_capture,quick_record,seed_tags,test_mcp}.py` | 辅助脚本 |

**启动**: `cd backend && python3 -m app.main`

## 前端 (Next.js :3000)

| 层 | 关键文件 | 职责 |
|----|---------|------|
| 页面 (3) | `app/{page,graph/page,feed/page}.tsx` | 时间线 / 图谱 / Feed |
| 组件 | `components/{entry,graph,layout,renderers,ui}/` | 业务 + 通用组件 |
| 图谱 (3 视图) | `hooks/useGraphState.ts`, `lib/graph-echarts-options.ts` | 状态管理 + ECharts 配置 |
| 样式 | `styles/index.css` + `styles/*.module.css` | CSS 变量 + CSS Module |
| API | `lib/api.ts` | 统一 API 客户端 |
| 类型 | `types/{index,graph}.ts` | TypeScript 类型定义 |

**启动**: `cd frontend && npm run dev`

## 数据流

```
数据输入:  MCP capture → POST /api/entries
          learnlog CLI → POST /api/entries
          前端 EntryForm → POST /api/entries

数据查询:  GET /api/entries      → 时间线视图
          GET /api/entries/feed  → Feed 流
          GET /api/graph/attention → 注意力图谱

进程管理:  launchd (macOS) 保活前后端 + MCP
          learnlog service install | status | restart | logs
```

## AI 协作 (3 通道)

| 通道 | 触发 | 延迟 | 文档 |
|------|------|------|------|
| MCP 工具调用 | AI 自动识别 → `capture_learning` | 实时 | `AI-CAPABILITIES.md` |
| Skill 脚本 | 用户 `/记录` → 结构化分析 → CLI 入库 | 近实时 | `AI-CAPABILITIES.md` |
| 文件监听 | `.md` 丢入 `watch/` | ≤30min | `AI-CAPABILITIES.md` |
