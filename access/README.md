# Learning Log 全局接入指南

> 从任何 AI 客户端、任何项目、任何终端窗口，一句话接入知识沉淀能力。

---

## 快速开始（30 秒）

```bash
# 1. 安装 CLI（已内置）
learnlog status

# 2. 添加到 Shell（在 ~/.zshrc 末尾加一行）
source ~/PycharmProjects/learning-log/access/shell-integration.sh

# 3. 开始使用
llr "学到的知识" "核心洞察"
```

---

## 四种接入方式

### 方式 A: CLI 命令（任何终端）

从 Mac 的任何目录、任何项目直接调用：

```bash
# 基础
learnlog record "主题" "洞察" --energy 5 --aha true

# 管道（AI 最常用）
echo "长文分析..." | learnlog pipe --topic "主题" --energy 5

# Shell 别名
llr "主题" "洞察"       # 快速记录
lla "一句话洞察"        # 快速顿悟（自动 energy=5）
llc "主题"              # 从剪贴板记录 (macOS)
lls                     # 查看状态
llf                     # 查看最近 10 条
```

### 方式 B: AI 提示词卡片

把 `access/ai-prompt-card.md` 的内容粘贴到任何 AI 对话中，AI 即可通过 Shell 或 HTTP API 自动记录。

**适用场景**：
- ChatGPT / Claude Web / 其他 LLM 界面
- 新项目的 CLAUDE.md 文件中引用
- 发给团队成员作为接入文档

### 方式 C: Claude Code MCP（深度集成）

在 Claude Code 项目的 `.claude/settings.local.json` 中添加：

```json
{
  "mcpServers": {
    "learning-log": {
      "command": "python3",
      "args": ["/Users/mingxilv/PycharmProjects/learning-log/backend/mcp_server.py"],
      "env": {
        "BACKEND_URL": "http://localhost:8002"
      }
    }
  }
}
```

AI 即可直接调用 `capture_learning` 和 `batch_capture` 工具。

### 方式 D: HTTP API（任何语言/平台）

```
POST http://localhost:8002/api/entries
```

完整的 REST API 文档见 `docs/backend-design-system.md` 第六章。

---

## 跨项目使用

### 场景 1: 在其他代码项目中

```bash
cd ~/my-other-project
# 不需要任何配置，直接使用
learnlog record "学到的新知识" "详细分析..."
```

CLI 自动检测并启动后端，与当前工作目录无关。

### 场景 2: 在新 AI 对话中

把这段放到对话开头：

> 你可以通过 `learnlog record "主题" "洞察"` 命令将学习记录保存到我的知识库。当讨论产生有价值的洞察时请主动记录。

### 场景 3: 开机自启动后端

```bash
# 在 ~/.zshrc 中添加
learnlog start 2>/dev/null &
```

---

## 文件索引

| 文件 | 用途 |
|------|------|
| `~/.local/bin/learnlog` | CLI 主程序（全局可执行） |
| `access/shell-integration.sh` | Shell 别名和快捷函数 |
| `access/ai-prompt-card.md` | 通用 AI 提示词模板 |
| `access/claude-code-mcp-config.json` | Claude Code MCP 配置模板 |
| `docs/backend-design-system.md` | 完整后端 API 文档 |
| `docs/ai-collaboration-design.md` | AI 协作机制详解 |
