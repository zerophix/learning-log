# Learning Log 前端设计系统 · 完整参考文档

> **目标读者**：AI / 开发者。本文档完整描述前端的设计语言、组件体系、样式规范和技术栈，足以让 AI 据此 1:1 复现整个前端。
>
> 前置阅读: `ARCHITECTURE.md` · 复现步骤: `REPRODUCE.md` · 后端: `BACKEND.md` · 图谱: `GRAPH.md`

---

## 一、技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | **Next.js** (App Router) | 14.1.0 | 页面路由 + SSR 框架 |
| UI 库 | **React** | ^18 | 组件渲染（全部 `'use client'`） |
| 语言 | **TypeScript** | ^5 | 类型安全 |
| 图表 | **ECharts** | 5.4.3 | 力导向知识图谱 |
| 架构图 | **Mermaid** | 10.9.0 | Markdown 内嵌流程图渲染 |
| Markdown | **react-markdown** + remark-gfm + rehype-raw | 10.1.0 | 富文本洞察内容渲染 |
| 代码高亮 | **react-syntax-highlighter** | 16.1.1 | 代码块语法高亮（vscDarkPlus 主题） |
| 样式方案 | **纯内联 style + CSS 变量** | — | 无 CSS-in-JS，无 Tailwind，全局样式统一在 `styles/index.css` |
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

### 2.1 CSS 变量 (`styles/index.css`)

```css
:root {
  --bg-primary: #0F172A;          /* 最深背景（页面底色） */
  --bg-secondary: #1E293B;        /* 次深背景（卡片、面板） */
  --bg-panel: rgba(30, 41, 59, 0.6);  /* 半透明面板 */
  --border-color: #334155;        /* 通用边框 */
  --text-primary: #F1F5F9;        /* 正文文字 */
  --text-secondary: #94A3B8;      /* 次级文字 */
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
| 蓝色 | accent-blue | `#60a5fa` | 深度研究 |
| 紫色 | accent-violet | `#a78bfa` | 主题探索、架构标签 |
| 翡翠绿 | accent-emerald | `#34d399` | 高能量标记、领域映射 |

### 3.2 状态色 — 研究类型 (Research Type)

| 类型 | 标签 | 颜色 | 语义 |
|------|------|------|------|
| `deep-research` | 深度研究 | `#60a5fa` (blue) | 聚焦单一问题深入挖掘 |
| `topic-exploration` | 主题探索 | `#a78bfa` (violet) | 围绕主题发散探索 |
| `domain-mapping` | 领域映射 | `#34d399` (emerald) | 构建领域知识图谱 |

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

/* 底部提示栏（未使用） */
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

## 十、图标系统 (SVG Icons)

### ⚠️ 强制规范

**禁止使用任何 emoji 作为图标！** 所有图标必须使用统一风格的 SVG 图标。

### 10.1 图标规范

| 属性 | 规范 | 说明 |
|------|------|------|
| **格式** | SVG (内联) | 不使用图标字体或 PNG |
| **尺寸** | 24x24px | 页面标题旁图标 |
| | 20x20px | 按钮内图标 |
| | 16x16px | 小图标 |
| **线宽** | 1.5px | 统一描边宽度 |
| **配色** | `#38bdf8` | 天空蓝（主色调） |
| | `#34d399` | 翡翠绿（成功/高能量） |
| | `#fbbf24` | 琥珀黄（警告/中能量） |
| | `#a78bfa` | 紫色（架构/映射） |
| **风格** | 线性 (stroke) | 无填充，仅描边 |
| **圆角** | round | strokeLinecap="round" strokeLinejoin="round" |

### 10.2 图标库

| 名称 | SVG | 用途 |
|------|-----|------|
| **书本** | `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 19.5V4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7H16" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><path d="M8 11H14" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><path d="M8 15H12" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/></svg>` | 学习日志/文档 |
| **网络节点** | `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#38bdf8" stroke-width="1.5"/><circle cx="5" cy="6" r="2" stroke="#38bdf8" stroke-width="1.5"/><circle cx="19" cy="6" r="2" stroke="#38bdf8" stroke-width="1.5"/><circle cx="5" cy="18" r="2" stroke="#38bdf8" stroke-width="1.5"/><circle cx="19" cy="18" r="2" stroke="#38bdf8" stroke-width="1.5"/><path d="M7 7L10 10" stroke="#38bdf8" stroke-width="1.5"/><path d="M17 7L14 10" stroke="#38bdf8" stroke-width="1.5"/><path d="M7 17L10 14" stroke="#38bdf8" stroke-width="1.5"/><path d="M17 17L14 14" stroke="#38bdf8" stroke-width="1.5"/></svg>` | 知识图谱/关联 |
| **列表** | `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="4" rx="1" stroke="#38bdf8" stroke-width="1.5"/><rect x="3" y="10" width="18" height="4" rx="1" stroke="#38bdf8" stroke-width="1.5"/><rect x="3" y="16" width="18" height="4" rx="1" stroke="#38bdf8" stroke-width="1.5"/></svg>` | Feed流/列表 |
| **搜索** | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#64748b" stroke-width="1.5"/><path d="M21 21L16.65 16.65" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/></svg>` | 搜索框 |
| **加号** | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` | 新建按钮 |
| **灯泡** | `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18H15M10 22H14M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17H16V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 顿悟时刻 |
| **关闭** | `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` | 关闭按钮 |
| **编辑** | `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M18.5 2.50001C18.8978 2.10219 18.8978 1.45782 18.5 1.06001L16.9393 -0.500686C16.5415 -0.898505 15.8971 -0.898505 15.4993 -0.500686L7 7.99933V11H10L18.5 2.50001Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 编辑按钮 |
| **删除** | `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6H5H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 删除按钮 |
| **沙漏** | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 3H19M5 21H19M6 3V8L12 12L6 16V21M18 3V8L12 12L18 16V21" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 加载中 |
| **标签** | `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 7H7.01M7 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V7M17 7H17.01M7 17H7.01M17 17H17.01M17 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V17M12 12H12.01M7 12H7.01M17 12H17.01M12 7H12.01M12 17H12.01" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 标签徽章装饰 |
| **警告** | `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 18.98C1.55 19.32 1.64 19.66 1.82 19.96C2 20.26 2.26 20.51 2.57 20.69C2.88 20.87 3.23 20.97 3.59 20.97H20.41C20.77 20.97 21.12 20.87 21.43 20.69C21.74 20.51 22 20.26 22.18 19.96C22.36 19.66 22.45 19.32 22.45 18.98C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.96 3.14C12.65 2.96 12.3 2.86 11.94 2.86C11.58 2.86 11.23 2.96 10.92 3.14C10.61 3.32 10.35 3.56 10.17 3.86L10.29 3.86Z" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 错误/警告提示 |
| **加载** | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2V4M12 20V22M4 12H2M22 12H20M6.34 6.34L4.93 4.93M19.07 19.07L17.66 17.66M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/></svg>` | 加载旋转变换 |
| **空状态** | `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity:0.3"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#475569" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="#475569" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="#475569" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` | 空状态占位 |

### 10.3 使用示例

```tsx
// 页面标题
<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" 
          stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 7H16" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 11H14" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 15H12" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
  <span style={{ fontSize: '17px', fontWeight: 600, color: '#F8FAFC' }}>学习日志</span>
</div>

// 按钮图标
<button>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
  新建
</button>
```

### 10.4 禁止事项

❌ **禁止使用 emoji 作为图标**（如 📚 🕸️ 📰 💡 ⏳ 等）  
❌ **禁止使用图标字体**（如 Font Awesome、Iconfont）  
❌ **禁止使用 PNG 图标**（除非是特殊品牌 logo）  
✅ **必须使用内联 SVG**（便于主题切换、颜色控制、尺寸调整）

---

## 十、组件体系与目录结构

### 10.0 文件组织规范（强制）

| 规则 | 说明 |
|------|------|
| **禁止根目录散落文件** | 所有 `.js`/`.ts` 文件必须归属到对应目录，根目录仅保留配置文件（`next.config.js`、`tsconfig.json`、`package.json`） |
| **禁止 emoji 图标** | 所有图标使用统一 SVG 图标组件（`components/ui/Icons.tsx`），禁止在代码中使用 emoji 作为图标 |
| **禁止死代码** | 未被任何文件引用的组件、数据文件、CSS 文件必须及时删除 |
| **禁止空目录** | 不存在的功能不留空目录占位 |
| **样式方案** | 组件使用内联 `style={{}}`，全局样式统一在 `styles/index.css` 中定义 CSS 变量和重置 |
| **第三方库通过 npm** | 禁止手动放置 `.min.js` 文件（如 `echarts.min.js`），统一通过 `package.json` 管理 |

### 10.1 目录结构

```
frontend/
├── app/                              # Next.js App Router 页面路由
│   ├── layout.tsx                    # 根布局（metadata + styles/index.css 引入）
│   ├── page.tsx                      # 首页 — 时间线视图（按周分页，~186 行）
│   ├── graph/
│   │   └── page.tsx                  # 知识图谱页（ECharts 力导向图）
│   ├── feed/
│   │   └── page.tsx                  # Feed 卡片流页（网格布局）
├── styles/                           # 全局样式
│   └── index.css                     # CSS 变量 + 重置 + 滚动条 + Markdown 样式
├── components/                       # 可复用组件（按职责分组）
│   ├── ui/                           # 通用 UI 原子组件
│   │   ├── Icons.tsx                 # 统一 SVG 图标库（14 个图标组件）
│   │   ├── Tag.tsx                   # 标签徽章
│   │   ├── CopyButton.tsx           # 复制按钮
│   │   ├── SearchBar.tsx            # 搜索栏
│   │   └── ErrorBoundary.tsx        # 错误边界组件
│   ├── entry/                        # 条目相关组件
│   │   ├── EntryCard.tsx            # 时间线卡片
│   │   ├── EntryDetail.tsx          # 详情弹窗（含编辑/删除）
│   │   ├── EntryDetailContent.tsx   # 详情内容面板（P6.7 提取）
│   │   ├── EntryForm.tsx            # 新建/编辑表单
│   │   ├── EntryTags.tsx            # 标签行组件
│   │   ├── DeleteConfirm.tsx        # 删除确认弹窗
│   │   ├── FormField.tsx            # 表单字段原子组件（P6.7 提取）
│   │   └── InsightPreview.tsx       # 洞察预览文本
│   ├── layout/                       # 布局组件
│   │   ├── Navigation.tsx           # 页面导航栏
│   │   ├── PageHeader.tsx           # 统一页面头部
│   │   ├── FilterBar.tsx            # 研究类型过滤器
│   │   └── StatsPanel.tsx           # 统计面板
│   ├── renderers/                    # 渲染器
│   │   ├── MarkdownRenderer.tsx     # Markdown 渲染
│   │   ├── CodeBlock.tsx            # 代码块（macOS 风格标题栏 + 复制按钮）
│   │   └── MermaidDiagram.tsx       # Mermaid 图表渲染
│   └── timeline/
│       └── TimelineView.tsx         # 时间线视图（日期分组 + 交错布局）
├── hooks/                            # 自定义 Hooks
│   └── useToast.tsx                  # Toast 通知 Context → Provider + Hook + 渲染
├── lib/                              # 工具库
│   ├── api.ts                        # 统一 API 客户端（所有 fetch 调用）
│   └── constants.ts                  # 常量定义（研究类型等）
├── types/
│   └── index.ts                      # 统一 TypeScript 类型定义
├── package.json
├── tsconfig.json
└── next.config.js
```

### 10.2 目录职责说明

| 目录 | 职责 | 文件数量上限 |
|------|------|------------|
| `app/` | 页面路由入口，仅做组件组装和数据获取 | 每路由 1 个 `page.tsx` |
| `styles/` | 全局样式（CSS 变量 + 重置 + 滚动条 + Markdown 样式） | 1（`index.css`） |
| `components/ui/` | 通用原子组件，无业务逻辑 | ≤ 10 |
| `components/entry/` | 条目 CRUD 相关组件 | ≤ 8 |
| `components/layout/` | 页面级布局/导航/统计组件 | ≤ 6 |
| `components/renderers/` | 内容渲染引擎（Markdown/Mermaid） | ≤ 4 |
| `components/timeline/` | 时间线专用视图 | ≤ 2 |
| `lib/` | 纯函数工具，无 React 依赖 | ≤ 5 |
| `types/` | TypeScript 类型/接口定义 | 1（`index.ts`） |

---

## 十一、页面路由与视图结构

### 11.1 路由表

| 路由 | 组件 | 视图 | 说明 |
|------|------|------|------|
| `/` | `app/page.tsx` | 时间线 | 按周分页、日分组、搜索过滤、研究类型筛选、CRUD |
| `/graph` | `app/graph/page.tsx` | 注意力知识图谱 | ECharts 力导向图 (layout:force)，节点按关联强度聚类，标签仅 hover 显示。配色: `#60a5fa` 深度研究 / `#a78bfa` 主题探索 / `#34d399` 领域映射 |
| `/feed` | `app/feed/page.tsx` | Feed 流 | 卡片网格布局，研究类型 + 聚类过滤 |


### 11.2 首页 (`/`) 布局结构

```
┌──────────────────────────────────────────────────────────────────┐
│  Navigation                                                     │
│  [📖 学习日志]          [时间线] [图谱] [Feed]                  │
├──────────────────────────────────────────────────────────────────┤
│  SearchBar / StatsPanel / FilterBar                              │
├───────────────────────────────────────┬──────────────────────────┤
│                                       │                          │
│  TimelineView（按周分页）              │  EntryDetail（侧边栏）   │
│  ← W14   第25周    W26 →              │  540px, sidebar-detail   │
│  2026/4/8        3条                  │  [标题 + 时间]           │
│  ├─ 14:30 ●── [EntryCard]            │  [标签行 + 编辑/删除]    │
│  ├─ 11:20 ●── [EntryCard]            │  [Markdown 内容]         │
│  └─ 09:15 ●── [EntryCard]            │  [关联索引]              │
│                                       │                          │
├───────────────────────────────────────┴──────────────────────────┤
│  EntryForm (新建/编辑弹窗，fixed 遮罩覆盖全屏)                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 十二、组件详细规格

### 12.1 Navigation.tsx — 顶部胶囊导航栏

```
位置: fixed, top: 16px, 水平居中 (left: 50%, transform: translateX(-50%))
形状: 胶囊 (border-radius: 999px)
背景: rgba(15, 23, 42, 0.9) + backdrop-filter: blur(12px)
边框: 1px solid rgba(71, 85, 105, 0.5)
内边距: 6px 8px
布局: flex, gap: 4px

包含元素:
  [时间线] [图谱] [Feed] — 路由链接，激活态 accent-sky
```

### 12.2 PageHeader.tsx — 统一页面头部

```
布局: flex, align-items: center, gap: 10px, padding: 14px 28px
底部边框: 1px solid var(--bg-secondary)

结构:
  [图标 (24px)] [标题 (17px, 600)] [badge (可选, 11px, text-muted)]
  [Navigation 组件 (flex: 1, 居右)]
  [children (额外的操作按钮)]
```

**Props:**
```typescript
interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  badge?: string;
  children?: ReactNode;
}
```

### 12.3 StatsPanel.tsx — 统计面板

```
布局: flex, gap: 16px, padding: 12px 0

3 个统计卡片（flex: 1）:
  - 条目总数 — 24px 700, accent-sky
  - 标签总数 — 24px 700, accent-emerald
  - 关联总数 — 24px 700, accent-purple
  描述文字: 11px, text-muted

加载态: 3 块骨架脉冲动画 (skeletonPulse 1.5s), 每块延迟 0.15s
错误态: 12px, #ef4444
```

### 12.4 FilterBar.tsx — 研究类型过滤器

```
布局: flex, gap: 8px, flex-wrap: wrap

按钮样式:
  padding: 6px 14px, border-radius: 6px
  border: 1px solid var(--border-color)
   background: transparent (默认) / var(--accent-color) (激活，颜色按类型)
  color: var(--text-secondary) (默认) / var(--bg-primary) (激活)
  font-size: 12px, font-weight: 500

点击: toggle 激活态, activeFilter={type, id} | null
```

### 12.5 TimelineView.tsx — 时间线视图（按周分页）

```
最大宽度: 900px, 水平居中
padding: 40px 20px

周导航（顶部居中）:
  [← Wx]  [第 N 周 · YYYY]  [Wx →]   ← 切换按钮
  [yyyy-mm-dd ~ yyyy-mm-dd · N 条]
  [下拉选择周 ▾]                       ← weekIndex 填充

时间线轴:
  中轴线 — 2px 宽, 渐变色 rgba(56,189,248,0.3) → transparent
  日期标签 — 居中胶囊, 渐变背景 + blur

每日分组（同旧版，按日分组渲染）:
  日期头 | N 条记录 | 渐变横线
  左侧竖线 + EntryCard

Props:
  entries: Entry[]          当前周数据
  weekInfo: WeekInfo        周元信息（start/end/count）
  weekIndex: WeekInfo[]     所有有记录的周
  currentWeek: {year, week} 当前定位
  onPrevWeek / onNextWeek   周导航回调
  onSelectWeek              跳转回调
  onSelect                  选中条目回调
```

### 12.6 EntryCard.tsx — 时间线卡片

```
背景: var(--bg-secondary)
边框: 1px solid var(--border-color), 圆角: 12px
padding: 20px
hover: border-color → var(--text-muted), box-shadow: 0 4px 20px rgba(0,0,0,0.3)
cursor: pointer

结构:
  [EntryTags — 标签行]
  [标题 h3] — 16px, 600
  [洞察预览] — summary ?? truncate(insight), 12px, 3 行截断
  [时间] — 11px, text-muted

可访问性: role="button", tabIndex={0}, onKeyDown Enter/Space
```

### 12.7 EntryDetail.tsx — 详情侧边栏

```
定位: `.content-area` flex 布局的子项，与 `main` 并列
类名: sidebar-detail (540px, border-left, flex-shrink: 0)
背景: var(--bg-secondary)
圆角: 12px 0 0 12px, box-shadow: -8px 0 24px rgba(0,0,0,0.3)

桌面端:
  width: 540px / min-width: 360px
  margin-left: 24px, margin-right: 16px
  height: 100% (填满 content-area)

移动端 (≤768px):
  position: fixed, top: 0, left: 0, right: 0, bottom: 0
  width: 100%, z-index: 100
  border-radius: 0
  animation: slideInUp

关闭行为:
  - 点 × 按钮 → onClose()
  - Escape 键 → onClose()
  - 保存/删除后自动关闭
  - 同一条目再次点击 → handleSelect toggle → null
  - ❌ 点击侧边栏内容不会关闭 (e.stopPropagation() 在根 div)
  - ❌ Feed 页有 backdrop 遮罩 (click → close)，仅限 Feed 页

结构:
  头部: topic + 时间 + 编辑/删除按钮 + 关闭 ×
  内容区: overflow auto
    → EntryDetailContent (摘要? + Markdown + Mermaid + STAR)
    → EntryNeighbors (关联索引，可点击导航)

可访问性: role="dialog", aria-modal, useEffect Escape 关闭
```

### 12.8 DeleteConfirm.tsx — 删除确认弹窗

```
遮罩: fixed, inset: 0, background: rgba(15,23,42,0.95), z-index: 1100

弹窗: 居中, 300px, 圆角 12px
  文字: "确认删除此条目？"
  按钮: [取消] [确认删除 (红色, autoFocus)]

可访问性: role="dialog", aria-modal, useEffect Escape 取消
```

### 12.9 EntryForm.tsx — 新建/编辑表单

```
弹窗结构 (同弹窗规格, 宽度 600px)

表单字段 (FormField 原子组件):
  ┌─ 核心主题 (input, required)
  ├─ 摘要 (input, 可选) — 1-3 句话预览
  ├─ 关键洞察 (textarea, required)
  ├─ STAR 情境 (textarea)
  ├─ STAR 任务 (textarea)
  ├─ STAR 行动 (textarea)
  ├─ STAR 结果 (textarea)
  ├─ [生活类比] [可迁移模式] (双列, textarea)
  ├─ 精力消耗 (range 1-5)
  ├─ 架构图 Mermaid (textarea, 等宽字体)
  └─ [取消] [保存] (按钮)

表单元素样式:
  背景: rgba(15, 23, 42, 0.6)
  边框: 1px solid var(--border-color)
  圆角: 6px
  focus: border-color → var(--accent-sky)

可访问性: role="dialog", aria-modal, useEffect Escape 取消
```

### 12.10 EntryTags.tsx — 标签行组件

```
布局: flex, gap: 6px, flex-wrap: wrap

渲染:
  topic_tag_id → Tag 组件 (accent-sky)
   project_tag_id → Tag 组件 (accent-purple / #a78bfa)
   research_type → Tag 组件 (颜色按类型: #60a5fa blue / #a78bfa violet / #34d399 emerald)
  energy_level → 数字徽章 (energy>=4 → green, else → amber)
  aha_moment → 灯泡图标 (仅 aha_moment=1)
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
| GET | `/api/entries/week-index` | 所有有记录的周列表 | — |
| GET | `/api/entries/week` | 单周记录 | `year`, `week`, `limit` |
| GET | `/api/tags` | 标签列表 | `category` |
| GET | `/api/tags/tree` | 标签树 | — |
| GET | `/api/graph` | 图谱数据 | — |
| GET | `/api/stats` | 统计信息 | — |
| GET | `/api/projects` | 项目列表 | `project_type` |

### 14.3 数据获取模式

```typescript
// api.ts — fetchWithTimeout (10s, AbortSignal 支持)
export function fetchWithTimeout(url: string, timeout = 10000, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort());
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

// 统一 API 客户端（所有 GET 方法使用 fetchWithTimeout）
export const api = {
  entries: {
    list:    (limit = 50, offset = 0, signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/entries?limit=${limit}&offset=${offset}`).then(checkResponse<Entry[]>),
    feed:    (params?: FeedParams, signal?: AbortSignal) => ...,
    get:     (id: number, signal?: AbortSignal) => ...,
    create:  (data: LearningEntryCreate) => ...,          // POST
    update:  (id: number, data: LearningEntryUpdate) => ..., // PUT
    delete:  (id: number) => ...,                          // DELETE
  },
  graph:  (signal?: AbortSignal) => ...,
  stats:  (signal?: AbortSignal) => ...,
  tags:   { list, tree, entries },
  projects: { list, entries },
};

// 无限滚动加载 (page.tsx)
const limit = 30;
api.entries.list(limit, currentOffset, signal)
  .then(data => {
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

// --- Tag 类型 ---
export interface Tag {
  tag_id: string;
  tag_name: string;
  tag_category: string;
  tag_description?: string;
  parent_tag_id?: string;
  energy_level: number;
  is_active?: number;
}

export interface TagNode extends Tag {
  children: TagNode[];
}

export interface TagLink {
  source_tag_id: string;
  target_tag_id: string;
  link_type: string;
  link_description?: string;
}

// --- Learning Entry 类型 ---
export interface LearningEntryCreate {
  topic: string;
  insight: string;
  summary?: string;
  diagram?: string;
  code_snippet?: string;
  star_situation: string;
  star_task: string;
  star_action: string;
  star_result: string;
  topic_tag_id?: string;
  project_tag_id?: string;
  research_type?: string;
  related_tag_ids?: string[];
  custom_tags?: string[];
  analogy?: string;
  transfer_pattern?: string;
  energy_level?: number;
  aha_moment?: boolean;
  source?: string;
  confidence_rating?: number;
}

export type LearningEntryUpdate = Partial<LearningEntryCreate>;

// 前端展示用 Entry（GET 返回）
export interface Entry {
  id: number;
  topic: string;
  insight: string;
  summary?: string;
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
  aha_moment: number;       // 0/1 (非 boolean)
  source: string;
  confidence_rating?: number;
  timestamp: string;
  content_hash?: string;
}

// --- Graph 类型 ---
export interface GraphNode {
  id: string;
  label: string;
  category: string;
  degree?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- Stats 类型 ---
export interface Stats {
  entries: number;
  tags: number;
  links: number;
}
// --- 周分页类型 ---

export interface WeekInfo {
  year: number;
  week: number;
  start: string;
  end: string;
  count: number;
}

export interface WeekResponse {
  data: Entry[];
  week: WeekInfo;
  has_more: boolean;
}

// --- 辅助类型 ---

export type ResearchType = keyof typeof import('@/lib/constants').RESEARCH_TYPES;
export type EntryFilter = { type: 'research' | 'project' | 'tag'; id: string } | null;
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

### 16.2 按周分页加载（取代无限滚动）

```
页面加载 → weekIndex → 定位最新周 → loadWeek() 获取该周数据
用户切换周 → ←/→ 按钮、下拉选择器、键盘方向键
  - 当前周索引: weekIndex.findIndex(...)
  - hasPrev = currentIdx < weekIndex.length - 1
  - hasNext = currentIdx > 0
```

### 16.3 侧边栏交互

```
点击卡片 → handleSelect(entry) → setSelected(prev => prev?.id === entry.id ? null : entry)
同一条目再次点击 → setSelected(null) → 关闭（toggle）
点击侧边栏根 div → e.stopPropagation() → 不关闭
点击 × 按钮 → onClose() → 关闭
Escape 键 → onClose() → 关闭（handleKeyDown useEffect）
保存/删除成功 → onClose() → 关闭
Feed 页: backdrop (position: fixed, inset: 0, zIndex: 99) → click → close
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
3. **创建目录**: `styles/`, `components/ui/`, `components/entry/`, `components/layout/`, `components/renderers/`, `components/timeline/`, `lib/`, `types/`, `app/graph/`, `app/feed/`
4. **全局样式**: 编写 `styles/index.css`（CSS 变量 + 重置 + 滚动条 + Markdown 样式）
5. **类型定义**: 创建 `types/index.ts`
6. **常量与 API**: 创建 `lib/constants.ts` + `lib/api.ts`
7. **图标库**: 创建 `components/ui/Icons.tsx`（统一 SVG 图标）
8. **UI 原子组件**: Icons → Tag → CopyButton → ErrorBoundary → SearchBar
9. **渲染器**: MarkdownRenderer → CodeBlock → MermaidDiagram
10. **表单原子组件**: FormField (FormInput/FormTextarea/FormSelect/FormNumber/FormCheckbox)
11. **业务组件**: EntryCard → EntryDetail → EntryDetailContent → EntryForm → EntryTags → DeleteConfirm → FilterBar → StatsPanel → PageHeader → Navigation → TimelineView
12. **页面组装**: `app/layout.tsx` → `app/page.tsx` → `app/graph/page.tsx` → `app/feed/page.tsx`
13. **启动（生产模式）**: `npm run build && npm start -p 3000`，确保后端在 `localhost:8002` 运行

---

## 附录 A: 已修复的架构/代码问题

以下问题在代码审查中被发现并修复：

| 优先级 | 问题 | 修复说明 |
|--------|------|----------|
| P0 | API Base URL 硬编码 | 改为 `NEXT_PUBLIC_API_URL` 环境变量 |
| P0 | `aha_moment` 类型冲突 (number vs boolean) | 统一为 boolean，API 响应层做序列化 |
| P0 | Graph `useEffect` 内存泄漏 | 移除 `import('echarts')` 动态加载，useRef 持有实例 |
| P0 | JS hover 全部用 onMouseEnter/Leave | 替换为 CSS Module `:hover` 伪类 |
| P1 | `any` 类型泛滥 | 补充具体接口定义 |
| P1 | 无 Design Token 系统 | 建立 `--spacing-*` `--radius-*` `--font-*` CSS 变量 |
| P1 | 无骨架屏 | 创建 `Skeleton` 组件替代文字加载态 |
| P1 | N+1 查询 + 无缓存 | 后端增加批量接口，前端无 SWR/React Query |
| P2 | 无响应式设计 | 添加媒体查询断点，侧栏全屏覆盖 |
| P2 | EntryDetail 职责过重 | 拆分 EntryDetailContent/FormField |
| P2 | 清理废弃 props、类型位置错误、动态 import 类型 | 全部修正 |
| P3 | CSS 文件空洞、字号体系杂乱、固定暗色主题等 | 归类到 CSS 变量 + 层级规范 |

---

## 十九、设计原则总结

| 原则 | 实现方式 |
|------|---------|
| **暗色主题统一** | 所有背景从 `#0F172A` 到 `#1E293B` 深色梯度，无任何亮色模式 |
| **毛玻璃层次** | 浮动元素（导航、弹窗）统一 backdrop-filter |
| **语义色编码** | 4 种 accent 色对应不同维度（蓝=交互/深度研究、紫=主题探索、绿=高能/领域映射、黄=中能量） |
| **内联样式优先** | 所有组件使用 inline `style={{}}`，全局 CSS 统一在 `styles/index.css` 定义 |
| **无外部 UI 库** | 不依赖 Material UI / Ant Design / Chakra 等，纯手工组件 |
| **TypeScript 全量覆盖** | 所有组件 Props 有显式接口定义，禁止 `any` |
| **客户端渲染** | `'use client'` 指令在所有交互组件中显式声明 |
| **SVG 图标统一** | 所有图标使用 `components/ui/Icons.tsx` 管理，禁止 emoji |
| **文件职责单一** | 每个组件文件 ≤ 200 行，仅负责单一职责 |
| **无死代码** | 未引用的文件/目录及时清理，根目录不放散落文件 |
| **依赖 npm 管理** | 第三方库统一通过 `package.json`，禁止手动放 `.min.js` |
