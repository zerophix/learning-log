# 前端重构指南 v4.0

> **目标读者**: 任何 AI 代理（Claude Code / Cline / Cursor 等）
> **最后更新**: 2026-06-27
> **状态**: 执行中
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

### 1.2 当前文件清单

```
frontend/
├── app/
│   ├── page.tsx              (195 行) — 主页时间线 ⚠️ 接近上限
│   ├── layout.tsx             (19 行) — 根布局
│   ├── globals.css            (89 行) — 全局样式
│   ├── graph/page.tsx        (116 行) — 知识图谱
│   └── feed/page.tsx         (138 行) — Feed 卡片流
├── components/
│   ├── ui/
│   │   ├── Icons.tsx         (180 行) — SVG 图标库
│   │   ├── SearchBar.tsx      (62 行)
│   │   ├── CopyButton.tsx     (50 行)
│   │   ├── DeleteConfirm.tsx  (61 行)
│   │   └── Tag.tsx            (16 行)
│   ├── entry/
│   │   ├── EntryDetail.tsx   (217 行) ⚠️ 超 200 行
│   │   ├── EntryForm.tsx     (227 行) ⚠️ 超 200 行
│   │   ├── EntryCard.tsx     (103 行)
│   │   └── InsightPreview.tsx (63 行)
│   ├── layout/
│   │   ├── StatsPanel.tsx     (56 行)
│   │   ├── Navigation.tsx     (54 行)
│   │   └── FilterBar.tsx      (47 行)
│   ├── renderers/
│   │   ├── MarkdownRenderer.tsx (165 行)
│   │   ├── CodeBlock.tsx       (49 行)
│   │   └── MermaidDiagram.tsx  (103 行)
│   └── timeline/
│       └── TimelineView.tsx    (54 行)
├── lib/
│   ├── api.ts                (140 行)
│   └── constants.ts           (57 行)
└── types/
    └── index.ts              (120 行)
```

### 1.3 当前问题清单

| # | 问题 | 严重度 | 涉及文件 | 状态 |
|---|------|--------|----------|------|
| 1 | **API 无 `response.ok` 检查**: 所有方法静默处理 4xx/5xx | 🔴 高 | `lib/api.ts` | ✅ 已修复 |
| 2 | **4 处缺失 `.catch()`**: API 失败对用户不可见 | 🔴 高 | `page.tsx`, `feed/page.tsx`, `graph/page.tsx`, `StatsPanel.tsx` | ✅ 已修复 |
| 3 | **无 Error Boundary**: 渲染崩溃导致白屏 | 🔴 高 | 全项目 | ✅ 已修复 |
| 4 | **无 Toast 通知**: 创建/编辑/删除无反馈 | 🟡 中 | `EntryDetail.tsx`, `EntryForm.tsx`, `DeleteConfirm.tsx` | ✅ 已修复 |
| 5 | **无键盘可访问性**: 无 tabIndex/keyDown/aria | 🟡 中 | 全部交互组件 | ⏳ P7.1 |
| 6 | **~20 处残余硬编码色值**: 主要是 accent 色在 JS 中 | 🟡 中 | 7 个组件 | ⏳ P6.4 |
| 7 | **未使用的导入/状态**: 死代码残留 | 🟡 中 | `page.tsx:8`(FilterBar), `page.tsx:23`(offset), `MarkdownRenderer.tsx:5`(CopyButton) | ⏳ P6.5 |
| 8 | **重复标签行模式**: 3 处重复 `topic_tag_id`+`project_tag_id`+`research_type` JSX | 🟡 中 | `EntryCard.tsx`, `EntryDetail.tsx`, `feed/page.tsx` | ⏳ P6.6 |
| 9 | **重复页面头部**: 3 页重复 header JSX | 🟡 中 | `page.tsx`, `graph/page.tsx`, `feed/page.tsx` | ⏳ P6.6 |
| 10 | **EntryDetail/EntryForm 超 200 行** | 🟡 中 | `EntryDetail.tsx(217)`, `EntryForm.tsx(227)` | ⏳ P6.7 |
| 11 | **Feed 页面内联 FilterBar**: 未使用 `FilterBar` 组件 | 🟢 低 | `feed/page.tsx` | ⏳ P6.8 |
| 12 | **Graph 页无空状态**: 无数据时静默失败 | 🟢 低 | `graph/page.tsx` | ⏳ P7.2 |
| 13 | **`echarts-for-react` 未使用**: package.json 残留 | 🟢 低 | `package.json` | ⏳ P6.5 |
| 14 | **无请求取消/超时**: fetch 无止等待 | 🟢 低 | `lib/api.ts` | ⏳ P7.3 |

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
```

### 执行顺序

```
P6.1 → P6.2 → P6.3 → P6.4 → P6.5 → P6.6 → P6.7 → P6.8 → P7.1 → P7.2 → P7.3
```

---

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

## 4. 约束与规则

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
