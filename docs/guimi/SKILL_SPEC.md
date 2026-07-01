# Reading Agent Skill 规格说明

> 定义 `/读` `/精读` `/读研` 三件套的输入输出契约，确保任何 AI CLI 执行时格式一致。

---

## 1. 三档深度设计

| 级别 | 命令 | 字数 | 适用场景 | 输出格式 |
|------|------|------|---------|---------|
| **L1 速读** | `/读` | 200-500 | 闪念/灵感/顿悟 | 轻量 snapshot |
| **L2 精读** | `/精读` | 800-1500 | 阶段完成/假设验证 | hypothesis_pool + 验证 |
| **L3 读研** | `/读研` | ≥800 | 深度分析/完整建模 | world_state + reading_trace |

---

## 2. 状态继承链

```
L1 /读  →  snapshot（世界观快照）
            │
L2 /精读 →  hypothesis_pool（假设池）+ snapshot
            │
L3 /读研 →  world_state（完整状态机）+ reading_trace（每章 trace）
```

**规则**：L2 继承 L1 的 snapshot，L3 继承 L2 的 hypothesis_pool。禁止跨级跳读。

---

## 3. L3 /读研 输出规范（5 节结构）

### 3.1 节定义

| 节 | 名称 | 字数 | 必填 | 说明 |
|----|------|------|------|------|
| 2.1 | 结论 | 200-300 | ✅ | 30秒内让读者抓住要点 |
| 2.2 | 图景 | ASCII + 100-200解读 | ✅ | 流程/架构/状态演进 |
| 2.3 | 为什么 | 3-4点×100字 | ✅ | 循因追问，第一性原理 |
| 2.4 | 关键决策 | 对比表 | ✅ | 维度/选择/理由 |
| 2.5 | STAR + 迁移 | 300-500 | ✅ | 情境/任务/行动/结果/迁移 |

### 3.2 图景（ASCII 文字图）硬规则

**节点标签**：只能用圆括号 `("text")` 或纯文本

**连线**：`-->`（实线）/ `-.->`（虚线注释）

**代码块**：**必须**用 ```text 包裹，如图：
```text
  (开始节点)
     │
     ▼
  (中间节点)
     │
  ┌──┴──┐
  ▼     ▼
(A)    (B)
```

**禁止**：
- ❌ Mermaid 语法（graph LR / TD 等）
- ❌ HTML 标签（`<br/>`）
- ❌ Unicode 方框（┌┐└┘ 以外的 Unicode 图形字符）
- ❌ 方括号节点定义（`A[text]`）
- ❌ 节点内换行/冒号/管道符

### 3.3 虚线注释规范

虚线注释用于标注认知闪光类型：
```
  ┌─ 虚线注释 ──────────────────────────────────────────┐
  │ chunk_03 ──→ DZ_13: 灵之眼为何无法吞噬克莱恩认知   │
  │ chunk_05 ──→ AHA_15: 四分之一数据=内部危机         │
  └─────────────────────────────────────────────────────┘
```

类型缩写：
- `DZ` = 深度探索（因果展开）
- `AHA` = 啊哈/灵感（跨域映射）
- `PF` = 预测失败（认知崩溃）

### 3.4 World Model 演进表

用 ASCII 表格展示 world_state 版本演进：
```
  ┌─ World Model 演进 ─────────────────────────────────────┐
  │ Ahá_01 → World Model v1                               │
  │ Ahá_02 → World Model v2                               │
  │ Ahá_03 → World Model v3                               │
  └────────────────────────────────────────────────────────┘
```

---

## 4. 入库校验清单（每章必做）

入库后，AI 必须逐项检查：

```
□ │ 五节齐全：结论 / 图景 / 为什么 / 关键决策 / STAR+迁移
□ │ 图景用 ```text 包裹（非 ```mermaid）
□ │ 无方括号节点定义（A[...]）
□ │ 无 HTML 标签（<br/>）
□ │ insight 总字数 ≥800
□ │ 无跨 chapter 素材重复（同一事件在 STAR 中用过后，Why 不得再用）
□ │ 结论与 STAR 的「结果」节一致
□ │ energy_level 合理（顿悟=5，普通=3）
□ │ topic 格式：Novel Reading Trace: 诡秘之主 ...
```

---

## 5. 批量处理流程

```
1. 读取 /tmp/guimi_completed.json → 确定起点 CID
2. 列出 /tmp/guimi_chapters/ 中 > 起点的文件（按 CID 排序）
3. 逐章执行 /读研：
   - read 章节 .md
   - learning-log_deep_record({topic, insight, energy, source})
   - 成功后: mark <cid>
4. 每 5 章更新一次 completed 和 pipeline_state
5. 重复直到队列清空
```

---

## 6. 快速修复命令

```bash
# 替换单条记录的 Mermaid → ASCII
python3 /tmp/fix_mermaid_to_ascii.py

# 补全缺失节
python3 /tmp/fix_incomplete_records.py

# 批量验证
python3 -c "
import urllib.request, json
API = 'http://localhost:8002'
REQUIRED = ['## 结论','## 图景','## 为什么','## 关键决策','## STAR + 迁移']
for rid in range(118, 147):
    req = urllib.request.Request(f'{API}/api/entries/{rid}', method='GET')
    with urllib.request.urlopen(req) as resp:
        e = json.loads(resp.read())
    missing = [s for s in REQUIRED if s not in e['insight']]
    print(f'ID {rid}: {\"✅\" if not missing else \"⚠️ 缺失:\" + str(missing)}')
"
```
