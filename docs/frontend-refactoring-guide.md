# 前端重构指南 v2.0

> **目标读者**: 任何 AI 代理（Claude Code / Cline / Cursor 等）
> **最后更新**: 2026-06-27
> **状态**: 待执行

---

## 1. 现状诊断

### 1.1 文件清单与问题

| 文件 | 行数 | 状态 | 问题 |
|------|------|------|------|
| `app/page.tsx` | 955 | ⚠️ 在用但需拆分 | 所有组件内联定义，巨型单文件 |
| `app/mvp/page.tsx` | 448 | ❌ 死代码 | 使用不存在的 status/priority 字段，模拟数据 |
| `app/globals.css` | 90 | ✅ 在用 | CSS 变量 + 基础 Markdown 样式 |
| `styles/layout.css` | 806 | ❌ 未被引用 | 旧组件架构的 CSS，当前无组件使用 |
| `types/index.ts` | 20 | ❌ 过时 | 与实际 Entry 接口完全不匹配 |
| `lib/navigation.ts` | 54 | ❌ 未被引用 | 旧导航状态管理，当前页面未使用 |
| `components/*.tsx` | 11个文件 | ❌ 全部死代码 | 与 page.tsx 零引用关系 |

### 1.2 死代码详细清单

以下文件/目录当前**无任何引用**，可在重构完成后安全删除：

```
components/DataTable.tsx       — 2572 bytes, 旧表格组件
components/DetailModal.tsx     — 11660 bytes, 旧详情弹窗
components/DetailPanel.tsx     — 2577 bytes, 旧详情面板
components/EntryForm.tsx       — 3992 bytes, 旧表单组件
components/FeedCard.tsx        — 6288 bytes, 旧 Feed 卡片
components/FeedFilterBar.tsx   — 6837 bytes, 旧筛选栏
components/Footer.tsx          — 1001 bytes, 旧页脚
components/GraphView.tsx       — 3716 bytes, 旧图谱视图
components/Header.tsx          — 2728 bytes, 旧头部（使用旧类型）
components/Sidebar.tsx         — 4088 bytes, 旧侧边栏
components/TimelineView.tsx    — 5187 bytes, 旧时间线视图
app/mvp/page.tsx               — 18544 bytes, MVP 审核页（模拟数据）
styles/layout.css              — 806 lines, 旧布局样式
lib/navigation.ts              — 54 lines, 旧导航状态
```

### 1.3 page.tsx 内联组件清单

当前 `app/page.tsx` 中内联定义了以下组件，需逐一提取：

| 内联组件 | 行范围(约) | 职责 |
|----------|-----------|------|
| `Tag` | 113-126 | 标签徽章渲染 |
| `extractPreview` | 129-141 | 提取 insight 首段预览 |
| `InsightPreview` | 144-208 | 洞察预览渲染组件 |
| `TimelineNode` | 211-307 | 时间线节点卡片 |
| `CopyButton` | 310-356 | 代码复制按钮 |
| `MermaidDiagram` | 359-386 | Mermaid 图表渲染 |
| `DetailModal` | 389-748 | 详情弹窗（含 Markdown 渲染） |
| `Home` (主页面) | 750-955 | 数据加载 + 过滤 + 时间线布局 |

---

## 2. 后端 API 完整参考

前端重构必须基于以下**真实 API**，不要引入不存在的字段。

### 2.1 基础信息

- **Base URL**: `http://localhost:8002`
- **Content-Type**: `application/json`
- **CORS**: 已开启（`allow_origins=["*"]`）

### 2.2 Entry 数据模型

```typescript
// 创建 Entry（POST /api/entries）
interface LearningEntryCreate {
  topic: string;
  insight: string;                          // 核心洞察/分析文章（可长文）
  diagram?: string;                         // Mermaid 图示
  code_snippet?: string;                    // 代码实现片段
  star_situation: string;                   // STAR 情境
  star_task: string;                        // STAR 任务
  star_action: string;                      // STAR 行动
  star_result: string;                      // STAR 结果
  topic_tag_id?: string;                    // 主题标签 ID
  project_tag_id?: string;                  // 项目标签 ID
  research_type?: string;                   // "deep-research" | "topic-exploration" | "domain-mapping"
  related_tag_ids?: string[];               // 关联标签
  custom_tags?: string[];                   // 自定义标签
  analogy?: string;                         // 类比
  transfer_pattern?: string;                // 可迁移模式
  energy_level?: number;                    // 1-5
  aha_moment?: boolean;                     // 是否顿悟
  source?: string;                          // 来源
  confidence_rating?: number;               // 置信度
}

// 更新 Entry（PUT /api/entries/{id}）— 所有字段可选
type LearningEntryUpdate = Partial<LearningEntryCreate>;

// 前端展示用 Entry（GET 返回）
interface Entry {
  id: number;
  topic: string;
  insight: string;
  diagram?: string;
  code_snippet?: string;
  star_situation?: string;
  star_task?: string;
  star_action?: string;
  star_result?: string;
  topic_tag_id?: string;
  project_tag_id?: string;
  research_type?: string;
  related_tag_ids: string[];
  custom_tags: string[];
  analogy?: string;
  transfer_pattern?: string;
  energy_level: number;
  aha_moment: number;  // 注意：后端返回 0/1，非 boolean
  source: string;
  confidence_rating?: number;
  timestamp: string;
  content_hash?: string;
}
```

### 2.3 API 端点清单

| 方法 | 端点 | 参数 | 返回 | 说明 |
|------|------|------|------|------|
| GET | `/api/entries` | `limit=50, offset=0` | `Entry[]` | 分页获取 |
| GET | `/api/entries/{id}` | — | `Entry` | 单条详情 |
| POST | `/api/entries` | `LearningEntryCreate` | `{id, message}` | 创建 |
| PUT | `/api/entries/{id}` | `LearningEntryUpdate` | `{id, message, fields_updated}` | 部分更新 |
| DELETE | `/api/entries/{id}` | — | `{id, message}` | 删除 |
| GET | `/api/entries/feed` | `limit, offset, project_type?, discipline?, research_type?` | `Entry[]` | 带过滤的 Feed |
| GET | `/api/tags` | `category?` | `Tag[]` | 标签列表 |
| GET | `/api/tags/tree` | — | `TagNode[]` | 标签树 |
| GET | `/api/tags/{tag_id}/entries` | `research_type?` | `Entry[]` | 标签下条目 |
| GET | `/api/tag-links` | `source_tag_id?` | `TagLink[]` | 标签关联 |
| GET | `/api/graph` | — | `{nodes, edges}` | 图谱数据 |
| GET | `/api/stats` | — | `{entries, tags, links}` | 统计概览 |
| GET | `/api/projects` | `project_type?` | `Tag[]` | 项目列表 |
| GET | `/api/projects/{id}/entries` | `research_type?` | `Entry[]` | 项目下条目 |

### 2.4 研究类型枚举

```typescript
const RESEARCH_TYPES = {
  'deep-research':      { label: '深度研究', color: '#fbbf24' },
  'topic-exploration':  { label: '主题探索', color: '#34d399' },
  'domain-mapping':     { label: '领域映射', color: '#a78bfa' },
} as const;
```

---

## 3. 目标架构

### 3.1 目标文件结构

```
frontend/
├── app/
│   ├── page.tsx              # 主页（< 100 行，仅组合组件）
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式 + CSS 变量
├── components/
│   ├── ui/                   # 通用 UI 组件
│   │   ├── Tag.tsx           # 标签徽章
│   │   ├── CopyButton.tsx    # 复制按钮
│   │   └── SearchBar.tsx     # 搜索栏（P3 新增）
│   ├── entry/                # Entry 相关组件
│   │   ├── EntryCard.tsx     # 时间线卡片（原 TimelineNode）
│   │   ├── EntryDetail.tsx   # 详情弹窗（原 DetailModal）
│   │   ├── EntryForm.tsx     # 编辑表单（P3 新增）
│   │   └── InsightPreview.tsx # 洞察预览
│   ├── timeline/             # 时间线视图
│   │   └── TimelineView.tsx  # 时间线布局 + 日期分组
│   ├── layout/               # 布局组件
│   │   ├── Header.tsx        # 顶部导航
│   │   └── FilterBar.tsx     # 过滤器
│   └── renderers/            # 渲染器
│       ├── MarkdownRenderer.tsx  # Markdown 渲染（含代码高亮）
│       └── MermaidDiagram.tsx    # Mermaid 图表
├── lib/
│   ├── api.ts                # API 客户端（统一请求层）
│   ├── constants.ts          # 常量定义（颜色、枚举）
│   └── utils.ts              # 工具函数
├── types/
│   └── index.ts              # 统一类型定义
├── styles/
│   └── layout.css            # 清理后仅保留需要的样式
└── package.json
```

### 3.2 组件依赖关系

```
page.tsx
├── Header
│   └── FilterBar
├── TimelineView
│   ├── EntryCard (per entry)
│   │   ├── Tag
│   │   └── InsightPreview
│   └── (date grouping logic)
├── EntryDetail (modal, shown on click)
│   ├── MarkdownRenderer
│   │   ├── CopyButton
│   │   └── MermaidDiagram
│   └── Tag
└── SearchBar (P3)
```

### 3.3 设计原则

1. **单文件不超过 200 行**：每个组件职责单一
2. **类型先行**：先定义 `types/index.ts`，再写组件
3. **API 集中管理**：所有 fetch 调用走 `lib/api.ts`
4. **样式复用**：使用 `globals.css` 中的 CSS 变量，禁止硬编码颜色
5. **渐进式重构**：每完成一个步骤必须验证 `npm run build` 通过

---

## 4. 分阶段任务

### 阶段 P1：基础设施（零风险，不改现有功能）

#### P1.1 统一类型定义 + API 客户端

**创建** `types/index.ts`：
```typescript
// 基于后端 main.py 的 Pydantic 模型，1:1 映射
// 参见本文档 §2.2 的完整类型定义

export interface Entry { ... }
export interface LearningEntryCreate { ... }
export type LearningEntryUpdate = Partial<LearningEntryCreate>;
export interface Tag { ... }
export interface TagLink { ... }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; }
export interface Stats { entries: number; tags: number; links: number; }
```

**创建** `lib/api.ts`：
```typescript
const BASE_URL = 'http://localhost:8002';

export const api = {
  entries: {
    list: (limit = 50, offset = 0) =>
      fetch(`${BASE_URL}/api/entries?limit=${limit}&offset=${offset}`).then(r => r.json()),
    get: (id: number) =>
      fetch(`${BASE_URL}/api/entries/${id}`).then(r => r.json()),
    create: (data: LearningEntryCreate) =>
      fetch(`${BASE_URL}/api/entries`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: LearningEntryUpdate) =>
      fetch(`${BASE_URL}/api/entries/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: number) =>
      fetch(`${BASE_URL}/api/entries/${id}`, { method: 'DELETE' }).then(r => r.json()),
    feed: (params?: { limit?: number; offset?: number; project_type?: string; discipline?: string; research_type?: string }) => {
      const qs = new URLSearchParams(Object.entries(params || {})).toString();
      return fetch(`${BASE_URL}/api/entries/feed?${qs}`).then(r => r.json());
    },
  },
  tags: {
    list: (category?: string) =>
      fetch(`${BASE_URL}/api/tags${category ? `?category=${category}` : ''}`).then(r => r.json()),
    tree: () => fetch(`${BASE_URL}/api/tags/tree`).then(r => r.json()),
    entries: (tagId: string, researchType?: string) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      return fetch(`${BASE_URL}/api/tags/${tagId}/entries${qs}`).then(r => r.json());
    },
  },
  graph: () => fetch(`${BASE_URL}/api/graph`).then(r => r.json()),
  stats: () => fetch(`${BASE_URL}/api/stats`).then(r => r.json()),
};
```

**创建** `lib/constants.ts`：
```typescript
export const RESEARCH_TYPES = { ... } as const;
export const ENERGY_COLORS = { ... } as const;
export const TAG_COLORS = { ... } as const;
```

**验证**: `npm run build` 通过，页面功能不变。

---

#### P1.2 清理死代码

**删除**以下文件（参见 §1.2 清单）：
- `components/DataTable.tsx`
- `components/DetailModal.tsx`
- `components/DetailPanel.tsx`
- `components/EntryForm.tsx`
- `components/FeedCard.tsx`
- `components/FeedFilterBar.tsx`
- `components/Footer.tsx`
- `components/GraphView.tsx`
- `components/Header.tsx`
- `components/Sidebar.tsx`
- `components/TimelineView.tsx`
- `app/mvp/page.tsx`
- `lib/navigation.ts`

**保留** `styles/layout.css` 暂时不动（P2 拆分时按需迁移）。

**验证**: `npm run build` 通过，页面功能不变。

---

### 阶段 P2：组件拆分（中等风险，需保持功能等价）

**执行顺序**：自底向上，先提取叶子组件，再提取容器组件。

#### P2.1 提取叶子 UI 组件

1. **`components/ui/Tag.tsx`** — 从 page.tsx 的 `Tag` 组件提取
2. **`components/ui/CopyButton.tsx`** — 从 page.tsx 的 `CopyButton` 提取
3. **`components/entry/InsightPreview.tsx`** — 从 page.tsx 的 `InsightPreview` + `extractPreview` 提取
4. **`components/renderers/MermaidDiagram.tsx`** — 从 page.tsx 的 `MermaidDiagram` 提取

每个组件提取后，在 `page.tsx` 中改为 import 引用。每提取一个组件后执行 `npm run build` 验证。

#### P2.2 提取渲染组件

5. **`components/renderers/MarkdownRenderer.tsx`** — 从 `DetailModal` 中的 `ReactMarkdown` 配置提取
   - 包含所有 `components` 自定义渲染器（h1-h4, p, code, blockquote 等）
   - 接收 `content: string` prop

#### P2.3 提取 Entry 组件

6. **`components/entry/EntryCard.tsx`** — 从 `TimelineNode` 提取
   - Props: `entry: Entry`, `onClick: (e: Entry) => void`
7. **`components/entry/EntryDetail.tsx`** — 从 `DetailModal` 提取
   - Props: `entry: Entry | null`, `onClose: () => void`
   - 内部使用 `MarkdownRenderer`, `MermaidDiagram`, `CopyButton`, `Tag`

#### P2.4 提取布局组件

8. **`components/layout/FilterBar.tsx`** — 从 `Home` 中的过滤器按钮提取
9. **`components/timeline/TimelineView.tsx`** — 从 `Home` 中的时间线布局提取
   - 包含日期分组逻辑
   - 使用 `EntryCard`

#### P2.5 精简 page.tsx

最终 `app/page.tsx` 应只剩：
```typescript
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/layout/FilterBar';
import TimelineView from '@/components/timeline/TimelineView';
import EntryDetail from '@/components/entry/EntryDetail';
import type { Entry } from '@/types';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  // ... 数据加载逻辑（使用 api.entries.list）
  // ... 过滤逻辑
  return (
    <div className="layout">
      <Header />
      <FilterBar />
      <TimelineView entries={entries} onSelect={setSelected} />
      <EntryDetail entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
```

**验证**: 每步 `npm run build` 通过 + 页面视觉/交互不变。

---

### 阶段 P3：功能补齐（在干净架构上添加新功能）

#### P3.1 搜索功能

**前端过滤**（快速，适合 32 条规模）：
- 在 `Header` 中添加 `SearchBar` 组件
- 基于 `topic` + `insight` + `custom_tags` 做客户端过滤

**后端搜索**（当条目 > 200 时启用）：
- 后端新增 `GET /api/entries/search?q=keyword` 端点
- 前端 `api.entries.search(q)` 调用

#### P3.2 编辑/删除

- 在 `EntryDetail` 弹窗中添加「编辑」和「删除」按钮
- 编辑：弹出 `EntryForm` 预填数据，调用 `api.entries.update(id, data)`
- 删除：确认对话框，调用 `api.entries.delete(id)`，成功后刷新列表

#### P3.3 新建条目

- Header 的「+」按钮打开 `EntryForm`
- 表单字段对应 `LearningEntryCreate` 模型

---

### 阶段 P4：视图扩展（高级功能）

#### P4.1 多页面路由

- 引入 Next.js App Router 多页面
- `/` — 时间线视图
- `/graph` — ECharts 知识图谱
- `/feed` — Feed 卡片流

#### P4.2 统计仪表盘

- 能量分布饼图
- 标签热力图
- 周活跃度折线图

---

## 5. 约束与规则

### 5.1 必须遵守

1. **每步提交前 `npm run build` 必须通过** — 不允许中间态破坏
2. **不引入新依赖** — 使用现有 package.json 中的库（除非 P3/P4 明确需要）
3. **保持暗色主题** — 使用 `globals.css` 中的 CSS 变量
4. **类型安全** — 不使用 `any`，所有 props 显式类型
5. **API 调用走 `lib/api.ts`** — 禁止在组件中直接 `fetch`

### 5.2 禁止事项

1. ❌ 不要在组件中使用 `style={{}}` 内联样式超过 10 行 — 提取为 CSS class
2. ❌ 不要创建超过 200 行的单文件
3. ❌ 不要引入 Tailwind / styled-components — 保持现有 CSS 变量方案
4. ❌ 不要修改后端 API — 前端适配后端，而非反过来
5. ❌ 不要删除 `app/globals.css` 中的 CSS 变量定义

### 5.3 Git 提交规范

```
refactor(frontend): P1.1 统一类型定义 + API 客户端
refactor(frontend): P1.2 清理死代码
refactor(frontend): P2.1 提取叶子 UI 组件
refactor(frontend): P2.2 提取 MarkdownRenderer
...
feat(frontend): P3.1 搜索功能
feat(frontend): P3.2 编辑/删除
```

---

## 6. 执行检查清单

每完成一个步骤后，逐项确认：

- [ ] `npm run build` 通过
- [ ] 页面视觉无变化（或新功能符合设计）
- [ ] 无 TypeScript 编译错误
- [ ] 无 `any` 类型
- [ ] 无硬编码 `http://localhost:8002`（除 `lib/api.ts`）
- [ ] 组件行数 < 200 行
- [ ] Git 提交信息符合规范

---

## 7. 当前 `globals.css` CSS 变量参考

```css
--bg-primary: #0b1120;
--bg-secondary: #0f172a;
--bg-panel: rgba(30, 41, 59, 0.6);
--border-color: rgba(71, 85, 105, 0.3);
--text-primary: #cbd5e1;
--text-secondary: #94a3b8;
--text-muted: #64748b;
--accent-sky: #38bdf8;
--accent-emerald: #34d399;
--accent-amber: #fbbf24;
--accent-purple: #a78bfa;
```

所有颜色必须引用这些变量，禁止硬编码。
