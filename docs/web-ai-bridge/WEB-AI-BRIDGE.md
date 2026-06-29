# Web AI Bridge — 让网页 AI 指挥本地工具链

> **核心理念反转**：浏览器只是聊天入口，真正的大脑是本地工具链。
> 网页 ChatGPT / Claude / DeepSeek / Gemini 通过桥接插件，统一调用 OpenCode + MCP 工具总线 + Ollama 执行实际工作。
> 多个网页 AI 共享同一套本地能力和上下文。

---

## 一、架构哲学：从"要答案"到"给指令"

### 旧方向（v1，已被推翻）

```
CLI  →  Bridge Server  →  Playwright  →  网页 AI "要回答"
```

CLI 用浏览器自动化去网页 AI 那里"偷"答案。网页 AI 是大脑，本地是乞丐。

### 新方向（v2，本文档）

```
网页 AI (ChatGPT/Claude/DeepSeek/Gemini)    ← 聊天入口
       │
       ▼
Chrome Extension (content script 捕获指令)
       │
       ▼
Bridge Server (Context Manager，可选)
       │
       ▼
OpenCode HTTP Server                         ← 真正的大脑
       │
       ▼
MCP 工具总线
   ├── Filesystem MCP     →  读写项目文件
   ├── Git MCP            →  commit / branch / diff
   ├── Ollama MCP         →  本地推理 (qwen3-coder:30b)
   ├── SQLite MCP         →  查询数据库
   ├── Memory MCP         →  持久化上下文
   └── Browser MCP        →  打开网页、截图
```

**网页 AI 负责思考意图**，**本地工具链负责执行**。两者通过桥接插件解耦。

### 关键原则

| 原则 | 说明 |
|------|------|
| **浏览器 = UI 层** | 只负责聊天界面显示和用户输入捕获 |
| **OpenCode = 大脑** | 理解意图、拆解任务、调用 MCP |
| **MCP = 手** | 执行具体操作（读文件、写代码、查数据库） |
| **Ollama = 推理引擎** | 本地模型跑在 MCP 下游，被 OpenCode 调用 |
| **上下文共享** | 多个网页 AI 共用同一套 Context Manager |

---

## 二、架构拓扑详解

### 2.1 数据流

```ascii
用户输入 "修改 todo.md"
       │
       ▼
┌─────────────────────┐
│ 网页 AI (ChatGPT)   │  ← 负责"思考"用户意图
│ "I'll help you..."  │     生成修改方案
└─────────┬───────────┘
          │ AI 决定调用工具
          ▼
┌─────────────────────┐
│ Chrome Extension    │  ← content script 拦截工具调用
│ content.js          │     POST 给本地
└─────────┬───────────┘
          │ HTTP POST
          ▼
┌─────────────────────┐
│ Bridge Server       │  ← 可选：Context Manager
│ :9877               │     会话路由 / 历史管理
└─────────┬───────────┘
          │ HTTP POST
          ▼
┌─────────────────────┐
│ OpenCode HTTP API   │  ← 拆解任务、编排工具
│ :xxxx/chat          │     这里才是真正的大脑
└─────────┬───────────┘
          │ 按需调用
          ▼
┌─────────────────────────────────────────┐
│ MCP 工具总线                             │
│                                         │
│   Filesystem ── 读/写/编辑项目文件        │
│   Git        ── commit / branch / status │
│   Ollama     ── 本地推理 (8B~30B)        │
│   SQLite     ── 查询数据库               │
│   Memory     ── 长短期记忆               │
│   Playwright ── 打开网页 / 截图 / 测试    │
└─────────────────────────────────────────┘
          │
          ▼
  结果逐级返回 → 最终呈现在网页 AI 聊天框中
```

### 2.2 多 AI 共享上下文

关键能力：**今天 ChatGPT 改了 todo.md，明天 Claude 网页版能接着干**。

```ascii
       时间线 →
────────────────────────────────────────────────────
ChatGPT 用户: "添加一个 Python 脚本处理日志"
ChatGPT: [调用 Filesystem MCP] → 创建 log_processor.py

Claude 用户: "测试一下 log_processor.py"
Claude: [读取 Memory MCP] → 找到刚才创建的文件
        [调用 Bash MCP]    → python3 log_processor.py
        [调 Ollama MCP]   → 分析输出

DeepSeek 用户: "优化一下性能"
DeepSeek: [读取 Memory MCP] → 看到上下文
         [调 Ollama MCP]   → 分析瓶颈
         [Filesystem MCP]  → 修改代码
```

所有上下文存在本地 `Context Manager` 中，每个 AI 会话共享同一套：

- 项目文件状态（Filesystem MCP 实时）
- Git 历史（Git MCP）
- 对话摘要（Memory MCP）
- 文件变更记录（SQLite）

---

## 三、五种架构模式对比

### 模式 ① Browser MCP Bridge ← **最适合你**

```
网页 AI ─→ Extension ─→ localhost ─→ OpenCode ─→ MCP ─→ Ollama / 文件系统
```

| 维度 | 评价 |
|------|------|
| 网页 AI 兼容性 | ⭐⭐⭐⭐⭐ 任意网页 AI |
| 本地 CLI 能力 | ⭐⭐⭐⭐⭐ 完整 MCP 工具链 |
| Ollama 集成 | ⭐⭐⭐⭐⭐ OpenCode 原生支持 |
| 复杂度 | ⭐⭐⭐ 中等 |
| 推荐指数 | ★★★★★ |

**你的现有资产完全匹配**：OpenCode、MCP、Ollama、Qwen 全部已就绪。

### 模式 ② Continue Browser Extension

```
网页 AI ─→ Continue ─→ VSCode ─→ Continue Server ─→ Ollama
```

| 维度 | 评价 |
|------|------|
| 网页 AI 兼容性 | ⭐⭐⭐⭐ 有限制 |
| 本地 CLI 能力 | ⭐⭐⭐⭐ 通过 Continue |
| Ollama 集成 | ⭐⭐⭐⭐⭐ 原生 |
| 复杂度 | ⭐⭐ 低 |
| 推荐指数 | ★★★★★ |

适合"网页 AI 思考 + 本地模型补代码/重构"的场景。

### 模式 ③ OpenCode HTTP Server ← **推荐你优先实现**

```
网页 AI ─→ Extension ─→ POST :xxxx/chat ─→ OpenCode API ─→ Ollama / MCP
```

| 维度 | 评价 |
|------|------|
| 网页 AI 兼容性 | ⭐⭐⭐⭐ HTTP API |
| 本地 CLI 能力 | ⭐⭐⭐⭐⭐ OpenCode 完整 |
| Ollama 集成 | ⭐⭐⭐⭐⭐ |
| 复杂度 | ⭐⭐ 低 |
| 推荐指数 | ★★★★★ |

**浏览器不需要知道 Ollama，全部交给 OpenCode**。

### 模式 ④ AI Web Connector

```
网页 ─→ Content Script ─→ Native Messaging ─→ Python ─→ Ollama
```

| 维度 | 评价 |
|------|------|
| 网页 AI 兼容性 | ⭐⭐⭐⭐ |
| 本地 CLI 能力 | ⭐⭐ 有限 |
| Ollama 集成 | ⭐⭐⭐⭐ |
| 复杂度 | ⭐⭐⭐⭐ |
| 推荐指数 | ★★★★☆ |

适合"读取当前网页内容 → 发送给本地 LLM → 回答注入页面"的轻量场景。

### 模式 ⑤ MCP Browser Client

```
网页 AI ─→ MCP Bridge → Filesystem MCP / Git MCP / SQLite MCP / Memory MCP / Ollama
```

| 维度 | 评价 |
|------|------|
| 网页 AI 兼容性 | ⭐⭐⭐⭐⭐ |
| 本地 CLI 能力 | ⭐⭐⭐⭐⭐ 全 MCP |
| Ollama 集成 | ⭐⭐⭐⭐⭐ |
| 复杂度 | ⭐⭐⭐⭐⭐ 最高 |
| 推荐指数 | ★★★★★ |

终极方案：Chrome 插件本身就是 MCP Client。但开发量最大。

---

## 四、当前实现状态（v1）

### 已完成的 CLI 桥（将被重构）

| 组件 | 文件 | 状态 |
|------|------|------|
| Bridge Server | `backend/bridge_server.py` | ✅ WebSocket + HTTP 双协议 |
| Chrome Extension | `chrome-extension/` | ✅ MV3，6+ AI 平台 |
| Playwright 引擎 | `backend/bridge_engine.py` | ✅ 自动降级，无需开页面 |
| CLI web-ai | `~/.local/bin/web-ai` | ✅ 多后端自动选优 |
| Skill 注册 | `~/.config/opencode/skills/web-ai/SKILL.md` | ✅ `/web-ai` 斜杠命令 |

### 当前的工作模式（正反向混合）

```
CLI 或 AI 助手
    │
    ▼
web-ai "问题"
    │
    ├─ ① Ollama 本地 ← 最快
    │
    ├─ ② Bridge Server
    │    ├─ Extension 快通道 → 网页 AI 执行
    │    └─ Playwright 引擎 (headless) → 自动操作网页 AI
    │
    └─ ③ GitHub Models API ← 备用
```

### 当前模式的本质

仍然带着"向网页 AI 要答案"的旧思维痕迹。Bridge Server 的主要工作是**转发 prompt → 拿到回答**，而不是让网页 AI 指挥本地工具。

---

## 四-B：ChatGPT 连通实现（2026-06-29 已验证）

### 数据流

```
终端 / MCP
  ↓  HTTP POST /ask
Bridge Server :9877
  ↓  WebSocket
Chrome Extension background.js
  ↓  chrome.scripting.executeScript (MAIN world，绕过 content.js 缓存)
ChatGPT 页面
  ↓  execCommand('insertText') + Enter
ProseMirror 编辑器
  ↓
ChatGPT 流式输出回答
  ↓  DOM 选择器轮询
async function waitForResponse()
  ↓
逐级返回至调用方
```

### 关键技术决策

| 决策 | 选项 | 最终选择 | 原因 |
|------|------|---------|------|
| 代码注入方式 | content.js vs executeScript | **executeScript (MAIN world)** | 绕过 Chrome 扩展文件缓存，每次注入新鲜代码 |
| 输入框定位 | CSS 选择器 + offsetParent 检查 | **直接 querySelector('#prompt-textarea')** | ChatGPT 的 ProseMirror 在 CSS Grid 布局中 offsetParent 可能为 null |
| 文本填充 | textContent vs execCommand | **document.execCommand('insertText')** | ProseMirror 编辑器忽略 textContent 赋值，需要 DOM 级别的输入事件 |
| 发送方式 | 找发送按钮 vs Enter | **KeyboardEvent Enter** | ChatGPT 的发送按钮可能不可见或未渲染 |
| 超时策略 | 短超时快速降级 vs 长超时等回答 | **60s Extension 超时** | ChatGPT 通常 10-30s 才能完成思考+流式输出 |
| 响应提取 | body.innerText diff vs 选择器 | **`[data-message-author-role="assistant"]` 选择器 + last()** | 避免捕获免责声明、侧边栏等噪声 |
| 旧回答过滤 | 无过滤 vs 记录旧回答 | **lastKnownResponse 参数传入 waitForResponse** | 多轮对话中跳过上一次的回答，等新回答出现 |

### 踩过的坑

| 问题 | 根因 | 解决 |
|------|------|------|
| 拿到免责声明"也可能会犯错"(23字符) | `.markdown` 选择器匹配到页面底部元素 | 去掉 `.markdown` fallback，只用 `[data-message-author-role="assistant"]` |
| "找不到输入框" | `offsetParent !== null` 检查在 CSS Grid 布局下通不过 | 直接 `querySelector('#prompt-textarea')` 跳过可见性检查 |
| 内容填不进去 | `textContent = prompt` 对 ProseMirror 无效 | 改用 `execCommand('insertText', false, prompt)` |
| 输入框重试超时 | 1.5s×5=7.5s > Extension 5s 超时 | 0.4s×10=4s + MutationObserver 等待 |
| Extension 总是超时降级 | 5s 超时 < ChatGPT 典型响应时间 | 5s → 60s |
| 旧 content.js 缓存 | Chrome 扩展文件缓存不更新 | 文件改名 `content.js → content_v2.js` + `executeScript` 完全绕过 |
| 引擎线程崩溃 | Playwright Sync API 跨线程 | 单线程执行器 `ThreadPoolExecutor(max_workers=1)` |

### 性能基准

| 场景 | 耗时 | 字符数 | 备注 |
|------|------|--------|------|
| 简单问答（"TCP vs UDP 区别"） | ~30s | ~2000 | ChatGPT 含思考+流式 |
| 概念解释（"CAP 定理"） | ~30s | ~2355 | 含 Mermaid 图 |
| 技术对比（"merge vs rebase"） | ~49s | ~1993 | 含代码示例 |
| Extension 空转超时（无 Extension） | ~5s | — | 降级到 Playwright 引擎 |
| Ollama 本地模型 | ~0.5s | — | 最快路径 |

### 流式推送实现（2026-06-29）

将 Extension 的 `executePrompt` 拆为**两阶段**模式：

```
Phase 1: 注入 prompt + 发送（chrome.scripting.executeScript）
Phase 2: 轮询 ChatGPT 页面 → WS progress 消息 → Bridge → CLI 轮询
```

#### 数据流

```
web-ai --stream "问题"
  ↓  POST /ask/start
Bridge Server :9877
  ↓  立即返回 stream_id
CLI 拿到 stream_id
  ↓  后台: ask_platform(stream_id) 在主循环执行
  │     ├─ WS → Extension → executeScript → 打字 + Enter
  │     └─ 等待 Extension 返回
  │  
  │  Extension Phase 2:
  │     ├─ polling loop (800ms) → 读 [data-message-author-role]
  │     ├─ WS progress → streaming_results[stream_id]
  │     └─ WS response → event.set() → ask_platform 完成
  │
CLI polling loop (500ms):
  GET /ask/progress?stream_id=xxx
  ├─ text 增长 → 输出新增字符
  └─ done=true → 结束
```

#### 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/ask/start` | POST | 异步启动执行，返回 stream_id |
| `/ask/progress?stream_id=xxx` | GET | 查询当前进度文本 |
| `/ask/stream?stream_id=xxx` | GET | SSE 长连接推送（备选） |

### 关键优化

| 优化 | 改动前 | 改动后 |
|------|--------|--------|
| **原子化 executeScript** | Phase 1.5 + Phase 1 + Phase 2 三段注入，窗口期被污染 | 打字→计数→轮询→返回**单次注入**，无窗口期 |
| **beforeCount 时序** | 打字后捕获，ChatGPT 秒回时漏检 | 打字**前**捕获，任何速度都能检测 |
| **轮询速度** | 600ms 间隔，稳定 3 轮（1.8s）才返回 | 300ms 间隔，稳定 2 轮（600ms）即返回 |
| **防重提交** | 相同 prompt 重复打字进 ChatGPT | prompt 指纹缓存 60s，命中直接返回缓存 |
| **Tab 温保** | 每次请求后预聚焦 + 30s 保活心跳 | 加速下次请求的输入框定位 |

### 仍存在的问题

| 问题 | 影响 | 计划 |
|------|------|------|
| ChatGPT 回答慢（10-30s） | 用户等待感知差 | ✅ 已实现**流式推送**（逐段显示） |
| Extension 断开后降级到 Playwright 引擎 | ChatGPT 因 Cloudflare 不可用 | 探索反检测方案 |
| 无多轮对话上下文传递 | 每次提问是独立会话 | Context Manager Phase 3 |

---

## 五、推荐实施计划

### Phase 1：OpenCode HTTP Server（1 天）

| 任务 | 说明 |
|------|------|
| 确认 OpenCode HTTP API 地址 | `opencode-server/` 或已有端口 |
| 测试 POST `/chat` 能调通 | 从浏览器扩展发送 prompt |
| 验证 MCP 工具链完整 | Filesystem / Git / Ollama 都可用 |
| 建立路由 | Bridge Server 新增 `/api/opencode` 代理 |

### Phase 2：Extension 加 POST 通道（2 天）

| 任务 | 说明 |
|------|------|
| content.js 新增捕获 | 拦截网页 AI 的工具调用意图 |
| background.js 新增 POST | 发送到 OpenCode HTTP API |
| popup 加模式切换 | "仅回答" vs "指挥本地" |
| 上下文 token 传递 | 会话 ID 嵌入请求 |

### Phase 3：Context Manager（3 天）

| 任务 | 说明 |
|------|------|
| 会话路由 | 多 AI 同 session → 共享上下文 |
| Memory MCP 集成 | 长期记忆持久化 |
| 变更同步 | 一个 AI 改了文件 → 其他 AI 可见 |
| WebSocket 实时推送 | 文件变更主动通知各 AI 页面 |

### Phase 4：界面打磨

| 任务 | 说明 |
|------|------|
| popup 显示工具调用日志 | 实时看到本地执行了什么 |
| 授权控制 | 哪些网页 AI 可以调哪些工具 |
| 回滚支持 | 错误操作可 undo |

---

## 六、Context Manager 设计

### 核心结构

```python
class ContextManager:
    """多 AI 共享上下文的中央管理器"""
    
    # 会话 → 上下文映射
    sessions: dict[str, SessionContext]
    
    # 文件变更日志
    file_changes: deque[FileChange]
    
    # Memory MCP 代理
    memory: MemoryMCP
```

### 数据流

```ascii
ChatGPT 修改了 src/main.py
       │
       ▼
Extension POST { session: "proj-123", action: "file_change", path: "src/main.py" }
       │
       ▼
Context Manager
   ├── 记录变更 → file_changes.push(...)
   ├── 更新 Memory → memory.update("project-123", "src/main.py changed")
   └── 广播变更 → WS push to all AI tabs in same session
       │
       ▼
Gemini 页面收到通知: "src/main.py 已被 ChatGPT 修改"
Gemini 用户: "让我看看改了什么"
       │
       ▼
Gemini → Extension → OpenCode → Filesystem MCP → 读取 src/main.py
```

### 共享的数据

| 数据类型 | 存储 | 共享范围 |
|---------|------|---------|
| 项目文件 | 磁盘 | 所有 AI 实时可见 |
| Git 历史 | Git MCP | 所有 AI 可查询 |
| 对话摘要 | Memory MCP | 同 session AI 共享 |
| 文件变更日志 | SQLite | 同 session AI 共享 |
| 工具调用记录 | SQLite | 同 session AI 共享 |

---

## 七、关键决策记录

| 决策 | 选项 | 选择 | 原因 |
|------|------|------|------|
| 大脑位置 | 浏览器 vs 本地 | **OpenCode 本地** | 已有 MCP/Ollama/Qwen，生态完整 |
| 传输协议 | WebSocket vs HTTP | **HTTP REST** | 简单、兼容所有 AI 页面 |
| 上下文共享 | 全局 vs 按 session | **按 session** | 项目隔离，避免串扰 |
| 工具调用方式 | AI 原生函数调用 vs HTTP | **HTTP POST** | 不依赖 AI 平台特定的 function calling |
| 执行引擎 | Playwright vs OpenCode | **OpenCode** | OpenCode 已集成了 MCP 工具链 |

---

## 八、文档索引

| 文档 | 内容 |
|------|------|
| 本文件 | Web AI Bridge 架构总览 |
| `../architecture/ARCHITECTURE.md` | 系统整体架构 |
| `../backend/BACKEND.md` | 后端 API 设计 |
| `../frontend/FRONTEND.md` | 前端 UI 设计 |
| `../graph/GRAPH.md` | 知识图谱架构 |
| `../graph/AI-CAPABILITIES.md` | AI 能力矩阵 |
| `../guide/REPRODUCE.md` | 完整复现指南 |

---

## 附录：版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1 | 2026-06 前 | 原始版：CLI 通过 Playwright 向网页 AI 要回答 |
| v2 | 2026-06-29 | **架构反转**：网页 AI 通过 Extension → OpenCode → MCP 指挥本地工具链 |
