# 诡秘之主 阅读流水线 — Agent 接手手册

> 任何新 CLI 会话接入时，请按此文档自动执行。
> 目标：按 CID 顺序、无需人工干预地完成「抓取 → `/读研` 分析 → 入库」全流程。

---

## 1. 快速了解当前状态

```bash
cd /Users/mingxilv/PycharmProjects/learning-log
python3 scripts/tools/guimi_pipeline.py full 0      # 只做状态扫描
python3 scripts/tools/guimi_batch_reader.py queue    # 查看待处理队列
python3 cat /tmp/guimi_pipeline.log | tail -20      # 抓取进度
```

关键文件位置：
```
/tmp/guimi_chapters/          已抓取章节（*.md，按 CID 排序）
/tmp/guimi_pipeline_state.json 流水线状态
/tmp/guimi_completed.json     已通过 /读研 入库的 CID
```

---

## 2. 抓取 Phase（维持后台运行）

独立的 Playwright 抓取脚本在后台持续运行，每章间隔约 1 秒：

```bash
python3 scripts/tools/guimi_pipeline.py scrape 5000   # 追加 5000 章
```

抓取脚本特性：
- 反爬空页自动跳过并记录
- 读到最后一章（CID 19706594）自动退出
- 进度持久化到 `/tmp/guimi_scrape_state.json`

---

## 3. /读研 处理 Phase（Agent 执行）

### 流程规则

1. 查询 `/tmp/guimi_completed.json` 找到最大已处理 CID
2. 列出 `/tmp/guimi_chapters/` 中 CID 比它大的文件，按 CID 升序
3. **每章逐一处理**，每章调用一次 `learning-log_deep_record` 工具
4. 处理成功后执行 `python3 scripts/tools/guimi_batch_reader.py mark <cid>`
5. 重复直到待处理队列清空

### 每章 Reading Agent 输入格式

读取章节 markdown 文件后，调用 `learning-log_deep_record`：

```
topic: `Novel Reading Trace: 诡秘之主 {第几章/章节名}` (格式：`领域: 核心动作/变化`)
insight: {L3 格式全文≥800字}
```

L3 格式规范（见 `.claude/skills/读研.md`）：
1. **结论**（1-2 句话概括本章核心认知变化）
2. **图景**（Mermaid 状态机图，节点用 `("text")` 格式）
3. **为什么**（第一性原理分析，3-4 点）
4. **架构与流程**（ASCII 表/树）
5. **关键决策**（markdown 表格）
6. **STAR + 迁移**（情景-任务-行动-结果-迁移模式）

情绪与注意力字段：自动从文本提取（默认 energy=5，aha_moment=是否有顿悟）

### 批量处理命令

```bash
# 一次处理 5 章
python3 scripts/tools/guimi_batch_reader.py process 5
```

如果该脚本报 API 错误，检查后端是否运行：
```bash
curl -s http://localhost:8002/api/stats
# 若未运行: cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002
```

---

## 4. 不间断执行策略

### 推荐做法：分会话处理

每隔 N 章（建议 10-20 章）保存会话状态，让任何新 CLI 都能续写：

```
会话1: 处理第12-31章
会话2: 处理第32-51章
...
```

每章只需一次 `learning-log_deep_record` 调用 + 一次 `mark` 调用，可随时中断重启。

### 在 `/tmp` 存活不受项目重启影响

所有状态文件和抓取结果都在 `/tmp` 下，与 Git 项目无关，即使项目目录清理也不会丢失。

---

## 5. 完整重启流程（任何新 CLI 复制粘贴如下）

```bash
# Step 1: 确认后端运行
curl -s http://localhost:8002/api/stats || {
  echo "后端未运行，启动中..."
  cd /Users/mingxilv/PycharmProjects/learning-log/backend
  python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &
  sleep 3
}

# Step 2: 查看当前队列
python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/guimi_batch_reader.py queue

# Step 3: 启动/续跑抓取（后台）
nohup python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/scrape_guimi_playwright.py \
  "$(python3 -c "import json; s=json.load(open('/tmp/guimi_pipeline_state.json')); print(s['scrape'].get('next_url','https://www.sobqg.com/read/guimizhizhu/17859645.html'))")" \
  2000 > /tmp/guimi_scrape.log 2>&1 &

# Step 4: 处理下一批章节
python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/guimi_batch_reader.py process 5

# Step 5: 回到 Step 4，直到队列清空
```

---

## 6. 进度查看

```bash
# 全范式扫描
python3 /Users/mingxilv/PycharmProjects/learning-log/scripts/tools/guimi_pipeline.py status

# 抓取进度
tail -5 /tmp/guimi_scrape.log

# 处理 progress
cat /tmp/guimi_completed.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'已完成: {len(d)} 章, 最后 CID: {d[-1] if d else None}')"
```

---

## 7. 已知问题与处理

| 问题 | 处理方式 |
|------|---------|
| 某章 API 写入失败 | `guimi_batch_reader.py mark <cid>` 强制跳过，或重试 |
| 抓取脚本卡在反爬页 | 脚本已自动跳过空页，检查 `/tmp/guimi_scrape.log` |
| 后端离线 | `cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002` |
| 需要重置进度 | `python3 scripts/tools/guimi_batch_reader.py reset` |
