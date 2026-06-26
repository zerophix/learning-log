# Learning Log 前端设计系统 · 完整参考文档

> **目标读者**：AI / 开发者。本文档完整描述前端的设计语言、组件体系、样式规范和技术栈，足以让 AI 据此 1:1 复现整个前端。

---

## 一、技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | **Next.js** (App Router) | 14.1.0 | 页面路由 + SSR 框架 |
| UI 库 | **React** | ^18 | 组件渲染（全部 `'use client'`） |
| 语言 | **TypeScript** | ^5 | 类型安全 |
| 图表 | **ECharts** + echarts-for-react | 5.4.3 | 力导向知识图谱 |
| 架构图 | **Mermaid** | 10.9.0 | Markdown 内嵌流程图渲染 |
| Markdown | **react-markdown** + remark-gfm + rehype-raw | 10.1.0 | 富文本洞察内容渲染 |
| 代码高亮 | **react-syntax-highlighter** | 16.1.1 | 代码块语法高亮（vscDarkPlus 主题） |
| 样式方案 | **纯内联 style + CSS 变量 + CSS 文件** | — | 无 CSS-in-JS，无 Tailwind |
| 后端通信 | **fetch API** | 原生 | RESTful JSON → `http://localhost:8002` |

### 完整的 `package.json`

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
    "@types/react-syntax-highlighter": "^15.5.13",
    "echarts": "^5.4.3",
    "echarts-for-react": "^3.0.2",
    "mermaid": "^10.9.0",
    "next": "14.1.0",
    "react": "^18",
    "react-dom": "^18",
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

---

## 二、设计令牌 (Design Tokens)

### 2.1 CSS 变量 (`globals.css`)

```css
:root {
  --bg-primary: #0b1120;          /* 最深背景（页面底色） */
  --bg-secondary: #0f172a;        /* 次深背景（卡片、面板） */
  --bg-panel: rgba(30, 41, 59, 0.6);  /* 半透明面板 */
  --border-color: rgba(71, 85, 105, 0.3);  /* 通用边框 */
  --text-primary: #cbd5e1;        /* 正文文字 */
  --text-secondary: #94a3b8;      /* 次级文字 */
  --text-muted: #64748b;          /* 弱化文字 */
  --accent-sky: #38bdf8;          /* 天空蓝（主强调色） */
  --accent-emerald: #34d399;      /* 翡翠绿（高能量/成功） */
  --accent-amber: #fbbf24;        /* 琥珀黄（中能量/顿悟） */
  --accent-purple: #a78bfa;       /* 紫色（架构/映射） */
}
```

### 2.2 全局重置

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--bg-primary);  /* #0b1120 */
  color: var(--text-primary);           /* #cbd5e1 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  font-size: 13px;
  overflow: hidden;
}
```

### 2.3 滚动条样式

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }
```

---

## 三、色彩体系

### 3.1 语义色板

| 用途 | 颜色 | Hex | 使用场景 |
|------|------|-----|----------|
| 页面背景 | bg-primary | `#0b1120` / `#0F172A` | 最深色，全屏底色 |
| 卡片/面板背景 | bg-secondary | `#1E293B` | 内容容器 |
| 半透明面板 | bg-panel | `rgba(30,41,59,0.6)` | 浮动侧边栏、导航栏 |
| 边框 | border | `#334155` / `#1E293B` | 卡片边框、分割线 |
| 主文字 | text-primary | `#F8FAFC` / `#F1F5F9` / `#cbd5e1` | 标题、强调文字 |
| 副文字 | text-secondary | `#94A3B8` / `#CBD5E1` | 正文、描述 |
| 弱文字 | text-muted | `#64748B` / `#475569` | 辅助信息、时间戳 |
| 天空蓝 | accent-sky | `#38bdf8` | 主按钮、链接、激活态 |
| 翡翠绿 | accent-emerald | `#34d399` | 高能量标记、通过状态 |
| 琥珀黄 | accent-amber | `#fbbf24` | 中能量标记、深度研究 |
| 紫色 | accent-purple | `#a78bfa` | 架构标签、领域映射 |

### 3.2 状态色 — 研究类型 (Research Type)

| 类型 | 标签 | 颜色 | 语义 |
|------|------|------|------|
| `deep-research` | 深度研究 / 小题深研 | `#fbbf24` (amber) | 聚焦单一问题深入挖掘 |
| `topic-exploration` | 主题探索 / 专题探索 | `#34d399` (emerald) | 围绕主题发散探索 |
| `domain-mapping` | 领域映射 | `#a78bfa` (purple) | 构建领域知识图谱 |

### 3.3 项目类型色

| 类型 | 标签 | 颜色 |
|------|------|------|
| `business` | 业务项目 | `#34d399` (emerald) |
| `source-code` | 源码项目 | `#818cf8` (indigo) |
| `component` | 组件项目 | `#fbbf24` (amber) |

### 3.4 学科色

| 学科 | 代码 | 标签 |
|------|------|------|
| 计算机科学 | `cs` | 计科 |
| 数学 | `math` | 数学 |
| 物理 | `physics` | 物理 |
| 金融 | `finance` | 金融 |
| 法学 | `law` | 法学 |
| 化学 | `chemistry` | 化学 |
| 生物 | `biology` | 生物 |
| 心理学 | `psychology` | 心理 |

---

## 四、字体系统

### 4.1 字体族

```css
/* 正文 / UI */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;

/* 等宽 / 代码 */
font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', monospace;

/* Mermaid 图表内文字（特殊） */
font-family: "Times New Roman", "Noto Serif SC", serif;
```

### 4.2 字号层级

| 层级 | 字号 | 用途 |
|------|------|------|
| `10px` | 超小 | 标签徽章、表格表头、统计数字 |
| `11px` | 极小 | 底部提示、面包屑、视图切换按钮 |
| `12px` | 小 | 副标题、描述文字、筛选按钮、元信息 |
| `13px` | 正文 | 常规正文、列表项、卡片内容 |
| `14px` | 较大正文 | 洞察内容、详情段落 |
| `15px` | 卡片标题 | Feed 卡片中的条目标题 |
| `17px` | 页面标题 | 顶部导航栏标题 |
| `18px` | 大标题 | 详情弹窗中的 h2、FeedCard 标题 |
| `20px` | 超大标题 | 详情弹窗中的 h1 |
| `22px` | 加大标题 | 详情中的 h2 渲染 |
| `28px` | 特大标题 | 详情 Markdown h1 渲染 |

### 4.3 字重层级

| 字重 | 使用场景 |
|------|---------|
| `400` | 常规文字、描述 |
| `500` | 标签、按钮文字、次级强调 |
| `600` | 标题、强调文字、筛选激活态 |
| `700` | 特大标题、重要强调 |

---

## 五、间距系统

| 间距值 | 使用场景 |
|--------|---------|
| `2px` | 分割视图按钮组内部间距 |
| `4px` | 按钮内边距、图标间距 |
| `6px` | 标签间距、面包屑间距 |
| `8px` | 组件内部小间距 |
| `12px` | 卡片内间距、导航项间距 |
| `14px` | 导航栏竖向 padding |
| `16px` | 标准卡片 padding、组件间距 |
| `20px` | 卡片间距、弹窗内容区 |
| `24px` | 时间线节点间距、详情区块间距 |
| `28px` | 页面横向 padding、弹窗 padding |
| `32px` | 区块上下间距、弹窗内容 |
| `40px` | 页面 padding |

---

## 六、圆角系统

| 圆角值 | 使用场景 |
|--------|---------|
| `3px` | 滚动条滑块 |
| `4px` | 内联代码、小标签、视图切换按钮 |
| `6px` | 表单输入框、按钮、滑条 |
| `8px` | 代码块、弹窗关闭按钮、详情面板项 |
| `10px` | 顶部导航栏 pill |
| `12px` | Feed 卡片、侧边栏、弹窗面板 |
| `16px` | 详情弹窗、审核弹窗 |
| `20px` / `24px` | Pill 标签（学科/项目标签、日期标签） |
| `999px` | 胶囊导航栏 |

---

## 七、阴影与层次

```css
/* 浮动侧边栏 */
box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);

/* 顶部导航胶囊 */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

/* 弹窗 */
box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);   /* 大弹窗 */
box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);   /* Feed 弹窗 */
box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);   /* MVP 弹窗 */
box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);   /* 表单弹窗 */

/* 代码块 */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);

/* 卡片 hover */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

/* 时间线节点发光 */
box-shadow: 0 0 0 2px rgba(52,211,153,0.3);  /* 高能量节点 */
box-shadow: 0 0 0 2px rgba(251,191,36,0.3);  /* 中能量节点 */
```

---

## 八、毛玻璃效果 (Backdrop Blur)

```css
/* 浮动侧边栏 */
backdrop-filter: blur(12px);

/* 顶部导航栏 */
backdrop-filter: blur(12px);

/* 弹窗遮罩 */
backdrop-filter: blur(8px);
backdrop-filter: blur(4px);  /* 表单弹窗 */

/* 底部提示栏 */
backdrop-filter: blur(8px);

/* 日期标签 */
backdrop-filter: blur(8px);
```

---

## 九、过渡动画

所有交互动效统一使用：

```css
transition: all 0.15s;  /* 快速（按钮 hover、菜单项） */
transition: all 0.2s;   /* 标准（卡片 hover、弹窗、筛选按钮） */
transition: all 0.3s;   /* 较慢（图表预览展开） */
```

---

## 十、组件体系与目录结构

```
frontend/
├── app/                          # Next.js App Router 页面
│   ├── layout.tsx                # 根布局（metadata: "Learning Log - Architecture View"）
│   ├── page.tsx                  # 首页 — 主时间线视图（约 800 行，核心页面）
│   ├── mvp/page.tsx              # MVP 审核管理页
│   └── globals.css               # 全局 CSS 变量 + 重置 + 滚动条 + Markdown 样式
├── components/                   # 可复用组件（共 11 个）
│   ├── Header.tsx                # 顶部胶囊导航栏
│   ├── Sidebar.tsx               # 浮动侧边栏（知识透视）
│   ├── Footer.tsx                # 底栏提示
│   ├── FeedCard.tsx              # Feed 流卡片
│   ├── FeedFilterBar.tsx         # Feed 过滤器栏
│   ├── TimelineView.tsx          # 时间线视图（含左右交错布局）
│   ├── GraphView.tsx             # ECharts 力导向知识图谱
│   ├── DataTable.tsx             # 数据表格视图
│   ├── DetailModal.tsx           # 详情弹窗（Markdown + Mermaid 渲染）
│   ├── DetailPanel.tsx           # 详情面板（侧边详情）
│   └── EntryForm.tsx             # 新建学习记录表单弹窗
├── styles/
│   └── layout.css                # 所有布局组件的 CSS 类
├── lib/
│   └── navigation.ts             # 导航状态管理
├── data/
│   └── tech-stack.ts             # 技术栈种子数据（48 个节点 + 边关系）
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## 十一、页面路由与视图结构

### 11.1 路由表

| 路由 | 组件 | 视图 | 说明 |
|------|------|------|------|
| `/` | `app/page.tsx` | 时间线 Feed | 按日期分组、无限滚动、研究类型筛选 |
| `/mvp` | `app/mvp/page.tsx` | 审核管理 | 待审核/已通过/已拒绝表格 + 审核弹窗 |

### 11.2 首页 (`/`) 布局结构

```
┌──────────────────────────────────────────────────────┐
│  Header（顶部胶囊）                                    │
│  [📚 学习日志] [时间线]  [●深度研究] [●主题探索] [●领域映射] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Main（可滚动时间线区域）                               │
│  ┌────────────────────────────────────────────────┐  │
│  │  2026/4/8                        3 条记录 ─────│  │
│  │  ├─ 14:30 ●───────── [卡片]                    │  │
│  │  ├─ 11:20 ●───────── [卡片]                    │  │
│  │  └─ 09:15 ●───────── [卡片]                    │  │
│  │                                                │  │
│  │  2026/4/7                        5 条记录 ─────│  │
│  │  ├─ 22:10 ●───────── [卡片]                    │  │
│  │  └─ ...                                       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  DetailModal (点击卡片弹出，全屏遮罩)                    │
└──────────────────────────────────────────────────────┘
```

### 11.3 图谱视图布局（在 `app/page.tsx` 中通过 Sidebar/GraphView/DataTable 组合）

```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │                                          │
│ (浮动)   │         GraphView (ECharts)              │
│ 240px    │         或 DataTable                      │
│          │                                          │
│ 节点类型 │                                          │
│ 精力过滤 │                                          │
│ 项目筛选 │                                          │
│ 统计信息 │                                          │
└──────────┴──────────────────────────────────────────┘
│              Footer (底栏提示)                       │
└─────────────────────────────────────────────────────┘
```

---

## 十二、组件详细规格

### 12.1 Header.tsx — 顶部胶囊导航栏

```
位置: fixed, top: 16px, 水平居中 (left: 50%, transform: translateX(-50%))
形状: 胶囊 (border-radius: 999px)
背景: rgba(15, 23, 42, 0.9) + backdrop-filter: blur(12px)
边框: 1px solid rgba(71, 85, 105, 0.5)
内边距: 6px 8px
布局: flex, gap: 12px

包含元素:
  [➕ 新建按钮] — accent-emerald, hover 时背景变淡绿
  [面包屑导航] — › 分隔的路径，最后一项为 accent-sky 激活态
  [图形|时间线 视图切换] — 胶囊内嵌的 segmented control
```

**Props:**
```typescript
interface HeaderProps {
  breadcrumb: NavItem[];
  onNavigate: (index: number) => void;
  onNewEntry: () => void;
  activeView: 'timeline' | 'graph';
  setActiveView: (view: 'timeline' | 'graph') => void;
  hideToggle?: boolean;
}
```

### 12.2 Sidebar.tsx — 浮动侧边栏

```
位置: fixed, left: 16px, top: 16px
宽度: 240px
背景: rgba(30, 41, 59, 0.6) + backdrop-filter: blur(12px)
边框: 1px solid rgba(71, 85, 105, 0.4)
圆角: 12px
内边距: 16px

包含元素:
  标题 "知识透视" (accent-sky, 带靶心 SVG 图标)
  ───────────────── (divider)
  节点类型筛选 — 带颜色圆点 + 计数
  ─────────────────
  精力过滤滑块 — range input, min=1 max=5, 翡翠绿滑块
  ─────────────────
  项目维度筛选 — 仅计科学科下显示 (业务/源码/组件)
  ─────────────────
  统计: Nodes: N | Edges: N
```

**Props:**
```typescript
interface SidebarProps {
  categories: FilterCategory[];
  onFilterChange: (minEnergy: number) => void;
  onCategoryToggle: (category: string | null) => void;
  activeCategory: string | null;
  totalNodes: number;
  totalEdges: number;
  activeProject: string | null;
  onProjectSelect: (projectId: string | null) => void;
  currentNodeId: string | null;
}
```

### 12.3 FeedCard.tsx — Feed 流卡片

```
背景: rgba(255,255,255,0.04)
边框: 1px solid rgba(255,255,255,0.08)
圆角: 12px
内边距: 20px
hover: 背景→rgba(255,255,255,0.07), 边框→rgba(255,255,255,0.15)

结构:
  [顶部元信息行]
    [学科 pill] — 绿底绿字, border-radius: 20px, padding: 4px 10px
    [项目 pill] — 紫底紫字 (可选)
    [研究类型] — text-muted
    [相对时间] — text-muted, 右对齐

  [标题 h3] — 18px, font-weight: 600

  [洞察摘要 p] — 14px, 默认 3 行截断 (-webkit-line-clamp: 3)
    ├─ 超过 150 字显示 "展开更多" 按钮 (accent-sky)
    └─ 展开后完整显示

  [Mermaid 图表预览] (可选)
    └─ 深色背景代码块, max-height: 100px / expanded: 300px

  [底部指标栏]
    ├─ 精力值 (energy_level >= 4 → #34d399, 否则 → #fbbf24)
    └─ 💡 顿悟时刻 (仅 aha_moment=1 时显示)
```

### 12.4 FeedFilterBar.tsx — Feed 过滤器栏

```
背景: rgba(255,255,255,0.03)
边框: 底部 1px solid rgba(255,255,255,0.06)
内边距: 12px 20px
布局: flex, gap: 12px, flex-wrap: wrap

结构:
  [视图切换]  📋 Feed  |  🕸️ 图谱
  │ (segmented buttons, 激活态 accent-sky)
  │
  [项目筛选]  ●业务项目  ●源码项目  ●组件项目
  │ (pill 按钮组, 各自颜色, 激活态有背景色)
  │
  [学科筛选]  计科 数学 物理 金融 法学
  │ (pill 按钮组, 激活态 emerald)
  │
  [视角筛选]  小题深研 专题探索 领域映射
  │ (pill 按钮组, 激活态 purple)
  │
  [清空]  仅在有筛选时显示
```

### 12.5 TimelineView.tsx — 时间线视图

```
最大宽度: 900px, 水平居中
padding: 40px 20px

头部:
  标题 "📚 学习日志时间线" — 32px, font-weight: 700
  渐变色: linear-gradient(135deg, #38bdf8, #a78bfa)
  (使用 background-clip: text 实现渐变文字)

时间线轴:
  中轴线 — 2px 宽, 渐变色 rgba(56,189,248,0.3) → transparent
  日期标签 — 居中胶囊, 渐变背景 + blur

记录布局 (左右交错):
  偶数索引 → flex-start (左侧, padding-right: 50%+30px)
  奇数索引 → flex-end (右侧, padding-left: 50%+30px)

  每个条目:
    ├─ 时间线圆点 (16px, 翡翠绿/琥珀黄, 3px 外发光)
    ├─ 连接横线 (30px, rgba(56,189,248,0.3))
    └─ FeedCard 组件
```

### 12.6 GraphView.tsx — ECharts 力导向图

```typescript
// ECharts 配置
{
  backgroundColor: 'transparent',
  series: [{
    type: 'graph',
    layout: 'force',
    roam: true,                // 支持缩放拖拽
    draggable: true,           // 节点可拖拽
    force: {
      repulsion: 500,          // 节点斥力
      edgeLength: 150,         // 边理想长度
      gravity: 0.05            // 重力
    },
    emphasis: { focus: 'adjacency' }  // hover 高亮邻接节点
  }]
}
```

**节点样式:**
- 大小: `30 + energy * 5` px（能量越高节点越大）
- 颜色按类别: design=`#34d399`, visual=`#38bdf8`, arch=`#a78bfa`, tech=`#fbbf24`
- 标签在节点下方 (position: 'bottom')

**边样式:**
- 颜色: `rgba(148, 163, 184, 0.2)`
- 曲线: `curveness: 0.1`

**交互:**
- 单击 → `onNodeClick(nodeId)` — 选中/筛选
- 双击 → `onNodeDoubleClick(nodeId, nodeName)` — 下钻

### 12.7 DataTable.tsx — 数据表格

```
列: 主题 | 标签 | 精力 | 顿悟 | 操作

表头样式:
  - position: sticky, top: 0
  - 背景: rgba(11, 17, 32, 0.95) + backdrop-filter: blur(8px)
  - 文字: 10px, uppercase, text-muted
  - padding: 12px 24px

行样式:
  - border-bottom: 1px solid rgba(71, 85, 105, 0.2)
  - hover: background rgba(51, 65, 85, 0.3)
  - padding: 16px 24px

标签徽章: 10px, 彩色边框 + 半透明背景
精力徽章: 24px 圆形, 等宽数字
顿悟列: ✓ (#34d399) 或 — (text-muted, opacity: 0.3)
```

### 12.8 DetailModal.tsx / page.tsx 内联弹窗 — 详情弹窗

```
遮罩:
  position: fixed, inset: 0
  背景: rgba(15, 23, 42, 0.92) / rgba(0,0,0,0.8)
  backdrop-filter: blur(8px)
  z-index: 1000

弹窗主体:
  最大宽度: 900px / 1000px
  最大高度: 85vh / 90vh
  背景: #1E293B 或 linear-gradient(135deg, #1e293b, #0f172a)
  圆角: 16px
  边框: 1px solid rgba(255,255,255,0.1)
  布局: flex column (头部固定 + 内容滚动)

头部:
  padding: 20px 24px
  底部边框: 1px solid #334155
  包含: 标题 h2 (20px/24px) + 标签行 + 关闭按钮 (×)

内容区:
  flex: 1, overflow: auto, padding: 28px
  Markdown 渲染 (见下文 §13)

自定义标签区:
  顶部边框分隔
  pill 标签: 6px 14px, border-radius: 20px, accent-sky 色调
```

### 12.9 EntryForm.tsx — 新建记录表单

```
弹窗结构 (同上述弹窗规格, 宽度 600px)

表单字段:
  ┌─ 核心主题 (input, required)
  ├─ 关键洞察 (textarea, required)
  ├─ [生活类比] [可迁移模式] (双列)
  ├─ 精力消耗 (range slider 1-5, 实时显示值)
  ├─ 架构图 Mermaid (textarea, 等宽字体, 默认流程图模板)
  └─ [取消] [保存并内化] (btn-secondary / btn-primary)

表单元素样式:
  input/textarea:
    背景: rgba(15, 23, 42, 0.6)
    边框: 1px solid var(--border-color)
    圆角: 6px
    内边距: 10px 12px
    focus: border-color → var(--accent-sky), box-shadow → 蓝色光晕
```

### 12.10 DetailPanel.tsx — 侧边详情面板

```
全宽全高, padding-top: 80px (避开顶部胶囊)
padding-left: 280px (避开侧边栏)

包含:
  类型徽章 (detail-type-badge) — 按 design/visual/arch/tech 着色
  标题 h2 — 20px, font-weight: 600
  路径 (等宽字体, text-muted)
  指标行:
    精力徽章 (圆形, 琥珀/灰色)
    顿悟标记 (✓ 或 —)
  关联知识点列表:
    可点击的标签, hover 背景变亮
```

---

## 十三、Markdown 渲染规格

### 13.1 组件配置

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}      // GFM 表格/任务列表支持
  rehypePlugins={[rehypeRaw]}      // 原始 HTML 支持
  components={{...}}               // 自定义渲染器 (见下文)
>
```

### 13.2 自定义渲染器样式

| 元素 | 样式 |
|------|------|
| **h1** | 22px / 28px, font-weight: 700, `#F1F5F9`, 底部 2px 蓝色边框 |
| **h2** | 18px / 22px, font-weight: 600, `#F1F5F9`, 底部 1px 细边框 |
| **h3** | 15px / 18px, font-weight: 600, `#E2E8F0` |
| **h4** | 14px, font-weight: 600, `#CBD5E1` |
| **p** | 14px, line-height: 1.75-1.8, `#CBD5E1`, margin-bottom: 16px |
| **strong** | font-weight: 600, `#F1F5F9` |
| **em** | font-style: italic, `#94A3B8` |
| **a** | `#38bdf8`, 底部细线, hover 变亮 |
| **ul/ol** | padding-left: 24px, 14px, line-height: 1.75 |
| **blockquote** | 左边 4px `#475569` 竖线, 半透明背景, 圆角右侧 |
| **hr** | 1px solid `#334155` |
| **inline code** | 半透明背景, `#38bdf8` 色, 4px 圆角, 等宽字体 |
| **code block** | macOS 三色圆点标题栏 + vscDarkPlus 主题高亮 |

### 13.3 Mermaid 图表渲染

```typescript
// 初始化
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',          // 或 'dark'
  fontSize: 11,
  flowchart: {
    padding: 20,
    nodeSpacing: 60,
    rankSpacing: 100,
    curve: 'basis'
  },
  themeVariables: {
    lineColor: '#8b95a8',
    primaryColor: '#1e293b',
    primaryTextColor: '#e8e8e8',
    primaryBorderColor: '#475569',
    textColor: '#c8d1dc'
  },
  themeCSS: `
    /* SVG 文本: Times New Roman + Noto Serif SC, 11px */
    .edgeLabel text { fill: #d1d8e0; }
    .edgePath .path { stroke: #8b95a8; stroke-width: 1.5px; }
    .node rect { fill: #1e293b; stroke: #475569; }
  `
});

// 渲染
await mermaid.render(id, chartCode);
// 或
mermaid.run();  // 查找 .mermaid 类元素并渲染
```

### 13.4 代码块渲染 (macOS 风格)

```
┌─────────────────────────────────┐
│ ●  ●  ●  language               │  ← 渐变标题栏 (#374151→#1f2937)
├─────────────────────────────────┤
│                                 │
│  code content (vscDarkPlus)     │  ← #1e1e1e / #0d1117 背景
│                                 │
│                     [复制按钮]   │  ← hover 可见
└─────────────────────────────────┘
```

圆点颜色: 红 `#ff5f56` / 黄 `#ffbd2e` / 绿 `#27c93f`

---

## 十四、数据流与 API 通信

### 14.1 后端地址

```typescript
const BACKEND_URL = 'http://localhost:8002';
```

### 14.2 核心 API 端点

| 方法 | 路径 | 用途 | 参数 |
|------|------|------|------|
| GET | `/api/entries` | 获取学习记录列表 | `limit`, `offset` |
| GET | `/api/entries/feed` | Feed 流（带筛选） | `limit`, `offset`, `project_type`, `discipline`, `research_type` |
| GET | `/api/entries/:id` | 单条详情 | — |
| POST | `/api/entries` | 创建记录 | body: LearningEntryCreate |
| GET | `/api/tags` | 标签列表 | `category` |
| GET | `/api/tags/tree` | 标签树 | — |
| GET | `/api/graph` | 图谱数据 | — |
| GET | `/api/stats` | 统计信息 | — |
| GET | `/api/projects` | 项目列表 | `project_type` |

### 14.3 数据获取模式

```typescript
// 无限滚动加载
const limit = 30;
fetch(`${BACKEND_URL}/api/entries?limit=${limit}&offset=${currentOffset}`)
  .then(res => res.json())
  .then(data => {
    // 去重合并到已有列表
    setEntries(prev => {
      const filtered = prev.filter(e => !newIds.has(e.id));
      return reset ? newEntries : [...filtered, ...newEntries];
    });
  });

// 滚动触发加载更多 (距底部 < 400px)
scrollHeight - scrollTop - clientHeight < 400
```

---

## 十五、TypeScript 类型体系

```typescript
// types/index.ts

export interface LearningEntry {
  id: number;
  topic: string;
  path: string;
  tags: Tag[];
  energy: number;
  ahaMoment: boolean;
}

export interface Tag {
  label: string;
  type: 'design' | 'visual' | 'arch' | 'tech';
}

export interface FilterCategory {
  label: string;
  color: string;
  count: number;
}

// app/page.tsx 中使用的 Entry 接口 (更完整)
interface Entry {
  id: number;
  topic: string;
  insight: string;
  diagram?: string;
  code_snippet?: string;
  topic_tag_id?: string;
  project_tag_id?: string;
  research_type?: string;
  energy_level: number;
  aha_moment?: number;
  timestamp: string;
  star_situation?: string;
  star_task?: string;
  star_action?: string;
  star_result?: string;
  custom_tags?: string[];
  related_tag_ids?: string[];
}
```

---

## 十六、关键交互模式

### 16.1 筛选器切换模式

```
点击筛选按钮 → toggle 激活态
  - 如果已激活 → 取消筛选 (setFilter(null))
  - 如果未激活 → 激活该筛选
  - 筛选后立即过滤已有 entries 列表（前端过滤，非重新请求）
```

### 16.2 无限滚动加载

```
初始加载 → loadEntries(true) 获取前 30 条
用户滚动 → 距离底部 < 400px 时自动触发 loadEntries(false)
  - 用 useRef 跟踪 offset，防止闭包问题
  - isLoadingRef 防止重复请求
  - hasMoreRef 标记是否还有更多数据
```

### 16.3 弹窗交互

```
点击卡片 → setSelected(entry) → DetailModal 渲染
点击遮罩 → setSelected(null) → 关闭
点击内容区 → e.stopPropagation() → 不关闭
按 × 按钮 → onClose() → 关闭
```

### 16.4 Mermaid 渲染时机

```
弹窗打开 → useEffect 检测 entry.diagram 变化
  → mermaid.render(id, chart) → setSvg(renderedSvg)
  → dangerouslySetInnerHTML 注入 SVG
```

---

## 十七、项目配置文件

### tsconfig.json

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

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;
```

---

## 十八、复现检查清单

若要完整复现此前端，按以下顺序操作：

1. **初始化项目**: `npx create-next-app@14.1.0 frontend --typescript`
2. **安装依赖**: 复制上方 package.json 的 dependencies 并 `npm install`
3. **创建目录**: `components/`, `styles/`, `lib/`, `types/`, `data/`（均在 frontend 根目录下，无 `src/`）
4. **CSS 文件**: 先写 `globals.css`（变量 + 重置），再写 `layout.css`（布局类）
5. **类型定义**: 创建 `types/index.ts`
6. **布局组件**: Header → Sidebar → Footer
7. **内容组件**: FeedCard → FeedFilterBar → TimelineView → DetailModal
8. **数据组件**: GraphView → DataTable → DetailPanel
9. **表单组件**: EntryForm
10. **页面组装**: `app/layout.tsx` → `app/page.tsx` → `app/mvp/page.tsx`
11. **启动**: `npm run dev -p 3000`，确保后端在 `localhost:8002` 运行

---

## 十九、设计原则总结

| 原则 | 实现方式 |
|------|---------|
| **暗色主题统一** | 所有背景从 `#0b1120` 到 `#1E293B` 深色梯度，无任何亮色模式 |
| **毛玻璃层次** | 浮动元素（侧边栏、导航、弹窗）统一 backdrop-filter |
| **语义色编码** | 4 种 accent 色对应不同维度（蓝=交互、绿=高能/通过、黄=中能/研究、紫=架构） |
| **内联样式优先** | 所有组件使用 inline `style={{}}`，CSS 文件仅定义可复用的布局类和全局令牌 |
| **无外部 UI 库** | 不依赖 Material UI / Ant Design / Chakra 等，纯手工组件 |
| **TypeScript 全量覆盖** | 所有组件 Props 有显式接口定义 |
| **客户端渲染** | `'use client'` 指令在所有交互组件中显式声明 |
