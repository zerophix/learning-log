# Learning Log — 完整复现指南

> 从零开始 1:1 复现整个系统。任何 AI 按此文档操作即可完整重建。

详细架构参考: `../architecture/ARCHITECTURE.md` · `../backend/BACKEND.md` · `../frontend/FRONTEND.md` · `../graph/GRAPH.md` · `../graph/AI-CAPABILITIES.md`

---

## 1. 环境准备

```bash
# Node.js >= 18, Python >= 3.10
python3 -m venv ../venv          # 在项目根目录
source ../venv/bin/activate
```

## 2. 后端

### 2.1 安装依赖

```bash
cd backend
pip install fastapi==0.104.1 uvicorn==0.24.0 requests==2.31.0 \
            python-dotenv==1.0.0 mcp>=1.0.0 pydantic==2.5.0 \
            sentence-transformers scikit-learn jieba
```

完整依赖见 `backend/requirements.txt`

### 2.2 创建目录结构

```
backend/
├── app/
│   ├── main.py                    # FastAPI 入口 (~36 行)
│   ├── __init__.py
│   ├── core/
│   │   └── config.py              # PROJECT_DIR, DB_PATH, BACKEND_URL
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py         # 6 router 聚合
│   │       ├── entries.py          # CRUD / feed / week / neighbors
│   │       ├── tags.py             # CRUD / tree / links / cloud
│   │       ├── graph.py            # /api/graph + /api/graph/attention
│   │       ├── projects.py         # 项目列表
│   │       ├── stats.py            # /api/stats
│   │       └── nl_commands.py      # 自然语言命令
│   ├── db/
│   │   ├── __init__.py             # init_db()
│   │   ├── schema.py               # 4 表 DDL + 12 索引
│   │   └── migrations.py           # ALTER TABLE 迁移
│   ├── models/
│   │   └── __init__.py             # 6 Pydantic 模型
│   ├── services/
│   │   ├── embedding_service.py    # SentenceTransformer
│   │   ├── attention_service.py    # 注意力关联计算
│   │   ├── clustering_service.py   # Louvain 社区检测
│   │   ├── ai_service.py           # AI 分析 (Ollama/OpenAI)
│   │   └── lifecycle.py            # MCP 后端保活
│   └── utils/
│       ├── db_utils.py             # get_db, row_to_dict
│       ├── text_processing.py      # 标签提取 + 摘要
│       └── date_utils.py           # 周日期计算
├── mcp_server.py                   # MCP 入口 (委托 protocols/mcp.py)
├── protocols/
│   ├── __init__.py
│   └── mcp.py                      # MCP 工具 + handler (~300 行)
├── scripts/
│   ├── auto_capture.py             # watch 目录扫描
│   ├── quick_record.py             # 交互式记录
│   ├── seed_tags.py                # 种子标签数据
│   └── test_mcp.py                 # MCP 功能测试
├── .env.example
└── requirements.txt
```

### 2.3 环境变量

`backend/.env`:
```env
BACKEND_URL=http://localhost:8002
AI_API_URL=http://localhost:11434/api/generate
AI_MODEL=qwen2.5
```

### 2.4 启动

```bash
cd backend
python3 -c "from app.db import init_db; init_db()"  # 初始化数据库
python3 -m app.main                                    # 启动 FastAPI
# → http://0.0.0.0:8002
```

**验证**: `curl http://localhost:8002/api/stats` → `{"entries": 0, "tags": 0, "links": 0}`

### 2.5 种子数据 (可选)

```bash
python3 scripts/seed_tags.py     # 41 标签 + 37 关联 (需后端已启动)
python3 scripts/test_mcp.py      # 3 个功能测试
```

## 3. 前端

### 3.1 创建项目

```bash
cd frontend
npm init -y
```

### 3.2 package.json

```json
{
  "name": "learning-log-ui",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "^18",
    "react-dom": "^18",
    "echarts": "^5.4.3",
    "mermaid": "^10.9.0",
    "react-markdown": "^10.1.0",
    "react-syntax-highlighter": "^16.1.1",
    "rehype-raw": "^7.0.0",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "typescript": "^5"
  }
}
```

### 3.3 目录结构

```
frontend/
├── app/
│   ├── layout.tsx                  # 根布局
│   ├── page.tsx                    # 首页 — 时间线 (按周分页)
│   ├── graph/
│   │   └── page.tsx                # 图谱 — 3 视图 (Force/Timeline/Galaxy)
│   └── feed/
│       └── page.tsx                # Feed 流 (卡片网格)
├── components/
│   ├── ui/                         # 原子组件
│   │   ├── Icons.tsx               # 14 个 SVG 图标
│   │   ├── Tag.tsx
│   │   ├── CopyButton.tsx
│   │   ├── SearchBar.tsx
│   │   └── ErrorBoundary.tsx
│   ├── entry/                      # 条目组件
│   │   ├── EntryCard.tsx
│   │   ├── EntryDetail.tsx
│   │   ├── EntryDetailContent.tsx
│   │   ├── EntryForm.tsx
│   │   ├── EntryTags.tsx
│   │   ├── DeleteConfirm.tsx
│   │   ├── FormField.tsx
│   │   └── InsightPreview.tsx
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   ├── PageHeader.tsx
│   │   ├── FilterBar.tsx
│   │   └── StatsPanel.tsx
│   ├── graph/                      # 图谱专用组件
│   │   ├── GraphToolbar.tsx        # 工具栏 (CSS Module)
│   │   ├── GraphLegend.tsx         # 图例
│   │   ├── ClusterPanel.tsx        # 聚类面板
│   │   └── NodeDetailPanel.tsx     # 节点详情
│   ├── renderers/
│   │   ├── MarkdownRenderer.tsx
│   │   ├── CodeBlock.tsx
│   │   └── MermaidDiagram.tsx
│   └── timeline/
│       └── TimelineView.tsx
├── hooks/
│   ├── useGraphState.ts            # useReducer 状态管理
│   ├── useGraphNavigation.ts       # 导航历史
│   ├── useGraphPreferences.ts      # 偏好持久化 (localStorage)
│   └── useToast.tsx
├── lib/
│   ├── api.ts                      # 统一 API 客户端
│   ├── constants.ts                # 常量
│   ├── graph-utils.ts              # 图谱工具函数
│   └── graph-echarts-options.ts    # ECharts 配置工厂 (3 视图)
├── types/
│   ├── index.ts                    # 通用类型
│   └── graph.ts                    # 图谱专用类型
├── styles/
│   ├── index.css                   # CSS 变量 + 全局样式
│   └── GraphToolbar.module.css     # 工具栏 CSS Module
├── tsconfig.json
├── next.config.js
└── package.json
```

### 3.4 关键配置

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  }
}
```

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;
```

### 3.5 启动

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## 4. 验证

```bash
# 后端健康
curl http://localhost:8002/api/stats
# → {"entries": 42, "tags": 253, "links": 37}

# 前端
open http://localhost:3000      # 时间线
open http://localhost:3000/graph  # 图谱 (3 视图)
open http://localhost:3000/feed   # Feed 流

# API 文档
open http://localhost:8002/docs
```

## 5. 部署 (macOS launchd)

```bash
# 安装持久化服务 (一次配置，永久生效)
learnlog service install
# 手动启动
bash deploy/start.sh
```

## 6. AI 协作设置 (可选)

详见 `../graph/AI-CAPABILITIES.md`。将 `../graph/AI-CAPABILITIES.md` 内容粘贴到 AI 对话开头即可获得学习记录能力。

## 关键文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/main.py` | ~36 | FastAPI 入口 |
| `backend/protocols/mcp.py` | ~300 | MCP 协议层 |
| `frontend/app/graph/page.tsx` | 583 | 图谱主页面 |
| `frontend/lib/graph-echarts-options.ts` | ~300 | ECharts 配置 |
| `frontend/hooks/useGraphState.ts` | ~250 | 图谱状态管理 |
| `frontend/components/graph/GraphToolbar.tsx` | ~180 | 工具栏 |
| `frontend/styles/index.css` | ~300 | 全局样式 |
