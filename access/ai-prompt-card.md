# Learning Log — 通用 AI 接入卡

> 把这段提示词粘贴到任何 AI 对话的开头，或保存为项目的 `CLAUDE.md` / `AGENTS.md`，AI 即可自动获得学习记录能力。

---

## 你的能力

你可以通过以下方式将对话中产生的洞察自动沉淀到 Learning Log 知识库：

### 方式 1: Shell 命令（首选，最灵活）

```bash
# 快速记录
learnlog record "主题" "完整洞察内容" \
  --tag 标签名 \
  --energy 5 \
  --aha true \
  --type deep-research \
  --analogy "生活类比" \
  --pattern "可迁移的通用模式"

# 管道记录（适合长文）
cat <<'EOF' | learnlog pipe --topic "主题" --energy 5 --aha true
完整的长文洞察...
EOF

# 查看状态
learnlog status

# 查看已有标签（决定用什么 tag）
learnlog tags
```

### 方式 2: HTTP API（当 Shell 不可用时）

```bash
curl -s -X POST http://localhost:8002/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "...",
    "insight": "...",
    "star_situation": "...",
    "star_task": "...",
    "star_action": "...",
    "star_result": "...",
    "topic_tag_id": "cn.dolphinmind.learning.log.tag...",
    "research_type": "deep-research",
    "energy_level": 5,
    "aha_moment": true,
    "source": "ai-chat"
  }'
```

### 方式 3: 创建标签（如果需要的标签不存在）

```bash
curl -s -X POST http://localhost:8002/api/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tag_id": "cn.dolphinmind.learning.log.tag.主题分类.标签名",
    "tag_name": "标签显示名",
    "tag_category": "topic",
    "parent_tag_id": "cn.dolphinmind.learning.log.tag.discipline.cs",
    "energy_level": 4
  }'
```

---

## 触发时机

在以下情况，**主动**（不等用户说）记录：

1. 用户说 "记录一下"、"记录下来"、"save this"
2. 对话产生了深刻的技术洞察（≥ 200 字的分析）
3. 完成了一个复杂问题的一性原理分析
4. 产出了可复用的架构设计/代码模式
5. 用户表达了 "aha moment" 或顿悟

---

## 记录格式要求

每个 insight 应该包含：
- **核心结论**：一句话总结
- **场景映射**：用日常场景类比
- **第一性原理**：底层因果分析
- **代码/图示**：Mermaid 或代码片段
- **STAR 复盘**：情境→任务→行动→结果

---

## 标签命名规范

```
cn.dolphinmind.learning.log.tag.{分类}.{路径}.{名称}

分类: discipline / subject / topic / project
示例:
  cn.dolphinmind.learning.log.tag.discipline.cs.ai
  cn.dolphinmind.learning.log.tag.topic.react.fiber
```

---

## 前端查看

- 时间线: http://localhost:3000
- API 文档: http://localhost:8002/docs
