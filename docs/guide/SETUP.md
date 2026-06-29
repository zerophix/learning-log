# 接入 Learning Log

## 快速接入（30 秒）

```bash
# 1. Shell 集成 — 在 ~/.zshrc 末尾加一行
source ~/PycharmProjects/learning-log/install/shell-integration.sh

# 2. 开始使用
llr "学到的知识" "核心洞察"    # 快速记录
lla "一句话顿悟"               # 顿悟捕获 (energy=5)
llc "主题"                     # 从剪贴板记录
lls                            # 系统状态
llf                            # 最近记录
```

## AI 接入

把 `../graph/AI-CAPABILITIES.md` 的内容粘贴到任何 AI 对话开头即可。

## Claude Code Skills

项目内置四个 Skill（中文短命令）：

| 触发词 | 别名 | 功能 |
|--------|------|------|
| `/记录` | `/save` `/沉淀` `/jilu` | 深度知识沉淀 |
| `/状态` | `/status` `/zt` `/ll` | 系统状态 |
| `/灵感` | `/aha` `/顿悟` `/linggan` | 快速顿悟 |
| `/命令` | `/help` `/cmd` | 列出所有命令 |

## MCP 工具

全局 MCP Server 提供五个工具：
- `capture_learning` — AI 主动捕获学习内容
- `batch_capture` — 批量导入
- `deep_record` — 深度知识沉淀（协议对齐格式）
- `quick_capture` — 快速顿悟捕获（energy=5, aha=true）
- `learning_log_status` — 状态查询
