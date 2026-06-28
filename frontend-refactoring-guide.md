# Frontend Refactoring Guide

> 基于 2026-06-28 全面审查生成的架构/视觉/代码工程问题清单及改进方案。

---

## 一、架构设计问题

### 1. API Base URL 硬编码

- **位置**: `lib/api.ts:6`
- **问题**: `const BASE_URL = 'http://localhost:8002'` 直接硬编码，无法适配部署环境。
- **严重度**: 🔴 高
- **方案**: 改为环境变量 `NEXT_PUBLIC_API_URL`，运行时注入。

### 2. N+1 查询

- **位置**: `app/tags/page.tsx:33-36`
- **问题**: 语义聚类页面获取 attention 数据后，为每条记录独立调用 `api.entries.get(n.id)`，产生 N+1 次请求。
- **严重度**: 🔴 高
- **方案**: 后端增加批量 entries 查询接口，或前端聚合后一次性请求。

### 3. 无数据缓存层

- **位置**: 全局
- **问题**: 页面切换时所有数据全部重新请求，无 SWR/React Query/TanStack Query 等缓存机制。无请求去重、无自动重验证。
- **严重度**: 🟡 中
- **方案**: 引入 SWR 或 React Query，统一管理请求状态和缓存。

### 4. 无响应式设计

- **位置**: 全局
- **问题**: 所有页面使用 `height: 100vh`、固定宽度 540px 侧栏、无媒体查询断点，移动端不可用。
- **严重度**: 🟡 中
- **方案**: 添加 tablet/mobile 断点布局，侧栏改为全屏覆层。

### 5. EntryDetail 职责过重

- **位置**: `components/entry/EntryDetail.tsx`
- **问题**: 同一组件同时承载展示、编辑、删除、导航、侧栏面板等多重职责，约 245 行。
- **严重度**: 🟡 中
- **方案**: 拆分出 `EntryDetailSidebar`（仅侧栏容器），将编辑/删除逻辑提升到页面层。

### 6. 废弃 Props 残留

- **位置**: 多处调用点
- **问题**: `showTagBridge={false}` `showNeighbors={false}` 在所有调用处都传 `false`，属废弃参数。
- **严重度**: 🟢 低
- **方案**: 清理未使用的 props，简化组件接口。

---

## 二、视觉与 UI 设计问题

### 7. Hover 效果全部用 JS 实现

- **位置**: 几乎所有组件文件
- **问题**: `onMouseEnter`/`onMouseLeave` + `e.currentTarget.style.xxx = '...'` 模式。导致：
  - 代码膨胀 3-4 倍
  - 每次 hover 触发额外重渲染
  - 移动端完全无效
  - 相同逻辑重复书写（如 `page.tsx:92-97` 与 `tags/page.tsx:128-129` 模式完全相同）
- **严重度**: 🔴 高
- **方案**: 切换到 Tailwind CSS 或 CSS Modules，利用 `:hover` 伪类。

### 8. 无设计 Token 系统

- **位置**: 全局
- **问题**: 间距（16/20/24/28px）、圆角（6/8/10/12/16px）、字号散乱使用，无统一层级。
- **严重度**: 🟡 中
- **方案**: 建立 Design Token（`--spacing-sm/md/lg`、`--radius-sm/md/lg`、`--font-xs/sm/base/lg/xl` 等）。

### 9. 无骨架屏

- **位置**: 多处页面
- **问题**: 加载态仅显示文字提示（"加载中..."、"计算聚类中..."），缺乏骨架屏组件，感知性能差。
- **严重度**: 🟡 中
- **方案**: 创建通用 `Skeleton` 组件替代纯文字加载态。

### 10. CSS 文件空洞

- **位置**: `styles/index.css`
- **问题**: 仅 89 行全局样式，绝大部分样式逻辑散落在 JSX inline style 中，不可复用、不可覆盖。
- **严重度**: 🟡 中
- **方案**: 将公共样式提取到 CSS 文件中，保留 inline style 仅用于动态值。

### 11. 暗色主题固定

- **位置**: `styles/index.css:2`
- **问题**: `--bg-primary: #0F172A` 写死，无亮色主题切换能力。
- **严重度**: 🟢 低
- **方案**: 使用 `prefers-color-scheme` 媒体查询或 JS toggle 支持双主题。

### 12. 字号体系杂乱

- **位置**: 全局 inline styles
- **问题**: 使用了 11px / 12px / 13px / 14px / 15px / 17px / 18px / 20px / 22px 共 9 种字号，无层级规范。
- **严重度**: 🟢 低
- **方案**: 归一化到 4-5 级字阶（如 xs/sm/base/lg/xl）。

---

## 三、代码工程问题

### 13. `any` 类型泛滥

- **位置**: `app/page.tsx:19`、`app/graph/page.tsx:21`、`lib/api.ts:55,62,69,72` 等
- **问题**: `selected: useState<any>`、`echartsRef: useRef<any>`、多个 API 方法返回 `Promise<any>`，丧失 TypeScript 类型保护。
- **严重度**: 🔴 高
- **方案**: 补充具体类型定义，至少使用 `unknown` + type guard 替代 `any`。

### 14. `aha_moment` 类型冲突

- **位置**: `types/index.ts:50,77`
- **问题**: `Entry.aha_moment: number`（后端 0/1）vs `LearningEntryCreate.aha_moment: boolean`，前端靠 `=== 1` 桥接，易漏转换。
- **严重度**: 🔴 高
- **方案**: 统一为 `boolean`，在 API 响应/请求层做序列化转换。

### 15. GraphPage `useEffect` 内存泄漏

- **位置**: `app/graph/page.tsx:38-128`
- **问题**: cleanup function 定义在 `import('echarts').then()` 闭包内，外层 `useEffect` 的 return 是空函数。组件卸载时 chart.dispose() 和 resize listener 均未被清理。
- **严重度**: 🔴 高
- **方案**: 将 echarts 实例保存在 `useRef` 中，在 `useEffect` 外层 return 中统一清理。

### 16. `target: "es5"` 过时

- **位置**: `tsconfig.json:3`
- **问题**: Next.js 14 应用使用 `es5` 编译目标，浪费现代浏览器能力。
- **严重度**: 🟡 中
- **方案**: 改为 `es2017` 或 `esnext`。

### 17. `FeedParams` 类型放错文件

- **位置**: `lib/api.ts:38-44`
- **问题**: 类型定义写在 API 客户端文件而非 `types/index.ts`。
- **严重度**: 🟡 中
- **方案**: 迁移到 `types/index.ts` 统一管理。

### 18. `ResearchType` 动态 import 类型

- **位置**: `types/index.ts:174`
- **问题**: `export type ResearchType = keyof typeof import('@/lib/constants').RESEARCH_TYPES` 依赖模块求值顺序，不可靠。
- **严重度**: 🟡 中
- **方案**: 使用字面量联合类型 `'deep-research' | 'topic-exploration' | 'domain-mapping'`。

### 19. Tags 页静默吞错误

- **位置**: `app/tags/page.tsx:35`
- **问题**: `api.entries.get(n.id).catch(() => null)` 不打印日志，导致调试困难且用户无感知。
- **严重度**: 🟡 中
- **方案**: catch 中至少 `console.error`，对用户显示降级 UI。

### 20. EntryDetail 条件 return 语义危险

- **位置**: `components/entry/EntryDetail.tsx:57`
- **问题**: `if (!entry) return null;` 出现在 hooks 调用之后，虽不直接报错但破坏 React hooks 调用顺序一致性预期。
- **严重度**: 🟡 中
- **方案**: 将 `if (!entry)` guard 提前到所有 hooks 之前，或由父组件保证 entry 不为 null。

### 21. `next.config.js` 过于单薄

- **位置**: `next.config.js`
- **问题**: 仅 `reactStrictMode: true`，无 image optimization、compression、CSP headers、redirects 等生产配置。
- **严重度**: 🟢 低
- **方案**: 补充安全头、图片优化、压缩等配置。

### 22. 无自定义 ESLint 规则

- **位置**: `package.json:9`
- **问题**: `next lint` 仅依赖 `eslint-config-next` 默认规则，未自定义。
- **严重度**: 🟢 低
- **方案**: 补充 `no-console`、`@typescript-eslint/no-explicit-any` 等规则。

---

## 四、改进优先级

| 优先级 | 问题编号 | 预估工时 | 状态 | 说明 |
|--------|----------|----------|------|------|
| P0 | #1 #14 #15 | 2h | ✅ 完成 | API 地址、类型安全、内存泄漏 |
| P0 | #7 | 4h | ✅ 完成 | JS hover 模式全面替换 |
| P1 | #13 | 2h | ✅ 完成 | 消除 `any`，提升类型覆盖率 |
| P1 | #8 | 2h | ✅ 完成 | 建立 Design Token 规范 |
| P1 | #9 | 1h | ✅ 完成 | 骨架屏组件 |
| P1 | #2 #3 | 3h | 🔄 进行中 | 引入缓存 + 修复 N+1 |
| P2 | #4 | 4h | ⏳ 待办 | 响应式设计 |
| P2 | #5 #6 #16 #17 #18 #19 #20 | 3h | ✅ 完成 | 代码整洁度提升 |
| P2 | #21 | 1h | ✅ 完成 | next.config.js 生产配置 |
| P3 | #10 #11 #12 #22 | 3h | ⏳ 待办 | 锦上添花 |
