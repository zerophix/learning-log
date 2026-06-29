# Learning Log — AI 协作能力

> **目标读者**：AI / 开发者。本文档描述 AI 如何与 Learning Log 系统协作，包括 3 条数据采集通道、CIDED 决策框架、深度记录协议、CLI 规范。

---

## 一、系统总览

```
用户 → Claude Code / Cline → MCP stdio → mcp_server.py → POST /api/entries → SQLite
用户 "/记录" → Skill 系统 → learnlog CLI → POST /api/entries → SQLite
用户 放文件到 watch/ → 定时扫描(30min) → POST /api/entries → SQLite
```

## 二、三条数据采集通道

| 通道 | 触发 | 延迟 | 适用场景 |
|------|------|------|----------|
| **① MCP 工具调用** | AI 自动识别值得记录的内容 → 调用 `capture_learning` | 实时 | 对话中产生洞察 |
| **② Skill 脚本执行** | 用户 `/记录` 命令 → AI 执行 CIDED 分析 → `learnlog CLI` 入库 | 近实时 | 用户明确要求记录 |
| **③ 文件系统监听** | 将 `.md` 丢入 `watch/` 目录 | ≤ 30 分钟 | 离线笔记/外部内容 |

### 通道 ①：MCP 工具 (AI 自动调用)

注册的工具:
```
capture_learning(raw_content, source="ai-chat")
  → AI 自动分析 → POST /api/entries → 返回结果

batch_capture(entries[])
  → 批量处理多条内容 → 逐条入库

learning_log_status()
  → 查看系统状态（记录数/标签数/最新记录）

deep_record(topic, insight, tags, energy, source)
  → 直接保存已有分析内容（不二次分析）

quick_capture(topic, insight, source="aha-capture")
  → 快速捕获顿悟（energy=5, aha=true）
```

### 通道 ②：Skill 系统 (用户触发)

Skill 文件位于 `~/.config/opencode/skills/`:

| 命令 | Skill | 行为 |
|------|-------|------|
| `/记录` | `learnlog-record` | 深度知识沉淀（协议对齐格式 → 入库） |
| `/状态` | `learnlog-status` | 系统状态速查 |
| `/灵感` | `learnlog-aha` | 快速顿悟捕获 (energy=5, aha=true) |
| `/命令` | `learnlog-commands` | 列出所有命令 |

### 通道 ③：文件监听 (离线)

```
backend/watch/  →  每 30 分钟扫描 *.md  →  AI 分析  →  入库 →  归档到 processed/
```

## 三、CIDED 决策框架

AI 执行 `/记录` 时须遵循的 5 步决策流：

```
C — Clarify     锁定用户意图，明确记录目标
I — Investigate 环境保活检查 + 标签预检 + 上下文收集
D — Develop     生成 ≥1200 字协议对齐深度分析
E — Evaluate    质量自检（字数/洞察深度/Mermaid 语法/能量评级）
D — Deliver     构造 JSON payload → learnlog CLI 入库
```

## 四、深度记录协议格式

每条 `insight` 字段遵循自顶向下、视觉优先结构：

| # | 段落 | 内容 |
|---|------|------|
| 1 | **一句话结论** | 结论先行，30 秒抓要点 |
| 2 | **系统全景** | Mermaid 图 + ASCII 结构图 |
| 3 | **Why** | 第一性原理，回归底层 |
| 4 | **架构与流程** | ASCII 树状/流程 + Mermaid |
| 5 | **关键决策** | 替代方案对比表 |
| 6 | **STAR + 迁移** | S/T/A/R + 跨领域迁移 |

字数 ≥ 1200 字。图多文少，每章节独立，同一件事不重复使用。

## 五、`learnlog` CLI 规范

### 基本用法

```bash
learnlog record "主题" "洞察" --tag 标签 --energy 5 --aha true --type deep-research
learnlog status
learnlog feed
learnlog service install | status | restart | logs
learnlog update <id> --energy 5
learnlog delete <id>
```

### 长文必须用管道

```bash
# ❌ 错误：argv 有截断风险
learnlog record "主题" "2000 字长文..."

# ✅ 正确
echo "2000 字长文..." | learnlog record "主题" --pipe
echo "修正内容..." | learnlog update 42 --pipe
```

### Diagram 换行符

```bash
# ✅ 用 $'...' 让 bash 解析换行
learnlog record "主题" "insight" --diagram $'graph TD\n  A-->B'

# ✅ 或用变量
DIAGRAM="graph TD
  A-->B"
learnlog record "主题" "insight" --diagram "$DIAGRAM"
```

### 更新 vs 覆盖

`learnlog update` 是部分更新 (PATCH 语义)，只改传入字段。

## 六、标签命名规范

```
cn.dolphinmind.learning.log.tag.{category}.{path...}.{name}
category: discipline / subject / topic / project

示例:
  cn.dolphinmind.learning.log.tag.discipline.cs
  cn.dolphinmind.learning.log.tag.discipline.cs.ai
  cn.dolphinmind.learning.log.tag.topic.react.fiber
  cn.dolphinmind.learning.log.tag.project.business.s-pay-mall
```

## 七、前端查看

```
时间线:   http://localhost:3000
图谱:     http://localhost:3000/graph   (3 视图: 力导向/时间线/星系)
Feed:     http://localhost:3000/feed
API 文档: http://localhost:8002/docs
```

## 八、快速上手指南 (AI 接入)

将以下 prompt 粘贴到任何 AI 对话开头即可获得学习记录能力：

```
你可以通过 HTTP API 将对话洞察存入知识库:
# 记录
curl -s -X POST http://localhost:8002/api/entries -H "Content-Type: application/json" -d '{...}'
# 创建标签
curl -s -X POST http://localhost:8002/api/tags -H "Content-Type: application/json" -d '{...}'
# 查看状态
curl http://localhost:8002/api/stats

触发时机: 当用户说"记录一下"、产生深刻洞察、完成复杂分析、产出可复用模式时主动记录。

记录格式: 结论先行 + Mermaid 图 + Why(第一性原理) + 架构流程 + 决策对比 + STAR。

标签: cn.dolphinmind.learning.log.tag.{分类}.{路径}.{名称}
```
