# Learning Log — AI 协作学习记录系统

> 从 AI 对话到结构化知识图谱的完整闭环。让每一次深度对话都成为可追溯的知识资产。

## 核心理念

**文档即协议（Document as Protocol）**：当设计文档精确到逐像素可复现时，任何 AI 读取后都能 1:1 重建系统，无需再次逆向工程。

## 架构

```
AI 对话 ──→ MCP / CLI / HTTP ──→ FastAPI ──→ SQLite
                                    │
                                    ├── 时间线视图 (Next.js)
                                    ├── ECharts 知识图谱
                                    └── 多维 Feed 筛选
```

## 快速开始

```bash
# 一键启动
./start.sh

# 或分步启动
cd backend && python3 main.py     # API → localhost:8002
cd frontend && npm run dev        # UI  → localhost:3000
```

## 全局 CLI

```bash
learnlog status                   # 查看状态
learnlog record "主题" "洞察"     # 快速记录
echo "..." | learnlog pipe -t "主题"  # 管道记录
```

## 项目结构

| 目录 | 说明 |
|------|------|
| `backend/` | FastAPI + SQLite + MCP Server |
| `frontend/` | Next.js 14 时间线可视化 |
| `scripts/` | 数据迁移 / 种子数据 / 自动记录 |
| `docs/` | 完整设计文档（前端 / 后端 / AI协作） |
| `access/` | 全局接入工具（CLI / Shell / AI 提示词） |

## 文档

- [前端设计系统](docs/frontend-design-system.md) — 像素级复现指南
- [后端设计系统](docs/backend-design-system.md) — API + 数据库完整规格
- [AI 协作机制](docs/ai-collaboration-design.md) — 人机协作协议
- [全局接入指南](access/README.md) — 从任何地方接入
