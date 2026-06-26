# Learning Log — AI 协作学习记录系统

> 从 AI 对话到结构化知识图谱的完整闭环。让每一次深度对话都成为可追溯的知识资产。

## 核心理念

**文档即协议（Document as Protocol）**：当设计文档精确到逐像素可复现时，任何 AI 读取后都能 1:1 重建系统。

## 快速开始

```bash
cd deploy && ./start.sh       # 一键启动前后端
# 或手动
cd backend && python3 main.py  # API → localhost:8002
cd frontend && npm run dev     # UI  → localhost:3000
```

## 触发词

| 命令 | 功能 |
|------|------|
| `/记录` | 深度知识沉淀（CIDED 五步 + 六步分析） |
| `/状态` | 系统状态速查 |
| `/灵感` | 快速顿悟捕获 |

## 架构

```
AI 对话 ──→ MCP / CLI / Skill ──→ FastAPI ──→ SQLite
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                    时间线视图    ECharts图谱    Feed筛选
```

## 目录结构

| 目录 | 说明 |
|------|------|
| `backend/` | FastAPI + SQLite + MCP Server |
| `frontend/` | Next.js 14 时间线可视化 |
| `scripts/tools/` | 可复用工具 |
| `scripts/migrations/` | Schema 迁移记录 |
| `scripts/seeds/` | 种子数据 |
| `deploy/` | 部署脚本 |
| `install/` | 用户接入（Shell 集成） |
| `docs/` | 完整设计文档 |

## 文档

- [前端设计系统](docs/frontend-design-system.md) — 像素级复现指南
- [后端设计系统](docs/backend-design-system.md) — API + 数据库完整规格
- [AI 协作机制](docs/ai-collaboration-design.md) — 人机协作协议
- [AI 提示词卡片](docs/ai-prompt-card.md) — 粘贴到任何 AI 对话即可接入
- [接入指南](install/README.md) — Shell 集成 + MCP 配置
