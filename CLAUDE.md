# Learning Log — AI 协作学习记录系统

从 AI 对话到结构化知识图谱的完整闭环。

## 架构

```
FastAPI :8002  →  SQLite (data/learning-log.db)
Next.js :3000  →  时间线 / ECharts图谱 / Feed筛选
MCP Server     →  capture_learning, batch_capture, status
```

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
backend/        FastAPI 服务 (main.py, db.py, mcp_server.py)
frontend/       Next.js 14 时间线 UI
scripts/tools/  可复用工具 (auto_record, context_manager...)
scripts/seeds/  种子数据脚本
deploy/         部署脚本
docs/           设计文档
.claude/skills/ 项目 Skills (/记录 /状态 /灵感 /服务 /命令)
```

## Skills

本项目有 5 个自定义 Skill（`.claude/skills/`）:
- `/记录` — 深度知识沉淀（六步分析 ≥2000字 → 入库）
- `/状态` — Learning Log 系统状态
- `/灵感` — 快速顿悟捕获 (energy=5)
- `/服务` — 后台服务管理（install/status/restart/logs）
- `/命令` — 列出所有命令

## 约束

- 后端由 launchd 持久化运行（`learnlog service install`），关闭 IDE/终端不影响
- MCP Server 首次调用时也会自动保活后端（双重保障）
- 数据库在 `data/learning-log.db`，不要手动修改
- 标签遵循反向域名: `cn.dolphinmind.learning.log.tag.{category}.{name}`
- API 文档: http://localhost:8002/docs
