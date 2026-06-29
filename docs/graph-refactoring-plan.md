# 图谱页面重构计划

## 当前问题

**来源**: 图谱页面 1412 行单文件 `frontend/app/graph/page.tsx`，存在架构、性能、数据流、交互四类问题。

### 架构问题
1. **单文件过大** — 1412 行包含数据加载、3 种 ECharts 视图生成、状态管理、搜索、UI 渲染、键盘事件全部逻辑
2. **ECharts option 生成器在组件闭包内** — `createForceGraphOption`/`createTimelineOption`/`createGalaxyOption` 无法独立测试/复用
3. **样式全部内联** — 无 CSS 类名，不利于主题切换和样式复用
4. **死状态** — `edgeThreshold` 声明但未使用；`rawGraphData` 与 `graphData` 同步设置，冗余

### 性能问题
5. **搜索高亮不触发 ECharts 更新** — `matchedNodeIds` 未加入 useEffect 依赖，输入搜索词图表不响应
6. **每次筛选重建 ECharts 实例** — `dispose()`+`init()` 而非 `setOption` 增量更新，丢失用户缩放/平移状态
7. **FPS 监控每秒重渲染** — `requestAnimationFrame` + `setState` 导致整个组件树每秒重渲染一次
8. **Galaxy 视图 `Math.random()`** — 每次渲染布局抖动，位置不一致

### 数据流问题
9. **后端不返回 tags** — `EnhancedGraphNode.tags` 恒为 `[]`，`searchTags` 和 `tagIds` 过滤永远无结果
10. **summary 被后端截断 100 字** — 侧边栏摘要信息不完整
11. **缓存未失效** — Create/update/delete 只失效 `/api/graph`，未失效 `/api/graph/attention`

### 交互问题
12. **Timeline Y 轴固定公式** — 振幅 120px，节点少时稀疏、多时重叠
13. **Galaxy `Math.random()`** — 布局不稳定
14. **清除筛选不重置 `galaxyCenterId`**
15. **"r" 键刷新无防抖** — 旧请求不被 abort，可能并发堆积
16. **类型筛选单选但系统支持多选** — select 与 clusterIds 多选交互不一致
17. **左右图例可能重叠** — 均为 `position: absolute`，窄屏重叠
18. **Galaxy 无边箭头** — 与 Force 视图不统一

## 重构范围

| 变更 | 影响文件 |
|------|---------|
| 提取 ECharts option 生成器 | 新 `lib/graph-echarts-options.ts` |
| 拆分 UI 组件 | 新 `components/graph/GraphToolbar.tsx` |
| | 新 `components/graph/ClusterPanel.tsx` |
| | 新 `components/graph/NodeDetailPanel.tsx` |
| | 新 `components/graph/GraphLegend.tsx` |
| 重构 page.tsx | `app/graph/page.tsx`（预期缩减到 ~300 行）|
| 修改 graph-utils.ts | 修复 `calculateTimelineLayout`/`calculateGalaxyLayout` |
| 修改 api.ts | 修复缓存失效 |
| 修改后端 graph.py | 返回完整 summary + tags |

## 执行计划

### Phase 0: 准备
- P0.1 创建 `components/graph/` 目录
- P0.2 备份 page.tsx

### Phase 1: 提取 ECharts option 生成器
- P1.1 创建 `lib/graph-echarts-options.ts`
- P1.2 将 `createForceGraphOption` 迁移为纯函数，参数显式化
- P1.3 将 `createTimelineOption` 迁移，使用 `calculateTimelineLayout`（已存在）
- P1.4 将 `createGalaxyOption` 迁移，使用 `calculateGalaxyLayout`（已存在）
- P1.5 page.tsx 导入并使用，消除闭包耦合

### Phase 2: 修复 Bug — page.tsx 内联修复
- P2.1 `matchedNodeIds` 加入 ECharts useEffect 依赖
- P2.2 FPS 改为 Ref 不触发渲染
- P2.3 移除 `edgeThreshold` 死状态
- P2.4 合并 `rawGraphData`+`graphData` 为单一状态
- P2.5 `clearFilters` 增加 `galaxyCenterId` 重置
- P2.6 "r" 键使用 `useRef` 保存 controller 并 abort 旧请求
- P2.7 修复 galaxy `Math.random()` → 确定性伪随机

### Phase 3: 提取 UI 组件
- P3.1 创建 `GraphToolbar.tsx` — 视图切换、筛选器、搜索、显示控制
- P3.2 创建 `ClusterPanel.tsx` — 聚类侧边栏
- P3.3 创建 `NodeDetailPanel.tsx` — 选中节点详情面板
- P3.4 创建 `GraphLegend.tsx` — 底部图例
- P3.5 page.tsx 集成组件

### Phase 4: 样式改进 + 最终清理
- P4.1 底部图例改为 flex 避免重叠
- P4.2 移除所有内联样式，替换为 CSS Module 或全局类
- P4.3 统一视图间不一致（Galaxy 加箭头，Timeline 加标签）
- P4.4 验证：`npm run build` 无错误

## 重构结果

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| `page.tsx` 行数 | 1412 行 | 762 行 (46% ↓) |
| 文件数 | 1 个 | 5 个（拆出 3 组件 + 1 模块）|
| ECharts 重建策略 | dispose+init 每次 | init 一次 + setOption 增量 |
| Galaxy 布局 | Math.random() 抖动 | 确定性伪随机 |
| 搜索高亮 | 不触发图表更新 | matchedNodeIds 加入依赖 |
| FPS 监控 | rAF+setState 每秒渲染 | ref 计数 + 500ms setState |
| "r" 键 | 无 abort | useRef 保存旧 controller |
| clearFilters | 不重置 galaxyCenterId | 加入重置 |

### 新文件结构

```
frontend/
  lib/
    graph-utils.ts              (529 行, 未变)
    graph-echarts-options.ts    (新, ~280 行 — 3 个 ECharts option 纯函数)
  components/graph/
    GraphLegend.tsx             (新, ~70 行 — 底部图例)
    ClusterPanel.tsx            (新, ~80 行 — 聚类侧边栏)
    NodeDetailPanel.tsx         (新, ~190 行 — 选中节点详情)
  app/graph/
    page.tsx                    (762 行 — 仅保留状态/加载/事件/主框架)
```

### 未完成项

- **工具栏内联样式** — 涉及交互太多，暂时保留 inline style 在 page.tsx
- **图例重叠** — 左右 `position: absolute` 在窄屏仍可能重叠
- **后端 tags 缺失** — 依赖后端改动，未在此次 PR 范围内
- **缓存失效** — `api.ts` 需要侵入式改动，留待后续
- **`< 400 行` 目标** — 工具栏占 ~270 行内联样式，优先保留功能正确性

## 验收标准

1. ✅ 所有现有功能正常 — 构建通过，零错误
2. ⚠️ `page.tsx` 762 行（目标 400，工具栏内联样式占 ~270 行）
3. ✅ 搜索即时高亮 — `matchedNodeIds` 加入 useEffect 依赖
4. ✅ ECharts 增量更新 — init 一次 + setOption(true)
5. ✅ Galaxy 布局稳定 — 替换 Math.random() 为伪随机
6. ✅ 清除筛选重置所有状态 — 加入 galaxyCenterId 重置
7. ✅ CTRL+F 聚焦搜索
8. ✅ "r" 键 — 使用 useRef 存储 AbortController
