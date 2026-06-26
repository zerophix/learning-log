---
name: llstatus
aliases: [/llstatus, /ll, /学习状态, /knowledge-status]
description: 快速查看 Learning Log 系统状态：记录数、标签数、最近记录、系统健康度。
collaboration:
  inputs: []
  outputs: [system_status, recent_entries, tag_summary]
  triggers: [user_check_status, after_record, session_start]
  next_skills: [record]
---

# 学习日志状态查看

## ⚙️ 执行流程

当用户输入 `/llstatus` 或 `/ll` 时，AI 执行：

```bash
learnlog status
learnlog feed -n 5
```

## 📊 输出格式

```
📊 Learning Log 状态
   记录: N 条 | 标签: N 个 | 关联: N 条
   
🏷️ 最近沉淀:
   #ID [时间] 主题 ⚡💡
   #ID [时间] 主题 ⚡
   ...

💡 提示: 用 /record 记录新的洞察
```

## 🔧 后端自动保活

如果后端未运行，自动执行 `learnlog start` 并告知用户。
