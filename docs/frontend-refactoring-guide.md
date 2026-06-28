# 前端重构指南 v4.0

> **目标读者**: 任何 AI 代理（Claude Code / Cline / Cursor 等）
> **最后更新**: 2026-06-28（一致性检验 + 侧边栏行为锁定）
> **状态**: 已完成
> **前置**: P1-P5 已完成（所有阶段代码已落地）

---

## 1. 现状诊断

### 1.1 已完成工作

| 阶段 | 内容 | 状态 |
|------|------|------|
| P1 | 基础设施 — 统一类型定义 + API 客户端 + 清理死代码 | ✅ 完成 |
| P2 | 组件拆分 — 955 行 page.tsx 拆为 13 个独立组件 | ✅ 完成 |
| P3 | 功能补齐 — 搜索 + 编辑/删除 + 新建条目 | ✅ 完成 |
| P4 | 视图扩展 — 多页面路由 + 统计仪表盘 + SVG 图标系统 | ✅ 完成 |
| P5.1 | 消除常量重复 — `RESEARCH_TYPES` 统一来源 + `getResearchTypeInfo` | ✅ 完成 |
| P5.2 | 消除 `any` 类型 — 4 处改为泛型/接口/unknown | ✅ 完成 |
| P5.3 | 组件瘦身 — 提取 `DeleteConfirm`(61行) + `CodeBlock`(49行) + 样式常量 | ✅ 完成 |
| P5.4 | 颜色 CSS 变量 — 109 处 hex → `var(--xxx)`，同步 `globals.css` | ✅ 完成 |
| P6.1 | API 错误处理 — `checkResponse` 函数 + 4 处 `.catch()` | ✅ 完成 |
| P6.2 | Toast 通知系统 — `useToast` hook + Context Provider + 3 处集成 | ✅ 完成 |
| P6.3 | 错误边界 — `ErrorBoundary` 组件 + 3 层包裹（全局/Markdown/图谱） | ✅ 完成 |
| P6.4 | 残余硬编码色值 → CSS 变量 — 18 处替换（accent/border/bg 全量覆盖） | ✅ 完成 |
| P6.5 | 清理死代码 — 移除未用 FilterBar 导入、echarts-for-react 包 | ✅ 完成 |
| P6.6 | 消除重复 JSX — 创建 `EntryTags` + `PageHeader`，替换 5 处重复模式 | ✅ 完成 |
| P6.7 | 组件瘦身 — EntryDetail(214→179) + EntryForm(227→165)，提取 `EntryDetailContent` + `FormField` | ✅ 完成 |
| P6.8 | Feed 页面统一 FilterBar — 内联筛选按钮 → `<FilterBar>` 组件 | ✅ 完成 |
| P7.1 | 键盘可访问性 — tabIndex/role/aria/onKeyDown 应用到 4 个交互组件 | ✅ 完成 |
| P7.2 | 空状态 + 骨架屏 — Graph 空数据提示、StatsPanel 脉冲动画骨架屏 | ✅ 完成 |
| P7.3 | 请求增强 — fetchWithTimeout 10s + AbortController + AbortError 忽略 | ✅ 完成 |
| P8.1 | Feed 卡片可点击 — 点击打开 EntryDetail，含键盘可访问 | ✅ 完成 |
| P8.2 | 表单提交 loading 态 — submitting state，按钮禁用+文字变化 | ✅ 完成 |
| P8.3 | 未保存编辑确认 — dirty state，取消/Escape 时 window.confirm | ✅ 完成 |
| P8.4 | Ctrl+Enter 快捷提交 — onKeyDown prop 透传给 FormTextarea | ✅ 完成 |
| P9 | 新增 summary 字段 — 后端迁移 + MCP 同步 + 前端预览/表单/搜索全链路 | ✅ 完成 |
| P10 | 按周分页 — 后端 week-index/by-week 端点 + 前端周导航替换无限滚动 | ✅ 完成 |

### 1.2 当前文件清单

```
frontend/
├── app/
│   ├── page.tsx              (133 行) — 主页时间线（按周分页 + sidebar 侧边栏）
│   ├── layout.tsx             (19 行) — 根布局
│   ├── feed/page.tsx         (216 行) — Feed 卡片流（backdrop 覆盖模式）
│   ├── graph/page.tsx        (237 行) — 知识图谱
│   └── tags/page.tsx         (235 行) — 语义聚类
├── components/
│   ├── ui/
│   │   ├── Icons.tsx         (180 行) — SVG 图标库
│   │   ├── SearchBar.tsx      (62 行)
│   │   ├── CopyButton.tsx     (50 行)
│   │   ├── DeleteConfirm.tsx  (61 行)
│   │   └── ErrorBoundary.tsx  (43 行)
│   ├── entry/
│   │   ├── EntryDetail.tsx   (172 行) — 详情侧边栏（stopPropagation, toggle close）
│   │   ├── EntryForm.tsx     (195 行) — 新建/编辑表单
│   │   ├── EntryCard.tsx     (76 行)
│   │   ├── InsightPreview.tsx (79 行)
│   │   ├── EntryTags.tsx     (28 行)
│   │   ├── EntryDetailContent.tsx (42 行)
│   │   └── FormField.tsx     (54 行)
│   ├── layout/
│   │   ├── PageHeader.tsx     (46 行)
│   │   ├── StatsPanel.tsx     (62 行)
│   │   ├── Navigation.tsx     (54 行)
│   │   └── FilterBar.tsx      (47 行)
│   ├── renderers/
│   │   ├── MarkdownRenderer.tsx (165 行)
│   │   ├── CodeBlock.tsx       (49 行)
│   │   └── MermaidDiagram.tsx  (103 行)
│   └── timeline/
│       └── TimelineView.tsx    (108 行) — 周导航 + 日分组
├── hooks/
│   ├── useToast.tsx           (93 行)
│   ├── useWeekNavigation.ts   — 周导航状态管理
│   ├── useEntryFilter.ts      — 搜索/过滤逻辑
│   └── useErrorHandler.ts     — 统一错误处理
├── lib/
│   ├── api.ts                (244 行) — API 客户端 + 缓存层
│   └── constants.ts           (57 行)
├── styles/
│   └── index.css             (518 行) — 全局样式 + sidebar-detail + 响应式
└── types/
    └── index.ts              (235 行)
```

### 1.3 当前问题清单

| # | 问题 | 严重度 | 涉及文件 | 状态 |
|---|------|--------|----------|------|
| 1 | **API 无 `response.ok` 检查**: 所有方法静默处理 4xx/5xx | 🔴 高 | `lib/api.ts` | ✅ 已修复 |
| 2 | **4 处缺失 `.catch()`**: API 失败对用户不可见 | 🔴 高 | `page.tsx`, `feed/page.tsx`, `graph/page.tsx`, `StatsPanel.tsx` | ✅ 已修复 |
| 3 | **无 Error Boundary**: 渲染崩溃导致白屏 | 🔴 高 | 全项目 | ✅ 已修复 |
| 4 | **无 Toast 通知**: 创建/编辑/删除无反馈 | 🟡 中 | `EntryDetail.tsx`, `EntryForm.tsx`, `DeleteConfirm.tsx` | ✅ 已修复 |
| 5 | **无键盘可访问性**: 无 tabIndex/keyDown/aria | 🟡 中 | 全部交互组件 | ✅ 已修复 |
| 6 | **~20 处残余硬编码色值**: 主要是 accent 色在 JS 中 | 🟡 中 | 7 个组件 | ✅ 已修复 |
| 7 | **未使用的导入/状态**: 死代码残留 | 🟡 中 | `page.tsx:8`(FilterBar), `page.tsx:23`(offset), `MarkdownRenderer.tsx:5`(CopyButton) | ✅ 已修复 |
| 8 | **重复标签行模式**: 3 处重复 `topic_tag_id`+`project_tag_id`+`research_type` JSX | 🟡 中 | `EntryCard.tsx`, `EntryDetail.tsx`, `feed/page.tsx` | ✅ 已修复 |
| 9 | **重复页面头部**: 3 页重复 header JSX | 🟡 中 | `page.tsx`, `graph/page.tsx`, `feed/page.tsx` | ✅ 已修复 |
| 10 | **EntryDetail/EntryForm 超 200 行** | 🟡 中 | `EntryDetail.tsx(179)`, `EntryForm.tsx(165)` | ✅ 已修复 |
| 11 | **Feed 页面内联 FilterBar**: 未使用 `FilterBar` 组件 | 🟢 低 | `feed/page.tsx` | ✅ 已修复 |
| 12 | **Graph 页无空状态**: 无数据时静默失败 | 🟢 低 | `graph/page.tsx` | ✅ 已修复 |
| 13 | **`echarts-for-react` 未使用**: package.json 残留 | 🟢 低 | `package.json` | ✅ 已修复 |
| 14 | **无请求取消/超时**: fetch 无止等待 | 🟢 低 | `lib/api.ts` | ✅ 已修复 |

---

## 2. 阶段计划

### 依赖关系

```
P6.1 API 错误处理 ───────── 无依赖（先修基础）
       │
       ▼
P6.2 Toast 通知系统 ─────── 依赖 P6.1（toast 用于 API 错误展示）
       │
       ▼
P6.3 错误边界 ───────────── 可独立
       │
       ▼
P6.4 残余 hardcode → CSS 变量 ── 可独立
       │
       ▼
P6.5 清理死代码 ─────────── 可独立（移除未用导入/状态/包）
       │
       ▼
P6.6 消除重复 JSX ───────── 可独立（标签行 + 页面头部组件提取）
       │
       ▼
P6.7 组件瘦身 ───────────── 依赖 P6.6（引入新组件后自然减少）
       │
       ▼
P6.8 Feed 页面统一 FilterBar ── 可独立
───────────────────────────────────────
       │
       ▼
P7.1 键盘可访问性 ───────── 无依赖（单独推进）
P7.2 空状态 + 加载状态补齐 ── 可独立
P7.3 请求增强 ───────────── 可独立（取消/超时）
───────────────────────────────────────
       │
       ▼
P8.1 Feed 卡片可点击 ─────── 可独立
P8.2 表单提交 loading 态 ──── 可独立
P8.3 未保存编辑确认 ──────── 依赖 P8.2（form dirty 状态复用）
P8.4 Ctrl+Enter 快捷提交 ──── 可独立
───────────────────────────────────────
       │
       ▼
P10.1 后端 — week-index + by-week 端点 ── 可独立
P10.2 前端 types/api ────── 依赖 P10.1
P10.3 TimelineView 周导航 ── 依赖 P10.2
P10.4 page.tsx 移除无限滚动 ── 依赖 P10.2
P10.5 文档一致性检查 ────── 依赖 P10.1-10.4
```

### B 系列 — 后端/基础设置 & C 系列 — 一致性

| 任务 | 说明 | 依赖 | 状态 |
|------|------|------|------|
| B1 | 后端 — POST insert `code_snippet` 列 | 独立 | ✅ |
| B2 | 后端 — 消除模块级副作用 `init_db()` 移至 startup | 独立 | ✅ |
| B4 | 重复 MCP Server — 移除 `fastapi-mcp` 依赖 | 独立 | ✅ |
| B5 | Feed 页面全量实现 — 卡片网格 + 分页 + 聚类筛选 | 独立 | ✅ |
| B6 | 后端 `db_session()` 上下文管理器 | 独立 | ✅ |
| C1 | 侧边栏行为锁定 — 移除 click-to-close，恢复 `stopPropagation` | 独立 | ✅ |
| C2 | 项目一致性检验 — 4 页 EntryDetail 布局统一 + 文档同步 | 独立 | ✅ |
| B3 | 测试套件 | 独立 | ⏳ |
| B7 | deploy.sh 部署脚本 | 独立 | ⏳ |
| B8 | 后端类型提示补齐 | 独立 | ⏳ |
```

### 执行顺序

```
P6.1 → P6.2 → P6.3 → P6.4 → P6.5 → P6.6 → P6.7 → P6.8 → P7.1 → P7.2 → P7.3 → P8.1 → P8.2 → P8.3 → P8.4 → P9.1 → P9.2 → P9.3 → P9.4 → P9.5 → P9.6 → P10.1 → P10.2 → P10.3 → P10.4 → P10.5 → B1/B2/B4 → B5 → B6 → C1 → C2 ✅
```

## 3. 详细任务规格

### 阶段 P6：代码质量（完善 + 可维护性）

**开始条件**: P5 全部完成，`npm run build` 当前无警告/错误

---

#### P6.1 API 错误处理 — `lib/api.ts` + 4 处 `.catch()`

**问题**: `lib/api.ts` 全部 10 个方法无 `response.ok` 检查，4 个组件调用无 `.catch()`。

**操作**:

1. 改造 `lib/api.ts` — 为每个方法添加 `response.ok` 检查：

```typescript
// 改造前
fetch(url).then(r => r.json())

// 改造后
fetch(url).then(r => {
  if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail || `HTTP ${r.status}`)));
  return r.json();
})
```

2. 在 `app/page.tsx` 的 `api.entries.list()` 调用后添加 `.catch()` → `setError(err.message)`
3. 在 `app/feed/page.tsx` 的 `api.entries.feed()` 调用后添加 `.catch()` → `setError(err.message)`
4. 在 `app/graph/page.tsx` 的 `api.graph()` 调用后添加 `.catch()` → `setError(err.message)`
5. 在 `components/layout/StatsPanel.tsx` 的 `api.stats()` 调用后添加 `.catch()` → `setError(err.message)`

**验证**:
- `npm run build` 通过
- 手动停后端，应看到错误被捕获而非静默失败

**Git**: `refactor(frontend): P6.1 API 错误处理 — response.ok 检查 + missing .catch()`

---

#### P6.2 Toast 通知系统

**问题**: 创建/编辑/删除/API 失败均无用户可见反馈。

**操作**:

1. 创建 `hooks/useToast.ts`:

```typescript
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = useRef(0);

  const addToast = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  return { toasts, addToast };
}
```

2. 创建 `components/ui/Toast.tsx`:

```typescript
interface ToastProps {
  toasts: Toast[];
}

// 定位: fixed, bottom: 24px, right: 24px, z-index: 2000
// 每条: padding: 10px 16px, border-radius: 8px, 半透明背景
// 颜色: success → accent-emerald, error → #ef4444, info → accent-sky
// 动画: slide-in from right (opacity + translateX)
```

3. 在 `app/page.tsx` `useToast()` 并在以下位置调用 `addToast`:
   - 创建条目成功 → `addToast('记录创建成功', 'success')`
   - 创建条目失败 → `addToast('创建失败: ' + err.message, 'error')`
   - 更新条目成功 → `addToast('更新成功', 'success')`
   - 删除条目成功 → `addToast('已删除', 'success')`

**验证**:
- `npm run build` 通过
- 创建/编辑/删除操作后能看到 toast 弹出
- toast 3 秒后自动消失

**Git**: `feat(frontend): P6.2 Toast 通知系统 — useToast hook + Toast 组件`

---

#### P6.3 错误边界

**问题**: Mermaid 渲染、ECharts 加载等异常会导致整个页面白屏。

**操作**:

1. 创建 `components/ui/ErrorBoundary.tsx`:

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // 可选的自定义 fallback
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

2. 在 `app/layout.tsx` 包裹整个 `<body>`：
   - 显示 "页面渲染异常" + 刷新按钮
3. 在 `MarkdownRenderer.tsx` 包裹内容区（Mermaid 渲染可能崩溃）：
   - 显示 "内容渲染异常，请检查 Markdown 语法"
4. 在 `graph/page.tsx` 包裹 ECharts 区域：
   - 显示 "图谱渲染异常" + 重试按钮

```tsx
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div style={{...}}>出错了</div>;
    }
    return this.props.children;
  }
}
```

**验证**:
- `npm run build` 通过
- 可在 MermaidDiagram.tsx 临时 `throw new Error()` 测试 → 应看到 fallback 而非白屏

**Git**: `feat(frontend): P6.3 错误边界 — ErrorBoundary 组件`

---

#### P6.4 残余硬编码色值 → CSS 变量

**问题**: 仍有 ~20 处硬编码色值（主要为 accent 色）未使用 CSS 变量。

**操作**:

逐个文件替换（以下为详尽清单）：

| 文件 | 原始值 | 替换 |
|------|--------|------|
| `Navigation.tsx:36` | `#38bdf8` | `var(--accent-sky)` |
| `StatsPanel.tsx:29,40,51` | `#38bdf8` / `#34d399` / `#a78bfa` | `var(--accent-*)` |
| `EntryCard.tsx:33,51,83` | `#34d399` / `#fbbf24` / `#38bdf8` | `var(--accent-*)` |
| `EntryDetail.tsx:102,104,204` | `#38bdf8` / `#34d399` | `var(--accent-*)` |
| `EntryForm.tsx:214` | `#38bdf8` | `var(--accent-sky)` |
| `MarkdownRenderer.tsx:90,109,113,158` | `#475569` / `#38bdf8` | `var(--border-color)` / `var(--accent-sky)` |
| `CopyButton.tsx:29` | `#34d399` | `var(--accent-emerald)` |
| `page.tsx:122,133,141` | `#38bdf8` | `var(--accent-sky)` |
| `feed/page.tsx:94,96` | `#38bdf8` / `#34d399` | `var(--accent-*)` |
| `TimelineView.tsx:45` | `#1E293B` | `var(--bg-secondary)` |
| `MermaidDiagram.tsx:23,61` | `#1E293B` | `var(--bg-secondary)` |
| `Icons.tsx:68,76,88,133,153` | `#64748b` / `#475569` | `var(--text-muted)` / `var(--border-color)` |

**注意**: `lib/constants.ts` 中的颜色定义（`RESEARCH_TYPES` 的 hex 值）保留不动——它们是 JS 数据而非样式，用于动态标签渲染。

**验证**:
- `npm run build` 通过
- 页面视觉与替换前一致

**Git**: `refactor(frontend): P6.4 残余硬编码色值 → CSS 变量`

---

#### P6.5 清理死代码

**问题**: 未使用的导入、状态、npm 包。

**操作**:

1. `app/page.tsx:8` — 删除 `import FilterBar from '@/components/layout/FilterBar'`
2. `app/page.tsx:23` — 删除 `offset` state 和 `setOffset`（`offsetRef` 已取代其功能），确认 `loadEntries` 中 `setOffset` 的调用也删除
3. `components/renderers/MarkdownRenderer.tsx:5` — 删除 `import CopyButton from '@/components/ui/CopyButton'`
4. `package.json` — 删除 `echarts-for-react` 依赖（从 dependencies 和 @types 中移除）
5. 运行 `npm install` 清理 lockfile

**验证**:
- `npm run build` 通过
- 功能不受影响

**Git**: `refactor(frontend): P6.5 清理死代码 — 未用导入/状态/包`

---

#### P6.6 消除重复 JSX 模式

**问题**: 标签行模式在 3 处重复，页面头部在 3 处重复。

**操作**:

1. 创建 `components/entry/EntryTags.tsx` — 提取重复的标签行：

```typescript
interface EntryTagsProps {
  entry: Entry;
}

// 渲染 topic_tag_id → Tag, project_tag_id → Tag, research_type → 标签
// 从 EntryCard.tsx:82-86, EntryDetail.tsx:101-107, feed/page.tsx:93-99 提取
```

2. 创建 `components/layout/PageHeader.tsx` — 提取重复的页面头部：

```typescript
interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  rightContent?: React.ReactNode;  // 右侧自定义内容
}

// 从 page.tsx, graph/page.tsx, feed/page.tsx 中提取公共 header 结构
```

3. 将三个页面的 header 替换为:

```tsx
<PageHeader icon={<IconBook />} title="学习日志">
  <Navigation />
</PageHeader>
```

**验证**:
- `npm run build` 通过
- 三个页面头部视觉不变

**Git**: `refactor(frontend): P6.6 消除重复 JSX — EntryTags + PageHeader`

---

#### P6.7 组件瘦身 — EntryDetail + EntryForm

**问题**: EntryDetail.tsx(217 行) 和 EntryForm.tsx(227 行) 超 200 行上限。

**操作**:

1. EntryDetail.tsx 提取:
   - 将 `handleDelete` / `handleUpdate` 等逻辑细节折叠
   - 将内容面板区（MarkdownRenderer + MermaidDiagram）提取为内联或移到新文件
   - 预期：217 → < 180 行

2. EntryForm.tsx 提取:
   - 提取 `FormFieldGroup` 组件到 `components/entry/FormFieldGroup.tsx`:
     ```typescript
     interface FormFieldGroupProps {
       fields: Array<{
         label: string;
         field: keyof LearningEntryCreate;
         type: 'text' | 'textarea' | 'number' | 'range' | 'checkbox';
       }>;
       values: LearningEntryCreate;
       onChange: (field: string, value: any) => void;
     }
     ```
   - 将核心字段、STAR 字段、元数据分为三个 `FormFieldGroup`
   - 预期：227 → < 160 行

**验证**:
- `npm run build` 通过
- EntryDetail 和 EntryForm 视觉/交互不变

**Git**: `refactor(frontend): P6.7 组件瘦身 — EntryDetail + EntryForm`

---

#### P6.8 Feed 页面统一 FilterBar

**问题**: `feed/page.tsx` 内联了 FilterBar 的 JSX，未使用已有组件。

**操作**:

1. 将 `feed/page.tsx:38-55` 的内联筛选 JSX 替换为：

```tsx
<FilterBar
  types={RESEARCH_TYPES}
  activeFilter={activeFilter}
  onFilter={(id) => setActiveFilter(activeFilter?.id === id ? null : id)}
/>
```

2. 确保 `FilterBar` 组件接受与 feed 页匹配的 props 接口
3. 如果 `FilterBar` 当前接受的数据结构与 feed 需要不匹配，调整接口使两处通用

**验证**:
- `npm run build` 通过
- Feed 页筛选功能视觉/交互不变

**Git**: `refactor(frontend): P6.8 Feed 页面统一 FilterBar`

---

### 阶段 P7：用户体验增强

---

#### P7.1 键盘可访问性

**问题**: 全项目无 tabIndex / onKeyDown / aria-*。

**操作**:

1. `EntryCard` — 添加交互支持:
   ```tsx
   <div
     role="button"
     tabIndex={0}
     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); }}
   >
   ```

2. `EntryDetail` + `EntryForm` + `DeleteConfirm` — 添加:
   - `role="dialog"`, `aria-modal="true"`
   - Esc 关闭（已有 useEffect，确保覆盖）
   - 首次打开时焦点捕获（`autoFocus` 在确认按钮上）

3. 全部按钮添加 `aria-label`（当无文字时）

**验证**:
- `npm run build` 通过
- Tab 可在页面元素间导航
- Enter 触发卡片点击
- Esc 关闭弹窗
- 屏幕阅读器可识别交互元素角色

**Git**: `feat(frontend): P7.1 键盘可访问性 — tabIndex/aria/role`

---

#### P7.2 空状态 + 加载状态补齐

**问题**: GraphPage 无空状态，StatsPanel 加载完全空白。

**操作**:

1. `graph/page.tsx` — API 返回空 nodes 数组时显示空状态:
   ```tsx
   if (graphData && graphData.nodes.length === 0) {
     return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
       暂无知识图谱数据
     </div>;
   }
   ```

2. `StatsPanel.tsx` — 加载中显示骨架屏（3 个灰色矩形动画）:
   ```tsx
   {!stats ? (
     <>{/* 3 个 opacity 动画的灰块 */}</>
   ) : (
     <>{/* 真实数据 */}</>
   )}
   ```

**验证**:
- `npm run build` 通过
- Graph 页无数据时显示空状态而非空白
- StatsPanel 加载时有脉冲动画

**Git**: `feat(frontend): P7.2 空状态 + 加载状态补齐`

---

#### P7.3 请求增强 — 取消 + 超时

**问题**: fetch 无止等待（后端挂起时），组件卸载后继续更新状态。

**操作**:

1. `lib/api.ts` — 为 GET 请求添加 AbortController:
   ```typescript
   export function fetchWithTimeout(url: string, timeout = 10000) {
     const controller = new AbortController();
     const id = setTimeout(() => controller.abort(), timeout);
     return fetch(url, { signal: controller.signal }).then(r => {
       clearTimeout(id);
       if (!r.ok) throw new Error(...);
       return r.json();
     });
   }
   ```

2. 在 page.tsx/feed/page.tsx 的 useEffect 中清理请求:
   ```typescript
   useEffect(() => {
     const controller = new AbortController();
     fetch(url, { signal: controller.signal })...
     return () => controller.abort();
   }, []);
   ```

**验证**:
- `npm run build` 通过
- 可设置极短 timeout 验证超时错误能否捕获

**Git**: `feat(frontend): P7.3 请求增强 — AbortController + timeout`

---

### 阶段 P8：UX 增强

#### P8.1 Feed 卡片可点击

**问题**: Feed 页卡片有 `cursor:pointer` 但无 `onClick`，用户无法点开查看详情。

**操作**:
1. `feed/page.tsx` — 添加 `selectedEntry` state，import `EntryDetail`
2. 卡片 `div` 添加 `onClick={() => setSelectedEntry(entry)}`
3. 页面底部渲染 `<EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />`

**验证**:
- `npm run build` 通过
- Feed 页点击卡片弹出详情弹窗，关闭正常

**Git**: `feat(frontend): P8.1 Feed 卡片可点击 — 点击打开 EntryDetail`

#### P8.2 表单提交 loading 态

**问题**: EntryForm 提交按钮无 loading 状态，双击会重复提交。

**操作**:
1. `EntryForm.tsx` — 添加 `submitting` state
2. `handleSubmit` 设置为 `async`，提交期间 `setSubmitting(true)`，完成后 `finally` 恢复
3. 提交按钮：`disabled={submitting}`，文字显示 `创建中...` / `保存中...`

**验证**:
- `npm run build` 通过
- 提交时按钮变灰且文字变化，无法再次点击
- 提交完成后恢复正常

**Git**: `feat(frontend): P8.2 表单提交 loading 态 — 防止双击重复提交`

#### P8.3 未保存编辑确认

**问题**: EntryForm 中编辑后按 Escape 或点取消直接关闭，无未保存提示。

**操作**:
1. `EntryForm.tsx` — 添加 `dirty` state（初始 `false`，任意字段变化时 `true`）
2. 取消按钮 / Esc 关闭前检查 `dirty`，有更改时弹窗确认
3. 使用 `confirm()` 或自建轻量确认

**验证**:
- `npm run build` 通过
- 编辑字段后点取消 → 弹出确认提示
- 无更改时直接关闭

**Git**: `feat(frontend): P8.3 未保存编辑确认 — dirty 状态 + 关闭确认`

#### P8.4 Ctrl+Enter 快捷提交

**问题**: 长表单必须鼠标点击提交按钮，键盘用户效率低。

**操作**:
1. `EntryForm.tsx` — 在 `textarea`（关键洞察）的 `onKeyDown` 中监听 `Ctrl+Enter` / `Meta+Enter`
2. 触发时调用 `handleSubmit`

**验证**:
- `npm run build` 通过
- 在文本框中按 Ctrl+Enter 触发提交

**Git**: `feat(frontend): P8.4 快捷提交 — Ctrl+Enter 提交表单`

---

### 阶段 P9：新增 summary 字段（跨层特性）

**背景**: 前端卡片预览时直接截断 `insight` 会泄漏 Markdown 格式符号。方案 B — 后端新增 `summary TEXT` 字段存储纯文本摘要，前端预览优先展示。

**架构设计**:

```
AI/用户写入 → insight + summary 入库
                  ↓
前端预览 → summary ?? truncate(insight)  ← 旧数据降级
                  ↓
详情页 → 在核心洞察前插入 ### 摘要 区段
```

**关键决策**:
- `summary=NULL` 时预览降级为截断 `insight`（旧数据兼容，无需回填）
- 后端 `SELECT *` 自动返回新字段，无需修改查询
- MCP Server 分析 prompt 增加 `summary` 提取指令
- 前端搜索也扫描 `summary`

---

#### P9.1 后端 — db.py + main.py

**操作**:
1. `backend/db.py` — CREATE TABLE `learning_entries` 增加 `summary TEXT` after `insight`
2. `backend/db.py` — 添加 `ALTER TABLE` 迁移（try/except 兼容已有库）
3. `backend/main.py` — `LearningEntryCreate.summary: Optional[str] = None`
4. `backend/main.py` — INSERT 增加 `summary` 列和对应 `?` 占位符
5. `backend/main.py` — `LearningEntryUpdate.summary: Optional[str] = None`

**验证**: `python3 -c "import db; import main"` 无错

**Git**: `feat(backend): P9.1 新增 summary 字段 — db 迁移 + API 模型`

---

#### P9.2 MCP Server — prompt + payload 同步

**操作**:
1. `backend/mcp_server.py` — `call_ai_for_analysis` prompt 增加 `summary` 提取指令
2. `backend/mcp_server.py` — `get_default_entry` 增加 `"summary": "待补充"`
3. `backend/mcp_server.py` — `deep_record` payload 增加 `"summary": None`
4. `backend/mcp_server.py` — `quick_capture` payload 增加 `"summary": None`

**验证**: `python3 -c "import mcp_server"` 无错

**Git**: `feat(mcp): P9.2 MCP Server — prompt 增加 summary 提取 + payload 同步`

---

#### P9.3 前端 — 类型 + 预览组件

**操作**:
1. `frontend/types/index.ts` — `LearningEntryCreate` + `Entry` 增加 `summary?: string`
2. `frontend/components/entry/InsightPreview.tsx` — 新增可选 `summary` prop，优先展示
3. `frontend/components/entry/EntryCard.tsx` — 透传 `summary` 给 `InsightPreview`
4. `frontend/app/feed/page.tsx` — 卡片预览使用 `entry.summary || entry.insight...`

**验证**: `npm run build` 通过

**Git**: `feat(frontend): P9.3 前端类型 + 预览组件 — summary 优先展示`

---

#### P9.4 前端 — 表单 + 详情 + 搜索

**操作**:
1. `frontend/components/entry/EntryForm.tsx` — 新增 `summary` 字段（input 控件）
2. `frontend/components/entry/EntryDetail.tsx` — markdownContent 在核心洞察前插入 `### 摘要` 区段
3. `frontend/app/page.tsx` — 搜索条件加入 `summary`

**验证**: `npm run build` 通过

**Git**: `feat(frontend): P9.4 前端表单 + 详情 + 搜索 — summary 全链路`

---

#### P9.5 脚本同步

**操作**:
1. `backend/utils/quick_record.py` — payload 增加 `"summary": None`

**验证**: `python3 -c "import quick_record"` 无错（需在 backend 目录）

**Git**: `refactor(script): P9.5 quick_record.py — 增加 summary 字段`

---

#### P9.6 文档一致性检查

**操作**:
1. `docs/frontend-design-system.md` — §12.6/12.7/12.9/15 同步 summary 规格和类型
2. `docs/frontend-refactoring-guide.md` — §1.1/1.2/2/5 同步状态和行数

**Git**: `docs: P9.6 文档同步 — summary 字段规格 + 完成标记`

---

### 阶段 P10：按周分页（替代无限滚动）

**背景**: 时间线越来越长，无限滚动（OFFSET 分页）加载慢且无时间语义。改为按周分组显示，用户可切换周。

**架构设计**:

```
后端: week-index → [W14, W25, ...]   ← 所有有记录的周列表
     by-week?year=2026&week=25      ← 单周数据 (WHERE timestamp 范围查询, 走索引)

前端: initialize() → weekIndex → 最新周 → loadWeek() → TimelineView 渲染
                               ↑
           ← W14 | 第25周 | W26 →  ← 导航按钮 + 下拉选择器
```

**关键决策**:
- 周定义：SQLite `%W`（周一为周起始），Python 计算起止日期
- 使用范围查询 `WHERE timestamp >= ? AND timestamp < ?` 而非 `strftime`，确保走 `idx_entries_timestamp` 索引
- 前端搜索仍为客户端过滤（在当前周数据内），不增加服务端复杂度
- 周内如果有超过 50 条记录，`has_more` 标记，可扩展周内无限滚动（当前未实现）

---

#### P10.1 后端 — week-index + by-week 端点

**操作**:
1. `backend/main.py` — 添加 `get_week_dates()` 工具函数
2. `backend/main.py` — 添加 `GET /api/entries/week-index`：GROUP BY `strftime('%Y-%W')` 返回所有有记录的周
3. `backend/main.py` — 添加 `GET /api/entries/week?year=&week=`：范围查询单周数据

**验证**: `curl http://localhost:8002/api/entries/week-index` 返回周列表

**Git**: `feat(backend): P10.1 按周分页 — week-index + by-week 端点`

---

#### P10.2 前端 — 类型 + API 方法

**操作**:
1. `frontend/types/index.ts` — 添加 `WeekInfo`、`WeekResponse` 接口
2. `frontend/lib/api.ts` — 添加 `entries.byWeek()`、`entries.weekIndex()`

**验证**: `npm run build` 通过

**Git**: `feat(frontend): P10.2 前端类型 + API — WeekInfo + byWeek/weekIndex`

---

#### P10.3 TimelineView 重构 — 周导航 + 日分组

**操作**:
1. `frontend/components/timeline/TimelineView.tsx` — 重写为接收 `weekInfo`、`weekIndex`、`currentWeek`、`onPrevWeek/onNextWeek/onSelectWeek` props
2. 渲染周导航栏（← 上一周 / 第 N 周 · 年 / 下一周 →）+ 下拉选择器
3. 保持每日分组渲染（日期头 + 左侧时间线 + EntryCard）

**验证**: `npm run build` 通过

**Git**: `feat(frontend): P10.3 TimelineView 重构 — 周导航 + 日分组`

---

#### P10.4 page.tsx 重构 — 移除无限滚动

**操作**:
1. 删除 `offsetRef`、`isLoadingRef`、`hasLoadedRef`、`hasMoreRef`、`loadingMore` state
2. 删除滚动监听（`scroll` event handler）
3. 替换 `loadEntries()` 为 `initialize()` → `loadWeek()` 模式
4. 添加 `currentWeek`、`weekInfo`、`weekIndex` state + 周导航函数

**验证**: `npm run build` 通过，页面打开自动加载本周

**Git**: `refactor(frontend): P10.4 page.tsx 移除无限滚动 — 改用周加载`

---

#### P10.5 文档一致性检查

**操作**:
1. `docs/frontend-refactoring-guide.md` — §1.1/1.2/2/5 同步 P10 状态和行数
2. `docs/frontend-design-system.md` — §11/12.5/14/15 同步周分页规格

**Git**: `docs: P10.5 文档同步 — 按周分页规格 + 完成标记`

---

### 4.1 必须遵守

1. **每步提交前 `npm run build` 必须通过** — 不允许中间态破坏
2. **项目文档同步** — 每次修改前端后检查 `docs/frontend-design-system.md`（目录结构、CSS 变量值、组件规格）是否需要同步更新
3. **保持暗色主题** — 使用 `globals.css` 中的 CSS 变量
4. **类型安全** — 不使用 `any`，所有 props 显式类型
5. **API 调用走 `lib/api.ts`** — 禁止在组件中直接 `fetch`
6. **单文件不超过 200 行** — 超过则提取子组件
7. **常量不重复** — 所有共享常量仅在 `lib/constants.ts` 定义
8. **颜色引用 CSS 变量** — JSX style 中使用 `var(--xxx)`，禁止硬编码
9. **每个任务独立 git commit** — 信息格式: `type(scope): Px.y 标题`

### 4.2 禁止事项

1. ❌ 不要使用 emoji 作为图标 — 使用 `components/ui/Icons.tsx`
2. ❌ 不要创建超过 200 行的单文件
3. ❌ 不要引入 Tailwind / styled-components — 保持 CSS 变量方案
4. ❌ 不要修改后端 API — 前端适配后端
5. ❌ 不要在根目录放散落文件 — 所有文件归入对应目录
6. ❌ 不要使用 `any` 类型 — 用 `unknown` + 类型守卫替代
7. ❌ 不要重复定义已有常量 — 引用 `lib/constants.ts`

### 4.3 文档一致性检查清单

每次任务完成后检查以下文档是否需要同步：

- [ ] `docs/frontend-design-system.md` — 目录结构 §10.1、组件规格 §12、CSS 变量 §2.1、清单 §18
- [ ] `docs/frontend-refactoring-guide.md` — 本文件的状态更新（完成标记、行数、问题清单）
- [ ] `README.md` — 目录结构表格、使用方式
- [ ] `CLAUDE.md`（项目根目录）— 重要文件路径、命令

---

## 5. Git 提交规范

```
refactor(frontend): P6.1 API 错误处理 — response.ok 检查 + missing .catch()
feat(frontend): P6.2 Toast 通知系统 — useToast hook + Toast 组件
feat(frontend): P6.3 错误边界 — ErrorBoundary 组件
refactor(frontend): P6.4 残余硬编码色值 → CSS 变量
refactor(frontend): P6.5 清理死代码 — 未用导入/状态/包
refactor(frontend): P6.6 消除重复 JSX — EntryTags + PageHeader
refactor(frontend): P6.7 组件瘦身 — EntryDetail + EntryForm
refactor(frontend): P6.8 Feed 页面统一 FilterBar
feat(frontend): P7.1 键盘可访问性 — tabIndex/aria/role
feat(frontend): P7.2 空状态 + 加载状态补齐
feat(frontend): P7.3 请求增强 — AbortController + timeout
feat(frontend): P8.1 Feed 卡片可点击 — 点击打开 EntryDetail
feat(frontend): P8.2 表单提交 loading 态
feat(frontend): P8.3 未保存编辑确认
feat(frontend): P8.4 快捷提交 — Ctrl+Enter
feat(backend): P9.1 新增 summary 字段 — db 迁移 + API 模型
feat(mcp): P9.2 MCP Server — prompt 增加 summary 提取 + payload 同步
feat(frontend): P9.3 前端类型 + 预览组件 — summary 优先展示
feat(frontend): P9.4 前端表单 + 详情 + 搜索 — summary 全链路
refactor(script): P9.5 quick_record.py — 增加 summary 字段
docs: P9.6 文档同步 — summary 字段规格 + 完成标记
feat(backend): P10.1 按周分页 — week-index + by-week 端点
feat(frontend): P10.2 前端类型 + API — WeekInfo + byWeek/weekIndex
feat(frontend): P10.3 TimelineView 重构 — 周导航 + 日分组
refactor(frontend): P10.4 page.tsx 移除无限滚动 — 改用周加载
docs: P10.5 文档同步 — 按周分页规格 + 完成标记
fix(backend): POST /api/entries INSERT code_snippet 列缺失
fix(backend): 模块级副作用 init_db() 移至 startup event
refactor(backend): B4 移除 fastapi-mcp 依赖 — 单一 MCP 入口
feat(frontend): B5 Feed 页面 — 卡片网格 + 分页 + 聚类筛选
refactor(backend): B6 db_session() 上下文管理器 + _parse_entry_rows
fix(frontend): C1 侧边栏行为锁定 — stopPropagation + toggle close
fix(frontend): C2 一致性检验 — graph 页 sidebar 布局 + feed 页 mobile 响应式
docs: C2 文档同步 — sidebar 规格 + 文件清单 + 完成标记
```

---

## 6. 验证手段

| 验证项 | 方式 | 通过标准 |
|--------|------|---------|
| 构建 | `npm run build` | 无错误/警告 |
| 类型检查 | `npx tsc --noEmit` | 无类型错误 |
| 无 any | `rg '\bany\b' frontend/ --include '*.tsx' --include '*.ts'` | 0 处匹配 |
| 无硬编码色 | `rg '#[0-9a-fA-F]{6}' frontend/ --include '*.tsx' | grep -v constants.ts \| grep -v '//.*#'` | 仅在 constants.ts 和注释中存在 |
| 文档同步 | `diff` 或手动检查 | 文件结构/规格与实际一致 |
| 视觉回归 | 手动浏览 3 个页面 | 交互正常，视觉无破损 |
