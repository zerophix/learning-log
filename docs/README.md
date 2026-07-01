# Learning Log — 设计文档目录

> **给 AI 的入口**：首次阅读本项目时，先从这里开始。
> 按分类浏览，从架构全景到具体实现，逐层深入。

---

## 文档结构

```
docs/
├── README.md ← 本文档（入口索引）
├── guimi/ 诡秘之主阅读流水线
│   ├── README.md 流水线总览（接手流程、Pipeline 架构、数据格式）
│   ├── AGENT_HANDOFF.md 新 CLI 会话完整接手手册（Step 1-5）
│   ├── SKILL_SPEC.md /读 /精读 /读研 三件套规格 + 校验清单
│   └── SCRAPE_GUIDE.md Playwright 批量抓取 + 自动化手册
├── architecture/ 系统架构全景
│   └── ARCHITECTURE.md        30 秒理解全貌，定位所需文档
├── backend/                   后端设计系统
│   └── BACKEND.md             API + 数据库 + MCP 完整规格（~1259 行）
├── frontend/                  前端设计系统
│   └── FRONTEND.md            组件 + 样式 + 路由完整规范（~1110 行）
├── graph/                     知识图谱
│   ├── GRAPH.md               三视图视觉编码 + 重构历史（~710 行）
│   └── AI-CAPABILITIES.md     MCP 工具 + Skill + CIDED 决策框架
├── guide/                     操作指南
│   ├── REPRODUCE.md           从零复现完整系统
│   └── SETUP.md               Shell 集成 + MCP 配置（30 秒接入）
└── assets/                    文档配图
    ├── graph-page.png          图谱页面截图
    └── graph-edge-filter.png   图谱边过滤截图
```

## 阅读顺序推荐

| 角色 | 阅读路径 |
|------|---------|
| **首次接触** | `README.md` → `architecture/ARCHITECTURE.md` → 按需进入具体模块 |
| **后端开发** | `backend/BACKEND.md` → `graph/GRAPH.md` → `guide/REPRODUCE.md` |
| **前端开发** | `frontend/FRONTEND.md` → `graph/GRAPH.md` |
| **从零搭建** | `guide/REPRODUCE.md` |

## 关键文件一览

| 文件 | 说明 | 行数 |
|------|------|------|
| `backend/BACKEND.md` | API 端点、数据库 schema、MCP 协议、性能基准 | ~1259 |
| `frontend/FRONTEND.md` | 组件树、CSS 变量、ECharts 配置、路由规则 | ~1110 |
| `graph/GRAPH.md` | 三视图（注意力/时间线/关系）、聚类算法、重构历史 | ~710 |

## 项目根文档

| 文档 | 用途 |
|------|------|
| `CLAUDE.md` | AI 协作指南（MCP 工具、命令、约束、AI 模型） |
| `README.md` | 项目介绍 + 快速开始 |
| `backend/.env` | AI 模型配置（Ollama URL + 模型名） |
| `.claude/skills/` | Claude Code 中文短命令 Skill（5 个） |
| `~/.config/opencode/skills/` | OpenCode 全局 Skill（4 个） |

## 关键端口

| 端口 | 服务 | 用途 |
|------|------|------|
| 8002 | FastAPI Backend | REST API + 数据库 |
| 3000 | Next.js Frontend | 网页界面 |
| 8010 | MCP SSE Server | AI 代理 MCP 接入 |
| 11434 | Ollama | 本地 AI 推理 |
