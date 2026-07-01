# Agent 接手手册 — 诡秘之主阅读流水线

> **任何新 CLI 会话打开后，按此文档自动执行，无需人工参与。**

---

## 1. 快速了解当前状态

```bash
cd /Users/mingxilv/PycharmProjects/learning-log

# 抓取进度
python3 scripts/tools/guimi_pipeline.py status

# 待处理队列
python3 scripts/tools/guimi_batch_reader.py queue

# 后端是否运行
curl -s http://localhost:8002/api/stats | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'记录数: {d.get(\"entries\",\"?\")}')"
```

关键文件：
```
/tmp/guimi_chapters/          已抓取章节（*.md，CID 命名，已排序）
/tmp/guimi_pipeline_state.json 抓取进度（last_cid / next_url / done）
/tmp/guimi_completed.json     已完成 /读研 的 CID 集合
/tmp/guimi_scrape.log         抓取脚本日志
```

---

## 2. 抓取 Phase（维持后台运行）

Playwright 抓取脚本已就绪，每次可追加 2000 章：

```bash
python3 scripts/tools/guimi_pipeline.py scrape 2000
```

特性：
- 自动跳过反爬空页（短内容检测）
- 读到终结页 CID 19706594 后自动退出
- 进度持久化到 `/tmp/guimi_pipeline_state.json`

---

## 3. /读研 处理 Phase（Agent 核心工作）

### 3.1 流程规则

1. 读取 `/tmp/guimi_completed.json` 找到最大已处理 CID
2. 列出 `/tmp/guimi_chapters/` 中 CID 比它大的文件，按 CID 升序
3. **逐章处理**，每章执行以下步骤：

```
a. 读取章节 .md 文件（去掉 URL/CID 头）
b. 调用 learning-log_deep_record 工具，构造 L3 格式 insight
c. 入库成功后，执行: python3 scripts/tools/guimi_batch_reader.py mark <cid>
d. 在 /tmp/guimi_completed.json 中追加该 CID
e. 在 /tmp/guimi_pipeline_state.json 中更新 last_processed_cid
```

4. 重复直到队列清空

### 3.2 每章 /读研 输入格式

```
topic: Novel Reading Trace: 诡秘之主 {章节名}
insight: {L3 全文，严格遵循 5 节结构}
```

L3 五节结构：
1. **## 结论**（200-300字）
2. **## 图景**（ASCII 文字图 + ```text 代码块 + 100-200字解读）
3. **## 为什么**（3-4点，每点循因追问）
4. **## 关键决策**（对比表）
5. **## STAR + 迁移**（情境/任务/行动/结果/迁移）

### 3.3 入库校验（每章必做）

入库后必须检查：
```bash
# 1. 确认 ID 存在
curl -s http://localhost:8002/api/entries/{id} | python3 -c "import sys,json; e=json.load(sys.stdin); print(f'ID {e[\"id\"]}: {len(e[\"insight\"])}字')"

# 2. 快速验节（检查五节结构）
python3 -c "
import urllib.request, json
r = urllib.request.urlopen('http://localhost:8002/api/entries/{id}')
e = json.loads(r.read())
ins = e['insight']
for sec in ['## 结论','## 图景','## 为什么','## 关键决策','## STAR + 迁移']:
    print(f'  {sec}: {\"✅\" if sec in ins else \"❌缺失\"}')"
```

---

## 4. 不间断执行策略

### 推荐：分批处理

- **单次任务**：处理 5 章（batch）
- **每批结束**：检查进度，更新 `guimi_completed.json` + `guimi_pipeline_state.json`
- **遇到卡顿**：直接 Ctrl-C，下次接手时从已完成 CID 续跑

### 状态持久化

所有状态在 `/tmp` 下，与 Git 项目无关：
- 即使项目目录清理，`/tmp/guimi_chapters/` 和进度文件不会丢失
- 新 CLI 只需读取 `/tmp/guimi_completed.json` 即可知道从哪里继续

---

## 5. 完整重启流程（新 CLI 复制粘贴）

```bash
# Step 1: 确认后端运行
curl -s http://localhost:8002/api/stats || {
  cd /Users/mingxilv/PycharmProjects/learning-log/backend
  nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 > /tmp/ll_backend.log 2>&1 &
  sleep 3
}

# Step 2: 查看队列
python3 scripts/tools/guimi_batch_reader.py queue

# Step 3: 续跑抓取（后台）
nohup python3 scripts/tools/scrape_guimi_playwright.py \
  "$(python3 -c "import json; s=json.load(open('/tmp/guimi_pipeline_state.json')); print(s['scrape'].get('next_url','https://www.sobqg.com/read/guimizhizhu/17859645.html'))")" \
  2000 > /tmp/guimi_scrape.log 2>&1 &

# Step 4: 处理 5 章
python3 scripts/tools/guimi_batch_reader.py process 5

# Step 5: 重复 Step 4 直到 queue = 0
```

---

## 6. 进度查看

```bash
# 总览
python3 scripts/tools/guimi_pipeline.py status

# 队列
python3 scripts/tools/guimi_batch_reader.py queue

# 已完成
python3 -c "import json; d=json.load(open('/tmp/guimi_completed.json')); print(f'已完成 {len(d)} 章')"

# 抓取日志
tail -20 /tmp/guimi_scrape.log
```

---

## 7. 已知问题

| 问题 | 处理 |
|------|------|
| 某章 API 写入失败 | `python3 scripts/tools/guimi_batch_reader.py mark <cid>` 跳过 |
| 抓取脚本卡在某页 | 自动跳过，检查 `/tmp/guimi_scrape.log` |
| 后端离线 | `cd backend && nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &` |
| 完全重置 | `python3 scripts/tools/guimi_batch_reader.py reset` |
