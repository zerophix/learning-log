---
name: record
aliases: [/record, /灵感, /insight, /save]
description: 深度知识结晶协议。强制执行 CIDED 五步决策流 + 六步深度分析，将对话洞察结构化为可追溯的知识资产。
collaboration:
  inputs: [conversation_context, topic, insight]
  outputs: [structured_record_in_db]
  triggers: [user_record_command, aha_moment_detected, deep_analysis_completed]
  next_skills: [llstatus]
---

# 知识结晶记录助手 (v10.0 — CIDED 协议版)

## 🎯 核心目标

将 AI 对话中产生的洞察以最高质量的结构化形式持久化到 Learning Log 知识库。

**核心原则**：AI 不是被动记录工具，而是主动的认知合伙人。每次 `/record` 都必须产生穿透性的深度分析。

---

## ⚠️ 强制深度协议

1. **2000 字红线**：每条 insight 不低于 2000 字（中文），包含完整六步分析。
2. **Mermaid 强制配图**：每条记录必须包含 Mermaid 图表（flowchart/sequenceDiagram/graph）。
3. **STAR 不可为空**：star_situation / star_task / star_action / star_result 必填。
4. **标签预检**：写入前检查目标标签是否存在，不存在则自动创建。
5. **环境保活**：入库前检查后端是否存活，未运行则自动拉起。

---

## ⚙️ 强制执行流程 (CIDED)

### Step 1: Clarify — 意图锁定
- 确认用户想记录的核心主题（10 字以内）
- 如果用户直接给了主题 → 直接使用
- 如果用户说"/record"但没给主题 → 从对话上下文中提取最近的核心讨论点

### Step 2: Investigate — 环境保活 & 标签预检
```bash
# 检查后端状态
learnlog status

# 如果后端未运行，自动启动
learnlog start

# 检查目标标签是否存在
learnlog tags | grep "关键词"
```
如果标签不存在，通过 API 自动创建：
```bash
curl -s -X POST http://localhost:8002/api/tags \
  -H "Content-Type: application/json" \
  -d '{"tag_id": "cn.dolphinmind.learning.log.tag.分类.名称", "tag_name": "名称", "tag_category": "topic", "parent_tag_id": "...", "energy_level": 4}'
```

### Step 3: Develop — 生成深度分析（六步结构）

**必须**按以下六步结构生成 insight 内容：

```markdown
**1. 核心结论 (Core Conclusion)**
[一句话总结 + 展开阐述]

**2. 领域场景案例 (Domain Scenario)**
[用一个真实的业务/日常场景类比说明，让抽象概念具象化]

**3. 第一性原理分析 (First Principles Analysis)**
[回归底层原理，拆解本质因果关系]

**4. 图示分析 (Visual Mapping)**
[ASCII Art 或 Mermaid 图，可视化关键逻辑流]

**5. 完整代码实现 (Code Implementation)**
[可运行的关键代码片段]

**6. STAR 法则复盘 + 反问与领域映射**
[S/T/A/R 四维复盘 + 深度反问 + 跨领域映射]
```

**字数要求**：≥ 2000 字。

### Step 4: Evaluate — 质量自检
- [ ] insight ≥ 2000 字？
- [ ] 包含 Mermaid 图表？
- [ ] STAR 四字段均已填写？
- [ ] 内容有穿透性的洞察而非流水账？
- [ ] 能量评级是否合理（普通=3, 深刻=4, 顿悟=5）？

### Step 5: Deliver — 构造 Payload 并入

**方式 A（优先）：learnlog CLI**
```bash
learnlog record "主题" "完整insight内容" \
  --tag 标签名 \
  --energy 5 \
  --aha true \
  --type deep-research \
  --analogy "生活类比描述" \
  --pattern "可迁移的通用模式" \
  --diagram "mermaid代码" \
  --source "record-skill"
```

**方式 B：管道（适合超长 insight）**
```bash
cat <<'EOF' | learnlog pipe --topic "主题" --energy 5 --aha true --type deep-research
完整的六步分析内容...
EOF
```

**方式 C：HTTP API**
```bash
curl -s -X POST http://localhost:8002/api/entries \
  -H "Content-Type: application/json" \
  -d '{...22个字段的完整 JSON...}'
```

---

## 📋 研究类型选择指南

| 研究类型 | 何时使用 | 颜色 |
|---------|---------|------|
| `deep-research` | 聚焦单一问题深入挖掘 | 🟡 琥珀 |
| `topic-exploration` | 围绕主题发散探索 | 🟢 翡翠 |
| `domain-mapping` | 构建领域知识图谱 | 🟣 紫色 |

---

## 🏷️ 标签命名规范

```
cn.dolphinmind.learning.log.tag.{分类}.{路径}.{名称}

分类: discipline / subject / topic / project
示例:
  cn.dolphinmind.learning.log.tag.discipline.cs.ai
  cn.dolphinmind.learning.log.tag.topic.react.server-components
```

---

## 📊 完成后的输出

记录成功后，AI 应告知用户：
```
✅ 已记录 #{id} | {topic}
   session: {session_id}
   字数: {insight字数} 字
   能量: ⚡{energy_level} {'💡顿悟' if aha_moment else ''}
   
   查看: http://localhost:3000
```
