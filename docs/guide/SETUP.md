# 接入 Learning Log

## 前置依赖

- Python 3.10+, Node.js 18+
- Ollama（AI 分析用），安装并拉取模型:
  ```bash
  ollama pull qwen3-coder:30b   # 或任意本地模型
  ```

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

## AI 模型配置

编辑 `backend/.env` 设置本地 Ollama 模型：

```env
AI_API_URL=http://localhost:11434/api/generate
AI_MODEL=qwen3-coder:30b               # 换成你本地已安装的模型
```

验证模型可用：
```bash
curl http://localhost:11434/api/tags   # 查看已安装模型
```

## 服务安装（持久化，推荐）

一键安装全部后台服务（后端 :8002 + 前端 :3000 + MCP SSE :8010）：

```bash
learnlog service install
```

或分别安装：
```bash
# 后端 + 前端（数据库操作 + 网页界面）
learnlog service install

# MCP SSE 服务（供任意 AI 代理接入）
python3 scripts/tools/mcp_manager.py install
```

安装后可通过以下地址访问：
- 网页界面: http://localhost:3000
- API 文档: http://localhost:8002/docs
- MCP SSE: http://localhost:8010/sse

## AI 代理接入

### Cline (VS Code)

编辑 `~/.config/cline/mcp_settings.json`，添加：

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

### Claude Code

项目根目录 `.mcp.json` 已配置 STDIO 模式，无需额外操作。

### OpenCode

全局 Skill 在 `~/.config/opencode/skills/` 已就绪，使用斜杠命令触发：
- `/记录` — 深度知识沉淀
- `/状态` — 系统状态
- `/灵感` — 快速顿悟
- `/命令` — 命令列表

### 任意 HTTP 客户端

```bash
curl -X POST http://localhost:8002/api/entries \
  -H "Content-Type: application/json" \
  -d '{"topic": "你的主题", "insight": "学习内容"}'
```

## 可用命令

| 命令 | 作用 |
|------|------|
| `learnlog status` | 系统状态 |
| `learnlog record "主题" --pipe` | 管道记录 |
| `learnlog service restart` | 重启服务 |
| `learnlog service logs` | 查看日志 |
| `python3 scripts/tools/mcp_manager.py status` | MCP SSE 状态 |
