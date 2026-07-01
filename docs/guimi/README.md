# 诡秘之主 全自动阅读流水线 README

> 目标：任何新 CLI 会话打开后，复制「接手流程」粘贴执行，即可自动续抓 + 自动 /读研，无需人工参与。

---

## 一、目录位置

| 文件 | 用途 |
|------|------|
| `scripts/tools/scrape_guimi_playwright.py` | Playwright 异步抓取脚本（反爬绕过，唯一有效抓取器） |
| `scripts/tools/guimi_pipeline.py` | 流水线调度：抓取 + 状态汇总 + 队列生成 |
| `scripts/tools/guimi_batch_reader.py` | 批次阅读处理器：按 API 顺序处理章节 |
| `scripts/tools/guimi_agent.md` | Agent 接手手册（新 CLI 断点续写指南） |
| `scripts/archive/scrape_guimi.py` | 旧版 requests 抓取（SSL broken，已废弃存档） |
| `/tmp/guimi_chapters/` | 已落盘的章节文件（`*.md`，CID 命名） |
| `/tmp/guimi_pipeline_state.json` | 流水线状态（抓取进度 + 处理进度 + failure 列表） |
| `/tmp/guimi_completed.json` | 已完成 `/读研` 入集的 CID 集合 |
| `/tmp/guimi_scrape.log` | 抓取脚本实时日志 |
| `.claude/skills/learnlog-record/SKILL.md` | Reading Agent 技能规范 |
| `~/.config/opencode/skills/learnlog-record/SKILL.md` | OpenCode 侧 skill 规范（同步） |

---

## 二、任何 CLI 的自动接手流程（复制粘贴即可）

```bash
# Step 1: 确认后端运行
curl -s http://localhost:8002/api/stats || {
  echo "后端未运行，启动中..."
  cd /Users/mingxilv/PycharmProjects/learning-log/backend
  nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 > /tmp/ll_backend.log 2>&1 &
  sleep 3
}

# Step 2: 查看当前队列
python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/guimi_batch_reader.py queue

# Step 3: 续跑抓取（后台）
nohup python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/scrape_guimi_playwright.py \
  "$(python3 -c "import json; s=json.load(open('/tmp/guimi_pipeline_state.json')); print(s['scrape'].get('next_url','https://www.sobqg.com/read/guimizhizhu/17859645.html'))")" \
  2000 > /tmp/guimi_scrape.log 2>&1 &

# Step 4: 处理下一批（5 章）
python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/guimi_batch_reader.py process 5

# Step 5: 重复 Step 4，直到 queue 显示 0 待处理
python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/guimi_batch_reader.py queue
```

---

## 三、Pipeline 架构

```
sobqg.com (Playwright)
    │
    ▼ (scrape_guimi_playwright.py)
/tmp/guimi_chapters/*.md  ← 按 CID 排序的文件
    │
    ├─ /tmp/guimi_pipeline_state.json  ← 抓取 last_cid / next_url
    │
    ▼ (guimi_batch_reader.py process)
/读研 Reading Agent ──→ 调用 learning-log_deep_record 工具
    │
    ▼
/tmp/guimi_completed.json  ← 已处理的 CID 集合
learning_log.db (SQLite)   ← 存储位置
```

---

## 四、数据格式

### 章节文件命名
```
{N:04d}_{CID:08d}_{章节名}.md
示例: 0012_17859646_第十二章_再次上门.md
```

### /读研 L3 格式（存入 `insight` 字段）
```
## 结论
...（200-300字，结论先行）

## 图景
```text
  (节点A)
     │
     ▼
  (节点B)
```
...（100-200字解读）

## 为什么（第一性原理）
...（3-4点，每点循因问法）

## 关键决策
| 维度 | 选择 | 理由 |
...

## STAR + 迁移
**情境**: ...
**任务**: ...
**行动**: ...
**结果**: ...
**迁移**: ...
```

> **图景要求**：用 ASCII 字符画（`─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ · →`），禁止 Mermaid/HTML/Unicode 方框。必须用 ```text 代码块包裹。

### 存入数据库的字段映射

| learning_log 字段 | 本书内容 |
|-------------------|---------|
| `topic` | `Novel Reading Trace: {章节名}` |
| `insight` | L3 全文 |
| `energy_level` | 5（顿悟）/ 3（普通）/ 1（备注）|
| `source` | `deep-record` |
| `project_tag_id` | `learning.log.project.guimi` |
| `custom_tags` | `[novel-reading, 诡秘之主, reading-trace]` |
| `research_type` | `deep-research` |

---

## 五、进度跟踪

```bash
# 总览
python3 scripts/tools/guimi_pipeline.py status

# 处理队列
python3 scripts/tools/guimi_batch_reader.py queue

# 已完成数
python3 -c "import json; d=json.load(open('/tmp/guimi_completed.json')); print(len(d))"

# 抓取日志
tail -20 /tmp/guimi_scrape.log
```

---

## 六、Verification（6 会诊链自检）

每章入库后，AI 必须做以下检查：

```
□ │ 结论节：≥200字，有明确核心结论
□ │ 图景节：ASCII 图 + ```text 包裹，无 Mermaid 标签
□ │ 为什么节：3-4 点，每点有循因追问
□ │ 关键决策：有对比表格（至少 2 行）
□ │ STAR + 迁移：五要素完整
□ │ insight 总字数：≥800字
```

检查命令：
```bash
python3 scripts/tools/validate_guimi_entry.py <entry_id>
```

---

## 七、已知问题

| 问题 | 解决 |
|------|------|
| 后端离线 | `cd backend && nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &` |
| 某章节 API 写入失败 | `python3 scripts/tools/guimi_batch_reader.py mark <cid>` 跳过 |
| 抓取脚本卡在某页 | 自动跳过空页，检查 `/tmp/guimi_scrape.log` |
| 完全重置 | `python3 scripts/tools/guimi_batch_reader.py reset` |

---

## 八、自测命令

```bash
# 端到端测试：处理 1 章
python3 scripts/tools/guimi_batch_reader.py once /tmp/guimi_chapters/0003_17859647_第十三章_值夜者.md

# 验证入库
curl -s http://localhost:8002/api/entries?limit=3 | python3 -m json.tool
```

---

## 九、专栏子页面

- `AGENT_HANDOFF.md` — 新 CLI 会话完整接手手册
- `SKILL_SPEC.md` — `/读` `/精读` `/读研` 三件套规格说明
